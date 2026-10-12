"""
Financial quantitative performance metrics calculation.
"""

from typing import Dict, Any, List
import numpy as np
import pandas as pd


def compute_performance_metrics(
    equity_series: List[float],
    benchmark_series: List[float],
    trade_returns: List[float],
    initial_capital: float = 100000.0,
    risk_free_rate: float = 0.05
) -> Dict[str, Any]:
    """
    Computes rigorous quantitative metrics:
    Total Return, CAGR, Annualized Volatility, Sharpe, Max Drawdown, Calmar, Win Rate, Profit Factor.
    """
    if len(equity_series) < 2:
        return {}

    final_strat = equity_series[-1]
    final_bh = benchmark_series[-1]

    total_return = (final_strat / initial_capital) - 1.0
    bh_total_return = (final_bh / initial_capital) - 1.0

    days = len(equity_series)
    years = max(0.1, days / 252.0)

    strat_cagr = ((1 + total_return) ** (1 / years)) - 1.0 if total_return > -1.0 else -1.0
    bh_cagr = ((1 + bh_total_return) ** (1 / years)) - 1.0 if bh_total_return > -1.0 else -1.0

    # Daily returns for Sharpe and Volatility
    eq_s = pd.Series(equity_series)
    daily_rets = eq_s.pct_change().dropna()
    mean_daily = daily_rets.mean()
    std_daily = daily_rets.std()

    ann_vol = float(std_daily * np.sqrt(252)) if std_daily > 1e-6 else 0.0
    sharpe = float((mean_daily * 252 - risk_free_rate) / (std_daily * np.sqrt(252))) if std_daily > 1e-6 else 0.0

    # Sortino ratio: penalizes downside volatility only
    downside_rets = daily_rets[daily_rets < 0]
    downside_std = downside_rets.std() if len(downside_rets) > 1 else std_daily
    sortino = float((mean_daily * 252 - risk_free_rate) / (downside_std * np.sqrt(252))) if (downside_std and downside_std > 1e-6) else 0.0

    # Drawdown
    cum_max = eq_s.cummax()
    drawdowns = (eq_s - cum_max) / cum_max
    max_dd = float(drawdowns.min())

    bh_s = pd.Series(benchmark_series)
    bh_cum_max = bh_s.cummax()
    bh_drawdowns = (bh_s - bh_cum_max) / bh_cum_max
    bh_max_dd = float(bh_drawdowns.min())

    calmar = float(strat_cagr / abs(max_dd)) if abs(max_dd) > 1e-4 else 0.0

    # Trade stats
    n_trades = len(trade_returns)
    winning = [r for r in trade_returns if r > 0]
    losing = [r for r in trade_returns if r <= 0]
    win_rate = (len(winning) / n_trades * 100) if n_trades > 0 else 0.0

    gross_gains = sum(winning)
    gross_losses = abs(sum(losing))
    profit_factor = round(gross_gains / gross_losses, 2) if gross_losses > 1e-6 else 99.0

    avg_trade = float(np.mean(trade_returns)) * 100 if n_trades > 0 else 0.0
    best_trade = float(max(trade_returns)) * 100 if n_trades > 0 else 0.0
    worst_trade = float(min(trade_returns)) * 100 if n_trades > 0 else 0.0

    return {
        "strategy_total_return_pct": round(total_return * 100, 2),
        "buy_hold_total_return_pct": round(bh_total_return * 100, 2),
        "strategy_cagr_pct": round(strat_cagr * 100, 2),
        "buy_hold_cagr_pct": round(bh_cagr * 100, 2),
        "annualized_volatility_pct": round(ann_vol * 100, 2),
        "sharpe_ratio": round(sharpe, 2),
        "sortino_ratio": round(sortino, 2),
        "max_drawdown_pct": round(max_dd * 100, 2),
        "buy_hold_max_drawdown_pct": round(bh_max_dd * 100, 2),
        "calmar_ratio": round(calmar, 2),
        "total_trades": n_trades,
        "win_rate_pct": round(win_rate, 1),
        "profit_factor": profit_factor,
        "average_trade_pct": round(avg_trade, 2),
        "best_trade_pct": round(best_trade, 2),
        "worst_trade_pct": round(worst_trade, 2),
        "initial_capital": initial_capital,
        "final_capital": round(final_strat, 2)
    }
