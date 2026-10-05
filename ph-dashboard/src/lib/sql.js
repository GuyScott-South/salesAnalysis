export const sqlStr = (v) => `'${String(v).replace(/'/g, "''")}'`;

// Builds the WHERE clause for a filters object (see useFilters)
export function buildWhere({
  franchise,
  channel,
  daypart,
  status,
  store,
  week,
  business,
  day,
}) {
  const inList = (vals) => vals.map(sqlStr).join(",");
  const conds = [];
  if (franchise.length > 0) conds.push(`FRANCHISE IN (${inList(franchise)})`);
  if (channel.length > 0) conds.push(`CHANNEL IN (${inList(channel)})`);
  if (daypart.length > 0) conds.push(`DAY_PART IN (${inList(daypart)})`);
  if (status.length > 0)
    conds.push(`AIS_STORE_STATUS IN (${inList(status)})`);
  if (business.length > 0)
    conds.push(`CHANNEL_TYPE IN (${inList(business)})`);
  if (store) conds.push(`STORE_ID=${sqlStr(store.STORE_ID)}`);
  if (week.length > 0)
    conds.push(
      `DATE_TRUNC('week', BUSINESS_DATE)::VARCHAR IN (${inList(week)})`,
    );
  if (day.length > 0) conds.push(`DAYNAME IN (${inList(day)})`);
  return conds.length ? "WHERE " + conds.join(" AND ") : "";
}

// Adds a condition to a clause returned by buildWhere
export const andWhere = (where, cond) =>
  where ? `${where} AND ${cond}` : `WHERE ${cond}`;
