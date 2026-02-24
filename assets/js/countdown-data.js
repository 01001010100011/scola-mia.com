export const FEATURED_COUNTDOWN_SLUG = "termine-lezioni";

export const FALLBACK_COUNTDOWN_EVENTS = [
  { slug: "vacanze-pasquali-2026", title: "Vacanze di Pasqua", emoji: "🥚", target_at: "2026-04-02T00:00:00+02:00", featured: false, active: true },
  { slug: "festa-lavoro-2026", title: "Festa del Lavoro", emoji: "🧑‍🏭", target_at: "2026-05-01T00:00:00+02:00", featured: false, active: true },
  { slug: "primo-giugno-2026", title: "1 giugno", emoji: "📅", target_at: "2026-06-01T00:00:00+02:00", featured: false, active: true },
  { slug: "festa-repubblica-2026", title: "Festa della Repubblica", emoji: "🇮🇹", target_at: "2026-06-02T00:00:00+02:00", featured: false, active: true },
  { slug: "termine-lezioni", title: "Fine della scuola", emoji: "📚", target_at: "2026-06-08T00:00:00+02:00", featured: true, active: true },
  { slug: "maturita-prima-prova-2026", title: "Prima prova scritta (Italiano)", emoji: "📘", target_at: "2026-06-18T08:30:00+02:00", featured: false, active: true },
  { slug: "maturita-seconda-prova-2026", title: "Seconda prova scritta (indirizzo)", emoji: "📗", target_at: "2026-06-19T08:30:00+02:00", featured: false, active: true },
  { slug: "maturita-orali-2026", title: "Orali (tutti gli indirizzi) - stima inizio", emoji: "📕", target_at: "2026-06-22T08:30:00+02:00", featured: false, active: true },
  { slug: "maturita-suppletiva-scritti-2026", title: "Suppletiva (scritti)", emoji: "📙", target_at: "2026-07-01T08:30:00+02:00", featured: false, active: true }
];

export function countdownTitleWithEmoji(event) {
  const title = String(event?.title || "").trim();
  if (!title) return "";
  const emoji = String(event?.emoji || "").trim();
  return emoji ? `${emoji} ${title}` : title;
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
