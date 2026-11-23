-- =====================================================================
-- Intranet Eco Motors · Comunicados por área y registro de pilotos
--  1) Un comunicado puede ir a todo el equipo o solo a un área/subárea
--     (lo ven y reciben el aviso solo los miembros de esa rama).
--  2) Pruebas de pilotos: tiempos de vuelta, intentos, peso y traje.
-- Ejecútalo DESPUÉS de 08_drive_areas.sql. Se puede ejecutar varias veces.
-- =====================================================================

-- ---------- 1) Comunicados con destinatarios ----------
alter table public.announcements add column if not exists unit_id text references public.units(id) on delete cascade;

drop policy if exists "noticias visibles" on public.announcements;
create policy "noticias visibles" on public.announcements for select to authenticated using (
  unit_id is null
  or public.can_manage_unit(unit_id)
  or public.unit_in_subtree((public.my_member()).unit_id, unit_id)
);

-- Coordinación publica para todos o para cualquier área; supervisores y encargados, solo para las suyas
drop policy if exists "admins publican noticias" on public.announcements;
drop policy if exists "publicar comunicados" on public.announcements;
create policy "publicar comunicados" on public.announcements for insert to authenticated with check (
  author_id = auth.uid()
  and (public.is_admin() or (unit_id is not null and public.can_manage_unit(unit_id)))
);

drop policy if exists "admins borran noticias" on public.announcements;
drop policy if exists "borrar comunicados" on public.announcements;
create policy "borrar comunicados" on public.announcements for delete to authenticated using (
  public.is_admin() or (author_id = auth.uid() and unit_id is not null and public.can_manage_unit(unit_id))
);

create or replace function public.announcements_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  select name into uname from public.units where id = new.unit_id;
  insert into public.notifications (member_id, title, body, link)
  select m.id,
         case when new.unit_id is null then '📢 Nuevo comunicado' else '📢 Comunicado para ' || uname end,
         new.title, '/noticias'
  from public.members m
  where m.estado <> 'Miembro retirado' and m.profile_id is not null and not m.es_prueba
    and m.profile_id is distinct from new.author_id
    and (new.unit_id is null or public.unit_in_subtree(m.unit_id, new.unit_id));
  return new;
end; $$;
drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify after insert on public.announcements
  for each row execute function public.announcements_notify();

-- ---------- 2) Pruebas de pilotos ----------
create table if not exists public.pilot_runs (
  id bigint generated always as identity primary key,
  fecha date not null default public.lima_today(),
  piloto_id uuid not null references public.members(id) on delete cascade,
  project_id text references public.projects(id) on delete set null,
  intento int not null default 1 check (intento between 1 and 99),
  peso_kg numeric(5,2) check (peso_kg is null or peso_kg between 20 and 200),
  traje text,
  pista text,
  vueltas numeric(8,2)[] not null default '{}',
  notas text,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists pilot_runs_piloto_idx on public.pilot_runs(piloto_id, fecha);

alter table public.pilot_runs enable row level security;
-- Cada piloto ve sus propias pruebas; el responsable de Pilotos y coordinación ven todas
drop policy if exists "ver pruebas de pilotos" on public.pilot_runs;
create policy "ver pruebas de pilotos" on public.pilot_runs for select to authenticated using (
  piloto_id = (public.my_member()).id or public.can_manage_unit('pilotos')
);
-- Solo el responsable de Pilotos y coordinación registran, corrigen o borran
drop policy if exists "gestionar pruebas de pilotos" on public.pilot_runs;
create policy "gestionar pruebas de pilotos" on public.pilot_runs for all to authenticated
  using (public.can_manage_unit('pilotos')) with check (public.can_manage_unit('pilotos'));

grant select, insert, update, delete on public.pilot_runs to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
