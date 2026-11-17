import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AmbientBackdrop } from './components/layout/AmbientBackdrop';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { MobileLeftDrawer } from './components/layout/MobileLeftDrawer';
import { MobileRightDrawer } from './components/layout/MobileRightDrawer';
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
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);
  const [isBottomNavOpen, setIsBottomNavOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const { currentTrack, setQueue, playTrack } = useAudioPlayer();
  const { addToHistory, likedTracks, historyTracks, statsByTrackId, recordListeningSession } = useUserStore();

  const activeTrackRef = useRef<Track | null>(null);
  const activeStartTimeRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchIsInteractiveRef = useRef<boolean>(false);

  const handleToggleSidebar = useCallback(() => setIsSidebarCollapsed((prev) => !prev), []);
  const handleSelectTab = useCallback((tab: NavTab) => {
    setIsLeftDrawerOpen(false);
    setIsRightDrawerOpen(false);
    setIsBottomNavOpen(false);
    setCurrentTab(tab);
  }, []);
  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);
  const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);
  const handleOpenWave = useCallback(() => setIsWaveOpen(true), []);
  const handleCloseWave = useCallback(() => setIsWaveOpen(false), []);
  const handleCloseDrawers = useCallback(() => {
    setIsLeftDrawerOpen(false);
    setIsRightDrawerOpen(false);
  }, []);

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

  // Swipe detection: swipe right (left-to-right) -> Left drawer (Visualizer/Mixer/Queue/Recent)
  //                  swipe left (right-to-left) -> Right drawer (History & future sections)
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.closest('input') ||
        target.closest('button') ||
        target.closest('.no-swipe'))
    ) {
      touchIsInteractiveRef.current = true;
      return;
    }
    touchIsInteractiveRef.current = false;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchIsInteractiveRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Horizontal swipe: left/right drawers
    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX > 0) {
        setIsLeftDrawerOpen(true);
        setIsRightDrawerOpen(false);
        setIsBottomNavOpen(false);
      } else {
        setIsRightDrawerOpen(true);
        setIsLeftDrawerOpen(false);
        setIsBottomNavOpen(false);
      }
      return;
    }

    // Vertical swipe: swipe up -> reveal bottom navigation; swipe down -> hide bottom navigation
    if (Math.abs(deltaY) > 35 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
      if (deltaY < 0) {
        setIsBottomNavOpen(true);
      } else {
        setIsBottomNavOpen(false);
      }
    }
  };

  return (
    <div className="relative h-screen max-h-screen overflow-hidden bg-[#0a0b0e] text-[#ededf0] selection:bg-indigo-500/30 selection:text-white flex flex-col">
      {/* Dynamic ambient backdrop */}
      <AmbientBackdrop />

      {/* Main app container */}
      <div
        className="relative z-10 flex-1 h-full max-h-full max-w-[1700px] w-full mx-auto p-0 md:p-4 pb-0 md:pb-4 flex md:gap-4 min-h-0 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
        <main className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden w-full">
          <div className="hidden md:block">
            <Topbar
              currentTab={currentTab}
              onOpenSearch={handleOpenSearch}
              onOpenWave={handleOpenWave}
            />
          </div>

          {/* Views */}
          {currentTab === 'listen' && (
            <>
              {/* Desktop 2-column view */}
              <div key="listen-desktop" className="hidden md:grid flex-1 min-h-0 h-full grid-cols-1 xl:grid-cols-12 gap-4 animate-view-enter overflow-hidden">
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

              {/* Mobile View: ONLY Hero Player (artwork, title, controls) edge-to-edge */}
              <div key="listen-mobile" className="flex md:hidden flex-1 min-h-0 h-full flex-col animate-view-enter overflow-hidden w-full">
                <HeroPlayer isBottomNavOpen={isBottomNavOpen} />
              </div>
            </>
          )}

          {currentTab === 'liked' && (
            <div key="liked" className="flex-1 min-h-0 h-full flex flex-col animate-view-enter overflow-hidden p-3 md:p-0 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
              <LikedSongsView />
            </div>
          )}
          {currentTab === 'history' && (
            <div key="history" className="flex-1 min-h-0 h-full flex flex-col animate-view-enter overflow-hidden p-3 md:p-0 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
              <HistoryView />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Offscreen by default, slides up on swipe up) */}
      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenSearch={handleOpenSearch}
        onOpenWave={handleOpenWave}
        onCloseDrawers={handleCloseDrawers}
        isLeftDrawerOpen={isLeftDrawerOpen}
        isRightDrawerOpen={isRightDrawerOpen}
        isOpen={isBottomNavOpen}
        onClose={() => setIsBottomNavOpen(false)}
      />

      {/* Mobile Drawers (Swipe left/right) */}
      <MobileLeftDrawer
        isOpen={isLeftDrawerOpen}
        onClose={() => setIsLeftDrawerOpen(false)}
      />
      <MobileRightDrawer
        isOpen={isRightDrawerOpen}
        onClose={() => setIsRightDrawerOpen(false)}
      />

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
