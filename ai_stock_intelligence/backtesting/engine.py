"""
Leakage-safe walk-forward backtesting execution engine.
Simulates realistic trade lifecycle without look-ahead bias and calculates comparisons vs Buy & Hold.
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier

from .transaction_costs import ExecutionCostModel
from .metrics import compute_performance_metrics
from ai_stock_intelligence.features.technical import compute_all_technical_indicators
from ai_stock_intelligence.models.calibration import calibrate_classifier


class BacktestEngine:
    def __init__(
        self,
        initial_capital: float = 100000.0,
        commission_bps: float = 10.0,
        slippage_bps: float = 5.0,
        risk_free_rate: float = 0.05
    ):
        self.initial_capital = initial_capital
        self.cost_model = ExecutionCostModel(commission_bps=commission_bps, slippage_bps=slippage_bps)
        self.risk_free_rate = risk_free_rate

    def _generate_walk_forward_ml_signals(
        self,
        data: pd.DataFrame,
        feature_cols: List[str],
        model_type: str = "Random Forest",
        min_train_bars: int = 50,
        retrain_interval: int = 20
    ) -> np.ndarray:
        """
        Generates genuine out-of-sample walk-forward predictions.
        At each bar k, uses only a model fitted on observations strictly prior to k.
        Periodic retraining (every retrain_interval bars, e.g. ~monthly) ensures computational
        tractability while strictly preventing future look-ahead leakage.
        """
        n = len(data)
        signals = np.zeros(n, dtype=int)
        if n < min_train_bars + 10:
            return signals

        pipe = None
        for i in range(min_train_bars, n):
            # Retrain model periodically on strictly historical data up to i-1
            if (pipe is None) or ((i - min_train_bars) % retrain_interval == 0):
                train_slice = data.iloc[:i]
                # Target: Close(t+1) > Close(t) strictly within past slice
                # The last row of train_slice (i-1) has target at i, which is future to training set, so drop it
                y_tr = (train_slice["Close"].shift(-1) > train_slice["Close"]).iloc[:-1].astype(int)
                X_tr = train_slice[feature_cols].iloc[:-1]

                if len(y_tr) >= 30 and len(np.unique(y_tr)) > 1:
                    imputer = SimpleImputer(strategy="median")
                    scaler = StandardScaler()
                    X_tr_imp = imputer.fit_transform(X_tr)
                    X_tr_sc = scaler.fit_transform(X_tr_imp)

                    if model_type == "Logistic Regression":
                        from sklearn.linear_model import LogisticRegression
                        base_clf = LogisticRegression(class_weight="balanced", max_iter=500, random_state=42)
                    elif model_type == "XGBoost":
                        try:
                            from xgboost import XGBClassifier
                            base_clf = XGBClassifier(n_estimators=80, max_depth=3, learning_rate=0.05, random_state=42, eval_metric="logloss")
                        except Exception:
                            from sklearn.ensemble import GradientBoostingClassifier
                            base_clf = GradientBoostingClassifier(n_estimators=80, max_depth=3, learning_rate=0.05, random_state=42)
                    else:
                        base_clf = RandomForestClassifier(n_estimators=80, max_depth=4, min_samples_split=8, random_state=42, class_weight="balanced")

                    base_clf.fit(X_tr_sc, y_tr)
                    cal_clf = calibrate_classifier(base_clf, X_tr_sc, y_tr, method="sigmoid", n_splits=3)
                    pipe = (imputer, scaler, cal_clf)

            # Predict signal for bar i using strictly features at bar i-1
            if pipe is not None:
                imputer, scaler, clf = pipe
                feat_prev = data[feature_cols].iloc[[i-1]]
                feat_sc = scaler.transform(imputer.transform(feat_prev))
                pred = clf.predict(feat_sc)[0]
                signals[i-1] = int(pred)

        return signals

    def run_backtest(
        self,
        df: pd.DataFrame,
        strategy_mode: str = "technical",
        ml_model: Optional[Any] = None,
        feature_df: Optional[pd.DataFrame] = None,
        model_type: str = "Random Forest"
    ) -> Dict[str, Any]:
        """
        Executes a walk-forward strategy across historical bars.
        Decision at bar i-1 close is executed at bar i Open price (strictly zero look-ahead bias).
        Supports:
          - "technical": EMA trend + RSI + MACD technical baseline
          - "ml": True out-of-sample walk-forward model retrained periodically on expanding history
        """
        if df is None or len(df) < 50:
            return {
                "error": "Insufficient data for reliable backtesting (minimum 50 bars required).",
                "metrics": {},
                "equity_curve": [],
                "trades": []
            }

        data = compute_all_technical_indicators(df).dropna(subset=["EMA50", "RSI", "MACD_HIST"]).copy()
        n = len(data)
        if n < 30:
            return {"error": "Insufficient valid bars after indicator initialization.", "metrics": {}, "equity_curve": [], "trades": []}

        prices = data["Close"].values
        opens = data["Open"].values if "Open" in data.columns else prices
        dates = data.index
        rsi = data["RSI"].values
        macd_hist = data["MACD_HIST"].values
        ema20 = data["EMA20"].values
        ema50 = data["EMA50"].values

        # Generate true out-of-sample walk-forward ML predictions if ML strategy selected
        ml_signals = None
        if strategy_mode == "ml":
            feat_cols = [c for c in [
                "RSI", "MACD_HIST", "VOLATILITY_20", "DIST_EMA20", "DIST_EMA50",
                "DIST_EMA200", "EMA20_EMA50_SPREAD", "BB_BANDWIDTH", "ATR", "ADX",
                "ROC_10", "RETURN_5D", "RETURN_20D", "VOLUME_RATIO"
            ] if c in data.columns]
            ml_signals = self._generate_walk_forward_ml_signals(
                data=data,
                feature_cols=feat_cols,
                model_type=model_type,
                min_train_bars=50,
                retrain_interval=20
            )

        cash = self.initial_capital
        shares = 0.0
        position = 0  # 0: Cash, 1: Long

        strat_equity = [self.initial_capital]
        bh_equity = [self.initial_capital]

        trade_returns = []
        trades_log = []
        entry_price = 0.0
        entry_date = None
        total_costs = 0.0

        for i in range(1, n):
            # Trade execution at bar i Open (reflecting post-close decision at bar i-1)
            exec_price = float(opens[i])
            curr_close = float(prices[i])
            curr_date = dates[i].strftime("%Y-%m-%d") if hasattr(dates[i], "strftime") else str(dates[i])

            # Signal evaluated strictly on bar i-1
            if strategy_mode == "ml" and ml_signals is not None:
                p_sig = ml_signals[i-1]
                should_buy = (p_sig == 1)
                should_sell = (p_sig in (0, -1))
            else:
                p_rsi = rsi[i-1]
                p_hist = macd_hist[i-1]
                p_trend = ema20[i-1] > ema50[i-1]
                should_buy = p_trend and (p_rsi < 65) and (p_hist > 0 or p_rsi < 40)
                should_sell = (not p_trend and p_hist < 0) or (p_rsi > 78)

            if position == 0 and should_buy:
                # Enter Long at Open price with transaction costs
                total_outlay, friction = self.cost_model.calculate_entry_cost(exec_price, 1.0)
                shares = cash / total_outlay
                entry_friction = shares * exec_price * self.cost_model.total_drag_rate
                total_costs += entry_friction
                cash = 0.0
                position = 1
                entry_price = exec_price
                entry_date = curr_date

            elif position == 1 and should_sell:
                # Exit Long at Open price with transaction costs
                net_revenue, exit_friction = self.cost_model.calculate_exit_revenue(exec_price, shares)
                total_costs += exit_friction
                # Exact trade return accounting for roundtrip friction
                raw_ret = ((exec_price * (1.0 - self.cost_model.total_drag_rate)) / (entry_price * (1.0 + self.cost_model.total_drag_rate))) - 1.0
                trade_returns.append(raw_ret)
                trades_log.append({
                    "entry_date": entry_date,
                    "exit_date": curr_date,
                    "entry_price": round(entry_price, 2),
                    "exit_price": round(exec_price, 2),
                    "return_pct": round(raw_ret * 100, 2),
                    "won": raw_ret > 0
                })
                cash = net_revenue
                shares = 0.0
                position = 0
                entry_price = 0.0
                entry_date = None

            # Daily mark-to-market at bar i Close (valued at net liquidation value)
            if position == 1:
                net_liq, _ = self.cost_model.calculate_exit_revenue(curr_close, shares)
                port_val = cash + net_liq
            else:
                port_val = cash
            strat_equity.append(port_val)

            bh_val = self.initial_capital * (curr_close / prices[0])
            bh_equity.append(bh_val)

        # Close any open position consistently at final bar Close
        last_d = dates[-1].strftime("%Y-%m-%d") if hasattr(dates[-1], "strftime") else str(dates[-1])
        if position == 1 and entry_date:
            final_p = float(prices[-1])
            net_revenue, exit_friction = self.cost_model.calculate_exit_revenue(final_p, shares)
            total_costs += exit_friction
            raw_ret = ((final_p * (1.0 - self.cost_model.total_drag_rate)) / (entry_price * (1.0 + self.cost_model.total_drag_rate))) - 1.0
            exit_label = f"{last_d} (Close)" if entry_date == last_d else last_d
            trade_returns.append(raw_ret)
            trades_log.append({
                "entry_date": entry_date,
                "exit_date": exit_label,
                "entry_price": round(entry_price, 2),
                "exit_price": round(final_p, 2),
                "return_pct": round(raw_ret * 100, 2),
                "won": raw_ret > 0
            })
            cash = net_revenue
            shares = 0.0
            position = 0
            strat_equity[-1] = cash

        # Ensure trade log order deduplication preserves 1:1 parity with trade_returns
        clean_trades = []
        seen_trades = set()
        for tr in trades_log:
            if not tr["entry_date"] or not tr["exit_date"]:
                continue
            key = (tr["entry_date"], tr["exit_date"], tr["entry_price"], tr["exit_price"])
            if key not in seen_trades:
                seen_trades.add(key)
                clean_trades.append(tr)
        trades_log = clean_trades

        # Calculate metrics
        metrics = compute_performance_metrics(
            strat_equity, bh_equity, trade_returns,
            initial_capital=self.initial_capital,
            risk_free_rate=self.risk_free_rate
        )
        metrics["total_transaction_costs"] = round(total_costs, 2)
        metrics["total_transaction_costs_pct"] = round((total_costs / self.initial_capital) * 100, 2) if self.initial_capital > 0 else 0.0

        # Downsample curve for clean visualization
        curve = []
        step = max(1, len(strat_equity) // 100)
        for i in range(0, len(strat_equity), step):
            idx = min(i, len(data.index) - 1)
            d_str = data.index[idx].strftime("%Y-%m-%d") if hasattr(data.index[idx], "strftime") else str(data.index[idx])
            curve.append({
                "date": d_str,
                "strategy": round(strat_equity[i], 2),
                "buy_hold": round(bh_equity[i], 2)
            })

        return {
            "metrics": metrics,
            "equity_curve": curve,
            "trades": trades_log[-12:]  # Last 12 trades
        }
