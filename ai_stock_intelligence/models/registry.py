"""
Model registry and persistence layer.
"""

import os
import joblib
from typing import Any, Optional

from ai_stock_intelligence.config.settings import get_settings


class ModelRegistry:
    def __init__(self):
        self.settings = get_settings()
        self.models_dir = self.settings.models_dir

    def save_model(self, model: Any, name: str) -> str:
        safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in name)
        path = os.path.join(self.models_dir, f"{safe_name}.pkl")
        joblib.dump(model, path)
        return path

    def load_model(self, name: str) -> Optional[Any]:
        safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in name)
        path = os.path.join(self.models_dir, f"{safe_name}.pkl")
        if os.path.exists(path):
            try:
                return joblib.load(path)
            except Exception:
                return None
        return None


_registry: Optional[ModelRegistry] = None


def get_model_registry() -> ModelRegistry:
    global _registry
    if _registry is None:
        _registry = ModelRegistry()
    return _registry
