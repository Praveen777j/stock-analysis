# Explainable AI-Based Stock Analysis & Decision Support System

> **Note**: This directory contains standalone academic Python/Streamlit research code and experiments. It is **not** used by the live production Node.js/React web application.

An enterprise-grade, academic Master of Computer Applications (MCA) research capstone project. Combines dual-engine financial sentiment (NLTK VADER & ProsusAI/finbert), quantitative technical indicators, calibrated machine learning (Logistic Regression, Random Forest, XGBoost), SHAP explainability, and walk-forward backtesting across a multi-exchange stock universe of **9,800+ securities** (NSE India, NASDAQ, NYSE, and AMEX).

---

## 1. Key Capabilities

- **Large Multi-Exchange Stock Universe**: Supports ~9,819 securities across Indian (NSE) and US (NASDAQ/NYSE/AMEX) markets. Fast local search without downloading data for all stocks at startup.
- **Dual-Engine Sentiment Analysis**:
  - **VADER**: Rule-based lexical valence engine for rapid headline and social scoring.
  - **FinBERT**: Deep transformer (`ProsusAI/finbert`) fine-tuned on financial phrasebank corpora for institutional context.
- **Official Reddit OAuth Integration**: Secure OAuth integration querying targeted subreddits (`r/stocks`, `r/investing`, `r/IndianStreetBets`) with graceful `AUTH_REQUIRED` handling when credentials are unconfigured.
- **Technical Indicator Suite**: EMA (20, 50, 200), SMA, RSI (14), MACD (12, 26, 9), Bollinger Bands, ATR, ADX, Momentum, and multi-horizon returns.
- **Strict Leakage Prevention**: Enforces temporal stationarity via `TimeSeriesSplit`, shifts future returns strictly for supervised labeling, and excludes unanchored snapshot fundamentals from historical backtests.
- **Calibrated Probabilistic Signals**: Outputs $P(\text{BUY})$, $P(\text{HOLD})$, $P(\text{SELL})$ via Platt Sigmoid scaling, supported by SHAP tree attribution.
- **Walk-Forward Backtesting**: Portfolio trajectory simulation comparing AI strategy vs. Buy & Hold benchmark with configurable commission and slippage drag.
- **Controlled Batch Market Scanner**: Filter large stock lists by RSI, momentum, moving average alignment, and price in controlled thread-pooled batches.

---

## 2. Directory Structure

```
ai_stock_intelligence/
│
├── app.py                     # Streamlit application entry point
├── requirements.txt           # Dependencies
├── .env.example               # Environment variables template
├── .gitignore                 # Python gitignore
├── README.md                  # System documentation
│
├── config/                    # System settings and paths
├── universe/                  # Large universe manager, search, and updater (~9,819 stocks)
├── data/                      # yfinance, NewsAPI/RSS, Reddit OAuth, fundamentals, benchmarks
├── sentiment/                 # VADER, FinBERT, and composite sentiment pipeline
├── features/                  # Leakage-safe technical, sentiment, and market features
├── models/                    # Train, calibrate, predict, ensemble, and registry
├── backtesting/               # Walk-forward simulation, metrics, and transaction costs
├── explainability/            # SHAP explainability and tree attribution
├── scanner/                   # Batch market scanner with rate limiting
├── ui/                        # 10-tab Streamlit dashboard and Plotly charts
├── docs/                      # Architecture, methodology, backtesting, and 32 MCA viva Q&A
└── tests/                     # Test suites for universe, data, features, models, backtest
```

---

## 3. Quick Start Guide

### Step 1: Install Dependencies
```bash
cd ai_stock_intelligence
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Configure Environment (Optional)
```bash
cp .env.example .env
# Edit .env with Reddit API or NewsAPI credentials if available
```

### Step 3: Run Unit Tests
```bash
python3 -m unittest discover tests
```

### Step 4: Launch Streamlit Dashboard
```bash
streamlit run app.py
```

---

## 4. Educational & Research Disclaimer

*This application is an educational and research-oriented decision-support system. Model predictions are probabilistic and should not be treated as guaranteed investment advice. Financial markets are subject to risks, volatility, and regime shifts.*
