// Set your Cloudflare Web Analytics token here.
// Find it in Cloudflare Dashboard -> Web Analytics -> Add site.
const CLOUDFLARE_ANALYTICS_TOKEN = "";

function getToken() {
  const runtimeToken = document.documentElement?.dataset?.cfAnalyticsToken || "";
  return (runtimeToken || CLOUDFLARE_ANALYTICS_TOKEN || "").trim();
}

export function initCloudflareAnalytics() {
  const token = getToken();
  if (!token) return;

  if (document.querySelector('script[src*="static.cloudflareinsights.com/beacon.min.js"]')) {
    return;
  }

  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute("data-cf-beacon", JSON.stringify({ token }));
  document.head.appendChild(script);
}

