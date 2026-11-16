import React from 'react';
import { Heart, Play } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useUserStore } from '../../context/UserStoreContext';
import { formatDuration } from '../../utils/formatters';

export const LikedSongsView: React.FC = () => {
  const { likedTracks, toggleLike } = useUserStore();
  const { playTrack, currentTrack } = useAudioPlayer();

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-7 flex-1 min-h-0 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Любимые треки</h2>
          <p className="text-xs text-neutral-400 font-mono">
            Сохранено: {likedTracks.length} треков
          </p>
        </div>

        {likedTracks.length > 0 && (
          <button
            onClick={() => playTrack(likedTracks[0], likedTracks)}
            className="px-4 py-2 rounded-xl bg-white text-neutral-950 text-xs font-semibold hover:bg-neutral-200 btn-spring flex items-center gap-2 shadow-md shadow-white/10 cursor-pointer"
          >
            <Play size={14} fill="currentColor" />
            <span>Включить все</span>
          </button>
        )}
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2 no-scrollbar"
        style={{
          contain: 'content',
          transform: 'translateZ(0)',
          overscrollBehavior: 'contain',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {likedTracks.length > 0 ? (
          likedTracks.map((track, i) => {
            const isCurrent = currentTrack?.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => playTrack(track, likedTracks)}
                className={`group relative flex items-center justify-between p-3 rounded-2xl track-row cursor-pointer transition-all duration-200 ${
                  isCurrent
                    ? 'waterfall-selected text-white'
                    : 'bg-white/3 border border-white/5 text-neutral-300'
                }`}
              >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <span className="w-6 text-center text-xs font-mono text-neutral-500">
                  {(i + 1).toString().padStart(2, '0')}
                </span>

                <div className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-900 flex-shrink-0 relative group/art shadow-md shadow-black/40">
                  {track.artwork_url ? (
                    <img
                      src={track.artwork_url}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 flex items-center justify-center transition-opacity">
                    <Play size={16} fill="white" className="text-white" />
                  </div>
                  {/* Waterfall glass optical edge */}
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      boxShadow: 'inset 0 1px 0.5px rgba(255,255,255,0.35), inset 0 0 6px rgba(0,0,0,0.3)',
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                    {track.title}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {track.artist}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pl-3">
                <span className="text-xs font-mono text-neutral-500 tabular-nums">
                  {formatDuration(track.duration)}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(track);
                  }}
                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors"
                >
                  <Heart size={16} fill="currentColor" />
                </button>
              </div>
            </div>
          );
        })
        ) : (
          <div className="py-24 flex flex-col items-center justify-center text-center text-neutral-500 gap-3">
            <Heart size={36} strokeWidth={1} />
            <p className="text-sm font-medium">Нет добавленных треков</p>
            <p className="text-xs text-neutral-600 max-w-sm">
              Нажимайте на сердечко в плеере или в поиске, чтобы сохранять понравившиеся композиции здесь.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
