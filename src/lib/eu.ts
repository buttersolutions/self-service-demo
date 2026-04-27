// EU-27 ISO 3166-1 alpha-2 country codes (lowercase, Google Places format).
// The classic Google Places Autocomplete caps componentRestrictions.country
// at 5 entries, so callers restrict geographically via strictBounds + this
// allowlist checked on selection.
export const EU_COUNTRY_CODES = new Set([
  'at', 'be', 'bg', 'hr', 'cy', 'cz', 'dk', 'ee', 'fi', 'fr',
  'de', 'gr', 'hu', 'ie', 'it', 'lv', 'lt', 'lu', 'mt', 'nl',
  'pl', 'pt', 'ro', 'sk', 'si', 'es', 'se',
]);

// Rectangle that loosely covers the EU-27. Also admits UK / Norway /
// Switzerland / Iceland; those are filtered out on selection by
// EU_COUNTRY_CODES.
export const EU_BOUNDS_SW = { lat: 34.5, lng: -10.5 };
export const EU_BOUNDS_NE = { lat: 71.5, lng: 34.5 };
