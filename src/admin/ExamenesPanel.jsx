import { useEffect, useMemo, useState } from "react";
import {
  examStateKey,
  examStateLabel,
  formatDateTime,
  formatScore,
  loadExamDataset,
} from "./examData";
import {
  buildRecoveryPreview,
  createCardiologyTemplate,
  createRecoveryTemplate,
  fetchCardiologyTemplates,
  fetchR2ActiveResidentCount,
  fetchTemplateAssignments,
  setTemplateActive,
} from "../exams/cardiologyExamTemplates";
import {
  buildPediatriaRecoveryPreview,
  createPediatriaRecoveryTemplate,
  createPediatriaTemplate,
  fetchPediatriaTemplates,
} from "../exams/pediatricsExamTemplates";

const DEFAULT_FILTERS = {
  rotacion: "Todas",
  residente: "Todas",
  estado: "Todos",
  fecha: "",
};

const DEFAULT_TEMPLATE_FORM = {
  titulo: "",
  fechaInicio: "",
  fechaFin: "",
  hasImagen: false,
};

const DEFAULT_PEDIATRIA_TEMPLATE_FORM = {
  titulo: "",
  fechaInicio: "",
  fechaFin: "",
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

function Field({ label, value }) {
  return (
    <div style={{ border: "1px solid #dfe7f1", borderRadius: 16, padding: 16, background: "#fff" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#607284", marginBottom: 6 }}>{label}</div>
      <div style={{ color: "#1a2e44", lineHeight: 1.6 }}>{value}</div>
    </div>
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

function EmptyTemplatesState({ message }) {
  return (
    <div style={{ border: "1px dashed #cfd9e4", borderRadius: 18, background: "#fff", padding: "28px 24px", textAlign: "center", color: "#607284" }}>
      {message}
    </div>
  );
}

function getTemplateSectionKey(template) {
  if (template?.seccion === "Cardiologia") return "cardiologia";
  if (template?.rotacion === "Pediatría") return "pediatria";
  return "cardiologia";
}

function getTemplateHeading(template) {
  if (getTemplateSectionKey(template) === "pediatria") {
    return template?.titulo || "Pediatría R2";
  }
  return template?.titulo || "Cardiología R2";
}

function getTemplateBadgeLabel(template) {
  if (getTemplateSectionKey(template) === "pediatria") return "Pediatría";
  return "Cardiología";
}

function canCreateRecovery(template) {
  if (!template?.activo) return true;
  if (!template?.fecha_fin) return false;
  return new Date(template.fecha_fin).getTime() < Date.now();
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
            <div key={`${exam.id}-${question.pregunta_numero}-${question.subpregunta_indice || 0}`} style={{ border: "1px solid #dfe7f1", borderRadius: 18, padding: 18, background: "#f8fbff", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <StatusBadge text={`Pregunta ${question.orden}`} color="#0f2744" background="#eef4fb" />
                {question.subpregunta_texto && <StatusBadge text={`Sub ${String.fromCharCode(97 + Number(question.subpregunta_indice || 0))})`} color="#506478" background="#f4f7fb" />}
                <StatusBadge text={question.dominio} color="#164e63" background="#daf5fb" />
                {question.es_adicional && <StatusBadge text="Adicional" color="#7c2d12" background="#ffedd5" />}
                <StatusBadge text={`Puntaje ${formatScore(question.puntaje_obtenido)}/${formatScore(question.puntaje_maximo)}`} color="#6b4e00" background="#fff8db" />
              </div>
              <Field label="Enunciado" value={question.enunciado || "Sin enunciado"} />
              {question.subpregunta_texto ? <Field label="Sub-pregunta" value={question.subpregunta_texto} /> : null}
              <Field label="Respuesta de la residente" value={question.respuesta_texto || "Sin respuesta"} />
              <Field label="Feedback IA" value={question.feedback_ia || "Sin feedback"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TemplateDetailModal({ template, onClose, onActivate, onDeactivate, onPreviewRecovery, readOnly, busyId }) {
  if (!template) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,39,68,0.34)", display: "flex", justifyContent: "flex-end", zIndex: 50 }} onClick={onClose}>
      <div
        style={{ width: "min(760px, 100%)", height: "100%", background: "#fff", boxShadow: "-24px 0 48px rgba(15,39,68,0.18)", padding: 28, overflowY: "auto" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <StatusBadge text={getTemplateBadgeLabel(template)} color="#0f2744" background="#eef4fb" />
              <StatusBadge text={template.activo ? "Activo" : "Inactivo"} color={template.activo ? "#166534" : "#7c2d12"} background={template.activo ? "#dcfce7" : "#ffedd5"} />
              {template.examen_padre_id ? <StatusBadge text="Recuperatorio" color="#6b4e00" background="#fff2cf" /> : null}
              {template.has_imagen ? <StatusBadge text="Incluye imágenes" color="#164e63" background="#daf5fb" /> : null}
            </div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#0f2744" }}>{getTemplateHeading(template)}</h2>
            <p style={{ margin: "8px 0 0", color: "#6c7d90", fontSize: 14 }}>
              Año habilitado: {(template.anio_habilitado || []).join(", ") || "R2"} · Inicio {formatDateTime(template.fecha_inicio)} · Cierre {formatDateTime(template.fecha_fin)}
            </p>
          </div>
          <button onClick={onClose} style={{ border: "1px solid #d7e1ec", background: "#fff", borderRadius: 12, padding: "10px 12px", cursor: "pointer", color: "#506478", fontWeight: 600 }}>
            Cerrar
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 20 }}>
          <Field label="Visible para residentes" value={String(template.visibleAssignments?.length || 0)} />
          <Field label="Reservas ocultas" value={String(template.reserveAssignments?.length || 0)} />
          <Field label="Creado" value={formatDateTime(template.created_at)} />
          <Field label="Estado interno" value={template.estado || "plantilla"} />
        </div>

        {!readOnly && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            <button
              onClick={() => (template.activo ? onDeactivate(template) : onActivate(template))}
              disabled={busyId === template.id}
              style={{ minHeight: 46, border: "none", borderRadius: 12, background: template.activo ? "#fff1f2" : "#0f2744", color: template.activo ? "#9f1239" : "#fff", padding: "0 18px", fontWeight: 700, cursor: "pointer" }}
            >
              {busyId === template.id ? "Actualizando..." : template.activo ? "Desactivar" : "Activar para R2"}
            </button>
            {canCreateRecovery(template) ? (
              <button
                onClick={() => onPreviewRecovery(template)}
                disabled={busyId === template.id}
                style={{ minHeight: 46, border: "1px solid #d7e1ec", borderRadius: 12, background: "#fff", color: "#1a2e44", padding: "0 18px", fontWeight: 700, cursor: "pointer" }}
              >
                Crear recuperatorio
              </button>
            ) : null}
          </div>
        )}

        <div style={{ border: "1px solid #dfe7f1", borderRadius: 18, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "0.55fr 0.7fr 0.8fr 0.8fr 0.65fr 0.8fr", gap: 12, padding: "14px 16px", background: "#f8fbff", borderBottom: "1px solid #e8eef5", fontSize: 12, fontWeight: 700, color: "#607284", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <div>Orden</div>
            <div>Número</div>
            <div>Dominio</div>
            <div>Tipo</div>
            <div>Año</div>
            <div>Reserva</div>
          </div>
          {(template.assignments || []).map((row) => (
            <div key={`${template.id}-${row.orden}-${row.pregunta_numero}`} style={{ display: "grid", gridTemplateColumns: "0.55fr 0.7fr 0.8fr 0.8fr 0.65fr 0.8fr", gap: 12, padding: "14px 16px", borderBottom: "1px solid #edf2f7", background: "#fff", alignItems: "center" }}>
              <div style={{ color: "#1a2e44", fontWeight: 700 }}>{row.orden}</div>
              <div style={{ color: "#4d6174" }}>{row.pregunta_numero}</div>
              <div style={{ color: "#4d6174" }}>{row.dominio}</div>
              <div style={{ color: "#4d6174" }}>{row.tipo}</div>
              <div style={{ color: "#4d6174" }}>{row.anio}</div>
              <div>{row.es_recuperatorio ? <StatusBadge text="Oculta" color="#7c2d12" background="#ffedd5" /> : <StatusBadge text="Visible" color="#166534" background="#dcfce7" />}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecoveryPreviewModal({ preview, onClose, onConfirm, creating }) {
  if (!preview) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,39,68,0.34)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }} onClick={onClose}>
      <div style={{ width: "min(920px, 100%)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: 24, padding: 24, boxShadow: "0 30px 60px rgba(15,39,68,0.18)" }} onClick={(event) => event.stopPropagation()}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f2744" }}>Preview del recuperatorio</h2>
        <p style={{ margin: "10px 0 18px", color: "#6c7d90", fontSize: 14 }}>
          Se mantienen las integradoras fijas, se incorpora la reserva del examen original y se deja una nueva reserva oculta para una eventual segunda instancia.
        </p>
        <div style={{ display: "grid", gap: 12 }}>
          {preview.visibleAssignments.map((row) => (
            <div key={`visible-${row.orden}-${row.pregunta_numero}`} style={{ border: "1px solid #dfe7f1", borderRadius: 16, background: "#f8fbff", padding: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <StatusBadge text={`Orden ${row.orden}`} color="#0f2744" background="#eef4fb" />
                <StatusBadge text={`N° ${row.pregunta_numero || row.numero}`} color="#164e63" background="#daf5fb" />
                <StatusBadge text={row.dominio} color="#6b4e00" background="#fff2cf" />
              </div>
              <div style={{ color: "#1a2e44", lineHeight: 1.6 }}>{String(row.enunciado || "").slice(0, 240) || "Pregunta sin enunciado visible."}</div>
            </div>
          ))}
          <div style={{ border: "1px dashed #f0d8a0", borderRadius: 16, background: "#fff8e8", padding: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <StatusBadge text="Reserva oculta" color="#7c2d12" background="#ffedd5" />
              <StatusBadge text={`N° ${preview.hiddenReserve.pregunta_numero || preview.hiddenReserve.numero}`} color="#164e63" background="#daf5fb" />
              <StatusBadge text={preview.hiddenReserve.dominio} color="#6b4e00" background="#fff2cf" />
            </div>
            <div style={{ color: "#1a2e44", lineHeight: 1.6 }}>{String(preview.hiddenReserve.enunciado || "").slice(0, 240)}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ minHeight: 46, border: "1px solid #d7e1ec", borderRadius: 12, background: "#fff", color: "#1a2e44", padding: "0 18px", fontWeight: 700, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={creating} style={{ minHeight: 46, border: "none", borderRadius: 12, background: "#0f2744", color: "#fff", padding: "0 18px", fontWeight: 700, cursor: "pointer", opacity: creating ? 0.7 : 1 }}>
            {creating ? "Guardando..." : "Confirmar y guardar recuperatorio"}
          </button>
        </div>
      </div>
    </div>
  );
}

function hydrateTemplates(rawTemplates, assignmentsByTemplate) {
  return rawTemplates.map((template) => {
    const assignments = assignmentsByTemplate[template.id] || [];
    const visibleAssignments = assignments.filter((item) => !item.es_recuperatorio).sort((a, b) => a.orden - b.orden);
    const reserveAssignments = assignments.filter((item) => item.es_recuperatorio).sort((a, b) => a.orden - b.orden);
    return {
      ...template,
      assignments,
      visibleAssignments,
      reserveAssignments,
    };
  });
}

async function loadTemplateCollections() {
  const [cardiologyRaw, pediatriaRaw] = await Promise.all([
    fetchCardiologyTemplates(),
    fetchPediatriaTemplates(),
  ]);

  const allTemplates = [...cardiologyRaw, ...pediatriaRaw];
  const assignmentsEntries = await Promise.all(
    allTemplates.map(async (template) => [template.id, await fetchTemplateAssignments(template.id)])
  );
  const assignmentsByTemplate = Object.fromEntries(assignmentsEntries);

  return {
    cardiologia: hydrateTemplates(cardiologyRaw, assignmentsByTemplate),
    pediatria: hydrateTemplates(pediatriaRaw, assignmentsByTemplate),
  };
}

export default function ExamenesPanel({ user }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dataset, setDataset] = useState({ exams: [], residents: [] });
  const [cardiologyTemplates, setCardiologyTemplates] = useState([]);
  const [pediatriaTemplates, setPediatriaTemplates] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [recoveryPreview, setRecoveryPreview] = useState(null);
  const [templateForm, setTemplateForm] = useState(DEFAULT_TEMPLATE_FORM);
  const [pediatriaTemplateForm, setPediatriaTemplateForm] = useState(DEFAULT_PEDIATRIA_TEMPLATE_FORM);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [showFilters, setShowFilters] = useState(false);
  const [templateBusyId, setTemplateBusyId] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [creatingRecovery, setCreatingRecovery] = useState(false);

  const isAdmin = user?.rol === "admin";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const refreshData = async () => {
    const [nextDataset, nextTemplateCollections] = await Promise.all([
      loadExamDataset(),
      loadTemplateCollections(),
    ]);
    setDataset(nextDataset);
    setCardiologyTemplates(nextTemplateCollections.cardiologia);
    setPediatriaTemplates(nextTemplateCollections.pediatria);
  };

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [nextDataset, nextTemplateCollections] = await Promise.all([
          loadExamDataset(),
          loadTemplateCollections(),
        ]);
        if (!active) return;
        setDataset(nextDataset);
        setCardiologyTemplates(nextTemplateCollections.cardiologia);
        setPediatriaTemplates(nextTemplateCollections.pediatria);
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
      if (filters.residente !== "Todas" && `${exam.residente?.apellido}, ${exam.residente?.nombre}` !== filters.residente) return false;
      if (filters.estado !== "Todos" && examStateKey(exam) !== filters.estado) return false;
      if (filters.fecha) {
        const examDate = new Date(exam.finalizado_at || exam.created_at).toISOString().slice(0, 10);
        if (examDate !== filters.fecha) return false;
      }
      return true;
    });
  }, [dataset.exams, filters]);

  const handleCreateTemplate = async (sectionKey) => {
    setCreatingTemplate(true);
    setError("");
    setNotice("");
    try {
      const isPediatria = sectionKey === "pediatria";
      const currentForm = isPediatria ? pediatriaTemplateForm : templateForm;
      const created = isPediatria
        ? await createPediatriaTemplate({
            userId: user?.id || null,
            titulo: currentForm.titulo,
            fechaInicio: currentForm.fechaInicio ? new Date(currentForm.fechaInicio).toISOString() : null,
            fechaFin: currentForm.fechaFin ? new Date(currentForm.fechaFin).toISOString() : null,
          })
        : await createCardiologyTemplate({
            userId: user?.id || null,
            titulo: currentForm.titulo,
            fechaInicio: currentForm.fechaInicio ? new Date(currentForm.fechaInicio).toISOString() : null,
            fechaFin: currentForm.fechaFin ? new Date(currentForm.fechaFin).toISOString() : null,
            hasImagen: currentForm.hasImagen,
          });
      await refreshData();
      setSelectedTemplate(created);
      if (isPediatria) {
        setPediatriaTemplateForm(DEFAULT_PEDIATRIA_TEMPLATE_FORM);
        setNotice("Se creó la plantilla de Pediatría R2 con 2 integradoras fijas, 3 visibles aleatorias y 1 reserva oculta.");
      } else {
        setTemplateForm(DEFAULT_TEMPLATE_FORM);
        setNotice("Se creó la plantilla de Cardiología R2 con 2 integradoras fijas, 3 visibles aleatorias y 1 reserva oculta.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleToggleTemplate = async (template, active) => {
    setTemplateBusyId(template.id);
    setError("");
    setNotice("");
    try {
      await setTemplateActive(template.id, active);
      const residentCount = active ? await fetchR2ActiveResidentCount() : 0;
      await refreshData();
      setSelectedTemplate(null);
      setNotice(
        active
          ? `Plantilla activada para ${residentCount} residente${residentCount === 1 ? "" : "s"} R2 activos.`
          : "La plantilla quedó desactivada y ya no se ofrecerá a las residentes."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setTemplateBusyId("");
    }
  };

  const handlePreviewRecovery = async (template) => {
    setTemplateBusyId(template.id);
    setError("");
    setNotice("");
    try {
      const preview =
        getTemplateSectionKey(template) === "pediatria"
          ? await buildPediatriaRecoveryPreview(template)
          : await buildRecoveryPreview(template);
      setRecoveryPreview(preview);
    } catch (err) {
      setError(err.message);
    } finally {
      setTemplateBusyId("");
    }
  };

  const handleCreateRecovery = async () => {
    if (!recoveryPreview) return;
    setCreatingRecovery(true);
    setError("");
    setNotice("");
    try {
      const isPediatria = getTemplateSectionKey(recoveryPreview.sourceTemplate) === "pediatria";
      const created = isPediatria
        ? await createPediatriaRecoveryTemplate({
            originalTemplateId: recoveryPreview.sourceTemplate.id,
            preview: recoveryPreview,
            userId: user?.id || null,
          })
        : await createRecoveryTemplate({
            originalTemplateId: recoveryPreview.sourceTemplate.id,
            preview: recoveryPreview,
            userId: user?.id || null,
          });
      await refreshData();
      setRecoveryPreview(null);
      setSelectedTemplate(created);
      setNotice(
        isPediatria
          ? "Recuperatorio de Pediatría creado y guardado como nueva plantilla inactiva para revisión."
          : "Recuperatorio creado y guardado como nueva plantilla inactiva para revisión."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingRecovery(false);
    }
  };

  const totalTemplates = cardiologyTemplates.length + pediatriaTemplates.length;
  const templateSections = [
    {
      key: "cardiologia",
      icon: "🫀",
      title: "Cardiología R2",
      description: "Cada plantilla fija las preguntas 257 y 258, suma tres preguntas visibles aleatorias y deja una reserva oculta para recuperatorio.",
      templates: cardiologyTemplates,
      emptyMessage: "Todavía no hay plantillas de Cardiología R2 creadas.",
      form: templateForm,
      setForm: setTemplateForm,
      placeholder: "Cardiología R2 · junio 2026",
      allowHasImagen: true,
    },
    {
      key: "pediatria",
      icon: "👶",
      title: "Pediatría R2",
      description: "Cada plantilla fija las preguntas 259 y 260, suma tres preguntas visibles aleatorias del pool R2 no integrador y deja una reserva oculta para recuperatorio.",
      templates: pediatriaTemplates,
      emptyMessage: "Todavía no hay plantillas de Pediatría R2 creadas.",
      form: pediatriaTemplateForm,
      setForm: setPediatriaTemplateForm,
      placeholder: "Pediatría R2 · junio 2026",
      allowHasImagen: false,
    },
  ];

  return (
    <div style={{ display: "grid", gap: 24, padding: isMobile ? 16 : 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#0f2744" }}>Exámenes</h1>
          <p style={{ margin: "10px 0 0", color: "#6c7d90", fontSize: 15 }}>
            Gestión de plantillas programadas de Cardiología R2 y Pediatría R2, con recuperatorios y seguimiento del historial rendido por residentes.
          </p>
        </div>
        <div style={{ minWidth: 180, background: "#0f2744", color: "#fff", borderRadius: 20, padding: "16px 18px" }}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Exámenes filtrados</div>
          <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{loading ? "…" : filteredExams.length}</div>
        </div>
      </div>

      {notice && (
        <div style={{ border: "1px solid #b7e4c7", background: "#effcf4", color: "#166534", borderRadius: 16, padding: "14px 16px" }}>
          {notice}
        </div>
      )}

      {error && (
        <div style={{ border: "1px solid #f3b7b7", background: "#fff3f3", color: "#8f2d2d", borderRadius: 16, padding: "14px 16px" }}>
          {error}
        </div>
      )}

      <section style={{ background: "#fff", borderRadius: 24, border: "1px solid #dfe7f1", padding: isMobile ? 18 : 24, display: "grid", gap: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f2744" }}>Exámenes programados R2</h2>
            <p style={{ margin: "8px 0 0", color: "#6c7d90", fontSize: 14, lineHeight: 1.6, maxWidth: 760 }}>
              Gestión de plantillas de Cardiología R2 y Pediatría R2 con recuperatorios y seguimiento del historial rendido por residentes.
            </p>
          </div>
          <StatusBadge text={`${totalTemplates} plantilla${totalTemplates === 1 ? "" : "s"}`} color="#0f2744" background="#eef4fb" />
        </div>

        {templateSections.map((section) => (
          <div key={section.key} style={{ display: "grid", gap: 20, borderTop: "1px solid #edf2f7", paddingTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f2744" }}>
                  {section.icon} {section.title}
                </h3>
                <p style={{ margin: "8px 0 0", color: "#6c7d90", fontSize: 14, lineHeight: 1.6, maxWidth: 760 }}>
                  {section.description}
                </p>
              </div>
              <StatusBadge text={`${section.templates.length} plantilla${section.templates.length === 1 ? "" : "s"}`} color="#0f2744" background="#eef4fb" />
            </div>

            {isAdmin && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : section.allowHasImagen ? "2fr 1fr 1fr auto" : "2fr 1fr 1fr auto", gap: 12, alignItems: "end", background: "#f8fbff", border: "1px solid #dfe7f1", borderRadius: 18, padding: 16 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#607284" }}>Título</span>
                  <input
                    value={section.form.titulo}
                    onChange={(event) => section.setForm((current) => ({ ...current, titulo: event.target.value }))}
                    placeholder={section.placeholder}
                    style={{ height: 44, border: "1px solid #d7e1ec", borderRadius: 12, padding: "0 12px", fontSize: 14, fontFamily: "inherit" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#607284" }}>Disponible desde</span>
                  <input
                    type="datetime-local"
                    value={section.form.fechaInicio}
                    onChange={(event) => section.setForm((current) => ({ ...current, fechaInicio: event.target.value }))}
                    style={{ height: 44, border: "1px solid #d7e1ec", borderRadius: 12, padding: "0 12px", fontSize: 14, fontFamily: "inherit" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#607284" }}>Disponible hasta</span>
                  <input
                    type="datetime-local"
                    value={section.form.fechaFin}
                    onChange={(event) => section.setForm((current) => ({ ...current, fechaFin: event.target.value }))}
                    style={{ height: 44, border: "1px solid #d7e1ec", borderRadius: 12, padding: "0 12px", fontSize: 14, fontFamily: "inherit" }}
                  />
                </label>
                <div style={{ display: "grid", gap: 10 }}>
                  {section.allowHasImagen ? (
                    <label style={{ display: "flex", alignItems: "center", gap: 10, color: "#1a2e44", fontSize: 14, fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={section.form.hasImagen}
                        onChange={(event) => section.setForm((current) => ({ ...current, hasImagen: event.target.checked }))}
                      />
                      Permitir preguntas con imagen
                    </label>
                  ) : (
                    <div style={{ minHeight: 22, fontSize: 13, color: "#607284" }}>Sin filtro de imágenes para este examen.</div>
                  )}
                  <button
                    onClick={() => handleCreateTemplate(section.key)}
                    disabled={creatingTemplate}
                    style={{ minHeight: 46, border: "none", borderRadius: 12, background: "#0f2744", color: "#fff", padding: "0 18px", fontWeight: 700, cursor: "pointer", opacity: creatingTemplate ? 0.7 : 1 }}
                  >
                    {creatingTemplate ? "Creando..." : "Crear examen"}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ color: "#607284" }}>Cargando plantillas...</div>
            ) : section.templates.length === 0 ? (
              <EmptyTemplatesState message={section.emptyMessage} />
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {section.templates.map((template) => (
                  <div key={template.id} style={{ border: "1px solid #dfe7f1", borderRadius: 18, background: "#fff", padding: isMobile ? 16 : 20, display: "grid", gap: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                          <StatusBadge text={template.activo ? "Activo" : "Inactivo"} color={template.activo ? "#166534" : "#7c2d12"} background={template.activo ? "#dcfce7" : "#ffedd5"} />
                          {template.examen_padre_id ? <StatusBadge text="Recuperatorio" color="#6b4e00" background="#fff2cf" /> : null}
                          {template.has_imagen ? <StatusBadge text="Con imagen" color="#164e63" background="#daf5fb" /> : null}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#0f2744" }}>{getTemplateHeading(template)}</div>
                        <div style={{ marginTop: 6, color: "#6c7d90", fontSize: 14 }}>
                          Visibles: {template.visibleAssignments.length} · Reservas: {template.reserveAssignments.length} · Vigencia {formatDateTime(template.fecha_inicio)} → {formatDateTime(template.fecha_fin)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button onClick={() => setSelectedTemplate(template)} style={{ minHeight: 44, border: "1px solid #d7e1ec", borderRadius: 12, background: "#fff", color: "#1a2e44", padding: "0 16px", fontWeight: 700, cursor: "pointer" }}>
                          Ver detalle
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleToggleTemplate(template, !template.activo)}
                              disabled={templateBusyId === template.id}
                              style={{ minHeight: 44, border: "none", borderRadius: 12, background: template.activo ? "#fff1f2" : "#0f2744", color: template.activo ? "#9f1239" : "#fff", padding: "0 16px", fontWeight: 700, cursor: "pointer", opacity: templateBusyId === template.id ? 0.7 : 1 }}
                            >
                              {templateBusyId === template.id ? "Actualizando..." : template.activo ? "Desactivar" : "Activar para R2"}
                            </button>
                            {canCreateRecovery(template) ? (
                              <button
                                onClick={() => handlePreviewRecovery(template)}
                                disabled={templateBusyId === template.id}
                                style={{ minHeight: 44, border: "1px solid #d7e1ec", borderRadius: 12, background: "#fff", color: "#1a2e44", padding: "0 16px", fontWeight: 700, cursor: "pointer", opacity: templateBusyId === template.id ? 0.7 : 1 }}
                              >
                                Crear recuperatorio
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

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
          Filtrar historial
        </button>
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
        <div style={{ color: "#607284" }}>Cargando historial...</div>
      ) : !dataset.exams.length ? (
        <EmptyState />
      ) : !filteredExams.length ? (
        <div style={{ color: "#607284" }}>No hay exámenes para los filtros seleccionados.</div>
      ) : isMobile ? (
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
      )}

      <ExamDetailModal exam={selectedExam} onClose={() => setSelectedExam(null)} />
      <TemplateDetailModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onActivate={(template) => handleToggleTemplate(template, true)}
        onDeactivate={(template) => handleToggleTemplate(template, false)}
        onPreviewRecovery={handlePreviewRecovery}
        readOnly={!isAdmin}
        busyId={templateBusyId}
      />
      <RecoveryPreviewModal
        preview={recoveryPreview}
        onClose={() => setRecoveryPreview(null)}
        onConfirm={handleCreateRecovery}
        creating={creatingRecovery}
      />
    </div>
  );
}
