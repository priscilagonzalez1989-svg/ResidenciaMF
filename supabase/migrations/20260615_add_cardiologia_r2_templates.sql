alter table public.examenes
  alter column residente_id drop not null;

alter table public.examenes
  add column if not exists titulo text,
  add column if not exists seccion text,
  add column if not exists anio_habilitado text[] default array['R2']::text[],
  add column if not exists fecha_inicio timestamptz,
  add column if not exists fecha_fin timestamptz,
  add column if not exists activo boolean not null default false,
  add column if not exists created_by uuid,
  add column if not exists examen_padre_id uuid references public.examenes (id) on delete set null,
  add column if not exists has_imagen boolean not null default false;

alter table public.examenes
  drop constraint if exists examenes_estado_check;

alter table public.examenes
  add constraint examenes_estado_check
  check (estado in ('plantilla', 'en_curso', 'completado', 'recuperatorio'));

update public.examenes
set
  titulo = coalesce(titulo, rotacion || ' · Evaluación'),
  anio_habilitado = coalesce(anio_habilitado, array['R2', 'R3']::text[]),
  activo = coalesce(activo, false),
  has_imagen = coalesce(has_imagen, false)
where true;

alter table public.examenes_preguntas
  add column if not exists pregunta_id bigint references public.banco_preguntas (id),
  add column if not exists es_recuperatorio boolean not null default false;

update public.examenes_preguntas ep
set pregunta_id = bp.id
from public.banco_preguntas bp
where bp.numero = ep.pregunta_numero
  and ep.pregunta_id is null;

alter table public.banco_preguntas
  add column if not exists seccion text;

update public.banco_preguntas
set seccion = 'Cardiologia'
where numero in (14, 112, 139, 140, 179, 180, 248, 249, 250, 251, 253, 254, 255, 257, 258);

create index if not exists examenes_plantillas_idx
  on public.examenes (seccion, activo, fecha_inicio, fecha_fin)
  where residente_id is null;

create index if not exists examenes_examen_padre_idx
  on public.examenes (examen_padre_id);

create index if not exists examenes_preguntas_recuperatorio_idx
  on public.examenes_preguntas (examen_id, es_recuperatorio, orden);

create index if not exists banco_preguntas_seccion_idx
  on public.banco_preguntas (seccion, anio, activa);

drop policy if exists "examenes_select_policy" on public.examenes;
create policy "examenes_select_policy"
on public.examenes
for select
to authenticated
using (
  exists (
    select 1
    from public.residentes r
    where r.id = residente_id
      and r.user_id = auth.uid()
  )
  or auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'docente')
  or (
    residente_id is null
    and activo = true
    and (
      fecha_inicio is null or fecha_inicio <= now()
    )
    and (
      fecha_fin is null or fecha_fin >= now()
    )
    and exists (
      select 1
      from public.residentes r
      where r.user_id = auth.uid()
        and r.activo = true
        and coalesce(anio_habilitado, array[]::text[]) @> array[r.anio]
    )
  )
);

drop policy if exists "examenes_insert_policy" on public.examenes;
create policy "examenes_insert_policy"
on public.examenes
for insert
to authenticated
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or (
    residente_id is not null
    and exists (
      select 1
      from public.residentes r
      where r.id = residente_id
        and r.user_id = auth.uid()
    )
  )
);

drop policy if exists "examenes_update_policy" on public.examenes;
create policy "examenes_update_policy"
on public.examenes
for update
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or (
    residente_id is not null
    and exists (
      select 1
      from public.residentes r
      where r.id = residente_id
        and r.user_id = auth.uid()
    )
  )
)
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or (
    residente_id is not null
    and exists (
      select 1
      from public.residentes r
      where r.id = residente_id
        and r.user_id = auth.uid()
    )
  )
);

drop policy if exists "examenes_preguntas_select_policy" on public.examenes_preguntas;
create policy "examenes_preguntas_select_policy"
on public.examenes_preguntas
for select
to authenticated
using (
  exists (
    select 1
    from public.examenes e
    join public.residentes r on r.id = e.residente_id
    where e.id = examen_id
      and r.user_id = auth.uid()
  )
  or auth.jwt() -> 'app_metadata' ->> 'role' in ('admin', 'docente')
  or exists (
    select 1
    from public.examenes e
    join public.residentes r on r.user_id = auth.uid()
    where e.id = examen_id
      and e.residente_id is null
      and e.activo = true
      and r.activo = true
      and coalesce(e.anio_habilitado, array[]::text[]) @> array[r.anio]
  )
);

drop policy if exists "examenes_preguntas_insert_policy" on public.examenes_preguntas;
create policy "examenes_preguntas_insert_policy"
on public.examenes_preguntas
for insert
to authenticated
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from public.examenes e
    join public.residentes r on r.id = e.residente_id
    where e.id = examen_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "examenes_preguntas_update_policy" on public.examenes_preguntas;
create policy "examenes_preguntas_update_policy"
on public.examenes_preguntas
for update
to authenticated
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from public.examenes e
    join public.residentes r on r.id = e.residente_id
    where e.id = examen_id
      and r.user_id = auth.uid()
  )
)
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  or exists (
    select 1
    from public.examenes e
    join public.residentes r on r.id = e.residente_id
    where e.id = examen_id
      and r.user_id = auth.uid()
  )
);
