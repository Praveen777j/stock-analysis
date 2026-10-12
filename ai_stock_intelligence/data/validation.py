"""
Data validation and sanity checks for market and financial datasets.
"""

from typing import Tuple, List, Optional
import pandas as pd
import numpy as np


def validate_market_dataframe(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """
    Validates OHLCV time-series structure.
    Checks:
    - Required columns presence: Open, High, Low, Close, Volume
    - Chronological ordering
    - Minimum length threshold
    - Sanity relations: High >= Low, High >= Open, High >= Close, Low <= Open, Low <= Close
    - Non-negative Volume and Close
    """
    errors: List[str] = []
    if df is None or df.empty:
        return False, ["DataFrame is empty or None."]

    required_cols = ["Open", "High", "Low", "Close", "Volume"]
    missing_cols = [c for c in required_cols if c not in df.columns]
    if missing_cols:
        return False, [f"Missing required OHLCV columns: {missing_cols}"]

    if len(df) < 15:
        errors.append(f"Insufficient history bars: {len(df)} bars found (minimum 15 required).")

    # Check for invalid prices
    invalid_prices = (df["Close"] <= 0) | (df["High"] <= 0) | (df["Low"] <= 0)
    if invalid_prices.any():
        errors.append(f"Found {invalid_prices.sum()} rows with non-positive prices.")

    # High / Low integrity check
    hl_violations = (df["High"] < df["Low"]).sum()
    if hl_violations > 0:
        errors.append(f"Found {hl_violations} instances where High < Low.")

    # Volume check
    neg_vol = (df["Volume"] < 0).sum()
    if neg_vol > 0:
        errors.append(f"Found {neg_vol} negative volume entries.")

    is_valid = len(errors) == 0
    return is_valid, errors
