import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
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
    <div className="flex items-center justify-between w-full px-1">
      {/* Left utility: Like & Shuffle */}
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
  );
};
