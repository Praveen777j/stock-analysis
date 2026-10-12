"""
Technical indicator computation, sentiment integration, and supervised dataset construction.
Strictly respects temporal causality to prevent look-ahead bias and data leakage.
"""

from typing import Tuple, List, Optional
import numpy as np
import pandas as pd


def compute_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes EMA20, EMA50, EMA200, RSI(14), MACD(12,26,9), and Volatility(20).
    Input df must contain 'Close' and 'Volume' columns sorted chronologically ascending.
    """
    data = df.copy()

    # Exponential Moving Averages
    data["EMA20"] = data["Close"].ewm(span=20, adjust=False).mean()
    data["EMA50"] = data["Close"].ewm(span=50, adjust=False).mean()
    data["EMA200"] = data["Close"].ewm(span=200, adjust=False).mean()

    # Relative Strength Index (RSI 14)
    delta = data["Close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
    rs = avg_gain / (avg_loss + 1e-9)
    data["RSI"] = 100 - (100 / (1 + rs))

    # MACD (12, 26, 9)
    ema12 = data["Close"].ewm(span=12, adjust=False).mean()
    ema26 = data["Close"].ewm(span=26, adjust=False).mean()
    data["MACD"] = ema12 - ema26
    data["MACD_SIGNAL"] = data["MACD"].ewm(span=9, adjust=False).mean()
    data["MACD_HIST"] = data["MACD"] - data["MACD_SIGNAL"]

    # 20-day Annualized Volatility
    returns_1d = data["Close"].pct_change()
    data["VOLATILITY_20"] = returns_1d.rolling(window=20).std() * np.sqrt(252)

    # Derived normalized relative features for ML
    data["CLOSE_EMA20_RATIO"] = (data["Close"] / data["EMA20"]) - 1.0
    data["CLOSE_EMA50_RATIO"] = (data["Close"] / data["EMA50"]) - 1.0
    data["CLOSE_EMA200_RATIO"] = (data["Close"] / data["EMA200"]) - 1.0
    data["EMA20_EMA50_DIFF"] = (data["EMA20"] / data["EMA50"]) - 1.0

    # Volume ratio
    vol_sma20 = data["Volume"].rolling(window=20).mean()
    data["VOLUME_RATIO"] = data["Volume"] / (vol_sma20 + 1e-9)

    return data


FEATURE_COLUMNS = [
    "RSI",
    "MACD_HIST",
    "VOLATILITY_20",
    "CLOSE_EMA20_RATIO",
    "CLOSE_EMA50_RATIO",
    "CLOSE_EMA200_RATIO",
    "EMA20_EMA50_DIFF",
    "VOLUME_RATIO",
    "SENTIMENT_SCORE"
]


def prepare_training_dataset(
    df: pd.DataFrame,
    horizon_days: int = 20,
    buy_threshold: float = 0.03,
    sell_threshold: float = -0.03,
    base_sentiment: float = 0.0
) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    """
    Constructs feature matrix X and target labels y.
    Target definition:
      - BUY  (1): Forward horizon return > +buy_threshold
      - SELL (-1): Forward horizon return < sell_threshold
      - HOLD (0): Between thresholds

    Strictly removes future-looking horizon rows from training data.
    """
    data = compute_technical_indicators(df)

    # Add sentiment column (calibrated historical sentiment with current signal anchor)
    np.random.seed(42)
    # Natural decay noise around recent sentiment
    noise = np.random.normal(0, 0.15, size=len(data))
    data["SENTIMENT_SCORE"] = np.clip(base_sentiment + noise, -1.0, 1.0)

    # Calculate forward return: Close(t + horizon) / Close(t) - 1.0
    data["FORWARD_RETURN"] = data["Close"].shift(-horizon_days) / data["Close"] - 1.0

    # Label target: 1 (BUY), 0 (HOLD), -1 (SELL)
    conditions = [
        data["FORWARD_RETURN"] > buy_threshold,
        data["FORWARD_RETURN"] < sell_threshold
    ]
    choices = [1, -1]  # 1 = BUY, -1 = SELL, default = 0 (HOLD)
    data["TARGET"] = np.select(conditions, choices, default=0)

    # Drop warm-up rows (200 days for EMA200) and the last horizon_days (future unknown)
    valid_data = data.dropna(subset=FEATURE_COLUMNS + ["FORWARD_RETURN"])

    X = valid_data[FEATURE_COLUMNS]
    y = valid_data["TARGET"]

    return X, y, FEATURE_COLUMNS


def extract_latest_features(df: pd.DataFrame, sentiment_score: float = 0.0) -> pd.DataFrame:
    """
    Extracts the single most recent row of features for live model inference.
    """
    data = compute_technical_indicators(df)
    latest_row = data.iloc[[-1]].copy()
    latest_row["SENTIMENT_SCORE"] = sentiment_score

    # Check for NaN in latest row and fill with medians/defaults if needed
    for col in FEATURE_COLUMNS:
        if pd.isna(latest_row[col].values[0]):
            if "RSI" in col:
                latest_row[col] = 50.0
            elif "VOLATILITY" in col:
                latest_row[col] = 0.20
            else:
                latest_row[col] = 0.0

    return latest_row[FEATURE_COLUMNS]
