import { C } from "../theme";

export const fmt = (v, dec = 0) =>
  v == null
    ? "—"
    : `£${Number(v).toLocaleString("en-GB", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
export const fmtTxn = (v, dec = 0) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("en-GB", { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const fmtPct = (v) =>
  v == null || isNaN(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
export const growthColor = (v) =>
  v > 5 ? C.teal : v > 0 ? "#86EFAC" : v > -5 ? C.gold : C.accent;

// Label and value formatter for the active metric (sales £ or transaction count)
export const metricHelpers = (metricMode) =>
  metricMode === "transactions"
    ? { metricLabel: "Transactions", fmtVal: fmtTxn }
    : { metricLabel: "Sales", fmtVal: fmt };
