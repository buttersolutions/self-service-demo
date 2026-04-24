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
 *   1. logo.dev URL exists → use it (curated, always-square, bg-safe catalog asset)
 *   2. Firecrawl logo exists AND is dark enough to render on white → use it natively
 *   3. Nothing usable → null (caller shows letter badge)
 *
 * logo.dev is preferred because its catalog assets are consistently sized,
 * square, and safe on any background. The Firecrawl logo is kept as a
 * fallback for domains logo.dev doesn't index.
 */
export function resolveLogo(business: BusinessData | null | undefined): ResolvedLogo {
  // After handleConfirm locks in the chosen logo it writes it into `logoUrl`.
  // If that chosen URL is the logo.dev asset, preserve the square signal —
  // otherwise subsequent resolver calls would forget it and we'd render the
  // square catalog tile as if it were a wordmark.
  if (business?.logoUrl && business.logoDevUrl && business.logoUrl === business.logoDevUrl) {
    return { src: business.logoUrl, isSquareFallback: true };
  }

  if (business?.logoDevUrl) {
    return { src: business.logoDevUrl, isSquareFallback: true };
  }

  if (business?.logoUrl && business.logoIsLight !== true) {
    return { src: business.logoUrl, isSquareFallback: false };
  }

  return { src: null, isSquareFallback: false };
}
