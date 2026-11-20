-- =====================================================================
-- Intranet Eco Motors · v3: avisos, registro de horas y documentos por área.
-- Ejecútalo en Supabase → SQL Editor DESPUÉS de 02_tareas_y_miembros.sql.
-- Se puede ejecutar varias veces sin romper nada.
-- =====================================================================

-- ---------- Avisos (notificaciones dentro de la web) ----------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_member_idx on public.notifications(member_id, read_at);

alter table public.notifications enable row level security;
drop policy if exists "ver mis avisos" on public.notifications;
create policy "ver mis avisos" on public.notifications for select to authenticated
  using (member_id = (public.my_member()).id);
drop policy if exists "marcar mis avisos" on public.notifications;
create policy "marcar mis avisos" on public.notifications for update to authenticated
  using (member_id = (public.my_member()).id);
drop policy if exists "borrar mis avisos" on public.notifications;
create policy "borrar mis avisos" on public.notifications for delete to authenticated
  using (member_id = (public.my_member()).id);

create or replace function public.notify(target uuid, actor uuid, t text, b text, l text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if target is not null and target is distinct from actor then
    insert into public.notifications (member_id, title, body, link) values (target, t, b, l);
  end if;
end; $$;

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
      perform public.notify(new.assignee_id, actor, '✅ Tarea validada', new.title, link);
    elsif new.estado = 'Observada' then
      perform public.notify(new.assignee_id, actor, '⚠️ Tarea observada', coalesce(new.resultado_revision, new.title), link);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists tasks_notify on public.tasks;
create trigger tasks_notify after insert or update on public.tasks
  for each row execute function public.tasks_notify();

create or replace function public.comments_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t public.tasks;
begin
  select * into t from public.tasks where id = new.task_id;
  perform public.notify(t.assignee_id, new.author_id, 'Nuevo comentario', t.title || ': ' || left(new.body, 120), '/tareas/' || t.id);
  if t.created_by is distinct from t.assignee_id then
    perform public.notify(t.created_by, new.author_id, 'Nuevo comentario', t.title || ': ' || left(new.body, 120), '/tareas/' || t.id);
  end if;
  return new;
end; $$;
drop trigger if exists comments_notify on public.task_comments;
create trigger comments_notify after insert on public.task_comments
  for each row execute function public.comments_notify();

-- ---------- Registro de horas ----------
create table if not exists public.time_entries (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  fecha date not null default current_date,
  horas numeric(4,2) not null check (horas > 0 and horas <= 24),
  actividad text not null,
  task_id bigint references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists time_entries_member_idx on public.time_entries(member_id, fecha);

alter table public.time_entries enable row level security;
drop policy if exists "ver horas" on public.time_entries;
create policy "ver horas" on public.time_entries for select to authenticated using (
  member_id = (public.my_member()).id
  or exists (select 1 from public.members m where m.id = member_id and public.can_manage_unit(m.unit_id))
);
drop policy if exists "registrar mis horas" on public.time_entries;
create policy "registrar mis horas" on public.time_entries for insert to authenticated
  with check (member_id = (public.my_member()).id);
drop policy if exists "borrar mis horas" on public.time_entries;
create policy "borrar mis horas" on public.time_entries for delete to authenticated using (
  member_id = (public.my_member()).id
  or exists (select 1 from public.members m where m.id = member_id and public.can_manage_unit(m.unit_id))
);

-- ---------- Documentos por área y tipo ----------
alter table public.documents add column if not exists unit_id text references public.units(id) on delete set null;
alter table public.documents add column if not exists categoria text not null default 'Otro';
alter table public.documents drop constraint if exists documents_categoria_check;
alter table public.documents add constraint documents_categoria_check
  check (categoria in ('Entregable','Recurso','Reglamento','Plantilla','Otro'));

grant select, insert, update, delete on public.notifications, public.time_entries to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
