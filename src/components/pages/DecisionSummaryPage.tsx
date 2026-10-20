import React, { useState } from 'react';
import {
  StockQuote,
  TechnicalIndicators,
  SentimentData,
  ModelSignal,
  StockFundamentals,
  InvestmentHorizon,
  RiskPreference
} from '../../types';
import {
  computeIntegratedDecisionSummary,
  getMultiStockComparison
} from '../../dataEngine';
import {
  Scale,
  Target,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Layers,
  BarChart2,
  Clock,
  Compass,
  Building2,
  ExternalLink
} from 'lucide-react';

interface DecisionSummaryPageProps {
  quote: StockQuote;
  technicals: TechnicalIndicators;
  sentiment: SentimentData;
  signal: ModelSignal;
  fundamentals?: StockFundamentals;
  onSelectTicker?: (ticker: string) => void;
}

export const DecisionSummaryPage: React.FC<DecisionSummaryPageProps> = ({
  quote,
  technicals,
  sentiment,
  signal,
  fundamentals,
  onSelectTicker
}) => {
  const [horizon, setHorizon] = useState<InvestmentHorizon>('3-5 Years');
  const [risk, setRisk] = useState<RiskPreference>('Moderate');

  const summary = computeIntegratedDecisionSummary(
    quote.ticker,
    quote,
    technicals,
    sentiment,
    signal,
    fundamentals,
    horizon,
    risk
  );

  const currSym = quote.currency === 'USD' ? '$' : '₹';

  // Benchmark comparison dataset
  const multiStock = getMultiStockComparison({ [quote.ticker]: quote });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Executive Integrated Decision Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Feature 10: Integrated Stock Decision & Cross-Asset Comparison
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {quote.companyName} <span className="font-mono text-slate-400 text-xl font-normal">({quote.ticker})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Independent synthesis separating short-term tactical trades from multi-year fundamental ownership.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Data Freshness:</span>
            <span className="text-slate-200 font-bold">{summary.dataFreshness}</span>
          </div>
        </div>

        {/* Side-by-Side Horizon Decisions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* A. Short-Term Trading Directive */}
          <div className={`p-6 rounded-2xl border transition-all ${
            summary.shortTerm.action.includes('BUY')
              ? 'bg-emerald-950/40 border-emerald-500/50'
              : summary.shortTerm.action.includes('SELL')
              ? 'bg-rose-950/40 border-rose-500/50'
              : 'bg-amber-950/40 border-amber-500/50'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Decision A: Short-Term Trading
                </span>
              </div>
              <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                1-Day Horizon
              </span>
            </div>

            <div className={`text-2xl font-black font-mono tracking-tight mb-2 ${
              summary.shortTerm.action.includes('BUY') ? 'text-emerald-400' : summary.shortTerm.action.includes('SELL') ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {summary.shortTerm.action}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans mb-4">
              {summary.shortTerm.explanation}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-slate-800/80">
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Trigger Entry</span>
                <span className="font-bold text-slate-200">{currSym}{summary.shortTerm.triggerPrice?.toFixed(1)}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Hard Stop Loss</span>
                <span className="font-bold text-rose-400">{currSym}{summary.shortTerm.stopLoss?.toFixed(1)}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Target 1 (R:R)</span>
                <span className="font-bold text-emerald-400">{currSym}{summary.shortTerm.target1?.toFixed(1)} ({summary.shortTerm.individualR1Ratio})</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Blended R:R</span>
                <span className="font-bold text-emerald-400">{summary.shortTerm.blendedRiskReward}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-sans mt-3">
              <strong>Confirmation Rule:</strong> {summary.shortTerm.requiredConfirmation}
            </p>
          </div>

          {/* B. Long-Term Investment Directive */}
          <div className={`p-6 rounded-2xl border transition-all ${
            summary.longTerm.classification === 'POTENTIALLY ATTRACTIVE'
              ? 'bg-emerald-950/40 border-emerald-500/50'
              : summary.longTerm.classification === 'STRONGER FUNDAMENTALS'
              ? 'bg-sky-950/40 border-sky-500/50'
              : summary.longTerm.classification === 'WATCHLIST'
              ? 'bg-amber-950/40 border-amber-500/50'
              : 'bg-rose-950/40 border-rose-500/50'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Decision B: Long-Term Investment
                </span>
              </div>
              <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                {horizon} Horizon
              </span>
            </div>

            <div className={`text-2xl font-black font-mono tracking-tight mb-2 ${
              summary.longTerm.classification === 'POTENTIALLY ATTRACTIVE'
                ? 'text-emerald-400'
                : summary.longTerm.classification === 'STRONGER FUNDAMENTALS'
                ? 'text-sky-400'
                : summary.longTerm.classification === 'WATCHLIST'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}>
              {summary.longTerm.classification}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans mb-4">
              {summary.longTerm.executiveThesis}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-slate-800/80">
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Valuation Status</span>
                <span className="font-bold text-slate-200">{summary.longTerm.valuationAssessment.status}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Current P/E</span>
                <span className="font-bold text-sky-400">
                  {summary.longTerm.valuationAssessment.currentPe ? `${summary.longTerm.valuationAssessment.currentPe}x` : 'N/A'}
                </span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Confidence</span>
                <span className="font-bold text-emerald-400">{summary.longTerm.confidenceLabel}</span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Data Completeness</span>
                <span className="font-bold text-slate-200">{summary.longTerm.dataCompletenessPct}%</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-sans mt-3">
              <strong>Long-Term Rule:</strong> Evaluate annual profitability trajectory, capital compounding (ROE), and sector competitive moat rather than intraday noise.
            </p>
          </div>
        </div>

        {/* Disagreement & Horizon Reconciliation Narrative */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
          <strong className="text-slate-100 font-semibold font-mono flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-emerald-400" />
            Resolution of Disagreements & Timeframe Discipline
          </strong>
          <p className="leading-relaxed font-sans">
            {summary.disagreementExplanation}
          </p>
        </div>
      </div>

      {/* 2. Evidence Comparison Matrix Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wide">
              Cross-Feature Evidence Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Side-by-side reconciliation of empirical findings across technical, fundamental, news, and sentiment engines.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">Dimension</th>
                <th className="pb-3 pr-4">Empirical Finding</th>
                <th className="pb-3 pr-4">Evidence Quality</th>
                <th className="pb-3">Main Strategic Implication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {summary.matrix.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-4 font-mono font-bold text-slate-200 whitespace-nowrap">
                    {row.dimension}
                  </td>
                  <td className="py-3 pr-4 text-slate-300 font-mono">
                    {row.finding}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      {row.evidenceQuality}
                    </span>
                  </td>
                  <td className="py-3 text-slate-300">
                    {row.mainImplication}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Cross-Stock Comparison Across Benchmark Universe */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wide">
              Universe Benchmark Comparison
            </h3>
            <p className="text-xs text-slate-400">
              Evaluate {quote.companyName} against prominent large-cap market peers using identical valuation and quality standards.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
            Sector-Normalized Thresholds
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-3">Ticker / Company</th>
                <th className="pb-3 pr-3">Sector</th>
                <th className="pb-3 pr-3">P/E Multiple</th>
                <th className="pb-3 pr-3">Debt / Equity</th>
                <th className="pb-3 pr-3">Short-Term Bias</th>
                <th className="pb-3 pr-3">Long-Term Thesis</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {multiStock.map((s) => {
                const isCurrent = s.ticker === quote.ticker;
                return (
                  <tr
                    key={s.ticker}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isCurrent ? 'bg-emerald-950/20 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-1.5">
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        <span className="text-slate-100">{s.name}</span>
                        <span className="text-slate-500 text-[10px]">({s.ticker})</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-slate-400 font-sans">{s.sector}</td>
                    <td className="py-3 pr-3 text-sky-400">{s.valuation}</td>
                    <td className="py-3 pr-3 text-slate-300">{s.debtHealth}</td>
                    <td className="py-3 pr-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        s.shortTermBias === 'BULLISH' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}>
                        {s.shortTermBias}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="text-emerald-400 text-[11px]">
                        {s.longTermClassification}
                      </span>
                    </td>
                    <td className="py-3">
                      {onSelectTicker && !isCurrent ? (
                        <button
                          onClick={() => onSelectTicker(s.ticker)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] transition-colors font-sans"
                        >
                          Analyze
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-sans">Active Stock</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
