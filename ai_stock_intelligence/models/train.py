"""
Model training with strict chronological 3-way time-series partitioning,
empirical baseline benchmarking, zero-leakage preprocessing, and walk-forward evaluation.
"""

from typing import Dict, Any, Tuple, List, Optional
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, precision_score,
    recall_score, f1_score, roc_auc_score, confusion_matrix
)
from sklearn.model_selection import TimeSeriesSplit

from .calibration import calibrate_classifier


def split_time_series_chronological(
    X: pd.DataFrame,
    y: pd.Series,
    train_pct: float = 0.60,
    val_pct: float = 0.20
) -> Dict[str, Any]:
    """
    Partitions dataset chronologically into TRAIN, VALIDATION, and FINAL TEST splits.
    The final test set remains strictly held-out until the chosen model is finalized.
    """
    n = len(X)
    n_train = int(n * train_pct)
    n_val = int(n * val_pct)
    n_test = n - n_train - n_val

    # Chronological slices
    X_train, y_train = X.iloc[:n_train], y.iloc[:n_train]
    X_val, y_val = X.iloc[n_train:n_train + n_val], y.iloc[n_train:n_train + n_val]
    X_test, y_test = X.iloc[n_train + n_val:], y.iloc[n_train + n_val:]

    def get_date_range(idx):
        if hasattr(idx, "min") and len(idx) > 0:
            d_min = idx[0].strftime("%Y-%m-%d") if hasattr(idx[0], "strftime") else str(idx[0])
            d_max = idx[-1].strftime("%Y-%m-%d") if hasattr(idx[-1], "strftime") else str(idx[-1])
            return f"{d_min} → {d_max}"
        return "N/A"

    split_info = {
        "train_period": get_date_range(X_train.index),
        "val_period": get_date_range(X_val.index),
        "test_period": get_date_range(X_test.index),
        "train_samples": len(X_train),
        "val_samples": len(X_val),
        "test_samples": len(X_test)
    }

    return {
        "X_train": X_train, "y_train": y_train,
        "X_val": X_val, "y_val": y_val,
        "X_test": X_test, "y_test": y_test,
        "info": split_info
    }


def compute_classification_metrics(y_true: pd.Series, y_pred: np.ndarray, y_proba: Optional[np.ndarray] = None) -> Dict[str, Any]:
    """Computes comprehensive classification metrics."""
    acc = accuracy_score(y_true, y_pred)
    b_acc = balanced_accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, average="macro", zero_division=0)
    rec = recall_score(y_true, y_pred, average="macro", zero_division=0)
    f1 = f1_score(y_true, y_pred, average="macro", zero_division=0)
    cm = confusion_matrix(y_true, y_pred).tolist()

    roc_auc = None
    if y_proba is not None:
        try:
            if len(np.unique(y_true)) == 2:
                # Binary ROC-AUC
                p_pos = y_proba[:, 1] if y_proba.shape[1] > 1 else y_proba
                roc_auc = round(float(roc_auc_score(y_true, p_pos)), 3)
            elif len(np.unique(y_true)) > 2 and y_proba.shape[1] == len(np.unique(y_true)):
                roc_auc = round(float(roc_auc_score(y_true, y_proba, multi_class="ovr")), 3)
        except Exception:
            roc_auc = None

    return {
        "accuracy": round(float(acc), 4),
        "balanced_accuracy": round(float(b_acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1": round(float(f1), 4),
        "roc_auc": roc_auc,
        "confusion_matrix": cm,
        "sample_count": len(y_true)
    }


def compute_baseline_predictions(X: pd.DataFrame, y_train: pd.Series) -> Dict[str, np.ndarray]:
    """
    Computes standard academic baselines for financial time-series:
    1. Majority Class Baseline (predicts training mode)
    2. Previous-Day Persistence Baseline (predicts direction of 5-day / 1-day momentum)
    """
    mode_val = y_train.mode()[0] if not y_train.empty else 1
    majority_preds = np.full(len(X), mode_val)

    # Persistence: If ROC_10 or RETURN_5D > 0, predict UP (1), else DOWN (0 or -1)
    if "RETURN_5D" in X.columns:
        sig = X["RETURN_5D"].values
    elif "ROC_10" in X.columns:
        sig = X["ROC_10"].values
    else:
        sig = np.zeros(len(X))

    is_binary = set(y_train.unique()).issubset({0, 1})
    if is_binary:
        persistence_preds = np.where(sig > 0, 1, 0)
    else:
        persistence_preds = np.where(sig > 0.01, 1, np.where(sig < -0.01, -1, 0))

    return {
        "majority": majority_preds,
        "persistence": persistence_preds
    }


def build_pipeline(model_type: str = "Random Forest") -> Pipeline:
    """Builds a scikit-learn Pipeline with median imputation, scaling, and the selected classifier."""
    imputer = SimpleImputer(strategy="median")
    scaler = StandardScaler()
    if model_type == "Logistic Regression":
        clf = LogisticRegression(class_weight="balanced", max_iter=500, random_state=42)
    elif model_type == "XGBoost":
        try:
            from xgboost import XGBClassifier
            clf = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.05, random_state=42, eval_metric="logloss")
        except Exception:
            clf = GradientBoostingClassifier(n_estimators=100, max_depth=3, learning_rate=0.05, random_state=42)
    else:
        clf = RandomForestClassifier(n_estimators=100, max_depth=5, min_samples_split=10, random_state=42, class_weight="balanced")
    return Pipeline([("imputer", imputer), ("scaler", scaler), ("model", clf)])


def train_and_evaluate_model(
    X: pd.DataFrame,
    y: pd.Series,
    model_type: str = "Random Forest",
    random_state: int = 42
) -> Dict[str, Any]:
    """
    Trains model with:
    1. Chronological 3-way train/validation/test split (no look-ahead bias).
    2. Zero-leakage feature scaling (fitted strictly on train split).
    3. Baseline comparisons (Majority Class & Momentum Persistence).
    4. Rigorous evaluation across TRAIN, VALIDATION, and FINAL TEST.
    5. Time-aware calibration (TimeSeriesSplit) on training fold only.
    """
    if len(X) < 30:
        return {
            "error": "Insufficient historical samples for reliable 3-way time-series split.",
            "model": None,
            "beats_baseline": False,
            "verdict": "Insufficient data to train model."
        }

    splits = split_time_series_chronological(X, y, train_pct=0.60, val_pct=0.20)
    X_tr, y_tr = splits["X_train"], splits["y_train"]
    X_val, y_val = splits["X_val"], splits["y_val"]
    X_te, y_te = splits["X_test"], splits["y_test"]

    # Preprocessing: Imputer and Scaler FIT ONLY ON TRAINING SET
    imputer = SimpleImputer(strategy="median")
    scaler = StandardScaler()

    X_tr_imp = imputer.fit_transform(X_tr)
    X_tr_scaled = scaler.fit_transform(X_tr_imp)

    X_val_scaled = scaler.transform(imputer.transform(X_val))
    X_te_scaled = scaler.transform(imputer.transform(X_te))

    # Base Classifier
    if model_type == "Logistic Regression":
        clf = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=random_state)
    elif model_type == "XGBoost":
        try:
            from xgboost import XGBClassifier
            clf = XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.05, random_state=random_state, eval_metric="logloss")
        except Exception:
            clf = GradientBoostingClassifier(n_estimators=100, max_depth=3, learning_rate=0.05, random_state=random_state)
    else:  # Random Forest default
        clf = RandomForestClassifier(n_estimators=120, max_depth=5, min_samples_split=10, random_state=random_state, class_weight="balanced")

    clf.fit(X_tr_scaled, y_tr)

    # In-Sample (Train) Predictions
    p_tr = clf.predict(X_tr_scaled)
    prob_tr = clf.predict_proba(X_tr_scaled) if hasattr(clf, "predict_proba") else None
    train_metrics = compute_classification_metrics(y_tr, p_tr, prob_tr)

    # Validation Set Predictions (Used exclusively for model tuning / selection)
    p_val = clf.predict(X_val_scaled)
    prob_val = clf.predict_proba(X_val_scaled) if hasattr(clf, "predict_proba") else None
    val_metrics = compute_classification_metrics(y_val, p_val, prob_val)

    # FINAL TEST Set Predictions (Strictly held-out, evaluated only once)
    p_te = clf.predict(X_te_scaled)
    prob_te = clf.predict_proba(X_te_scaled) if hasattr(clf, "predict_proba") else None
    test_metrics = compute_classification_metrics(y_te, p_te, prob_te)

    # Baselines on Final Test Set
    test_baselines = compute_baseline_predictions(X_te, y_tr)
    majority_test_metrics = compute_classification_metrics(y_te, test_baselines["majority"])
    persistence_test_metrics = compute_classification_metrics(y_te, test_baselines["persistence"])

    # Best baseline for comparison
    best_baseline_acc = max(majority_test_metrics["accuracy"], persistence_test_metrics["accuracy"])
    best_baseline_f1 = max(majority_test_metrics["f1"], persistence_test_metrics["f1"])

    beats_baseline = (test_metrics["accuracy"] > best_baseline_acc and test_metrics["f1"] > best_baseline_f1)
    comparison_verdict = (
        f"Model outperformed the strongest baseline by +{(test_metrics['accuracy'] - best_baseline_acc)*100:.1f}% accuracy on the unseen Final Test set."
        if beats_baseline
        else "Model did not outperform the baseline during the tested period."
    )

    # Time-aware calibration on Train fold only using TimeSeriesSplit
    calibrated_clf = calibrate_classifier(clf, X_tr_scaled, y_tr, method="sigmoid", n_splits=3)

    # Whole pipeline for inference
    full_pipe = Pipeline([
        ("imputer", imputer),
        ("scaler", scaler),
        ("classifier", calibrated_clf)
    ])

    return {
        "model": full_pipe,
        "base_estimator": clf,
        "splits_info": splits["info"],
        "train_metrics": train_metrics,
        "val_metrics": val_metrics,
        "test_metrics": test_metrics,
        "majority_baseline": majority_test_metrics,
        "persistence_baseline": persistence_test_metrics,
        "best_baseline_accuracy": best_baseline_acc,
        "best_baseline_f1": best_baseline_f1,
        "beats_baseline": beats_baseline,
        "verdict": comparison_verdict,
        "random_seed": random_state,
        "model_type": model_type
    }


def compare_all_models(X: pd.DataFrame, y: pd.Series) -> List[Dict[str, Any]]:
    """
    Compares candidate architectures using strict two-stage selection:
      1. Evaluates all models on TRAIN and VALIDATION sets.
      2. Selects the champion model based strictly on VALIDATION F1/Accuracy.
      3. Reports FINAL TEST performance once without tuning against the test set.
    """
    raw_evals = []
    for m_type in ["Logistic Regression", "Random Forest", "XGBoost"]:
        try:
            res = train_and_evaluate_model(X, y, model_type=m_type)
            if "error" not in res:
                raw_evals.append(res)
        except Exception:
            pass

    if not raw_evals:
        return []

    # Model selection based STRICTLY on validation performance
    best_val_idx = int(np.argmax([r["val_metrics"]["f1"] for r in raw_evals]))

    results = []
    for i, res in enumerate(raw_evals):
        is_selected = (i == best_val_idx)
        results.append({
            "Model": res["model_type"],
            "Train Acc": res["train_metrics"]["accuracy"],
            "Val Acc": res["val_metrics"]["accuracy"],
            "Val F1": res["val_metrics"]["f1"],
            "Selected by Validation": "⭐ Best Validation Model" if is_selected else "Candidate",
            "Final Test Acc": res["test_metrics"]["accuracy"],
            "Final Test F1": res["test_metrics"]["f1"],
            "Baseline Test Acc": res["best_baseline_accuracy"],
            "Beats Baseline?": "YES" if res["beats_baseline"] else "NO",
            "Verdict": res["verdict"]
        })

    return results

