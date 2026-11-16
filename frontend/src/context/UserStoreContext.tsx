import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MildWaveStyle, Track } from '../types/music';

interface UserStoreContextType {
  likedTracks: Track[];
  historyTracks: Track[];
  isLiked: (trackId: number) => boolean;
  toggleLike: (track: Track) => void;
  addToHistory: (track: Track) => void;
  clearHistory: () => void;
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

  const [mildWaveStyle, setMildWaveStyle] = useState<MildWaveStyle>(() => {
    try {
      return (localStorage.getItem(`${STORAGE_KEY}_style`) as MildWaveStyle) || 'aura';
    } catch {
      return 'aura';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_likes`, JSON.stringify(likedTracks));
    } catch (e) {
      console.warn('Failed to save likes to localStorage:', e);
    }
  }, [likedTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_history`, JSON.stringify(historyTracks));
    } catch (e) {
      console.warn('Failed to save history to localStorage:', e);
    }
  }, [historyTracks]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_style`, mildWaveStyle);
    } catch (e) {
      console.warn('Failed to save style to localStorage:', e);
    }
  }, [mildWaveStyle]);

  const isLiked = useCallback((trackId: number): boolean => {
    return likedTracks.some((t) => t.id === trackId);
  }, [likedTracks]);

  const toggleLike = useCallback((track: Track) => {
    setLikedTracks((prev) => {
      const exists = prev.some((t) => t.id === track.id);
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

  const contextValue = useMemo(() => ({
    likedTracks,
    historyTracks,
    isLiked,
    toggleLike,
    addToHistory,
    clearHistory,
    mildWaveStyle,
    setMildWaveStyle,
  }), [
    likedTracks,
    historyTracks,
    isLiked,
    toggleLike,
    addToHistory,
    clearHistory,
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
