"""
Configuration and settings module for AI Stock Intelligence.
Handles API credentials, market parameters, model defaults, and file paths.
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    # App Information
    app_name: str = "Explainable AI-Based Stock Analysis and Decision Support System"
    app_version: str = "2.5.0"

    # API Keys & Secrets (Never hard-code secrets; loaded from .env)
    news_api_key: str = field(default_factory=lambda: os.getenv("NEWS_API_KEY", ""))
    finnhub_api_key: str = field(default_factory=lambda: os.getenv("FINNHUB_API_KEY", ""))
    alphavantage_api_key: str = field(default_factory=lambda: os.getenv("ALPHAVANTAGE_API_KEY", ""))

    # Official Reddit OAuth API Credentials
    reddit_client_id: str = field(default_factory=lambda: os.getenv("REDDIT_CLIENT_ID", ""))
    reddit_client_secret: str = field(default_factory=lambda: os.getenv("REDDIT_CLIENT_SECRET", ""))
    reddit_user_agent: str = field(default_factory=lambda: os.getenv("REDDIT_USER_AGENT", "StockIntelligence/1.0"))

    # Quantitative & Financial Parameters
    prediction_horizon_days: int = 20
    buy_threshold: float = 0.05   # +5% forward return for BUY
    sell_threshold: float = -0.05  # -5% forward return for SELL
    default_initial_capital: float = 100000.0  # ₹100,000 / $100,000
    default_transaction_cost: float = 0.001   # 10 bps (0.1%)
    default_slippage: float = 0.0005          # 5 bps (0.05%)
    risk_free_rate: float = 0.05              # 5.0% annual risk-free rate

    # System Paths
    base_dir: str = field(default_factory=lambda: os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    @property
    def data_dir(self) -> str:
        return os.path.join(self.base_dir, "data")

    @property
    def cache_dir(self) -> str:
        p = os.path.join(self.base_dir, "data_cache")
        os.makedirs(p, exist_ok=True)
        return p

    @property
    def models_dir(self) -> str:
        p = os.path.join(self.base_dir, "models_saved")
        os.makedirs(p, exist_ok=True)
        return p


_settings_instance: Optional[Settings] = None


def get_settings() -> Settings:
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance
