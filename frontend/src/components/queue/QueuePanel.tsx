import React, { useCallback, useState } from 'react';
import { ListMusic, Play, Sparkles, Trash2, X } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useUserStore } from '../../context/UserStoreContext';
import { buildPersonalizedQueue } from '../../services/recommendation';
import type { Track } from '../../types/music';
import { formatDuration } from '../../utils/formatters';

interface QueueItemProps {
  track: Track;
  idx: number;
  isCurrent: boolean;
  onPlay: (track: Track) => void;
  onRemove: (idx: number) => void;
}

const QueueItem: React.FC<QueueItemProps> = React.memo(({
  track,
  idx,
  isCurrent,
  onPlay,
  onRemove,
}) => {
  return (
    <div
      onClick={() => onPlay(track)}
      className={`group relative flex items-center justify-between p-2 rounded-2xl track-row cursor-pointer transition-all duration-200 ${
        isCurrent
          ? 'waterfall-selected text-white'
          : 'text-neutral-300 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="w-5 text-center text-xs font-mono text-neutral-500">
          {isCurrent ? (
            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
          ) : (
            (idx + 1).toString().padStart(2, '0')
          )}
        </span>

        <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-900 flex-shrink-0 relative shadow-md shadow-black/40">
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
              <Play size={14} fill="currentColor" />
            </div>
          )}
          {/* Waterfall glass optical edge */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              boxShadow: 'inset 0 1px 0.5px rgba(255,255,255,0.35), inset 0 0 6px rgba(0,0,0,0.3)',
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium truncate ${isCurrent ? 'text-white' : 'text-neutral-200'}`}>
            {track.title}
          </p>
          <p className="text-[11px] text-neutral-400 truncate">
            {track.artist}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-2">
        <span className="text-xs font-mono text-neutral-500 tabular-nums">
          {formatDuration(track.duration)}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(idx);
          }}
          aria-label="Удалить из очереди"
          className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-rose-400 p-1 transition-opacity duration-100 cursor-pointer"
        >
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
});

export const QueuePanel: React.FC = React.memo(() => {
  const { queue, queueIndex, playTrack, removeFromQueue, setQueue } = useAudioPlayer();
  const { likedTracks, historyTracks } = useUserStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleClear = useCallback(() => {
    setQueue([]);
  }, [setQueue]);

  const handleGenerateMix = useCallback(async () => {
    setIsGenerating(true);
    try {
      const { queue: newQueue, initialTrack } = await buildPersonalizedQueue(likedTracks, historyTracks);
      if (newQueue.length > 0) {
        setQueue(newQueue);
        if (initialTrack) {
          playTrack(initialTrack, newQueue);
        }
      }
    } finally {
      setIsGenerating(false);
    }
  }, [likedTracks, historyTracks, setQueue, playTrack]);

  const handlePlayTrack = useCallback((track: Track) => {
    playTrack(track);
  }, [playTrack]);

  const handleRemove = useCallback((idx: number) => {
    removeFromQueue(idx);
  }, [removeFromQueue]);

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ListMusic size={18} strokeWidth={1.5} className="text-neutral-400" />
          <h2 className="text-sm font-semibold tracking-tight text-white">Up Next</h2>
          <span className="text-xs font-mono text-neutral-500">({queue.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleGenerateMix}
            disabled={isGenerating}
            title="Пересобрать персональную подборку на основе лайков и истории"
            className="text-xs text-neutral-300 hover:text-white btn-spring flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg bg-white/6 hover:bg-white/12 border border-white/10 transition-all"
          >
            <Sparkles size={12} strokeWidth={1.5} className={isGenerating ? 'animate-spin text-indigo-400' : 'text-indigo-400'} />
            <span className="hidden sm:inline">{isGenerating ? 'Микс...' : 'Микс'}</span>
          </button>

          {queue.length > 0 && (
            <button
              onClick={handleClear}
              title="Очистить очередь"
              className="text-xs text-neutral-400 hover:text-neutral-200 btn-spring flex items-center gap-1 cursor-pointer p-1 rounded-lg hover:bg-white/5"
            >
              <Trash2 size={13} strokeWidth={1.5} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Track list with GPU layer isolation for 120 FPS hover performance */}
      <div
        className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 no-scrollbar"
        style={{
          contain: 'content',
          transform: 'translateZ(0)',
          overscrollBehavior: 'contain',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {queue.length > 0 ? (
          queue.map((track, idx) => (
            <QueueItem
              key={`${track.id}-${idx}`}
              track={track}
              idx={idx}
              isCurrent={idx === queueIndex}
              onPlay={handlePlayTrack}
              onRemove={handleRemove}
            />
          ))
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center text-neutral-500 gap-2">
            <ListMusic size={28} strokeWidth={1.2} />
            <p className="text-xs">Очередь воспроизведения пуста</p>
            <p className="text-[11px] text-neutral-600">Найдите трек или включите MildWave</p>
          </div>
        )}
      </div>
    </div>
  );
});

