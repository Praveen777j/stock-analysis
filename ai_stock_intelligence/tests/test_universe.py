"""
Unit tests for universe loading, search, normalization, and filtering.
"""

import unittest
from ai_stock_intelligence.universe.manager import get_universe_manager
from ai_stock_intelligence.universe.search import search_universe


class TestUniverseManager(unittest.TestCase):
    def setUp(self):
        self.mgr = get_universe_manager()

    def test_universe_loaded(self):
        count = self.mgr.count()
        self.assertGreater(count, 5000, f"Expected universe to exceed 5000 symbols, got {count}")

    def test_search_ticker(self):
        results = search_universe("RELIANCE", limit=5)
        self.assertGreater(len(results), 0)
        first_t = results[0]["ticker"]
        self.assertTrue("RELIANCE" in first_t)

    def test_filter_exchange(self):
        nse_stocks = self.mgr.filter_securities(exchange="NSE", limit=10)
        self.assertEqual(len(nse_stocks), 10)
        for s in nse_stocks:
            self.assertEqual(s.exchange, "NSE")

    def test_symbol_normalization(self):
        sec = self.mgr.get_security("reliance")
        self.assertIsNotNone(sec)
        self.assertEqual(sec.ticker, "RELIANCE.NS")


if __name__ == "__main__":
    unittest.main()
