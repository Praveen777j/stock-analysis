export interface StockQuote {
  ticker: string;
  companyName: string;
  exchange?: string;
  country?: string;
  sector?: string;
  industry?: string;
  price: number;
  change: number;
  changePct: number;
  high52w: number;
  low52w: number;
  volume: number;
  currency: string;
  lastUpdated?: string;
  dataStatus?: 'LIVE' | 'REFERENCE' | 'UNAVAILABLE';
  website?: string;
  businessSummary?: string;
  fundamentals?: StockFundamentals;
  // Multi-period returns during fetch
  change1mPct?: number;
  change1wPct?: number;
  change3mPct?: number;
  change1yPct?: number;
  change1mAmount?: number;
}

export interface HistoricalBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema10?: number;
  ema20?: number;
  ema50?: number;
  ema100?: number;
  ema200?: number;
  sma20?: number;
  sma50?: number;
  sma200?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMiddle?: number;
  bbBandwidth?: number;
  bbPercentB?: number;
  stochK?: number;
  stochD?: number;
  atr?: number;
  adx?: number;
}

export interface TechnicalIndicators {
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  ema10?: number;
  ema20?: number;
  ema50?: number;
  ema100?: number;
  ema200?: number;
  volatility20d: number;
  atr?: number;
  adx?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMiddle?: number;
  bbBandwidth?: number;
  bbPercentB?: number;
  stochK?: number;
  stochD?: number;
  pivot?: number;
  r1?: number;
  r2?: number;
  r3?: number;
  s1?: number;
  s2?: number;
  s3?: number;
  fibR1?: number;
  fibR2?: number;
  fibS1?: number;
  fibS2?: number;
  roc10?: number;
  momentum10?: number;
  vwap?: number;
  dataStatus?: 'LIVE' | 'UNAVAILABLE';
}

export interface NewsArticle {
  title: string;
  publisher: string;
  date: string;
  summary: string;
  vaderScore: number;
  finbertScore: number | null;
  distilbertScore?: number | null;
  distilbertLabel?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sentimentLabel?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  url?: string;
  isCatalyst?: boolean;
  corporateEventId?: string;
  corporateEventTitle?: string;
  corporateEventType?: 'EXPANSION' | 'RISK' | 'ROUTINE';
  // Financial Context Engine attributes
  financialScore?: number;
  financialMagnitude?: number;
  evidenceStrength?: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'NEUTRAL' | 'UNCERTAIN' | 'INSUFFICIENT';
  matchedTerms?: string[];
  contextCategories?: string[];
  isHeadlineOnly?: boolean;
  isUncertainOrAttributed?: boolean;
  isMixed?: boolean;
  // Enhanced Multi-Source Intelligence attributes
  pubTimestamp?: number;
  relatedCompany?: string;
  relevanceScore?: number;
  isOld?: boolean;
  isBreaking?: boolean;
  isInvalidOrMissingDate?: boolean;
  sourceCategory?: 'COMPANY_SPECIFIC' | 'GLOBAL_MARKET' | 'INDIAN_BUSINESS';
}

export interface EventCluster {
  id: string;
  title: string;
  category: 'CATALYST' | 'RISK' | 'BROKER_OPINION' | 'ROUTINE_FILING' | 'PRICE_ACTION';
  type?: 'EXPANSION' | 'RISK' | 'ROUTINE' | string;
  impactScore?: number;
  articleCount: number;
  summary: string;
  firstSeen: string;
  latestSeen: string;
  articles: NewsArticle[];
  isVerifiedCatalyst: boolean;
  isVerifiedRisk: boolean;
}

export interface RedditPost {
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  url: string;
  date?: string;
  vaderScore?: number;
  finbertScore?: number | null;
  distilbertScore?: number | null;
  sentimentLabel?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export interface RedditResult {
  status: 'AUTH_REQUIRED' | 'SUCCESS' | 'EMPTY' | 'RATE_LIMITED' | 'ERROR';
  message: string;
  postCount: number;
  posts: RedditPost[];
  socialBuzzScore?: number;
  bullishPct?: number;
  bearishPct?: number;
}

export interface SentimentData {
  vaderCompound: number;
  vaderStatus?: 'AVAILABLE' | 'UNAVAILABLE';
  financialScore?: number;
  financialMagnitude?: number;
  evidenceStrength?: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'NEUTRAL' | 'UNCERTAIN' | 'INSUFFICIENT';
  matchedCatalysts?: string[];
  matchedRisks?: string[];
  matchedContextCategories?: string[];
  finbertScore: number | null;
  finbertStatus?: 'LIVE' | 'UNAVAILABLE';
  distilbertScore?: number | null;
  distilbertStatus?: 'AVAILABLE' | 'UNAVAILABLE';
  distilbertModel?: string;
  distilbertLicense?: string;
  distilbertDiagnostic?: string;
  distilbertReason?: string;
  combinedSummary?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED' | 'UNAVAILABLE';
  newsCount: number;
  overallScore: number;
  label: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  articles: NewsArticle[];
  reddit: RedditResult;
  dataStatus?: 'LIVE' | 'EMPTY' | 'UNAVAILABLE';
  finbertDiagnostic?: string;
  finbertReason?: 'MISSING_TOKEN' | 'INVALID_CREDENTIALS' | 'INSUFFICIENT_ACCESS' | 'CREDITS_EXHAUSTED' | 'EMPTY_INPUT' | 'AUTH_ERROR' | 'RATE_LIMITED' | 'UNSUPPORTED_ENDPOINT' | 'MODEL_LOADING' | 'MODEL_UNAVAILABLE' | 'TIMEOUT' | 'NETWORK_ERROR' | 'MALFORMED_RESPONSE' | 'SERVICE_UNAVAILABLE';
  sentimentMethod?: 'FINANCIAL_CONTEXT_VADER' | 'VADER_FALLBACK' | 'FINBERT_LOCAL' | 'FINBERT_REMOTE' | 'FINBERT_VADER_HYBRID' | 'DISTILBERT_VADER' | 'UNAVAILABLE';
  sentimentEngine?: 'FINANCIAL_CONTEXT_VADER' | 'VADER_FALLBACK' | 'FINBERT_LOCAL' | 'FINBERT_REMOTE' | 'DISTILBERT_VADER' | 'UNAVAILABLE';
  distinctEventsCount?: number;
  expansionCatalystsCount?: number;
  cautionaryOverhangsCount?: number;
  eventClusters?: EventCluster[];
  // Multi-Source Intelligence & Fault-Tolerance status
  sourcesUsed?: string[];
  sourcesFailed?: string[];
  sourcesStatus?: Array<{
    name: string;
    status: 'SUCCESS' | 'FAILED' | 'CACHED';
    itemCount: number;
    error?: string;
  }>;
  sourcesSummary?: string;
  isPartialFailure?: boolean;
  isStale?: boolean;
  cachedAt?: string;
  cacheTimestamp?: number;
  globalMarketNews?: NewsArticle[];
}

export interface AnnualFinancialRow {
  year: string;
  revenue: number; // In ₹ Cr (or $B)
  expenses: number;
  operatingProfit: number;
  opmPct: number;
  depreciation: number;
  interest: number;
  pbt: number;
  tax: number;
  netProfit: number; // Profit After Tax (PAT) -> negative represents Loss
  netProfitGrowthPct?: number; // YoY growth
  patMarginPct: number;
  eps: number;
  roePct: number;
  debtToEquity: number;
}

export interface ShareholdingPattern {
  promoterPct: number;
  fiiPct: number;
  diiPct: number;
  publicPct: number;
}

export interface StockFundamentals {
  peRatio?: number;
  forwardPe?: number;
  pbRatio?: number;
  eps?: number;
  marketCap?: string;
  enterpriseValue?: string;
  bookValue?: number;
  faceValue?: number;
  dividendYield?: number;
  roe?: number;
  roce?: number;
  debtToEquity?: number;
  totalRevenue?: string;
  revenueGrowthYoY?: string;
  profitMarginPct?: number;
  operatingMarginPct?: number;
  grossMarginPct?: number;
  freeCashFlow?: string;
  operatingCashFlow?: string;
  currentRatio?: number;
  website?: string;
  sector?: string;
  industry?: string;
  businessSummary?: string;
  financialHealthGrade?: 'A+ (Excellent)' | 'A (Strong)' | 'B (Moderate)' | 'C (Leveraged)' | 'D (Distressed)';
  profitSituation?: 'Surging Profit Growth' | 'Stable Expansion' | 'Margin Compression' | 'Loss Accumulation';
  annualPnL?: AnnualFinancialRow[];
  quarterlyPnL?: AnnualFinancialRow[];
  shareholding?: ShareholdingPattern;
  dataStatus?: 'LIVE_PROVIDER_DATA' | 'SAMPLE_DATA' | 'VERIFIED_AUDIT' | 'UNAVAILABLE';
  pnlStatus?: 'LIVE_PROVIDER_DATA' | 'SAMPLE_DATA' | 'VERIFIED_AUDIT' | 'UNAVAILABLE';
  shareholdingStatus?: 'LIVE_PROVIDER_DATA' | 'SAMPLE_DATA' | 'VERIFIED_AUDIT' | 'UNAVAILABLE';
  statementsUnavailableReason?: string;
}

export interface BenchmarkData {
  benchmarkTicker: string;
  marketReturn1d?: number;
  marketReturn5d?: number;
  marketReturn20d?: number;
  marketVolatility20d?: number;
  benchmarkBars?: HistoricalBar[];
  beta?: number;
  dataStatus?: 'LIVE' | 'UNAVAILABLE';
}

export interface FeatureContribution {
  feature: string;
  value: number;
  impact: number;
  direction: 'POSITIVE' | 'NEGATIVE';
  description: string;
}

export interface BullishCatalyst {
  source: 'NEWS_API' | 'REDDIT_SOCIAL' | 'TECHNICAL_MOMENTUM';
  title: string;
  category: string;
  impactScore: number;
  upsidePotential: string;
  reasoning: string;
}

export interface TomorrowForecast {
  direction: 'RISE' | 'FALL' | 'NEUTRAL';
  tradeAction: 'BUY' | 'SELL' | 'HOLD';
  accuracyPct: number;
  probabilityRisePct: number;
  probabilityFallPct: number;
  expectedTargetPrice: number;
  expectedRangeLow: number;
  expectedRangeHigh: number;
  expectedChangePct: number;
  pivotPoint: number;
  supportLevel: number;
  resistanceLevel: number;
  gapOutlook: 'GAP UP' | 'GAP DOWN' | 'FLAT OPEN';
  confidenceLabel: 'HIGH CONFIDENCE' | 'MODERATE' | 'SPECULATIVE';
  rationale: string;
  keyDrivers: string[];
}

export interface ModelSignal {
  signal: 'BUY' | 'HOLD' | 'SELL' | 'HOLD / LOW CONFIDENCE';
  probabilities: {
    BUY: number;
    HOLD: number;
    SELL: number;
  };
  confidence: 'High' | 'Medium' | 'Low';
  confidenceScore: number;
  predictionHorizon: string;
  modelName: string;
  topContributions: FeatureContribution[];
  // Unified Hybrid Model Attributes
  unifiedScore: number;
  exactAction: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
  breakdown: {
    finbert: { score: number; weight: number; contribution: number; status?: 'LIVE' | 'UNAVAILABLE' };
    vader: { score: number; weight: number; contribution: number };
    technicals: { score: number; weight: number; contribution: number };
    fundamentals?: { score: number; weight: number; contribution: number };
    mlEnsemble: { score: number; weight: number; contribution: number };
  };
  executiveSummary: string;
  catalysts?: BullishCatalyst[];
  upwardProbabilityPct?: number;
  tomorrowForecast?: TomorrowForecast;
  professionalTradeSetup?: ProfessionalTradeSetup;
}

export interface ProfessionalTradeSetup {
  bias: 'BULLISH SWING' | 'INTRADAY MOMENTUM' | 'BEARISH BREAKDOWN' | 'MEAN REVERSION';
  entryZone: string;
  triggerPrice: number;
  stopLoss: number;
  stopLossPct: number;
  target1: number;
  target1Pct: number;
  target2: number;
  target2Pct: number;
  riskRewardRatio: string;
  vwap: number;
  priceVsVwap: 'ABOVE VWAP (BULLISH)' | 'BELOW VWAP (BEARISH)' | 'AT VWAP' | 'UNAVAILABLE';
  deliveryVolumePct: number | null;
  institutionalBias: 'INSTITUTIONAL ACCUMULATION' | 'INSTITUTIONAL DISTRIBUTION' | 'NEUTRAL ROTATION' | 'UNAVAILABLE';
  multiTimeframeConfluence: {
    dailyTrend: 'STRONG BULLISH' | 'BEARISH' | 'CONSOLIDATION';
    hourlyBreakout: 'CONFIRMED' | 'TESTING RESISTANCE' | 'BREAKDOWN' | 'RANGE';
    momentumRsi: 'BULLISH (>55)' | 'OVERSOLD (<35)' | 'OVERBOUGHT (>70)' | 'BEARISH (<45)';
    confluenceRating: '4/4 HIGH CONFLUENCE' | '3/4 MODERATE' | '2/4 WEAK';
  };
  recommendedPositionSizePct: number;
  traderPlaybook: string;
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  won: boolean;
}

export interface EquityPoint {
  date: string;
  strategy: number;
  buyHold: number;
}

export interface BacktestResult {
  metrics: {
    strategyReturnPct: number;
    buyHoldReturnPct: number;
    strategyCagrPct: number;
    buyHoldCagrPct: number;
    sharpeRatio: number;
    maxDrawdownPct: number;
    buyHoldMaxDrawdownPct: number;
    winRatePct: number;
    totalTrades: number;
    winningTrades: number;
    profitFactor: number;
    calmarRatio: number;
    initialCapital: number;
    finalCapital: number;
  };
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
  dataStatus?: 'LIVE' | 'UNAVAILABLE';
}

export interface ScannerCandidate {
  ticker: string;
  name: string;
  exchange: string;
  country: string;
  sector: string;
  price: number;
  changePct: number;
  rsi: number;
  emaAlignment: 'Bullish' | 'Bearish';
  macdHist: number;
  signal: 'BUY' | 'HOLD' | 'SELL';
}

export interface ScannerResult {
  totalCandidates: number;
  matchesFound: number;
  results: ScannerCandidate[];
}

export interface ModelComparisonMetric {
  model: string;
  accuracy: number;
  balancedAccuracy: number;
  precision: number;
  recall: number;
  f1: number;
  sharpe: number;
  maxDrawdown: number;
  totalReturn: number;
}

export type IPOStatus =
  | 'Upcoming'
  | 'Open'
  | 'Closed (allotment pending)'
  | 'Allotment done'
  | 'Listed'
  | 'Postponed'
  | 'Withdrawn'
  | 'Unverified'
  | 'OPEN NOW'
  | 'CLOSED'
  | 'CANCELLED'
  | 'UPCOMING'
  | 'LISTED'
  | 'POSTPONED';

export interface IPODetails {
  id: string;
  name?: string;
  companyName: string;
  symbol: string;
  market?: 'Mainboard' | 'SME';
  exchange: 'NSE / BSE' | 'NSE' | 'BSE' | 'NSE SME' | 'BSE SME' | 'NASDAQ / NYSE' | string;
  sector: string;
  industry: string;
  status: IPOStatus;
  ipoType?: 'Mainboard' | 'SME';
  dates?: {
    openDate: string;
    closeDate: string;
    allotmentDate?: string;
    listingDate?: string;
  };
  openDate: string;
  closeDate: string;
  allotmentDate?: string;
  listingDate: string;
  statusSource?: string;
  lastVerified?: string;
  isHistorical?: boolean;
  isVerifiedListed?: boolean;
  articleLinks?: string[];
  priceBand: string;
  minPrice: number;
  maxPrice: number;
  issuePrice?: number;
  listingPrice?: number;
  currentPrice?: number;
  listingGainLossPct?: number;
  dataStatus?: 'REFERENCE_CATALOG' | 'LIVE_FEED' | 'LIVE_EXCHANGE_DATA' | 'REGULATORY_FILING' | 'UNAVAILABLE';
  sourceUrl?: string;
  lastUpdated?: string;
  gmpUpdated?: string;
  issueSizeCr: number;
  freshIssueCr: number;
  ofsCr: number;
  lotSize: number;
  minInvestment: number;
  retailQuotaPct?: number;
  gmpAmount?: number;
  gmpPct?: number;
  expectedListingPrice?: number;
  subscription?: {
    qib: number;
    nii: number;
    retail: number;
    total: number;
  };
  website: string;
  businessSummary: string;
  revenueYoYGrowthPct: number;
  annualRevenueCr: number;
  netProfitLossCr: number;
  profitMarginPct: number;
  debtToEquity: number;
  postIssuePe: number;
  peerAveragePe: number;
  promoterHoldingPostPct: number;
  strengths: string[];
  redFlags: string[];
  verdict?: 'STRONG APPLY' | 'APPLY FOR LISTING GAINS' | 'NEUTRAL / MAY AVOID' | 'AVOID (HIGH RISK)' | 'REFERENCE DISCLOSURE' | 'HISTORICAL FILING';
  verdictScore?: number;
  verdictRationale?: string;
  longTermSuitability?: 'HIGH' | 'MODERATE' | 'LOW' | 'SPECULATIVE' | 'REFERENCE';
  anchorBook?: {
    totalCr: number;
    marqueeInvestors: string[];
    lockin30dDate: string;
    lockin90dDate: string;
  };
  listingDayPlaybook?: {
    ifOpensPremium: string;
    ifOpensFlat: string;
    trailStopLossRule: string;
  };
  biddingCategoryStrategy?: {
    retailAdvice: string;
    hniAdvice: string;
    allotmentOdds: 'HIGH CHANCE' | 'MODERATE CHANCE' | 'HEAVILY OVERSUBSCRIBED LOTTERY';
  };
  valuationMatrix?: {
    fairValueEst: number;
    marginOfSafetyPct: number;
    evToEbitda: number;
    priceToSales: number;
  };
  gmpHistory?: Array<{ date: string; gmpPrice: number; gmpPct: number }>;
}

// ==============================================================================
// 9. NEW FEATURE NINE: LONG-TERM INVESTMENT ANALYSIS INTERFACES
// ==============================================================================

export type InvestmentHorizon = '3-5 Years' | '5-10 Years';
export type RiskPreference = 'Conservative' | 'Moderate' | 'Aggressive';

export type InvestmentClassification =
  | 'POTENTIALLY ATTRACTIVE'
  | 'STRONGER FUNDAMENTALS'
  | 'WATCHLIST'
  | 'HIGH RISK'
  | 'AVOID / NEGATIVE THESIS'
  | 'INSUFFICIENT DATA';

export interface InvestmentDimensionEvaluation {
  id: string;
  name: string;
  score?: number; // 1 to 10 scale where calculated, or undefined
  status: 'POSITIVE' | 'NEUTRAL' | 'CAUTION' | 'NEGATIVE' | 'UNAVAILABLE';
  finding: string;
  evidenceQuality: 'HIGH (AUDITED)' | 'MODERATE (PROVIDER DATA)' | 'ESTIMATED / DERIVED' | 'LIMITED' | 'UNAVAILABLE';
  source: string;
  period: string;
  implication: string;
  limitations?: string;
}

export interface LongTermInvestmentAnalysis {
  ticker: string;
  companyName: string;
  sector: string;
  industry: string;
  horizon: InvestmentHorizon;
  riskPreference: RiskPreference;
  classification: InvestmentClassification;
  confidenceLabel: 'HIGH CONFIDENCE' | 'MODERATE CONFIDENCE' | 'LOW CONFIDENCE' | 'INSUFFICIENT DATA';
  executiveThesis: string;
  threeStrongestReasons: string[];
  threeMajorRisks: string[];
  valuationAssessment: {
    status: 'POTENTIALLY UNDERVALUED' | 'FAIRLY VALUED' | 'VALUATION DEMANDING / EXPENSIVE' | 'HIGH MULTIPLE SPECULATIVE' | 'UNAVAILABLE';
    currentPe?: number;
    historicalPeMedian?: number;
    peerPeAverage?: number;
    pbRatio?: number;
    fcfYieldPct?: number;
    narrative: string;
  };
  financialHealthSummary: string;
  businessGrowthAssessment: string;
  keyMetricsToMonitor: { metric: string; currentVal: string; benchmark: string; rationale: string }[];
  thesisValidationTriggers: string[];
  thesisInvalidationTriggers: string[];
  dataCompletenessPct: number;
  reportingDates: string;
  missingEvidence: string[];
  dimensions: InvestmentDimensionEvaluation[];
}

// ==============================================================================
// 10. NEW FEATURE TEN: INTEGRATED STOCK DECISION AND COMPARISON INTERFACES
// ==============================================================================

export type ShortTermAction =
  | 'BUY / LONG SETUP'
  | 'SELL / SHORT SETUP'
  | 'SELL / EXIT LONGS'
  | 'WAIT / CONSOLIDATION'
  | 'INSUFFICIENT DATA';

export interface ShortTermTradingDecision {
  action: ShortTermAction;
  bias: string;
  timeframe: string;
  triggerPrice?: number;
  entryZone: string;
  stopLoss?: number;
  stopLossReasoning: string;
  target1?: number;
  target2?: number;
  individualR1Ratio: string;
  individualR2Ratio: string;
  blendedRiskReward: string;
  invalidationCondition: string;
  requiredConfirmation: string;
  explanation: string;
  dataFreshness: string;
}

export interface DecisionComparisonRow {
  dimension: string;
  finding: string;
  evidenceQuality: string;
  mainImplication: string;
  status: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'UNAVAILABLE';
}

export interface IntegratedDecisionSummary {
  ticker: string;
  companyName: string;
  shortTerm: ShortTermTradingDecision;
  longTerm: LongTermInvestmentAnalysis;
  matrix: DecisionComparisonRow[];
  disagreementExplanation: string;
  synthesisVerdict: string;
  dataFreshness: string;
}

export interface StockComparisonItem {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  currency: string;
  change1yPct?: number;
  businessQuality: string;
  growth: string;
  profitability: string;
  debtHealth: string;
  valuation: string;
  shortTermBias: string;
  longTermClassification: InvestmentClassification;
  dataCompleteness: string;
}

export type IpoCategoryTab =
  | 'ALL'
  | 'UPCOMING'
  | 'DRHP_FILED'
  | 'RHP_FILED'
  | 'OPEN_NOW'
  | 'CLOSED_AWAITING'
  | 'RECENTLY_LISTED'
  | 'HISTORICAL'
  | 'UNLISTED_PRE_IPO';

// ==============================================================================
// 11. ONE FINAL ASSESSMENT: EXACTLY ONE OF BUY | SELL | WAIT | INSUFFICIENT DATA
// ==============================================================================

export type FinalDecisionOutcome = 'BUY' | 'SELL' | 'WAIT' | 'INSUFFICIENT DATA';

export interface EvidenceQualityGate {
  passed: boolean;
  priceFreshness: 'LIVE' | 'STALE' | 'UNAVAILABLE';
  historicalObservationsCount: number;
  hasSufficientHistory: boolean; // Minimum 50 historical trading sessions
  newsFreshness: 'FRESH' | 'RECENT' | 'UNAVAILABLE';
  articlesCount: number;
  financialsStatus: 'AUDITED' | 'PROVIDER_ESTIMATE' | 'UNAVAILABLE';
  mlStatus: 'BENCHMARK_VALIDATED' | 'FALLBACK_WEIGHTED' | 'UNAVAILABLE';
  dataCompletenessPct: number;
  limitations: string[];
}

export interface FinalAssessment {
  outcome: FinalDecisionOutcome;
  headline: string;
  rationale: string;
  strongestEvidence: string[];
  conflictingEvidence: string[];
  importantRisks: string[];
  missingEvidence: string[];
  strengthenConditions: string[];
  invalidationTriggers: string[];
  evidenceQualityGate: EvidenceQualityGate;
  setupConditions?: {
    entryZone: string;
    triggerPrice: number;
    stopLoss: number;
    stopLossPct: number;
    target1: number;
    target1Pct: number;
    target2: number;
    target2Pct: number;
    riskRewardRatio: string;
  };
  timestamps: {
    priceTimestamp: string;
    newsTimestamp?: string;
    financialsPeriod?: string;
    modelValidatedDate: string;
  };
}


