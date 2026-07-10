"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ background: "#0f0f0f", color: "#e5e5e5", fontFamily: "monospace", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0 }}>
        <div style={{ maxWidth: 400, padding: 32, border: "2px solid #ef4444" }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#ef4444", marginBottom: 8 }}>Error crítico</p>
          <h1 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>La aplicación falló</h1>
          <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>{error.message || "Ocurrió un error inesperado."}</p>
          <button
            onClick={reset}
            style={{ background: "#f59e0b", color: "#000", padding: "10px 20px", fontFamily: "monospace", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", border: "none", cursor: "pointer", width: "100%" }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
