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

  // Keywords in an image URL that strongly suggest it's NOT a logo
  // (hero banners, photos, covers, etc.). Used to reject obviously-wrong
  // "logos" that the LLM or URL-match path sometimes picks.
  const NON_LOGO_URL_KEYWORDS = [
    'hero', 'banner', 'cover', 'header-image', 'background',
    'photo', 'photos', 'gallery', 'slide', 'slider', 'carousel',
    'thumb', 'thumbnail', 'poster', 'feature', 'featured',
  ];

  const looksLikeNonLogo = (url: string | null): boolean => {
    if (!url) return false;
    try {
      const path = new URL(url).pathname.toLowerCase();
      return NON_LOGO_URL_KEYWORDS.some((kw) => path.includes(kw));
    } catch {
      return false;
    }
  };

  // Trust the LLM only when confidence is reasonable and the URL doesn't
  // scream "hero image". Anything below confidence 0.5 or with a suspicious
  // URL is treated as unreliable and we fall through to URL matching.
  const llmLogoTrusted =
    llmLogo && llmConfidence >= 0.5 && !looksLikeNonLogo(llmLogo);

  let logo: string | null = llmLogoTrusted ? llmLogo : null;
  let logoSource: 'llm' | 'url-match' | null = llmLogoTrusted ? 'llm' : null;

  // Many sites ship both a dark and a light variant (e.g. `logo-white.svg`
  // for dark hero backgrounds, `logo.svg` / `logo-dark.svg` for the rest).
  // Firecrawl's LLM often picks whichever appears in the header — for sites
  // with a dark hero, that's the light variant, which then disappears on
  // our white mockup. Detect by URL keyword and try to swap.
  const looksLikeLightVariant = (url: string | null): boolean => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return /(?:[-_./])(?:white|light|inverse|inverted|negative|reversed|knockout|alt)(?:[-_./]|$)/.test(lower);
  };

  if (logo && looksLikeLightVariant(logo) && websiteImages.length > 0) {
    const candidates = [
      logo.replace(/([-_./])white([-_./]|$)/gi, '$1dark$2'),
      logo.replace(/([-_./])light([-_./]|$)/gi, '$1dark$2'),
      logo.replace(/([-_./])white([-_./]|$)/gi, '$2').replace(/--/g, '-'),
      logo.replace(/([-_./])light([-_./]|$)/gi, '$2').replace(/--/g, '-'),
      logo.replace(/[-_]white/gi, ''),
      logo.replace(/[-_]light/gi, ''),
    ].filter((c) => c !== logo);

    for (const candidate of candidates) {
      if (websiteImages.includes(candidate)) {
        logo = candidate;
        logoSource = 'llm';
        break;
      }
    }

    // If no direct-swap worked, try finding any non-light image with a
    // similar filename root (business-name match)
    if (looksLikeLightVariant(logo) && businessName) {
      const nameWords = businessName.toLowerCase().split(/\s+/).filter((w: string) => w.length >= 3);
      for (const imgUrl of websiteImages) {
        if (looksLikeNonLogo(imgUrl) || looksLikeLightVariant(imgUrl)) continue;
        try {
          const path = new URL(imgUrl).pathname.toLowerCase();
          if (path.includes('logo') && nameWords.some((w: string) => path.includes(w))) {
            logo = imgUrl;
            logoSource = 'url-match';
            break;
          }
        } catch {
          // skip
        }
      }
    }
  }

  if (!logo && businessName && websiteImages.length > 0) {
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
      if (looksLikeNonLogo(imgUrl)) continue;
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
