import asyncio
import sys
from starlette.testclient import TestClient
from app.main import app

def test_full_sonora_system():
    print("=== Sonora Full System Automated Verification ===")
    client = TestClient(app)

    # 1. Health check
    print("\n1. Testing /api/health...")
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health check failed: {r.status_code}"
    data = r.json()
    print("   [OK] Health:", data)
    assert data["client_id_active"] is True, "client_id is not active"

    # 2. Search
    print("\n2. Testing /api/search with query 'lofi'...")
    r = client.get("/api/search?q=lofi&limit=4")
    assert r.status_code == 200, f"Search failed: {r.status_code}"
    search_data = r.json()
    tracks = search_data.get("tracks", [])
    print(f"   [OK] Found {len(tracks)} tracks")
    assert len(tracks) > 0, "No tracks returned from SoundCloud search"

    sample_track = tracks[0]
    track_id = sample_track["id"]
    print(f"   Selected sample track: ID={track_id}, Title='{sample_track['title']}', Artist='{sample_track['artist']}'")

    # 3. Track Details
    print(f"\n3. Testing /api/tracks/{track_id}...")
    r = client.get(f"/api/tracks/{track_id}")
    assert r.status_code == 200, f"Track detail failed: {r.status_code}"
    t_info = r.json()
    print("   [OK] Duration:", t_info.get("duration"), "ms, Tags:", t_info.get("tags"))

    # 4. Stream Info
    print(f"\n4. Testing /api/stream/{track_id}/info...")
    r = client.get(f"/api/stream/{track_id}/info")
    assert r.status_code == 200, f"Stream info failed: {r.status_code}"
    s_info = r.json()
    print("   [OK] Protocol:", s_info.get("protocol"), "Stream URL:", s_info.get("stream_url"))

    # 5. Stream Audio / Playlist
    print("\n5. Testing audio stream endpoint...")
    if s_info.get("protocol") == "hls":
        # Test HLS playlist
        r = client.get(f"/api/stream/{track_id}/playlist.m3u8")
        assert r.status_code == 200, f"HLS playlist failed: {r.status_code}"
        assert "#EXTM3U" in r.text, "Invalid m3u8 playlist format"
        assert "/api/stream/chunk?url=" in r.text, "Proxy URL rewriting missing in m3u8"
        print("   [OK] HLS playlist successfully fetched & rewritten with proxy URIs!")
    else:
        # Test progressive stream with Range
        r = client.get(f"/api/stream/{track_id}/raw", headers={"Range": "bytes=0-1024"})
        assert r.status_code in (200, 206), f"Stream failed: {r.status_code}"
        print(f"   [OK] Progressive stream received ({r.status_code}), content length: {len(r.content)}")

    # 6. MildWave Recommendation
    print("\n6. Testing /api/mildwave/recommend...")
    r = client.post(
        "/api/mildwave/recommend",
        json={
            "current_track_id": track_id,
            "style_preset": "aura",
            "limit": 5,
        },
    )
    assert r.status_code == 200, f"MildWave failed: {r.status_code}"
    wave_data = r.json()
    wave_tracks = wave_data.get("tracks", [])
    print(f"   [OK] MildWave generated {len(wave_tracks)} personalized tracks!")
    for idx, wt in enumerate(wave_tracks[:3], 1):
        print(f"      {idx}. {wt['title']} by {wt['artist']} ({wt['id']})")

    print("\n=== ALL AUTOMATED TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    try:
        test_full_sonora_system()
    except Exception as e:
        print(f"\n[FAIL] Test failed with error: {e}", file=sys.stderr)
        sys.exit(1)

