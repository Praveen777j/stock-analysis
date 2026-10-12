# Machine Learning Pipeline & Explainability

## 1. Feature Space
- **Oscillators & Momentum**: RSI(14), MACD(12,26,9), MACD Histogram, ROC(10), Momentum(10)
- **Trend & Averages**: SMA(20,50,200), EMA(20,50,200), EMA20/EMA50 Spread, Distance from EMA200
- **Volatility & Dispersion**: Bollinger Bands (20,2), ATR(14), 20-day Annualized Volatility
- **Volume**: Volume SMA20, Volume Ratio
- **Sentiment & Macro**: 1D, 7D, 30D Sentiment Momentum, FinBERT Net Score, Benchmark Index Returns

## 2. Models Compared
- Logistic Regression (Regularized baseline)
- Random Forest (Bagged decision trees)
- XGBoost / Gradient Boosting (Sequential gradient boosted decision trees)

## 3. SHAP Explainability
Local and global attributions are computed via `TreeExplainer`, satisfying additive efficiency and missingness axioms.
