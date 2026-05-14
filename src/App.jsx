import { useEffect, useState } from "react";

// ── ORDEN DE DOMINIOS (flujo de consulta real) ───────────────────────────────
const ORDEN_DOMINIOS = [
  { key: "anamnesis",    label: "Anamnesis",                 icon: "💬", color: "#7bc47f" },
  { key: "examen",       label: "Examen físico",             icon: "🩺", color: "#d45f8c" },
  { key: "comunicacion", label: "Comunicación",              icon: "🤝", color: "#e8a838" },
  { key: "estudios",     label: "Estudios complementarios",  icon: "🔬", color: "#9b6dcc" },
  { key: "terapeutica",  label: "Plan terapéutico",          icon: "💊", color: "#e07b54" },
];

// ── BANCO DE PREGUNTAS ────────────────────────────────────────────────────────
// Consignas organizadas por dominio en orden de consulta real
const BANCO = [
  {
    id: 1,
    rotacion: "Pediatría",
    tipo: "CASO CLÍNICO",
    ano: "R1",
    enunciado:
      "Mateo, de 10 meses, consulta por prurito persistente en el cuero cabelludo de 3 semanas de evolución. Recibió vinagre, aceite de oliva y permetrina 1% sin mejoría. Un hermano de 5 años también comenzó con prurito y en el jardín solicitaron certificados por varios casos.",
    // Consignas ordenadas: Anamnesis → Examen → Comunicación → Estudios → Terapéutica
    consignas: [
      { dominio: "anamnesis",    texto: "¿Qué datos adicionales ampliarías en la anamnesis? ¿Qué antecedentes epidemiológicos son relevantes en este caso?" },
      { dominio: "examen",       texto: "¿Cómo realizás el examen físico dirigido? ¿Qué buscás en cuero cabelludo y cuál sería tu hallazgo esperado?" },
      { dominio: "comunicacion", texto: "¿Cómo le explicás el diagnóstico a la mamá? ¿Qué información le das sobre el contagio y el entorno?" },
      { dominio: "estudios",     texto: "¿Qué errores identificás en el manejo previo? ¿Por qué falló la permetrina 1% en este caso?" },
      { dominio: "terapeutica",  texto: "¿Cuál es el tratamiento farmacológico correcto, dosis y forma de uso? ¿Qué medidas no farmacológicas indicás?" },
    ],
    cotejo: [
      { dominio: "anamnesis",    item: "Indaga convivientes sintomáticos, ámbito escolar y tratamientos previos fallidos", puntaje: 1 },
      { dominio: "examen",       item: "Describe examen del cuero cabelludo buscando liendres y piojos vivos; diferencia liendre viva de vacía", puntaje: 1 },
      { dominio: "comunicacion", item: "Explica mecanismo de contagio, necesidad de tratar convivientes y cómo comunicar al jardín sin estigmatizar", puntaje: 1 },
      { dominio: "estudios",     item: "Identifica error: permetrina 1% es insuficiente; concentración correcta es 1.5% o ivermectina oral", puntaje: 1 },
      { dominio: "terapeutica",  item: "Indica tratamiento correcto con dosis, aplicación correcta, medidas ambientales y seguimiento", puntaje: 2 },
    ],
    puntaje_total: 6,
  },
  {
    id: 2,
    rotacion: "Medicina Familiar",
    tipo: "CASO CLÍNICO",
    ano: "R1",
    enunciado:
      "Marta, 52 años, sin antecedentes conocidos, consulta por cefalea occipital de varios días. En el consultorio: TA 140/90 mmHg en dos tomas separadas 10 minutos, en reposo. FC 78. Sin otros síntomas.",
    consignas: [
      { dominio: "anamnesis",    texto: "¿Qué antecedentes personales, familiares y hábitos investigás en la anamnesis?" },
      { dominio: "examen",       texto: "¿Qué buscás en el examen físico para evaluar daño de órgano blanco?" },
      { dominio: "comunicacion", texto: "¿Cómo le explicás a Marta el diagnóstico y la importancia del seguimiento sin generarle alarma innecesaria?" },
      { dominio: "estudios",     texto: "¿Qué estudios complementarios solicitás en la evaluación inicial de una HTA recién diagnosticada?" },
      { dominio: "terapeutica",  texto: "¿Cuál es tu plan terapéutico inicial? ¿Iniciás farmacoterapia o medidas higiénico-dietéticas?" },
    ],
    cotejo: [
      { dominio: "anamnesis",    item: "Indaga antecedentes familiares de HTA/ECV, tabaquismo, sedentarismo, consumo de sal, AINE, anticonceptivos", puntaje: 1 },
      { dominio: "examen",       item: "Evalúa órganos blanco: fondo de ojo, auscultación cardíaca y carotídea, pulsos periféricos, búsqueda de edemas", puntaje: 1 },
      { dominio: "comunicacion", item: "Explica qué es la HTA, por qué necesita seguimiento, sin generar pánico ni minimizar", puntaje: 1 },
      { dominio: "estudios",     item: "Solicita laboratorio completo: glucemia, creatinina, ionograma, orina, perfil lipídico + ECG", puntaje: 2 },
      { dominio: "terapeutica",  item: "Con TA 140/90 sin daño de órgano blanco: inicia MHD y reevalúa en 3 meses antes de agregar fármaco", puntaje: 1 },
    ],
    puntaje_total: 6,
  },
];

// ── USUARIOS DEMO ───────────────────────────────────────────────────────────
const USUARIOS = {
  residente: { nombre: "Lucas Fernández", rol: "residente", año: "R1", avatar: "LF" },
  docente: { nombre: "Dra. González", rol: "docente", avatar: "DG" },
};

// ── DATOS SIMULADOS DASHBOARD ────────────────────────────────────────────────
const RESIDENTES_DASHBOARD = [
  {
    nombre: "Lucas Fernández", año: "R1", avatar: "LF",
    dominios: { "Anamnesis": 82, "Diagnóstico": 68, "Terapéutica": 55, "Estudios complementarios": 74, "Prevención": 90, "Comunicación": 78 },
    rotaciones: { "Medicina Familiar": 76, "Pediatría": 61, "Traumatología": 83 },
    examenes: 4, ultimo: "Pediatría · hace 3 días",
  },
  {
    nombre: "Valentina Ruiz", año: "R1", avatar: "VR",
    dominios: { "Anamnesis": 91, "Diagnóstico": 84, "Terapéutica": 72, "Estudios complementarios": 67, "Prevención": 88, "Comunicación": 95 },
    rotaciones: { "Medicina Familiar": 88, "Pediatría": 79, "Traumatología": 71 },
    examenes: 4, ultimo: "Traumatología · hace 1 semana",
  },
  {
    nombre: "Matías Córdoba", año: "R2", avatar: "MC",
    dominios: { "Anamnesis": 78, "Diagnóstico": 71, "Terapéutica": 62, "Estudios complementarios": 85, "Prevención": 80, "Comunicación": 69 },
    rotaciones: { "Medicina Familiar": 75, "Pediatría": 68, "Ginecología": 60, "Dermatología": 88 },
    examenes: 7, ultimo: "Ginecología · ayer",
  },
];

// ── COLORES POR DOMINIO ──────────────────────────────────────────────────────
const DOMINIO_COLOR = {
  "Terapéutica": "#e07b54",
  "Diagnóstico": "#4a90d9",
  "Anamnesis": "#7bc47f",
  "Estudios complementarios": "#9b6dcc",
  "Prevención y promoción": "#50b8a0",
  "Prevención": "#50b8a0",
  "Comunicación": "#e8a838",
  "Examen físico": "#d45f8c",
  "Integrador": "#6b7fa3",
};

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_SITE_URL = import.meta.env.VITE_OPENROUTER_SITE_URL || window.location.origin;
const OPENROUTER_APP_NAME = import.meta.env.VITE_OPENROUTER_APP_NAME || "ResidenciaMF";
const OPENROUTER_KEY_STORAGE = "residenciamf_openrouter_api_key";
const MODELOS_OPENROUTER = [
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
];

function getOpenRouterApiKey() {
  return (
    window.localStorage.getItem(OPENROUTER_KEY_STORAGE)?.trim() ||
    OPENROUTER_API_KEY ||
    ""
  );
}

function extraerJson(texto) {
  const limpio = texto.replace(/```json|```/g, "").trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio === -1 || fin === -1) {
    throw new Error("La IA no devolvió un JSON válido.");
  }
  return JSON.parse(limpio.slice(inicio, fin + 1));
}

// ── LLAMADA A OPENROUTER ─────────────────────────────────────────────────────
async function corregirConIA(pregunta, respuesta, modelo) {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    throw new Error("Falta configurar la API key de OpenRouter.");
  }

  const cotejo_texto = pregunta.cotejo
    .map((c, i) => `Ítem ${i + 1} (${c.puntaje} pts): ${c.item}`)
    .join("\n");

  const prompt = `Sos un evaluador de residentes de medicina familiar argentina. 
Evaluá la respuesta del residente usando exclusivamente la lista de cotejo provista.

CASO CLÍNICO / PREGUNTA:
${pregunta.enunciado}

LISTA DE COTEJO:
${cotejo_texto}
Puntaje total posible: ${pregunta.puntaje_total} pts

RESPUESTA DEL RESIDENTE:
${respuesta}

Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, con esta estructura exacta:
{
  "items": [
    {
      "item_n": 1,
      "descripcion": "texto del ítem",
      "estado": "completo" | "parcial" | "ausente",
      "puntaje_obtenido": número,
      "puntaje_maximo": número,
      "fundamento": "una línea explicando por qué"
    }
  ],
  "puntaje_total": número,
  "puntaje_maximo": número,
  "porcentaje": número,
  "comentario_general": "feedback breve y constructivo en segunda persona del singular (tuteo argentino)"
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
      model: modelo,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter devolvió ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return extraerJson(text);
}

// ── COMPONENTES UI ───────────────────────────────────────────────────────────

function Avatar({ initials, size = 36, color = "#2c5f8a" }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color, color: "#fff", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, fontFamily: "inherit", flexShrink: 0,
    }}>{initials}</div>
  );
}

function Badge({ text, color = "#e07b54" }) {
  return (
    <span style={{
      background: color + "20", color, border: `1px solid ${color}40`,
      borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 600,
      letterSpacing: "0.04em", textTransform: "uppercase",
    }}>{text}</span>
  );
}

function ProgressBar({ value, max = 100, color = "#2c5f8a", height = 8 }) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = pct >= 75 ? "#4caf82" : pct >= 50 ? "#e8a838" : "#e05454";
  return (
    <div style={{ background: "#e8ecf0", borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
      <div style={{
        width: `${pct}%`, height: "100%",
        background: color || barColor,
        borderRadius: 99, transition: "width 0.6s ease",
      }} />
    </div>
  );
}

// ── PANTALLA LOGIN ───────────────────────────────────────────────────────────
function Login({ onLogin }) {
  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #0f2744 0%, #1e4976 50%, #2c6fad 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      <div style={{ textAlign: "center", maxWidth: 420, width: "100%" }}>
        <div style={{
          background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.15)", borderRadius: 24,
          padding: "48px 40px", marginBottom: 24,
        }}>
          <div style={{ marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, background: "linear-gradient(135deg, #4a9fd4, #2c6fad)",
              borderRadius: 16, margin: "0 auto 20px", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 28,
            }}>🩺</div>
            <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              ResidenciaMF
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, margin: 0 }}>
              Sistema de evaluación · Medicina Familiar
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={() => onLogin("residente")} style={{
              background: "#4a9fd4", color: "#fff", border: "none",
              borderRadius: 12, padding: "16px 24px", fontSize: 15, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#3a8fc4"}
              onMouseLeave={e => e.currentTarget.style.background = "#4a9fd4"}
            >
              <Avatar initials="LF" size={36} color="rgba(255,255,255,0.2)" />
              <div style={{ textAlign: "left" }}>
                <div>Lucas Fernández</div>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 400 }}>Residente · 1er año</div>
              </div>
            </button>

            <button onClick={() => onLogin("docente")} style={{
              background: "rgba(255,255,255,0.1)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 12, padding: "16px 24px", fontSize: 15, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            >
              <Avatar initials="DG" size={36} color="rgba(255,255,255,0.15)" />
              <div style={{ textAlign: "left" }}>
                <div>Dra. González</div>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 400 }}>Docente · Coordinadora</div>
              </div>
            </button>
          </div>
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Prototipo — Residencia de Medicina Familiar · Córdoba</p>
      </div>
    </div>
  );
}

// ── VISTA RESIDENTE ──────────────────────────────────────────────────────────
function VistaResidente({ usuario, onLogout }) {
  const [paso, setPaso] = useState("lista");
  const [casoIdx, setCasoIdx] = useState(0);
  const [consignaIdx, setConsignaIdx] = useState(0);
  const [respuestas, setRespuestas] = useState({}); // { "casoId-dominioKey": texto }
  const [resultados, setResultados] = useState({});
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [examenActivo, setExamenActivo] = useState(null);
  const [modeloSeleccionado, setModeloSeleccionado] = useState(MODELOS_OPENROUTER[0].value);
  const [apiKeyInput, setApiKeyInput] = useState(() => getOpenRouterApiKey());
  const [apiKeyGuardada, setApiKeyGuardada] = useState(() => Boolean(getOpenRouterApiKey()));

  useEffect(() => {
    setApiKeyGuardada(Boolean(getOpenRouterApiKey()));
  }, []);

  const casos = BANCO.filter(p => p.ano === "R1");
  const caso = casos[casoIdx];
  const consignaActual = caso?.consignas[consignaIdx];
  const dominioInfo = ORDEN_DOMINIOS.find(d => d.key === consignaActual?.dominio) || ORDEN_DOMINIOS[0];
  const respKey = caso ? `${caso.id}-${consignaActual?.dominio}` : "";

  // Total de pasos = suma de consignas de todos los casos
  const totalConsignas = casos.reduce((s, c) => s + c.consignas.length, 0);
  const consignasHechas = casos.slice(0, casoIdx).reduce((s, c) => s + c.consignas.length, 0) + consignaIdx;

  const iniciarExamen = (rotacion) => {
    setExamenActivo(rotacion);
    setPaso("examen");
    setCasoIdx(0);
    setConsignaIdx(0);
    setRespuestas({});
    setResultados({});
  };

  const avanzar = () => {
    // ¿Hay más consignas en este caso?
    if (consignaIdx < caso.consignas.length - 1) {
      setConsignaIdx(consignaIdx + 1);
    // ¿Hay más casos?
    } else if (casoIdx < casos.length - 1) {
      setCasoIdx(casoIdx + 1);
      setConsignaIdx(0);
    } else {
      // Fin del examen → corregir
      handleEnviar();
    }
  };

  const retroceder = () => {
    if (consignaIdx > 0) {
      setConsignaIdx(consignaIdx - 1);
    } else if (casoIdx > 0) {
      const casoPrev = casos[casoIdx - 1];
      setCasoIdx(casoIdx - 1);
      setConsignaIdx(casoPrev.consignas.length - 1);
    }
  };

  const esPrimero = casoIdx === 0 && consignaIdx === 0;
  const esUltimo = casoIdx === casos.length - 1 && consignaIdx === (caso?.consignas.length - 1);

  const handleEnviar = async () => {
    setPaso("corrigiendo");
    try {
      if (!getOpenRouterApiKey()) {
        throw new Error("Cargá una API key de OpenRouter antes de corregir.");
      }
      setCorrigiendo(true);
      const nuevosResultados = {};
      for (const c of casos) {
        // Armar respuesta completa del caso juntando todas las consignas
        const respuestaCompleta = c.consignas.map(con => {
          const k = `${c.id}-${con.dominio}`;
          const dom = ORDEN_DOMINIOS.find(d => d.key === con.dominio);
          return `[${dom?.label || con.dominio}]\nPregunta: ${con.texto}\nRespuesta: ${respuestas[k] || "(sin respuesta)"}`;
        }).join("\n\n");

        const res = await corregirConIA(c, respuestaCompleta, modeloSeleccionado);
        nuevosResultados[c.id] = res;
      }
      setResultados(nuevosResultados);
      setPaso("resultado");
    } catch (e) {
      alert(`Error al corregir: ${e.message}`);
      setPaso("examen");
    } finally {
      setCorrigiendo(false);
    }
  };

  const guardarApiKey = () => {
    const limpia = apiKeyInput.trim();
    if (!limpia) {
      window.localStorage.removeItem(OPENROUTER_KEY_STORAGE);
      setApiKeyGuardada(Boolean(OPENROUTER_API_KEY));
      return;
    }
    window.localStorage.setItem(OPENROUTER_KEY_STORAGE, limpia);
    setApiKeyGuardada(true);
  };

  const borrarApiKey = () => {
    window.localStorage.removeItem(OPENROUTER_KEY_STORAGE);
    setApiKeyInput("");
    setApiKeyGuardada(Boolean(OPENROUTER_API_KEY));
  };

  const puntajeTotal = Object.values(resultados).reduce((s, r) => s + (r.puntaje_total || 0), 0);
  const puntajeMax = casos.reduce((s, p) => s + p.puntaje_total, 0);

  // ── LISTA DE EXÁMENES ──────────────────────────────────────────────────────
  if (paso === "lista") return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ background: "#0f2744", color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🩺</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>ResidenciaMF</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Mis exámenes</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar initials={usuario.avatar} size={34} color="#4a9fd4" />
          <button onClick={onLogout} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13 }}>Salir</button>
        </div>
      </div>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f2744", margin: "0 0 4px" }}>Hola, Lucas 👋</h2>
          <p style={{ color: "#6b7a8d", margin: 0, fontSize: 15 }}>1er año · Rotaciones disponibles para rendir</p>
        </div>
        <div style={{
          background: "#fff", borderRadius: 16, padding: "18px 20px", marginBottom: 20,
          border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2e44", marginBottom: 8 }}>
            Corrección con IA
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <select
              value={modeloSeleccionado}
              onChange={(e) => setModeloSeleccionado(e.target.value)}
              style={{
                minWidth: 220, border: "1px solid #d8e0ea", borderRadius: 10, padding: "10px 12px",
                fontSize: 14, color: "#1a2e44", background: "#fff", fontFamily: "inherit",
              }}
            >
              {MODELOS_OPENROUTER.map((modelo) => (
                <option key={modelo.value} value={modelo.value}>{modelo.label}</option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: "#6b7a8d" }}>
              Proveedor: OpenRouter
            </div>
            <div style={{ fontSize: 12, color: apiKeyGuardada ? "#15803d" : "#b45309" }}>
              {apiKeyGuardada ? "API key detectada" : "Falta configurar la API key"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Pegá tu API key de OpenRouter"
              style={{
                minWidth: 280, flex: 1, border: "1px solid #d8e0ea", borderRadius: 10, padding: "10px 12px",
                fontSize: 14, color: "#1a2e44", background: "#fff", fontFamily: "inherit",
              }}
            />
            <button
              onClick={guardarApiKey}
              style={{
                background: "#0f2744", color: "#fff", border: "none", borderRadius: 10,
                padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Guardar key
            </button>
            <button
              onClick={borrarApiKey}
              style={{
                background: "#fff", color: "#6b7a8d", border: "1px solid #d8e0ea", borderRadius: 10,
                padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Borrar
            </button>
          </div>
          <div style={{ fontSize: 12, color: "#6b7a8d", marginTop: 10 }}>
            La key se guarda localmente en este navegador. Si desplegás en Vercel, también podés usar `VITE_OPENROUTER_API_KEY`.
          </div>
        </div>
        {[
          { rot: "Pediatría", icon: "👶", estado: "pendiente", fecha: "Vence 20 may" },
          { rot: "Medicina Familiar", icon: "🏥", estado: "pendiente", fecha: "Vence 28 may" },
          { rot: "Traumatología", icon: "🦴", estado: "completado", fecha: "Rendido el 5 may", puntaje: "16/20" },
        ].map(ex => (
          <div key={ex.rot} style={{
            background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 12,
            border: "1px solid #e2e8f0", display: "flex", alignItems: "center",
            justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, background: ex.estado === "completado" ? "#f0faf5" : "#f0f6ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{ex.icon}</div>
              <div>
                <div style={{ fontWeight: 600, color: "#1a2e44", fontSize: 16 }}>{ex.rot}</div>
                <div style={{ fontSize: 13, color: "#9aa5b4", marginTop: 2 }}>{ex.fecha}</div>
              </div>
            </div>
            {ex.estado === "completado"
              ? <div style={{ textAlign: "right" }}><Badge text="Completado" color="#4caf82" /><div style={{ fontSize: 13, color: "#4caf82", fontWeight: 700, marginTop: 6 }}>{ex.puntaje}</div></div>
              : <button onClick={() => iniciarExamen(ex.rot)} style={{ background: "#4a9fd4", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Rendir →</button>
            }
          </div>
        ))}
      </div>
    </div>
  );

  // ── EXAMEN (consigna por consigna) ─────────────────────────────────────────
  if (paso === "examen") return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#0f2744", color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>🩺 ResidenciaMF · {examenActivo}</div>
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>Caso {casoIdx + 1} de {casos.length}</div>
        </div>
        <Avatar initials={usuario.avatar} size={32} color="#4a9fd4" />
      </div>

      {/* Barra progreso general */}
      <div style={{ background: "#1e4976", height: 3 }}>
        <div style={{ height: "100%", background: "#4a9fd4", width: `${(consignasHechas / totalConsignas) * 100}%`, transition: "width 0.3s ease" }} />
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 24px" }}>

        {/* Indicador de dominio actual */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18, overflowX: "auto", paddingBottom: 4 }}>
          {ORDEN_DOMINIOS.map((d, i) => {
            const esCurrent = d.key === consignaActual?.dominio;
            const esHecho = caso.consignas.findIndex(c => c.dominio === d.key) < consignaIdx;
            return (
              <div key={d.key} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: esCurrent ? d.color + "22" : "transparent",
                border: `1.5px solid ${esCurrent ? d.color : "#e2e8f0"}`,
                borderRadius: 20, padding: "5px 12px", flexShrink: 0,
                transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 13 }}>{esHecho ? "✓" : d.icon}</span>
                <span style={{ fontSize: 11, fontWeight: esCurrent ? 700 : 400, color: esCurrent ? d.color : "#9aa5b4" }}>{d.label}</span>
              </div>
            );
          })}
        </div>

        {/* Caso clínico — siempre visible */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", marginBottom: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Badge text={caso.rotacion} color="#4a9fd4" />
            <Badge text={`Caso ${casoIdx + 1}`} color="#6b7a8d" />
          </div>
          <div style={{ background: "#f0f6ff", border: "1px solid #c8dff5", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 11.5, color: "#2c5f8a", fontWeight: 500 }}>📋 Caso clínico</div>
          <p style={{ color: "#2d3748", lineHeight: 1.7, margin: 0, fontSize: 14.5 }}>{caso.enunciado}</p>
        </div>

        {/* Consigna actual */}
        <div style={{ background: dominioInfo.color + "14", border: `1.5px solid ${dominioInfo.color}40`, borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{dominioInfo.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: dominioInfo.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {dominioInfo.label}
            </span>
            <span style={{ fontSize: 11, color: "#9aa5b4", marginLeft: "auto" }}>
              {consignaIdx + 1} / {caso.consignas.length}
            </span>
          </div>
          <p style={{ color: "#1a2e44", fontSize: 15, lineHeight: 1.65, margin: 0, fontWeight: 500 }}>
            {consignaActual?.texto}
          </p>
        </div>

        {/* Respuesta */}
        <div style={{ background: "#fff", borderRadius: 14, padding: "20px 24px", marginBottom: 20, border: "1px solid #e2e8f0" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#9aa5b4", display: "block", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Tu respuesta
          </label>
          <textarea
            value={respuestas[respKey] || ""}
            onChange={e => setRespuestas({ ...respuestas, [respKey]: e.target.value })}
            placeholder={`Respondé sobre ${dominioInfo.label.toLowerCase()}...`}
            rows={6}
            style={{
              width: "100%", border: "1px solid #e2e8f0", borderRadius: 10,
              padding: "14px 16px", fontSize: 15, lineHeight: 1.6,
              resize: "vertical", outline: "none", color: "#2d3748",
              fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = dominioInfo.color}
            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
            autoFocus
          />
        </div>

        {/* Navegación */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={retroceder}
            disabled={esPrimero}
            style={{
              background: "none", border: "1px solid #e2e8f0", borderRadius: 10,
              padding: "12px 20px", fontSize: 14, fontFamily: "inherit",
              cursor: esPrimero ? "not-allowed" : "pointer",
              color: esPrimero ? "#c8d0da" : "#4a5568",
            }}
          >← Anterior</button>

          <div style={{ fontSize: 12, color: "#9aa5b4" }}>
            {consignasHechas + 1} / {totalConsignas} pasos
          </div>

          <button
            onClick={avanzar}
            style={{
              background: esUltimo ? "#2ecc71" : dominioInfo.color,
              color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 24px", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {esUltimo ? "Enviar examen ✓" : "Siguiente →"}
          </button>
        </div>
      </div>
    </div>
  );

  // ── CORRIGIENDO ────────────────────────────────────────────────────────────
  if (paso === "corrigiendo") return (
    <div style={{ minHeight: "100vh", background: "#0f2744", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>🤖</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>Corrigiendo con IA...</h2>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, margin: 0 }}>
          Estamos evaluando tus respuestas contra la lista de cotejo con {MODELOS_OPENROUTER.find((m) => m.value === modeloSeleccionado)?.label || modeloSeleccionado}
        </p>
        <div style={{ marginTop: 32, display: "flex", gap: 8, justifyContent: "center" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%", background: "#4a9fd4",
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }`}</style>
      </div>
    </div>
  );

  // ── RESULTADO ──
  if (paso === "resultado") {
    const pct = Math.round((puntajeTotal / puntajeMax) * 100);
    const aprobado = pct >= 60;
    return (
      <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        <div style={{ background: "#0f2744", color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>🩺 ResidenciaMF · Resultado</div>
          <button onClick={() => setPaso("lista")} style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}>
            Volver
          </button>
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px" }}>
          {/* Puntaje global */}
          <div style={{
            background: aprobado ? "linear-gradient(135deg, #1a6b4a, #2ecc71)" : "linear-gradient(135deg, #7a1f1f, #e05454)",
            borderRadius: 20, padding: "32px", marginBottom: 24, color: "#fff", textAlign: "center",
          }}>
            <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}>{puntajeTotal}/{puntajeMax}</div>
            <div style={{ fontSize: 18, opacity: 0.9, marginTop: 4 }}>{pct}% · {aprobado ? "✅ Aprobado" : "❌ Necesita refuerzo"}</div>
          </div>

          {/* Detalle por pregunta */}
          {casos.map((p) => {
            const res = resultados[p.id];
            if (!res) return null;
            return (
              <div key={p.id} style={{
                background: "#fff", borderRadius: 16, padding: "24px 28px",
                marginBottom: 16, border: "1px solid #e2e8f0",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                      <Badge text={p.rotacion} color={DOMINIO_COLOR[p.dominio] || "#6b7a8d"} />
                      <Badge text={p.dominio} color={DOMINIO_COLOR[p.dominio] || "#6b7a8d"} />
                    </div>
                    <p style={{ fontSize: 14, color: "#4a5568", margin: 0, lineHeight: 1.5 }}>{p.enunciado.slice(0, 100)}...</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: res.porcentaje >= 60 ? "#2ecc71" : "#e05454" }}>
                      {res.puntaje_total}/{res.puntaje_maximo}
                    </div>
                    <div style={{ fontSize: 12, color: "#9aa5b4" }}>{res.porcentaje}%</div>
                  </div>
                </div>

                {/* Items de cotejo */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {res.items?.map((item, i) => {
                    const icon = item.estado === "completo" ? "✅" : item.estado === "parcial" ? "⚠️" : "❌";
                    const color = item.estado === "completo" ? "#e8f9f0" : item.estado === "parcial" ? "#fff8e8" : "#fef0f0";
                    const borderColor = item.estado === "completo" ? "#b8e8d0" : item.estado === "parcial" ? "#f0d8a0" : "#f0b8b8";
                    return (
                      <div key={i} style={{ background: color, border: `1px solid ${borderColor}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ fontSize: 13, color: "#2d3748", flex: 1 }}>
                            {icon} <strong>Ítem {i + 1}</strong> — {item.descripcion || item.item}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#2d3748", marginLeft: 12, flexShrink: 0 }}>
                            {item.puntaje_obtenido}/{item.puntaje_maximo} pts
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7a8d", marginTop: 6, paddingLeft: 2 }}>
                          {item.fundamento}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Comentario IA */}
                {res.comentario_general && (
                  <div style={{ background: "#f0f6ff", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#2c5f8a", borderLeft: "3px solid #4a9fd4" }}>
                    💬 {res.comentario_general}
                  </div>
                )}
              </div>
            );
          })}

          <button onClick={() => setPaso("lista")} style={{
            background: "#0f2744", color: "#fff", border: "none",
            borderRadius: 12, padding: "14px 28px", fontSize: 15,
            fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 8,
          }}>Volver a mis exámenes</button>
        </div>
      </div>
    );
  }
}

// ── VISTA DOCENTE ────────────────────────────────────────────────────────────
function VistaDocente({ usuario, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [residenteSelec, setResidenteSelec] = useState(null);

  const dominiosGlobales = {};
  RESIDENTES_DASHBOARD.forEach(r => {
    Object.entries(r.dominios).forEach(([d, v]) => {
      if (!dominiosGlobales[d]) dominiosGlobales[d] = [];
      dominiosGlobales[d].push(v);
    });
  });
  const promediosDominios = Object.entries(dominiosGlobales).map(([d, vals]) => ({
    dominio: d,
    promedio: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
  })).sort((a, b) => a.promedio - b.promedio);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0f2744", color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🩺</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>ResidenciaMF</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>Panel docente</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar initials={usuario.avatar} size={34} color="#e07b54" />
          <button onClick={onLogout} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13 }}>Salir</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", display: "flex", gap: 0 }}>
        {[["dashboard", "📊 Dashboard"], ["residentes", "👥 Residentes"], ["banco", "📋 Banco de preguntas"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            background: "none", border: "none", borderBottom: tab === key ? "2px solid #4a9fd4" : "2px solid transparent",
            padding: "14px 20px", fontSize: 14, fontWeight: tab === key ? 600 : 400,
            color: tab === key ? "#4a9fd4" : "#6b7a8d", cursor: "pointer", transition: "all 0.2s",
          }}>{label}</button>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <>
            {/* Cards resumen */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Residentes activos", valor: 6, icon: "👥", color: "#4a9fd4" },
                { label: "Exámenes este mes", valor: 14, icon: "📝", color: "#e07b54" },
                { label: "Promedio cohorte", valor: "72%", icon: "📊", color: "#4caf82" },
              ].map(c => (
                <div key={c.label} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{c.valor}</div>
                  <div style={{ fontSize: 13, color: "#9aa5b4", marginTop: 4 }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Dominios más débiles */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 20, border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#1a2e44" }}>
                🎯 Dominios por promedio de cohorte
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {promediosDominios.map(({ dominio, promedio }) => (
                  <div key={dominio}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 14, color: "#4a5568" }}>{dominio}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: promedio >= 75 ? "#4caf82" : promedio >= 55 ? "#e8a838" : "#e05454" }}>
                        {promedio}%
                      </span>
                    </div>
                    <ProgressBar value={promedio} color={DOMINIO_COLOR[dominio]} height={10} />
                  </div>
                ))}
              </div>
            </div>

            {/* Alerta */}
            <div style={{
              background: "#fff8e8", border: "1px solid #f0d8a0", borderRadius: 16,
              padding: "18px 24px", display: "flex", gap: 14, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, color: "#8a5a00", marginBottom: 4 }}>Área de refuerzo detectada</div>
                <div style={{ fontSize: 14, color: "#6b4e00", lineHeight: 1.6 }}>
                  <strong>Terapéutica</strong> es el dominio más débil de la cohorte (promedio 63%). Se recomienda refuerzo en los R1 antes del examen de Pediatría. Lucas Fernández (55%) y Matías Córdoba (62%) son los más afectados.
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── RESIDENTES ── */}
        {tab === "residentes" && (
          <>
            {!residenteSelec
              ? RESIDENTES_DASHBOARD.map(r => (
                  <div key={r.nombre} onClick={() => setResidenteSelec(r)} style={{
                    background: "#fff", borderRadius: 16, padding: "20px 24px",
                    marginBottom: 12, border: "1px solid #e2e8f0", cursor: "pointer",
                    transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a9fd4"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(74,159,212,0.15)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                      <Avatar initials={r.avatar} size={44} color="#2c5f8a" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "#1a2e44", fontSize: 16 }}>{r.nombre}</div>
                        <div style={{ fontSize: 13, color: "#9aa5b4" }}>{r.año} · {r.examenes} exámenes · {r.ultimo}</div>
                      </div>
                      <span style={{ fontSize: 18, color: "#c8d0da" }}>→</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {Object.entries(r.dominios).slice(0, 3).map(([d, v]) => (
                        <div key={d} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 12, color: "#6b7a8d", width: 140, flexShrink: 0 }}>{d}</span>
                          <ProgressBar value={v} color={DOMINIO_COLOR[d]} height={6} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: v >= 75 ? "#4caf82" : v >= 55 ? "#e8a838" : "#e05454", width: 36, textAlign: "right" }}>{v}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              : (
                <div>
                  <button onClick={() => setResidenteSelec(null)} style={{
                    background: "none", border: "none", color: "#4a9fd4", cursor: "pointer",
                    fontSize: 14, fontWeight: 600, marginBottom: 20, padding: 0,
                  }}>← Volver a residentes</button>

                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                    <Avatar initials={residenteSelec.avatar} size={56} color="#2c5f8a" />
                    <div>
                      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1a2e44" }}>{residenteSelec.nombre}</h2>
                      <p style={{ margin: "4px 0 0", color: "#6b7a8d", fontSize: 14 }}>{residenteSelec.año} · {residenteSelec.examenes} exámenes rendidos</p>
                    </div>
                  </div>

                  <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", marginBottom: 16, border: "1px solid #e2e8f0" }}>
                    <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1a2e44" }}>Dominios evaluados</h3>
                    {Object.entries(residenteSelec.dominios).map(([d, v]) => (
                      <div key={d} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 14, color: "#4a5568" }}>{d}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: v >= 75 ? "#4caf82" : v >= 55 ? "#e8a838" : "#e05454" }}>{v}%</span>
                        </div>
                        <ProgressBar value={v} color={DOMINIO_COLOR[d]} height={10} />
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e2e8f0" }}>
                    <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700, color: "#1a2e44" }}>Por rotación</h3>
                    {Object.entries(residenteSelec.rotaciones).map(([rot, v]) => (
                      <div key={rot} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: 14, color: "#4a5568" }}>{rot}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: v >= 75 ? "#4caf82" : v >= 55 ? "#e8a838" : "#e05454" }}>{v}%</span>
                        </div>
                        <ProgressBar value={v} height={10} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
          </>
        )}

        {/* ── BANCO ── */}
        {tab === "banco" && (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              {["Todos", "R1", "R2", "R3"].map(f => (
                <button key={f} style={{
                  background: f === "Todos" ? "#4a9fd4" : "#fff", color: f === "Todos" ? "#fff" : "#4a5568",
                  border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 16px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>{f}</button>
              ))}
            </div>
            {BANCO.map(p => (
              <div key={p.id} style={{
                background: "#fff", borderRadius: 14, padding: "18px 22px",
                marginBottom: 10, border: "1px solid #e2e8f0",
              }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <Badge text={p.ano} color="#2c5f8a" />
                  <Badge text={p.rotacion} color={DOMINIO_COLOR[p.dominio] || "#6b7a8d"} />
                  <Badge text={p.tipo} color="#4a9fd4" />
                  <Badge text={p.dominio} color={DOMINIO_COLOR[p.dominio] || "#6b7a8d"} />
                  <Badge text={`${p.puntaje_total} pts · ${p.cotejo.length} ítems`} color="#6b7a8d" />
                </div>
                <p style={{ fontSize: 14, color: "#4a5568", margin: 0, lineHeight: 1.6 }}>
                  {p.enunciado.slice(0, 160)}{p.enunciado.length > 160 ? "..." : ""}
                </p>
              </div>
            ))}
            <div style={{
              background: "#f0f6ff", borderRadius: 14, padding: "16px 20px",
              border: "1px dashed #c8dff5", textAlign: "center", color: "#4a9fd4",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              + Ver las 247 preguntas del banco completo
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(null);

  if (!usuario) return <Login onLogin={(rol) => setUsuario(USUARIOS[rol])} />;
  if (usuario.rol === "residente") return <VistaResidente usuario={usuario} onLogout={() => setUsuario(null)} />;
  return <VistaDocente usuario={usuario} onLogout={() => setUsuario(null)} />;
}
