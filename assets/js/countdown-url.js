export function buildCountdownUrl(event) {
  const slug = String(event?.slug || "").trim();
  if (!slug) return "/countdown/";
  return `/countdown/${encodeURIComponent(slug)}/`;
}
