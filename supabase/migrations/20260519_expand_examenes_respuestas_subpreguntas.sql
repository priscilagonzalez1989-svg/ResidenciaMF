alter table public.examenes_respuestas
  add column if not exists subpregunta_indice integer not null default 0,
  add column if not exists subpregunta_texto text;

drop index if exists examenes_respuestas_examen_pregunta_uidx;

create unique index if not exists examenes_respuestas_examen_pregunta_sub_uidx
  on public.examenes_respuestas (examen_id, pregunta_numero, subpregunta_indice);

comment on column public.examenes_respuestas.subpregunta_indice is 'Índice secuencial de sub-pregunta dentro de un caso clínico.';
comment on column public.examenes_respuestas.subpregunta_texto is 'Texto de la sub-pregunta respondida individualmente.';
