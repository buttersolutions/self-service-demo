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
  logo: string | null;
  logoConfidence: number;
  logoSource: 'llm' | 'url-match' | null;
  websiteImages: string[];
  buttonPrimary: {
    background: string;
    textColor: string;
    borderRadius: string;
  } | null;
}

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

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
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["links"],
      }),
    });

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
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: `https://${domain}`,
        formats: ["screenshot"],
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    return json.data?.screenshot ?? null;
  } catch {
    return null;
  }
}

/**
 * Brand extraction using Firecrawl's built-in branding format (~5-10s).
 * Returns structured brand data: colors, fonts, logo, buttons.
 */
export async function scrapeWebsiteBranding(
  domain: string,
): Promise<FirecrawlBrandData> {
  if (!FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY not configured");
  }

  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url: `https://${domain}`,
      onlyMainContent: false,
      formats: ["branding", "images"],
    }),
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
  const logoMeta = branding.__llm_logo_reasoning ?? {};
  const btnPrimary = branding.components?.buttonPrimary ?? null;

  // Website images from the "images" format
  const websiteImages: string[] = (json.data?.images ?? []).filter(
    (url: unknown): url is string => typeof url === 'string' && url.startsWith('http'),
  );

  // Logo: use LLM result if confident, otherwise fuzzy-match against image URLs
  const llmLogo = logoMeta.rejected ? null : (brandImages.logo ?? null);
  const llmConfidence = logoMeta.confidence ?? 0;
  const businessName = metadata.ogTitle ?? metadata.title ?? metadata.name ?? '';

  let logo = llmLogo;
  let logoSource: 'llm' | 'url-match' | null = llmLogo ? 'llm' : null;

  if (llmConfidence < 0.5 && businessName && websiteImages.length > 0) {
    // Normalize diacritics + Nordic characters for fuzzy matching
    const stripAccents = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/ø/g, 'o').replace(/Ø/g, 'O')
        .replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
        .replace(/å/g, 'a').replace(/Å/g, 'A');
    const nameWords = stripAccents(businessName)
      .toLowerCase()
      .split(/[\s\-–—_,.&|]+/)
      .filter((w: string) => w.length >= 3);

    for (const imgUrl of websiteImages) {
      try {
        const decoded = stripAccents(decodeURIComponent(imgUrl).replace(/\+/g, ' ')).toLowerCase();
        const path = new URL(decoded).pathname;
        if (nameWords.some((word: string) => path.includes(word))) {
          logo = imgUrl;
          logoSource = 'url-match';
          break;
        }
      } catch {
        // skip malformed URLs
      }
    }
  }

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
    logo,
    logoConfidence: llmConfidence,
    logoSource,
    websiteImages,
    buttonPrimary: btnPrimary ? {
      background: btnPrimary.background ?? '',
      textColor: btnPrimary.textColor ?? '',
      borderRadius: btnPrimary.borderRadius ?? '0px',
    } : null,
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
