import { useMemo, useState } from "react";
import { supabase } from "../supabase";

const COLORS = {
  dark: "#003087",
  mid: "#0057B8",
  light: "#4DA8E0",
  bg: "#EBF4FB",
  bg2: "#D6EAF8",
  text: "#2C3E6B",
  muted: "#6A85A8",
  border: "rgba(0,48,135,0.12)",
  white: "#FFFFFF",
};

const DEMO_CODE = "DEMO2026";

const FEATURES = [
  {
    icon: "🧠",
    title: "Evaluación adaptativa",
    body: "El sistema identifica tus áreas débiles y ajusta la dificultad. Más práctica donde más la necesitás.",
  },
  {
    icon: "📋",
    title: "Casos clínicos reales",
    body: "Más de 400 casos del nivel primario de atención: crónicos, urgencias, pediatría, salud mental, mujer y familia.",
  },
  {
    icon: "📊",
    title: "Dashboard de progreso",
    body: "Grilla por competencias con acierto, racha, estado por tema y sugerencias de estudio priorizadas por IA.",
  },
  {
    icon: "💬",
    title: "Feedback clínico explicado",
    body: "Cada respuesta incorrecta tiene explicación desde la evidencia. No solo \"incorrecto\". Aprendés de cada error.",
  },
  {
    icon: "🎯",
    title: "Simulacro de examen",
    body: "Modo cronometrado con la estructura real del examen de ingreso a la Residencia de Medicina Familiar de Córdoba.",
  },
  {
    icon: "🩺",
    title: "Hecho por médicos para médicos",
    body: "ResidenciaMF fue diseñado por profesionales de Medicina Familiar que conocen de adentro el examen, el programa y la realidad del sistema de salud de Córdoba.",
  },
];

const DEMO_MESSAGES = [
  {
    role: "ai",
    sender: "Tutor ResidenciaMF",
    text: "¡Hola! Soy tu tutor de residencia de Medicina Familiar. Puedo ayudarte con casos clínicos, explicaciones de temas del examen y dudas sobre el programa en Córdoba.",
  },
];

export default function Home({ onNavigateLogin }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [demoUnlocked, setDemoUnlocked] = useState(false);
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [draft, setDraft] = useState("");

  const feedbackStyle = useMemo(() => {
    if (feedback.type === "error") {
      return {
        background: "rgba(214, 58, 74, 0.08)",
        color: "#A62A36",
        border: "1px solid rgba(214, 58, 74, 0.18)",
      };
    }
    return {
      background: COLORS.bg,
      color: COLORS.dark,
      border: "1px solid rgba(0,87,184,0.18)",
    };
  }, [feedback.type]);

  const sendMagicLink = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setFeedback({ type: "error", text: "Ingresá tu email" });
      return;
    }

    setSending(true);
    setFeedback({ type: "", text: "" });

    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        emailRedirectTo: "https://www.examenmedfam.online",
      },
    });

    if (error) {
      setFeedback({ type: "error", text: error.message });
      setSending(false);
      return;
    }

    setFeedback({
      type: "success",
      text: "¡Listo! Revisá tu casilla, te enviamos el link de acceso.",
    });
    setSending(false);
  };

  const unlockDemo = () => {
    if (accessCode.trim() === DEMO_CODE) {
      setDemoUnlocked(true);
      setAccessOpen(false);
      setAccessError("");
      setAccessCode("");
      return;
    }

    setAccessError("Código incorrecto. Solicitá tu acceso a priscila-gonzalez@live.com");
  };

  const sendDemoMessage = () => {
    if (!demoUnlocked || !draft.trim()) return;
    const userText = draft.trim();
    setMessages((current) => [
      ...current,
      { role: "user", sender: "Residente", text: userText },
      {
        role: "ai",
        sender: "Tutor ResidenciaMF",
        text:
          "Demo desbloqueada. Este espacio queda reservado para la demostración guiada del tutor IA. Si querés explorar el flujo real, ingresá con tu magic link y seguí al panel según tu rol.",
      },
    ]);
    setDraft("");
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.white, color: COLORS.text, fontFamily: "'Barlow', sans-serif" }}>
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: COLORS.white,
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          minHeight: 64,
        }}
      >
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: COLORS.mid,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 15,
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            R<br />MF
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: COLORS.dark }}>
              ResidenciaMF
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.04em" }}>
              Sistema de evaluación · Medicina Familiar
            </div>
          </div>
        </a>
        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
          <a href="#features" style={navLinkStyle}>Funcionalidades</a>
          <a href="#demo" style={navLinkStyle}>Demo IA</a>
          <button onClick={onNavigateLogin} style={{ ...navLinkStyle, background: "none", border: "none", cursor: "pointer" }}>
            Ingresar
          </button>
        </div>
      </nav>

      <section
        id="top"
        style={{
          background: `linear-gradient(160deg, ${COLORS.bg} 0%, ${COLORS.white} 55%)`,
          maxWidth: 1280,
          margin: "0 auto",
          padding: "72px 24px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(320px, 420px)",
          gap: 32,
        }}
      >
        <div style={{ paddingRight: 16 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.mid, marginBottom: 24 }}>
            <div style={{ width: 24, height: 2, background: COLORS.light }} />
            Residencia de Medicina Familiar · Córdoba
          </div>
          <h1
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "clamp(48px, 5.5vw, 72px)",
              fontWeight: 800,
              lineHeight: 1,
              color: COLORS.dark,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Tu tutor<br />
            <span style={{ color: COLORS.mid }}>de residencia</span><br />
            con IA
          </h1>
          <p style={{ fontSize: 20, fontWeight: 300, lineHeight: 1.5, marginBottom: 28 }}>
            Evaluación adaptativa. Feedback clínico. Siempre disponible.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: COLORS.muted, maxWidth: 440, marginBottom: 40 }}>
            Preparación inteligente para el examen de ingreso y el cursado de la Residencia de Medicina Familiar en Córdoba. Casos clínicos reales, explicaciones basadas en evidencia y seguimiento por área de competencia.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#demo" style={primaryButtonStyle}>Solicitar demostración</a>
            <a href="#features" style={secondaryButtonStyle}>Ver funcionalidades</a>
          </div>
        </div>

        <div
          style={{
            background: COLORS.white,
            borderRadius: 18,
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 4px 32px rgba(0,48,135,0.10)",
            padding: 32,
            alignSelf: "center",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 60, height: 60, borderRadius: 14, background: COLORS.mid, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 26 }}>
              🩺
            </div>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: COLORS.dark, textTransform: "uppercase", letterSpacing: "0.02em" }}>
              ResidenciaMF
            </h2>
            <p style={{ fontSize: 13, color: COLORS.muted, marginTop: 3 }}>
              Sistema de evaluación · Medicina Familiar
            </p>
          </div>

          <label style={labelStyle}>Email institucional</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tuemail@hospital.gov.ar"
            style={inputStyle}
          />

          <button onClick={sendMagicLink} disabled={sending} style={{ ...primaryButtonStyle, width: "100%", border: "none", opacity: sending ? 0.7 : 1 }}>
            {sending ? "Enviando..." : "Enviar link de acceso"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, color: COLORS.muted, fontSize: 12, margin: "12px 0" }}>
            <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            o
            <div style={{ flex: 1, height: 1, background: COLORS.border }} />
          </div>

          <button onClick={() => setAccessOpen(true)} style={{ ...secondaryButtonStyle, width: "100%", borderColor: COLORS.bg2 }}>
            Solicitar una demostración
          </button>

          {feedback.text ? (
            <div style={{ ...feedbackStyle, fontSize: 13, lineHeight: 1.5, marginTop: 12, borderRadius: 8, padding: "11px 13px" }}>
              {feedback.text}
            </div>
          ) : null}
        </div>
      </section>

      <section id="features" style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.mid, display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 24, height: 2, background: COLORS.light }} />
          Funcionalidades
        </div>
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(34px, 4vw, 48px)", fontWeight: 800, color: COLORS.dark, textTransform: "uppercase", lineHeight: 1, maxWidth: 540, marginBottom: 12 }}>
          Todo lo que<br />necesitás para<br />prepararte
        </h2>
        <p style={{ fontSize: 16, color: COLORS.muted, maxWidth: 500, lineHeight: 1.7, marginBottom: 52 }}>
          Diseñado específicamente para residentes de Medicina Familiar, con el curriculum del Ministerio de Salud de Córdoba.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {FEATURES.map((feature) => (
            <div key={feature.title} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 18, padding: "28px 24px", background: COLORS.white }}>
              <div style={{ width: 46, height: 46, borderRadius: 10, background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 18 }}>
                {feature.icon}
              </div>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.dark, textTransform: "uppercase", marginBottom: 8 }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6 }}>
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" style={{ background: COLORS.bg, padding: "80px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.mid, display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 24, height: 2, background: COLORS.light }} />
              Demo interactiva
              <div style={{ width: 24, height: 2, background: COLORS.light }} />
            </div>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "clamp(34px, 4vw, 48px)", fontWeight: 800, color: COLORS.dark, textTransform: "uppercase", lineHeight: 1, marginBottom: 12 }}>
              Hablá con<br />el tutor de IA
            </h2>
            <p style={{ fontSize: 16, color: COLORS.muted, maxWidth: 460, margin: "0 auto", lineHeight: 1.7 }}>
              Preguntá sobre clínica, pedí un caso, o consultá sobre el examen. Así funciona ResidenciaMF.
            </p>
          </div>

          {!demoUnlocked ? (
            <div style={{ maxWidth: 800, margin: "0 auto", background: COLORS.white, borderRadius: 20, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 40px rgba(0,48,135,0.10)", padding: "36px 32px", textAlign: "center" }}>
              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, color: COLORS.dark, textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 10 }}>
                Acceso restringido
              </h3>
              <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 20px" }}>
                La demostración del tutor de IA se habilita con un código de acceso. Si recibiste tu código, ingresalo para continuar.
              </p>
              <button onClick={() => setAccessOpen(true)} style={primaryButtonStyle}>
                Ingresar código de acceso
              </button>
            </div>
          ) : (
            <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 20, overflow: "hidden", maxWidth: 800, margin: "0 auto", boxShadow: "0 8px 40px rgba(0,48,135,0.10)" }}>
              <div style={{ background: COLORS.dark, display: "flex", alignItems: "center", gap: 12, padding: "16px 24px" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
                </div>
                <div style={{ flex: 1, textAlign: "center", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Tutor IA — ResidenciaMF
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", background: COLORS.light, color: "#fff", padding: "3px 10px", borderRadius: 999 }}>
                  Demo
                </span>
              </div>
              <div style={{ height: 440, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18, background: "#FAFCFF" }}>
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: message.role === "ai" ? COLORS.mid : COLORS.bg2, color: message.role === "ai" ? "#fff" : COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                      {message.role === "ai" ? "MF" : "Yo"}
                    </div>
                    <div style={{ flex: 1, background: message.role === "ai" ? COLORS.white : COLORS.dark, border: message.role === "ai" ? `1px solid ${COLORS.border}` : `1px solid ${COLORS.dark}`, color: message.role === "ai" ? COLORS.text : "#fff", borderRadius: 14, padding: "14px 16px", fontSize: 14, lineHeight: 1.65 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5, color: message.role === "ai" ? COLORS.mid : "rgba(255,255,255,0.6)" }}>
                        {message.sender}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{message.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, padding: "16px 20px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.white }}>
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && sendDemoMessage()}
                  placeholder="Escribí tu pregunta o pedí un caso clínico..."
                  style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                />
                <button onClick={sendDemoMessage} style={{ width: 44, height: 44, borderRadius: 8, background: COLORS.mid, color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}>
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {accessOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0, 26, 77, 0.48)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{ width: "min(100%, 420px)", background: COLORS.white, borderRadius: 18, border: `1px solid ${COLORS.border}`, boxShadow: "0 14px 48px rgba(0,48,135,0.18)", padding: "30px 26px 24px" }}>
            <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: COLORS.dark, textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 8 }}>
              Ingresar código
            </h3>
            <p style={{ fontSize: 14, color: COLORS.muted, lineHeight: 1.6, marginBottom: 18 }}>
              Ingresá tu código de acceso para habilitar la demo del tutor de IA.
            </p>
            <label style={labelStyle}>Código de acceso</label>
            <input
              type="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && unlockDemo()}
              placeholder="DEMO2026"
              style={inputStyle}
            />
            {accessError ? (
              <div style={{ background: "rgba(214, 58, 74, 0.08)", color: "#A62A36", border: "1px solid rgba(214, 58, 74, 0.18)", fontSize: 13, lineHeight: 1.5, marginTop: 12, borderRadius: 8, padding: "11px 13px" }}>
                {accessError}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setAccessOpen(false)} style={{ ...secondaryButtonStyle, flex: 1 }}>
                Cancelar
              </button>
              <button onClick={unlockDemo} style={{ ...primaryButtonStyle, flex: 1, border: "none" }}>
                Ingresar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <footer style={{ background: COLORS.dark, color: "rgba(255,255,255,0.65)", textAlign: "center", padding: "40px 24px", fontSize: 13, lineHeight: 1.9 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
          ResidenciaMF
        </div>
        Plataforma de preparación · Residencia de Medicina Familiar · Córdoba, Argentina
        <br />
        Prototipo 2026
        <br />
        <br />
        <small style={{ fontSize: 11, opacity: 0.45 }}>
          Esta plataforma es una herramienta de apoyo educativo independiente. No reemplaza la formación oficial de la residencia ni tiene vinculación institucional formal con el Ministerio de Salud de Córdoba.
        </small>
      </footer>
    </div>
  );
}

const navLinkStyle = {
  fontSize: 14,
  fontWeight: 500,
  color: COLORS.text,
  textDecoration: "none",
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: COLORS.muted,
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  border: `1.5px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: "12px 14px",
  fontFamily: "'Barlow', sans-serif",
  fontSize: 14,
  color: COLORS.dark,
  outline: "none",
  background: COLORS.white,
  marginBottom: 14,
};

const primaryButtonStyle = {
  background: COLORS.mid,
  color: COLORS.white,
  fontFamily: "'Barlow', sans-serif",
  fontSize: 15,
  fontWeight: 600,
  padding: "14px 28px",
  borderRadius: 8,
  border: "1px solid transparent",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
  textAlign: "center",
};

const secondaryButtonStyle = {
  background: "transparent",
  color: COLORS.mid,
  fontFamily: "'Barlow', sans-serif",
  fontSize: 15,
  fontWeight: 500,
  padding: "13px 24px",
  borderRadius: 8,
  border: `1.5px solid ${COLORS.mid}`,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
  textAlign: "center",
};
