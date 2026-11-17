import { API_BASE } from '../config';

export interface CoverPalette {
  coverA: string; // Deep/mood foundation tone
  coverB: string; // Vibrant atmospheric aura tone
  coverC: string; // Luminous accent highlight tone
  glowColor: string; // Diffuse radiant glow for vinyl/cover halo
}

export const DEFAULT_COVER_PALETTE: CoverPalette = {
  coverA: '#151d2f',
  coverB: '#634493',
  coverC: '#e09887',
  glowColor: 'rgba(150, 110, 220, 0.55)',
};

interface ColorSample {
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rN:
        h = (gN - bN) / d + (gN < bN ? 6 : 0);
        break;
      case gN:
        h = (bN - rN) / d + 2;
        break;
      case bN:
        h = (rN - gN) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let tN = t;
      if (tN < 0) tN += 1;
      if (tN > 1) tN -= 1;
      if (tN < 1 / 6) return p + (q - p) * 6 * tN;
      if (tN < 1 / 2) return q;
      if (tN < 2 / 3) return p + (q - p) * (2 / 3 - tN) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function toHex(r: number, g: number, b: number): string {
  return `#${Math.max(0, Math.min(255, Math.round(r))).toString(16).padStart(2, '0')}${Math.max(0, Math.min(255, Math.round(g))).toString(16).padStart(2, '0')}${Math.max(0, Math.min(255, Math.round(b))).toString(16).padStart(2, '0')}`;
}

/**
 * Atmospheric color extractor from album cover with vibrancy boosting and tonal harmony.
 */
export async function extractCoverPalette(imageUrl?: string): Promise<CoverPalette> {
  if (!imageUrl) return DEFAULT_COVER_PALETTE;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const proxiedSrc = imageUrl.startsWith('http')
      ? `${API_BASE}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(DEFAULT_COVER_PALETTE);

        // 64x64 grid for high fidelity sampling
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size).data;
        const samples: ColorSample[] = [];

        let totalSat = 0;

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const [h, s, l] = rgbToHsl(r, g, b);

          totalSat += s;

          // Exclude extreme washouts and pure pitch blacks
          if (l > 0.08 && l < 0.92) {
            samples.push({ r, g, b, h, s, l });
          }
        }

        const avgSat = samples.length > 0 ? totalSat / samples.length : 0;

        // Monochrome fallback: if image is B&W or sepia, create an atmospheric moonlit/obsidian palette
        if (avgSat < 0.12 || samples.length < 5) {
          return resolve({
            coverA: '#101524',
            coverB: '#354366',
            coverC: '#8fa8d6',
            glowColor: 'rgba(120, 155, 215, 0.45)',
          });
        }

        // 1. Find the Most Vibrant tone (for Cover B / signature aura)
        const vibrantPool = [...samples].sort((a, b) => {
          // Weight towards medium lightness (0.35 - 0.65) and highest saturation
          const scoreA = a.s * 2.2 - Math.abs(a.l - 0.5) * 1.5;
          const scoreB = b.s * 2.2 - Math.abs(b.l - 0.5) * 1.5;
          return scoreB - scoreA;
        });

        const coverB_sample = vibrantPool[0] || samples[0];

        // 2. Find the Deepest Complementary tone (for Cover A / atmospheric base)
        const deepPool = [...samples]
          .filter((s) => s.l < 0.45)
          .sort((a, b) => {
            const hueDiffA = Math.abs(a.h - coverB_sample.h);
            const hueDiffB = Math.abs(b.h - coverB_sample.h);
            return hueDiffB - hueDiffA;
          });

        const coverA_sample = deepPool[0] || {
          r: Math.max(15, Math.round(coverB_sample.r * 0.4)),
          g: Math.max(18, Math.round(coverB_sample.g * 0.4)),
          b: Math.max(30, Math.round(coverB_sample.b * 0.55)),
          h: coverB_sample.h,
          s: coverB_sample.s,
          l: 0.22,
        };

        // 3. Find Luminous Accent tone (for Cover C / highlights & visualizer)
        const lightPool = [...samples]
          .filter((s) => s.l > 0.45 && s.s > 0.2)
          .sort((a, b) => {
            const distA = Math.abs(a.h - coverB_sample.h);
            const distB = Math.abs(b.h - coverB_sample.h);
            return distB - distA;
          });

        const coverC_sample = lightPool[0] || {
          r: Math.min(255, Math.round(coverB_sample.r * 1.35 + 25)),
          g: Math.min(255, Math.round(coverB_sample.g * 1.35 + 25)),
          b: Math.min(255, Math.round(coverB_sample.b * 1.35 + 25)),
          h: coverB_sample.h,
          s: coverB_sample.s,
          l: 0.70,
        };

        // Apply cinematic atmospheric vibrancy enhancement:
        // Boost saturation by 25-35% and clamp lightness into optimal atmospheric radiance
        const [boostedB_R, boostedB_G, boostedB_B] = hslToRgb(
          coverB_sample.h,
          Math.min(1, Math.max(0.65, coverB_sample.s * 1.3)),
          Math.max(0.42, Math.min(0.60, coverB_sample.l))
        );

        const [boostedA_R, boostedA_G, boostedA_B] = hslToRgb(
          coverA_sample.h,
          Math.min(1, Math.max(0.45, coverA_sample.s * 1.2)),
          Math.max(0.12, Math.min(0.22, coverA_sample.l))
        );

        const [boostedC_R, boostedC_G, boostedC_B] = hslToRgb(
          coverC_sample.h,
          Math.min(1, Math.max(0.55, coverC_sample.s * 1.25)),
          Math.max(0.65, Math.min(0.78, coverC_sample.l))
        );

        const hexA = toHex(boostedA_R, boostedA_G, boostedA_B);
        const hexB = toHex(boostedB_R, boostedB_G, boostedB_B);
        const hexC = toHex(boostedC_R, boostedC_G, boostedC_B);
        const glow = `rgba(${boostedB_R}, ${boostedB_G}, ${boostedB_B}, 0.55)`;

        resolve({
          coverA: hexA,
          coverB: hexB,
          coverC: hexC,
          glowColor: glow,
        });
      } catch (err) {
        console.warn('Cover palette extraction fallback:', err);
        resolve(DEFAULT_COVER_PALETTE);
      }
    };

    img.onerror = () => {
      // If proxy failed, try raw URL before giving up
      if (img.src !== imageUrl) {
        img.src = imageUrl;
      } else {
        resolve(DEFAULT_COVER_PALETTE);
      }
    };

    img.src = proxiedSrc;
  });
}
