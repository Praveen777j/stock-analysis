/**
 * FinBERT Financial Sentiment Inference Service
 * 
 * Interacts with Hugging Face Inference API using the ProsusAI/finbert model
 * to perform genuine sentiment inference on financial news headlines.
 * 
 * Safety & Reliability Guarantees:
 * - Reads token securely from process.env.HF_TOKEN
 * - NEVER logs or exposes the HF_TOKEN
 * - Honest status: if token is missing, endpoint is unavailable, or inference fails,
 *   marks FinBERT as UNAVAILABLE and never fakes or fabricates sentiment scores.
 * - Enforces timeouts and limited retries to protect server responsiveness.
 */

export interface FinbertLabelScore {
  label: string;
  score: number;
}

export interface FinbertItemResult {
  score: number; // Normalized -1.00 to +1.00 (p_positive - p_negative)
  label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  probabilities: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface FinbertInferenceResult {
  status: 'LIVE' | 'UNAVAILABLE';
  overallScore: number | null;
  items: Array<FinbertItemResult | null>;
  diagnostics: {
    endpoint: string;
    model: string;
    articlesAnalyzed: number;
    reason?: 'MISSING_TOKEN' | 'INVALID_CREDENTIALS' | 'INSUFFICIENT_ACCESS' | 'CREDITS_EXHAUSTED' | 'EMPTY_INPUT' | 'MODEL_LOADING' | 'MODEL_UNAVAILABLE' | 'AUTH_ERROR' | 'RATE_LIMITED' | 'UNSUPPORTED_ENDPOINT' | 'TIMEOUT' | 'NETWORK_ERROR' | 'MALFORMED_RESPONSE' | 'SERVICE_UNAVAILABLE';
    message?: string;
  };
}

export interface FinbertOptions {
  token?: string;
  endpoint?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchFn?: typeof fetch;
  forceProbe?: boolean;
}

export const PRIMARY_FINBERT_ENDPOINT = 'https://router.huggingface.co/hf-inference/models/ProsusAI/finbert';
export const SECONDARY_FINBERT_ENDPOINT = 'https://router.huggingface.co/models/ProsusAI/finbert';
export const INFERENCE_ROUTER_ENDPOINT = SECONDARY_FINBERT_ENDPOINT;
export const LEGACY_FINBERT_ENDPOINT = 'https://api-inference.huggingface.co/models/ProsusAI/finbert';
export const FINBERT_MODEL_NAME = 'ProsusAI/finbert';

export const CANDIDATE_FINBERT_ENDPOINTS = [
  PRIMARY_FINBERT_ENDPOINT,
  SECONDARY_FINBERT_ENDPOINT
];

/**
 * Cooldown duration when Hugging Face provider credits are exhausted.
 * Prevents bombarding Hugging Face on every page render or article index.
 */
export const CREDITS_EXHAUSTED_COOLDOWN_MS = 5 * 60 * 1000;

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

/**
 * Safe backend diagnostic logger that records status, elapsed time, and provider responses
 * without ever exposing authorization tokens, secrets, or sensitive news text.
 */
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
    `[FinBERT Backend Diagnostic]`,
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

/**
 * Safely extracts error details from Hugging Face responses without ever exposing secrets.
 */
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

  // Ensure any token or authorization header pattern is strictly redacted
  if (token && token.length > 5 && msg.includes(token)) {
    msg = msg.split(token).join('[REDACTED]');
  }
  msg = msg.replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]');
  msg = msg.replace(/hf_[a-zA-Z0-9_\-\.]+/gi, 'hf_[REDACTED]');
  return msg.trim();
}

/**
 * Parses raw classification output from Hugging Face FinBERT model.
 * Handles single classification objects, 1D arrays, and nested batch arrays.
 */
export function parseFinbertItem(data: any): FinbertItemResult | null {
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

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const rawLabel = String(entry.label || '').trim().toLowerCase();
    const scoreVal = typeof entry.score === 'number' && !isNaN(entry.score) ? entry.score : 0;

    if (rawLabel === 'positive' || rawLabel === 'pos' || rawLabel === 'label_0') {
      pos = scoreVal;
      hasValid = true;
    } else if (rawLabel === 'negative' || rawLabel === 'neg' || rawLabel === 'label_1') {
      neg = scoreVal;
      hasValid = true;
    } else if (rawLabel === 'neutral' || rawLabel === 'neu' || rawLabel === 'label_2') {
      neu = scoreVal;
      hasValid = true;
    }
  }

  if (!hasValid) return null;

  // Normalized score from -1.00 to +1.00 based on genuine class probabilities
  const diff = pos - neg;
  const roundedScore = Math.round(diff * 100) / 100;

  // Determine dominant label
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

/**
 * Executes FinBERT inference on an array of financial headlines.
 */
export async function runFinbertInference(
  headlines: string[],
  options: FinbertOptions = {}
): Promise<FinbertInferenceResult> {
  const rawToken = options.token !== undefined
    ? options.token
    : (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.HUGGING_FACE_HUB_TOKEN || '');
  // Sanitize: strip surrounding single/double quotes, trailing carriage returns, newlines, and whitespace
  const token = (rawToken || '').replace(/["'\r\n]/g, '').trim();
  const rawConfigured = (options.endpoint || process.env.HF_INFERENCE_ENDPOINT || '').trim();
  let configuredEndpoint: string | undefined = undefined;
  if (rawConfigured) {
    if (!rawConfigured.startsWith('http://') && !rawConfigured.startsWith('https://')) {
      configuredEndpoint = `https://${rawConfigured.replace(/^\/+/, '')}`;
    } else {
      configuredEndpoint = rawConfigured;
    }
  }
  const endpointsToTry = configuredEndpoint ? [configuredEndpoint] : [...CANDIDATE_FINBERT_ENDPOINTS];
  const primaryEndpoint = endpointsToTry[0] || PRIMARY_FINBERT_ENDPOINT;

  const timeoutMs = options.timeoutMs ?? 7000;
  const maxRetries = options.maxRetries ?? 1;
  const fetchFn = options.fetchFn || fetch;

  // 1. Missing Token Check: Fail fast and honestly without making unauthorized network calls
  if (!token) {
    return {
      status: 'UNAVAILABLE',
      overallScore: null,
      items: headlines.map(() => null),
      diagnostics: {
        endpoint: primaryEndpoint,
        model: FINBERT_MODEL_NAME,
        articlesAnalyzed: 0,
        reason: 'MISSING_TOKEN',
        message: 'Hugging Face API token (HF_TOKEN) is not configured in the deployment environment. FinBERT is marked as UNAVAILABLE.'
      }
    };
  }

  // 2. Token Format Validation (without revealing token content)
  if (!token.startsWith('hf_')) {
    return {
      status: 'UNAVAILABLE',
      overallScore: null,
      items: headlines.map(() => null),
      diagnostics: {
        endpoint: primaryEndpoint,
        model: FINBERT_MODEL_NAME,
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
        model: FINBERT_MODEL_NAME,
        articlesAnalyzed: 0,
        reason: 'EMPTY_INPUT',
        message: 'No headline text supplied for FinBERT inference.'
      }
    };
  }

  // 3b. Provider Credits Exhaustion Circuit-Breaker:
  // Prevents repeatedly bombarding Hugging Face on every page render or article indexing when credits are exhausted.
  const currentTokenHash = token ? `${token.slice(0, 6)}...${token.slice(-4)}` : '';
  if (currentTokenHash && lastExhaustedTokenHash && currentTokenHash !== lastExhaustedTokenHash) {
    // Token was changed or updated; clear cooldown immediately
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
        model: FINBERT_MODEL_NAME,
        articlesAnalyzed: 0,
        reason: 'CREDITS_EXHAUSTED',
        message: `Hugging Face Inference Provider credits exhausted (HTTP 402). Probe throttle active (${remainingSec}s remaining). VADER sentiment fallback engaged. Trigger deliberate retry via /api/finbert/diagnostic.`
      }
    };
  }

  // 4. Inference call iterating candidate endpoints and retrying on model loading
  let lastFailureResult: FinbertInferenceResult | null = null;

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
        // Hugging Face accepts { inputs: string[] } or { inputs: string }
        // Limit batch size to 10 articles to ensure low latency and high reliability
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

        const diagnosticReason: FinbertInferenceResult['diagnostics']['reason'] = isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR';
        let diagnosticMessage = '';

        if (isTimeout) {
          diagnosticMessage = `FinBERT inference request timed out after ${timeoutMs}ms.`;
        } else if (causeCode === 'ENOTFOUND') {
          diagnosticMessage = `DNS resolution failed (ENOTFOUND) for host "${hostName}". ${
            hostName.includes('api-inference') ? 'api-inference.huggingface.co is decommissioned; use router.huggingface.co.' : 'Verify network connectivity and HF_INFERENCE_ENDPOINT.'
          }`;
        } else if (causeCode === 'ECONNREFUSED') {
          diagnosticMessage = `Connection refused (ECONNREFUSED) by host "${hostName}".`;
        } else if (causeCode === 'ECONNRESET') {
          diagnosticMessage = `Connection reset by peer (ECONNRESET) reaching host "${hostName}".`;
        } else if (causeCode === 'ETIMEDOUT') {
          diagnosticMessage = `Socket connect timed out (ETIMEDOUT) reaching host "${hostName}".`;
        } else if (causeMsg.toLowerCase().includes('certificate') || causeCode.includes('CERT_')) {
          diagnosticMessage = `TLS/SSL certificate validation error for host "${hostName}".`;
        } else {
          diagnosticMessage = `FinBERT inference network connection failed: ${causeMsg.slice(0, 100)}`;
        }

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
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: diagnosticReason,
            message: diagnosticMessage
          }
        };
        break;
      }

      clearTimeout(timer);
      const elapsedMs = Date.now() - reqStart;

      // Handle successful HTTP 200 response
      if (response.ok) {
        let json: any;
        try {
          json = await response.json();
        } catch {
          const msg = 'Hugging Face inference returned non-JSON body.';
          logSafeBackendDiagnostic({
            endpoint: currentEndpoint,
            httpStatus: response.status,
            elapsedMs,
            reason: 'MALFORMED_RESPONSE',
            providerMessage: msg,
            status: 'UNAVAILABLE',
            articlesCount: headlines.length
          });
          lastFailureResult = {
            status: 'UNAVAILABLE',
            overallScore: null,
            items: headlines.map(() => null),
            diagnostics: {
              endpoint: currentEndpoint,
              model: FINBERT_MODEL_NAME,
              articlesAnalyzed: 0,
              reason: 'MALFORMED_RESPONSE',
              message: msg
            }
          };
          break;
        }

        // Validate response format
        if (!Array.isArray(json)) {
          if (json && typeof json === 'object' && json.error) {
            const errMsg = String(json.error);
            if (errMsg.toLowerCase().includes('loading') && attempt <= maxRetries) {
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            const safeErrMsg = extractSafeErrorMessage(errMsg, token);
            logSafeBackendDiagnostic({
              endpoint: currentEndpoint,
              httpStatus: response.status,
              elapsedMs,
              reason: errMsg.toLowerCase().includes('loading') ? 'MODEL_LOADING' : 'SERVICE_UNAVAILABLE',
              providerMessage: safeErrMsg,
              status: 'UNAVAILABLE',
              articlesCount: headlines.length
            });
            lastFailureResult = {
              status: 'UNAVAILABLE',
              overallScore: null,
              items: headlines.map(() => null),
              diagnostics: {
                endpoint: currentEndpoint,
                model: FINBERT_MODEL_NAME,
                articlesAnalyzed: 0,
                reason: errMsg.toLowerCase().includes('loading') ? 'MODEL_LOADING' : 'SERVICE_UNAVAILABLE',
                message: `Hugging Face inference error: ${safeErrMsg}`
              }
            };
            break;
          }

          const msg = 'Expected array response from Hugging Face inference pipeline.';
          logSafeBackendDiagnostic({
            endpoint: currentEndpoint,
            httpStatus: response.status,
            elapsedMs,
            reason: 'MALFORMED_RESPONSE',
            providerMessage: msg,
            status: 'UNAVAILABLE',
            articlesCount: headlines.length
          });
          lastFailureResult = {
            status: 'UNAVAILABLE',
            overallScore: null,
            items: headlines.map(() => null),
            diagnostics: {
              endpoint: currentEndpoint,
              model: FINBERT_MODEL_NAME,
              articlesAnalyzed: 0,
              reason: 'MALFORMED_RESPONSE',
              message: msg
            }
          };
          break;
        }

        // Parse individual items
        const parsedItems: Array<FinbertItemResult | null> = [];
        let scoreSum = 0;
        let scoreCount = 0;

        // Check if json is a 1D classification array: [{ label, score }, ...]
        if (json.length > 0 && typeof json[0] === 'object' && !Array.isArray(json[0]) && 'label' in json[0]) {
          const parsed = parseFinbertItem(json);
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
              const parsed = parseFinbertItem(json[i]);
              parsedItems.push(parsed);
              if (parsed) {
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
          logSafeBackendDiagnostic({
            endpoint: currentEndpoint,
            httpStatus: response.status,
            elapsedMs,
            reason: 'MALFORMED_RESPONSE',
            providerMessage: msg,
            status: 'UNAVAILABLE',
            articlesCount: headlines.length
          });
          lastFailureResult = {
            status: 'UNAVAILABLE',
            overallScore: null,
            items: headlines.map(() => null),
            diagnostics: {
              endpoint: currentEndpoint,
              model: FINBERT_MODEL_NAME,
              articlesAnalyzed: 0,
              reason: 'MALFORMED_RESPONSE',
              message: msg
            }
          };
          break;
        }

        resetCreditsExhaustionCooldown();
        const overall = Math.round((scoreSum / scoreCount) * 100) / 100;
        const successMsg = `Successfully classified ${scoreCount} headlines with genuine FinBERT model.`;
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
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: scoreCount,
            message: successMsg
          }
        };
      }

      // Handle non-OK HTTP status codes
      const status = response.status;
      let errBody = '';
      try {
        errBody = await response.text();
      } catch {
        errBody = '';
      }
      const safeDetail = extractSafeErrorMessage(errBody, token);
      const detailSuffix = safeDetail ? ` Upstream message: "${safeDetail}".` : '';

      // If candidate endpoint returns 404, 405, 410, 502, or 504 and next candidate exists, try next candidate
      // NOTE: 401, 402, and 403 must NEVER fallback as they are credential/credit/permission errors.
      if (hasNextEndpoint && (status === 404 || status === 405 || status === 410 || status === 502 || status === 504)) {
        logSafeBackendDiagnostic({
          endpoint: currentEndpoint,
          httpStatus: status,
          elapsedMs,
          reason: (status === 404 || status === 405 || status === 410) ? 'UNSUPPORTED_ENDPOINT' : 'SERVICE_UNAVAILABLE',
          providerMessage: `HTTP ${status}.${detailSuffix} Attempting fallback.`,
          status: 'UNAVAILABLE'
        });
        lastFailureResult = {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: (status === 404 || status === 405 || status === 410) ? 'UNSUPPORTED_ENDPOINT' : 'SERVICE_UNAVAILABLE',
            message: `Hugging Face endpoint returned HTTP ${status}.${detailSuffix} Attempting fallback.`
          }
        };
        break; // Move to next candidate endpoint in endpointsToTry
      }

      if (status === 401) {
        logSafeBackendDiagnostic({
          endpoint: currentEndpoint,
          httpStatus: 401,
          elapsedMs,
          reason: 'INVALID_CREDENTIALS',
          providerMessage: safeDetail || 'Invalid credentials',
          status: 'UNAVAILABLE'
        });
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'INVALID_CREDENTIALS',
            message: `Hugging Face authentication failed (HTTP 401: Invalid credentials).${detailSuffix} Verify that HF_TOKEN is valid, active, and configured in Render.`
          }
        };
      }

      if (status === 402 || safeDetail.toLowerCase().includes('no remaining credits') || safeDetail.toLowerCase().includes('purchase pre-paid credits')) {
        recordCreditsExhaustion(safeDetail, token);
        logSafeBackendDiagnostic({
          endpoint: currentEndpoint,
          httpStatus: 402,
          elapsedMs,
          reason: 'CREDITS_EXHAUSTED',
          providerMessage: safeDetail || 'No remaining credits',
          status: 'UNAVAILABLE',
          articlesCount: headlines.length
        });
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'CREDITS_EXHAUSTED',
            message: `Hugging Face Inference Provider credits exhausted (HTTP 402).${detailSuffix} Pre-paid credits are required to continue using Inference Providers. Active VADER sentiment engine engaged as fallback.`
          }
        };
      }

      if (status === 403) {
        logSafeBackendDiagnostic({
          endpoint: currentEndpoint,
          httpStatus: 403,
          elapsedMs,
          reason: 'INSUFFICIENT_ACCESS',
          providerMessage: safeDetail || 'Insufficient access',
          status: 'UNAVAILABLE'
        });
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'INSUFFICIENT_ACCESS',
            message: `Hugging Face inference request forbidden (HTTP 403: Insufficient Access).${detailSuffix} Verify token permissions: ensure your HF_TOKEN has "Make calls to Inference Providers" or "Read" access in Hugging Face settings.`
          }
        };
      }

      if (status === 404 || status === 405 || status === 410) {
        logSafeBackendDiagnostic({
          endpoint: currentEndpoint,
          httpStatus: status,
          elapsedMs,
          reason: 'UNSUPPORTED_ENDPOINT',
          providerMessage: safeDetail || 'Unsupported endpoint',
          status: 'UNAVAILABLE'
        });
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'UNSUPPORTED_ENDPOINT',
            message: `Configured Hugging Face inference endpoint unsupported (HTTP ${status}).${detailSuffix} Checked: ${currentEndpoint}.`
          }
        };
      }

      if (status === 429) {
        logSafeBackendDiagnostic({
          endpoint: currentEndpoint,
          httpStatus: 429,
          elapsedMs,
          reason: 'RATE_LIMITED',
          providerMessage: safeDetail || 'Rate limit reached',
          status: 'UNAVAILABLE'
        });
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
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
        logSafeBackendDiagnostic({
          endpoint: currentEndpoint,
          httpStatus: 503,
          elapsedMs,
          reason: isModelLoading ? 'MODEL_LOADING' : 'SERVICE_UNAVAILABLE',
          providerMessage: safeDetail || (isModelLoading ? 'Model Loading' : 'Service Unavailable'),
          status: 'UNAVAILABLE'
        });
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: isModelLoading ? 'MODEL_LOADING' : 'SERVICE_UNAVAILABLE',
            message: `Hugging Face model serverless state (HTTP 503: ${isModelLoading ? 'Model Loading' : 'Service Unavailable'}).${detailSuffix}`
          }
        };
      }

      if (status >= 500 && status < 600) {
        logSafeBackendDiagnostic({
          endpoint: currentEndpoint,
          httpStatus: status,
          elapsedMs,
          reason: 'SERVICE_UNAVAILABLE',
          providerMessage: safeDetail || `Server error HTTP ${status}`,
          status: 'UNAVAILABLE'
        });
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'SERVICE_UNAVAILABLE',
            message: `Hugging Face provider/server error (HTTP ${status}).${detailSuffix}`
          }
        };
      }

      logSafeBackendDiagnostic({
        endpoint: currentEndpoint,
        httpStatus: status,
        elapsedMs,
        reason: 'SERVICE_UNAVAILABLE',
        providerMessage: safeDetail || `Inference error HTTP ${status}`,
        status: 'UNAVAILABLE'
      });
      return {
        status: 'UNAVAILABLE',
        overallScore: null,
        items: headlines.map(() => null),
        diagnostics: {
          endpoint: currentEndpoint,
          model: FINBERT_MODEL_NAME,
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
      endpoint: endpointsToTry[0] || PRIMARY_FINBERT_ENDPOINT,
      model: FINBERT_MODEL_NAME,
      articlesAnalyzed: 0,
      reason: 'SERVICE_UNAVAILABLE',
      message: 'FinBERT inference failed after trying candidate endpoints.'
    }
  };
}
