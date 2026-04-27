import { NextResponse } from 'next/server';
import { scrapeScreenshot } from '@/lib/firecrawl';

// Headroom past the Firecrawl client-side abort (~18s).
export const maxDuration = 25;

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

    const screenshot = await scrapeScreenshot(domain);

    return NextResponse.json({ screenshot });
  } catch {
    return NextResponse.json({ screenshot: null });
  }
}
