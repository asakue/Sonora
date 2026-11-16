export interface MixerSettings {
  bands: {
    60: number;
    250: number;
    1000: number;
    4000: number;
    12000: number;
  };
  bassBoost: number; // 0 to 10 dB
  pan: number; // -1 to +1 (L to R)
  preamp: number; // -6 to +6 dB
  preset: string;
  spatialStereo?: boolean; // Smart 3D Spatial Stereo Widener
}

export interface PresetConfig {
  key: string;
  label: string;
  description: string;
  bands: { 60: number; 250: number; 1000: number; 4000: number; 12000: number };
  bassBoost: number;
  preamp?: number;
}

export const MIXER_PRESETS: PresetConfig[] = [
  {
    key: 'flat',
    label: 'По умолчанию',
    description: 'Оригинальное студийное звучание без окраса',
    bands: { 60: 0, 250: 0, 1000: 0, 4000: 0, 12000: 0 },
    bassBoost: 0,
    preamp: 0,
  },
  {
    key: 'bass',
    label: 'Басс-буст',
    description: 'Глубокие массивные суб-низы для дропов и хип-хопа',
    bands: { 60: 7, 250: 4, 1000: 0, 4000: 1, 12000: 2 },
    bassBoost: 6,
    preamp: -1,
  },
  {
    key: 'vocal',
    label: 'Чистый вокал',
    description: 'Подчёркнутая середина и прозрачность голоса',
    bands: { 60: -2, 250: 0, 1000: 5, 4000: 4, 12000: 2 },
    bassBoost: 0,
    preamp: 0,
  },
  {
    key: 'wave',
    label: 'MildWave',
    description: 'Плавный эмбиент с мягким басом и воздушными верхами',
    bands: { 60: 4, 250: 2, 1000: -1, 4000: 2, 12000: 5 },
    bassBoost: 2,
    preamp: 0,
  },
  {
    key: 'electronic',
    label: 'Электроника',
    description: 'Плотный панч и яркие синт-хэты',
    bands: { 60: 6, 250: 3, 1000: -2, 4000: 3, 12000: 6 },
    bassBoost: 4,
    preamp: 0,
  },
  {
    key: 'rock',
    label: 'Рок & Драйв',
    description: 'Энергичные гитары и плотная ритм-секция',
    bands: { 60: 4, 250: 3, 1000: 2, 4000: 4, 12000: 3 },
    bassBoost: 2,
    preamp: 0,
  },
  {
    key: 'night',
    label: 'Ночной режим',
    description: 'Приглушённые басы и мягкие верхи для вечернего прослушивания',
    bands: { 60: -6, 250: -3, 1000: 1, 4000: -2, 12000: -4 },
    bassBoost: 0,
    preamp: 0,
  },
];

export const FREQ_BANDS: { freq: 60 | 250 | 1000 | 4000 | 12000; label: string; desc: string }[] = [
  { freq: 60, label: '60 Hz', desc: 'Суб-бас' },
  { freq: 250, label: '250 Hz', desc: 'Бас' },
  { freq: 1000, label: '1 kHz', desc: 'Средние' },
  { freq: 4000, label: '4 kHz', desc: 'Высокие средние' },
  { freq: 12000, label: '12 kHz', desc: 'Воздух' },
];

export const STORAGE_KEY = 'sonora_mixer_settings';

export const getInitialMixerSettings = (): MixerSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.bands) {
        return parsed;
      }
    }
  } catch {}
  return {
    bands: { 60: 0, 250: 0, 1000: 0, 4000: 0, 12000: 0 },
    bassBoost: 0,
    pan: 0,
    preamp: 0,
    preset: 'flat',
    spatialStereo: false,
  };
};

