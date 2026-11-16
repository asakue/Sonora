import type { Track } from '../types/music';

const API_BASE = 'http://127.0.0.1:8000';
export const QUEUE_STORAGE_KEY = 'sonora_saved_queue_v1';
export const CURRENT_TRACK_STORAGE_KEY = 'sonora_saved_track_v1';

/**
 * Intelligent Personalized Queue Generator.
 * Synthesizes user's liked tracks and recent listening history with SoundCloud MildWave AI
 * to construct a seamless, tailored listening queue upon launch or page refresh.
 */
export async function buildPersonalizedQueue(
  likedTracks: Track[],
  historyTracks: Track[]
): Promise<{ queue: Track[]; initialTrack: Track | null }> {
  // Deduplication set
  const addedIds = new Set<number>();
  const queue: Track[] = [];

  // Helper to safely add tracks without duplicates
  const addTrack = (t: Track | null | undefined): boolean => {
    if (!t || !t.id || addedIds.has(t.id)) return false;
    addedIds.add(t.id);
    queue.push(t);
    return true;
  };

  const hasLikes = likedTracks && likedTracks.length > 0;
  const hasHistory = historyTracks && historyTracks.length > 0;

  // 1. Identify primary anchor track (most recently listened, or most recently liked)
  const primaryAnchor = hasHistory
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

  let recommendations: Track[] = [];

  // 3. Query Backend MildWave Recommendation Engine if we have seeds
  if (seedIds.length > 0) {
    try {
      const res = await fetch(`${API_BASE}/api/mildwave/recommend`, {
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
        const relRes = await fetch(`${API_BASE}/api/tracks/${primaryAnchor.id}/related?limit=10`);
        if (relRes.ok) {
          const relData = await relRes.json();
          if (relData.tracks && Array.isArray(relData.tracks)) {
            recommendations.push(...relData.tracks);
          }
        }
      } catch {}
    }

    // If still low, search based on favorite artist
    if (recommendations.length < 5 && primaryAnchor?.artist) {
      try {
        const searchRes = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(primaryAnchor.artist)}&limit=10`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.tracks) {
            recommendations.push(...searchData.tracks);
          }
        }
      } catch {}
    }
  }

  // 4. Fallback for Cold Start (New user with zero likes and zero history)
  if (queue.length === 0 && recommendations.length === 0) {
    try {
      // Vibrant diverse starter pack instead of monotone ambient
      const starterQueries = ['Пошлая Молли', 'кис кис', 'дора', 'alternative rock'];
      const q = starterQueries[Math.floor(Math.random() * starterQueries.length)];
      const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (data.tracks) {
          recommendations = data.tracks;
        }
      }
    } catch {}
  }

  // 5. Smart Interweaving (Golden Ratio: ~35% Loved Favorites + ~65% Fresh Discoveries)
  // Queue structure:
  // [Anchor] -> [Rec 1] -> [Rec 2] -> [Favorite Liked] -> [Rec 3] -> [Rec 4] -> [Favorite History] -> [Remaining Recs]
  let recIndex = 0;
  let likeIndex = 0;
  let histIndex = 0;

  // Add first 2 kindred recommendations
  while (recIndex < recommendations.length && recIndex < 2) {
    addTrack(recommendations[recIndex++]);
  }

  // Add 1 favorite from likes
  while (likeIndex < likedTracks.length) {
    if (addTrack(likedTracks[likeIndex++])) break;
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
  while (likeIndex < likedTracks.length) {
    if (addTrack(likedTracks[likeIndex++])) break;
  }

  // Add all remaining recommendations up to a balanced queue of 12-16 tracks
  while (recIndex < recommendations.length && queue.length < 16) {
    addTrack(recommendations[recIndex++]);
  }

  // If queue still small, add remaining liked tracks
  while (likeIndex < likedTracks.length && queue.length < 16) {
    addTrack(likedTracks[likeIndex++]);
  }

  const initialTrack = queue.length > 0 ? queue[0] : null;
  return { queue, initialTrack };
}

/**
 * Restores saved session from localStorage, or generates a fresh personalized queue if none exists.
 */
export async function getInitialOrRestoredQueue(
  likedTracks: Track[],
  historyTracks: Track[]
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

  // If no saved queue, build fresh personalized mix
  return buildPersonalizedQueue(likedTracks, historyTracks);
}

