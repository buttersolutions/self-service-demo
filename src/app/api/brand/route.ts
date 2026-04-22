import { NextResponse } from 'next/server';
import { scrapeWebsiteBranding, scrapeForBusinessDomain, type FirecrawlBrandData } from '@/lib/firecrawl';
import { describeBrand, type BrandData as LogoDevBrand } from '@/lib/logodev';

const LOGO_DEV_PUBLIC_KEY = process.env.LOGO_DEV_PUBLIC_KEY;

function buildLogoDevUrl(domain: string | null): string | null {
  if (!domain || !LOGO_DEV_PUBLIC_KEY) return null;
  const cleaned = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!cleaned) return null;
  return `https://img.logo.dev/${cleaned}?token=${LOGO_DEV_PUBLIC_KEY}&size=128&format=png`;
}

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const normalizeHex = (c: string) => c.toUpperCase();

/**
 * Merge palette strategy:
 *   1. Start with logo.dev's colors (ordered by prominence — brand-accurate).
 *   2. If we have <3 colors, fill up to 3 with unique colors from Firecrawl's
 *      role-labelled signals (primary → accent → buttonPrimary).
 *   3. If logo.dev returned nothing, fall back to the Firecrawl signals
 *      (primary, accent, background, textPrimary, link).
 */
function mergePalette(
  logoDev: LogoDevBrand | null,
  firecrawl: FirecrawlBrandData | null,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (c: string | null | undefined) => {
    if (!c || !HEX_RE.test(c)) return;
    const hex = normalizeHex(c);
    if (seen.has(hex)) return;
    seen.add(hex);
    out.push(hex);
  };

  // 1. logo.dev first — ordered by prominence, usually the brand's actual palette
  const logoDevHexes = (logoDev?.colors ?? [])
    .map((c) => c?.hex)
    .filter((c): c is string => typeof c === 'string' && HEX_RE.test(c));
  logoDevHexes.forEach(add);

  // 2. Fill up to 3 from Firecrawl's role-labelled signals (unique only)
  if (firecrawl && out.length < 3) {
    const firecrawlCandidates = [
      firecrawl.colors.primary,
      firecrawl.colors.accent,
      firecrawl.buttonPrimary?.background ?? null,
    ];
    for (const c of firecrawlCandidates) {
      if (out.length >= 3) break;
      add(c);
    }
  }

  // 3. Fallback: if logo.dev had nothing, use the full Firecrawl signal stack
  if (out.length === 0 && firecrawl) {
    [
      firecrawl.colors.primary,
      firecrawl.colors.accent,
      firecrawl.colors.background,
      firecrawl.colors.textPrimary,
      firecrawl.colors.link,
    ].forEach(add);
  }

  return out.length > 0 ? out : ['#FFFFFF'];
}

function buildResponse(
  firecrawl: FirecrawlBrandData | null,
  logoDev: LogoDevBrand | null,
  domain: string,
  discoveredDomain?: string | null,
) {
  const resolvedDomain = discoveredDomain ?? domain ?? null;
  const logoDevUrl = buildLogoDevUrl(resolvedDomain);
  const colors = mergePalette(logoDev, firecrawl);

  if (!firecrawl && !logoDev) {
    return {
      name: null,
      logoUrl: null,
      logoDevUrl,
      colors,
      fonts: [],
      ogImage: null,
      websiteImages: [],
      ...(discoveredDomain && { discoveredDomain }),
    };
  }

  return {
    name: firecrawl?.name ?? logoDev?.name ?? null,
    logoUrl: firecrawl?.logo ?? null,
    logoDevUrl,
    colors,
    fonts: firecrawl ? firecrawl.fonts.map((f) => f.family).filter(Boolean) : [],
    ogImage: firecrawl?.ogImage ?? null,
    favicon: firecrawl?.favicon ?? null,
    websiteImages: firecrawl?.websiteImages ?? [],
    ...(discoveredDomain && { discoveredDomain }),
  };
}

async function fetchBrandData(domain: string) {
  // Kick off in parallel — logo.dev describe is typically ~200-400ms,
  // Firecrawl scraping is multi-second; merging waits on both.
  const [firecrawl, logoDev] = await Promise.all([
    scrapeWebsiteBranding(domain).catch(() => null),
    describeBrand(domain).catch(() => null),
  ]);
  return { firecrawl, logoDev };
}

export async function POST(request: Request) {
  try {
    const { domain, bookingUrl, businessName } = await request.json();

    // If a booking URL is provided, scrape it first to discover the real domain
    if (bookingUrl && businessName) {
      const discoveredDomain = await scrapeForBusinessDomain(bookingUrl, businessName);
      const targetDomain = discoveredDomain ?? domain;

      if (targetDomain) {
        const { firecrawl, logoDev } = await fetchBrandData(targetDomain);
        return NextResponse.json(buildResponse(firecrawl, logoDev, targetDomain, discoveredDomain));
      }

      return NextResponse.json(buildResponse(null, null, '', null));
    }

    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

    const { firecrawl, logoDev } = await fetchBrandData(domain);
    return NextResponse.json(buildResponse(firecrawl, logoDev, domain));
  } catch {
    return NextResponse.json(buildResponse(null, null, ''));
  }
}
