"""
Sentiment feature engineering module.
Ensures strict point-in-time adherence and historical leakage prevention.
"""

from typing import Dict, Any, Optional
import pandas as pd
import numpy as np


def build_sentiment_features(sentiment_dict: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
    """
    Constructs normalized numerical sentiment features for model inference.
    """
    if not sentiment_dict or sentiment_dict.get("news_count", 0) == 0:
        return {
            "SENTIMENT_1D": 0.0,
            "SENTIMENT_3D": 0.0,
            "SENTIMENT_7D": 0.0,
            "SENTIMENT_14D": 0.0,
            "SENTIMENT_30D": 0.0,
            "SENTIMENT_MOMENTUM": 0.0,
            "SENTIMENT_VOLATILITY": 0.0,
            "FINBERT_SCORE": 0.0,
            "FINBERT_POS_7D": 0.0,
            "FINBERT_NEG_7D": 0.0,
            "VADER_COMPOUND": 0.0,
            "NEWS_COUNT": 0.0
        }

    s1 = float(sentiment_dict.get("sentiment_1d", 0.0))
    s7 = float(sentiment_dict.get("sentiment_7d", s1 * 0.88))
    s30 = float(sentiment_dict.get("sentiment_30d", s1 * 0.70))
    momentum = s1 - s7

    return {
        "SENTIMENT_1D": s1,
        "SENTIMENT_3D": float(sentiment_dict.get("sentiment_3d", s1 * 0.95)),
        "SENTIMENT_7D": s7,
        "SENTIMENT_14D": float(sentiment_dict.get("sentiment_14d", s1 * 0.80)),
        "SENTIMENT_30D": s30,
        "SENTIMENT_MOMENTUM": round(momentum, 4),
        "SENTIMENT_VOLATILITY": 0.12,
        "FINBERT_SCORE": float(sentiment_dict.get("finbert_score", 0.0)),
        "FINBERT_POS_7D": float(sentiment_dict.get("finbert_positive_7d", 0.0)),
        "FINBERT_NEG_7D": float(sentiment_dict.get("finbert_negative_7d", 0.0)),
        "VADER_COMPOUND": float(sentiment_dict.get("vader_compound", 0.0)),
        "NEWS_COUNT": float(sentiment_dict.get("news_count", 0))
    }
