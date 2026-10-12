# AI Stock Insight

**Explainable AI-Based Stock Analysis and Decision Support System Using Financial Sentiment, Technical Indicators, and Machine Learning**

An academic MCA project demonstrating a leakage-safe, explainable machine-learning decision support system. The system combines financial news sentiment (VADER + FinBERT), technical indicators, and a calibrated gradient boosting ensemble to generate BUY / HOLD / SELL classifications evaluated through historical walk-forward backtesting.

---

## 1. Key Principles & Academic Methodology

1. **Decision-Support Orientation**: The system does NOT claim guaranteed market predictions or guaranteed profits. Predictions are calibrated class probabilities (`BUY`, `HOLD`, `SELL`) over a 20-trading-day horizon.
2. **Zero Look-Ahead Bias & Leakage Prevention**:
   - Technical indicators strictly use historical `t <= current_bar` information.
   - Forward returns are shifted backward solely for target labeling during training.
   - Walk-forward backtesting executes trades only using data available up to bar `t-1`.
3. **Dual-Engine Financial Sentiment**:
   - **VADER**: Rule-based lexical analyzer calibrated for financial syntax.
   - **FinBERT**: Pre-trained financial domain transformer (`ProsusAI/finbert`) for nuanced institutional context.
4. **Model Explainability**:
   - Post-hoc tree attribution and SHAP (SHapley Additive exPlanations) values quantifying the exact contribution of each technical and sentiment feature to the model's signal.

---

## 2. Project Architecture

```
project/
│
├── app.py              # Streamlit UI & application orchestration (max 4 pages)
├── services.py         # Market data (yfinance) and news retrieval with caching
├── features.py         # Technical indicator pipeline (EMA, RSI, MACD, Volatility)
├── sentiment.py        # VADER & FinBERT sentiment analysis pipelines
├── model.py            # Calibrated ML ensemble, SHAP explainability & inference
├── backtest.py         # Walk-forward backtesting engine & financial performance metrics
│
├── models/
│   └── trained_model.pkl # Serialized calibrated model
│
├── tests/
│   └── test_core.py    # Unit tests for features, sentiment, model, and backtest
│
├── requirements.txt    # Python dependencies
├── .env.example        # Environment variable template
└── README.md           # Project documentation
```

---

## 3. Four Core Interface Pages

1. **Analysis**:
   - **Market Overview**: Current Price, Daily Change, 52-Week High/Low, Volume
   - **Technical Analysis**: RSI(14), MACD Histogram, EMA20, EMA50, EMA200, Volatility(20d)
   - **Sentiment Analysis**: VADER compound score, FinBERT score, News count, Overall sentiment
   - **AI Signal**: Signal (BUY/HOLD/SELL), Calibrated Probabilities, Top Feature Contributions
2. **Charts**:
   - Timeframes: 1M, 3M, 6M, 1Y, 3Y, 5Y, Max
   - Candlestick / Line chart toggle
   - Moving average overlays (EMA 20, 50, 200)
   - Separate panels for Volume, RSI, and MACD
3. **Backtest**:
   - Walk-forward historical backtesting (Strategy vs Buy & Hold)
   - Real performance metrics: Cumulative Return, Annualized Return, Sharpe Ratio, Max Drawdown, Win Rate, Total Trades
   - Interactive Portfolio Equity Curve
   - Trade execution log
4. **Model**:
   - Model architecture specifications (Gradient Boosting + Platt Sigmoid Calibration)
   - Feature catalog & definitions
   - Feature importance & attribution weights
   - Educational & Risk Disclaimer

---

## 4. How to Run Locally

### Prerequisites
Python 3.10 or 3.11 recommended.

```bash
# Clone or navigate to the project directory
cd project

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run unit tests
python -m unittest tests/test_core.py

# Launch Streamlit application
streamlit run app.py
```

---

## 5. Educational Disclaimer

*This application is an educational and research-oriented decision-support system. Model predictions are probabilistic and should not be treated as guaranteed investment advice.*
