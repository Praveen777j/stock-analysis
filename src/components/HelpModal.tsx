import React from 'react';
import { X, BookOpen, Brain, TrendingUp, Cpu, BarChart2, ShieldCheck, Database, Sparkles, CheckCircle2 } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                System Architecture & Methodology Documentation
              </h2>
              <p className="text-xs text-slate-400">
                Unified Quantitative Decision Engine (Technicals + VADER & Financial Context + Fundamentals + Probabilistic Rule Engine)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-6 overflow-y-auto space-y-6 text-slate-300 text-xs leading-relaxed divide-y divide-slate-800/80">
          {/* Executive Overview */}
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Quantitative Decision Synthesis Overview</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              Nexus integrates real-time corporate news sentiment, financial statement filings, technical price indicators, and probabilistic trade rules into a unified decision framework. Each dimension is weighted and calibrated to produce clear, actionable market outlooks with zero look-ahead bias.
            </p>
          </div>

          {/* Section 1: The Unified Master Formula */}
          <section className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <Brain className="w-4 h-4" />
              <h3>1. Unified Master Decision Formula</h3>
            </div>
            <p className="text-slate-400">
              Quantitative signals are synthesized into a normalized continuous score [-1.00 to +1.00] using an adaptive multi-pillar structure:
            </p>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-center text-xs space-y-2">
              <div className="text-emerald-400 font-bold text-xs sm:text-sm">
                Unified Score = 0.40(Tech) + 0.25(Financial Context & VADER) + 0.15(P&L / Debt) + 0.20(Rule Engine)
              </div>
              <div className="text-[11px] text-slate-400">
                Fallback without financial statements: 0.45(Tech) + 0.30(Financial Context & VADER) + 0.25(Rule Engine)
              </div>
              <div className="text-[11px] text-slate-400">
                Fallback without news coverage: 0.50(Tech) + 0.20(P&L / Debt) + 0.30(Rule Engine)
              </div>
              <div className="text-[10px] text-slate-500">
                Range: [-1.00 (Extreme Bearish) to +1.00 (Extreme Bullish)] · Missing components handled explicitly without silent distortion
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
              <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-center">
                <span className="text-amber-400 font-bold block mb-1">Technicals (40%)</span>
                14-period RSI, 20/50-day EMA spread, and MACD Histogram.
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-center">
                <span className="text-emerald-400 font-bold block mb-1">News & Context (25%)</span>
                VADER financial lexicon and corporate event classification.
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-center">
                <span className="text-teal-400 font-bold block mb-1">P&L / Solvency (15%)</span>
                Operating margins, debt-to-equity leverage, and revenue growth.
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-lg text-center">
                <span className="text-sky-400 font-bold block mb-1">Rule Engine (20%)</span>
                Non-trained deterministic rule setup margin P(Buy) - P(Sell).
              </div>
            </div>
          </section>

          {/* Section 2: Exact Decision Thresholds */}
          <section className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <h3>2. Exact Decision Mapping & Confidence Calibrations</h3>
            </div>
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3.5">Unified Score Range</th>
                    <th className="py-2.5 px-3">Exact Action</th>
                    <th className="py-2.5 px-3">Confidence band (heuristic)</th>
                    <th className="py-2.5 px-3">Market Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr>
                    <td className="py-2.5 px-3.5 text-emerald-400 font-bold">≥ +0.35</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">STRONG BUY</td>
                    <td className="py-2.5 px-3">78% – 96%</td>
                    <td className="py-2.5 px-3 text-slate-400">High bullish alignment across news & momentum</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-emerald-400">+0.10 to +0.34</td>
                    <td className="py-2.5 px-3 text-emerald-400">BUY</td>
                    <td className="py-2.5 px-3">65% – 85%</td>
                    <td className="py-2.5 px-3 text-slate-400">Positive sentiment supported by technical indicators</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-amber-400">-0.09 to +0.09</td>
                    <td className="py-2.5 px-3 text-amber-400">HOLD</td>
                    <td className="py-2.5 px-3">60% – 72%</td>
                    <td className="py-2.5 px-3 text-slate-400">Neutral equilibrium / conflicting momentum signals</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-rose-400">-0.10 to -0.34</td>
                    <td className="py-2.5 px-3 text-rose-400">SELL</td>
                    <td className="py-2.5 px-3">65% – 85%</td>
                    <td className="py-2.5 px-3 text-slate-400">Negative sentiment and downward trend divergence</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-rose-400 font-bold">≤ -0.35</td>
                    <td className="py-2.5 px-3 text-rose-400 font-bold">STRONG SELL</td>
                    <td className="py-2.5 px-3">78% – 96%</td>
                    <td className="py-2.5 px-3 text-slate-400">Severe bearish sentiment & breakdown across all factors</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: NLP & Technical Engineering */}
          <section className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <h3>3. Quantitative Feature Inputs & NLP Engines</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-lg space-y-1">
                <span className="font-semibold text-slate-200 block">Technical Momentum Engine (RSI + MACD + EMAs)</span>
                <p className="text-slate-400">
                  Calculated from OHLCV historical bars using Wilder's smoothing for 14 RSI, EMA 20/50 spread, and MACD (12, 26, 9) histogram.
                </p>
                <div className="font-mono text-[10px] text-amber-400 bg-slate-900 p-1.5 rounded border border-slate-800">
                  Tech Score = 0.35(RSI Factor) + 0.40(Trend Diff) + 0.25(MACD Factor)
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-lg space-y-1">
                <span className="font-semibold text-slate-200 block">VADER Polarity Lexicon Engine</span>
                <p className="text-slate-400">
                  Rule-based grammatical sentiment engine analyzing breaking headlines with negation handling, degree intensifiers, and punctuation boosting.
                </p>
                <div className="font-mono text-[10px] text-indigo-400 bg-slate-900 p-1.5 rounded border border-slate-800">
                  Compound Score = sumValence / √(sumValence² + 15) in range [-1.0 to +1.0]
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-lg space-y-1">
                <span className="font-semibold text-slate-200 block">Financial Context & Corporate Catalyst Engine</span>
                <p className="text-slate-400">
                  Financial phrase classifier analyzing corporate expansion events, margin changes, credit ratings, and regulatory notices.
                </p>
                <div className="font-mono text-[10px] text-emerald-400 bg-slate-900 p-1.5 rounded border border-slate-800">
                  Context Score = Catalysts (+0.25) vs Risk Overhangs (-0.35)
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-lg space-y-1">
                <span className="font-semibold text-slate-200 block">Quantitative Multi-Factor Rule Engine</span>
                <p className="text-slate-400">
                  Calculates calibrated probability distribution over Buy, Hold, and Sell states based on multi-indicator momentum and price action vetoes.
                </p>
                <div className="font-mono text-[10px] text-sky-400 bg-slate-900 p-1.5 rounded border border-slate-800">
                  Rule Engine Margin = P(Buy) - P(Sell) in range [-1.0 to +1.0]
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Explainability & Backtesting */}
          <section className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <h3>4. Additive Factor Attribution & Walk-Forward Backtesting</h3>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-[11px] pl-1">
              <li>
                <strong className="text-slate-200">Additive Factor Decomposition:</strong> Decomposes the exact mathematical contribution of each active pillar summing up to the unified score, allowing transparent auditing of what drove the recommendation with zero ungrounded black-box distortion.
              </li>
              <li>
                <strong className="text-slate-200">Walk-Forward Backtesting:</strong> Strictly sequential historical execution using bar (i-1) signals for execution at bar i open, applying 15 basis points (0.15%) friction (10 bps commission + 5 bps slippage) with zero look-ahead leakage.
              </li>
              <li>
                <strong className="text-slate-200">Consistent Currency:</strong> Quotes, indicators, pivots, targets, and simulated equity are uniformly calibrated to Indian Rupees (₹).
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            Nexus Stock Sentiment Dashboard v2.5
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
