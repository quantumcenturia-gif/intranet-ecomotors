-- =====================================================================
-- Intranet Eco Motors · v2: unidades, miembros, tareas jerárquicas,
-- calendario, proyectos e imágenes.
-- Ejecútalo en Supabase → SQL Editor DESPUÉS de schema.sql.
-- Se puede ejecutar varias veces sin romper nada.
-- =====================================================================

-- ---------- Unidades (áreas, supervisiones y subáreas) ----------
create table if not exists public.units (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('area','supervision','subarea')),
  parent_id text references public.units(id),
  sort int not null default 0
);

insert into public.units (id, name, kind, parent_id, sort) values
  ('coordinacion',  'Coordinación general',       'area',        null,            1),
  ('administrativa','Administrativa',             'area',        null,            2),
  ('logistica',     'Logística y Operaciones',    'subarea',     'administrativa',1),
  ('marketing',     'Marketing y Comunicación',   'subarea',     'administrativa',2),
  ('ingenieria',    'Ingeniería',                 'area',        null,            3),
  ('mecanica',      'Mecánica',                   'supervision', 'ingenieria',    1),
  ('estructuras',   'Estructuras y Chasis',       'subarea',     'mecanica',      1),
  ('direccion',     'Dirección y Suspensión',     'subarea',     'mecanica',      2),
  ('aerodinamica',  'Aerodinámica y Carrocería',  'subarea',     'mecanica',      3),
  ('propulsion',    'Propulsión',                 'supervision', 'ingenieria',    2),
  ('powertrain',    'Powertrain',                 'subarea',     'propulsion',    1),
  ('energia',       'Energía',                    'subarea',     'propulsion',    2),
  ('electronica',   'Electrónica',                'subarea',     'propulsion',    3),
  ('pilotos',       'Pilotos',                    'subarea',     'ingenieria',    3),
  ('por-asignar',   'Por asignar',                'area',        null,            9)
on conflict (id) do update set name = excluded.name, kind = excluded.kind,
  parent_id = excluded.parent_id, sort = excluded.sort;

-- ¿La unidad u está dentro de root (o es root)?
create or replace function public.unit_in_subtree(u text, root text)
returns boolean language sql stable as $$
  with recursive up as (
    select id, parent_id from public.units where id = u
    union all
    select p.id, p.parent_id from public.units p join up on p.id = up.parent_id
  )
  select exists (select 1 from up where id = root);
$$;

-- ---------- Miembros del equipo ----------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  unit_id text not null default 'por-asignar' references public.units(id),
  rol text not null default 'Integrante'
    check (rol in ('Coordinador general','Supervisor/a','Encargado/a','Integrante','Egresado asesor')),
  estado text not null default 'Activo'
    check (estado in ('Activo','Inactivo justificado','Miembro retirado','Egresado asesor')),
  condicion text not null default 'Miembro confirmado'
    check (condicion in ('Miembro confirmado','Por confirmar','Postulante')),
  email text unique,
  phone text,
  birthday date,
  avatar_url text,
  bio text,
  profile_id uuid unique references public.profiles(id) on delete set null,
  notion_id text unique,
  created_at timestamptz not null default now()
);
create index if not exists members_unit_idx on public.members(unit_id);

-- Vincula automáticamente la ficha con la cuenta que tenga el mismo email
create or replace function public.link_member_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then
    new.email := lower(trim(new.email));
    select id into new.profile_id from public.profiles where lower(email) = new.email;
  end if;
  return new;
end; $$;
drop trigger if exists members_link_profile on public.members;
create trigger members_link_profile before insert or update of email on public.members
  for each row execute function public.link_member_profile();

create or replace function public.link_profile_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.members set profile_id = new.id
  where lower(email) = lower(new.email) and profile_id is null;
  return new;
end; $$;
drop trigger if exists profiles_link_member on public.profiles;
create trigger profiles_link_member after insert on public.profiles
  for each row execute function public.link_profile_member();

-- ---------- Funciones de permisos ----------
create or replace function public.my_member()
returns public.members language sql stable security definer set search_path = public as $$
  select * from public.members where profile_id = auth.uid() limit 1;
$$;

-- Coordinación = admin de la intranet o miembro con rol Coordinador general
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      or exists (select 1 from public.members where profile_id = auth.uid() and rol = 'Coordinador general');
$$;

-- ¿Puedo gestionar (crear/editar/asignar) tareas de esta unidad?
create or replace function public.can_manage_unit(u text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.members m
    where m.profile_id = auth.uid()
      and m.rol in ('Supervisor/a','Encargado/a')
      and public.unit_in_subtree(u, m.unit_id)
  );
$$;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.members where profile_id = auth.uid() and rol in ('Supervisor/a','Encargado/a')
  );
$$;

-- ---------- Proyectos ----------
create table if not exists public.projects (
  id text primary key,
  name text not null,
  description text,
  emoji text,
  image_url text,
  sort int not null default 0
);
insert into public.projects (id, name, description, emoji, sort) values
  ('hualkana','HUALKANA','Prototipos eléctricos de alta eficiencia.','⚡',1),
  ('hydra','HYDRA','Investigación en propulsión con hidrógeno.','🔋',2),
  ('urban-concept','URBAN CONCEPT','Diseño de movilidad urbana sostenible.','🚘',3),
  ('polar-3d','POLAR 3D','Manufactura e impresión de gran formato.','🖨️',4),
  ('banco-de-pruebas','BANCO DE PRUEBAS','Ensayos y caracterización de motores.','🧪',5)
on conflict (id) do nothing;

-- ---------- Tareas (jerárquicas y enlazadas) ----------
create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  title text not null,
  description text,                         -- Objetivo y criterios
  unit_id text not null references public.units(id),
  assignee_id uuid references public.members(id) on delete set null,
  created_by uuid references public.members(id) on delete set null,
  parent_id bigint references public.tasks(id) on delete cascade,   -- tarea madre
  project_id text references public.projects(id) on delete set null,
  tipo text not null default 'Del encargado'
    check (tipo in ('Del encargado','Del integrante','Coordinación con subárea','De supervisión')),
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente','En proceso','En revisión','Completada y validada','Observada','Cancelada')),
  prioridad text not null default 'MEDIA' check (prioridad in ('BAJA','MEDIA','ALTA')),
  avance int not null default 0 check (avance between 0 and 100),
  fecha_asignacion date not null default current_date,
  fecha_limite date,
  entrega_url text,                          -- enlace a Drive u otra entrega
  entrega_nota text,
  revisor_id uuid references public.members(id) on delete set null,
  resultado_revision text,
  revisado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_unit_idx on public.tasks(unit_id);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);
create index if not exists tasks_parent_idx on public.tasks(parent_id);

create table if not exists public.task_files (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id) on delete cascade,
  name text not null,
  path text not null unique,
  size bigint,
  uploaded_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_comments (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks(id) on delete cascade,
  author_id uuid references public.members(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

-- ¿Puedo ver esta tarea?
create or replace function public.can_see_task(t public.tasks)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_unit(t.unit_id)
      or exists (
        select 1 from public.members m where m.profile_id = auth.uid()
          and (m.id = t.assignee_id or m.id = t.created_by or m.unit_id = t.unit_id)
      );
$$;

-- El responsable de una tarea (sin ser gestor) solo puede cambiar su avance y entrega
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
    new.revisado_at := old.revisado_at;
  end if;
  return new;
end; $$;
drop trigger if exists tasks_guard on public.tasks;
create trigger tasks_guard before update on public.tasks
  for each row execute function public.tasks_guard();

-- ---------- Calendario ----------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  tipo text not null default 'Otro'
    check (tipo in ('Reunión de directores','Trabajo en taller','Prueba de pilotos','Otro')),
  estado text not null default 'Planificada' check (estado in ('Planificada','Realizada','Cancelada')),
  lugar text,
  dirigido_a text[] not null default '{}',
  notas text,
  notion_id text unique,
  created_at timestamptz not null default now()
);

-- ---------- Noticias con imagen ----------
alter table public.announcements add column if not exists image_url text;

-- ---------- Seguridad (RLS) ----------
alter table public.units enable row level security;
alter table public.members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_files enable row level security;
alter table public.task_comments enable row level security;
alter table public.events enable row level security;

drop policy if exists "ver unidades" on public.units;
create policy "ver unidades" on public.units for select to authenticated using (true);

drop policy if exists "ver miembros" on public.members;
create policy "ver miembros" on public.members for select to authenticated using (true);
drop policy if exists "coordinacion gestiona miembros" on public.members;
create policy "coordinacion gestiona miembros" on public.members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "cada uno edita su ficha" on public.members;
create policy "cada uno edita su ficha" on public.members for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Al editar su propia ficha, un integrante no puede cambiarse de unidad, rol ni estado
create or replace function public.members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.unit_id := old.unit_id; new.rol := old.rol; new.estado := old.estado;
    new.condicion := old.condicion; new.email := old.email; new.profile_id := old.profile_id;
    new.notion_id := old.notion_id;
  end if;
  return new;
end; $$;
drop trigger if exists members_guard on public.members;
create trigger members_guard before update on public.members
  for each row execute function public.members_guard();

drop policy if exists "ver proyectos" on public.projects;
create policy "ver proyectos" on public.projects for select to authenticated using (true);
drop policy if exists "coordinacion gestiona proyectos" on public.projects;
create policy "coordinacion gestiona proyectos" on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ver tareas" on public.tasks;
create policy "ver tareas" on public.tasks for select to authenticated using (public.can_see_task(tasks));
drop policy if exists "crear tareas" on public.tasks;
create policy "crear tareas" on public.tasks for insert to authenticated with check (
  public.can_manage_unit(unit_id)
  or (tipo = 'Del integrante' and assignee_id = (public.my_member()).id and unit_id = (public.my_member()).unit_id)
);
drop policy if exists "editar tareas" on public.tasks;
create policy "editar tareas" on public.tasks for update to authenticated using (
  public.can_manage_unit(unit_id) or assignee_id = (public.my_member()).id
);
drop policy if exists "borrar tareas" on public.tasks;
create policy "borrar tareas" on public.tasks for delete to authenticated using (public.can_manage_unit(unit_id));

drop policy if exists "ver evidencias" on public.task_files;
create policy "ver evidencias" on public.task_files for select to authenticated using (
  exists (select 1 from public.tasks t where t.id = task_id and public.can_see_task(t))
);
drop policy if exists "subir evidencias" on public.task_files;
create policy "subir evidencias" on public.task_files for insert to authenticated with check (
  exists (select 1 from public.tasks t where t.id = task_id
          and (public.can_manage_unit(t.unit_id) or t.assignee_id = (public.my_member()).id))
);
drop policy if exists "borrar evidencias" on public.task_files;
create policy "borrar evidencias" on public.task_files for delete to authenticated using (
  uploaded_by = (public.my_member()).id
  or exists (select 1 from public.tasks t where t.id = task_id and public.can_manage_unit(t.unit_id))
);

drop policy if exists "ver comentarios" on public.task_comments;
create policy "ver comentarios" on public.task_comments for select to authenticated using (
  exists (select 1 from public.tasks t where t.id = task_id and public.can_see_task(t))
);
drop policy if exists "comentar" on public.task_comments;
create policy "comentar" on public.task_comments for insert to authenticated with check (
  author_id = (public.my_member()).id
  and exists (select 1 from public.tasks t where t.id = task_id and public.can_see_task(t))
);

drop policy if exists "ver eventos" on public.events;
create policy "ver eventos" on public.events for select to authenticated using (true);
drop policy if exists "gestores gestionan eventos" on public.events;
create policy "gestores gestionan eventos" on public.events for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- Noticias: también pueden publicar supervisores y encargados
drop policy if exists "admins publican noticias" on public.announcements;
create policy "admins publican noticias" on public.announcements
  for insert to authenticated with check (public.is_manager());

grant select, insert, update, delete on
  public.units, public.members, public.projects, public.tasks,
  public.task_files, public.task_comments, public.events
  to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- ---------- Storage: fotos (públicas) y evidencias (privadas) ----------
insert into storage.buckets (id, name, public) values ('imagenes', 'imagenes', true)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;

drop policy if exists "subir imagenes" on storage.objects;
create policy "subir imagenes" on storage.objects for insert to authenticated
  with check (bucket_id = 'imagenes' and owner = auth.uid());
drop policy if exists "borrar imagenes propias" on storage.objects;
create policy "borrar imagenes propias" on storage.objects for delete to authenticated
  using (bucket_id = 'imagenes' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "leer evidencias" on storage.objects;
create policy "leer evidencias" on storage.objects for select to authenticated
  using (bucket_id = 'evidencias');
drop policy if exists "subir evidencias" on storage.objects;
create policy "subir evidencias" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias' and owner = auth.uid());
drop policy if exists "borrar evidencias" on storage.objects;
create policy "borrar evidencias" on storage.objects for delete to authenticated
  using (bucket_id = 'evidencias' and (owner = auth.uid() or public.is_manager()));
