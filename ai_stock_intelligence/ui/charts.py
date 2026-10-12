"""
Plotly charting module for price candlestick, technical indicators, and backtest equity trajectories.
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def plot_price_and_indicators(
    df: pd.DataFrame,
    show_ema20: bool = True,
    show_ema50: bool = True,
    show_ema200: bool = True,
    show_bb: bool = False,
    chart_type: str = "Candlestick"
) -> go.Figure:
    """Creates interactive Plotly multi-panel chart: Price & EMAs, Volume, RSI, MACD."""
    fig = make_subplots(
        rows=4, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.03,
        row_heights=[0.55, 0.15, 0.15, 0.15],
        subplot_titles=("Price & Overlays", "Volume", "RSI (14)", "MACD (12, 26, 9)")
    )

    # 1. Price
    if chart_type == "Candlestick":
        fig.add_trace(go.Candlestick(
            x=df.index, open=df["Open"], high=df["High"], low=df["Low"], close=df["Close"],
            name="OHLC"
        ), row=1, col=1)
    else:
        fig.add_trace(go.Scatter(
            x=df.index, y=df["Close"], mode="lines", name="Close",
            line=dict(color="#38bdf8", width=2)
        ), row=1, col=1)

    if show_ema20 and "EMA20" in df.columns:
        fig.add_trace(go.Scatter(x=df.index, y=df["EMA20"], name="EMA 20", line=dict(color="#f59e0b", width=1.5)), row=1, col=1)
    if show_ema50 and "EMA50" in df.columns:
        fig.add_trace(go.Scatter(x=df.index, y=df["EMA50"], name="EMA 50", line=dict(color="#10b981", width=1.5)), row=1, col=1)
    if show_ema200 and "EMA200" in df.columns:
        fig.add_trace(go.Scatter(x=df.index, y=df["EMA200"], name="EMA 200", line=dict(color="#a855f7", width=1.5)), row=1, col=1)

    if show_bb and "BB_UPPER" in df.columns:
        fig.add_trace(go.Scatter(x=df.index, y=df["BB_UPPER"], name="BB Upper", line=dict(color="#64748b", width=1, dash="dot")), row=1, col=1)
        fig.add_trace(go.Scatter(x=df.index, y=df["BB_LOWER"], name="BB Lower", line=dict(color="#64748b", width=1, dash="dot")), row=1, col=1)

    # 2. Volume
    colors = ["#10b981" if c >= o else "#ef4444" for c, o in zip(df["Close"], df["Open"])]
    fig.add_trace(go.Bar(x=df.index, y=df["Volume"], name="Volume", marker_color=colors), row=2, col=1)

    # 3. RSI
    if "RSI" in df.columns:
        fig.add_trace(go.Scatter(x=df.index, y=df["RSI"], name="RSI", line=dict(color="#6366f1", width=1.5)), row=3, col=1)
        fig.add_hline(y=70, line_dash="dash", line_color="#ef4444", row=3, col=1)
        fig.add_hline(y=30, line_dash="dash", line_color="#10b981", row=3, col=1)

    # 4. MACD
    if "MACD" in df.columns:
        fig.add_trace(go.Scatter(x=df.index, y=df["MACD"], name="MACD", line=dict(color="#0284c7", width=1.5)), row=4, col=1)
        fig.add_trace(go.Scatter(x=df.index, y=df["MACD_SIGNAL"], name="Signal", line=dict(color="#ea580c", width=1.5)), row=4, col=1)
        fig.add_trace(go.Bar(x=df.index, y=df["MACD_HIST"], name="Hist", marker_color="#94a3b8"), row=4, col=1)

    fig.update_layout(
        height=850,
        xaxis_rangeslider_visible=False,
        margin=dict(l=20, r=20, t=30, b=20),
        hovermode="x unified",
        template="plotly_dark"
    )
    return fig


def plot_backtest_equity(curve_points: List[Dict[str, Any]], initial_capital: float = 100000.0) -> go.Figure:
    """Plots strategy equity trajectory vs Buy & Hold benchmark."""
    fig = go.Figure()
    if not curve_points:
        return fig

    dates = [p["date"] for p in curve_points]
    strat = [p["strategy"] for p in curve_points]
    bh = [p["buy_hold"] for p in curve_points]

    fig.add_trace(go.Scatter(
        x=dates, y=strat, mode="lines", name="AI Strategy Equity",
        line=dict(color="#10b981", width=2.5)
    ))
    fig.add_trace(go.Scatter(
        x=dates, y=bh, mode="lines", name="Buy & Hold Equity",
        line=dict(color="#94a3b8", width=1.5, dash="dash")
    ))

    fig.update_layout(
        title=f"Walk-Forward Portfolio Equity Trajectory (Base: ${initial_capital:,.0f})",
        yaxis_title="Portfolio Value ($)",
        height=450,
        margin=dict(l=20, r=20, t=40, b=20),
        hovermode="x unified",
        template="plotly_dark"
    )
    return fig
