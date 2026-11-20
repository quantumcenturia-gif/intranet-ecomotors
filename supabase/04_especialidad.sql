-- Intranet Eco Motors · especialidad y ciclo de cada integrante
alter table public.members add column if not exists especialidad text;
alter table public.members add column if not exists ciclo smallint check (ciclo between 1 and 12);
