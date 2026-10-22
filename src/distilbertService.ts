/**
 * DistilBERT Financial Sentiment Inference Service
 * 
 * Uses AnkitAI/distilbert-base-uncased-financial-news-sentiment-analysis
 * (base: distilbert/distilbert-base-uncased, fine-tuned on Financial PhraseBank, Apache-2.0 license)
 * to perform genuine transformer sentiment inference on financial news headlines.
 * 
 * Safety & Reliability Guarantees:
 * - Reads token securely from process.env.HF_TOKEN
 * - NEVER logs or exposes the HF_TOKEN (strict secret redaction)
 * - Honest status: if token is missing, endpoint is unavailable, or inference fails,
 *   marks DistilBERT as UNAVAILABLE and never fakes or fabricates sentiment scores.
 * - Enforces timeouts and circuit breakers (15-min cooldown on HTTP 402 credit exhaustion).
 * - Bounded in-memory LRU cache (capacity: 500) to avoid redundant requests.
 */

export interface DistilbertLabelScore {
  label: string;
  score: number;
}

export interface DistilbertItemResult {
  score: number; // Normalized -1.00 to +1.00 (p_positive - p_negative)
  label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  probabilities: {
    positive: number;
    neutral: number;
    negative: number;
  };
  isCached?: boolean;
}

export interface DistilbertInferenceResult {
  status: 'LIVE' | 'UNAVAILABLE';
  engine?: 'DISTILBERT_LOCAL' | 'DISTILBERT_REMOTE' | 'VADER_FALLBACK' | 'UNAVAILABLE';
  overallScore: number | null;
  items: Array<DistilbertItemResult | null>;
  diagnostics: {
    endpoint: string;
    model: string;
    license: string;
    articlesAnalyzed: number;
    reason?: 'MISSING_TOKEN' | 'INVALID_CREDENTIALS' | 'INSUFFICIENT_ACCESS' | 'CREDITS_EXHAUSTED' | 'EMPTY_INPUT' | 'MODEL_LOADING' | 'MODEL_UNAVAILABLE' | 'AUTH_ERROR' | 'RATE_LIMITED' | 'UNSUPPORTED_ENDPOINT' | 'TIMEOUT' | 'NETWORK_ERROR' | 'MALFORMED_RESPONSE' | 'SERVICE_UNAVAILABLE' | 'INSUFFICIENT_MEMORY_RENDER_512MB' | 'LOCAL_MODEL_INIT_FAILED';
    message?: string;
    memoryRssMb?: number;
    runtime?: string;
  };
}

export interface DistilbertOptions {
  token?: string;
  endpoint?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchFn?: typeof fetch;
  forceProbe?: boolean;
  preferLocal?: boolean;
}

export const REMOTE_DISTILBERT_MODEL_NAME = 'AnkitAI/distilbert-base-uncased-financial-news-sentiment-analysis';
export const REMOTE_DISTILBERT_MODEL_LICENSE = 'Apache-2.0';

export const LOCAL_DISTILBERT_MODEL_NAME = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';
export const LOCAL_DISTILBERT_MODEL_LICENSE = 'Apache-2.0';

// Backward-compatible alias referencing the primary financial three-class model
export const DISTILBERT_MODEL_NAME = REMOTE_DISTILBERT_MODEL_NAME;
export const DISTILBERT_MODEL_LICENSE = REMOTE_DISTILBERT_MODEL_LICENSE;

export const PRIMARY_DISTILBERT_ENDPOINT = `https://router.huggingface.co/hf-inference/models/${REMOTE_DISTILBERT_MODEL_NAME}`;
export const SECONDARY_DISTILBERT_ENDPOINT = `https://router.huggingface.co/models/${REMOTE_DISTILBERT_MODEL_NAME}`;

export const CANDIDATE_DISTILBERT_ENDPOINTS = [
  PRIMARY_DISTILBERT_ENDPOINT,
  SECONDARY_DISTILBERT_ENDPOINT
];

export const CREDITS_EXHAUSTED_COOLDOWN_MS = 15 * 60 * 1000;

let creditsExhaustedUntil = 0;
let lastCreditsExhaustedMessage = '';
let lastExhaustedTokenHash = '';

export function isCreditsExhausted(): boolean {
  return Date.now() < creditsExhaustedUntil;
}

export function getCreditsExhaustedRemainingSec(): number {
  return Math.max(0, Math.ceil((creditsExhaustedUntil - Date.now()) / 1000));
}

export function recordCreditsExhaustion(message: string, token: string = ''): void {
  creditsExhaustedUntil = Date.now() + CREDITS_EXHAUSTED_COOLDOWN_MS;
  lastCreditsExhaustedMessage = message;
  lastExhaustedTokenHash = token ? `${token.slice(0, 6)}...${token.slice(-4)}` : '';
}

export function resetCreditsExhaustionCooldown(): void {
  creditsExhaustedUntil = 0;
  lastCreditsExhaustedMessage = '';
  lastExhaustedTokenHash = '';
}

export function logSafeBackendDiagnostic(info: {
  endpoint: string;
  httpStatus?: number | string;
  elapsedMs: number;
  reason?: string;
  providerMessage?: string;
  status: 'LIVE' | 'UNAVAILABLE';
  articlesCount?: number;
}): void {
  let safePath = info.endpoint;
  try {
    const parsed = new URL(info.endpoint);
    safePath = `${parsed.origin}${parsed.pathname}`;
  } catch {
    safePath = info.endpoint.replace(/[?#].*$/, '');
  }

  const logParts = [
    `[DistilBERT Backend Diagnostic]`,
    `status=${info.status}`,
    info.httpStatus !== undefined ? `httpStatus=${info.httpStatus}` : null,
    info.reason ? `reason=${info.reason}` : null,
    `elapsed=${info.elapsedMs}ms`,
    `endpoint=${safePath}`,
    info.articlesCount !== undefined ? `articles=${info.articlesCount}` : null,
    info.providerMessage ? `msg="${info.providerMessage.slice(0, 140).replace(/["\r\n]/g, ' ').trim()}"` : null
  ].filter(Boolean);

  console.info(logParts.join(' | '));
}

export function extractSafeErrorMessage(rawBody: string, token: string = ''): string {
  if (!rawBody) return '';
  let msg = '';
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.error === 'string') {
        msg = parsed.error;
      } else if (Array.isArray(parsed.error)) {
        msg = parsed.error.join(', ');
      } else if (typeof parsed.message === 'string') {
        msg = parsed.message;
      }
    }
  } catch {
    if (!rawBody.includes('<html') && !rawBody.includes('<!DOCTYPE')) {
      msg = rawBody.slice(0, 160).trim();
    }
  }

  if (token && token.length > 5 && msg.includes(token)) {
    msg = msg.split(token).join('[REDACTED]');
  }
  msg = msg.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  msg = msg.replace(/hf_[a-zA-Z0-9_\-\.]+/gi, 'hf_[REDACTED]');
  return msg.trim();
}

/**
 * Parses raw classification output from DistilBERT / Hugging Face model.
 * Label mapping:
 * 0: negative, 1: neutral, 2: positive (or explicit 'positive', 'neutral', 'negative')
 */
export function parseDistilbertItem(data: any): DistilbertItemResult | null {
  if (!data) return null;

  let list: any[] | null = null;
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) {
      list = data[0];
    } else if (data.length > 0 && typeof data[0] === 'object' && 'label' in data[0]) {
      list = data;
    }
  } else if (typeof data === 'object' && 'label' in data) {
    list = [data];
  }

  if (!list || list.length === 0) return null;

  let pos = 0;
  let neg = 0;
  let neu = 0;
  let hasValid = false;

  const isBinaryMode = list.length === 2 &&
    list.some(e => String(e?.label).toLowerCase() === 'label_1') &&
    !list.some(e => String(e?.label).toLowerCase() === 'label_2') &&
    !list.some(e => String(e?.label).toLowerCase() === 'neutral' || String(e?.label).toLowerCase() === 'neu');

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const rawLabel = String(entry.label || '').trim().toLowerCase();
    const scoreVal = typeof entry.score === 'number' && !isNaN(entry.score) ? entry.score : 0;

    if (isBinaryMode) {
      if (rawLabel === 'positive' || rawLabel === 'pos' || rawLabel === 'label_1') {
        pos = scoreVal;
        hasValid = true;
      } else if (rawLabel === 'negative' || rawLabel === 'neg' || rawLabel === 'label_0') {
        neg = scoreVal;
        hasValid = true;
      }
    } else {
      // Standard 3-class financial model (AnkitAI: label_0=negative, label_1=neutral, label_2=positive)
      if (rawLabel === 'positive' || rawLabel === 'pos' || rawLabel === 'label_2') {
        pos = scoreVal;
        hasValid = true;
      } else if (rawLabel === 'negative' || rawLabel === 'neg' || rawLabel === 'label_0') {
        neg = scoreVal;
        hasValid = true;
      } else if (rawLabel === 'neutral' || rawLabel === 'neu' || rawLabel === 'label_1') {
        neu = scoreVal;
        hasValid = true;
      }
    }
  }

  if (!hasValid) return null;

  // Normalize probabilities so they strictly sum to 1.0
  const sum = pos + neg + neu;
  if (sum > 0) {
    pos = pos / sum;
    neg = neg / sum;
    neu = neu / sum;
  }

  const diff = pos - neg;
  const roundedScore = Math.round(diff * 100) / 100;

  let label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
  if (pos > neg && pos > neu) {
    label = 'POSITIVE';
  } else if (neg > pos && neg > neu) {
    label = 'NEGATIVE';
  } else {
    label = 'NEUTRAL';
  }

  return {
    score: roundedScore,
    label,
    probabilities: {
      positive: Math.round(pos * 1000) / 1000,
      neutral: Math.round(neu * 1000) / 1000,
      negative: Math.round(neg * 1000) / 1000
    }
  };
}

export class DistilbertLruCache {
  private maxEntries: number;
  private cache = new Map<string, { result: DistilbertItemResult; timestamp: number }>();
  public hits = 0;
  public misses = 0;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  private normalizeKey(text: string): string {
    return text.trim().toLowerCase().replace(/[^a-z0-9]/g, ' ').slice(0, 512);
  }

  public get(text: string): DistilbertItemResult | null {
    const key = this.normalizeKey(text);
    if (!key) return null;
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    this.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    return {
      ...entry.result,
      isCached: true
    };
  }

  public set(text: string, result: DistilbertItemResult): void {
    const key = this.normalizeKey(text);
    if (!key || !result) return;
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { result: { ...result, isCached: false }, timestamp: Date.now() });
  }

  public size(): number {
    return this.cache.size;
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const distilbertCache = new DistilbertLruCache(500);

let lastSuccessfulInferenceTimestamp: number | null = null;
let localModelStatus: 'UNLOADED' | 'LOADING' | 'LOADED' | 'ERROR' = 'UNLOADED';
let localModelError: string | null = null;

export function getDistilbertStatusInfo() {
  const memRssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  const memHeapMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

  return {
    modelId: DISTILBERT_MODEL_NAME,
    license: DISTILBERT_MODEL_LICENSE,
    classes: ['negative (0)', 'neutral (1)', 'positive (2)'],
    sentimentFormula: 'positive_probability - negative_probability',
    state: localModelStatus,
    error: localModelError,
    lastSuccessfulInference: lastSuccessfulInferenceTimestamp ? new Date(lastSuccessfulInferenceTimestamp).toISOString() : null,
    cache: {
      cachedEntries: distilbertCache.size(),
      maxCapacity: 500,
      hits: distilbertCache.hits,
      misses: distilbertCache.misses
    },
    memory: {
      rssMb: memRssMb,
      heapMb: memHeapMb,
      renderFreeTierLimitMb: 512
    }
  };
}

let localClassifierPipeline: any = null;
let localClassifierInitPromise: Promise<any> | null = null;

export async function getLocalDistilbertPipeline(): Promise<any> {
  if (localClassifierPipeline) return localClassifierPipeline;
  if (!localClassifierInitPromise) {
    localModelStatus = 'LOADING';
    localClassifierInitPromise = (async () => {
      try {
        const { pipeline } = await import('@xenova/transformers');
        // Uses Xenova-compatible quantized model
        const classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
          quantized: true
        });
        localClassifierPipeline = classifier;
        localModelStatus = 'LOADED';
        localModelError = null;
        return classifier;
      } catch (err: any) {
        localClassifierInitPromise = null;
        localModelStatus = 'ERROR';
        localModelError = err?.message || String(err);
        throw err;
      }
    })();
  }
  return localClassifierInitPromise;
}

let localInferenceQueue: Promise<void> = Promise.resolve();

export async function runLocalDistilbertInference(
  headlines: string[]
): Promise<DistilbertInferenceResult> {
  const startTime = Date.now();
  const cleanHeadlines = headlines
    .map(h => (h || '').trim())
    .filter(h => h.length > 0)
    .slice(0, 10);

  if (cleanHeadlines.length === 0) {
    return {
      status: 'UNAVAILABLE',
      engine: 'DISTILBERT_LOCAL',
      overallScore: null,
      items: headlines.map(() => null),
      diagnostics: {
        endpoint: 'local://distilbert-onnx',
        model: LOCAL_DISTILBERT_MODEL_NAME,
        license: LOCAL_DISTILBERT_MODEL_LICENSE,
        articlesAnalyzed: 0,
        reason: 'EMPTY_INPUT',
        message: 'No headline text supplied for local DistilBERT inference.'
      }
    };
  }

  const cachedItems: Array<DistilbertItemResult | null> = cleanHeadlines.map(h => distilbertCache.get(h));
  const uncachedIndices: number[] = [];
  cachedItems.forEach((item, idx) => {
    if (!item) uncachedIndices.push(idx);
  });

  if (uncachedIndices.length === 0) {
    const validCached = cachedItems.filter((i): i is DistilbertItemResult => i !== null);
    const scoreSum = validCached.reduce((acc, i) => acc + i.score, 0);
    const overallScore = validCached.length > 0 ? Math.round((scoreSum / validCached.length) * 100) / 100 : null;

    return {
      status: 'LIVE',
      engine: 'DISTILBERT_LOCAL',
      overallScore,
      items: cachedItems,
      diagnostics: {
        endpoint: 'local://distilbert-onnx',
        model: LOCAL_DISTILBERT_MODEL_NAME,
        license: LOCAL_DISTILBERT_MODEL_LICENSE,
        articlesAnalyzed: validCached.length,
        message: `Served ${validCached.length} headlines from in-memory bounded DistilBERT cache.`
      }
    };
  }

  let unlock: () => void = () => {};
  const currentLock = new Promise<void>(resolve => { unlock = resolve; });
  const prevLock = localInferenceQueue;
  localInferenceQueue = prevLock.then(() => currentLock).catch(() => currentLock);
  await prevLock;

  try {
    const classifier = await getLocalDistilbertPipeline();
    const finalItems: Array<DistilbertItemResult | null> = [...cachedItems];
    let scoreSum = 0;
    let validCount = 0;

    for (const idx of uncachedIndices) {
      const h = cleanHeadlines[idx];
      try {
        const truncated = h.slice(0, 512);
        const output = await classifier(truncated, { topk: 3 });
        const parsed = parseDistilbertItem(Array.isArray(output) ? output : [output]);
        finalItems[idx] = parsed;
        if (parsed) {
          distilbertCache.set(h, parsed);
          scoreSum += parsed.score;
          validCount++;
        }
      } catch {
        finalItems[idx] = null;
      }
    }

    const overallScore = validCount > 0 ? Math.round((scoreSum / validCount) * 100) / 100 : null;
    const elapsed = Date.now() - startTime;
    const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    lastSuccessfulInferenceTimestamp = Date.now();

    return {
      status: 'LIVE',
      engine: 'DISTILBERT_LOCAL',
      overallScore,
      items: finalItems,
      diagnostics: {
        endpoint: 'local://distilbert-onnx',
        model: LOCAL_DISTILBERT_MODEL_NAME,
        license: LOCAL_DISTILBERT_MODEL_LICENSE,
        articlesAnalyzed: validCount,
        memoryRssMb: rssMb,
        runtime: `Transformers.js ONNX (CPU, ${elapsed}ms, ${cleanHeadlines.length - uncachedIndices.length} cached)`
      }
    };
  } catch (err: any) {
    return {
      status: 'UNAVAILABLE',
      engine: 'DISTILBERT_LOCAL',
      overallScore: null,
      items: headlines.map(() => null),
      diagnostics: {
        endpoint: 'local://distilbert-onnx',
        model: LOCAL_DISTILBERT_MODEL_NAME,
        license: LOCAL_DISTILBERT_MODEL_LICENSE,
        articlesAnalyzed: 0,
        reason: 'LOCAL_MODEL_INIT_FAILED',
        message: `Local DistilBERT failed to initialize: ${err.message || String(err)}`
      }
    };
  } finally {
    unlock();
  }
}

/**
 * Executes DistilBERT inference on an array of financial headlines.
 */
export async function runDistilbertInference(
  headlines: string[],
  options: DistilbertOptions = {}
): Promise<DistilbertInferenceResult> {
  const enableLocal = options.preferLocal || process.env.ENABLE_LOCAL_DISTILBERT === 'true' || process.env.ENABLE_LOCAL_DISTILBERT === '1';
  if (enableLocal) {
    const localResult = await runLocalDistilbertInference(headlines);
    if (localResult.status === 'LIVE') {
      return localResult;
    }
  }

  const rawToken = options.token !== undefined
    ? options.token
    : (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_HUB_TOKEN || '');
  const token = (rawToken || '').replace(/["'\r\n]/g, '').trim();

  const rawConfigured = (options.endpoint || process.env.DISTILBERT_ENDPOINT || '').trim();
  let configuredEndpoint: string | undefined = undefined;
  if (rawConfigured) {
    if (!rawConfigured.startsWith('http://') && !rawConfigured.startsWith('https://')) {
      configuredEndpoint = `https://${rawConfigured.replace(/^\/+/, '')}`;
    } else {
      configuredEndpoint = rawConfigured;
    }
  }

  const endpointsToTry = configuredEndpoint ? [configuredEndpoint] : [...CANDIDATE_DISTILBERT_ENDPOINTS];
  const primaryEndpoint = endpointsToTry[0] || PRIMARY_DISTILBERT_ENDPOINT;

  const timeoutMs = options.timeoutMs ?? 7000;
  const maxRetries = options.maxRetries ?? 1;
  const fetchFn = options.fetchFn || fetch;

  // 1. Missing Token Check
  if (!token) {
    return {
      status: 'UNAVAILABLE',
      overallScore: null,
      items: headlines.map(() => null),
      diagnostics: {
        endpoint: primaryEndpoint,
        model: DISTILBERT_MODEL_NAME,
        license: DISTILBERT_MODEL_LICENSE,
        articlesAnalyzed: 0,
        reason: 'MISSING_TOKEN',
        message: 'Hugging Face API token (HF_TOKEN) is not configured in the deployment environment. DistilBERT remote inference is offline to protect free 512MB RAM constraints.'
      }
    };
  }

  // 2. Token Format Validation
  if (!token.startsWith('hf_')) {
    return {
      status: 'UNAVAILABLE',
      overallScore: null,
      items: headlines.map(() => null),
      diagnostics: {
        endpoint: primaryEndpoint,
        model: DISTILBERT_MODEL_NAME,
        license: DISTILBERT_MODEL_LICENSE,
        articlesAnalyzed: 0,
        reason: 'INVALID_CREDENTIALS',
        message: 'Hugging Face API token format is invalid (expected personal access token starting with "hf_"). Verify HF_TOKEN in Render.'
      }
    };
  }

  // 3. Empty Input Check
  const cleanHeadlines = headlines.map(h => (h || '').trim()).filter(h => h.length > 0);
  if (cleanHeadlines.length === 0) {
    return {
      status: 'UNAVAILABLE',
      overallScore: null,
      items: headlines.map(() => null),
      diagnostics: {
        endpoint: primaryEndpoint,
        model: DISTILBERT_MODEL_NAME,
        license: DISTILBERT_MODEL_LICENSE,
        articlesAnalyzed: 0,
        reason: 'EMPTY_INPUT',
        message: 'No headline text supplied for DistilBERT inference.'
      }
    };
  }

  // Circuit breaker check
  const currentTokenHash = token ? `${token.slice(0, 6)}...${token.slice(-4)}` : '';
  if (currentTokenHash && lastExhaustedTokenHash && currentTokenHash !== lastExhaustedTokenHash) {
    resetCreditsExhaustionCooldown();
  }

  if (!options.forceProbe && isCreditsExhausted()) {
    const remainingSec = getCreditsExhaustedRemainingSec();
    return {
      status: 'UNAVAILABLE',
      overallScore: null,
      items: headlines.map(() => null),
      diagnostics: {
        endpoint: primaryEndpoint,
        model: DISTILBERT_MODEL_NAME,
        license: DISTILBERT_MODEL_LICENSE,
        articlesAnalyzed: 0,
        reason: 'CREDITS_EXHAUSTED',
        message: `Hugging Face Inference Provider credits exhausted (HTTP 402). Probe throttle active (${remainingSec}s remaining). Active VADER sentiment baseline engaged as fallback.`
      }
    };
  }

  let lastFailureResult: DistilbertInferenceResult | null = null;

  for (let epIndex = 0; epIndex < endpointsToTry.length; epIndex++) {
    const currentEndpoint = endpointsToTry[epIndex];
    const hasNextEndpoint = epIndex < endpointsToTry.length - 1;

    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const reqStart = Date.now();

      let response: Response;
      try {
        const batchToSend = headlines.slice(0, 10).map(h => (h || '').slice(0, 512));

        response = await fetchFn(currentEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'NexusStockDashboard/1.0',
            'x-wait-for-model': 'true'
          },
          body: JSON.stringify({ inputs: batchToSend }),
          signal: controller.signal
        });
      } catch (fetchErr: any) {
        clearTimeout(timer);
        const elapsedMs = Date.now() - reqStart;
        const isTimeout = fetchErr?.name === 'AbortError' || fetchErr?.message?.includes('aborted');
        if (attempt <= maxRetries && isTimeout) {
          continue;
        }

        let hostName = 'endpoint';
        try {
          hostName = new URL(currentEndpoint).hostname;
        } catch {
          hostName = currentEndpoint;
        }

        const causeCode = fetchErr?.cause?.code || fetchErr?.code || '';
        const causeMsg = fetchErr?.cause?.message || fetchErr?.message || '';
        const diagnosticReason: DistilbertInferenceResult['diagnostics']['reason'] = isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR';
        let diagnosticMessage = isTimeout
          ? `DistilBERT inference request timed out after ${timeoutMs}ms.`
          : causeCode === 'ENOTFOUND'
          ? `DNS resolution failed (ENOTFOUND) for host "${hostName}". Verify network connectivity.`
          : causeCode === 'ECONNREFUSED'
          ? `Connection refused (ECONNREFUSED) by host "${hostName}".`
          : `DistilBERT connection failed: ${causeMsg.slice(0, 100)}`;

        logSafeBackendDiagnostic({
          endpoint: currentEndpoint,
          httpStatus: causeCode || (isTimeout ? 'TIMEOUT' : 'NETWORK_ERR'),
          elapsedMs,
          reason: diagnosticReason,
          providerMessage: diagnosticMessage,
          status: 'UNAVAILABLE',
          articlesCount: headlines.length
        });

        lastFailureResult = {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: DISTILBERT_MODEL_NAME,
            license: DISTILBERT_MODEL_LICENSE,
            articlesAnalyzed: 0,
            reason: diagnosticReason,
            message: diagnosticMessage
          }
        };
        break;
      }

      clearTimeout(timer);
      const elapsedMs = Date.now() - reqStart;

      if (response.ok) {
        let json: any;
        try {
          json = await response.json();
        } catch {
          const msg = 'Hugging Face inference returned non-JSON body.';
          lastFailureResult = {
            status: 'UNAVAILABLE',
            overallScore: null,
            items: headlines.map(() => null),
            diagnostics: {
              endpoint: currentEndpoint,
              model: DISTILBERT_MODEL_NAME,
              license: DISTILBERT_MODEL_LICENSE,
              articlesAnalyzed: 0,
              reason: 'MALFORMED_RESPONSE',
              message: msg
            }
          };
          break;
        }

        if (!Array.isArray(json)) {
          if (json && typeof json === 'object' && json.error) {
            const errMsg = String(json.error);
            if (errMsg.toLowerCase().includes('loading') && attempt <= maxRetries) {
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            const safeErrMsg = extractSafeErrorMessage(errMsg, token);
            lastFailureResult = {
              status: 'UNAVAILABLE',
              overallScore: null,
              items: headlines.map(() => null),
              diagnostics: {
                endpoint: currentEndpoint,
                model: DISTILBERT_MODEL_NAME,
                license: DISTILBERT_MODEL_LICENSE,
                articlesAnalyzed: 0,
                reason: errMsg.toLowerCase().includes('loading') ? 'MODEL_LOADING' : 'SERVICE_UNAVAILABLE',
                message: `Hugging Face inference error: ${safeErrMsg}`
              }
            };
            break;
          }

          const msg = 'Expected array response from Hugging Face inference pipeline.';
          lastFailureResult = {
            status: 'UNAVAILABLE',
            overallScore: null,
            items: headlines.map(() => null),
            diagnostics: {
              endpoint: currentEndpoint,
              model: DISTILBERT_MODEL_NAME,
              license: DISTILBERT_MODEL_LICENSE,
              articlesAnalyzed: 0,
              reason: 'MALFORMED_RESPONSE',
              message: msg
            }
          };
          break;
        }

        const parsedItems: Array<DistilbertItemResult | null> = [];
        let scoreSum = 0;
        let scoreCount = 0;

        if (json.length > 0 && typeof json[0] === 'object' && !Array.isArray(json[0]) && 'label' in json[0]) {
          const parsed = parseDistilbertItem(json);
          parsedItems.push(parsed);
          if (parsed) {
            scoreSum += parsed.score;
            scoreCount++;
          }
          for (let i = 1; i < headlines.length; i++) {
            parsedItems.push(null);
          }
        } else {
          for (let i = 0; i < headlines.length; i++) {
            if (i < json.length) {
              const parsed = parseDistilbertItem(json[i]);
              parsedItems.push(parsed);
              if (parsed) {
                distilbertCache.set(headlines[i], parsed);
                scoreSum += parsed.score;
                scoreCount++;
              }
            } else {
              parsedItems.push(null);
            }
          }
        }

        if (scoreCount === 0) {
          const msg = 'Could not parse sentiment probabilities from inference output.';
          lastFailureResult = {
            status: 'UNAVAILABLE',
            overallScore: null,
            items: headlines.map(() => null),
            diagnostics: {
              endpoint: currentEndpoint,
              model: DISTILBERT_MODEL_NAME,
              license: DISTILBERT_MODEL_LICENSE,
              articlesAnalyzed: 0,
              reason: 'MALFORMED_RESPONSE',
              message: msg
            }
          };
          break;
        }

        resetCreditsExhaustionCooldown();
        const overall = Math.round((scoreSum / scoreCount) * 100) / 100;
        const successMsg = `Successfully classified ${scoreCount} headlines with genuine DistilBERT model.`;
        logSafeBackendDiagnostic({
          endpoint: currentEndpoint,
          httpStatus: 200,
          elapsedMs,
          status: 'LIVE',
          articlesCount: scoreCount,
          providerMessage: successMsg
        });

        return {
          status: 'LIVE',
          overallScore: overall,
          items: parsedItems,
          diagnostics: {
            endpoint: currentEndpoint,
            model: DISTILBERT_MODEL_NAME,
            license: DISTILBERT_MODEL_LICENSE,
            articlesAnalyzed: scoreCount,
            message: successMsg
          }
        };
      }

      const status = response.status;
      let errBody = '';
      try {
        errBody = await response.text();
      } catch {
        errBody = '';
      }
      const safeDetail = extractSafeErrorMessage(errBody, token);
      const detailSuffix = safeDetail ? ` Upstream message: "${safeDetail}".` : '';

      if (hasNextEndpoint && (status === 404 || status === 405 || status === 410 || status === 502 || status === 504)) {
        lastFailureResult = {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: DISTILBERT_MODEL_NAME,
            license: DISTILBERT_MODEL_LICENSE,
            articlesAnalyzed: 0,
            reason: (status === 404 || status === 405 || status === 410) ? 'UNSUPPORTED_ENDPOINT' : 'SERVICE_UNAVAILABLE',
            message: `Hugging Face endpoint returned HTTP ${status}.${detailSuffix} Attempting fallback.`
          }
        };
        break;
      }

      if (status === 401) {
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: DISTILBERT_MODEL_NAME,
            license: DISTILBERT_MODEL_LICENSE,
            articlesAnalyzed: 0,
            reason: 'INVALID_CREDENTIALS',
            message: `Hugging Face authentication failed (HTTP 401: Invalid credentials).${detailSuffix} Verify that HF_TOKEN is valid, active, and configured in Render.`
          }
        };
      }

      if (status === 402 || safeDetail.toLowerCase().includes('no remaining credits') || safeDetail.toLowerCase().includes('purchase pre-paid credits')) {
        recordCreditsExhaustion(safeDetail, token);
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: DISTILBERT_MODEL_NAME,
            license: DISTILBERT_MODEL_LICENSE,
            articlesAnalyzed: 0,
            reason: 'CREDITS_EXHAUSTED',
            message: `Hugging Face Inference Provider credits exhausted (HTTP 402).${detailSuffix} Pre-paid credits are required to continue using Inference Providers. Active VADER sentiment engine engaged as fallback.`
          }
        };
      }

      if (status === 403) {
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: DISTILBERT_MODEL_NAME,
            license: DISTILBERT_MODEL_LICENSE,
            articlesAnalyzed: 0,
            reason: 'INSUFFICIENT_ACCESS',
            message: `Hugging Face inference request forbidden (HTTP 403: Insufficient Access).${detailSuffix} Ensure your HF_TOKEN has "Make calls to Inference Providers" or "Read" access in Hugging Face settings.`
          }
        };
      }

      if (status === 404 || status === 405 || status === 410) {
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: DISTILBERT_MODEL_NAME,
            license: DISTILBERT_MODEL_LICENSE,
            articlesAnalyzed: 0,
            reason: 'UNSUPPORTED_ENDPOINT',
            message: `Configured Hugging Face inference endpoint unsupported (HTTP ${status}).${detailSuffix} Checked: ${currentEndpoint}.`
          }
        };
      }

      if (status === 429) {
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: DISTILBERT_MODEL_NAME,
            license: DISTILBERT_MODEL_LICENSE,
            articlesAnalyzed: 0,
            reason: 'RATE_LIMITED',
            message: `Hugging Face API rate limit reached (HTTP 429).${detailSuffix} Free tier request quota exceeded; retry later or upgrade account.`
          }
        };
      }

      if (status === 503) {
        const isModelLoading = safeDetail.toLowerCase().includes('loading') || errBody.toLowerCase().includes('loading');
        if (isModelLoading && attempt <= maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: DISTILBERT_MODEL_NAME,
            license: DISTILBERT_MODEL_LICENSE,
            articlesAnalyzed: 0,
            reason: isModelLoading ? 'MODEL_LOADING' : 'SERVICE_UNAVAILABLE',
            message: `Hugging Face model serverless state (HTTP 503: ${isModelLoading ? 'Model Loading' : 'Service Unavailable'}).${detailSuffix}`
          }
        };
      }

      return {
        status: 'UNAVAILABLE',
        overallScore: null,
        items: headlines.map(() => null),
        diagnostics: {
          endpoint: currentEndpoint,
          model: DISTILBERT_MODEL_NAME,
          license: DISTILBERT_MODEL_LICENSE,
          articlesAnalyzed: 0,
          reason: 'SERVICE_UNAVAILABLE',
          message: `Hugging Face inference service error (HTTP ${status}).${detailSuffix}`
        }
      };
    }
  }

  return lastFailureResult || {
    status: 'UNAVAILABLE',
    overallScore: null,
    items: headlines.map(() => null),
    diagnostics: {
      endpoint: endpointsToTry[0] || PRIMARY_DISTILBERT_ENDPOINT,
      model: DISTILBERT_MODEL_NAME,
      license: DISTILBERT_MODEL_LICENSE,
      articlesAnalyzed: 0,
      reason: 'SERVICE_UNAVAILABLE',
      message: 'DistilBERT inference failed after trying candidate endpoints.'
    }
  };
}
