import type { Track, MildWaveStyle } from './music';
import type { MixerSettings } from './mixer';

export type RemixMode = 'original' | 'slowed' | 'speed_up';

export interface TrackListeningStats {
  trackId: number;
  title: string;
  artist: string;
  genre?: string;
  artwork_url?: string;
  playCount: number;           // How many times playback started
  totalListenDuration: number; // Total seconds actively listened
  completionCount: number;     // Listened to completion (>70% of duration)
  skipCount: number;           // Skipped within first 15 seconds
  lastPlayedAt: number;        // Epoch ms
  isLiked: boolean;
  computedWeight?: number;     // Normalized affinity score
}

export interface UserPreferenceProfile {
  version: number;
  lastUpdated: number;
  statsByTrackId: Record<number, TrackListeningStats>;
  topArtists: Record<string, number>; // artist -> affinity score
  topGenres: Record<string, number>;  // genre -> affinity score
  likedTracks: Track[];
  historyTracks: Track[];
  mildWaveStyle: MildWaveStyle;
  mixerSettings?: MixerSettings;
  remixMode?: RemixMode;
}

