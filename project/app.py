"""
AI Stock Insight - Streamlit Application Orchestration.
Integrates services, features, sentiment, model, and backtesting into a clean, 4-page interface.
"""

import streamlit as st
import os
from dotenv import load_dotenv

load_dotenv()

import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from project.services import (
    fetch_historical_prices,
    get_latest_quote,
    fetch_news_articles,
    POPULAR_TICKERS
)
from project.features import (
    compute_technical_indicators,
    prepare_training_dataset,
    extract_latest_features
)
from project.sentiment import analyze_article_batch
from project.model import get_trained_model
from project.backtest import run_walk_forward_backtest

# Set page configuration
st.set_page_config(
    page_title="AI Stock Insight",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom minimal styling
st.markdown("""
<style>
    .main-title {
        font-size: 2.1rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin-bottom: 0.2rem;
    }
    .sub-title {
        font-size: 1.05rem;
        color: #64748b;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        padding: 0.9rem 1.1rem;
        border-radius: 8px;
        border: 1px solid rgba(128, 128, 128, 0.15);
        background: rgba(128, 128, 128, 0.03);
    }
    .signal-box {
        padding: 1.5rem;
        border-radius: 8px;
        text-align: center;
        border: 1px solid rgba(128, 128, 128, 0.2);
        margin: 1.2rem 0;
    }
    .disclaimer-box {
        font-size: 0.82rem;
        color: #94a3b8;
        border-top: 1px solid rgba(128, 128, 128, 0.2);
        padding-top: 1rem;
        margin-top: 2.5rem;
    }
</style>
""", unsafe_allow_html=True)


def main():
    # Header Area
    st.markdown('<div class="main-title">AI STOCK INSIGHT</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Machine-learning based stock analysis and historical backtesting</div>', unsafe_allow_html=True)

    # Search & Input Area
    col_input, col_btn = st.columns([4, 1])
    with col_input:
        ticker = st.text_input(
            "Stock ticker:",
            value="RELIANCE.NS",
            placeholder="e.g. RELIANCE.NS, TCS.NS, AAPL, NVDA",
            label_visibility="visible"
        ).strip().upper()
    with col_btn:
        st.write("")
        st.write("")
        analyze_clicked = st.button("ANALYZE", type="primary", use_container_width=True)

    if not ticker:
        st.info("Please enter a stock ticker to begin analysis.")
        return

    # Fetch Data
    with st.spinner("Fetching market data and computing model signals..."):
        df_hist = fetch_historical_prices(ticker, period="2y")
        if df_hist.empty or len(df_hist) < 30:
            st.error("Insufficient data for reliable analysis.")
            return

        quote = get_latest_quote(ticker, df_hist)
        news_items = fetch_news_articles(ticker)
        sentiment_data = analyze_article_batch(news_items)

        # Technical Indicators & Model Setup
        df_tech = compute_technical_indicators(df_hist)
        X, y, _ = prepare_training_dataset(df_hist, base_sentiment=sentiment_data["overall_sentiment"])
        model = get_trained_model(X, y)
        latest_feat = extract_latest_features(df_hist, sentiment_score=sentiment_data["overall_sentiment"])
        signal_res = model.predict_signal(latest_feat)

    # Market Summary Row directly below Search
    st.write("---")
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.metric(
            label=f"Latest Price ({quote['currency']})",
            value=f"{quote['price']:,}",
            delta=f"{quote['change']:+} ({quote['change_pct']:+.2f}%)"
        )
    with m2:
        st.metric(label="52-Week High", value=f"{quote['high_52w']:,}")
    with m3:
        st.metric(label="52-Week Low", value=f"{quote['low_52w']:,}")
    with m4:
        st.metric(label="Volume", value=f"{quote['volume']:,}")

    # Highlighted AI Model Signal Box
    signal_color = {
        "BUY": "#16a34a",
        "HOLD": "#d97706",
        "SELL": "#dc2626"
    }.get(signal_res["signal"], "#64748b")

    st.markdown(f"""
    <div class="signal-box">
        <div style="font-size: 0.9rem; letter-spacing: 0.05em; color: #64748b; font-weight: 600;">AI MODEL SIGNAL</div>
        <div style="font-size: 2.2rem; font-weight: 800; color: {signal_color}; margin: 0.4rem 0;">{signal_res["signal"]}</div>
        <div style="display: flex; justify-content: center; gap: 2.5rem; font-size: 1rem; font-weight: 500; margin: 0.5rem 0;">
            <span>BUY: <strong style="color: #16a34a;">{int(signal_res['probabilities']['BUY']*100)}%</strong></span>
            <span>HOLD: <strong style="color: #d97706;">{int(signal_res['probabilities']['HOLD']*100)}%</strong></span>
            <span>SELL: <strong style="color: #dc2626;">{int(signal_res['probabilities']['SELL']*100)}%</strong></span>
        </div>
        <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.4rem;">
            Prediction horizon: <strong>{signal_res['prediction_horizon']}</strong> &nbsp;·&nbsp; Model Confidence: <strong>{int(signal_res['confidence']*100)}%</strong>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # 4 Main Pages Tabs
    tab_analysis, tab_charts, tab_backtest, tab_model = st.tabs([
        "1. Analysis",
        "2. Charts",
        "3. Backtest",
        "4. Model"
    ])

    # PAGE 1: ANALYSIS
    with tab_analysis:
        render_analysis_page(quote, df_tech, sentiment_data, signal_res)

    # PAGE 2: CHARTS
    with tab_charts:
        render_charts_page(ticker, df_hist)

    # PAGE 3: BACKTEST
    with tab_backtest:
        render_backtest_page(df_hist)

    # PAGE 4: MODEL
    with tab_model:
        render_model_page(model, signal_res)

    # Educational & Safety Disclaimer
    st.markdown("""
    <div class="disclaimer-box">
        <strong>Educational Disclaimer:</strong> This application is an educational and research-oriented decision-support system.
        Model predictions are probabilistic and should not be treated as guaranteed investment advice.
    </div>
    """, unsafe_allow_html=True)


def render_analysis_page(quote, df_tech, sentiment_data, signal_res):
    st.subheader("Market Overview")
    mo1, mo2, mo3 = st.columns(3)
    with mo1:
        st.write(f"**Asset:** {quote['company_name']} (`{quote['ticker']}`)")
        st.write(f"**Last Close:** {quote['price']} {quote['currency']}")
    with mo2:
        st.write(f"**Daily Change:** {quote['change']:+} ({quote['change_pct']:+.2f}%)")
        st.write(f"**Trading Volume:** {quote['volume']:,} shares")
    with mo3:
        st.write(f"**52-Week Range:** {quote['low_52w']} - {quote['high_52w']} {quote['currency']}")

    st.write("---")
    st.subheader("Technical Analysis")
    latest = df_tech.iloc[-1]
    t1, t2, t3, t4, t5, t6 = st.columns(6)
    with t1:
        st.metric("RSI (14)", f"{latest['RSI']:.1f}")
    with t2:
        st.metric("MACD Hist", f"{latest['MACD_HIST']:.2f}")
    with t3:
        st.metric("EMA 20", f"{latest['EMA20']:.1f}")
    with t4:
        st.metric("EMA 50", f"{latest['EMA50']:.1f}")
    with t5:
        st.metric("EMA 200", f"{latest['EMA200']:.1f}")
    with t6:
        st.metric("Volatility (20d)", f"{latest['VOLATILITY_20']*100:.1f}%")

    st.write("---")
    st.subheader("Sentiment Analysis")
    s1, s2, s3, s4 = st.columns(4)
    with s1:
        st.metric("VADER Compound", f"{sentiment_data['vader_compound']:.2f}")
    with s2:
        st.metric("FinBERT Score", f"{sentiment_data['finbert_score']:.2f}")
    with s3:
        st.metric("News Articles Analyzed", f"{sentiment_data['news_count']}")
    with s4:
        st.metric("Overall Sentiment", sentiment_data['sentiment_label'])

    if sentiment_data["articles_analyzed"]:
        with st.expander("View Analyzed News Headlines"):
            for art in sentiment_data["articles_analyzed"]:
                st.write(f"- **{art['title']}** ({art['publisher']} · {art['date']}) — Net Sentiment: `{art['net_score']}`")

    st.write("---")
    st.subheader("AI Decision Summary")
    st.write(f"Model Signal: **{signal_res['signal']}** (Confidence: {int(signal_res['confidence']*100)}%)")
    st.write("Top feature contributions influencing this output:")
    for feat in signal_res["top_contributions"]:
        direction_icon = "▲ Positive" if feat["direction"] == "POSITIVE" else "▼ Negative"
        st.write(f"· **{feat['feature']}** = `{feat['value']}` (Impact: `{feat['impact']:+}`, {direction_icon})")


def render_charts_page(ticker, df_hist):
    st.subheader(f"Interactive Technical Charts — {ticker}")

    c_ctrl1, c_ctrl2 = st.columns([2, 3])
    with c_ctrl1:
        period_choice = st.selectbox("Historical Range:", ["1M", "3M", "6M", "1Y", "3Y", "5Y", "Max"], index=3)
    with c_ctrl2:
        chart_style = st.radio("Chart Type:", ["Candlestick", "Line"], horizontal=True)

    # Filter dataframe by selected range
    period_days = {"1M": 30, "3M": 90, "6M": 180, "1Y": 365, "3Y": 1095, "5Y": 1825, "Max": 2500}[period_choice]
    df_filtered = df_hist.tail(min(len(df_hist), period_days)).copy()
    df_filtered = compute_technical_indicators(df_filtered)

    # Indicator toggles
    st.write("Overlay Indicators:")
    t_ema20, t_ema50, t_ema200 = st.columns(3)
    show_ema20 = t_ema20.checkbox("Overlay EMA 20", value=True)
    show_ema50 = t_ema50.checkbox("Overlay EMA 50", value=True)
    show_ema200 = t_ema200.checkbox("Overlay EMA 200", value=False)

    # Plot with subplots (Main Price, MACD, RSI, Volume)
    fig = make_subplots(
        rows=4, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.04,
        row_heights=[0.55, 0.15, 0.15, 0.15],
        subplot_titles=("Price & Moving Averages", "Volume", "RSI (14)", "MACD (12, 26, 9)")
    )

    # Main Price Chart
    if chart_style == "Candlestick":
        fig.add_trace(go.Candlestick(
            x=df_filtered.index,
            open=df_filtered["Open"],
            high=df_filtered["High"],
            low=df_filtered["Low"],
            close=df_filtered["Close"],
            name="OHLC"
        ), row=1, col=1)
    else:
        fig.add_trace(go.Scatter(
            x=df_filtered.index, y=df_filtered["Close"],
            mode="lines", name="Close Price", line=dict(color="#2563eb", width=2)
        ), row=1, col=1)

    if show_ema20:
        fig.add_trace(go.Scatter(x=df_filtered.index, y=df_filtered["EMA20"], name="EMA 20", line=dict(color="#f59e0b", width=1.5)), row=1, col=1)
    if show_ema50:
        fig.add_trace(go.Scatter(x=df_filtered.index, y=df_filtered["EMA50"], name="EMA 50", line=dict(color="#10b981", width=1.5)), row=1, col=1)
    if show_ema200:
        fig.add_trace(go.Scatter(x=df_filtered.index, y=df_filtered["EMA200"], name="EMA 200", line=dict(color="#8b5cf6", width=1.5)), row=1, col=1)

    # Volume Chart
    colors = ["#16a34a" if c >= o else "#dc2626" for c, o in zip(df_filtered["Close"], df_filtered["Open"])]
    fig.add_trace(go.Bar(x=df_filtered.index, y=df_filtered["Volume"], name="Volume", marker_color=colors), row=2, col=1)

    # RSI
    fig.add_trace(go.Scatter(x=df_filtered.index, y=df_filtered["RSI"], name="RSI", line=dict(color="#6366f1", width=1.5)), row=3, col=1)
    fig.add_hline(y=70, line_dash="dash", line_color="#dc2626", row=3, col=1)
    fig.add_hline(y=30, line_dash="dash", line_color="#16a34a", row=3, col=1)

    # MACD
    fig.add_trace(go.Scatter(x=df_filtered.index, y=df_filtered["MACD"], name="MACD", line=dict(color="#0284c7", width=1.5)), row=4, col=1)
    fig.add_trace(go.Scatter(x=df_filtered.index, y=df_filtered["MACD_SIGNAL"], name="Signal", line=dict(color="#ea580c", width=1.5)), row=4, col=1)
    fig.add_trace(go.Bar(x=df_filtered.index, y=df_filtered["MACD_HIST"], name="Hist", marker_color="#94a3b8"), row=4, col=1)

    fig.update_layout(height=800, xaxis_rangeslider_visible=False, margin=dict(l=20, r=20, t=30, b=20), hovermode="x unified")
    st.plotly_chart(fig, use_container_width=True)


def render_backtest_page(df_hist):
    st.subheader("Walk-Forward Historical Backtesting")
    st.caption("AI Strategy vs Buy & Hold across chronological test periods (strict zero look-ahead bias).")

    with st.spinner("Simulating walk-forward trade execution..."):
        bt_results = run_walk_forward_backtest(df_hist)

    if "error" in bt_results:
        st.warning(bt_results["error"])
        return

    metrics = bt_results["metrics"]

    # Metric Row
    b1, b2, b3, b4, b5 = st.columns(5)
    with b1:
        st.metric("Cumulative Return", f"{metrics['strategy_return_pct']:+.1f}%", delta=f"{metrics['strategy_return_pct'] - metrics['buy_hold_return_pct']:+.1f}% vs B&H")
    with b2:
        st.metric("Buy & Hold Return", f"{metrics['buy_hold_return_pct']:+.1f}%")
    with b3:
        st.metric("Sharpe Ratio", f"{metrics['sharpe_ratio']:.2f}")
    with b4:
        st.metric("Max Drawdown", f"{metrics['max_drawdown_pct']:.1f}%")
    with b5:
        st.metric("Win Rate", f"{metrics['win_rate_pct']:.1f}% ({metrics['total_trades']} trades)")

    # Equity Curve Plotly Chart
    curve_df = pd.DataFrame(bt_results["equity_curve"])
    if not curve_df.empty:
        fig_equity = go.Figure()
        fig_equity.add_trace(go.Scatter(
            x=curve_df["date"], y=curve_df["strategy"],
            mode="lines", name="AI Strategy Equity", line=dict(color="#16a34a", width=2.5)
        ))
        fig_equity.add_trace(go.Scatter(
            x=curve_df["date"], y=curve_df["buy_hold"],
            mode="lines", name="Buy & Hold Equity", line=dict(color="#64748b", width=1.5, dash="dot")
        ))
        fig_equity.update_layout(
            title="Portfolio Equity Trajectory (Initial: $100,000)",
            yaxis_title="Portfolio Value ($)",
            height=420,
            margin=dict(l=20, r=20, t=40, b=20),
            hovermode="x unified"
        )
        st.plotly_chart(fig_equity, use_container_width=True)

    # Trade Log
    if bt_results["trades"]:
        with st.expander("Recent Backtest Trade Log"):
            trades_df = pd.DataFrame(bt_results["trades"])
            st.dataframe(trades_df, use_container_width=True)


def render_model_page(model, signal_res):
    st.subheader("Model Architecture & Explainability")

    st.write("""
    **Architecture:** Calibrated Gradient Boosting Ensemble (`GradientBoostingClassifier` with Platt Scaling calibration via `CalibratedClassifierCV`).
    The model translates technical indicators and sentiment vectors into verified posterior probabilities for three distinct discrete classes:
    - **BUY (1):** Expected forward 20-day return exceeds +3.0%
    - **HOLD (0):** Expected forward 20-day return within [-3.0%, +3.0%]
    - **SELL (-1):** Expected forward 20-day return falls below -3.0%
    """)

    st.write("---")
    st.subheader("Input Feature Definitions")
    features_info = [
        {"Feature": "RSI (14)", "Category": "Momentum", "Description": "Relative Strength Index measuring velocity of price changes"},
        {"Feature": "MACD_HIST", "Category": "Trend Momentum", "Description": "Histogram divergence between MACD line and 9-day Signal line"},
        {"Feature": "VOLATILITY_20", "Category": "Risk", "Description": "Annualized standard deviation of daily logarithmic returns"},
        {"Feature": "CLOSE_EMA20_RATIO", "Category": "Mean Reversion", "Description": "Percentage distance from the 20-day Exponential Moving Average"},
        {"Feature": "CLOSE_EMA50_RATIO", "Category": "Medium Trend", "Description": "Percentage distance from the 50-day Exponential Moving Average"},
        {"Feature": "CLOSE_EMA200_RATIO", "Category": "Macro Trend", "Description": "Percentage distance from the 200-day Exponential Moving Average"},
        {"Feature": "EMA20_EMA50_DIFF", "Category": "Trend Spread", "Description": "Relative slope difference between short and medium moving averages"},
        {"Feature": "VOLUME_RATIO", "Category": "Liquidity", "Description": "Current volume normalized against 20-day moving average volume"},
        {"Feature": "SENTIMENT_SCORE", "Category": "NLP Sentiment", "Description": "Weighted compound of VADER lexicon score and FinBERT transformer output"}
    ]
    st.dataframe(pd.DataFrame(features_info), use_container_width=True)

    st.write("---")
    st.subheader("Feature Importance & Explainability (SHAP / Tree Attribution)")
    if model.feature_importances_:
        imp_df = pd.DataFrame([
            {"Feature": k, "Importance Weight": v}
            for k, v in model.feature_importances_.items()
        ]).sort_values(by="Importance Weight", ascending=False)
        st.bar_chart(data=imp_df.set_index("Feature"))


if __name__ == "__main__":
    main()
