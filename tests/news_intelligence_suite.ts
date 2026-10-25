import assert from 'node:assert';
import {
  parseRssFeedXml,
  normalizeHeadline,
  normalizeArticleUrl,
  deduplicateRawArticles,
  parseAndFormatArticleDate,
  calculateRelevanceScore,
  rankAndCategorizeArticles,
  aggregateMultiSourceNews,
  FeedSourceConfig,
  RawFeedItem,
  ClassifiedArticle
} from '../src/newsIntelligence';

console.log('--- STARTING NEWS INTELLIGENCE TEST SUITE (PARSING, DEDUP, RANKING, DATES, FAULT-TOLERANCE) ---\n');

// ==========================================
// Test 1: RSS & Atom XML Feed Parsing
// ==========================================
console.log('[Test 1] Testing RSS and Atom Feed XML Parsing...');

const sampleRssXml = `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Markets Wire</title>
    <item>
      <title><![CDATA[Reliance Industries Q3 profit rises 11% YoY - Economic Times]]></title>
      <link>https://economictimes.indiatimes.com/markets/stocks/news/reliance-q3-results/articleshow/12345.cms?utm_source=rss&amp;utm_medium=feed</link>
      <pubDate>Wed, 15 Jan 2025 10:30:00 GMT</pubDate>
      <description><![CDATA[Reliance posted healthy consolidated revenue growth driven by retail and oil-to-chemicals segments.]]></description>
      <source url="https://economictimes.indiatimes.com">The Economic Times</source>
    </item>
    <item>
      <title>RBI keeps repo rate unchanged at 6.5% - Livemint</title>
      <link>https://www.livemint.com/economy/rbi-monetary-policy-repo-rate-11736932.html</link>
      <pubDate>Wed, 15 Jan 2025 09:15:00 GMT</pubDate>
      <description>The central bank maintained status quo on policy benchmark rates citing food inflation outlook.</description>
    </item>
  </channel>
</rss>
`;

const nowMs = new Date('2025-01-15T12:00:00Z').getTime();
const parsedRss = parseRssFeedXml(sampleRssXml, 'The Economic Times', 'COMPANY_SPECIFIC', nowMs);

assert.strictEqual(parsedRss.length, 2, `Expected 2 parsed items, got ${parsedRss.length}`);
assert.strictEqual(parsedRss[0].publisher, 'The Economic Times');
assert(parsedRss[0].title.includes('Reliance Industries Q3 profit rises 11% YoY'));
assert(parsedRss[0].url.startsWith('https://economictimes.indiatimes.com'));
assert(!parsedRss[0].url.includes('utm_source'), 'Parsed URL should have query tracking parameters stripped');
assert(parsedRss[0].summary.includes('healthy consolidated revenue growth'));
assert.strictEqual(parsedRss[1].publisher, 'Livemint'); // Extracted from headline suffix
console.log(`✓ RSS XML parsing verified: ${parsedRss.length} items parsed, CDATA unpacked, publisher resolved.`);

// Atom feed parsing
const sampleAtomXml = `
<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Global Market Wire</title>
  <entry>
    <title>Federal Reserve signals cautious stance on rate cuts</title>
    <link href="https://www.cnbc.com/2025/01/15/fed-minutes-rate-cuts.html?ref=atom" />
    <updated>2025-01-15T11:00:00Z</updated>
    <summary>Policymakers emphasized data-dependent path in recent meeting records.</summary>
  </entry>
</feed>
`;
const parsedAtom = parseRssFeedXml(sampleAtomXml, 'CNBC', 'GLOBAL_MARKET', nowMs);
assert.strictEqual(parsedAtom.length, 1);
assert.strictEqual(parsedAtom[0].title, 'Federal Reserve signals cautious stance on rate cuts');
assert.strictEqual(parsedAtom[0].url, 'https://www.cnbc.com/2025/01/15/fed-minutes-rate-cuts.html');
console.log(`✓ Atom feed XML parsing verified: link href & updated timestamp extracted.`);

// ==========================================
// Test 2: Normalization & Deduplication
// ==========================================
console.log('\n[Test 2] Testing Headline Normalization and Article Deduplication...');

// Publisher suffix stripping and punctuation removal
const h1 = normalizeHeadline('Tata Motors DVR shares swap approved by board - The Economic Times');
const h2 = normalizeHeadline('Tata Motors DVR shares swap approved by board | Livemint');
const h3 = normalizeHeadline('Tata Motors DVR Shares Swap Approved By Board - CNBC');
assert.strictEqual(h1, h2, `Expected normalised headlines to match across publishers: '${h1}' vs '${h2}'`);
assert.strictEqual(h2, h3, `Expected normalised headlines to match: '${h2}' vs '${h3}'`);
console.log(`✓ Headline normalization verified: stripped suffixes matching '${h1}'`);

// URL parameter stripping
const u1 = normalizeArticleUrl('https://www.moneycontrol.com/news/business/reliance-q3-12345.html?utm_source=twitter&ref=share&partnerId=rss');
const u2 = normalizeArticleUrl('https://www.moneycontrol.com/news/business/reliance-q3-12345.html');
assert.strictEqual(u1, u2, `Normalized URLs must match after stripping tracking queries: '${u1}' vs '${u2}'`);
console.log(`✓ URL normalization verified: query parameters removed.`);

// Deduplication of identical news syndications
const duplicateRawList: RawFeedItem[] = [
  {
    title: 'Infosys signs $1.5 billion cloud transformation pact - Economic Times',
    publisher: 'The Economic Times',
    date: '15 Jan 2025',
    pubTimestamp: 1736930000000,
    summary: 'Infosys expands multi-year enterprise contract.',
    url: 'https://economictimes.indiatimes.com/tech/infosys-pact.cms?utm=1',
    isOld: false,
    isBreaking: false,
    isInvalidOrMissingDate: false
  },
  {
    title: 'Infosys signs $1.5 billion cloud transformation pact - Livemint',
    publisher: 'Livemint',
    date: '15 Jan 2025',
    pubTimestamp: 1736931000000,
    summary: 'Infosys expands multi-year enterprise contract with global bank.',
    url: 'https://www.livemint.com/companies/infosys-pact.html',
    isOld: false,
    isBreaking: false,
    isInvalidOrMissingDate: false
  },
  {
    title: 'TCS announces quarterly dividend of ₹28 per share',
    publisher: 'Business Standard',
    date: '15 Jan 2025',
    pubTimestamp: 1736932000000,
    summary: 'TCS shareholders to receive record payout.',
    url: 'https://www.business-standard.com/tcs-dividend.html',
    isOld: false,
    isBreaking: false,
    isInvalidOrMissingDate: false
  }
];

const deduplicated = deduplicateRawArticles(duplicateRawList);
assert.strictEqual(deduplicated.length, 2, `Expected 2 deduplicated articles, got ${deduplicated.length}`);
console.log(`✓ Deduplication verified: 3 raw syndicated articles reduced to 2 distinct stories.`);

// ==========================================
// Test 3: Relevance Scoring & Company-First Ranking
// ==========================================
console.log('\n[Test 3] Testing Company Relevance Scoring & Ranking...');

const candidateArticles: ClassifiedArticle[] = [
  {
    title: 'European central banks consider interest rate trajectory',
    publisher: 'BBC Business',
    date: '15 Jan 2025',
    pubTimestamp: 1736930000000,
    summary: 'Eurozone inflation data shows minor cooling.',
    url: 'https://bbc.com/news/business-1',
    vaderScore: 0.0,
    finbertScore: null,
    sentimentLabel: 'NEUTRAL',
    isCatalyst: false,
    corporateEventType: 'ROUTINE'
  },
  {
    title: 'Reliance Retail expands omnichannel presence with 200 new stores',
    publisher: 'The Economic Times',
    date: '15 Jan 2025',
    pubTimestamp: 1736931000000,
    summary: 'RIL subsidiary strengthens tier-2 retail logistics network.',
    url: 'https://economictimes.com/reliance-retail-1',
    vaderScore: 0.35,
    finbertScore: null,
    sentimentLabel: 'POSITIVE',
    isCatalyst: true,
    corporateEventType: 'EXPANSION'
  },
  {
    title: 'RELIANCE: Board approves capital expenditure of ₹45,000 Cr for 5G',
    publisher: 'Moneycontrol',
    date: '15 Jan 2025',
    pubTimestamp: 1736932000000,
    summary: 'Mukesh Ambani outlines future growth roadmap for telecom infrastructure.',
    url: 'https://moneycontrol.com/reliance-telecom-1',
    vaderScore: 0.40,
    finbertScore: null,
    sentimentLabel: 'POSITIVE',
    isCatalyst: true,
    corporateEventType: 'EXPANSION'
  },
  {
    title: 'Indian markets open flat amid mixed Asian cues; Reliance and HDFC Bank active',
    publisher: 'Livemint',
    date: '15 Jan 2025',
    pubTimestamp: 1736933000000,
    summary: 'Nifty and Sensex trade rangebound in morning session.',
    url: 'https://livemint.com/markets-morning',
    vaderScore: 0.05,
    finbertScore: null,
    sentimentLabel: 'NEUTRAL',
    isCatalyst: false,
    corporateEventType: 'ROUTINE'
  }
];

const aliases = ['reliance industries', 'reliance', 'ril', 'jio', 'mukesh ambani'];
const scoreDirectTicker = calculateRelevanceScore(candidateArticles[2], 'RELIANCE', 'Reliance Industries Ltd', aliases);
const scoreSubsidiary = calculateRelevanceScore(candidateArticles[1], 'RELIANCE', 'Reliance Industries Ltd', aliases);
const scoreMacro = calculateRelevanceScore(candidateArticles[0], 'RELIANCE', 'Reliance Industries Ltd', aliases);

assert(scoreDirectTicker.score >= 120, `Exact ticker in title must score >= 120, got ${scoreDirectTicker.score}`);
assert(scoreSubsidiary.score >= 100, `Company name in title must score >= 100, got ${scoreSubsidiary.score}`);
assert.strictEqual(scoreMacro.score, 0, `Unrelated European macro news must score 0, got ${scoreMacro.score}`);

const { companyArticles, globalMarketArticles } = rankAndCategorizeArticles(
  candidateArticles,
  'RELIANCE',
  'Reliance Industries Ltd',
  aliases
);

assert(companyArticles.length >= 2, `Expected at least 2 company articles, got ${companyArticles.length}`);
assert(globalMarketArticles.length >= 1, `Expected at least 1 global market article, got ${globalMarketArticles.length}`);
// Direct ticker article should be ranked first
assert.strictEqual(companyArticles[0].title, candidateArticles[2].title, 'Highest relevance article must be ranked first');
assert.strictEqual(globalMarketArticles[0].title, candidateArticles[0].title, 'Macro article must be placed in global news');
console.log(`✓ Relevance ranking verified: Direct ticker ranked #1 (${scoreDirectTicker.score} pts), Macro separated to Global Market News.`);

// ==========================================
// Test 4: Date Parsing, Relative Formatting & Old vs Breaking
// ==========================================
console.log('\n[Test 4] Testing Date Parsing, Old vs Breaking Rules, and Missing Dates...');

const testNowMs = new Date('2025-01-15T12:00:00Z').getTime();

// Breaking article: 2 hours old
const breakingDate = parseAndFormatArticleDate('Wed, 15 Jan 2025 10:00:00 GMT', testNowMs);
assert.strictEqual(breakingDate.isBreaking, true, 'Article 2h old should be flagged isBreaking');
assert.strictEqual(breakingDate.isOld, false, 'Article 2h old must NOT be flagged isOld');
assert(breakingDate.relativeTime.includes('h ago') || breakingDate.relativeTime.includes('2h ago'));
console.log(`✓ Breaking date verified: relativeTime='${breakingDate.relativeTime}', isBreaking=${breakingDate.isBreaking}, isOld=${breakingDate.isOld}`);

// Normal recent article: 2 days old
const normalDate = parseAndFormatArticleDate('Mon, 13 Jan 2025 12:00:00 GMT', testNowMs);
assert.strictEqual(normalDate.isBreaking, false, 'Article 2d old must NOT be isBreaking');
assert.strictEqual(normalDate.isOld, false, 'Article 2d old must NOT be isOld');
assert(normalDate.relativeTime.includes('2d ago'));
console.log(`✓ 2-day date verified: relativeTime='${normalDate.relativeTime}', isBreaking=${normalDate.isBreaking}, isOld=${normalDate.isOld}`);

// Old article: 14 days old (> 7 days)
const oldDate = parseAndFormatArticleDate('Wed, 01 Jan 2025 12:00:00 GMT', testNowMs);
assert.strictEqual(oldDate.isOld, true, 'Article 14d old must be flagged isOld');
assert.strictEqual(oldDate.isBreaking, false, 'Old article must NEVER be flagged isBreaking');
console.log(`✓ Old date verified (>7d): relativeTime='${oldDate.relativeTime}', isOld=${oldDate.isOld}, isBreaking=${oldDate.isBreaking}`);

// Missing and invalid date strings
const missingDate = parseAndFormatArticleDate(undefined, testNowMs);
assert.strictEqual(missingDate.isInvalidOrMissing, true);
assert.strictEqual(missingDate.isBreaking, false);
assert.strictEqual(missingDate.formatted, 'Date unavailable');

const corruptDate = parseAndFormatArticleDate('NotADateStringAtAll-XYZ', testNowMs);
assert.strictEqual(corruptDate.isInvalidOrMissing, true);
assert.strictEqual(corruptDate.isBreaking, false);
assert.strictEqual(corruptDate.formatted, 'Date unavailable');
console.log(`✓ Missing/corrupt date verified: safely returns 'Date unavailable' and flags isInvalidOrMissing.`);

// ==========================================
// Test 5: Fault Isolation & Failed Source Tolerance
// ==========================================
console.log('\n[Test 5] Testing Feed Fault Isolation & Partial Failure Handling...');

// Define a test source setup with 1 working source (data URI) and 1 non-existent/failing source
const workingSourceXml = `
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Working Source Feed</title>
    <item>
      <title>TCS signs major AI infrastructure contract with European partner</title>
      <link>https://www.example.com/tcs-contract-123.html</link>
      <pubDate>Wed, 15 Jan 2025 11:30:00 GMT</pubDate>
      <description>TCS announced significant cloud modernization deployment.</description>
    </item>
  </channel>
</rss>
`;

const mockWorkingFeed: FeedSourceConfig = {
  id: 'working-feed',
  name: 'Working Publisher RSS',
  url: `data:application/rss+xml;base64,${Buffer.from(workingSourceXml).toString('base64')}`,
  category: 'COMPANY_SPECIFIC'
};

const mockFailingFeed: FeedSourceConfig = {
  id: 'failing-feed',
  name: 'Discontinued Publisher RSS',
  url: 'http://127.0.0.1:59999/non-existent-feed-endpoint.xml',
  category: 'GLOBAL_MARKET'
};

async function testFaultTolerance() {
  const result = await aggregateMultiSourceNews('TCS', 'Tata Consultancy Services', {
    forceRefresh: true,
    currentNowMs: testNowMs,
    customSources: [mockWorkingFeed, mockFailingFeed]
  });

  assert(result.sourcesUsed.includes('Working Publisher RSS'), 'Working source must be recorded in sourcesUsed');
  assert(result.sourcesFailed.some(f => f.includes('Discontinued Publisher RSS')), 'Failed source must be recorded in sourcesFailed');
  assert.strictEqual(result.isPartialFailure, true, 'isPartialFailure must be true when 1 of 2 sources failed');
  assert.strictEqual(result.sourcesSummary, '1 of 2 sources responded');
  assert(result.articles.length > 0 || result.globalMarketNews.length > 0, 'Articles from working source must still be populated');
  console.log(`✓ Fault isolation verified: '${result.sourcesSummary}', partialFailure=${result.isPartialFailure}, articles preserved.`);
}

testFaultTolerance().then(() => {
  console.log('\n=== ALL 5 NEWS INTELLIGENCE TESTS PASSED CLEANLY! ===\n');
}).catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
