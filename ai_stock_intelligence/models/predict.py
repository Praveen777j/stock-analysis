"""
Model inference and rule-conditioned decision signal engine.
Translates calibrated probabilities into BUY, HOLD, SELL, or HOLD / LOW CONFIDENCE signals.
"""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

from .schemas import CalibratedProbabilities, ModelSignalResult
from ai_stock_intelligence.explainability.shap_explainer import explain_prediction


def predict_calibrated_signal(
    model: Any,
    latest_feature_vector: pd.DataFrame,
    ticker: str,
    model_name: str = "Random Forest",
    horizon: str = "20 trading days"
) -> ModelSignalResult:
    """
    Runs model inference on the latest feature vector and derives the calibrated signal.
    If model inference fails, returns an honest 'UNAVAILABLE' state without inventing fake probabilities.
    """
    try:
        probs = model.predict_proba(latest_feature_vector)[0]
        classes = list(model.classes_)
    except Exception:
        # Honest failure state: Do not invent fake probabilities or fake confidence
        return ModelSignalResult(
            ticker=ticker,
            signal="UNAVAILABLE",
            probabilities=CalibratedProbabilities(buy=0.0, hold=0.0, sell=0.0),
            confidence="Unavailable",
            confidence_score=0.0,
            prediction_horizon=horizon,
            top_contributions=[],
            model_name=model_name
        )

    # Map classes (-1: SELL, 0: HOLD/DOWN, 1: BUY/UP)
    prob_dict = {"BUY": 0.0, "HOLD": 0.0, "SELL": 0.0}
    if set(classes) == {0, 1}:
        for c, p in zip(classes, probs):
            if c == 1:
                prob_dict["BUY"] = float(p)
            elif c == 0:
                prob_dict["SELL"] = float(p)
    else:
        for c, p in zip(classes, probs):
            if c == 1:
                prob_dict["BUY"] = float(p)
            elif c == 0:
                prob_dict["HOLD"] = float(p)
            elif c == -1:
                prob_dict["SELL"] = float(p)

    # Normalize
    tot = sum(prob_dict.values()) or 1.0
    p_buy = round(prob_dict["BUY"] / tot, 3)
    p_hold = round(prob_dict["HOLD"] / tot, 3)
    p_sell = round(prob_dict["SELL"] / tot, 3)

    # Signal determination with risk filter
    max_prob = max(p_buy, p_hold, p_sell)
    confidence_level = "High" if max_prob >= 0.55 else "Medium" if max_prob >= 0.40 else "Low"

    # If confidence is too low or margin is narrow, avoid reckless action
    if max_prob < 0.38:
        signal = "HOLD / LOW CONFIDENCE"
    elif p_buy > p_hold and p_buy > p_sell and (p_buy - max(p_hold, p_sell) >= 0.05):
        signal = "BUY"
    elif p_sell > p_hold and p_sell > p_buy and (p_sell - max(p_hold, p_buy) >= 0.05):
        signal = "SELL"
    else:
        signal = "HOLD"

    # Feature factor attribution using model-derived SHAP / importance infrastructure
    try:
        contributions = explain_prediction(model, latest_feature_vector, list(latest_feature_vector.columns))
    except Exception:
        contributions = []

    return ModelSignalResult(
        ticker=ticker,
        signal=signal,
        probabilities=CalibratedProbabilities(buy=p_buy, hold=p_hold, sell=p_sell),
        confidence=confidence_level,
        confidence_score=round(max_prob, 3),
        prediction_horizon=horizon,
        top_contributions=contributions[:6],
        model_name=model_name
    )
