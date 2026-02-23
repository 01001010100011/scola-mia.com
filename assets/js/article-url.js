export function slugifyArticleTitle(title) {
  return String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildArticleUrl(id, title) {
  const params = new URLSearchParams();
  params.set("id", String(id || ""));
  const slug = slugifyArticleTitle(title);
  if (slug) params.set("slug", slug);
  return `article.html?${params.toString()}`;
}
