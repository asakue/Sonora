export interface Track {
  id: number;
  title: string;
  artist: string;
  artist_avatar?: string;
  artwork_url?: string;
  duration: number; // milliseconds
  genre?: string;
  tags: string[];
  permalink_url: string;
  playback_count?: number;
  likes_count?: number;
  streamable: boolean;
}

export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export type MildWaveStyle = 'aura' | 'chill' | 'vinyl' | 'energetic' | 'discovery';

export interface StreamInfo {
  track_id: number;
  protocol: 'progressive' | 'hls';
  stream_url: string;
}

export interface UserStats {
  likedTracks: Track[];
  historyTracks: Track[];
  volume: number;
  isMuted: boolean;
  mildWaveStyle: MildWaveStyle;
}

