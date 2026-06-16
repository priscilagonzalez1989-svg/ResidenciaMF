import { supabase } from "../supabase";
import { fetchTemplateAssignments } from "./cardiologyExamTemplates";

export const PEDIATRIA_ROTATION = "Pediatría";
export const PEDIATRIA_FIXED_NUMBERS = [259, 260];

function shuffle(items) {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function toVisibleRows(assignments = []) {
  return assignments.filter((item) => !item.es_recuperatorio).sort((a, b) => a.orden - b.orden);
}

function toReserveRows(assignments = []) {
  return assignments.filter((item) => item.es_recuperatorio).sort((a, b) => a.orden - b.orden);
}

async function fetchQuestionsByNumbers(numbers = []) {
  if (!numbers.length) return [];

  const { data, error } = await supabase.from("banco_preguntas").select("*").in("numero", numbers);
  if (error) throw error;
  return numbers.map((numero) => (data || []).find((item) => item.numero === numero)).filter(Boolean);
}

async function fetchPediatriaPool({ excludeNumbers = [] } = {}) {
  const { data, error } = await supabase
    .from("banco_preguntas")
    .select("*")
    .eq("rotacion", PEDIATRIA_ROTATION)
    .eq("anio", "R2")
    .eq("activa", true)
    .neq("dominio", "[Integrador]");

  if (error) throw error;

  const excluded = new Set(excludeNumbers);
  return (data || []).filter((item) => !excluded.has(item.numero));
}

async function fetchPediatriaTemplateDetails(templateId) {
  const { data: template, error: templateError } = await supabase.from("examenes").select("*").eq("id", templateId).single();
  if (templateError) throw templateError;

  const assignments = await fetchTemplateAssignments(templateId);
  return {
    ...template,
    assignments,
    visibleAssignments: toVisibleRows(assignments),
    reserveAssignments: toReserveRows(assignments),
  };
}

export async function fetchPediatriaTemplates() {
  const { data, error } = await supabase
    .from("examenes")
    .select("*")
    .is("residente_id", null)
    .eq("rotacion", PEDIATRIA_ROTATION)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPediatriaTemplate({
  userId,
  titulo,
  fechaInicio = null,
  fechaFin = null,
  anioHabilitado = ["R2"],
}) {
  const fixed = await fetchQuestionsByNumbers(PEDIATRIA_FIXED_NUMBERS);
  if (fixed.length !== PEDIATRIA_FIXED_NUMBERS.length) {
    throw new Error("Faltan las preguntas integradoras fijas de Pediatría en el banco.");
  }

  const pool = await fetchPediatriaPool({ excludeNumbers: PEDIATRIA_FIXED_NUMBERS });
  const picked = shuffle(pool).slice(0, 4);
  if (picked.length < 4) {
    throw new Error("No hay suficientes preguntas activas de Pediatría R2 para crear el examen.");
  }

  const nextTitle = titulo?.trim() || `Pediatría R2 · ${new Date().toLocaleDateString("es-AR")}`;
  const { data: template, error: templateError } = await supabase
    .from("examenes")
    .insert({
      residente_id: null,
      titulo: nextTitle,
      rotacion: PEDIATRIA_ROTATION,
      estado: "plantilla",
      anio_habilitado: anioHabilitado,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      activo: false,
      created_by: userId,
      has_imagen: false,
    })
    .select()
    .single();

  if (templateError) throw templateError;

  const assignments = [
    { examen_id: template.id, pregunta_id: fixed[0].id, pregunta_numero: fixed[0].numero, orden: 1, es_recuperatorio: false },
    { examen_id: template.id, pregunta_id: fixed[1].id, pregunta_numero: fixed[1].numero, orden: 2, es_recuperatorio: false },
    { examen_id: template.id, pregunta_id: picked[0].id, pregunta_numero: picked[0].numero, orden: 3, es_recuperatorio: false },
    { examen_id: template.id, pregunta_id: picked[1].id, pregunta_numero: picked[1].numero, orden: 4, es_recuperatorio: false },
    { examen_id: template.id, pregunta_id: picked[2].id, pregunta_numero: picked[2].numero, orden: 5, es_recuperatorio: false },
    { examen_id: template.id, pregunta_id: picked[3].id, pregunta_numero: picked[3].numero, orden: 6, es_recuperatorio: true },
  ];

  const { error: assignmentsError } = await supabase.from("examenes_preguntas").insert(assignments);
  if (assignmentsError) throw assignmentsError;

  return fetchPediatriaTemplateDetails(template.id);
}

export async function buildPediatriaRecoveryPreview(template) {
  const detail = template.assignments ? template : await fetchPediatriaTemplateDetails(template.id);
  const originalReserve = detail.reserveAssignments[0];

  if (!originalReserve) {
    throw new Error("El examen original no tiene una pregunta de reserva disponible para recuperatorio.");
  }

  const usedNumbers = detail.assignments.map((item) => item.pregunta_numero).filter(Boolean);
  const pool = await fetchPediatriaPool({
    excludeNumbers: [...new Set([...PEDIATRIA_FIXED_NUMBERS, ...usedNumbers])],
  });
  const picked = shuffle(pool).slice(0, 4);

  if (picked.length < 4) {
    throw new Error("No hay suficientes preguntas nuevas de Pediatría R2 disponibles para crear el recuperatorio.");
  }

  return {
    sourceTemplate: detail,
    visibleAssignments: [
      detail.visibleAssignments.find((item) => item.pregunta_numero === PEDIATRIA_FIXED_NUMBERS[0]),
      detail.visibleAssignments.find((item) => item.pregunta_numero === PEDIATRIA_FIXED_NUMBERS[1]),
      { ...picked[0], orden: 3, es_recuperatorio: false, pregunta_id: picked[0].id, pregunta_numero: picked[0].numero },
      { ...picked[1], orden: 4, es_recuperatorio: false, pregunta_id: picked[1].id, pregunta_numero: picked[1].numero },
      { ...picked[2], orden: 5, es_recuperatorio: false, pregunta_id: picked[2].id, pregunta_numero: picked[2].numero },
      { ...originalReserve, orden: 6, es_recuperatorio: false },
    ].filter(Boolean),
    hiddenReserve: { ...picked[3], orden: 7, es_recuperatorio: true, pregunta_id: picked[3].id, pregunta_numero: picked[3].numero },
  };
}

export async function createPediatriaRecoveryTemplate({ originalTemplateId, preview, userId }) {
  const source = preview?.sourceTemplate || (await fetchPediatriaTemplateDetails(originalTemplateId));
  const nextTitle = `${source.titulo || "Pediatría R2"} · Recuperatorio`;

  const { data: template, error: templateError } = await supabase
    .from("examenes")
    .insert({
      residente_id: null,
      titulo: nextTitle,
      rotacion: PEDIATRIA_ROTATION,
      estado: "plantilla",
      anio_habilitado: source.anio_habilitado || ["R2"],
      fecha_inicio: source.fecha_inicio,
      fecha_fin: source.fecha_fin,
      activo: false,
      created_by: userId,
      has_imagen: false,
      examen_padre_id: source.id,
    })
    .select()
    .single();

  if (templateError) throw templateError;

  const rows = [...(preview?.visibleAssignments || []), preview?.hiddenReserve]
    .filter(Boolean)
    .map((item) => ({
      examen_id: template.id,
      pregunta_id: item.pregunta_id || item.id || null,
      pregunta_numero: item.pregunta_numero || item.numero,
      orden: item.orden,
      es_recuperatorio: Boolean(item.es_recuperatorio),
    }));

  const { error: rowsError } = await supabase.from("examenes_preguntas").insert(rows);
  if (rowsError) throw rowsError;

  return fetchPediatriaTemplateDetails(template.id);
}

export async function fetchResidentPediatriaActiveTemplates(anio) {
  const { data, error } = await supabase
    .from("examenes")
    .select("*")
    .is("residente_id", null)
    .eq("activo", true)
    .eq("rotacion", PEDIATRIA_ROTATION)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).filter((item) => {
    if (!anio) return true;
    if (!Array.isArray(item.anio_habilitado) || item.anio_habilitado.length === 0) return true;
    return item.anio_habilitado.includes(anio);
  });
}
