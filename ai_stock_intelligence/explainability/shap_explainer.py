"""
SHAP (SHapley Additive exPlanations) explainability engine for tree-based models and feature attribution.
"""

from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd


class ShapExplainer:
    def __init__(self, model_pipeline: Any, feature_names: List[str]):
        self.pipeline = model_pipeline
        self.feature_names = feature_names
        self._tree_model = self._extract_tree_model(model_pipeline)

    def _extract_tree_model(self, pipe: Any) -> Optional[Any]:
        curr = pipe
        # Unwrap CalibratedClassifierCV
        if hasattr(curr, "calibrated_classifiers_") and len(curr.calibrated_classifiers_) > 0:
            curr = curr.calibrated_classifiers_[0].estimator
        elif hasattr(curr, "estimator") and curr.estimator is not None:
            curr = curr.estimator
        # Unwrap Pipeline
        if hasattr(curr, "named_steps"):
            curr = curr.named_steps.get("classifier", curr)
        if hasattr(curr, "estimators_") or hasattr(curr, "get_booster"):
            return curr
        return curr if hasattr(curr, "feature_importances_") or hasattr(curr, "coef_") else None

    def explain_instance(self, feature_row: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Calculates exact SHAP values or model-derived impact weights for an individual prediction row.
        Labels the attribution method honestly.
        """
        contributions = []

        # 1. Genuine SHAP TreeExplainer
        if self._tree_model and (hasattr(self._tree_model, "estimators_") or hasattr(self._tree_model, "get_booster")):
            try:
                import shap
                explainer = shap.TreeExplainer(self._tree_model)
                shap_vals = explainer.shap_values(feature_row)

                if isinstance(shap_vals, list):
                    vals = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
                elif hasattr(shap_vals, "shape") and len(shap_vals.shape) == 3:
                    vals = shap_vals[0, :, 1]
                else:
                    vals = np.array(shap_vals)[0]

                for col, val in zip(self.feature_names, vals):
                    contributions.append({
                        "feature": col,
                        "value": round(float(feature_row[col].values[0]), 3),
                        "impact": round(float(val), 3),
                        "direction": "POSITIVE" if val >= 0 else "NEGATIVE",
                        "method": "SHAP (TreeExplainer)"
                    })
                contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
                return contributions
            except Exception:
                pass

        # 2. Linear model coefficients
        if self._tree_model and hasattr(self._tree_model, "coef_"):
            try:
                coefs = self._tree_model.coef_[0] if len(self._tree_model.coef_.shape) > 1 else self._tree_model.coef_
                for col, coef in zip(self.feature_names, coefs):
                    feat_val = float(feature_row[col].values[0]) if col in feature_row.columns else 0.0
                    impact = feat_val * coef
                    contributions.append({
                        "feature": col,
                        "value": round(feat_val, 3),
                        "impact": round(float(impact), 3),
                        "direction": "POSITIVE" if impact >= 0 else "NEGATIVE",
                        "method": "Linear Model Coefficient"
                    })
                contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
                return contributions
            except Exception:
                pass

        # 3. Model Feature Importances
        if self._tree_model and hasattr(self._tree_model, "feature_importances_"):
            try:
                imps = self._tree_model.feature_importances_
                for col, imp in zip(self.feature_names, imps):
                    feat_val = float(feature_row[col].values[0]) if col in feature_row.columns else 0.0
                    impact = feat_val * imp
                    contributions.append({
                        "feature": col,
                        "value": round(feat_val, 3),
                        "impact": round(float(impact), 3),
                        "direction": "POSITIVE" if impact >= 0 else "NEGATIVE",
                        "method": "Model Feature Importance"
                    })
                contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
                return contributions
            except Exception:
                pass

        # 4. Standardized feature deviation (explicitly labeled as heuristic interpretation)
        for col in self.feature_names:
            val = float(feature_row[col].values[0]) if col in feature_row.columns else 0.0
            if "RSI" in col:
                impact = (val - 50.0) * 0.02
            elif "MACD" in col:
                impact = val * 0.05
            elif "EMA" in col or "SPREAD" in col:
                impact = val * 0.10
            elif "VOLATILITY" in col:
                impact = (0.20 - val) * 0.10
            else:
                impact = val * 0.01

            contributions.append({
                "feature": col,
                "value": round(val, 3),
                "impact": round(impact, 3),
                "direction": "POSITIVE" if impact >= 0 else "NEGATIVE",
                "method": "Heuristic Feature Interpretation"
            })

        contributions.sort(key=lambda x: abs(x["impact"]), reverse=True)
        return contributions


def explain_prediction(pipeline: Any, feature_row: pd.DataFrame, feature_names: List[str]) -> List[Dict[str, Any]]:
    explainer = ShapExplainer(pipeline, feature_names)
    return explainer.explain_instance(feature_row)
