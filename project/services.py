"""
Market data and news retrieval services with caching and offline fallbacks.
"""

from typing import Dict, Any, List, Optional
import datetime
import numpy as np
import pandas as pd


POPULAR_TICKERS = {
    "RELIANCE.NS": "Reliance Industries Ltd",
    "TCS.NS": "Tata Consultancy Services Ltd",
    "INFY.NS": "Infosys Ltd",
    "HDFCBANK.NS": "HDFC Bank Ltd",
    "ICICIBANK.NS": "ICICI Bank Ltd",
    "TATAMOTORS.NS": "Tata Motors Ltd",
    "SBIN.NS": "State Bank of India",
    "AAPL": "Apple Inc.",
    "MSFT": "Microsoft Corporation",
    "NVDA": "NVIDIA Corporation",
    "TSLA": "Tesla Inc.",
    "GOOGL": "Alphabet Inc."
}

# In-memory session cache for speed
_PRICE_CACHE: Dict[str, pd.DataFrame] = {}
_QUOTE_CACHE: Dict[str, Dict[str, Any]] = {}
_NEWS_CACHE: Dict[str, List[Dict[str, Any]]] = {}


def fetch_historical_prices(ticker: str, period: str = "2y") -> pd.DataFrame:
    """
    Retrieves historical OHLCV data for ticker from yfinance or offline synthetic fallback.
    Supported periods: '1mo', '3mo', '6mo', '1y', '2y', '3y', '5y', 'max'.
    """
    clean_ticker = ticker.strip().upper()
    cache_key = f"{clean_ticker}_{period}"
    if cache_key in _PRICE_CACHE:
        return _PRICE_CACHE[cache_key].copy()

    df = None
    try:
        import yfinance as yf
        t = yf.Ticker(clean_ticker)
        raw = t.history(period=period, auto_adjust=True)
        if raw is not None and not raw.empty and len(raw) >= 30:
            df = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
            df.index = pd.to_datetime(df.index)
            # Remove timezone if present for uniform manipulation
            if df.index.tz is not None:
                df.index = df.index.tz_localize(None)
    except Exception:
        df = None

    if df is None or len(df) < 30:
        # Academic integrity: Do not generate fake OHLC candles when live market data is unavailable
        return pd.DataFrame()

    _PRICE_CACHE[cache_key] = df
    return df.copy()


def get_latest_quote(ticker: str, df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """
    Returns current price, change, change_pct, 52w_high, 52w_low, volume, currency.
    """
    clean_ticker = ticker.strip().upper()
    if clean_ticker in _QUOTE_CACHE and df is None:
        return _QUOTE_CACHE[clean_ticker]

    if df is None:
        df = fetch_historical_prices(clean_ticker, period="1y")

    if df.empty:
        return {
            "ticker": clean_ticker,
            "company_name": POPULAR_TICKERS.get(clean_ticker, clean_ticker),
            "price": 0.0,
            "change": 0.0,
            "change_pct": 0.0,
            "high_52w": 0.0,
            "low_52w": 0.0,
            "volume": 0,
            "currency": "INR" if ".NS" in clean_ticker or ".BO" in clean_ticker else "USD"
        }

    latest = df.iloc[-1]
    prev = df.iloc[-2] if len(df) > 1 else latest

    price = float(latest["Close"])
    prev_close = float(prev["Close"])
    change = price - prev_close
    change_pct = (change / prev_close) * 100 if prev_close > 0 else 0.0

    # Past 252 trading days (~1 calendar year) for 52-week metrics
    past_year = df.tail(252)
    high_52w = float(past_year["High"].max())
    low_52w = float(past_year["Low"].min())
    volume = int(latest["Volume"])
    currency = "INR" if ".NS" in clean_ticker or ".BO" in clean_ticker else "USD"

    res = {
        "ticker": clean_ticker,
        "company_name": POPULAR_TICKERS.get(clean_ticker, clean_ticker),
        "price": round(price, 2),
        "change": round(change, 2),
        "change_pct": round(change_pct, 2),
        "high_52w": round(high_52w, 2),
        "low_52w": round(low_52w, 2),
        "volume": volume,
        "currency": currency
    }

    _QUOTE_CACHE[clean_ticker] = res
    return res


def fetch_news_articles(ticker: str) -> List[Dict[str, Any]]:
    """
    Retrieves recent financial headlines for the ticker.
    """
    clean_ticker = ticker.strip().upper()
    if clean_ticker in _NEWS_CACHE:
        return _NEWS_CACHE[clean_ticker]

    articles = []
    try:
        import yfinance as yf
        t = yf.Ticker(clean_ticker)
        yf_news = getattr(t, "news", [])
        if yf_news and isinstance(yf_news, list):
            for item in yf_news[:6]:
                title = item.get("title")
                if title:
                    articles.append({
                        "title": title,
                        "publisher": item.get("publisher", "Financial Press"),
                        "date": datetime.datetime.fromtimestamp(item.get("providerPublishTime", datetime.datetime.now().timestamp())).strftime("%b %d, %Y"),
                        "summary": item.get("summary", "")
                    })
    except Exception:
        pass

    if not articles:
        # Academic integrity: Do not generate fabricated news when real news is unavailable
        articles = []

    _NEWS_CACHE[clean_ticker] = articles
    return articles


def generate_fallback_news(ticker: str) -> List[Dict[str, Any]]:
    """Academic integrity: Never fabricate synthetic articles or fake sources."""
    return []


def generate_offline_market_data(ticker: str, period: str) -> pd.DataFrame:
    """
    Academic integrity policy: Never generate synthetic/random OHLCV candles.
    Disabled permanently to prevent accidental substitution of fake prices.
    """
    return pd.DataFrame()
