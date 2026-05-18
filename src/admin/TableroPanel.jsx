import { useEffect, useMemo, useState } from "react";
import {
  buildResidentSummaries,
  examStateKey,
  formatScore,
  loadExamDataset,
} from "./examData";

function ProgressBar({ value, max = 100, color = "#4a9fd4", height = 10 }) {
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

function SummaryCard({ title, value, detail, icon, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: 18, padding: "22px 24px", border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: "#607284", marginTop: 4 }}>{title}</div>
      {detail && <div style={{ fontSize: 12, color: "#8fa1b3", marginTop: 8 }}>{detail}</div>}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 24,
        border: "1px dashed #cfd9e4",
        padding: "48px 28px",
        minHeight: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
      <strong style={{ color: "#0f2744", fontSize: 20 }}>Aún no hay exámenes registrados</strong>
      <p style={{ color: "#6c7d90", fontSize: 15, lineHeight: 1.6, maxWidth: 520 }}>
        Cuando las residentes comiencen a rendir, acá vas a ver el resumen general y el rendimiento por dominio.
      </p>
    </div>
  );
}

export default function TableroPanel({ onOpenResident, readOnlyLabel = null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataset, setDataset] = useState({ exams: [], residents: [] });

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

  const completedExams = useMemo(
    () => dataset.exams.filter((exam) => exam.estado !== "en_curso"),
    [dataset.exams]
  );

  const approvalRate = useMemo(() => {
    if (!completedExams.length) return 0;
    const approved = completedExams.filter((exam) => exam.aprobado === true).length;
    return Math.round((approved / completedExams.length) * 100);
  }, [completedExams]);

  const lowestRotation = useMemo(() => {
    const grouped = completedExams.reduce((acc, exam) => {
      if (!acc[exam.rotacion]) acc[exam.rotacion] = [];
      acc[exam.rotacion].push(exam.percentage || 0);
      return acc;
    }, {});

    const rows = Object.entries(grouped).map(([rotacion, values]) => ({
      rotacion,
      promedio: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    }));

    rows.sort((a, b) => a.promedio - b.promedio);
    return rows[0] || null;
  }, [completedExams]);

  const residentSummaries = useMemo(() => buildResidentSummaries(dataset.exams), [dataset.exams]);

  return (
    <div style={{ display: "grid", gap: 24, padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#0f2744" }}>Tablero</h1>
          <p style={{ margin: "10px 0 0", color: "#6c7d90", fontSize: 15 }}>
            Resumen académico del rendimiento global y por residente.
          </p>
        </div>
        {readOnlyLabel && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "8px 12px",
              background: "#eef4fb",
              color: "#0f2744",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {readOnlyLabel}
          </div>
        )}
      </div>

      {error && (
        <div style={{ border: "1px solid #f3b7b7", background: "#fff3f3", color: "#8f2d2d", borderRadius: 16, padding: "14px 16px" }}>
          No se pudo cargar el tablero: {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: "#607284" }}>Cargando tablero...</div>
      ) : !completedExams.length ? (
        <EmptyState />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
            <SummaryCard
              title="Exámenes rendidos"
              value={completedExams.length}
              icon="📝"
              color="#4a9fd4"
            />
            <SummaryCard
              title="% aprobación global"
              value={`${approvalRate}%`}
              icon="✅"
              color={approvalRate >= 50 ? "#1b7a53" : "#c05656"}
            />
            <SummaryCard
              title="Rotación con menor rendimiento"
              value={lowestRotation?.rotacion || "—"}
              detail={lowestRotation ? `Promedio ${lowestRotation.promedio}%` : null}
              icon="📉"
              color="#e07b54"
            />
          </div>

          <div style={{ background: "#fff", borderRadius: 24, border: "1px solid #dfe7f1", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #edf2f7" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f2744" }}>Rendimiento por residente</h2>
            </div>

            <div style={{ display: "grid", gap: 0 }}>
              {residentSummaries.map((summary) => (
                <div key={summary.residente?.id || summary.residente?.email} style={{ padding: "18px 24px", borderBottom: "1px solid #edf2f7" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#0f2744" }}>
                        {summary.residente?.nombre} {summary.residente?.apellido}
                      </div>
                      <div style={{ fontSize: 13, color: "#607284", marginTop: 4 }}>
                        {summary.residente?.anio || "—"} · {summary.totalExams} exámenes · último puntaje {formatScore(summary.lastScore)} ({summary.lastPercentage}%)
                      </div>
                    </div>
                    {onOpenResident && (
                      <button
                        onClick={() => onOpenResident(summary.residente)}
                        style={{
                          border: "1px solid #d7e1ec",
                          background: "#fff",
                          color: "#39516b",
                          borderRadius: 12,
                          padding: "10px 14px",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Ver detalle
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
                    {summary.domainPercentages.map((item) => (
                      <div key={`${summary.residente?.id}-${item.dominio}`} style={{ background: "#f8fbff", border: "1px solid #e6eef7", borderRadius: 16, padding: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 13, color: "#4d6174" }}>{item.dominio}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f2744" }}>{item.porcentaje}%</span>
                        </div>
                        <ProgressBar value={item.porcentaje} max={100} color={item.porcentaje >= 70 ? "#4caf82" : item.porcentaje >= 50 ? "#e8a838" : "#e05454"} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
