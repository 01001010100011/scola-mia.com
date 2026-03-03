export function slugifyText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildUniqueSlugMap(items, getKey, getLabel) {
  const counts = new Map();
  const slugByKey = new Map();

  const sorted = [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const aTime = new Date(a?.created_at || a?.updated_at || 0).getTime() || 0;
    const bTime = new Date(b?.created_at || b?.updated_at || 0).getTime() || 0;
    if (aTime !== bTime) return aTime - bTime;
    return String(getKey(a) || "").localeCompare(String(getKey(b) || ""));
  });

  for (const item of sorted) {
    const key = String(getKey(item) || "").trim();
    if (!key) continue;

    const base = slugifyText(getLabel(item)) || "contenuto";
    const next = (counts.get(base) || 0) + 1;
    counts.set(base, next);

    const slug = next === 1 ? base : `${base}-${next}`;
    slugByKey.set(key, slug);
  }

  return slugByKey;
}
