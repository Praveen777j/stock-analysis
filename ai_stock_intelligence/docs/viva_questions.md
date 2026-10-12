# Master of Computer Applications (MCA) Viva Voce: 32 Technical Q&A

### 1. What is the fundamental objective of this project?
To build an explainable, leakage-safe machine learning decision-support system for stock analysis combining technical indicators, dual-pipeline financial sentiment (VADER + FinBERT), calibrated probabilistic classification (BUY/HOLD/SELL), and walk-forward backtesting. It explicitly rejects false claims of guaranteed market prediction.

### 2. Why does the system output probabilities rather than hard deterministic BUY/SELL commands?
Financial markets are stochastic and non-stationary. Probability calibration (via Platt Sigmoid scaling) ensures that model confidence corresponds to true empirical frequencies, allowing risk-adjusted capital allocation rather than overconfident binary betting.

### 3. What is look-ahead bias (data leakage) in financial machine learning?
Data leakage occurs when information from the future (e.g. future returns, future moving average calculations, or post-event news) is inadvertently fed into model training or feature calculation at time $t$.

### 4. How does this system strictly prevent look-ahead bias?
1. All technical indicators at bar $t$ use only bars $i \le t$.
2. Forward returns ($Close_{t+20} / Close_t - 1$) are shifted backwards solely for target labeling during training.
3. The trailing 20 bars are pruned from training because their future is unknown.
4. Backtesting makes decisions on bar $t-1$ to execute on bar $t$.
5. Standard K-Fold cross validation is banned; strictly temporal `TimeSeriesSplit` is enforced.

### 5. Why is standard K-Fold Cross Validation invalid for stock market time-series?
Standard K-Fold randomly shuffles data points, placing future prices in the training set to predict past prices in the test set. This creates artificial autocorrelation leakage and inflates model accuracy without real predictive power.

### 6. What is Walk-Forward Validation?
An expanding or rolling window validation technique where the model is trained on historical data up to time $T$, evaluated on $T+1$, and then rolled forward, exactly replicating real-world sequential trading.

### 7. What is VADER and how does it work?
VADER (Valence Aware Dictionary and sEntiment Reasoner) is a rule-based lexicon sentiment analyzer tuned for microblog and text sentiment. It sums valence scores of tokens, applies grammatical heuristics (punctuation, capitalization, negation, degree adverbs), and normalizes via compound scores between -1.0 and +1.0.

### 8. What is FinBERT and why is it superior for financial text?
FinBERT is a BERT transformer language model fine-tuned on financial corpora (Financial PhraseBank and corporate filings). Unlike generic models that misinterpret terms like "liability", "expense", or "cost reduction", FinBERT accurately models financial semantics and outputs calibrated probabilities for positive, neutral, and negative sentiment.

### 9. Why combine both VADER and FinBERT?
VADER provides lightning-fast rule-based baseline scoring without heavy compute overhead. FinBERT provides deep contextual transformer understanding for complex, nuanced corporate disclosures. Blending both yields optimal speed and semantic depth.

### 10. How is Reddit data fetched and integrated?
Via the official Reddit OAuth API (`/api/v1/access_token` and `oauth.reddit.com`) using registered client credentials. When unconfigured, it gracefully reports `AUTH_REQUIRED` without crashing.

### 11. What is Platt Scaling (Probability Calibration)?
A post-processing method where a logistic sigmoid transformation is fitted onto the raw model decision margins ($z$ or decision function) using cross-validation to ensure $P(y=1|z)$ represents calibrated empirical probabilities.

### 12. What are the three target classes and how are they defined?
Over a 20-trading-day horizon:
- **BUY (+1)**: Forward return $> +5.0\%$
- **HOLD (0)**: Forward return between $-5.0\%$ and $+5.0\%$
- **SELL (-1)**: Forward return $< -5.0\%$

### 13. What is SHAP (SHapley Additive exPlanations)?
A game-theoretic framework that explains individual model predictions by calculating the marginal contribution of each feature across all possible feature subsets. It satisfies properties of local accuracy, missingness, and consistency.

### 14. What are the key technical indicators implemented?
- Trend: SMA (20, 50, 200), EMA (20, 50, 200), EMA Spreads
- Momentum: RSI (14), MACD (12, 26, 9), ROC (10), Momentum (10)
- Volatility: Bollinger Bands (20, 2), ATR (14), 20-day Annualized Volatility
- Trend Strength: ADX (14)
- Volume: Volume SMA20, Volume Ratio

### 15. How is RSI (Relative Strength Index) computed?
By smoothing price changes over 14 bars using Wilder's exponential smoothing:
$RS = \frac{\text{Average Gain}}{\text{Average Loss}}$, $\text{RSI} = 100 - \frac{100}{1 + RS}$.

### 16. How is MACD (Moving Average Convergence Divergence) calculated?
- $\text{MACD Line} = \text{EMA}_{12}(\text{Close}) - \text{EMA}_{26}(\text{Close})$
- $\text{Signal Line} = \text{EMA}_{9}(\text{MACD Line})$
- $\text{MACD Histogram} = \text{MACD Line} - \text{Signal Line}$

### 17. How is annualized volatility calculated from daily prices?
$\sigma_{\text{ann}} = \text{std}(\text{daily returns}) \times \sqrt{252}$ (accounting for 252 annual trading days).

### 18. What is the Sharpe Ratio and what is its formula?
The Sharpe ratio measures risk-adjusted excess return per unit of total risk:
$\text{Sharpe} = \frac{R_p - R_f}{\sigma_p}$, where $R_p$ is annualized portfolio return, $R_f$ is risk-free rate (5.0%), and $\sigma_p$ is annualized volatility.

### 19. What is Maximum Drawdown (MDD)?
The maximum observed percentage loss from a portfolio's historical peak to its subsequent trough before a new peak is achieved:
$\text{Drawdown}_t = \frac{\text{Equity}_t - \max_{0 \le \tau \le t}(\text{Equity}_\tau)}{\max_{0 \le \tau \le t}(\text{Equity}_\tau)}$.

### 20. What is CAGR (Compound Annual Growth Rate)?
$\text{CAGR} = \left(\frac{\text{Final Equity}}{\text{Initial Capital}}\right)^{1 / \text{Years}} - 1$.

### 21. How are transaction costs and slippage handled in backtesting?
Each trade execution is penalized by commissions (default 10 bps / 0.10%) and execution slippage (default 5 bps / 0.05%), reflecting real-world market friction.

### 22. What is Buy & Hold and why is it the essential benchmark?
Buy & Hold represents purchasing the underlying asset on day 1 and holding throughout the testing period. An active algorithmic strategy must demonstrate superior risk-adjusted return (Sharpe) or lower drawdown to justify active trading costs.

### 23. Why are point-in-time fundamentals excluded from historical backtesting in this project?
Financial ratios obtained today from yfinance snapshot APIs (e.g. current P/E or Debt/Equity) reflect recent quarterly earnings. Using them on prices from 2021 would introduce severe retrospective look-ahead leakage.

### 24. How is the large stock universe managed without crashing local memory?
The universe manager maintains metadata (ticker, exchange, country, sector) for ~9,819 securities in memory/disk CSV. On-demand retrieval fetches market data only when a specific stock or batch is queried.

### 25. How does the Market Scanner prevent network bottlenecks?
Through a controlled `BatchProcessor` that groups queries into small chunks (20-50 stocks), utilizes thread pools, enforces rate-limiting timeouts, and handles single-stock failures gracefully without aborting the entire scan.

### 26. What machine learning algorithms are compared?
1. Logistic Regression (Linear baseline with $L_2$ regularization)
2. Random Forest Classifier (Bagged ensemble of decision trees)
3. XGBoost / Gradient Boosting (Sequential gradient boosted decision trees)

### 27. What is the difference between classification accuracy and trading performance?
High classification accuracy does not guarantee algorithmic profitability. A model might be 60% accurate on minor price fluctuations but suffer large losses on false signals during market regime shifts or high volatility.

### 28. What is Profit Factor in trading systems?
The ratio of gross profits to gross losses:
$\text{Profit Factor} = \frac{\sum \text{Winning Trades}}{\sum |\text{Losing Trades}|}$. A value $> 1.0$ indicates a profitable system.

### 29. What is Calmar Ratio?
The ratio of annualized return (CAGR) to maximum drawdown: $\text{Calmar} = \frac{\text{CAGR}}{|\text{Max Drawdown}|}$.

### 30. How does the signal engine handle uncertainty?
If the maximum calibrated probability is below a threshold (e.g. $< 38\%$) or the difference between BUY and SELL is negligible, it outputs `HOLD / LOW CONFIDENCE` rather than forcing an unwarranted trade.

### 31. What are the limitations of technical and sentiment signals?
Non-stationarity, regime shifts, macroeconomic shocks, algorithmic liquidity drops, and unforeseen geopolitical events cannot be completely forecasted from past prices or historical news.

### 32. What is the academic integrity guarantee of this system?
No financial metrics, backtest returns, stock prices, or probabilities are ever fabricated. Missing data is reported explicitly as "Data unavailable" or "Insufficient data for reliable analysis."
