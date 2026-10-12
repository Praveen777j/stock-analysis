"""Models package initialization."""
from .schemas import CalibratedProbabilities, ModelSignalResult
from .calibration import calibrate_classifier
from .train import build_pipeline, train_and_evaluate_model, compare_all_models
from .predict import predict_calibrated_signal
from .ensemble import CalibratedEnsemble
from .registry import ModelRegistry, get_model_registry

__all__ = [
    "CalibratedProbabilities",
    "ModelSignalResult",
    "calibrate_classifier",
    "build_pipeline",
    "train_and_evaluate_model",
    "compare_all_models",
    "predict_calibrated_signal",
    "CalibratedEnsemble",
    "ModelRegistry",
    "get_model_registry"
]
