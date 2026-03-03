import { buildUniqueSlugMap, slugifyText } from "./slug-utils.js?v=20260303a";

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
