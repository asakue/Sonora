import type { Track } from '../types/music';
import type { TrackListeningStats } from '../types/userProfile';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Calculates dynamic affinity score for an individual track.
 * Combines positive signals (re-plays, total listening time, completions, like status)
 * with negative signals (early skips within 15 seconds) and a 14-day half-life recency decay.
 */
export function calculateTrackWeight(stats: TrackListeningStats, now = Date.now()): number {
  const {
    playCount = 0,
    totalListenDuration = 0,
    completionCount = 0,
    skipCount = 0,
    lastPlayedAt = now,
    isLiked = false,
  } = stats;

  // Base raw score
  let rawScore =
    (playCount * 2.0) +
    ((totalListenDuration / 60) * 1.5) +
    (completionCount * 3.0) +
    (isLiked ? 5.0 : 0.0) -
    (skipCount * 2.5);

  // Recency decay with 14-day half-life
  const ageMs = Math.max(0, now - lastPlayedAt);
  const recencyFactor = Math.pow(0.5, ageMs / FOURTEEN_DAYS_MS);

  // Final score retains at least 40% weight even for older tracks
  const finalWeight = rawScore > 0 ? rawScore * (0.4 + 0.6 * recencyFactor) : rawScore;
  return Math.round(finalWeight * 100) / 100;
}

/**
 * Updates or creates track listening statistics upon track transition or playback events.
 */
export function recordListeningEvent(
  statsMap: Record<number, TrackListeningStats>,
  track: Track,
  listenedSeconds: number,
  isLiked: boolean,
  now = Date.now()
): Record<number, TrackListeningStats> {
  if (!track || !track.id) return statsMap;

  const existing = statsMap[track.id] || {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    genre: track.genre,
    artwork_url: track.artwork_url,
    playCount: 0,
    totalListenDuration: 0,
    completionCount: 0,
    skipCount: 0,
    lastPlayedAt: now,
    isLiked: isLiked,
  };

  const isSkip = listenedSeconds < 15;
  const isCompletion =
    track.duration > 0
      ? listenedSeconds >= Math.min(track.duration * 0.7, 180)
      : listenedSeconds >= 60;

  const updated: TrackListeningStats = {
    ...existing,
    title: track.title || existing.title,
    artist: track.artist || existing.artist,
    genre: track.genre || existing.genre,
    artwork_url: track.artwork_url || existing.artwork_url,
    playCount: existing.playCount + 1,
    totalListenDuration: Math.round(existing.totalListenDuration + Math.max(0, listenedSeconds)),
    skipCount: existing.skipCount + (isSkip ? 1 : 0),
    completionCount: existing.completionCount + (isCompletion ? 1 : 0),
    lastPlayedAt: now,
    isLiked: isLiked,
  };

  updated.computedWeight = calculateTrackWeight(updated, now);

  return {
    ...statsMap,
    [track.id]: updated,
  };
}

/**
 * Derives top preferred artists and genres from overall listening statistics.
 */
export function deriveAggregatedPreferences(statsMap: Record<number, TrackListeningStats>): {
  topArtists: Record<string, number>;
  topGenres: Record<string, number>;
} {
  const topArtists: Record<string, number> = {};
  const topGenres: Record<string, number> = {};

  for (const stats of Object.values(statsMap)) {
    const weight = stats.computedWeight ?? calculateTrackWeight(stats);

    if (stats.artist) {
      const normArtist = stats.artist.trim();
      if (normArtist) {
        topArtists[normArtist] = Math.round(((topArtists[normArtist] || 0) + weight) * 100) / 100;
      }
    }

    if (stats.genre) {
      const normGenre = stats.genre.trim().toLowerCase();
      if (normGenre) {
        topGenres[normGenre] = Math.round(((topGenres[normGenre] || 0) + weight) * 100) / 100;
      }
    }
  }

  return { topArtists, topGenres };
}

/**
 * Evaluates seed tracks for the recommendation algorithm.
 * Selects only high-affinity tracks from history (filtering out low/negative scores)
 * and orders liked tracks by active user engagement.
 */
export function selectOptimalSeeds(
  likedTracks: Track[],
  historyTracks: Track[],
  statsMap: Record<number, TrackListeningStats>
): {
  topSeeds: Track[];
  favoriteArtists: string[];
} {
  const scoredLiked = likedTracks.map((track) => {
    const stats = statsMap[track.id];
    const weight = stats ? (stats.computedWeight ?? calculateTrackWeight(stats)) : 5.0;
    return { track, weight };
  });

  const scoredHistory = historyTracks
    .map((track) => {
      const stats = statsMap[track.id];
      const weight = stats ? (stats.computedWeight ?? calculateTrackWeight(stats)) : 1.0;
      return { track, weight };
    })
    .filter((item) => item.weight > 0.5); // Filter out skipped/disliked tracks

  // Sort by engagement weight
  scoredLiked.sort((a, b) => b.weight - a.weight);
  scoredHistory.sort((a, b) => b.weight - a.weight);

  const seenIds = new Set<number>();
  const topSeeds: Track[] = [];

  // Interleave best liked and best history tracks
  const maxSeeds = 6;
  let lIdx = 0;
  let hIdx = 0;

  while (topSeeds.length < maxSeeds && (lIdx < scoredLiked.length || hIdx < scoredHistory.length)) {
    if (lIdx < scoredLiked.length) {
      const item = scoredLiked[lIdx++];
      if (!seenIds.has(item.track.id)) {
        seenIds.add(item.track.id);
        topSeeds.push(item.track);
      }
    }
    if (topSeeds.length >= maxSeeds) break;
    if (hIdx < scoredHistory.length) {
      const item = scoredHistory[hIdx++];
      if (!seenIds.has(item.track.id)) {
        seenIds.add(item.track.id);
        topSeeds.push(item.track);
      }
    }
  }

  // Derive favorite artists with positive affinity
  const { topArtists } = deriveAggregatedPreferences(statsMap);
  const favoriteArtists = Object.entries(topArtists)
    .filter(([_, score]) => score > 2.0)
    .sort((a, b) => b[1] - a[1])
    .map(([artist]) => artist)
    .slice(0, 5);

  return { topSeeds, favoriteArtists };
}
