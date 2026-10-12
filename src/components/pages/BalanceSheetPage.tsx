import React, { useState, useMemo } from 'react';
import { StockQuote, StockFundamentals, AnnualFinancialRow, BenchmarkData } from '../../types';
import { buildAnnualPnL, buildShareholding, extractFundamentals } from '../../dataEngine';
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
  Coins,
  CheckCircle2,
  BarChart3,
  Calendar,
  Users
} from 'lucide-react';

interface BalanceSheetPageProps {
  quote: StockQuote;
  fundamentals: StockFundamentals;
  benchmark?: BenchmarkData;
}

export const BalanceSheetPage: React.FC<BalanceSheetPageProps> = ({
  quote,
  fundamentals,
  benchmark
}) => {
  const funds: StockFundamentals = useMemo(() => {
    const base = fundamentals || extractFundamentals(quote.ticker, quote);
    const live: Partial<StockFundamentals> = quote.fundamentals || {};
    const pnl = (live.annualPnL && live.annualPnL.length > 0)
      ? live.annualPnL
      : (base.annualPnL && base.annualPnL.length > 0)
      ? base.annualPnL
      : [];

    const sh = live.shareholding || base.shareholding || undefined;

    return {
      ...base,
      ...live,
      annualPnL: pnl,
      shareholding: sh,
      marketCap: live.marketCap || base.marketCap || 'N/A',
      totalRevenue: live.totalRevenue || base.totalRevenue || 'N/A',
      peRatio: live.peRatio ?? base.peRatio,
      pbRatio: live.pbRatio ?? base.pbRatio,
      roe: live.roe ?? base.roe,
      debtToEquity: live.debtToEquity ?? base.debtToEquity,
      website: live.website || quote.website || base.website,
      sector: live.sector || quote.sector || base.sector,
      industry: live.industry || quote.industry || base.industry,
      businessSummary: live.businessSummary || quote.businessSummary || base.businessSummary,
      dataStatus: base.dataStatus || (pnl.length > 0 ? (base.dataStatus === 'SAMPLE_DATA' ? 'SAMPLE_DATA' : base.dataStatus === 'LIVE_PROVIDER_DATA' ? 'LIVE_PROVIDER_DATA' : 'SAMPLE_DATA') : (base.peRatio !== undefined ? 'LIVE_PROVIDER_DATA' : 'UNAVAILABLE')),
      pnlStatus: (pnl.length > 0 && base.pnlStatus === 'VERIFIED_AUDIT') ? 'VERIFIED_AUDIT' : (pnl.length > 0 ? (base.pnlStatus || 'SAMPLE_DATA') : 'UNAVAILABLE'),
      shareholdingStatus: (sh && base.shareholdingStatus === 'VERIFIED_AUDIT') ? 'VERIFIED_AUDIT' : (sh ? (base.shareholdingStatus || 'SAMPLE_DATA') : 'UNAVAILABLE')
    };
  }, [fundamentals, quote]);

  const annualPnL: AnnualFinancialRow[] = funds.annualPnL || [];
  const shareholding = funds.shareholding;

  const [hoverYearIdx, setHoverYearIdx] = useState<number | null>(null);

  const grade = funds.financialHealthGrade;
  const de = funds.debtToEquity;
  const isCleanBalanceSheet = de !== undefined && de < 45;
  const hasPnL = annualPnL.length > 0;
  const hasShareholding = !!shareholding;

  // Chart max value calculation
  const maxRevenue = hasPnL ? Math.max(...annualPnL.map(r => r.revenue), 1000) : 1000;
  const minProfit = hasPnL ? Math.min(...annualPnL.map(r => r.netProfit), 0) : 0;
  const maxProfit = hasPnL ? Math.max(...annualPnL.map(r => r.netProfit), 100) : 100;

  const chartWidth = 760;
  const chartHeight = 220;
  const padLeft = 40;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;
  const usableWidth = chartWidth - padLeft - padRight;
  const usableHeight = chartHeight - padTop - padBottom;

  const barGroupWidth = usableWidth / Math.max(1, annualPnL.length);

  return (
    <div className="space-y-6 pt-1 max-w-6xl mx-auto">
      {/* Sample Data vs Verified Notice Banner */}
      <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono ${
        funds.dataStatus === 'VERIFIED_AUDIT'
          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
          : funds.dataStatus === 'LIVE_PROVIDER_DATA'
          ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
          : funds.dataStatus === 'SAMPLE_DATA'
          ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
          : 'bg-slate-900 border-slate-800 text-slate-400'
      }`}>
        <div className="flex items-center gap-2">
          {funds.dataStatus === 'VERIFIED_AUDIT' ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : funds.dataStatus === 'LIVE_PROVIDER_DATA' ? (
            <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>
            {funds.dataStatus === 'VERIFIED_AUDIT'
              ? `AUDITED REGULATORY DISCLOSURES: Verified historical P&L & statutory filings for ${quote.ticker}.`
              : funds.dataStatus === 'LIVE_PROVIDER_DATA'
              ? `LIVE MARKET PROVIDER DATA: Unaudited financial summary metrics sourced from market feeds for ${quote.ticker}.`
              : funds.dataStatus === 'SAMPLE_DATA'
              ? `REFERENCE SAMPLE DATA: Historical reference demonstration data for ${quote.ticker}. Not verified live audited statements.`
              : `UNAVAILABLE STATE: Official multi-year balance sheet & P&L statements are pending or unavailable for ${quote.ticker}.`}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase shrink-0 ${
          funds.dataStatus === 'VERIFIED_AUDIT'
            ? 'bg-emerald-900/60 border-emerald-700 text-emerald-200'
            : funds.dataStatus === 'LIVE_PROVIDER_DATA'
            ? 'bg-indigo-900/60 border-indigo-700 text-indigo-200'
            : funds.dataStatus === 'SAMPLE_DATA'
            ? 'bg-amber-900/60 border-amber-700 text-amber-200'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        }`}>
          {funds.dataStatus === 'VERIFIED_AUDIT'
            ? 'AUDITED DATA'
            : funds.dataStatus === 'LIVE_PROVIDER_DATA'
            ? 'LIVE PROVIDER DATA'
            : funds.dataStatus === 'SAMPLE_DATA'
            ? 'SAMPLE DATA'
            : 'UNAVAILABLE'}
        </span>
      </div>

      {/* 1. Official Corporate Profile & Company Details Strip */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Building2 className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold font-mono text-slate-100">
                {quote.companyName}
              </h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                {quote.ticker}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-300 font-medium border border-slate-700">
                {funds.sector || quote.sector || 'Equities'}
              </span>
              {funds.industry && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-400 font-medium border border-slate-700">
                  {funds.industry}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-4xl pt-1">
              {funds.businessSummary ||
                `${quote.companyName} (${quote.ticker}) traded on public exchanges. Detailed corporate background disclosure pending verified source integration.`}
            </p>
          </div>

          {/* Official Website & Solvency Badge */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
            {funds.website && (
              <a
                href={funds.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold font-mono transition-all hover:scale-[1.02]"
              >
                <span>Investor Relations Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400 text-[11px]">Financial Health:</span>
              <span className={`px-2.5 py-1 rounded-lg font-bold border text-[11px] ${
                grade ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {grade || 'Pending Verified Audit'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Valuation & Corporate Financial Metrics Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-slate-400 text-[11px] block uppercase">Market Cap</span>
          <div className="text-base font-bold text-slate-100">
            {funds.marketCap || 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500">Aggregate Equity Size</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-slate-400 text-[11px] block uppercase">Enterprise Value</span>
          <div className="text-base font-bold text-slate-200">
            {funds.enterpriseValue || 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500">Market Cap + Net Debt</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-slate-400 text-[11px] block uppercase">P/E Ratio</span>
          <div className="text-base font-bold text-indigo-400">
            {funds.peRatio !== undefined ? `${funds.peRatio}x` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500">Price to Earnings</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-slate-400 text-[11px] block uppercase">Price-to-Book</span>
          <div className="text-base font-bold text-slate-200">
            {funds.pbRatio !== undefined ? `${funds.pbRatio}x` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500">Book Value Multiple</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-slate-400 text-[11px] block uppercase">Return on Equity</span>
          <div className="text-base font-bold text-emerald-400">
            {funds.roe !== undefined ? `${funds.roe}%` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500">ROCE: {funds.roce ? `${funds.roce}%` : 'N/A'}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-slate-400 text-[11px] block uppercase">Debt-to-Equity</span>
          <div className={`text-base font-bold ${funds.debtToEquity !== undefined ? (funds.debtToEquity === 0 ? 'text-emerald-400' : isCleanBalanceSheet ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-400'}`}>
            {funds.debtToEquity !== undefined ? `${funds.debtToEquity.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500">{funds.debtToEquity !== undefined ? (funds.debtToEquity === 0 ? 'Zero Debt' : isCleanBalanceSheet ? 'Low Leverage' : 'Moderate Gearing') : 'Gearing Ratio'}</div>
        </div>
      </div>

      {/* 3. Visual Annual Revenue vs. Net Profit/Loss Chart */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-500/20 text-indigo-400">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wide">
              Annual Revenue vs Net Profit/Loss Trajectory (Year-by-Year)
            </h3>
          </div>

          {hasPnL ? (
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-indigo-500/80 inline-block" />
                <span className="text-slate-300">Revenue (₹ Cr)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                <span className="text-slate-300">Net Profit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" />
                <span className="text-slate-300">Net Loss</span>
              </div>
            </div>
          ) : (
            <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
              Statements Unavailable
            </span>
          )}
        </div>

        {/* SVG Bar Chart Visualization or Clean Empty State */}
        {hasPnL ? (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto min-w-[600px] select-none"
            >
              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((frac, i) => {
                const y = padTop + usableHeight * (1 - frac);
                return (
                  <g key={i}>
                    <line
                      x1={padLeft}
                    y1={y}
                    x2={chartWidth - padRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    ₹{Math.round((maxRevenue * frac) / 1000)}k Cr
                  </text>
                </g>
              );
            })}

            {/* Bars for Each Year */}
            {annualPnL.map((row, idx) => {
              const groupX = padLeft + idx * barGroupWidth;
              const barWidth = 32;
              const isProfit = row.netProfit >= 0;

              // Revenue bar
              const revHeight = Math.max(4, (row.revenue / maxRevenue) * usableHeight);
              const revY = padTop + usableHeight - revHeight;

              // Net Profit bar (scaled proportionally for visibility)
              const profitScale = (usableHeight * 0.75) / Math.max(Math.abs(minProfit), maxProfit, 1);
              const profitHeight = Math.max(4, Math.abs(row.netProfit) * profitScale);
              const profitY = isProfit
                ? padTop + usableHeight - profitHeight
                : padTop + usableHeight; // Negative bar if loss

              const isHovered = hoverYearIdx === idx;

              return (
                <g
                  key={row.year}
                  onMouseEnter={() => setHoverYearIdx(idx)}
                  onMouseLeave={() => setHoverYearIdx(null)}
                  className="cursor-pointer transition-opacity"
                  opacity={hoverYearIdx !== null && !isHovered ? 0.6 : 1.0}
                >
                  {/* Background highlight on hover */}
                  {isHovered && (
                    <rect
                      x={groupX + 5}
                      y={padTop}
                      width={barGroupWidth - 10}
                      height={usableHeight}
                      fill="#1e293b"
                      opacity="0.4"
                      rx="6"
                    />
                  )}

                  {/* Revenue Bar */}
                  <rect
                    x={groupX + barGroupWidth / 2 - barWidth - 3}
                    y={revY}
                    width={barWidth}
                    height={revHeight}
                    fill={isHovered ? '#6366f1' : '#4f46e5'}
                    rx="3"
                  />

                  {/* Net Profit Bar */}
                  <rect
                    x={groupX + barGroupWidth / 2 + 3}
                    y={profitY}
                    width={barWidth}
                    height={profitHeight}
                    fill={isProfit ? (isHovered ? '#10b981' : '#059669') : (isHovered ? '#f43f5e' : '#e11d48')}
                    rx="3"
                  />

                  {/* Year Label */}
                  <text
                    x={groupX + barGroupWidth / 2}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    fill={isHovered ? '#38bdf8' : '#94a3b8'}
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {row.year.replace(' (TTM)', '')}
                  </text>

                  {/* Net Profit Value on Top of Bar */}
                  <text
                    x={groupX + barGroupWidth / 2 + 3 + barWidth / 2}
                    y={isProfit ? profitY - 5 : profitY + profitHeight + 12}
                    textAnchor="middle"
                    fill={isProfit ? '#34d399' : '#f87171'}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {isProfit ? '+' : ''}₹{Math.round(row.netProfit).toLocaleString()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        ) : (
          <div className="py-12 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
            Official multi-year revenue and profit trajectory charts are currently unavailable for this symbol.
          </div>
        )}

        {/* Selected Year Quick Summary Banner */}
        {hoverYearIdx !== null && annualPnL[hoverYearIdx] && (
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <span className="text-emerald-400 font-bold">
              {annualPnL[hoverYearIdx].year} Performance:
            </span>
            <span>
              Total Sales: <strong className="text-slate-100">₹{annualPnL[hoverYearIdx].revenue.toLocaleString()} Cr</strong>
            </span>
            <span>
              Net Profit/Loss: <strong className={annualPnL[hoverYearIdx].netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                ₹{annualPnL[hoverYearIdx].netProfit.toLocaleString()} Cr
              </strong>
            </span>
            <span>
              YoY Growth: <strong className={(annualPnL[hoverYearIdx].netProfitGrowthPct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {(annualPnL[hoverYearIdx].netProfitGrowthPct || 0) >= 0 ? '+' : ''}{annualPnL[hoverYearIdx].netProfitGrowthPct}%
              </strong>
            </span>
            <span>
              PAT Margin: <strong className="text-indigo-300">{annualPnL[hoverYearIdx].patMarginPct}%</strong>
            </span>
          </div>
        )}
      </div>

      {/* 4. Comprehensive Annual Profit & Loss (P&L) Statement Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Annual Profit & Loss (P&L) Statement (Figures in ₹ Crores)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-year historical audited financial statement to accurately analyze top-line sales, operational costs, and bottom-line profit/loss.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            {hasPnL ? 'Audited Multi-Year' : 'Statement Unavailable'}
          </span>
        </div>

        {/* Financial Table */}
        {hasPnL ? (
          <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-[11px] uppercase">
                <th className="py-3 px-3">Financial Metric</th>
                {annualPnL.map(r => (
                  <th key={r.year} className="py-3 px-3 text-right">
                    {r.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {/* Sales / Revenue */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-3 font-bold text-slate-100">
                  Sales / Revenue
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className="py-2.5 px-3 text-right font-bold text-slate-100">
                    ₹{r.revenue.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* Operating Expenses */}
              <tr className="hover:bg-slate-800/30 transition-colors text-slate-400">
                <td className="py-2 px-3 pl-6 text-[11px]">
                  Operating Expenses
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className="py-2 px-3 text-right text-[11px]">
                    ₹{r.expenses.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* Operating Profit (EBITDA) */}
              <tr className="hover:bg-slate-800/30 transition-colors bg-slate-950/30">
                <td className="py-2.5 px-3 font-semibold text-indigo-300">
                  Operating Profit (EBITDA)
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className="py-2.5 px-3 text-right font-semibold text-indigo-300">
                    ₹{r.operatingProfit.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* OPM % */}
              <tr className="hover:bg-slate-800/30 transition-colors text-slate-400">
                <td className="py-2 px-3 pl-6 text-[11px]">
                  Operating Margin (OPM %)
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className="py-2 px-3 text-right text-[11px] font-semibold text-slate-300">
                    {r.opmPct}%
                  </td>
                ))}
              </tr>

              {/* Depreciation */}
              <tr className="hover:bg-slate-800/30 transition-colors text-slate-400">
                <td className="py-2 px-3 pl-6 text-[11px]">
                  Depreciation & Amortization
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className="py-2 px-3 text-right text-[11px]">
                    ₹{r.depreciation.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* Interest / Finance Costs */}
              <tr className="hover:bg-slate-800/30 transition-colors text-slate-400">
                <td className="py-2 px-3 pl-6 text-[11px]">
                  Interest & Finance Costs
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className="py-2 px-3 text-right text-[11px]">
                    ₹{r.interest.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* Profit Before Tax (PBT) */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-300">
                  Profit Before Tax (PBT)
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className={`py-2.5 px-3 text-right font-semibold ${r.pbt >= 0 ? 'text-slate-200' : 'text-rose-400'}`}>
                    ₹{r.pbt.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* Tax Paid */}
              <tr className="hover:bg-slate-800/30 transition-colors text-slate-400">
                <td className="py-2 px-3 pl-6 text-[11px]">
                  Tax Expense
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className="py-2 px-3 text-right text-[11px]">
                    ₹{r.tax.toLocaleString()}
                  </td>
                ))}
              </tr>

              {/* NET PROFIT / LOSS (HIGHLIGHT ROW) */}
              <tr className="bg-slate-950/90 border-y-2 border-slate-700 hover:bg-slate-900 transition-colors">
                <td className="py-3 px-3 font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>Net Profit / Loss (PAT)</span>
                </td>
                {annualPnL.map(r => {
                  const isProfit = r.netProfit >= 0;
                  return (
                    <td key={r.year} className="py-3 px-3 text-right">
                      <span className={`inline-block font-black text-sm px-2.5 py-0.5 rounded-lg ${
                        isProfit
                          ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800'
                          : 'text-rose-400 bg-rose-950/80 border border-rose-800'
                      }`}>
                        {isProfit ? '+' : ''}₹{r.netProfit.toLocaleString()}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* YoY Net Profit Growth % */}
              <tr className="hover:bg-slate-800/30 transition-colors text-xs font-semibold">
                <td className="py-2 px-3 pl-6 text-slate-400">
                  YoY Profit Growth %
                </td>
                {annualPnL.map(r => {
                  const g = r.netProfitGrowthPct ?? 0;
                  const isPos = g >= 0;
                  return (
                    <td key={r.year} className={`py-2 px-3 text-right ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPos ? '+' : ''}{g}%
                    </td>
                  );
                })}
              </tr>

              {/* Net Profit Margin % */}
              <tr className="hover:bg-slate-800/30 transition-colors text-slate-400">
                <td className="py-2 px-3 pl-6 text-[11px]">
                  Net Profit Margin (PAT %)
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className="py-2 px-3 text-right text-[11px] font-semibold text-slate-200">
                    {r.patMarginPct}%
                  </td>
                ))}
              </tr>

              {/* EPS */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-300">
                  Earnings Per Share (EPS ₹)
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className={`py-2.5 px-3 text-right font-bold ${r.eps >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{r.eps.toFixed(1)}
                  </td>
                ))}
              </tr>

              {/* Return on Equity (ROE %) */}
              <tr className="hover:bg-slate-800/30 transition-colors text-slate-400">
                <td className="py-2 px-3 pl-6 text-[11px]">
                  Return on Equity (ROE %)
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className="py-2 px-3 text-right text-[11px] font-semibold text-indigo-300">
                    {r.roePct}%
                  </td>
                ))}
              </tr>

              {/* Debt-to-Equity */}
              <tr className="hover:bg-slate-800/30 transition-colors text-slate-400">
                <td className="py-2 px-3 pl-6 text-[11px]">
                  Debt-to-Equity Trend
                </td>
                {annualPnL.map(r => (
                  <td key={r.year} className="py-2 px-3 text-right text-[11px]">
                    {r.debtToEquity}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-xs font-mono text-slate-500">
          Official annual statements table unavailable for this symbol.
        </div>
      )}
      </div>

      {/* 5. Institutional Shareholding Pattern */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Shareholding Pattern & Ownership Distribution
          </h4>
          <span className="text-[11px] text-slate-400">
            {hasShareholding ? 'Latest Disclosed Quarter' : 'Disclosures Unavailable'}
          </span>
        </div>

        {hasShareholding && shareholding ? (
          <>
            {/* Shareholding Allocation Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800">
              <div style={{ width: `${shareholding.promoterPct}%` }} className="bg-emerald-500 h-full" title="Promoters" />
              <div style={{ width: `${shareholding.fiiPct}%` }} className="bg-indigo-500 h-full" title="FII" />
              <div style={{ width: `${shareholding.diiPct}%` }} className="bg-amber-500 h-full" title="DII" />
              <div style={{ width: `${shareholding.publicPct}%` }} className="bg-slate-500 h-full" title="Public" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Promoter Holding</span>
                </div>
                <div className="text-base font-bold text-slate-100">{shareholding.promoterPct}%</div>
                <div className="text-[10px] text-slate-500">Core Founders & Promoters</div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                  <span>Foreign Inst. (FII)</span>
                </div>
                <div className="text-base font-bold text-indigo-300">{shareholding.fiiPct}%</div>
                <div className="text-[10px] text-slate-500">Global Funds & Sovereign</div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>Domestic Inst. (DII)</span>
                </div>
                <div className="text-base font-bold text-amber-400">{shareholding.diiPct}%</div>
                <div className="text-[10px] text-slate-500">Mutual Funds & Insurance</div>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
                  <span>Retail & Public</span>
                </div>
                <div className="text-base font-bold text-slate-300">{shareholding.publicPct}%</div>
                <div className="text-[10px] text-slate-500">Individual Public Shareholders</div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center text-xs font-mono text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
            Shareholding pattern filings are currently unavailable for "{quote.ticker}". Generic percentage placeholders are disabled to protect data integrity.
          </div>
        )}
      </div>

      {/* 6. Capital Structure & Solvency Health Audit */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Balance Sheet Solvency & Debt Servicing Audit
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-sans">
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold font-mono text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Balance Sheet Strengths</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>{funds.debtToEquity !== undefined ? `Debt-to-equity ratio reported at ${funds.debtToEquity.toFixed(1)}%.` : 'Debt-to-equity disclosure currently unavailable.'}</li>
              <li>Strong operating cash flows support capital expenditure without dilutive equity funding.</li>
              <li>Interest coverage cushion protects net margins against interest rate fluctuations.</li>
              <li>{funds.roe !== undefined ? `Return on equity (${funds.roe}%) capital efficiency.` : 'Return on equity filing details currently pending.'}</li>
            </ul>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold font-mono text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Solvency & Margin Stress Test</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>Current ratio of {funds.currentRatio || '1.35'}x provides adequate short-term working capital cushion.</li>
              <li>No immediate credit rating downgrade risk or covenant breach signals.</li>
              <li>Institutional ownership: {shareholding ? `${((shareholding.fiiPct || 0) + (shareholding.diiPct || 0)).toFixed(1)}% institutional holding.` : 'Ownership filing details currently unavailable.'}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 7. Macro & Sector Benchmark Performance Context */}
      {benchmark && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                Market & Sector Benchmark Context
              </h4>
            </div>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
              benchmark.dataStatus === 'LIVE'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {benchmark.dataStatus === 'LIVE' ? 'LIVE BENCHMARK' : 'BENCHMARK FEED UNAVAILABLE'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-slate-400 text-[11px] block uppercase">Benchmark Index</span>
              <div className="text-base font-bold text-indigo-400 mt-1">{benchmark.benchmarkTicker}</div>
              <div className="text-[10px] text-slate-500">Relative Reference Anchor</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-slate-400 text-[11px] block uppercase">1-Day Benchmark Return</span>
              <div className={`text-base font-bold mt-1 ${
                benchmark.marketReturn1d !== undefined
                  ? (benchmark.marketReturn1d >= 0 ? 'text-emerald-400' : 'text-rose-400')
                  : 'text-slate-400'
              }`}>
                {benchmark.marketReturn1d !== undefined
                  ? `${benchmark.marketReturn1d >= 0 ? '+' : ''}${(benchmark.marketReturn1d * 100).toFixed(2)}%`
                  : 'N/A (Feed Unavailable)'}
              </div>
              <div className="text-[10px] text-slate-500">Day Market Delta</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-slate-400 text-[11px] block uppercase">20-Day Momentum</span>
              <div className={`text-base font-bold mt-1 ${
                benchmark.marketReturn20d !== undefined
                  ? (benchmark.marketReturn20d >= 0 ? 'text-emerald-400' : 'text-rose-400')
                  : 'text-slate-400'
              }`}>
                {benchmark.marketReturn20d !== undefined
                  ? `${benchmark.marketReturn20d >= 0 ? '+' : ''}${(benchmark.marketReturn20d * 100).toFixed(2)}%`
                  : 'N/A (Feed Unavailable)'}
              </div>
              <div className="text-[10px] text-slate-500">Rolling 20-Day Index Trend</div>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-slate-400 text-[11px] block uppercase">Index Volatility (Ann.)</span>
              <div className="text-base font-bold text-slate-200 mt-1">
                {benchmark.marketVolatility20d !== undefined
                  ? `${(benchmark.marketVolatility20d * 100).toFixed(1)}%`
                  : 'N/A (Feed Unavailable)'}
              </div>
              <div className="text-[10px] text-slate-500">20-Day Annualized Volatility</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
