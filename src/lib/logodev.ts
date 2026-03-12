const SECRET_KEY = process.env.LOGO_DEV_SECRET_KEY!;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_KEY!;

export interface BrandColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export interface BrandData {
  name: string;
  domain: string;
  description: string;
  logo: string;
  colors: BrandColor[];
  socials: Record<string, string>;
  indexed_at: string;
}

export async function describeBrand(domain: string): Promise<BrandData> {
  const res = await fetch(`https://api.logo.dev/describe/${domain}`, {
    headers: {
      Authorization: `Bearer ${SECRET_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Logo.dev API error (${res.status}): ${text}`);
  }

  return res.json();
}

/** Client-side logo URL — uses publishable key */
export function logoUrl(domain: string, size = 128): string {
  return `https://img.logo.dev/${domain}?token=${PUBLISHABLE_KEY}&size=${size}&format=png`;
}
