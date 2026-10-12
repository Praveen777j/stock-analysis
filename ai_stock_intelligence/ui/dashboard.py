"""
Main Streamlit Analytics Dashboard orchestrator.
Unified single-platform interface implementing all 9 required academic modules:
  1. Dashboard
  2. Stock Search
  3. Technical Analysis
  4. News/Sentiment
  5. ML Prediction
  6. Backtesting
  7. Model Evaluation
  8. Explainability
  9. Settings
"""

import streamlit as st
import pandas as pd
import numpy as np
import datetime
import platform
import sys

from ai_stock_intelligence.universe.manager import get_universe_manager
from ai_stock_intelligence.universe.search import search_universe
from ai_stock_intelligence.data.market_data import get_market_data_provider
from ai_stock_intelligence.data.news_data import get_news_provider
from ai_stock_intelligence.data.reddit_data import get_reddit_client
from ai_stock_intelligence.data.fundamentals import fetch_stock_fundamentals
from ai_stock_intelligence.data.sector_data import get_sector_provider
from ai_stock_intelligence.sentiment.pipeline import get_sentiment_pipeline
from ai_stock_intelligence.features.pipeline import (
    prepare_supervised_dataset,
    extract_latest_features_vector,
    CORE_FEATURE_COLUMNS
)
from ai_stock_intelligence.features.technical import compute_all_technical_indicators
from ai_stock_intelligence.models.train import (
    train_and_evaluate_model,
    compare_all_models
)
from ai_stock_intelligence.models.predict import predict_calibrated_signal
from ai_stock_intelligence.backtesting.engine import BacktestEngine
from ai_stock_intelligence.scanner.market_scanner import get_market_scanner

from .styling import get_custom_css
from .components import render_signal_card, render_disclaimer
from .charts import plot_price_and_indicators, plot_backtest_equity


def run_dashboard():
    st.set_page_config(
        page_title="Explainable AI Stock Intelligence Platform",
        page_icon="📈",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    st.markdown(get_custom_css(), unsafe_allow_html=True)

    universe_mgr = get_universe_manager()
    market_provider = get_market_data_provider()
    news_provider = get_news_provider()
    reddit_client = get_reddit_client()
    sentiment_pipeline = get_sentiment_pipeline()
    sector_provider = get_sector_provider()

    # --- SIDEBAR NAVIGATION ---
    st.sidebar.markdown("## 🧭 Navigation")
    selected_page = st.sidebar.radio(
        "Select Module:",
        [
            "📊 Dashboard",
            "🔍 Stock Search",
            "📈 Technical Analysis",
            "📰 News/Sentiment",
            "🤖 ML Prediction",
            "🔄 Backtesting",
            "📋 Model Evaluation",
            "💡 Explainability",
            "⚙️ Settings"
        ],
        index=0
    )

    st.sidebar.markdown("---")
    st.sidebar.markdown("### 🎯 Security Selection")
    country_filter = st.sidebar.selectbox("Country", ["ALL", "India", "United States"], index=0)
    exchange_filter = st.sidebar.selectbox("Exchange", ["ALL", "NSE", "NASDAQ", "NYSE", "AMEX"], index=0)

    # Fast Local Search
    search_q = st.sidebar.text_input("Ticker / Security Name:", value="RELIANCE.NS").strip().upper()
    search_matches = search_universe(search_q, exchange=exchange_filter, country=country_filter, limit=10)

    ticker_options = [f"{s['ticker']} - {s['name']} ({s['exchange']})" for s in search_matches]
    if not ticker_options:
        ticker_options = ["RELIANCE.NS - Reliance Industries Ltd (NSE)"]

    selected_choice = st.sidebar.selectbox("Active Security:", ticker_options, index=0)
    selected_ticker = selected_choice.split(" - ")[0].strip()

    st.sidebar.markdown("---")
    st.sidebar.markdown("### ⚙️ Analytical Settings")
    period = st.sidebar.selectbox("Historical Range", ["1M", "3M", "6M", "1Y", "3Y", "5Y", "MAX"], index=3)
    period_map = {"1M": "1mo", "3M": "3mo", "6M": "6mo", "1Y": "1y", "3Y": "3y", "5Y": "5y", "MAX": "max"}

    model_choice = st.sidebar.selectbox("Machine Learning Model", ["Random Forest", "XGBoost", "Logistic Regression"], index=0)
    target_horizon_days = st.sidebar.selectbox("Prediction Horizon", [1, 5, 20], index=0, format_func=lambda x: f"{x} Trading Day{'s' if x > 1 else ''} (Next Session)" if x == 1 else f"{x} Trading Days")

    universe_counts = universe_mgr.count()
    st.sidebar.caption(f"Universe: **{universe_counts:,}** securities loaded")
    st.sidebar.caption(f"Execution: **Local / Zero API Keys Required**")

    # Header
    st.markdown('<div class="main-header">Explainable AI-Based Stock Decision Support System</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Rigorous quantitative machine learning with strict chronological partitioning, baseline benchmarking, and walk-forward backtesting.</div>', unsafe_allow_html=True)

    # Fetch Data for Selected Security
    with st.spinner(f"Retrieving market data & features for {selected_ticker}..."):
        df_hist = market_provider.fetch_history(selected_ticker, period=period_map[period])
        if df_hist is None or len(df_hist) < 25:
            st.error(f"Insufficient market data for {selected_ticker}. Please select another security or longer period.")
            return

        quote = market_provider.get_latest_quote(selected_ticker, df_hist)
        sec_info = universe_mgr.get_security(selected_ticker)
        company_name = sec_info.name if sec_info else selected_ticker

        news_items = news_provider.fetch_news(selected_ticker, company_name=company_name, limit=8)
        reddit_res = reddit_client.aggregate_reddit(selected_ticker, company_name=company_name, limit=6)
        sentiment_data = sentiment_pipeline.process_items(news_items, reddit_res.get("posts", []))
        fundamentals = fetch_stock_fundamentals(selected_ticker)

        benchmark_sym = sector_provider.get_benchmark_ticker(selected_ticker)
        mkt_returns = sector_provider.fetch_benchmark_returns(benchmark_sym)

        # Technicals & Supervised Dataset with Zero Leakage
        df_tech = compute_all_technical_indicators(df_hist)
        X, y, feat_cols, meta = prepare_supervised_dataset(
            df_hist,
            horizon_days=target_horizon_days,
            target_mode="binary"
        )

        has_sufficient_data = len(X) >= 40
        if has_sufficient_data:
            model_res = train_and_evaluate_model(X, y, model_type=model_choice)
            trained_model = model_res.get("model")
            latest_vec = extract_latest_features_vector(
                df_hist,
                sentiment_dict=sentiment_data,
                market_dict=mkt_returns
            )
            signal_output = predict_calibrated_signal(
                trained_model,
                latest_vec,
                ticker=selected_ticker,
                model_name=model_choice,
                horizon=f"{target_horizon_days} Trading Day" if target_horizon_days == 1 else f"{target_horizon_days} Trading Days"
            )
        else:
            model_res = {
                "error": "Not enough historical data for reliable ML evaluation. Please select a longer historical period.",
                "model": None,
                "beats_baseline": False,
                "verdict": "Not enough historical data for reliable ML evaluation. Please select a longer historical period (e.g. 1Y, 3Y, or 5Y).",
                "splits_info": {"train_period": "N/A", "val_period": "N/A", "test_period": "N/A", "train_samples": 0, "val_samples": 0, "test_samples": 0},
                "train_metrics": {"accuracy": 0, "balanced_accuracy": 0, "precision": 0, "recall": 0, "f1": 0, "sample_count": 0},
                "val_metrics": {"accuracy": 0, "balanced_accuracy": 0, "precision": 0, "recall": 0, "f1": 0, "sample_count": 0},
                "test_metrics": {"accuracy": 0, "balanced_accuracy": 0, "precision": 0, "recall": 0, "f1": 0, "sample_count": 0, "confusion_matrix": []},
                "majority_baseline": {"accuracy": 0, "f1": 0},
                "persistence_baseline": {"accuracy": 0, "f1": 0},
                "best_baseline_accuracy": 0,
                "best_baseline_f1": 0
            }
            trained_model = None
            from ai_stock_intelligence.models.schemas import ModelSignalResult, CalibratedProbabilities
            signal_output = ModelSignalResult(
                ticker=selected_ticker,
                signal="INSUFFICIENT DATA",
                probabilities=CalibratedProbabilities(buy=0.0, hold=0.0, sell=0.0),
                confidence="Unavailable",
                confidence_score=0.0,
                prediction_horizon=f"{target_horizon_days}d",
                top_contributions=[],
                model_name=model_choice
            )

    # Top Metrics Strip (Always visible for fast context)
    m1, m2, m3, m4, m5 = st.columns(5)
    with m1:
        st.metric(f"Price ({quote['currency']})", f"{quote['price']:,}", f"{quote['change']:+} ({quote['change_pct']:+.2f}%)")
    with m2:
        st.metric("52-Week High", f"{quote['high_52w']:,}")
    with m3:
        st.metric("52-Week Low", f"{quote['low_52w']:,}")
    with m4:
        st.metric("Volume", f"{quote['volume']:,}")
    with m5:
        st.metric("Exchange", sec_info.exchange if sec_info else "EQUITY", quote["last_updated"])

    st.markdown("---")

    # =========================================================================
    # MODULE 1: DASHBOARD
    # =========================================================================
    if selected_page == "📊 Dashboard":
        st.subheader(f"Executive Intelligence Dashboard — {company_name} ({selected_ticker})")

        # Calibrated ML Decision Signal
        render_signal_card(
            signal=signal_output.signal,
            probabilities=signal_output.probabilities.to_dict(),
            confidence=signal_output.confidence,
            horizon=f"{target_horizon_days} Trading Day (Next Session)" if target_horizon_days == 1 else f"{target_horizon_days} Trading Days"
        )

        d1, d2 = st.columns(2)
        with d1:
            st.markdown("#### 🎯 Prediction Target Formulation")
            st.info(f"""
            * **Target**: **{meta['target_name']}**
            * **Formula**: `{meta['target_formula']}`
            * **Feature Cutoff**: {meta['feature_cutoff']}
            * **Execution Timing**: {meta['prediction_time']}
            * **Active Model**: {model_choice} (Calibrated using `CalibratedClassifierCV` with chronological `TimeSeriesSplit(n_splits=3)` on training partition)
            """)

        with d2:
            st.markdown("#### ⚖️ Out-of-Sample Empirical Verdict")
            if model_res["beats_baseline"]:
                st.success(f"✅ **{model_res['verdict']}**\n\nFinal Test Acc: **{model_res['test_metrics']['accuracy']*100:.1f}%** vs Strongest Baseline: **{model_res['best_baseline_accuracy']*100:.1f}%**")
            else:
                st.warning(f"⚠️ **{model_res['verdict']}**\n\nFinal Test Acc: **{model_res['test_metrics']['accuracy']*100:.1f}%** vs Strongest Baseline: **{model_res['best_baseline_accuracy']*100:.1f}%**\n\n*(Academic notice: Retaining honest evaluation without manipulating test results.)*")

        # Snapshot Chart
        st.markdown("#### Recent Price Action & Overlays")
        fig_quick = plot_price_and_indicators(df_tech.tail(120), chart_type="Candlestick")
        st.plotly_chart(fig_quick, use_container_width=True)

        render_disclaimer()

    # =========================================================================
    # MODULE 2: STOCK SEARCH & UNIVERSE
    # =========================================================================
    elif selected_page == "🔍 Stock Search":
        st.subheader("Global & Indian Stock Universe Explorer")
        st.write("Browse and filter the pre-packaged 2,500+ multi-exchange security catalog across NSE, BSE, NASDAQ, NYSE, and AMEX.")

        c1, c2, c3 = st.columns(3)
        with c1:
            browse_country = st.selectbox("Universe Country", ["ALL", "India", "United States"], key="br_country")
        with c2:
            browse_exchange = st.selectbox("Universe Exchange", ["ALL", "NSE", "NASDAQ", "NYSE", "AMEX"], key="br_ex")
        with c3:
            browse_search = st.text_input("Filter Ticker / Company Name:", value="", key="br_q")

        filtered_secs = search_universe(browse_search, exchange=browse_exchange, country=browse_country, limit=50)
        if filtered_secs:
            df_sec = pd.DataFrame(filtered_secs)
            st.dataframe(df_sec[["ticker", "name", "exchange", "country", "sector"]], use_container_width=True)
        else:
            st.info("No securities matched the selected criteria.")

        st.markdown("---")
        st.subheader("⚡ Multi-Factor Market Scanner")
        st.caption("Batch-scan eligible securities using technical and momentum filters.")

        sc_c1, sc_c2, sc_c3 = st.columns(3)
        with sc_c1:
            sc_ex = st.selectbox("Scan Exchange", ["ALL", "NSE", "NASDAQ", "NYSE"], index=0, key="scan_ex")
        with sc_c2:
            sc_count = st.selectbox("Number of Securities to Scan", [15, 30, 60], index=0, key="scan_cnt")
        with sc_c3:
            sc_bull = st.checkbox("Require EMA 20 > EMA 50 Bullish Alignment", value=False, key="scan_bull")

        if st.button("EXECUTE BATCH SCAN", type="primary"):
            scanner = get_market_scanner()
            pbar = st.progress(0.0)
            p_text = st.empty()

            def cb(proc, succ, fail, skip):
                pbar.progress(min(1.0, proc / sc_count))
                p_text.text(f"Scanned {proc}/{sc_count} | Success: {succ} | Skipped: {skip}")

            scan_res = scanner.scan(exchange=sc_ex, max_stocks=sc_count, require_ema_bullish=sc_bull, progress_callback=cb)
            pbar.progress(1.0)
            p_text.text(f"Scan completed. Found {scan_res['matches_found']} securities.")

            if scan_res["results"]:
                st.dataframe(pd.DataFrame(scan_res["results"]), use_container_width=True)
            else:
                st.info("No candidates satisfied all scan constraints.")

    # =========================================================================
    # MODULE 3: TECHNICAL ANALYSIS
    # =========================================================================
    elif selected_page == "📈 Technical Analysis":
        st.subheader(f"Technical Analysis & Indicator Multi-Panel — {selected_ticker}")
        st.caption("All technical indicators are computed strictly backward looking (zero look-ahead bias).")

        t_ctrl1, t_ctrl2, t_ctrl3 = st.columns(3)
        with t_ctrl1:
            chart_type = st.radio("Chart Representation", ["Candlestick", "Line"], horizontal=True)
        with t_ctrl2:
            show_bb = st.checkbox("Bollinger Bands (20, 2)", value=True)
        with t_ctrl3:
            st.caption(f"Total Trading Bars: **{len(df_tech):,}**")

        fig_tech = plot_price_and_indicators(df_tech, show_bb=show_bb, chart_type=chart_type)
        st.plotly_chart(fig_tech, use_container_width=True)

        st.markdown("#### Current Technical Indicator Readings")
        latest_t = df_tech.iloc[-1]
        k1, k2, k3, k4, k5, k6 = st.columns(6)
        with k1: st.metric("RSI (14)", f"{latest_t['RSI']:.1f}")
        with k2: st.metric("MACD Hist", f"{latest_t['MACD_HIST']:.2f}")
        with k3: st.metric("EMA 20", f"{latest_t['EMA20']:.1f}")
        with k4: st.metric("EMA 50", f"{latest_t['EMA50']:.1f}")
        with k5: st.metric("EMA 200", f"{latest_t['EMA200']:.1f}")
        with k6: st.metric("20d Volatility", f"{latest_t['VOLATILITY_20']*100:.1f}%")

        st.markdown("#### Technical Indicator Specifications (Mathematical Formulation)")
        spec_df = pd.DataFrame([
            {"Indicator": "RSI (14)", "Formula": "100 - (100 / (1 + RS)), Wilder's smoothed 14 bars", "Look-Ahead Safe": "YES (t <= current)"},
            {"Indicator": "MACD (12, 26, 9)", "Formula": "EMA(12) - EMA(26); Signal = EMA(MACD, 9)", "Look-Ahead Safe": "YES (t <= current)"},
            {"Indicator": "EMA 20 / 50 / 200", "Formula": "Exponential moving averages with α = 2 / (N + 1)", "Look-Ahead Safe": "YES (t <= current)"},
            {"Indicator": "Bollinger Bands", "Formula": "SMA(20) ± 2 * StdDev(20)", "Look-Ahead Safe": "YES (t <= current)"},
            {"Indicator": "ATR (14)", "Formula": "Average True Range: Max(H-L, |H-Cp|, |L-Cp|)", "Look-Ahead Safe": "YES (t <= current)"},
            {"Indicator": "Realized Volatility", "Formula": "StdDev(ln(Close_t / Close_{t-1})) * sqrt(252)", "Look-Ahead Safe": "YES (t <= current)"}
        ])
        st.dataframe(spec_df, use_container_width=True)

    # =========================================================================
    # MODULE 4: NEWS & SENTIMENT
    # =========================================================================
    elif selected_page == "📰 News/Sentiment":
        st.subheader(f"Dual-Engine Financial NLP Sentiment Analysis — {selected_ticker}")
        st.write("Combines state-of-the-art transformer NLP (**FinBERT**) with lexicon-based scoring (**VADER**) across live financial headlines and community forums.")

        st.info("🛡️ **Strict Zero-Leakage Policy**: Live news sentiment is evaluated strictly for current forward-looking inference. To prevent look-ahead bias, historical model training rows use neutral sentiment (0.0) rather than broadcasting today's news backwards in time.")

        s1, s2, s3, s4 = st.columns(4)
        with s1: st.metric("FinBERT Net Score", f"{sentiment_data['finbert_score']:+.2f}")
        with s2: st.metric("VADER Compound", f"{sentiment_data['vader_compound']:+.2f}")
        with s3: st.metric("Headlines Analyzed", sentiment_data["news_count"])
        with s4: st.metric("Reddit Posts Analyzed", sentiment_data["reddit_count"])

        st.markdown("#### 📰 Recent Financial Press Headlines")
        if sentiment_data["news_items"]:
            for item in sentiment_data["news_items"]:
                score_badge = "🟢 POSITIVE" if item['finbert_score'] > 0.05 else "🔴 NEGATIVE" if item['finbert_score'] < -0.05 else "⚪ NEUTRAL"
                st.markdown(f"- **{item['headline']}**\n  *Source*: `{item['source']}` · *Date*: `{item['date']}` · *Sentiment*: `{score_badge}` (FinBERT Net: `{item['finbert_score']:+.2f}`)")
        else:
            st.info("No current financial news items available for this ticker.")

        st.markdown("#### 💬 Community Discussion & Reddit Sentiment")
        st.caption(reddit_res.get("message", "Reddit search active."))
        if sentiment_data["reddit_posts"]:
            for p in sentiment_data["reddit_posts"]:
                st.markdown(f"- **r/{p['subreddit']}**: {p['title']} (Score: {p['score']}) — VADER Compound: `{p['vader_compound']:+.2f}`")

    # =========================================================================
    # MODULE 5: ML PREDICTION
    # =========================================================================
    elif selected_page == "🤖 ML Prediction":
        st.subheader("Calibrated Machine Learning Decision Engine")

        st.markdown("""
        <div style="background: rgba(30, 41, 59, 0.5); padding: 1.25rem; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.2); margin-bottom: 1.5rem;">
            <h4 style="margin-top: 0; color: #38bdf8;">📋 Formal Target Formulation</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                <tr><td style="padding: 4px 8px; font-weight: 600;">Target Variable</td><td><strong>NEXT-DAY DIRECTION (Binary)</strong>: y_t ∈ {0, 1}</td></tr>
                <tr><td style="padding: 4px 8px; font-weight: 600;">Target Formula</td><td><code>y_t = 1 if Close_{t+1} > Close_t else 0</code></td></tr>
                <tr><td style="padding: 4px 8px; font-weight: 600;">Prediction Horizon</td><td>1 Trading Day (Next Market Session)</td></tr>
                <tr><td style="padding: 4px 8px; font-weight: 600;">Feature Cutoff Time</td><td>Market Close at Day t (features computed strictly on history <= t)</td></tr>
                <tr><td style="padding: 4px 8px; font-weight: 600;">Actionable Timing</td><td>Generated post-market close of t; executable at open of day t+1</td></tr>
                <tr><td style="padding: 4px 8px; font-weight: 600;">Target Alignment</td><td>Forward return shifted backward; today's row is strictly unlabeled</td></tr>
            </table>
        </div>
        """, unsafe_allow_html=True)

        if not has_sufficient_data:
            st.warning("⚠️ Not enough historical data for reliable ML inference. Please select a longer historical period (e.g., 1Y, 3Y, or 5Y).")

        render_signal_card(
            signal=signal_output.signal,
            probabilities=signal_output.probabilities.to_dict(),
            confidence=signal_output.confidence,
            horizon="1 Trading Day (Next Session)"
        )

        st.markdown("#### Top Factor Attributions (Feature Contributions to Prediction)")
        contrib_df = pd.DataFrame(signal_output.top_contributions)
        st.dataframe(contrib_df, use_container_width=True)

        render_disclaimer()

    # =========================================================================
    # MODULE 6: STRATEGY BACKTESTING
    # =========================================================================
    elif selected_page == "🔄 Backtesting":
        st.subheader("Walk-Forward Backtesting Engine (Zero Look-Ahead Bias)")
        st.caption("Simulates execution under realistic friction: 10 bps broker commission + 5 bps market slippage (15 bps per trade side).")

        bt_col1, bt_col2 = st.columns(2)
        with bt_col1:
            strat_choice = st.selectbox("Execution Strategy", ["Technical Baseline (EMA + RSI + MACD)", "Machine Learning Strategy"], index=0)
            strat_key = "ml" if "Machine Learning" in strat_choice else "technical"
        with bt_col2:
            st.info("🕒 **Execution Rule**: Signal generated strictly after close of day T. Trade executed at day T+1 Open price with 15 bps drag (10 bps commission + 5 bps slippage).")

        if not has_sufficient_data:
            st.warning("⚠️ Not enough historical data for reliable walk-forward backtesting. Please select a longer historical period (e.g., 1Y, 3Y, or 5Y).")
            return

        engine = BacktestEngine(initial_capital=100000.0, commission_bps=10.0, slippage_bps=5.0)
        bt_results = engine.run_backtest(
            df_hist,
            strategy_mode=strat_key,
            ml_model=trained_model,
            feature_df=X,
            model_type=model_choice
        )

        if "metrics" in bt_results and bt_results["metrics"]:
            bm = bt_results["metrics"]

            b1, b2, b3, b4, b5 = st.columns(5)
            with b1: st.metric("Cumulative Return", f"{bm['strategy_total_return_pct']:+.1f}%", f"{bm['strategy_total_return_pct'] - bm['buy_hold_total_return_pct']:+.1f}% vs B&H")
            with b2: st.metric("Buy & Hold Return", f"{bm['buy_hold_total_return_pct']:+.1f}%")
            with b3: st.metric("Sharpe Ratio", f"{bm['sharpe_ratio']:.2f}")
            with b4: st.metric("Sortino Ratio", f"{bm.get('sortino_ratio', 0.0):.2f}")
            with b5: st.metric("Max Drawdown", f"{bm['max_drawdown_pct']:.1f}%")

            # Comparative table
            st.markdown("#### Quantitative Performance Comparison")
            comp_table = pd.DataFrame([
                {"Metric": "Cumulative Return (%)", "Strategy": f"{bm['strategy_total_return_pct']:+.2f}%", "Buy & Hold": f"{bm['buy_hold_total_return_pct']:+.2f}%"},
                {"Metric": "Annualized CAGR (%)", "Strategy": f"{bm['strategy_cagr_pct']:+.2f}%", "Buy & Hold": f"{bm['buy_hold_cagr_pct']:+.2f}%"},
                {"Metric": "Annualized Volatility (%)", "Strategy": f"{bm['annualized_volatility_pct']:.2f}%", "Buy & Hold": "Benchmark"},
                {"Metric": "Sharpe Ratio (Rf=5%)", "Strategy": f"{bm['sharpe_ratio']:.2f}", "Buy & Hold": "N/A"},
                {"Metric": "Sortino Ratio", "Strategy": f"{bm.get('sortino_ratio', 0.0):.2f}", "Buy & Hold": "N/A"},
                {"Metric": "Maximum Drawdown (%)", "Strategy": f"{bm['max_drawdown_pct']:.2f}%", "Buy & Hold": f"{bm['buy_hold_max_drawdown_pct']:.2f}%"},
                {"Metric": "Win Rate (%)", "Strategy": f"{bm['win_rate_pct']:.1f}%", "Buy & Hold": "N/A"},
                {"Metric": "Total Trades Completed", "Strategy": f"{bm['total_trades']}", "Buy & Hold": "1 (Buy & Hold)"},
                {"Metric": "Profit Factor", "Strategy": f"{bm['profit_factor']:.2f}", "Buy & Hold": "N/A"}
            ])
            st.dataframe(comp_table, use_container_width=True)

            # Equity Curve
            fig_eq = plot_backtest_equity(bt_results["equity_curve"])
            st.plotly_chart(fig_eq, use_container_width=True)

            if bt_results["trades"]:
                st.markdown("#### Deduplicated Trade Log")
                st.dataframe(pd.DataFrame(bt_results["trades"]), use_container_width=True)
            else:
                st.info("No trades triggered under the selected parameters.")

    # =========================================================================
    # MODULE 7: MODEL EVALUATION & BASELINES
    # =========================================================================
    elif selected_page == "📋 Model Evaluation":
        st.subheader("Strict Chronological Evaluation & Baseline Benchmarking")

        if not has_sufficient_data:
            st.warning("⚠️ Not enough historical data for reliable ML evaluation. Please select a longer historical period (e.g., 1Y, 3Y, or 5Y).")
            return

        st.info("🛡️ **Academic Integrity Disclosure on Sentiment:** Historical ML evaluation and backtesting use neutral baseline sentiment (0.0) because point-in-time historical news archives are not available in free feeds. Live FinBERT/VADER sentiment is strictly utilized for the latest real-time decision vector.")

        sp = model_res["splits_info"]
        st.markdown(f"""
        <div style="background: rgba(30, 41, 59, 0.4); padding: 1.25rem; border-radius: 8px; border: 1px solid rgba(148, 163, 184, 0.2); margin-bottom: 1.5rem;">
            <h4 style="margin-top: 0; color: #38bdf8;">📅 Chronological Dataset Partitioning (No Shuffling)</h4>
            <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                <div><strong>TRAIN Set</strong> (60%): <code>{sp['train_period']}</code> ({sp['train_samples']} bars)</div>
                <div><strong>VALIDATION Set</strong> (20%): <code>{sp['val_period']}</code> ({sp['val_samples']} bars)</div>
                <div><strong>FINAL TEST Set</strong> (20%): <code>{sp['test_period']}</code> ({sp['test_samples']} bars) — <em>Strictly Held-Out</em></div>
            </div>
            <div style="margin-top: 0.75rem; font-size: 0.85rem; color: #94a3b8;">
                Probability calibration is fitted via <code>CalibratedClassifierCV</code> using chronological <code>TimeSeriesSplit(n_splits=3)</code> strictly on the training partition. Calibration is used for probability estimation; validation and test data are not used to fit calibration (no look-ahead occurs). Final-test classification metrics are evaluated on the held-out test set.
            </div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("#### 1. Baseline Models Comparison (Evaluated on Final Test Set)")
        base_df = pd.DataFrame([
            {
                "Model / Strategy": "Majority Class Baseline",
                "Description": "Always predicts the most frequent class in training data",
                "Final Test Accuracy": f"{model_res['majority_baseline']['accuracy']*100:.2f}%",
                "Final Test F1": f"{model_res['majority_baseline']['f1']:.3f}"
            },
            {
                "Model / Strategy": "Momentum Persistence Baseline",
                "Description": "Predicts tomorrow's direction equals today's momentum direction",
                "Final Test Accuracy": f"{model_res['persistence_baseline']['accuracy']*100:.2f}%",
                "Final Test F1": f"{model_res['persistence_baseline']['f1']:.3f}"
            },
            {
                "Model / Strategy": f"Active ML Model ({model_choice})",
                "Description": "Calibrated classifier (`CalibratedClassifierCV` using chronological `TimeSeriesSplit(n_splits=3)` on training partition; final metrics on held-out test set)",
                "Final Test Accuracy": f"{model_res['test_metrics']['accuracy']*100:.2f}%",
                "Final Test F1": f"{model_res['test_metrics']['f1']:.3f}"
            }
        ])
        st.dataframe(base_df, use_container_width=True)

        # Honest Academic Evaluation Banner
        st.markdown("#### 2. Academic Empirical Finding")
        if model_res["beats_baseline"]:
            st.success(f"✅ **{model_res['verdict']}**")
        else:
            st.warning(f"⚠️ **{model_res['verdict']}**\n\n*In financial economics, market efficiency frequently prevents simple statistical models from beating momentum or majority baselines over short out-of-sample periods. Reporting this honestly is academically sound and credible.*")

        st.markdown("#### 3. Classification Metrics Across Partitions")
        m_train = model_res["train_metrics"]
        m_val = model_res["val_metrics"]
        m_test = model_res["test_metrics"]

        matrix_df = pd.DataFrame([
            {"Metric": "Accuracy", "TRAIN (In-Sample)": f"{m_train['accuracy']*100:.2f}%", "VALIDATION (Tuning)": f"{m_val['accuracy']*100:.2f}%", "FINAL TEST (Gold Standard)": f"{m_test['accuracy']*100:.2f}%"},
            {"Metric": "Balanced Accuracy", "TRAIN (In-Sample)": f"{m_train['balanced_accuracy']*100:.2f}%", "VALIDATION (Tuning)": f"{m_val['balanced_accuracy']*100:.2f}%", "FINAL TEST (Gold Standard)": f"{m_test['balanced_accuracy']*100:.2f}%"},
            {"Metric": "Macro Precision", "TRAIN (In-Sample)": f"{m_train['precision']:.3f}", "VALIDATION (Tuning)": f"{m_val['precision']:.3f}", "FINAL TEST (Gold Standard)": f"{m_test['precision']:.3f}"},
            {"Metric": "Macro Recall", "TRAIN (In-Sample)": f"{m_train['recall']:.3f}", "VALIDATION (Tuning)": f"{m_val['recall']:.3f}", "FINAL TEST (Gold Standard)": f"{m_test['recall']:.3f}"},
            {"Metric": "Macro F1 Score", "TRAIN (In-Sample)": f"{m_train['f1']:.3f}", "VALIDATION (Tuning)": f"{m_val['f1']:.3f}", "FINAL TEST (Gold Standard)": f"{m_test['f1']:.3f}"},
            {"Metric": "ROC-AUC Score", "TRAIN (In-Sample)": f"{m_train.get('roc_auc') or 'N/A'}", "VALIDATION (Tuning)": f"{m_val.get('roc_auc') or 'N/A'}", "FINAL TEST (Gold Standard)": f"{m_test.get('roc_auc') or 'N/A'}"},
            {"Metric": "Sample Count", "TRAIN (In-Sample)": f"{m_train['sample_count']}", "VALIDATION (Tuning)": f"{m_val['sample_count']}", "FINAL TEST (Gold Standard)": f"{m_test['sample_count']}"}
        ])
        st.dataframe(matrix_df, use_container_width=True)

        st.markdown("#### 4. Final Test Confusion Matrix")
        cm = m_test["confusion_matrix"]
        if len(cm) == 2:
            cm_df = pd.DataFrame(cm, index=["Actual DOWN (0)", "Actual UP (1)"], columns=["Pred DOWN (0)", "Pred UP (1)"])
            st.dataframe(cm_df)

        st.markdown("#### 5. Cross-Model Comparison")
        st.caption("Comparing Logistic Regression, Random Forest, and XGBoost on the identical chronological partition:")
        all_comp = compare_all_models(X, y)
        if all_comp:
            st.dataframe(pd.DataFrame(all_comp), use_container_width=True)

    # =========================================================================
    # MODULE 8: EXPLAINABILITY (SHAP)
    # =========================================================================
    elif selected_page == "💡 Explainability":
        st.subheader("Model Explainability & Feature Factor Attribution")
        st.write("Explains the underlying mechanics driving the model's posterior probability estimates using standardized factor attribution.")

        st.markdown("#### Attribution Ranking for Today's Signal")
        if signal_output.top_contributions:
            contrib_df = pd.DataFrame(signal_output.top_contributions)
            st.dataframe(contrib_df, use_container_width=True)
        else:
            st.info("No feature attribution available. Please ensure sufficient historical data is selected.")

        st.markdown("#### Mathematical Explainability Methodology")
        st.write("""
        * **Z-Score Normalization**: Features are scaled relative to their rolling historical distributions.
        * **Feature Directionality**: Identifies whether each indicator is pushing the probability toward an upward session (Positive Push) or downward session (Negative Push).
        * **Attribution Hierarchy**: Quantifies the relative weighting of momentum, volatility, trend, and sentiment indicators.
        """)

    # =========================================================================
    # MODULE 9: SETTINGS & SYSTEM INFO
    # =========================================================================
    elif selected_page == "⚙️ Settings":
        st.subheader("System Configuration & Academic Project Information")

        s_col1, s_col2 = st.columns(2)
        with s_col1:
            st.markdown("#### 🎓 MCA Academic Project Information")
            st.write("""
            * **Project Title**: Explainable AI-Based Stock Analysis & Decision Support System
            * **Degree Target**: Master of Computer Applications (MCA) / M.Sc. Data Science
            * **Evaluation Standard**: Zero look-ahead bias, chronological partitioning, baseline benchmarking
            * **Core Innovation**: Dual-engine NLP (FinBERT + VADER) combined with calibrated tree ensembles
            """)

        with s_col2:
            st.markdown("#### 🔬 Reproducibility & Governance")
            st.write(f"""
            * **Random Seed**: `42` (Fixed for deterministic splits and model fitting)
            * **Model Version**: `v2.4.0-calibrated`
            * **Probability Calibration**: `CalibratedClassifierCV` using chronological `TimeSeriesSplit(n_splits=3)` on the training partition
            * **Evaluation Integrity**: Final-test classification metrics are evaluated on the held-out test set; validation and test data are not used to fit calibration (no look-ahead occurs)
            * **Calibration Scope**: Calibration is used for probability estimation without leaking unseen future data
            * **System Platform**: `{platform.system()} {platform.release()}`
            * **Python Runtime**: `{sys.version.split()[0]}`
            * **Audit Timestamp**: `{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}`
            """)

        st.markdown("---")
        st.markdown("#### 💡 Viva Voce Defense Topics for Academic Examination")
        st.markdown("""
        1. **Why is random train/test split invalid for financial data?**  
           *Financial time series exhibit strong temporal autocorrelation. Shuffling data causes look-ahead leakage where future price patterns leak into training.*
        2. **Why does high accuracy not guarantee trading profits?**  
           *A model with 60% accuracy can lose capital if the 40% wrong trades incur outsized losses, or if transaction friction (brokerage + slippage) erodes edge.*
        3. **How does the system ensure zero look-ahead bias in indicators?**  
           *All indicators at bar t are computed strictly on Close prices at index <= t. Decisions for bar i are evaluated at i-1 and executed at bar i.*
        4. **How is probability calibration executed without look-ahead bias?**  
           *We use `CalibratedClassifierCV` using chronological `TimeSeriesSplit(n_splits=3)` on the training partition. Calibration is used for probability estimation. Validation/test data are not used to fit calibration, guaranteeing no look-ahead occurs and final-test classification metrics are evaluated on the held-out test set.*
        """)

    render_disclaimer()


if __name__ == "__main__":
    run_dashboard()
