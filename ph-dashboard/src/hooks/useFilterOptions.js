import { useState, useEffect } from "react";

const EMPTY_OPTIONS = {
  weeks: [],
  days: [],
  franchises: [],
  channels: [],
  businessTypes: [],
};

export function useFilterOptions(runQ, ready) {
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [error, setError] = useState(null);

  // Filter dropdown options (unfiltered, so only reloaded with a new CSV)
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    (async () => {
      try {
        const weeks = await runQ(
          `SELECT DISTINCT DATE_TRUNC('week', BUSINESS_DATE)::VARCHAR AS wc FROM sales ORDER BY wc DESC`,
        );
        if (cancelled) return;
        setOptions((o) => ({ ...o, weeks: weeks.map((r) => r.wc) }));

        // Monday first
        const days = await runQ(
          `SELECT DAYNAME FROM sales WHERE DAYNAME IS NOT NULL GROUP BY DAYNAME ORDER BY MIN(ISODOW(BUSINESS_DATE))`,
        );
        if (cancelled) return;
        setOptions((o) => ({ ...o, days: days.map((r) => r.DAYNAME) }));

        const flist = await runQ(
          `SELECT DISTINCT FRANCHISE FROM sales ORDER BY FRANCHISE`,
        );
        if (cancelled) return;
        setOptions((o) => ({ ...o, franchises: flist.map((r) => r.FRANCHISE) }));

        const clist = await runQ(
          `SELECT DISTINCT CHANNEL FROM sales ORDER BY CHANNEL`,
        );
        if (cancelled) return;
        setOptions((o) => ({ ...o, channels: clist.map((r) => r.CHANNEL) }));

        const btlist = await runQ(
          `SELECT DISTINCT CHANNEL_TYPE FROM sales WHERE CHANNEL_TYPE IS NOT NULL ORDER BY CHANNEL_TYPE`,
        );
        if (cancelled) return;
        setOptions((o) => ({ ...o, businessTypes: btlist.map((r) => r.CHANNEL_TYPE) }));
      } catch (e) {
        if (!cancelled) setError("Query error: " + e.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, runQ]);

  return { options, error };
}
