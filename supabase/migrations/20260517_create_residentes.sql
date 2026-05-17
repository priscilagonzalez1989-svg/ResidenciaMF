create table if not exists public.residentes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  email text not null unique,
  anio text not null check (anio in ('R1', 'R2', 'R3')),
  fecha_inicio date,
  activo boolean not null default true,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.residentes is 'Residentes vinculables con usuarios de Supabase Auth.';
comment on column public.residentes.user_id is 'Se completa cuando el residente se registra en la app y se vincula con auth.users.';

alter table public.residentes enable row level security;

drop policy if exists "residentes_admin_select" on public.residentes;
create policy "residentes_admin_select"
on public.residentes
for select
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

drop policy if exists "residentes_admin_insert" on public.residentes;
create policy "residentes_admin_insert"
on public.residentes
for insert
to authenticated
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

drop policy if exists "residentes_admin_update" on public.residentes;
create policy "residentes_admin_update"
on public.residentes
for update
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
)
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

drop policy if exists "residentes_admin_delete" on public.residentes;
create policy "residentes_admin_delete"
on public.residentes
for delete
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

create index if not exists residentes_anio_idx on public.residentes (anio);
create index if not exists residentes_activo_idx on public.residentes (activo);
create index if not exists residentes_user_id_idx on public.residentes (user_id);
