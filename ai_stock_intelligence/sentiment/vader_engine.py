"""
NLTK VADER sentiment analyzer for financial news and discussions.
"""

from typing import Dict, Any, List, Optional
import math


class VaderEngine:
    def __init__(self):
        self._analyzer = None
        self._init_vader()

    def _init_vader(self):
        try:
            import nltk
            from nltk.sentiment.vader import SentimentIntensityAnalyzer
            try:
                self._analyzer = SentimentIntensityAnalyzer()
            except LookupError:
                nltk.download("vader_lexicon", quiet=True)
                self._analyzer = SentimentIntensityAnalyzer()
        except Exception:
            self._analyzer = None

    def analyze(self, text: str) -> Dict[str, float]:
        """Calculates compound, positive, neutral, negative polarity scores."""
        if not text or not isinstance(text, str):
            return {"compound": 0.0, "pos": 0.0, "neu": 1.0, "neg": 0.0}

        if self._analyzer:
            scores = self._analyzer.polarity_scores(text)
            return {
                "compound": float(scores.get("compound", 0.0)),
                "pos": float(scores.get("pos", 0.0)),
                "neu": float(scores.get("neu", 1.0)),
                "neg": float(scores.get("neg", 0.0)),
            }

        # Offline financial lexicon scoring fallback
        text_lower = text.lower()
        pos_words = {"profit", "surge", "gain", "bullish", "growth", "record", "jump", "beat", "positive", "high", "upgrade", "outperform"}
        neg_words = {"loss", "fall", "drop", "bearish", "decline", "miss", "plunge", "risk", "negative", "low", "downgrade", "underperform", "fraud"}

        tokens = text_lower.split()
        p = sum(1 for t in tokens if t in pos_words)
        n = sum(1 for t in tokens if t in neg_words)
        total = len(tokens) or 1

        if p == 0 and n == 0:
            return {"compound": 0.0, "pos": 0.0, "neu": 1.0, "neg": 0.0}

        diff = p - n
        compound = float(diff / math.sqrt(diff * diff + 15))
        pos = min(1.0, p / total)
        neg = min(1.0, n / total)
        neu = max(0.0, 1.0 - (pos + neg))

        return {"compound": round(compound, 4), "pos": round(pos, 4), "neu": round(neu, 4), "neg": round(neg, 4)}


_vader_instance: Optional[VaderEngine] = None


def get_vader_engine() -> VaderEngine:
    global _vader_instance
    if _vader_instance is None:
        _vader_instance = VaderEngine()
    return _vader_instance
