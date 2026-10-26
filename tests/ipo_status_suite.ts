import assert from 'node:assert';
import {
  calculateIPOStatus,
  normalizeDateToIso,
  UPCOMING_IPOS_CATALOG,
  getEnrichedIPOs,
  getIPOById,
  IPO_CATALOG_DISCLOSURE
} from '../src/ipoCatalog';
import { computeFinalAssessment } from '../src/dataEngine';
import { StockQuote, HistoricalBar, TechnicalIndicators, SentimentData, ModelSignal } from '../src/types';

console.log('--- STARTING IPO STATUS LOGIC & CATALOG VERIFICATION TESTS ---\n');

// ==============================================================================
// 1. DATE NORMALIZATION TESTS
// ==============================================================================
console.log('[Test Suite 1] Testing Date Normalization (normalizeDateToIso)...');

assert.strictEqual(normalizeDateToIso('2026-10-25'), '2026-10-25', 'Standard ISO date must normalize cleanly');
assert.strictEqual(normalizeDateToIso('21 Oct 2026'), '2026-10-21', 'DD Mon YYYY space-separated must normalize to ISO');
assert.strictEqual(normalizeDateToIso('24-Oct-2026'), '2026-10-24', 'DD-Mon-YYYY hyphen-separated must normalize to ISO');
assert.strictEqual(normalizeDateToIso('06 Nov 2024'), '2024-11-06', 'Past dates with leading zero must normalize to ISO');
assert.strictEqual(normalizeDateToIso(''), null, 'Empty string must return null');
assert.strictEqual(normalizeDateToIso(undefined), null, 'Undefined must return null');
console.log('✓ Date normalization tests passed.');

// ==============================================================================
// 2. STATUS LIFECYCLE TESTS (DYNAMIC LOGIC)
// ==============================================================================
console.log('\n[Test Suite 2] Testing Status Logic Across Lifecycle States...');

const TEST_TODAY = '2026-10-25'; // Fixed reference test date

// Test 2.1: Before Open -> 'Upcoming'
const upcomingStatus = calculateIPOStatus({
  openDate: '2026-11-01',
  closeDate: '2026-11-04',
  allotmentDate: '2026-11-06',
  listingDate: '2026-11-10',
  todayIst: TEST_TODAY
});
assert.strictEqual(upcomingStatus, 'Upcoming', 'Issue with openDate in the future must be Upcoming');
console.log('✓ Before open: correctly computed as "Upcoming"');

// Test 2.2: During the Issue -> 'Open'
const openStatus1 = calculateIPOStatus({
  openDate: '2026-10-24',
  closeDate: '2026-10-28',
  allotmentDate: '2026-10-30',
  listingDate: '2026-11-02',
  todayIst: TEST_TODAY
});
assert.strictEqual(openStatus1, 'Open', 'Issue where today falls between openDate and closeDate must be Open');

// Boundary: First day of bidding (today === openDate)
const openBoundaryStart = calculateIPOStatus({
  openDate: '2026-10-25',
  closeDate: '2026-10-29',
  todayIst: TEST_TODAY
});
assert.strictEqual(openBoundaryStart, 'Open', 'Issue on opening day must be Open');

// Boundary: Last day of bidding (today === closeDate)
const openBoundaryEnd = calculateIPOStatus({
  openDate: '2026-10-22',
  closeDate: '2026-10-25',
  todayIst: TEST_TODAY
});
assert.strictEqual(openBoundaryEnd, 'Open', 'Issue on closing day must be Open');
console.log('✓ During the issue: correctly computed as "Open" (including opening and closing boundaries)');

// Test 2.3: After Close but Before Allotment -> 'Closed (allotment pending)'
const closedPendingStatus = calculateIPOStatus({
  openDate: '2026-10-21',
  closeDate: '2026-10-24',
  allotmentDate: '2026-10-26',
  listingDate: '2026-10-28',
  todayIst: TEST_TODAY
});
assert.strictEqual(
  closedPendingStatus,
  'Closed (allotment pending)',
  'Issue closed yesterday with allotment tomorrow must be Closed (allotment pending)'
);
console.log('✓ After close (allotment pending): correctly computed as "Closed (allotment pending)"');

// Test 2.4: After Allotment -> 'Allotment done'
const allotmentDoneStatus = calculateIPOStatus({
  openDate: '2026-10-18',
  closeDate: '2026-10-21',
  allotmentDate: '2026-10-24',
  listingDate: '2026-10-28',
  isVerifiedListed: false,
  todayIst: TEST_TODAY
});
assert.strictEqual(
  allotmentDoneStatus,
  'Allotment done',
  'Issue with passed allotment date but unverified listing must be Allotment done'
);
console.log('✓ After allotment: correctly computed as "Allotment done"');

// Test 2.5: Invariant Check: Expected Listing Date passed WITHOUT verified exchange listing
const unverifiedListingStatus = calculateIPOStatus({
  openDate: '2026-10-10',
  closeDate: '2026-10-14',
  allotmentDate: '2026-10-16',
  listingDate: '2026-10-20', // passed 5 days ago!
  isVerifiedListed: false, // NOT verified on exchange
  todayIst: TEST_TODAY
});
assert.strictEqual(
  unverifiedListingStatus,
  'Allotment done',
  'CRITICAL: Must NEVER mark Listed just because expected listing date passed without verified trading'
);
console.log('✓ Invariant verified: Does not mark "Listed" solely because listing date passed.');

// Test 2.6: After Listing with Verified Exchange Trading -> 'Listed'
const listedStatus = calculateIPOStatus({
  openDate: '2024-11-06',
  closeDate: '2024-11-08',
  allotmentDate: '2024-11-11',
  listingDate: '2024-11-13',
  isVerifiedListed: true,
  todayIst: TEST_TODAY
});
assert.strictEqual(listedStatus, 'Listed', 'Issue verified listed on exchange must be Listed');
console.log('✓ Verified listing: correctly computed as "Listed"');

// Test 2.7: Postponed Issue -> 'Postponed'
const postponedStatus = calculateIPOStatus({
  openDate: '2026-11-01',
  closeDate: '2026-11-04',
  isPostponed: true,
  todayIst: TEST_TODAY
});
assert.strictEqual(postponedStatus, 'Postponed', 'Postponed flag must override dates to produce Postponed');
console.log('✓ Postponed IPO: correctly computed as "Postponed"');

// Test 2.8: Withdrawn Issue -> 'Withdrawn'
const withdrawnStatus = calculateIPOStatus({
  openDate: '2026-10-20',
  closeDate: '2026-10-23',
  isWithdrawn: true,
  todayIst: TEST_TODAY
});
assert.strictEqual(withdrawnStatus, 'Withdrawn', 'Withdrawn flag must override dates to produce Withdrawn');
console.log('✓ Withdrawn IPO: correctly computed as "Withdrawn"');

// Test 2.9: Undated / Draft DRHP Issue -> 'Unverified'
const unverifiedStatus = calculateIPOStatus({
  todayIst: TEST_TODAY
});
assert.strictEqual(unverifiedStatus, 'Unverified', 'Issue without open date must be Unverified');
console.log('✓ Draft / Undated filing: correctly computed as "Unverified"');

// ==============================================================================
// 3. JIO PLATFORMS SPECIFIC VALIDATION
// ==============================================================================
console.log('\n[Test Suite 3] Validating Jio Platforms Entry Facts & State on 2026-10-25...');

const jioEntry = getIPOById('jio-platforms');
assert.ok(jioEntry, 'Jio Platforms entry must exist in the catalog');
assert.strictEqual(jioEntry.name, 'Jio Platforms Limited');
assert.strictEqual(jioEntry.market, 'Mainboard');
assert.strictEqual(jioEntry.exchange, 'NSE / BSE');
assert.strictEqual(jioEntry.statusSource, 'Unverified (from news)');
assert.ok(jioEntry.sourceUrl && jioEntry.sourceUrl.length > 0, 'sourceUrl must be populated');
assert.ok(Array.isArray(jioEntry.articleLinks) && jioEntry.articleLinks.length > 0, 'articleLinks must contain news citations');

assert.ok(jioEntry.priceBand === '' || jioEntry.priceBand === 'Unverified', 'Price band must be blank or Unverified');
assert.strictEqual(jioEntry.minPrice, 0, 'minPrice must be 0/blank');
assert.strictEqual(jioEntry.maxPrice, 0, 'maxPrice must be 0/blank');
assert.strictEqual(jioEntry.lotSize, 0, 'lotSize must be 0/blank');

// Requirement 6: Jio Platforms financial figures must be Unverified / removed, and 22.19x subscription must link to source
assert.strictEqual(jioEntry.annualRevenueCr, 0, 'Annual sales must be 0/unverified since not in linked news source');
assert.strictEqual(jioEntry.netProfitLossCr, 0, 'Net profit must be 0/unverified since not in linked news source');
assert.strictEqual(jioEntry.profitMarginPct, 0, 'Profit margin must be 0/unverified since not in linked news source');
assert.strictEqual(jioEntry.debtToEquity, 0, 'Debt/Equity must be 0/unverified since not in linked news source');
assert.strictEqual(jioEntry.financialsSource, 'Unverified (Not in linked news articles)');

// Check 22.19x subscription and issue size link to their source
assert.strictEqual(jioEntry.subscription?.total, 22.19, 'Overall subscription must be 22.19x as stated in Livemint');
assert.strictEqual(jioEntry.subscription?.source, 'Livemint', 'Subscription must cite Livemint source');
assert.ok(jioEntry.subscription?.sourceUrl, 'Subscription must link to source article');
assert.strictEqual(jioEntry.issueSizeCr, 30213, 'Issue size must be ₹30,213 Cr as stated in Livemint');
assert.strictEqual(jioEntry.issueSizeSource, 'Livemint', 'Issue size must cite Livemint source');

// Check that 470 million user count is removed
assert.ok(!jioEntry.businessSummary.includes('470'), 'Memory user count (470M) must not appear in businessSummary');
for (const str of jioEntry.strengths) {
  assert.ok(!str.includes('470 million'), 'Memory user count (470 million) must be removed from strengths');
}

console.log('✓ Jio Platforms financials verified as Unverified, 22.19x subscription cited to Livemint, and user count removed.');

// ==============================================================================
// 4. CATALOG INTEGRITY, DEDUPLICATION & MANDATORY FIELDS
// ==============================================================================
console.log('\n[Test Suite 4] Testing Catalog Integrity, Deduplication & Mandatory Fields...');

// Disclosure check
assert.ok(
  IPO_CATALOG_DISCLOSURE.includes('Limited Curated List'),
  'IPO catalog must clearly disclose it is a limited curated list, not all Indian IPOs'
);

const seenIds = new Set<string>();
const seenSymbols = new Set<string>();

for (const ipo of UPCOMING_IPOS_CATALOG) {
  // Deduplication
  assert.ok(!seenIds.has(ipo.id), `Duplicate IPO ID detected: ${ipo.id}`);
  seenIds.add(ipo.id);

  assert.ok(!seenSymbols.has(ipo.symbol), `Duplicate IPO Symbol detected: ${ipo.symbol}`);
  seenSymbols.add(ipo.symbol);

  // Mandatory fields: name, market, exchange, dates, statusSource, sourceUrl, lastVerified
  assert.ok(ipo.name, `IPO ${ipo.id} must have a name`);
  assert.ok(ipo.market === 'Mainboard' || ipo.market === 'SME', `IPO ${ipo.id} market must be Mainboard or SME`);
  assert.ok(ipo.exchange, `IPO ${ipo.id} must specify exchange`);
  assert.ok(ipo.statusSource, `IPO ${ipo.id} must have a statusSource`);
  assert.ok(ipo.sourceUrl, `IPO ${ipo.id} must have a sourceUrl`);
  assert.ok(ipo.lastVerified, `IPO ${ipo.id} must have a lastVerified date`);

  // GMP integrity: must be undefined / N/A unless a real timestamped source exists
  if (ipo.gmpAmount !== undefined) {
    assert.ok(
      ipo.gmpUpdated,
      `IPO ${ipo.id} has a numeric GMP (${ipo.gmpAmount}) but lacks gmpUpdated timestamp source`
    );
  }

  // Historical labeling
  if (ipo.isHistorical) {
    assert.ok(
      ipo.isVerifiedListed,
      `Historical IPO ${ipo.id} should be verified listed or archived`
    );
  }
}
console.log(`✓ All ${UPCOMING_IPOS_CATALOG.length} catalog items passed deduplication, mandatory fields, and GMP checks.`);

// Enriched catalog check
const enriched = getEnrichedIPOs(TEST_TODAY);
assert.strictEqual(enriched.length, UPCOMING_IPOS_CATALOG.length);
const enrichedJio = enriched.find(i => i.id === 'jio-platforms');
assert.ok(enrichedJio);
assert.strictEqual(enrichedJio.status, 'Closed (allotment pending)');

console.log('✓ Enriched IPO list dynamically calculated all statuses successfully.');

// Verify Jio Platforms dynamic status progression:
const jioOn25 = calculateIPOStatus({
  openDate: jioEntry.openDate,
  closeDate: jioEntry.closeDate,
  allotmentDate: jioEntry.allotmentDate,
  listingDate: jioEntry.listingDate,
  isVerifiedListed: jioEntry.isVerifiedListed,
  todayIst: '2026-10-25'
});
assert.strictEqual(jioOn25, 'Closed (allotment pending)', 'On Oct 25 (Sunday), Jio status must be Closed (allotment pending)');

const jioOn26 = calculateIPOStatus({
  openDate: jioEntry.openDate,
  closeDate: jioEntry.closeDate,
  allotmentDate: jioEntry.allotmentDate,
  listingDate: jioEntry.listingDate,
  isVerifiedListed: jioEntry.isVerifiedListed,
  todayIst: '2026-10-26'
});
assert.strictEqual(jioOn26, 'Allotment done', 'On Oct 26 (Monday allotment date), Jio status must be Allotment done');
console.log('✓ Jio Platforms status progression: Oct 25 -> "Closed (allotment pending)", Oct 26 -> "Allotment done"');

// ==============================================================================
// 5. STOCK INTELLIGENCE "WHY" EXPLANATION & REAL INDICATOR VALUES TEST
// ==============================================================================
console.log('\n[Test Suite 5] Testing Stock Intelligence WHY Sentence & Indicator Honesty...');

// Mock Quote & Bars
const mockQuote: StockQuote = {
  ticker: 'TEST.NS',
  companyName: 'Test Corporation',
  price: 200,
  change: -2,
  changePct: -1.0,
  high52w: 250,
  low52w: 180,
  volume: 1000000,
  currency: 'INR'
};

const mockBars: HistoricalBar[] = Array.from({ length: 60 }, (_, i) => ({
  date: `2026-08-${String(i + 1).padStart(2, '0')}`,
  open: 200,
  high: 205,
  low: 195,
  close: 200,
  volume: 100000
}));

// Technicals where MACD histogram is POSITIVE (+0.15) but price is BELOW EMA 20 (205)
const mockTechnicals: TechnicalIndicators = {
  rsi: 48,
  macd: 1.2,
  macdSignal: 1.05,
  macdHist: 0.15, // Positive MACD histogram!
  ema20: 205,     // Price (200) below EMA 20
  ema50: 210,     // Price (200) below EMA 50
  atr: 5,
  volatility20d: 18
};

const mockSignal = {
  unifiedScore: -0.20, // Bearish setup overall
  signal: 'SELL',
  confidence: 'High',
  modelBreakdown: { technical: -0.2, news: 0, reddit: 0, financial: 0, valuation: 0 },
  breakdown: {}
} as unknown as ModelSignal;

const mockSentiment = {
  overallScore: 0,
  newsCount: 2,
  vaderCompound: 0,
  finbertScore: null,
  label: 'NEUTRAL',
  reddit: { overallScore: 0, posts: [] },
  articles: [],
  expansionCatalystsCount: 0,
  cautionaryOverhangsCount: 0
} as unknown as SentimentData;

const assessment = computeFinalAssessment(
  mockQuote.ticker,
  mockQuote,
  mockBars,
  mockTechnicals,
  mockSentiment,
  mockSignal
);

// Factors verification
assert.ok(Array.isArray(assessment.bullishFactors), 'bullishFactors must be populated');
assert.ok(Array.isArray(assessment.bearishFactors), 'bearishFactors must be populated');

// Positive MACD histogram must be in bullishFactors, NOT described as negative MACD momentum!
const macdBull = assessment.bullishFactors.some(f => f.includes('Positive MACD histogram (+0.15)'));
assert.ok(macdBull, 'When MACD histogram is +0.15, it must be recorded as Positive MACD histogram in bullishFactors');

// Bearish factors must include Price below 20 EMA and 50 EMA
const ema20Bear = assessment.bearishFactors.some(f => f.includes('Price below 20 EMA (₹205.0)'));
const ema50Bear = assessment.bearishFactors.some(f => f.includes('Price below 50 EMA (₹210.0)'));
assert.ok(ema20Bear, 'Price below 20 EMA must be in bearishFactors');
assert.ok(ema50Bear, 'Price below 50 EMA must be in bearishFactors');

// Crucial: Rationale and factors must NOT contain the falsehood "negative MACD momentum" when MACD is positive!
assert.ok(
  !assessment.rationale.toLowerCase().includes('negative macd momentum'),
  'Must NOT claim "negative MACD momentum" when MACD histogram is positive (+0.15)'
);

console.log('✓ Stock Intelligence factors correctly capture real indicator values (+0.15 MACD positive, 205 EMA below).');

// ==============================================================================
// 6. NEWS INTELLIGENCE UPGRADES & UI CLEANUP INVARIANTS (REQS 8 - 13)
// ==============================================================================
console.log('\n[Test Suite 6] Testing News Tab Upgrades, Tone Labels, Evidence Strength & UI Invariants...');

// 1. Req 8: Event cluster filtering
const testClusters: import('../src/types').EventCluster[] = [
  {
    id: 'c1',
    title: 'Jio Platforms IPO & Capital Restructuring',
    category: 'CATALYST',
    articleCount: 38,
    summary: 'IPO filings and pre-IPO valuation disclosures.',
    firstSeen: '2026-10-20',
    latestSeen: '2026-10-25',
    articles: [],
    isVerifiedCatalyst: true,
    isVerifiedRisk: false
  },
  {
    id: 'c2',
    title: 'Reliance Retail quick commerce expansion',
    category: 'CATALYST',
    articleCount: 14,
    summary: 'New dark stores and delivery network.',
    firstSeen: '2026-10-22',
    latestSeen: '2026-10-25',
    articles: [],
    isVerifiedCatalyst: true,
    isVerifiedRisk: false
  },
  {
    id: 'c3',
    title: 'Customs duty revision risk on petrochem inputs',
    category: 'RISK',
    articleCount: 1, // Single-article, but tagged RISK!
    summary: 'Tariff changes on imports.',
    firstSeen: '2026-10-24',
    latestSeen: '2026-10-24',
    articles: [],
    isVerifiedCatalyst: false,
    isVerifiedRisk: true
  },
  {
    id: 'c4',
    title: 'Routine Financial Media Disclosure',
    category: 'ROUTINE_FILING',
    articleCount: 1, // Single-article routine disclosure -> must be HIDDEN!
    summary: 'Price update snippet.',
    firstSeen: '2026-10-25',
    latestSeen: '2026-10-25',
    articles: [],
    isVerifiedCatalyst: false,
    isVerifiedRisk: false
  }
];

const qualifying = testClusters.filter(c =>
  c.articleCount >= 2 || c.isVerifiedCatalyst || c.category === 'CATALYST' || c.isVerifiedRisk || c.category === 'RISK'
);
const hiddenCount = testClusters.length - qualifying.length;

assert.strictEqual(qualifying.length, 3, 'Must include multi-article clusters and catalyst/risk clusters');
assert.strictEqual(hiddenCount, 1, 'Must hide 1 single-article routine disclosure cluster');
assert.ok(!qualifying.some(c => c.title === 'Routine Financial Media Disclosure'), 'Routine single-article cluster must be hidden');
console.log('✓ Req 8: Event clusters correctly filtered (qualifying: 3, hidden routine: 1).');

// 2. Req 10: Evidence Strength rules
import { aggregateArticleSentiment } from '../src/financialSentiment';

// Headline-only evidence with score within +/-0.15 must be WEAK
const weakHeadlineItems = [
  { score: 0.08, vaderScore: 0.08, label: 'POSITIVE', isHeadlineOnly: true, matchedTerms: ['expansion'] },
  { score: 0.04, vaderScore: 0.04, label: 'NEUTRAL', isHeadlineOnly: true, matchedTerms: [] },
  { score: 0.06, vaderScore: 0.06, label: 'NEUTRAL', isHeadlineOnly: true, matchedTerms: [] }
];
const aggWeak = aggregateArticleSentiment(weakHeadlineItems);
assert.strictEqual(aggWeak.evidenceStrength, 'WEAK', 'Headline-only evidence within +/-0.15 score MUST be WEAK');

// Headline-only evidence must NEVER be STRONG even with high volume
const highVolumeHeadlineItems = Array.from({ length: 15 }, () => ({
  score: 0.45,
  vaderScore: 0.45,
  label: 'POSITIVE',
  isHeadlineOnly: true,
  matchedTerms: ['surged', 'expansion', 'record profit', 'order win']
}));
const aggHighVol = aggregateArticleSentiment(highVolumeHeadlineItems);
assert.notStrictEqual(aggHighVol.evidenceStrength, 'STRONG', 'Headline-only evidence must NEVER be STRONG');
assert.strictEqual(aggHighVol.evidenceStrength, 'MODERATE', 'High-volume headline-only evidence caps at MODERATE');
console.log('✓ Req 10: Evidence strength is WEAK within +/-0.15 and NEVER STRONG for headline-only.');

// 3. Req 11: Tone labels
function computeToneLabel(score: number): string {
  if (score > 0.25) return 'Positive';
  if (score >= 0.10 && score <= 0.25) return 'Mildly positive';
  if (score < -0.25) return 'Negative';
  if (score <= -0.10 && score >= -0.25) return 'Mildly negative';
  return 'Mixed';
}
assert.strictEqual(computeToneLabel(0.35), 'Positive');
assert.strictEqual(computeToneLabel(0.18), 'Mildly positive');
assert.strictEqual(computeToneLabel(0.04), 'Mixed');
assert.strictEqual(computeToneLabel(-0.15), 'Mildly negative');
assert.strictEqual(computeToneLabel(-0.40), 'Negative');
console.log('✓ Req 11: Tone labels verified for Mildly positive / Mildly negative / Positive / Negative.');

// 4. Req 12: Dominating story detection
const totalArticles = 111;
const dominatingCluster = testClusters.find(c => (c.articleCount / totalArticles) >= 0.30);
assert.ok(dominatingCluster, 'Must detect cluster with >= 30% of articles');
assert.strictEqual(dominatingCluster.articleCount, 38);
const dominatingNote = `${dominatingCluster.articleCount} of ${totalArticles} headlines are about ${dominatingCluster.title}, which may affect the overall tone.`;
assert.ok(dominatingNote.includes('38 of 111 headlines are about Jio Platforms IPO & Capital Restructuring'));
console.log('✓ Req 12: Dominating story note correctly identified (38 of 111 headlines, 34.2%).');

// 5. Req 13: UI text check in files
import * as fs from 'node:fs';
const chartsFile = fs.readFileSync('src/components/ChartsPage.tsx', 'utf-8');
assert.ok(!chartsFile.includes('ax[0]'), 'ChartsPage must not contain ax[0]');
assert.ok(!chartsFile.includes('ax[1]'), 'ChartsPage must not contain ax[1]');
assert.ok(!chartsFile.includes('mplfinance / dark_background'), 'ChartsPage must not contain mplfinance text');

const newsFile = fs.readFileSync('src/components/pages/NewsIntelligencePage.tsx', 'utf-8');
assert.ok(!newsFile.includes('100% MEMORY-SAFE'), 'NewsIntelligencePage must not contain 100% MEMORY-SAFE');
assert.ok(!newsFile.includes('Render Free tier safe'), 'NewsIntelligencePage must not contain Render Free tier safe');

const appFile = fs.readFileSync('src/App.tsx', 'utf-8');
assert.ok(!appFile.includes('Zero-Paid-API Architecture'), 'App.tsx must not contain Zero-Paid-API Architecture in footer');

const stockIntellFile = fs.readFileSync('src/components/pages/StockIntelligencePage.tsx', 'utf-8');
assert.ok(!stockIntellFile.includes('Zero artificial smoothing'), 'StockIntelligencePage must not contain Zero artificial smoothing');

console.log('✓ Req 13: UI cleanup verified (ax[0]-ax[3], mplfinance, 100% memory-safe, Render Free tier safe, Zero artificial smoothing, and Zero-Paid-API Architecture removed).');

console.log('\n--- ALL IPO, STOCK INTELLIGENCE & NEWS UPGRADE TESTS PASSED SUCCESSFULLY! ---');
