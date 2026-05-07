// Geographic Europe ISO 3166-1 alpha-2 country codes (lowercase, Google Places format).
// The classic Google Places Autocomplete caps componentRestrictions.country
// at 5 entries, so callers restrict geographically via strictBounds + this
// allowlist checked on selection.
export const EUROPE_COUNTRY_CODES = new Set([
  // EU-27
  'at', 'be', 'bg', 'hr', 'cy', 'cz', 'dk', 'ee', 'fi', 'fr',
  'de', 'gr', 'hu', 'ie', 'it', 'lv', 'lt', 'lu', 'mt', 'nl',
  'pl', 'pt', 'ro', 'sk', 'si', 'es', 'se',
  // UK + EFTA
  'gb', 'no', 'ch', 'is', 'li',
  // Microstates
  'mc', 'ad', 'sm', 'va',
  // Western Balkans
  'al', 'ba', 'rs', 'me', 'mk', 'xk',
  // Eastern Europe
  'md', 'ua',
]);

// Rectangle that loosely covers geographic Europe.
export const EUROPE_BOUNDS_SW = { lat: 34.5, lng: -10.5 };
export const EUROPE_BOUNDS_NE = { lat: 71.5, lng: 41.0 };
