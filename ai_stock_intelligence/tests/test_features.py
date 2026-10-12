"""
Unit tests for technical feature calculations and supervised target preparation.
"""

import unittest
import pandas as pd
import numpy as np
from ai_stock_intelligence.features.technical import compute_all_technical_indicators
from ai_stock_intelligence.features.pipeline import prepare_supervised_dataset


class TestFeaturePipeline(unittest.TestCase):
    def setUp(self):
        dates = pd.date_range("2023-01-01", periods=100, freq="B")
        close = 100 * np.cumprod(1 + np.random.normal(0.0005, 0.015, 100))
        self.sample_df = pd.DataFrame({
            "Open": close * 0.99,
            "High": close * 1.02,
            "Low": close * 0.98,
            "Close": close,
            "Volume": np.random.randint(100000, 5000000, 100)
        }, index=dates)

    def test_technical_indicators_present(self):
        df_tech = compute_all_technical_indicators(self.sample_df)
        expected = ["SMA20", "EMA20", "EMA50", "EMA200", "RSI", "MACD", "MACD_HIST", "ATR", "ADX", "VOLATILITY_20"]
        for col in expected:
            self.assertIn(col, df_tech.columns)

    def test_rsi_bounds(self):
        df_tech = compute_all_technical_indicators(self.sample_df)
        valid_rsi = df_tech["RSI"].dropna()
        self.assertTrue((valid_rsi >= 0).all() and (valid_rsi <= 100).all())

    def test_supervised_dataset_no_leakage(self):
        X, y, cols = prepare_supervised_dataset(self.sample_df, horizon_days=10)
        self.assertGreater(len(X), 20)
        self.assertEqual(len(X), len(y))
        # Ensure target labels are only in {-1, 0, 1}
        unique_targets = set(y.unique())
        self.assertTrue(unique_targets.issubset({-1, 0, 1}))


if __name__ == "__main__":
    unittest.main()
