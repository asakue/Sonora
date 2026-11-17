import React from 'react';
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
}

export const BottomNavigation: React.FC<BottomNavigationProps> = React.memo(({
  currentTab,
  onSelectTab,
  onOpenSearch,
  onOpenWave,
  onCloseDrawers,
  isLeftDrawerOpen = false,
  isRightDrawerOpen = false,
}) => {
  const isListenActive = currentTab === 'listen' && !isLeftDrawerOpen && !isRightDrawerOpen;
  const isLikedActive = currentTab === 'liked' && !isLeftDrawerOpen && !isRightDrawerOpen;

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
      className="fixed bottom-0 inset-x-0 z-40 md:hidden select-none"
      style={{
        background: 'rgba(12, 14, 20, 0.88)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow:
          'inset 0 1px 1px 0 rgba(255, 255, 255, 0.25), 0 -10px 30px rgba(0, 0, 0, 0.7)',
      }}
    >
      {/* Top Waterfall specular highlight line */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 30%, rgba(255, 255, 255, 0.5) 50%, rgba(255, 255, 255, 0.3) 70%, transparent 100%)',
        }}
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
                ? 'bg-rose-500/18 border border-rose-500/30 text-rose-400 shadow-sm shadow-rose-500/10'
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

