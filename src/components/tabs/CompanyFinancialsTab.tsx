import React from 'react';
import { StockQuote, StockFundamentals } from '../../types';
import {
  Building2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Layers,
  FileText,
  Percent,
  Coins
} from 'lucide-react';

interface CompanyFinancialsTabProps {
  quote: StockQuote;
  fundamentals: StockFundamentals;
}

export const CompanyFinancialsTab: React.FC<CompanyFinancialsTabProps> = ({
  quote,
  fundamentals
}) => {
  const isProfitPositive = (fundamentals.profitMarginPct ?? 0) > 0;
  const isRevGrowthPositive = !fundamentals.revenueGrowthYoY?.includes('-');
  const isDebtLow = fundamentals.debtToEquity !== undefined && fundamentals.debtToEquity < 50;

  return (
    <div className="space-y-6 pt-2">
      {/* Audit & Sample Status Banner */}
      <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono ${
        fundamentals.dataStatus === 'VERIFIED_AUDIT'
          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
          : fundamentals.dataStatus === 'LIVE_PROVIDER_DATA'
          ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
          : fundamentals.dataStatus === 'SAMPLE_DATA'
          ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
          : 'bg-slate-900 border-slate-800 text-slate-400'
      }`}>
        <div className="flex items-center gap-2">
          {fundamentals.dataStatus === 'VERIFIED_AUDIT' ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : fundamentals.dataStatus === 'LIVE_PROVIDER_DATA' ? (
            <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>
            {fundamentals.dataStatus === 'VERIFIED_AUDIT'
              ? `AUDITED REGULATORY FILINGS: Verified fundamental disclosures for ${quote.ticker}.`
              : fundamentals.dataStatus === 'LIVE_PROVIDER_DATA'
              ? `LIVE MARKET PROVIDER DATA: Unaudited fundamental summary metrics sourced from market feeds for ${quote.ticker}.`
              : fundamentals.dataStatus === 'SAMPLE_DATA'
              ? `SAMPLE DATA (REFERENCE ONLY): Retained demonstration figures for ${quote.ticker}. Not an audited exchange filing.`
              : `DATA UNAVAILABLE: Fundamental financial disclosures are pending or unavailable for ${quote.ticker}.`}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0 ${
          fundamentals.dataStatus === 'VERIFIED_AUDIT'
            ? 'bg-emerald-900/60 border-emerald-700 text-emerald-200'
            : fundamentals.dataStatus === 'LIVE_PROVIDER_DATA'
            ? 'bg-indigo-900/60 border-indigo-700 text-indigo-200'
            : fundamentals.dataStatus === 'SAMPLE_DATA'
            ? 'bg-amber-900/60 border-amber-700 text-amber-200'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        }`}>
          {fundamentals.dataStatus === 'VERIFIED_AUDIT'
            ? 'AUDITED DATA'
            : fundamentals.dataStatus === 'LIVE_PROVIDER_DATA'
            ? 'LIVE PROVIDER DATA'
            : fundamentals.dataStatus === 'SAMPLE_DATA'
            ? 'SAMPLE DATA'
            : 'UNAVAILABLE'}
        </span>
      </div>

      {/* 1. Official Corporate Identity & Website Strip */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Building2 className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                {quote.companyName}
              </h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                {quote.ticker}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 text-emerald-400 font-medium border border-slate-700">
                {fundamentals.sector || quote.sector || 'Equities'}
              </span>
              {fundamentals.industry && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 font-medium border border-slate-700">
                  {fundamentals.industry}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed mt-1">
              {fundamentals.businessSummary ||
                `${quote.companyName} is an industry-leading enterprise operating with comprehensive domestic scale and international commercial reach.`}
            </p>
          </div>

          {/* Official Company Website Button */}
          {fundamentals.website && (
            <div className="shrink-0">
              <a
                href={fundamentals.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold font-mono transition-all hover:scale-[1.02] shadow-sm"
              >
                <span>Visit Official Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="block text-[10px] text-slate-400 text-right mt-1 font-mono">
                {fundamentals.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Top-Level Health Verdict & Rating Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Financial Health Grade */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Financial Health Grade
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-lg font-bold font-mono text-emerald-400">
              {fundamentals.financialHealthGrade || 'N/A'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Solvency based on debt-to-equity ratio and operating liquidity.
          </p>
        </div>

        {/* Profit Situation */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Profit & Margin Trend
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            {isProfitPositive ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-400" />
            )}
            <span
              className={`text-lg font-bold font-mono ${
                isProfitPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {fundamentals.profitSituation || (fundamentals.profitMarginPct !== undefined ? (isProfitPositive ? 'Profitable' : 'Loss-Making') : 'N/A')}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Net profit margin: {fundamentals.profitMarginPct !== undefined ? `${fundamentals.profitMarginPct}%` : 'N/A'}.
          </p>
        </div>

        {/* Balance Sheet Leverage */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Balance Sheet Leverage
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            {fundamentals.debtToEquity !== undefined ? (
              fundamentals.debtToEquity === 0 ? (
                <span className="text-emerald-400 font-bold text-lg font-mono">
                  Zero Debt (0.0%)
                </span>
              ) : isDebtLow ? (
                <span className="text-emerald-400 font-bold text-lg font-mono">
                  Low Risk ({fundamentals.debtToEquity}%)
                </span>
              ) : (
                <span className="text-amber-400 font-bold text-lg font-mono">
                  Leveraged ({fundamentals.debtToEquity}%)
                </span>
              )
            ) : (
              <span className="text-slate-400 font-bold text-lg font-mono">
                N/A
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Total debt obligations relative to shareholder net equity.
          </p>
        </div>
      </div>

      {/* 3. Sales & Revenue Performance (Top-Line Growth) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          Sales & Top-Line Revenue Breakdown
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          {/* Total Revenue */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Total Annual Revenue</span>
            <div className="text-lg font-bold text-slate-100 mt-1">
              {fundamentals.totalRevenue || 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Top-line corporate gross sales</div>
          </div>

          {/* Revenue Growth YoY */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">YoY Sales Growth</span>
            <div
              className={`text-lg font-bold mt-1 ${
                isRevGrowthPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {fundamentals.revenueGrowthYoY || 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Year-over-year sales expansion</div>
          </div>

          {/* Gross Margin */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Gross Profit Margin</span>
            <div className="text-lg font-bold text-indigo-400 mt-1">
              {fundamentals.grossMarginPct !== undefined ? `${fundamentals.grossMarginPct}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Revenue minus direct costs of goods</div>
          </div>

          {/* Market Cap */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Total Market Valuation</span>
            <div className="text-lg font-bold text-slate-200 mt-1">
              {fundamentals.marketCap || 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Free-float aggregate equity size</div>
          </div>
        </div>
      </div>

      {/* 4. Profit & Loss (P&L) Margins & Valuation */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <PieChart className="w-4 h-4 text-emerald-400" />
          Profit & Loss (P&L) Margins & Valuation Ratios
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          {/* Operating Margin */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Operating Margin (EBIT)</span>
            <div className="text-lg font-bold text-amber-400 mt-1">
              {fundamentals.operatingMarginPct !== undefined ? `${fundamentals.operatingMarginPct}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Operational core business profitability</div>
          </div>

          {/* Net Profit Margin */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Net Profit Margin (PAT)</span>
            <div
              className={`text-lg font-bold mt-1 ${
                isProfitPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {fundamentals.profitMarginPct !== undefined ? `${fundamentals.profitMarginPct}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Bottom-line retained earnings ratio</div>
          </div>

          {/* Trailing P/E Ratio */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Price-to-Earnings (P/E)</span>
            <div className="text-lg font-bold text-slate-100 mt-1">
              {fundamentals.peRatio ? `${fundamentals.peRatio}x` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {fundamentals.forwardPe ? `Forward P/E: ${fundamentals.forwardPe}x` : 'Trailing 12-month earnings'}
            </div>
          </div>

          {/* Price-to-Book (P/B) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Price-to-Book (P/B)</span>
            <div className="text-lg font-bold text-slate-100 mt-1">
              {fundamentals.pbRatio ? `${fundamentals.pbRatio}x` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Share price relative to net asset value</div>
          </div>
        </div>
      </div>

      {/* 5. Balance Sheet Solvency & Return on Equity */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Coins className="w-4 h-4 text-emerald-400" />
          Balance Sheet Solvency & Return Metrics
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          {/* Debt-to-Equity */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Debt-to-Equity Ratio</span>
            <div
              className={`text-lg font-bold mt-1 ${
                fundamentals.debtToEquity !== undefined
                  ? (fundamentals.debtToEquity === 0 ? 'text-emerald-400' : isDebtLow ? 'text-emerald-400' : 'text-amber-400')
                  : 'text-slate-400'
              }`}
            >
              {fundamentals.debtToEquity !== undefined ? `${fundamentals.debtToEquity}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {fundamentals.debtToEquity !== undefined
                ? (fundamentals.debtToEquity === 0 ? 'Zero debt balance sheet' : isDebtLow ? 'Conservative leverage' : 'Moderate capital gearing')
                : 'Gearing disclosure unavailable'}
            </div>
          </div>

          {/* Return on Equity (ROE) */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Return on Equity (ROE)</span>
            <div className="text-lg font-bold text-emerald-400 mt-1">
              {fundamentals.roe ? `${fundamentals.roe}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Efficiency of equity capital generation</div>
          </div>

          {/* Diluted EPS */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Diluted EPS</span>
            <div className="text-lg font-bold text-slate-100 mt-1">
              {fundamentals.eps !== undefined && fundamentals.eps !== 0 ? `${quote.currency === 'USD' ? '$' : '₹'}${fundamentals.eps.toFixed(1)}` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Net profit per outstanding equity share</div>
          </div>

          {/* Free Cash Flow */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400 text-[11px] block">Free Cash Flow</span>
            <div className="text-lg font-bold text-indigo-400 mt-1">
              {fundamentals.freeCashFlow || 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Cash generated after capex deductions</div>
          </div>
        </div>
      </div>

      {/* 6. Systematic Integration Explainer */}
      <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>How Corporate Financials Influence the Consensus Signal</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          The quantitative engine incorporates <strong className="text-slate-200">15% fundamental weighting</strong> directly into the master consensus prediction. Companies with expanding profit margins (&gt;15%) and disciplined debt-to-equity (&lt;30%) receive a positive fundamental boost. Conversely, companies undergoing margin compression or elevated leverage receive negative factor deductions, preventing premature entries into debt-burdened assets.
        </p>
      </div>
    </div>
  );
};
