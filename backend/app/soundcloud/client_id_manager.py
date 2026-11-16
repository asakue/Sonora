import asyncio
import json
import logging
import os
import re
import time
from typing import Optional
import httpx
from bs4 import BeautifulSoup

from app.config import (
    CLIENT_ID_CACHE_FILE,
    SOUNDCLOUD_API_BASE,
    SOUNDCLOUD_WEB_URLS,
    DEFAULT_USER_AGENT,
)

logger = logging.getLogger("sonora.client_id")
logging.basicConfig(level=logging.INFO)

CLIENT_ID_PATTERNS = [
    re.compile(r'client_id[:=]\s*["\']([a-zA-Z0-9]{32})["\']'),
    re.compile(r'clientId"?\s*[:=]\s*["\']([a-zA-Z0-9]{32})["\']'),
    re.compile(r'"client_id":"([a-zA-Z0-9]{32})"'),
    re.compile(r'client_id%3D([a-zA-Z0-9]{32})'),
    re.compile(r'client_id=([a-zA-Z0-9]{32})'),
]


class SoundCloudClientIdManager:
    def __init__(self):
        self._cached_client_id: Optional[str] = None
        self._lock = asyncio.Lock()
        self._load_from_disk()

    def _load_from_disk(self) -> None:
        """Loads cached client_id from disk if valid and exists."""
        if CLIENT_ID_CACHE_FILE.exists():
            try:
                data = json.loads(CLIENT_ID_CACHE_FILE.read_text(encoding="utf-8"))
                client_id = data.get("client_id")
                # Keys usually live for days/weeks. We keep cache unless invalidated.
                if client_id and len(client_id) == 32:
                    self._cached_client_id = client_id
                    logger.info("Loaded SoundCloud client_id from disk cache: %s***", client_id[:6])
            except Exception as e:
                logger.warning("Could not read client_id cache file: %s", e)

    def _save_to_disk(self, client_id: str) -> None:
        """Persists validated client_id to disk."""
        try:
            payload = {
                "client_id": client_id,
                "updated_at": time.time(),
            }
            CLIENT_ID_CACHE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
            logger.info("Saved SoundCloud client_id to disk cache.")
        except Exception as e:
            logger.error("Failed to save client_id to disk: %s", e)

    def invalidate(self) -> None:
        """Clears in-memory and disk cache when 401/403 is encountered."""
        logger.warning("Invalidating cached SoundCloud client_id...")
        self._cached_client_id = None
        if CLIENT_ID_CACHE_FILE.exists():
            try:
                CLIENT_ID_CACHE_FILE.unlink(missing_ok=True)
            except Exception as e:
                logger.warning("Failed to delete client_id cache file: %s", e)

    def _scan_text(self, text: str) -> Optional[str]:
        for pattern in CLIENT_ID_PATTERNS:
            match = pattern.search(text)
            if match:
                candidate = match.group(1)
                if len(candidate) == 32:
                    return candidate
        return None

    async def _validate_client_id(self, client: httpx.AsyncClient, candidate_id: str) -> bool:
        """Checks whether client_id can query the v2 API successfully."""
        try:
            url = f"{SOUNDCLOUD_API_BASE}/search/tracks"
            resp = await client.get(
                url,
                params={"q": "ambient", "limit": 1, "client_id": candidate_id},
                timeout=8.0,
            )
            return resp.status_code == 200
        except Exception as e:
            logger.debug("Validation error for %s: %s", candidate_id, e)
            return False

    async def get_client_id(self, force_refresh: bool = False) -> str:
        """Returns a valid SoundCloud client_id. Scrapes web bundles if necessary."""
        # Check environment variable first
        env_key = os.getenv("SOUNDCLOUD_CLIENT_ID", "").strip()
        if env_key and len(env_key) == 32:
            return env_key

        if not force_refresh and self._cached_client_id:
            return self._cached_client_id

        async with self._lock:
            # Double check inside lock
            if not force_refresh and self._cached_client_id:
                return self._cached_client_id

            logger.info("Fetching new SoundCloud client_id from web bundles...")
            headers = {
                "User-Agent": DEFAULT_USER_AGENT,
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }

            async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=12.0) as http_client:
                # 1. Scrape entry pages
                for page_url in SOUNDCLOUD_WEB_URLS:
                    try:
                        logger.info("Inspecting %s for scripts...", page_url)
                        resp = await http_client.get(page_url)
                        if resp.status_code != 200:
                            continue

                        html = resp.text
                        # Check inline script/text first
                        inline_match = self._scan_text(html)
                        if inline_match and await self._validate_client_id(http_client, inline_match):
                            self._cached_client_id = inline_match
                            self._save_to_disk(inline_match)
                            logger.info("Discovered valid client_id in page HTML: %s***", inline_match[:6])
                            return inline_match

                        # Parse script src tags
                        soup = BeautifulSoup(html, "html.parser")
                        script_urls = []
                        for script in soup.find_all("script"):
                            src = script.get("src")
                            if src and ("sndcdn" in src or "soundcloud" in src or src.endswith(".js")):
                                if src.startswith("//"):
                                    src = "https:" + src
                                elif src.startswith("/"):
                                    src = f"https://soundcloud.com{src}"
                                script_urls.append(src)

                        # Check scripts in reverse order (usually app bundles are at the end)
                        for script_url in reversed(script_urls[-15:]):
                            try:
                                js_resp = await http_client.get(script_url, timeout=8.0)
                                if js_resp.status_code == 200:
                                    found_id = self._scan_text(js_resp.text)
                                    if found_id and await self._validate_client_id(http_client, found_id):
                                        self._cached_client_id = found_id
                                        self._save_to_disk(found_id)
                                        logger.info("Found valid client_id in %s: %s***", script_url.split("/")[-1], found_id[:6])
                                        return found_id
                            except Exception as js_err:
                                logger.debug("Error checking script %s: %s", script_url, js_err)

                    except Exception as page_err:
                        logger.warning("Error fetching %s: %s", page_url, page_err)

            # Fallback check on previously known key if available
            if self._cached_client_id:
                return self._cached_client_id

            raise RuntimeError("Failed to automatically retrieve a valid SoundCloud client_id.")


client_id_manager = SoundCloudClientIdManager()

