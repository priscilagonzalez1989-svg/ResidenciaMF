import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";

const ROTACIONES = [
  { key: "medicina-familiar", label: "Medicina Familiar", bancoRotaciones: ["Medicina Familiar"], allowAdditional: true },
  { key: "ginecologia", label: "Ginecología", bancoRotaciones: ["Ginecología"], allowAdditional: false },
  { key: "paliativos", label: "Paliativos", bancoRotaciones: ["Cuidados Paliativos", "Paliativos"], allowAdditional: false },
  { key: "reumatologia", label: "Reumatología", bancoRotaciones: ["Reumatología"], allowAdditional: false },
];

const TARGET_ANIOS = ["R2", "R3"];
const EXAM_DURATION_SECONDS = 60 * 60;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const OPENROUTER_SITE_URL = import.meta.env.VITE_OPENROUTER_SITE_URL || window.location.origin;
const OPENROUTER_APP_NAME = import.meta.env.VITE_OPENROUTER_APP_NAME || "ResidenciaMF";
const OPENROUTER_KEY_STORAGE = "residenciamf_openrouter_api_key";
const SYSTEM_PROMPT = `Sos un evaluador médico experto en medicina familiar argentina. 
Evaluá la respuesta del residente según la lista de cotejo provista. 
Para cada ítem de la lista de cotejo indicá si fue cubierto (✓) o no (✗).
Calculá el puntaje obtenido sobre el puntaje máximo.
Devolvé un feedback constructivo y específico en español argentino, 
en voseo. Sé preciso, justo y formativo. No seas punitivo.`;

function extraerJson(texto) {
  const limpio = String(texto || "").replace(/```json|```/g, "").trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio === -1 || fin === -1) {
    throw new Error("La IA no devolvió un JSON válido.");
  }
  return JSON.parse(limpio.slice(inicio, fin + 1));
}

function HeaderBadge({ text, color, background }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.03em",
        color,
        background,
      }}
    >
      {text}
    </span>
  );
}

function ProgressBar({ value, max = 100, color = "#4a9fd4", height = 8 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ background: "#e8ecf0", borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 99,
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

function getRotationStatus(exams) {
  if (!exams.length) {
    return { label: "Disponible", action: "Rendir", canStart: true, mode: "normal", lastScore: null, attempts: 0 };
  }

  const sorted = [...exams].sort(
    (a, b) => new Date(b.finalizado_at || b.created_at || 0).getTime() - new Date(a.finalizado_at || a.created_at || 0).getTime()
  );
  const last = sorted[0];
  const attempts = exams.length;
  const lastScore = last.puntaje_total;

  if (last.estado === "en_curso") {
    return { label: "En curso", action: "Continuar", canStart: true, mode: "resume", lastScore, attempts, currentExam: last };
  }

  if (last.aprobado === false || Number(last.puntaje_total || 0) < 50) {
    const alreadyRecovery = sorted.some((exam) => exam.es_recuperatorio);
    if (!alreadyRecovery) {
      return { label: "Recuperatorio disponible", action: "Recuperar", canStart: true, mode: "recovery", lastScore, attempts, previousExam: last };
    }
  }

  return { label: "Rendido", action: "Rendido", canStart: false, mode: "done", lastScore, attempts, previousExam: last };
}

function getDomainProgress(questions, currentIndex, phaseLabel) {
  if (!questions.length) return [];
  return questions.map((question, index) => ({
    key: `${phaseLabel}-${question.numero}-${index}`,
    dominio: question.dominio || "Integrador",
    done: index < currentIndex,
    current: index === currentIndex,
  }));
}

function timeLabel(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getOpenRouterApiKey() {
  return (
    window.localStorage.getItem(OPENROUTER_KEY_STORAGE)?.trim() ||
    OPENROUTER_API_KEY ||
    ""
  );
}

async function corregirPreguntaConIA(question, responseText) {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    throw new Error("Falta configurar VITE_OPENROUTER_API_KEY para corregir exámenes.");
  }

  const prompt = `${SYSTEM_PROMPT}

ENUNCIADO:
${question.enunciado}

LISTA DE COTEJO:
${question.lista_cotejo}

PUNTAJE MÁXIMO:
${question.puntaje_sugerido}

RESPUESTA DEL RESIDENTE:
${responseText || "(sin respuesta)"}

Respondé solo JSON con esta forma:
{
  "puntaje_obtenido": number,
  "puntaje_maximo": number,
  "items": [
    {
      "descripcion": "texto del ítem",
      "cubierto": true,
      "marca": "✓"
    }
  ],
  "feedback": "texto breve y constructivo en español argentino"
}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": OPENROUTER_SITE_URL,
      "X-Title": OPENROUTER_APP_NAME,
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      temperature: 0.1,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter devolvió ${response.status}: ${text}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return extraerJson(content);
}

async function fetchResidentByUser(user) {
  const normalizedEmail = String(user.email || "").trim().toLowerCase();
  const { data, error } = await supabase
    .from("residentes")
    .select("*")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (error) throw error;

  if (data && (data.user_id !== user.id || data.email !== normalizedEmail)) {
    const { data: updated, error: updateError } = await supabase
      .from("residentes")
      .update({ user_id: user.id, email: normalizedEmail })
      .eq("id", data.id)
      .select()
      .single();
    if (updateError) throw updateError;
    return updated;
  }

  return data;
}

async function fetchRotationExams(residenteId) {
  const { data, error } = await supabase
    .from("examenes")
    .select("*")
    .eq("residente_id", residenteId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchSeenQuestionNumbers(residenteId) {
  const { data: examenes, error } = await supabase
    .from("examenes")
    .select("id")
    .eq("residente_id", residenteId);

  if (error) throw error;
  if (!examenes?.length) return [];

  const examIds = examenes.map((item) => item.id);
  const { data: preguntas, error: preguntasError } = await supabase
    .from("examenes_preguntas")
    .select("pregunta_numero")
    .in("examen_id", examIds);

  if (preguntasError) throw preguntasError;
  return [...new Set((preguntas || []).map((item) => item.pregunta_numero))];
}

async function fetchCandidateQuestions({ rotaciones, domain, excludeNumbers = [] }) {
  let query = supabase
    .from("banco_preguntas")
    .select("*")
    .in("anio", TARGET_ANIOS)
    .in("rotacion", rotaciones)
    .eq("activa", true);

  if (domain) query = query.eq("dominio", domain);
  if (excludeNumbers.length) query = query.not("numero", "in", `(${excludeNumbers.join(",")})`);

  const { data, error } = await query;
  if (error) throw error;
  return shuffle(data || []);
}

function shuffle(items) {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

async function createExamWithQuestions({ residenteId, rotationConfig, esRecuperatorio, questions }) {
  const { data: examen, error: examError } = await supabase
    .from("examenes")
    .insert({
      residente_id: residenteId,
      rotacion: rotationConfig.label,
      estado: esRecuperatorio ? "recuperatorio" : "en_curso",
      es_recuperatorio: esRecuperatorio,
    })
    .select()
    .single();

  if (examError) throw examError;

  const payload = questions.map((question, index) => ({
    examen_id: examen.id,
    pregunta_numero: question.numero,
    orden: index + 1,
    es_adicional: Boolean(question.es_adicional),
  }));

  const { error: preguntasError } = await supabase.from("examenes_preguntas").insert(payload);
  if (preguntasError) throw preguntasError;

  return examen;
}

async function loadExamQuestions(examenId) {
  const { data: asignadas, error } = await supabase
    .from("examenes_preguntas")
    .select("*")
    .eq("examen_id", examenId)
    .order("orden", { ascending: true });

  if (error) throw error;

  const numeros = (asignadas || []).map((item) => item.pregunta_numero);
  if (!numeros.length) return [];

  const { data: questions, error: questionsError } = await supabase
    .from("banco_preguntas")
    .select("*")
    .in("numero", numeros);

  if (questionsError) throw questionsError;

  const byNumero = new Map((questions || []).map((question) => [question.numero, question]));
  return (asignadas || []).map((item) => ({
    ...byNumero.get(item.pregunta_numero),
    es_adicional: item.es_adicional,
    orden: item.orden,
  }));
}

async function loadExamResponses(examenId) {
  const { data, error } = await supabase
    .from("examenes_respuestas")
    .select("*")
    .eq("examen_id", examenId);
  if (error) throw error;
  return data || [];
}

async function upsertAnswer(examenId, questionNumber, responseText) {
  const { error } = await supabase
    .from("examenes_respuestas")
    .upsert(
      {
        examen_id: examenId,
        pregunta_numero: questionNumber,
        respuesta_texto: responseText,
        respondida_at: new Date().toISOString(),
      },
      { onConflict: "examen_id,pregunta_numero" }
    );

  if (error) throw error;
}

async function updateExamResult(examenId, payload) {
  const { error } = await supabase
    .from("examenes")
    .update(payload)
    .eq("id", examenId);
  if (error) throw error;
}

function aggregateByDomain(questions, gradingMap) {
  const map = {};
  questions.forEach((question) => {
    const grade = gradingMap[question.numero];
    const key = question.dominio || "Integrador";
    if (!map[key]) map[key] = { dominio: key, obtenido: 0, maximo: 0 };
    map[key].obtenido += Number(grade?.puntaje_obtenido || 0);
    map[key].maximo += Number(grade?.puntaje_maximo || question.puntaje_sugerido || 0);
  });
  return Object.values(map).map((item) => ({
    ...item,
    porcentaje: item.maximo ? Math.round((item.obtenido / item.maximo) * 100) : 0,
  }));
}

function getWeakestDomain(domainRows) {
  const sorted = [...domainRows].sort((a, b) => a.porcentaje - b.porcentaje);
  return sorted[0]?.dominio || null;
}

function notifyBankExhausted(rotationLabel) {
  return `No quedan suficientes preguntas nuevas disponibles para ${rotationLabel}. Se notificó que el banco necesita reposición para esta residente.`;
}

function renderFeedbackItems(items) {
  if (!items?.length) return "Sin detalle de cotejo.";
  return items
    .map((item) => `${item.marca || (item.cubierto ? "✓" : "✗")} ${item.descripcion}`)
    .join("\n");
}

export default function ResidentExamApp({ user, onLogout }) {
  const [resident, setResident] = useState(null);
  const [rotationStates, setRotationStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState("overview");
  const [currentExam, setCurrentExam] = useState(null);
  const [baseQuestions, setBaseQuestions] = useState([]);
  const [additionalQuestions, setAdditionalQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [grading, setGrading] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState("base");
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
  const [currentText, setCurrentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [resultMeta, setResultMeta] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);
  const [timeExpired, setTimeExpired] = useState(false);
  const [exitSubmitting, setExitSubmitting] = useState(false);
  const timerRef = useRef(null);
  const finalizeExamRef = useRef(null);
  const currentTextRef = useRef("");
  const isFinalizingRef = useRef(false);

  const allQuestions = phase === "additional" ? additionalQuestions : baseQuestions;
  const currentQuestion = allQuestions[currentIndex] || null;

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setLoading(true);
      setError("");
      try {
        const residente = await fetchResidentByUser(user);
        if (!active) return;
        if (!residente) {
          throw new Error("Tu cuenta de residente todavía no está vinculada a un registro en la tabla residentes.");
        }
        setResident(residente);
        const exams = await fetchRotationExams(residente.id);
        if (!active) return;

        const grouped = ROTACIONES.map((rotation) => ({
          ...rotation,
          exams: exams.filter((exam) => exam.rotacion === rotation.label),
        })).map((rotation) => ({
          ...rotation,
          summary: getRotationStatus(rotation.exams),
        }));

        setRotationStates(grouped);
      } catch (err) {
        if (!active) return;
        setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (screen !== "exam") return undefined;

    timerRef.current = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timerRef.current);
          setTimeExpired(true);
          finalizeExamRef.current?.({ timedOut: true });
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerRef.current);
  }, [screen]);

  useEffect(() => {
    if (screen !== "exam") return undefined;

    const handleBeforeUnload = (event) => {
      if (!isFinalizingRef.current) {
        setExitSubmitting(true);
        finalizeExamRef.current?.({ timedOut: false, exitAttempt: true });
      }
      event.preventDefault();
      event.returnValue = "¿Seguro que querés salir? Tu examen se enviará con las respuestas completadas hasta este momento.";
      return event.returnValue;
    };

    const handlePageHide = () => {
      if (!isFinalizingRef.current) {
        setExitSubmitting(true);
        finalizeExamRef.current?.({ timedOut: false, exitAttempt: true });
      }
    };

    window.onbeforeunload = handleBeforeUnload;
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.onbeforeunload = null;
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [screen]);

  useEffect(() => {
    setCurrentText(currentQuestion ? answers[currentQuestion.numero] || "" : "");
  }, [answers, currentQuestion]);

  useEffect(() => {
    currentTextRef.current = currentText;
  }, [currentText]);

  useEffect(() => {
    finalizeExamRef.current = finalizeExam;
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const domainProgress = useMemo(
    () => getDomainProgress(allQuestions, currentIndex, phase),
    [allQuestions, currentIndex, phase]
  );

  const canContinue = currentText.trim().length > 0 && !timeExpired && !exitSubmitting;

  async function startExam(rotationState) {
    if (!resident) return;

    setBusy(true);
    setError("");

    try {
      if (rotationState.summary.mode === "resume" && rotationState.summary.currentExam) {
        const exam = rotationState.summary.currentExam;
        const [questions, responses] = await Promise.all([
          loadExamQuestions(exam.id),
          loadExamResponses(exam.id),
        ]);

        const answersMap = Object.fromEntries((responses || []).map((item) => [item.pregunta_numero, item.respuesta_texto || ""]));
        const firstUnanswered = questions.findIndex((question) => !answersMap[question.numero]);
        const splitBase = questions.filter((question) => !question.es_adicional);
        const splitAdditional = questions.filter((question) => question.es_adicional);
        const resumePhase = firstUnanswered >= splitBase.length && splitAdditional.length ? "additional" : "base";
        const resumeQuestions = resumePhase === "additional" ? splitAdditional : splitBase;
        const resumeIndex = resumePhase === "additional"
          ? Math.max(0, splitAdditional.findIndex((question) => !answersMap[question.numero]))
          : Math.max(0, firstUnanswered === -1 ? splitBase.length - 1 : firstUnanswered);

        setCurrentExam(exam);
        setBaseQuestions(splitBase);
        setAdditionalQuestions(splitAdditional);
        setAnswers(answersMap);
        setGrading({});
        setCurrentIndex(resumeIndex);
        setPhase(resumePhase);
        setTimeLeft(Math.max(60, EXAM_DURATION_SECONDS - Math.floor((Date.now() - new Date(exam.iniciado_at).getTime()) / 1000)));
        setTimeExpired(false);
        setExitSubmitting(false);
        setScreen("exam");
        return;
      }

      const seenNumbers = await fetchSeenQuestionNumbers(resident.id);
      const desiredCount = 6;
      let selectedQuestions = [];

      if (rotationState.summary.mode === "recovery" && rotationState.summary.previousExam) {
        const previousQuestions = await loadExamQuestions(rotationState.summary.previousExam.id);
        const repeatedCount = Math.min(1, previousQuestions.length);
        const repeated = shuffle(previousQuestions).slice(0, repeatedCount).map((question) => ({
          ...question,
          es_adicional: false,
        }));

        const exclude = [...new Set([...seenNumbers, ...repeated.map((question) => question.numero)])];
        const freshCandidates = await fetchCandidateQuestions({
          rotaciones: rotationState.bancoRotaciones,
          excludeNumbers: exclude,
        });

        const fresh = freshCandidates.slice(0, desiredCount - repeated.length);
        if (fresh.length < desiredCount - repeated.length) {
          throw new Error(notifyBankExhausted(rotationState.label));
        }

        selectedQuestions = shuffle([...repeated, ...fresh]).slice(0, desiredCount);
      } else {
        const candidates = await fetchCandidateQuestions({
          rotaciones: rotationState.bancoRotaciones,
          excludeNumbers: seenNumbers,
        });
        selectedQuestions = candidates.slice(0, desiredCount);
        if (selectedQuestions.length < desiredCount) {
          throw new Error(notifyBankExhausted(rotationState.label));
        }
      }

      const exam = await createExamWithQuestions({
        residenteId: resident.id,
        rotationConfig: rotationState,
        esRecuperatorio: rotationState.summary.mode === "recovery",
        questions: selectedQuestions.map((question) => ({ ...question, es_adicional: false })),
      });

      setCurrentExam(exam);
      setBaseQuestions(selectedQuestions.map((question, index) => ({ ...question, orden: index + 1, es_adicional: false })));
      setAdditionalQuestions([]);
      setAnswers({});
      setGrading({});
      setCurrentIndex(0);
      setPhase("base");
      setTimeLeft(EXAM_DURATION_SECONDS);
      setTimeExpired(false);
      setExitSubmitting(false);
      setResultMeta(null);
      setScreen("exam");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmAndNext() {
    if (!currentQuestion || !currentExam || busy) return;

    setBusy(true);
    try {
      await upsertAnswer(currentExam.id, currentQuestion.numero, currentText);
      setAnswers((current) => ({ ...current, [currentQuestion.numero]: currentText }));

      if (currentIndex < allQuestions.length - 1) {
        setCurrentIndex((current) => current + 1);
        return;
      }

      await finalizeExam({ timedOut: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function finalizeExam({ timedOut, exitAttempt = false }) {
    if (!currentExam || isFinalizingRef.current) return;
    isFinalizingRef.current = true;
    window.clearInterval(timerRef.current);

    if (!timedOut && !exitAttempt) {
      setScreen("grading");
    } else {
      setTimeExpired(true);
      setExitSubmitting(true);
    }

    try {
      const latestText = currentTextRef.current;
      if (currentQuestion && latestText.trim()) {
        await upsertAnswer(currentExam.id, currentQuestion.numero, latestText);
        setAnswers((current) => ({ ...current, [currentQuestion.numero]: latestText }));
      }

      const responses = await loadExamResponses(currentExam.id);
      const answerMap = Object.fromEntries(responses.map((item) => [item.pregunta_numero, item.respuesta_texto || ""]));
      const questionsToGrade = [...baseQuestions, ...additionalQuestions];
      const gradeMap = {};

      for (const question of questionsToGrade) {
        const result = await corregirPreguntaConIA(question, answerMap[question.numero] || "");
        gradeMap[question.numero] = result;
        await supabase
          .from("examenes_respuestas")
          .update({
            puntaje_obtenido: result.puntaje_obtenido,
            feedback_ia: `${renderFeedbackItems(result.items)}\n\n${result.feedback}`,
          })
          .eq("examen_id", currentExam.id)
          .eq("pregunta_numero", question.numero);
      }

      const baseDomainStats = aggregateByDomain(baseQuestions, gradeMap);
      const baseObtained = Object.values(gradeMap)
        .filter((_value, keyIndex) => keyIndex < baseQuestions.length)
        .reduce((sum, item) => sum + Number(item?.puntaje_obtenido || 0), 0);
      const baseMax = baseQuestions.reduce((sum, question) => sum + Number(question.puntaje_sugerido || 0), 0);

      if (currentExam.rotacion === "Medicina Familiar" && additionalQuestions.length === 0) {
        const weakestDomain = getWeakestDomain(baseDomainStats);
        const seenNumbers = await fetchSeenQuestionNumbers(resident.id);
        const fresh = await fetchCandidateQuestions({
          rotaciones: ["Medicina Familiar", "Guardia"],
          domain: weakestDomain,
          excludeNumbers: seenNumbers,
        });

        const selectedAdditional = fresh.slice(0, 5).map((question, index) => ({
          ...question,
          orden: baseQuestions.length + index + 1,
          es_adicional: true,
        }));

        if (selectedAdditional.length < 5) {
          throw new Error(notifyBankExhausted("Medicina Familiar / Guardia"));
        }

        const { error: extraInsertError } = await supabase.from("examenes_preguntas").insert(
          selectedAdditional.map((question) => ({
            examen_id: currentExam.id,
            pregunta_numero: question.numero,
            orden: question.orden,
            es_adicional: true,
          }))
        );
        if (extraInsertError) throw extraInsertError;

        setGrading(gradeMap);
        setAdditionalQuestions(selectedAdditional);
        setCurrentIndex(0);
        setPhase("additional");
        setTimeExpired(false);
        setExitSubmitting(false);
        isFinalizingRef.current = false;
        setScreen("exam");
        return;
      }

      const totalObtained = questionsToGrade.reduce(
        (sum, question) => sum + Number(gradeMap[question.numero]?.puntaje_obtenido || 0),
        0
      );
      const totalMax = questionsToGrade.reduce(
        (sum, question) => sum + Number(gradeMap[question.numero]?.puntaje_maximo || question.puntaje_sugerido || 0),
        0
      );
      const approved = totalMax ? (totalObtained / totalMax) * 100 >= 50 : false;

      await updateExamResult(currentExam.id, {
        estado: currentExam.es_recuperatorio ? "recuperatorio" : "completado",
        puntaje_total: totalObtained,
        aprobado: approved,
        finalizado_at: new Date().toISOString(),
        tiempo_agotado: timedOut,
      });

      setGrading(gradeMap);
      setResultMeta({
        totalObtained,
        totalMax,
        approved,
        timedOut,
        domains: aggregateByDomain(questionsToGrade, gradeMap),
        additional: aggregateByDomain(additionalQuestions, gradeMap),
        base: aggregateByDomain(baseQuestions, gradeMap),
      });
      setScreen("results");
    } catch (err) {
      setError(err.message);
      setScreen("overview");
    } finally {
      setExitSubmitting(false);
      isFinalizingRef.current = false;
    }
  }

  const timerColor = timeLeft <= 10 * 60 ? "#e05454" : "#4a9fd4";
  const timerProgress = (timeLeft / EXAM_DURATION_SECONDS) * 100;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f6f9", color: "#0f2744", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🩺</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Cargando exámenes...</div>
        </div>
      </div>
    );
  }

  if (screen === "grading") {
    return (
      <div style={{ minHeight: "100vh", background: "#0f2744", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>⏳</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 12px" }}>Analizando tu examen...</h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, margin: 0 }}>
            Estamos corrigiendo cada respuesta con IA y armando tu devolución.
          </p>
        </div>
      </div>
    );
  }

  if (screen === "results" && resultMeta) {
    const totalPercentage = resultMeta.totalMax ? Math.round((resultMeta.totalObtained / resultMeta.totalMax) * 100) : 0;
    return (
      <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        <div style={{ background: "#0f2744", color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>🩺 ResidenciaMF · Resultados R2 + R3</div>
          <button onClick={() => window.location.reload()} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>
            Volver a mis exámenes
          </button>
        </div>

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px", display: "grid", gap: 18 }}>
          <div style={{
            background: resultMeta.approved ? "linear-gradient(135deg, #1a6b4a, #2ecc71)" : "linear-gradient(135deg, #7a1f1f, #e05454)",
            borderRadius: 20, padding: "32px", color: "#fff", textAlign: "center",
          }}>
            <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{resultMeta.totalObtained}/{resultMeta.totalMax}</div>
            <div style={{ fontSize: 18, opacity: 0.9, marginTop: 6 }}>
              {totalPercentage}% · {resultMeta.approved ? "Aprobado ✅" : "Recuperatorio disponible 🔄"}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800, color: "#0f2744" }}>Desglose por dominio</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {resultMeta.domains.map((row) => (
                <div key={row.dominio}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, color: "#4a5568" }}>{row.dominio}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2e44" }}>{row.obtenido}/{row.maximo}</span>
                  </div>
                  <ProgressBar value={row.obtenido} max={row.maximo || 1} color="#4a9fd4" height={10} />
                </div>
              ))}
            </div>
          </div>

          {baseQuestions.map((question) => {
            const result = grading[question.numero];
            return (
              <div key={`${question.numero}-${question.orden}`} style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  <HeaderBadge text={question.rotacion} color="#0f2744" background="#eef4fb" />
                  <HeaderBadge text={question.dominio} color="#164e63" background="#daf5fb" />
                  <HeaderBadge text={`Pregunta ${question.orden}`} color="#6b4b00" background="#fff2cf" />
                </div>
                <div style={{ fontSize: 14, color: "#1a2e44", lineHeight: 1.7, marginBottom: 14 }}>{question.enunciado}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f2744", marginBottom: 8 }}>
                  Puntaje: {result?.puntaje_obtenido || 0}/{result?.puntaje_maximo || question.puntaje_sugerido}
                </div>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#506478", lineHeight: 1.6, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
                  {renderFeedbackItems(result?.items)}
                </pre>
                <div style={{ marginTop: 12, color: "#1a2e44", lineHeight: 1.6 }}>{result?.feedback}</div>
              </div>
            );
          })}

          {additionalQuestions.length > 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ background: "#fff8e8", border: "1px solid #f0d8a0", borderRadius: 16, padding: "18px 24px", color: "#6b4e00" }}>
                <strong>Medicina Familiar — preguntas adicionales</strong>
              </div>
              {additionalQuestions.map((question) => {
                const result = grading[question.numero];
                return (
                  <div key={`${question.numero}-${question.orden}`} style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                      <HeaderBadge text={question.rotacion} color="#0f2744" background="#eef4fb" />
                      <HeaderBadge text={question.dominio} color="#164e63" background="#daf5fb" />
                      <HeaderBadge text="Adicional" color="#7c2d12" background="#ffedd5" />
                    </div>
                    <div style={{ fontSize: 14, color: "#1a2e44", lineHeight: 1.7, marginBottom: 14 }}>{question.enunciado}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f2744", marginBottom: 8 }}>
                      Puntaje: {result?.puntaje_obtenido || 0}/{result?.puntaje_maximo || question.puntaje_sugerido}
                    </div>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#506478", lineHeight: 1.6, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
                      {renderFeedbackItems(result?.items)}
                    </pre>
                    <div style={{ marginTop: 12, color: "#1a2e44", lineHeight: 1.6 }}>{result?.feedback}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === "exam" && currentQuestion) {
    return (
      <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        <div style={{ background: "#0f2744", color: "#fff", padding: "16px 24px", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>🩺 {currentExam?.rotacion} · Examen R2 + R3</div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>
                {phase === "additional" ? "Preguntas adicionales" : "Examen en curso"} · Pregunta {currentIndex + 1} de {allQuestions.length}
              </div>
            </div>
            <div style={{ minWidth: 220 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span>Tiempo restante</span>
                <strong>{timeLabel(timeLeft)}</strong>
              </div>
              <ProgressBar value={timerProgress} max={100} color={timerColor} height={10} />
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "24px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.45fr) minmax(280px, 0.65fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <div style={{ order: isMobile ? 2 : 1 }}>
            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", padding: 24 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <HeaderBadge text={currentQuestion.rotacion} color="#0f2744" background="#eef4fb" />
                <HeaderBadge text={currentQuestion.dominio} color="#164e63" background="#daf5fb" />
                {currentQuestion.es_adicional && (
                  <HeaderBadge text="Adicional" color="#7c2d12" background="#ffedd5" />
                )}
              </div>
              <h2 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 800, color: "#0f2744" }}>
                Enunciado completo
              </h2>
              <div style={{ whiteSpace: "pre-wrap", color: "#1a2e44", lineHeight: 1.7, marginBottom: 16 }}>
                {currentQuestion.enunciado}
              </div>
              {currentQuestion.imagen_url && (
                <img
                  src={currentQuestion.imagen_url}
                  alt={`Pregunta ${currentQuestion.numero}`}
                  style={{ width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 14, border: "1px solid #dfe7f1", background: "#f8fbff" }}
                />
              )}

              <div style={{ height: 1, background: "#e2e8f0", margin: "18px 0" }} />
              {timeExpired && (
                <div style={{ marginBottom: 14, background: "#fff3f3", border: "1px solid #f0b8b8", borderRadius: 14, padding: "12px 14px", color: "#8f2d2d", fontSize: 14, fontWeight: 600 }}>
                  Tiempo finalizado — enviando tu examen...
                </div>
              )}
              {exitSubmitting && (
                <div style={{ marginBottom: 14, background: "#fff8e8", border: "1px solid #f0d8a0", borderRadius: 14, padding: "12px 14px", color: "#6b4e00", fontSize: 14, fontWeight: 600 }}>
                  Guardando tus respuestas para enviar el examen automáticamente...
                </div>
              )}
              <label style={{ fontSize: 12, fontWeight: 700, color: "#607284", display: "block", marginBottom: 10 }}>
                Tu respuesta
              </label>
              <textarea
                value={currentText}
                onChange={(event) => setCurrentText(event.target.value)}
                placeholder="Escribí tu respuesta..."
                rows={10}
                disabled={timeExpired || exitSubmitting || busy}
                style={{
                  width: "100%",
                  minHeight: 180,
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "14px 16px",
                  fontSize: 15,
                  lineHeight: 1.6,
                  resize: "vertical",
                  outline: "none",
                  color: "#2d3748",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  background: timeExpired || exitSubmitting ? "#f8fafc" : "#fff",
                }}
              />
              <button
                onClick={confirmAndNext}
                disabled={!canContinue || busy}
                style={{
                  marginTop: 16,
                  width: "100%",
                  background: "#4a9fd4",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 20px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: !canContinue || busy ? "not-allowed" : "pointer",
                  opacity: !canContinue || busy ? 0.65 : 1,
                }}
              >
                {busy ? "Guardando..." : "Confirmar y siguiente →"}
              </button>
            </div>
          </div>

          <div style={{ order: isMobile ? 1 : 2 }}>
            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", padding: 20, position: isMobile ? "static" : "sticky", top: 96 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: timerColor, marginBottom: 8 }}>
                ⏱ {timeLabel(timeLeft)}
              </div>
              <ProgressBar value={timerProgress} max={100} color={timerColor} height={10} />
              <div style={{ fontSize: 12, fontWeight: 700, color: "#607284", margin: "18px 0 12px" }}>
                Progreso
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {domainProgress.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderRadius: 12,
                      padding: "10px 12px",
                      background: item.current ? "#eef6ff" : item.done ? "#f1fbf4" : "#f8fbff",
                      border: `1px solid ${item.current ? "#c8dff5" : item.done ? "#d2ecd9" : "#e2e8f0"}`,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{item.done ? "✓" : item.current ? "•" : "○"}</span>
                    <span style={{ fontSize: 13, color: "#1a2e44" }}>{item.dominio}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ background: "#0f2744", color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🩺</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>ResidenciaMF</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Mis exámenes R2 + R3</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <HeaderBadge text={TARGET_ANIOS.join(" + ")} color="#0f2744" background="#d9eefc" />
          <button onClick={onLogout} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13 }}>Salir</button>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "32px 24px", display: "grid", gap: 20 }}>
        {error && (
          <div style={{ background: "#fff3f3", border: "1px solid #f0b8b8", borderRadius: 16, padding: "16px 20px", color: "#8f2d2d" }}>
            {error}
          </div>
        )}

        {rotationStates.map((rotation) => (
          <div key={rotation.key} style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", padding: "22px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f2744", marginBottom: 6 }}>{rotation.label}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <HeaderBadge text={rotation.summary.label} color="#0f2744" background="#eef4fb" />
                <HeaderBadge text={`${rotation.summary.attempts} intento${rotation.summary.attempts === 1 ? "" : "s"}`} color="#506478" background="#f4f7fb" />
                {rotation.summary.lastScore !== null && (
                  <HeaderBadge text={`Último puntaje: ${rotation.summary.lastScore}`} color="#166534" background="#dcfce7" />
                )}
              </div>
            </div>
            <button
              onClick={() => startExam(rotation)}
              disabled={!rotation.summary.canStart || busy}
              style={{
                background: rotation.summary.canStart ? "#4a9fd4" : "#e2e8f0",
                color: rotation.summary.canStart ? "#fff" : "#708193",
                border: "none",
                borderRadius: 12,
                padding: "14px 22px",
                fontSize: 15,
                fontWeight: 700,
                cursor: rotation.summary.canStart && !busy ? "pointer" : "not-allowed",
              }}
            >
              {rotation.summary.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
