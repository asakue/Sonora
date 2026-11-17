import React, { useEffect, useRef, useState } from 'react';
import {
  Heart,
  Loader2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import { useAudioPlayer, type RemixMode } from '../../context/AudioPlayerContext';
import { useUserStore } from '../../context/UserStoreContext';

/**
 * Atmospheric Liquid Glass Volume Capsule:
 * Displays as a clean minimal icon button when idle, and smoothly expands into a liquid frosted glass
 * slider with cover-led gradient glow and percentage readout on hover or drag.
 */
const AtmosphericVolumeControl: React.FC = React.memo(() => {
  const { volume, setVolume, isMuted, toggleMute } = useAudioPlayer();
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentVol = isMuted ? 0 : volume;
  const volPercent = Math.round(currentVol * 100);

  // Global mouseup to release dragging cleanly anywhere on screen
  useEffect(() => {
    if (!isDragging) return;
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging]);

  const isOpen = isHovered || isDragging;

  return (
    <div
      className={`relative flex items-center rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isOpen
          ? 'bg-white/8 border border-white/12 px-2.5 py-1 shadow-xl shadow-black/40 backdrop-blur-md'
          : 'bg-transparent border border-transparent p-0'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsHovered(false);
      }}
    >
      {/* Icon button (always visible) */}
      <button
        onClick={toggleMute}
        aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
        title={isMuted ? 'Включить звук' : 'Выключить звук'}
        className={`p-2.5 rounded-full btn-spring cursor-pointer transition-colors ${
          isOpen ? 'text-white' : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
        }`}
      >
        {isMuted || volume === 0 ? (
          <VolumeX size={18} strokeWidth={1.5} className="text-rose-400" />
        ) : volume < 0.5 ? (
          <Volume1 size={18} strokeWidth={1.5} />
        ) : (
          <Volume2 size={18} strokeWidth={1.5} />
        )}
      </button>

      {/* Smooth Spring-Expanded Slider & Percentage Indicator */}
      <div
        className={`flex items-center gap-2.5 overflow-hidden transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen
            ? 'max-w-[170px] opacity-100 ml-1.5'
            : 'max-w-0 opacity-0 pointer-events-none ml-0'
        }`}
      >
        {/* Atmospheric Liquid Slider Track */}
        <div className="relative w-20 sm:w-24 h-5 flex items-center cursor-pointer">
          {/* Track groove background */}
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/12 overflow-hidden">
            {/* Active Liquid Fill with dynamic cover-led gradient & neon bloom */}
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${volPercent}%`,
                background:
                  'linear-gradient(90deg, var(--cover-b, #6366f1) 0%, var(--cover-c, #a855f7) 60%, #ffffff 100%)',
                boxShadow: isOpen ? '0 0 10px var(--cover-glow, rgba(168,85,247,0.5))' : 'none',
              }}
            />
          </div>

          {/* Real hidden range input for accessible touch & mouse dragging */}
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={currentVol}
            onMouseDown={() => setIsDragging(true)}
            onTouchStart={() => setIsDragging(true)}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
            }}
            aria-label="Уровень громкости"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />

          {/* Specular Liquid Thumb Droplet */}
          <div
            className={`absolute w-3.5 h-3.5 rounded-full bg-white shadow-md pointer-events-none transition-transform duration-100 ${
              isDragging ? 'scale-125' : 'scale-100'
            }`}
            style={{
              left: `calc(${volPercent}% - 7px)`,
              boxShadow:
                '0 1px 4px rgba(0, 0, 0, 0.7), 0 0 8px var(--cover-glow, rgba(168,85,247,0.6)), inset 0 1px 1px rgba(255,255,255,0.9)',
            }}
          />
        </div>

        {/* Numerical Volume Indicator */}
        <span className="text-[11px] font-mono text-neutral-300 tabular-nums w-7 text-right select-none pr-1">
          {volPercent}%
        </span>
      </div>
    </div>
  );
});

/**
 * Live Remix Control Capsule (Magic Wand):
 * Allows real-time on-the-fly audio remixing for the currently playing track:
 * - Original (1.0x, standard sound)
 * - Slowed + Reverb (0.85x speed, lowered pitch, lush spatial reverb)
 * - Speed Up (1.20x speed, raised pitch, Nightcore energetic tempo)
 */
const RemixControl: React.FC = React.memo(() => {
  const { remixMode, setRemixMode, currentTrack } = useAudioPlayer();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isCustomMode = remixMode !== 'original';
  const isSlowed = remixMode === 'slowed';

  const modes: { id: RemixMode; label: string }[] = [
    { id: 'original', label: 'Оригинал' },
    { id: 'slowed', label: 'Slowed + Reverb' },
    { id: 'speed_up', label: 'Speed Up' },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={!currentTrack}
        aria-label="Ремикс трека (Slowed / Speed Up)"
        title={
          isCustomMode
            ? `Активен ремикс: ${remixMode === 'slowed' ? 'Slowed + Reverb' : 'Speed Up'}`
            : 'Ремикс трека (Slowed / Speed Up)'
        }
        className={`relative p-2.5 rounded-full btn-spring cursor-pointer transition-all duration-300 overflow-hidden disabled:opacity-40 disabled:pointer-events-none ${
          isCustomMode
            ? 'scale-105'
            : isOpen
            ? 'bg-white/10 text-white'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
        }`}
        style={
          isCustomMode
            ? isSlowed
              ? {
                  /* Slowed + Reverb: Saturated deep cover tone like Like button, starry cosmic sky, zero shadows */
                  color: 'color-mix(in srgb, var(--cover-b, #a855f7) 90%, white 10%)',
                  background: `
                    radial-gradient(1px 1px at 25% 28%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 72% 32%, rgba(255,255,255,0.85), transparent),
                    radial-gradient(1.2px 1.2px at 45% 72%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(0.8px 0.8px at 80% 65%, rgba(255,255,255,0.75), transparent),
                    radial-gradient(1px 1px at 28% 78%, rgba(255,255,255,0.7), transparent),
                    color-mix(in srgb, var(--cover-b, #a855f7) 14%, rgba(255,255,255,0.01))
                  `,
                  border: '1px solid color-mix(in srgb, var(--cover-b, #a855f7) 28%, transparent)',
                  boxShadow: 'none',
                }
              : {
                  /* Speed Up: Saturated bright luminous cover tone (different hue/shade), starry cosmic sky, zero shadows */
                  color: 'color-mix(in srgb, var(--cover-c, #38bdf8) 90%, white 10%)',
                  background: `
                    radial-gradient(1px 1px at 25% 28%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(1px 1px at 72% 32%, rgba(255,255,255,0.85), transparent),
                    radial-gradient(1.2px 1.2px at 45% 72%, rgba(255,255,255,0.9), transparent),
                    radial-gradient(0.8px 0.8px at 80% 65%, rgba(255,255,255,0.75), transparent),
                    radial-gradient(1px 1px at 28% 78%, rgba(255,255,255,0.7), transparent),
                    color-mix(in srgb, var(--cover-c, #38bdf8) 14%, rgba(255,255,255,0.01))
                  `,
                  border: '1px solid color-mix(in srgb, var(--cover-c, #38bdf8) 28%, transparent)',
                  boxShadow: 'none',
                }
            : undefined
        }
      >
        <Wand2 size={18} strokeWidth={1.85} />
      </button>

      {/* Flyout Glass Popup with 3D Waterfall Edge & Cover Liquid Glass Tint */}
      {isOpen && (
        <div
          className="absolute bottom-full right-0 md:right-auto md:left-0 mb-3 w-44 rounded-2xl p-1.5 z-50 select-none animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
          style={{
            backgroundColor: '#07090e',
            background: `
              radial-gradient(ellipse 90% 50% at 50% 0%, rgba(255, 255, 255, 0.12) 0%, transparent 75%),
              radial-gradient(circle at 15% 15%, color-mix(in srgb, var(--cover-b, #1f2538) 25%, transparent), transparent 60%),
              radial-gradient(circle at 85% 85%, color-mix(in srgb, var(--cover-a, #161b2a) 25%, transparent), transparent 60%),
              linear-gradient(160deg, color-mix(in srgb, var(--cover-a, #121520) 22%, #090a10) 0%, #050609 100%)
            `,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderTopColor: 'rgba(255, 255, 255, 0.32)',
            borderLeftColor: 'rgba(255, 255, 255, 0.20)',
            borderBottomColor: 'rgba(255, 255, 255, 0.06)',
            borderRightColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow:
              '0 24px 50px -10px rgba(0, 0, 0, 0.95), 0 10px 24px -4px rgba(0, 0, 0, 0.8), inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.35), inset 0 -1.5px 2px 0 rgba(0, 0, 0, 0.7), inset 1px 0 1px 0 rgba(255, 255, 255, 0.12), inset -1px 0 1px 0 rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(28px) saturate(190%)',
            WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          }}
        >
          <div className="flex flex-col gap-1">
            {modes.map((m) => {
              const active = remixMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setRemixMode(m.id);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-left text-xs transition-all btn-spring cursor-pointer ${
                    active
                      ? 'waterfall-selected text-white font-medium'
                      : 'text-neutral-400 hover:text-white hover:bg-white/6 font-normal border border-transparent'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export const Controls: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    togglePlay,
    nextTrack,
    prevTrack,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
  } = useAudioPlayer();

  const { isLiked, toggleLike } = useUserStore();
  const liked = currentTrack ? isLiked(currentTrack.id) : false;

  return (
    <div className="w-full">
      {/* Desktop Controls (Single Wide Row) */}
      <div className="hidden md:flex items-center justify-between w-full px-1">
        {/* Left utility: Like, Shuffle & Remix Magic Wand */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => currentTrack && toggleLike(currentTrack)}
            disabled={!currentTrack}
            aria-label={liked ? 'Удалить из любимых' : 'Добавить в любимые'}
            className={`p-2.5 rounded-full btn-spring cursor-pointer ${
              liked
                ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            } disabled:opacity-40 disabled:pointer-events-none`}
          >
            <Heart
              size={18}
              strokeWidth={1.5}
              fill={liked ? 'currentColor' : 'none'}
            />
          </button>

          <button
            onClick={toggleShuffle}
            aria-label="Случайный порядок"
            className={`p-2.5 rounded-full btn-spring cursor-pointer ${
              isShuffle
                ? 'text-indigo-300 bg-indigo-500/15'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            <Shuffle size={18} strokeWidth={1.5} />
          </button>

          {/* Live Remix Magic Wand */}
          <RemixControl />
        </div>

        {/* Center transport controls: Prev, Play/Pause, Next */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevTrack}
            aria-label="Предыдущий трек"
            className="p-2.5 rounded-full btn-spring text-neutral-300 hover:text-white hover:bg-white/8 cursor-pointer"
          >
            <SkipBack size={20} strokeWidth={1.5} />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            className="w-13 h-13 rounded-full bg-white text-neutral-900 flex items-center justify-center shadow-lg shadow-black/40 hover:scale-106 active:scale-94 transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isLoading ? (
              <Loader2 size={22} strokeWidth={2} className="animate-spin text-neutral-800" />
            ) : isPlaying ? (
              <Pause size={22} strokeWidth={2} fill="currentColor" />
            ) : (
              <Play size={22} strokeWidth={2} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            aria-label="Следующий трек"
            className="p-2.5 rounded-full btn-spring text-neutral-300 hover:text-white hover:bg-white/8 cursor-pointer"
          >
            <SkipForward size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Right utility: Repeat & Atmospheric Liquid Glass Volume */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleRepeat}
            aria-label="Режим повтора"
            className={`p-2.5 rounded-full btn-spring cursor-pointer ${
              repeatMode !== 'off'
                ? 'text-indigo-300 bg-indigo-500/15'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 size={18} strokeWidth={1.5} />
            ) : (
              <Repeat size={18} strokeWidth={1.5} />
            )}
          </button>

          {/* Liquid Glass Volume Control Capsule */}
          <AtmosphericVolumeControl />
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="flex md:hidden flex-col gap-3 w-full px-1">
        {/* Row 1: Like, Prev, Play/Pause (center), Next, Remix */}
        <div className="flex items-center justify-between w-full max-w-sm mx-auto px-1 sm:px-3">
          {/* Слева: кнопка лайка */}
          <button
            onClick={() => currentTrack && toggleLike(currentTrack)}
            disabled={!currentTrack}
            aria-label={liked ? 'Удалить из любимых' : 'Добавить в любимые'}
            className={`p-2.5 rounded-full btn-spring cursor-pointer transition-colors ${
              liked
                ? 'text-rose-400 bg-rose-500/15'
                : 'text-neutral-400 hover:text-neutral-200 bg-white/4'
            } disabled:opacity-40 disabled:pointer-events-none`}
          >
            <Heart
              size={20}
              strokeWidth={1.75}
              fill={liked ? 'currentColor' : 'none'}
            />
          </button>

          {/* Предыдущий (туда) */}
          <button
            onClick={prevTrack}
            aria-label="Предыдущий трек"
            className="p-2.5 rounded-full btn-spring text-neutral-300 active:scale-90 hover:text-white cursor-pointer"
          >
            <SkipBack size={24} strokeWidth={1.75} />
          </button>

          {/* Посередине: Стоп / Старт */}
          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
            className="w-14 h-14 rounded-full bg-white text-neutral-900 flex items-center justify-center shadow-lg shadow-black/50 active:scale-92 transition-transform duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isLoading ? (
              <Loader2 size={24} strokeWidth={2.2} className="animate-spin text-neutral-800" />
            ) : isPlaying ? (
              <Pause size={24} strokeWidth={2.2} fill="currentColor" />
            ) : (
              <Play size={24} strokeWidth={2.2} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* Следующий (сюда) */}
          <button
            onClick={nextTrack}
            aria-label="Следующий трек"
            className="p-2.5 rounded-full btn-spring text-neutral-300 active:scale-90 hover:text-white cursor-pointer"
          >
            <SkipForward size={24} strokeWidth={1.75} />
          </button>

          {/* Справа: кнопка ремиксов */}
          <RemixControl />
        </div>

        {/* Row 2: Ниже кнопки петли и перемешивания */}
        <div className="flex items-center justify-between w-full max-w-[210px] xs:max-w-[230px] mx-auto px-2 pt-0.5">
          {/* Перемешивание */}
          <button
            onClick={toggleShuffle}
            aria-label="Случайный порядок"
            className={`p-2.5 rounded-full btn-spring cursor-pointer transition-colors ${
              isShuffle
                ? 'text-indigo-300 bg-indigo-500/18'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Shuffle size={20} strokeWidth={1.75} />
          </button>

          {/* Петля (повтор) */}
          <button
            onClick={toggleRepeat}
            aria-label="Режим повтора"
            className={`p-2.5 rounded-full btn-spring cursor-pointer transition-colors ${
              repeatMode !== 'off'
                ? 'text-indigo-300 bg-indigo-500/18'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 size={20} strokeWidth={1.75} />
            ) : (
              <Repeat size={20} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
