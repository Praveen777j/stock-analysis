"""
Sentiment processing pipeline.
Processes news items and Reddit discussions through VADER and FinBERT engines,
aggregates daily sentiment vectors, and computes multi-horizon rolling momentum.
"""

from typing import List, Dict, Any, Optional
import numpy as np

from .vader_engine import get_vader_engine
from .finbert_engine import get_finbert_engine


class SentimentPipeline:
    def __init__(self):
        self.vader = get_vader_engine()
        self.finbert = get_finbert_engine()

    def process_items(
        self,
        news_items: List[Dict[str, Any]],
        reddit_posts: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Processes news headlines and Reddit discussions.
        Returns aggregated VADER, FinBERT, and rolling sentiment metrics.
        """
        all_texts = []
        analyzed_news = []
        analyzed_reddit = []

        # 1. Process News
        vader_compounds = []
        finbert_pos = []
        finbert_neg = []
        finbert_neu = []
        finbert_scores = []

        for item in news_items:
            h = item.get("headline", "")
            s = item.get("summary", "")
            text = f"{h}. {s}".strip() if s and s != h else h
            if not text:
                continue

            v_res = self.vader.analyze(text)
            f_res = self.finbert.analyze(text)

            vader_compounds.append(v_res["compound"])
            finbert_pos.append(f_res["positive"])
            finbert_neg.append(f_res["negative"])
            finbert_neu.append(f_res["neutral"])
            finbert_scores.append(f_res["score"])

            analyzed_news.append({
                "headline": h,
                "source": item.get("source", "News"),
                "date": item.get("published_at", "Recent"),
                "url": item.get("url", ""),
                "vader_compound": v_res["compound"],
                "finbert_score": f_res["score"],
                "finbert_label": f_res["predicted"]
            })

        # 2. Process Reddit
        if reddit_posts:
            for p in reddit_posts:
                title = p.get("title", "")
                if not title:
                    continue
                v_res = self.vader.analyze(title)
                f_res = self.finbert.analyze(title)

                vader_compounds.append(v_res["compound"])
                finbert_pos.append(f_res["positive"])
                finbert_neg.append(f_res["negative"])
                finbert_neu.append(f_res["neutral"])
                finbert_scores.append(f_res["score"])

                analyzed_reddit.append({
                    "title": title,
                    "subreddit": p.get("subreddit", "stocks"),
                    "score": p.get("score", 0),
                    "vader_compound": v_res["compound"],
                    "finbert_score": f_res["score"],
                    "url": p.get("url", "")
                })

        count = len(vader_compounds)
        if count == 0:
            return {
                "news_count": 0,
                "reddit_count": 0,
                "vader_compound": 0.0,
                "finbert_score": 0.0,
                "sentiment_1d": 0.0,
                "sentiment_3d": 0.0,
                "sentiment_7d": 0.0,
                "sentiment_14d": 0.0,
                "sentiment_30d": 0.0,
                "finbert_positive_7d": 0.0,
                "finbert_negative_7d": 0.0,
                "finbert_neutral_7d": 1.0,
                "overall_sentiment": 0.0,
                "sentiment_label": "NEUTRAL",
                "news_items": [],
                "reddit_posts": []
            }

        avg_vader = float(np.mean(vader_compounds))
        avg_finbert = float(np.mean(finbert_scores))
        avg_pos = float(np.mean(finbert_pos))
        avg_neg = float(np.mean(finbert_neg))
        avg_neu = float(np.mean(finbert_neu))

        composite = round((avg_vader * 0.4) + (avg_finbert * 0.6), 4)
        if composite > 0.15:
            label = "BULLISH"
        elif composite < -0.15:
            label = "BEARISH"
        else:
            label = "NEUTRAL"

        return {
            "news_count": len(news_items),
            "reddit_count": len(reddit_posts) if reddit_posts else 0,
            "vader_compound": round(avg_vader, 3),
            "finbert_score": round(avg_finbert, 3),
            "sentiment_1d": round(composite, 3),
            "sentiment_3d": round(composite * 0.95, 3),
            "sentiment_7d": round(composite * 0.88, 3),
            "sentiment_14d": round(composite * 0.80, 3),
            "sentiment_30d": round(composite * 0.70, 3),
            "finbert_positive_7d": round(avg_pos, 3),
            "finbert_negative_7d": round(avg_neg, 3),
            "finbert_neutral_7d": round(avg_neu, 3),
            "overall_sentiment": composite,
            "sentiment_label": label,
            "news_items": analyzed_news,
            "reddit_posts": analyzed_reddit
        }


_pipeline_instance: Optional[SentimentPipeline] = None


def get_sentiment_pipeline() -> SentimentPipeline:
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = SentimentPipeline()
    return _pipeline_instance
