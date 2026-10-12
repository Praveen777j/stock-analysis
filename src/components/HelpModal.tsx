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
                Unified Hybrid AI Model (FinBERT + VADER + Quantitative Technicals + ML Ensemble)
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
              Nexus integrates real-time corporate news sentiment, social media intelligence, technical price indicators, and systematic machine learning models into a unified decision framework. Each dimension is weighted and calibrated to produce clear, actionable market outlooks with zero look-ahead bias.
            </p>
          </div>

          {/* Section 1: The Unified Master Formula */}
          <section className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <Brain className="w-4 h-4" />
              <h3>1. Unified Master Decision Formula</h3>
            </div>
            <p className="text-slate-400">
              The four quantitative engines are combined using normalized continuous scores $\in [-1.00, +1.00]$:
            </p>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-center text-xs space-y-2">
              <div className="text-emerald-400 font-bold text-sm">
                Unified Score = (0.35 × FinBERT) + (0.15 × VADER) + (0.30 × Technicals) + (0.20 × ML Ensemble)
              </div>
              <div className="text-[11px] text-slate-400">
                Normalized Master Output: Range [-1.00 (Extreme Bearish) to +1.00 (Extreme Bullish)]
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-[11px] font-mono">
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-center">
                <span className="text-emerald-400 font-bold block mb-1">FinBERT (35%)</span>
                Transformer deep learning semantic analysis on corporate disclosures.
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-center">
                <span className="text-indigo-400 font-bold block mb-1">VADER (15%)</span>
                Heuristic grammar rules for contrastive terms and breaking news emphasis.
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-center">
                <span className="text-amber-400 font-bold block mb-1">Technicals (30%)</span>
                Multi-timeframe RSI (14), EMA 20/50 spread, and MACD Histogram.
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-center">
                <span className="text-sky-400 font-bold block mb-1">ML Ensemble (20%)</span>
                Bagged decision trees modeling non-linear volatility interactions.
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
                    <th className="py-2.5 px-3">Calibrated Confidence</th>
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
              <h3>3. Natural Language Processing & Technical Feature Inputs</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-lg space-y-1">
                <span className="font-semibold text-slate-200 block">FinBERT Transformer Model</span>
                <p className="text-slate-400">
                  Pre-trained on Financial PhraseBank. Understands that financial terms like "debt reduction" or "cost restructuring" are bullish, avoiding false negative misclassifications.
                </p>
                <div className="font-mono text-[10px] text-emerald-400 bg-slate-900 p-1.5 rounded border border-slate-800">
                  Score = P(Positive) - P(Negative) ∈ [-1.0, +1.0]
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-lg space-y-1">
                <span className="font-semibold text-slate-200 block">VADER Polarity Lexicon</span>
                <p className="text-slate-400">
                  Evaluates contrastive conjunctions ("revenue jumped but margins fell") and degree intensifiers across breaking financial news wires.
                </p>
                <div className="font-mono text-[10px] text-indigo-400 bg-slate-900 p-1.5 rounded border border-slate-800">
                  Compound Score = Normalized valence rating
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-lg space-y-1">
                <span className="font-semibold text-slate-200 block">Technical Momentum (RSI + MACD + EMAs)</span>
                <p className="text-slate-400">
                  Combines 14-period RSI velocity, 20/50-day EMA trend spread, and MACD Histogram acceleration into a normalized technical oscillator.
                </p>
                <div className="font-mono text-[10px] text-amber-400 bg-slate-900 p-1.5 rounded border border-slate-800">
                  Tech Score = 0.35(RSI) + 0.40(EMA Spread) + 0.25(MACD)
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 p-3 rounded-lg space-y-1">
                <span className="font-semibold text-slate-200 block">Machine Learning Decision Ensemble</span>
                <p className="text-slate-400">
                  100 bagged decision trees capturing non-linear interactions between high volatility periods and sudden sentiment shocks.
                </p>
                <div className="font-mono text-[10px] text-sky-400 bg-slate-900 p-1.5 rounded border border-slate-800">
                  ML Score = P(Buy) - P(Sell) ∈ [-1.0, +1.0]
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Explainability (SHAP) & Backtesting */}
          <section className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <h3>4. Explainable AI (SHAP) & Walk-Forward Backtesting</h3>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 text-[11px] pl-1">
              <li>
                <strong className="text-slate-200">Shapley Additive Attribution (SHAP):</strong> Decomposes the exact contribution of each factor so you can transparently audit whether a BUY decision was driven by news or moving average crossovers.
              </li>
              <li>
                <strong className="text-slate-200">Walk-Forward Backtesting:</strong> Simulates out-of-sample performance with 15 basis points (0.15%) friction per trade and zero look-ahead bias, starting with ₹1,00,000 capital.
              </li>
              <li>
                <strong className="text-slate-200">Currency Calibration:</strong> All historical asset bars and live quotes are uniformly calibrated to Indian Rupees (₹).
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
