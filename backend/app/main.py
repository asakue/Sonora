import logging
import urllib.parse
from typing import Any, Dict, List, Optional
import httpx
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse
from pydantic import BaseModel

from app.config import CORS_ORIGINS
from app.soundcloud.client import sc_client
from app.soundcloud.client_id_manager import client_id_manager
from app.soundcloud.stream_proxy import stream_proxy
from app.services.mildwave import mildwave_engine

logger = logging.getLogger("sonora.main")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Sonora Audio API",
    description="SoundCloud v2 streaming proxy & MildWave recommendation engine",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Content-Length", "Accept-Ranges"],
)


class MildWaveRequest(BaseModel):
    current_track_id: Optional[int] = None
    liked_track_ids: Optional[List[int]] = None
    history_track_ids: Optional[List[int]] = None
    style_preset: Optional[str] = "aura"
    limit: Optional[int] = 20


@app.get("/api/health")
async def health_check():
    client_id = await client_id_manager.get_client_id()
    return {
        "status": "healthy",
        "service": "Sonora API",
        "client_id_active": bool(client_id),
        "client_id_preview": f"{client_id[:6]}***" if client_id else None,
    }


@app.post("/api/client-id/refresh")
async def force_refresh_client_id():
    client_id_manager.invalidate()
    new_id = await client_id_manager.get_client_id(force_refresh=True)
    return {"status": "refreshed", "client_id_preview": f"{new_id[:6]}***"}


@app.get("/api/search")
async def search_tracks(
    q: str = Query(..., description="Query search term"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    try:
        tracks = await sc_client.search_tracks(query=q, limit=limit, offset=offset)
        return {"query": q, "count": len(tracks), "tracks": tracks}
    except Exception as e:
        logger.error("Search error: %s", e)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/api/tracks/{track_id}")
async def get_track_info(track_id: int):
    try:
        track = await sc_client.get_track(track_id)
        return track
    except Exception as e:
        logger.error("Track info error for %s: %s", track_id, e)
        raise HTTPException(status_code=404, detail="Track not found")


@app.get("/api/tracks/{track_id}/related")
async def get_related_tracks(track_id: int, limit: int = Query(15, ge=1, le=30)):
    try:
        tracks = await sc_client.get_related_tracks(track_id, limit=limit)
        return {"track_id": track_id, "tracks": tracks}
    except Exception as e:
        logger.error("Related tracks error for %s: %s", track_id, e)
        raise HTTPException(status_code=500, detail="Failed to fetch related tracks")


@app.get("/api/stream/{track_id}/info")
async def get_stream_info(track_id: int, request: Request):
    """Inspects track transcodings and returns the appropriate stream proxy URL."""
    try:
        raw_track = await sc_client.get_raw_track(track_id)
        transcodings = (raw_track.get("media") or {}).get("transcodings") or []

        if not transcodings:
            raise HTTPException(status_code=404, detail="No media transcodings for this track")

        # Check if progressive stream is available
        has_progressive = any(
            (t.get("format") or {}).get("protocol") == "progressive"
            for t in transcodings
        )

        base_url = str(request.base_url).rstrip("/")
        if has_progressive:
            return {
                "track_id": track_id,
                "protocol": "progressive",
                "stream_url": f"{base_url}/api/stream/{track_id}/raw",
            }
        else:
            return {
                "track_id": track_id,
                "protocol": "hls",
                "stream_url": f"{base_url}/api/stream/{track_id}/playlist.m3u8",
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Stream info error for %s: %s", track_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to determine stream: {str(e)}")


@app.get("/api/stream/{track_id}/raw")
async def stream_raw(track_id: int, request: Request):
    """Streams progressive audio file from upstream CDN with Range header support."""
    try:
        cdn_url = await sc_client.resolve_stream_url(track_id)
        range_header = request.headers.get("Range")
        headers = {}
        if range_header:
            headers["Range"] = range_header

        stream_gen, status_code, resp_headers = await stream_proxy.get_stream_generator(cdn_url, headers)
        return StreamingResponse(stream_gen, status_code=status_code, headers=resp_headers)
    except Exception as e:
        logger.error("Stream raw error for %s: %s", track_id, e)
        raise HTTPException(status_code=502, detail=f"Audio stream error: {str(e)}")


@app.get("/api/stream/{track_id}/playlist.m3u8")
async def stream_hls_playlist(track_id: int, request: Request):
    """Fetches upstream m3u8 playlist and returns rewritten proxy URIs."""
    try:
        cdn_url = await sc_client.resolve_stream_url(track_id)
        base_url = str(request.base_url).rstrip("/")
        rewritten_m3u8 = await stream_proxy.rewrite_m3u8(cdn_url, base_url)
        return PlainTextResponse(
            rewritten_m3u8,
            headers={
                "Content-Type": "application/vnd.apple.mpegurl",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except Exception as e:
        logger.error("HLS playlist error for %s: %s", track_id, e)
        raise HTTPException(status_code=502, detail=f"HLS playlist error: {str(e)}")


@app.get("/api/stream/chunk")
async def stream_chunk(url: str = Query(...), request: Request = None):
    """Proxies a single audio segment/init chunk from SoundCloud CloudFront CDN."""
    try:
        decoded_url = urllib.parse.unquote(url)
        range_header = request.headers.get("Range") if request else None
        headers = {}
        if range_header:
            headers["Range"] = range_header

        stream_gen, status_code, resp_headers = await stream_proxy.get_stream_generator(decoded_url, headers)
        return StreamingResponse(stream_gen, status_code=status_code, headers=resp_headers)
    except Exception as e:
        logger.error("Error proxying chunk: %s", e)
        raise HTTPException(status_code=502, detail=f"Chunk proxy error: {str(e)}")


@app.get("/api/proxy/image")
async def proxy_image(url: str = Query(...)):
    """Proxies artwork image with full CORS headers so frontend canvas can extract color palette without browser taint."""
    decoded_url = urllib.parse.unquote(url)
    if not (decoded_url.startswith("https://") or decoded_url.startswith("http://")):
        raise HTTPException(status_code=400, detail="Invalid image URL")
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(
                decoded_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Failed to fetch image from CDN")
            content_type = resp.headers.get("content-type", "image/jpeg")
            return Response(
                content=resp.content,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=86400, immutable",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                },
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Error proxying image %s: %s", decoded_url, e)
        raise HTTPException(status_code=502, detail=f"Image proxy error: {str(e)}")


@app.post("/api/mildwave/recommend")
async def generate_mildwave(body: MildWaveRequest):
    try:
        tracks = await mildwave_engine.generate_wave(
            current_track_id=body.current_track_id,
            liked_track_ids=body.liked_track_ids,
            history_track_ids=body.history_track_ids,
            style_preset=body.style_preset or "aura",
            limit=body.limit or 20,
        )
        return {
            "style_preset": body.style_preset,
            "count": len(tracks),
            "tracks": tracks,
        }
    except Exception as e:
        logger.error("MildWave recommendation error: %s", e)
        raise HTTPException(status_code=500, detail=f"MildWave generation error: {str(e)}")

