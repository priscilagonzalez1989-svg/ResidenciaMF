import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const ROTATIONS = [
  { key: "medicina-familiar", label: "Medicina Familiar", bancoRotaciones: ["Medicina Familiar"] },
  { key: "ginecologia", label: "Ginecología", bancoRotaciones: ["Ginecología"] },
  { key: "paliativos", label: "Paliativos", bancoRotaciones: ["Cuidados Paliativos", "Paliativos"] },
  { key: "reumatologia", label: "Reumatología", bancoRotaciones: ["Reumatología"] },
];

function shuffle(items) {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function HeaderBadge({ text, color, background }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", color, background }}>
      {text}
    </span>
  );
}

function ProgressBar({ value, max = 100, color = "#4a9fd4", height = 8 }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ background: "#e8ecf0", borderRadius: 99, height, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
    </div>
  );
}

function parseChecklistItems(text) {
  return String(text || "")
    .split("<br>")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDomainProgress(questions, currentIndex) {
  return questions.map((question, index) => ({
    key: `${question.numero}-${index}`,
    dominio: question.dominio || "Integrador",
    done: index < currentIndex,
    current: index === currentIndex,
  }));
}

export default function PracticeMode({ user, onExit }) {
  const [rotationKey, setRotationKey] = useState(ROTATIONS[0].key);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [screen, setScreen] = useState("setup");
  const [currentText, setCurrentText] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 960);

  const currentQuestion = questions[currentIndex] || null;
  const domainProgress = useMemo(() => getDomainProgress(questions, currentIndex), [questions, currentIndex]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setCurrentText(currentQuestion ? answers[currentQuestion.numero] || "" : "");
  }, [currentQuestion, answers]);

  async function startPractice() {
    const rotation = ROTATIONS.find((item) => item.key === rotationKey);
    if (!rotation) return;

    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("banco_preguntas")
        .select("*")
        .in("rotacion", rotation.bancoRotaciones)
        .in("anio", ["R2", "R3"])
        .eq("activa", true);

      if (fetchError) throw fetchError;

      const selected = shuffle(data || []).slice(0, 6);
      if (selected.length < 6) {
        throw new Error(`No hay suficientes preguntas activas para ${rotation.label}.`);
      }

      setQuestions(selected);
      setAnswers({});
      setCurrentIndex(0);
      setCurrentText("");
      setScreen("exam");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function confirmAndNext() {
    if (!currentQuestion) return;
    const nextAnswers = { ...answers, [currentQuestion.numero]: currentText };
    setAnswers(nextAnswers);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((current) => current + 1);
      return;
    }
    setScreen("results");
  }

  function renderQuestionCard(question, index) {
    return (
      <div key={`${question.numero}-${index}`} style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e2e8f0", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <HeaderBadge text={question.rotacion} color="#0f2744" background="#eef4fb" />
          <HeaderBadge text={question.dominio} color="#164e63" background="#daf5fb" />
          <HeaderBadge text={`Pregunta ${index + 1}`} color="#6b4b00" background="#fff2cf" />
        </div>
        <div style={{ color: "#1a2e44", lineHeight: 1.7 }}>{question.enunciado}</div>
        <div style={{ color: "#4d6174", fontWeight: 700 }}>Tu respuesta</div>
        <div style={{ background: "#f8fbff", border: "1px solid #dfe7f1", borderRadius: 14, padding: 14, color: "#1a2e44", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {answers[question.numero] || "Sin respuesta cargada"}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#607284", marginBottom: 8 }}>Lista de cotejo</div>
          <div style={{ display: "grid", gap: 6 }}>
            {parseChecklistItems(question.lista_cotejo).map((item) => (
              <div key={item} style={{ color: "#506478", lineHeight: 1.6 }}>
                • {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "setup") {
    return (
      <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gap: 24 }}>
          <div style={{ background: "#0f2744", color: "#fff", borderRadius: 24, padding: "28px 30px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800 }}>Modo prueba</div>
                <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>
                  Probá la experiencia de examen sin contador, sin guardar resultados y sin corrección automática.
                </p>
              </div>
              <button onClick={onExit} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}>
                Salir del modo prueba
              </button>
            </div>
          </div>

          {error && (
            <div style={{ border: "1px solid #f3b7b7", background: "#fff3f3", color: "#8f2d2d", borderRadius: 16, padding: "14px 16px" }}>
              {error}
            </div>
          )}

          <div style={{ background: "#fff", border: "1px solid #dfe7f1", borderRadius: 24, padding: 28, display: "grid", gap: 18 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#0f2744" }}>Elegí una rotación</h1>
              <p style={{ margin: "10px 0 0", color: "#6c7d90" }}>
                Se seleccionarán 6 preguntas aleatorias activas de R2/R3.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              {ROTATIONS.map((rotation) => (
                <button
                  key={rotation.key}
                  onClick={() => setRotationKey(rotation.key)}
                  style={{
                    border: rotation.key === rotationKey ? "2px solid #4a9fd4" : "1px solid #d7e1ec",
                    background: rotation.key === rotationKey ? "#eef6fd" : "#fff",
                    color: "#0f2744",
                    borderRadius: 18,
                    padding: "18px 20px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {rotation.label}
                </button>
              ))}
            </div>

            <button
              onClick={startPractice}
              disabled={loading}
              style={{ justifySelf: "start", border: "none", background: "#4a9fd4", color: "#fff", borderRadius: 14, padding: "14px 18px", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}
            >
              {loading ? "Preparando..." : "Iniciar modo prueba"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "results") {
    return (
      <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: 24 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: 18 }}>
          <div style={{ background: "#0f2744", color: "#fff", borderRadius: 24, padding: "22px 24px", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Modo prueba finalizado</div>
              <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.72)" }}>
                Revisá tus respuestas junto con la lista de cotejo completa.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setScreen("setup")} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}>
                Nueva práctica
              </button>
              <button onClick={onExit} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}>
                Salir del modo prueba
              </button>
            </div>
          </div>

          {questions.map((question, index) => renderQuestionCard(question, index))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ background: "#0f2744", color: "#fff", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>🩺 ResidenciaMF · Modo prueba</div>
          <div style={{ opacity: 0.72, fontSize: 13, marginTop: 4 }}>{user?.email || "Docente"}</div>
        </div>
        <button onClick={onExit} style={{ border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}>
          Salir del modo prueba
        </button>
      </div>

      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: 24,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 320px",
          gap: 24,
          alignItems: "start",
        }}
      >
        {isMobile && (
          <aside style={{ background: "#fff", border: "1px solid #dfe7f1", borderRadius: 20, padding: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f2744", marginBottom: 12 }}>Progreso</div>
            <ProgressBar value={currentIndex} max={Math.max(questions.length - 1, 1)} color="#4a9fd4" />
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {domainProgress.map((item) => (
                <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, color: item.done ? "#1b7a53" : item.current ? "#0f2744" : "#7a8b9d", fontWeight: item.current ? 700 : 500 }}>
                  <span>{item.done ? "✓" : item.current ? "•" : "○"}</span>
                  <span>{item.dominio}</span>
                </div>
              ))}
            </div>
          </aside>
        )}

        <main style={{ background: "#fff", borderRadius: 20, border: "1px solid #dfe7f1", padding: 24, display: "grid", gap: 18 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HeaderBadge text={currentQuestion?.rotacion || "Rotación"} color="#0f2744" background="#eef4fb" />
            <HeaderBadge text={currentQuestion?.dominio || "Dominio"} color="#164e63" background="#daf5fb" />
          </div>

          <div style={{ borderTop: "1px solid #e8eef5", paddingTop: 18 }}>
            <div style={{ color: "#1a2e44", lineHeight: 1.75, fontSize: 15, whiteSpace: "pre-wrap" }}>
              {currentQuestion?.enunciado}
            </div>
            {currentQuestion?.imagen_url && (
              <img
                src={currentQuestion.imagen_url}
                alt={`Pregunta ${currentQuestion.numero}`}
                style={{ width: "100%", maxHeight: 320, objectFit: "contain", marginTop: 18, borderRadius: 16, border: "1px solid #dfe7f1", background: "#f8fbff" }}
              />
            )}
          </div>

          <div style={{ borderTop: "1px solid #e8eef5", paddingTop: 18, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f2744" }}>Tu respuesta</div>
            <textarea
              value={currentText}
              onChange={(event) => setCurrentText(event.target.value)}
              rows={8}
              style={{ width: "100%", resize: "vertical", borderRadius: 16, border: "1px solid #d7e1ec", padding: 16, fontSize: 15, lineHeight: 1.6, fontFamily: "inherit", color: "#1a2e44", background: "#fcfdff", minHeight: 180, outline: "none" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ color: "#6c7d90", fontSize: 14 }}>
              Pregunta {currentIndex + 1} de {questions.length}
            </span>
            <button
              onClick={confirmAndNext}
              disabled={!currentText.trim()}
              style={{ border: "none", background: !currentText.trim() ? "#cfd9e4" : "#4a9fd4", color: "#fff", borderRadius: 14, padding: "14px 18px", fontSize: 15, fontWeight: 700, cursor: !currentText.trim() ? "not-allowed" : "pointer" }}
            >
              {currentIndex < questions.length - 1 ? "Confirmar y siguiente →" : "Finalizar modo prueba"}
            </button>
          </div>
        </main>

        {!isMobile && (
          <aside style={{ position: "sticky", top: 24, background: "#fff", border: "1px solid #dfe7f1", borderRadius: 20, padding: 20, display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f2744", marginBottom: 10 }}>Progreso</div>
              <ProgressBar value={currentIndex} max={Math.max(questions.length - 1, 1)} color="#4a9fd4" />
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {domainProgress.map((item) => (
                <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, color: item.done ? "#1b7a53" : item.current ? "#0f2744" : "#7a8b9d", fontWeight: item.current ? 700 : 500 }}>
                  <span>{item.done ? "✓" : item.current ? "•" : "○"}</span>
                  <span>{item.dominio}</span>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
