import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip as LeafletTooltip,
} from "react-leaflet";
import { C } from "../theme";
import { fmtPct, growthColor, metricHelpers } from "../lib/format";
import KPI from "../components/KPI";
import SectionHeader from "../components/SectionHeader";

export default function GeographyView({
  geoData,
  geocodeCache,
  geoLoading,
  metricMode,
}) {
  const { fmtVal } = metricHelpers(metricMode);

  return (
    <div>
      <SectionHeader
        title="Store Geography"
        subtitle="CY vs PY1 growth by location — green = growing, red = declining"
      />

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        {[
          { color: C.accent, label: "Declining >5%" },
          { color: C.gold, label: "-5% to +5%" },
          { color: "#86EFAC", label: "Growing 0–5%" },
          { color: C.teal, label: "Growing >5%" },
        ].map((l) => (
          <div
            key={l.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: l.color,
              }}
            />
            <span
              style={{
                color: C.muted,
                fontSize: 11,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {l.label}
            </span>
          </div>
        ))}
        {geoLoading && (
          <span
            style={{
              color: C.muted,
              fontSize: 12,
              fontFamily: "'DM Mono', monospace",
            }}
          >
            Geocoding postcodes…
          </span>
        )}
      </div>

      {/* Map */}
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: "hidden",
          height: 600,
        }}
      >
        <MapContainer
          center={[54.5, -2.5]}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          {/* Esri Dark Gray Canvas (keyless). CARTO basemaps now require an API key. */}
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
          />
          {geoData
            .filter((s) => {
              const pc = s.POSTAL_CODE?.trim().toUpperCase();
              return pc && geocodeCache[pc];
            })
            .map((s) => {
              const pc = s.POSTAL_CODE.trim().toUpperCase();
              const { lat, lng } = geocodeCache[pc];
              const color = growthColor(s.growth_pct);
              return (
                <CircleMarker
                  key={s.STORE_ID}
                  center={[lat, lng]}
                  radius={8}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.8,
                    color: color,
                    weight: 1,
                  }}
                >
                  <LeafletTooltip>
                    <div
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 11,
                      }}
                    >
                      <strong>{s.STORE_NAME}</strong>
                      <br />
                      {s.FRANCHISE}
                      <br />
                      CY: {fmtVal(s.cy, 2)} | PY1: {fmtVal(s.py1, 2)}
                      <br />
                      Growth:{" "}
                      {s.growth_pct != null
                        ? fmtPct(s.growth_pct)
                        : "N/A"}
                    </div>
                  </LeafletTooltip>
                </CircleMarker>
              );
            })}
        </MapContainer>
      </div>

      {/* Summary KPIs */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 16,
        }}
      >
        <KPI
          label="Mapped Stores"
          value={
            geoData.filter(
              (s) => geocodeCache[s.POSTAL_CODE?.trim().toUpperCase()],
            ).length
          }
          sub={`of ${geoData.length} with postcodes`}
        />
        <KPI
          label="Avg Growth"
          value={fmtPct(
            geoData.reduce((s, d) => s + (d.growth_pct || 0), 0) /
              (geoData.filter((d) => d.growth_pct != null).length || 1),
          )}
          color={C.teal}
        />
      </div>
    </div>
  );
}
