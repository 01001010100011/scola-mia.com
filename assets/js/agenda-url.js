import { buildUniqueSlugMap, slugifyText } from "./slug-utils.js?v=20261006a";

export function normalizeAgendaDateInput(value, { keepRaw = false } = {}) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (iso) return iso[1];
  const dmy = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return keepRaw ? raw : "";
}

export function agendaSortValue(value) {
  const normalized = normalizeAgendaDateInput(value);
  if (!normalized) return Number.POSITIVE_INFINITY;
  const time = new Date(`${normalized}T00:00:00`).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function slugifyAgendaTitle(title) {
  return slugifyText(title);
}

export function buildAgendaSlugMap(events) {
  return buildUniqueSlugMap(
    Array.isArray(events) ? events : [],
    (event) => event?.id,
    (event) => event?.title
  );
}

export function getAgendaSlug(event, slugMap = null) {
  const id = String(event?.id || "").trim();
  if (slugMap instanceof Map && id && slugMap.has(id)) return slugMap.get(id);
  return slugifyAgendaTitle(event?.title) || "evento";
}

export function buildAgendaUrl(event, slugMap = null) {
  const slug = getAgendaSlug(event, slugMap);
  return `/agenda/${encodeURIComponent(slug)}/`;
}
