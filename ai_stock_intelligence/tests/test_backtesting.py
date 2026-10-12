"""
Unit tests for walk-forward backtesting and transaction cost accounting.
"""

import unittest
import pandas as pd
import numpy as np
from ai_stock_intelligence.backtesting.engine import BacktestEngine
from ai_stock_intelligence.backtesting.transaction_costs import ExecutionCostModel


class TestBacktesting(unittest.TestCase):
    def test_cost_model(self):
        cm = ExecutionCostModel(commission_bps=10.0, slippage_bps=5.0)
        # Total drag = 15 bps = 0.0015
        outlay, friction = cm.calculate_entry_cost(100.0, 10.0)
        self.assertEqual(friction, 1.5)
        self.assertEqual(outlay, 1001.5)

    def test_backtest_execution(self):
        dates = pd.date_range("2023-01-01", periods=100, freq="B")
        close = 100 * np.cumprod(1 + np.random.normal(0.0005, 0.015, 100))
        df = pd.DataFrame({
            "Open": close * 0.99,
            "High": close * 1.02,
            "Low": close * 0.98,
            "Close": close,
            "Volume": [1000000] * 100
        }, index=dates)

        engine = BacktestEngine(initial_capital=100000.0)
        res = engine.run_backtest(df)
        self.assertNotIn("error", res)
        self.assertIn("metrics", res)
        self.assertIn("sharpe_ratio", res["metrics"])
        self.assertIn("strategy_total_return_pct", res["metrics"])


if __name__ == "__main__":
    unittest.main()
