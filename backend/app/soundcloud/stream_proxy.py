import logging
import re
import urllib.parse
from typing import AsyncGenerator, Optional, Tuple
import httpx
from fastapi import HTTPException
from fastapi.responses import Response, StreamingResponse

from app.config import DEFAULT_USER_AGENT

logger = logging.getLogger("sonora.stream_proxy")

URI_REGEX = re.compile(r'URI="([^"]+)"')


class StreamProxyService:
    @staticmethod
    async def get_stream_generator(
        url: str, headers: dict
    ) -> Tuple[AsyncGenerator[bytes, None], int, dict]:
        """Streams raw audio chunks from upstream with Range header forwarding."""
        client = httpx.AsyncClient(timeout=30.0, follow_redirects=True)
        try:
            req = client.build_request("GET", url, headers=headers)
            resp = await client.send(req, stream=True)

            status_code = resp.status_code
            resp_headers = {
                "Content-Type": resp.headers.get("content-type", "audio/mpeg"),
                "Accept-Ranges": "bytes",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Range, Accept, Origin",
                "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
            }

            if "content-length" in resp.headers:
                resp_headers["Content-Length"] = resp.headers["content-length"]
            if "content-range" in resp.headers:
                resp_headers["Content-Range"] = resp.headers["content-range"]

            async def body_stream() -> AsyncGenerator[bytes, None]:
                try:
                    async for chunk in resp.aiter_bytes(chunk_size=65536):
                        yield chunk
                finally:
                    await resp.aclose()
                    await client.aclose()

            return body_stream(), status_code, resp_headers
        except Exception as e:
            await client.aclose()
            logger.error("Error creating stream generator for %s: %s", url[:50], e)
            raise HTTPException(status_code=502, detail=f"Streaming error: {str(e)}")

    @staticmethod
    async def rewrite_m3u8(cdn_m3u8_url: str, base_proxy_url: str) -> str:
        """Fetches upstream m3u8 and rewrites all segment/MAP URLs through the proxy."""
        headers = {
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "*/*",
        }
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(cdn_m3u8_url, headers=headers)
            if resp.status_code != 200:
                logger.error("Failed to fetch m3u8 playlist: %s", resp.status_code)
                raise HTTPException(status_code=resp.status_code, detail="Failed to fetch m3u8 playlist from SoundCloud")

            raw_playlist = resp.text

        # Rewrite URLs in playlist
        def make_chunk_proxy_url(target_url: str) -> str:
            # If target_url is relative, resolve with cdn_m3u8_url
            resolved = urllib.parse.urljoin(cdn_m3u8_url, target_url)
            encoded = urllib.parse.quote(resolved, safe="")
            return f"{base_proxy_url}/api/stream/chunk?url={encoded}"

        rewritten_lines = []
        for line in raw_playlist.splitlines():
            trimmed = line.strip()
            if not trimmed:
                rewritten_lines.append(line)
                continue

            if trimmed.startswith("#EXT-X-MAP:"):
                # Rewrite URI in init tag: #EXT-X-MAP:URI="https://..."
                def replace_uri(match):
                    original_uri = match.group(1)
                    return f'URI="{make_chunk_proxy_url(original_uri)}"'

                new_line = URI_REGEX.sub(replace_uri, line)
                rewritten_lines.append(new_line)
            elif not trimmed.startswith("#"):
                # This is a segment URL
                rewritten_lines.append(make_chunk_proxy_url(trimmed))
            else:
                rewritten_lines.append(line)

        return "\n".join(rewritten_lines)


stream_proxy = StreamProxyService()

