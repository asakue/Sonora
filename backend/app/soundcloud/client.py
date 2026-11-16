import logging
from typing import Any, Dict, List, Optional
import httpx

from app.config import DEFAULT_USER_AGENT, SOUNDCLOUD_API_BASE
from app.soundcloud.client_id_manager import client_id_manager

logger = logging.getLogger("sonora.sc_client")


class SoundCloudClient:
    def __init__(self):
        self.base_url = SOUNDCLOUD_API_BASE

    def _format_artwork(self, url: Optional[str]) -> Optional[str]:
        if not url:
            return None
        return url.replace("-large", "-t500x500")

    def _normalize_track(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Converts raw SoundCloud JSON track data into a clean Sonora track object."""
        user = raw.get("user") or {}
        artwork = self._format_artwork(raw.get("artwork_url") or user.get("avatar_url"))
        duration = raw.get("full_duration") or raw.get("duration") or 0

        # Extract tags
        raw_tags = raw.get("tag_list", "")
        # Tags can be space separated or quote enclosed
        tags = []
        if raw_tags:
            import re
            tags = [t.strip().strip('"') for t in re.findall(r'(?:[^\s"]+|"[^"]*")+|(?:\S+)', raw_tags) if t.strip()]

        genre = raw.get("genre") or ""
        if genre and genre not in tags:
            tags.insert(0, genre)

        return {
            "id": raw.get("id"),
            "title": raw.get("title", "Untitled Track"),
            "artist": user.get("username", "Unknown Artist"),
            "artist_avatar": user.get("avatar_url"),
            "artwork_url": artwork,
            "duration": duration,
            "genre": genre,
            "tags": tags[:5],
            "permalink_url": raw.get("permalink_url", ""),
            "playback_count": raw.get("playback_count", 0),
            "likes_count": raw.get("likes_count", 0),
            "streamable": raw.get("streamable", True),
        }

    async def _request(self, path: str, params: Optional[Dict[str, Any]] = None, retry: bool = True) -> Any:
        client_id = await client_id_manager.get_client_id()
        req_params = dict(params or {})
        req_params["client_id"] = client_id

        headers = {
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "application/json, text/javascript, */*; q=0.01",
        }

        url = f"{self.base_url}{path}" if path.startswith("/") else f"{self.base_url}/{path}"

        async with httpx.AsyncClient(headers=headers, timeout=12.0) as client:
            resp = await client.get(url, params=req_params)

            if resp.status_code in (401, 403) and retry:
                logger.warning("SoundCloud API returned %s. Refreshing client_id...", resp.status_code)
                client_id_manager.invalidate()
                new_client_id = await client_id_manager.get_client_id(force_refresh=True)
                req_params["client_id"] = new_client_id
                resp = await client.get(url, params=req_params)

            if resp.status_code != 200:
                logger.error("SoundCloud API error [%s] for %s: %s", resp.status_code, url, resp.text[:200])
                resp.raise_for_status()

            return resp.json()

    async def search_tracks(self, query: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Searches tracks by keyword or phrase."""
        data = await self._request(
            "/search/tracks",
            params={"q": query, "limit": limit, "offset": offset},
        )
        collection = data.get("collection") or []
        tracks = []
        for item in collection:
            # Filter non-streamable or empty tracks
            if item.get("id") and item.get("streamable") is not False:
                tracks.append(self._normalize_track(item))
        return tracks

    async def get_track(self, track_id: int) -> Dict[str, Any]:
        """Fetches detailed track metadata."""
        data = await self._request(f"/tracks/{track_id}")
        return self._normalize_track(data)

    async def get_raw_track(self, track_id: int) -> Dict[str, Any]:
        """Fetches raw track metadata including media.transcodings."""
        return await self._request(f"/tracks/{track_id}")

    async def get_related_tracks(self, track_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """Fetches related tracks for recommendations."""
        data = await self._request(
            f"/tracks/{track_id}/related",
            params={"limit": limit},
        )
        collection = data.get("collection") or []
        return [self._normalize_track(t) for t in collection if t.get("id") and t.get("streamable") is not False]

    async def resolve_stream_url(self, track_id: int) -> str:
        """Resolves the direct playable CDN URL for the track."""
        raw_track = await self.get_raw_track(track_id)
        media = raw_track.get("media") or {}
        transcodings = media.get("transcodings") or []

        if not transcodings:
            raise ValueError(f"No stream transcodings available for track {track_id}")

        # Priority: progressive MP3 > progressive any > hls MP3 > hls any
        selected = None
        for t in transcodings:
            protocol = (t.get("format") or {}).get("protocol")
            mime = (t.get("format") or {}).get("mime_type", "")
            if protocol == "progressive" and "audio/mpeg" in mime:
                selected = t
                break

        if not selected:
            for t in transcodings:
                if (t.get("format") or {}).get("protocol") == "progressive":
                    selected = t
                    break

        if not selected and transcodings:
            selected = transcodings[0]

        transcoding_url = selected.get("url")
        if not transcoding_url:
            raise ValueError(f"Selected transcoding has no url for track {track_id}")

        client_id = await client_id_manager.get_client_id()
        params: Dict[str, str] = {"client_id": client_id}

        track_auth = raw_track.get("track_authorization")
        if track_auth:
            params["track_authorization"] = track_auth

        headers = {"User-Agent": DEFAULT_USER_AGENT}
        async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:
            resp = await client.get(transcoding_url, params=params)
            if resp.status_code != 200:
                logger.error("Failed to resolve transcoding URL [%s]: %s", resp.status_code, resp.text)
                resp.raise_for_status()

            stream_data = resp.json()
            cdn_url = stream_data.get("url")
            if not cdn_url:
                raise ValueError("SoundCloud did not return a stream URL")
            return cdn_url


sc_client = SoundCloudClient()

