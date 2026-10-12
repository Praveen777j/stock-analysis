"""
Comprehensive technical feature extraction strictly respecting temporal causality.
All calculations use only past and current bar data (no look-ahead bias).
"""

from typing import List, Optional
import numpy as np
import pandas as pd


def compute_all_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes complete suite of technical indicators:
    - Moving Averages: SMA20, SMA50, SMA200, EMA20, EMA50, EMA200
    - Oscillators: RSI(14), MACD(12,26,9), Signal, Histogram
    - Volatility: Bollinger Bands (Upper, Middle, Lower, Bandwidth), ATR(14), 20-day Annualized Volatility
    - Trend & Momentum: ADX(14), ROC(10), Momentum(10)
    - Returns: 1D, 5D, 10D, 20D, 60D forward/backward returns
    - Volume: Volume change, Volume SMA20, Volume Ratio
    - Relative Price Distances: Distance from EMA20, EMA50, EMA200
    """
    data = df.copy()

    # 1. Simple Moving Averages
    data["SMA20"] = data["Close"].rolling(window=20).mean()
    data["SMA50"] = data["Close"].rolling(window=50).mean()
    data["SMA200"] = data["Close"].rolling(window=200).mean()

    # 2. Exponential Moving Averages
    data["EMA20"] = data["Close"].ewm(span=20, adjust=False).mean()
    data["EMA50"] = data["Close"].ewm(span=50, adjust=False).mean()
    data["EMA200"] = data["Close"].ewm(span=200, adjust=False).mean()

    # 3. Relative Distances from EMAs
    data["DIST_EMA20"] = (data["Close"] / data["EMA20"]) - 1.0
    data["DIST_EMA50"] = (data["Close"] / data["EMA50"]) - 1.0
    data["DIST_EMA200"] = (data["Close"] / data["EMA200"]) - 1.0
    data["EMA20_EMA50_SPREAD"] = (data["EMA20"] / data["EMA50"]) - 1.0

    # 4. RSI (14) with exponential smoothing
    delta = data["Close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
    rs = avg_gain / (avg_loss + 1e-9)
    data["RSI"] = 100 - (100 / (1 + rs))

    # 5. MACD (12, 26, 9)
    ema12 = data["Close"].ewm(span=12, adjust=False).mean()
    ema26 = data["Close"].ewm(span=26, adjust=False).mean()
    data["MACD"] = ema12 - ema26
    data["MACD_SIGNAL"] = data["MACD"].ewm(span=9, adjust=False).mean()
    data["MACD_HIST"] = data["MACD"] - data["MACD_SIGNAL"]

    # 6. Bollinger Bands (20 periods, 2 std dev)
    rolling_std20 = data["Close"].rolling(window=20).std()
    data["BB_MIDDLE"] = data["SMA20"]
    data["BB_UPPER"] = data["BB_MIDDLE"] + (2 * rolling_std20)
    data["BB_LOWER"] = data["BB_MIDDLE"] - (2 * rolling_std20)
    data["BB_BANDWIDTH"] = (data["BB_UPPER"] - data["BB_LOWER"]) / (data["BB_MIDDLE"] + 1e-9)

    # 7. Average True Range (ATR 14)
    high_low = data["High"] - data["Low"]
    high_close = (data["High"] - data["Close"].shift(1)).abs()
    low_close = (data["Low"] - data["Close"].shift(1)).abs()
    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    data["ATR"] = true_range.rolling(window=14).mean()

    # 8. ADX (Average Directional Index 14)
    up_move = data["High"] - data["High"].shift(1)
    down_move = data["Low"].shift(1) - data["Low"]
    pos_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    neg_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    tr_smooth = true_range.ewm(alpha=1/14, min_periods=14, adjust=False).mean()
    pos_di = 100 * (pd.Series(pos_dm, index=data.index).ewm(alpha=1/14, min_periods=14, adjust=False).mean() / (tr_smooth + 1e-9))
    neg_di = 100 * (pd.Series(neg_dm, index=data.index).ewm(alpha=1/14, min_periods=14, adjust=False).mean() / (tr_smooth + 1e-9))
    dx = 100 * ((pos_di - neg_di).abs() / (pos_di + neg_di + 1e-9))
    data["ADX"] = dx.ewm(alpha=1/14, min_periods=14, adjust=False).mean()

    # 9. Rate of Change (ROC 10) & Momentum (10)
    data["ROC_10"] = data["Close"].pct_change(periods=10) * 100
    data["MOMENTUM_10"] = data["Close"] - data["Close"].shift(10)

    # 10. Multi-horizon historical returns
    data["RETURN_1D"] = data["Close"].pct_change(1)
    data["RETURN_5D"] = data["Close"].pct_change(5)
    data["RETURN_10D"] = data["Close"].pct_change(10)
    data["RETURN_20D"] = data["Close"].pct_change(20)
    data["RETURN_60D"] = data["Close"].pct_change(60)

    # 11. Volatility
    data["VOLATILITY_20"] = data["RETURN_1D"].rolling(window=20).std() * np.sqrt(252)

    # 12. Volume metrics
    data["VOLUME_CHANGE"] = data["Volume"].pct_change(1)
    data["VOLUME_SMA20"] = data["Volume"].rolling(window=20).mean()
    data["VOLUME_RATIO"] = data["Volume"] / (data["VOLUME_SMA20"] + 1e-9)

    return data
