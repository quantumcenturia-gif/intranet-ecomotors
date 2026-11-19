-- =========================================================
-- Esquema de la intranet. Ejecútalo en Supabase → SQL Editor
-- =========================================================

-- Perfiles de empleados (1 por usuario de auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  department text,
  position text,
  phone text,
  role text not null default 'empleado' check (role in ('empleado','admin')),
  created_at timestamptz not null default now()
);

-- Crear el perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Noticias / anuncios
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null,
  author_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Documentos (metadatos; el archivo vive en Storage)
create table if not exists public.documents (
  id bigint generated always as identity primary key,
  name text not null,
  path text not null unique,
  size bigint,
  uploaded_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------- Seguridad (RLS) ----------
alter table public.profiles enable row level security;
alter table public.announcements enable row level security;
alter table public.documents enable row level security;

drop policy if exists "perfiles visibles para usuarios" on public.profiles;
create policy "perfiles visibles para usuarios" on public.profiles
  for select to authenticated using (true);
drop policy if exists "cada uno edita su perfil" on public.profiles;
create policy "cada uno edita su perfil" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

drop policy if exists "noticias visibles" on public.announcements;
create policy "noticias visibles" on public.announcements
  for select to authenticated using (true);
drop policy if exists "admins publican noticias" on public.announcements;
create policy "admins publican noticias" on public.announcements
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admins borran noticias" on public.announcements;
create policy "admins borran noticias" on public.announcements
  for delete to authenticated using (public.is_admin());

drop policy if exists "documentos visibles" on public.documents;
create policy "documentos visibles" on public.documents
  for select to authenticated using (true);
drop policy if exists "usuarios suben documentos" on public.documents;
create policy "usuarios suben documentos" on public.documents
  for insert to authenticated with check (uploaded_by = auth.uid());
drop policy if exists "autor o admin borra documentos" on public.documents;
create policy "autor o admin borra documentos" on public.documents
  for delete to authenticated using (uploaded_by = auth.uid() or public.is_admin());

-- ---------- Permisos de la Data API ----------
-- Necesarios si el proyecto se creó sin "Grant API access to new tables automatically"
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.announcements, public.documents to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "leer documentos" on storage.objects;
create policy "leer documentos" on storage.objects
  for select to authenticated using (bucket_id = 'documentos');
drop policy if exists "subir documentos" on storage.objects;
create policy "subir documentos" on storage.objects
  for insert to authenticated with check (bucket_id = 'documentos' and owner = auth.uid());
drop policy if exists "borrar documentos" on storage.objects;
create policy "borrar documentos" on storage.objects
  for delete to authenticated using (bucket_id = 'documentos' and (owner = auth.uid() or public.is_admin()));

-- Para hacerte administrador (cambia el email):
-- update public.profiles set role = 'admin' where email = 'tu@empresa.com';
