import type { BusinessData } from "@/components/onboarding/types";

export interface ResolvedLogo {
  /** URL to render; null when the caller should render a letter badge. */
  src: string | null;
  /**
   * True when the logo should be rendered in a fixed square frame edge-to-edge.
   * logo.dev catalog assets are 128×128 squares; Instagram profile pics are
   * also square. Always true when src is set — kept for compatibility with
   * existing call sites that branch on it.
   */
  isSquareFallback: boolean;
}

/**
 * Resolves how to display the business logo. Logos come from logo.dev's
 * curated catalog (preferred) or Instagram's profile picture (when the user
 * arrives via a social URI). Both are square. If neither is available, we
 * return null and the caller renders a letter badge.
 */
export function resolveLogo(business: BusinessData | null | undefined): ResolvedLogo {
  const src = business?.logoUrl ?? business?.logoDevUrl ?? null;
  return src ? { src, isSquareFallback: true } : { src: null, isSquareFallback: false };
}
