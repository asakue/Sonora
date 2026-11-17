import React, { useState } from 'react';
import {
  Disc,
  Flame,
  Loader2,
  Play,
  Radio,
  Sparkles,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useUserStore } from '../../context/UserStoreContext';
import type { MildWaveStyle, Track } from '../../types/music';
import { formatDuration } from '../../utils/formatters';
import { getApiBase } from '../../config';

interface MildWaveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const STYLES: { id: MildWaveStyle; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'aura', label: 'Аура', desc: 'Эфирный эмбиент и текстурный звук', icon: <Waves size={18} /> },
  { id: 'chill', label: 'Чилаут', desc: 'Спокойный lo-fi и даунтемпо', icon: <Wind size={18} /> },
  { id: 'vinyl', label: 'Винил', desc: 'Теплый аналоговый джаз и ретро', icon: <Disc size={18} /> },
  { id: 'energetic', label: 'Драйв', desc: 'Синтвейв, ритм и электроника', icon: <Flame size={18} /> },
  { id: 'discovery', label: 'Открытия', desc: 'Редкие и неочевидные треки', icon: <Sparkles size={18} /> },
];

export const MildWaveDrawer: React.FC<MildWaveDrawerProps> = ({ isOpen, onClose }) => {
  const { currentTrack, playTrack, setQueue } = useAudioPlayer();
  const { likedTracks, historyTracks, mildWaveStyle, setMildWaveStyle } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [waveTracks, setWaveTracks] = useState<Track[]>([]);
  const [generated, setGenerated] = useState(false);

  const generateWave = async () => {
    setLoading(true);
    setGenerated(true);
    try {
      const res = await fetch(`${getApiBase()}/api/mildwave/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_track_id: currentTrack?.id || null,
          liked_track_ids: likedTracks.slice(0, 10).map((t) => t.id),
          history_track_ids: historyTracks.slice(0, 20).map((t) => t.id),
          style_preset: mildWaveStyle,
          limit: 20,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWaveTracks(data.tracks || []);
      }
    } catch (e) {
      console.error('MildWave error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWave = () => {
    if (waveTracks.length > 0) {
      setQueue(waveTracks);
      playTrack(waveTracks[0], waveTracks);
      onClose();
    }
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
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-end">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 btn-spring cursor-pointer"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Style Selector */}
        <div className="p-6 border-b border-white/8">
          <p className="text-xs font-semibold text-neutral-300 mb-3 uppercase tracking-wider">
            Настроение волны:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STYLES.map((style) => {
              const active = mildWaveStyle === style.id;
              return (
                <button
                  key={style.id}
                  onClick={() => setMildWaveStyle(style.id)}
                  className={`p-3 rounded-xl text-left border btn-spring cursor-pointer ${
                    active
                      ? 'bg-indigo-600/20 border-indigo-400/40 text-white'
                      : 'bg-white/3 border-white/6 hover:bg-white/7 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <div className={`mb-1.5 ${active ? 'text-indigo-300' : 'text-neutral-400'}`}>
                    {style.icon}
                  </div>
                  <div className="text-xs font-semibold">{style.label}</div>
                  <div className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">
                    {style.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-neutral-400">
              {currentTrack ? (
                <span>Семена: <strong className="text-white">{currentTrack.title}</strong></span>
              ) : likedTracks.length > 0 ? (
                <span>Семена: на базе ваших {likedTracks.length} лайков</span>
              ) : (
                <span>Семена: глобальный curated SoundCloud поток</span>
              )}
            </div>

            <button
              onClick={generateWave}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-white text-neutral-950 font-semibold text-xs hover:bg-neutral-200 btn-spring shadow-md shadow-white/10 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Генерируем...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Собрать волну</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <div
          className="flex-1 overflow-y-auto p-6 space-y-2"
          style={{ contain: 'content', transform: 'translateZ(0)', overscrollBehavior: 'contain' }}
        >
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
              <p className="text-xs">Анализируем схожесть треков и формируем волну...</p>
            </div>
          ) : waveTracks.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-neutral-400">
                  Сформировано {waveTracks.length} треков
                </span>
                <button
                  onClick={handleStartWave}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 text-xs font-semibold flex items-center gap-1.5 btn-spring cursor-pointer"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Слушать всю волну</span>
                </button>
              </div>

              {waveTracks.map((track, i) => (
                <div
                  key={track.id}
                  onClick={() => {
                    playTrack(track, waveTracks);
                    onClose();
                  }}
                  className="group flex items-center justify-between p-2.5 rounded-xl bg-white/3 border border-white/5 track-row cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-5 text-center text-xs font-mono text-neutral-500">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>

                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-900 flex-shrink-0 relative shadow-md shadow-black/40">
                      {track.artwork_url ? (
                        <img
                          src={track.artwork_url}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
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
                      <p className="text-[11px] text-neutral-400 truncate">
                        {track.artist}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-neutral-500 tabular-nums pl-2">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              ))}
            </>
          ) : generated ? (
            <div className="py-20 flex flex-col items-center justify-center text-center text-neutral-500 gap-2">
              <Radio size={32} strokeWidth={1.2} />
              <p className="text-sm font-medium">Не удалось собрать подборку</p>
              <p className="text-xs text-neutral-600">Попробуйте сменить настройку настроения или выбрать другой трек</p>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center text-neutral-500 gap-2">
              <Radio size={32} strokeWidth={1.2} />
              <p className="text-sm font-medium">Персональный поток MildWave</p>
              <p className="text-xs text-neutral-600 max-w-xs">
                Алгоритм анализирует текущий трек, ваши лайки и схожие акустические паттерны, создавая бесконечное гармоничное радио.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
