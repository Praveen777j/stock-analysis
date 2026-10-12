# Walk-Forward Backtesting Framework

## 1. Execution Simulation Rules
- **Decision Timestamp**: All trades enter or exit strictly on bar $t$ using indicator states observed at $t-1$.
- **Transaction Costs**: Default 10 bps (0.10%) commission plus 5 bps (0.05%) execution slippage.
- **Capital Modeling**: Mark-to-market daily portfolio equity starting at ₹100,000 / $100,000.

## 2. Evaluation Metrics
- Cumulative Return vs Buy & Hold Benchmark
- Compound Annual Growth Rate (CAGR)
- Annualized Volatility ($\sigma_{\text{ann}} = \text{std} \times \sqrt{252}$)
- Sharpe Ratio ($\text{Rf} = 5.0\%$)
- Maximum Drawdown (peak-to-trough drop)
- Calmar Ratio (CAGR / Max Drawdown)
- Win Rate and Profit Factor ($\sum \text{Gains} / \sum \text{Losses}$)
