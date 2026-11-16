import asyncio
import logging
import random
from typing import Any, Dict, List, Optional

from app.soundcloud.client import sc_client

logger = logging.getLogger("sonora.mildwave")

FALLBACK_SEEDS = [
    # A few high quality evergreen tracks for fresh starts
    2408461857,
    2427294105,
    1303025956,
    1212669337,
]

TAG_WEIGHTS = {
    "aura": ["ambient", "atmospheric", "dream pop", "chillout", "space", "drone", "meditation", "ethereal"],
    "chill": ["lofi", "chill", "lo-fi", "downtempo", "relax", "hip hop", "beats", "study"],
    "vinyl": ["jazz", "soul", "vintage", "analog", "groove", "warm", "classic", "indie"],
    "energetic": ["synthwave", "retrowave", "electro", "house", "future", "techno", "dance"],
    "discovery": [],
}


class MildWaveEngine:
    async def generate_wave(
        self,
        current_track_id: Optional[int] = None,
        liked_track_ids: Optional[List[int]] = None,
        history_track_ids: Optional[List[int]] = None,
        style_preset: str = "aura",
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Generates an intelligent recommendation queue tailored to the user's vibe."""
        liked_track_ids = liked_track_ids or []
        history_track_ids = history_track_ids or []
        seen_ids = set(history_track_ids)
        if current_track_id:
            seen_ids.add(current_track_id)

        # 1. Determine seeds
        seeds: List[int] = []
        if current_track_id:
            seeds.append(current_track_id)

        # Add up to 2 liked tracks as seeds
        for lid in reversed(liked_track_ids):
            if lid not in seeds:
                seeds.append(lid)
            if len(seeds) >= 3:
                break

        # If not enough seeds, grab from recent history
        if len(seeds) < 3:
            for hid in reversed(history_track_ids):
                if hid not in seeds:
                    seeds.append(hid)
                if len(seeds) >= 3:
                    break

        # If still empty, use fallback evergreen seeds
        if not seeds:
            seeds = random.sample(FALLBACK_SEEDS, min(2, len(FALLBACK_SEEDS)))

        # 2. Query related tracks for all seeds in parallel
        async def fetch_related_safe(seed_id: int):
            try:
                return await sc_client.get_related_tracks(seed_id, limit=15)
            except Exception as e:
                logger.warning("Could not fetch related for seed %s: %s", seed_id, e)
                return []

        tasks = [fetch_related_safe(sid) for sid in seeds]
        results = await asyncio.gather(*tasks)

        # 3. Deduplicate and collect candidate pool
        candidates_map: Dict[int, Dict[str, Any]] = {}
        for track_list in results:
            for track in track_list:
                tid = track.get("id")
                if tid and tid not in seen_ids and tid not in candidates_map:
                    candidates_map[tid] = track

        candidates = list(candidates_map.values())

        # If candidate pool is still low, search based on style keywords
        if len(candidates) < limit:
            fallback_query = style_preset if style_preset in TAG_WEIGHTS else "ambient"
            try:
                search_fallback = await sc_client.search_tracks(fallback_query, limit=15)
                for t in search_fallback:
                    tid = t.get("id")
                    if tid and tid not in seen_ids and tid not in candidates_map:
                        candidates_map[tid] = t
                        candidates.append(t)
            except Exception as e:
                logger.warning("Fallback search failed: %s", e)

        # 4. Score candidates
        target_tags = set(TAG_WEIGHTS.get(style_preset.lower(), []))

        def score_track(track: Dict[str, Any]) -> float:
            score = 1.0
            track_tags = [t.lower() for t in track.get("tags", [])]
            genre = (track.get("genre") or "").lower()
            if genre:
                track_tags.append(genre)

            # Boost tag matching
            for t in track_tags:
                for target in target_tags:
                    if target in t:
                        score += 3.0

            # Reasonable duration preference (2 to 7 minutes)
            duration_sec = (track.get("duration") or 0) / 1000
            if 120 <= duration_sec <= 420:
                score += 1.5

            # Mild popularity boost
            playback = track.get("playback_count") or 0
            if playback > 10000:
                score += 1.0

            # Jitter / variety
            score += random.uniform(0.1, 1.5)
            return score

        candidates.sort(key=score_track, reverse=True)
        return candidates[:limit]


mildwave_engine = MildWaveEngine()

