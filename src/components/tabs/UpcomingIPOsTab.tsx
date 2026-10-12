import React, { useState } from 'react';
import { IPODetails } from '../../types';
import { UPCOMING_IPOS_CATALOG, searchIPOs } from '../../ipoCatalog';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Search,
  PieChart,
  Percent,
  Layers,
  FileText,
  Flame,
  Award
} from 'lucide-react';

export const UpcomingIPOsTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'UPCOMING' | 'OPEN_NOW' | 'LISTED' | 'SME'>('ALL');
  const [selectedIPO, setSelectedIPO] = useState<IPODetails>(UPCOMING_IPOS_CATALOG[0]);

  const filteredIPOs = searchIPOs(searchQuery).filter(ipo => {
    if (filterStatus === 'UPCOMING') return ipo.status === 'UPCOMING';
    if (filterStatus === 'OPEN_NOW') return ipo.status === 'OPEN NOW';
    if (filterStatus === 'LISTED') return ipo.status === 'LISTED';
    if (filterStatus === 'SME') return ipo.ipoType === 'SME';
    return true;
  });

  const activeIPO = filteredIPOs.find(i => i.id === selectedIPO?.id) || filteredIPOs[0] || null;

  const getVerdictStyle = (verdict?: string) => {
    switch (verdict) {
      case 'HISTORICAL FILING':
        return {
          bg: 'bg-blue-950/80 border-blue-700/80 text-blue-300',
          badge: 'bg-blue-500 text-slate-950 font-black',
          bar: 'bg-blue-500'
        };
      case 'REFERENCE DISCLOSURE':
        return {
          bg: 'bg-slate-950/80 border-slate-700/80 text-slate-300',
          badge: 'bg-slate-700 text-slate-200 font-bold',
          bar: 'bg-slate-700'
        };
      case 'STRONG APPLY':
        return {
          bg: 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300',
          badge: 'bg-emerald-500 text-slate-950 font-black',
          bar: 'bg-emerald-500'
        };
      case 'APPLY FOR LISTING GAINS':
        return {
          bg: 'bg-indigo-950/80 border-indigo-700/80 text-indigo-300',
          badge: 'bg-indigo-500 text-slate-950 font-black',
          bar: 'bg-indigo-500'
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-700 text-slate-300',
          badge: 'bg-slate-800 text-slate-300 font-bold',
          bar: 'bg-slate-700'
        };
    }
  };

  const isProfitable = activeIPO ? activeIPO.netProfitLossCr > 0 : false;
  const isFreshHeavy = activeIPO ? activeIPO.freshIssueCr >= activeIPO.ofsCr : false;

  return (
    <div className="space-y-6 pt-2">
      {/* 1. Header Banner & Key Stats */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-100 font-mono">
                IPO Intelligence & Quantitative Audit
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Verified Indian primary market pipeline and historical exchange disclosures. Separated into Upcoming DRHP Filings, Currently Open Issues, and Recently Listed issues. (Reference dataset with verified statutory disclosures).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-800 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              {UPCOMING_IPOS_CATALOG.length} Tracked Disclosures
            </span>
          </div>
        </div>

        {/* 4 Quick Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 text-[11px] block">Recently Listed</span>
            <div className="text-lg font-bold text-blue-400 mt-0.5">
              {UPCOMING_IPOS_CATALOG.filter(i => i.status === 'LISTED').length} Issues
            </div>
            <div className="text-[10px] text-slate-500">Verified NSE/BSE listed</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 text-[11px] block">Upcoming DRHP Filings</span>
            <div className="text-lg font-bold text-slate-100 mt-0.5">
              {UPCOMING_IPOS_CATALOG.filter(i => i.status === 'UPCOMING').length} Drafts
            </div>
            <div className="text-[10px] text-slate-500">Awaiting SEBI clearance</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 text-[11px] block">Currently Open</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {UPCOMING_IPOS_CATALOG.filter(i => i.status === 'OPEN NOW').length} Active
            </div>
            <div className="text-[10px] text-slate-500">Active bidding window</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
            <span className="text-slate-400 text-[11px] block">Exchange Disclosures</span>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">NSE / BSE</div>
            <div className="text-[10px] text-slate-500">Official regulatory filing data</div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search IPOs (e.g. Swiggy, Hyundai, NSDL)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'ALL'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All ({UPCOMING_IPOS_CATALOG.length})
          </button>
          <button
            onClick={() => setFilterStatus('UPCOMING')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'UPCOMING'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Upcoming IPOs ({UPCOMING_IPOS_CATALOG.filter(i => i.status === 'UPCOMING').length})
          </button>
          <button
            onClick={() => setFilterStatus('OPEN_NOW')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'OPEN_NOW'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Currently Open ({UPCOMING_IPOS_CATALOG.filter(i => i.status === 'OPEN NOW').length})
          </button>
          <button
            onClick={() => setFilterStatus('LISTED')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'LISTED'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Recently Listed ({UPCOMING_IPOS_CATALOG.filter(i => i.status === 'LISTED').length})
          </button>
          <button
            onClick={() => setFilterStatus('SME')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'SME'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            SME ({UPCOMING_IPOS_CATALOG.filter(i => i.ipoType === 'SME').length})
          </button>
        </div>
      </div>

      {/* 3. Main Master/Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: IPO Cards List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
            <span>Listing Pipeline ({filteredIPOs.length})</span>
            <span className="text-[10px] text-slate-500 font-normal">Click to test background</span>
          </h4>

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {filteredIPOs.length > 0 ? (
              filteredIPOs.map(ipo => {
                const isSelected = activeIPO.id === ipo.id;
                const vStyle = getVerdictStyle(ipo.verdict);
                return (
                  <div
                    key={ipo.id}
                    onClick={() => setSelectedIPO(ipo)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 text-xs ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                        : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-100 text-sm">{ipo.companyName}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                            ipo.ipoType === 'SME'
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {ipo.ipoType || 'Mainboard'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300">{ipo.symbol}</span>
                          <span>·</span>
                          <span>Open: <strong className="text-slate-200">{ipo.openDate}</strong></span>
                          <span>·</span>
                          <span>{ipo.sector}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${
                          ipo.status === 'OPEN NOW'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-700 animate-pulse'
                            : ipo.status === 'LISTED'
                            ? 'bg-blue-950 text-blue-400 border-blue-800'
                            : 'bg-amber-950/80 text-amber-300 border-amber-800'
                        }`}
                      >
                        {ipo.status === 'LISTED' ? 'RECENTLY LISTED' : ipo.status}
                      </span>
                    </div>

                    {/* Price & Issue Details */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/70 font-mono text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Price Band</span>
                        <span className="font-bold text-slate-200">{ipo.priceBand}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Issue Size</span>
                        <span className="font-bold text-slate-200">₹{ipo.issueSizeCr.toLocaleString()} Cr</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">
                          {ipo.status === 'LISTED' ? 'Listing Debut' : 'Filing Stage'}
                        </span>
                        <span className={`font-bold ${ipo.status === 'LISTED' ? 'text-blue-400' : 'text-amber-400'}`}>
                          {ipo.status === 'LISTED' ? (ipo.listingPrice ? `₹${ipo.listingPrice}` : `Listed ${ipo.listingDate}`) : 'DRHP Clearance'}
                        </span>
                      </div>
                    </div>

                    {/* Verdict Badge Mini */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${vStyle.badge}`}>
                        {ipo.verdict || 'STATUTORY RECORD'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {ipo.exchange}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs font-mono text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto" />
                <p className="font-semibold text-slate-200">
                  {filterStatus === 'OPEN_NOW'
                    ? 'No IPOs Currently Open For Subscription'
                    : filterStatus === 'UPCOMING'
                    ? 'No Live Upcoming Schedules Declared'
                    : 'No IPO records match this filter.'}
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  {filterStatus === 'OPEN_NOW'
                    ? 'Official primary market bidding on NSE/BSE occurs strictly during notified exchange hours (10:00 AM – 5:00 PM IST on bidding days).'
                    : 'Upcoming issues require finalized SEBI approval and exchange notifications.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Deep Background Testing & Audit Panel (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5">
          {activeIPO ? (
            <>
              {/* Company Title & External Website */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-100 font-mono">
                  {activeIPO.companyName}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  activeIPO.ipoType === 'SME'
                    ? 'bg-purple-950 text-purple-300 border-purple-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {activeIPO.ipoType || 'Mainboard'} IPO
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                {activeIPO.symbol} · {activeIPO.exchange} · Open: <strong className="text-slate-200">{activeIPO.openDate}</strong> · {activeIPO.industry}
              </div>
            </div>

            {activeIPO.website && (
              <a
                href={activeIPO.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold transition-all shrink-0"
              >
                <span>Official Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Master Quantitative Verdict Banner */}
          <div className={`p-4 rounded-xl border ${getVerdictStyle(activeIPO.verdict).bg} space-y-2`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Statutory Regulatory Summary
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-xs ${getVerdictStyle(activeIPO.verdict).badge}`}>
                {activeIPO.verdict || 'OFFICIAL DISCLOSURE'}
              </span>
            </div>

            <div className="text-lg font-bold font-mono tracking-tight text-slate-100">
              {activeIPO.status === 'LISTED'
                ? `Historical Exchange Filing · Listed on ${activeIPO.listingDate}`
                : `DRHP Draft Prospectus Filed with SEBI`}
            </div>

            <p className="text-xs leading-relaxed opacity-90 font-sans">
              <strong>Regulatory Prospectus Summary: </strong>
              {activeIPO.verdictRationale}
            </p>

            <div className="flex items-center gap-4 text-xs font-mono pt-1">
              <span>Status: <strong className="uppercase">{activeIPO.status}</strong></span>
              <span>Retail Lot: <strong>{activeIPO.lotSize > 0 ? `${activeIPO.lotSize} Shares (₹${activeIPO.minInvestment.toLocaleString()})` : 'Pending Price Band Notice'}</strong></span>
            </div>
          </div>

          {/* 1. Business Model & Operations */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-400" />
              1. Business Model & Core Operations
            </h5>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              {activeIPO.businessSummary}
            </p>
          </div>

          {/* 2. Financial Background Audit (P&L & Solvency) */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              2. Financial Statement Disclosures (P&L & Debt Obligations)
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
              {/* Annual Revenue */}
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Annual Sales</span>
                <div className="text-base font-bold text-slate-100 mt-0.5">
                  ₹{activeIPO.annualRevenueCr.toLocaleString()} Cr
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">
                  {activeIPO.revenueYoYGrowthPct !== 0 ? `${activeIPO.revenueYoYGrowthPct > 0 ? '+' : ''}${activeIPO.revenueYoYGrowthPct}% YoY` : 'Audited Year'}
                </div>
              </div>

              {/* Net Profit / Loss */}
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Net Profit / Loss (PAT)</span>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    isProfitable ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isProfitable ? `₹${activeIPO.netProfitLossCr} Cr` : `-₹${Math.abs(activeIPO.netProfitLossCr)} Cr`}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Margin: {activeIPO.profitMarginPct.toFixed(1)}%
                </div>
              </div>

              {/* Debt to Equity */}
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Debt / Equity</span>
                <div
                  className={`text-base font-bold mt-0.5 ${
                    activeIPO.debtToEquity < 50 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {activeIPO.debtToEquity}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {activeIPO.debtToEquity < 30 ? 'Pristine balance sheet' : 'Capital gearing'}
                </div>
              </div>

              {/* Valuation P/E vs Peers */}
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Issue P/E vs Peers</span>
                <div className="text-base font-bold text-slate-100 mt-0.5">
                  {activeIPO.postIssuePe > 0 ? `${activeIPO.postIssuePe}x` : 'N/A (Loss/DRHP)'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {activeIPO.peerAveragePe > 0 ? `Peers: ${activeIPO.peerAveragePe}x` : 'Peers: Disclosed in RHP'}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Issue Structure: Fresh Capital vs Promoters OFS */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              3. Issue Structure: Capital Allocation
            </h5>
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-xs">
                <span>
                  Fresh Issue: <strong className="text-emerald-400">₹{activeIPO.freshIssueCr.toLocaleString()} Cr</strong> (Company Expansion)
                </span>
                <span>
                  Offer For Sale: <strong className="text-rose-400">₹{activeIPO.ofsCr.toLocaleString()} Cr</strong> (Promoter/Investor OFS)
                </span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${
                      activeIPO.issueSizeCr > 0
                        ? Math.round((activeIPO.freshIssueCr / activeIPO.issueSizeCr) * 100)
                        : 0
                    }%`
                  }}
                  className="bg-emerald-500 transition-all"
                  title="Fresh Issue"
                />
                <div
                  style={{
                    width: `${
                      activeIPO.issueSizeCr > 0
                        ? Math.round((activeIPO.ofsCr / activeIPO.issueSizeCr) * 100)
                        : 100
                    }%`
                  }}
                  className="bg-rose-500 transition-all"
                  title="Offer for Sale"
                />
              </div>
              <div className="text-[11px] text-slate-400 font-sans mt-1">
                {isFreshHeavy
                  ? '✓ Fresh Capital Priority: Greater portion of issue proceeds funds balance sheet expansion.'
                  : '⚠ OFS Component: Capital proceeds flow primarily to selling shareholders.'}
              </div>
            </div>
          </div>

          {/* 4. Audited Strengths vs Red Flags / Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            {/* Core Strengths */}
            <div className="bg-emerald-950/20 border border-emerald-900/60 p-3.5 rounded-xl space-y-2">
              <h6 className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Key Disclosed Strengths
              </h6>
              <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                {activeIPO.strengths.map((str, i) => (
                  <li key={i}>{str}</li>
                ))}
              </ul>
            </div>

            {/* Red Flags / Risks */}
            <div className="bg-rose-950/20 border border-rose-900/60 p-3.5 rounded-xl space-y-2">
              <h6 className="font-bold text-rose-400 font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Key Disclosed Risks & Downside Factors
              </h6>
              <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                {activeIPO.redFlags.map((rf, i) => (
                  <li key={i}>{rf}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5. Institutional Listing-Day Playbook (Execution Strategy) */}
          {activeIPO.listingDayPlaybook && (
            <div className="p-4 bg-slate-950/70 border border-indigo-900/60 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h6 className="text-xs font-bold text-slate-100 font-mono flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-indigo-400" />
                  Listing Day Execution Playbook (10:00 AM Market Open Strategy)
                </h6>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Institutional Directive
                </span>
              </div>

              <div className="space-y-2 text-xs font-sans">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-mono text-emerald-400 font-bold block text-[11px] uppercase">
                    Scenario A · If Opens at Premium:
                  </span>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    {activeIPO.listingDayPlaybook.ifOpensPremium}
                  </p>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-mono text-rose-400 font-bold block text-[11px] uppercase">
                    Scenario B · If Opens Flat or at Discount:
                  </span>
                  <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                    {activeIPO.listingDayPlaybook.ifOpensFlat}
                  </p>
                </div>

                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  <strong>Risk & Supply Warning: </strong>
                  {activeIPO.listingDayPlaybook.trailStopLossRule}
                </div>
              </div>
            </div>
          )}

          {/* 6. Institutional Anchor Book & Valuation Matrix */}
          {(activeIPO.anchorBook || activeIPO.valuationMatrix) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
              {/* Anchor Book */}
              {activeIPO.anchorBook && (
                <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 font-mono">QIB Anchor Book</span>
                    <span className="font-mono text-emerald-400 font-bold">₹{activeIPO.anchorBook.totalCr.toLocaleString()} Cr</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Marquee Institutions:
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activeIPO.anchorBook.marqueeInvestors.map((inv, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[10px]">
                          {inv}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/80">
                    Lock-in Expiry: 50% on {activeIPO.anchorBook.lockin30dDate} · 50% on {activeIPO.anchorBook.lockin90dDate}
                  </div>
                </div>
              )}

              {/* Valuation & Fair Value Matrix */}
              {activeIPO.valuationMatrix && (
                <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">DCF Fair Value</span>
                    <span className="text-emerald-400 font-bold">₹{activeIPO.valuationMatrix.fairValueEst}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center pt-1 text-[10px]">
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <span className="text-slate-500 block">Safety Margin</span>
                      <span className={`font-bold ${activeIPO.valuationMatrix.marginOfSafetyPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeIPO.valuationMatrix.marginOfSafetyPct >= 0 ? '+' : ''}{activeIPO.valuationMatrix.marginOfSafetyPct}%
                      </span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <span className="text-slate-500 block">EV/EBITDA</span>
                      <span className="font-bold text-slate-200">{activeIPO.valuationMatrix.evToEbitda}x</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <span className="text-slate-500 block">P/Sales</span>
                      <span className="font-bold text-slate-200">{activeIPO.valuationMatrix.priceToSales}x</span>
                    </div>
                  </div>
                  {activeIPO.biddingCategoryStrategy && (
                    <div className="text-[10px] text-slate-400 font-sans pt-1 border-t border-slate-800/80">
                      Allotment Probability: <strong className="text-indigo-400 font-mono">{activeIPO.biddingCategoryStrategy.allotmentOdds}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 7. Multi-Day GMP Trend History */}
          {activeIPO.gmpHistory && activeIPO.gmpHistory.length > 0 && (
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2 font-mono text-xs">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Grey Market Premium (GMP) Multi-Day Trend
              </span>
              <div className="grid grid-cols-4 gap-2">
                {activeIPO.gmpHistory.map((step, idx) => (
                  <div key={idx} className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg text-center">
                    <span className="text-[10px] text-slate-500 block">{step.date}</span>
                    <span className={`font-bold text-xs ${step.gmpPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {step.gmpPct >= 0 ? '+' : ''}{step.gmpPct}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">(₹{step.gmpPrice})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. Subscription Multiples & Dates */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono gap-2 text-slate-400">
            <div>
              Open: <strong className="text-slate-200">{activeIPO.openDate}</strong> · Close: <strong className="text-slate-200">{activeIPO.closeDate}</strong> · Listing: <strong className="text-slate-200">{activeIPO.listingDate}</strong>
            </div>
            <div className="flex items-center gap-2">
              <span>Subscription Total:</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                {activeIPO.subscription?.total ? `${activeIPO.subscription.total}x` : 'N/A (Filing pending)'}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="py-24 text-center text-xs font-mono text-slate-400 space-y-3">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-slate-200 font-bold text-sm">
            {filterStatus === 'OPEN_NOW'
              ? 'No IPOs Currently Open'
              : filterStatus === 'UPCOMING'
              ? 'No Upcoming Exchange Schedules Declared'
              : 'No IPO Selected'}
          </div>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
            {filterStatus === 'OPEN_NOW'
              ? 'Official primary market bidding on NSE/BSE occurs strictly during notified exchange hours (10:00 AM – 5:00 PM IST on bidding days).'
              : filterStatus === 'UPCOMING'
              ? 'Upcoming issues require finalized SEBI approval and exchange notifications. Switch to "Recently Listed" to view verified historical offerings.'
              : 'Select an IPO from the pipeline to review detailed prospectus filings and metrics.'}
          </p>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
