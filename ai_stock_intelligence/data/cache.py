"""
Caching layer for market data, news items, and compute-heavy artifacts.
"""

import os
import json
import time
from typing import Any, Optional, Dict


class SimpleDiskCache:
    """Local JSON / file disk cache with TTL (Time To Live)."""
    def __init__(self, cache_dir: str):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)

    def _get_path(self, key: str) -> str:
        safe_key = "".join(c if c.isalnum() or c in ("-", "_", ".") else "_" for c in key)
        return os.path.join(self.cache_dir, f"{safe_key}.json")

    def get(self, key: str, max_age_seconds: int = 3600) -> Optional[Any]:
        path = self._get_path(key)
        if not os.path.exists(path):
            return None
        try:
            mtime = os.path.getmtime(path)
            if time.time() - mtime > max_age_seconds:
                return None
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("payload")
        except Exception:
            return None

    def set(self, key: str, value: Any):
        path = self._get_path(key)
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump({"payload": value, "timestamp": time.time()}, f)
        except Exception:
            pass

    def clear(self):
        try:
            for f in os.listdir(self.cache_dir):
                if f.endswith(".json"):
                    os.remove(os.path.join(self.cache_dir, f))
        except Exception:
            pass
