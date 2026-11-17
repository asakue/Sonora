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
        
        # 1. Check query string for explicit __path passed by Vercel rewrite
        qs = scope.get("query_string", b"").decode("utf-8", errors="ignore")
        params = urllib.parse.parse_qs(qs) if qs else {}
        
        target_path = None
        if "__path" in params and params["__path"]:
            target_path = params["__path"][0]
            # Strip __path from query string so FastAPI doesn't see it as an unexpected parameter
            remaining = [(k, v) for k, vs in params.items() if k != "__path" for v in vs]
            scope["query_string"] = urllib.parse.urlencode(remaining).encode("utf-8")
        
        # 2. Check Vercel headers for original path
        if not target_path:
            matched = (
                headers.get(b"x-vercel-matched-path")
                or headers.get(b"x-forwarded-uri")
                or headers.get(b"x-original-uri")
            )
            if matched:
                matched_str = matched.decode("utf-8", errors="ignore")
                parsed = urllib.parse.urlsplit(matched_str)
                if parsed.path and parsed.path != "/api/index.py":
                    target_path = parsed.path
                    if parsed.query and not scope.get("query_string"):
                        scope["query_string"] = parsed.query.encode("utf-8")

        if target_path:
            scope["path"] = target_path
            scope["raw_path"] = target_path.encode("utf-8")
        elif scope.get("path") == "/api/index.py":
            scope["path"] = "/api/health"
            scope["raw_path"] = b"/api/health"

    await fastapi_app(scope, receive, send)
