import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const BASE_FILTERS = {
  anio: "Todos",
  activo: "Todos",
};

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 160 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#607284" }}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          height: 42,
          border: "1px solid #d7e1ec",
          borderRadius: 12,
          padding: "0 12px",
          background: "#fff",
          color: "#1a2e44",
          fontSize: 14,
          fontFamily: "inherit",
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ text, color, background }) {
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

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR");
}

function formatScore(value) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toFixed(2).replace(".00", "");
}

function ExamStatusBadge({ exam }) {
  if (exam.es_recuperatorio) {
    return (
      <StatusBadge
        text="Recuperatorio"
        color="#7c2d12"
        background="#ffedd5"
      />
    );
  }

  if (exam.aprobado === true) {
    return <StatusBadge text="Aprobado" color="#166534" background="#dcfce7" />;
  }

  if (exam.aprobado === false) {
    return (
      <StatusBadge
        text="Recuperatorio disponible"
        color="#8f2d2d"
        background="#fee2e2"
      />
    );
  }

  return <StatusBadge text={exam.estado} color="#0f2744" background="#eef4fb" />;
}

function ExamAnswerCard({ answer }) {
  return (
    <div
      style={{
        border: "1px solid #dfe7f1",
        borderRadius: 16,
        padding: 16,
        background: "#fff",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusBadge
          text={`Pregunta ${answer.pregunta_numero}`}
          color="#0f2744"
          background="#eef4fb"
        />
        {answer.dominio && (
          <StatusBadge
            text={answer.dominio}
            color="#164e63"
            background="#daf5fb"
          />
        )}
        <StatusBadge
          text={`Puntaje ${formatScore(answer.puntaje_obtenido)}/${formatScore(answer.puntaje_maximo)}`}
          color="#6b4e00"
          background="#fff8db"
        />
      </div>

      <Field label="Enunciado" value={answer.enunciado || "Sin enunciado disponible"} />
      <Field label="Respuesta" value={answer.respuesta_texto || "Sin respuesta"} />
      <Field label="Feedback IA" value={answer.feedback_ia || "Sin feedback disponible"} />
    </div>
  );
}

function ExamHistorySection({ examsLoading, examsError, examenes, expandedExamId, onToggleExam }) {
  if (examsLoading) {
    return (
      <div
        style={{
          border: "1px solid #dfe7f1",
          borderRadius: 18,
          padding: 18,
          background: "#f8fbff",
          color: "#607284",
        }}
      >
        Cargando exámenes rendidos...
      </div>
    );
  }

  if (examsError) {
    return (
      <div
        style={{
          border: "1px solid #f3b7b7",
          borderRadius: 18,
          padding: 18,
          background: "#fff3f3",
          color: "#8f2d2d",
        }}
      >
        No se pudo cargar el historial de exámenes: {examsError}
      </div>
    );
  }

  if (!examenes.length) {
    return (
      <div
        style={{
          border: "1px dashed #d7e1ec",
          borderRadius: 18,
          padding: "28px 22px",
          background: "#f8fbff",
          textAlign: "center",
          color: "#607284",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>📝</div>
        <strong style={{ display: "block", marginBottom: 8, color: "#1a2e44" }}>
          Todavía no hay exámenes rendidos
        </strong>
        Esta residente aún no registra intentos finalizados en la plataforma.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {examenes.map((exam) => {
        const isOpen = expandedExamId === exam.id;
        return (
          <div
            key={exam.id}
            style={{
              border: "1px solid #dfe7f1",
              borderRadius: 18,
              background: "#f8fbff",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => onToggleExam(exam.id)}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                padding: 18,
                textAlign: "left",
                cursor: "pointer",
                display: "grid",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f2744" }}>
                    {exam.rotacion}
                  </div>
                  <div style={{ fontSize: 13, color: "#607284", marginTop: 4 }}>
                    {formatDateTime(exam.finalizado_at || exam.created_at)}
                  </div>
                </div>
                <div style={{ color: "#607284", fontSize: 18 }}>{isOpen ? "▴" : "▾"}</div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ExamStatusBadge exam={exam} />
                <StatusBadge
                  text={`Puntaje ${formatScore(exam.puntaje_total)}`}
                  color="#0f2744"
                  background="#eef4fb"
                />
                {exam.tiempo_agotado && (
                  <StatusBadge text="Tiempo agotado" color="#8f2d2d" background="#fee2e2" />
                )}
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop: "1px solid #dfe7f1", background: "#fff", padding: 18, display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  <Field label="Estado" value={exam.estado} />
                  <Field label="Iniciado" value={formatDateTime(exam.iniciado_at)} />
                  <Field label="Finalizado" value={formatDateTime(exam.finalizado_at)} />
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f2744" }}>
                    Respuestas y devolución de IA
                  </div>
                  {exam.answers.length === 0 ? (
                    <div style={{ color: "#607284", fontSize: 14 }}>
                      Este examen no tiene respuestas registradas todavía.
                    </div>
                  ) : (
                    exam.answers.map((answer) => (
                      <ExamAnswerCard key={`${exam.id}-${answer.pregunta_numero}`} answer={answer} />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResidenteDetail({
  residente,
  onClose,
  examenes,
  examsLoading,
  examsError,
}) {
  if (!residente) return null;

  const [expandedExamId, setExpandedExamId] = useState(null);

  useEffect(() => {
    setExpandedExamId(examenes[0]?.id || null);
  }, [examenes, residente?.id]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,39,68,0.34)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 40,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          height: "100%",
          background: "#fff",
          boxShadow: "-24px 0 48px rgba(15,39,68,0.18)",
          padding: 28,
          overflowY: "auto",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <StatusBadge text={residente.anio} color="#164e63" background="#daf5fb" />
              <StatusBadge
                text={residente.activo ? "Activo" : "Inactivo"}
                color={residente.activo ? "#166534" : "#7f1d1d"}
                background={residente.activo ? "#dcfce7" : "#fee2e2"}
              />
            </div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#0f2744" }}>
              {residente.nombre} {residente.apellido}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #d7e1ec",
              background: "#fff",
              borderRadius: 12,
              padding: "10px 12px",
              cursor: "pointer",
              color: "#506478",
              fontWeight: 600,
            }}
          >
            Cerrar
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Nombre" value={residente.nombre} />
          <Field label="Apellido" value={residente.apellido} />
          <Field label="Email" value={residente.email} />
          <Field label="Año" value={residente.anio} />
          <Field label="Estado" value={residente.activo ? "Activo" : "Inactivo"} />
          <Field label="Fecha de alta" value={formatDateTime(residente.created_at)} />
          <Field label="User ID vinculado" value={residente.user_id || "Sin vincular"} />
        </div>

        <div style={{ marginTop: 24, display: "grid", gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f2744" }}>
            Exámenes rendidos
          </h3>
          <ExamHistorySection
            examsLoading={examsLoading}
            examsError={examsError}
            examenes={examenes}
            expandedExamId={expandedExamId}
            onToggleExam={(examId) =>
              setExpandedExamId((current) => (current === examId ? null : examId))
            }
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #dfe7f1",
        borderRadius: 16,
        padding: 16,
        background: "#f8fbff",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "#607284", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color: "#1a2e44", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

export default function ResidentesBoard({
  title = "Residentes",
  description = "Tablero de residentes en modo vista, conectado a Supabase.",
  initialSelectedResidente = null,
}) {
  const [filters, setFilters] = useState(BASE_FILTERS);
  const [residentes, setResidentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedResidente, setSelectedResidente] = useState(null);
  const [residentExams, setResidentExams] = useState([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examsError, setExamsError] = useState("");

  const options = useMemo(
    () => ({
      anio: ["Todos", "R1", "R2", "R3"],
      activo: ["Todos", "Activos", "Inactivos"],
    }),
    []
  );

  useEffect(() => {
    const fetchResidentes = async () => {
      setLoading(true);
      setError("");

      let query = supabase
        .from("residentes")
        .select("*")
        .order("apellido", { ascending: true })
        .order("nombre", { ascending: true });

      if (filters.anio !== "Todos") query = query.eq("anio", filters.anio);
      if (filters.activo === "Activos") query = query.eq("activo", true);
      if (filters.activo === "Inactivos") query = query.eq("activo", false);

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        setResidentes([]);
        setLoading(false);
        return;
      }

      setResidentes(data || []);
      setLoading(false);
    };

    fetchResidentes();
  }, [filters]);

  useEffect(() => {
    if (!initialSelectedResidente) return;
    setSelectedResidente(initialSelectedResidente);
  }, [initialSelectedResidente]);

  useEffect(() => {
    let active = true;

    const fetchResidentExams = async () => {
      if (!selectedResidente) {
        setResidentExams([]);
        setExamsError("");
        setExamsLoading(false);
        return;
      }

      setExamsLoading(true);
      setExamsError("");

      const { data: exams, error: examsFetchError } = await supabase
        .from("examenes")
        .select("*")
        .eq("residente_id", selectedResidente.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (examsFetchError) {
        setExamsError(examsFetchError.message);
        setResidentExams([]);
        setExamsLoading(false);
        return;
      }

      if (!exams?.length) {
        setResidentExams([]);
        setExamsLoading(false);
        return;
      }

      const examIds = exams.map((exam) => exam.id);
      const { data: respuestas, error: respuestasError } = await supabase
        .from("examenes_respuestas")
        .select("*")
        .in("examen_id", examIds)
        .order("respondida_at", { ascending: true });

      if (!active) return;

      if (respuestasError) {
        setExamsError(respuestasError.message);
        setResidentExams([]);
        setExamsLoading(false);
        return;
      }

      const questionNumbers = [...new Set((respuestas || []).map((item) => item.pregunta_numero))];
      let questionsMap = new Map();

      if (questionNumbers.length) {
        const { data: questions, error: questionsError } = await supabase
          .from("banco_preguntas")
          .select("numero, enunciado, dominio, puntaje_sugerido")
          .in("numero", questionNumbers);

        if (!active) return;

        if (questionsError) {
          setExamsError(questionsError.message);
          setResidentExams([]);
          setExamsLoading(false);
          return;
        }

        questionsMap = new Map((questions || []).map((question) => [question.numero, question]));
      }

      const answersByExam = (respuestas || []).reduce((acc, answer) => {
        const question = questionsMap.get(answer.pregunta_numero);
        if (!acc[answer.examen_id]) acc[answer.examen_id] = [];
        acc[answer.examen_id].push({
          ...answer,
          enunciado: question?.enunciado || "",
          dominio: question?.dominio || "",
          puntaje_maximo: question?.puntaje_sugerido || null,
        });
        return acc;
      }, {});

      const merged = exams.map((exam) => ({
        ...exam,
        answers: answersByExam[exam.id] || [],
      }));

      setResidentExams(merged);
      setExamsLoading(false);
    };

    fetchResidentExams();

    return () => {
      active = false;
    };
  }, [selectedResidente]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#0f2744" }}>
            {title}
          </h1>
          <p style={{ margin: "10px 0 0", color: "#6c7d90", fontSize: 15 }}>
            {description}
          </p>
        </div>
        <div
          style={{
            minWidth: 160,
            background: "#0f2744",
            color: "#fff",
            borderRadius: 20,
            padding: "16px 18px",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Residentes visibles</div>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>
            {loading ? "…" : residentes.length}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          padding: 18,
          borderRadius: 20,
          background: "#f8fbff",
          border: "1px solid #dfe7f1",
        }}
      >
        <FilterSelect
          label="Año"
          value={filters.anio}
          options={options.anio}
          onChange={(value) => handleFilterChange("anio", value)}
        />
        <FilterSelect
          label="Estado"
          value={filters.activo}
          options={options.activo}
          onChange={(value) => handleFilterChange("activo", value)}
        />
      </div>

      {error && (
        <div
          style={{
            border: "1px solid #f3b7b7",
            background: "#fff3f3",
            color: "#8f2d2d",
            borderRadius: 16,
            padding: "14px 16px",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          border: "1px solid #dfe7f1",
          borderRadius: 24,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1.1fr 1.2fr 0.6fr 0.8fr",
            gap: 12,
            padding: "14px 18px",
            background: "#f8fbff",
            borderBottom: "1px solid #e8eef5",
            fontSize: 12,
            fontWeight: 700,
            color: "#607284",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <div>Nombre</div>
          <div>Apellido</div>
          <div>Email</div>
          <div>Año</div>
          <div>Estado</div>
        </div>

        {loading ? (
          <div style={{ padding: 28, color: "#607284" }}>Cargando residentes...</div>
        ) : residentes.length === 0 ? (
          <div style={{ padding: 28, color: "#607284" }}>No hay residentes cargados para los filtros seleccionados.</div>
        ) : (
          residentes.map((residente) => (
            <button
              key={residente.id}
              onClick={() => setSelectedResidente(residente)}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "1.1fr 1.1fr 1.2fr 0.6fr 0.8fr",
                gap: 12,
                padding: "16px 18px",
                border: "none",
                borderBottom: "1px solid #edf2f7",
                background: "#fff",
                cursor: "pointer",
                textAlign: "left",
                alignItems: "center",
              }}
            >
              <div style={{ color: "#1a2e44", fontWeight: 700 }}>{residente.nombre}</div>
              <div style={{ color: "#4d6174" }}>{residente.apellido}</div>
              <div style={{ color: "#4d6174" }}>{residente.email}</div>
              <div style={{ color: "#4d6174", fontWeight: 700 }}>{residente.anio}</div>
              <div>
                <StatusBadge
                  text={residente.activo ? "Activo" : "Inactivo"}
                  color={residente.activo ? "#166534" : "#7f1d1d"}
                  background={residente.activo ? "#dcfce7" : "#fee2e2"}
                />
              </div>
            </button>
          ))
        )}
      </div>

      <ResidentDetailGate
        residente={selectedResidente}
        examenes={residentExams}
        examsLoading={examsLoading}
        examsError={examsError}
        onClose={() => setSelectedResidente(null)}
      />
    </div>
  );
}

function ResidentDetailGate({ residente, onClose, examenes, examsLoading, examsError }) {
  return (
    <ResidenteDetail
      residente={residente}
      onClose={onClose}
      examenes={examenes}
      examsLoading={examsLoading}
      examsError={examsError}
    />
  );
}
