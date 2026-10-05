import { useState, useEffect, useRef } from "react";
import { C } from "../theme";
import { sqlStr } from "../lib/sql";

// Autocomplete over store name / ID; `selected` is the chosen store or null
export default function StoreSearch({ runQ, ready, selected, onSelect }) {
  const [storeSearch, setStoreSearch] = useState("");
  const [storeOptions, setStoreOptions] = useState([]);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const containerRef = useRef(null);

  // Debounced lookup
  useEffect(() => {
    if (selected || storeSearch.length < 2 || !ready) {
      const timer = setTimeout(() => {
        setStoreOptions([]);
        setShowStoreDropdown(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(async () => {
      const term = sqlStr(`%${storeSearch.toLowerCase()}%`);
      const results = await runQ(
        `SELECT DISTINCT STORE_ID, STORE_NAME FROM sales
         WHERE LOWER(STORE_NAME) LIKE ${term} OR LOWER(STORE_ID) LIKE ${term}
         ORDER BY STORE_NAME LIMIT 10`,
      );
      setStoreOptions(results);
      setShowStoreDropdown(results.length > 0);
    }, 200);
    return () => clearTimeout(timer);
  }, [storeSearch, selected, ready, runQ]);

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setShowStoreDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: 240 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "relative",
        }}
      >
        <input
          placeholder="Search store…"
          value={
            selected
              ? selected.STORE_NAME
              : storeSearch
          }
          onChange={(e) => {
            if (selected) return;
            setStoreSearch(e.target.value);
            if (e.target.value.length >= 2) setShowStoreDropdown(true);
          }}
          onFocus={() => {
            if (!selected && storeOptions.length > 0)
              setShowStoreDropdown(true);
          }}
          readOnly={!!selected}
          style={{
            background: C.card,
            border: `1px solid ${selected ? C.accent : C.border}`,
            color: C.text,
            borderRadius: 6,
            padding: "6px 12px",
            paddingRight: selected ? 28 : 12,
            fontSize: 13,
            fontFamily: "'Syne', sans-serif",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
        {selected && (
          <button
            onClick={() => {
              onSelect(null);
              setStoreSearch("");
              setStoreOptions([]);
            }}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: C.muted,
              cursor: "pointer",
              fontSize: 14,
              padding: "0 2px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
      {showStoreDropdown && storeOptions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            marginTop: 2,
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {storeOptions.map((s) => (
            <div
              key={s.STORE_ID}
              onClick={() => {
                onSelect(s);
                setStoreSearch("");
                setShowStoreDropdown(false);
                setStoreOptions([]);
              }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "'Syne', sans-serif",
                color: C.text,
                borderBottom: `1px solid ${C.border}22`,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = C.accent + "22")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <div>{s.STORE_NAME}</div>
              <div style={{ fontSize: 11, color: C.muted }}>
                {s.STORE_ID}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
