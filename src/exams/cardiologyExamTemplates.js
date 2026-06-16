import { supabase } from "../supabase";

export const CARDIOLOGY_SECTION = "Cardiologia";
export const CARDIOLOGY_ROTATION = "Cardiología";
export const CARDIOLOGY_FIXED_NUMBERS = [257, 258];

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

async function fetchCardiologyPool({ hasImagen = false } = {}) {
  const { data, error } = await supabase
    .from("banco_preguntas")
    .select("*")
    .eq("seccion", CARDIOLOGY_SECTION)
    .eq("activa", true);

  if (error) throw error;

  return (data || []).filter((item) => hasImagen || item.tipo !== "[IMAGEN]");
}

function pickPreferredQuestions(pool, { excludeNumbers = [], count }) {
  const excluded = new Set(excludeNumbers);
  const eligible = pool.filter((item) => !excluded.has(item.numero));
  const preferred = shuffle(eligible.filter((item) => item.anio === "R2"));
  const fallback = shuffle(eligible.filter((item) => item.anio === "R3"));
  const selected = [...preferred, ...fallback].slice(0, count);
  return selected;
}

async function fetchQuestionsForAssignments(assignments = []) {
  if (!assignments.length) return [];

  const questionIds = assignments.map((item) => item.pregunta_id).filter(Boolean);
  const questionNumbers = assignments.map((item) => item.pregunta_numero).filter(Boolean);

  let rows = [];

  if (questionIds.length) {
    const { data, error } = await supabase.from("banco_preguntas").select("*").in("id", questionIds);
    if (error) throw error;
    rows = data || [];
  } else if (questionNumbers.length) {
    const { data, error } = await supabase.from("banco_preguntas").select("*").in("numero", questionNumbers);
    if (error) throw error;
    rows = data || [];
  }

  const byId = new Map(rows.map((item) => [item.id, item]));
  const byNumero = new Map(rows.map((item) => [item.numero, item]));

  return assignments.map((assignment) => {
    const question = byId.get(assignment.pregunta_id) || byNumero.get(assignment.pregunta_numero);
    return {
      ...assignment,
      ...question,
      pregunta_id: assignment.pregunta_id || question?.id || null,
      pregunta_numero: assignment.pregunta_numero || question?.numero || null,
    };
  });
}

export async function fetchCardiologyTemplates() {
  const { data, error } = await supabase
    .from("examenes")
    .select("*")
    .is("residente_id", null)
    .eq("seccion", CARDIOLOGY_SECTION)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchTemplateAssignments(templateId) {
  const { data, error } = await supabase
    .from("examenes_preguntas")
    .select("*")
    .eq("examen_id", templateId)
    .order("orden", { ascending: true });

  if (error) throw error;
  return fetchQuestionsForAssignments(data || []);
}

export async function fetchTemplateDetails(templateId) {
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

export async function fetchR2ActiveResidentCount() {
  const { count, error } = await supabase
    .from("residentes")
    .select("id", { count: "exact", head: true })
    .eq("anio", "R2")
    .eq("activo", true);

  if (error) throw error;
  return count || 0;
}

export async function createCardiologyTemplate({
  userId,
  titulo,
  fechaInicio = null,
  fechaFin = null,
  hasImagen = false,
  anioHabilitado = ["R2"],
}) {
  const pool = await fetchCardiologyPool({ hasImagen });
  const fixed = CARDIOLOGY_FIXED_NUMBERS.map((numero) => pool.find((item) => item.numero === numero)).filter(Boolean);

  if (fixed.length !== CARDIOLOGY_FIXED_NUMBERS.length) {
    throw new Error("Faltan las preguntas integradoras fijas de Cardiología en el banco.");
  }

  const picked = pickPreferredQuestions(pool, {
    excludeNumbers: CARDIOLOGY_FIXED_NUMBERS,
    count: 4,
  });

  if (picked.length < 4) {
    throw new Error("No hay suficientes preguntas activas de Cardiología para crear el examen.");
  }

  const nextTitle = titulo?.trim() || `Cardiología R2 · ${new Date().toLocaleDateString("es-AR")}`;
  const { data: template, error: templateError } = await supabase
    .from("examenes")
    .insert({
      residente_id: null,
      titulo: nextTitle,
      seccion: CARDIOLOGY_SECTION,
      rotacion: CARDIOLOGY_ROTATION,
      estado: "plantilla",
      anio_habilitado: anioHabilitado,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      activo: false,
      created_by: userId,
      has_imagen: hasImagen,
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

  return fetchTemplateDetails(template.id);
}

export async function buildRecoveryPreview(template) {
  const detail = template.assignments ? template : await fetchTemplateDetails(template.id);
  const originalReserve = detail.reserveAssignments[0];

  if (!originalReserve) {
    throw new Error("El examen original no tiene una pregunta de reserva disponible para recuperatorio.");
  }

  const visibleNumbers = detail.visibleAssignments.map((item) => item.pregunta_numero);
  const excludedForFresh = [...visibleNumbers, originalReserve.pregunta_numero];
  const pool = await fetchCardiologyPool({ hasImagen: detail.has_imagen });
  const picked = pickPreferredQuestions(pool, {
    excludeNumbers: [...new Set([...CARDIOLOGY_FIXED_NUMBERS, ...excludedForFresh])],
    count: 4,
  });

  if (picked.length < 4) {
    throw new Error("No hay suficientes preguntas nuevas disponibles. Activá más preguntas en el banco antes de continuar.");
  }

  return {
    sourceTemplate: detail,
    visibleAssignments: [
      detail.visibleAssignments.find((item) => item.pregunta_numero === CARDIOLOGY_FIXED_NUMBERS[0]),
      detail.visibleAssignments.find((item) => item.pregunta_numero === CARDIOLOGY_FIXED_NUMBERS[1]),
      { ...picked[0], orden: 3, es_recuperatorio: false, pregunta_id: picked[0].id, pregunta_numero: picked[0].numero },
      { ...picked[1], orden: 4, es_recuperatorio: false, pregunta_id: picked[1].id, pregunta_numero: picked[1].numero },
      { ...picked[2], orden: 5, es_recuperatorio: false, pregunta_id: picked[2].id, pregunta_numero: picked[2].numero },
      { ...originalReserve, orden: 6, es_recuperatorio: false },
    ].filter(Boolean),
    hiddenReserve: { ...picked[3], orden: 7, es_recuperatorio: true, pregunta_id: picked[3].id, pregunta_numero: picked[3].numero },
  };
}

export async function createRecoveryTemplate({ originalTemplateId, preview, userId }) {
  const source = preview?.sourceTemplate || (await fetchTemplateDetails(originalTemplateId));
  const nextTitle = `${source.titulo || "Cardiología R2"} · Recuperatorio`;

  const { data: template, error: templateError } = await supabase
    .from("examenes")
    .insert({
      residente_id: null,
      titulo: nextTitle,
      seccion: CARDIOLOGY_SECTION,
      rotacion: CARDIOLOGY_ROTATION,
      estado: "plantilla",
      anio_habilitado: source.anio_habilitado || ["R2"],
      fecha_inicio: source.fecha_inicio,
      fecha_fin: source.fecha_fin,
      activo: false,
      created_by: userId,
      has_imagen: source.has_imagen,
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

  return fetchTemplateDetails(template.id);
}

export async function setTemplateActive(templateId, active) {
  const { error } = await supabase.from("examenes").update({ activo: active }).eq("id", templateId);
  if (error) throw error;
}

export async function fetchResidentActiveTemplates(anio) {
  const { data, error } = await supabase
    .from("examenes")
    .select("*")
    .is("residente_id", null)
    .eq("activo", true)
    .eq("seccion", CARDIOLOGY_SECTION)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).filter((item) => {
    if (!anio) return true;
    if (!Array.isArray(item.anio_habilitado) || item.anio_habilitado.length === 0) return true;
    return item.anio_habilitado.includes(anio);
  });
}

export async function fetchResidentTemplateAttempts(residenteId, templateIds = []) {
  if (!templateIds.length) return [];

  const { data, error } = await supabase
    .from("examenes")
    .select("*")
    .eq("residente_id", residenteId)
    .in("examen_padre_id", templateIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createAttemptFromTemplate({ template, residenteId }) {
  const detail = template.assignments ? template : await fetchTemplateDetails(template.id);
  const visibleAssignments = toVisibleRows(detail.assignments);

  const { data: attempt, error: attemptError } = await supabase
    .from("examenes")
    .insert({
      residente_id: residenteId,
      titulo: detail.titulo,
      seccion: detail.seccion,
      rotacion: detail.rotacion,
      estado: "en_curso",
      activo: false,
      has_imagen: detail.has_imagen,
      es_recuperatorio: Boolean(detail.examen_padre_id),
      examen_padre_id: detail.id,
    })
    .select()
    .single();

  if (attemptError) throw attemptError;

  const rows = visibleAssignments.map((item) => ({
    examen_id: attempt.id,
    pregunta_id: item.pregunta_id || item.id || null,
    pregunta_numero: item.pregunta_numero || item.numero,
    orden: item.orden,
    es_recuperatorio: false,
    es_adicional: false,
  }));

  const { error: rowsError } = await supabase.from("examenes_preguntas").insert(rows);
  if (rowsError) throw rowsError;

  return {
    attempt,
    questions: visibleAssignments.map((item) => ({
      ...item,
      es_adicional: false,
    })),
  };
}

export function summarizeResidentTemplate(template, attempts = [], assignments = []) {
  const visibleAssignments = toVisibleRows(assignments);
  const latestAttempt = [...attempts].sort(
    (a, b) => new Date(b.finalizado_at || b.created_at || 0).getTime() - new Date(a.finalizado_at || a.created_at || 0).getTime()
  )[0] || null;
  const now = Date.now();
  const started = !template.fecha_inicio || new Date(template.fecha_inicio).getTime() <= now;
  const notEnded = !template.fecha_fin || new Date(template.fecha_fin).getTime() >= now;
  const isAvailable = Boolean(template.activo && started && notEnded);

  let status = isAvailable ? "Disponible" : "Programado";
  let action = "Rendir";
  let canStart = isAvailable;

  if (latestAttempt?.estado === "en_curso") {
    status = "En curso";
    action = "Continuar";
    canStart = true;
  } else if (latestAttempt && latestAttempt.finalizado_at && latestAttempt.puntaje_total == null) {
    status = "Enviado — pendiente de corrección";
    action = "Pendiente";
    canStart = false;
  } else if (latestAttempt && latestAttempt.puntaje_total != null) {
    status = "Completado";
    action = "Rendido";
    canStart = false;
  }

  const totalScore = visibleAssignments.reduce((sum, item) => sum + Number(item.puntaje_sugerido || 0), 0);
  const domainList = [...new Set(visibleAssignments.map((item) => item.dominio).filter(Boolean))];

  return {
    template,
    assignments,
    visibleAssignments,
    attempts,
    latestAttempt,
    status,
    action,
    canStart,
    totalScore,
    questionCount: visibleAssignments.length,
    domains: domainList,
    isRecoveryTemplate: Boolean(template.examen_padre_id),
  };
}
