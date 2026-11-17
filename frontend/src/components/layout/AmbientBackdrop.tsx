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
      {/* 1. Deep Cosmic Foundation Layer: Pinned to corners to ensure continuous edge-to-edge color coverage */}
      <div
        className="absolute inset-0 transition-colors duration-1000 ease-out"
        style={{
          background: `
            radial-gradient(circle at 100% 0%, ${palette.coverB}45 0%, transparent 65%),
            radial-gradient(circle at 0% 100%, ${palette.coverA}40 0%, transparent 65%),
            radial-gradient(ellipse at 50% 30%, ${palette.coverA}40 0%, #0a0b10 80%)
          `,
        }}
      />

      {/* 2. Direct Bilinear Canvas Diffusion with Dual-Crossfade */}
      <canvas
        ref={canvasRefA}
        width={96}
        height={96}
        className={`absolute inset-0 w-full h-full object-cover scale-125 transition-opacity duration-1200 ease-in-out ${
          hasArtwork && activeCanvas === 'A' ? 'opacity-80' : 'opacity-0'
        }`}
        style={{
          filter: 'saturate(2.2) brightness(0.95)',
          transform: 'translateZ(0) scale(1.3)',
        }}
      />
      <canvas
        ref={canvasRefB}
        width={96}
        height={96}
        className={`absolute inset-0 w-full h-full object-cover scale-125 transition-opacity duration-1200 ease-in-out ${
          hasArtwork && activeCanvas === 'B' ? 'opacity-80' : 'opacity-0'
        }`}
        style={{
          filter: 'saturate(2.2) brightness(0.95)',
          transform: 'translateZ(0) scale(1.3)',
        }}
      />

      {/* 3. Four Organic Multi-Octave Aurora Nebulas - scaled & anchored so they never clip or shift off-screen on mobile */}
      {/* Aurora Orb 1: Upper Right (Primary signature hue) */}
      <div
        className="absolute pointer-events-none transition-colors duration-1000"
        style={{
          left: '92%',
          top: '12%',
          width: 'max(1000px, 95vw)',
          height: 'max(950px, 75vh)',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle farthest-corner at center, ${palette.coverB}, transparent 75%)`,
          opacity: 0.65,
        }}
      />

      {/* Aurora Orb 2: Lower Left (Deep base glow) */}
      <div
        className="absolute pointer-events-none transition-colors duration-1000"
        style={{
          left: '8%',
          top: '88%',
          width: 'max(1100px, 100vw)',
          height: 'max(1000px, 80vh)',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle farthest-corner at center, ${palette.coverA}, transparent 75%)`,
          opacity: 0.60,
        }}
      />

      {/* Aurora Orb 3: Center & Center-Left (Luminous accent highlight) */}
      <div
        className="absolute pointer-events-none transition-colors duration-1000"
        style={{
          left: '35%',
          top: '48%',
          width: 'max(800px, 70vw)',
          height: 'max(800px, 70vh)',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle farthest-corner at center, ${palette.coverC}, transparent 70%)`,
          opacity: 0.45,
        }}
      />

      {/* Aurora Orb 4: Bottom Right (Harmonized radiant glow) */}
      <div
        className="absolute pointer-events-none transition-colors duration-1000"
        style={{
          left: '72%',
          top: '65%',
          width: 'max(850px, 75vw)',
          height: 'max(800px, 70vh)',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle farthest-corner at center, ${palette.glowColor}, transparent 70%)`,
          opacity: 0.45,
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

      {/* 5. Bottom Contrast Vignette (grounding controls without muddying top ambient light) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10]/80 via-transparent to-transparent pointer-events-none" />
    </div>
  );
});
