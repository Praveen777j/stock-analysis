"""
Fundamental feature extraction with point-in-time leakage exclusion.
"""

from typing import Dict, Any, Optional


def build_fundamental_features(fundamentals_dict: Optional[Dict[str, Any]] = None, is_historical_backtest: bool = False) -> Dict[str, float]:
    """
    Transforms fundamental metrics into numerical features.
    CRITICAL: When is_historical_backtest is True, returns neutral zeroes to prevent
    using today's snapshot financial ratios retroactively in historical backtests.
    """
    if is_historical_backtest or not fundamentals_dict:
        return {
            "PE_RATIO": 0.0,
            "PB_RATIO": 0.0,
            "EPS": 0.0,
            "ROE": 0.0,
            "DIVIDEND_YIELD": 0.0
        }

    return {
        "PE_RATIO": float(fundamentals_dict.get("pe_ratio") or 20.0),
        "PB_RATIO": float(fundamentals_dict.get("pb_ratio") or 3.0),
        "EPS": float(fundamentals_dict.get("eps") or 10.0),
        "ROE": float(fundamentals_dict.get("roe") or 0.15),
        "DIVIDEND_YIELD": float(fundamentals_dict.get("dividend_yield") or 0.01)
    }
