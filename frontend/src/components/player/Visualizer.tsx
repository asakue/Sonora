import React, { useEffect, useRef } from 'react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';

interface VisualizerProps {
  className?: string;
  barsCount?: number;
}

function parseHexToHsl(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [0.68, 0.75, 0.55]; // fallback indigo
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

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

function hslToHex(h: number, s: number, l: number): string {
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
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Builds a pure monochromatic gradient of ONE single hue:
 * - bottom: deep, rich saturated tone of that hue
 * - top: luminous, bright, shining tone of the EXACT same hue
 */
function getMonochromaticGradient(baseHex: string): { bottom: string; top: string } {
  const [h, s, l] = parseHexToHsl(baseHex);
  // Bottom: deeper, rich saturated tone of the SAME hue
  const bottomL = Math.max(0.35, Math.min(0.50, l * 0.85));
  const bottomS = Math.min(1.0, Math.max(0.70, s * 1.15));
  const bottom = hslToHex(h, bottomS, bottomL);

  // Top: luminous, bright, shining tone of the SAME hue
  const topL = Math.min(0.85, Math.max(0.68, l * 1.35 + 0.12));
  const topS = Math.min(1.0, Math.max(0.55, s * 0.95));
  const top = hslToHex(h, topS, topL);

  return { bottom, top };
}

export const Visualizer: React.FC<VisualizerProps> = ({ className = '', barsCount = 28 }) => {
  const { isPlaying, getFrequencyData, currentTrack } = useAudioPlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Smoothing buffer for gentle transitions
  const smoothedHeights = useRef<number[]>(new Array(barsCount).fill(4));
  // Cached single-hue monochromatic gradient colors from cover
  const monoGradientRef = useRef<{ bottom: string; top: string }>({
    bottom: '#4f46e5',
    top: '#c7d2fe',
  });

  useEffect(() => {
    const updateColors = () => {
      try {
        const style = getComputedStyle(document.documentElement);
        const coverColor = style.getPropertyValue('--cover-b').trim() || '#6366f1';
        monoGradientRef.current = getMonochromaticGradient(coverColor);
      } catch {
        // fallback
      }
    };
    updateColors();
    const timer = setTimeout(updateColors, 150);
    const interval = setInterval(updateColors, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [currentTrack?.artwork_url]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawFrame = (animate: boolean) => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = isPlaying ? getFrequencyData() : null;
      const gap = 3;
      const barWidth = Math.max(3, (width - gap * (barsCount - 1)) / barsCount);
      const { bottom, top } = monoGradientRef.current;

      for (let i = 0; i < barsCount; i++) {
        let targetHeight = 4; // Idle resting height

        if (freqData && isPlaying) {
          // Map index to frequency bin (give more weight to bass & mids)
          const dataIdx = Math.floor((i / barsCount) * (freqData.length * 0.75));
          const val = freqData[dataIdx] || 0;
          // Scale from 0-255 to 4 -> height - 6
          targetHeight = Math.max(4, (val / 255) * (height - 8));
        }

        // Asymmetric attack/decay smoothing: punchy hit, silky organic decay
        const prevH = smoothedHeights.current[i];
        if (targetHeight > prevH) {
          smoothedHeights.current[i] += (targetHeight - prevH) * 0.38; // Fast attack
        } else {
          smoothedHeights.current[i] += (targetHeight - prevH) * 0.12; // Gentle liquid decay
        }
        const currentH = smoothedHeights.current[i];

        const x = i * (barWidth + gap);
        const y = height - currentH;

        // Draw pill bar
        ctx.beginPath();
        const radius = barWidth / 2;
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, height - radius);
        ctx.quadraticCurveTo(x + barWidth, height, x + barWidth - radius, height);
        ctx.lineTo(x + radius, height);
        ctx.quadraticCurveTo(x, height, x, height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        // Monochromatic single-hue gradient: from deep tone at bottom to luminous tone of the SAME color at top
        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, bottom);
        grad.addColorStop(1, top);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      if (animate && isPlaying) {
        animFrameRef.current = requestAnimationFrame(() => drawFrame(true));
      }
    };

    if (isPlaying) {
      drawFrame(true);
    } else {
      // Idle: render resting bars once and STOP looping animation frames!
      smoothedHeights.current.fill(4);
      drawFrame(false);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, getFrequencyData, barsCount]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        className="w-full h-full max-h-[150px]"
      />
    </div>
  );
};

