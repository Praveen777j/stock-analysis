"""
Financial news acquisition module.
Supports Google News RSS (always available without API keys) and optional NewsAPI.
Ensures point-in-time timestamp preservation, de-duplication, and clean formatting.
"""

import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import datetime
from typing import List, Dict, Any, Optional
import json

from ai_stock_intelligence.config.settings import get_settings
from ai_stock_intelligence.data.cache import SimpleDiskCache


class NewsProvider:
    def __init__(self):
        self.settings = get_settings()
        self.cache = SimpleDiskCache(self.settings.cache_dir)

    def fetch_news(self, ticker: str, company_name: str = "", limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fetches financial news articles for a given ticker and company.
        Tries NewsAPI if API key is configured, falls back to Google News RSS.
        """
        clean_ticker = ticker.strip().upper()
        cache_key = f"news_{clean_ticker}"
        cached = self.cache.get(cache_key, max_age_seconds=1800)
        if cached and isinstance(cached, list) and len(cached) > 0:
            return cached[:limit]

        articles: List[Dict[str, Any]] = []

        # 1. Try NewsAPI if configured
        if self.settings.news_api_key:
            try:
                articles = self._fetch_newsapi(clean_ticker, company_name, limit)
            except Exception:
                articles = []

        # 2. If no articles or NewsAPI absent, use Google News RSS
        if not articles:
            try:
                articles = self._fetch_google_news_rss(clean_ticker, company_name, limit)
            except Exception:
                articles = []

        # 3. If live web fetch fails, do not fabricate synthetic articles
        if not articles:
            articles = []

        # De-duplicate by title
        seen = set()
        deduped = []
        for art in articles:
            title = art.get("headline", "").strip()
            if title and title.lower() not in seen:
                seen.add(title.lower())
                deduped.append(art)

        final_list = deduped[:limit]
        if final_list:
            self.cache.set(cache_key, final_list)

        return final_list

    def _fetch_google_news_rss(self, ticker: str, company_name: str, limit: int) -> List[Dict[str, Any]]:
        query = f"{company_name} {ticker} stock market" if company_name else f"{ticker} stock"
        encoded_query = urllib.parse.quote(query)
        url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"

        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        )

        with urllib.request.urlopen(req, timeout=5) as resp:
            xml_data = resp.read()

        root = ET.fromstring(xml_data)
        items = root.findall(".//item")
        results = []

        for item in items[:limit]:
            title_el = item.find("title")
            link_el = item.find("link")
            pub_el = item.find("pubDate")
            source_el = item.find("source")

            headline = title_el.text if title_el is not None else ""
            source = source_el.text if source_el is not None else "Google News"
            url_str = link_el.text if link_el is not None else ""
            pub_date = pub_el.text if pub_el is not None else datetime.datetime.now().strftime("%a, %d %b %Y %H:%M:%S GMT")

            # Extract source from title if embedded (e.g. "Title - Reuters")
            if " - " in headline and source == "Google News":
                parts = headline.rsplit(" - ", 1)
                headline = parts[0]
                source = parts[1]

            results.append({
                "headline": headline,
                "summary": headline,
                "source": source,
                "url": url_str,
                "published_at": pub_date,
                "ticker": ticker
            })

        return results

    def _fetch_newsapi(self, ticker: str, company_name: str, limit: int) -> List[Dict[str, Any]]:
        q = f"{company_name} OR {ticker}" if company_name else ticker
        params = urllib.parse.urlencode({
            "q": q,
            "apiKey": self.settings.news_api_key,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": limit
        })
        url = f"https://newsapi.org/v2/everything?{params}"
        req = urllib.request.Request(url, headers={"User-Agent": "AIStockIntelligence/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        articles = data.get("articles", [])
        results = []
        for a in articles:
            results.append({
                "headline": a.get("title", ""),
                "summary": a.get("description", "") or a.get("title", ""),
                "source": a.get("source", {}).get("name", "NewsAPI"),
                "url": a.get("url", ""),
                "published_at": a.get("publishedAt", ""),
                "ticker": ticker
            })
        return results

    def _get_fallback_news(self, ticker: str, company_name: str) -> List[Dict[str, Any]]:
        """
        Academic integrity policy: Never fabricate synthetic articles or fake news URLs.
        Returns empty list when external live news sources are unreachable.
        """
        return []


_news_provider: Optional[NewsProvider] = None


def get_news_provider() -> NewsProvider:
    global _news_provider
    if _news_provider is None:
        _news_provider = NewsProvider()
    return _news_provider
