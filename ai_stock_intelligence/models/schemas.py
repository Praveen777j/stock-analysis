"""
Model schemas and output dataclasses.
"""

from typing import Dict, Any, List
from dataclasses import dataclass, field


@dataclass
class CalibratedProbabilities:
    buy: float
    hold: float
    sell: float

    def to_dict(self) -> Dict[str, float]:
        return {"BUY": self.buy, "HOLD": self.hold, "SELL": self.sell}


@dataclass
class ModelSignalResult:
    ticker: str
    signal: str           # BUY | HOLD | SELL | HOLD / LOW CONFIDENCE
    probabilities: CalibratedProbabilities
    confidence: str       # High | Medium | Low
    confidence_score: float
    prediction_horizon: str
    top_contributions: List[Dict[str, Any]]
    model_name: str
