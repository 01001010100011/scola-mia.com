import { getAgendaEvents } from "./public-api.js?v=20261006a";
import { escapeHtml, formatLocalDate } from "./supabase-client.js?v=20261006a";
import { agendaSortValue, buildAgendaSlugMap, buildAgendaUrl, normalizeAgendaDateInput } from "./agenda-url.js?v=20261006a";

const listEl = document.getElementById("agendaList");
const searchInput = document.getElementById("agendaSearchInput");
let events = [];
let agendaSlugMap = new Map();

function agendaDateTokens(value) {
  const normalized = normalizeAgendaDateInput(value);
  if (!normalized) return String(value || "");
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) return normalized;
  return [
    normalized,
    date.toLocaleDateString("it-IT"),
    date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }),
    date.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })
  ].join(" ");
}

function render(query = "") {
  const q = query.trim().toLowerCase();
  const filtered = !q
    ? events
    : events.filter((event) => `${agendaDateTokens(event.date)} ${event.title} ${event.category} ${event.description}`.toLowerCase().includes(q));

  listEl.innerHTML = filtered.length
    ? filtered.map((event) => {
      const dateLabel = formatLocalDate(normalizeAgendaDateInput(event.date)) || "Data non valida";
      return `
        <a href="${escapeHtml(buildAgendaUrl(event, agendaSlugMap))}" class="block border-2 border-black bg-white p-4 shadow-brutal hover:-translate-y-0.5 transition-transform">
          <p class="text-xs uppercase font-bold text-accent">${escapeHtml(event.category)}</p>
          <h3 class="mt-2 text-lg font-semibold">${escapeHtml(event.title)}</h3>
          <p class="mt-2 text-sm">${escapeHtml(event.description)}</p>
          <p class="mt-3 text-[11px] uppercase font-bold text-slate-500">${escapeHtml(dateLabel)}</p>
          <span class="inline-block mt-3 text-xs font-bold uppercase underline">Apri evento</span>
        </a>
      `;
    }).join("")
    : '<div class="md:col-span-3 border-2 border-black bg-white p-4">Nessun evento trovato per questa ricerca.</div>';
}

async function bootstrap() {
  try {
    events = await getAgendaEvents();
    events = events.sort((a, b) => agendaSortValue(a.date) - agendaSortValue(b.date));
    agendaSlugMap = buildAgendaSlugMap(events);
  } catch (error) {
    console.error(error);
    listEl.innerHTML = '<div class="md:col-span-3 border-2 border-black bg-white p-4">Errore caricamento agenda.</div>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") || "";
  searchInput.value = initialQuery;

  document.getElementById("agendaSearchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    const url = query ? `/agenda/?q=${encodeURIComponent(query)}` : "/agenda/";
    history.replaceState(null, "", url);
    render(query);
  });

  searchInput.addEventListener("input", () => render(searchInput.value));
  render(initialQuery);
}

bootstrap();
