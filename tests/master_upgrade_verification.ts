import assert from 'node:assert';
import {
  computeLongTermInvestmentAnalysis,
  computeIntegratedDecisionSummary,
  getMultiStockComparison
} from '../src/dataEngine';
import {
  analyzeFinancialSentiment,
  aggregateArticleSentiment,
  calculateVaderScore
} from '../src/financialSentiment';
import {
  deduplicateAndGroupNewsArticles,
  classifyCorporateEvent
} from '../src/newsIntelligence';
import {
  StockQuote,
  TechnicalIndicators,
  SentimentData,
  ModelSignal,
  StockFundamentals
} from '../src/types';

console.log('--- STARTING MASTER ENGINEERING UPGRADE VERIFICATION TESTS ---\n');

// Mock data structures
const mockQuote: StockQuote = {
  ticker: 'RELIANCE.NS',
  companyName: 'Reliance Industries Limited',
  price: 1208.0,
  change: -4.5,
  changePct: -0.37,
  high52w: 1608.8,
  low52w: 1180.0,
  volume: 5420000,
  currency: 'INR',
  lastUpdated: '19 Oct 2026, 15:30 IST',
  dataStatus: 'LIVE',
  sector: 'Energy & Retail Conglomerate',
  industry: 'Diversified Oil, Petrochemicals, Telecom & Retail'
};

const mockFundamentals: StockFundamentals = {
  peRatio: 24.2,
  pbRatio: 2.1,
  eps: 49.9,
  marketCap: '₹16,30,000 Cr',
  roe: 14.5,
  roce: 13.8,
  debtToEquity: 42.0,
  revenueGrowthYoY: '11.8%',
  profitMarginPct: 9.4,
  operatingMarginPct: 17.2,
  freeCashFlow: '₹28,500 Cr',
  operatingCashFlow: '₹72,000 Cr',
  currentRatio: 1.15,
  dividendYield: 0.85,
  annualPnL: [
    {
      year: 'FY23',
      revenue: 892000,
      expenses: 738000,
      operatingProfit: 154000,
      opmPct: 17.2,
      depreciation: 40000,
      interest: 19000,
      pbt: 95000,
      tax: 21000,
      netProfit: 74000,
      patMarginPct: 8.3,
      eps: 45.2,
      roePct: 13.8,
      debtToEquity: 45.0
    },
    {
      year: 'FY24',
      revenue: 998000,
      expenses: 820000,
      operatingProfit: 178000,
      opmPct: 17.8,
      depreciation: 45000,
      interest: 22000,
      pbt: 111000,
      tax: 31000,
      netProfit: 80000,
      patMarginPct: 8.0,
      eps: 49.9,
      roePct: 14.5,
      debtToEquity: 42.0
    }
  ],
  shareholding: {
    promoterPct: 50.3,
    fiiPct: 22.1,
    diiPct: 16.5,
    publicPct: 11.1
  },
  dataStatus: 'VERIFIED_AUDIT'
};

const mockTechnicals: TechnicalIndicators = {
  rsi: 48.5,
  macd: -1.2,
  macdSignal: -0.8,
  macdHist: -0.4,
  ema10: 1215.0,
  ema20: 1222.0,
  ema50: 1245.0,
  ema100: 1260.0,
  ema200: 1275.0,
  volatility20d: 18.2,
  atr: 16.5,
  pivot: 1210.0,
  r1: 1225.0,
  s1: 1195.0,
  vwap: 1209.5,
  dataStatus: 'LIVE'
};

const mockSentiment: SentimentData = {
  vaderCompound: 0.12,
  finbertScore: null,
  finbertStatus: 'UNAVAILABLE',
  newsCount: 4,
  overallScore: 0.12,
  label: 'BULLISH',
  articles: [
    {
      title: 'Reliance Retail expands Instamart dark stores footprint across Tier-2 cities',
      publisher: 'The Economic Times',
      date: '19 Oct 2026',
      summary: 'Reliance Retail announced the launch of 50 new distribution dark stores to accelerate quick commerce expansion.',
      url: 'https://economictimes.indiatimes.com/retail-expansion',
      vaderScore: 0.25,
      finbertScore: null,
      sentimentLabel: 'POSITIVE',
      isCatalyst: true
    },
    {
      title: 'Reliance Retail deepens rapid delivery network in western India',
      publisher: 'Livemint',
      date: '19 Oct 2026',
      summary: 'The retail arm of Reliance Industries adds storage capacity for quick commerce dark stores.',
      url: 'https://livemint.com/retail-network',
      vaderScore: 0.18,
      finbertScore: null,
      sentimentLabel: 'POSITIVE',
      isCatalyst: true
    }
  ],
  reddit: {
    status: 'AUTH_REQUIRED',
    message: 'Reddit API credentials required',
    postCount: 0,
    posts: []
  },
  sentimentMethod: 'VADER_FALLBACK'
};

const mockSignal: ModelSignal = {
  signal: 'SELL',
  probabilities: { BUY: 0.25, HOLD: 0.35, SELL: 0.40 },
  confidence: 'Medium',
  confidenceScore: 65,
  predictionHorizon: '1-Day Intraday',
  modelName: 'Nexus 5-Pillar Decision Synthesis',
  topContributions: [],
  unifiedScore: -0.15,
  exactAction: 'SELL',
  breakdown: {
    finbert: { score: 0, weight: 0, contribution: 0, status: 'UNAVAILABLE' },
    vader: { score: 0.12, weight: 25, contribution: 0.03 },
    technicals: { score: -0.4, weight: 35, contribution: -0.14 },
    fundamentals: { score: 0.3, weight: 25, contribution: 0.075 },
    mlEnsemble: { score: -0.1, weight: 15, contribution: -0.015 }
  },
  executiveSummary: 'Defensive momentum below 20 EMA',
  tomorrowForecast: {
    direction: 'FALL',
    tradeAction: 'SELL',
    accuracyPct: 60,
    probabilityRisePct: 40,
    probabilityFallPct: 60,
    expectedTargetPrice: 1195.0,
    expectedRangeLow: 1195.0,
    expectedRangeHigh: 1225.0,
    expectedChangePct: -1.1,
    pivotPoint: 1210.0,
    supportLevel: 1195.0,
    resistanceLevel: 1225.0,
    gapOutlook: 'FLAT OPEN',
    confidenceLabel: 'MODERATE',
    rationale: 'Breakdown below moving averages',
    keyDrivers: ['Price below 20 EMA', 'Overhead resistance at 1225.0']
  },
  professionalTradeSetup: {
    bias: 'BEARISH BREAKDOWN',
    entryZone: '₹1204.0 – ₹1212.0',
    triggerPrice: 1208.0,
    stopLoss: 1228.0,
    stopLossPct: 1.7,
    target1: 1172.0,
    target1Pct: 3.0,
    target2: 1148.0,
    target2Pct: 5.0,
    riskRewardRatio: '1 : 2.4',
    vwap: 1209.5,
    priceVsVwap: 'BELOW VWAP (BEARISH)',
    deliveryVolumePct: null,
    institutionalBias: 'UNAVAILABLE',
    multiTimeframeConfluence: {
      dailyTrend: 'BEARISH',
      hourlyBreakout: 'RANGE',
      momentumRsi: 'BEARISH (<45)',
      confluenceRating: '3/4 MODERATE'
    },
    recommendedPositionSizePct: 0,
    traderPlaybook: 'Exit open longs; wait for confirmed breakdown below S1 support before shorting.'
  }
};

// ==============================================================================
// TEST SUITE 1: NEW FEATURE NINE — LONG-TERM INVESTMENT ANALYSIS
// ==============================================================================
console.log('[Test Suite 1] Testing Feature 9: Long-Term Investment Analysis Engine...');

const invAnalysis = computeLongTermInvestmentAnalysis(
  mockQuote.ticker,
  mockQuote,
  mockFundamentals,
  '3-5 Years',
  'Moderate'
);

assert(invAnalysis !== null, 'Analysis result must not be null');
assert.strictEqual(invAnalysis.ticker, 'RELIANCE.NS');
assert.strictEqual(invAnalysis.horizon, '3-5 Years');
assert.strictEqual(invAnalysis.riskPreference, 'Moderate');
assert(invAnalysis.dimensions.length === 12, 'Must evaluate exactly 12 investment dimensions');

// Verify Key 12 Dimensions exist
const dimIds = invAnalysis.dimensions.map(d => d.id);
assert(dimIds.includes('moat'), 'Must evaluate Moat');
assert(dimIds.includes('revenue_growth'), 'Must evaluate Revenue Growth');
assert(dimIds.includes('margins'), 'Must evaluate Margins');
assert(dimIds.includes('cash_flow'), 'Must evaluate Cash Flow');
assert(dimIds.includes('solvency'), 'Must evaluate Solvency');
assert(dimIds.includes('return_on_capital'), 'Must evaluate ROE/ROCE');
assert(dimIds.includes('valuation'), 'Must evaluate Valuation');
assert(dimIds.includes('governance'), 'Must evaluate Governance');

assert(invAnalysis.threeStrongestReasons.length === 3, 'Must provide exactly three strongest reasons');
assert(invAnalysis.threeMajorRisks.length === 3, 'Must provide exactly three major risks');
assert(invAnalysis.keyMetricsToMonitor.length >= 3, 'Must provide key metrics to monitor');
assert(invAnalysis.thesisInvalidationTriggers.length >= 2, 'Must provide explicit invalidation triggers');

console.log(`✓ Feature 9 Classification: ${invAnalysis.classification} (Confidence: ${invAnalysis.confidenceLabel})`);
console.log(`✓ 12 Dimensions verified across audited inputs (Data Completeness: ${invAnalysis.dataCompletenessPct}%).`);

// ==============================================================================
// TEST SUITE 2: NEW FEATURE TEN — INTEGRATED STOCK DECISION & COMPARISON
// ==============================================================================
console.log('\n[Test Suite 2] Testing Feature 10: Integrated Decision Summary & Comparison...');

const decisionSummary = computeIntegratedDecisionSummary(
  mockQuote.ticker,
  mockQuote,
  mockTechnicals,
  mockSentiment,
  mockSignal,
  mockFundamentals,
  '3-5 Years',
  'Moderate'
);

assert(decisionSummary !== null, 'Decision summary must not be null');
assert(decisionSummary.shortTerm.action.includes('SELL'), 'Short-term action must reflect tactical signal');
assert(decisionSummary.longTerm.classification.length > 0, 'Long-term classification must be populated');
assert(decisionSummary.matrix.length >= 6, 'Evidence matrix must have at least 6 comparative dimensions');

// Verify Disagreement Resolution
assert(
  decisionSummary.disagreementExplanation.includes('DIVERGENCE EXPLANATION') ||
  decisionSummary.disagreementExplanation.includes('CONVERGENCE ALIGNMENT'),
  'Must include explicit reconciliation of timeframes'
);
console.log(`✓ Short-Term Tactical Action: ${decisionSummary.shortTerm.action}`);
console.log(`✓ Long-Term Fundamental Thesis: ${decisionSummary.longTerm.classification}`);
console.log(`✓ Timeframe Disagreement Resolution: ${decisionSummary.disagreementExplanation.slice(0, 100)}...`);

// Test Multi-Stock Comparison Universe
const benchmarkUniverse = getMultiStockComparison({ 'RELIANCE.NS': mockQuote });
assert(Array.isArray(benchmarkUniverse) && benchmarkUniverse.length >= 5, 'Must contain 5+ benchmark peers');
assert(benchmarkUniverse.some(s => s.ticker === 'RELIANCE.NS'), 'Must include active ticker');
assert(benchmarkUniverse.some(s => s.ticker === 'TCS.NS'), 'Must include TCS');
assert(benchmarkUniverse.some(s => s.ticker === 'AAPL'), 'Must include AAPL');
console.log(`✓ Universe benchmark comparison contains ${benchmarkUniverse.length} companies evaluated under identical methodology.`);

// ==============================================================================
// TEST SUITE 3: FEATURE FOUR — FINANCIAL NEWS EVENT CLUSTERING
// ==============================================================================
console.log('\n[Test Suite 3] Testing Feature 4: Event Clustering & Catalyst Deduplication...');

const duplicateJioArticles = [
  {
    title: 'Reliance Jio mega IPO planned for 2026 listing at $110B valuation',
    publisher: 'The Economic Times',
    date: '19 Oct 2026',
    summary: 'Reliance Industries prepares to file DRHP for landmark Jio Platforms initial public offering.',
    url: 'https://economictimes.indiatimes.com/jio-ipo-1',
    vaderScore: 0.35,
    finbertScore: null,
    sentimentLabel: 'POSITIVE'
  },
  {
    title: 'Jio Platforms public listing slated for record Dalal Street debut',
    publisher: 'Moneycontrol',
    date: '19 Oct 2026',
    summary: 'Bankers appointed for multi-billion dollar Jio IPO on NSE and BSE.',
    url: 'https://moneycontrol.com/jio-ipo-2',
    vaderScore: 0.28,
    finbertScore: null,
    sentimentLabel: 'POSITIVE'
  },
  {
    title: 'Jio IPO expected to unlock massive retail value for Reliance shareholders',
    publisher: 'Livemint',
    date: '19 Oct 2026',
    summary: 'Analysts assess valuation multiples for upcoming Jio Platforms public issue.',
    url: 'https://livemint.com/jio-ipo-3',
    vaderScore: 0.31,
    finbertScore: null,
    sentimentLabel: 'POSITIVE'
  }
];

const clusteredResult = deduplicateAndGroupNewsArticles(duplicateJioArticles);
assert(clusteredResult.articles.length === 3, 'Must retain all 3 publisher articles for users to read');
assert.strictEqual(clusteredResult.distinctEventsCount, 1, '3 articles covering Jio IPO must be clustered into exactly 1 distinct corporate event');
assert.strictEqual(clusteredResult.expansionCatalystsCount, 1, 'Must count as exactly 1 expansion catalyst, NOT 3 separate catalysts');
assert(clusteredResult.eventClusters.length === 1, 'Must produce exactly 1 EventCluster');
assert.strictEqual(clusteredResult.eventClusters[0].articleCount, 3, 'Cluster must link all 3 underlying articles');
console.log(`✓ Event clustering verified: 3 Jio IPO articles correctly clustered into 1 distinct catalyst (Cluster: "${clusteredResult.eventClusters[0].title}").`);

// ==============================================================================
// TEST SUITE 4: FINANCIAL SENTIMENT ENGINE (VADER + KEYWORD CONTEXT)
// ==============================================================================
console.log('\n[Test Suite 4] Testing Financial Sentiment Engine (VADER + Financial Context)...');

async function testFinancialSentimentEngine() {
  const testHeadlines = [
    'Operating revenue surged by 24% with record quarterly profitability.',
    'Heavy debt burdens and widened quarterly loss trigger credit rating downgrade.'
  ];

  console.log('Running deterministic VADER + Financial Context Engine analysis...');
  const posRes = analyzeFinancialSentiment(testHeadlines[0]);
  const negRes = analyzeFinancialSentiment(testHeadlines[1]);

  assert(posRes.financialScore > 0, 'Positive headline must have positive score');
  assert.strictEqual(posRes.label, 'POSITIVE', 'Positive headline must have POSITIVE label');
  assert(posRes.matchedTerms.length > 0, 'Positive headline must match financial terms');

  assert(negRes.financialScore < 0, 'Negative headline must have negative score');
  assert.strictEqual(negRes.label, 'NEGATIVE', 'Negative headline must have NEGATIVE label');
  assert(negRes.matchedTerms.length > 0, 'Negative headline must match financial terms');

  const aggregate = aggregateArticleSentiment([posRes, negRes]);
  assert(aggregate.totalArticles === 2, 'Aggregate must evaluate both articles');
  assert(aggregate.matchedCatalysts.length > 0, 'Must record matched catalysts');
  assert(aggregate.matchedRisks.length > 0, 'Must record matched risks');

  console.log(`✓ Financial Sentiment Engine executed: Pos ${posRes.financialScore}, Neg ${negRes.financialScore}, Aggregate ${aggregate.overallScore}.`);

  // Test empty input
  const emptyRes = analyzeFinancialSentiment('');
  assert.strictEqual(emptyRes.financialScore, 0);
  assert.strictEqual(emptyRes.label, 'NEUTRAL');
  console.log('✓ Empty input handled cleanly without crash.');
}

await testFinancialSentimentEngine();

console.log('\n======================================================');
console.log('ALL MASTER ENGINEERING UPGRADE VERIFICATION TESTS PASSED!');
console.log('======================================================\n');
