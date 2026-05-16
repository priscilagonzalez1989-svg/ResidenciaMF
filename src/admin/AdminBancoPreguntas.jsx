import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const PAGE_SIZE = 20;

const FILTER_BASE = {
  rotacion: "Todas",
  dominio: "Todos",
  anio: "Todos",
  tipo: "Todos",
  activa: "Todas",
  pool_guardia: "Todos",
};

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

function ToggleActiva({ checked, disabled, onToggle }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={{
        width: 54,
        height: 30,
        borderRadius: 999,
        border: "none",
        padding: 4,
        cursor: disabled ? "wait" : "pointer",
        background: checked ? "#4a9fd4" : "#d7e1ec",
        transition: "all 0.2s ease",
      }}
      aria-label={checked ? "Desactivar pregunta" : "Activar pregunta"}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          transform: checked ? "translateX(24px)" : "translateX(0)",
          transition: "transform 0.2s ease",
        }}
      />
    </button>
  );
}

function DetailPanel({ question, onClose, onToggleActiva, toggling }) {
  if (!question) return null;

  const checklist = (question.lista_cotejo || "").replaceAll("<br>", "\n");

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
          width: "min(560px, 100%)",
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
            marginBottom: 22,
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <HeaderBadge text={`#${question.numero}`} color="#0f2744" background="#dfeeff" />
              <HeaderBadge text={question.rotacion} color="#0f2744" background="#eef4fb" />
              <HeaderBadge text={question.tipo} color="#6b4b00" background="#fff2cf" />
              <HeaderBadge text={question.anio} color="#164e63" background="#daf5fb" />
              {question.pool_guardia && (
                <HeaderBadge text="Pool guardia" color="#0f5132" background="#dcfce7" />
              )}
              {question.guardia_activa && (
                <HeaderBadge text="Guardia activa" color="#7c2d12" background="#ffedd5" />
              )}
            </div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#0f2744" }}>
              Detalle de pregunta
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

        <div style={{ display: "grid", gap: 18 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#607284", marginBottom: 8 }}>
              Enunciado
            </div>
            <div style={{ whiteSpace: "pre-wrap", color: "#1a2e44", lineHeight: 1.7 }}>
              {question.enunciado}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
            <Field label="Dominio" value={question.dominio} />
            <Field label="Puntaje sugerido" value={String(question.puntaje_sugerido ?? "")} />
            <Field label="Activa" value={question.activa ? "Sí" : "No"} />
            <Field label="Fuente" value={question.fuente || "—"} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#607284", marginBottom: 8 }}>
              Lista de cotejo
            </div>
            <pre
              style={{
                margin: 0,
                padding: 16,
                background: "#f8fbff",
                border: "1px solid #dfe7f1",
                borderRadius: 16,
                whiteSpace: "pre-wrap",
                fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
                lineHeight: 1.6,
                color: "#1a2e44",
              }}
            >
              {checklist || "—"}
            </pre>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#607284", marginBottom: 8 }}>
              Observaciones
            </div>
            <div style={{ color: "#1a2e44", lineHeight: 1.6 }}>{question.observaciones || "—"}</div>
          </div>

          {question.imagen_url && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#607284", marginBottom: 8 }}>
                Imagen asociada
              </div>
              <img
                src={question.imagen_url}
                alt={`Pregunta ${question.numero}`}
                style={{
                  width: "100%",
                  maxHeight: 360,
                  objectFit: "contain",
                  borderRadius: 16,
                  border: "1px solid #dfe7f1",
                  background: "#f8fbff",
                }}
              />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#607284", marginBottom: 4 }}>
                Estado
              </div>
              <div style={{ color: "#1a2e44" }}>
                {question.activa ? "La pregunta está activa." : "La pregunta está inactiva."}
              </div>
            </div>
            <ToggleActiva
              checked={question.activa}
              disabled={toggling}
              onToggle={onToggleActiva}
            />
          </div>
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

export default function AdminBancoPreguntas() {
  const [filters, setFilters] = useState(FILTER_BASE);
  const [pagination, setPagination] = useState({ page: 1, total: 0 });
  const [questions, setQuestions] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    rotaciones: [],
    dominios: [],
    tipos: [],
  });
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingNumero, setTogglingNumero] = useState(null);

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / PAGE_SIZE));

  const optionsMemo = useMemo(
    () => ({
      rotaciones: ["Todas", ...filterOptions.rotaciones],
      dominios: ["Todos", ...filterOptions.dominios],
      anios: ["Todos", "R1", "R2", "R3"],
      tipos: ["Todos", ...filterOptions.tipos],
      activa: ["Todas", "Activas", "Inactivas"],
      poolGuardia: ["Todos", "Sí", "No"],
    }),
    [filterOptions]
  );

  useEffect(() => {
    const loadFilterOptions = async () => {
      const { data, error: optionsError } = await supabase
        .from("banco_preguntas")
        .select("rotacion, dominio, tipo")
        .order("numero", { ascending: true });

      if (optionsError) {
        setError(optionsError.message);
        return;
      }

      const rotaciones = [...new Set((data || []).map((item) => item.rotacion).filter(Boolean))].sort();
      const dominios = [...new Set((data || []).map((item) => item.dominio).filter(Boolean))].sort();
      const tipos = [...new Set((data || []).map((item) => item.tipo).filter(Boolean))].sort();

      setFilterOptions({ rotaciones, dominios, tipos });
    };

    loadFilterOptions();
  }, []);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError("");

      let query = supabase
        .from("banco_preguntas")
        .select("*", { count: "exact" })
        .order("numero", { ascending: true });

      if (filters.rotacion !== "Todas") query = query.eq("rotacion", filters.rotacion);
      if (filters.dominio !== "Todos") query = query.eq("dominio", filters.dominio);
      if (filters.anio !== "Todos") query = query.eq("anio", filters.anio);
      if (filters.tipo !== "Todos") query = query.eq("tipo", filters.tipo);
      if (filters.activa === "Activas") query = query.eq("activa", true);
      if (filters.activa === "Inactivas") query = query.eq("activa", false);
      if (filters.pool_guardia === "Sí") query = query.eq("pool_guardia", true);
      if (filters.pool_guardia === "No") query = query.eq("pool_guardia", false);

      const from = (pagination.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        setQuestions([]);
        setPagination((current) => ({ ...current, total: 0 }));
        setLoading(false);
        return;
      }

      setQuestions(data || []);
      setPagination((current) => ({ ...current, total: count || 0 }));
      setLoading(false);
    };

    fetchQuestions();
  }, [filters, pagination.page]);

  const handleFilterChange = (key, value) => {
    setPagination((current) => ({ ...current, page: 1 }));
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleToggleActiva = async (question) => {
    setTogglingNumero(question.numero);

    const { data, error: toggleError } = await supabase
      .from("banco_preguntas")
      .update({ activa: !question.activa })
      .eq("numero", question.numero)
      .select()
      .single();

    if (toggleError) {
      setError(toggleError.message);
      setTogglingNumero(null);
      return;
    }

    setQuestions((current) =>
      current.map((item) => (item.numero === question.numero ? data : item))
    );

    setSelectedQuestion((current) =>
      current?.numero === question.numero ? data : current
    );

    setTogglingNumero(null);
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "28px 32px 20px",
          borderBottom: "1px solid #e8eef5",
          background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#0f2744" }}>
              Banco de preguntas
            </h1>
            <p style={{ margin: "10px 0 0", color: "#6c7d90", fontSize: 15 }}>
              Gestión académica de preguntas de examen, con filtros y activación en tiempo real.
            </p>
          </div>
          <div
            style={{
              minWidth: 180,
              background: "#0f2744",
              color: "#fff",
              borderRadius: 20,
              padding: "16px 18px",
              boxShadow: "0 16px 32px rgba(15,39,68,0.12)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Preguntas filtradas</div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{pagination.total}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 24, display: "grid", gap: 20 }}>
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
            label="Rotación"
            value={filters.rotacion}
            options={optionsMemo.rotaciones}
            onChange={(value) => handleFilterChange("rotacion", value)}
          />
          <FilterSelect
            label="Dominio"
            value={filters.dominio}
            options={optionsMemo.dominios}
            onChange={(value) => handleFilterChange("dominio", value)}
          />
          <FilterSelect
            label="Año"
            value={filters.anio}
            options={optionsMemo.anios}
            onChange={(value) => handleFilterChange("anio", value)}
          />
          <FilterSelect
            label="Tipo"
            value={filters.tipo}
            options={optionsMemo.tipos}
            onChange={(value) => handleFilterChange("tipo", value)}
          />
          <FilterSelect
            label="Estado"
            value={filters.activa}
            options={optionsMemo.activa}
            onChange={(value) => handleFilterChange("activa", value)}
          />
          <FilterSelect
            label="Pool guardia"
            value={filters.pool_guardia}
            options={optionsMemo.poolGuardia}
            onChange={(value) => handleFilterChange("pool_guardia", value)}
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
              gridTemplateColumns: "92px 1.1fr 0.9fr 0.8fr 0.7fr 0.7fr 110px",
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
            <div>Número</div>
            <div>Enunciado</div>
            <div>Rotación</div>
            <div>Dominio</div>
            <div>Año</div>
            <div>Badges</div>
            <div>Activa</div>
          </div>

          {loading ? (
            <div style={{ padding: 28, color: "#607284" }}>Cargando preguntas...</div>
          ) : questions.length === 0 ? (
            <div style={{ padding: 28, color: "#607284" }}>No hay preguntas para los filtros seleccionados.</div>
          ) : (
            questions.map((question) => (
              <button
                key={question.numero}
                onClick={() => setSelectedQuestion(question)}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "92px 1.1fr 0.9fr 0.8fr 0.7fr 0.7fr 110px",
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
                <div style={{ fontWeight: 800, color: "#0f2744" }}>#{question.numero}</div>
                <div style={{ color: "#1a2e44", lineHeight: 1.45 }}>
                  {question.enunciado?.slice(0, 140)}
                  {question.enunciado?.length > 140 ? "..." : ""}
                </div>
                <div style={{ color: "#4d6174" }}>{question.rotacion}</div>
                <div style={{ color: "#4d6174" }}>{question.dominio}</div>
                <div style={{ color: "#4d6174", fontWeight: 700 }}>{question.anio}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {question.pool_guardia && (
                    <HeaderBadge text="Pool" color="#0f5132" background="#dcfce7" />
                  )}
                  {question.guardia_activa && (
                    <HeaderBadge text="Guardia" color="#7c2d12" background="#ffedd5" />
                  )}
                </div>
                <div>
                  <ToggleActiva
                    checked={question.activa}
                    disabled={togglingNumero === question.numero}
                    onToggle={() => handleToggleActiva(question)}
                  />
                </div>
              </button>
            ))
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ color: "#607284", fontSize: 14 }}>
            Página {pagination.page} de {totalPages}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() =>
                setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))
              }
              disabled={pagination.page === 1}
              style={paginationButtonStyle(pagination.page === 1)}
            >
              Anterior
            </button>
            <button
              onClick={() =>
                setPagination((current) => ({
                  ...current,
                  page: Math.min(totalPages, current.page + 1),
                }))
              }
              disabled={pagination.page >= totalPages}
              style={paginationButtonStyle(pagination.page >= totalPages)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <DetailPanel
        question={selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
        onToggleActiva={() => selectedQuestion && handleToggleActiva(selectedQuestion)}
        toggling={togglingNumero === selectedQuestion?.numero}
      />
    </div>
  );
}

function paginationButtonStyle(disabled) {
  return {
    height: 42,
    borderRadius: 12,
    border: "1px solid #d7e1ec",
    background: disabled ? "#f4f7fa" : "#fff",
    color: disabled ? "#9aa9b9" : "#39516b",
    padding: "0 14px",
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
