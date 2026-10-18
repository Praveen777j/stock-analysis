import assert from 'node:assert';
import {
  parseFinbertItem,
  runFinbertInference,
  PRIMARY_FINBERT_ENDPOINT,
  FINBERT_MODEL_NAME
} from '../src/finbertService';
import { computeModelSignal } from '../src/dataEngine';
import { StockQuote, TechnicalIndicators, SentimentData } from '../src/types';

console.log('--- STARTING FINBERT INFERENCE VERIFICATION TESTS ---\n');

// ==============================================================================
// 1. UNIT TEST: FINBERT CLASSIFICATION OUTPUT PARSER
// ==============================================================================
console.log('[Test 1] Testing FinBERT Raw Output Classification Parsing...');

// A. Test standard single-item Hugging Face pipeline output
const mockHfPositive = [
  { label: 'positive', score: 0.9234 },
  { label: 'neutral', score: 0.0521 },
  { label: 'negative', score: 0.0245 }
];
const parsedPositive = parseFinbertItem(mockHfPositive);
assert(parsedPositive !== null, 'Parsed item must not be null');
assert.strictEqual(parsedPositive.label, 'POSITIVE', 'Dominant class must be POSITIVE');
assert.strictEqual(parsedPositive.score, 0.90, 'Score must be pos (0.9234) - neg (0.0245) rounded to 0.90');
assert.strictEqual(parsedPositive.probabilities.positive, 0.923);
assert.strictEqual(parsedPositive.probabilities.negative, 0.025);
console.log(`✓ Positive output parsed accurately: Score ${parsedPositive.score}, Label: ${parsedPositive.label}`);

// B. Test bearish headline classification
const mockHfNegative = [
  { label: 'negative', score: 0.8842 },
  { label: 'neutral', score: 0.0913 },
  { label: 'positive', score: 0.0245 }
];
const parsedNegative = parseFinbertItem(mockHfNegative);
assert(parsedNegative !== null, 'Parsed item must not be null');
assert.strictEqual(parsedNegative.label, 'NEGATIVE', 'Dominant class must be NEGATIVE');
assert.strictEqual(parsedNegative.score, -0.86, 'Score must be pos (0.0245) - neg (0.8842) rounded to -0.86');
console.log(`✓ Negative output parsed accurately: Score ${parsedNegative.score}, Label: ${parsedNegative.label}`);

// C. Test neutral disclosure headline classification
const mockHfNeutral = [
  { label: 'neutral', score: 0.8250 },
  { label: 'positive', score: 0.0950 },
  { label: 'negative', score: 0.0800 }
];
const parsedNeutral = parseFinbertItem(mockHfNeutral);
assert(parsedNeutral !== null, 'Parsed item must not be null');
assert.strictEqual(parsedNeutral.label, 'NEUTRAL', 'Dominant class must be NEUTRAL');
assert.strictEqual(parsedNeutral.score, 0.02, 'Score must be pos (0.095) - neg (0.080) = 0.015 rounded to 0.02');
console.log(`✓ Neutral output parsed accurately: Score ${parsedNeutral.score}, Label: ${parsedNeutral.label}`);

// D. Test nested array format: [[ { label, score }, ... ]]
const mockNested = [mockHfPositive];
const parsedNested = parseFinbertItem(mockNested);
assert(parsedNested !== null, 'Nested array output must be parsed cleanly');
assert.strictEqual(parsedNested.label, 'POSITIVE');
console.log('✓ Nested Hugging Face pipeline array output parsed correctly.');


// ==============================================================================
// 2. MISSING TOKEN & EMPTY INPUT TESTS
// ==============================================================================
console.log('\n[Test 2] Testing Missing Token & Empty Input Guardrails...');

async function testMissingToken() {
  const result = await runFinbertInference(['Tata Motors reports record Q3 EV deliveries'], {
    token: '', // explicitly empty
    endpoint: PRIMARY_FINBERT_ENDPOINT
  });

  assert.strictEqual(result.status, 'UNAVAILABLE', 'Status must be UNAVAILABLE when token is missing');
  assert.strictEqual(result.overallScore, null, 'FinBERT score must be strictly null when token is missing');
  assert.strictEqual(result.diagnostics.reason, 'MISSING_TOKEN', 'Diagnostic reason must be MISSING_TOKEN');
  assert.strictEqual(result.items.length, 1);
  assert.strictEqual(result.items[0], null, 'Article FinBERT score must be null without token');
  console.log('✓ Missing HF_TOKEN immediately and honestly flags FinBERT as UNAVAILABLE without network calls.');
}

async function testEmptyHeadlines() {
  const result = await runFinbertInference([], {
    token: 'hf_test_mock_token_not_real',
    endpoint: PRIMARY_FINBERT_ENDPOINT
  });

  assert.strictEqual(result.status, 'UNAVAILABLE', 'Status must be UNAVAILABLE for empty headlines');
  assert.strictEqual(result.overallScore, null, 'Score must be null for empty input');
  assert.strictEqual(result.diagnostics.reason, 'EMPTY_INPUT', 'Reason must be EMPTY_INPUT');
  console.log('✓ Empty headline array handled cleanly without crash.');
}

// ==============================================================================
// 3. SUCCESSFUL INFERENCE SIMULATION WITH MOCK FETCH
// ==============================================================================
console.log('\n[Test 3] Testing Successful Genuine Batch Inference...');

async function testSuccessfulBatchInference() {
  const mockArticles = [
    'Reliance Industries net profit surges 22% in record quarter',
    'Adani Ports volume declines amidst trade route slowdown',
    'Infosys holds board meeting for standard quarterly governance'
  ];

  const mockHfBatchResponse = [
    [
      { label: 'positive', score: 0.94 },
      { label: 'neutral', score: 0.04 },
      { label: 'negative', score: 0.02 }
    ],
    [
      { label: 'negative', score: 0.85 },
      { label: 'neutral', score: 0.10 },
      { label: 'positive', score: 0.05 }
    ],
    [
      { label: 'neutral', score: 0.80 },
      { label: 'positive', score: 0.11 },
      { label: 'negative', score: 0.09 }
    ]
  ];

  let receivedAuthHeader = '';
  const mockFetch: typeof fetch = async (url, init) => {
    receivedAuthHeader = (init?.headers as any)?.['Authorization'] || '';
    return new Response(JSON.stringify(mockHfBatchResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const dummyToken = 'hf_test_token_secret_xyz';
  const result = await runFinbertInference(mockArticles, {
    token: dummyToken,
    endpoint: PRIMARY_FINBERT_ENDPOINT,
    fetchFn: mockFetch
  });

  assert.strictEqual(result.status, 'LIVE', 'Inference status must be LIVE upon valid response');
  assert(result.overallScore !== null, 'Overall score must be computed');
  // Article 1: 0.94 - 0.02 = 0.92
  // Article 2: 0.05 - 0.85 = -0.80
  // Article 3: 0.11 - 0.09 = 0.02
  // Avg: (0.92 + (-0.80) + 0.02) / 3 = 0.14 / 3 = 0.0466... -> 0.05
  assert.strictEqual(result.overallScore, 0.05, `Expected overall score 0.05, got ${result.overallScore}`);
  assert.strictEqual(result.items.length, 3);
  assert.strictEqual(result.items[0]?.label, 'POSITIVE');
  assert.strictEqual(result.items[1]?.label, 'NEGATIVE');
  assert.strictEqual(result.items[2]?.label, 'NEUTRAL');
  assert.strictEqual(result.items[0]?.score, 0.92);
  assert.strictEqual(result.items[1]?.score, -0.80);
  assert.strictEqual(result.items[2]?.score, 0.02);

  // Verify auth header sent correctly
  assert.strictEqual(receivedAuthHeader, `Bearer ${dummyToken}`, 'Bearer token must be transmitted in Authorization header');
  // Verify token is NOT leaked in diagnostics or message
  assert(!JSON.stringify(result.diagnostics).includes(dummyToken), 'Diagnostics must NEVER leak the token');
  console.log(`✓ Successful batch inference parsed accurately: Overall score ${result.overallScore}, labels verified.`);
}

// ==============================================================================
// 4. MALFORMED RESPONSE & INVALID JSON HANDLING
// ==============================================================================
console.log('\n[Test 4] Testing Malformed Responses & Non-JSON Handling...');

async function testMalformedResponses() {
  // Test invalid HTML error page returned instead of JSON
  const mockHtmlFetch: typeof fetch = async () => {
    return new Response('<html><body>502 Bad Gateway</body></html>', {
      status: 200, // HTTP 200 with HTML body
      headers: { 'Content-Type': 'text/html' }
    });
  };

  const res1 = await runFinbertInference(['Headline'], {
    token: 'hf_test_token',
    fetchFn: mockHtmlFetch
  });
  assert.strictEqual(res1.status, 'UNAVAILABLE', 'Non-JSON response must result in UNAVAILABLE');
  assert.strictEqual(res1.overallScore, null, 'Score must remain null on malformed response');
  assert.strictEqual(res1.diagnostics.reason, 'MALFORMED_RESPONSE');
  console.log('✓ Non-JSON HTML response handled without crashing.');

  // Test empty JSON array
  const mockEmptyJsonFetch: typeof fetch = async () => {
    return new Response(JSON.stringify([]), { status: 200 });
  };
  const res2 = await runFinbertInference(['Headline'], {
    token: 'hf_test_token',
    fetchFn: mockEmptyJsonFetch
  });
  assert.strictEqual(res2.status, 'UNAVAILABLE');
  assert.strictEqual(res2.overallScore, null);
  console.log('✓ Empty JSON payload handled gracefully.');
}

// ==============================================================================
// 5. TIMEOUTS & ABORT HANDLING
// ==============================================================================
console.log('\n[Test 5] Testing Timeout & Abort Handling...');

async function testTimeouts() {
  const mockHangingFetch: typeof fetch = async (_url, init) => {
    return new Promise((_, reject) => {
      const signal = init?.signal;
      if (signal) {
        signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }
    });
  };

  const startMs = Date.now();
  const res = await runFinbertInference(['Headline'], {
    token: 'hf_test_token',
    timeoutMs: 150, // fast timeout for test
    maxRetries: 0,
    fetchFn: mockHangingFetch
  });
  const elapsed = Date.now() - startMs;

  assert.strictEqual(res.status, 'UNAVAILABLE', 'Timed out request must yield UNAVAILABLE status');
  assert.strictEqual(res.overallScore, null, 'Score must be null on timeout');
  assert.strictEqual(res.diagnostics.reason, 'TIMEOUT', 'Reason must be TIMEOUT');
  assert(elapsed < 1000, `Timeout must trigger promptly, took ${elapsed}ms`);
  console.log(`✓ Request timeout caught cleanly after ${elapsed}ms without hanging the server.`);
}

// ==============================================================================
// 6. UNAVAILABLE SERVICE & ERROR CODES (HTTP 401, 429, 503)
// ==============================================================================
console.log('\n[Test 6] Testing HTTP Error States (401, 429, 503)...');

async function testHttpErrors() {
  // HTTP 401 Unauthorized
  const mock401Fetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: 'Invalid username or password.' }), { status: 401 });
  };
  const res401 = await runFinbertInference(['Headline'], { token: 'hf_invalid', fetchFn: mock401Fetch });
  assert.strictEqual(res401.status, 'UNAVAILABLE');
  assert.strictEqual(res401.diagnostics.reason, 'INVALID_CREDENTIALS');
  console.log('✓ HTTP 401 correctly flagged as INVALID_CREDENTIALS.');

  // HTTP 402 Payment Required / Credits Exhausted
  const calls402: string[] = [];
  const mock402Fetch: typeof fetch = async (url: any) => {
    calls402.push(String(url));
    return new Response(JSON.stringify({ error: 'You have no remaining credits. Purchase pre-paid credits to continue using Inference Providers.' }), { status: 402 });
  };
  const res402 = await runFinbertInference(['Headline'], { token: 'hf_valid_token_402', fetchFn: mock402Fetch, forceProbe: true });
  assert.strictEqual(res402.status, 'UNAVAILABLE');
  assert.strictEqual(res402.diagnostics.reason, 'CREDITS_EXHAUSTED');
  assert.strictEqual(calls402.length, 1, 'HTTP 402 must fail immediately without falling back to alternate endpoints for the same model');
  assert(res402.diagnostics.message?.includes('credits exhausted') || res402.diagnostics.message?.includes('HTTP 402'), 'Must mention credits exhausted');
  console.log('✓ HTTP 402 correctly flagged as CREDITS_EXHAUSTED without retrying alternate endpoints.');

  // Circuit breaker: Subsequent calls within cooldown do NOT invoke network
  const callsThrottle: string[] = [];
  const mockThrottledFetch: typeof fetch = async (url: any) => {
    callsThrottle.push(String(url));
    return new Response(JSON.stringify({ error: 'Should not be called' }), { status: 500 });
  };
  const resThrottled = await runFinbertInference(['Another headline'], { token: 'hf_valid_token_402', fetchFn: mockThrottledFetch, forceProbe: false });
  assert.strictEqual(resThrottled.status, 'UNAVAILABLE');
  assert.strictEqual(resThrottled.diagnostics.reason, 'CREDITS_EXHAUSTED');
  assert.strictEqual(callsThrottle.length, 0, 'Must NOT invoke network when credits are exhausted and cooldown is active');
  console.log('✓ Circuit breaker successfully prevented repeated probes to Hugging Face during credit exhaustion cooldown.');

  // Recovery when deliberate probe (forceProbe: true) succeeds
  const mockRecoveryFetch: typeof fetch = async () => {
    return new Response(JSON.stringify([
      [{ label: 'positive', score: 0.88 }, { label: 'neutral', score: 0.08 }, { label: 'negative', score: 0.04 }]
    ]), { status: 200 });
  };
  const resRecovered = await runFinbertInference(['Deliberate recovery test'], { token: 'hf_valid_token_402', fetchFn: mockRecoveryFetch, forceProbe: true });
  assert.strictEqual(resRecovered.status, 'LIVE');
  assert.strictEqual(resRecovered.overallScore, 0.84);
  console.log('✓ Recovery verified: Deliberate retry with restored credits restores FinBERT to LIVE status.');

  // HTTP 403 Forbidden / Insufficient Access
  const mock403Fetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions.' }), { status: 403 });
  };
  const res403 = await runFinbertInference(['Headline'], { token: 'hf_token_no_perm', fetchFn: mock403Fetch });
  assert.strictEqual(res403.status, 'UNAVAILABLE');
  assert.strictEqual(res403.diagnostics.reason, 'INSUFFICIENT_ACCESS');
  console.log('✓ HTTP 403 correctly flagged as INSUFFICIENT_ACCESS.');

  // HTTP 429 Rate Limit
  const mock429Fetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
  };
  const res429 = await runFinbertInference(['Headline'], { token: 'hf_token', fetchFn: mock429Fetch });
  assert.strictEqual(res429.status, 'UNAVAILABLE');
  assert.strictEqual(res429.diagnostics.reason, 'RATE_LIMITED');
  console.log('✓ HTTP 429 correctly flagged as RATE_LIMITED.');

  // HTTP 404 Unsupported Endpoint
  const mock404Fetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 });
  };
  const res404 = await runFinbertInference(['Headline'], { token: 'hf_token', fetchFn: mock404Fetch });
  assert.strictEqual(res404.status, 'UNAVAILABLE');
  assert.strictEqual(res404.diagnostics.reason, 'UNSUPPORTED_ENDPOINT');
  console.log('✓ HTTP 404 correctly flagged as UNSUPPORTED_ENDPOINT.');

  // HTTP 500 Provider/Server Error
  const mock500Fetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  };
  const res500 = await runFinbertInference(['Headline'], { token: 'hf_token', fetchFn: mock500Fetch });
  assert.strictEqual(res500.status, 'UNAVAILABLE');
  assert.strictEqual(res500.diagnostics.reason, 'SERVICE_UNAVAILABLE');
  assert(res500.diagnostics.message?.includes('HTTP 500'), 'Diagnostic message must mention HTTP 500');
  console.log('✓ HTTP 500 correctly flagged as SERVICE_UNAVAILABLE.');

  // HTTP 503 Model Loading
  const mock503Fetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: 'Model ProsusAI/finbert is currently loading', estimated_time: 20 }), { status: 503 });
  };
  const res503 = await runFinbertInference(['Headline'], { token: 'hf_token', maxRetries: 0, fetchFn: mock503Fetch });
  assert.strictEqual(res503.status, 'UNAVAILABLE');
  assert.strictEqual(res503.diagnostics.reason, 'MODEL_LOADING');
  console.log('✓ HTTP 503 correctly flagged as MODEL_LOADING without crashing.');

  // Automatic Endpoint Fallback Test (Primary Router 404 -> Secondary Router 200)
  const fallbackCalls: string[] = [];
  const mockFallbackFetch: typeof fetch = async (url: any) => {
    fallbackCalls.push(String(url));
    if (String(url).includes('/hf-inference/models/')) {
      return new Response(JSON.stringify({ error: 'Primary router path not found' }), { status: 404 });
    }
    // Secondary router endpoint succeeds
    return new Response(JSON.stringify([
      [{ label: 'positive', score: 0.85 }, { label: 'neutral', score: 0.10 }, { label: 'negative', score: 0.05 }]
    ]), { status: 200 });
  };
  const resFallback = await runFinbertInference(['Reliance quarterly profits rise'], { token: 'hf_valid_token', fetchFn: mockFallbackFetch });
  assert.strictEqual(resFallback.status, 'LIVE', 'Fallback to secondary router endpoint must succeed when primary returns 404');
  assert.strictEqual(fallbackCalls.length, 2, 'Must have attempted primary router endpoint first, then secondary endpoint');
  assert(fallbackCalls[0].includes('/hf-inference/models/'), 'First call must be primary router endpoint');
  assert(fallbackCalls[1].includes('/models/'), 'Second call must be secondary router endpoint');
  console.log('✓ Automatic fallback from primary to secondary inference router verified.');

  // Network Error: DNS resolution failure (ENOTFOUND)
  const mockDnsFailFetch: typeof fetch = async () => {
    const err: any = new TypeError('fetch failed');
    err.cause = { code: 'ENOTFOUND', syscall: 'getaddrinfo', hostname: 'router.huggingface.co' };
    throw err;
  };
  const resDns = await runFinbertInference(['Headline'], { token: 'hf_valid', fetchFn: mockDnsFailFetch });
  assert.strictEqual(resDns.status, 'UNAVAILABLE');
  assert.strictEqual(resDns.diagnostics.reason, 'NETWORK_ERROR');
  assert(resDns.diagnostics.message?.includes('DNS resolution failed (ENOTFOUND)'), 'Message must indicate DNS resolution failure');
  console.log('✓ DNS resolution failure (ENOTFOUND) correctly flagged as NETWORK_ERROR with precise diagnostic.');

  // Network Error: Connection Refused (ECONNREFUSED)
  const mockConnRefusedFetch: typeof fetch = async () => {
    const err: any = new TypeError('fetch failed');
    err.cause = { code: 'ECONNREFUSED', syscall: 'connect' };
    throw err;
  };
  const resRefused = await runFinbertInference(['Headline'], { token: 'hf_valid', fetchFn: mockConnRefusedFetch });
  assert.strictEqual(resRefused.status, 'UNAVAILABLE');
  assert.strictEqual(resRefused.diagnostics.reason, 'NETWORK_ERROR');
  assert(resRefused.diagnostics.message?.includes('Connection refused (ECONNREFUSED)'), 'Message must indicate connection refused');
  console.log('✓ Connection refused (ECONNREFUSED) correctly flagged with precise diagnostic.');

  // HTTP 403 No-Fallback Test: Must NOT attempt fallback on 403
  const calls403: string[] = [];
  const mock403NoFallback: typeof fetch = async (url: any) => {
    calls403.push(String(url));
    return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions.' }), { status: 403 });
  };
  const res403NoFallback = await runFinbertInference(['Headline'], { token: 'hf_no_perm', fetchFn: mock403NoFallback });
  assert.strictEqual(res403NoFallback.status, 'UNAVAILABLE');
  assert.strictEqual(res403NoFallback.diagnostics.reason, 'INSUFFICIENT_ACCESS');
  assert.strictEqual(calls403.length, 1, 'HTTP 403 must NOT trigger fallback to other endpoints; must fail fast and report INSUFFICIENT_ACCESS');
  console.log('✓ HTTP 403 correctly prevents fallbacks and reports INSUFFICIENT_ACCESS directly.');

  // Secret Redaction Test (Token and Authorization header must NEVER leak)
  const leakyToken = 'hf_secret1234567890abcdef';
  const mockLeakyFetch: typeof fetch = async () => {
    return new Response(`Error: Access denied for Bearer ${leakyToken} on endpoint`, { status: 403 });
  };
  const resRedacted = await runFinbertInference(['Headline'], { token: leakyToken, fetchFn: mockLeakyFetch });
  assert(!resRedacted.diagnostics.message?.includes(leakyToken), 'Token must NEVER be exposed in diagnostic messages');
  assert(resRedacted.diagnostics.message?.includes('[REDACTED]'), 'Secrets must be safely replaced with [REDACTED]');
  console.log('✓ Strict secret redaction verified (HF_TOKEN never exposed in error bodies or diagnostics).');
}

// ==============================================================================
// 7. DYNAMIC MODEL WEIGHT REDISTRIBUTION VERIFICATION
// ==============================================================================
function testModelWeightRedistribution() {
  console.log('\n[Test 7] Testing Dynamic Model Weight Redistribution (Live vs Unavailable)...');

  const dummyTechnicals: TechnicalIndicators = {
    rsi: 54.2,
    macd: 1.5,
    macdSignal: 1.2,
    macdHist: 0.3,
    ema20: 102.5,
    ema50: 98.0,
    atr: 2.1,
    volatility20d: 0.18
  };

  const dummyQuote: StockQuote = {
    ticker: 'RELIANCE.NS',
    companyName: 'Reliance Industries Limited',
    price: 2850,
    change: 15,
    changePct: 0.53,
    high52w: 3000,
    low52w: 2400,
    volume: 1200000,
    currency: 'INR',
    exchange: 'NSE',
    country: 'IN',
    sector: 'Energy',
    lastUpdated: new Date().toISOString(),
    dataStatus: 'LIVE',
    fundamentals: {
      profitMarginPct: 12.5,
      debtToEquity: 18.2,
      revenueGrowthYoY: '+14.2%',
      dataStatus: 'LIVE_PROVIDER_DATA',
      annualPnL: []
    }
  };

// Scenario A: FinBERT is LIVE with genuine score
const liveSentiment: SentimentData = {
  overallScore: 0.45,
  vaderCompound: 0.35,
  finbertScore: 0.55,
  finbertStatus: 'LIVE',
  newsCount: 4,
  label: 'BULLISH',
  articles: [
    {
      title: 'Reliance Secures Record Energy Contract',
      publisher: 'The Economic Times',
      date: 'Today',
      summary: 'Expansion into solar grid',
      url: 'https://example.com/rel',
      vaderScore: 0.40,
      finbertScore: 0.55,
      sentimentLabel: 'POSITIVE'
    }
  ],
  reddit: { status: 'EMPTY', postCount: 0, message: '', posts: [] }
};

const signalLive = computeModelSignal(dummyTechnicals, liveSentiment, dummyQuote);
assert.strictEqual(signalLive.breakdown.finbert.status, 'LIVE', 'FinBERT breakdown status must be LIVE');
assert.strictEqual(signalLive.breakdown.finbert.weight, 0.25, 'FinBERT weight must be 25% when LIVE with fundamentals');
assert.strictEqual(signalLive.breakdown.finbert.score, 0.55, 'FinBERT score must equal genuine parsed score');
assert.strictEqual(signalLive.breakdown.vader.weight, 0.15, 'VADER weight must be 15% when FinBERT is LIVE');
const totalLiveWeights = signalLive.breakdown.finbert.weight +
  signalLive.breakdown.vader.weight +
  signalLive.breakdown.technicals.weight +
  (signalLive.breakdown.fundamentals?.weight || 0) +
  signalLive.breakdown.mlEnsemble.weight;
assert.strictEqual(Math.round(totalLiveWeights * 100), 100, `Total weights must sum to 100%, got ${totalLiveWeights * 100}%`);
console.log(`✓ LIVE FinBERT correctly allocated ${signalLive.breakdown.finbert.weight * 100}% weight. Total model weights sum to 100%.`);

// Scenario B: FinBERT is UNAVAILABLE
const unavailableSentiment: SentimentData = {
  overallScore: 0.35,
  vaderCompound: 0.35,
  finbertScore: null,
  finbertStatus: 'UNAVAILABLE',
  newsCount: 4,
  label: 'BULLISH',
  articles: [
    {
      title: 'Reliance Secures Record Energy Contract',
      publisher: 'The Economic Times',
      date: 'Today',
      summary: 'Expansion into solar grid',
      url: 'https://example.com/rel',
      vaderScore: 0.35,
      finbertScore: null,
      sentimentLabel: 'POSITIVE'
    }
  ],
  reddit: { status: 'EMPTY', postCount: 0, message: '', posts: [] }
};

const signalUnavail = computeModelSignal(dummyTechnicals, unavailableSentiment, dummyQuote);
assert.strictEqual(signalUnavail.breakdown.finbert.status, 'UNAVAILABLE', 'FinBERT breakdown status must be UNAVAILABLE');
assert.strictEqual(signalUnavail.breakdown.finbert.weight, 0.0, 'FinBERT weight must be 0% when UNAVAILABLE');
assert.strictEqual(signalUnavail.breakdown.vader.weight, 0.25, 'VADER weight must absorb news weighting (increased from 15% to 25%)');
const totalUnavailWeights = signalUnavail.breakdown.finbert.weight +
  signalUnavail.breakdown.vader.weight +
  signalUnavail.breakdown.technicals.weight +
  (signalUnavail.breakdown.fundamentals?.weight || 0) +
  signalUnavail.breakdown.mlEnsemble.weight;
  assert.strictEqual(Math.round(totalUnavailWeights * 100), 100, `Total weights must sum to 100% when FinBERT is offline, got ${totalUnavailWeights * 100}%`);
  console.log(`✓ UNAVAILABLE FinBERT correctly de-allocated to 0% weight. VADER absorbed weight to 25%. Total weights sum to 100%.`);
}

// ==============================================================================
// 8. VADER FALLBACK LABELLING, CONFIDENCE HONESTY & MISSING SENTIMENT
// ==============================================================================
function testSentimentFallbackAndHonesty() {
  console.log('\n[Test 8] Testing VADER Fallback Labelling, Missing Sentiment & Honest Confidence...');

  const dummyTech: TechnicalIndicators = {
    rsi: 58.0,
    macd: 2.0,
    macdSignal: 1.5,
    macdHist: 0.5,
    ema20: 105.0,
    ema50: 100.0,
    atr: 2.0,
    volatility20d: 0.15
  };

  const dummyQuote: StockQuote = {
    ticker: 'INFY.NS',
    companyName: 'Infosys Limited',
    price: 1800,
    change: 12,
    changePct: 0.67,
    high52w: 2000,
    low52w: 1300,
    volume: 500000,
    currency: 'INR',
    exchange: 'NSE',
    country: 'IN',
    sector: 'Technology',
    lastUpdated: new Date().toISOString(),
    dataStatus: 'LIVE',
    fundamentals: {
      profitMarginPct: 15.0,
      debtToEquity: 10.0,
      revenueGrowthYoY: '+8.5%',
      dataStatus: 'LIVE_PROVIDER_DATA',
      annualPnL: []
    }
  };

  // 1. When FinBERT is offline with CREDITS_EXHAUSTED, VADER is explicitly labelled as fallback
  const creditsExhaustedSentiment: SentimentData = {
    overallScore: 0.40,
    vaderCompound: 0.40,
    finbertScore: null,
    finbertStatus: 'UNAVAILABLE',
    finbertReason: 'CREDITS_EXHAUSTED',
    sentimentMethod: 'VADER_FALLBACK',
    newsCount: 3,
    label: 'BULLISH',
    articles: [
      {
        title: 'Company Wins Expansion Contract',
        publisher: 'Mint',
        date: 'Today',
        summary: 'Major project win',
        url: 'https://example.com/mint',
        vaderScore: 0.40,
        finbertScore: null,
        sentimentLabel: 'POSITIVE'
      }
    ],
    reddit: { status: 'EMPTY', postCount: 0, message: '', posts: [] }
  };

  const sigVaderFallback = computeModelSignal(dummyTech, creditsExhaustedSentiment, dummyQuote);
  assert.strictEqual(sigVaderFallback.breakdown.finbert.status, 'UNAVAILABLE');
  assert.strictEqual(sigVaderFallback.breakdown.finbert.weight, 0.0);
  assert(sigVaderFallback.breakdown.vader.weight > 0.15, 'VADER must absorb news weight as fallback');
  assert(!sigVaderFallback.topContributions.find(c => c.feature.includes('FinBERT') && c.impact > 0), 'Must NOT claim FinBERT impact');
  const newsFeature = sigVaderFallback.topContributions.find(c => c.feature.includes('News Sentiment'));
  assert(newsFeature?.feature.includes('VADER Fallback'), 'Feature must be clearly labelled as VADER Fallback');
  assert(newsFeature?.description.includes('VADER lexical analysis fallback'), 'Description must indicate fallback');
  assert(!sigVaderFallback.topContributions.some(c => c.description.toLowerCase().includes('finbert confirmed')), 'Must not claim FinBERT confirmation');
  // Confidence must be capped honestly when FinBERT is offline
  assert(sigVaderFallback.confidenceScore <= 0.78, `Confidence must be capped when FinBERT is offline (got ${sigVaderFallback.confidenceScore})`);
  console.log('✓ VADER fallback correctly labelled without claiming false FinBERT confirmation, confidence capped honestly.');

  // 2. When corporate news is completely unavailable (newsCount === 0 or dataStatus === UNAVAILABLE)
  const noNewsSentiment: SentimentData = {
    overallScore: 0.0,
    vaderCompound: 0.0,
    finbertScore: null,
    finbertStatus: 'UNAVAILABLE',
    finbertReason: 'EMPTY_INPUT',
    sentimentMethod: 'UNAVAILABLE',
    newsCount: 0,
    label: 'NEUTRAL',
    articles: [],
    dataStatus: 'UNAVAILABLE',
    reddit: { status: 'EMPTY', postCount: 0, message: '', posts: [] }
  };

  const sigNoNews = computeModelSignal(dummyTech, noNewsSentiment, dummyQuote);
  assert.strictEqual(sigNoNews.breakdown.finbert.weight, 0.0, 'FinBERT weight must be 0% when no news');
  assert.strictEqual(sigNoNews.breakdown.vader.weight, 0.0, 'VADER weight must be 0% when no news');
  const totalNoNewsWeights = sigNoNews.breakdown.finbert.weight +
    sigNoNews.breakdown.vader.weight +
    sigNoNews.breakdown.technicals.weight +
    (sigNoNews.breakdown.fundamentals?.weight || 0) +
    sigNoNews.breakdown.mlEnsemble.weight;
  assert.strictEqual(Math.round(totalNoNewsWeights * 100), 100, `Total weights without news must sum to 100%, got ${totalNoNewsWeights * 100}%`);
  const noNewsFeature = sigNoNews.topContributions.find(c => c.feature.includes('News Sentiment'));
  assert(noNewsFeature?.feature.includes('Unavailable'), 'Feature must be labelled as Unavailable when no news');
  assert.strictEqual(noNewsFeature?.impact, 0, 'Unavailable news must have 0 impact');
  console.log('✓ Missing news sentiment handled gracefully: FinBERT=0%, VADER=0%, remaining active engines sum to 100%.');
}

// Execute all async tests
async function runAll() {
  await testMissingToken();
  await testEmptyHeadlines();
  await testSuccessfulBatchInference();
  await testMalformedResponses();
  await testTimeouts();
  await testHttpErrors();
  testModelWeightRedistribution();
  testSentimentFallbackAndHonesty();

  console.log('\n======================================================');
  console.log('ALL FINBERT INFERENCE VERIFICATION TESTS PASSED!');
  console.log('======================================================\n');
}

runAll().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
