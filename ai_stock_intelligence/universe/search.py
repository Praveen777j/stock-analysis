"""
High-performance local search engine for stock tickers and company names.
Supports fast prefix indexing, fuzzy matching, and multi-field scoring.
"""

from typing import List, Dict, Any, Optional
from .manager import get_universe_manager, StockSecurity


def search_universe(query: str, exchange: Optional[str] = None, country: Optional[str] = None, limit: int = 25) -> List[Dict[str, Any]]:
    """
    Searches the stock universe by query string with optional exchange and country filters.
    Returns list of matching security dictionaries.
    """
    mgr = get_universe_manager()
    results = mgr.search(query, limit=limit * 2)

    filtered = []
    target_ex = exchange.upper() if exchange and exchange != "ALL" else None
    target_co = country.lower() if country and country != "ALL" else None

    for sec in results:
        if target_ex and sec.exchange != target_ex:
            continue
        if target_co and sec.country.lower() != target_co:
            continue
        filtered.append(sec.to_dict())
        if len(filtered) >= limit:
            break

    return filtered


def get_popular_securities(exchange: Optional[str] = None, country: Optional[str] = None, limit: int = 15) -> List[Dict[str, Any]]:
    """Returns curated popular benchmark securities for quick selection."""
    top_tickers = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "TATAMOTORS.NS", "SBIN.NS",
        "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "TSLA", "META", "BRK-B", "JPM"
    ]
    mgr = get_universe_manager()
    res = []
    for t in top_tickers:
        sec = mgr.get_security(t)
        if sec:
            if exchange and exchange != "ALL" and sec.exchange != exchange.upper():
                continue
            if country and country != "ALL" and sec.country.lower() != country.lower():
                continue
            res.append(sec.to_dict())
            if len(res) >= limit:
                break
    return res
