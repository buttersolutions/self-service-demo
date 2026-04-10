import { NextResponse } from 'next/server';
import { scrapeWebsiteBranding, scrapeForBusinessDomain, type FirecrawlBrandData } from '@/lib/firecrawl';

function buildResponse(branding: FirecrawlBrandData | null, domain: string, discoveredDomain?: string | null) {
  if (!branding) {
    return {
      name: null,
      logoUrl: null,
      colors: ['#FFFFFF'],
      fonts: [],
      ogImage: null,
      websiteImages: [],
      ...(discoveredDomain && { discoveredDomain }),
    };
  }

  // Collect all non-null colors, primary first
  const colorValues = [
    branding.colors.primary,
    branding.colors.accent,
    branding.colors.background,
    branding.colors.textPrimary,
    branding.colors.link,
  ].filter((c): c is string => c !== null && c !== undefined && /^#[0-9a-fA-F]{3,8}$/.test(c));

  const uniqueColors = [...new Set(colorValues)];

  return {
    name: branding.name ?? null,
    logoUrl: branding.logo ?? null,
    colors: uniqueColors.length > 0 ? uniqueColors : ['#FFFFFF'],
    fonts: branding.fonts.map((f) => f.family).filter(Boolean),
    ogImage: branding.ogImage ?? null,
    favicon: branding.favicon ?? null,
    websiteImages: branding.websiteImages ?? [],
    ...(discoveredDomain && { discoveredDomain }),
  };
}

export async function POST(request: Request) {
  try {
    const { domain, bookingUrl, businessName } = await request.json();

    // If a booking URL is provided, scrape it first to discover the real domain
    if (bookingUrl && businessName) {
      const discoveredDomain = await scrapeForBusinessDomain(bookingUrl, businessName);
      const targetDomain = discoveredDomain ?? domain;

      if (targetDomain) {
        const branding = await scrapeWebsiteBranding(targetDomain).catch(() => null);
        return NextResponse.json(buildResponse(branding, targetDomain, discoveredDomain));
      }

      return NextResponse.json(buildResponse(null, '', null));
    }

    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

    const branding = await scrapeWebsiteBranding(domain).catch(() => null);
    return NextResponse.json(buildResponse(branding, domain));
  } catch {
    return NextResponse.json(buildResponse(null, ''));
  }
}
