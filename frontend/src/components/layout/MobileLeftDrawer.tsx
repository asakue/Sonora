import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { ListeningDetailsPanel } from '../player/ListeningDetailsPanel';
import { QueuePanel } from '../queue/QueuePanel';
import { RecentlyPlayedPanel } from './RecentlyPlayedPanel';

interface MobileLeftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileLeftDrawer: React.FC<MobileLeftDrawerProps> = React.memo(({
  isOpen,
  onClose,
}) => {
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Swipe from right to left inside drawer closes it
    if (deltaX < -40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-start md:hidden select-none transition-[visibility] duration-350 ${
        isOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none delay-300'
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop with buttery-smooth fade */}
      <div
        className={`fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sliding Drawer Container with fluid spring physics */}
      <div
        className={`relative w-full max-w-sm h-full flex flex-col shadow-2xl z-10 overflow-hidden transform-gpu will-change-transform transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'rgba(14, 16, 23, 0.94)',
          backdropFilter: 'blur(36px) saturate(190%)',
          WebkitBackdropFilter: 'blur(36px) saturate(190%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow:
            'inset -1px 0 1px 0 rgba(255, 255, 255, 0.2), 12px 0 36px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Микшер и очередь</h2>
            <p className="text-[11px] text-neutral-400 font-mono">Визуализация и управление треками</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 btn-spring cursor-pointer transition-colors"
            title="Закрыть"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
          {/* Visualizer & Mixer trigger */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-bold mb-1.5 px-1">
              Спектр (нажмите для микшера)
            </p>
            <ListeningDetailsPanel />
          </div>

          {/* Queue Panel */}
          <div className="min-h-[300px] flex flex-col">
            <QueuePanel />
          </div>

          {/* Recently Played */}
          <div>
            <RecentlyPlayedPanel />
          </div>
        </div>
      </div>
    </div>
  );
});

