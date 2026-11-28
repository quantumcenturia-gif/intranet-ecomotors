-- =====================================================================
-- Intranet Eco Motors · Área de Seguridad
--  - Cada tarea tiene un nivel de riesgo, sus peligros, el EPP necesario y
--    cuándo/dónde se hará el trabajo.
--  - Riesgo Medio o mayor ⇒ «permiso de trabajo»: Seguridad lo aprueba (con o sin
--    condiciones) o lo detiene. Sin permiso, la tarea no puede empezar ni validarse.
--  - Seguridad no asigna ni valida tareas: eso sigue siendo de cada área.
--  - Reportes de seguridad (falta de EPP, actos/condiciones inseguras, incidentes).
--  - Fichas de seguridad de materiales y herramientas, con «leí y entendí».
-- Ejecútalo DESPUÉS de 10_horas_por_tarea.sql. Se puede ejecutar varias veces.
-- =====================================================================

-- ---------- 1) Unidad y responsable ----------
insert into public.units (id, name, kind, parent_id, sort) values ('seguridad', 'Seguridad', 'supervision', 'ingenieria', 2)
on conflict (id) do update set name = excluded.name, kind = excluded.kind, parent_id = excluded.parent_id;
update public.units set sort = 3 where id = 'propulsion';
update public.units set sort = 4 where id = 'pilotos';

insert into public.members (full_name, unit_id, rol, estado)
select 'Marilu Andrea Malvaceda Canales', 'seguridad', 'Supervisor/a', 'Activo'
where not exists (select 1 from public.members where full_name ilike '%malvaceda%');

-- ¿Soy Seguridad? (responsables del área de Seguridad y coordinación)
create or replace function public.is_safety()
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_unit('seguridad');
$$;

-- ---------- 2) Riesgo y permiso de trabajo en las tareas ----------
alter table public.tasks add column if not exists riesgo text not null default 'Bajo';
alter table public.tasks add column if not exists peligros text[] not null default '{}';
alter table public.tasks add column if not exists epp text[] not null default '{}';
alter table public.tasks add column if not exists trabajo_inicio timestamptz;
alter table public.tasks add column if not exists trabajo_fin timestamptz;
alter table public.tasks add column if not exists trabajo_lugar text;
alter table public.tasks add column if not exists seguridad_estado text not null default 'No requiere';
alter table public.tasks add column if not exists seguridad_obs text;
alter table public.tasks add column if not exists seguridad_por uuid references public.members(id) on delete set null;
alter table public.tasks add column if not exists seguridad_at timestamptz;
alter table public.tasks drop constraint if exists tasks_riesgo_check;
alter table public.tasks add constraint tasks_riesgo_check check (riesgo in ('Bajo','Medio','Alto','Crítico'));
alter table public.tasks drop constraint if exists tasks_seguridad_estado_check;
alter table public.tasks add constraint tasks_seguridad_estado_check
  check (seguridad_estado in ('No requiere','Pendiente','Aprobada','Aprobada con condiciones','Rechazada'));
create index if not exists tasks_seguridad_idx on public.tasks(seguridad_estado) where seguridad_estado <> 'No requiere';

create or replace function public.riesgo_nivel(r text)
returns int language sql immutable as $$
  select case r when 'Medio' then 1 when 'Alto' then 2 when 'Crítico' then 3 else 0 end;
$$;

-- Reglas del permiso (se ejecuta antes de guardar la tarea)
create or replace function public.tasks_safety()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  safety boolean := public.is_safety();
  cambio_trabajo boolean;
  madre public.tasks;
begin
  if tg_op = 'INSERT' then
    new.seguridad_estado := case when public.riesgo_nivel(new.riesgo) >= 1 then 'Pendiente' else 'No requiere' end;
    new.seguridad_obs := null; new.seguridad_por := null; new.seguridad_at := null;
    -- Una subtarea de un trabajo ya aprobado (con igual o mayor riesgo) hereda el permiso
    if new.seguridad_estado = 'Pendiente' and new.parent_id is not null then
      select * into madre from public.tasks where id = new.parent_id;
      if madre.seguridad_estado in ('Aprobada','Aprobada con condiciones')
         and public.riesgo_nivel(madre.riesgo) >= public.riesgo_nivel(new.riesgo) then
        new.seguridad_estado := madre.seguridad_estado; new.seguridad_obs := madre.seguridad_obs;
        new.seguridad_por := madre.seguridad_por; new.seguridad_at := madre.seguridad_at;
      end if;
    end if;
    return new;
  end if;

  if not safety then
    -- Solo Seguridad decide el permiso
    new.seguridad_estado := old.seguridad_estado; new.seguridad_obs := old.seguridad_obs;
    new.seguridad_por := old.seguridad_por; new.seguridad_at := old.seguridad_at;
    -- Quien no dirige el área no cambia los datos de seguridad
    if not public.can_manage_unit(old.unit_id) then
      new.riesgo := old.riesgo; new.peligros := old.peligros; new.epp := old.epp;
      new.trabajo_inicio := old.trabajo_inicio; new.trabajo_fin := old.trabajo_fin; new.trabajo_lugar := old.trabajo_lugar;
    end if;
    -- Nadie baja el riesgo de un trabajo que ya pasó a Seguridad (solo Seguridad puede reclasificarlo)
    if public.riesgo_nivel(new.riesgo) < public.riesgo_nivel(old.riesgo) and public.riesgo_nivel(old.riesgo) >= 1 then
      new.riesgo := old.riesgo;
    end if;
    cambio_trabajo := new.riesgo is distinct from old.riesgo or new.peligros is distinct from old.peligros
      or new.trabajo_inicio is distinct from old.trabajo_inicio or new.trabajo_fin is distinct from old.trabajo_fin
      or new.trabajo_lugar is distinct from old.trabajo_lugar;
    if public.riesgo_nivel(new.riesgo) >= 1 and (old.seguridad_estado = 'No requiere' or cambio_trabajo) then
      -- Trabajo nuevo de riesgo o trabajo cambiado: vuelve a revisión de Seguridad
      new.seguridad_estado := 'Pendiente'; new.seguridad_por := null; new.seguridad_at := null;
    end if;
  else
    if public.riesgo_nivel(new.riesgo) = 0 then
      new.seguridad_estado := 'No requiere';
    elsif new.seguridad_estado = 'No requiere' then
      new.seguridad_estado := 'Pendiente';
    end if;
    if new.seguridad_estado is distinct from old.seguridad_estado or new.seguridad_obs is distinct from old.seguridad_obs then
      new.seguridad_por := (public.my_member()).id; new.seguridad_at := now();
    end if;
  end if;

  -- Sin permiso de Seguridad el trabajo no empieza ni se valida
  if new.seguridad_estado in ('Pendiente','Rechazada')
     and new.estado in ('En proceso','En revisión','Completada y validada')
     and new.estado is distinct from old.estado then
    raise exception 'Este trabajo es de riesgo %: necesita la aprobación de Seguridad antes de empezar o validarse.', lower(new.riesgo);
  end if;
  return new;
end; $$;
drop trigger if exists tasks_safety on public.tasks;
create trigger tasks_safety before insert or update on public.tasks
  for each row execute function public.tasks_safety();

-- Avisos del permiso
create or replace function public.safety_approvers()
returns setof uuid language sql stable security definer set search_path = public as $$
  select m.id from public.members m
  where m.unit_id = 'seguridad' and m.rol in ('Supervisor/a','Encargado/a') and m.profile_id is not null and not m.es_prueba
  union
  -- Si Seguridad aún no tiene cuenta, avisa a coordinación
  select m.id from public.members m
  where m.rol = 'Coordinador general' and m.profile_id is not null and not m.es_prueba
    and not exists (select 1 from public.members s where s.unit_id = 'seguridad' and s.rol in ('Supervisor/a','Encargado/a')
                    and s.profile_id is not null and not s.es_prueba);
$$;

create or replace function public.tasks_safety_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor uuid := (public.my_member()).id;
  link text := '/tareas/' || new.id;
  titulo text;
  quien uuid;
begin
  if new.seguridad_estado = 'Pendiente' and (tg_op = 'INSERT' or old.seguridad_estado is distinct from 'Pendiente') then
    for quien in select public.safety_approvers() loop
      perform public.notify(quien, actor, '🦺 Trabajo de riesgo ' || lower(new.riesgo) || ' por aprobar', new.title, link);
    end loop;
  elsif tg_op = 'UPDATE' and new.seguridad_estado is distinct from old.seguridad_estado
        and new.seguridad_estado in ('Aprobada','Aprobada con condiciones','Rechazada') then
    titulo := case new.seguridad_estado
      when 'Aprobada' then '🦺 Seguridad aprobó el trabajo'
      when 'Aprobada con condiciones' then '🦺 Seguridad aprobó con condiciones'
      else '⛔ Seguridad no aprobó el trabajo' end;
    for quien in
      select new.assignee_id union select new.created_by
      union select p.member_id from public.task_participants p where p.task_id = new.id
    loop
      perform public.notify(quien, actor, titulo, coalesce(new.seguridad_obs, new.title), link);
    end loop;
  end if;
  return null;
end; $$;
drop trigger if exists tasks_safety_notify on public.tasks;
create trigger tasks_safety_notify after insert or update on public.tasks
  for each row execute function public.tasks_safety_notify();

-- Seguridad decide (la tarea puede ser de cualquier área)
create or replace function public.safety_decide(p_task bigint, p_estado text, p_obs text, p_riesgo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_safety() then raise exception 'Solo el área de Seguridad aprueba trabajos de riesgo'; end if;
  if p_estado not in ('Pendiente','Aprobada','Aprobada con condiciones','Rechazada') then raise exception 'Decisión no válida'; end if;
  if p_estado in ('Aprobada con condiciones','Rechazada') and coalesce(trim(p_obs), '') = '' then
    raise exception 'Escribe las condiciones o el motivo';
  end if;
  update public.tasks
     set riesgo = coalesce(nullif(p_riesgo, ''), riesgo),
         seguridad_estado = case when public.riesgo_nivel(coalesce(nullif(p_riesgo, ''), riesgo)) = 0 then 'No requiere' else p_estado end,
         seguridad_obs = nullif(trim(p_obs), '')
   where id = p_task;
  if not found then raise exception 'Tarea no encontrada'; end if;
end; $$;

-- Las subtareas de una convocatoria heredan horas y datos de seguridad (y su permiso, si ya está aprobado)
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
    insert into public.tasks (title, description, unit_id, assignee_id, created_by, parent_id, project_id, tipo, prioridad, fecha_limite, horas,
                              riesgo, peligros, epp, trabajo_inicio, trabajo_fin, trabajo_lugar)
    values (t.title, t.description, m.unit_id, m.id, me.id, t.id, t.project_id, 'Coordinación con subárea', t.prioridad, t.fecha_limite, t.horas,
            t.riesgo, t.peligros, t.epp, t.trabajo_inicio, t.trabajo_fin, t.trabajo_lugar)
    returning id into sub;
    update public.task_volunteers set estado = 'Aceptado', subtask_id = sub where id = v.id;
  else
    update public.task_volunteers set estado = 'Rechazado' where id = v.id;
    perform public.notify(m.id, me.id, 'No fuiste seleccionado/a esta vez', t.title, '/tareas/' || t.id);
  end if;
end; $$;

-- Seguridad ve todos los trabajos de riesgo (además de lo que ya veía cada uno)
create or replace function public.can_see_task(t public.tasks)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_unit(t.unit_id)
      or (t.riesgo <> 'Bajo' and public.is_safety())
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

-- ---------- 3) Reportes de seguridad ----------
create table if not exists public.safety_reports (
  id bigint generated always as identity primary key,
  fecha date not null default public.lima_today(),
  tipo text not null check (tipo in ('Falta de EPP','Acto inseguro','Condición insegura','Casi accidente','Incidente','Accidente')),
  severidad text not null default 'Leve' check (severidad in ('Leve','Moderada','Grave')),
  descripcion text not null,
  lugar text,
  unit_id text references public.units(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  task_id bigint references public.tasks(id) on delete set null,
  accion text,
  estado text not null default 'Abierto' check (estado in ('Abierto','En seguimiento','Cerrado')),
  reportado_por uuid references public.members(id) on delete set null,
  cerrado_por uuid references public.members(id) on delete set null,
  cerrado_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists safety_reports_fecha_idx on public.safety_reports(fecha desc);

alter table public.safety_reports enable row level security;
drop policy if exists "ver reportes de seguridad" on public.safety_reports;
create policy "ver reportes de seguridad" on public.safety_reports for select to authenticated using (
  public.is_safety()
  or reportado_por = (public.my_member()).id
  or member_id = (public.my_member()).id
  or (unit_id is not null and public.can_manage_unit(unit_id))
  or exists (select 1 from public.members m where m.id = member_id and public.can_manage_unit(m.unit_id))
);
-- Cualquiera puede reportar (la seguridad es de todos)
drop policy if exists "reportar" on public.safety_reports;
create policy "reportar" on public.safety_reports for insert to authenticated with check (
  reportado_por = (public.my_member()).id and estado = 'Abierto' and accion is null
);
drop policy if exists "seguridad gestiona reportes" on public.safety_reports;
create policy "seguridad gestiona reportes" on public.safety_reports for update to authenticated
  using (public.is_safety()) with check (public.is_safety());
drop policy if exists "seguridad borra reportes" on public.safety_reports;
create policy "seguridad borra reportes" on public.safety_reports for delete to authenticated using (public.is_safety());
grant select, insert, update, delete on public.safety_reports to authenticated;

create or replace function public.safety_reports_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare quien uuid; actor uuid := (public.my_member()).id;
begin
  if tg_op = 'INSERT' then
    for quien in select public.safety_approvers() loop
      perform public.notify(quien, actor, '🦺 Nuevo reporte: ' || new.tipo, left(new.descripcion, 140), '/seguridad?vista=reportes');
    end loop;
    perform public.notify(new.member_id, actor, '🦺 Observación de seguridad registrada',
      'Seguridad te contactará para revisarla juntos. ' || new.tipo, '/seguridad?vista=reportes');
  elsif new.estado = 'Cerrado' and old.estado is distinct from 'Cerrado' then
    perform public.notify(new.reportado_por, actor, '✅ Tu reporte de seguridad fue atendido', coalesce(new.accion, new.tipo), '/seguridad?vista=reportes');
  end if;
  return null;
end; $$;
drop trigger if exists safety_reports_trigger on public.safety_reports;
create trigger safety_reports_trigger after insert or update on public.safety_reports
  for each row execute function public.safety_reports_trigger();

create or replace function public.safety_reports_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.reportado_por := coalesce(new.reportado_por, (public.my_member()).id);
  elsif new.estado = 'Cerrado' and old.estado is distinct from 'Cerrado' then
    new.cerrado_por := (public.my_member()).id; new.cerrado_at := now();
  elsif new.estado <> 'Cerrado' then
    new.cerrado_por := null; new.cerrado_at := null;
  end if;
  return new;
end; $$;
drop trigger if exists safety_reports_guard on public.safety_reports;
create trigger safety_reports_guard before insert or update on public.safety_reports
  for each row execute function public.safety_reports_guard();

-- Días desde el último incidente o accidente (-1 si nunca hubo uno)
create or replace function public.dias_sin_incidentes()
returns int language sql stable security definer set search_path = public as $$
  select coalesce(public.lima_today() - max(fecha), -1) from public.safety_reports where tipo in ('Incidente','Accidente');
$$;

-- ---------- 4) Fichas de seguridad y «leí y entendí» ----------
create table if not exists public.safety_sheets (
  id bigint generated always as identity primary key,
  titulo text not null,
  categoria text not null default 'Material'
    check (categoria in ('Reglas del taller','Material','Herramienta','Proceso','EPP','Emergencia')),
  peligros text,
  epp text[] not null default '{}',
  precauciones text,
  primeros_auxilios text,
  enlace text,
  obligatoria boolean not null default false,
  publicada boolean not null default true,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.safety_reads (
  sheet_id bigint not null references public.safety_sheets(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (sheet_id, member_id)
);

alter table public.safety_sheets enable row level security;
drop policy if exists "ver fichas" on public.safety_sheets;
create policy "ver fichas" on public.safety_sheets for select to authenticated using (publicada or public.is_safety());
drop policy if exists "seguridad gestiona fichas" on public.safety_sheets;
create policy "seguridad gestiona fichas" on public.safety_sheets for all to authenticated
  using (public.is_safety()) with check (public.is_safety());
grant select, insert, update, delete on public.safety_sheets to authenticated;

alter table public.safety_reads enable row level security;
drop policy if exists "ver lecturas" on public.safety_reads;
create policy "ver lecturas" on public.safety_reads for select to authenticated using (
  member_id = (public.my_member()).id or public.is_safety()
  or exists (select 1 from public.members m where m.id = member_id and public.can_manage_unit(m.unit_id))
);
drop policy if exists "confirmar lectura" on public.safety_reads;
create policy "confirmar lectura" on public.safety_reads for insert to authenticated with check (
  member_id = (public.my_member()).id
  and exists (select 1 from public.safety_sheets s where s.id = sheet_id and s.publicada)
);
grant select, insert on public.safety_reads to authenticated;

-- Al publicar una ficha obligatoria, se avisa a todo el equipo
create or replace function public.safety_sheets_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  if new.publicada and new.obligatoria
     and (tg_op = 'INSERT' or not (old.publicada and old.obligatoria)) then
    insert into public.notifications (member_id, title, body, link)
    select m.id, '🦺 Ficha de seguridad para leer', new.titulo, '/seguridad?vista=fichas'
    from public.members m
    where m.estado <> 'Miembro retirado' and m.profile_id is not null and not m.es_prueba
      and m.id is distinct from (public.my_member()).id;
  end if;
  return new;
end; $$;
drop trigger if exists safety_sheets_trigger on public.safety_sheets;
create trigger safety_sheets_trigger before insert or update on public.safety_sheets
  for each row execute function public.safety_sheets_trigger();

-- Fichas iniciales (borradores: Seguridad las revisa, ajusta y publica)
insert into public.safety_sheets (titulo, categoria, peligros, epp, precauciones, primeros_auxilios, obligatoria, publicada)
select * from (values
  ('Reglas básicas del taller', 'Reglas del taller',
   'Golpes, cortes, proyección de partículas, atrapamiento en máquinas y tropiezos.',
   array['Lentes de seguridad','Zapatos de seguridad'],
   'Lentes de seguridad siempre dentro del taller. Zapato cerrado, cabello recogido y sin anillos, pulseras ni ropa suelta cerca de máquinas. Mantén el área ordenada y despejada. Conoce dónde están el extintor, el botiquín y la salida. Nunca trabajes solo/a en tareas de riesgo. Avisa a Seguridad de cualquier condición insegura.',
   'Ante cualquier lesión, avisa de inmediato al responsable presente y a Seguridad. Usa el botiquín solo para lesiones leves; si es grave, llama a emergencias.',
   true, false),
  ('Resinas epóxicas y materiales compuestos (fibra de carbono y de vidrio)', 'Material',
   'Irritación y sensibilización de la piel (dermatitis), irritación de ojos y vías respiratorias por vapores. El polvo y las fibras del lijado o corte irritan la piel, los ojos y los pulmones.',
   array['Guantes de nitrilo','Lentes de seguridad','Respirador o mascarilla'],
   'Lee la hoja de seguridad (SDS) del fabricante antes de usar el producto. Trabaja con buena ventilación. Usa manga larga. No lijes en seco sin aspiración ni protección respiratoria. No comas ni bebas en el área. Desecha restos y guantes según las indicaciones del fabricante.',
   'Piel: lava con agua y jabón (no uses solventes). Ojos: enjuaga con agua limpia al menos 15 minutos. Inhalación: sal al aire libre. Si la molestia continúa, busca atención médica y lleva la hoja de seguridad.',
   true, false),
  ('Soldadura y corte con calor', 'Proceso',
   'Radiación del arco (quemaduras en ojos y piel), humos metálicos, quemaduras, incendio y descarga eléctrica.',
   array['Careta de soldar','Guantes de soldador','Mandil o ropa ignífuga','Zapatos de seguridad'],
   'Solo con permiso de Seguridad. Área ventilada y sin materiales inflamables cerca. Extintor a la mano. Protege a los demás del arco con biombos o avisando antes de encender. Revisa cables y conexiones antes de empezar. No uses ropa sintética.',
   'Quemadura: enfría con agua corriente 10 a 20 minutos; no apliques cremas ni hielo. Molestia en los ojos después de soldar: busca atención médica.',
   false, false),
  ('Amoladora y herramientas de corte', 'Herramienta',
   'Proyección de partículas y chispas, cortes, rotura del disco, ruido y contragolpe.',
   array['Lentes de seguridad','Careta facial','Guantes anticorte','Protección auditiva'],
   'Usa siempre la guarda. Elige el disco correcto para el material y la velocidad de la máquina. Sujeta bien la pieza. Desconecta la herramienta para cambiar el disco. No la fuerces ni la dejes girando al apoyarla. Dirige las chispas lejos de personas y materiales inflamables.',
   'Corte: presiona con gasa limpia y eleva la zona. Partícula en el ojo: no frotes; enjuaga con agua y busca atención médica.',
   false, false),
  ('Baterías de litio y sistemas de alta tensión', 'Material',
   'Incendio o explosión por cortocircuito, golpe o sobrecarga; descarga eléctrica; gases tóxicos si la batería se daña.',
   array['Lentes de seguridad','Guantes aislantes'],
   'Solo con permiso de Seguridad. Quítate anillos, relojes y objetos metálicos. Usa herramientas aisladas y cubre los terminales. No perfores, golpees ni deformes las celdas. Carga solo con el cargador adecuado y bajo supervisión. Guarda las baterías en un recipiente resistente al fuego, lejos de materiales inflamables.',
   'Si una batería se hincha, humea o se calienta: aléjate, avisa y evacúa el área; no respires el humo. Ante una descarga eléctrica, corta la energía antes de tocar a la persona y llama a emergencias.',
   false, false),
  ('Pruebas en pista', 'Proceso',
   'Atropello, choque o vuelco del prototipo, quemaduras por partes calientes y caídas.',
   array['Casco','Guantes anticorte','Zapatos de seguridad'],
   'Solo con permiso de Seguridad. Delimita la pista y mantén al público y al equipo fuera de ella. Define quién da las señales y cómo se comunican. Extintor y botiquín en el lugar. El piloto usa su equipo completo y revisa frenos y dirección antes de salir.',
   'Ante un choque, no muevas a la persona si se queja de cuello o espalda; llama a emergencias y avisa a Seguridad.',
   false, false)
) as v(titulo, categoria, peligros, epp, precauciones, primeros_auxilios, obligatoria, publicada)
where not exists (select 1 from public.safety_sheets s where s.titulo = v.titulo);

grant execute on all functions in schema public to authenticated;
