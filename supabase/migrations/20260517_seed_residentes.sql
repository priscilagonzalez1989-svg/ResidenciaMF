insert into public.residentes (nombre, apellido, email, anio, activo)
values
  ('Magdalena', 'Fernandez', 'MagdalenaFn96@gmail.com', 'R2', true),
  ('Catalina', 'Alric', 'mariacatalinaalricscavarda@gmail.com', 'R2', true),
  ('Violeta', 'Cargnelutti', 'violetacargnelutti@gmail.com', 'R2', true)
on conflict (email) do update
set
  nombre = excluded.nombre,
  apellido = excluded.apellido,
  anio = excluded.anio,
  activo = excluded.activo;
