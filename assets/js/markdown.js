import { marked } from "https://cdn.jsdelivr.net/npm/marked@18/lib/marked.esm.js";

const renderer = new marked.Renderer();

const LINK_SCHEME_ALLOWLIST = ["http:", "https:", "mailto:", "tel:"];

// Immagini inline in base64 ammesse, escluso SVG perche puo contenere script.
const DATA_IMAGE_ALLOWLIST = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i;

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hasUrlScheme(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function isSafeLinkUrl(url) {
  if (!hasUrlScheme(url)) return true;
  return LINK_SCHEME_ALLOWLIST.some((scheme) => url.toLowerCase().startsWith(scheme));
}

function isSafeImageUrl(url) {
  if (!hasUrlScheme(url)) return true;
  if (DATA_IMAGE_ALLOWLIST.test(url)) return true;
  return isSafeLinkUrl(url);
}

renderer.link = ({ href, title, text }) => {
  const url = String(href ?? "").trim();
  if (!isSafeLinkUrl(url)) return text;

  const titleAttr = title ? ` title="${escapeAttribute(title)}"` : "";
  const externalAttr = /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener"' : "";
  return `<a href="${escapeAttribute(url)}"${externalAttr}${titleAttr} class="underline">${text}</a>`;
};

renderer.image = ({ href, title, text }) => {
  const url = String(href ?? "").trim();
  if (!isSafeImageUrl(url)) return escapeAttribute(text || "");

  const titleAttr = title ? ` title="${escapeAttribute(title)}"` : "";
  return `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(text || "")}"${titleAttr} loading="lazy" />`;
};

// L'HTML scritto a mano nel corpo dell'articolo viene mostrato come testo, non eseguito.
renderer.html = ({ text }) => escapeAttribute(text).replace(/\n/g, "<br>");

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer
});

export function markdownToHtml(markdown) {
  return marked.parse(String(markdown || ""));
}
