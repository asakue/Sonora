import React from 'react';
import { Search } from 'lucide-react';
import type { NavTab } from './Sidebar';

interface TopbarProps {
  currentTab: NavTab;
  onOpenSearch: () => void;
  onOpenWave: () => void;
}

const TAB_TITLES: Record<NavTab, string> = {
  listen: 'Listen Now',
  browse: 'Browse & Search',
  wave: 'MildWave Radio',
  liked: 'Liked Songs',
  history: 'Listening History',
};

export const Topbar: React.FC<TopbarProps> = React.memo(({
  currentTab,
  onOpenSearch,
}) => {
  return (
    <header className="flex items-center justify-between py-1 px-1 mb-3 flex-shrink-0">
      {/* Left side: Section title */}
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-white tracking-tight">
          {TAB_TITLES[currentTab]}
        </h1>
      </div>

      {/* Right side: Search trigger */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-3 px-3.5 py-2 rounded-xl glass-panel text-xs text-neutral-400 hover:text-white hover:bg-white/10 btn-spring border border-white/8 hover:border-white/14 cursor-pointer"
        >
          <Search size={15} strokeWidth={1.5} className="text-neutral-400" />
          <span className="hidden sm:inline">Поиск треков...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/6 border border-white/10 text-[10px] font-mono text-neutral-400">
            Ctrl+K
          </kbd>
        </button>
      </div>
    </header>
  );
});
