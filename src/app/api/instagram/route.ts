import { NextResponse } from 'next/server';
import { fetchInstagramProfile, processProfileImage } from '@/lib/apify-instagram';
import { extractDomain } from '@/lib/domain-utils';

export async function POST(request: Request) {
  try {
    const { instagramUrl } = await request.json();

    if (!instagramUrl) {
      return NextResponse.json({ error: 'instagramUrl is required' }, { status: 400 });
    }

    const profile = await fetchInstagramProfile(instagramUrl);

    if (!profile) {
      return NextResponse.json({
        name: null,
        logo: null,
        colors: ['#FFFFFF'],
        discoveredDomain: null,
      });
    }

    // Download profile pic, extract colors, and convert to base64 data URL
    const rawLogoUrl = profile.profilePicUrlHD ?? profile.profilePicUrl;
    const { colors, dataUrl: logoDataUrl } = rawLogoUrl
      ? await processProfileImage(rawLogoUrl)
      : { colors: [], dataUrl: null };

    // Check externalUrls for a real website domain
    let discoveredDomain: string | null = null;
    for (const url of profile.externalUrls) {
      const domain = extractDomain(url);
      if (domain) {
        discoveredDomain = domain;
        break;
      }
    }

    return NextResponse.json({
      name: profile.fullName || null,
      logo: logoDataUrl,
      biography: profile.biography,
      category: profile.businessCategoryName,
      colors: colors.length > 0 ? colors : ['#FFFFFF'],
      discoveredDomain,
      username: profile.username,
    });
  } catch (err) {
    console.error('Instagram API error:', err);
    return NextResponse.json({
      name: null,
      logo: null,
      colors: ['#FFFFFF'],
      discoveredDomain: null,
    });
  }
}
