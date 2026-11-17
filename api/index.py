import sys
import os
import urllib.parse
from typing import Any, Dict

# Add backend directory to sys.path so app imports work seamlessly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app as fastapi_app

async def app(scope: Dict[str, Any], receive: Any, send: Any) -> None:
    if scope.get("type") == "http":
        headers = dict(scope.get("headers", []))
        
        # Vercel passes the original matched path in x-matched-path or x-vercel-matched-path
        matched = (
            headers.get(b"x-matched-path")
            or headers.get(b"x-vercel-matched-path")
            or headers.get(b"x-forwarded-uri")
            or headers.get(b"x-original-uri")
        )
        
        if matched:
            matched_str = matched.decode("utf-8", errors="ignore")
            parsed = urllib.parse.urlsplit(matched_str)
            if parsed.path and parsed.path != "/api/index.py":
                scope["path"] = parsed.path
                scope["raw_path"] = parsed.path.encode("utf-8")
                if parsed.query and not scope.get("query_string"):
                    scope["query_string"] = parsed.query.encode("utf-8")
        elif scope.get("path") == "/api/index.py":
            # Direct hit to /api/index.py without matched path header
            scope["path"] = "/api/health"
            scope["raw_path"] = b"/api/health"

    await fastapi_app(scope, receive, send)
