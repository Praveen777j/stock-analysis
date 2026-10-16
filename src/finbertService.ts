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
    reason?: 'MISSING_TOKEN' | 'INVALID_CREDENTIALS' | 'INSUFFICIENT_ACCESS' | 'EMPTY_INPUT' | 'MODEL_LOADING' | 'MODEL_UNAVAILABLE' | 'AUTH_ERROR' | 'RATE_LIMITED' | 'UNSUPPORTED_ENDPOINT' | 'TIMEOUT' | 'NETWORK_ERROR' | 'MALFORMED_RESPONSE' | 'SERVICE_UNAVAILABLE';
    message?: string;
  };
}

export interface FinbertOptions {
  token?: string;
  endpoint?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchFn?: typeof fetch;
}

export const PRIMARY_FINBERT_ENDPOINT = 'https://router.huggingface.co/hf-inference/models/ProsusAI/finbert';
export const LEGACY_FINBERT_ENDPOINT = 'https://api-inference.huggingface.co/models/ProsusAI/finbert';
export const FINBERT_MODEL_NAME = 'ProsusAI/finbert';

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
  const rawToken = options.token !== undefined ? options.token : (process.env.HF_TOKEN ?? '');
  // Sanitize: strip surrounding single/double quotes, trailing carriage returns, newlines, and whitespace
  const token = (rawToken || '').replace(/["'\r\n]/g, '').trim();
  const configuredEndpoint = options.endpoint || process.env.HF_INFERENCE_ENDPOINT;
  let currentEndpoint = configuredEndpoint || PRIMARY_FINBERT_ENDPOINT;
  const canFallbackToLegacy = !configuredEndpoint && currentEndpoint === PRIMARY_FINBERT_ENDPOINT;
  let fallbackAttempted = false;

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
        endpoint: currentEndpoint,
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
        endpoint: currentEndpoint,
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
        endpoint: currentEndpoint,
        model: FINBERT_MODEL_NAME,
        articlesAnalyzed: 0,
        reason: 'EMPTY_INPUT',
        message: 'No headline text supplied for FinBERT inference.'
      }
    };
  }

  // 4. Inference call with timeout and limited retry
  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Hugging Face accepts { inputs: string[] } or { inputs: string }
      // Limit batch size to 10 articles to ensure low latency and high reliability
      const batchToSend = headlines.slice(0, 10).map(h => (h || '').slice(0, 512));

      const response = await fetchFn(currentEndpoint, {
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

      clearTimeout(timer);

      if (response.ok) {
        let json: any;
        try {
          json = await response.json();
        } catch {
          return {
            status: 'UNAVAILABLE',
            overallScore: null,
            items: headlines.map(() => null),
            diagnostics: {
              endpoint: currentEndpoint,
              model: FINBERT_MODEL_NAME,
              articlesAnalyzed: 0,
              reason: 'MALFORMED_RESPONSE',
              message: 'Hugging Face inference returned non-JSON body.'
            }
          };
        }

        // Validate response format
        if (!Array.isArray(json)) {
          // Check if HF returned an error object like { error: "..." }
          if (json && typeof json === 'object' && json.error) {
            const errMsg = String(json.error);
            if (errMsg.toLowerCase().includes('loading') && attempt <= maxRetries) {
              // Wait briefly for model warmup and retry
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            return {
              status: 'UNAVAILABLE',
              overallScore: null,
              items: headlines.map(() => null),
              diagnostics: {
                endpoint: currentEndpoint,
                model: FINBERT_MODEL_NAME,
                articlesAnalyzed: 0,
                reason: errMsg.toLowerCase().includes('loading') ? 'MODEL_LOADING' : 'SERVICE_UNAVAILABLE',
                message: `Hugging Face inference error: ${errMsg}`
              }
            };
          }

          return {
            status: 'UNAVAILABLE',
            overallScore: null,
            items: headlines.map(() => null),
            diagnostics: {
              endpoint: currentEndpoint,
              model: FINBERT_MODEL_NAME,
              articlesAnalyzed: 0,
              reason: 'MALFORMED_RESPONSE',
              message: 'Expected array response from Hugging Face inference pipeline.'
            }
          };
        }

        // Parse individual items
        const parsedItems: Array<FinbertItemResult | null> = [];
        let scoreSum = 0;
        let scoreCount = 0;

        // Check if json is a 1D classification array for a single headline: [{ label, score }, ...]
        if (headlines.length === 1 && json.length > 0 && typeof json[0] === 'object' && !Array.isArray(json[0]) && 'label' in json[0]) {
          const parsed = parseFinbertItem(json);
          parsedItems.push(parsed);
          if (parsed) {
            scoreSum += parsed.score;
            scoreCount++;
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
          return {
            status: 'UNAVAILABLE',
            overallScore: null,
            items: headlines.map(() => null),
            diagnostics: {
              endpoint: currentEndpoint,
              model: FINBERT_MODEL_NAME,
              articlesAnalyzed: 0,
              reason: 'MALFORMED_RESPONSE',
              message: 'Could not parse sentiment probabilities from inference output.'
            }
          };
        }

        const overall = Math.round((scoreSum / scoreCount) * 100) / 100;

        return {
          status: 'LIVE',
          overallScore: overall,
          items: parsedItems,
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: scoreCount,
            message: `Successfully classified ${scoreCount} headlines with genuine FinBERT model.`
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
      const detailSuffix = safeDetail ? ` Detail: "${safeDetail}".` : '';

      // Automatic fallback to legacy endpoint on 404/405/502/504 if using default router
      if (canFallbackToLegacy && !fallbackAttempted && (status === 404 || status === 405 || status === 502 || status === 504)) {
        fallbackAttempted = true;
        currentEndpoint = LEGACY_FINBERT_ENDPOINT;
        continue;
      }

      if (status === 401) {
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

      if (status === 403) {
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'INSUFFICIENT_ACCESS',
            message: `Hugging Face access denied (HTTP 403: Insufficient permissions).${detailSuffix} ProsusAI/finbert is hosted on Hugging Face Serverless Inference, which requires the "Make calls to the serverless Inference API" permission (or a classic "Read" token). The "Make calls to Inference Providers" permission alone is only for third-party LLMs and does not cover hub models like FinBERT.`
          }
        };
      }

      if (status === 404 || status === 405) {
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
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint: currentEndpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'RATE_LIMITED',
            message: `Hugging Face API rate limit reached (HTTP 429).${detailSuffix} Free tier serverless request quota exceeded; retry later or upgrade account.`
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
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: isModelLoading ? 'MODEL_LOADING' : 'SERVICE_UNAVAILABLE',
            message: `Hugging Face model serverless state (HTTP 503: ${isModelLoading ? 'Model Loading' : 'Service Unavailable'}).${detailSuffix}`
          }
        };
      }

      if (status >= 500 && status < 600) {
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

    } catch (err: any) {
      clearTimeout(timer);
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
      if (attempt <= maxRetries && isTimeout) {
        continue;
      }
      return {
        status: 'UNAVAILABLE',
        overallScore: null,
        items: headlines.map(() => null),
        diagnostics: {
          endpoint: currentEndpoint,
          model: FINBERT_MODEL_NAME,
          articlesAnalyzed: 0,
          reason: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: isTimeout
            ? `FinBERT inference request timed out after ${timeoutMs}ms.`
            : 'FinBERT inference network connection failed.'
        }
      };
    }
  }

  return {
    status: 'UNAVAILABLE',
    overallScore: null,
    items: headlines.map(() => null),
    diagnostics: {
      endpoint: currentEndpoint,
      model: FINBERT_MODEL_NAME,
      articlesAnalyzed: 0,
      reason: 'SERVICE_UNAVAILABLE',
      message: 'FinBERT inference failed after maximum retry attempts.'
    }
  };
}
