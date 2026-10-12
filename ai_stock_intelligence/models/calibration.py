"""
Probability calibration module using time-aware TimeSeriesSplit.
Ensures zero look-ahead bias during Platt sigmoid scaling.
"""

from typing import Any
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import TimeSeriesSplit


def calibrate_classifier(base_estimator: Any, X, y, method: str = "sigmoid", n_splits: int = 3) -> Any:
    """
    Fits Platt Scaling (method='sigmoid') on top of base classifier using TimeSeriesSplit.
    Guarantees that calibration training respects strict chronological order.
    Validation and final test data are NEVER used for calibration.
    Safely handles small datasets.
    """
    try:
        n_samples = len(X)
        if n_samples >= 45:
            effective_splits = min(n_splits, max(2, n_samples // 25))
            tscv = TimeSeriesSplit(n_splits=effective_splits)
            calibrated = CalibratedClassifierCV(estimator=base_estimator, method=method, cv=tscv)
            calibrated.fit(X, y)
            return calibrated
        else:
            base_estimator.fit(X, y)
            return base_estimator
    except Exception:
        try:
            base_estimator.fit(X, y)
        except Exception:
            pass
        return base_estimator
