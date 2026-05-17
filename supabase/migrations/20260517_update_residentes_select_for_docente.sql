drop policy if exists "residentes_admin_select" on public.residentes;
drop policy if exists "residentes_admin_docente_select" on public.residentes;
drop policy if exists "residentes_admin_update" on public.residentes;
drop policy if exists "residentes_admin_or_self_update" on public.residentes;

create policy "residentes_admin_docente_select"
on public.residentes
for select
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'docente')
  or user_id = auth.uid()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

create policy "residentes_admin_or_self_update"
on public.residentes
for update
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or user_id = auth.uid()
  or lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or (
    lower(email) = lower(auth.jwt() ->> 'email')
    and user_id = auth.uid()
  )
);
