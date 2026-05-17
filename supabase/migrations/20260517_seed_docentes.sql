insert into public.docentes (nombre, apellido, email, activo)
values
  ('Jimena', 'G.', 'jimeg86@gmail.com', true),
  ('Hugo', 'Palmieri', 'hugo.palmieri@hospitalprivado.com.ar', true)
on conflict (email) do update
set
  nombre = excluded.nombre,
  apellido = excluded.apellido,
  activo = excluded.activo;
