function toDate(targetAt) {
  const date = new Date(targetAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDiffMs(targetAt) {
  const date = toDate(targetAt);
  if (!date) return null;
  return date.getTime() - Date.now();
}

function getPartsFromDiffMs(diffMs) {
  if (diffMs === null || diffMs === undefined) return null;
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function getTotalsFromDiffMs(diffMs) {
  if (diffMs === null || diffMs === undefined) return null;
  if (diffMs <= 0) return null;

  return {
    hoursTotal: Math.floor(diffMs / 3600000),
    minutesTotal: Math.floor(diffMs / 60000),
    secondsTotal: Math.floor(diffMs / 1000)
  };
}

export function getRemainingParts(targetAt) {
  return getPartsFromDiffMs(getDiffMs(targetAt));
}

export function getRemainingTotals(targetAt) {
  return getTotalsFromDiffMs(getDiffMs(targetAt));
}

export function formatCountdown(targetAt) {
  const parts = getRemainingParts(targetAt);
  if (!parts) return "Evento concluso";

  const labels = [
    parts.days > 0 ? `${parts.days} ${parts.days === 1 ? "giorno" : "giorni"}` : null,
    parts.hours > 0 ? `${parts.hours} ${parts.hours === 1 ? "ora" : "ore"}` : null,
    parts.minutes > 0 ? `${parts.minutes} ${parts.minutes === 1 ? "minuto" : "minuti"}` : null
  ].filter(Boolean);

  if (!labels.length) return "meno di 1 minuto";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} e ${labels[2]}`;
}

export function getRemainingPartsFromMs(diffMs) {
  return getPartsFromDiffMs(diffMs);
}

export function getRemainingTotalsFromMs(diffMs) {
  return getTotalsFromDiffMs(diffMs);
}

export function formatTargetDate(targetAt) {
  const date = toDate(targetAt);
  if (!date) return "";
  return date.toLocaleDateString("it-IT", {
    timeZone: "Europe/Rome",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

export function formatTargetDateTime(targetAt) {
  const date = toDate(targetAt);
  if (!date) return "";
  const dateLabel = formatTargetDate(targetAt);
  const timeLabel = date.toLocaleTimeString("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${dateLabel} · ${timeLabel}`;
}

export function toRomeDateKey(input) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function startOfRomeDayUtc(dateKey) {
  const [yearStr, monthStr, dayStr] = String(dateKey || "").split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return null;
  const utcMidday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(utcMidday.getTime())) return null;
  // Fallback-safe parsing for offset (Safari formatting may differ).
  const offsetText = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    timeZoneName: "shortOffset"
  }).formatToParts(utcMidday).find((part) => part.type === "timeZoneName")?.value || "GMT+1";
  const match = offsetText.replace("UTC", "GMT").match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const sign = match?.[1] === "-" ? -1 : 1;
  const h = Number(match?.[2] || 0);
  const m = Number(match?.[3] || 0);
  const totalOffsetMinutes = sign * (h * 60 + m);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - totalOffsetMinutes * 60000);
}

function addRomeDateKey(dateKey, deltaDays) {
  const base = startOfRomeDayUtc(dateKey);
  if (!base) return "";
  const shifted = new Date(base.getTime() + deltaDays * 86400000);
  return toRomeDateKey(shifted);
}

function isRomeWeekend(dateKey) {
  const dayStart = startOfRomeDayUtc(dateKey);
  if (!dayStart) return false;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    weekday: "short"
  }).format(dayStart);
  return weekday === "Sat" || weekday === "Sun";
}

export function getExcludedDateKeys2026() {
  const excluded = new Set([
    // Festivi nazionali IT 2026 (solo giornate intere)
    "2026-01-01",
    "2026-01-06",
    "2026-04-05",
    "2026-04-06",
    "2026-04-25",
    "2026-05-01",
    "2026-06-02",
    "2026-08-15",
    "2026-11-01",
    "2026-12-08",
    "2026-12-25",
    "2026-12-26"
  ]);

  // Esclusioni personalizzate 2026 (con unicita garantita dal Set)
  let current = "2026-04-02";
  const end = "2026-04-07";
  while (current && current <= end) {
    excluded.add(current);
    current = addRomeDateKey(current, 1);
  }
  excluded.add("2026-06-01");

  return excluded;
}

function isExcludedRomeDate(dateKey, excludedDateKeys) {
  if (!dateKey) return false;
  return isRomeWeekend(dateKey) || excludedDateKeys.has(dateKey);
}

export function getWorkingRemainingMs(nowInput, eventDateTimeInput, excludedDateKeys) {
  const now = nowInput instanceof Date ? nowInput : new Date(nowInput);
  const eventDateTime = eventDateTimeInput instanceof Date ? eventDateTimeInput : new Date(eventDateTimeInput);
  if (Number.isNaN(now.getTime()) || Number.isNaN(eventDateTime.getTime())) return 0;
  if (eventDateTime.getTime() <= now.getTime()) return 0;

  const excluded = excludedDateKeys instanceof Set ? excludedDateKeys : new Set(excludedDateKeys || []);

  let totalMs = 0;
  let currentKey = toRomeDateKey(now);
  const finalKey = toRomeDateKey(eventDateTime);
  if (!currentKey || !finalKey) return 0;

  while (currentKey && currentKey <= finalKey) {
    const dayStart = startOfRomeDayUtc(currentKey);
    if (!dayStart) break;
    const nextDayStart = new Date(dayStart.getTime() + 86400000);

    const segmentStartMs = Math.max(dayStart.getTime(), now.getTime());
    const segmentEndMs = Math.min(nextDayStart.getTime(), eventDateTime.getTime());

    if (segmentEndMs > segmentStartMs && !isExcludedRomeDate(currentKey, excluded)) {
      totalMs += segmentEndMs - segmentStartMs;
    }

    if (currentKey === finalKey) break;
    currentKey = addRomeDateKey(currentKey, 1);
  }

  return Math.max(0, totalMs);
}
