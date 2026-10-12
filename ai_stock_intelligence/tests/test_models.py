"""
Unit tests for model pipeline training, calibration, and inference schemas.
"""

import unittest
import pandas as pd
import numpy as np
from ai_stock_intelligence.models.train import train_and_evaluate_model
from ai_stock_intelligence.models.predict import predict_calibrated_signal


class TestModels(unittest.TestCase):
    def setUp(self):
        np.random.seed(42)
        n = 80
        self.X = pd.DataFrame({
            "RSI": np.random.uniform(20, 80, n),
            "MACD_HIST": np.random.normal(0, 1, n),
            "VOLATILITY_20": np.random.uniform(0.1, 0.4, n),
            "DIST_EMA20": np.random.normal(0, 0.05, n),
            "DIST_EMA50": np.random.normal(0, 0.08, n),
            "DIST_EMA200": np.random.normal(0, 0.12, n),
            "EMA20_EMA50_SPREAD": np.random.normal(0, 0.03, n),
            "BB_BANDWIDTH": np.random.uniform(0.05, 0.25, n),
            "ATR": np.random.uniform(1, 5, n),
            "ADX": np.random.uniform(10, 50, n),
            "ROC_10": np.random.normal(0, 5, n),
            "RETURN_5D": np.random.normal(0, 0.03, n),
            "RETURN_20D": np.random.normal(0, 0.06, n),
            "VOLUME_RATIO": np.random.uniform(0.5, 2.0, n),
            "SENTIMENT_1D": np.random.uniform(-1, 1, n),
            "FINBERT_SCORE": np.random.uniform(-1, 1, n),
            "MARKET_RETURN_20D": np.random.normal(0.02, 0.04, n)
        })
        self.y = pd.Series(np.random.choice([-1, 0, 1], size=n))

    def test_train_and_evaluate(self):
        res = train_and_evaluate_model(self.X, self.y, model_type="Logistic Regression")
        self.assertIn("model", res)
        self.assertIn("metrics", res)
        self.assertIn("accuracy", res["metrics"])

    def test_predict_signal(self):
        res = train_and_evaluate_model(self.X, self.y, model_type="Random Forest")
        model = res["model"]
        single_row = self.X.iloc[[0]]
        sig = predict_calibrated_signal(model, single_row, ticker="AAPL")
        self.assertIn(sig.signal, ["BUY", "HOLD", "SELL", "HOLD / LOW CONFIDENCE"])
        probs = sig.probabilities.to_dict()
        self.assertAlmostEqual(sum(probs.values()), 1.0, places=1)


if __name__ == "__main__":
    unittest.main()
