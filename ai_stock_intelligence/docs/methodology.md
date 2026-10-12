# Research Methodology & Data Integrity

## 1. Dual-Pipeline Financial Sentiment
Financial news headlines and social discourse are processed through two distinct pipelines:
- **Lexicon-based Analysis (VADER)**: Rule-based valuation for rapid sentiment compound scoring.
- **Deep Contextual Classification (FinBERT)**: Hugging Face transformer model fine-tuned on financial phrasebank corpora for institutional accuracy.

## 2. Temporal Stationarity & Leakage Prevention
Financial markets exhibit non-stationarity. To avoid data leakage:
- No future information is utilized during indicator calculation.
- Expanding temporal windows via `TimeSeriesSplit` are enforced.
- Point-in-time constraints prevent retroactive fundamental ratio leakage.

## 3. Probability Calibration
Raw margins from decision trees or linear models are mapped to empirical frequencies using Platt Sigmoid calibration (`CalibratedClassifierCV`).
