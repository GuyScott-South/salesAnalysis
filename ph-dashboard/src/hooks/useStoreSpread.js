import { useState, useEffect } from "react";

// Fewest comparable points a store needs before it gets a box
export const MIN_POINTS = { day: 5, week: 3 };

const BUCKET = {
  day: "BUSINESS_DATE",
  week: "DATE_TRUNC('week', BUSINESS_DATE)",
};

// Per-store distribution of % change vs PY1, one point per store-day (or
// store-week). Points where either year has no sales (closed days, refits,
// new stores) are dropped. Rows come back sorted worst to best by the store's
// overall % change for the period, which matches the Stores table.
export function useStoreSpread({ runQ, ready, metricMode, where, granularity }) {
  const [result, setResult] = useState({ rows: [], totalStores: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    (async () => {
      const cy = metricMode === "transactions" ? "TXN_CY" : "CY";
      const py1 = metricMode === "transactions" ? "TXN_PY1" : "PY1";
      setLoading(true);
      try {
        const rows = await runQ(`
          WITH points AS (
            SELECT STORE_ID, ${BUCKET[granularity]} AS bucket,
              SUM(${cy}) AS cy, SUM(${py1}) AS py1
            FROM sales ${where}
            GROUP BY STORE_ID, bucket
          ),
          spread AS (
            SELECT STORE_ID, COUNT(*) AS n,
              QUANTILE_CONT(pct, 0.05) AS p05,
              QUANTILE_CONT(pct, 0.25) AS p25,
              QUANTILE_CONT(pct, 0.50) AS median,
              QUANTILE_CONT(pct, 0.75) AS p75,
              QUANTILE_CONT(pct, 0.95) AS p95
            FROM (
              SELECT STORE_ID, (cy - py1) / py1 * 100 AS pct
              FROM points WHERE cy > 0 AND py1 > 0
            )
            GROUP BY STORE_ID
          ),
          totals AS (
            SELECT STORE_ID, ANY_VALUE(STORE_NAME) AS STORE_NAME,
              ANY_VALUE(FRANCHISE) AS FRANCHISE,
              SUM(${cy}) AS cy, SUM(${py1}) AS py1
            FROM sales ${where}
            GROUP BY STORE_ID
          )
          SELECT t.STORE_ID, t.STORE_NAME, t.FRANCHISE, t.cy, t.py1,
            CASE WHEN t.py1 > 0 THEN (t.cy - t.py1) / t.py1 * 100 END AS growth,
            s.n, s.p05, s.p25, s.median, s.p75, s.p95
          FROM totals t LEFT JOIN spread s USING (STORE_ID)
          ORDER BY growth NULLS LAST, t.STORE_NAME`);
        if (cancelled) return;
        const minPoints = MIN_POINTS[granularity];
        setResult({
          rows: rows.filter((r) => r.growth != null && r.n >= minPoints),
          totalStores: rows.length,
        });
        setError(null);
      } catch (e) {
        if (!cancelled) setError("Query error: " + e.message);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [runQ, ready, metricMode, where, granularity]);

  return { ...result, loading, error };
}
