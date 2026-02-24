export interface DailyData {
  day: string;
  addedCount: number;
  cumulativeCount: number;
  focalAddedCount: number;
  focalCumulativeCount: number;
}

export interface StatisticsData {
  dailyData: DailyData[];
  totalCount: number;
  focalCount: number;
  startDate: string;
  endDate: string;
}

export async function getStatistics(tagIds: number[] = []): Promise<StatisticsData> {
  const userLibraryID = Zotero.Libraries.userLibraryID;

  try {
    await Zotero.DB.valueQueryAsync("SELECT COUNT(*) FROM tags");
  } catch {
    // ignore
  }

  const libraryID = userLibraryID;
  const placeholders = tagIds.map(() => "?").join(",");
  const focalWithClause = tagIds.length > 0
    ? `WITH focal AS (
        SELECT DISTINCT itemID
        FROM itemTags
        WHERE tagID IN (${placeholders})
        AND itemID NOT IN (SELECT itemID FROM deletedItems)
      )`
    : "";

  const dayExpr = "substr(i.dateAdded, 1, 10)";
  const sql = `
    ${focalWithClause}
    SELECT
      ${dayExpr} AS day,
      COUNT(DISTINCT i.itemID) AS added_count,
      ${tagIds.length > 0 ? "COUNT(DISTINCT CASE WHEN f.itemID IS NOT NULL THEN i.itemID END)" : "0"} AS focal_added_count
    FROM items i
    JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
    ${tagIds.length > 0 ? "LEFT JOIN focal f ON f.itemID = i.itemID" : ""}
    LEFT JOIN deletedItems di ON di.itemID = i.itemID
    WHERE
      it.typeName IN ('journalArticle','book','thesis','conferencePaper','patent','preprint')
      AND i.libraryID = ?
      AND di.itemID IS NULL
    GROUP BY ${dayExpr}
    ORDER BY day ASC;
  `;

  const params = tagIds.length > 0
    ? [...tagIds, libraryID]
    : [libraryID];
  let results: any[] = [];
  try {
    const baseWhere = `
      FROM items i
      JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
      LEFT JOIN deletedItems di ON di.itemID = i.itemID
      WHERE
        it.typeName IN ('journalArticle','book','thesis','conferencePaper','patent','preprint')
        AND i.libraryID = ?
        AND di.itemID IS NULL
    `;
    const daySql = `
      SELECT ${dayExpr} AS day
      ${baseWhere}
      GROUP BY ${dayExpr}
      ORDER BY day ASC;
    `;
    const addedSql = `
      SELECT COUNT(DISTINCT i.itemID) AS added_count
      ${baseWhere}
      GROUP BY ${dayExpr}
      ORDER BY ${dayExpr} ASC;
    `;
    const focalSql = tagIds.length > 0
      ? `
          SELECT COUNT(DISTINCT CASE WHEN itg.itemID IS NOT NULL THEN i.itemID END) AS focal_added_count
          FROM items i
          JOIN itemTypes it ON i.itemTypeID = it.itemTypeID
          LEFT JOIN itemTags itg ON itg.itemID = i.itemID AND itg.tagID IN (${placeholders})
          LEFT JOIN deletedItems di ON di.itemID = i.itemID
          WHERE
            it.typeName IN ('journalArticle','book','thesis','conferencePaper','patent','preprint')
            AND i.libraryID = ?
            AND di.itemID IS NULL
          GROUP BY ${dayExpr}
          ORDER BY ${dayExpr} ASC;
        `
      : "";

    const dayParams = [libraryID];
    const days = (await Zotero.DB.columnQueryAsync(daySql, dayParams)) as
      | string[]
      | null;
    const added = (await Zotero.DB.columnQueryAsync(addedSql, dayParams)) as
      | number[]
      | null;
    let focal: number[] = [];
    if (tagIds.length > 0) {
      const focalParams = [...tagIds, libraryID];
      const focalCol = (await Zotero.DB.columnQueryAsync(focalSql, focalParams)) as
        | number[]
        | null;
      focal = focalCol ?? [];
    } else if (days) {
      focal = days.map(() => 0);
    }

    if (days && added && days.length === added.length) {
      results = days.map((day, i) => ({
        day,
        added_count: added[i] ?? 0,
        focal_added_count: focal[i] ?? 0,
      }));
    }
  } catch {
    results = [];
  }

  if (!results || results.length === 0) {
    return {
      dailyData: [],
      totalCount: 0,
      focalCount: 0,
      startDate: "",
      endDate: "",
    };
  }

  const normalized = results
    .filter((row) => row.day)
    .map((row) => ({
      day: String(row.day),
      addedCount: Number(row.added_count) || 0,
      focalAddedCount: Number(row.focal_added_count) || 0,
    }))
    .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  const byDay = new Map(normalized.map((row) => [row.day, row] as const));
  const startDay = normalized[0].day;
  const endDay = normalized[normalized.length - 1].day;

  const dailyData: DailyData[] = [];
  let cur = new Date(startDay);
  const end = new Date(endDay);
  let cumulative = 0;
  let focalCumulative = 0;

  while (cur <= end) {
    const day = cur.toISOString().slice(0, 10);
    const row = byDay.get(day);
    const addedCount = row?.addedCount ?? 0;
    const focalAddedCount = row?.focalAddedCount ?? 0;
    cumulative += addedCount;
    focalCumulative += focalAddedCount;
    dailyData.push({
      day,
      addedCount,
      cumulativeCount: cumulative,
      focalAddedCount,
      focalCumulativeCount: focalCumulative,
    });
    cur.setDate(cur.getDate() + 1);
  }

  const lastRow = dailyData[dailyData.length - 1];

  return {
    dailyData,
    totalCount: lastRow.cumulativeCount,
    focalCount: lastRow.focalCumulativeCount,
    startDate: dailyData[0].day,
    endDate: lastRow.day,
  };
}
