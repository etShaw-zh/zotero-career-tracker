import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getStatistics, StatisticsData } from "./statistics";

const PREFS_KEY = "focalTags";

export async function registerPrefsScripts(_window: Window) {
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [],
      rows: [],
    };
  } else {
    addon.data.prefs.window = _window;
  }
  await updatePrefsUI();
}

async function getTagIdsByNames(tagNames: string[]): Promise<number[]> {
  if (tagNames.length === 0) return [];
  
  const placeholders = tagNames.map(() => "?").join(",");
  const sql = `
    SELECT tagID FROM tags
    WHERE name IN (${placeholders})
  `;
  ztoolkit.log("getTagIdsByNames SQL:", sql, tagNames, placeholders);
  
  let results: any[] = [];
  try {
    results = await Zotero.DB.queryAsync(sql, tagNames) as any[] || [];
  } catch (e) {
    ztoolkit.log("Query error:", e);
  }
  if (!results) results = [];
  if (results.length > 0) {
    return results.map((row: any) => row.tagID);
  }
  try {
    const column = await Zotero.DB.columnQueryAsync(sql, tagNames) as number[] | null;
    ztoolkit.log("columnQueryAsync tagIDs:", column);
    if (column && column.length > 0) return column;
  } catch (e) {
    ztoolkit.log("columnQueryAsync error:", e);
  }
  return [];
}

function getSavedTagNames(): string {
  const prefValue = Zotero.Prefs.get(`${config.prefsPrefix}.${PREFS_KEY}`);
  if (!prefValue) return "";
  return prefValue as string;
}

function saveTagNames(tagNames: string): void {
  Zotero.Prefs.set(`${config.prefsPrefix}.${PREFS_KEY}`, tagNames);
}

async function updatePrefsUI(): Promise<void> {
  if (addon.data.prefs?.window == undefined) {
    ztoolkit.log("Window is undefined");
    return;
  }

  const doc = addon.data.prefs.window.document;
  const tagInput = doc.getElementById(`${config.addonRef}-tag-input`);
  const refreshBtn = doc.getElementById(`${config.addonRef}-refresh-btn`);
  const summaryContainer = doc.getElementById(`${config.addonRef}-stats-summary`);
  const chartAllCanvas = doc.getElementById(`${config.addonRef}-chart-all`);
  const chartFocalCanvas = doc.getElementById(`${config.addonRef}-chart-focal`);
  const shareBtn = doc.getElementById(`${config.addonRef}-share-btn`);
  const footerNote = doc.getElementById(`${config.addonRef}-chart-footer-note`);
  const shareStatus = doc.getElementById(`${config.addonRef}-share-status`);

  ztoolkit.log("Elements found:", { tagInput, refreshBtn, summaryContainer, chartAllCanvas, chartFocalCanvas, shareBtn, footerNote, shareStatus });

  if (!summaryContainer || !chartAllCanvas || !chartFocalCanvas || !tagInput || !refreshBtn || !shareBtn || !footerNote || !shareStatus) {
    ztoolkit.log("Container elements not found");
    return;
  }

  const savedTagNames = getSavedTagNames();
  ztoolkit.log("Saved tag names:", savedTagNames);
  
  const inputEl = tagInput as HTMLInputElement;
  if (inputEl.value === "" && savedTagNames !== "") {
    inputEl.value = savedTagNames;
  }

  const btnEl = refreshBtn as HTMLButtonElement;
  btnEl.addEventListener("click", async () => {
    ztoolkit.log("Refresh button clicked");
    const tagNamesStr = inputEl.value.trim();
    saveTagNames(tagNamesStr);
    
    const tagNames = tagNamesStr.split(";").map(s => s.trim()).filter(s => s.length > 0);
    ztoolkit.log("Tag names:", tagNames);
    
    const tagIds = await getTagIdsByNames(tagNames);
    ztoolkit.log("Tag IDs:", tagIds);
    
    await refreshChart(
      summaryContainer as HTMLElement,
      chartAllCanvas as HTMLCanvasElement,
      chartFocalCanvas as HTMLCanvasElement,
      tagIds,
      tagNamesStr,
    );
  });

  const initialTagNames = savedTagNames.split(";").map(s => s.trim()).filter(s => s.length > 0);
  const initialTagIds = await getTagIdsByNames(initialTagNames);
  await refreshChart(
    summaryContainer as HTMLElement,
    chartAllCanvas as HTMLCanvasElement,
    chartFocalCanvas as HTMLCanvasElement,
    initialTagIds,
    savedTagNames,
  );

  const shareBtnEl = shareBtn as HTMLButtonElement;
  shareBtnEl.addEventListener("click", async () => {
    const statusEl = shareStatus as HTMLElement;
    statusEl.textContent = "";
    const tagNamesStr = inputEl.value.trim();
    const tagNames = tagNamesStr.split(";").map(s => s.trim()).filter(s => s.length > 0);
    const tagIds = await getTagIdsByNames(tagNames);
    const statistics = await getStatistics(tagIds);
    const ok = await exportShareImage(
      addon.data.prefs?.window as Window,
      chartAllCanvas as HTMLCanvasElement,
      chartFocalCanvas as HTMLCanvasElement,
      statistics,
      footerNote as HTMLElement,
    );
    statusEl.textContent = ok ? getString("ui-share-success") : getString("ui-share-failed");
  });
}

async function refreshChart(
  summaryContainer: HTMLElement,
  chartAllCanvas: HTMLCanvasElement,
  chartFocalCanvas: HTMLCanvasElement,
  tagIds: number[],
  tagNamesStr: string
): Promise<void> {
  let statistics: StatisticsData;

  try {
    statistics = await getStatistics(tagIds);
  } catch (error) {
    ztoolkit.log("Failed to get statistics:", error);
    summaryContainer.textContent = `Failed to load statistics: ${error}`;
    return;
  }

  if (!summaryContainer.ownerDocument) return;
  
  summaryContainer.innerHTML = "";

  const allCard = summaryContainer.ownerDocument.createElement("div");
  allCard.setAttribute("style", "flex: 1; padding: 10px; background: #f5f5f5; border-radius: 4px;");
  allCard.innerHTML = `
    <div style="font-size: 24px; font-weight: bold; color: #DD8452;">${statistics.totalCount.toLocaleString()}</div>
    <div style="font-size: 11px; color: #999;">${statistics.startDate} → ${statistics.endDate}</div>
  `;
  summaryContainer.appendChild(allCard);
  
  const focalCard = summaryContainer.ownerDocument.createElement("div");
  focalCard.setAttribute("style", "flex: 1; padding: 10px; background: #f5f5f5; border-radius: 4px;");
  focalCard.innerHTML = `
    <div style="font-size: 24px; font-weight: bold; color: #4C72B0;">${statistics.focalCount.toLocaleString()}</div>
    <div style="font-size: 11px; color: #999;">${tagNamesStr ? `${getString("ui-tags-prefix")} ${tagNamesStr}` : getString("ui-no-tags")}</div>
  `;
  summaryContainer.appendChild(focalCard);
 
  if (statistics.dailyData.length === 0) {
    const noDataDiv = summaryContainer.ownerDocument.createElement("div");
    noDataDiv.setAttribute("style", "color: #999; padding: 20px;");
    noDataDiv.textContent = getString("ui-no-data");
    summaryContainer.appendChild(noDataDiv);
    return;
  }

  const pubMarkers = await getPublicationMarkers();
  drawPanel(
    chartAllCanvas,
    statistics.dailyData.map(d => d.addedCount),
    statistics.dailyData.map(d => d.cumulativeCount),
    statistics.dailyData.map(d => d.day),
    getString("ui-all-items"),
    pubMarkers,
  );
  drawPanel(
    chartFocalCanvas,
    statistics.dailyData.map(d => d.focalAddedCount),
    statistics.dailyData.map(d => d.focalCumulativeCount),
    statistics.dailyData.map(d => d.day),
    getString("ui-focal-items"),
    pubMarkers,
  );
}

async function exportShareImage(
  win: Window,
  chartAllCanvas: HTMLCanvasElement,
  chartFocalCanvas: HTMLCanvasElement,
  statistics: StatisticsData,
  footerNote: HTMLElement,
): Promise<boolean> {
  const ratio = win.devicePixelRatio || 1;
  const width = Math.max(chartAllCanvas.clientWidth, chartFocalCanvas.clientWidth, 520);
  const panelHeight = Math.max(chartAllCanvas.clientHeight, chartFocalCanvas.clientHeight, 280);
  const headerHeight = 38;
  const gap = 16;
  const footerHeight = 96;

  const outCanvas = win.document.createElement("canvas");
  outCanvas.width = Math.floor(width * ratio);
  outCanvas.height = Math.floor((headerHeight + panelHeight * 2 + gap + footerHeight) * ratio);
  const ctx = outCanvas.getContext("2d");
  if (!ctx) return false;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

  // Header
  ctx.fillStyle = "#111";
  ctx.font = "15px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(getString("ui-main-title"), width / 2, 18);
  ctx.fillStyle = "#666";
  ctx.font = "11px sans-serif";
  ctx.fillText(`${statistics.startDate} → ${statistics.endDate}`, width / 2, 34);

  // Watermark (top-right)
  const logo = await loadLogoImage(win);
  if (logo) {
    const wmSize = 28;
    const wmX = 4;
    const wmY = 4;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.drawImage(logo, wmX, wmY, wmSize, wmSize);
    ctx.restore();
  }

  // Charts
  ctx.drawImage(chartAllCanvas, 0, headerHeight, width, panelHeight);
  ctx.drawImage(chartFocalCanvas, 0, headerHeight + panelHeight + gap, width, panelHeight);

  // Footer note
  const footerText = footerNote.textContent?.trim() || "";
  if (footerText) {
    ctx.fillStyle = "#666";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    const startY = headerHeight + panelHeight * 2 + gap + 12;
    const padX = 6;
    drawWrappedText(ctx, footerText, padX, startY, width - padX * 2, 12, true);
  }

  // Footer branding (single line, locale-aware name)
  const footerBaseY = headerHeight + panelHeight * 2 + gap + 64;
  const brandName = (Zotero.locale || "").startsWith("zh")
    ? getString("ui-brand-zh")
    : getString("ui-brand-en");
  const downloadText = `${getString("ui-download-label")} ${getString("ui-download-url")}`;
  const separator = " | ";
  ctx.font = "10px sans-serif";
  const nameWidth = ctx.measureText(brandName).width;
  const sepWidth = ctx.measureText(separator).width;
  const downloadWidth = ctx.measureText(downloadText).width;
  const logoWidth = logo ? 20 : 0;
  const totalWidth = logoWidth + (logo ? 6 : 0) + nameWidth + sepWidth + downloadWidth;
  let startX = (width - totalWidth) / 2;
  if (logo) {
    ctx.drawImage(logo, startX, footerBaseY - 12, 20, 20);
    startX += 26;
  }
  ctx.fillStyle = "#111";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(brandName, startX, footerBaseY);
  ctx.fillStyle = "#666";
  ctx.fillText(separator, startX + nameWidth, footerBaseY);
  ctx.fillText(downloadText, startX + nameWidth + sepWidth, footerBaseY);

  const dataURL = outCanvas.toDataURL("image/png");
  return await copyImageToClipboard(win, dataURL);
}

async function loadLogoImage(win: Window): Promise<HTMLImageElement | null> {
  return await new Promise((resolve) => {
    const img = new (win as any).Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = `chrome://${config.addonRef}/content/icons/favicon.png`;
  });
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  center = false,
) {
  const words = text.split(" ");
  let line = "";
  let offsetY = 0;
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      if (center) {
        ctx.fillText(line, x + maxWidth / 2, y + offsetY);
      } else {
        ctx.fillText(line, x, y + offsetY);
      }
      line = words[i];
      offsetY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    if (center) {
      ctx.fillText(line, x + maxWidth / 2, y + offsetY);
    } else {
      ctx.fillText(line, x, y + offsetY);
    }
  }
}


async function copyImageToClipboard(win: Window, dataURL: string): Promise<boolean> {
  try {
    const response = await win.fetch(dataURL);
    const blob = await response.blob();
    const { navigator } = win as any;
    if (navigator?.clipboard?.write) {
      const item = new (win as any).ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      return true;
    } else {
      throw new Error("Clipboard API not available");
    }
  } catch (e) {
    ztoolkit.log("Clipboard copy error:", e);
    return false;
  }
}

type PublicationMarkers = {
  days: string[];
  cumulativeByDay: Map<string, number>;
};

async function getPublicationMarkers(): Promise<PublicationMarkers> {
  const libraryID = Zotero.Libraries.userLibraryID;
  const publishDateSql = `
    SELECT itemDataValues.value AS publishDate
    FROM items
    LEFT JOIN itemData ON items.itemID = itemData.itemID
    LEFT JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
    LEFT JOIN fields ON itemData.fieldID = fields.fieldID
    LEFT JOIN itemTypes ON items.itemTypeID = itemTypes.itemTypeID
    WHERE
      fields.fieldName = 'date'
      AND itemTypes.typeName IN ('journalArticle','book','thesis','conferencePaper','patent','preprint')
      AND items.libraryID IN (?)
      AND items.itemID NOT IN (SELECT itemID FROM deletedItems)
      AND items.itemID IN (SELECT itemID FROM publicationsItems)
    ORDER BY items.dateAdded ASC;
  `;
  const addedDateSql = `
    SELECT items.dateAdded AS dateAdded
    FROM items
    LEFT JOIN itemTypes ON items.itemTypeID = itemTypes.itemTypeID
    WHERE
      itemTypes.typeName IN ('journalArticle','book','thesis','conferencePaper','patent','preprint')
      AND items.libraryID IN (?)
      AND items.itemID NOT IN (SELECT itemID FROM deletedItems)
      AND items.itemID IN (SELECT itemID FROM publicationsItems)
    ORDER BY items.dateAdded ASC;
  `;
  let publishDates = (await Zotero.DB.columnQueryAsync(
    publishDateSql,
    [libraryID],
  )) as string[] | null;
  if (!publishDates) publishDates = [];
  let addedDates: string[] = [];
  if (publishDates.length === 0) {
    const added = (await Zotero.DB.columnQueryAsync(
      addedDateSql,
      [libraryID],
    )) as string[] | null;
    addedDates = added ?? [];
  }
  const dayCounts = new Map<string, number>();
  const normalizeDate = (rawValue: string) => {
    const raw = rawValue.trim();
    if (!raw) return "";
    const normalized = raw.replace(/\//g, "-");
    const mYmd = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (mYmd) {
      const yyyy = mYmd[1];
      const mm = String(mYmd[2]).padStart(2, "0");
      const dd = String(mYmd[3]).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    const mYm = normalized.match(/(\d{4})-(\d{1,2})/);
    if (mYm) {
      const yyyy = mYm[1];
      const mm = String(mYm[2]).padStart(2, "0");
      return `${yyyy}-${mm}-01`;
    }
    const mY = normalized.match(/(\d{4})/);
    if (mY) return `${mY[1]}-01-01`;
    const token = normalized.split(/\s+/)[0];
    const parsed = new Date(token);
    if (Number.isNaN(parsed.getTime())) return "";
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const sourceDates = publishDates.length > 0 ? publishDates : addedDates;
  for (const rawValue of sourceDates) {
    const raw = String(rawValue || "").trim();
    if (!raw) continue;
    const day = normalizeDate(raw);
    if (!day) continue;
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  }
  const days = Array.from(dayCounts.keys()).sort();
  ztoolkit.log("publication days sample:", days.slice(0, 5), days.slice(-5));
  const cumulativeByDay = new Map<string, number>();
  let cum = 0;
  for (const day of days) {
    cum += dayCounts.get(day) || 0;
    cumulativeByDay.set(day, cum);
  }
  return { days, cumulativeByDay };
}

function drawPanel(
  canvas: HTMLCanvasElement,
  daily: number[],
  cumulative: number[],
  labels: string[],
  title: string,
  pubMarkers: PublicationMarkers,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const view = canvas.ownerDocument?.defaultView;
  const ratio = view?.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 600;
  const cssHeight = canvas.clientHeight || 280;
  canvas.width = Math.floor(cssWidth * ratio);
  canvas.height = Math.floor(cssHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const width = cssWidth;
  const height = cssHeight;
  const padding = { top: 18, right: 52, bottom: 28, left: 52 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  const maxDaily = Math.max(...daily, 1);
  const maxCum = Math.max(...cumulative, 1);
  const xScale = (i: number) =>
    padding.left + (i / Math.max(labels.length - 1, 1)) * chartWidth;
  const toDate = (value: string) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const getIndexForDay = (day: string) => {
    const idx = labels.indexOf(day);
    if (idx >= 0) return idx;
    const target = toDate(day);
    if (!target) return -1;
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < labels.length; i++) {
      const d = toDate(labels[i]);
      if (!d) continue;
      const diff = Math.abs(d.getTime() - target.getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  };
  const yDaily = (v: number) =>
    padding.top + chartHeight - (v / maxDaily) * chartHeight;
  const yCum = (v: number) =>
    padding.top + chartHeight - (v / maxCum) * chartHeight;

  // Title
  if (title) {
    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(title, padding.left, 12);
  }

  // Grid
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  // Bars: daily
  ctx.fillStyle = "rgba(76, 114, 176, 0.7)";
  const barWidth = chartWidth / Math.max(labels.length, 1);
  for (let i = 0; i < daily.length; i++) {
    const x = xScale(i) - barWidth * 0.45;
    const y = yDaily(daily[i]);
    const h = padding.top + chartHeight - y;
    ctx.fillRect(x, y, Math.max(barWidth * 0.9, 1), h);
  }

  // Line: cumulative
  ctx.beginPath();
  for (let i = 0; i < cumulative.length; i++) {
    const x = xScale(i);
    const y = yCum(cumulative[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = "#DD8452";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fill under line
  ctx.lineTo(xScale(cumulative.length - 1), yCum(0));
  ctx.lineTo(xScale(0), yCum(0));
  ctx.closePath();
  ctx.fillStyle = "rgba(221, 132, 82, 0.12)";
  ctx.fill();

  // Axes labels
  ctx.fillStyle = "#666";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    const value = Math.round(maxDaily * (1 - i / 4));
    ctx.fillText(value.toString(), padding.left - 6, y + 3);
  }
  ctx.textAlign = "left";
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    const value = Math.round(maxCum * (1 - i / 4));
    ctx.fillText(value.toString(), width - padding.right + 6, y + 3);
  }

  // Date labels
  ctx.fillStyle = "#999";
  ctx.textAlign = "center";
  const step = Math.ceil(labels.length / 6);
  for (let i = 0; i < labels.length; i += step) {
    const x = xScale(i);
    const date = new Date(labels[i]);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const label = `${yyyy}-${mm}-${dd}`;
    ctx.fillText(label, x, height - 6);
  }

  // Publication markers
  if (pubMarkers.days.length > 0) {
    ctx.fillStyle = "#2A9D8F";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    let matched = 0;
    for (const day of pubMarkers.days) {
      const idx = getIndexForDay(day);
      if (idx < 0) continue;
      matched += 1;
      const x = xScale(idx);
      const y = yCum(cumulative[idx] || 0);
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const label = pubMarkers.cumulativeByDay.get(day);
      if (label) {
        ctx.fillStyle = "#2A9D8F";
        ctx.fillText(String(label), x + 6, y - 6);
      }
    }
  }

  // Title (top-left of panel)
  if (title) {
    ctx.fillStyle = "#333";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(title, padding.left, 12);
  }

  // Legend (left)
  const legendX = padding.left;
  ctx.fillStyle = "#4C72B0";
  ctx.fillRect(legendX, padding.top - 2, 10, 10);
  ctx.fillStyle = "#333";
  ctx.fillText(getString("ui-daily-added"), legendX + 15, padding.top + 6);
  ctx.fillStyle = "#DD8452";
  ctx.fillRect(legendX, padding.top + 12, 10, 10);
  ctx.fillStyle = "#333";
  ctx.fillText(getString("ui-cumulative"), legendX + 15, padding.top + 20);
  ctx.fillStyle = "#2A9D8F";
  ctx.beginPath();
  ctx.arc(legendX + 5, padding.top + 28, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#333";
  ctx.fillText(getString("ui-my-publications"), legendX + 15, padding.top + 32);
}
