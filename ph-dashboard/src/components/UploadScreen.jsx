import { useState } from "react";
import { C } from "../theme";

export default function UploadScreen({ dbLoaded, loading, error, onFile }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) onFile(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) onFile(file);
  };

  return (
  <div
    style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Syne', sans-serif",
    }}
  >
    <div style={{ textAlign: "center", maxWidth: 500, padding: 32 }}>
      <div style={{ marginBottom: 8 }}>
        <img src="/logo.png" alt="Logo" style={{ height: 48 }} />
      </div>
      <h1
        style={{
          color: C.text,
          fontSize: 32,
          fontWeight: 800,
          margin: "0 0 8px",
        }}
      >
        PH UK Performance
      </h1>
      <p style={{ color: C.textSub, marginBottom: 32 }}>
        Drop your sales CSV to begin analysis
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("csvInput").click()}
        style={{
          border: `2px dashed ${dragging ? C.accent : C.border}`,
          borderRadius: 16,
          padding: "48px 32px",
          cursor: "pointer",
          background: dragging ? C.accent + "11" : C.card,
          transition: "all 0.2s",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
        <div style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>
          {loading ? "Loading…" : "Drop CSV here or click to browse"}
        </div>
        <div style={{ color: C.muted, fontSize: 13 }}>
          Supports large files — powered by DuckDB-WASM
        </div>
        <input
          id="csvInput"
          type="file"
          accept=".csv"
          style={{ display: "none" }}
          onChange={handleFileInput}
        />
      </div>
      {error && (
        <div style={{ color: C.accent, marginTop: 16, fontSize: 13 }}>
          {error}
        </div>
      )}
      {!dbLoaded && (
        <div style={{ color: C.muted, marginTop: 16, fontSize: 12 }}>
          Initialising DuckDB…
        </div>
      )}
    </div>
  </div>
  );
}
