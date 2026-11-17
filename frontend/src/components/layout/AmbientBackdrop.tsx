import React, { useEffect, useState } from 'react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import {
  DEFAULT_COVER_PALETTE,
  extractCoverPalette,
  type CoverPalette,
} from '../../utils/colorExtractor';

export const AmbientBackdrop: React.FC = React.memo(() => {
  const { currentTrack } = useAudioPlayer();
  const [palette, setPalette] = useState<CoverPalette>(DEFAULT_COVER_PALETTE);

  // Dual Image Crossfader for buttery-smooth 1.2s crossfade between album arts
  const [activeArtwork, setActiveArtwork] = useState<string | null>(null);
  const [prevArtwork, setPrevArtwork] = useState<string | null>(null);
  const [isFading, setIsFading] = useState(false);

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

      if (nextUrl !== activeArtwork) {
        setPrevArtwork(activeArtwork);
        setActiveArtwork(nextUrl);
        setIsFading(true);

        const timer = setTimeout(() => {
          if (isMounted) {
            setIsFading(false);
            setPrevArtwork(null);
          }
        }, 1200);

        return () => {
          isMounted = false;
          clearTimeout(timer);
        };
      }
    } else {
      setPalette(DEFAULT_COVER_PALETTE);
      document.documentElement.style.setProperty('--cover-a', DEFAULT_COVER_PALETTE.coverA);
      document.documentElement.style.setProperty('--cover-b', DEFAULT_COVER_PALETTE.coverB);
      document.documentElement.style.setProperty('--cover-c', DEFAULT_COVER_PALETTE.coverC);
      document.documentElement.style.setProperty('--cover-glow', DEFAULT_COVER_PALETTE.glowColor);
      setActiveArtwork(null);
      setPrevArtwork(null);
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
      {/* 1. Deep Cosmic Foundation Layer */}
      <div
        className="absolute inset-0 transition-colors duration-1000 ease-out"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${palette.coverA}55 0%, #08090e 85%)`,
        }}
      />

      {/* 2. Direct Artwork Diffusion Layers (100% CORS-immune, rich hardware-accelerated blur) */}
      {prevArtwork && (
        <img
          key={`prev-${prevArtwork}`}
          src={prevArtwork}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1200 ease-in-out pointer-events-none ${
            isFading ? 'opacity-0' : 'opacity-70'
          }`}
          style={{
            filter: 'blur(52px) saturate(230%) brightness(0.85)',
            transform: 'scale(1.35) translateZ(0)',
          }}
        />
      )}

      {activeArtwork && (
        <img
          key={`active-${activeArtwork}`}
          src={activeArtwork}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1200 ease-in-out pointer-events-none ${
            isFading ? 'opacity-70 animate-in fade-in duration-1000' : 'opacity-70'
          }`}
          style={{
            filter: 'blur(52px) saturate(230%) brightness(0.85)',
            transform: 'scale(1.35) translateZ(0)',
          }}
        />
      )}

      {/* 3. Responsive Multi-Point Aurora Nebulas (Viewport percentages guarantee full coverage across any screen ratio) */}
      {/* Upper Right: Primary signature glow (illuminates top right corner on all devices) */}
      <div
        className="absolute top-0 right-0 w-[80vw] max-w-[900px] h-[75vh] max-h-[850px] rounded-full opacity-65 transition-colors duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 80% 20%, ${palette.coverB}, transparent 70%)`,
          transform: 'translate(15%, -15%) translateZ(0)',
        }}
      />

      {/* Lower Left: Deep mood foundation */}
      <div
        className="absolute bottom-0 left-0 w-[85vw] max-w-[950px] h-[75vh] max-h-[850px] rounded-full opacity-60 transition-colors duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 20% 80%, ${palette.coverA}, transparent 72%)`,
          transform: 'translate(-15%, 15%) translateZ(0)',
        }}
      />

      {/* Center / Upper Left: Luminous accent highlight */}
      <div
        className="absolute top-[15%] left-[5%] w-[65vw] max-w-[700px] h-[60vh] max-h-[650px] rounded-full opacity-50 transition-colors duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${palette.coverC}, transparent 65%)`,
          transform: 'translateZ(0)',
        }}
      />

      {/* Bottom Right: Harmonized radiant glow */}
      <div
        className="absolute bottom-[2%] right-[5%] w-[65vw] max-w-[700px] h-[60vh] max-h-[650px] rounded-full opacity-45 transition-colors duration-1000 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 65% 65%, ${palette.glowColor}, transparent 65%)`,
          transform: 'translateZ(0)',
        }}
      />

      {/* 4. Analog Texture Overlay for cinematic depth & zero digital banding */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035] pointer-events-none mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="ambient-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ambient-noise)" />
      </svg>

      {/* 5. Smooth Cinematic Edge Vignette (Gentle darkening at borders, no abrupt dark voids) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 110% 90% at 50% 45%, transparent 35%, rgba(8, 9, 14, 0.4) 75%, rgba(6, 7, 12, 0.8) 100%)',
        }}
      />
    </div>
  );
});
