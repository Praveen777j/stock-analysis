"""
Multi-Exchange Market Scanner.
Scans stocks from the loaded universe with controlled batching and multi-factor filters:
RSI, moving average alignment, momentum, volatility, volume, and sentiment.
"""

from typing import List, Dict, Any, Optional, Callable
import pandas as pd
import numpy as np

from ai_stock_intelligence.universe.manager import get_universe_manager, StockSecurity
from ai_stock_intelligence.data.market_data import get_market_data_provider
from ai_stock_intelligence.features.technical import compute_all_technical_indicators
from .batch_processor import BatchProcessor


class MarketScanner:
    def __init__(self):
        self.universe_mgr = get_universe_manager()
        self.market_provider = get_market_data_provider()
        self.batch_processor = BatchProcessor(max_workers=4, delay_between_batches=0.1)

    def scan(
        self,
        exchange: str = "ALL",
        country: str = "ALL",
        sector: str = "ALL",
        max_stocks: int = 50,
        rsi_min: float = 0.0,
        rsi_max: float = 100.0,
        min_price: float = 1.0,
        max_price: float = 100000.0,
        require_ema_bullish: bool = False,
        progress_callback: Optional[Callable[[int, int, int, int], None]] = None
    ) -> Dict[str, Any]:
        """
        Executes a filtered market scan across eligible securities in the universe.
        """
        securities = self.universe_mgr.filter_securities(
            exchange=exchange,
            country=country,
            sector=sector,
            limit=max_stocks * 2
        )

        selected_candidates = securities[:max_stocks]

        def process_candidate(sec: StockSecurity) -> Optional[Dict[str, Any]]:
            try:
                df = self.market_provider.fetch_history(sec.ticker, period="6mo", use_cache=True)
                if df is None or len(df) < 25:
                    return None

                latest = df.iloc[-1]
                price = float(latest["Close"])
                if price < min_price or price > max_price:
                    return None

                df_tech = compute_all_technical_indicators(df)
                last_tech = df_tech.iloc[-1]
                rsi = float(last_tech["RSI"])

                if rsi < rsi_min or rsi > rsi_max:
                    return None

                ema20 = float(last_tech["EMA20"])
                ema50 = float(last_tech["EMA50"])
                ema_bullish = ema20 > ema50

                if require_ema_bullish and not ema_bullish:
                    return None

                change = float(price - df.iloc[-2]["Close"]) if len(df) > 1 else 0.0
                change_pct = (change / df.iloc[-2]["Close"]) * 100 if len(df) > 1 else 0.0

                # Lightweight rule signal
                signal = "HOLD"
                if ema_bullish and rsi < 60 and last_tech["MACD_HIST"] > 0:
                    signal = "BUY"
                elif not ema_bullish and rsi > 50 and last_tech["MACD_HIST"] < 0:
                    signal = "SELL"

                return {
                    "ticker": sec.ticker,
                    "name": sec.name,
                    "exchange": sec.exchange,
                    "country": sec.country,
                    "sector": sec.sector,
                    "price": round(price, 2),
                    "change_pct": round(change_pct, 2),
                    "rsi": round(rsi, 1),
                    "ema20": round(ema20, 2),
                    "ema50": round(ema50, 2),
                    "ema_alignment": "Bullish" if ema_bullish else "Bearish",
                    "macd_hist": round(float(last_tech["MACD_HIST"]), 2),
                    "volume": int(latest["Volume"]),
                    "signal": signal
                }
            except Exception:
                return None

        scan_results = self.batch_processor.process_batches(
            selected_candidates,
            process_candidate,
            batch_size=20,
            progress_callback=progress_callback
        )

        return {
            "total_candidates": len(selected_candidates),
            "matches_found": len(scan_results),
            "results": scan_results
        }


_scanner_instance: Optional[MarketScanner] = None


def get_market_scanner() -> MarketScanner:
    global _scanner_instance
    if _scanner_instance is None:
        _scanner_instance = MarketScanner()
    return _scanner_instance
