/**
 * Analyses the luminance of an image by sampling pixels in a canvas.
 * Used to detect "white-on-transparent" logos that would be invisible
 * against a white background. Such logos need a darker background to
 * be visible, so we flip the container to a brand color.
 *
 * Returns null if the image can't be decoded (e.g. CORS blocks pixel reads).
 */
export interface LogoLuminance {
  isLight: boolean;
  avgLuminance: number; // 0..1
  hasTransparency: boolean;
}

// Linear luminance from sRGB bytes (roughly Rec.709 / WCAG)
function pixelLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export async function analyzeLogoLuminance(url: string): Promise<LogoLuminance | null> {
  if (typeof window === 'undefined') return null;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = url;

  try {
    await img.decode();
  } catch {
    return null;
  }

  const maxDim = 64;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || 1) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, w, h).data;
  } catch {
    // CORS blocked — can't read back pixel data
    return null;
  }

  let visibleCount = 0;
  let luminanceSum = 0;
  let transparentCount = 0;

  // Sample every pixel; image is tiny so no need to stride
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a < 16) {
      transparentCount += 1;
      continue;
    }
    visibleCount += 1;
    luminanceSum += pixelLuminance(pixels[i], pixels[i + 1], pixels[i + 2]);
  }

  if (visibleCount === 0) return null;

  const avgLuminance = luminanceSum / visibleCount;
  const totalPixels = pixels.length / 4;
  const hasTransparency = transparentCount / totalPixels > 0.05;

  // "Light" = average of visible ink is near-white. A logo designed for dark
  // backgrounds is almost always >0.85 avg luminance on its visible strokes.
  const isLight = avgLuminance > 0.88;

  return { isLight, avgLuminance, hasTransparency };
}
