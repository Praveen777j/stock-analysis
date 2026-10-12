"""
Official Reddit OAuth API integration.
Implements secure OAuth token generation, targeted subreddit querying, and post aggregation.
Gracefully handles missing credentials, rate limits, and authentication errors without crashing.
"""

import base64
import urllib.request
import urllib.parse
import json
import time
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum

from ai_stock_intelligence.config.settings import get_settings


class RedditStatus(str, Enum):
    AUTH_REQUIRED = "AUTH_REQUIRED"
    RATE_LIMITED = "RATE_LIMITED"
    FORBIDDEN = "FORBIDDEN"
    TIMEOUT = "TIMEOUT"
    UNAVAILABLE = "UNAVAILABLE"
    ERROR = "ERROR"
    EMPTY = "EMPTY"
    SUCCESS = "SUCCESS"


class RedditClient:
    def __init__(self):
        self.settings = get_settings()
        self._token: Optional[str] = None
        self._token_expiry: float = 0.0

    def is_configured(self) -> bool:
        return bool(self.settings.reddit_client_id and self.settings.reddit_client_secret)

    def reddit_token(self) -> Tuple[RedditStatus, Optional[str]]:
        """Generates or reuses official Reddit OAuth bearer token."""
        if not self.is_configured():
            return RedditStatus.AUTH_REQUIRED, None

        if self._token and time.time() < self._token_expiry:
            return RedditStatus.SUCCESS, self._token

        url = "https://www.reddit.com/api/v1/access_token"
        auth_str = f"{self.settings.reddit_client_id}:{self.settings.reddit_client_secret}"
        encoded_auth = base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

        data = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode("utf-8")
        headers = {
            "Authorization": f"Basic {encoded_auth}",
            "User-Agent": self.settings.reddit_user_agent,
            "Content-Type": "application/x-www-form-urlencoded"
        }

        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    payload = json.loads(resp.read().decode("utf-8"))
                    self._token = payload.get("access_token")
                    expires_in = payload.get("expires_in", 3600)
                    self._token_expiry = time.time() + expires_in - 60
                    return RedditStatus.SUCCESS, self._token
                elif resp.status == 429:
                    return RedditStatus.RATE_LIMITED, None
                elif resp.status in (401, 403):
                    return RedditStatus.FORBIDDEN, None
                else:
                    return RedditStatus.ERROR, None
        except urllib.error.HTTPError as e:
            if e.code == 429:
                return RedditStatus.RATE_LIMITED, None
            elif e.code in (401, 403):
                return RedditStatus.FORBIDDEN, None
            return RedditStatus.ERROR, None
        except urllib.error.URLError:
            return RedditStatus.TIMEOUT, None
        except Exception:
            return RedditStatus.UNAVAILABLE, None

    def reddit_subs_for(self, ticker: str, exchange: str = "") -> List[str]:
        """Maps asset domain to relevant financial subreddits."""
        clean_ticker = ticker.upper()
        if ".NS" in clean_ticker or ".BO" in clean_ticker or exchange.upper() in ("NSE", "BSE"):
            return ["IndianStreetBets", "IndiaInvestments", "DalalStreetTalks"]
        else:
            return ["stocks", "investing", "wallstreetbets", "StockMarket"]

    def reddit_query(self, ticker: str, company_name: str = "") -> str:
        """Constructs search query for Reddit."""
        clean = ticker.replace(".NS", "").replace(".BO", "")
        if company_name and len(company_name.split()) > 1:
            first_word = company_name.split()[0]
            return f"({clean} OR {first_word})"
        return clean

    def fetch_reddit_sub(self, sub: str, query: str, token: str, limit: int = 10) -> Tuple[RedditStatus, List[Dict[str, Any]]]:
        """Fetches top matching posts from a specific subreddit using OAuth bearer token."""
        url = f"https://oauth.reddit.com/r/{sub}/search?q={urllib.parse.quote(query)}&restrict_sr=1&sort=relevance&t=month&limit={limit}"
        headers = {
            "Authorization": f"Bearer {token}",
            "User-Agent": self.settings.reddit_user_agent
        }

        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    payload = json.loads(resp.read().decode("utf-8"))
                    posts_data = payload.get("data", {}).get("children", [])
                    results = []
                    for p in posts_data:
                        d = p.get("data", {})
                        results.append({
                            "title": d.get("title", ""),
                            "subreddit": sub,
                            "score": d.get("score", 0),
                            "num_comments": d.get("num_comments", 0),
                            "created_utc": d.get("created_utc", time.time()),
                            "url": f"https://reddit.com{d.get('permalink', '')}"
                        })
                    return RedditStatus.SUCCESS, results
                elif resp.status == 429:
                    return RedditStatus.RATE_LIMITED, []
                elif resp.status in (401, 403):
                    return RedditStatus.FORBIDDEN, []
                else:
                    return RedditStatus.ERROR, []
        except Exception:
            return RedditStatus.UNAVAILABLE, []

    def aggregate_reddit(self, ticker: str, company_name: str = "", exchange: str = "", limit: int = 15) -> Dict[str, Any]:
        """
        Orchestrates full Reddit aggregation across subreddits.
        Returns status, message, and list of posts.
        """
        if not self.is_configured():
            return {
                "status": RedditStatus.AUTH_REQUIRED.value,
                "message": "Reddit credentials not configured. Configure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in .env to enable live Reddit community tracking.",
                "post_count": 0,
                "posts": []
            }

        status, token = self.reddit_token()
        if status != RedditStatus.SUCCESS or not token:
            return {
                "status": status.value,
                "message": f"Reddit API unavailable: {status.value}.",
                "post_count": 0,
                "posts": []
            }

        subs = self.reddit_subs_for(ticker, exchange)
        query = self.reddit_query(ticker, company_name)
        all_posts: List[Dict[str, Any]] = []

        for sub in subs:
            sub_status, posts = self.fetch_reddit_sub(sub, query, token, limit=limit // len(subs) + 2)
            if sub_status == RedditStatus.SUCCESS and posts:
                all_posts.extend(posts)

        if not all_posts:
            return {
                "status": RedditStatus.EMPTY.value,
                "message": f"No recent discussions found for {ticker}.",
                "post_count": 0,
                "posts": []
            }

        # Sort by score descending
        all_posts.sort(key=lambda x: x["score"], reverse=True)

        return {
            "status": RedditStatus.SUCCESS.value,
            "message": f"Successfully retrieved {len(all_posts)} posts from Reddit.",
            "post_count": len(all_posts),
            "posts": all_posts[:limit]
        }


_reddit_client: Optional[RedditClient] = None


def get_reddit_client() -> RedditClient:
    global _reddit_client
    if _reddit_client is None:
        _reddit_client = RedditClient()
    return _reddit_client
