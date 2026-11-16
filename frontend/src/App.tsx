import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AmbientBackdrop } from './components/layout/AmbientBackdrop';
import { RecentlyPlayedPanel } from './components/layout/RecentlyPlayedPanel';
import { Sidebar, type NavTab } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { HeroPlayer } from './components/player/HeroPlayer';
import { ListeningDetailsPanel } from './components/player/ListeningDetailsPanel';
import { QueuePanel } from './components/queue/QueuePanel';
import { SearchDrawer } from './components/search/SearchDrawer';
import { HistoryView } from './components/views/HistoryView';
import { LikedSongsView } from './components/views/LikedSongsView';
import { MildWaveDrawer } from './components/wave/MildWaveDrawer';
import { MixerModal } from './components/mixer/MixerModal';
import { UpdateNotificationModal } from './components/common/UpdateNotificationModal';
import { AudioPlayerProvider, useAudioPlayer } from './context/AudioPlayerContext';
import { UserStoreProvider, useUserStore } from './context/UserStoreContext';
import { getInitialOrRestoredQueue } from './services/recommendation';
import { checkForAppUpdates, type UpdateInfo } from './services/updateChecker';
import type { Track } from './types/music';

const MainApp: React.FC = React.memo(() => {
  const [currentTab, setCurrentTab] = useState<NavTab>('listen');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWaveOpen, setIsWaveOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const { currentTrack, setQueue, playTrack } = useAudioPlayer();
  const { addToHistory, likedTracks, historyTracks, statsByTrackId, recordListeningSession } = useUserStore();

  const activeTrackRef = useRef<Track | null>(null);
  const activeStartTimeRef = useRef<number>(0);

  const handleToggleSidebar = useCallback(() => setIsSidebarCollapsed((prev) => !prev), []);
  const handleSelectTab = useCallback((tab: NavTab) => setCurrentTab(tab), []);
  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
  const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);
  const handleOpenWave = useCallback(() => setIsWaveOpen(true), []);
  const handleCloseWave = useCallback(() => setIsWaveOpen(false), []);

  // Check for GitHub Release updates once on startup
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForAppUpdates().then((info) => {
        if (info) {
          setUpdateInfo(info);
        }
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Record history and compute precise listening duration / weights when tracks transition
  useEffect(() => {
    const previousTrack = activeTrackRef.current;
    const previousStart = activeStartTimeRef.current;

    if (previousTrack && previousStart > 0) {
      const durationSec = Math.max(0, (Date.now() - previousStart) / 1000);
      recordListeningSession(previousTrack, durationSec);
    }

    if (currentTrack) {
      activeTrackRef.current = currentTrack;
      activeStartTimeRef.current = Date.now();
      addToHistory(currentTrack);
    } else {
      activeTrackRef.current = null;
      activeStartTimeRef.current = 0;
    }
  }, [currentTrack?.id, addToHistory, recordListeningSession]);

  // Record in-flight listening session before app closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      const previousTrack = activeTrackRef.current;
      const previousStart = activeStartTimeRef.current;
      if (previousTrack && previousStart > 0) {
        const durationSec = Math.max(0, (Date.now() - previousStart) / 1000);
        recordListeningSession(previousTrack, durationSec);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [recordListeningSession]);

  // Smart initialization: restore saved session or synthesize personalized recommendations based on likes & history
  useEffect(() => {
    let isCancelled = false;
    const initPersonalizedQueue = async () => {
      try {
        const { queue: smartQueue, initialTrack } = await getInitialOrRestoredQueue(
          likedTracks,
          historyTracks,
          statsByTrackId
        );
        if (!isCancelled && smartQueue.length > 0) {
          setQueue(smartQueue);
          if (!currentTrack && initialTrack) {
            playTrack(initialTrack, smartQueue);
          }
        }
      } catch (e) {
        console.warn('Initial personalized queue load failed:', e);
      }
    };
    initPersonalizedQueue();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative h-screen max-h-screen overflow-hidden bg-[#0a0b0e] text-[#ededf0] selection:bg-indigo-500/30 selection:text-white flex flex-col">
      {/* Dynamic ambient backdrop */}
      <AmbientBackdrop />

      {/* Main app container */}
      <div className="relative z-10 flex-1 h-full max-h-full max-w-[1700px] w-full mx-auto p-3 sm:p-4 flex gap-4 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onOpenSearch={handleOpenSearch}
          onOpenWave={handleOpenWave}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
          <Topbar
            currentTab={currentTab}
            onOpenSearch={handleOpenSearch}
            onOpenWave={handleOpenWave}
          />

          {/* Views */}
          {currentTab === 'listen' && (
            <div key="listen" className="flex-1 min-h-0 h-full grid grid-cols-1 xl:grid-cols-12 gap-4 animate-view-enter overflow-hidden">
              {/* Left Column (8 cols): Hero Player (Largest Section!) + Recently Played */}
              <div className="xl:col-span-8 flex flex-col gap-4 min-h-0 h-full overflow-hidden">
                <HeroPlayer />
                <RecentlyPlayedPanel />
              </div>

              {/* Right Column (4 cols): Live Spectrum Visualizer + Up Next Queue */}
              <div className="xl:col-span-4 flex flex-col gap-4 min-h-0 h-full overflow-hidden">
                <ListeningDetailsPanel />
                <QueuePanel />
              </div>
            </div>
          )}

          {currentTab === 'liked' && (
            <div key="liked" className="flex-1 min-h-0 h-full flex flex-col animate-view-enter overflow-hidden">
              <LikedSongsView />
            </div>
          )}
          {currentTab === 'history' && (
            <div key="history" className="flex-1 min-h-0 h-full flex flex-col animate-view-enter overflow-hidden">
              <HistoryView />
            </div>
          )}
        </main>
      </div>

      {/* Drawers & Modals */}
      <SearchDrawer isOpen={isSearchOpen} onClose={handleCloseSearch} />
      <MildWaveDrawer isOpen={isWaveOpen} onClose={handleCloseWave} />
      <MixerModal />
      <UpdateNotificationModal
        updateInfo={updateInfo}
        onClose={() => setUpdateInfo(null)}
      />
    </div>
  );
});

export default function App() {
  return (
    <UserStoreProvider>
      <AudioPlayerProvider>
        <MainApp />
      </AudioPlayerProvider>
    </UserStoreProvider>
  );
}
