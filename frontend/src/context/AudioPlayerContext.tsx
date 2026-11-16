import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { PlaybackStatus, StreamInfo, Track } from '../types/music';
import {
  type MixerSettings,
  MIXER_PRESETS,
  getInitialMixerSettings,
  STORAGE_KEY,
} from '../types/mixer';
import { QUEUE_STORAGE_KEY, CURRENT_TRACK_STORAGE_KEY } from '../services/recommendation';

export interface AudioProgressContextType {
  currentTime: number;
  duration: number;
  seek: (seconds: number) => void;
}

export type RemixMode = 'original' | 'slowed' | 'speed_up';

export const AudioProgressContext = createContext<AudioProgressContextType>({
  currentTime: 0,
  duration: 0,
  seek: () => {},
});

export const useAudioProgress = () => useContext(AudioProgressContext);

interface AudioPlayerContextType {
  currentTrack: Track | null;
  status: PlaybackStatus;
  isPlaying: boolean;
  isLoading: boolean;
  volume: number;
  isMuted: boolean;
  queue: Track[];
  queueIndex: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  errorMessage: string | null;

  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  getFrequencyData: () => Uint8Array | null;

  // Audio Mixer & Equalizer
  mixerSettings: MixerSettings;
  setBandGain: (freq: 60 | 250 | 1000 | 4000 | 12000, gain: number) => void;
  setBandGainLive: (freq: 60 | 250 | 1000 | 4000 | 12000, gain: number) => void;
  setBassBoost: (val: number) => void;
  setBassBoostLive: (val: number) => void;
  setPan: (val: number) => void;
  setPanLive: (val: number) => void;
  setPreamp: (val: number) => void;
  setPreampLive: (val: number) => void;
  toggleSpatialStereo: () => void;
  applyPreset: (presetKey: string) => void;
  resetMixer: () => void;
  isMixerOpen: boolean;
  setIsMixerOpen: (open: boolean) => void;

  // Live Remix DSP
  remixMode: RemixMode;
  setRemixMode: (mode: RemixMode) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

const API_BASE = 'http://127.0.0.1:8000';

/**
 * Isolated AudioProgressProvider:
 * Subscribes to high-frequency audio timeupdate events and RAF ticker.
 * Immediately initializes duration from currentTrack without waiting for network headers.
 * Re-renders ONLY TimelineScrubber, NEVER re-rendering AudioPlayerProvider or the rest of the application.
 */
const AudioProgressProvider: React.FC<{
  audioRef: React.RefObject<HTMLAudioElement | null>;
  currentTrack: Track | null;
  isPlaying: boolean;
  seek: (seconds: number) => void;
  children: React.ReactNode;
}> = ({ audioRef, currentTrack, isPlaying, seek, children }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Sync duration with currentTrack immediately upon track change
  useEffect(() => {
    setCurrentTime(0);
    if (currentTrack?.duration) {
      setAudioDuration(currentTrack.duration);
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      } else if (currentTrack?.duration) {
        setAudioDuration(currentTrack.duration);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('canplay', updateDuration);
    audio.addEventListener('play', updateTime);
    audio.addEventListener('playing', updateTime);
    audio.addEventListener('seeked', updateTime);

    updateTime();
    updateDuration();

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('canplay', updateDuration);
      audio.removeEventListener('play', updateTime);
      audio.removeEventListener('playing', updateTime);
      audio.removeEventListener('seeked', updateTime);
    };
  }, [audioRef.current, currentTrack?.id]);

  // High-precision requestAnimationFrame ticker during playback for silky-smooth progress movement
  useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused && !isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, audioRef]);

  const effectiveDuration = audioDuration > 0 ? audioDuration : (currentTrack?.duration || 0);

  const progressValue = useMemo<AudioProgressContextType>(() => ({
    currentTime,
    duration: effectiveDuration,
    seek,
  }), [currentTime, effectiveDuration, seek]);

  return (
    <AudioProgressContext.Provider value={progressValue}>
      {children}
    </AudioProgressContext.Provider>
  );
};

/**
 * Synthetic impulse response for lush hall/ambient reverb in Slowed + Reverb mode
 */
function createReverbImpulse(ctx: AudioContext, duration = 2.4, decay = 2.0): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const factor = Math.exp(-i / (sampleRate * (decay / 4)));
    left[i] = (Math.random() * 2 - 1) * factor;
    right[i] = (Math.random() * 2 - 1) * factor;
  }
  return impulse;
}

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [audioInstance] = useState(() => {
    if (typeof Audio === 'undefined') return null;
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.preload = 'auto';
    return a;
  });
  const audioRef = useRef<HTMLAudioElement | null>(audioInstance);
  audioRef.current = audioInstance;
  const playRequestIdRef = useRef<number>(0);
  const lastPrevClickRef = useRef<number>(0);
  const hlsRef = useRef<Hls | null>(null);

  // Web Audio API refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // EQ & Mixer Audio Nodes
  const filtersRef = useRef<{ [freq: number]: BiquadFilterNode }>({});
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);
  const preampNodeRef = useRef<GainNode | null>(null);
  const spatialDryGainRef = useRef<GainNode | null>(null);
  const spatialWetGainRef = useRef<GainNode | null>(null);

  // Remix Live DSP Nodes & State
  const [remixMode, setRemixModeState] = useState<RemixMode>(() => {
    try {
      const saved = localStorage.getItem('sonora_remix_mode') as RemixMode;
      if (saved === 'slowed' || saved === 'speed_up') return saved;
    } catch {}
    return 'original';
  });
  const remixModeRef = useRef<RemixMode>(remixMode);
  remixModeRef.current = remixMode;

  const reverbConvolverRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mixer & Equalizer State
  const [mixerSettings, setMixerSettings] = useState<MixerSettings>(getInitialMixerSettings);
  const mixerSettingsRef = useRef<MixerSettings>(mixerSettings);
  mixerSettingsRef.current = mixerSettings;

  const [isMixerOpen, setIsMixerOpen] = useState(false);

  // Synchronized refs for stable callbacks
  const queueRef = useRef<Track[]>(queue);
  queueRef.current = queue;

  const queueIndexRef = useRef<number>(queueIndex);
  queueIndexRef.current = queueIndex;

  const statusRef = useRef<PlaybackStatus>(status);
  statusRef.current = status;

  const currentTrackRef = useRef<Track | null>(currentTrack);
  currentTrackRef.current = currentTrack;

  const repeatModeRef = useRef<'off' | 'all' | 'one'>(repeatMode);
  repeatModeRef.current = repeatMode;

  const isShuffleRef = useRef<boolean>(isShuffle);
  isShuffleRef.current = isShuffle;

  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;

  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  // Auto-persist active queue for seamless reload restoration
  useEffect(() => {
    if (queue.length > 0) {
      try {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue.slice(0, 30)));
      } catch {}
    }
  }, [queue]);

  // Auto-persist current track for reload restoration
  useEffect(() => {
    if (currentTrack) {
      try {
        localStorage.setItem(CURRENT_TRACK_STORAGE_KEY, JSON.stringify(currentTrack));
      } catch {}
    }
  }, [currentTrack]);

  // Initialize HTMLAudioElement event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onWaiting = () => setStatus('loading');
    const onPlaying = () => {
      setStatus('playing');
      setErrorMessage(null);
    };
    const onPause = () => {
      if (statusRef.current !== 'loading') setStatus('paused');
    };
    const onError = () => {
      setStatus('error');
      setErrorMessage('Ошибка воспроизведения аудиопотока');
    };

    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, []);

  // Smoothly apply DSP audio parameters using setTargetAtTime (pop-free transition)
  const applyAudioParams = useCallback((settings: MixerSettings) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;

    const f60 = filtersRef.current[60];
    const f250 = filtersRef.current[250];
    const f1000 = filtersRef.current[1000];
    const f4000 = filtersRef.current[4000];
    const f12000 = filtersRef.current[12000];

    if (f60) f60.gain.setTargetAtTime(settings.bands[60] + settings.bassBoost, now, 0.02);
    if (f250) f250.gain.setTargetAtTime(settings.bands[250] + (settings.bassBoost * 0.4), now, 0.02);
    if (f1000) f1000.gain.setTargetAtTime(settings.bands[1000], now, 0.02);
    if (f4000) f4000.gain.setTargetAtTime(settings.bands[4000], now, 0.02);
    if (f12000) f12000.gain.setTargetAtTime(settings.bands[12000], now, 0.02);

    if (pannerNodeRef.current) {
      try {
        pannerNodeRef.current.pan.setValueAtTime(settings.pan, now);
        pannerNodeRef.current.pan.setTargetAtTime(settings.pan, now, 0.015);
      } catch {
        pannerNodeRef.current.pan.value = settings.pan;
      }
    }
    if (preampNodeRef.current) {
      const mult = Math.pow(10, settings.preamp / 20);
      preampNodeRef.current.gain.setTargetAtTime(mult, now, 0.02);
    }
    if (spatialDryGainRef.current && spatialWetGainRef.current) {
      const isSpatial = !!settings.spatialStereo;
      try {
        spatialDryGainRef.current.gain.cancelScheduledValues(now);
        spatialWetGainRef.current.gain.cancelScheduledValues(now);
        spatialDryGainRef.current.gain.setValueAtTime(spatialDryGainRef.current.gain.value, now);
        spatialWetGainRef.current.gain.setValueAtTime(spatialWetGainRef.current.gain.value, now);
        spatialDryGainRef.current.gain.setTargetAtTime(isSpatial ? 0 : 1, now, 0.015);
        spatialWetGainRef.current.gain.setTargetAtTime(isSpatial ? 1 : 0, now, 0.015);
      } catch {
        spatialDryGainRef.current.gain.value = isSpatial ? 0 : 1;
        spatialWetGainRef.current.gain.value = isSpatial ? 1 : 0;
      }
    }
  }, []);

  // Web Audio Context lazy setup
  const initWebAudio = useCallback(() => {
    if (!audioRef.current || audioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.82;

      const gain = ctx.createGain();
      gain.gain.value = isMutedRef.current ? 0 : volumeRef.current;

      const source = ctx.createMediaElementSource(audioRef.current);

      // Preamp Gain
      const preamp = ctx.createGain();
      preamp.gain.value = Math.pow(10, mixerSettingsRef.current.preamp / 20);

      // 5-Band Equalizer Filters
      const f60 = ctx.createBiquadFilter();
      f60.type = 'lowshelf';
      f60.frequency.value = 60;
      f60.gain.value = mixerSettingsRef.current.bands[60] + mixerSettingsRef.current.bassBoost;

      const f250 = ctx.createBiquadFilter();
      f250.type = 'peaking';
      f250.frequency.value = 250;
      f250.Q.value = 1.0;
      f250.gain.value = mixerSettingsRef.current.bands[250] + (mixerSettingsRef.current.bassBoost * 0.4);

      const f1000 = ctx.createBiquadFilter();
      f1000.type = 'peaking';
      f1000.frequency.value = 1000;
      f1000.Q.value = 1.0;
      f1000.gain.value = mixerSettingsRef.current.bands[1000];

      const f4000 = ctx.createBiquadFilter();
      f4000.type = 'peaking';
      f4000.frequency.value = 4000;
      f4000.Q.value = 1.0;
      f4000.gain.value = mixerSettingsRef.current.bands[4000];

      const f12000 = ctx.createBiquadFilter();
      f12000.type = 'highshelf';
      f12000.frequency.value = 12000;
      f12000.gain.value = mixerSettingsRef.current.bands[12000];

      // Smart 3D Spatial Stereo Widener (Cross-Channel Haas & Allpass Phase Decorrelator)
      // Dramatically expands soundstage into 3D binaural space across ANY track (mono or stereo).
      // Leaves center kick/sub-bass 100% punchy and mono below 220Hz.
      const isSpatial = !!mixerSettingsRef.current.spatialStereo;

      const dryGain = ctx.createGain();
      dryGain.gain.value = isSpatial ? 0 : 1;

      const wetGain = ctx.createGain();
      wetGain.gain.value = isSpatial ? 1 : 0;

      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);

      // Direct Paths (Preserves 100% of the original stereo mix, punch, and balance)
      const directL = ctx.createGain();
      directL.gain.value = 1.0;
      const directR = ctx.createGain();
      directR.gain.value = 1.0;

      splitter.connect(directL, 0); // L direct
      splitter.connect(directR, 1); // R direct

      directL.connect(merger, 0, 0); // L direct -> Merger Left Out
      directR.connect(merger, 0, 1); // R direct -> Merger Right Out

      // Spatial Crossfeed R -> L: Highpass (220Hz) -> Allpass (1200Hz) -> Delay (14ms) -> Gain (+0.60) -> L Out
      const crossR_hp = ctx.createBiquadFilter();
      crossR_hp.type = 'highpass';
      crossR_hp.frequency.value = 220;
      crossR_hp.Q.value = 0.707;

      const crossR_ap = ctx.createBiquadFilter();
      crossR_ap.type = 'allpass';
      crossR_ap.frequency.value = 1200;
      crossR_ap.Q.value = 1.5;

      const crossR_delay = ctx.createDelay(0.05);
      crossR_delay.delayTime.value = 0.014; // 14ms psychoacoustic Haas delay

      const crossR_gain = ctx.createGain();
      crossR_gain.gain.value = 0.60;

      splitter.connect(crossR_hp, 1); // Extract R
      crossR_hp.connect(crossR_ap);
      crossR_ap.connect(crossR_delay);
      crossR_delay.connect(crossR_gain);
      crossR_gain.connect(merger, 0, 0); // Crossfeed into Left Out!

      // Spatial Crossfeed L -> R: Highpass (220Hz) -> Allpass (1200Hz) -> Delay (14ms) -> Gain (-0.60) -> R Out
      const crossL_hp = ctx.createBiquadFilter();
      crossL_hp.type = 'highpass';
      crossL_hp.frequency.value = 220;
      crossL_hp.Q.value = 0.707;

      const crossL_ap = ctx.createBiquadFilter();
      crossL_ap.type = 'allpass';
      crossL_ap.frequency.value = 1200;
      crossL_ap.Q.value = 1.5;

      const crossL_delay = ctx.createDelay(0.05);
      crossL_delay.delayTime.value = 0.014; // 14ms psychoacoustic Haas delay

      const crossL_gain = ctx.createGain();
      crossL_gain.gain.value = -0.60; // Inverted crossfeed for stereo width

      splitter.connect(crossL_hp, 0); // Extract L
      crossL_hp.connect(crossL_ap);
      crossL_ap.connect(crossL_delay);
      crossL_delay.connect(crossL_gain);
      crossL_gain.connect(merger, 0, 1); // Crossfeed into Right Out!

      // Connect f12000 output to both Dry path and Splitter input
      f12000.connect(dryGain);
      f12000.connect(splitter);

      // Merger feeds into wetGain
      merger.connect(wetGain);

      // Combine Dry and Wet into spatial output stage
      const spatialMix = ctx.createGain();
      spatialMix.gain.value = 1.0;
      dryGain.connect(spatialMix);
      wetGain.connect(spatialMix);

      // Stereo Panner
      let panner: StereoPannerNode | null = null;
      if (typeof ctx.createStereoPanner === 'function') {
        panner = ctx.createStereoPanner();
        panner.pan.value = mixerSettingsRef.current.pan;
      }

      // Graph: source -> preamp -> f60 -> f250 -> f1000 -> f4000 -> f12000 -> (spatialStage) -> (panner) -> analyser -> masterGain -> destination
      source.connect(preamp);
      preamp.connect(f60);
      f60.connect(f250);
      f250.connect(f1000);
      f1000.connect(f4000);
      f4000.connect(f12000);

      // Smart Reverb Send for Slowed + Reverb mode
      const convolver = ctx.createConvolver();
      convolver.buffer = createReverbImpulse(ctx, 2.4, 2.0);

      const reverbGain = ctx.createGain();
      reverbGain.gain.value = remixModeRef.current === 'slowed' ? 0.35 : 0.0;

      if (panner) {
        spatialMix.connect(panner);
        panner.connect(analyser);
        panner.connect(convolver);
      } else {
        spatialMix.connect(analyser);
        spatialMix.connect(convolver);
      }
      convolver.connect(reverbGain);
      reverbGain.connect(analyser);

      analyser.connect(gain);
      gain.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
      gainNodeRef.current = gain;
      preampNodeRef.current = preamp;
      pannerNodeRef.current = panner;
      spatialDryGainRef.current = dryGain;
      spatialWetGainRef.current = wetGain;
      reverbConvolverRef.current = convolver;
      reverbGainRef.current = reverbGain;
      filtersRef.current = {
        60: f60,
        250: f250,
        1000: f1000,
        4000: f4000,
        12000: f12000,
      };
    } catch (e) {
      console.warn('Web Audio API not initialized (might require user interaction):', e);
    }
  }, []);

  const saveTimeoutRef = useRef<number | null>(null);
  const saveMixerSettings = useCallback((newSettings: MixerSettings) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch {}
    }, 400);
  }, []);

  const setBandGainLive = useCallback((freq: 60 | 250 | 1000 | 4000 | 12000, gain: number) => {
    initWebAudio();
    mixerSettingsRef.current.bands[freq] = gain;
    mixerSettingsRef.current.preset = 'custom';
    const filter = filtersRef.current[freq];
    if (filter && audioCtxRef.current) {
      const boost = freq === 60 ? mixerSettingsRef.current.bassBoost : freq === 250 ? mixerSettingsRef.current.bassBoost * 0.4 : 0;
      filter.gain.setTargetAtTime(gain + boost, audioCtxRef.current.currentTime, 0.015);
    }
  }, [initWebAudio]);

  const setBandGain = useCallback((freq: 60 | 250 | 1000 | 4000 | 12000, gain: number) => {
    initWebAudio();
    setMixerSettings((prev) => {
      const updated: MixerSettings = {
        ...prev,
        bands: { ...prev.bands, [freq]: gain },
        preset: 'custom',
      };
      saveMixerSettings(updated);
      applyAudioParams(updated);
      return updated;
    });
  }, [initWebAudio, applyAudioParams, saveMixerSettings]);

  const setBassBoostLive = useCallback((val: number) => {
    initWebAudio();
    mixerSettingsRef.current.bassBoost = val;
    mixerSettingsRef.current.preset = 'custom';
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const f60 = filtersRef.current[60];
    const f250 = filtersRef.current[250];
    if (f60) f60.gain.setTargetAtTime(mixerSettingsRef.current.bands[60] + val, ctx.currentTime, 0.015);
    if (f250) f250.gain.setTargetAtTime(mixerSettingsRef.current.bands[250] + (val * 0.4), ctx.currentTime, 0.015);
  }, [initWebAudio]);

  const setBassBoost = useCallback((val: number) => {
    initWebAudio();
    setMixerSettings((prev) => {
      const updated: MixerSettings = {
        ...prev,
        bassBoost: val,
        preset: 'custom',
      };
      saveMixerSettings(updated);
      applyAudioParams(updated);
      return updated;
    });
  }, [initWebAudio, applyAudioParams, saveMixerSettings]);

  const setPanLive = useCallback((val: number) => {
    initWebAudio();
    mixerSettingsRef.current.pan = val;
    mixerSettingsRef.current.preset = 'custom';
    if (pannerNodeRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      try {
        pannerNodeRef.current.pan.setValueAtTime(val, now);
        pannerNodeRef.current.pan.setTargetAtTime(val, now, 0.015);
      } catch {
        pannerNodeRef.current.pan.value = val;
      }
    }
  }, [initWebAudio]);

  const setPan = useCallback((val: number) => {
    initWebAudio();
    setMixerSettings((prev) => {
      const updated: MixerSettings = {
        ...prev,
        pan: val,
        preset: 'custom',
      };
      saveMixerSettings(updated);
      applyAudioParams(updated);
      return updated;
    });
  }, [initWebAudio, applyAudioParams, saveMixerSettings]);

  const toggleSpatialStereo = useCallback(async () => {
    initWebAudio();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume();
      } catch {}
    }
    setMixerSettings((prev) => {
      const nextVal = !prev.spatialStereo;
      const updated: MixerSettings = {
        ...prev,
        spatialStereo: nextVal,
      };
      saveMixerSettings(updated);
      applyAudioParams(updated);
      return updated;
    });
  }, [initWebAudio, applyAudioParams, saveMixerSettings]);

  const setPreampLive = useCallback((val: number) => {
    initWebAudio();
    mixerSettingsRef.current.preamp = val;
    mixerSettingsRef.current.preset = 'custom';
    if (preampNodeRef.current && audioCtxRef.current) {
      const mult = Math.pow(10, val / 20);
      preampNodeRef.current.gain.setTargetAtTime(mult, audioCtxRef.current.currentTime, 0.015);
    }
  }, [initWebAudio]);

  const setPreamp = useCallback((val: number) => {
    initWebAudio();
    setMixerSettings((prev) => {
      const updated: MixerSettings = {
        ...prev,
        preamp: val,
        preset: 'custom',
      };
      saveMixerSettings(updated);
      applyAudioParams(updated);
      return updated;
    });
  }, [initWebAudio, applyAudioParams, saveMixerSettings]);

  const applyPreset = useCallback((presetKey: string) => {
    initWebAudio();
    const preset = MIXER_PRESETS.find((p) => p.key === presetKey);
    if (!preset) return;
    setMixerSettings((prev) => {
      const updated: MixerSettings = {
        ...prev,
        bands: { ...preset.bands },
        bassBoost: preset.bassBoost,
        preamp: preset.preamp ?? 0,
        preset: presetKey,
      };
      saveMixerSettings(updated);
      applyAudioParams(updated);
      return updated;
    });
  }, [initWebAudio, applyAudioParams, saveMixerSettings]);

  const resetMixer = useCallback(() => {
    initWebAudio();
    const updated: MixerSettings = {
      bands: { 60: 0, 250: 0, 1000: 0, 4000: 0, 12000: 0 },
      bassBoost: 0,
      pan: 0,
      preamp: 0,
      preset: 'flat',
      spatialStereo: false,
    };
    setMixerSettings(updated);
    saveMixerSettings(updated);
    applyAudioParams(updated);
  }, [initWebAudio, applyAudioParams, saveMixerSettings]);

  const getFrequencyData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);
    return dataArray;
  }, []);

  const applyRemixMode = useCallback((mode: RemixMode) => {
    const audio = audioRef.current;
    const ctx = audioCtxRef.current;

    let targetRate = 1.0;
    let targetPreservesPitch = true;
    let targetReverbGain = 0.0;

    if (mode === 'slowed') {
      targetRate = 0.85;
      targetPreservesPitch = false;
      targetReverbGain = 0.35;
    } else if (mode === 'speed_up') {
      targetRate = 1.20;
      targetPreservesPitch = false;
      targetReverbGain = 0.0;
    }

    if (audio) {
      try {
        audio.playbackRate = targetRate;
        audio.defaultPlaybackRate = targetRate;
        audio.preservesPitch = targetPreservesPitch;
        (audio as any).webkitPreservesPitch = targetPreservesPitch;
        (audio as any).mozPreservesPitch = targetPreservesPitch;
      } catch (e) {
        console.warn('Error applying playbackRate / preservesPitch:', e);
      }
    }

    if (ctx && reverbGainRef.current) {
      try {
        const now = ctx.currentTime;
        reverbGainRef.current.gain.cancelScheduledValues(now);
        reverbGainRef.current.gain.setValueAtTime(reverbGainRef.current.gain.value, now);
        reverbGainRef.current.gain.setTargetAtTime(targetReverbGain, now, 0.04);
      } catch {
        reverbGainRef.current.gain.value = targetReverbGain;
      }
    }
  }, []);

  const setRemixMode = useCallback((mode: RemixMode) => {
    initWebAudio();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setRemixModeState(mode);
    remixModeRef.current = mode;
    try {
      localStorage.setItem('sonora_remix_mode', mode);
    } catch {}
    applyRemixMode(mode);
  }, [initWebAudio, applyRemixMode]);

  // Ensure remix mode playbackRate & preservesPitch are reapplied on audio load/play
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleMediaReady = () => {
      applyRemixMode(remixModeRef.current);
    };

    audio.addEventListener('loadedmetadata', handleMediaReady);
    audio.addEventListener('play', handleMediaReady);
    audio.addEventListener('playing', handleMediaReady);
    return () => {
      audio.removeEventListener('loadedmetadata', handleMediaReady);
      audio.removeEventListener('play', handleMediaReady);
      audio.removeEventListener('playing', handleMediaReady);
    };
  }, [applyRemixMode]);

  const playTrack = useCallback(async (track: Track, newQueue?: Track[]) => {
    const currentRequestId = ++playRequestIdRef.current;

    initWebAudio();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      try {
        await audioCtxRef.current.resume();
      } catch {}
    }

    if (newQueue) {
      setQueue(newQueue);
      queueRef.current = newQueue;
      const idx = newQueue.findIndex((t) => t.id === track.id);
      const chosenIdx = idx !== -1 ? idx : 0;
      setQueueIndex(chosenIdx);
      queueIndexRef.current = chosenIdx;
    } else {
      const q = queueRef.current;
      const existingIdx = q.findIndex((t) => t.id === track.id);
      if (existingIdx !== -1) {
        setQueueIndex(existingIdx);
        queueIndexRef.current = existingIdx;
      } else {
        const updated = [track, ...q];
        setQueue(updated);
        queueRef.current = updated;
        setQueueIndex(0);
        queueIndexRef.current = 0;
      }
    }

    setCurrentTrack(track);
    currentTrackRef.current = track;
    setStatus('loading');
    setErrorMessage(null);

    const audio = audioRef.current;
    if (!audio) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    try {
      const res = await fetch(`${API_BASE}/api/stream/${track.id}/info`);
      if (currentRequestId !== playRequestIdRef.current) {
        // Discard stale request if user clicked Next again while fetching
        return;
      }
      if (!res.ok) {
        throw new Error(`Бэкенд вернул статус ${res.status}`);
      }

      const streamInfo: StreamInfo = await res.json();
      if (currentRequestId !== playRequestIdRef.current) return;

      const streamUrl = streamInfo.stream_url;

      if (streamInfo.protocol === 'hls' && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(streamUrl);
        hls.attachMedia(audio);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (currentRequestId !== playRequestIdRef.current) return;
          audio.play().catch((err) => {
            console.warn('Autoplay prevented:', err);
            setStatus('paused');
          });
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (currentRequestId !== playRequestIdRef.current) return;
          if (data.fatal) {
            console.error('Fatal HLS error:', data);
            setStatus('error');
            setErrorMessage('Ошибка воспроизведения HLS потока');
          }
        });

        hlsRef.current = hls;
      } else {
        audio.src = streamUrl;
        await audio.play().catch((err) => {
          if (currentRequestId !== playRequestIdRef.current) return;
          console.warn('Autoplay prevented:', err);
          setStatus('paused');
        });
      }
    } catch (e: unknown) {
      if (currentRequestId !== playRequestIdRef.current) return;
      console.error('Track playback failed:', e);
      setStatus('error');
      setErrorMessage((e as Error)?.message || 'Не удалось воспроизвести трек');
    }
  }, [initWebAudio]);

  const togglePlay = useCallback(() => {
    initWebAudio();
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    const audio = audioRef.current;
    if (!audio || !currentTrackRef.current) return;

    if (statusRef.current === 'playing') {
      audio.pause();
      setStatus('paused');
    } else {
      audio.play().catch((err) => console.warn('Play interrupted:', err));
    }
  }, [initWebAudio]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0));
  }, []);

  const nextTrack = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) return;

    let nextIdx = queueIndexRef.current + 1;
    if (isShuffleRef.current) {
      nextIdx = Math.floor(Math.random() * q.length);
    }

    if (nextIdx >= q.length) {
      nextIdx = 0; // Wrap around to start of queue so Next ALWAYS works
    }

    const next = q[nextIdx];
    if (next) {
      queueIndexRef.current = nextIdx;
      setQueueIndex(nextIdx);
      playTrack(next);
    }
  }, [playTrack]);

  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    const now = Date.now();
    const isRapidClick = now - lastPrevClickRef.current < 1500;
    lastPrevClickRef.current = now;

    // If more than 3 seconds into track and NOT double clicking, rewind to start
    if (audio && audio.currentTime > 3 && !isRapidClick) {
      audio.currentTime = 0;
      return;
    }

    const q = queueRef.current;
    if (q.length === 0) return;
    let prevIdx = queueIndexRef.current - 1;
    if (prevIdx < 0) {
      prevIdx = q.length - 1; // Wrap around so Prev ALWAYS works
    }

    const prev = q[prevIdx];
    if (prev) {
      queueIndexRef.current = prevIdx;
      setQueueIndex(prevIdx);
      playTrack(prev);
    }
  }, [playTrack]);

  // Track ended event listener
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (repeatModeRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        nextTrack();
      }
    };

    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [nextTrack]);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);

    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prevMuted) => {
      const nextMuted = !prevMuted;
      if (audioRef.current) {
        audioRef.current.muted = nextMuted;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = nextMuted ? 0 : volumeRef.current;
      }
      return nextMuted;
    });
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => [...prev, track]);
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    setQueueIndex((currentIdx) => (index < currentIdx ? currentIdx - 1 : currentIdx));
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';

  const playerValue = useMemo<AudioPlayerContextType>(() => ({
    currentTrack,
    status,
    isPlaying,
    isLoading,
    volume,
    isMuted,
    queue,
    queueIndex,
    isShuffle,
    repeatMode,
    errorMessage,

    playTrack,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    addToQueue,
    removeFromQueue,
    setQueue,
    toggleShuffle,
    toggleRepeat,
    getFrequencyData,

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
    isMixerOpen,
    setIsMixerOpen,

    remixMode,
    setRemixMode,
  }), [
    currentTrack,
    status,
    isPlaying,
    isLoading,
    volume,
    isMuted,
    queue,
    queueIndex,
    isShuffle,
    repeatMode,
    errorMessage,
    playTrack,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    setVolume,
    toggleMute,
    addToQueue,
    removeFromQueue,
    setQueue,
    toggleShuffle,
    toggleRepeat,
    getFrequencyData,
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
    isMixerOpen,
    setIsMixerOpen,
    remixMode,
    setRemixMode,
  ]);

  return (
    <AudioPlayerContext.Provider value={playerValue}>
      <AudioProgressProvider
        audioRef={audioRef}
        currentTrack={currentTrack}
        isPlaying={status === 'playing'}
        seek={seek}
      >
        {children}
      </AudioProgressProvider>
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};
