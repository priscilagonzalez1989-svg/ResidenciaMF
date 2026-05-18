import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import AdminBancoPreguntas from "./admin/AdminBancoPreguntas";
import ExamenesPanel from "./admin/ExamenesPanel";
import AdminLayout from "./admin/AdminLayout";
import AdminPlaceholder from "./admin/AdminPlaceholder";
import ResidentesBoard from "./admin/ResidentesBoard";
import TableroPanel from "./admin/TableroPanel";
import PracticeMode from "./exams/PracticeMode";
import ResidentExamApp from "./exams/ResidentExamApp";

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

function getCurrentPathname() {
  return window.location.pathname || "/";
}

function isAdminPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isDocentePath(pathname) {
  return pathname === "/docente" || pathname.startsWith("/docente/");
}

function isResidentPath(pathname) {
  return pathname === "/mis-examenes";
}

function isPracticePath(pathname) {
  return pathname === "/modo-prueba";
}

function normalizePathname(pathname) {
  if (pathname === "/admin") return "/admin/dashboard";
  if (pathname === "/docente") return "/docente/dashboard";
  return pathname;
}

const ADMIN_NAV_ITEMS = [
  { path: "/admin/dashboard", label: "Tablero", icon: "📊" },
  { path: "/admin/banco-preguntas", label: "Banco de preguntas", icon: "📚" },
  { path: "/admin/examenes", label: "Exámenes", icon: "📝" },
  { path: "/admin/residentes", label: "Residentes", icon: "👥" },
];

const DOCENTE_NAV_ITEMS = [
  { path: "/docente/dashboard", label: "Tablero", icon: "📊" },
  { path: "/docente/residentes", label: "Residentes", icon: "👥" },
  { path: "/modo-prueba", label: "Modo prueba", icon: "🧪" },
];

function initialsFromName(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "US";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
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

function EmptyPanelState({ icon = "📭", title, description }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        border: "1px dashed #cfd9e4",
        padding: "44px 28px",
        minHeight: 320,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "#eef5fb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          marginBottom: 18,
        }}
      >
        {icon}
      </div>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f2744" }}>
        {title}
      </h3>
      <p style={{ margin: "10px 0 0", fontSize: 15, color: "#6c7d90", lineHeight: 1.6, maxWidth: 520 }}>
        {description}
      </p>
    </div>
  );
}

function PendingAuthorization({ onLogout }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f2744 0%, #1e4976 50%, #2c6fad 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 560,
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 24,
        padding: "44px 40px",
        textAlign: "center",
        color: "#fff",
      }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "linear-gradient(135deg, #4a9fd4, #2c6fad)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 34,
          margin: "0 auto 22px",
        }}>
          ⏳
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
          Tu cuenta está pendiente de autorización.
        </h1>
        <p style={{ margin: "14px 0 24px", fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.75)" }}>
          Comunicate con la coordinación del programa para obtener acceso.
        </p>
        <button
          onClick={onLogout}
          style={{
            border: "none",
            borderRadius: 12,
            padding: "14px 22px",
            background: "#fff",
            color: "#0f2744",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ── PANTALLA LOGIN ───────────────────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const enviarLink = async () => {
    const normalizado = email.trim().toLowerCase();
    if (!normalizado) {
      setError("Ingresá un email para recibir el link de acceso.");
      return;
    }

    setEnviando(true);
    setError("");
    setMensaje("");

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizado,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (otpError) {
      setError(otpError.message);
      setEnviando(false);
      return;
    }

    setMensaje(`Te enviamos un link de acceso a ${normalizado}. Revisá tu email para entrar.`);
    setEnviando(false);
  };

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

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tuemail@ejemplo.com"
              style={{
                width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.08)", color: "#fff", padding: "14px 16px",
                fontSize: 15, outline: "none",
              }}
            />

            <button
              onClick={enviarLink}
              disabled={enviando}
              style={{
                background: "#4a9fd4", color: "#fff", border: "none",
                borderRadius: 12, padding: "16px 24px", fontSize: 15, fontWeight: 600,
                cursor: enviando ? "wait" : "pointer", transition: "all 0.2s",
                opacity: enviando ? 0.7 : 1,
              }}
            >
              {enviando ? "Enviando..." : "Enviar link de acceso"}
            </button>

            {mensaje && (
              <div style={{
                background: "rgba(76, 175, 130, 0.15)", border: "1px solid rgba(76, 175, 130, 0.35)",
                borderRadius: 12, padding: "12px 14px", color: "#d7ffe7", fontSize: 13, lineHeight: 1.5,
              }}>
                {mensaje}
              </div>
            )}

            {error && (
              <div style={{
                background: "rgba(224, 84, 84, 0.16)", border: "1px solid rgba(224, 84, 84, 0.35)",
                borderRadius: 12, padding: "12px 14px", color: "#ffe1e1", fontSize: 13, lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}
          </div>
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Prototipo — Residencia de Medicina Familiar · Córdoba</p>
      </div>
    </div>
  );
}

function DocenteDashboard() {
  const [dashboard, setDashboard] = useState({
    loading: true,
    error: "",
    totalPreguntas: 0,
    activas: 0,
    poolGuardia: 0,
    guardiaActiva: 0,
    porAnio: [],
    porRotacion: [],
  });

  useEffect(() => {
    let active = true;

    const cargarDashboard = async () => {
      setDashboard((current) => ({ ...current, loading: true, error: "" }));

      const { data, error } = await supabase
        .from("banco_preguntas")
        .select("anio, rotacion, activa, pool_guardia, guardia_activa");

      if (!active) return;

      if (error) {
        setDashboard((current) => ({
          ...current,
          loading: false,
          error: error.message,
        }));
        return;
      }

      const questions = data || [];
      const porAnioMap = {};
      const porRotacionMap = {};

      questions.forEach((item) => {
        porAnioMap[item.anio] = (porAnioMap[item.anio] || 0) + 1;
        porRotacionMap[item.rotacion] = (porRotacionMap[item.rotacion] || 0) + 1;
      });

      const porAnio = ["R1", "R2", "R3"]
        .map((anio) => ({ anio, total: porAnioMap[anio] || 0 }))
        .filter((item) => item.total > 0);

      const porRotacion = Object.entries(porRotacionMap)
        .map(([rotacion, total]) => ({ rotacion, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);

      setDashboard({
        loading: false,
        error: "",
        totalPreguntas: questions.length,
        activas: questions.filter((item) => item.activa).length,
        poolGuardia: questions.filter((item) => item.pool_guardia).length,
        guardiaActiva: questions.filter((item) => item.guardia_activa).length,
        porAnio,
        porRotacion,
      });
    };

    cargarDashboard();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div style={{ display: "grid", gap: 20, padding: 28 }}>
      {dashboard.error && (
        <div style={{
          background: "#fff3f3", border: "1px solid #f0b8b8", borderRadius: 16,
          padding: "16px 20px", color: "#8f2d2d",
        }}>
          No se pudo cargar el resumen docente: {dashboard.error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { label: "Preguntas totales", valor: dashboard.totalPreguntas, icon: "📚", color: "#4a9fd4" },
          { label: "Preguntas activas", valor: dashboard.activas, icon: "✅", color: "#4caf82" },
          { label: "Pool guardia", valor: dashboard.poolGuardia, icon: "🚑", color: "#e07b54" },
          { label: "Guardia activa", valor: dashboard.guardiaActiva, icon: "🟠", color: "#9b6dcc" },
        ].map((card) => (
          <div key={card.label} style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>
              {dashboard.loading ? "…" : card.valor}
            </div>
            <div style={{ fontSize: 13, color: "#9aa5b4", marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 20 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#1a2e44" }}>
            Distribución por año
          </h3>
          {dashboard.loading ? (
            <div style={{ color: "#6c7d90" }}>Cargando distribución…</div>
          ) : dashboard.porAnio.length === 0 ? (
            <div style={{ color: "#6c7d90" }}>Todavía no hay preguntas cargadas por año.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {dashboard.porAnio.map(({ anio, total }) => (
                <div key={anio}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, color: "#4a5568" }}>{anio}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2e44" }}>{total}</span>
                  </div>
                  <ProgressBar value={total} max={dashboard.totalPreguntas || 1} color="#4a9fd4" height={10} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#1a2e44" }}>
            Rotaciones con más preguntas
          </h3>
          {dashboard.loading ? (
            <div style={{ color: "#6c7d90" }}>Cargando rotaciones…</div>
          ) : dashboard.porRotacion.length === 0 ? (
            <div style={{ color: "#6c7d90" }}>Todavía no hay rotaciones disponibles en el banco.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dashboard.porRotacion.map(({ rotacion, total }) => (
                <div key={rotacion} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                  <span style={{ fontSize: 14, color: "#4a5568" }}>{rotacion}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2e44" }}>{total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [pathname, setPathname] = useState(() =>
    normalizePathname(getCurrentPathname())
  );
  const [residentFocus, setResidentFocus] = useState(null);

  useEffect(() => {
    const construirUsuario = (supabaseUser) => {
      const normalizado = (supabaseUser?.email || "").trim().toLowerCase();
      if (!normalizado) return null;

      const role = supabaseUser?.app_metadata?.role || null;
      const displayName =
        supabaseUser?.user_metadata?.nombre ||
        supabaseUser?.user_metadata?.full_name ||
        normalizado;

      return {
        nombre: displayName,
        rol: role || "pendiente",
        avatar: initialsFromName(displayName),
        email: normalizado,
      };
    };

    const hidratarSesion = async () => {
      const { data } = await supabase.auth.getSession();
      const supabaseUser = data.session?.user || null;
      setUsuario(construirUsuario(supabaseUser));
      setCargandoSesion(false);
    };

    hidratarSesion();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const supabaseUser = session?.user || null;
      setUsuario(construirUsuario(supabaseUser));
      setCargandoSesion(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const syncPathname = () => setPathname(normalizePathname(getCurrentPathname()));
    window.addEventListener("popstate", syncPathname);
    return () => window.removeEventListener("popstate", syncPathname);
  }, []);

  useEffect(() => {
    if (getCurrentPathname() === pathname) return;
    window.history.replaceState({}, "", pathname);
  }, [pathname]);

  useEffect(() => {
    if (cargandoSesion) return;

    if (!usuario) {
      if (pathname !== "/login") setPathname("/login");
      return;
    }

    if (usuario.rol === "admin") {
      if (pathname === "/" || pathname === "/login" || isDocentePath(pathname) || isResidentPath(pathname) || pathname === "/pendiente-autorizacion") {
        setPathname("/admin/dashboard");
      }
      return;
    }

    if (usuario.rol === "docente") {
      if (pathname === "/" || pathname === "/login" || isAdminPath(pathname) || isResidentPath(pathname) || pathname === "/pendiente-autorizacion") {
        setPathname("/docente/dashboard");
      }
      return;
    }

    if (usuario.rol === "residente") {
      if (pathname !== "/mis-examenes") {
        setPathname("/mis-examenes");
      }
      return;
    }

    if (usuario.rol === "pendiente") {
      if (pathname !== "/pendiente-autorizacion") {
        setPathname("/pendiente-autorizacion");
      }
      return;
    }
  }, [cargandoSesion, pathname, usuario]);

  const navigate = (nextPath) => {
    const normalized = normalizePathname(nextPath);
    window.history.pushState({}, "", normalized);
    setPathname(normalized);
  };

  const openResidentFromDashboard = (residente) => {
    setResidentFocus(residente);
    if (usuario?.rol === "admin") {
      navigate("/admin/residentes");
    } else if (usuario?.rol === "docente") {
      navigate("/docente/residentes");
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setResidentFocus(null);
    navigate("/login");
  };

  const renderAdminSection = () => {
    if (pathname === "/modo-prueba") {
      return <PracticeMode user={usuario} onExit={() => navigate("/admin/dashboard")} />;
    }

    const adminPath = normalizePathname(pathname);

    let content = null;

    if (adminPath === "/admin/dashboard") {
      content = <TableroPanel onOpenResident={openResidentFromDashboard} />;
    } else if (adminPath === "/admin/banco-preguntas") {
      content = <AdminBancoPreguntas />;
    } else if (adminPath === "/admin/examenes") {
      content = <ExamenesPanel />;
    } else if (adminPath === "/admin/residentes") {
      content = (
        <ResidentesBoard
          initialSelectedResidente={residentFocus}
        />
      );
    } else {
      content = <TableroPanel onOpenResident={openResidentFromDashboard} />;
    }

    return (
      <AdminLayout
        pathname={adminPath}
        onNavigate={navigate}
        onLogout={cerrarSesion}
        userEmail={usuario?.email}
        navItems={ADMIN_NAV_ITEMS}
        heading="Admin"
        subtitle="ResidenciaMF"
        sessionLabel="Sesión admin"
        modeBadge="Modo admin"
      >
        {content}
      </AdminLayout>
    );
  };

  const renderDocenteSection = () => {
    const docentePath = normalizePathname(pathname);

    let content = null;

    if (docentePath === "/modo-prueba") {
      return <PracticeMode user={usuario} onExit={() => navigate("/docente/dashboard")} />;
    }

    if (docentePath === "/docente/residentes") {
      content = (
        <ResidentesBoard
          title="Residentes"
          description="Vista académica de residentes en modo lectura. No se habilitan ediciones desde el perfil docente."
          initialSelectedResidente={residentFocus}
        />
      );
    } else {
      content = <TableroPanel onOpenResident={openResidentFromDashboard} readOnlyLabel="Modo lectura" />;
    }

    return (
      <AdminLayout
        pathname={docentePath}
        onNavigate={navigate}
        onLogout={cerrarSesion}
        userEmail={usuario?.email}
        navItems={DOCENTE_NAV_ITEMS}
        heading="Docente"
        subtitle="ResidenciaMF"
        sessionLabel="Sesión docente"
        modeBadge="Modo docente"
      >
        {content}
      </AdminLayout>
    );
  };

  if (cargandoSesion) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #0f2744 0%, #1e4976 50%, #2c6fad 100%)", color: "#fff",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🩺</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Cargando sesión...</div>
        </div>
      </div>
    );
  }

  if (!usuario) return <Login />;
  if (usuario.rol === "pendiente") return <PendingAuthorization onLogout={cerrarSesion} />;
  if (usuario.rol === "admin") return renderAdminSection();
  if (usuario.rol === "docente") return renderDocenteSection();
  if (usuario.rol === "residente") return <ResidentExamApp user={usuario} onLogout={cerrarSesion} />;
  return <PendingAuthorization onLogout={cerrarSesion} />;
}
