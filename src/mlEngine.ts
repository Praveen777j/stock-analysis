import { HistoricalBar } from './types';

export interface MLPredictionOutput {
  status: 'SUCCESS' | 'NO_EDGE' | 'INSUFFICIENT_HISTORY' | 'TIMEOUT' | 'ERROR';
  ticker: string;
  probabilities: {
    up: number;
    neutral: number;
    down: number;
  };
  predictedClass: 'UP' | 'NEUTRAL' | 'DOWN';
  hasStatisticalEdge: boolean;
  edgeExplanation: string;
  featureContributions: Array<{
    name: string;
    value: number;
    standardizedValue: number;
    impact: number;
    description: string;
  }>;
  metrics: {
    outOfFoldAccuracy: number;
    majorityBaselineAccuracy: number;
    balancedAccuracy: number;
    precision: number;
    recall: number;
    buyAndHoldReturnPct: number;
    trainSamples: number;
    testSamples: number;
  };
  blendedWeight: number; // 0.0 if no edge, up to 0.10 if edge confirmed
  trainedAt: string;
}

interface Sample {
  features: number[];
  target: number; // 0 = UP, 1 = DOWN, 2 = NEUTRAL
  date: string;
  return5d: number;
}

// In-memory 1-hour cache per ticker
const mlModelCache = new Map<string, { data: MLPredictionOutput; expires: number }>();

const FEATURE_NAMES = [
  'RSI (14)',
  'MACD Histogram',
  'EMA20-50 Spread %',
  'Distance from EMA200 %',
  'ATR Volatility %',
  '5-Day Return %',
  '20-Day Return %',
  'Volume / 20D Avg',
  'Distance from 52W High %'
];

/**
 * Trains a calibrated, regularized Logistic Regression model on the stock's own history
 * using strict expanding-window walk-forward validation with a 5-day leakage gap.
 */
export function runStockLogisticRegression(
  ticker: string,
  bars: HistoricalBar[]
): MLPredictionOutput {
  const now = Date.now();
  const cached = mlModelCache.get(ticker);
  if (cached && cached.expires > now) {
    return cached.data;
  }

  // Minimum 500 daily bars required for statistical training and out-of-fold validation
  if (!bars || bars.length < 500) {
    const fallback: MLPredictionOutput = {
      status: 'INSUFFICIENT_HISTORY',
      ticker,
      probabilities: { up: 0.33, neutral: 0.34, down: 0.33 },
      predictedClass: 'NEUTRAL',
      hasStatisticalEdge: false,
      edgeExplanation: `Insufficient history: ${bars?.length || 0} bars available (minimum 500 daily trading sessions required for walk-forward training).`,
      featureContributions: [],
      metrics: {
        outOfFoldAccuracy: 0,
        majorityBaselineAccuracy: 0,
        balancedAccuracy: 0,
        precision: 0,
        recall: 0,
        buyAndHoldReturnPct: 0,
        trainSamples: 0,
        testSamples: 0
      },
      blendedWeight: 0.0,
      trainedAt: new Date().toISOString()
    };
    return fallback;
  }

  const startTime = Date.now();

  // 1. Build chronological feature matrix
  // Sort bars chronologically
  const sortedBars = [...bars]
    .filter(b => b && typeof b.close === 'number' && !isNaN(b.close) && b.close > 0 && b.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const n = sortedBars.length;
  const samples: Sample[] = [];

  // Need at least 200 bars warmup for EMA200 and 52-week rolling windows
  for (let t = 200; t < n - 5; t++) {
    // Check timeout (cap execution at 1800ms)
    if (Date.now() - startTime > 1800) {
      break;
    }

    const b = sortedBars[t];
    const close = b.close;

    // Feature 1: RSI (14)
    const rsi = typeof b.rsi === 'number' && Number.isFinite(b.rsi) ? b.rsi : 50;

    // Feature 2: MACD Histogram
    const macdHist = typeof b.macdHist === 'number' && Number.isFinite(b.macdHist) ? b.macdHist : 0;

    // Feature 3: EMA20 - EMA50 spread %
    const ema20 = b.ema20 || close;
    const ema50 = b.ema50 || close;
    const emaSpread = ema50 > 0 ? ((ema20 - ema50) / ema50) * 100 : 0;

    // Feature 4: Distance from EMA200 %
    const ema200 = b.ema200;
    const distEma200 = ema200 && ema200 > 0 ? ((close - ema200) / ema200) * 100 : 0;

    // Feature 5: ATR %
    const atr = b.atr || (close * 0.015);
    const atrPct = close > 0 ? (atr / close) * 100 : 1.5;

    // Feature 6: 5-day return %
    const prev5Close = sortedBars[t - 5]?.close || close;
    const ret5d = prev5Close > 0 ? ((close - prev5Close) / prev5Close) * 100 : 0;

    // Feature 7: 20-day return %
    const prev20Close = sortedBars[t - 20]?.close || close;
    const ret20d = prev20Close > 0 ? ((close - prev20Close) / prev20Close) * 100 : 0;

    // Feature 8: Volume ratio vs 20-day average
    let volSum = 0;
    for (let k = t - 20; k < t; k++) {
      volSum += sortedBars[k]?.volume || 0;
    }
    const avgVol20 = volSum / 20 || 1;
    const volRatio = (b.volume || 0) / avgVol20;

    // Feature 9: Distance from 52-week high % (past 252 bars up to day t only)
    const lookbackStart = Math.max(0, t - 252);
    let high52w = 0;
    for (let k = lookbackStart; k <= t; k++) {
      if (sortedBars[k].high > high52w) high52w = sortedBars[k].high;
    }
    const dist52w = high52w > 0 ? ((close - high52w) / high52w) * 100 : 0;

    // Forward return target: day t+5 close vs day t close
    const fwdClose = sortedBars[t + 5].close;
    const forwardReturn = close > 0 ? ((fwdClose - close) / close) * 100 : 0;

    let target = 2; // Neutral
    if (forwardReturn > 1.5) target = 0; // UP
    else if (forwardReturn < -1.5) target = 1; // DOWN

    samples.push({
      features: [rsi, macdHist, emaSpread, distEma200, atrPct, ret5d, ret20d, volRatio, dist52w],
      target,
      date: b.date,
      return5d: forwardReturn
    });
  }

  if (samples.length < 150) {
    return {
      status: 'INSUFFICIENT_HISTORY',
      ticker,
      probabilities: { up: 0.33, neutral: 0.34, down: 0.33 },
      predictedClass: 'NEUTRAL',
      hasStatisticalEdge: false,
      edgeExplanation: 'Insufficient valid training windows after indicator warmup.',
      featureContributions: [],
      metrics: {
        outOfFoldAccuracy: 0,
        majorityBaselineAccuracy: 0,
        balancedAccuracy: 0,
        precision: 0,
        recall: 0,
        buyAndHoldReturnPct: 0,
        trainSamples: 0,
        testSamples: 0
      },
      blendedWeight: 0.0,
      trainedAt: new Date().toISOString()
    };
  }

  // 2. Expanding-Window Walk-Forward Validation with a 5-day gap
  // Minimum initial train size: 100 samples
  // For each test step, train window = samples[0 ... t - 5]
  // Test sample = samples[t]
  const initialTrainSize = Math.max(100, Math.floor(samples.length * 0.6));
  const testPredictions: Array<{ pred: number; actual: number }> = [];

  let majorityClassCounts = [0, 0, 0];
  let correctPredictions = 0;

  for (let t = initialTrainSize; t < samples.length; t += 5) {
    if (Date.now() - startTime > 1800) break; // Time safety check

    const trainEnd = t - 5; // Strict 5-day leakage gap
    if (trainEnd < 50) continue;

    const trainSet = samples.slice(0, trainEnd);
    const testSample = samples[t];

    majorityClassCounts[testSample.target]++;

    // Fit weights on trainSet
    const { weights, means, stds } = trainLogisticModel(trainSet, 35); // 35 gradient steps per fold

    // Evaluate test sample
    const stdFeatures = testSample.features.map((val, idx) => (val - means[idx]) / (stds[idx] || 1));
    const probs = predictProbs(stdFeatures, weights);
    const predClass = probs.indexOf(Math.max(...probs));

    testPredictions.push({ pred: predClass, actual: testSample.target });
    if (predClass === testSample.target) {
      correctPredictions++;
    }
  }

  const testCount = testPredictions.length;
  if (testCount < 10) {
    return {
      status: 'INSUFFICIENT_HISTORY',
      ticker,
      probabilities: { up: 0.33, neutral: 0.34, down: 0.33 },
      predictedClass: 'NEUTRAL',
      hasStatisticalEdge: false,
      edgeExplanation: 'Too few walk-forward test folds to evaluate statistical performance.',
      featureContributions: [],
      metrics: {
        outOfFoldAccuracy: 0,
        majorityBaselineAccuracy: 0,
        balancedAccuracy: 0,
        precision: 0,
        recall: 0,
        buyAndHoldReturnPct: 0,
        trainSamples: initialTrainSize,
        testSamples: testCount
      },
      blendedWeight: 0.0,
      trainedAt: new Date().toISOString()
    };
  }

  const outOfFoldAccuracy = Math.round((correctPredictions / testCount) * 1000) / 10;
  const maxMajorityCount = Math.max(...majorityClassCounts);
  const majorityBaselineAccuracy = Math.round((maxMajorityCount / testCount) * 1000) / 10;

  // Compute balanced accuracy, precision, recall
  let balancedSum = 0;
  let precisionSum = 0;
  let recallSum = 0;
  for (let c = 0; c < 3; c++) {
    const truePos = testPredictions.filter(p => p.actual === c && p.pred === c).length;
    const actualPos = testPredictions.filter(p => p.actual === c).length;
    const predPos = testPredictions.filter(p => p.pred === c).length;

    const recall = actualPos > 0 ? truePos / actualPos : 0;
    const prec = predPos > 0 ? truePos / predPos : 0;

    balancedSum += recall;
    precisionSum += prec;
    recallSum += recall;
  }

  const balancedAccuracy = Math.round((balancedSum / 3) * 1000) / 10;
  const precision = Math.round((precisionSum / 3) * 1000) / 10;
  const recall = Math.round((recallSum / 3) * 1000) / 10;

  // Buy-and-Hold return over the test period
  const firstTestIdx = initialTrainSize;
  const lastTestIdx = samples.length - 1;
  const startClose = sortedBars[firstTestIdx]?.close || 1;
  const endClose = sortedBars[lastTestIdx]?.close || 1;
  const buyAndHoldReturnPct = Math.round(((endClose - startClose) / startClose) * 1000) / 10;

  // 3. Train final model on ALL historical samples up to day n - 5 to predict current bar
  const finalTrain = samples;
  const { weights, means, stds } = trainLogisticModel(finalTrain, 60);

  // Current bar features (latest bar)
  const latestBar = sortedBars[n - 1];
  const latestClose = latestBar.close;

  const currentRsi = typeof latestBar.rsi === 'number' && Number.isFinite(latestBar.rsi) ? latestBar.rsi : 50;
  const currentMacdHist = typeof latestBar.macdHist === 'number' && Number.isFinite(latestBar.macdHist) ? latestBar.macdHist : 0;
  const curEma20 = latestBar.ema20 || latestClose;
  const curEma50 = latestBar.ema50 || latestClose;
  const curEmaSpread = curEma50 > 0 ? ((curEma20 - curEma50) / curEma50) * 100 : 0;
  const curEma200 = latestBar.ema200;
  const curDistEma200 = curEma200 && curEma200 > 0 ? ((latestClose - curEma200) / curEma200) * 100 : 0;
  const curAtr = latestBar.atr || (latestClose * 0.015);
  const curAtrPct = latestClose > 0 ? (curAtr / latestClose) * 100 : 1.5;

  const prev5Close = sortedBars[Math.max(0, n - 6)]?.close || latestClose;
  const curRet5d = prev5Close > 0 ? ((latestClose - prev5Close) / prev5Close) * 100 : 0;

  const prev20Close = sortedBars[Math.max(0, n - 21)]?.close || latestClose;
  const curRet20d = prev20Close > 0 ? ((latestClose - prev20Close) / prev20Close) * 100 : 0;

  let volSum = 0;
  for (let k = Math.max(0, n - 21); k < n - 1; k++) {
    volSum += sortedBars[k]?.volume || 0;
  }
  const curAvgVol20 = volSum / 20 || 1;
  const curVolRatio = (latestBar.volume || 0) / curAvgVol20;

  const lookbackStart = Math.max(0, n - 253);
  let curHigh52w = 0;
  for (let k = lookbackStart; k < n; k++) {
    if (sortedBars[k].high > curHigh52w) curHigh52w = sortedBars[k].high;
  }
  const curDist52w = curHigh52w > 0 ? ((latestClose - curHigh52w) / curHigh52w) * 100 : 0;

  const currentFeatures = [
    currentRsi,
    currentMacdHist,
    curEmaSpread,
    curDistEma200,
    curAtrPct,
    curRet5d,
    curRet20d,
    curVolRatio,
    curDist52w
  ];

  const currentStdFeatures = currentFeatures.map((val, idx) => (val - means[idx]) / (stds[idx] || 1));
  const todayProbs = predictProbs(currentStdFeatures, weights);

  const probUp = Math.round(todayProbs[0] * 1000) / 10;
  const probDown = Math.round(todayProbs[1] * 1000) / 10;
  const probNeutral = Math.round(Math.max(0, 100 - probUp - probDown) * 10) / 10;

  let predictedClass: 'UP' | 'NEUTRAL' | 'DOWN' = 'NEUTRAL';
  if (probUp > probDown && probUp > probNeutral) predictedClass = 'UP';
  else if (probDown > probUp && probDown > probNeutral) predictedClass = 'DOWN';

  // Feature contributions for today: weight * standardized feature value
  const featureContributions = FEATURE_NAMES.map((name, idx) => {
    // Net directional impact: weight_up - weight_down
    const wUp = weights[0][idx];
    const wDown = weights[1][idx];
    const netWeight = wUp - wDown;
    const impact = Math.round(netWeight * currentStdFeatures[idx] * 100) / 100;

    let desc = '';
    if (impact > 0.05) desc = `Bullish pull on 5d forward forecast`;
    else if (impact < -0.05) desc = `Bearish pull on 5d forward forecast`;
    else desc = `Neutral impact on 5d forecast`;

    return {
      name,
      value: Math.round(currentFeatures[idx] * 100) / 100,
      standardizedValue: Math.round(currentStdFeatures[idx] * 100) / 100,
      impact,
      description: desc
    };
  });

  // Sort by absolute impact
  featureContributions.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  // Honesty Check: Out-of-fold accuracy must beat the majority-class baseline
  const hasStatisticalEdge = outOfFoldAccuracy > majorityBaselineAccuracy;

  let edgeExplanation = '';
  if (hasStatisticalEdge) {
    edgeExplanation = `Model achieved ${outOfFoldAccuracy}% out-of-fold walk-forward accuracy, exceeding the majority baseline of ${majorityBaselineAccuracy}%. Modest statistical edge detected.`;
  } else {
    edgeExplanation = `No statistical edge detected on this stock. Out-of-fold accuracy (${outOfFoldAccuracy}%) did not reliably beat the majority-class baseline (${majorityBaselineAccuracy}%). Output is informational and excluded from the master score.`;
  }

  const result: MLPredictionOutput = {
    status: hasStatisticalEdge ? 'SUCCESS' : 'NO_EDGE',
    ticker,
    probabilities: {
      up: probUp,
      neutral: probNeutral,
      down: probDown
    },
    predictedClass,
    hasStatisticalEdge,
    edgeExplanation,
    featureContributions,
    metrics: {
      outOfFoldAccuracy,
      majorityBaselineAccuracy,
      balancedAccuracy,
      precision,
      recall,
      buyAndHoldReturnPct,
      trainSamples: samples.length,
      testSamples: testCount
    },
    blendedWeight: hasStatisticalEdge ? 0.05 : 0.0,
    trainedAt: new Date().toISOString()
  };

  // Cache for 1 hour
  mlModelCache.set(ticker, { data: result, expires: now + 3600_000 });

  return result;
}

// -----------------------------------------------------------------------------
// HELPER: Multinomial Logistic Regression with L2 Regularization
// -----------------------------------------------------------------------------
function trainLogisticModel(
  samples: Sample[],
  iterations: number = 50,
  l2Lambda: number = 0.01,
  lr: number = 0.08
): { weights: number[][]; means: number[]; stds: number[] } {
  const numFeatures = samples[0].features.length;
  const numClasses = 3; // 0=UP, 1=DOWN, 2=NEUTRAL

  // 1. Calculate means and standard deviations for z-score normalization
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(0);

  for (const s of samples) {
    for (let f = 0; f < numFeatures; f++) {
      means[f] += s.features[f];
    }
  }
  for (let f = 0; f < numFeatures; f++) {
    means[f] /= samples.length;
  }

  for (const s of samples) {
    for (let f = 0; f < numFeatures; f++) {
      const diff = s.features[f] - means[f];
      stds[f] += diff * diff;
    }
  }
  for (let f = 0; f < numFeatures; f++) {
    stds[f] = Math.sqrt(stds[f] / (samples.length - 1)) || 1;
  }

  // 2. Initialize weights (classes x features)
  const weights: number[][] = [];
  for (let c = 0; c < numClasses; c++) {
    weights.push(new Array(numFeatures).fill(0));
  }

  // 3. Mini-batch / Stochastic gradient descent with L2 penalty
  for (let it = 0; it < iterations; it++) {
    for (const s of samples) {
      // Standardize input features
      const x = s.features.map((val, idx) => (val - means[idx]) / stds[idx]);
      const probs = predictProbs(x, weights);

      for (let c = 0; c < numClasses; c++) {
        const targetIndicator = s.target === c ? 1 : 0;
        const err = probs[c] - targetIndicator;

        for (let f = 0; f < numFeatures; f++) {
          // Gradient = err * x[f] + l2Lambda * weight
          const grad = err * x[f] + l2Lambda * weights[c][f];
          weights[c][f] -= lr * grad;
        }
      }
    }
  }

  return { weights, means, stds };
}

function predictProbs(stdFeatures: number[], weights: number[][]): number[] {
  const numClasses = weights.length;
  const scores: number[] = [];

  for (let c = 0; c < numClasses; c++) {
    let s = 0;
    for (let f = 0; f < stdFeatures.length; f++) {
      s += weights[c][f] * stdFeatures[f];
    }
    scores.push(s);
  }

  // Softmax with numerical stability
  const maxScore = Math.max(...scores);
  const exps = scores.map(s => Math.exp(Math.max(-20, Math.min(20, s - maxScore))));
  const sumExp = exps.reduce((acc, val) => acc + val, 0) || 1;

  return exps.map(e => e / sumExp);
}
