"""
Market data acquisition module using yfinance with caching, validation, and offline fallbacks.
Supports full OHLCV series for Indian (NSE) and US (NASDAQ, NYSE) stocks.
"""

import datetime
from typing import Optional, Dict, Any, List
import pandas as pd
import numpy as np

from ai_stock_intelligence.config.settings import get_settings
from ai_stock_intelligence.data.cache import SimpleDiskCache
from ai_stock_intelligence.data.validation import validate_market_dataframe


class MarketDataProvider:
    def __init__(self):
        self.settings = get_settings()
        self.cache = SimpleDiskCache(self.settings.cache_dir)

    def fetch_history(self, ticker: str, period: str = "2y", use_cache: bool = True) -> pd.DataFrame:
        """
        Retrieves historical OHLCV data.
        Supported periods: '1mo', '3mo', '6mo', '1y', '3y', '5y', 'max'.
        """
        clean_ticker = ticker.strip().upper()
        cache_key = f"mkt_{clean_ticker}_{period}"

        if use_cache:
            cached = self.cache.get(cache_key, max_age_seconds=1800)  # 30-min cache
            if cached and isinstance(cached, dict) and "records" in cached:
                df_cached = pd.DataFrame(cached["records"])
                if "Date" in df_cached.columns:
                    df_cached["Date"] = pd.to_datetime(df_cached["Date"])
                    df_cached.set_index("Date", inplace=True)
                    return df_cached

        df = None
        try:
            import yfinance as yf
            t = yf.Ticker(clean_ticker)
            raw = t.history(period=period, auto_adjust=True)
            if raw is not None and not raw.empty and len(raw) >= 15:
                df = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
                df.index = pd.to_datetime(df.index)
                if df.index.tz is not None:
                    df.index = df.index.tz_localize(None)
        except Exception:
            df = None

        if df is None or len(df) < 15:
            # Academic integrity: Do not generate fake OHLC candles or synthetic prices.
            return pd.DataFrame()

        # Cache payload
        if df is not None and not df.empty:
            records = df.reset_index().to_dict(orient="records")
            # Format datetime
            for r in records:
                if "Date" in r and hasattr(r["Date"], "strftime"):
                    r["Date"] = r["Date"].strftime("%Y-%m-%d")
                elif "index" in r and hasattr(r["index"], "strftime"):
                    r["Date"] = r.pop("index").strftime("%Y-%m-%d")
            self.cache.set(cache_key, {"records": records})

        return df

    def get_latest_quote(self, ticker: str, df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
        """Returns latest available price, daily change, 52w high/low, volume, and timestamp."""
        clean_ticker = ticker.strip().upper()
        if df is None or df.empty:
            df = self.fetch_history(clean_ticker, period="1y")

        if df is None or df.empty:
            return {
                "ticker": clean_ticker,
                "price": 0.0,
                "prev_close": 0.0,
                "change": 0.0,
                "change_pct": 0.0,
                "high_52w": 0.0,
                "low_52w": 0.0,
                "volume": 0,
                "currency": "INR" if ".NS" in clean_ticker or ".BO" in clean_ticker else "USD",
                "last_updated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

        latest = df.iloc[-1]
        prev = df.iloc[-2] if len(df) > 1 else latest

        price = float(latest["Close"])
        prev_close = float(prev["Close"])
        change = round(price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close > 0 else 0.0

        past_year = df.tail(min(len(df), 252))
        high_52w = round(float(past_year["High"].max()), 2)
        low_52w = round(float(past_year["Low"].min()), 2)
        volume = int(latest["Volume"])
        currency = "INR" if ".NS" in clean_ticker or ".BO" in clean_ticker else "USD"

        # Timestamp from bar index
        last_dt = df.index[-1]
        last_str = last_dt.strftime("%Y-%m-%d") if hasattr(last_dt, "strftime") else str(last_dt)

        return {
            "ticker": clean_ticker,
            "price": round(price, 2),
            "prev_close": round(prev_close, 2),
            "change": change,
            "change_pct": change_pct,
            "high_52w": high_52w,
            "low_52w": low_52w,
            "volume": volume,
            "currency": currency,
            "last_updated": f"{last_str} (Market Close)"
        }

    def _generate_offline_series(self, ticker: str, period: str) -> pd.DataFrame:
        """
        Academic integrity policy: Never generate synthetic/random OHLCV candles.
        Disabled permanently to prevent accidental substitution of fake prices.
        """
        return pd.DataFrame()


_market_provider: Optional[MarketDataProvider] = None


def get_market_data_provider() -> MarketDataProvider:
    global _market_provider
    if _market_provider is None:
        _market_provider = MarketDataProvider()
    return _market_provider
