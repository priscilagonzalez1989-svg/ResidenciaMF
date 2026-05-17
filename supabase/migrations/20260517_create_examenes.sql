create table if not exists public.examenes (
  id uuid primary key default gen_random_uuid(),
  residente_id uuid not null references public.residentes (id) on delete cascade,
  rotacion text not null,
  estado text not null check (estado in ('en_curso', 'completado', 'recuperatorio')),
  puntaje_total numeric(10,2),
  aprobado boolean,
  iniciado_at timestamptz not null default now(),
  finalizado_at timestamptz,
  tiempo_agotado boolean not null default false,
  es_recuperatorio boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.examenes_preguntas (
  id uuid primary key default gen_random_uuid(),
  examen_id uuid not null references public.examenes (id) on delete cascade,
  pregunta_numero integer not null references public.banco_preguntas (numero),
  orden integer not null,
  es_adicional boolean not null default false
);

create table if not exists public.examenes_respuestas (
  id uuid primary key default gen_random_uuid(),
  examen_id uuid not null references public.examenes (id) on delete cascade,
  pregunta_numero integer not null,
  respuesta_texto text,
  puntaje_obtenido numeric(10,2),
  feedback_ia text,
  respondida_at timestamptz not null default now()
);

create unique index if not exists examenes_preguntas_examen_pregunta_uidx
  on public.examenes_preguntas (examen_id, pregunta_numero, es_adicional);

create unique index if not exists examenes_respuestas_examen_pregunta_uidx
  on public.examenes_respuestas (examen_id, pregunta_numero);

create index if not exists examenes_residente_id_idx on public.examenes (residente_id);
create index if not exists examenes_rotacion_idx on public.examenes (rotacion);
create index if not exists examenes_estado_idx on public.examenes (estado);
create index if not exists examenes_preguntas_examen_idx on public.examenes_preguntas (examen_id, orden);
create index if not exists examenes_respuestas_examen_idx on public.examenes_respuestas (examen_id);

comment on table public.examenes is 'Intentos de examen por residente y rotación.';
comment on table public.examenes_preguntas is 'Preguntas asignadas a cada examen.';
comment on table public.examenes_respuestas is 'Respuestas y feedback de IA por pregunta.';

alter table public.examenes enable row level security;
alter table public.examenes_preguntas enable row level security;
alter table public.examenes_respuestas enable row level security;

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
);

drop policy if exists "examenes_insert_policy" on public.examenes;
create policy "examenes_insert_policy"
on public.examenes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.residentes r
    where r.id = residente_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "examenes_update_policy" on public.examenes;
create policy "examenes_update_policy"
on public.examenes
for update
to authenticated
using (
  exists (
    select 1
    from public.residentes r
    where r.id = residente_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.residentes r
    where r.id = residente_id
      and r.user_id = auth.uid()
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
);

drop policy if exists "examenes_preguntas_insert_policy" on public.examenes_preguntas;
create policy "examenes_preguntas_insert_policy"
on public.examenes_preguntas
for insert
to authenticated
with check (
  exists (
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
  exists (
    select 1
    from public.examenes e
    join public.residentes r on r.id = e.residente_id
    where e.id = examen_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.examenes e
    join public.residentes r on r.id = e.residente_id
    where e.id = examen_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "examenes_respuestas_select_policy" on public.examenes_respuestas;
create policy "examenes_respuestas_select_policy"
on public.examenes_respuestas
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
);

drop policy if exists "examenes_respuestas_insert_policy" on public.examenes_respuestas;
create policy "examenes_respuestas_insert_policy"
on public.examenes_respuestas
for insert
to authenticated
with check (
  exists (
    select 1
    from public.examenes e
    join public.residentes r on r.id = e.residente_id
    where e.id = examen_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists "examenes_respuestas_update_policy" on public.examenes_respuestas;
create policy "examenes_respuestas_update_policy"
on public.examenes_respuestas
for update
to authenticated
using (
  exists (
    select 1
    from public.examenes e
    join public.residentes r on r.id = e.residente_id
    where e.id = examen_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.examenes e
    join public.residentes r on r.id = e.residente_id
    where e.id = examen_id
      and r.user_id = auth.uid()
  )
);
