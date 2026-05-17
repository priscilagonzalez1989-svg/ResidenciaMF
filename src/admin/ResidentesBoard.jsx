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

function ResidenteDetail({ residente, onClose }) {
  if (!residente) return null;

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
          <Field label="Fecha de alta" value={residente.created_at ? new Date(residente.created_at).toLocaleString("es-AR") : "—"} />
          <Field label="User ID vinculado" value={residente.user_id || "Sin vincular"} />
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
}) {
  const [filters, setFilters] = useState(BASE_FILTERS);
  const [residentes, setResidentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedResidente, setSelectedResidente] = useState(null);

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
        onClose={() => setSelectedResidente(null)}
      />
    </div>
  );
}

function ResidentDetailGate({ residente, onClose }) {
  return <ResidenteDetail residente={residente} onClose={onClose} />;
}
