create table if not exists public.docentes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  email text not null unique,
  activo boolean not null default true,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.docentes is 'Docentes vinculables con usuarios de Supabase Auth.';
comment on column public.docentes.user_id is 'Se completa cuando el docente se registra en la app y se vincula con auth.users.';

alter table public.docentes enable row level security;

drop policy if exists "docentes_admin_or_docente_select" on public.docentes;
create policy "docentes_admin_or_docente_select"
on public.docentes
for select
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'docente')
);

drop policy if exists "docentes_admin_insert" on public.docentes;
create policy "docentes_admin_insert"
on public.docentes
for insert
to authenticated
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

drop policy if exists "docentes_admin_update" on public.docentes;
create policy "docentes_admin_update"
on public.docentes
for update
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
)
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

drop policy if exists "docentes_admin_delete" on public.docentes;
create policy "docentes_admin_delete"
on public.docentes
for delete
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
);

create index if not exists docentes_activo_idx on public.docentes (activo);
create index if not exists docentes_user_id_idx on public.docentes (user_id);
