import assert from 'node:assert';
import {
  parseDistilbertItem,
  runDistilbertInference,
  runLocalDistilbertInference,
  DistilbertLruCache,
  REMOTE_DISTILBERT_MODEL_NAME,
  REMOTE_DISTILBERT_MODEL_LICENSE,
  LOCAL_DISTILBERT_MODEL_NAME,
  LOCAL_DISTILBERT_MODEL_LICENSE,
  DISTILBERT_MODEL_NAME,
  DISTILBERT_MODEL_LICENSE,
  PRIMARY_DISTILBERT_ENDPOINT,
  CREDITS_EXHAUSTED_COOLDOWN_MS,
  extractSafeErrorMessage,
  getDistilbertStatusInfo,
  resetCreditsExhaustionCooldown,
  isCreditsExhausted
} from '../src/distilbertService';

console.log('--- STARTING DISTILBERT INFERENCE VERIFICATION TESTS ---\n');

// ==============================================================================
// 1. UNIT TEST: DISTILBERT CLASSIFICATION OUTPUT PARSER
// ==============================================================================
console.log('[Test 1] Testing DistilBERT Raw Output Classification Parsing...');

// A. Test standard 3-class positive output (AnkitAI format: negative=0, neutral=1, positive=2)
const mockPositive = [
  { label: 'label_2', score: 0.88 },
  { label: 'label_1', score: 0.08 },
  { label: 'label_0', score: 0.04 }
];
const parsedPositive = parseDistilbertItem(mockPositive);
assert(parsedPositive !== null, 'Parsed item must not be null');
assert.strictEqual(parsedPositive.label, 'POSITIVE', 'Dominant class must be POSITIVE');
assert.strictEqual(parsedPositive.score, 0.84, 'Score must be pos (0.88) - neg (0.04) = 0.84');
assert.strictEqual(parsedPositive.probabilities.positive, 0.88);
assert.strictEqual(parsedPositive.probabilities.negative, 0.04);
console.log(`✓ Positive output parsed accurately: Score ${parsedPositive.score}, Label: ${parsedPositive.label}`);

// B. Test bearish headline classification (3-class)
const mockNegative = [
  { label: 'label_0', score: 0.91 },
  { label: 'label_1', score: 0.06 },
  { label: 'label_2', score: 0.03 }
];
const parsedNegative = parseDistilbertItem(mockNegative);
assert(parsedNegative !== null, 'Parsed item must not be null');
assert.strictEqual(parsedNegative.label, 'NEGATIVE', 'Dominant class must be NEGATIVE');
assert.strictEqual(parsedNegative.score, -0.88, 'Score must be pos (0.03) - neg (0.91) = -0.88');
console.log(`✓ Negative output parsed accurately: Score ${parsedNegative.score}, Label: ${parsedNegative.label}`);

// C. Test neutral disclosure headline classification (3-class)
const mockNeutral = [
  { label: 'neutral', score: 0.85 },
  { label: 'positive', score: 0.08 },
  { label: 'negative', score: 0.07 }
];
const parsedNeutral = parseDistilbertItem(mockNeutral);
assert(parsedNeutral !== null, 'Parsed item must not be null');
assert.strictEqual(parsedNeutral.label, 'NEUTRAL', 'Dominant class must be NEUTRAL');
assert.strictEqual(parsedNeutral.score, 0.01, 'Score must be pos (0.08) - neg (0.07) = 0.01');
console.log(`✓ Neutral output parsed accurately: Score ${parsedNeutral.score}, Label: ${parsedNeutral.label}`);

// D. Test binary 2-class classification (SST-2 format: label_1=positive, label_0=negative)
const mockBinaryPositive = [
  { label: 'label_1', score: 0.92 },
  { label: 'label_0', score: 0.08 }
];
const parsedBinaryPos = parseDistilbertItem(mockBinaryPositive);
assert(parsedBinaryPos !== null);
assert.strictEqual(parsedBinaryPos.label, 'POSITIVE');
assert.strictEqual(parsedBinaryPos.score, 0.84);
assert.strictEqual(parsedBinaryPos.probabilities.neutral, 0);
console.log(`✓ 2-Class binary format parsed cleanly: Score ${parsedBinaryPos.score}, Label: ${parsedBinaryPos.label}`);

// E. Test nested array format [[ { label, score }, ... ]]
const parsedNested = parseDistilbertItem([mockPositive]);
assert(parsedNested !== null, 'Nested array must be parsed');
assert.strictEqual(parsedNested.label, 'POSITIVE');
console.log('✓ Nested pipeline array output parsed correctly.');


// ==============================================================================
// 2. MISSING TOKEN & EMPTY INPUT TESTS
// ==============================================================================
console.log('\n[Test 2] Testing Missing Token & Empty Input Guardrails...');

async function testMissingToken() {
  const result = await runDistilbertInference(['Tata Consultancy Services announces Q4 dividend'], {
    token: '' // explicitly empty
  });

  assert.strictEqual(result.status, 'UNAVAILABLE', 'Status must be UNAVAILABLE without token');
  assert.strictEqual(result.overallScore, null, 'Score must be null when token is missing');
  assert.strictEqual(result.diagnostics.reason, 'MISSING_TOKEN', 'Reason must be MISSING_TOKEN');
  assert.strictEqual(result.items.length, 1);
  assert.strictEqual(result.items[0], null, 'Article score must be null without token');
  console.log('✓ Missing HF_TOKEN immediately and honestly flags DistilBERT as UNAVAILABLE without network calls.');
}

async function testEmptyHeadlines() {
  const result = await runDistilbertInference([], {
    token: 'hf_test_mock_token_not_real'
  });

  assert.strictEqual(result.status, 'UNAVAILABLE', 'Status must be UNAVAILABLE for empty headlines');
  assert.strictEqual(result.overallScore, null, 'Score must be null for empty input');
  assert.strictEqual(result.diagnostics.reason, 'EMPTY_INPUT', 'Reason must be EMPTY_INPUT');
  console.log('✓ Empty headline array handled cleanly without crash.');
}

async function testInvalidTokenFormat() {
  const result = await runDistilbertInference(['State Bank of India operating income gains 14%'], {
    token: 'invalid_token_without_hf_prefix'
  });

  assert.strictEqual(result.status, 'UNAVAILABLE');
  assert.strictEqual(result.diagnostics.reason, 'INVALID_CREDENTIALS');
  console.log('✓ Token format validation caught invalid prefix honestly.');
}


// ==============================================================================
// 3. LRU CACHE & DEDUPLICATION TESTS
// ==============================================================================
console.log('\n[Test 3] Testing DistilBERT Bounded LRU Cache...');

const testCache = new DistilbertLruCache(3);
const item1 = { score: 0.75, label: 'POSITIVE' as const, probabilities: { positive: 0.8, neutral: 0.15, negative: 0.05 } };
const item2 = { score: -0.60, label: 'NEGATIVE' as const, probabilities: { positive: 0.1, neutral: 0.2, negative: 0.7 } };
const item3 = { score: 0.05, label: 'NEUTRAL' as const, probabilities: { positive: 0.3, neutral: 0.45, negative: 0.25 } };
const item4 = { score: 0.90, label: 'POSITIVE' as const, probabilities: { positive: 0.95, neutral: 0.03, negative: 0.02 } };

testCache.set('Reliance Q3 net profit surges 18%', item1);
testCache.set('HDFC Bank asset quality stable', item2);
testCache.set('Infosys signs enterprise cloud pact', item3);

assert.strictEqual(testCache.size(), 3, 'Cache size should be 3');
assert(testCache.get('Reliance Q3 net profit surges 18%') !== null, 'Item 1 should be cached');
assert.strictEqual(testCache.hits, 1, 'Cache hits should be 1');

// Adding 4th item must evict least recently used (HDFC Bank, since Reliance was just accessed)
testCache.set('Tata Motors EV sales jump 30%', item4);
assert.strictEqual(testCache.size(), 3, 'Cache size must remain capped at 3');
assert(testCache.get('HDFC Bank asset quality stable') === null, 'Oldest unaccessed item should be evicted');
assert.strictEqual(testCache.misses, 1, 'Cache misses should be 1');
console.log('✓ Bounded LRU Cache capacity enforcement and eviction verified.');


// ==============================================================================
// 4. SECRET REDACTION & SAFE ERROR HANDLING
// ==============================================================================
console.log('\n[Test 4] Testing Secret Redaction...');

const testSecret = 'hf_AbCdEf1234567890XYZ';
const rawError = `Failed to authenticate with token ${testSecret} on endpoint router.huggingface.co`;
const redacted = extractSafeErrorMessage(rawError, testSecret);
assert(!redacted.includes(testSecret), 'Token must be redacted from error output');
assert(redacted.includes('[REDACTED]'), 'Redaction placeholder must be present');
console.log('✓ Token successfully redacted from diagnostic error strings.');


// ==============================================================================
// 5. STATUS INFO & SEPARATE MODEL IDENTIFIER AUDIT
// ==============================================================================
console.log('\n[Test 5] Testing DistilBERT Separate Model Identifiers & Diagnostics...');

assert.strictEqual(REMOTE_DISTILBERT_MODEL_NAME, 'AnkitAI/distilbert-base-uncased-financial-news-sentiment-analysis');
assert.strictEqual(LOCAL_DISTILBERT_MODEL_NAME, 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
assert.notStrictEqual(REMOTE_DISTILBERT_MODEL_NAME, LOCAL_DISTILBERT_MODEL_NAME, 'Remote and Local model IDs must be distinct');

const statusInfo = getDistilbertStatusInfo();
assert.strictEqual(statusInfo.modelId, REMOTE_DISTILBERT_MODEL_NAME);
assert.strictEqual(statusInfo.license, REMOTE_DISTILBERT_MODEL_LICENSE);
assert.strictEqual(statusInfo.memory.renderFreeTierLimitMb, 512);
console.log(`✓ Status endpoint returns valid schema (Remote: ${REMOTE_DISTILBERT_MODEL_NAME}, Local: ${LOCAL_DISTILBERT_MODEL_NAME}).`);


// ==============================================================================
// 6. MOCK BATCH INFERENCE SIMULATION
// ==============================================================================
console.log('\n[Test 6] Testing Mock Batch Inference Response...');

async function testMockFetchInference() {
  const mockFetch = async () => {
    return {
      ok: true,
      status: 200,
      json: async () => [
        [
          { label: 'label_2', score: 0.90 },
          { label: 'label_1', score: 0.08 },
          { label: 'label_0', score: 0.02 }
        ],
        [
          { label: 'label_0', score: 0.85 },
          { label: 'label_1', score: 0.10 },
          { label: 'label_2', score: 0.05 }
        ]
      ]
    } as any;
  };

  const result = await runDistilbertInference(
    ['Reliance Industries reports profit growth', 'Market index experiences temporary dip'],
    {
      token: 'hf_valid_mock_token_12345',
      fetchFn: mockFetch as any
    }
  );

  assert.strictEqual(result.status, 'LIVE', 'Status must be LIVE on valid response');
  assert.strictEqual(result.items.length, 2, 'Must classify 2 items');
  assert(result.overallScore !== null, 'Overall score must not be null');
  assert.strictEqual(result.diagnostics.model, REMOTE_DISTILBERT_MODEL_NAME);
  console.log(`✓ Simulated batch inference succeeded: Overall score ${result.overallScore}, Status: ${result.status}.`);
}


// ==============================================================================
// 7. UPSTREAM ERROR HANDLING & CIRCUIT BREAKER TESTS
// ==============================================================================
console.log('\n[Test 7] Testing Upstream HTTP Error Statuses & Circuit Breaker...');

async function testHttp401AuthError() {
  const mockFetch = async () => ({
    ok: false,
    status: 401,
    text: async () => '{"error":"Invalid credentials"}'
  } as any);

  const res = await runDistilbertInference(['Headline test'], {
    token: 'hf_mock_invalid_token',
    fetchFn: mockFetch as any
  });

  assert.strictEqual(res.status, 'UNAVAILABLE');
  assert.strictEqual(res.diagnostics.reason, 'INVALID_CREDENTIALS');
  console.log('✓ HTTP 401 correctly parsed as INVALID_CREDENTIALS.');
}

async function testHttp402CreditsExhausted() {
  const mockFetch = async () => ({
    ok: false,
    status: 402,
    text: async () => '{"error":"You have no remaining credits. Purchase pre-paid credits to continue using Inference Providers."}'
  } as any);

  const res = await runDistilbertInference(['Headline test'], {
    token: 'hf_mock_exhausted_token',
    fetchFn: mockFetch as any
  });

  assert.strictEqual(res.status, 'UNAVAILABLE');
  assert.strictEqual(res.diagnostics.reason, 'CREDITS_EXHAUSTED');
  assert(isCreditsExhausted(), 'Circuit breaker should be active after HTTP 402');

  // Next call should be intercepted immediately by circuit breaker without network call
  const fastPathRes = await runDistilbertInference(['Another headline'], {
    token: 'hf_mock_exhausted_token',
    fetchFn: (() => { throw new Error('Network should not be touched during cooldown'); }) as any
  });
  assert.strictEqual(fastPathRes.status, 'UNAVAILABLE');
  assert.strictEqual(fastPathRes.diagnostics.reason, 'CREDITS_EXHAUSTED');
  console.log('✓ HTTP 402 correctly engaged 15-minute circuit breaker cooldown.');
  resetCreditsExhaustionCooldown();
}

async function testHttp429RateLimit() {
  const mockFetch = async () => ({
    ok: false,
    status: 429,
    text: async () => 'Rate limit exceeded'
  } as any);

  const res = await runDistilbertInference(['Headline test'], {
    token: 'hf_mock_token_429',
    fetchFn: mockFetch as any
  });

  assert.strictEqual(res.status, 'UNAVAILABLE');
  assert.strictEqual(res.diagnostics.reason, 'RATE_LIMITED');
  console.log('✓ HTTP 429 correctly parsed as RATE_LIMITED.');
}

async function testHttp500ServiceUnavailable() {
  const mockFetch = async () => ({
    ok: false,
    status: 500,
    text: async () => 'Internal Server Error'
  } as any);

  const res = await runDistilbertInference(['Headline test'], {
    token: 'hf_mock_token_500',
    fetchFn: mockFetch as any
  });

  assert.strictEqual(res.status, 'UNAVAILABLE');
  assert.strictEqual(res.diagnostics.reason, 'SERVICE_UNAVAILABLE');
  console.log('✓ HTTP 500 correctly parsed as SERVICE_UNAVAILABLE.');
}

async function testTimeoutHandling() {
  const mockFetch = async () => {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    throw err;
  };

  const res = await runDistilbertInference(['Headline test'], {
    token: 'hf_mock_timeout_token',
    fetchFn: mockFetch as any,
    timeoutMs: 50,
    maxRetries: 0
  });

  assert.strictEqual(res.status, 'UNAVAILABLE');
  assert.strictEqual(res.diagnostics.reason, 'TIMEOUT');
  console.log('✓ AbortError correctly mapped to TIMEOUT.');
}


// ==============================================================================
// 8. LOCAL ONNX INFERENCE SAFETY & SEPARATE ATTRIBUTION
// ==============================================================================
console.log('\n[Test 8] Testing Local ONNX Execution & Distinct Model Attribution...');

async function testLocalModelAttribution() {
  // Empty input check on local inference
  const emptyRes = await runLocalDistilbertInference([]);
  assert.strictEqual(emptyRes.diagnostics.model, LOCAL_DISTILBERT_MODEL_NAME);
  assert.strictEqual(emptyRes.diagnostics.reason, 'EMPTY_INPUT');

  // Verify that local ONNX inference does not run by default when preferLocal and env var are unset
  const defaultRes = await runDistilbertInference(['Tata Motors sales up'], {
    token: '' // missing token
  });
  assert.strictEqual(defaultRes.diagnostics.reason, 'MISSING_TOKEN');
  assert.strictEqual(defaultRes.diagnostics.model, REMOTE_DISTILBERT_MODEL_NAME);
  console.log('✓ Local ONNX disabled by default on zero-token environment (Render Free safety verified).');
  console.log(`✓ Model attribution verified: Local uses "${LOCAL_DISTILBERT_MODEL_NAME}", Remote uses "${REMOTE_DISTILBERT_MODEL_NAME}".`);
}

async function runAll() {
  await testMissingToken();
  await testEmptyHeadlines();
  await testInvalidTokenFormat();
  await testMockFetchInference();
  await testHttp401AuthError();
  await testHttp402CreditsExhausted();
  await testHttp429RateLimit();
  await testHttp500ServiceUnavailable();
  await testTimeoutHandling();
  await testLocalModelAttribution();
  resetCreditsExhaustionCooldown();
  console.log('\n======================================================');
  console.log('ALL DISTILBERT INFERENCE VERIFICATION TESTS PASSED!');
  console.log('======================================================\n');
}

runAll().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
