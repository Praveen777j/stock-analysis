"""
Unit tests for market data validation, news provider, and Reddit OAuth status.
"""

import unittest
import pandas as pd
from ai_stock_intelligence.data.validation import validate_market_dataframe
from ai_stock_intelligence.data.reddit_data import get_reddit_client, RedditStatus
from ai_stock_intelligence.data.fundamentals import fetch_stock_fundamentals


class TestDataLayer(unittest.TestCase):
    def test_validation_valid_df(self):
        dates = pd.date_range("2024-01-01", periods=20, freq="B")
        df = pd.DataFrame({
            "Open": [100.0] * 20,
            "High": [105.0] * 20,
            "Low": [95.0] * 20,
            "Close": [102.0] * 20,
            "Volume": [10000] * 20
        }, index=dates)
        is_valid, errors = validate_market_dataframe(df)
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)

    def test_validation_invalid_high_low(self):
        dates = pd.date_range("2024-01-01", periods=20, freq="B")
        df = pd.DataFrame({
            "Open": [100.0] * 20,
            "High": [90.0] * 20,  # Invalid: High < Low
            "Low": [95.0] * 20,
            "Close": [102.0] * 20,
            "Volume": [10000] * 20
        }, index=dates)
        is_valid, errors = validate_market_dataframe(df)
        self.assertFalse(is_valid)

    def test_reddit_graceful_handling(self):
        client = get_reddit_client()
        res = client.aggregate_reddit("AAPL")
        self.assertIn("status", res)
        # Without credentials in test, should gracefully report AUTH_REQUIRED
        if not client.is_configured():
            self.assertEqual(res["status"], RedditStatus.AUTH_REQUIRED.value)

    def test_fundamentals(self):
        funds = fetch_stock_fundamentals("AAPL")
        self.assertIn("pe_ratio", funds)
        self.assertFalse(funds["point_in_time_safe"])


if __name__ == "__main__":
    unittest.main()
