"""Data layer package initialization."""
from .market_data import MarketDataProvider, get_market_data_provider
from .news_data import NewsProvider, get_news_provider
from .reddit_data import RedditClient, RedditStatus, get_reddit_client
from .fundamentals import fetch_stock_fundamentals
from .sector_data import MarketSectorProvider, get_sector_provider
from .cache import SimpleDiskCache
from .validation import validate_market_dataframe

__all__ = [
    "MarketDataProvider",
    "get_market_data_provider",
    "NewsProvider",
    "get_news_provider",
    "RedditClient",
    "RedditStatus",
    "get_reddit_client",
    "fetch_stock_fundamentals",
    "MarketSectorProvider",
    "get_sector_provider",
    "SimpleDiskCache",
    "validate_market_dataframe"
]
