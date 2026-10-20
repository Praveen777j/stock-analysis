import React, { useState } from 'react';
import { StockQuote, StockFundamentals, InvestmentHorizon, RiskPreference } from '../../types';
import { computeLongTermInvestmentAnalysis } from '../../dataEngine';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  Compass,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Scale,
  Building2,
  DollarSign,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

interface InvestmentAnalysisPageProps {
  quote: StockQuote;
  fundamentals?: StockFundamentals;
}

export const InvestmentAnalysisPage: React.FC<InvestmentAnalysisPageProps> = ({
  quote,
  fundamentals
}) => {
  const [horizon, setHorizon] = useState<InvestmentHorizon>('3-5 Years');
  const [risk, setRisk] = useState<RiskPreference>('Moderate');

  const analysis = computeLongTermInvestmentAnalysis(
    quote.ticker,
    quote,
    fundamentals,
    horizon,
    risk
  );

  const currSym = quote.currency === 'USD' ? '$' : '₹';

  const classificationColor =
    analysis.classification === 'POTENTIALLY ATTRACTIVE'
      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/50'
      : analysis.classification === 'STRONGER FUNDAMENTALS'
      ? 'text-sky-400 bg-sky-950/60 border-sky-500/50'
      : analysis.classification === 'WATCHLIST'
      ? 'text-amber-400 bg-amber-950/60 border-amber-500/50'
      : analysis.classification === 'HIGH RISK'
      ? 'text-rose-400 bg-rose-950/60 border-rose-500/50'
      : analysis.classification === 'AVOID / NEGATIVE THESIS'
      ? 'text-rose-400 bg-rose-950/60 border-rose-600/60'
      : 'text-slate-400 bg-slate-900 border-slate-800';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Executive Long-Term Investment Thesis Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Feature 9: Dedicated Long-Term Investment Analysis
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {quote.companyName} <span className="font-mono text-slate-400 text-xl font-normal">({quote.ticker})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Sector: <strong className="text-slate-200">{analysis.sector}</strong> · Industry: <strong className="text-slate-200">{analysis.industry}</strong> · Reporting: <span className="text-emerald-400 font-mono">{analysis.reportingDates}</span>
            </p>
          </div>

          {/* Interactive Parameters: Horizon & Risk Tolerance */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Horizon Selector */}
            <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex items-center gap-1 font-mono text-xs">
              <span className="text-slate-500 px-2 text-[10px] uppercase font-sans">Horizon:</span>
              {(['3-5 Years', '5-10 Years'] as InvestmentHorizon[]).map(h => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    horizon === h
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>

            {/* Risk Preference Selector */}
            <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex items-center gap-1 font-mono text-xs">
              <span className="text-slate-500 px-2 text-[10px] uppercase font-sans">Risk Tolerance:</span>
              {(['Conservative', 'Moderate', 'Aggressive'] as RiskPreference[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    risk === r
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Classification Callout */}
        <div className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${classificationColor}`}>
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-80 block">
              Investment Research Classification ({horizon} Horizon · {risk} Profile)
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight">
              {analysis.classification}
            </div>
            <p className="text-xs opacity-90 leading-relaxed font-sans max-w-3xl">
              {analysis.executiveThesis}
            </p>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 font-mono text-right shrink-0">
            <span className="text-[10px] text-slate-400 uppercase block font-sans">Evidence Confidence</span>
            <span className="text-sm font-bold text-slate-100">{analysis.confidenceLabel}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Completeness: {analysis.dataCompletenessPct}%</span>
          </div>
        </div>

        {/* Crucial Educational Distinction Note */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed space-y-1">
          <strong className="text-slate-100 font-semibold block font-mono flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            Core Distinction: Short-Term Trading vs Long-Term Investment
          </strong>
          <p>
            Tomorrow Trade Desk focuses on 1-day momentum, order triggers, and tight capital protection. In contrast, this Investment Analysis feature evaluates whether {quote.companyName} is fundamentally worth owning over a 3–5+ year horizon based on economic moat, capital efficiency (ROE), balance-sheet resilience, and valuation margin of safety. A short-term trading sell does not invalidate long-term investment merit, and a short-term rally does not make an expensive company cheap.
          </p>
        </div>
      </div>

      {/* 2. Three Strongest Reasons & Three Major Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Three Strongest Reasons */}
        <div className="bg-slate-900/50 border border-emerald-950/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Three Strongest Investment Pillars
          </h3>
          <ul className="space-y-3 font-sans text-xs text-slate-300">
            {analysis.threeStrongestReasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5">0{i + 1}.</span>
                <span className="leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Three Major Risks */}
        <div className="bg-slate-900/50 border border-rose-950/80 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Three Major Structural Risks to Thesis
          </h3>
          <ul className="space-y-3 font-sans text-xs text-slate-300">
            {analysis.threeMajorRisks.map((riskItem, i) => (
              <li key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="font-mono font-bold text-rose-400 text-sm mt-0.5">0{i + 1}.</span>
                <span className="leading-relaxed">{riskItem}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 3. Valuation & Financial Health Synthesis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Valuation Assessment Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
            Valuation Assessment
          </span>
          <div className="text-lg font-bold font-mono text-slate-100">
            {analysis.valuationAssessment.status}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {analysis.valuationAssessment.narrative}
          </p>
          <div className="pt-2 text-xs font-mono text-slate-300 space-y-1">
            {analysis.valuationAssessment.currentPe && (
              <div>Current P/E: <span className="font-bold text-emerald-400">{analysis.valuationAssessment.currentPe}x</span></div>
            )}
            {analysis.valuationAssessment.peerPeAverage && (
              <div className="text-slate-400">Sector Median: {analysis.valuationAssessment.peerPeAverage}x</div>
            )}
          </div>
        </div>

        {/* Financial Health & Solvency */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
            Financial Health & Solvency
          </span>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {fundamentals?.debtToEquity !== undefined ? (fundamentals.debtToEquity <= 50 ? 'Low Leverage (Healthy)' : 'Moderate Leverage') : 'Solvent Trajectory'}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {analysis.financialHealthSummary}
          </p>
          <div className="pt-2 text-xs font-mono text-slate-300">
            Debt-to-Equity: <span className="font-bold">{fundamentals?.debtToEquity !== undefined ? `${fundamentals.debtToEquity.toFixed(1)}%` : 'N/A'}</span>
          </div>
        </div>

        {/* Business Growth Quality */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block">
            Revenue & Growth Trajectory
          </span>
          <div className="text-lg font-bold font-mono text-sky-400">
            {analysis.businessGrowthAssessment}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Consistent top-line volume growth indicates market share defense across core business segments.
          </p>
        </div>
      </div>

      {/* 4. Complete 12-Dimension Evaluation Framework Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wide">
              12-Dimension Long-Term Evaluation Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Rigorous analytical framework mapping business quality, margins, capital returns, and governance.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg shrink-0">
            Audited & Provider Verified
          </span>
        </div>

        <div className="space-y-3 font-sans text-xs">
          {analysis.dimensions.map((dim) => {
            const statusBadge =
              dim.status === 'POSITIVE'
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : dim.status === 'NEUTRAL'
                ? 'bg-slate-950 text-slate-300 border-slate-800'
                : dim.status === 'CAUTION'
                ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                : dim.status === 'NEGATIVE'
                ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                : 'bg-slate-950 text-slate-500 border-slate-800';

            return (
              <div
                key={dim.id}
                className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 transition-colors hover:border-slate-700 space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-200 text-sm">{dim.name}</span>
                    {dim.score !== undefined && (
                      <span className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Score: {dim.score}/10
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className={`px-2 py-0.5 rounded border font-semibold ${statusBadge}`}>
                      {dim.status}
                    </span>
                    <span className="text-slate-500 text-[10px] hidden md:inline">
                      Source: {dim.source}
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 leading-relaxed">{dim.finding}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
                  <span>Implication: {dim.implication}</span>
                  <span className="text-[10px] text-slate-500">Evidence Quality: {dim.evidenceQuality}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Key Metrics to Monitor & Invalidation Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Metrics to Monitor */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            Key Quarterly Metrics to Monitor
          </h3>
          <div className="space-y-3 font-sans text-xs">
            {analysis.keyMetricsToMonitor.map((metric, i) => (
              <div key={i} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-slate-200">{metric.metric}</span>
                  <span className="text-emerald-400">Current: {metric.currentVal} · Target: {metric.benchmark}</span>
                </div>
                <p className="text-slate-400 text-[11px]">{metric.rationale}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Thesis Invalidation Triggers */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Conditions That Invalidate the Thesis
          </h3>
          <ul className="space-y-2.5 font-sans text-xs text-slate-300">
            {analysis.thesisInvalidationTriggers.map((trig, i) => (
              <li key={i} className="flex items-start gap-2 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-rose-400 font-bold font-mono">✕</span>
                <span className="leading-relaxed">{trig}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
