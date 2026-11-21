-- =====================================================================
-- Intranet Eco Motors · correcciones tras la auditoría de permisos
-- 1) Evidencias: solo las ve quien puede ver la tarea.
-- 2) Contexto: puedes ver las tareas madre de las tareas que te tocan.
-- 3) Sincronización: el avance de una tarea madre se calcula con sus subtareas.
-- =====================================================================

-- 1) Evidencias privadas por tarea
drop policy if exists "leer evidencias" on storage.objects;
create policy "leer evidencias" on storage.objects for select to authenticated using (
  bucket_id = 'evidencias' and (
    owner = auth.uid()
    or exists (
      select 1 from public.task_files f join public.tasks t on t.id = f.task_id
      where f.path = storage.objects.name and public.can_see_task(t)
    )
  )
);
drop policy if exists "borrar evidencias" on storage.objects;
create policy "borrar evidencias" on storage.objects for delete to authenticated using (
  bucket_id = 'evidencias' and (
    owner = auth.uid()
    or exists (
      select 1 from public.task_files f join public.tasks t on t.id = f.task_id
      where f.path = storage.objects.name and public.can_manage_unit(t.unit_id)
    )
  )
);

-- 2) Ver la cadena de tareas madre (contexto) de lo que me toca
create or replace function public.can_see_task(t public.tasks)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_unit(t.unit_id)
      or exists (
        select 1 from public.members m where m.profile_id = auth.uid()
          and (m.id = t.assignee_id or m.id = t.created_by or m.unit_id = t.unit_id)
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

-- 3) Avance de la tarea madre = media de sus subtareas (las validadas cuentan 100 %)
create or replace function public.recalc_parent(pid bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  media int;
begin
  if pid is null then return; end if;
  select round(avg(case when estado = 'Completada y validada' then 100 else avance end))
    into media from public.tasks where parent_id = pid and estado <> 'Cancelada';
  if media is not null then
    update public.tasks set avance = media
    where id = pid and avance is distinct from media and estado not in ('Completada y validada','Cancelada');
  end if;
end; $$;

create or replace function public.sync_parent_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p public.tasks;
  pendientes int;
begin
  if tg_op = 'DELETE' then
    perform public.recalc_parent(old.parent_id);
    return null;
  end if;
  perform public.recalc_parent(new.parent_id);
  if tg_op = 'UPDATE' and old.parent_id is distinct from new.parent_id then
    perform public.recalc_parent(old.parent_id);
  end if;

  -- Aviso cuando se valida la última subtarea pendiente
  if tg_op = 'UPDATE' and new.parent_id is not null
     and new.estado = 'Completada y validada' and old.estado is distinct from new.estado then
    select count(*) into pendientes from public.tasks
      where parent_id = new.parent_id and estado not in ('Completada y validada','Cancelada');
    if pendientes = 0 then
      select * into p from public.tasks where id = new.parent_id;
      perform public.notify(p.assignee_id, null, '🏁 Todas las subtareas completadas', p.title, '/tareas/' || p.id);
      if p.created_by is distinct from p.assignee_id then
        perform public.notify(p.created_by, null, '🏁 Todas las subtareas completadas', p.title, '/tareas/' || p.id);
      end if;
    end if;
  end if;
  return null;
end; $$;

drop trigger if exists sync_parent_progress on public.tasks;
create trigger sync_parent_progress after insert or delete or update of avance, estado, parent_id on public.tasks
  for each row execute function public.sync_parent_progress();

grant execute on all functions in schema public to authenticated;
