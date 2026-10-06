import { supabase, toSlugSafeName } from "./supabase-client.js?v=20260224e";

const BUCKET = "article-media";
const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1080;
const OUTPUT_IMAGE_TYPE = "image/jpeg";
const OUTPUT_IMAGE_QUALITY = 0.9;

export function getResizedDimensions(width, height) {
  const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Impossibile esportare l'immagine normalizzata."));
    }, type, quality);
  });
}

async function readImageBitmap(source) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(source);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossibile leggere l'immagine selezionata."));
    img.src = URL.createObjectURL(source);
  });
}

function getSourceDimensions(source) {
  return {
    width: source.width || source.videoWidth || 1,
    height: source.height || source.videoHeight || 1
  };
}

export async function normalizeImageFile(file, baseName = "") {
  const source = await readImageBitmap(file);
  const sourceDims = getSourceDimensions(source);
  const targetDims = getResizedDimensions(sourceDims.width, sourceDims.height);
  const canvas = document.createElement("canvas");
  canvas.width = targetDims.width;
  canvas.height = targetDims.height;

  const ctx = canvas.getContext("2d", { alpha: false, colorSpace: "srgb" });
  if (!ctx) throw new Error("Impossibile inizializzare il motore grafico per la normalizzazione.");
  ctx.drawImage(source, 0, 0, targetDims.width, targetDims.height);

  if (typeof source.close === "function") {
    source.close();
  }

  const blob = await canvasToBlob(canvas, OUTPUT_IMAGE_TYPE, OUTPUT_IMAGE_QUALITY);
  const cleanBase = toSlugSafeName(baseName || file.name || "immagine").replace(/\.[a-z0-9]+$/i, "");
  const normalizedName = `${cleanBase || "immagine"}-fhd-sdr.jpg`;
  const normalizedFile = new File([blob], normalizedName, {
    type: OUTPUT_IMAGE_TYPE,
    lastModified: Date.now()
  });

  return {
    file: normalizedFile,
    width: targetDims.width,
    height: targetDims.height,
    resized: targetDims.width !== sourceDims.width || targetDims.height !== sourceDims.height,
    sourceWidth: sourceDims.width,
    sourceHeight: sourceDims.height
  };
}

async function normalizeRemoteImage(url, baseName = "immagine") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Download immagine fallito.");
  const blob = await response.blob();
  const file = new File([blob], `${toSlugSafeName(baseName)}.bin`, { type: blob.type || "image/jpeg" });
  return normalizeImageFile(file, baseName);
}

async function uploadToStoragePath(path, file) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

function buildNormalizedImagePath(articleId, title = "") {
  const stamp = Date.now();
  const cleanTitle = toSlugSafeName(title || `article-${articleId}`) || `article-${articleId}`;
  return `articles/${articleId}/images/${stamp}-${cleanTitle}-fhd-sdr.jpg`;
}

function withCacheBust(url) {
  if (!url) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}v=${Date.now()}`;
}

export async function normalizeAllArticleImages({ onProgress } = {}) {
  const { data: rows, error } = await supabase
    .from("articles")
    .select("id,title,image_url,image_path")
    .not("image_url", "is", null);
  if (error) throw error;

  const items = (rows || []).filter((item) => item.image_url);
  let done = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const normalized = await normalizeRemoteImage(item.image_url, item.title || item.id);
      const targetPath = buildNormalizedImagePath(item.id, item.title);
      const uploaded = await uploadToStoragePath(targetPath, normalized.file);
      const { error: updateErr } = await supabase
        .from("articles")
        .update({ image_url: withCacheBust(uploaded.url), image_path: uploaded.path, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (updateErr) throw updateErr;
      done += 1;
    } catch (itemError) {
      console.error("Normalizzazione immagine fallita per articolo:", item.id, itemError);
      failed += 1;
    }
    onProgress?.({ done, failed, total: items.length });
  }

  return { done, failed, total: items.length };
}
