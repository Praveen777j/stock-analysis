"""
Core unit tests for AI Stock Insight.
Verifies services, technical indicators, sentiment analysis, model training & inference, and backtesting.
"""

import unittest
import pandas as pd
import numpy as np

from project.services import fetch_historical_prices, get_latest_quote, fetch_news_articles
from project.features import compute_technical_indicators, prepare_training_dataset, extract_latest_features
from project.sentiment import VaderEngine, FinBERTEngine, analyze_article_batch
from project.model import StockSignalModel
from project.backtest import run_walk_forward_backtest


class TestStockInsightCore(unittest.TestCase):

    def setUp(self):
        # Generate deterministic synthetic data for testing
        dates = pd.date_range("2024-01-01", periods=120, freq="B")
        np.random.seed(42)
        close = 100 * np.cumprod(1 + np.random.normal(0.0005, 0.015, 120))
        self.sample_df = pd.DataFrame({
            "Open": close * 0.99,
            "High": close * 1.02,
            "Low": close * 0.98,
            "Close": close,
            "Volume": np.random.randint(100000, 5000000, 120)
        }, index=dates)

    def test_services(self):
        quote = get_latest_quote("RELIANCE.NS", self.sample_df)
        self.assertIn("price", quote)
        self.assertGreater(quote["price"], 0)
        self.assertIn("52w_high" if "52w_high" in quote else "high_52w", quote)

        news = fetch_news_articles("RELIANCE.NS")
        self.assertIsInstance(news, list)
        self.assertGreater(len(news), 0)

    def test_technical_indicators(self):
        df_tech = compute_technical_indicators(self.sample_df)
        self.assertIn("EMA20", df_tech.columns)
        self.assertIn("EMA50", df_tech.columns)
        self.assertIn("RSI", df_tech.columns)
        self.assertIn("MACD_HIST", df_tech.columns)
        self.assertIn("VOLATILITY_20", df_tech.columns)

        # Check RSI is bounded between 0 and 100
        valid_rsi = df_tech["RSI"].dropna()
        self.assertTrue((valid_rsi >= 0).all() and (valid_rsi <= 100).all())

    def test_sentiment_engines(self):
        vader = VaderEngine()
        res_v = vader.analyze("Company reports record profit and strong quarterly growth")
        self.assertGreater(res_v["compound"], 0)

        finbert = FinBERTEngine()
        res_f = finbert.analyze("Operating margins expand as new enterprise contracts signed")
        self.assertGreater(res_f["positive"], res_f["negative"])

        batch_res = analyze_article_batch([
            {"title": "Record earnings beat estimates", "summary": "Strong growth across all business units."}
        ])
        self.assertEqual(batch_res["sentiment_label"], "BULLISH")

    def test_model_training_and_inference(self):
        X, y, feats = prepare_training_dataset(self.sample_df, horizon_days=5)
        self.assertGreater(len(X), 20)
        self.assertEqual(len(X), len(y))

        model = StockSignalModel()
        metrics = model.fit(X, y)
        self.assertIn("accuracy", metrics)

        latest_feats = extract_latest_features(self.sample_df, sentiment_score=0.25)
        pred = model.predict_signal(latest_feats)
        self.assertIn(pred["signal"], ["BUY", "HOLD", "SELL"])
        self.assertIn("BUY", pred["probabilities"])
        self.assertIn("HOLD", pred["probabilities"])
        self.assertIn("SELL", pred["probabilities"])
        # Sum of probabilities should be close to 1.0
        self.assertAlmostEqual(sum(pred["probabilities"].values()), 1.0, places=1)

    def test_backtest_engine(self):
        bt = run_walk_forward_backtest(self.sample_df)
        self.assertNotIn("error", bt)
        self.assertIn("metrics", bt)
        self.assertIn("strategy_return_pct", bt["metrics"])
        self.assertIn("buy_hold_return_pct", bt["metrics"])
        self.assertIn("sharpe_ratio", bt["metrics"])
        self.assertIn("max_drawdown_pct", bt["metrics"])
        self.assertIn("equity_curve", bt)
        self.assertGreater(len(bt["equity_curve"]), 0)


if __name__ == "__main__":
    unittest.main()
