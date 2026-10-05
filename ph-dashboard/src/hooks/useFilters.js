import { useState, useCallback, useMemo } from "react";
import { buildWhere } from "../lib/sql";

const EMPTY_FILTERS = {
  week: [],
  day: [],
  franchise: [],
  channel: [],
  business: [],
  daypart: [],
  status: [],
  store: null, // { STORE_ID, STORE_NAME } from the store search
};

export function useFilters() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const setFilter = useCallback(
    (key, value) => setFilters((f) => ({ ...f, [key]: value })),
    [],
  );
  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const isActive = Object.values(filters).some((v) =>
    Array.isArray(v) ? v.length > 0 : v != null,
  );

  const where = useMemo(() => buildWhere(filters), [filters]);
  // Franchisee table compares franchisees, so it ignores the franchise filter
  const whereNoFranchise = useMemo(
    () => buildWhere({ ...filters, franchise: [] }),
    [filters],
  );

  return { filters, setFilter, resetFilters, isActive, where, whereNoFranchise };
}
