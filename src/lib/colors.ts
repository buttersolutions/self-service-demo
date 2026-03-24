const DEFAULT_PRIMARY = '#625CE4';
const DEFAULT_SECONDARY = '#7C78EE';

const NEAR_WHITE_LUMINANCE_THRESHOLD = 0.85;
const LIGHT_COLOR_LUMINANCE_THRESHOLD = 0.4;

export interface BrandPalette {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  ).toUpperCase();
}

/** WCAG 2.0 relative luminance (0 = black, 1 = white) */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function isLightColor(hex: string): boolean {
  return relativeLuminance(hex) > LIGHT_COLOR_LUMINANCE_THRESHOLD;
}

/** Too pale/white to use as a button background */
export function isTooLight(hex: string): boolean {
  return relativeLuminance(hex) > NEAR_WHITE_LUMINANCE_THRESHOLD;
}

/** Returns black for light backgrounds, white for dark backgrounds */
export function contrastForeground(hex: string): string {
  return isLightColor(hex) ? '#000000' : '#FFFFFF';
}

/** Mix a color toward white by `factor` (0 = original, 1 = white) */
function tint(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor,
  );
}

/** Mix a color toward black by `factor` (0 = original, 1 = black) */
function shade(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
}

/**
 * Derive a secondary color from a primary when we only have one usable brand color.
 * Dark primaries get a lighter tint, light primaries get a darker shade.
 */
function deriveSecondary(primary: string): string {
  const lum = relativeLuminance(primary);

  if (lum < 0.15) return tint(primary, 0.35);
  if (lum < 0.4) return tint(primary, 0.25);
  return shade(primary, 0.3);
}

export interface BrandColorMap {
  primaryColor: string;
  primaryTextColor: string;
  secondaryColor: string;
  secondaryTextColor: string;
  highlightColor: string;
}

/**
 * Derive a full brand color map from raw brand colors.
 * Filters out too-light colors, sorts by luminance (darkest first).
 */
export function deriveBrandColorMap(brandColors: string[]): BrandColorMap {
  const usable = brandColors
    .filter((c) => !isTooLight(c))
    .sort((a, b) => relativeLuminance(a) - relativeLuminance(b));

  const primaryColor = usable[0] ?? DEFAULT_PRIMARY;
  const primaryTextColor = contrastForeground(primaryColor);

  const secondaryColor = usable[1] ?? deriveSecondary(primaryColor);
  const secondaryTextColor = contrastForeground(secondaryColor);

  const highlightColor = usable[2] ?? tint(primaryColor, 0.4);

  return { primaryColor, primaryTextColor, secondaryColor, secondaryTextColor, highlightColor };
}

/**
 * Takes raw brand colors (from Logo.dev or similar) and produces a design-ready
 * palette with primary/secondary pairs and their contrast foregrounds.
 *
 * - Filters out whites and near-whites that can't be used for buttons
 * - Falls back to AllGravy purple when no usable colors exist
 * - Derives a secondary when only one usable color is available
 */
export function deriveBrandPalette(brandColors: string[]): BrandPalette {
  const usable = brandColors.filter((c) => !isTooLight(c));

  let primary: string;
  let secondary: string;

  if (usable.length === 0) {
    primary = DEFAULT_PRIMARY;
    secondary = DEFAULT_SECONDARY;
  } else if (usable.length === 1) {
    primary = usable[0];
    secondary = deriveSecondary(primary);
  } else {
    primary = usable[0];
    secondary = usable[1];
  }

  return {
    primary,
    primaryForeground: contrastForeground(primary),
    secondary,
    secondaryForeground: contrastForeground(secondary),
  };
}
