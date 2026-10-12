"""
Master feature engineering pipeline and leakage-safe target labeling.
Strictly respects temporal boundaries and removes horizon overlap during supervised training.
"""

from typing import Tuple, List, Dict, Any, Optional
import pandas as pd
import numpy as np

from .technical import compute_all_technical_indicators
from .sentiment import build_sentiment_features
from .fundamentals import build_fundamental_features
from .market import build_market_features

CORE_FEATURE_COLUMNS = [
    "RSI",
    "MACD_HIST",
    "VOLATILITY_20",
    "DIST_EMA20",
    "DIST_EMA50",
    "DIST_EMA200",
    "EMA20_EMA50_SPREAD",
    "BB_BANDWIDTH",
    "ATR",
    "ADX",
    "ROC_10",
    "RETURN_5D",
    "RETURN_20D",
    "VOLUME_RATIO",
    "SENTIMENT_1D",
    "FINBERT_SCORE",
    "MARKET_RETURN_20D"
]


def prepare_supervised_dataset(
    df: pd.DataFrame,
    horizon_days: int = 1,
    target_mode: str = "binary",
    buy_threshold: float = 0.0,
    sell_threshold: float = 0.0,
    market_return_series: Optional[pd.Series] = None
) -> Tuple[pd.DataFrame, pd.Series, List[str], Dict[str, Any]]:
    """
    Constructs feature matrix X and target labels y with strict temporal hygiene.
    
    Target Formulation:
      - Binary Mode (Next-Day Direction):
          y_t = 1 if Close_{t+horizon} > Close_t else 0
      - Multi-Class Mode (Directional Magnitude):
          +1: BUY  (future_return > buy_threshold)
           0: HOLD (sell_threshold <= future_return <= buy_threshold)
          -1: SELL (future_return < sell_threshold)

    Leakage Prevention Controls:
      1. Technical indicators are strictly rolling backward (t <= current bar).
      2. No future close/high/low/volume is included in feature columns.
      3. Historical sentiment is set to neutral 0.0 to prevent future news look-ahead leakage.
         Live FinBERT/VADER scores are strictly reserved for the latest (unlabeled) inference row.
      4. The last horizon_days rows (where future outcome is not yet observed) are excluded from training.
    """
    data = compute_all_technical_indicators(df)

    # Historical sentiment: strictly neutral 0.0 (zero future news leakage)
    data["SENTIMENT_1D"] = 0.0
    data["FINBERT_SCORE"] = 0.0

    # Market benchmark return: rolling 20-day return of stock itself if external benchmark unavailable
    if market_return_series is not None:
        data["MARKET_RETURN_20D"] = market_return_series.reindex(data.index).fillna(0.0)
    else:
        data["MARKET_RETURN_20D"] = data["Close"].pct_change(20).fillna(0.0)

    # Calculate forward return: Close(t + horizon) / Close(t) - 1.0
    data["FORWARD_RETURN"] = (data["Close"].shift(-horizon_days) / data["Close"]) - 1.0

    if target_mode == "binary":
        # 1 = UP (Close_{t+h} > Close_t), 0 = DOWN/FLAT
        data["TARGET"] = (data["FORWARD_RETURN"] > buy_threshold).astype(int)
    else:
        # Multi-class
        conditions = [
            data["FORWARD_RETURN"] > buy_threshold,
            data["FORWARD_RETURN"] < sell_threshold
        ]
        choices = [1, -1]  # 1 = BUY, -1 = SELL, default 0 = HOLD
        data["TARGET"] = np.select(conditions, choices, default=0)

    # Drop rows where indicators or forward targets are NaN
    valid_cols = CORE_FEATURE_COLUMNS + ["FORWARD_RETURN", "TARGET"]
    valid = data.dropna(subset=valid_cols).copy()

    X = valid[CORE_FEATURE_COLUMNS].copy()
    y = valid["TARGET"].copy()

    metadata = {
        "target_name": "Next-Day Direction (Binary)" if horizon_days == 1 and target_mode == "binary" else f"{horizon_days}-Day Direction",
        "horizon_days": horizon_days,
        "target_mode": target_mode,
        "target_formula": "y_t = 1 if Close_{t+1} > Close_t else 0" if horizon_days == 1 and target_mode == "binary" else f"y_t = 1 if Return_{horizon_days}d > {buy_threshold} else 0",
        "feature_cutoff": "Market Close at Date t (features computed strictly on t <= current_bar)",
        "prediction_time": "Post-market close of day t (executable at day t+1 open)",
        "features_count": len(CORE_FEATURE_COLUMNS),
        "total_samples": len(valid)
    }

    return X, y, CORE_FEATURE_COLUMNS, metadata


def extract_latest_features_vector(
    df: pd.DataFrame,
    sentiment_dict: Optional[Dict[str, Any]] = None,
    market_dict: Optional[Dict[str, Any]] = None
) -> pd.DataFrame:
    """Extracts a single-row feature vector from the latest available bar for real-time inference."""
    data = compute_all_technical_indicators(df)
    latest = data.iloc[[-1]].copy()

    sent_feats = build_sentiment_features(sentiment_dict)
    mkt_feats = build_market_features(market_dict)

    latest["SENTIMENT_1D"] = sent_feats["SENTIMENT_1D"]
    latest["FINBERT_SCORE"] = sent_feats["FINBERT_SCORE"]
    latest["MARKET_RETURN_20D"] = mkt_feats["MARKET_RETURN_20D"]

    # Fill any NA
    for col in CORE_FEATURE_COLUMNS:
        if col not in latest.columns or pd.isna(latest[col].values[0]):
            latest[col] = 0.0

    return latest[CORE_FEATURE_COLUMNS]
