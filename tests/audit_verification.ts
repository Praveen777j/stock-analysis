import assert from 'node:assert';
import {
  computeIndicatorsOnBars,
  extractTechnicals,
  computeModelSignal,
  runBacktest
} from '../src/dataEngine';
import { HistoricalBar, StockQuote, SentimentData } from '../src/types';

console.log('--- STARTING NEXUS STOCK SENTIMENT DASHBOARD VERIFICATION TESTS ---');

// 1. Technical Indicators Calculation Test with Known Bars
console.log('\n[Test 1] Testing Indicator Calculations on Synthetic OHLCV Bars...');

const testBars: HistoricalBar[] = [];
const basePrice = 100;
for (let i = 0; i < 220; i++) {
  // Deterministic upward sine-trend pattern
  const c = basePrice + i * 0.5 + Math.sin(i / 5) * 2;
  const h = c + 1.5;
  const l = c - 1.2;
  const o = (c + l) / 2;
  testBars.push({
    date: new Date(2025, 0, 1 + i).toISOString().split('T')[0],
    open: Math.round(o * 100) / 100,
    high: Math.round(h * 100) / 100,
    low: Math.round(l * 100) / 100,
    close: Math.round(c * 100) / 100,
    volume: 1000000 + i * 1000
  });
}

computeIndicatorsOnBars(testBars);

// Verify EMAs exist at correct periods
const bar219 = testBars[219];
assert(bar219.ema10 !== undefined, 'EMA 10 should be defined at bar 220');
assert(bar219.ema20 !== undefined, 'EMA 20 should be defined at bar 220');
assert(bar219.ema50 !== undefined, 'EMA 50 should be defined at bar 220');
assert(bar219.ema100 !== undefined, 'EMA 100 should be defined at bar 220');
assert(bar219.ema200 !== undefined, 'EMA 200 should be defined at bar 220');
console.log('✓ EMAs (10, 20, 50, 100, 200) successfully calculated and verified.');

// Verify RSI
assert(bar219.rsi !== undefined, 'RSI should be defined');
assert(bar219.rsi >= 0 && bar219.rsi <= 100, `RSI must be in [0, 100], got ${bar219.rsi}`);
console.log(`✓ RSI (14) successfully calculated: ${bar219.rsi}`);

// Verify MACD
assert(bar219.macd !== undefined, 'MACD line must be defined');
assert(bar219.macdSignal !== undefined, 'MACD signal must be defined');
assert(bar219.macdHist !== undefined, 'MACD histogram must be defined');
const expectedHist = Math.round((bar219.macd - bar219.macdSignal) * 100) / 100;
assert(Math.abs(bar219.macdHist - expectedHist) <= 0.02, `MACD Hist ${bar219.macdHist} matches line - signal ${expectedHist}`);
console.log(`✓ MACD Line, Signal, and Histogram verified: ${bar219.macd} / ${bar219.macdSignal} / ${bar219.macdHist}`);

// Verify Bollinger Bands
assert(bar219.bbUpper !== undefined && bar219.bbLower !== undefined && bar219.bbMiddle !== undefined, 'Bollinger Bands must be defined');
assert(bar219.bbUpper > bar219.bbMiddle, 'BB Upper must exceed Middle');
assert(bar219.bbMiddle > bar219.bbLower, 'BB Middle must exceed Lower');
console.log(`✓ Bollinger Bands (20, 2) verified: Upper ${bar219.bbUpper}, Mid ${bar219.bbMiddle}, Lower ${bar219.bbLower}`);

// Verify Stochastic
assert(bar219.stochK !== undefined, 'Stochastic %K must be defined');
assert(bar219.stochD !== undefined, 'Stochastic %D must be defined');
assert(bar219.stochK >= 0 && bar219.stochK <= 100, 'Stochastic %K in [0, 100]');
assert(bar219.stochD >= 0 && bar219.stochD <= 100, 'Stochastic %D in [0, 100]');
console.log(`✓ Stochastic Oscillator verified: %K ${bar219.stochK}, %D ${bar219.stochD}`);

// Verify ATR
assert(bar219.atr !== undefined && bar219.atr > 0, 'ATR must be positive');
console.log(`✓ ATR (14) True Range verified: ${bar219.atr}`);

// 2. Insufficient History Test
console.log('\n[Test 2] Testing Insufficient History Handling (No Fabricated Values)...');
const shortBars: HistoricalBar[] = testBars.slice(0, 12); // Only 12 bars
computeIndicatorsOnBars(shortBars);
const techShort = extractTechnicals(shortBars);

assert(techShort.ema20 === undefined, 'EMA 20 must be undefined when n < 20');
assert(techShort.ema50 === undefined, 'EMA 50 must be undefined when n < 50');
assert(techShort.ema200 === undefined, 'EMA 200 must be undefined when n < 200');
assert(techShort.rsi === undefined, 'RSI must be undefined when n < 15');
assert(techShort.macd === undefined, 'MACD must be undefined when n < 34');
console.log('✓ Insufficient history correctly returns undefined without fabricating values.');

// 3. Pivot Points Test from Prior Completed Session
console.log('\n[Test 3] Testing Floor Trader and Fibonacci Pivot Points...');
const techPivots = extractTechnicals(testBars);
assert(techPivots.pivot !== undefined, 'Pivot point must be defined with >= 2 bars');
assert(techPivots.r1 !== undefined && techPivots.s1 !== undefined, 'R1 and S1 must be defined');
assert(techPivots.r2 !== undefined && techPivots.s2 !== undefined, 'R2 and S2 must be defined');
assert(techPivots.r3 !== undefined && techPivots.s3 !== undefined, 'R3 and S3 must be defined');
assert(techPivots.fibR1 !== undefined && techPivots.fibS1 !== undefined, 'Fibonacci pivots must be defined');
assert(techPivots.r1 > techPivots.pivot, 'R1 must be above Pivot');
assert(techPivots.s1 < techPivots.pivot, 'S1 must be below Pivot');
console.log(`✓ Pivot Points verified: S1 ${techPivots.s1} < P ${techPivots.pivot} < R1 ${techPivots.r1}`);

// 4. Model Scoring & Factor Contribution Consistency Test
console.log('\n[Test 4] Testing Model Scoring Formula & Additive Feature Decomposition...');
const mockQuote: StockQuote = {
  ticker: 'RELIANCE.NS',
  companyName: 'Reliance Industries Limited',
  price: 2450.0,
  change: 15.0,
  changePct: 0.62,
  high52w: 2600.0,
  low52w: 2100.0,
  volume: 3500000,
  currency: 'INR',
  exchange: 'NSE',
  country: 'IN',
  sector: 'Energy',
  lastUpdated: new Date().toISOString(),
  dataStatus: 'LIVE',
  fundamentals: {
    profitMarginPct: 12.5,
    debtToEquity: 35.0,
    revenueGrowthYoY: '+8.4%',
    dataStatus: 'LIVE_PROVIDER_DATA' as const
  }
};

const mockSentiment: SentimentData = {
  overallScore: 0.22,
  vaderCompound: 0.28,
  finbertScore: 0.0,
  newsCount: 4,
  label: 'BULLISH',
  dataStatus: 'LIVE',
  articles: [],
  reddit: { status: 'EMPTY', posts: [], message: '', postCount: 0 }
};

const signalWithFunds = computeModelSignal(techPivots, mockSentiment, mockQuote);
assert(signalWithFunds.unifiedScore >= -1.0 && signalWithFunds.unifiedScore <= 1.0, 'Unified score must be in [-1.0, 1.0]');
assert(signalWithFunds.breakdown.fundamentals !== undefined, 'Fundamentals breakdown must be present');
// Weights check: 30% + 25% + 15% + 15% + 15% = 100%
const wSum = signalWithFunds.breakdown.technicals.weight +
  signalWithFunds.breakdown.finbert.weight +
  (signalWithFunds.breakdown.fundamentals?.weight || 0) +
  signalWithFunds.breakdown.vader.weight +
  signalWithFunds.breakdown.mlEnsemble.weight;
assert(Math.abs(wSum - 1.0) < 1e-4, `Sum of weights must equal 1.00, got ${wSum}`);

// Contribution check: sum of contributions must match unifiedScore within rounding
const contribSum = signalWithFunds.breakdown.technicals.contribution +
  signalWithFunds.breakdown.finbert.contribution +
  (signalWithFunds.breakdown.fundamentals?.contribution || 0) +
  signalWithFunds.breakdown.vader.contribution +
  signalWithFunds.breakdown.mlEnsemble.contribution;
assert(Math.abs(signalWithFunds.unifiedScore - contribSum) <= 0.05, `Unified score ${signalWithFunds.unifiedScore} matches contrib sum ${contribSum}`);
console.log(`✓ 5-Pillar Decision Synthesis & Additive Decomposition verified (Unified Score: ${signalWithFunds.unifiedScore}, Weights sum: ${wSum * 100}%).`);

// Test without fundamentals
const mockQuoteNoFunds = { ...mockQuote, fundamentals: { dataStatus: 'UNAVAILABLE' as const } };
const signalNoFunds = computeModelSignal(techPivots, mockSentiment, mockQuoteNoFunds);
assert(signalNoFunds.breakdown.fundamentals === undefined, 'Fundamentals must be undefined when dataStatus is UNAVAILABLE');
const wSumNoFunds = signalNoFunds.breakdown.technicals.weight +
  signalNoFunds.breakdown.finbert.weight +
  signalNoFunds.breakdown.vader.weight +
  signalNoFunds.breakdown.mlEnsemble.weight;
assert(Math.abs(wSumNoFunds - 1.0) < 1e-4, `Sum of fallback weights must equal 1.00, got ${wSumNoFunds}`);
console.log(`✓ Fallback without fundamentals verified (Weights sum: ${wSumNoFunds * 100}%, Fundamentals excluded without distortion).`);

// 5. Backtest Engine Validation
console.log('\n[Test 5] Testing Walk-Forward Backtesting Engine...');
const btResult = runBacktest(testBars, 100000);
assert(btResult.dataStatus !== 'UNAVAILABLE', 'Backtest must succeed with 220 bars');
assert(btResult.metrics.initialCapital === 100000, 'Initial capital must be 100000');
assert(btResult.equityCurve.length > 0, 'Equity curve must contain data points');
console.log(`✓ Backtest execution verified: Initial Capital ₹${btResult.metrics.initialCapital}, Final ₹${btResult.metrics.finalCapital}, Trades: ${btResult.metrics.totalTrades}, Win Rate: ${btResult.metrics.winRatePct}%`);

// Insufficient bars for backtest
const btShort = runBacktest(testBars.slice(0, 30), 100000);
assert(btShort.dataStatus === 'UNAVAILABLE', 'Backtest with < 50 bars must report UNAVAILABLE');
assert(btShort.equityCurve.length === 0, 'Backtest with < 50 bars must have empty equity curve');
console.log('✓ Backtest insufficient data (< 50 bars) correctly returns UNAVAILABLE without fake trades.');

console.log('\n======================================================');
console.log('ALL VERIFICATION AUDIT TESTS PASSED SUCCESSFULLY!');
console.log('======================================================\n');
