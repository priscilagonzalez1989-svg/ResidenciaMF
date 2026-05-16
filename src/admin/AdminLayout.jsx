const SIDEBAR_ITEMS = [
  { path: "/admin/banco-preguntas", label: "Banco de preguntas", icon: "📚" },
  { path: "/admin/examenes", label: "Exámenes", icon: "📝" },
  { path: "/admin/residentes", label: "Residentes", icon: "👥" },
];

function SidebarItem({ item, isActive, onNavigate }) {
  return (
    <button
      onClick={() => onNavigate(item.path)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        border: "none",
        borderRadius: 14,
        padding: "14px 16px",
        cursor: "pointer",
        background: isActive ? "rgba(74,159,212,0.14)" : "transparent",
        color: isActive ? "#0f2744" : "#5d6f84",
        fontWeight: isActive ? 700 : 500,
        fontSize: 14,
        transition: "all 0.2s ease",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 18 }}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

export default function AdminLayout({
  pathname,
  onNavigate,
  onLogout,
  userEmail,
  children,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #edf4fb 0%, #f6f9fc 100%)",
        color: "#1a2e44",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: 24,
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 24,
        }}
      >
        <aside
          style={{
            background: "#fff",
            border: "1px solid #dfe7f1",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 16px 40px rgba(15,39,68,0.08)",
            height: "calc(100vh - 48px)",
            position: "sticky",
            top: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              paddingBottom: 18,
              borderBottom: "1px solid #edf1f5",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "linear-gradient(135deg, #4a9fd4, #2c6fad)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              🩺
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f2744" }}>
                Admin
              </div>
              <div style={{ fontSize: 13, color: "#7a8b9d" }}>ResidenciaMF</div>
            </div>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {SIDEBAR_ITEMS.map((item) => (
              <SidebarItem
                key={item.path}
                item={item}
                isActive={pathname === item.path}
                onNavigate={onNavigate}
              />
            ))}
          </nav>

          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: "1px solid #edf1f5",
            }}
          >
            <div style={{ fontSize: 12, color: "#7a8b9d", marginBottom: 6 }}>
              Sesión admin
            </div>
            <div style={{ fontSize: 13, color: "#1a2e44", marginBottom: 14 }}>
              {userEmail || "Sin email"}
            </div>
            <button
              onClick={onLogout}
              style={{
                width: "100%",
                border: "1px solid #d7e1ec",
                background: "#fff",
                color: "#39516b",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main
          style={{
            minWidth: 0,
            background: "#fff",
            border: "1px solid #dfe7f1",
            borderRadius: 24,
            boxShadow: "0 16px 40px rgba(15,39,68,0.08)",
            overflow: "hidden",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
