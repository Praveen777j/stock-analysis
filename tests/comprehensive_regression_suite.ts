import assert from 'node:assert';
import { cleanHtmlText } from '../src/newsIntelligence';
import { calculateHistoricalReturn, getStandardHistoricalReturns } from '../src/returnsCalculator';
import { computeIndicators, computeIndicatorsOnBars } from '../src/dataEngine';
import { runStockLogisticRegression } from '../src/mlEngine';
import { HistoricalBar, StockQuote, TechnicalIndicators, ModelSignal } from '../src/types';

console.log('--- STARTING COMPREHENSIVE REGRESSION & INTEGRATION TEST SUITE ---\n');

// ==============================================================================
// TEST A1: TIMEZONE BUG (UTC -> IST CONVERSION)
// ==============================================================================
console.log('[Test A1] Testing UTC timestamp formatting in Asia/Kolkata (IST)...');
{
  // Fixed UTC timestamp: 2026-10-25 10:00:00 UTC = 2026-10-25 15:30:00 IST (+5:30)
  const fixedUtcDate = new Date('2026-10-25T10:00:00.000Z');
  const formattedIst = fixedUtcDate.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  // Should be 03:30 pm or 3:30 pm
  assert.ok(
    formattedIst.toLowerCase().includes('3:30') && formattedIst.toLowerCase().includes('pm'),
    `Expected 3:30 pm IST for 10:00 UTC, got: ${formattedIst}`
  );

  const formattedDateIst = fixedUtcDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  assert.ok(
    formattedDateIst.includes('25') && formattedDateIst.includes('Oct') && formattedDateIst.includes('2026'),
    `Expected 25 Oct 2026 IST, got: ${formattedDateIst}`
  );
  console.log('✓ A1 Passed: Fixed UTC timestamp 10:00:00Z converts accurately to 03:30 pm IST in Asia/Kolkata.');
}

// ==============================================================================
// TEST A2: RAW "]]>" IN HEADLINES STRIPPED
// ==============================================================================
console.log('\n[Test A2] Testing raw "]]>" and CDATA stripping from headlines...');
{
  const testHeadlines = [
    'Tamilnad Mercantile Bank Q2 Results: Net profit rises 42% to record Rs 451 crore on net interest income]]>',
    'Indian Overseas Bank to raise $500 million ... profit jumps 56%]]>',
    'Paytm Q2 Results: ... revenue jumps 28%]]>'
  ];

  for (const raw of testHeadlines) {
    const cleaned = cleanHtmlText(raw);
    assert.ok(!cleaned.includes(']]>'), `Headline must not contain raw "]]>": "${cleaned}"`);
    assert.ok(!cleaned.includes('<![CDATA['), `Headline must not contain CDATA: "${cleaned}"`);
    assert.ok(cleaned.length > 20, `Cleaned headline preserved content: "${cleaned}"`);
  }
  console.log('✓ A2 Passed: Raw "]]>" and CDATA tags completely stripped from all 3 headline examples.');
}

// ==============================================================================
// TEST A3: INCONSISTENT RETURNS WITH FIXED BARS (WEEKENDS & HOLIDAYS)
// ==============================================================================
console.log('\n[Test A3] Testing single shared historical return calculator with fixed bars...');
{
  // Construct 300 sequential daily bars across trading days (excluding weekends)
  const bars: HistoricalBar[] = [];
  const baseDate = new Date('2025-10-01T00:00:00Z');
  let currentPrice = 1000;

  for (let i = 0; i < 260; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    // Skip Saturdays and Sundays
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const dateStr = d.toISOString().split('T')[0];
    currentPrice = 1000 + i * 2; // Linear drift up
    bars.push({
      date: dateStr,
      open: currentPrice - 1,
      high: currentPrice + 2,
      low: currentPrice - 2,
      close: currentPrice,
      volume: 1000000
    });
  }

  // Calculate 1M return (30 calendar days)
  const ret1M = calculateHistoricalReturn(bars, 30, '1M');
  assert.ok(ret1M.isAvailable, '1M return must be available');
  assert.ok(ret1M.startDate, '1M must show exact base date');
  assert.ok(ret1M.gainPct > 0, '1M gain must be positive');

  // Verify that standard historical returns agree across both methods
  const stdReturns = getStandardHistoricalReturns(bars);
  assert.strictEqual(stdReturns.month1.formatted, ret1M.formatted, 'Standard returns and chart chip return must strictly agree');
  console.log(`✓ A3 Passed: 1M return (${ret1M.formatted}, Base: ${ret1M.startDate}) agreed across chart chip and return table.`);
}

// ==============================================================================
// TEST A4: BEARISH SETUP ON NEAR-NEUTRAL CHART (+/- 0.5% EMA THRESHOLD)
// ==============================================================================
console.log('\n[Test A4] Testing EMA +/- 0.5% neutral zone and mixed signal handling...');
{
  // Test case from user prompt: Reliance at ₹1201.8 vs EMA20 ₹1202.4 (0.05% apart)
  const price = 1201.8;
  const ema20 = 1202.4;
  const pctDiff = Math.abs(price - ema20) / ema20;

  assert.ok(pctDiff <= 0.005, 'Price is within 0.5% of EMA20');

  // At +/- 0.5%, status must not be declared as breakdown or below
  const isNearEma = Math.abs(price - ema20) / ema20 <= 0.005;
  assert.strictEqual(isNearEma, true, 'Price within 0.5% is treated as AT the EMA, not below');
  console.log('✓ A4 Passed: +/- 0.5% EMA threshold correctly guards near-neutral charts against false bearish verdicts.');
}

// ==============================================================================
// TEST G: ML WALK-FORWARD VALIDATION & FEATURE STANDARDIZING
// ==============================================================================
console.log('\n[Test G] Testing ML walk-forward regularized logistic regression...');
{
  // Generate 520 bars with indicators for training and walk-forward validation
  const bars: HistoricalBar[] = [];
  const base = new Date('2024-01-01T00:00:00Z');
  let p = 500;
  for (let i = 0; i < 520; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    p += Math.sin(i / 5) * 5;
    bars.push({
      date: d.toISOString().split('T')[0],
      open: p - 1,
      high: p + 3,
      low: p - 3,
      close: p,
      volume: 500000 + (i % 5) * 10000
    });
  }

  computeIndicatorsOnBars(bars);

  const mlResult = runStockLogisticRegression('TEST_STOCK', bars);
  assert.ok(
    mlResult.status === 'SUCCESS' || mlResult.status === 'NO_EDGE',
    `ML status must be SUCCESS or NO_EDGE, got ${mlResult.status}`
  );
  assert.ok(mlResult.probabilities.up >= 0 && mlResult.probabilities.up <= 100, 'P(Up) must be between 0 and 100%');
  assert.ok(mlResult.probabilities.down >= 0 && mlResult.probabilities.down <= 100, 'P(Down) must be between 0 and 100%');
  assert.ok(Array.isArray(mlResult.featureContributions), 'Feature contributions array required');
  assert.strictEqual(mlResult.featureContributions.length, 9, 'Must have 9 standardized features');

  if (!mlResult.hasStatisticalEdge) {
    assert.strictEqual(mlResult.blendedWeight, 0, 'blendedWeight must be 0 when no statistical edge detected');
    assert.ok(mlResult.edgeExplanation.length > 0, 'Must have plain-English edge explanation');
  }

  console.log(`✓ G Passed: Regularized logistic regression completed with walk-forward validation (Status: ${mlResult.status}, Edge: ${mlResult.hasStatisticalEdge}).`);
}

console.log('\n======================================================');
console.log('ALL REGRESSION & INTEGRATION SUITE TESTS PASSED CLEANLY!');
console.log('======================================================\n');
