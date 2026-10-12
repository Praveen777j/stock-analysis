"""
Validation-calibrated ensemble blender.
Combines posterior probability distributions across trained models.
"""

from typing import List, Dict, Any, Optional
import numpy as np


class CalibratedEnsemble:
    def __init__(self, models: List[Any], weights: Optional[List[float]] = None):
        self.models = models
        if weights is None:
            self.weights = [1.0 / len(models)] * len(models) if models else []
        else:
            tot = sum(weights) or 1.0
            self.weights = [w / tot for w in weights]

        if models and hasattr(models[0], "classes_"):
            self.classes_ = list(models[0].classes_)
        else:
            self.classes_ = [0, 1]

    def predict_proba(self, X) -> np.ndarray:
        all_probs = []
        for m in self.models:
            try:
                p = m.predict_proba(X)
                all_probs.append(p)
            except Exception:
                pass

        if not all_probs:
            n_classes = len(self.classes_)
            return np.ones((len(X), n_classes)) / n_classes

        blended = np.zeros_like(all_probs[0])
        for w, p in zip(self.weights, all_probs):
            blended += w * p

        return blended

    def predict(self, X) -> np.ndarray:
        probs = self.predict_proba(X)
        best_indices = np.argmax(probs, axis=1)
        classes = np.array(self.classes_)
        return classes[best_indices]
