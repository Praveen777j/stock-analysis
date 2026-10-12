"""
Market and sector context feature transformations.
"""

from typing import Dict, Any, Optional


def build_market_features(market_dict: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
    """Extracts benchmark market features."""
    if not market_dict:
        return {
            "MARKET_RETURN_1D": 0.0,
            "MARKET_RETURN_5D": 0.0,
            "MARKET_RETURN_20D": 0.0,
            "MARKET_VOLATILITY": 0.15
        }

    return {
        "MARKET_RETURN_1D": float(market_dict.get("market_return_1d", 0.0)),
        "MARKET_RETURN_5D": float(market_dict.get("market_return_5d", 0.0)),
        "MARKET_RETURN_20D": float(market_dict.get("market_return_20d", 0.0)),
        "MARKET_VOLATILITY": float(market_dict.get("market_volatility_20d", 0.15))
    }
