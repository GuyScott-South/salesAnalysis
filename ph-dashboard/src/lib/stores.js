// Splits aggregated store rows by CY vs PY1 performance
export function classifyStores(storeRows) {
  const growingStores = storeRows
    .filter((s) => s.cy > s.py1 && s.py1 > 0)
    .sort((a, b) => b.growth_py1 - a.growth_py1);
  const decliningStores = storeRows
    .filter((s) => s.cy < s.py1 && s.py1 > 0)
    .sort((a, b) => a.growth_py1 - b.growth_py1);
  const newStores = storeRows.filter((s) => s.cy > 0 && s.py1 === 0);
  return { growingStores, decliningStores, newStores };
}
