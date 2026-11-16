import React from 'react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { Visualizer } from './Visualizer';

export const ListeningDetailsPanel: React.FC = React.memo(() => {
  const { setIsMixerOpen } = useAudioPlayer();

  return (
    <div
      onClick={() => setIsMixerOpen(true)}
      title="Нажмите, чтобы открыть Микшер"
      className="group glass-panel rounded-3xl p-4 sm:p-5 flex flex-col justify-center items-center h-[120px] sm:h-[135px] flex-shrink-0 relative overflow-hidden cursor-pointer select-none transition-all duration-300 hover:border-white/24 hover:shadow-[0_0_24px_var(--cover-glow,rgba(168,85,247,0.3))]"
    >
      {/* Background Liquid Glass specular sheen on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/8 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Visualizer live spectrum bars */}
      <div className="w-full h-full flex flex-col justify-center transition-all duration-300 group-hover:opacity-35">
        <Visualizer barsCount={34} className="w-full h-full min-h-[80px]" />
      </div>

      {/* Pure white "Микшер" inscription on hover (zero background, zero icons) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <span className="text-sm font-semibold tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
          Микшер
        </span>
      </div>
    </div>
  );
});
