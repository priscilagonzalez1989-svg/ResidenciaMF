export default function AdminPlaceholder({ title, description }) {
  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#0f2744" }}>
          {title}
        </h1>
        <p style={{ margin: "10px 0 0", color: "#6c7d90", fontSize: 15 }}>
          {description}
        </p>
      </div>

      <div
        style={{
          border: "1px dashed #cdd8e4",
          borderRadius: 24,
          background: "#f9fbfd",
          padding: 32,
          minHeight: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6c7d90",
          fontSize: 16,
        }}
      >
        Sección en preparación.
      </div>
    </div>
  );
}
