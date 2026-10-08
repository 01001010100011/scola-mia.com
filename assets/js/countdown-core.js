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

export function isMaturitaCountdown(event) {
  const slug = String(event?.slug || "").trim().toLowerCase();
  return slug.startsWith("maturita-");
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

function parseDateKey(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function romeOffsetMinutesAt(instant) {
  // Fallback-safe parsing for offset (Safari formatting may differ).
  const offsetText = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    timeZoneName: "shortOffset"
  }).formatToParts(instant).find((part) => part.type === "timeZoneName")?.value || "GMT+1";
  const match = offsetText.replace("UTC", "GMT").match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const sign = match?.[1] === "-" ? -1 : 1;
  return sign * (Number(match?.[2] || 0) * 60 + Number(match?.[3] || 0));
}

function startOfRomeDayUtc(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;
  const utcMidnight = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
  if (Number.isNaN(utcMidnight)) return null;

  // Nei giorni di cambio ora l'offset a mezzogiorno UTC non e quello della
  // mezzanotte locale: il secondo passaggio converge sull'offset corretto.
  const seeded = utcMidnight - romeOffsetMinutesAt(new Date(utcMidnight + 43200000)) * 60000;
  return new Date(utcMidnight - romeOffsetMinutesAt(new Date(seeded)) * 60000);
}

function addDaysToDateKey(dateKey, deltaDays) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return "";
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + deltaDays));
  return Number.isNaN(shifted.getTime()) ? "" : shifted.toISOString().slice(0, 10);
}

function isWeekendDateKey(dateKey) {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return false;
  const weekday = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

const NATIONAL_HOLIDAYS_MONTH_DAY = [
  "01-01",
  "01-06",
  "04-25",
  "05-01",
  "06-02",
  "08-15",
  "11-01",
  "12-08",
  "12-25",
  "12-26"
];

// Vacanze di Pasqua: dal Giovedi Santo al martedi dopo Pasquetta.
const EASTER_BREAK_DAY_OFFSETS = [-3, -2, -1, 0, 1, 2];

// Chiusure deliberate dall'istituto, non derivabili dal calendario civile.
const SCHOOL_CLOSURES_BY_YEAR = {
  2026: ["2026-06-01"]
};

function toDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getEasterSundayDateKey(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return toDateKey(year, Math.floor(n / 31), (n % 31) + 1);
}

export function getExcludedDateKeys(year) {
  const excluded = new Set(NATIONAL_HOLIDAYS_MONTH_DAY.map((monthDay) => `${year}-${monthDay}`));

  const easterKey = getEasterSundayDateKey(year);
  EASTER_BREAK_DAY_OFFSETS.forEach((offset) => excluded.add(addDaysToDateKey(easterKey, offset)));

  (SCHOOL_CLOSURES_BY_YEAR[year] || []).forEach((dateKey) => excluded.add(dateKey));

  return excluded;
}

function getRomeYear(date) {
  const dateKey = toRomeDateKey(date);
  return dateKey ? Number(dateKey.slice(0, 4)) : date.getFullYear();
}

export function getExcludedDateKeysUpTo(targetAt) {
  const now = new Date();
  const target = toDate(targetAt);
  const startYear = getRomeYear(now);
  const endYear = target ? getRomeYear(target) : startYear;
  const excluded = new Set();

  for (let year = Math.min(startYear, endYear); year <= Math.max(startYear, endYear); year += 1) {
    getExcludedDateKeys(year).forEach((dateKey) => excluded.add(dateKey));
  }

  return excluded;
}

function isExcludedRomeDate(dateKey, excludedDateKeys) {
  if (!dateKey) return false;
  return isWeekendDateKey(dateKey) || excludedDateKeys.has(dateKey);
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
    const nextKey = addDaysToDateKey(currentKey, 1);
    const nextDayStart = nextKey ? startOfRomeDayUtc(nextKey) : null;
    if (!dayStart || !nextDayStart) break;

    const segmentStartMs = Math.max(dayStart.getTime(), now.getTime());
    const segmentEndMs = Math.min(nextDayStart.getTime(), eventDateTime.getTime());

    if (segmentEndMs > segmentStartMs && !isExcludedRomeDate(currentKey, excluded)) {
      totalMs += segmentEndMs - segmentStartMs;
    }

    if (currentKey === finalKey) break;
    currentKey = nextKey;
  }

  return Math.max(0, totalMs);
}
