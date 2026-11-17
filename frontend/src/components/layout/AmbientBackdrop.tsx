import React, { useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import {
  DEFAULT_COVER_PALETTE,
  extractCoverPalette,
  type CoverPalette,
} from '../../utils/colorExtractor';

export const AmbientBackdrop: React.FC = React.memo(() => {
  const { currentTrack } = useAudioPlayer();
  const [palette, setPalette] = useState<CoverPalette>(DEFAULT_COVER_PALETTE);

  // Dual Canvas Crossfader for buttery-smooth 1.2s crossfade between album arts
  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);
  const [activeCanvas, setActiveCanvas] = useState<'A' | 'B'>('A');
  const [hasArtwork, setHasArtwork] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const nextUrl = currentTrack?.artwork_url || null;

    if (nextUrl) {
      extractCoverPalette(nextUrl).then((pal) => {
        if (!isMounted) return;
        setPalette(pal);
        document.documentElement.style.setProperty('--cover-a', pal.coverA);
        document.documentElement.style.setProperty('--cover-b', pal.coverB);
        document.documentElement.style.setProperty('--cover-c', pal.coverC);
        document.documentElement.style.setProperty('--cover-glow', pal.glowColor);
      });

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!isMounted) return;
        // Draw to the INACTIVE canvas, then flip active state for silky crossfade
        const targetCanvas = activeCanvas === 'A' ? canvasRefB.current : canvasRefA.current;
        if (!targetCanvas) return;
        const ctx = targetCanvas.getContext('2d');
        if (!ctx) return;

        const size = 96;
        ctx.clearRect(0, 0, size, size);

        // Pre-bake optical soft blur into the bitmap itself (zero runtime GPU blur overhead)
        try {
          ctx.filter = 'blur(6px)';
        } catch {
          // fallback if filter not supported in canvas
        }
        ctx.drawImage(img, -8, -8, size + 16, size + 16);

        setActiveCanvas((prev) => (prev === 'A' ? 'B' : 'A'));
        setHasArtwork(true);
      };
      img.onerror = () => {
        if (isMounted) setHasArtwork(false);
      };
      img.src = nextUrl;
    } else {
      setPalette(DEFAULT_COVER_PALETTE);
      document.documentElement.style.setProperty('--cover-a', DEFAULT_COVER_PALETTE.coverA);
      document.documentElement.style.setProperty('--cover-b', DEFAULT_COVER_PALETTE.coverB);
      document.documentElement.style.setProperty('--cover-c', DEFAULT_COVER_PALETTE.coverC);
      document.documentElement.style.setProperty('--cover-glow', DEFAULT_COVER_PALETTE.glowColor);
      setHasArtwork(false);
    }

    return () => {
      isMounted = false;
    };
  }, [currentTrack?.artwork_url]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      style={{ contain: 'strict', transform: 'translateZ(0)' }}
    >
      {/* 1. Deep Cosmic Foundation Layer with guaranteed corner coverage */}
      <div
        className="absolute inset-0 transition-colors duration-1000 ease-out"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, ${palette.coverA}55 0%, #0a0b10 82%),
            radial-gradient(circle at 85% 15%, color-mix(in srgb, ${palette.coverB} 35%, transparent) 0%, transparent 65%)
          `,
        }}
      />

      {/* 2. Direct Bilinear Canvas Diffusion with Full-Bleed Scaling (overshoots edges to eliminate blur border gaps) */}
      <canvas
        ref={canvasRefA}
        width={96}
        height={96}
        className={`absolute -inset-[30%] w-[160%] h-[160%] object-cover transition-opacity duration-1200 ease-in-out ${
          hasArtwork && activeCanvas === 'A' ? 'opacity-85' : 'opacity-0'
        }`}
        style={{
          filter: 'saturate(2.2) brightness(0.95)',
          transform: 'translateZ(0) scale(1.4)',
        }}
      />
      <canvas
        ref={canvasRefB}
        width={96}
        height={96}
        className={`absolute -inset-[30%] w-[160%] h-[160%] object-cover transition-opacity duration-1200 ease-in-out ${
          hasArtwork && activeCanvas === 'B' ? 'opacity-85' : 'opacity-0'
        }`}
        style={{
          filter: 'saturate(2.2) brightness(0.95)',
          transform: 'translateZ(0) scale(1.4)',
        }}
      />

      {/* 3. Four Organic Multi-Octave Aurora Nebulas with responsive corner-anchored positioning */}
      {/* Aurora Orb 1: Upper Right (Primary signature hue, fully covers top-right on mobile & desktop) */}
      <div
        className="absolute -top-[10%] -right-[10%] w-[90vw] max-w-[950px] min-w-[500px] h-[80vh] max-h-[900px] min-h-[500px] rounded-full opacity-65 transition-colors duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 70% 30%, ${palette.coverB}, transparent 70%)`,
        }}
      />

      {/* Aurora Orb 2: Lower Left (Deep base glow) */}
      <div
        className="absolute -bottom-[20%] -left-[10%] w-[90vw] max-w-[1050px] min-w-[500px] h-[80vh] max-h-[950px] min-h-[500px] rounded-full opacity-55 transition-colors duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 35% 65%, ${palette.coverA}, transparent 72%)`,
        }}
      />

      {/* Aurora Orb 3: Center & Center-Left (Luminous accent highlight) */}
      <div
        className="absolute top-[20%] left-[10%] w-[70vw] max-w-[750px] h-[60vh] max-h-[750px] rounded-full opacity-45 transition-colors duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 40% 40%, ${palette.coverC}, transparent 65%)`,
        }}
      />

      {/* Aurora Orb 4: Bottom Right (Harmonized radiant glow) */}
      <div
        className="absolute bottom-[5%] right-[5%] w-[70vw] max-w-[800px] h-[60vh] max-h-[750px] rounded-full opacity-40 transition-colors duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 60% 60%, ${palette.glowColor}, transparent 65%)`,
        }}
      />

      {/* 4. Analog Texture Overlay (Eliminates digital color-banding and gives cinematic depth) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="ambient-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ambient-noise)" />
      </svg>

      {/* 5. Center & Bottom Vignette Mask */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10]/85 via-transparent to-[#0a0b10]/20" />
    </div>
  );
});
