import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if os.getenv("VERCEL"):
    DATA_DIR = Path("/tmp/sonora_data")
else:
    DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

CLIENT_ID_CACHE_FILE = DATA_DIR / "soundcloud_client_id.json"

SOUNDCLOUD_API_BASE = "https://api-v2.soundcloud.com"
SOUNDCLOUD_WEB_URLS = [
    "https://soundcloud.com/discover",
    "https://soundcloud.com/",
    "https://m.soundcloud.com/"
]

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
)

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

