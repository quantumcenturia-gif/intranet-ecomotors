-- =====================================================================
-- Intranet Eco Motors · Asistencias
--  - Los directores/encargados abren asistencia solo para su área
--    (una sesión abierta a la vez y como máximo una por día y área).
--  - El director general abre asistencias especiales (reuniones y prácticas).
--  - Cada miembro marca entrada y salida.
--  - El encargado cierra, revisa y verifica; al verificar queda guardada y bloqueada.
-- Ejecútalo DESPUÉS de 05_correcciones_permisos.sql.
-- =====================================================================

-- Responsable explícito de una unidad (p. ej. Pilotos → Heyner)
alter table public.units add column if not exists leader_id uuid references public.members(id) on delete set null;
update public.units set leader_id = (select id from public.members where email = 'heyner.arellano.m@uni.pe')
where id = 'pilotos';

create or replace function public.can_manage_unit(u text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (
      select 1 from public.members m
      where m.profile_id = auth.uid()
        and m.rol in ('Supervisor/a','Encargado/a')
        and public.unit_in_subtree(u, m.unit_id)
    )
    or exists (
      select 1 from public.units x join public.members m on m.id = x.leader_id
      where m.profile_id = auth.uid() and public.unit_in_subtree(u, x.id)
    );
$$;

create or replace function public.lima_today()
returns date language sql stable as $$ select (now() at time zone 'America/Lima')::date $$;

-- ---------- Tablas ----------
create table if not exists public.attendance_sessions (
  id bigint generated always as identity primary key,
  unit_id text references public.units(id),          -- null = todo el equipo
  tipo text not null default 'Área' check (tipo in ('Área','Reunión','Práctica')),
  titulo text not null,
  fecha date not null default public.lima_today(),
  estado text not null default 'Abierta' check (estado in ('Abierta','Cerrada','Verificada')),
  opened_by uuid references public.members(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  verified_by uuid references public.members(id) on delete set null,
  verified_at timestamptz,
  notas text
);
create index if not exists attendance_sessions_unit_idx on public.attendance_sessions(unit_id, fecha);

create table if not exists public.attendance_records (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.attendance_sessions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  entrada timestamptz,
  salida timestamptz,
  horas numeric(5,2) generated always as (
    case when entrada is not null and salida is not null and salida > entrada
         then round((extract(epoch from (salida - entrada)) / 3600)::numeric, 2) end
  ) stored,
  observacion text,
  editado_por uuid references public.members(id) on delete set null,
  unique (session_id, member_id)
);
create index if not exists attendance_records_member_idx on public.attendance_records(member_id);

-- ¿Este miembro está convocado a la sesión?
create or replace function public.attendance_eligible(s public.attendance_sessions, mem uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.id = mem and m.estado <> 'Miembro retirado'
      and (s.unit_id is null or public.unit_in_subtree(m.unit_id, s.unit_id))
  );
$$;

-- ¿Puedo gestionar (cerrar, corregir, verificar) esta sesión?
create or replace function public.can_manage_session(s public.attendance_sessions)
returns boolean language sql stable security definer set search_path = public as $$
  select case when s.unit_id is null then public.is_admin() else public.can_manage_unit(s.unit_id) end;
$$;

-- ---------- Acciones ----------
create or replace function public.attendance_open(p_unit text, p_tipo text, p_titulo text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  me public.members := public.my_member();
  sid bigint;
begin
  if p_tipo in ('Reunión','Práctica') then
    if not public.is_admin() then raise exception 'Solo el director general abre reuniones y prácticas'; end if;
  else
    p_tipo := 'Área';
    if p_unit is null then raise exception 'Elige el área'; end if;
    if not public.can_manage_unit(p_unit) then raise exception 'Solo el director o encargado del área puede abrir su asistencia'; end if;
  end if;

  if exists (select 1 from public.attendance_sessions
             where unit_id is not distinct from p_unit and estado = 'Abierta') then
    raise exception 'Ya hay una asistencia abierta para esta área. Ciérrala antes de abrir otra.';
  end if;
  if p_tipo = 'Área' and exists (select 1 from public.attendance_sessions
             where unit_id = p_unit and tipo = 'Área' and fecha = public.lima_today()) then
    raise exception 'Ya se abrió una asistencia hoy para esta área (máximo una por día).';
  end if;

  insert into public.attendance_sessions (unit_id, tipo, titulo, opened_by)
  values (p_unit, p_tipo, coalesce(nullif(trim(p_titulo), ''), p_tipo || ' ' || to_char(public.lima_today(), 'DD/MM')), me.id)
  returning id into sid;
  return sid;
end; $$;

create or replace function public.attendance_mark(p_session bigint, p_kind text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me public.members := public.my_member();
  s public.attendance_sessions;
  r public.attendance_records;
begin
  if me.id is null then raise exception 'Tu cuenta no está vinculada a una ficha'; end if;
  select * into s from public.attendance_sessions where id = p_session;
  if s.id is null or s.estado <> 'Abierta' then raise exception 'Esta asistencia ya no está abierta'; end if;
  if not public.attendance_eligible(s, me.id) then raise exception 'Esta asistencia no es para tu área'; end if;
  select * into r from public.attendance_records where session_id = s.id and member_id = me.id;

  if p_kind = 'entrada' then
    if r.entrada is not null then raise exception 'Ya marcaste tu entrada'; end if;
    insert into public.attendance_records (session_id, member_id, entrada) values (s.id, me.id, now())
    on conflict (session_id, member_id) do update set entrada = now();
  elsif p_kind = 'salida' then
    if r.entrada is null then raise exception 'Primero marca tu entrada'; end if;
    if r.salida is not null then raise exception 'Ya marcaste tu salida'; end if;
    update public.attendance_records set salida = now() where id = r.id;
  else
    raise exception 'Acción no válida';
  end if;
end; $$;

create or replace function public.attendance_close(p_session bigint)
returns void language plpgsql security definer set search_path = public as $$
declare s public.attendance_sessions;
begin
  select * into s from public.attendance_sessions where id = p_session;
  if s.id is null or not public.can_manage_session(s) then raise exception 'No puedes cerrar esta asistencia'; end if;
  if s.estado <> 'Abierta' then raise exception 'La asistencia ya está cerrada'; end if;
  update public.attendance_sessions set estado = 'Cerrada', closed_at = now() where id = s.id;
end; $$;

-- Corrección manual del encargado (antes de verificar)
create or replace function public.attendance_set(p_session bigint, p_member uuid, p_entrada timestamptz, p_salida timestamptz, p_obs text)
returns void language plpgsql security definer set search_path = public as $$
declare s public.attendance_sessions;
begin
  select * into s from public.attendance_sessions where id = p_session;
  if s.id is null or not public.can_manage_session(s) then raise exception 'No puedes editar esta asistencia'; end if;
  if s.estado = 'Verificada' then raise exception 'La asistencia ya está verificada y guardada'; end if;
  if not public.attendance_eligible(s, p_member) then raise exception 'Ese miembro no pertenece a esta asistencia'; end if;
  if p_salida is not null and p_entrada is not null and p_salida <= p_entrada then raise exception 'La salida debe ser posterior a la entrada'; end if;
  if p_entrada is null and p_salida is null then
    delete from public.attendance_records where session_id = s.id and member_id = p_member;
  else
    insert into public.attendance_records (session_id, member_id, entrada, salida, observacion, editado_por)
    values (s.id, p_member, p_entrada, p_salida, nullif(trim(p_obs), ''), (public.my_member()).id)
    on conflict (session_id, member_id) do update
      set entrada = excluded.entrada, salida = excluded.salida, observacion = excluded.observacion, editado_por = excluded.editado_por;
  end if;
end; $$;

create or replace function public.attendance_verify(p_session bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.attendance_sessions;
  incompletos int;
begin
  select * into s from public.attendance_sessions where id = p_session;
  if s.id is null or not public.can_manage_session(s) then raise exception 'No puedes verificar esta asistencia'; end if;
  if s.estado = 'Abierta' then raise exception 'Primero cierra la asistencia'; end if;
  if s.estado = 'Verificada' then raise exception 'Ya está verificada'; end if;
  select count(*) into incompletos from public.attendance_records
    where session_id = s.id and (entrada is null or salida is null);
  if incompletos > 0 then raise exception 'Hay % registro(s) sin entrada o salida. Corrígelos antes de verificar.', incompletos; end if;
  update public.attendance_sessions
    set estado = 'Verificada', verified_by = (public.my_member()).id, verified_at = now()
    where id = s.id;
end; $$;

create or replace function public.attendance_delete(p_session bigint)
returns void language plpgsql security definer set search_path = public as $$
declare s public.attendance_sessions;
begin
  select * into s from public.attendance_sessions where id = p_session;
  if s.id is null or not public.can_manage_session(s) then raise exception 'No puedes borrar esta asistencia'; end if;
  if s.estado = 'Verificada' and not public.is_admin() then raise exception 'Solo coordinación puede borrar una asistencia verificada'; end if;
  delete from public.attendance_sessions where id = s.id;
end; $$;

-- ---------- Seguridad: lectura solo por RLS; escritura solo por las funciones ----------
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists "ver sesiones" on public.attendance_sessions;
create policy "ver sesiones" on public.attendance_sessions for select to authenticated using (
  public.can_manage_session(attendance_sessions)
  or public.attendance_eligible(attendance_sessions, (public.my_member()).id)
);
drop policy if exists "ver registros" on public.attendance_records;
create policy "ver registros" on public.attendance_records for select to authenticated using (
  member_id = (public.my_member()).id
  or exists (select 1 from public.attendance_sessions s where s.id = session_id and public.can_manage_session(s))
);

grant select on public.attendance_sessions, public.attendance_records to authenticated;
revoke insert, update, delete on public.attendance_sessions, public.attendance_records from authenticated, anon;
grant execute on function public.attendance_open(text, text, text), public.attendance_mark(bigint, text),
  public.attendance_close(bigint), public.attendance_set(bigint, uuid, timestamptz, timestamptz, text),
  public.attendance_verify(bigint), public.attendance_delete(bigint), public.lima_today() to authenticated;
grant execute on all functions in schema public to authenticated;
