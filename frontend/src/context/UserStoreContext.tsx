import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MildWaveStyle, Track } from '../types/music';
import type { TrackListeningStats, UserPreferenceProfile } from '../types/userProfile';
import { recordListeningEvent, deriveAggregatedPreferences } from '../services/preferenceEngine';

interface UserStoreContextType {
  likedTracks: Track[];
  historyTracks: Track[];
  statsByTrackId: Record<number, TrackListeningStats>;
  isLiked: (trackId: number) => boolean;
  toggleLike: (track: Track) => void;
  addToHistory: (track: Track) => void;
  clearHistory: () => void;
  recordListeningSession: (track: Track, listenedSeconds: number) => void;
  mildWaveStyle: MildWaveStyle;
  setMildWaveStyle: (style: MildWaveStyle) => void;
}

const UserStoreContext = createContext<UserStoreContextType | null>(null);

const STORAGE_KEY = 'sonora_user_storage_v1';

export const UserStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [likedTracks, setLikedTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_likes`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [historyTracks, setHistoryTracks] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_history`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [statsByTrackId, setStatsByTrackId] = useState<Record<number, TrackListeningStats>>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_stats`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [mildWaveStyle, setMildWaveStyle] = useState<MildWaveStyle>(() => {
    try {
      return (localStorage.getItem(`${STORAGE_KEY}_style`) as MildWaveStyle) || 'aura';
    } catch {
      return 'aura';
    }
  });

  // Restore persistent profile from Electron %APPDATA%\Sonora if available
  useEffect(() => {
    // @ts-expect-error electronAPI exposed in preload
    if (window.electronAPI?.getUserProfile) {
      // @ts-expect-error electronAPI exposed in preload
      window.electronAPI.getUserProfile().then((profile: UserPreferenceProfile | null) => {
        if (profile) {
          if (profile.likedTracks && Array.isArray(profile.likedTracks) && profile.likedTracks.length > 0) {
            setLikedTracks(profile.likedTracks);
          }
          if (profile.historyTracks && Array.isArray(profile.historyTracks) && profile.historyTracks.length > 0) {
            setHistoryTracks(profile.historyTracks);
          }
          if (profile.mildWaveStyle) {
            setMildWaveStyle(profile.mildWaveStyle);
          }
          if (profile.statsByTrackId && Object.keys(profile.statsByTrackId).length > 0) {
            setStatsByTrackId(profile.statsByTrackId);
          }
        }
      });
    }
  }, []);

  // Save to both localStorage and Electron AppData persistent profile
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_likes`, JSON.stringify(likedTracks));
      localStorage.setItem(`${STORAGE_KEY}_history`, JSON.stringify(historyTracks));
      localStorage.setItem(`${STORAGE_KEY}_stats`, JSON.stringify(statsByTrackId));
      localStorage.setItem(`${STORAGE_KEY}_style`, mildWaveStyle);
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }

    // Persist to %APPDATA%\Sonora\user_profile.json
    // @ts-expect-error electronAPI exposed in preload
    if (window.electronAPI?.saveUserProfile) {
      const { topArtists, topGenres } = deriveAggregatedPreferences(statsByTrackId);
      const profileData: UserPreferenceProfile = {
        version: 1,
        lastUpdated: Date.now(),
        statsByTrackId,
        topArtists,
        topGenres,
        likedTracks,
        historyTracks,
        mildWaveStyle,
      };
      // @ts-expect-error electronAPI exposed in preload
      window.electronAPI.saveUserProfile(profileData).catch(() => {});
    }
  }, [likedTracks, historyTracks, statsByTrackId, mildWaveStyle]);

  const isLiked = useCallback((trackId: number): boolean => {
    return likedTracks.some((t) => t.id === trackId);
  }, [likedTracks]);

  const toggleLike = useCallback((track: Track) => {
    setLikedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
      const willBeLiked = !exists;
      // Also update isLiked flag in stats
      setStatsByTrackId((stats) => {
        if (stats[track.id]) {
          return {
            ...stats,
            [track.id]: {
              ...stats[track.id],
              isLiked: willBeLiked,
            },
          };
        }
        return stats;
      });

      if (exists) {
        return prev.filter((t) => t.id !== track.id);
      } else {
        return [track, ...prev];
      }
    });
  }, []);

  const addToHistory = useCallback((track: Track) => {
    setHistoryTracks((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 50); // Keep last 50 tracks
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistoryTracks([]);
  }, []);

  const recordListeningSession = useCallback((track: Track, listenedSeconds: number) => {
    if (!track || !track.id) return;
    setStatsByTrackId((prev) => {
      const currentlyLiked = likedTracks.some((t) => t.id === track.id);
      return recordListeningEvent(prev, track, listenedSeconds, currentlyLiked);
    });
  }, [likedTracks]);

  const contextValue = useMemo(() => ({
    likedTracks,
    historyTracks,
    statsByTrackId,
    isLiked,
    toggleLike,
    addToHistory,
    clearHistory,
    recordListeningSession,
    mildWaveStyle,
    setMildWaveStyle,
  }), [
    likedTracks,
    historyTracks,
    statsByTrackId,
    isLiked,
    toggleLike,
    addToHistory,
    clearHistory,
    recordListeningSession,
    mildWaveStyle,
    setMildWaveStyle,
  ]);

  return (
    <UserStoreContext.Provider value={contextValue}>
      {children}
    </UserStoreContext.Provider>
  );
};

export const useUserStore = () => {
  const context = useContext(UserStoreContext);
  if (!context) {
    throw new Error('useUserStore must be used within a UserStoreProvider');
  }
  return context;
};
