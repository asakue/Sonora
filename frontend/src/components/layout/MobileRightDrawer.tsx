import React, { useRef } from 'react';
import { HistoryView } from '../views/HistoryView';

interface MobileRightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileRightDrawer: React.FC<MobileRightDrawerProps> = React.memo(({
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

    // Swipe from left to right inside drawer closes it
    if (deltaX > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end md:hidden select-none transition-[visibility] duration-350 ${
        isOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none delay-300'
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Gentle dimming backdrop that preserves ambient artwork light */}
      <div
        className={`fixed inset-0 bg-black/35 backdrop-blur-[2px] cursor-pointer transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sliding Drawer with cover-tinted frosted liquid glass */}
      <div
        className={`relative w-full max-w-sm h-full flex flex-col shadow-2xl z-10 overflow-hidden transform-gpu will-change-transform transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: `
            radial-gradient(ellipse 90% 50% at 50% 0%, color-mix(in srgb, var(--cover-b, #6366f1) 24%, transparent) 0%, transparent 70%),
            radial-gradient(ellipse 80% 60% at 50% 100%, color-mix(in srgb, var(--cover-a, #1e1b4b) 28%, transparent) 0%, transparent 70%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(14, 16, 25, 0.42) 40%, rgba(7, 9, 14, 0.65) 100%)
          `,
          backdropFilter: 'blur(36px) saturate(190%)',
          WebkitBackdropFilter: 'blur(36px) saturate(190%)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow:
            'inset 1px 0 1px 0 rgba(255, 255, 255, 0.2), -16px 0 40px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Subtle swipe indicator pull bar */}
        <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Drawer Scrollable Content: History */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col no-scrollbar pb-10">
          <HistoryView />
        </div>
      </div>
    </div>
  );
});
