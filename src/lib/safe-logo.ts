import type { BusinessData } from "@/components/onboarding/types";

export interface ResolvedLogo {
  /** URL to render; null when the caller should render a letter badge. */
  src: string | null;
  /**
   * True when the source is a logo.dev fallback. Callers render these in a
   * fixed square frame (always 128×128 catalog assets, always bg-safe). The
   * native Firecrawl logo (`isSquareFallback=false`) is rendered natively
   * with a height cap to preserve wordmark aspect ratios.
   */
  isSquareFallback: boolean;
}

/**
 * Resolves how to display the business logo. Strategy:
 *   1. Firecrawl logo is DARK (safe on white)  → use it, render natively
 *   2. Firecrawl logo is LIGHT or missing + logo.dev URL exists → use logo.dev, render as square
 *   3. Nothing available → null (caller shows letter badge)
 *
 * This avoids wrapping the Firecrawl logo in a brand-color pill (risky — we
 * might pick the wrong color). Instead we fall through to logo.dev's curated,
 * consistent catalog asset.
 */
export function resolveLogo(business: BusinessData | null | undefined): ResolvedLogo {
  if (business?.logoUrl && business.logoIsLight !== true) {
    return { src: business.logoUrl, isSquareFallback: false };
  }

  if (business?.logoDevUrl) {
    return { src: business.logoDevUrl, isSquareFallback: true };
  }

  return { src: null, isSquareFallback: false };
}
