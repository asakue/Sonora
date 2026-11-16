import React, { useEffect, useRef, useState } from 'react';
import { Layers, RotateCcw, SlidersHorizontal, Volume2, X, Zap } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { FREQ_BANDS, MIXER_PRESETS } from '../../types/mixer';

interface VerticalFaderProps {
  label: string;
  value: number; // -12 to +12
  min?: number;
  max?: number;
  step?: number;
  onChangeLive: (val: number) => void;
  onChangeEnd: (val: number) => void;
}

/**
 * 120 FPS Ultra-fluid vertical fader with pointer events and immediate WebAudio DSP response.
 * Local component state ensures zero React context re-renders during dragging.
 * Solid minimalist white fill without color gradients.
 */
const VerticalFader: React.FC<VerticalFaderProps> = React.memo(({
  label,
  value,
  min = -12,
  max = 12,
  step = 0.5,
  onChangeLive,
  onChangeEnd,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastCommittedRef = useRef(value);

  // Local state for instantaneous 120 FPS visual response
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalVal(value);
      lastCommittedRef.current = value;
    }
  }, [value]);

  const normalized = Math.max(0, Math.min(100, ((localVal - min) / (max - min)) * 100));

  const updateFromClientY = (clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (rect.bottom - clientY) / rect.height));
    const rawVal = min + ratio * (max - min);
    const steppedVal = Math.round(rawVal / step) * step;
    const clamped = Math.max(min, Math.min(max, steppedVal));

    setLocalVal(clamped);
    // Direct Web Audio C++ parameter update (0ms, 0 React context overhead)
    onChangeLive(clamped);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateFromClientY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      lastCommittedRef.current = localVal;
      onChangeEnd(localVal);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    let next = localVal;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      next = Math.min(max, localVal + step);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      next = Math.max(min, localVal - step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      next = 0;
    } else {
      return;
    }
    setLocalVal(next);
    onChangeLive(next);
    onChangeEnd(next);
  };

  const handleDoubleClick = () => {
    setLocalVal(0);
    onChangeLive(0);
    onChangeEnd(0);
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none group/fader">
      {/* Gain readout (pure white / neutral-500) */}
      <span
        className={`text-[11px] font-mono tabular-nums transition-colors ${
          localVal !== 0 ? 'text-white font-bold' : 'text-neutral-500'
        }`}
      >
        {localVal > 0 ? `+${localVal}` : localVal} dB
      </span>

      {/* Interactive Vertical Fader Track Area */}
      <div
        ref={trackRef}
        role="slider"
        aria-label={label}
        aria-valuenow={localVal}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${localVal > 0 ? '+' : ''}${localVal} dB (Двойной клик для сброса на 0 dB)`}
        className="relative w-12 h-36 flex items-center justify-center cursor-pointer touch-none focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-xl"
      >
        {/* Waterfall track groove background */}
        <div
          className="absolute inset-y-1 w-2 rounded-full overflow-hidden transition-colors"
          style={{
            background: 'rgba(0, 0, 0, 0.65)',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.9), inset 0 -0.5px 1px rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Zero dB center marker tick */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40 -translate-y-1/2 z-10" />

          {/* Dynamic Waterfall Solid Pure White Fill from center (0dB) - No Gradients */}
          <div
            className="absolute w-full rounded-full transition-all duration-75"
            style={{
              bottom: localVal >= 0 ? '50%' : `${normalized}%`,
              top: localVal >= 0 ? `${100 - normalized}%` : '50%',
              backgroundColor: '#ffffff',
              boxShadow: '0 0 6px rgba(255, 255, 255, 0.45)',
            }}
          />
        </div>

        {/* Specular Liquid Glass Thumb Droplet */}
        <div
          className="absolute w-5 h-5 rounded-full bg-white transition-transform duration-75 group-hover/fader:scale-110 active:scale-125 pointer-events-none"
          style={{
            bottom: `calc(${normalized}% - 10px)`,
            boxShadow:
              '0 3px 10px rgba(0, 0, 0, 0.85), 0 0 6px rgba(255, 255, 255, 0.5), inset 0 1.5px 1px #ffffff',
          }}
        />
      </div>

      {/* Frequency Label */}
      <p className="text-xs font-bold text-neutral-300 font-mono tracking-tight">{label}</p>
    </div>
  );
});

interface HorizontalSliderProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (val: number) => string;
  isCenterZero?: boolean;
  onChangeLive: (val: number) => void;
  onChangeEnd: (val: number) => void;
}

/**
 * 120 FPS Ultra-fluid horizontal fader with 3D Waterfall glass styling.
 * Solid minimalist white fill without color gradients.
 * Fixed center-zero absolute positioning for Panorama.
 */
const HorizontalSlider: React.FC<HorizontalSliderProps> = React.memo(({
  label,
  icon,
  value,
  min,
  max,
  step,
  formatValue,
  isCenterZero = false,
  onChangeLive,
  onChangeEnd,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalVal(value);
    }
  }, [value]);

  const percent = Math.max(0, Math.min(100, ((localVal - min) / (max - min)) * 100));

  const updateFromClientX = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawVal = min + ratio * (max - min);
    const steppedVal = Math.round(rawVal / step) * step;
    const clamped = Math.max(min, Math.min(max, steppedVal));

    setLocalVal(clamped);
    onChangeLive(clamped);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      onChangeEnd(localVal);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleDoubleClick = () => {
    const defaultVal = isCenterZero ? 0 : min;
    setLocalVal(defaultVal);
    onChangeLive(defaultVal);
    onChangeEnd(defaultVal);
  };

  return (
    <div
      className="relative p-3.5 sm:p-4 rounded-2xl flex flex-col justify-between overflow-hidden select-none group/slider"
      style={{
        backgroundColor: '#111420',
        background:
          'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 22%, rgba(0, 0, 0, 0.35) 75%, rgba(0, 0, 0, 0.6) 100%)',
        boxShadow:
          '0 12px 28px -6px rgba(0, 0, 0, 0.8), inset 0 2px 1px 0 rgba(255, 255, 255, 0.38), inset 0 8px 16px -4px rgba(255, 255, 255, 0.08), inset 0 -2.5px 2.5px 0 rgba(0, 0, 0, 0.7), inset 1.5px 0 1.5px 0 rgba(255, 255, 255, 0.1), inset -1.5px 0 1.5px 0 rgba(0, 0, 0, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
      }}
    >
      {/* Waterfall Optical Lens Overlay */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 45% at 50% 0%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.02) 50%, transparent 85%), linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, transparent 40%)',
        }}
      />

      <div className="flex items-center justify-between mb-2 relative z-10">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-[11px] font-mono text-neutral-200 font-bold tabular-nums">
          {formatValue(localVal)}
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        title={`${label}: ${formatValue(localVal)} (Двойной клик для сброса)`}
        className="relative w-full h-6 flex items-center cursor-pointer touch-none relative z-10"
      >
        <div
          className="absolute inset-x-0 h-1.5 rounded-full overflow-hidden transition-colors"
          style={{
            background: 'rgba(0, 0, 0, 0.65)',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.9), inset 0 -0.5px 1px rgba(255, 255, 255, 0.08)',
          }}
        >
          {isCenterZero && (
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/40 -translate-x-1/2 z-10" />
          )}

          {/* Solid Pure White Active Fill (position: absolute ensures correct origin for center-zero Pan) */}
          <div
            className="absolute top-0 bottom-0 rounded-full transition-all duration-75"
            style={{
              left: isCenterZero
                ? localVal < 0
                  ? `${percent}%`
                  : '50%'
                : '0%',
              width: isCenterZero
                ? `${Math.abs(percent - 50)}%`
                : `${percent}%`,
              backgroundColor: '#ffffff',
              boxShadow: '0 0 6px rgba(255, 255, 255, 0.4)',
            }}
          />
        </div>

        {/* Specular Liquid Glass Thumb Droplet */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white transition-transform duration-75 group-hover/slider:scale-115 active:scale-125 pointer-events-none"
          style={{
            left: `calc(${percent}% - 8px)`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.85), 0 0 4px rgba(255, 255, 255, 0.6), inset 0 1px 1px #fff',
          }}
        />
      </div>
    </div>
  );
});

export const MixerModal: React.FC = () => {
  const {
    isMixerOpen,
    setIsMixerOpen,
    mixerSettings,
    setBandGain,
    setBandGainLive,
    setBassBoost,
    setBassBoostLive,
    setPan,
    setPanLive,
    setPreamp,
    setPreampLive,
    toggleSpatialStereo,
    applyPreset,
    resetMixer,
  } = useAudioPlayer();

  // Escape key closes the modal
  useEffect(() => {
    if (!isMixerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMixerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMixerOpen, setIsMixerOpen]);

  if (!isMixerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-[3px] animate-fade-in"
      onClick={() => setIsMixerOpen(false)}
    >
      {/* Modal Dialog Card (Deep Obsidian Dark Studio Glass - Opaque, Dark, No Back Bleed) */}
      <div
        className="rounded-3xl p-5 sm:p-6 max-w-2xl w-full relative overflow-hidden flex flex-col gap-4 select-none"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0c0d15',
          background: 'linear-gradient(180deg, #10131e 0%, #080a11 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow:
            '0 32px 80px -12px rgba(0, 0, 0, 0.98), 0 12px 28px -4px rgba(0, 0, 0, 0.8), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)',
        }}
      >
        {/* Top Control Bar: Spatial Stereo on left, Reset / Done / Close on right */}
        <div className="flex items-center justify-between pb-1 relative z-10">
          {/* Smart 3D Spatial Stereo Widener Button (No extra text/labels) */}
          <button
            onClick={toggleSpatialStereo}
            title={mixerSettings.spatialStereo ? '3D Стерео активно (кликните для выключения)' : 'Включить 3D Стерео'}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold btn-spring flex items-center gap-1.5 cursor-pointer transition-all ${
              mixerSettings.spatialStereo
                ? 'bg-white text-neutral-950 font-bold shadow-lg shadow-white/20'
                : 'bg-white/6 text-neutral-300 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <Layers size={13} strokeWidth={2} />
            <span>Стерео</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={resetMixer}
              title="Сбросить все настройки на Flat"
              className="px-2.5 py-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/8 btn-spring flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <RotateCcw size={14} strokeWidth={1.5} />
              <span className="hidden sm:inline">Сброс</span>
            </button>

            <button
              onClick={() => setIsMixerOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-white text-neutral-950 font-semibold text-xs hover:bg-neutral-200 btn-spring shadow-md shadow-white/10 cursor-pointer"
            >
              Готово
            </button>

            <button
              onClick={() => setIsMixerOpen(false)}
              aria-label="Закрыть микшер"
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 btn-spring cursor-pointer"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Presets Bar */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 relative z-10">
          {MIXER_PRESETS.map((p) => {
            const isSelected = mixerSettings.preset === p.key;
            return (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap btn-spring transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-neutral-950 font-semibold shadow-md shadow-white/20'
                    : 'bg-white/4 hover:bg-white/8 text-neutral-300 border border-white/6 hover:border-white/12'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* 5-Band Equalizer Section with 3D Waterfall Curved Glass Edge */}
        <div
          className="relative p-4 sm:p-5 rounded-3xl overflow-hidden"
          style={{
            backgroundColor: '#111420',
            background:
              'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 22%, rgba(0, 0, 0, 0.35) 75%, rgba(0, 0, 0, 0.6) 100%)',
            boxShadow:
              '0 18px 40px -10px rgba(0, 0, 0, 0.8), inset 0 2px 1px 0 rgba(255, 255, 255, 0.38), inset 0 8px 18px -4px rgba(255, 255, 255, 0.08), inset 0 -3px 3px 0 rgba(0, 0, 0, 0.7), inset 1.5px 0 1.5px 0 rgba(255, 255, 255, 0.12), inset -1.5px 0 1.5px 0 rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
          }}
        >
          {/* Waterfall Lens Optical Overlay with Curving Specular Falloff */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 90% 40% at 50% 0%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.02) 50%, transparent 85%), linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, transparent 45%)',
            }}
          />

          <div className="grid grid-cols-5 gap-2 sm:gap-4 py-1 relative z-10">
            {FREQ_BANDS.map((b) => (
              <VerticalFader
                key={b.freq}
                label={b.label}
                value={mixerSettings.bands[b.freq]}
                min={-12}
                max={12}
                step={0.5}
                onChangeLive={(val) => setBandGainLive(b.freq, val)}
                onChangeEnd={(val) => setBandGain(b.freq, val)}
              />
            ))}
          </div>
        </div>

        {/* Master Sound Shapers: Bass Boost & Stereo Pan & Preamp (All 3 with matching 3D Waterfall Curved Glass & Solid White Fills) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
          {/* Bass Boost */}
          <HorizontalSlider
            label="Bass Boost"
            icon={<Zap size={14} className="text-white" />}
            value={mixerSettings.bassBoost}
            min={0}
            max={10}
            step={0.5}
            formatValue={(val) => `+${val} dB`}
            onChangeLive={setBassBoostLive}
            onChangeEnd={setBassBoost}
          />

          {/* Stereo Balance (Pan) - Fixed Center-Zero Track Fill */}
          <HorizontalSlider
            label="Панорама"
            icon={<Volume2 size={14} className="text-white" />}
            value={mixerSettings.pan}
            min={-1}
            max={1}
            step={0.05}
            isCenterZero={true}
            formatValue={(val) =>
              val === 0
                ? 'Центр'
                : val < 0
                ? `L ${Math.round(Math.abs(val) * 100)}%`
                : `R ${Math.round(val * 100)}%`
            }
            onChangeLive={setPanLive}
            onChangeEnd={setPan}
          />

          {/* Preamp */}
          <HorizontalSlider
            label="Предусилитель"
            icon={<SlidersHorizontal size={14} className="text-white" />}
            value={mixerSettings.preamp}
            min={-6}
            max={6}
            step={0.5}
            formatValue={(val) => (val > 0 ? `+${val}` : `${val}`) + ' dB'}
            onChangeLive={setPreampLive}
            onChangeEnd={setPreamp}
          />
        </div>
      </div>
    </div>
  );
};
