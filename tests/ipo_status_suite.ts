import assert from 'node:assert';
import {
  calculateIPOStatus,
  normalizeDateToIso,
  UPCOMING_IPOS_CATALOG,
  getEnrichedIPOs,
  getIPOById,
  IPO_CATALOG_DISCLOSURE
} from '../src/ipoCatalog';

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

// Dynamic status calculation for Jio Platforms on 2026-10-25 (Bidding Oct 21-24, Allotment Oct 26)
const jioComputedStatus = calculateIPOStatus({
  openDate: jioEntry.openDate,
  closeDate: jioEntry.closeDate,
  allotmentDate: jioEntry.allotmentDate,
  listingDate: jioEntry.listingDate,
  isVerifiedListed: jioEntry.isVerifiedListed,
  todayIst: TEST_TODAY
});
assert.strictEqual(
  jioComputedStatus,
  'Closed (allotment pending)',
  'On 2026-10-25 (after close 24 Oct, before allotment 26 Oct), Jio Platforms must be Closed (allotment pending)'
);
console.log('✓ Jio Platforms entry strictly conforms to news facts, blank band/lot, and correct status.');

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
console.log('\n--- ALL IPO STATUS TESTS PASSED SUCCESSFULLY! ---');
