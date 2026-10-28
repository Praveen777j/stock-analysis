/**
 * NEXUS FINANCIAL SENTIMENT ENGINE
 * 
 * High-reliability, deterministic financial news sentiment service combining:
 * 1. Authentic VADER lexical valence analysis with financial-domain lexicon enhancements.
 * 2. Categorized financial keyword & multi-word phrase dictionary.
 * 3. Context-aware grammar rules:
 *    - 3-token lookback negation ("not profitable", "no earnings growth", "fails to expand").
 *    - Phrase precedence ("debt reduction" is positive; "profit dropped" is negative).
 *    - Uncertainty & attribution discount ("allegedly", "may face", "rumored").
 *    - Financial numbers, % changes, and comparison detection ("up 22% YoY", "plunges 15%").
 *    - Mixed news detection (e.g., rising revenue alongside falling profits).
 *    - Headline-only vs full-summary evidence tracking.
 * 
 * Zero external neural network dependencies, zero memory bloat, 100% Render Free compatible.
 */

export interface MatchedFinancialTerm {
  term: string;
  category: 'EARNINGS_REVENUE' | 'GROWTH_EXPANSION' | 'BALANCE_SHEET_DEBT' | 'MANAGEMENT_GOVERNANCE' | 'REGULATORY_LEGAL' | 'MARKET_POSITION' | 'UNCERTAINTY_SPECULATION';
  valence: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'UNCERTAIN';
  weight: number;
  isNegated?: boolean;
}

export interface FinancialContextDetail {
  positiveTerms: string[];
  negativeTerms: string[];
  uncertaintyTerms: string[];
  negatedTerms: string[];
  matchedCategories: string[];
  isHeadlineOnly: boolean;
  isMixed: boolean;
  evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT';
  explanation: string;
}

export interface FinancialSentimentResult {
  score: number; // Normalized -1.00 to +1.00
  financialScore: number; // Alias to score
  label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  vaderScore: number;
  vaderCompound: number; // Alias to vaderScore
  keywordScore: number;
  confidence: number; // 0.0 to 1.0
  evidenceStrength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'NEUTRAL' | 'UNCERTAIN' | 'INSUFFICIENT';
  financialMagnitude: number;
  isHeadlineOnly: boolean;
  isMixed: boolean;
  isUncertainOrAttributed: boolean;
  explanation: string;
  matchedTerms: string[];
  matchedTermObjects: MatchedFinancialTerm[];
  contextCategories: string[];
  context: FinancialContextDetail;
}

// -----------------------------------------------------------------------------
// 1. VADER LEXICAL VALENCE DICTIONARY (Financial Baseline)
// -----------------------------------------------------------------------------
export const VADER_FINANCIAL_LEXICON: Record<string, number> = {
  // Positive financial indicators
  surge: 2.8, surging: 2.8, surged: 2.8, jump: 2.1, jumped: 2.1, jumping: 2.1,
  gain: 2.0, gains: 2.0, gained: 2.0, gaining: 2.0, profit: 2.5, profitable: 2.4,
  profitability: 2.3, growth: 2.2, growing: 2.0, grew: 2.0, beat: 2.3, beats: 2.3,
  beaten: 2.1, record: 2.1, high: 1.5, highs: 1.8, upgrade: 2.4, upgraded: 2.4,
  upgrades: 2.4, bull: 2.2, bullish: 2.5, rally: 2.6, rallied: 2.6, rallies: 2.6,
  positive: 2.1, strong: 2.2, stronger: 2.3, strongest: 2.4, expansion: 2.0,
  expanding: 2.0, expanded: 2.0, dividend: 1.8, deal: 1.9, buy: 1.8, outperform: 2.7,
  outperformed: 2.7, outperforming: 2.7, robust: 2.3, breakout: 2.5, soar: 2.8,
  soars: 2.8, soared: 2.8, soaring: 2.8, rebound: 2.2, rebounded: 2.2, boost: 2.1,
  boosted: 2.1, milestone: 1.9, order: 1.5, orders: 1.6, win: 2.2, won: 2.2,
  winning: 2.2, success: 2.5, successful: 2.4, revenue: 1.5, buyback: 2.2,
  partner: 1.8, partnership: 2.0, breakthrough: 2.6, innovation: 2.0, approved: 2.1,
  approval: 2.1, recovery: 2.2, recovered: 2.2, recovering: 2.1, turnaround: 2.4,
  synergy: 2.0, synergies: 2.0, oversubscribed: 2.3,

  // Negative financial indicators
  fall: -1.8, falls: -1.8, fallen: -1.8, falling: -1.8, drop: -2.0, drops: -2.0,
  dropped: -2.0, dropping: -2.0, slump: -2.6, slumps: -2.6, slumped: -2.6,
  loss: -2.5, losses: -2.6, losing: -2.3, lost: -2.2, miss: -2.1, misses: -2.1,
  missed: -2.1, plunge: -3.0, plunges: -3.0, plunged: -3.0, plunging: -3.0,
  decline: -2.0, declines: -2.0, declined: -2.0, declining: -2.0, probe: -2.4,
  probes: -2.4, probed: -2.4, probing: -2.4, penalty: -2.6, penalties: -2.6,
  downgrade: -2.6, downgraded: -2.6, downgrades: -2.6, bear: -2.0, bearish: -2.5,
  cut: -1.9, cuts: -1.9, cutting: -1.9, debt: -1.5, debts: -1.6, risk: -1.8,
  risks: -1.9, risky: -2.1, warning: -2.3, warnings: -2.3, warned: -2.3, sell: -1.8,
  weak: -2.2, weakness: -2.3, weaker: -2.3, weakest: -2.4, drag: -1.9, dragged: -1.9,
  crash: -3.2, crashed: -3.2, crashing: -3.2, down: -1.5, tumble: -2.5, tumbled: -2.5,
  tumbling: -2.5, dispute: -2.2, disputes: -2.2, inflation: -1.8, default: -3.2,
  defaulted: -3.2, defaults: -3.2, struggle: -2.2, struggles: -2.2, struggling: -2.2,
  layoff: -2.6, layoffs: -2.7, pressure: -1.8, pressured: -1.8, concern: -1.7,
  concerns: -1.8, fraud: -3.5, fraudulent: -3.5, lawsuit: -2.7, lawsuits: -2.7,
  investigation: -2.5, investigations: -2.5, scam: -3.4, insolvent: -3.5,
  insolvency: -3.5, bankruptcy: -3.5, bankrupt: -3.5, fine: -2.0, fined: -2.2,
  fines: -2.1, raid: -2.8, raided: -2.8, raids: -2.8, violation: -2.6,
  violations: -2.6, sanction: -2.7, sanctions: -2.7, slowdown: -2.2
};

export const VADER_BOOSTERS: Record<string, number> = {
  very: 0.293, extremely: 0.393, substantially: 0.35, massively: 0.38, sharply: 0.35,
  strongly: 0.32, highly: 0.30, greatly: 0.30, huge: 0.30, significantly: 0.32,
  tremendously: 0.35, immensely: 0.35, deeply: 0.30, steep: 0.30, steeply: 0.32,
  barely: -0.293, slightly: -0.25, marginally: -0.28, somewhat: -0.25, hardly: -0.30,
  scarcely: -0.30, modestly: -0.20
};

export const VADER_NEGATIONS = new Set([
  'not', 'no', 'never', 'neither', 'nor', 'hardly', 'scarcely', 'barely',
  'fails', 'failed', 'failing', 'unable', 'without', 'cannot', "can't",
  "don't", "didn't", "won't", "shouldn't", "wouldn't", "isn't", "aren't",
  "wasn't", "weren't", 'deny', 'denies', 'denied', 'reject', 'rejects'
]);

// -----------------------------------------------------------------------------
// 2. FINANCIAL DOMAIN KEYWORD & PHRASE DICTIONARY
// Multi-word phrases take strict priority over single tokens.
// -----------------------------------------------------------------------------
interface FinancialPhraseRule {
  phrase: string;
  category: MatchedFinancialTerm['category'];
  valence: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'UNCERTAIN';
  weight: number; // Scale: -3.0 to +3.0
}

export const FINANCIAL_PHRASE_DICTIONARY: FinancialPhraseRule[] = [
  // A. EARNINGS & REVENUE
  { phrase: 'earnings beat', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.6 },
  { phrase: 'beat estimates', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.5 },
  { phrase: 'beats estimates', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.5 },
  { phrase: 'beats street', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.5 },
  { phrase: 'revenue growth', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.2 },
  { phrase: 'profit growth', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.4 },
  { phrase: 'net profit surges', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.8 },
  { phrase: 'net profit jumps', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.6 },
  { phrase: 'margin expansion', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.4 },
  { phrase: 'raised guidance', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.5 },
  { phrase: 'raises guidance', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.5 },
  { phrase: 'ebitda growth', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.2 },
  { phrase: 'record revenue', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.6 },
  { phrase: 'record profit', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.7 },
  { phrase: 'loss narrowed', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.0 },
  { phrase: 'losses narrow', category: 'EARNINGS_REVENUE', valence: 'POSITIVE', weight: 2.0 },

  { phrase: 'earnings miss', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.6 },
  { phrase: 'misses estimates', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.5 },
  { phrase: 'missed estimates', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.5 },
  { phrase: 'revenue decline', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.3 },
  { phrase: 'profit fall', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.5 },
  { phrase: 'profit drop', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.4 },
  { phrase: 'profit drops', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.4 },
  { phrase: 'profit plunges', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.8 },
  { phrase: 'profit slumps', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.7 },
  { phrase: 'net loss', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.3 },
  { phrase: 'losses widen', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.6 },
  { phrase: 'losses widened', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.6 },
  { phrase: 'loss widens', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.6 },
  { phrase: 'loss widened', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.6 },
  { phrase: 'margin compression', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.4 },
  { phrase: 'lowered guidance', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.5 },
  { phrase: 'cuts guidance', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.5 },
  { phrase: 'warns on profit', category: 'EARNINGS_REVENUE', valence: 'NEGATIVE', weight: -2.5 },

  // B. GROWTH & EXPANSION
  { phrase: 'order win', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.3 },
  { phrase: 'order inflow', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.2 },
  { phrase: 'bags order', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.3 },
  { phrase: 'wins contract', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.4 },
  { phrase: 'multi-year contract', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.4 },
  { phrase: 'capacity expansion', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.2 },
  { phrase: 'new plant', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.0 },
  { phrase: 'market share gain', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.3 },
  { phrase: 'strong demand', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.2 },
  { phrase: 'patent granted', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.2 },
  { phrase: 'strategic partnership', category: 'GROWTH_EXPANSION', valence: 'POSITIVE', weight: 2.0 },

  { phrase: 'contract loss', category: 'GROWTH_EXPANSION', valence: 'NEGATIVE', weight: -2.3 },
  { phrase: 'order cancellation', category: 'GROWTH_EXPANSION', valence: 'NEGATIVE', weight: -2.5 },
  { phrase: 'expansion delayed', category: 'GROWTH_EXPANSION', valence: 'NEGATIVE', weight: -2.0 },
  { phrase: 'plant shutdown', category: 'GROWTH_EXPANSION', valence: 'NEGATIVE', weight: -2.5 },
  { phrase: 'operations halted', category: 'GROWTH_EXPANSION', valence: 'NEGATIVE', weight: -2.6 },
  { phrase: 'market share loss', category: 'GROWTH_EXPANSION', valence: 'NEGATIVE', weight: -2.3 },
  { phrase: 'customer churn', category: 'GROWTH_EXPANSION', valence: 'NEGATIVE', weight: -2.2 },

  // C. BALANCE SHEET & DEBT
  { phrase: 'debt reduction', category: 'BALANCE_SHEET_DEBT', valence: 'POSITIVE', weight: 2.5 },
  { phrase: 'debt free', category: 'BALANCE_SHEET_DEBT', valence: 'POSITIVE', weight: 2.6 },
  { phrase: 'zero debt', category: 'BALANCE_SHEET_DEBT', valence: 'POSITIVE', weight: 2.6 },
  { phrase: 'prepayment of debt', category: 'BALANCE_SHEET_DEBT', valence: 'POSITIVE', weight: 2.4 },
  { phrase: 'rating upgraded', category: 'BALANCE_SHEET_DEBT', valence: 'POSITIVE', weight: 2.4 },
  { phrase: 'credit upgrade', category: 'BALANCE_SHEET_DEBT', valence: 'POSITIVE', weight: 2.4 },
  { phrase: 'share buyback', category: 'BALANCE_SHEET_DEBT', valence: 'POSITIVE', weight: 2.3 },
  { phrase: 'dividend hike', category: 'BALANCE_SHEET_DEBT', valence: 'POSITIVE', weight: 2.2 },
  { phrase: 'dividend increase', category: 'BALANCE_SHEET_DEBT', valence: 'POSITIVE', weight: 2.2 },
  { phrase: 'cash flow positive', category: 'BALANCE_SHEET_DEBT', valence: 'POSITIVE', weight: 2.4 },

  { phrase: 'debt default', category: 'BALANCE_SHEET_DEBT', valence: 'NEGATIVE', weight: -3.2 },
  { phrase: 'loan default', category: 'BALANCE_SHEET_DEBT', valence: 'NEGATIVE', weight: -3.0 },
  { phrase: 'debt burden', category: 'BALANCE_SHEET_DEBT', valence: 'NEGATIVE', weight: -2.4 },
  { phrase: 'liquidity crunch', category: 'BALANCE_SHEET_DEBT', valence: 'NEGATIVE', weight: -2.8 },
  { phrase: 'credit downgrade', category: 'BALANCE_SHEET_DEBT', valence: 'NEGATIVE', weight: -2.7 },
  { phrase: 'rating downgraded', category: 'BALANCE_SHEET_DEBT', valence: 'NEGATIVE', weight: -2.7 },
  { phrase: 'bankruptcy risk', category: 'BALANCE_SHEET_DEBT', valence: 'NEGATIVE', weight: -3.2 },
  { phrase: 'insolvency proceedings', category: 'BALANCE_SHEET_DEBT', valence: 'NEGATIVE', weight: -3.2 },
  { phrase: 'cash burn', category: 'BALANCE_SHEET_DEBT', valence: 'NEGATIVE', weight: -2.4 },

  // D. REGULATORY & LEGAL
  { phrase: 'regulatory approval', category: 'REGULATORY_LEGAL', valence: 'POSITIVE', weight: 2.5 },
  { phrase: 'fda approval', category: 'REGULATORY_LEGAL', valence: 'POSITIVE', weight: 2.7 },
  { phrase: 'antitrust clearance', category: 'REGULATORY_LEGAL', valence: 'POSITIVE', weight: 2.3 },
  { phrase: 'clean chit', category: 'REGULATORY_LEGAL', valence: 'POSITIVE', weight: 2.4 },
  { phrase: 'settlement reached', category: 'REGULATORY_LEGAL', valence: 'POSITIVE', weight: 2.0 },
  { phrase: 'lawsuit dismissed', category: 'REGULATORY_LEGAL', valence: 'POSITIVE', weight: 2.2 },

  { phrase: 'regulatory penalty', category: 'REGULATORY_LEGAL', valence: 'NEGATIVE', weight: -2.8 },
  { phrase: 'forensic probe', category: 'REGULATORY_LEGAL', valence: 'NEGATIVE', weight: -3.0 },
  { phrase: 'fraud allegations', category: 'REGULATORY_LEGAL', valence: 'NEGATIVE', weight: -3.4 },
  { phrase: 'accounting irregularities', category: 'REGULATORY_LEGAL', valence: 'NEGATIVE', weight: -3.4 },
  { phrase: 'sebi notice', category: 'REGULATORY_LEGAL', valence: 'NEGATIVE', weight: -2.6 },
  { phrase: 'sebi probe', category: 'REGULATORY_LEGAL', valence: 'NEGATIVE', weight: -2.6 },
  { phrase: 'tax evasion', category: 'REGULATORY_LEGAL', valence: 'NEGATIVE', weight: -3.2 },
  { phrase: 'investigation launched', category: 'REGULATORY_LEGAL', valence: 'NEGATIVE', weight: -2.6 },
  { phrase: 'license revoked', category: 'REGULATORY_LEGAL', valence: 'NEGATIVE', weight: -3.0 },
  { phrase: 'cartel fine', category: 'REGULATORY_LEGAL', valence: 'NEGATIVE', weight: -2.8 },
  { phrase: 'corporate governance lapses', category: 'MANAGEMENT_GOVERNANCE', valence: 'NEGATIVE', weight: -2.8 },
  { phrase: 'governance lapses', category: 'MANAGEMENT_GOVERNANCE', valence: 'NEGATIVE', weight: -2.8 },

  // E. MANAGEMENT & GOVERNANCE
  { phrase: 'promoter buying', category: 'MANAGEMENT_GOVERNANCE', valence: 'POSITIVE', weight: 2.2 },
  { phrase: 'insider buying', category: 'MANAGEMENT_GOVERNANCE', valence: 'POSITIVE', weight: 2.2 },
  { phrase: 'stake increase', category: 'MANAGEMENT_GOVERNANCE', valence: 'POSITIVE', weight: 2.0 },

  { phrase: 'auditor resignation', category: 'MANAGEMENT_GOVERNANCE', valence: 'NEGATIVE', weight: -3.0 },
  { phrase: 'auditor resigns', category: 'MANAGEMENT_GOVERNANCE', valence: 'NEGATIVE', weight: -3.0 },
  { phrase: 'promoter pledge', category: 'MANAGEMENT_GOVERNANCE', valence: 'NEGATIVE', weight: -2.2 },
  { phrase: 'insider selling', category: 'MANAGEMENT_GOVERNANCE', valence: 'NEGATIVE', weight: -2.0 },
  { phrase: 'whistleblower complaint', category: 'MANAGEMENT_GOVERNANCE', valence: 'NEGATIVE', weight: -2.8 },

  // F. UNCERTAINTY & ATTRIBUTION SPECULATION
  { phrase: 'denies allegations', category: 'UNCERTAINTY_SPECULATION', valence: 'UNCERTAIN', weight: 0.0 },
  { phrase: 'alleged fraud', category: 'UNCERTAINTY_SPECULATION', valence: 'UNCERTAIN', weight: -1.2 },
  { phrase: 'may face probe', category: 'UNCERTAINTY_SPECULATION', valence: 'UNCERTAIN', weight: -1.2 },
  { phrase: 'sources say', category: 'UNCERTAINTY_SPECULATION', valence: 'UNCERTAIN', weight: 0.0 },
  { phrase: 'rumored takeover', category: 'UNCERTAINTY_SPECULATION', valence: 'UNCERTAIN', weight: 0.5 },
  { phrase: 'taking profit', category: 'MARKET_POSITION', valence: 'NEUTRAL', weight: 0.0 },
  { phrase: 'profit booking', category: 'MARKET_POSITION', valence: 'NEUTRAL', weight: -0.5 }
];

// -----------------------------------------------------------------------------
// 3. CORE VADER LEXICAL VALENCE SCORER
// -----------------------------------------------------------------------------
export function calculateVaderScore(text: string): {
  compound: number;
  label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  matchedWordsCount: number;
} {
  if (!text || !text.trim()) {
    return { compound: 0.0, label: 'NEUTRAL', matchedWordsCount: 0 };
  }

  const cleanText = text.replace(/[^a-zA-Z0-9\s!'-]/g, ' ');
  const words = cleanText.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { compound: 0.0, label: 'NEUTRAL', matchedWordsCount: 0 };
  }

  let sumValence = 0;
  let count = 0;

  for (let i = 0; i < words.length; i++) {
    const rawWord = words[i];
    const cleanWord = rawWord.toLowerCase();

    if (VADER_FINANCIAL_LEXICON[cleanWord] !== undefined) {
      let v = VADER_FINANCIAL_LEXICON[cleanWord];

      // All-caps booster
      if (rawWord === rawWord.toUpperCase() && rawWord.length > 1) {
        v += v > 0 ? 0.733 : -0.733;
      }

      // Look back up to 4 tokens for degree modifiers or negations (e.g. "not facing any debt default")
      let isNegated = false;
      for (let j = Math.max(0, i - 4); j < i; j++) {
        const prev = words[j].toLowerCase();
        if (VADER_NEGATIONS.has(prev)) {
          isNegated = true;
        }
        if (VADER_BOOSTERS[prev] !== undefined) {
          const b = VADER_BOOSTERS[prev];
          v += v > 0 ? b : -b;
        }
      }

      if (isNegated) {
        v *= -0.74; // Standard VADER scalar negation
      }

      sumValence += v;
      count++;
    }
  }

  // Punctuation emphasis
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 0 && count > 0) {
    const puncBoost = Math.min(3, exclamationCount) * 0.292;
    sumValence += sumValence > 0 ? puncBoost : -puncBoost;
  }

  if (count === 0) {
    return { compound: 0.0, label: 'NEUTRAL', matchedWordsCount: 0 };
  }

  // Standard VADER compound formula
  const compound = sumValence / Math.sqrt((sumValence * sumValence) + 15);
  const rounded = Math.round(compound * 100) / 100;
  const label = rounded >= 0.05 ? 'POSITIVE' : rounded <= -0.05 ? 'NEGATIVE' : 'NEUTRAL';

  return { compound: rounded, label, matchedWordsCount: count };
}

// -----------------------------------------------------------------------------
// 4. FINANCIAL CONTEXT & KEYWORD ENGINE
// -----------------------------------------------------------------------------
export function analyzeFinancialContext(text: string): {
  keywordScore: number;
  matchedTerms: MatchedFinancialTerm[];
  detail: FinancialContextDetail;
} {
  if (!text || !text.trim()) {
    return {
      keywordScore: 0.0,
      matchedTerms: [],
      detail: {
        positiveTerms: [],
        negativeTerms: [],
        uncertaintyTerms: [],
        negatedTerms: [],
        matchedCategories: [],
        isHeadlineOnly: false,
        isMixed: false,
        evidenceStrength: 'INSUFFICIENT',
        explanation: 'No financial news content provided for contextual analysis.'
      }
    };
  }

  const normalized = text.toLowerCase().replace(/['"’]/g, '');
  const matchedTerms: MatchedFinancialTerm[] = [];
  const seenPhrases = new Set<string>();

  let positiveScore = 0;
  let negativeScore = 0;
  let uncertaintyHits = 0;
  const positiveTerms: string[] = [];
  const negativeTerms: string[] = [];
  const uncertaintyTerms: string[] = [];
  const negatedTerms: string[] = [];
  const categories = new Set<string>();

  // Helper: check if a phrase is preceded by a negation within ~30 chars
  const checkNegation = (phrase: string, index: number): boolean => {
    const lookbackStart = Math.max(0, index - 40);
    const window = normalized.slice(lookbackStart, index);
    const tokens = window.split(/\s+/).filter(Boolean);
    const last4Tokens = tokens.slice(-4);
    return last4Tokens.some(t => VADER_NEGATIONS.has(t));
  };

  // 1. Match multi-word financial phrases first
  for (const rule of FINANCIAL_PHRASE_DICTIONARY) {
    const idx = normalized.indexOf(rule.phrase);
    if (idx !== -1 && !seenPhrases.has(rule.phrase)) {
      seenPhrases.add(rule.phrase);
      const isNeg = checkNegation(rule.phrase, idx);
      categories.add(rule.category);

      let effectiveWeight = rule.weight;
      let effectiveValence = rule.valence;

      if (isNeg) {
        negatedTerms.push(`not ${rule.phrase}`);
        // Invert valence on negation
        if (rule.valence === 'POSITIVE') {
          effectiveValence = 'NEGATIVE';
          effectiveWeight = -Math.abs(rule.weight) * 0.85;
          negativeTerms.push(`not ${rule.phrase}`);
          negativeScore += Math.abs(effectiveWeight);
        } else if (rule.valence === 'NEGATIVE') {
          effectiveValence = 'NEUTRAL';
          effectiveWeight = 0.2; // relief factor
        }
      } else {
        if (rule.valence === 'POSITIVE') {
          positiveTerms.push(rule.phrase);
          positiveScore += effectiveWeight;
        } else if (rule.valence === 'NEGATIVE') {
          negativeTerms.push(rule.phrase);
          negativeScore += Math.abs(effectiveWeight);
        } else if (rule.valence === 'UNCERTAIN') {
          uncertaintyTerms.push(rule.phrase);
          uncertaintyHits++;
        }
      }

      matchedTerms.push({
        term: rule.phrase,
        category: rule.category,
        valence: effectiveValence,
        weight: Math.round(effectiveWeight * 100) / 100,
        isNegated: isNeg
      });
    }
  }

  // 1b. Uncertainty & speculation markers
  const UNCERTAINTY_PATTERNS = [
    /\bsources\s+(?:say|allege|indicate|claim)\b/i,
    /\b(?:rumor|rumors|rumored|rumoured)\b/i,
    /\b(?:alleged|allegedly|alleges|allege)\b/i,
    /\b(?:might\s+consider|could\s+consider|possible|speculation|speculated)\b/i,
    /\b(?:unconfirmed|reportedly|unverified)\b/i
  ];
  for (const pattern of UNCERTAINTY_PATTERNS) {
    const match = normalized.match(pattern);
    if (match && !uncertaintyTerms.includes(match[0])) {
      uncertaintyTerms.push(match[0]);
      uncertaintyHits++;
      categories.add('UNCERTAINTY_SPECULATION');
    }
  }

  // 2. Financial % change boost / drag detection
  // e.g. "surges 22%", "surged by 35%", "jumps 15%", "falls 18%", "plunges 30%"
  const posPctMatch = normalized.match(/(?:surge[ds]?|surging|jump(?:ed|s)?|jumping|r[io]se|rising|gain(?:ed|s)?|gaining|up)\s*(?:by\s*)?(\d{1,3}(?:\.\d+)?)\s*%/i);
  if (posPctMatch) {
    const pct = parseFloat(posPctMatch[1]);
    const boost = Math.min(2.0, Math.max(1.0, pct * 0.05));
    positiveScore += boost;
    const term = `+${pct}% gain`;
    positiveTerms.push(term);
    categories.add('GROWTH_EXPANSION');
    matchedTerms.push({
      term,
      category: 'GROWTH_EXPANSION',
      valence: 'POSITIVE',
      weight: boost
    });
  }

  const negPctMatch = normalized.match(/(?:plunge[ds]?|plunging|drop(?:ped|s)?|dropping|f(?:all|ell)(?:s|en)?|falling|slump(?:ed|s)?|slumping|down)\s*(?:by\s*)?(\d{1,3}(?:\.\d+)?)\s*%/i);
  if (negPctMatch) {
    const pct = parseFloat(negPctMatch[1]);
    const drag = Math.min(2.0, Math.max(1.0, pct * 0.05));
    negativeScore += drag;
    const term = `-${pct}% drop`;
    negativeTerms.push(term);
    categories.add('EARNINGS_REVENUE');
    matchedTerms.push({
      term,
      category: 'EARNINGS_REVENUE',
      valence: 'NEGATIVE',
      weight: -drag
    });
  }

  // 3. Detect mixed news (e.g. rising revenue but falling profits)
  const isMixed = positiveTerms.length > 0 && negativeTerms.length > 0 &&
    Math.min(positiveScore, negativeScore) >= 1.0;

  // 4. Calculate bounded keyword score (-1.00 to +1.00)
  const netEvidence = positiveScore - negativeScore;
  let rawScore = 0;
  if (positiveScore + negativeScore > 0) {
    rawScore = netEvidence / Math.sqrt((positiveScore + negativeScore) + 3);
  }

  // Attenuate if uncertainty dominates
  if (uncertaintyHits > 0) {
    rawScore *= Math.max(0.4, 1.0 - (uncertaintyHits * 0.25));
  }

  const keywordScore = Math.max(-1.0, Math.min(1.0, Math.round(rawScore * 100) / 100));

  // Evidence strength determination
  const totalTerms = positiveTerms.length + negativeTerms.length + uncertaintyTerms.length;
  let evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT' = 'INSUFFICIENT';
  if (totalTerms >= 3 || (positiveScore >= 3.5 || negativeScore >= 3.5)) {
    evidenceStrength = 'STRONG';
  } else if (totalTerms >= 2 || (positiveScore >= 2.0 || negativeScore >= 2.0)) {
    evidenceStrength = 'MODERATE';
  } else if (totalTerms >= 1) {
    evidenceStrength = 'WEAK';
  }

  // Synthesize concise human explanation
  let explanation = '';
  if (isMixed) {
    explanation = `Mixed financial evidence: positive factors (${positiveTerms.slice(0, 2).join(', ')}) offset by negative headwinds (${negativeTerms.slice(0, 2).join(', ')}).`;
  } else if (positiveScore > negativeScore && positiveTerms.length > 0) {
    explanation = `Corporate disclosures highlight expansion and financial strength (${positiveTerms.slice(0, 3).join(', ')}).`;
  } else if (negativeScore > positiveScore && negativeTerms.length > 0) {
    explanation = `Headlines reflect corporate headwinds and financial risks (${negativeTerms.slice(0, 3).join(', ')}).`;
  } else if (uncertaintyHits > 0) {
    explanation = `Uncertainty markers detected in media reporting (${uncertaintyTerms.slice(0, 2).join(', ')}); unverified claims discounted.`;
  } else {
    explanation = 'Neutral commercial coverage with balanced or routine business developments.';
  }

  return {
    keywordScore,
    matchedTerms,
    detail: {
      positiveTerms,
      negativeTerms,
      uncertaintyTerms,
      negatedTerms,
      matchedCategories: Array.from(categories),
      isHeadlineOnly: false,
      isMixed,
      evidenceStrength,
      explanation
    }
  };
}

// -----------------------------------------------------------------------------
// 5. COMBINED SENTIMENT ANALYSIS (VADER + FINANCIAL CONTEXT)
// -----------------------------------------------------------------------------
export function analyzeFinancialSentiment(
  headline: string,
  summary: string = '',
  options: { isHeadlineOnly?: boolean } = {}
): FinancialSentimentResult {
  const cleanHeadline = (headline || '').trim();
  const cleanSummary = (summary || '').trim();
  const fullText = cleanSummary && cleanSummary.toLowerCase() !== cleanHeadline.toLowerCase()
    ? `${cleanHeadline}. ${cleanSummary}`
    : cleanHeadline;

  const isHeadlineOnly = options.isHeadlineOnly ?? (!cleanSummary || cleanSummary.toLowerCase() === cleanHeadline.toLowerCase());

  if (!cleanHeadline) {
    return {
      score: 0.0,
      financialScore: 0.0,
      label: 'NEUTRAL',
      vaderScore: 0.0,
      vaderCompound: 0.0,
      keywordScore: 0.0,
      confidence: 0.0,
      evidenceStrength: 'INSUFFICIENT',
      financialMagnitude: 0,
      isHeadlineOnly: true,
      isMixed: false,
      isUncertainOrAttributed: false,
      explanation: 'No news text available for analysis.',
      matchedTerms: [],
      matchedTermObjects: [],
      contextCategories: [],
      context: {
        positiveTerms: [],
        negativeTerms: [],
        uncertaintyTerms: [],
        negatedTerms: [],
        matchedCategories: [],
        isHeadlineOnly: true,
        isMixed: false,
        evidenceStrength: 'INSUFFICIENT',
        explanation: 'No news text available.'
      }
    };
  }

  // 1. Compute VADER lexical baseline
  const vaderRes = calculateVaderScore(fullText);

  // 2. Compute Financial Context & Keyword score
  const ctxRes = analyzeFinancialContext(fullText);
  ctxRes.detail.isHeadlineOnly = isHeadlineOnly;

  // 3. Synthesize unified score:
  // If financial keywords are found, weight financial keywords (50%) + VADER (50%).
  // If no specific financial keywords are found, rely 100% on VADER lexical baseline.
  let unifiedScore = vaderRes.compound;
  if (ctxRes.matchedTerms.length > 0) {
    unifiedScore = Math.round(((vaderRes.compound * 0.45) + (ctxRes.keywordScore * 0.55)) * 100) / 100;
  }

  // D2 Rule: Equity raises, share sales, offerings, dilution and debt raises are neutral-to-mildly-negative for the issuer
  const isDilutionHeadline = /\b(?:equity\s+raise|capital\s+raise|share\s+sale|stock\s+dilution|rights\s+issue|follow-on\s+offering|private\s+placement|debt\s+raise|bond\s+issue|bond\s+sale|notes\s+offering|raise\s+equity|raise\s+debt)\b/i.test(cleanHeadline) ||
    /\b(?:eyes?|plans?|seeking|to\s+raise)\s+.*?equity\s+raise\b/i.test(cleanHeadline) ||
    /\brais(?:e|ed|ing|es)\s+(?:\$[\d,.]+\s*(?:billion|million|bn|m|b)?\s+)?equity\b/i.test(cleanHeadline);

  if (isDilutionHeadline) {
    // Equity/debt dilution is neutral-to-mildly-negative unless other verified operating blowout exists
    if (unifiedScore > 0) {
      unifiedScore = -0.05; // Mild dilution drag
    } else {
      unifiedScore = Math.max(-0.25, Math.min(-0.05, unifiedScore));
    }
  }

  // D2 Rule: Cap a single headline's magnitude at +/-0.8 unless the financial rule engine has a strong confirmed catalyst
  const hasStrongConfirmedCatalyst = !isHeadlineOnly && ctxRes.matchedTerms.some(t =>
    (t.category === 'GROWTH_EXPANSION' || t.category === 'EARNINGS_REVENUE') && Math.abs(t.weight) >= 2.5
  );

  if (!hasStrongConfirmedCatalyst) {
    unifiedScore = Math.max(-0.80, Math.min(0.80, unifiedScore));
  } else {
    unifiedScore = Math.max(-1.0, Math.min(1.0, unifiedScore));
  }

  // Determine directional label
  let label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' = 'NEUTRAL';
  if (unifiedScore >= 0.06) {
    label = 'POSITIVE';
  } else if (unifiedScore <= -0.06) {
    label = 'NEGATIVE';
  } else {
    label = 'NEUTRAL';
  }

  // Calculate calibrated confidence
  const evidenceCount = vaderRes.matchedWordsCount + ctxRes.matchedTerms.length;
  let confidence = Math.min(0.95, 0.40 + (evidenceCount * 0.10) + (Math.abs(unifiedScore) * 0.35));
  if (isHeadlineOnly) {
    confidence = Math.min(confidence, 0.75); // Headline-only penalty
  }
  if (ctxRes.detail.isMixed) {
    confidence = Math.max(0.45, confidence * 0.80); // Mixed news confidence discount
  }
  confidence = Math.round(confidence * 100) / 100;
  const termStrings = ctxRes.matchedTerms.map(t => t.term);
  const isUncertainOrAttributed = ctxRes.detail.uncertaintyTerms.length > 0;
  const financialMagnitude = Math.round(evidenceCount * (1 + Math.abs(unifiedScore)) * 10) / 10;

  return {
    score: unifiedScore,
    financialScore: unifiedScore,
    label,
    vaderScore: vaderRes.compound,
    vaderCompound: vaderRes.compound,
    keywordScore: ctxRes.keywordScore,
    confidence,
    evidenceStrength: ctxRes.detail.evidenceStrength,
    financialMagnitude,
    isHeadlineOnly,
    isMixed: ctxRes.detail.isMixed,
    isUncertainOrAttributed,
    explanation: ctxRes.detail.explanation,
    matchedTerms: termStrings,
    matchedTermObjects: ctxRes.matchedTerms,
    contextCategories: ctxRes.detail.matchedCategories,
    context: ctxRes.detail
  };
}

// -----------------------------------------------------------------------------
// 6. BATCH AGGREGATION UTILITY
// -----------------------------------------------------------------------------
export function aggregateArticleSentiment(
  results: Array<FinancialSentimentResult | any>
): {
  overallScore: number;
  financialScore: number;
  vaderCompound: number;
  avgVader: number;
  avgKeyword: number;
  label: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  confidence: number;
  evidenceStrength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'NEUTRAL' | 'INSUFFICIENT';
  isMixed: boolean;
  explanation: string;
  totalArticles: number;
  positiveArticlesCount: number;
  negativeArticlesCount: number;
  neutralArticlesCount: number;
  matchedCatalysts: string[];
  matchedRisks: string[];
  matchedCategories: string[];
  allMatchedTerms: string[];
} {
  if (!results || results.length === 0) {
    return {
      overallScore: 0.0,
      financialScore: 0.0,
      vaderCompound: 0.0,
      avgVader: 0.0,
      avgKeyword: 0.0,
      label: 'NEUTRAL',
      confidence: 0.0,
      evidenceStrength: 'INSUFFICIENT',
      isMixed: false,
      explanation: 'Insufficient relevant news coverage to evaluate sentiment.',
      totalArticles: 0,
      positiveArticlesCount: 0,
      negativeArticlesCount: 0,
      neutralArticlesCount: 0,
      matchedCatalysts: [],
      matchedRisks: [],
      matchedCategories: [],
      allMatchedTerms: []
    };
  }

  const n = results.length;
  const scoreSum = results.reduce((acc, r) => acc + (typeof r.score === 'number' ? r.score : (r.financialScore ?? 0)), 0);
  const vaderSum = results.reduce((acc, r) => acc + (typeof r.vaderScore === 'number' ? r.vaderScore : (r.vaderCompound ?? 0)), 0);
  const keywordSum = results.reduce((acc, r) => acc + (typeof r.keywordScore === 'number' ? r.keywordScore : 0), 0);

  const overallScore = Math.round((scoreSum / n) * 100) / 100;
  const avgVader = Math.round((vaderSum / n) * 100) / 100;
  const avgKeyword = Math.round((keywordSum / n) * 100) / 100;

  const posCount = results.filter(r => r.label === 'POSITIVE').length;
  const negCount = results.filter(r => r.label === 'NEGATIVE').length;
  const neuCount = n - posCount - negCount;

  let label: 'BULLISH' | 'NEUTRAL' | 'BEARISH' = 'NEUTRAL';
  if (overallScore >= 0.08) {
    label = 'BULLISH';
  } else if (overallScore <= -0.08) {
    label = 'BEARISH';
  }

  const isMixed = (posCount > 0 && negCount > 0 && Math.min(posCount, negCount) >= Math.ceil(n * 0.3)) ||
    results.some(r => r.isMixed);

  const termSet = new Set<string>();
  const catSet = new Set<string>();
  const posTerms: string[] = [];
  const negTerms: string[] = [];

  for (const r of results) {
    const terms = Array.isArray(r.matchedTerms) ? r.matchedTerms : [];
    for (const t of terms) {
      const str = typeof t === 'string' ? t : t?.term;
      if (str) {
        termSet.add(str);
        if (r.label === 'POSITIVE') posTerms.push(str);
        if (r.label === 'NEGATIVE') negTerms.push(str);
      }
    }
    const cats = Array.isArray(r.contextCategories) ? r.contextCategories : (r.context?.matchedCategories || []);
    for (const c of cats) {
      if (c) catSet.add(c);
    }
  }

  const isHeadlineOnly = results.length === 0 || results.every(r => r.isHeadlineOnly ?? true);
  let evidenceStrength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'NEUTRAL' | 'INSUFFICIENT' = 'WEAK';
  if (n === 0) {
    evidenceStrength = 'INSUFFICIENT';
  } else if (isHeadlineOnly) {
    // Under headline-only evidence: must be "Weak" when score is within +/-0.15. Never "STRONG".
    if (Math.abs(overallScore) <= 0.15) {
      evidenceStrength = 'WEAK';
    } else if (n >= 3 && termSet.size >= 2) {
      evidenceStrength = 'MODERATE';
    } else {
      evidenceStrength = 'WEAK';
    }
  } else {
    if (n >= 5 && termSet.size >= 4 && Math.abs(overallScore) > 0.15) {
      evidenceStrength = 'STRONG';
    } else if (n >= 2 && termSet.size >= 2) {
      evidenceStrength = 'MODERATE';
    } else {
      evidenceStrength = 'WEAK';
    }
  }

  const confidence = Math.min(0.92, Math.round((0.50 + (n * 0.05) + (Math.abs(overallScore) * 0.30)) * 100) / 100);

  let explanation = '';
  if (isMixed) {
    explanation = `Media narrative is mixed across ${n} articles: ${posCount} positive reports offset by ${negCount} cautionary reports.`;
  } else if (posCount > negCount * 1.5 && overallScore >= 0.08) {
    explanation = `Consensus bullish tone across ${posCount} of ${n} reports, supported by key terms (${Array.from(termSet).slice(0, 3).join(', ')}).`;
  } else if (negCount > posCount * 1.5 && overallScore <= -0.08) {
    explanation = `Prevailing cautionary tone across ${negCount} of ${n} reports with prominent risk catalysts (${Array.from(termSet).slice(0, 3).join(', ')}).`;
  } else {
    explanation = `Balanced news tone across ${n} reports with routine corporate disclosures and no single directional bias.`;
  }

  return {
    overallScore,
    financialScore: overallScore,
    vaderCompound: avgVader,
    avgVader,
    avgKeyword,
    label,
    confidence,
    evidenceStrength,
    isMixed,
    explanation,
    totalArticles: n,
    positiveArticlesCount: posCount,
    negativeArticlesCount: negCount,
    neutralArticlesCount: neuCount,
    matchedCatalysts: Array.from(new Set(posTerms)),
    matchedRisks: Array.from(new Set(negTerms)),
    matchedCategories: Array.from(catSet),
    allMatchedTerms: Array.from(termSet)
  };
}
