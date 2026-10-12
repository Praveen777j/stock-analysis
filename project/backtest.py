"""
Historical walk-forward backtesting engine comparing AI Strategy against Buy & Hold.
Evaluates empirical performance without look-ahead bias and calculates real financial metrics.
"""

from typing import Dict, Any, List
import numpy as np
import pandas as pd
from project.features import compute_technical_indicators, FEATURE_COLUMNS


def run_walk_forward_backtest(
    df: pd.DataFrame,
    initial_capital: float = 100000.0,
    transaction_cost: float = 0.001,  # 0.1% per trade
    risk_free_rate: float = 0.05      # 5% annual risk-free rate
) -> Dict[str, Any]:
    """
    Executes a walk-forward backtest across historical price series.
    Returns cumulative return, Sharpe ratio, max drawdown, win rate, trade list,
    and daily equity curves for both AI Strategy and Buy & Hold.
    """
    if len(df) < 60:
        return {
            "error": "Insufficient data for reliable backtest analysis. Minimum 60 trading bars required.",
            "metrics": {},
            "equity_curve": [],
            "trades": []
        }

    data = compute_technical_indicators(df).dropna(subset=["EMA50", "RSI", "MACD_HIST"]).copy()
    n = len(data)

    if n < 30:
        return {
            "error": "Insufficient valid data after indicator initialization.",
            "metrics": {},
            "equity_curve": [],
            "trades": []
        }

    # Simulate Walk-Forward Strategy:
    # Rule: Combine momentum, trend filter (EMA20 vs EMA50), RSI, and MACD
    prices = data["Close"].values
    dates = data.index
    rsi = data["RSI"].values
    macd_hist = data["MACD_HIST"].values
    ema20 = data["EMA20"].values
    ema50 = data["EMA50"].values

    strategy_equity = [initial_capital]
    buy_hold_equity = [initial_capital]

    position = 0  # 0 = Cash, 1 = Long
    cash = initial_capital
    shares = 0
    trades = []
    entry_price = 0.0
    entry_date = None

    for i in range(1, n):
        curr_price = prices[i]
        curr_date = dates[i].strftime("%Y-%m-%d")

        # Walk-forward decision using only information available up to bar i-1 (strictly no look-ahead)
        prev_rsi = rsi[i-1]
        prev_hist = macd_hist[i-1]
        prev_trend = (ema20[i-1] > ema50[i-1])

        # Signal logic:
        # BUY when trend is positive, MACD accelerating or RSI turning up from oversold
        should_buy = prev_trend and (prev_rsi < 65) and (prev_hist > 0 or prev_rsi < 40)
        # SELL when trend reverses or RSI becomes heavily overbought with weakening momentum
        should_sell = (not prev_trend and prev_hist < 0) or (prev_rsi > 78)

        # Execute trades on bar i open/close
        if position == 0 and should_buy:
            # Enter Long
            cost = curr_price * (1 + transaction_cost)
            shares = cash / cost
            cash = 0.0
            position = 1
            entry_price = curr_price
            entry_date = curr_date

        elif position == 1 and should_sell:
            # Exit Long to Cash
            revenue = shares * curr_price * (1 - transaction_cost)
            trade_return = (curr_price / entry_price) - 1.0 - (2 * transaction_cost)
            if entry_date and curr_date and entry_date != curr_date:
                trades.append({
                    "entry_date": entry_date,
                    "exit_date": curr_date,
                    "entry_price": round(entry_price, 2),
                    "exit_price": round(curr_price, 2),
                    "return_pct": round(trade_return * 100, 2),
                    "won": trade_return > 0
                })
            cash = revenue
            shares = 0
            position = 0

        # Mark-to-market daily equity
        curr_val = cash + (shares * curr_price if position == 1 else 0.0)
        strategy_equity.append(curr_val)

        # Buy & Hold equity (fully invested from bar 0)
        bh_val = initial_capital * (curr_price / prices[0])
        buy_hold_equity.append(bh_val)

    # Close any open trade at the end for performance accounting (ensure non-duplicate)
    last_date_str = dates[-1].strftime("%Y-%m-%d")
    if position == 1 and entry_date and entry_date != last_date_str:
        final_price = prices[-1]
        trade_return = (final_price / entry_price) - 1.0 - transaction_cost
        trades.append({
            "entry_date": entry_date,
            "exit_date": last_date_str,
            "entry_price": round(entry_price, 2),
            "exit_price": round(final_price, 2),
            "return_pct": round(trade_return * 100, 2),
            "won": trade_return > 0
        })

    # Strict de-duplication: Ensure no duplicate orders or degenerate results
    clean_trades = []
    seen_trades = set()
    for tr in trades:
        if not tr["entry_date"] or not tr["exit_date"] or tr["entry_date"] == tr["exit_date"]:
            continue
        key = (tr["entry_date"], tr["exit_date"], tr["entry_price"], tr["exit_price"])
        if key not in seen_trades:
            seen_trades.add(key)
            clean_trades.append(tr)
    trades = clean_trades

    # Performance metrics computation
    strat_final = strategy_equity[-1]
    strat_ret = (strat_final / initial_capital) - 1.0
    bh_ret = (buy_hold_equity[-1] / initial_capital) - 1.0

    trading_days = len(strategy_equity)
    years = max(trading_days / 252.0, 0.2)

    strat_cagr = ((1 + strat_ret) ** (1 / years)) - 1.0 if strat_ret > -1.0 else -1.0
    bh_cagr = ((1 + bh_ret) ** (1 / years)) - 1.0 if bh_ret > -1.0 else -1.0

    # Daily returns for Sharpe Ratio
    s_eq_series = pd.Series(strategy_equity)
    strat_daily_rets = s_eq_series.pct_change().dropna()
    mean_d = strat_daily_rets.mean()
    std_d = strat_daily_rets.std()

    if std_d > 1e-6:
        sharpe = (mean_d * 252 - risk_free_rate) / (std_d * np.sqrt(252))
    else:
        sharpe = 0.0

    # Maximum Drawdown calculation
    cum_max = s_eq_series.cummax()
    drawdowns = (s_eq_series - cum_max) / cum_max
    max_dd = float(drawdowns.min())

    bh_series = pd.Series(buy_hold_equity)
    bh_cum_max = bh_series.cummax()
    bh_max_dd = float(((bh_series - bh_cum_max) / bh_cum_max).min())

    # Win rate
    total_trades = len(trades)
    winning_trades = sum(1 for t in trades if t["won"])
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0.0

    # Equity curve formatted for charts
    equity_curve = []
    step = max(1, len(strategy_equity) // 120)  # Resample for fast responsive rendering
    for i in range(0, len(strategy_equity), step):
        idx = min(i, len(data.index) - 1)
        equity_curve.append({
            "date": data.index[idx].strftime("%Y-%m-%d"),
            "strategy": round(strategy_equity[i], 2),
            "buy_hold": round(buy_hold_equity[i], 2)
        })

    return {
        "metrics": {
            "strategy_return_pct": round(strat_ret * 100, 2),
            "buy_hold_return_pct": round(bh_ret * 100, 2),
            "strategy_cagr_pct": round(strat_cagr * 100, 2),
            "buy_hold_cagr_pct": round(bh_cagr * 100, 2),
            "sharpe_ratio": round(float(sharpe), 2),
            "max_drawdown_pct": round(max_dd * 100, 2),
            "buy_hold_max_dd_pct": round(bh_max_dd * 100, 2),
            "win_rate_pct": round(win_rate, 1),
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "initial_capital": initial_capital,
            "final_capital": round(strat_final, 2)
        },
        "equity_curve": equity_curve,
        "trades": trades[-10:]  # Last 10 trades for display
    }
