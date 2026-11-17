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
    if (deltaX > 35 && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end md:hidden select-none overflow-hidden ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dimming backdrop without duplicate blur (smooth 60/120 FPS hardware fade) */}
      <div
        className={`fixed inset-0 bg-black/45 cursor-pointer transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sliding Drawer with cover-tinted frosted liquid glass and native spring physics */}
      <div
        className={`relative w-full max-w-sm h-full flex flex-col shadow-2xl z-10 overflow-hidden transform-gpu will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
        }`}
        style={{
          background: `
            radial-gradient(ellipse 90% 50% at 50% 0%, color-mix(in srgb, var(--cover-b, #6366f1) 24%, transparent) 0%, transparent 70%),
            radial-gradient(ellipse 80% 60% at 50% 100%, color-mix(in srgb, var(--cover-a, #1e1b4b) 28%, transparent) 0%, transparent 70%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(14, 16, 25, 0.45) 40%, rgba(7, 9, 14, 0.68) 100%)
          `,
          backdropFilter: 'blur(32px) saturate(190%)',
          WebkitBackdropFilter: 'blur(32px) saturate(190%)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow:
            'inset 1px 0 1px 0 rgba(255, 255, 255, 0.2), -16px 0 40px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Subtle swipe indicator pull bar */}
        <div className="pt-3 pb-1 flex justify-center flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Drawer Content: History */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col no-scrollbar pb-10">
          <HistoryView />
        </div>
      </div>
    </div>
  );
});
