export interface FirecrawlBrandData {
  name: string | null;
  colors: {
    primary: string | null;
    accent: string | null;
    background: string | null;
    textPrimary: string | null;
    link: string | null;
  };
  fonts: { family: string; role: string }[];
  ogImage: string | null;
  favicon: string | null;
  buttonPrimary: {
    background: string;
    textColor: string;
    borderRadius: string;
  } | null;
}

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";

// Server-side scrape timeout (ms). Firecrawl honors this and returns an
// error fast instead of hanging. Their default is 60s; we want to fail
// faster than that and let the caller fall back gracefully.
const SCRAPE_TIMEOUT_MS = 15_000;
// Client-side abort, slightly longer than the server-side timeout so
// Firecrawl gets a chance to return its own timeout error first.
const FETCH_ABORT_MS = SCRAPE_TIMEOUT_MS + 3_000;

async function firecrawlFetch(body: Record<string, unknown>) {
  if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_ABORT_MS);
  try {
    return await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({ timeout: SCRAPE_TIMEOUT_MS, ...body }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Scrape a page for outbound links to discover the real business domain.
 * Used when Google Places websiteUri points to a booking platform.
 */
export async function scrapeForBusinessDomain(
  url: string,
  businessName: string,
): Promise<string | null> {
  if (!FIRECRAWL_API_KEY) return null;

  try {
    const res = await firecrawlFetch({ url, formats: ["links"] });
    if (!res.ok) return null;

    const json = await res.json();
    const links: string[] = json.data?.links ?? [];

    const SKIP_DOMAINS = new Set([
      'google.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
      'tiktok.com', 'youtube.com', 'linkedin.com', 'pinterest.com',
      'dinnerbooking.com', 'easytablebooking.com', 'opentable.com', 'bookatable.com',
      'resy.com', 'yelp.com', 'tripadvisor.com', 'thefork.com',
      'just-eat.com', 'just-eat.dk', 'wolt.com', 'deliveroo.com',
      'doordash.com', 'grubhub.com', 'uber.com', 'menucard.dk',
      'apple.com', 'apps.apple.com', 'play.google.com',
    ]);

    const candidates: string[] = [];
    const nameParts = businessName.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    for (const link of links) {
      try {
        const hostname = new URL(link).hostname.replace('www.', '').toLowerCase();
        const baseDomain = hostname.split('.').slice(-2).join('.');
        if (SKIP_DOMAINS.has(baseDomain) || SKIP_DOMAINS.has(hostname)) continue;
        if (nameParts.some(part => hostname.includes(part))) {
          candidates.unshift(hostname);
        } else {
          candidates.push(hostname);
        }
      } catch {
        // skip invalid URLs
      }
    }

    const unique = [...new Set(candidates)];
    return unique[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Fast screenshot-only scrape (~0.5-1s).
 * Fire this early so it's ready by the time the website-scanning step renders.
 */
export async function scrapeScreenshot(
  domain: string,
): Promise<string | null> {
  if (!FIRECRAWL_API_KEY) return null;

  try {
    const res = await firecrawlFetch({
      url: `https://${domain}`,
      formats: ["screenshot"],
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.screenshot ?? null;
  } catch {
    return null;
  }
}

/**
 * Brand extraction using Firecrawl's `branding` format. Heuristic-based
 * (no LLM) — extracts colors, fonts, OG image, favicon, button styles.
 * Logos come from logo.dev's catalog and are not requested here.
 */
export async function scrapeWebsiteBranding(
  domain: string,
): Promise<FirecrawlBrandData> {
  const res = await firecrawlFetch({
    url: `https://${domain}`,
    onlyMainContent: false,
    formats: ["branding"],
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl API error (${res.status}): ${text}`);
  }

  const json = await res.json();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const branding = json.data?.branding ?? {};
  const metadata = json.data?.metadata ?? {};

  const colors = branding.colors ?? {};
  const fonts: any[] = branding.fonts ?? [];
  const brandImages = branding.images ?? {};
  const btnPrimary = branding.components?.buttonPrimary ?? null;
  const businessName = metadata.ogTitle ?? metadata.title ?? metadata.name ?? '';

  return {
    name: businessName || null,
    colors: {
      primary: colors.primary ?? null,
      accent: colors.accent ?? null,
      background: colors.background ?? null,
      textPrimary: colors.textPrimary ?? null,
      link: colors.link ?? null,
    },
    fonts: fonts.map((f: any) => ({ family: f.family ?? '', role: f.role ?? '' })),
    ogImage: brandImages.ogImage ?? metadata.ogImage ?? null,
    favicon: brandImages.favicon ?? metadata.favicon ?? null,
    buttonPrimary: btnPrimary ? {
      background: btnPrimary.background ?? '',
      textColor: btnPrimary.textColor ?? '',
      borderRadius: btnPrimary.borderRadius ?? '0px',
    } : null,
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
