# System Architecture

## 1. High-Level Modular Design

The Explainable AI-Based Stock Analysis & Decision Support System is structured into isolated, decoupled components:

```
STOCK UNIVERSE (~9,819 NSE / US Securities)
        ↓
FAST LOCAL SEARCH / SCANNER (Sub-millisecond query)
        ↓
ON-DEMAND DATA RETRIEVAL (yfinance OHLCV + NewsAPI/Google News + Reddit OAuth)
        ↓
DUAL-PIPELINE SENTIMENT (NLTK VADER + ProsusAI/finbert)
        ↓
TECHNICAL INDICATOR SUITE (EMA, RSI, MACD, Bollinger Bands, ATR, ADX)
        ↓
LEAKAGE-SAFE SUPERVISED DATASET (TimeSeriesSplit, Strict Causality)
        ↓
CALIBRATED ML ENSEMBLE (Random Forest, XGBoost, Logistic Regression)
        ↓
DECISION SIGNAL ENGINE (BUY / HOLD / SELL Probabilities with Risk Filtering)
        ↓
SHAP EXPLAINABILITY (Tree Attribution Values per Trade Factor)
        ↓
WALK-FORWARD BACKTESTING (Strategy vs Buy & Hold + Transaction Costs)
        ↓
STREAMLIT 10-TAB ANALYTICS DASHBOARD
```

## 2. Directory Layout & Module Responsibilities

- **`universe/`**: Manages discovery, deduplication, search, and catalog updating for 9,800+ symbols.
- **`data/`**: Ingestion from yfinance, Google News RSS, and Reddit OAuth with local TTL caching.
- **`sentiment/`**: VADER rule-based scoring and FinBERT deep transformer inference.
- **`features/`**: Leakage-free technical indicator transformations and forward-looking target generation.
- **`models/`**: Pipeline training with Platt Sigmoid calibration and cross-model comparison.
- **`backtesting/`**: Chronological walk-forward portfolio simulation with commission and slippage drag.
- **`scanner/`**: Controlled batch processor for multi-stock universe filtering.
- **`explainability/`**: SHAP feature attribution.
- **`ui/`**: 10-tab Streamlit interface with responsive Plotly visualizations.
