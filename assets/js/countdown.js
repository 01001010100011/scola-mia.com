import { countdownDateTokens, getCountdownEvents, queryMatches } from "./public-api.js";
import {
  FEATURED_COUNTDOWN_SLUG,
  FALLBACK_COUNTDOWN_EVENTS,
  countdownTitleWithEmoji,
  onlyFutureEvents,
  sortCountdownEvents
} from "./countdown-data.js";
import { formatCountdown, formatTargetDate } from "./countdown-core.js";

const featuredEl = document.getElementById("featuredCountdown");
const listEl = document.getElementById("countdownList");
const searchInput = document.getElementById("countdownSearchInput");
const searchForm = document.getElementById("countdownSearchForm");

let allEvents = [];
let visibleEvents = [];
let activeQuery = "";
let timer = null;

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

function eventSearchSource(event) {
  return `${countdownTitleWithEmoji(event)} ${countdownDateTokens(event.target_at)}`;
}

function filterEvents(events, query) {
  const q = String(query || "").trim();
  if (!q) return events;
  return events.filter((event) => queryMatches(eventSearchSource(event), q));
}

function renderCard(event, isFeatured = false) {
  const dateLabel = isMaturitaCountdownLocal(event) ? formatTargetDateTimeLocal(event.target_at) : formatTargetDate(event.target_at);
  return `
    <a href="/countdown-detail/?id=${encodeURIComponent(event.slug)}" class="block border-2 border-black ${isFeatured ? "bg-black text-white p-6 md:p-8" : "bg-white p-4"} shadow-brutal lift transition-all">
      <h3 class="${isFeatured ? "headline text-6xl mt-1" : "headline text-4xl mt-1"}">${countdownTitleWithEmoji(event)}</h3>
      <p data-countdown-value="${event.slug}" class="${isFeatured ? "mt-4 text-2xl font-bold" : "mt-3 text-lg font-bold"}">${formatCountdown(event.target_at)}</p>
      <p class="${isFeatured ? "mt-3 text-sm opacity-80" : "mt-2 text-xs uppercase font-semibold text-slate-500"}">${dateLabel}</p>
      <span class="${isFeatured ? "inline-block mt-4 text-xs font-bold uppercase underline opacity-90" : "inline-block mt-3 text-xs font-bold uppercase underline"}">Vedi dettagli</span>
    </a>
  `;
}

function renderState() {
  const futureSorted = sortCountdownEvents(onlyFutureEvents(allEvents));
  const filtered = filterEvents(futureSorted, activeQuery);
  visibleEvents = filtered;

  if (!filtered.length) {
    featuredEl.innerHTML = "";
    listEl.innerHTML = '<div class="border-2 border-black bg-white p-4">Nessun countdown trovato con i filtri correnti.</div>';
    return;
  }

  const featured = filtered.find((event) => event.slug === FEATURED_COUNTDOWN_SLUG || event.featured) || filtered[0];
  const others = filtered.filter((event) => event.slug !== featured.slug);

  featuredEl.innerHTML = renderCard(featured, true);
  listEl.innerHTML = others.length
    ? others.map((event) => renderCard(event)).join("")
    : '<div class="border-2 border-black bg-white p-4">Nessun altro countdown futuro.</div>';
}

function updateEventNodes(event) {
  const valueNode = document.querySelector(`[data-countdown-value="${event.slug}"]`);
  if (!valueNode) return;

  const compact = formatCountdown(event.target_at);
  if (compact === "Evento concluso") {
    valueNode.textContent = "Evento concluso";
    return;
  }

  valueNode.textContent = compact;
}

function updateCountdownValues() {
  visibleEvents.forEach((event) => updateEventNodes(event));
}

function mountTicker() {
  if (timer) clearInterval(timer);

  timer = setInterval(() => {
    allEvents = onlyFutureEvents(allEvents);
    if (!allEvents.length) {
      featuredEl.innerHTML = "";
      listEl.innerHTML = '<div class="border-2 border-black bg-white p-4">Nessun countdown futuro disponibile.</div>';
      clearInterval(timer);
      timer = null;
      return;
    }

    updateCountdownValues();
    renderState();
  }, 60000);
}

async function loadEvents() {
  try {
    const dbEvents = await getCountdownEvents();
    return dbEvents;
  } catch (error) {
    console.warn("Fallback countdown events attivato:", error);
    return FALLBACK_COUNTDOWN_EVENTS;
  }
}

async function bootstrap() {
  allEvents = await loadEvents();
  allEvents = onlyFutureEvents(allEvents);

  if (!allEvents.length) {
    featuredEl.innerHTML = "";
    listEl.innerHTML = '<div class="border-2 border-black bg-white p-4">Nessun countdown futuro disponibile.</div>';
    return;
  }

  if (searchForm) {
    searchForm.addEventListener("submit", (event) => event.preventDefault());
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      activeQuery = searchInput.value.trim();
      renderState();
    });
  }

  renderState();
  mountTicker();
}

bootstrap();
