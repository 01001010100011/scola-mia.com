export const FEATURED_COUNTDOWN_SLUG = "termine-lezioni";

export const FALLBACK_COUNTDOWN_EVENTS = [
  { slug: "vacanze-pasquali-2026", title: "Vacanze di Pasqua", target_at: "2026-04-02T00:00:00+02:00", featured: false, active: true },
  { slug: "festa-lavoro-2026", title: "Festa del Lavoro", target_at: "2026-05-01T00:00:00+02:00", featured: false, active: true },
  { slug: "primo-giugno-2026", title: "1 giugno", target_at: "2026-06-01T00:00:00+02:00", featured: false, active: true },
  { slug: "festa-repubblica-2026", title: "Festa della Repubblica", target_at: "2026-06-02T00:00:00+02:00", featured: false, active: true },
  { slug: "termine-lezioni", title: "Fine della scuola", target_at: "2026-06-08T00:00:00+02:00", featured: true, active: true }
];

const COUNTDOWN_EMOJI_BY_SLUG = {
  "termine-lezioni": "📚",
  "vacanze-pasquali-2026": "🥚",
  "vacanze-natale-2025": "🎄",
  "festa-lavoro-2026": "🧑‍🏭",
  "festa-repubblica-2026": "🇮🇹",
  "primo-giugno-2026": "📅",
  "immacolata-concezione-2025": "🕊️"
};

export function countdownEmoji(event) {
  const slug = String(event?.slug || "").trim().toLowerCase();
  if (slug && COUNTDOWN_EMOJI_BY_SLUG[slug]) return COUNTDOWN_EMOJI_BY_SLUG[slug];

  const title = String(event?.title || "").trim().toLowerCase();
  if (title.includes("pasqua")) return "🥚";
  if (title.includes("natale")) return "🎄";
  if (title.includes("lavoro")) return "🧑‍🏭";
  if (title.includes("repubblica")) return "🇮🇹";
  if (title.includes("immacolata")) return "🕊️";
  if (title.includes("scuola") || title.includes("lezioni")) return "📚";
  if (title.includes("giugno")) return "📅";
  return "⏳";
}

export function countdownTitleWithEmoji(event) {
  const title = String(event?.title || "").trim();
  if (!title) return "";
  return `${countdownEmoji(event)} ${title}`;
}

export function onlyFutureEvents(events) {
  const now = Date.now();
  return events.filter((event) => {
    const date = new Date(event.target_at);
    return !Number.isNaN(date.getTime()) && date.getTime() > now;
  });
}

export function sortCountdownEvents(events) {
  const sorted = [...events].sort((a, b) => new Date(a.target_at).getTime() - new Date(b.target_at).getTime());
  const featuredIndex = sorted.findIndex((event) => event.slug === FEATURED_COUNTDOWN_SLUG || event.featured);
  if (featuredIndex > 0) {
    const [featured] = sorted.splice(featuredIndex, 1);
    sorted.unshift(featured);
  }
  return sorted;
}
