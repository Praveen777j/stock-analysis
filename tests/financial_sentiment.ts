import assert from 'node:assert';
import {
  calculateVaderScore,
  analyzeFinancialContext,
  analyzeFinancialSentiment,
  aggregateArticleSentiment
} from '../src/financialSentiment';
import {
  calculateRelevanceScore,
  getCompanyAliases
} from '../src/newsIntelligence';

console.log('--- STARTING FINANCIAL SENTIMENT ENGINE UNIT & REGRESSION TESTS ---\n');

// 1. Positive Financial Catalysts
console.log('[Test 1] Testing Positive Financial Announcements...');
const pos1 = analyzeFinancialSentiment('Reliance Q3 net profit surges 18% YoY to ₹19,340 Cr; EBITDA margins expand strongly');
assert(pos1.financialScore >= 0.25, `Expected strong positive score, got ${pos1.financialScore}`);
assert.strictEqual(pos1.label, 'POSITIVE');
assert(pos1.contextCategories.includes('EARNINGS_REVENUE'));
assert(pos1.matchedTerms.some(t => t.includes('surge') || t.includes('expand') || t.includes('net profit')));
console.log(`✓ Earnings surge tested: Score: ${pos1.financialScore}, Evidence: ${pos1.evidenceStrength}, Matched: ${pos1.matchedTerms.join(', ')}`);

const pos2 = analyzeFinancialSentiment('Company completes full debt reduction ahead of schedule, achieving pristine zero-debt balance sheet');
assert(pos2.financialScore >= 0.30, `Expected strong debt reduction score, got ${pos2.financialScore}`);
assert.strictEqual(pos2.label, 'POSITIVE');
assert(pos2.matchedTerms.includes('debt reduction') || pos2.matchedTerms.includes('zero debt'));
console.log(`✓ Debt reduction tested: Score: ${pos2.financialScore}, Matched: ${pos2.matchedTerms.join(', ')}`);

// 2. Negative Financial Headwinds & Risks
console.log('\n[Test 2] Testing Negative Financial Shocks & Headwinds...');
const neg1 = analyzeFinancialSentiment('SEBI initiates forensic probe and imposes penalty over corporate governance lapses');
assert(neg1.financialScore <= -0.30, `Expected strong negative score, got ${neg1.financialScore}`);
assert.strictEqual(neg1.label, 'NEGATIVE');
assert(neg1.contextCategories.includes('REGULATORY_LEGAL'));
console.log(`✓ Regulatory penalty tested: Score: ${neg1.financialScore}, Matched: ${neg1.matchedTerms.join(', ')}`);

const neg2 = analyzeFinancialSentiment('Operating revenue dropped 22% as severe margin compression and losses mount');
assert(neg2.financialScore <= -0.30, `Expected negative score, got ${neg2.financialScore}`);
assert.strictEqual(neg2.label, 'NEGATIVE');
console.log(`✓ Margin compression tested: Score: ${neg2.financialScore}, Matched: ${neg2.matchedTerms.join(', ')}`);

// 3. Negation & 3-Token Lookback
console.log('\n[Test 3] Testing Negation Lookback Window (3 Tokens)...');
const negLookback1 = analyzeFinancialSentiment('Company failed to achieve profit growth this quarter');
assert(negLookback1.financialScore < 0, `Expected negative score for 'failed to achieve profit', got ${negLookback1.financialScore}`);

const negLookback2 = analyzeFinancialSentiment('Management confirmed it is not facing any debt default');
assert(negLookback2.financialScore >= 0, `Negated default ('not facing any debt default') should not be scored as negative default, got ${negLookback2.financialScore}`);
console.log(`✓ Negation handling verified: 'not facing any debt default' -> ${negLookback2.financialScore}`);

// 4. Multi-word Phrase Precedence over Single Words
console.log('\n[Test 4] Testing Multi-word Phrase Precedence (e.g., debt reduction vs debt)...');
const phraseTest1 = analyzeFinancialSentiment('Aggressive debt reduction plan approved by board');
assert(phraseTest1.financialScore > 0, `'debt reduction' must be positive, got ${phraseTest1.financialScore}`);

const phraseTest2 = analyzeFinancialSentiment('Company defaults on credit debt obligations');
assert(phraseTest2.financialScore < -0.3, `'defaults on debt' must be negative, got ${phraseTest2.financialScore}`);
console.log(`✓ Phrase precedence confirmed: 'debt reduction' is ${phraseTest1.financialScore} (positive), 'defaults on debt' is ${phraseTest2.financialScore} (negative).`);

// 5. Uncertainty & Rumor Attribution Discounting
console.log('\n[Test 5] Testing Attribution & Uncertainty Discounting...');
const certainArticle = analyzeFinancialSentiment('Board approves ₹5,000 Cr share buyback program at ₹2,800 per share');
const rumorArticle = analyzeFinancialSentiment('Sources allege company might consider possible share buyback in coming months');
assert.strictEqual(certainArticle.isUncertainOrAttributed, false);
assert.strictEqual(rumorArticle.isUncertainOrAttributed, true);
assert(Math.abs(rumorArticle.financialScore) < Math.abs(certainArticle.financialScore), 'Uncertain/rumor news must be discounted');
console.log(`✓ Uncertainty discounting verified: Confirmed buyback (${certainArticle.financialScore}) vs Rumored buyback (${rumorArticle.financialScore}).`);

// 6. Mixed News Detection
console.log('\n[Test 6] Testing Mixed Financial Disclosure Detection...');
const mixedArticle = analyzeFinancialSentiment(
  'Revenue surged by 35% across all divisions',
  'However, consolidated net loss widened sharply due to unprecedented operational expenses and foreign exchange drag'
);
assert.strictEqual(mixedArticle.isMixed, true, 'Headline surge + summary loss must be flagged as mixed');
console.log(`✓ Mixed sentiment detected: Score: ${mixedArticle.financialScore}, Mixed: ${mixedArticle.isMixed}`);

// 7. Headline-Only Tracking
console.log('\n[Test 7] Testing Headline-Only vs Article Body Completeness...');
const headlineOnly = analyzeFinancialSentiment('Quarterly earnings beat estimates', '');
const fullArticle = analyzeFinancialSentiment(
  'Quarterly earnings beat estimates with 25% revenue surge',
  'Operating profits reached record highs and management raised full-year forward revenue guidance.'
);
assert.strictEqual(headlineOnly.isHeadlineOnly, true);
assert.strictEqual(fullArticle.isHeadlineOnly, false);
assert(fullArticle.financialMagnitude >= headlineOnly.financialMagnitude, 'Full article should provide higher evidence magnitude');
console.log(`✓ Headline-only tracking verified: Headline-only flag: ${headlineOnly.isHeadlineOnly}, Full text: ${fullArticle.isHeadlineOnly}`);

// 8. Aggregate Sentiment Across Article Batch
console.log('\n[Test 8] Testing Article Aggregation & Synthesis...');
const batch = [
  analyzeFinancialSentiment('Tata Motors passenger vehicle volume jumps 15% YoY'),
  analyzeFinancialSentiment('Commercial vehicle export orders surge by ₹2,400 Cr'),
  analyzeFinancialSentiment('Input steel cost pressures marginally trim operating margins by 40 bps')
];
const aggregate = aggregateArticleSentiment(batch);
assert.strictEqual(aggregate.totalArticles, 3);
assert(aggregate.overallScore > 0, 'Composite of 2 positive + 1 minor negative should be positive');
assert(aggregate.vaderCompound !== undefined, 'Must provide independent VADER baseline');
assert(aggregate.matchedCatalysts.length > 0, 'Must record matched catalysts');
console.log(`✓ Aggregate sentiment verified: Overall: ${aggregate.overallScore}, VADER baseline: ${aggregate.vaderCompound}, Label: ${aggregate.label}, Evidence: ${aggregate.evidenceStrength}`);

// 9. Sentiment Labels & Financial Context Rules for Loss / Plunge / Fall
console.log('\n[Test 9] Testing Headline Sentiment Rules & Label Agreement...');
const suzlonResult = analyzeFinancialSentiment('Suzlon profit plunges 69% in Q3 due to margin compression');
assert(suzlonResult.score < 0, `Suzlon profit plunge must score negative, got ${suzlonResult.score}`);
assert.strictEqual(suzlonResult.label, 'NEGATIVE', `Suzlon profit plunge must be labelled NEGATIVE, got ${suzlonResult.label}`);
assert(suzlonResult.evidenceStrength !== 'INSUFFICIENT', 'Non-zero scored article must not have INSUFFICIENT evidence');
console.log(`✓ Suzlon headline verified: Score=${suzlonResult.score}, Label=${suzlonResult.label}, Evidence=${suzlonResult.evidenceStrength}`);

const relPowerResult = analyzeFinancialSentiment('Reliance Power shares on fire after major solar tender win');
assert(relPowerResult.score > 0, `Shares on fire must score positive, got ${relPowerResult.score}`);
assert.strictEqual(relPowerResult.label, 'POSITIVE', `Reliance Power shares on fire must be labelled POSITIVE, got ${relPowerResult.label}`);
assert(relPowerResult.evidenceStrength !== 'INSUFFICIENT', 'Non-zero scored article must not have INSUFFICIENT evidence');
console.log(`✓ Reliance Power headline verified: Score=${relPowerResult.score}, Label=${relPowerResult.label}, Evidence=${relPowerResult.evidenceStrength}`);

// 10. News Relevance & False Match Exclusion (RELIANCE.NS)
console.log('\n[Test 10] Testing News Relevance & False Match Exclusion for Reliance Industries...');
const rilAliases = getCompanyAliases('RELIANCE.NS', 'Reliance Industries Ltd');

// Exclusion of Reliance Power from RELIANCE.NS wire
const relPowerWire = calculateRelevanceScore(
  { title: 'Reliance Power shares on fire after major debt restructuring', summary: '' },
  'RELIANCE.NS',
  'Reliance Industries Ltd',
  rilAliases
);
assert.strictEqual(relPowerWire.isRelated, false, 'Reliance Power must NOT match Reliance Industries wire');
assert.strictEqual(relPowerWire.score, 0, 'False match must score 0');
console.log(`✓ Reliance Power correctly excluded from RELIANCE.NS wire (isRelated=${relPowerWire.isRelated}, score=${relPowerWire.score})`);

// Exclusion of Reliance Capital and Reliance Infra from RELIANCE.NS wire
const relCapWire = calculateRelevanceScore(
  { title: 'Reliance Capital asset resolution process advances', summary: '' },
  'RELIANCE.NS',
  'Reliance Industries Ltd',
  rilAliases
);
assert.strictEqual(relCapWire.isRelated, false, 'Reliance Capital must NOT match Reliance Industries wire');
console.log(`✓ Reliance Capital correctly excluded from RELIANCE.NS wire (isRelated=${relCapWire.isRelated})`);

// Inclusion of true Reliance Industries news
const rilTrueWire = calculateRelevanceScore(
  { title: 'Reliance Industries signs $2 billion green energy partnership', summary: 'RIL announces solar giga-factory progress' },
  'RELIANCE.NS',
  'Reliance Industries Ltd',
  rilAliases
);
assert.strictEqual(rilTrueWire.isRelated, true, 'Reliance Industries news must match RELIANCE.NS');
assert(rilTrueWire.score > 50, 'True match must have strong score');
console.log(`✓ Reliance Industries correctly matched to RELIANCE.NS wire (isRelated=${rilTrueWire.isRelated}, score=${rilTrueWire.score})`);

// Reliance Retail only matches if ticker is RELIANCE.NS
const relRetailRil = calculateRelevanceScore(
  { title: 'Reliance Retail expands store network by 500 outlets', summary: '' },
  'RELIANCE.NS',
  'Reliance Industries Ltd',
  rilAliases
);
assert.strictEqual(relRetailRil.isRelated, true, 'Reliance Retail must match RELIANCE.NS');

const otherAliases = getCompanyAliases('TCS.NS', 'Tata Consultancy Services');
const relRetailOther = calculateRelevanceScore(
  { title: 'Reliance Retail expands store network by 500 outlets', summary: '' },
  'TCS.NS',
  'Tata Consultancy Services',
  otherAliases
);
assert.strictEqual(relRetailOther.isRelated, false, 'Reliance Retail must not match other tickers');
console.log(`✓ Reliance Retail aliasing correctly restricted to RELIANCE.NS`);

console.log('\n======================================================');
console.log('ALL FINANCIAL SENTIMENT ENGINE TESTS PASSED CLEANLY!');
console.log('======================================================\n');
