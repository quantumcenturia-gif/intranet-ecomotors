-- =====================================================================
-- Intranet Eco Motors · Convocatorias de tareas y comunicados
--  - Una tarea puede publicarse como CONVOCATORIA para un área o subárea:
--    la ven todos los miembros de esa rama y pueden decir «Yo lo voy a hacer».
--  - Quien la publicó recibe un aviso por cada voluntario y decide a quién acepta
--    (al aceptar se crea una subtarea asignada a esa persona).
--  - Cada comunicado nuevo genera un aviso para todo el equipo.
-- Ejecútalo DESPUÉS de 06_asistencias.sql.
-- =====================================================================

alter table public.tasks add column if not exists convocatoria boolean not null default false;

-- Visibilidad: lo anterior + convocatorias abiertas a mi área (o a un área superior)
create or replace function public.can_see_task(t public.tasks)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_unit(t.unit_id)
      or exists (
        select 1 from public.members m where m.profile_id = auth.uid()
          and (m.id = t.assignee_id or m.id = t.created_by or m.unit_id = t.unit_id
               or (t.convocatoria and public.unit_in_subtree(m.unit_id, t.unit_id)))
      )
      or exists (
        with recursive down as (
          select c.id, c.assignee_id, c.unit_id from public.tasks c where c.parent_id = t.id
          union all
          select c.id, c.assignee_id, c.unit_id from public.tasks c join down on c.parent_id = down.id
        )
        select 1 from down join public.members m on m.profile_id = auth.uid()
        where down.assignee_id = m.id or down.unit_id = m.unit_id or public.can_manage_unit(down.unit_id)
      );
$$;

-- ---------- Voluntarios ----------
create table if not exists public.task_volunteers (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  nota text,
  estado text not null default 'Pendiente' check (estado in ('Pendiente','Aceptado','Rechazado')),
  subtask_id bigint references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (task_id, member_id)
);

alter table public.task_volunteers enable row level security;
drop policy if exists "ver voluntarios" on public.task_volunteers;
create policy "ver voluntarios" on public.task_volunteers for select to authenticated using (
  member_id = (public.my_member()).id
  or exists (select 1 from public.tasks t where t.id = task_id
             and (public.can_manage_unit(t.unit_id) or t.created_by = (public.my_member()).id))
);
grant select on public.task_volunteers to authenticated;
revoke insert, update, delete on public.task_volunteers from authenticated, anon;

-- «Yo lo voy a hacer»
create or replace function public.task_volunteer(p_task bigint, p_nota text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me public.members := public.my_member();
  t public.tasks;
begin
  if me.id is null then raise exception 'Tu cuenta no está vinculada a una ficha'; end if;
  select * into t from public.tasks where id = p_task;
  if t.id is null or not t.convocatoria then raise exception 'Esta tarea no es una convocatoria'; end if;
  if t.estado in ('Completada y validada','Cancelada') then raise exception 'La convocatoria ya está cerrada'; end if;
  if not public.unit_in_subtree(me.unit_id, t.unit_id) then raise exception 'Esta convocatoria no es para tu área'; end if;
  insert into public.task_volunteers (task_id, member_id, nota) values (t.id, me.id, nullif(trim(p_nota), ''))
  on conflict (task_id, member_id) do update set nota = excluded.nota, estado = 'Pendiente', created_at = now()
    where public.task_volunteers.estado <> 'Aceptado';
  perform public.notify(t.created_by, me.id, '🙋 ' || me.full_name || ' se apuntó', t.title, '/tareas/' || t.id);
end; $$;

create or replace function public.task_unvolunteer(p_task bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.task_volunteers
  where task_id = p_task and member_id = (public.my_member()).id and estado = 'Pendiente';
end; $$;

-- Aceptar (crea una subtarea para esa persona) o rechazar
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
    insert into public.tasks (title, description, unit_id, assignee_id, created_by, parent_id, project_id, tipo, prioridad, fecha_limite)
    values (t.title, t.description, m.unit_id, m.id, me.id, t.id, t.project_id, 'Coordinación con subárea', t.prioridad, t.fecha_limite)
    returning id into sub;
    update public.task_volunteers set estado = 'Aceptado', subtask_id = sub where id = v.id;
    -- El aviso de «Nueva tarea asignada» lo envía el trigger de tareas
  else
    update public.task_volunteers set estado = 'Rechazado' where id = v.id;
    perform public.notify(m.id, me.id, 'No fuiste seleccionado/a esta vez', t.title, '/tareas/' || t.id);
  end if;
end; $$;

grant execute on function public.task_volunteer(bigint, text), public.task_unvolunteer(bigint),
  public.task_volunteer_decide(bigint, boolean) to authenticated;

-- ---------- Comunicados: aviso para todo el equipo ----------
create or replace function public.announcements_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (member_id, title, body, link)
  select m.id, '📢 Nuevo comunicado', new.title, '/noticias'
  from public.members m
  where m.estado <> 'Miembro retirado' and m.profile_id is not null
    and m.profile_id is distinct from new.author_id;
  return new;
end; $$;
drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify after insert on public.announcements
  for each row execute function public.announcements_notify();

grant execute on all functions in schema public to authenticated;
