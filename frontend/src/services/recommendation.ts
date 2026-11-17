import type { Track } from '../types/music';
import type { TrackListeningStats } from '../types/userProfile';
import { selectOptimalSeeds } from './preferenceEngine';
import { getApiBase } from '../config';

export const QUEUE_STORAGE_KEY = 'sonora_saved_queue_v1';
export const CURRENT_TRACK_STORAGE_KEY = 'sonora_saved_track_v1';

/**
 * Intelligent Personalized Queue Generator.
 * Synthesizes user's liked tracks, listening history, and dynamic engagement profile
 * with SoundCloud MildWave AI to construct a personalized listening queue.
 */
export async function buildPersonalizedQueue(
  likedTracks: Track[],
  historyTracks: Track[],
  statsMap?: Record<number, TrackListeningStats>
): Promise<{ queue: Track[]; initialTrack: Track | null }> {
  // Deduplication set
  const addedIds = new Set<number>();
  const queue: Track[] = [];

  // Helper to safely add tracks without duplicates and filter out disliked/skipped tracks
  const addTrack = (t: Track | null | undefined): boolean => {
    if (!t || !t.id || addedIds.has(t.id)) return false;

    // Check if user has strong negative affinity (frequent skips without completion)
    if (statsMap && statsMap[t.id]) {
      const stats = statsMap[t.id];
      if (stats.skipCount >= 3 && stats.completionCount === 0) {
        return false;
      }
    }

    addedIds.add(t.id);
    queue.push(t);
    return true;
  };

  const hasLikes = likedTracks && likedTracks.length > 0;
  const hasHistory = historyTracks && historyTracks.length > 0;

  // Use dynamic preference engine if statsMap is provided
  let topSeeds: Track[] = [];
  let favoriteArtists: string[] = [];

  if (statsMap && Object.keys(statsMap).length > 0) {
    const seedsData = selectOptimalSeeds(likedTracks, historyTracks, statsMap);
    topSeeds = seedsData.topSeeds;
    favoriteArtists = seedsData.favoriteArtists;
  }

  // 1. Identify primary anchor track
  const primaryAnchor = topSeeds.length > 0
    ? topSeeds[0]
    : hasHistory
    ? historyTracks[0]
    : hasLikes
    ? likedTracks[0]
    : null;

  if (primaryAnchor) {
    addTrack(primaryAnchor);
  }

  // 2. Collect Seed Track IDs for the Recommendation Engine
  const seedIds: number[] = [];
  if (primaryAnchor) seedIds.push(primaryAnchor.id);

  if (topSeeds.length > 1) {
    for (const t of topSeeds.slice(1, 6)) {
      if (!seedIds.includes(t.id)) seedIds.push(t.id);
    }
  } else {
    // Add up to 3 liked track IDs
    for (const t of likedTracks) {
      if (!seedIds.includes(t.id)) seedIds.push(t.id);
      if (seedIds.length >= 4) break;
    }
    // Add up to 2 history track IDs
    for (const t of historyTracks) {
      if (!seedIds.includes(t.id)) seedIds.push(t.id);
      if (seedIds.length >= 6) break;
    }
  }

  let recommendations: Track[] = [];

  // 3. Query Backend MildWave Recommendation Engine if we have seeds
  if (seedIds.length > 0) {
    try {
      const res = await fetch(`${getApiBase()}/api/mildwave/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_track_id: primaryAnchor?.id || seedIds[0],
          liked_track_ids: likedTracks.map((t) => t.id).slice(0, 10),
          history_track_ids: historyTracks.map((t) => t.id).slice(0, 10),
          style_preset: 'discovery',
          limit: 15,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.tracks && Array.isArray(data.tracks)) {
          recommendations = data.tracks;
        }
      }
    } catch (e) {
      console.warn('MildWave recommendation fetch failed:', e);
    }

    // If MildWave returned few tracks, fetch related tracks for the primary anchor directly
    if (recommendations.length < 5 && primaryAnchor) {
      try {
        const relRes = await fetch(`${getApiBase()}/api/tracks/${primaryAnchor.id}/related?limit=10`);
        if (relRes.ok) {
          const relData = await relRes.json();
          if (relData.tracks && Array.isArray(relData.tracks)) {
            recommendations.push(...relData.tracks);
          }
        }
      } catch {}
    }

    // If still low, search based on favorite artists from profile
    if (recommendations.length < 6) {
      const artistQuery = favoriteArtists[0] || primaryAnchor?.artist;
      if (artistQuery) {
        try {
          const searchRes = await fetch(`${getApiBase()}/api/search?q=${encodeURIComponent(artistQuery)}&limit=10`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.tracks) {
              recommendations.push(...searchData.tracks);
            }
          }
        } catch {}
      }
    }
  }

  // 4. Fallback for Cold Start (New user with zero likes and zero history)
  if (queue.length === 0 && recommendations.length === 0) {
    try {
      const starterQueries = ['Пошлая Молли', 'кис кис', 'дора', 'alternative rock'];
      const q = starterQueries[Math.floor(Math.random() * starterQueries.length)];
      const res = await fetch(`${getApiBase()}/api/search?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (data.tracks) {
          recommendations = data.tracks;
        }
      }
    } catch {}
  }

  // 5. Smart Interweaving (Golden Ratio: ~35% Loved Favorites + ~65% Fresh Discoveries)
  let recIndex = 0;
  let likeIndex = 0;
  let histIndex = 0;

  // Add first 2 kindred recommendations
  while (recIndex < recommendations.length && recIndex < 2) {
    addTrack(recommendations[recIndex++]);
  }

  // Add 1 favorite from likes or top seeds
  const likedCandidates = topSeeds.length > 0 ? topSeeds : likedTracks;
  while (likeIndex < likedCandidates.length) {
    if (addTrack(likedCandidates[likeIndex++])) break;
  }

  // Add next 2 recommendations
  const targetRec2 = recIndex + 2;
  while (recIndex < recommendations.length && recIndex < targetRec2) {
    addTrack(recommendations[recIndex++]);
  }

  // Add 1 from history
  while (histIndex < historyTracks.length) {
    if (addTrack(historyTracks[histIndex++])) break;
  }

  // Add next favorite from likes
  while (likeIndex < likedCandidates.length) {
    if (addTrack(likedCandidates[likeIndex++])) break;
  }

  // Add all remaining recommendations up to a balanced queue of 12-16 tracks
  while (recIndex < recommendations.length && queue.length < 16) {
    addTrack(recommendations[recIndex++]);
  }

  // If queue still small, add remaining liked tracks
  while (likeIndex < likedCandidates.length && queue.length < 16) {
    addTrack(likedCandidates[likeIndex++]);
  }

  const initialTrack = queue.length > 0 ? queue[0] : null;
  return { queue, initialTrack };
}

/**
 * Restores saved session from localStorage, or generates a fresh personalized queue if none exists.
 */
export async function getInitialOrRestoredQueue(
  likedTracks: Track[],
  historyTracks: Track[],
  statsMap?: Record<number, TrackListeningStats>
): Promise<{ queue: Track[]; initialTrack: Track | null }> {
  try {
    const savedQueueRaw = localStorage.getItem(QUEUE_STORAGE_KEY);
    const savedTrackRaw = localStorage.getItem(CURRENT_TRACK_STORAGE_KEY);

    if (savedQueueRaw) {
      const savedQueue = JSON.parse(savedQueueRaw);
      if (Array.isArray(savedQueue) && savedQueue.length > 0) {
        let initialTrack: Track | null = null;
        if (savedTrackRaw) {
          try {
            initialTrack = JSON.parse(savedTrackRaw);
          } catch {}
        }
        if (!initialTrack) {
          initialTrack = savedQueue[0];
        }
        return { queue: savedQueue, initialTrack };
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved session queue:', e);
  }

  // If no saved queue, build fresh personalized mix with dynamic preference weights
  return buildPersonalizedQueue(likedTracks, historyTracks, statsMap);
}

