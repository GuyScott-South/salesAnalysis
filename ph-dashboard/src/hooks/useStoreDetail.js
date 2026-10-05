import { useState, useEffect, useCallback } from "react";
import { DAYPART_ORDER } from "../theme";
import { andWhere, sqlStr } from "../lib/sql";

// Channel and daypart breakdown for one store, under the current filters
export function useStoreDetail({ runQ, ready, metricMode, where, storeId }) {
  const [storeDetail, setStoreDetail] = useState(null);

  const fetchStoreDetail = useCallback(
    async (storeId) => {
      if (!ready) return null;
      const cy = metricMode === "transactions" ? "TXN_CY" : "CY";
      const py1 = metricMode === "transactions" ? "TXN_PY1" : "PY1";
      // Same filters as the rest of the dashboard, narrowed to this store
      const sw = andWhere(where, `STORE_ID=${sqlStr(storeId)}`);
      const channelBreakdown = await runQ(`
      SELECT CHANNEL, SUM(${cy}) AS cy, SUM(${py1}) AS py1
      FROM sales ${sw} GROUP BY CHANNEL ORDER BY cy DESC
    `);
      const daypartBreakdown = await runQ(`
      SELECT DAY_PART, SUM(${cy}) AS cy, SUM(${py1}) AS py1
      FROM sales ${sw} GROUP BY DAY_PART
    `);
      const dpOrdered = DAYPART_ORDER.map(
        (d) =>
          daypartBreakdown.find((r) => r.DAY_PART === d) || {
            DAY_PART: d,
            cy: 0,
            py1: 0,
          },
      );
      return { channelBreakdown, daypartBreakdown: dpOrdered };
    },
    [ready, runQ, metricMode, where],
  );

  useEffect(() => {
    let cancelled = false;
    const promise = storeId
      ? fetchStoreDetail(storeId)
      : Promise.resolve(null);
    promise.then((detail) => {
      if (!cancelled) setStoreDetail(detail);
    });
    return () => {
      cancelled = true;
    };
  }, [storeId, fetchStoreDetail]);

  return storeDetail;
}
