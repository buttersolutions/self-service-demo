/**
 * Smart domain extraction that filters out social media, booking platforms,
 * and website builders — these don't represent the actual business domain.
 */

const SOCIAL_PLATFORMS = new Set([
  'instagram.com',
  'facebook.com',
  'fb.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'linkedin.com',
  'youtube.com',
  'pinterest.com',
  'threads.net',
]);

const BOOKING_PLATFORMS = new Set([
  'easytablebooking.com',
  'dinnerbooking.com',
  'bookatable.com',
  'opentable.com',
  'resy.com',
  'yelp.com',
  'tripadvisor.com',
  'uber.com',
  'doordash.com',
  'grubhub.com',
  'just-eat.com',
  'just-eat.dk',
  'just-eat.co.uk',
  'wolt.com',
  'deliveroo.com',
  'menucard.dk',
  'hungry.dk',
  'thefork.com',
]);

const HOSTING_PLATFORMS = new Set([
  'squarespace.com',
  'wix.com',
  'weebly.com',
  'godaddy.com',
  'wordpress.com',
  'shopify.com',
  'webflow.io',
]);

function matchesPlatform(hostname: string, platforms: Set<string>): boolean {
  for (const platform of platforms) {
    if (hostname === platform || hostname.endsWith(`.${platform}`)) {
      return true;
    }
  }
  return false;
}

export type DomainResult =
  | { type: 'domain'; domain: string }
  | { type: 'booking'; originalUrl: string }
  | { type: 'social'; originalUrl: string }
  | { type: 'none' };

/**
 * Classifies a Google Places websiteUri.
 * - 'domain': usable business domain
 * - 'booking': booking platform URL (can be scraped for real domain)
 * - 'social': social media URL (no usable domain)
 * - 'none': no URL provided
 */
export function classifyWebsiteUri(websiteUri?: string): DomainResult {
  if (!websiteUri) return { type: 'none' };
  try {
    const hostname = new URL(websiteUri).hostname.replace('www.', '');
    if (matchesPlatform(hostname, SOCIAL_PLATFORMS)) return { type: 'social', originalUrl: websiteUri };
    if (matchesPlatform(hostname, BOOKING_PLATFORMS)) return { type: 'booking', originalUrl: websiteUri };
    if (matchesPlatform(hostname, HOSTING_PLATFORMS)) return { type: 'booking', originalUrl: websiteUri };
    return { type: 'domain', domain: hostname };
  } catch {
    return { type: 'none' };
  }
}

/**
 * Simple extraction — returns the domain if usable, undefined otherwise.
 * Use classifyWebsiteUri for more granular handling.
 */
export function extractDomain(websiteUri?: string): string | undefined {
  const result = classifyWebsiteUri(websiteUri);
  return result.type === 'domain' ? result.domain : undefined;
}
