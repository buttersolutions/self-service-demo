import { NextResponse } from 'next/server';
import { scrapeWebsiteBranding } from '@/lib/firecrawl';

const SECRET_KEY = process.env.LOGO_DEV_SECRET_KEY;
const PUBLIC_KEY = process.env.LOGO_DEV_PUBLIC_KEY;

async function fetchBrand(domain: string) {
  const token = SECRET_KEY || PUBLIC_KEY;
  if (!token) throw new Error('No Logo.dev key configured');

  const res = await fetch(`https://api.logo.dev/describe/${domain}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (SECRET_KEY && PUBLIC_KEY && token === SECRET_KEY) {
      const retry = await fetch(`https://api.logo.dev/describe/${domain}`, {
        headers: { Authorization: `Bearer ${PUBLIC_KEY}` },
      });
      if (retry.ok) return retry.json();
    }
    const text = await res.text();
    throw new Error(`Logo.dev API error (${res.status}): ${text}`);
  }

  return res.json();
}

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

    const logoUrl = PUBLIC_KEY
      ? `https://img.logo.dev/${domain}?token=${PUBLIC_KEY}&size=128&format=png`
      : null;

    // Run logo.dev and firecrawl in parallel
    const [logoResult, firecrawlResult] = await Promise.allSettled([
      fetchBrand(domain),
      scrapeWebsiteBranding(domain),
    ]);

    const brand = logoResult.status === 'fulfilled' ? logoResult.value : null;
    const firecrawl = firecrawlResult.status === 'fulfilled' ? firecrawlResult.value : null;

    // Merge colors from both sources, deduped
    const logoColors = (brand?.colors ?? []).map((c: { hex: string }) => c.hex);
    const firecrawlColors = firecrawl?.colors ?? [];
    const allColors = [...new Set([...logoColors, ...firecrawlColors])].filter(
      (c: string) => /^#[0-9a-fA-F]{3,8}$/.test(c),
    );

    return NextResponse.json({
      name: brand?.name ?? null,
      logoUrl,
      colors: allColors.length > 0 ? allColors : ['#FFFFFF'],
      fonts: firecrawl?.fonts ?? [],
      ogImage: firecrawl?.ogImage ?? null,
      websiteImages: firecrawl?.images ?? [],
    });
  } catch {
    return NextResponse.json({
      name: null,
      logoUrl: null,
      colors: ['#FFFFFF'],
      fonts: [],
      ogImage: null,
      websiteImages: [],
    });
  }
}
