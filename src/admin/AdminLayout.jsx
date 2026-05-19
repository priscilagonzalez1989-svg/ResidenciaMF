import { useEffect, useState } from "react";

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
  navItems = SIDEBAR_ITEMS,
  heading = "Admin",
  subtitle = "ResidenciaMF",
  sessionLabel = "Sesión",
  modeBadge,
  children,
}) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  function handleNavigate(path) {
    setMenuOpen(false);
    onNavigate(path);
  }

  const sidebar = (
    <aside
      style={{
        background: "#fff",
        border: "1px solid #dfe7f1",
        borderRadius: 24,
        padding: 20,
        boxShadow: "0 16px 40px rgba(15,39,68,0.08)",
        height: isMobile ? "auto" : "calc(100vh - 48px)",
        position: isMobile ? "static" : "sticky",
        top: isMobile ? "auto" : 24,
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
            {heading}
          </div>
          <div style={{ fontSize: 13, color: "#7a8b9d" }}>{subtitle}</div>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {navItems.map((item) => (
          <SidebarItem
            key={item.path}
            item={item}
            isActive={pathname === item.path}
            onNavigate={handleNavigate}
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
          {sessionLabel}
        </div>
        {modeBadge && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 999,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.03em",
              color: "#0f2744",
              background: "#e8f2fb",
              marginBottom: 10,
            }}
          >
            {modeBadge}
          </div>
        )}
        <div style={{ fontSize: 13, color: "#1a2e44", marginBottom: 14 }}>
          {userEmail || "Sin email"}
        </div>
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            minHeight: 48,
            border: "1px solid #d7e1ec",
            background: "#fff",
            color: "#39516b",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

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
          padding: isMobile ? 16 : 24,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "280px 1fr",
          gap: 24,
        }}
      >
        {isMobile ? (
          <>
            <div
              style={{
                background: "#fff",
                border: "1px solid #dfe7f1",
                borderRadius: 20,
                padding: "14px 16px",
                boxShadow: "0 12px 30px rgba(15,39,68,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f2744" }}>{heading}</div>
                <div style={{ fontSize: 13, color: "#7a8b9d" }}>{subtitle}</div>
              </div>
              <button
                onClick={() => setMenuOpen(true)}
                style={{
                  minWidth: 48,
                  minHeight: 48,
                  borderRadius: 14,
                  border: "1px solid #d7e1ec",
                  background: "#fff",
                  color: "#1a2e44",
                  fontSize: 24,
                  cursor: "pointer",
                }}
              >
                ☰
              </button>
            </div>

            {menuOpen && (
              <div
                onClick={() => setMenuOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15,39,68,0.34)",
                  zIndex: 50,
                  padding: 16,
                }}
              >
                <div
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    width: "min(360px, calc(100vw - 32px))",
                    maxHeight: "calc(100vh - 32px)",
                    overflowY: "auto",
                  }}
                >
                  {sidebar}
                </div>
              </div>
            )}
          </>
        ) : (
          sidebar
        )}

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
