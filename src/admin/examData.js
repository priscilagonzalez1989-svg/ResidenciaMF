import { supabase } from "../supabase";
import { buildQuestionSteps, stepKey } from "../exams/questionFlow";

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR");
}

export function formatScore(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toFixed(2).replace(".00", "");
}

export function examStateKey(exam) {
  if (exam.estado === "en_curso") return "en_curso";
  if (exam.aprobado === true) return "aprobado";
  return "recuperatorio";
}

export function examStateLabel(exam) {
  const key = examStateKey(exam);
  if (key === "aprobado") return "Aprobado ✅";
  if (key === "recuperatorio") return "Recuperatorio 🔄";
  return "En curso";
}

export function buildDomainBreakdown(questionDetails = []) {
  const grouped = questionDetails.reduce((acc, item) => {
    const key = item.dominio || "Integrador";
    if (!acc[key]) {
      acc[key] = { dominio: key, obtenido: 0, maximo: 0 };
    }
    acc[key].obtenido += Number(item.puntaje_obtenido || 0);
    acc[key].maximo += Number(item.puntaje_maximo || 0);
    return acc;
  }, {});

  return Object.values(grouped).map((item) => ({
    ...item,
    porcentaje: item.maximo ? Math.round((item.obtenido / item.maximo) * 100) : 0,
  }));
}

export function percentageFromExam(exam) {
  if (!exam.totalMax) return 0;
  return Math.round((Number(exam.puntaje_total || 0) / exam.totalMax) * 100);
}

export function getDomainPercentagesForResident(exams) {
  const allQuestions = exams.flatMap((exam) => exam.questionDetails || []);
  const breakdown = buildDomainBreakdown(allQuestions);
  const defaults = ["Diagnóstico", "Terapéutica", "Integrador", "Comunicación"];
  return defaults.map((domain) => {
    const found = breakdown.find((item) => item.dominio === domain);
    return {
      dominio: domain,
      porcentaje: found?.porcentaje || 0,
      obtenido: found?.obtenido || 0,
      maximo: found?.maximo || 0,
    };
  });
}

export function buildResidentSummaries(exams) {
  const byResident = new Map();

  exams
    .filter((exam) => exam.estado !== "en_curso")
    .forEach((exam) => {
      const residentId = exam.residente?.id || exam.residente_id;
      if (!byResident.has(residentId)) {
        byResident.set(residentId, {
          residente: exam.residente,
          exams: [],
        });
      }
      byResident.get(residentId).exams.push(exam);
    });

  return [...byResident.values()].map(({ residente, exams: residentExams }) => {
    const sorted = [...residentExams].sort(
      (a, b) =>
        new Date(b.finalizado_at || b.created_at || 0).getTime() -
        new Date(a.finalizado_at || a.created_at || 0).getTime()
    );
    const last = sorted[0] || null;
    return {
      residente,
      exams: residentExams,
      totalExams: residentExams.length,
      lastScore: last?.puntaje_total ?? null,
      lastPercentage: last ? percentageFromExam(last) : 0,
      domainPercentages: getDomainPercentagesForResident(residentExams),
    };
  });
}

export async function loadExamDataset() {
  const { data: exams, error: examsError } = await supabase
    .from("examenes")
    .select("*")
    .order("created_at", { ascending: false });

  if (examsError) throw examsError;

  const examRows = (exams || []).filter((item) => item.residente_id);
  if (!examRows.length) {
    return { exams: [], residents: [] };
  }

  const residentIds = [...new Set(examRows.map((item) => item.residente_id).filter(Boolean))];
  const examIds = examRows.map((item) => item.id);

  const [{ data: residents, error: residentsError }, { data: examQuestions, error: examQuestionsError }, { data: examAnswers, error: examAnswersError }] = await Promise.all([
    supabase.from("residentes").select("*").in("id", residentIds),
    supabase.from("examenes_preguntas").select("*").in("examen_id", examIds).order("orden", { ascending: true }),
    supabase.from("examenes_respuestas").select("*").in("examen_id", examIds).order("respondida_at", { ascending: true }),
  ]);

  if (residentsError) throw residentsError;
  if (examQuestionsError) throw examQuestionsError;
  if (examAnswersError) throw examAnswersError;

  const questionNumbers = [...new Set((examQuestions || []).map((item) => item.pregunta_numero).filter(Boolean))];
  const questionIds = [...new Set((examQuestions || []).map((item) => item.pregunta_id).filter(Boolean))];
  let bancoQuestions = [];
  if (questionIds.length) {
    const { data: questions, error: questionsError } = await supabase
      .from("banco_preguntas")
      .select("id, numero, enunciado, dominio, puntaje_sugerido, rotacion, lista_cotejo, imagen_url")
      .in("id", questionIds);
    if (questionsError) throw questionsError;
    bancoQuestions = questions || [];
  } else if (questionNumbers.length) {
    const { data: questions, error: questionsError } = await supabase
      .from("banco_preguntas")
      .select("id, numero, enunciado, dominio, puntaje_sugerido, rotacion, lista_cotejo, imagen_url")
      .in("numero", questionNumbers);
    if (questionsError) throw questionsError;
    bancoQuestions = questions || [];
  }

  const residentsById = new Map((residents || []).map((item) => [item.id, item]));
  const questionsById = new Map(bancoQuestions.map((item) => [item.id, item]));
  const questionsByNumber = new Map(bancoQuestions.map((item) => [item.numero, item]));
  const assignedByExam = (examQuestions || []).reduce((acc, item) => {
    if (!acc[item.examen_id]) acc[item.examen_id] = [];
    acc[item.examen_id].push(item);
    return acc;
  }, {});
  const answersByExamQuestion = (examAnswers || []).reduce((acc, item) => {
    acc[`${item.examen_id}:${stepKey(item.pregunta_numero, item.subpregunta_indice || 0)}`] = item;
    return acc;
  }, {});

  const enrichedExams = examRows.map((exam) => {
    const assignedQuestions = (assignedByExam[exam.id] || []).map((assigned) => ({
      ...(questionsById.get(assigned.pregunta_id) || questionsByNumber.get(assigned.pregunta_numero)),
      es_adicional: assigned.es_adicional,
      orden: assigned.orden,
    }));
    const questionDetails = buildQuestionSteps(assignedQuestions, "detail").map((step) => {
      const answer = answersByExamQuestion[`${exam.id}:${step.key}`];
      return {
        pregunta_numero: step.question.numero,
        subpregunta_indice: step.subIndex,
        orden: step.order,
        es_adicional: step.question.es_adicional,
        enunciado: step.caseText || step.question.enunciado || "",
        subpregunta_texto: step.prompt || "",
        dominio: step.question.dominio || "Integrador",
        puntaje_maximo: Number(step.puntajeMaximo || 0),
        lista_cotejo: step.checklistItem || "",
        imagen_url: step.question.imagen_url || null,
        respuesta_texto: answer?.respuesta_texto || "",
        puntaje_obtenido: answer?.puntaje_obtenido ?? null,
        feedback_ia: answer?.feedback_ia || "",
      };
    });

    const totalMax = questionDetails.reduce(
      (sum, item) => sum + Number(item.puntaje_maximo || 0),
      0
    );

    return {
      ...exam,
      residente: residentsById.get(exam.residente_id) || null,
      questionDetails,
      totalMax,
      percentage: totalMax ? Math.round((Number(exam.puntaje_total || 0) / totalMax) * 100) : 0,
      domainBreakdown: buildDomainBreakdown(questionDetails),
    };
  });

  return {
    exams: enrichedExams,
    residents: residents || [],
  };
}
