import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SUPABASE_CONFIG_PATH = path.join(ROOT, "assets", "js", "supabase-config.js");
const DOMAIN_FALLBACK = "scola-mia.com";

export async function resolveDomain() {
  try {
    const value = (await fs.readFile(path.join(ROOT, "CNAME"), "utf8")).trim();
    return value || DOMAIN_FALLBACK;
  } catch {
    return DOMAIN_FALLBACK;
  }
}

export async function readSupabaseConfig() {
  const source = await fs.readFile(SUPABASE_CONFIG_PATH, "utf8");
  const urlMatch = source.match(/SUPABASE_URL\s*=\s*"([^"]+)"/);
  const keyMatch = source.match(/SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/);
  if (!urlMatch?.[1] || !keyMatch?.[1]) {
    throw new Error("Impossibile leggere SUPABASE_URL/SUPABASE_ANON_KEY da assets/js/supabase-config.js");
  }
  return { url: urlMatch[1], key: keyMatch[1] };
}
