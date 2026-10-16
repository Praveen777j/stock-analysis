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
 * Parses raw classification output from Hugging Face FinBERT model.
 * Handles both single classification arrays and nested batch arrays.
 */
export function parseFinbertItem(data: any): FinbertItemResult | null {
  if (!data) return null;

  // Sometimes wrapped in a single-element array: [[{ label, score }, ...]]
  let list: any[] | null = null;
  if (Array.isArray(data)) {
    if (data.length > 0 && Array.isArray(data[0])) {
      list = data[0];
    } else if (data.length > 0 && typeof data[0] === 'object' && 'label' in data[0]) {
      list = data;
    }
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
  const endpoint = options.endpoint || process.env.HF_INFERENCE_ENDPOINT || PRIMARY_FINBERT_ENDPOINT;
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
        endpoint,
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
        endpoint,
        model: FINBERT_MODEL_NAME,
        articlesAnalyzed: 0,
        reason: 'INVALID_CREDENTIALS',
        message: 'Hugging Face API token format is invalid (expected personal access token starting with "hf_"). Verify HF_TOKEN in Render.'
      }
    };
  }

  // 2. Empty Input Check
  const cleanHeadlines = headlines.map(h => (h || '').trim()).filter(h => h.length > 0);
  if (cleanHeadlines.length === 0) {
    return {
      status: 'UNAVAILABLE',
      overallScore: null,
      items: headlines.map(() => null),
      diagnostics: {
        endpoint,
        model: FINBERT_MODEL_NAME,
        articlesAnalyzed: 0,
        reason: 'EMPTY_INPUT',
        message: 'No headline text supplied for FinBERT inference.'
      }
    };
  }

  // 3. Inference call with timeout and limited retry
  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Hugging Face accepts { inputs: string[] } or { inputs: string }
      // Limit batch size to 10 articles to ensure low latency and high reliability
      const batchToSend = headlines.slice(0, 10).map(h => (h || '').slice(0, 512));

      const response = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'NexusStockDashboard/1.0'
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
              endpoint,
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
                endpoint,
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
              endpoint,
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

        if (scoreCount === 0) {
          return {
            status: 'UNAVAILABLE',
            overallScore: null,
            items: headlines.map(() => null),
            diagnostics: {
              endpoint,
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
            endpoint,
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

      if (status === 401) {
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'INVALID_CREDENTIALS',
            message: 'Hugging Face authentication failed (HTTP 401: Invalid credentials). Verify that HF_TOKEN is valid and active in Render.'
          }
        };
      }

      if (status === 403) {
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'INSUFFICIENT_ACCESS',
            message: 'Hugging Face access denied (HTTP 403: Insufficient access). Ensure your Hugging Face token has "Make calls to the serverless Inference API" permission.'
          }
        };
      }

      if (status === 404 || status === 405) {
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'UNSUPPORTED_ENDPOINT',
            message: `Configured Hugging Face inference endpoint or model path unsupported (HTTP ${status}).`
          }
        };
      }

      if (status === 429) {
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'RATE_LIMITED',
            message: 'Hugging Face API rate limit reached.'
          }
        };
      }

      if (status === 503) {
        // Model loading state
        if (attempt <= maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return {
          status: 'UNAVAILABLE',
          overallScore: null,
          items: headlines.map(() => null),
          diagnostics: {
            endpoint,
            model: FINBERT_MODEL_NAME,
            articlesAnalyzed: 0,
            reason: 'MODEL_LOADING',
            message: 'Hugging Face model is currently loading (HTTP 503).'
          }
        };
      }

      return {
        status: 'UNAVAILABLE',
        overallScore: null,
        items: headlines.map(() => null),
        diagnostics: {
          endpoint,
          model: FINBERT_MODEL_NAME,
          articlesAnalyzed: 0,
          reason: 'SERVICE_UNAVAILABLE',
          message: `Hugging Face inference service error (HTTP ${status}).`
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
          endpoint,
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
      endpoint,
      model: FINBERT_MODEL_NAME,
      articlesAnalyzed: 0,
      reason: 'SERVICE_UNAVAILABLE',
      message: 'FinBERT inference failed after maximum retry attempts.'
    }
  };
}
