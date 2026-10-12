# Testing Protocol & Validation Suite

The system includes unit and integration tests across 5 core suites:
1. `tests/test_universe.py`: Universe loading, deduplication, search speed, and symbol normalization.
2. `tests/test_data.py`: OHLCV validation, mock news retrieval, and Reddit OAuth status handling.
3. `tests/test_features.py`: Technical indicator mathematical precision and zero look-ahead bias validation.
4. `tests/test_models.py`: Model pipeline training, Platt probability calibration, and inference schemas.
5. `tests/test_backtesting.py`: Walk-forward simulation, transaction cost friction, and Sharpe ratio correctness.
