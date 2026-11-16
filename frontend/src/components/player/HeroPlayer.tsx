import React, { useState } from 'react';
import { Disc3 } from 'lucide-react';
import { useAudioPlayer, useAudioProgress } from '../../context/AudioPlayerContext';
import { formatTimeSeconds } from '../../utils/formatters';
import { Controls } from './Controls';

const TimelineScrubber: React.FC<{ disabled: boolean }> = React.memo(({ disabled }) => {
  const { currentTime, duration, seek } = useAudioProgress();
  const { currentTrack } = useAudioPlayer();
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);

  const effectiveDuration = duration > 0 ? duration : (currentTrack?.duration || 0);
  const progressPercent = effectiveDuration > 0 ? Math.max(0, Math.min(100, (currentTime / effectiveDuration) * 100)) : 0;

  return (
    <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
      <span className="w-10 text-right tabular-nums">{formatTimeSeconds(currentTime)}</span>

      <div
        className="relative flex-1 flex items-center h-6 cursor-pointer"
        onMouseEnter={() => setIsHoveringSeek(true)}
        onMouseLeave={() => setIsHoveringSeek(false)}
      >
        {/* Custom filled progress track */}
        <div className="absolute inset-x-0 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-300 to-white transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <input
          type="range"
          min={0}
          max={effectiveDuration || 100}
          step={0.5}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          disabled={disabled || effectiveDuration === 0}
          aria-label="Позиция трека"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {/* Glowing scrubber thumb dot */}
        <div
          className={`absolute w-3 h-3 bg-white rounded-full shadow-md pointer-events-none transition-transform duration-100 ${
            isHoveringSeek ? 'scale-125' : 'scale-100'
          }`}
          style={{
            left: `calc(${progressPercent}% - 6px)`,
          }}
        />
      </div>

      <span className="w-10 text-left tabular-nums">{formatTimeSeconds(effectiveDuration)}</span>
    </div>
  );
});

export const HeroPlayer: React.FC = React.memo(() => {
  const { currentTrack, isPlaying, errorMessage } = useAudioPlayer();

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-7 flex flex-col justify-between flex-1 min-h-0 relative overflow-hidden">
      {/* Core display: Cover + Track details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-center my-auto z-10 min-h-0">
        {/* Cover artwork with waterfall curved glass (clean, zero back shadow) */}
        <div className="md:col-span-5 flex justify-center">
          <div className="relative group">
            {/* Waterfall-Edge Curved Artwork */}
            <div
              className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56 lg:w-64 lg:h-64 xl:w-72 xl:h-72 max-h-[38vh] max-w-[38vh] aspect-square rounded-[2rem] overflow-hidden bg-neutral-900 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.025]"
              style={{
                boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
              }}
            >
              {currentTrack?.artwork_url ? (
                <img
                  key={currentTrack.id}
                  src={currentTrack.artwork_url}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover animate-track-reveal transition-opacity duration-500"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-500 gap-3">
                  <Disc3 size={64} strokeWidth={1} className={isPlaying ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
                  <span className="text-xs font-mono tracking-wide text-neutral-400">MildWave Studio</span>
                </div>
              )}

              {/* Waterfall Glass 3D Curved Edge Lens & Specular Sheen */}
              <div
                className="absolute inset-0 rounded-[2rem] pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at center, transparent 65%, rgba(0, 0, 0, 0.4) 100%), linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.05) 25%, transparent 50%, rgba(0, 0, 0, 0.25) 100%)',
                  boxShadow:
                    'inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1.5px 2px 0 rgba(0, 0, 0, 0.6), inset 1.5px 0 1.5px 0 rgba(255, 255, 255, 0.2), inset -1.5px 0 1.5px 0 rgba(0, 0, 0, 0.35)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Track info with smooth enter transition on track change */}
        <div className="md:col-span-7 flex flex-col justify-center min-w-0">
          {currentTrack ? (
            <div key={currentTrack.id} className="animate-track-reveal">
              <h1 className="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-bold tracking-tight text-white mb-2 leading-tight line-clamp-2">
                {currentTrack.title}
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-neutral-300 font-medium truncate">
                {currentTrack.artist}
              </p>
            </div>
          ) : (
            <div className="py-6 animate-track-reveal">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-300 mb-2">
                Музыкальный плеер
              </h2>
              <p className="text-neutral-400 text-sm max-w-md">
                Выберите трек через поиск SoundCloud или запустите волну MildWave, чтобы наполнить пространство звуком.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Progress scrubber & Controls */}
      <div className="z-10 flex flex-col gap-2.5 mt-auto pt-2">
        {/* Timeline */}
        <TimelineScrubber disabled={!currentTrack} />

        {/* Transport controls */}
        <Controls />
      </div>
    </div>
  );
});
