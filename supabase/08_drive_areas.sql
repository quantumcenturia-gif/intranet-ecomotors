-- =====================================================================
-- Intranet Eco Motors · Coordinación puede editar los datos de las áreas
-- (por ejemplo, el enlace a la carpeta de Drive de cada área o subárea).
-- Ejecútalo DESPUÉS de 07_convocatorias_comunicados.sql.
-- =====================================================================

drop policy if exists "coordinación edita unidades" on public.units;
create policy "coordinación edita unidades" on public.units for update to authenticated
  using (public.real_is_admin() and not exists (select 1 from public.admin_preview where profile_id = auth.uid()))
  with check (public.real_is_admin());
grant update on public.units to authenticated;
