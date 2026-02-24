import { getCountdownEventBySlug } from "./public-api.js";
import { FALLBACK_COUNTDOWN_EVENTS, countdownTitleWithEmoji } from "./countdown-data.js";
import {
  formatTargetDate,
  getExcludedDateKeys2026,
  getRemainingPartsFromMs,
  getRemainingTotalsFromMs,
  getWorkingRemainingMs
} from "./countdown-core.js";

const titleEl = document.getElementById("countdownTitle");
const targetEl = document.getElementById("countdownTarget");
const statusEl = document.getElementById("countdownDetailStatus");
const detailCardEl = document.getElementById("countdownDetailCard");
const valuesWrap = document.getElementById("countdownValues");
const daysEl = document.getElementById("valueDays");
const hoursEl = document.getElementById("valueHours");
const minutesEl = document.getElementById("valueMinutes");
const secondsEl = document.getElementById("valueSeconds");
const totalsWrap = document.getElementById("countdownTotals");
const totalHoursEl = document.getElementById("totalHours");
const totalMinutesEl = document.getElementById("totalMinutes");
const totalSecondsEl = document.getElementById("totalSeconds");
const workingModeToggleEl = document.getElementById("workingCountdownToggle");
const workingInfoBtnEl = document.getElementById("workingCountdownInfo");
const workingInfoPopoverEl = document.getElementById("workingCountdownInfoPopover");

let timer = null;
let currentEvent = null;
let workingModeEnabled = false;
let workingExcludedDateKeys2026 = getExcludedDateKeys2026();

function isMaturitaCountdownLocal(event) {
  const slug = String(event?.slug || "").trim().toLowerCase();
  return slug.startsWith("maturita-");
}

function formatTargetDateTimeLocal(targetAt) {
  const date = new Date(targetAt);
  if (Number.isNaN(date.getTime())) return formatTargetDate(targetAt);
  const dateLabel = formatTargetDate(targetAt);
  const timeLabel = date.toLocaleTimeString("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${dateLabel} · ${timeLabel}`;
}

function setStatus(message = "") {
  if (!message) {
    statusEl.textContent = "";
    statusEl.classList.add("hidden");
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.remove("hidden");
}

function setZeroCountdowns() {
  daysEl.textContent = "0";
  hoursEl.textContent = "00";
  minutesEl.textContent = "00";
  secondsEl.textContent = "00";
  totalHoursEl.textContent = "Mancano 0 ore";
  totalMinutesEl.textContent = "Mancano 0 minuti";
  totalSecondsEl.textContent = "Mancano 0 secondi";
  totalsWrap.classList.remove("hidden");
  valuesWrap.classList.remove("opacity-40");
}

function stopTicker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function animateModeSwitch() {
  [detailCardEl, valuesWrap, totalsWrap].forEach((node) => {
    if (!node) return;
    node.classList.remove("mode-anim");
    void node.offsetWidth;
    node.classList.add("mode-anim");
  });
}

function getNormalRemainingMs(event) {
  const targetMs = new Date(event?.target_at || "").getTime();
  if (Number.isNaN(targetMs)) return 0;
  return Math.max(0, targetMs - Date.now());
}

function getActiveRemainingMs(event) {
  if (!workingModeEnabled) return getNormalRemainingMs(event);
  return getWorkingRemainingMs(new Date(), event.target_at, workingExcludedDateKeys2026);
}

function renderCountdownFromDiffMs(diffMs) {
  const parts = getRemainingPartsFromMs(diffMs);
  const totals = getRemainingTotalsFromMs(diffMs);

  if (!parts || !totals) {
    setZeroCountdowns();
    return;
  }

  daysEl.textContent = String(parts.days);
  hoursEl.textContent = String(parts.hours).padStart(2, "0");
  minutesEl.textContent = String(parts.minutes).padStart(2, "0");
  secondsEl.textContent = String(parts.seconds).padStart(2, "0");
  totalsWrap.classList.remove("hidden");
  totalHoursEl.textContent = `Mancano ${totals.hoursTotal} ore`;
  totalMinutesEl.textContent = `Mancano ${totals.minutesTotal} minuti`;
  totalSecondsEl.textContent = `Mancano ${totals.secondsTotal} secondi`;
}

function renderTick(event) {
  const normalMs = getNormalRemainingMs(event);
  const effectiveMs = getActiveRemainingMs(event);

  renderCountdownFromDiffMs(effectiveMs);

  if (normalMs <= 0) {
    setStatus("Evento concluso");
    return;
  }

  // In modalita lavorativa e con evento in giorno escluso si arriva a 0 prima dell'evento:
  // nessun messaggio aggiuntivo, solo valori fermi a zero.
  setStatus("");
}

async function loadEvent(slug) {
  try {
    const dbEvent = await getCountdownEventBySlug(slug);
    if (dbEvent) return dbEvent;
  } catch (error) {
    console.warn("Fallback dettaglio countdown:", error);
  }
  return FALLBACK_COUNTDOWN_EVENTS.find((event) => event.slug === slug) || null;
}

function storageKeyForEvent(event) {
  const stableId = event?.id || event?.slug || "unknown";
  return `countdown-working-mode:${stableId}`;
}

function readWorkingModePreference(event) {
  try {
    return localStorage.getItem(storageKeyForEvent(event)) === "1";
  } catch (_) {
    return false;
  }
}

function writeWorkingModePreference(event, enabled) {
  try {
    localStorage.setItem(storageKeyForEvent(event), enabled ? "1" : "0");
  } catch (_) {
    // ignore storage failures
  }
}

function mountWorkingModeToggle(event) {
  if (!workingModeToggleEl) return;
  workingModeEnabled = readWorkingModePreference(event);
  workingModeToggleEl.checked = workingModeEnabled;

  workingModeToggleEl.addEventListener("change", () => {
    workingModeEnabled = workingModeToggleEl.checked;
    writeWorkingModePreference(event, workingModeEnabled);
    animateModeSwitch();
    renderTick(event);
  });
}

function setInfoPopoverOpen(open) {
  if (!workingInfoPopoverEl || !workingInfoBtnEl) return;
  workingInfoPopoverEl.classList.toggle("hidden", !open);
  workingInfoBtnEl.setAttribute("aria-expanded", open ? "true" : "false");
}

function mountWorkingInfoPopover() {
  if (!workingInfoBtnEl || !workingInfoPopoverEl) return;

  const togglePopover = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const isHidden = workingInfoPopoverEl.classList.contains("hidden");
    setInfoPopoverOpen(isHidden);
  };

  workingInfoBtnEl.addEventListener("click", togglePopover);
  workingInfoBtnEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") togglePopover(event);
  });

  workingInfoPopoverEl.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => setInfoPopoverOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setInfoPopoverOpen(false);
  });
}

async function bootstrap() {
  const slug = new URLSearchParams(window.location.search).get("id");
  if (!slug) {
    statusEl.textContent = "Evento non trovato.";
    statusEl.classList.remove("hidden");
    valuesWrap.classList.add("hidden");
    return;
  }

  const event = await loadEvent(slug);
  if (!event) {
    statusEl.textContent = "Evento non trovato.";
    statusEl.classList.remove("hidden");
    valuesWrap.classList.add("hidden");
    return;
  }

  currentEvent = event;
  titleEl.textContent = countdownTitleWithEmoji(event);
  targetEl.textContent = isMaturitaCountdownLocal(event)
    ? formatTargetDateTimeLocal(event.target_at)
    : formatTargetDate(event.target_at);
  mountWorkingModeToggle(event);
  mountWorkingInfoPopover();
  renderTick(event);

  timer = setInterval(() => renderTick(event), 1000);
}

bootstrap();
