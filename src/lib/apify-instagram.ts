import sharp from 'sharp';

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR_ID = 'apify~instagram-scraper';
const BASE = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items`;

export interface InstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  businessCategoryName: string | null;
  profilePicUrl: string | null;
  profilePicUrlHD: string | null;
  externalUrls: string[];
  followersCount: number;
}

/**
 * Fetch an Instagram profile via Apify's Instagram Scraper.
 * Uses synchronous actor execution — blocks until results are ready.
 */
export async function fetchInstagramProfile(
  instagramUrl: string,
  timeoutSecs = 60,
): Promise<InstagramProfile | null> {
  if (!APIFY_TOKEN) throw new Error('APIFY_TOKEN not configured');

  const url = `${BASE}?token=${APIFY_TOKEN}&format=json&timeout=${timeoutSecs}`;

  const controller = new AbortController();
  const clientTimeout = setTimeout(() => controller.abort(), timeoutSecs * 1000);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      directUrls: [instagramUrl],
      resultsType: 'details',
      resultsLimit: 1,
    }),
    signal: controller.signal,
  });

  clearTimeout(clientTimeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify Instagram error (${res.status}): ${text.slice(0, 200)}`);
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const items: any[] = await res.json();
  if (items.length === 0) return null;

  const profile = items[0];
  return {
    username: profile.username ?? '',
    fullName: profile.fullName ?? '',
    biography: profile.biography ?? '',
    businessCategoryName: profile.businessCategoryName ?? null,
    profilePicUrl: profile.profilePicUrl ?? null,
    profilePicUrlHD: profile.profilePicUrlHD ?? null,
    externalUrls: Array.isArray(profile.externalUrls) ? profile.externalUrls : [],
    followersCount: profile.followersCount ?? 0,
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/**
 * Fetch an image, extract dominant colors, and return a base64 data URL.
 * Handles Instagram CDN URLs (which expire) by downloading at call time.
 */
export async function processProfileImage(
  imageUrl: string,
  maxColors = 3,
): Promise<{ colors: string[]; dataUrl: string | null }> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return { colors: [], dataUrl: null };

    const buffer = Buffer.from(await res.arrayBuffer());

    // Convert to PNG data URL for client use (Instagram CDN URLs expire)
    const pngBuffer = await sharp(buffer)
      .resize(256, 256, { fit: 'cover' })
      .png()
      .toBuffer();
    const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    // Resize to small thumbnail for fast processing
    const { data, info } = await sharp(buffer)
      .resize(50, 50, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Count pixel colors (quantized aggressively — round to nearest 48)
    const colorCounts = new Map<string, number>();
    for (let i = 0; i < data.length; i += 3) {
      const r = Math.round(data[i] / 48) * 48;
      const g = Math.round(data[i + 1] / 48) * 48;
      const b = Math.round(data[i + 2] / 48) * 48;
      const hex = `#${Math.min(r, 255).toString(16).padStart(2, '0')}${Math.min(g, 255).toString(16).padStart(2, '0')}${Math.min(b, 255).toString(16).padStart(2, '0')}`;
      colorCounts.set(hex, (colorCounts.get(hex) ?? 0) + 1);
    }

    // Sort by frequency, skip only near-black (keep white)
    const sorted = [...colorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([hex]) => hex)
      .filter((hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.05;
      });

    // Dedupe: skip colors too close to an already-picked color (Euclidean distance < 100)
    const picked: string[] = [];
    for (const hex of sorted) {
      if (picked.length >= maxColors) break;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const tooClose = picked.some((p) => {
        const pr = parseInt(p.slice(1, 3), 16);
        const pg = parseInt(p.slice(3, 5), 16);
        const pb = parseInt(p.slice(5, 7), 16);
        return Math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2) < 100;
      });
      if (!tooClose) picked.push(hex);
    }

    return { colors: picked, dataUrl };
  } catch {
    return { colors: [], dataUrl: null };
  }
}
