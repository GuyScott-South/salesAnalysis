import { useState } from "react";
import { C, CHANNEL_COLORS } from "../theme";
import { fmt, fmtTxn } from "../lib/format";

export default function ChannelMixBar({ data, metricMode = "sales" }) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const total = data.reduce((s, d) => s + d.cy, 0);
  if (!total)
    return <span style={{ color: C.muted, fontSize: 12 }}>No CY {metricMode === "transactions" ? "transactions" : "sales"}</span>;
  const filtered = data.filter((d) => d.cy > 0).sort((a, b) => b.cy - a.cy);
  return (
    <div style={{ position: "relative" }}>
      <div
        onMouseEnter={(e) => {
          setPos({ x: e.clientX, y: e.clientY });
          setHovered(true);
        }}
        onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          gap: 1,
          cursor: "default",
        }}
      >
        {filtered.map((d) => (
          <div
            key={d.channel}
            style={{
              flex: d.cy,
              background: CHANNEL_COLORS[d.channel] || C.muted,
            }}
          />
        ))}
      </div>
      {hovered && (
        <div
          style={{
            position: "fixed",
            left: pos.x + 12,
            top: pos.y + 12,
            zIndex: 9999,
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 16px",
            minWidth: 200,
            pointerEvents: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: C.muted,
              marginBottom: 10,
              fontFamily: "'DM Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Channel Mix
          </div>
          <div
            style={{
              display: "flex",
              height: 12,
              borderRadius: 4,
              overflow: "hidden",
              gap: 1,
              marginBottom: 12,
            }}
          >
            {filtered.map((d) => (
              <div
                key={d.channel}
                style={{
                  flex: d.cy,
                  background: CHANNEL_COLORS[d.channel] || C.muted,
                }}
              />
            ))}
          </div>
          {filtered.map((d) => {
            const pct = ((d.cy / total) * 100).toFixed(1);
            return (
              <div
                key={d.channel}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: CHANNEL_COLORS[d.channel] || C.muted,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: C.text,
                    flex: 1,
                    fontFamily: "'Syne', sans-serif",
                  }}
                >
                  {d.channel}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: C.muted,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {pct}%
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: C.teal,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {metricMode === "transactions" ? fmtTxn(d.cy) : fmt(d.cy)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
