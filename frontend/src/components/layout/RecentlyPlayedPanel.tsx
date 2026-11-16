import React from 'react';
import { History, Play } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useUserStore } from '../../context/UserStoreContext';

export const RecentlyPlayedPanel: React.FC = React.memo(() => {
  const { historyTracks } = useUserStore();
  const { playTrack } = useAudioPlayer();

  const recentItems = historyTracks.slice(0, 3);

  return (
    <div className="glass-panel rounded-3xl px-5 py-3 sm:px-6 sm:py-3.5 flex flex-col justify-center flex-shrink-0 min-h-[92px] max-h-[105px]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <History size={14} strokeWidth={1.5} className="text-neutral-400" />
          <span className="text-xs font-semibold text-neutral-300">Недавно играли</span>
        </div>
        {recentItems.length > 0 && (
          <span className="text-[11px] font-mono text-neutral-500">
            {recentItems.length} трека
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {recentItems.length > 0 ? (
          recentItems.map((track) => (
            <div
              key={track.id}
              onClick={() => playTrack(track)}
              className="group flex items-center gap-2.5 p-2 rounded-xl bg-white/3 hover:bg-white/8 border border-white/5 hover:border-white/12 track-row cursor-pointer transition-all"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0 relative shadow-sm shadow-black/40">
                {track.artwork_url ? (
                  <img
                    src={track.artwork_url}
                    alt={track.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-500">
                    <Play size={12} fill="currentColor" />
                  </div>
                )}
                {/* Waterfall optical edge */}
                <div
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{
                    boxShadow: 'inset 0 1px 0.5px rgba(255,255,255,0.35), inset 0 0 4px rgba(0,0,0,0.3)',
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate group-hover:text-indigo-300 transition-colors">
                  {track.title}
                </p>
                <p className="text-[10px] text-neutral-400 truncate">
                  {track.artist}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 py-1 text-center text-xs text-neutral-500 font-mono">
            Треки появятся здесь по мере воспроизведения
          </div>
        )}
      </div>
    </div>
  );
});

