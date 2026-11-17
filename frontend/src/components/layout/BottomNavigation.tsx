import React, { useRef } from 'react';
import { Disc3, Heart, Radio, Search } from 'lucide-react';
import type { NavTab } from './Sidebar';

interface BottomNavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSearch: () => void;
  onOpenWave: () => void;
  onCloseDrawers?: () => void;
  isLeftDrawerOpen?: boolean;
  isRightDrawerOpen?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = React.memo(({
  currentTab,
  onSelectTab,
  onOpenSearch,
  onOpenWave,
  onCloseDrawers,
  isLeftDrawerOpen = false,
  isRightDrawerOpen = false,
  isOpen,
  onClose,
}) => {
  const isListenActive = currentTab === 'listen' && !isLeftDrawerOpen && !isRightDrawerOpen;
  const isLikedActive = currentTab === 'liked' && !isLeftDrawerOpen && !isRightDrawerOpen;

  const touchStartYRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    // Swipe down on the navigation bar closes it
    if (deltaY > 20) {
      onClose();
    }
  };

  const handleGoMain = () => {
    onCloseDrawers?.();
    onSelectTab('listen');
  };

  const handleGoLiked = () => {
    onCloseDrawers?.();
    onSelectTab('liked');
  };

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-40 md:hidden select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu ${
        isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        /* Cover-tinted liquid frosted glass that emerges from bottom on swipe */
        background: `
          radial-gradient(ellipse 90% 60% at 50% 100%, color-mix(in srgb, var(--cover-b, #6366f1) 22%, transparent) 0%, transparent 75%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(14, 17, 26, 0.72) 35%, rgba(6, 8, 12, 0.92) 100%)
        `,
        backdropFilter: 'blur(36px) saturate(190%)',
        WebkitBackdropFilter: 'blur(36px) saturate(190%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.14)',
        boxShadow: '0 -10px 36px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      }}
    >
      {/* Swipe down handle pill */}
      <div
        onClick={onClose}
        className="w-10 h-1 rounded-full bg-white/25 hover:bg-white/40 active:scale-95 mx-auto mt-2 mb-0.5 cursor-pointer transition-all"
        title="Скрыть меню"
      />

      <div className="grid grid-cols-4 items-center h-16 max-w-lg mx-auto px-2 pb-[env(safe-area-inset-bottom,0px)]">
        {/* 1. Главный экран (Плеер) */}
        <button
          onClick={handleGoMain}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl btn-spring transition-all cursor-pointer ${
            isListenActive
              ? 'text-white'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isListenActive
                ? 'bg-white/14 border border-white/20 text-white shadow-sm shadow-white/10'
                : 'text-neutral-400 hover:bg-white/5'
            }`}
          >
            <Disc3 size={19} strokeWidth={isListenActive ? 2 : 1.5} />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Главная</span>
        </button>

        {/* 2. Поиск */}
        <button
          onClick={onOpenSearch}
          className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl btn-spring text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-neutral-400">
            <Search size={19} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Поиск</span>
        </button>

        {/* 3. Подборка (MildWave) */}
        <button
          onClick={onOpenWave}
          className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl btn-spring text-neutral-400 hover:text-neutral-200 transition-all cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-indigo-400">
            <Radio size={19} strokeWidth={1.5} />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Подборка</span>
        </button>

        {/* 4. Любимые */}
        <button
          onClick={handleGoLiked}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl btn-spring transition-all cursor-pointer ${
            isLikedActive
              ? 'text-rose-400'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isLikedActive
                ? 'bg-rose-500/15 border border-rose-500/25 text-rose-400 shadow-sm shadow-rose-500/10'
                : 'text-neutral-400 hover:bg-white/5'
            }`}
          >
            <Heart
              size={19}
              strokeWidth={isLikedActive ? 2 : 1.5}
              fill={isLikedActive ? 'currentColor' : 'none'}
            />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Любимые</span>
        </button>
      </div>
    </nav>
  );
});
