import React, { useEffect, useState } from 'react';
import {
  Heart,
  ListPlus,
  Loader2,
  Music,
  Play,
  Search,
  X,
} from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useUserStore } from '../../context/UserStoreContext';
import type { Track } from '../../types/music';
import { formatDuration, formatNumberCompact } from '../../utils/formatters';
import { API_BASE } from '../../config';

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_TAGS = ['Ambient', 'Synthwave', 'Lofi hip hop', 'Dream pop', 'Deep house', 'Cyberpunk'];

export const SearchDrawer: React.FC<SearchDrawerProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const { playTrack, addToQueue } = useAudioPlayer();
  const { isLiked, toggleLike } = useUserStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const performSearch = async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(term)}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.tracks || []);
      } else {
        setResults([]);
      }
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleQuickTagClick = (tag: string) => {
    setQuery(tag);
    performSearch(tag);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 animate-fade-in cursor-pointer"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xl h-full glass-panel border-l border-white/10 flex flex-col shadow-2xl z-10 animate-drawer-in">
        {/* Header */}
        <div className="p-6 border-b border-white/8 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Поиск треков</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 btn-spring cursor-pointer"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Search input */}
        <div className="p-6 border-b border-white/8">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <Search
              size={18}
              strokeWidth={1.5}
              className="absolute left-3.5 text-neutral-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Название трека, исполнитель или стиль..."
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-24 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-400/50 focus:bg-white/8 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white btn-spring disabled:opacity-40 cursor-pointer"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Найти'}
            </button>
          </form>

          {/* Quick tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleQuickTagClick(tag)}
                className="px-2.5 py-1 rounded-lg text-xs bg-white/4 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/6 btn-spring cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Results view */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-2"
          style={{ contain: 'content', transform: 'translateZ(0)', overscrollBehavior: 'contain' }}
        >
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
              <p className="text-xs">Ищем в SoundCloud API...</p>
            </div>
          ) : results.length > 0 ? (
            results.map((track) => {
              const liked = isLiked(track.id);
              return (
                <div
                  key={track.id}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white/3 border border-white/5 track-row"
                >
                  <div
                    className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      playTrack(track, results);
                      onClose();
                    }}
                  >
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-900 flex-shrink-0 relative group/art shadow-md shadow-black/40">
                      {track.artwork_url ? (
                        <img
                          src={track.artwork_url}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <Music size={18} />
                        </div>
                      )}
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
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500 font-mono">
                        {track.playback_count ? (
                          <span>▶ {formatNumberCompact(track.playback_count)}</span>
                        ) : null}
                        <span>{formatDuration(track.duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pl-3">
                    <button
                      onClick={() => toggleLike(track)}
                      title={liked ? 'Удалить из избранного' : 'В избранное'}
                      className={`p-2 rounded-lg btn-spring cursor-pointer ${
                        liked ? 'text-rose-400 bg-rose-500/10' : 'text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Heart size={15} strokeWidth={1.5} fill={liked ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      onClick={() => addToQueue(track)}
                      title="Добавить в очередь"
                      className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 btn-spring cursor-pointer"
                    >
                      <ListPlus size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : searched ? (
            <div className="py-20 flex flex-col items-center justify-center text-center text-neutral-500 gap-2">
              <Search size={32} strokeWidth={1.2} />
              <p className="text-sm font-medium">Ничего не нашлось</p>
              <p className="text-xs text-neutral-600">Попробуйте изменить поисковый запрос</p>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center text-neutral-500 gap-2">
              <Search size={32} strokeWidth={1.2} />
              <p className="text-sm font-medium">Поиск по всей библиотеке SoundCloud</p>
              <p className="text-xs text-neutral-600">Введите ключевое слово или выберите тег выше</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
