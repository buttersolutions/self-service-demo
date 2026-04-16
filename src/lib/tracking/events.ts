/**
 * Canonical analytics event schema.
 * Single source of truth for event names + shape.
 * Extend here; both client and server fan-out will pick it up.
 */
export type TrackEvent =
  | { name: 'search_submitted'; props: { place_id: string; has_website: boolean } }
  | { name: 'map_scan_complete'; props: { location_count: number } }
  | { name: 'website_prompt_shown'; props: Record<string, never> }
  | { name: 'website_prompt_submitted'; props: Record<string, never> }
  | { name: 'website_prompt_skipped'; props: Record<string, never> }
  | { name: 'report_generated'; props: { report_id: string; review_count: number } }
  | { name: 'branding_confirmed'; props: { report_id: string | null } }
  | { name: 'booking_started'; props: Record<string, never> }
  | { name: 'booking_completed'; props: { report_id: string | null } };

export type TrackEventName = TrackEvent['name'];

export interface TrackUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  externalId?: string;
}
