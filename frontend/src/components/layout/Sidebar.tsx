import React from 'react';
import {
  Clock,
  Heart,
  Music2,
  PanelLeftClose,
  Radio,
  Search,
} from 'lucide-react';
import { useUserStore } from '../../context/UserStoreContext';

export type NavTab = 'listen' | 'browse' | 'wave' | 'liked' | 'history';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSearch: () => void;
  onOpenWave: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onOpenSearch,
  onOpenWave,
}) => {
  const { likedTracks, historyTracks } = useUserStore();

  const handleTabClick = (tab: NavTab) => {
    if (tab === 'browse') {
      onOpenSearch();
    } else if (tab === 'wave') {
      onOpenWave();
    } else {
      onSelectTab(tab);
    }
  };

  return (
    <aside
      style={{ transform: 'translateZ(0)' }}
      className={`glass-panel rounded-3xl p-3 sm:p-4 flex flex-col h-full min-h-0 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[width] flex-shrink-0 select-none overflow-hidden ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Primary Navigation */}
      <div className="space-y-6 flex-1">
        <div>
          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isCollapsed ? 'max-h-0 opacity-0 mb-0' : 'max-h-6 opacity-100 mb-2'
            }`}
          >
            <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 font-bold px-3 block whitespace-nowrap">
              Library
            </span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => handleTabClick('listen')}
              title="Listen now"
              className={`w-full h-11 flex items-center px-3.5 rounded-xl text-xs font-semibold btn-spring cursor-pointer ${
                currentTab === 'listen'
                  ? 'bg-white/12 text-white border border-white/10 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <Music2 size={18} strokeWidth={1.5} />
              </div>
              <div
                className={`overflow-hidden whitespace-nowrap flex items-center transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-[160px] opacity-100 ml-3'
                }`}
              >
                <span>Listen Now</span>
              </div>
            </button>

            <button
              onClick={() => handleTabClick('browse')}
              title="SoundCloud Search"
              className="w-full h-11 flex items-center px-3.5 rounded-xl text-xs font-semibold btn-spring text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent cursor-pointer"
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <Search size={18} strokeWidth={1.5} />
              </div>
              <div
                className={`overflow-hidden whitespace-nowrap flex items-center transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-[160px] opacity-100 ml-3'
                }`}
              >
                <span>Search</span>
              </div>
            </button>

            <button
              onClick={() => handleTabClick('wave')}
              title="MildWave Radio"
              className={`w-full h-11 flex items-center px-3.5 rounded-xl text-xs font-semibold btn-spring cursor-pointer ${
                currentTab === 'wave'
                  ? 'bg-white/12 text-white border border-white/10 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <Radio size={18} strokeWidth={1.5} className="text-indigo-400" />
              </div>
              <div
                className={`overflow-hidden whitespace-nowrap flex items-center flex-1 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-[160px] opacity-100 ml-3'
                }`}
              >
                <span>MildWave</span>
              </div>
            </button>
          </nav>
        </div>

        {/* User Space */}
        <div>
          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isCollapsed ? 'max-h-0 opacity-0 mb-0' : 'max-h-6 opacity-100 mb-2'
            }`}
          >
            <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 font-bold px-3 block whitespace-nowrap">
              Your Space
            </span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => handleTabClick('liked')}
              title="Liked songs"
              className={`w-full h-11 flex items-center px-3.5 rounded-xl text-xs font-semibold btn-spring cursor-pointer ${
                currentTab === 'liked'
                  ? 'bg-white/12 text-white border border-white/10 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <Heart size={18} strokeWidth={1.5} className="text-rose-400" />
              </div>
              <div
                className={`overflow-hidden whitespace-nowrap flex items-center justify-between flex-1 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-[160px] opacity-100 ml-3'
                }`}
              >
                <span>Liked Songs</span>
                {likedTracks.length > 0 && (
                  <span className="text-[10px] font-mono text-neutral-500 ml-2">
                    {likedTracks.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => handleTabClick('history')}
              title="Listening history"
              className={`w-full h-11 flex items-center px-3.5 rounded-xl text-xs font-semibold btn-spring cursor-pointer ${
                currentTab === 'history'
                  ? 'bg-white/12 text-white border border-white/10 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <Clock size={18} strokeWidth={1.5} />
              </div>
              <div
                className={`overflow-hidden whitespace-nowrap flex items-center justify-between flex-1 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-[160px] opacity-100 ml-3'
                }`}
              >
                <span>History</span>
                {historyTracks.length > 0 && (
                  <span className="text-[10px] font-mono text-neutral-500 ml-2">
                    {historyTracks.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Bottom Collapse/Expand Toggle Button */}
      <div className="pt-3 border-t border-white/8 mt-auto">
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          title={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
          className="w-full h-11 flex items-center px-3.5 rounded-xl text-xs font-semibold btn-spring text-neutral-400 hover:text-white hover:bg-white/6 border border-transparent cursor-pointer"
        >
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <PanelLeftClose
              size={18}
              strokeWidth={1.5}
              className={`transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isCollapsed ? 'rotate-180 text-white' : ''
              }`}
            />
          </div>
          <div
            className={`overflow-hidden whitespace-nowrap flex items-center transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isCollapsed ? 'max-w-0 opacity-0 pointer-events-none ml-0' : 'max-w-[160px] opacity-100 ml-3'
            }`}
          >
            <span>Свернуть меню</span>
          </div>
        </button>
      </div>
    </aside>
  );
});
