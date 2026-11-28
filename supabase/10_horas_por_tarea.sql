-- =====================================================================
-- Intranet Eco Motors · Horas por tarea y colaboradores
--  - Quien publica una tarea puede fijar cuántas horas vale (por persona).
--  - Una tarea puede tener, además del responsable, colaboradores.
--  - Al validarla, se suman esas horas automáticamente al registro de horas de
--    cada persona involucrada (y se avisa). Si se des-valida, se quitan.
-- Ejecútalo DESPUÉS de 09_comunicados_por_area_y_pilotos.sql. Se puede ejecutar varias veces.
-- =====================================================================

-- ---------- 1) Horas que vale una tarea ----------
alter table public.tasks add column if not exists horas numeric(5,2);
alter table public.tasks drop constraint if exists tasks_horas_check;
alter table public.tasks add constraint tasks_horas_check check (horas is null or (horas > 0 and horas <= 500));

-- Solo responsables de área cambian las horas (además de lo que ya protegía)
create or replace function public.tasks_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and not public.can_manage_unit(old.unit_id) then
    if new.estado not in ('Pendiente','En proceso','En revisión') and new.estado <> old.estado then
      raise exception 'Solo el encargado puede validar u observar una tarea';
    end if;
    new.title := old.title; new.description := old.description; new.unit_id := old.unit_id;
    new.assignee_id := old.assignee_id; new.created_by := old.created_by; new.parent_id := old.parent_id;
    new.project_id := old.project_id; new.tipo := old.tipo; new.prioridad := old.prioridad;
    new.fecha_asignacion := old.fecha_asignacion; new.fecha_limite := old.fecha_limite;
    new.revisor_id := old.revisor_id; new.resultado_revision := old.resultado_revision;
    new.revisado_at := old.revisado_at; new.horas := old.horas; new.convocatoria := old.convocatoria;
  end if;
  return new;
end; $$;

-- ---------- 2) Colaboradores ----------
create table if not exists public.task_participants (
  task_id bigint not null references public.tasks(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  added_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (task_id, member_id)
);
create index if not exists task_participants_member_idx on public.task_participants(member_id);

alter table public.task_participants enable row level security;
drop policy if exists "ver colaboradores" on public.task_participants;
create policy "ver colaboradores" on public.task_participants for select to authenticated using (
  exists (select 1 from public.tasks t where t.id = task_id and public.can_see_task(t))
);
drop policy if exists "gestionar colaboradores" on public.task_participants;
create policy "gestionar colaboradores" on public.task_participants for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id
                 and (public.can_manage_unit(t.unit_id) or t.created_by = (public.my_member()).id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id
                 and (public.can_manage_unit(t.unit_id) or t.created_by = (public.my_member()).id)));
grant select, insert, delete on public.task_participants to authenticated;

-- Los colaboradores ven la tarea (y su contexto), comentan y suben evidencias
create or replace function public.can_see_task(t public.tasks)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_unit(t.unit_id)
      or exists (
        select 1 from public.members m where m.id = (public.my_member()).id
          and (m.id = t.assignee_id or m.id = t.created_by or m.unit_id = t.unit_id
               or (t.convocatoria and public.unit_in_subtree(m.unit_id, t.unit_id)))
      )
      or exists (select 1 from public.task_participants p where p.task_id = t.id and p.member_id = (public.my_member()).id)
      or exists (
        with recursive down as (
          select c.id, c.assignee_id, c.unit_id from public.tasks c where c.parent_id = t.id
          union all
          select c.id, c.assignee_id, c.unit_id from public.tasks c join down on c.parent_id = down.id
        )
        select 1 from down join public.members m on m.id = (public.my_member()).id
        where down.assignee_id = m.id or down.unit_id = m.unit_id or public.can_manage_unit(down.unit_id)
           or exists (select 1 from public.task_participants p where p.task_id = down.id and p.member_id = m.id)
      );
$$;

drop policy if exists "subir evidencias" on public.task_files;
create policy "subir evidencias" on public.task_files for insert to authenticated with check (
  exists (select 1 from public.tasks t where t.id = task_id
          and (public.can_manage_unit(t.unit_id) or t.assignee_id = (public.my_member()).id
               or exists (select 1 from public.task_participants p where p.task_id = t.id and p.member_id = (public.my_member()).id)))
);

-- ---------- 3) Horas automáticas al validar ----------
-- 8 → «8», 2.5 → «2.5»
create or replace function public.fmt_horas(n numeric)
returns text language sql immutable as $$ select regexp_replace(trim(to_char(n, 'FM9990.##')), '\.$', '') $$;

alter table public.time_entries add column if not exists origen text not null default 'manual';
alter table public.time_entries drop constraint if exists time_entries_origen_check;
alter table public.time_entries add constraint time_entries_origen_check check (origen in ('manual','tarea'));
alter table public.time_entries alter column horas type numeric(6,2);
alter table public.time_entries drop constraint if exists time_entries_horas_check;
alter table public.time_entries add constraint time_entries_horas_check check (horas > 0 and (horas <= 24 or origen = 'tarea'));
create unique index if not exists time_entries_tarea_unica on public.time_entries(task_id, member_id) where origen = 'tarea';

-- Las horas por tarea solo las crea el sistema; cada uno solo registra/borra sus horas manuales
drop policy if exists "registrar mis horas" on public.time_entries;
create policy "registrar mis horas" on public.time_entries for insert to authenticated
  with check (member_id = (public.my_member()).id and origen = 'manual');
drop policy if exists "borrar mis horas" on public.time_entries;
create policy "borrar mis horas" on public.time_entries for delete to authenticated using (
  (member_id = (public.my_member()).id and origen = 'manual')
  or exists (select 1 from public.members m where m.id = member_id and public.can_manage_unit(m.unit_id))
);

-- Deja las horas de una tarea en orden: validada y con horas → una entrada por persona involucrada
create or replace function public.sync_task_hours(tid bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
  r record;
  label text;
begin
  select * into t from public.tasks where id = tid;
  if t.id is null or t.estado <> 'Completada y validada' or coalesce(t.horas, 0) <= 0 then
    delete from public.time_entries where task_id = tid and origen = 'tarea';
    return;
  end if;
  label := '✅ Tarea validada · +' || public.fmt_horas(t.horas) || ' h';

  delete from public.time_entries e
  where e.task_id = tid and e.origen = 'tarea'
    and e.member_id is distinct from t.assignee_id
    and not exists (select 1 from public.task_participants p where p.task_id = tid and p.member_id = e.member_id);

  for r in
    insert into public.time_entries (member_id, fecha, horas, actividad, task_id, origen)
    select x.member_id, coalesce((t.revisado_at at time zone 'America/Lima')::date, public.lima_today()),
           t.horas, 'Tarea validada: ' || t.title, t.id, 'tarea'
    from (select t.assignee_id as member_id where t.assignee_id is not null
          union
          select p.member_id from public.task_participants p where p.task_id = tid) x
    on conflict (task_id, member_id) where origen = 'tarea'
      do update set horas = excluded.horas, actividad = excluded.actividad
    returning member_id, (xmax = 0) as nuevo
  loop
    -- Al responsable ya le llega «Tarea validada · +N h»; a los colaboradores se les avisa aquí
    if r.nuevo and r.member_id is distinct from t.assignee_id then
      perform public.notify(r.member_id, t.revisor_id, label, t.title, '/tareas/' || t.id);
    end if;
  end loop;
end; $$;

create or replace function public.tasks_hours_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado is distinct from old.estado or new.horas is distinct from old.horas
     or new.assignee_id is distinct from old.assignee_id or new.title is distinct from old.title then
    perform public.sync_task_hours(new.id);
  end if;
  return null;
end; $$;
drop trigger if exists tasks_hours on public.tasks;
create trigger tasks_hours after update on public.tasks
  for each row execute function public.tasks_hours_trigger();

create or replace function public.participants_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare t public.tasks;
begin
  if tg_op = 'INSERT' then
    select * into t from public.tasks where id = new.task_id;
    perform public.notify(new.member_id, new.added_by, 'Te sumaron como colaborador/a', t.title, '/tareas/' || t.id);
  end if;
  perform public.sync_task_hours(coalesce(new.task_id, old.task_id));
  return null;
end; $$;
drop trigger if exists participants_trigger on public.task_participants;
create trigger participants_trigger after insert or delete on public.task_participants
  for each row execute function public.participants_trigger();

-- El aviso de validación incluye las horas ganadas
create or replace function public.tasks_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := (public.my_member()).id;
  link text := '/tareas/' || new.id;
begin
  if tg_op = 'INSERT' then
    perform public.notify(new.assignee_id, actor, 'Nueva tarea asignada', new.title, link);
    return new;
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    perform public.notify(new.assignee_id, actor, 'Te han asignado una tarea', new.title, link);
  end if;

  if new.estado is distinct from old.estado then
    if new.estado = 'En revisión' then
      perform public.notify(new.created_by, actor, 'Tarea enviada a revisión', new.title, link);
    elsif new.estado = 'Completada y validada' then
      perform public.notify(new.assignee_id, actor,
        '✅ Tarea validada' || case when coalesce(new.horas, 0) > 0
          then ' · +' || public.fmt_horas(new.horas) || ' h' else '' end,
        new.title, link);
    elsif new.estado = 'Observada' then
      perform public.notify(new.assignee_id, actor, '⚠️ Tarea observada', coalesce(new.resultado_revision, new.title), link);
    end if;
  end if;
  return new;
end; $$;

-- Las subtareas de una convocatoria heredan las horas
create or replace function public.task_volunteer_decide(p_volunteer bigint, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.task_volunteers;
  t public.tasks;
  m public.members;
  me public.members := public.my_member();
  sub bigint;
begin
  select * into v from public.task_volunteers where id = p_volunteer;
  select * into t from public.tasks where id = v.task_id;
  if t.id is null or not (public.can_manage_unit(t.unit_id) or t.created_by = me.id) then
    raise exception 'Solo quien publicó la convocatoria o un responsable del área puede decidir';
  end if;
  if v.estado <> 'Pendiente' then raise exception 'Esta solicitud ya fue respondida'; end if;
  select * into m from public.members where id = v.member_id;

  if p_accept then
    insert into public.tasks (title, description, unit_id, assignee_id, created_by, parent_id, project_id, tipo, prioridad, fecha_limite, horas)
    values (t.title, t.description, m.unit_id, m.id, me.id, t.id, t.project_id, 'Coordinación con subárea', t.prioridad, t.fecha_limite, t.horas)
    returning id into sub;
    update public.task_volunteers set estado = 'Aceptado', subtask_id = sub where id = v.id;
  else
    update public.task_volunteers set estado = 'Rechazado' where id = v.id;
    perform public.notify(m.id, me.id, 'No fuiste seleccionado/a esta vez', t.title, '/tareas/' || t.id);
  end if;
end; $$;

grant execute on all functions in schema public to authenticated;
