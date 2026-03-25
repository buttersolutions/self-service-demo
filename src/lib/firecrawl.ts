export interface FirecrawlBrandData {
  colors: string[];
  fonts: string[];
  ogImage: string | null;
  images: string[];
}

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

export async function scrapeWebsiteBranding(
  domain: string,
): Promise<FirecrawlBrandData> {
  if (!FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY not configured");
  }

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url: `https://${domain}`,
      formats: ["extract"],
      extract: {
        schema: {
          type: "object",
          properties: {
            colors: {
              type: "array",
              items: { type: "string" },
              description:
                "Brand colors found on the website as hex codes (e.g. #FF5500). Look at the main navigation, buttons, headings, and accents.",
            },
            fonts: {
              type: "array",
              items: { type: "string" },
              description:
                "Font family names used on the website (e.g. Inter, Poppins, Georgia).",
            },
            ogImage: {
              type: "string",
              description:
                "The Open Graph image URL (og:image meta tag), or null if not found.",
            },
            images: {
              type: "array",
              items: { type: "string" },
              description:
                "Up to 10 high-quality images from the website. Prefer hero images, team photos, and product/location photos. Exclude icons, logos, and decorative elements. Return full URLs.",
            },
          },
          required: ["colors", "fonts", "images"],
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firecrawl API error (${res.status}): ${text}`);
  }

  const json = await res.json();
  const extract = json.data?.extract ?? {};

  return {
    colors: Array.isArray(extract.colors) ? extract.colors : [],
    fonts: Array.isArray(extract.fonts) ? extract.fonts : [],
    ogImage: extract.ogImage ?? null,
    images: Array.isArray(extract.images) ? extract.images : [],
  };
}
