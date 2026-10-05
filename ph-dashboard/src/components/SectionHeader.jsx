import { C } from "../theme";

export default function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2
        style={{
          margin: 0,
          fontFamily: "'Syne', sans-serif",
          fontSize: 18,
          color: C.text,
          fontWeight: 700,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 13 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
