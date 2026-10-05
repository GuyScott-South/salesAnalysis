import { useState, useEffect, useRef } from "react";
import { C } from "../theme";

export default function MultiSelect({ label, selected, onChange, opts, format }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (opt) => {
    onChange(
      selected.includes(opt)
        ? selected.filter((s) => s !== opt)
        : [...selected, opt],
    );
  };

  const displayLabel =
    selected.length === 0
      ? `All ${label}s`
      : selected.length === 1
        ? format
          ? format(selected[0])
          : selected[0]
        : `${selected.length} ${label}s`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: C.card,
          border: `1px solid ${selected.length > 0 ? C.teal : C.border}`,
          color: selected.length > 0 ? C.text : C.muted,
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 12,
          fontFamily: "'DM Mono', monospace",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {displayLabel} ▾
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 1000,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "4px 0",
            minWidth: 200,
            maxHeight: 280,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {selected.length > 0 && (
            <div
              onClick={() => onChange([])}
              style={{
                padding: "5px 12px",
                fontSize: 11,
                color: C.accent,
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                borderBottom: `1px solid ${C.border}`,
                marginBottom: 4,
              }}
            >
              Clear selection
            </div>
          )}
          {opts.map((opt) => (
            <label
              key={opt}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                cursor: "pointer",
                color: selected.includes(opt) ? C.text : C.muted,
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                style={{ accentColor: C.teal, cursor: "pointer" }}
              />
              {format ? format(opt) : opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
