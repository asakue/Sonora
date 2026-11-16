import React from 'react';
import { X } from 'lucide-react';
import type { UpdateInfo } from '../../services/updateChecker';
import { markUpdateDismissed } from '../../services/updateChecker';

interface UpdateNotificationModalProps {
  updateInfo: UpdateInfo | null;
  onClose: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = React.memo(({
  updateInfo,
  onClose,
}) => {
  if (!updateInfo || !updateInfo.hasUpdate) return null;

  const handleDownload = () => {
    markUpdateDismissed(updateInfo.tagName);
    const targetUrl = updateInfo.releaseUrl || 'https://github.com/asakue/Sonora/releases/latest';

    // @ts-expect-error electronAPI exposed in preload
    if (window.electronAPI?.openExternal) {
      // @ts-expect-error electronAPI exposed in preload
      window.electronAPI.openExternal(targetUrl);
    } else {
      window.open(targetUrl, '_blank');
    }

    onClose();
  };

  const handleDismiss = () => {
    markUpdateDismissed(updateInfo.tagName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Liquid blur backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md animate-fade-in cursor-pointer transition-opacity"
        onClick={handleDismiss}
      />

      {/* Modal Card with Liquid Glass and Waterfall optical borders */}
      <div
        className="relative w-full max-w-md rounded-3xl p-7 flex flex-col items-center text-center shadow-2xl z-10 select-none animate-drawer-in"
        style={{
          background: 'rgba(18, 20, 29, 0.82)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow:
            'inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.35), inset 0 -1.5px 1.5px 0 rgba(0, 0, 0, 0.45), 0 24px 60px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* Subtle waterfall glass optical top-sheen */}
        <div
          className="absolute inset-x-0 top-0 h-1/2 rounded-t-3xl pointer-events-none opacity-40"
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%)',
          }}
        />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 btn-spring cursor-pointer transition-colors"
          title="Закрыть"
        >
          <X size={18} strokeWidth={1.5} />
        </button>

        {/* Content - strictly clean: inscription, version badge, download button */}
        <div className="mt-3 flex flex-col items-center gap-3">
          <span className="px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-mono font-semibold tracking-wider">
            {updateInfo.latestVersion}
          </span>

          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
            Только что доступно обновление!
          </h3>
        </div>

        {/* Liquid Glass Download Button with Waterfall specular edge */}
        <div className="mt-6 w-full flex justify-center">
          <button
            onClick={handleDownload}
            className="w-full max-w-[280px] py-3.5 px-6 rounded-2xl text-white font-semibold text-sm btn-spring cursor-pointer transition-all flex items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              boxShadow:
                'inset 0 1px 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.32)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.22)';
            }}
          >
            <span>Скачать обновление</span>
          </button>
        </div>
      </div>
    </div>
  );
});
