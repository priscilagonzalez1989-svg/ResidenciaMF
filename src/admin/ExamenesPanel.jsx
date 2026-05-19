import { useEffect, useMemo, useState } from "react";
import {
  examStateKey,
  examStateLabel,
  formatDateTime,
  formatScore,
  loadExamDataset,
} from "./examData";

const DEFAULT_FILTERS = {
  rotacion: "Todas",
  residente: "Todas",
  estado: "Todos",
  fecha: "",
};

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

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
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

function DomainBreakdown({ rows }) {
  if (!rows.length) return null;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((row) => (
        <div key={row.dominio} style={{ background: "#f8fbff", border: "1px solid #e6eef7", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#4d6174", fontSize: 13 }}>{row.dominio}</span>
            <span style={{ color: "#0f2744", fontSize: 13, fontWeight: 700 }}>
              {formatScore(row.obtenido)}/{formatScore(row.maximo)} · {row.porcentaje}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExamDetailModal({ exam, onClose }) {
  if (!exam) return null;

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
          width: "min(720px, 100%)",
          height: "100%",
          background: "#fff",
          boxShadow: "-24px 0 48px rgba(15,39,68,0.18)",
          padding: 28,
          overflowY: "auto",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 22 }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <StatusBadge text={exam.rotacion} color="#0f2744" background="#eef4fb" />
              <StatusBadge text={examStateLabel(exam)} color="#6b4e00" background="#fff2cf" />
              {exam.es_recuperatorio && <StatusBadge text="Recuperatorio" color="#7c2d12" background="#ffedd5" />}
            </div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#0f2744" }}>
              {exam.residente?.nombre} {exam.residente?.apellido}
            </h2>
            <p style={{ margin: "10px 0 0", color: "#6c7d90", fontSize: 14 }}>
              {formatDateTime(exam.finalizado_at || exam.created_at)} · Puntaje {formatScore(exam.puntaje_total)} / {formatScore(exam.totalMax)} ({exam.percentage}%)
            </p>
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

        <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            <Field label="Estado" value={examStateLabel(exam)} />
            <Field label="Iniciado" value={formatDateTime(exam.iniciado_at)} />
            <Field label="Finalizado" value={formatDateTime(exam.finalizado_at)} />
          </div>
          <Field label="Desglose por dominio" value={<DomainBreakdown rows={exam.domainBreakdown} />} />
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {exam.questionDetails.map((question) => (
            <div key={`${exam.id}-${question.pregunta_numero}`} style={{ border: "1px solid #dfe7f1", borderRadius: 18, padding: 18, background: "#f8fbff", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatusBadge text={`Pregunta ${question.orden}`} color="#0f2744" background="#eef4fb" />
                <StatusBadge text={question.dominio} color="#164e63" background="#daf5fb" />
                {question.es_adicional && <StatusBadge text="Adicional" color="#7c2d12" background="#ffedd5" />}
                <StatusBadge text={`Puntaje ${formatScore(question.puntaje_obtenido)}/${formatScore(question.puntaje_maximo)}`} color="#6b4e00" background="#fff8db" />
              </div>
              <Field label="Enunciado" value={question.enunciado || "Sin enunciado"} />
              <Field label="Respuesta de la residente" value={question.respuesta_texto || "Sin respuesta"} />
              <Field label="Feedback IA" value={question.feedback_ia || "Sin feedback"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={{ border: "1px solid #dfe7f1", borderRadius: 16, padding: 16, background: "#fff" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#607284", marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#1a2e44", lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ background: "#fff", borderRadius: 24, border: "1px dashed #cfd9e4", padding: "48px 28px", minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
      <strong style={{ color: "#0f2744", fontSize: 20 }}>Aún no hay exámenes registrados</strong>
      <p style={{ color: "#6c7d90", fontSize: 15, lineHeight: 1.6, maxWidth: 520 }}>
        Cuando las residentes empiecen a rendir, acá vas a poder ver cada examen, sus respuestas y la devolución de la IA.
      </p>
    </div>
  );
}

export default function ExamenesPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataset, setDataset] = useState({ exams: [], residents: [] });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const next = await loadExamDataset();
        if (!active) return;
        setDataset(next);
      } catch (err) {
        if (!active) return;
        setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, []);

  const options = useMemo(() => {
    const rotations = [...new Set(dataset.exams.map((exam) => exam.rotacion).filter(Boolean))].sort();
    const residents = [...new Set(dataset.exams.map((exam) => exam.residente?.id).filter(Boolean))]
      .map((id) => dataset.exams.find((exam) => exam.residente?.id === id)?.residente)
      .filter(Boolean)
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));

    return {
      rotacion: ["Todas", ...rotations],
      residente: ["Todas", ...residents.map((item) => `${item.apellido}, ${item.nombre}`)],
      estado: ["Todos", "aprobado", "recuperatorio", "en_curso"],
    };
  }, [dataset.exams]);

  const filteredExams = useMemo(() => {
    return dataset.exams.filter((exam) => {
      if (filters.rotacion !== "Todas" && exam.rotacion !== filters.rotacion) return false;
      if (
        filters.residente !== "Todas" &&
        `${exam.residente?.apellido}, ${exam.residente?.nombre}` !== filters.residente
      ) {
        return false;
      }
      if (filters.estado !== "Todos" && examStateKey(exam) !== filters.estado) return false;
      if (filters.fecha) {
        const examDate = new Date(exam.finalizado_at || exam.created_at).toISOString().slice(0, 10);
        if (examDate !== filters.fecha) return false;
      }
      return true;
    });
  }, [dataset.exams, filters]);

  return (
    <div style={{ display: "grid", gap: 24, padding: isMobile ? 16 : 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#0f2744" }}>Exámenes</h1>
          <p style={{ margin: "10px 0 0", color: "#6c7d90", fontSize: 15 }}>
            Historial consolidado de evaluaciones rendidas por las residentes.
          </p>
        </div>
        <div style={{ minWidth: 180, background: "#0f2744", color: "#fff", borderRadius: 20, padding: "16px 18px" }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Exámenes filtrados</div>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{loading ? "…" : filteredExams.length}</div>
        </div>
      </div>

      {isMobile && (
        <button
          onClick={() => setShowFilters(true)}
          style={{
            minHeight: 48,
            borderRadius: 14,
            border: "1px solid #d7e1ec",
            background: "#fff",
            color: "#1a2e44",
            fontSize: 16,
            fontWeight: 700,
            padding: "12px 16px",
            cursor: "pointer",
            justifySelf: "start",
          }}
        >
          Filtrar
        </button>
      )}

      {error && (
        <div style={{ border: "1px solid #f3b7b7", background: "#fff3f3", color: "#8f2d2d", borderRadius: 16, padding: "14px 16px" }}>
          No se pudo cargar la sección de exámenes: {error}
        </div>
      )}

      {(!isMobile || showFilters) && (
        <div
          style={
            isMobile
              ? {
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15,39,68,0.34)",
                  zIndex: 40,
                  padding: 16,
                  display: "flex",
                  justifyContent: "flex-end",
                }
              : {}
          }
          onClick={isMobile ? () => setShowFilters(false) : undefined}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              padding: 18,
              borderRadius: 20,
              background: "#f8fbff",
              border: "1px solid #dfe7f1",
              width: isMobile ? "min(420px, 100%)" : "auto",
              maxHeight: isMobile ? "calc(100vh - 32px)" : "none",
              overflowY: isMobile ? "auto" : "visible",
              boxShadow: isMobile ? "0 16px 40px rgba(15,39,68,0.16)" : "none",
            }}
            onClick={isMobile ? (event) => event.stopPropagation() : undefined}
          >
            {isMobile && (
              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "#0f2744", fontSize: 18 }}>Filtros</strong>
                <button
                  onClick={() => setShowFilters(false)}
                  style={{ border: "none", background: "transparent", color: "#39516b", fontSize: 16, cursor: "pointer" }}
                >
                  Cerrar
                </button>
              </div>
            )}
        <FilterSelect label="Rotación" value={filters.rotacion} options={options.rotacion} onChange={(value) => setFilters((current) => ({ ...current, rotacion: value }))} />
        <FilterSelect label="Residente" value={filters.residente} options={options.residente} onChange={(value) => setFilters((current) => ({ ...current, residente: value }))} />
        <FilterSelect label="Estado" value={filters.estado} options={options.estado} onChange={(value) => setFilters((current) => ({ ...current, estado: value }))} />
        <label style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#607284" }}>Fecha</span>
          <input
            type="date"
            value={filters.fecha}
            onChange={(event) => setFilters((current) => ({ ...current, fecha: event.target.value }))}
            style={{ height: 42, border: "1px solid #d7e1ec", borderRadius: 12, padding: "0 12px", background: "#fff", color: "#1a2e44", fontSize: 14, fontFamily: "inherit" }}
          />
        </label>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#607284" }}>Cargando exámenes...</div>
      ) : !dataset.exams.length ? (
        <EmptyState />
      ) : !filteredExams.length ? (
        <div style={{ color: "#607284" }}>No hay exámenes para los filtros seleccionados.</div>
      ) : (
        isMobile ? (
          <div style={{ display: "grid", gap: 14 }}>
            {filteredExams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => setSelectedExam(exam)}
                style={{
                  width: "100%",
                  border: "1px solid #dfe7f1",
                  borderRadius: 18,
                  background: "#fff",
                  padding: 16,
                  display: "grid",
                  gap: 10,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f2744" }}>
                  {exam.residente?.nombre} {exam.residente?.apellido}
                </div>
                <div style={{ color: "#4d6174", fontSize: 16 }}>{exam.rotacion}</div>
                <div style={{ color: "#4d6174", fontSize: 14 }}>{formatDateTime(exam.finalizado_at || exam.created_at)}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <StatusBadge text={`Puntaje ${formatScore(exam.puntaje_total)}`} color="#0f2744" background="#eef4fb" />
                  <StatusBadge text={`${exam.percentage}%`} color="#164e63" background="#daf5fb" />
                  <StatusBadge text={examStateLabel(exam)} color="#0f2744" background="#eef4fb" />
                </div>
              </button>
            ))}
          </div>
        ) : (
        <div style={{ border: "1px solid #dfe7f1", borderRadius: 24, overflowX: "auto", background: "#fff" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 0.9fr 0.8fr 0.8fr 0.9fr", gap: 12, padding: "14px 18px", background: "#f8fbff", borderBottom: "1px solid #e8eef5", fontSize: 12, fontWeight: 700, color: "#607284", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            <div>Residente</div>
            <div>Rotación</div>
            <div>Fecha</div>
            <div>Puntaje</div>
            <div>%</div>
            <div>Estado</div>
          </div>
          {filteredExams.map((exam) => (
            <button
              key={exam.id}
              onClick={() => setSelectedExam(exam)}
              style={{ width: "100%", display: "grid", gridTemplateColumns: "1.1fr 1fr 0.9fr 0.8fr 0.8fr 0.9fr", gap: 12, padding: "16px 18px", border: "none", borderBottom: "1px solid #edf2f7", background: "#fff", cursor: "pointer", textAlign: "left", alignItems: "center" }}
            >
              <div style={{ color: "#1a2e44", fontWeight: 700 }}>
                {exam.residente?.nombre} {exam.residente?.apellido}
              </div>
              <div style={{ color: "#4d6174" }}>{exam.rotacion}</div>
              <div style={{ color: "#4d6174" }}>{formatDateTime(exam.finalizado_at || exam.created_at)}</div>
              <div style={{ color: "#4d6174", fontWeight: 700 }}>{formatScore(exam.puntaje_total)}</div>
              <div style={{ color: "#4d6174", fontWeight: 700 }}>{exam.percentage}%</div>
              <div>
                <StatusBadge text={examStateLabel(exam)} color="#0f2744" background="#eef4fb" />
              </div>
            </button>
          ))}
        </div>
        )
      )}

      <ExamDetailModal exam={selectedExam} onClose={() => setSelectedExam(null)} />
    </div>
  );
}
