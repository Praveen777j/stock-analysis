import React, { useState, useEffect } from 'react';
import { IPODetails, IPOStatus } from '../../types';
import { IPO_CATALOG_DISCLOSURE } from '../../ipoCatalog';
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
  Award,
  Activity,
  Info,
  Clock,
  Radio
} from 'lucide-react';

export const UpcomingIPOsTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | 'UPCOMING' | 'OPEN_NOW' | 'CLOSED_PENDING' | 'ALLOTMENT_DONE' | 'LISTED' | 'DRAFT' | 'SME'
  >('ALL');
  const [ipos, setIpos] = useState<IPODetails[]>([]);
  const [selectedIPO, setSelectedIPO] = useState<IPODetails | null>(null);
  const [dataStatus, setDataStatus] = useState<string>('LOADING');
  const [isLoading, setIsLoading] = useState(true);

  // Categorize every IPO into exactly one bucket so counters sum to total list count
  const getIpoBucket = (ipo: IPODetails): 'OPEN' | 'PENDING' | 'ALLOTMENT_DONE' | 'UPCOMING' | 'LISTED' | 'DRAFT' => {
    const status = ipo.status;
    const openDate = (ipo.openDate || '').toLowerCase();
    if (status === 'Draft / DRHP' || status === 'Draft DRHP' || status === 'Unverified' || openDate.includes('drhp') || openDate.includes('draft')) {
      return 'DRAFT';
    }
    if (status === 'Open' || status === 'OPEN NOW') return 'OPEN';
    if (status === 'Closed (allotment pending)' || status === 'CLOSED') return 'PENDING';
    if (status === 'Allotment done') return 'ALLOTMENT_DONE';
    if (status === 'Upcoming' || status === 'UPCOMING') return 'UPCOMING';
    if (status === 'Listed' || status === 'LISTED' || ipo.isHistorical) return 'LISTED';
    return 'DRAFT';
  };

  const getReferenceUrl = (ipo: IPODetails) => {
    const text = `${ipo.name || ''} ${ipo.companyName || ''} ${ipo.symbol || ''}`.toLowerCase();
    if (text.includes('bombay coated') || text.includes('bombaycoat') || ipo.status === 'Open' || ipo.status === 'OPEN NOW') {
      return 'https://www.nseindia.com/market-data/current-issues';
    }
    return ipo.sourceUrl || 'https://www.nseindia.com/market-data/all-upcoming-issues';
  };

  useEffect(() => {
    let isMounted = true;
    async function loadIPOs() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/ipos');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const list = Array.isArray(data.ipos) ? data.ipos : [];
            setIpos(list);
            setDataStatus(data.dataStatus || (list.length > 0 ? 'LIVE_EXCHANGE_DATA' : 'UNAVAILABLE'));
            if (list.length > 0) {
              setSelectedIPO(prev => {
                const found = list.find((i: IPODetails) => i.id === prev?.id);
                return found || list[0];
              });
            } else {
              setSelectedIPO(null);
            }
          }
        } else {
          if (isMounted) {
            setIpos([]);
            setDataStatus('UNAVAILABLE');
            setSelectedIPO(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setIpos([]);
          setDataStatus('UNAVAILABLE');
          setSelectedIPO(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadIPOs();
    return () => { isMounted = false; };
  }, []);

  const openCount = ipos.filter(i => getIpoBucket(i) === 'OPEN').length;
  const pendingCount = ipos.filter(i => getIpoBucket(i) === 'PENDING').length;
  const allotmentDoneCount = ipos.filter(i => getIpoBucket(i) === 'ALLOTMENT_DONE').length;
  const upcomingCount = ipos.filter(i => getIpoBucket(i) === 'UPCOMING').length;
  const listedCount = ipos.filter(i => getIpoBucket(i) === 'LISTED').length;
  const draftCount = ipos.filter(i => getIpoBucket(i) === 'DRAFT').length;

  const filteredIPOs = ipos.filter(ipo => {
    const q = searchQuery.trim().toLowerCase();
    const name = (ipo.name || ipo.companyName || '').toLowerCase();
    const symbol = (ipo.symbol || '').toLowerCase();
    const sector = (ipo.sector || '').toLowerCase();
    const industry = (ipo.industry || '').toLowerCase();

    const matchesQuery = !q ||
      name.includes(q) ||
      symbol.includes(q) ||
      sector.includes(q) ||
      industry.includes(q);

    if (!matchesQuery) return false;
    if (filterStatus === 'UPCOMING') return getIpoBucket(ipo) === 'UPCOMING';
    if (filterStatus === 'OPEN_NOW') return getIpoBucket(ipo) === 'OPEN';
    if (filterStatus === 'CLOSED_PENDING') return getIpoBucket(ipo) === 'PENDING';
    if (filterStatus === 'ALLOTMENT_DONE') return getIpoBucket(ipo) === 'ALLOTMENT_DONE';
    if (filterStatus === 'LISTED') return getIpoBucket(ipo) === 'LISTED';
    if (filterStatus === 'DRAFT') return getIpoBucket(ipo) === 'DRAFT';
    if (filterStatus === 'SME') return ipo.market === 'SME' || ipo.ipoType === 'SME';
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Open':
      case 'OPEN NOW':
        return 'bg-emerald-950 text-emerald-400 border-emerald-700 animate-pulse';
      case 'Upcoming':
      case 'UPCOMING':
        return 'bg-indigo-950 text-indigo-300 border-indigo-700';
      case 'Closed (allotment pending)':
      case 'CLOSED':
        return 'bg-amber-950/90 text-amber-300 border-amber-800';
      case 'Allotment done':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'Listed':
      case 'LISTED':
        return 'bg-blue-950 text-blue-400 border-blue-800';
      case 'Postponed':
      case 'POSTPONED':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'Withdrawn':
      case 'CANCELLED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  const isProfitable = activeIPO ? (activeIPO.netProfitLossCr || 0) > 0 : false;
  const isFreshHeavy = activeIPO ? (activeIPO.freshIssueCr || 0) >= (activeIPO.ofsCr || 0) : false;

  return (
    <div className="space-y-6 pt-2 font-sans">
      {/* 0. Limited Curated Catalog Statutory Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 font-mono text-xs">
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
            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-sans">
              Indian primary market pipeline, verified filings, and news-reported offerings with dynamic date-based status resolution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border ${
              dataStatus === 'LIVE_EXCHANGE_DATA'
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : 'bg-indigo-950/80 text-indigo-400 border-indigo-800'
            }`}>
              <Activity className="w-3.5 h-3.5" />
              {dataStatus === 'LIVE_EXCHANGE_DATA' ? 'Live Exchange Feed' : 'Source: Reference Catalog'} · {ipos.length} Tracked Issues
            </span>
          </div>
        </div>

        {/* Limited Catalog Notice Banner */}
        <div className="flex items-start gap-2 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 text-slate-300 text-[11px] font-sans">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{IPO_CATALOG_DISCLOSURE}</span>
        </div>

        {/* 6 Quick Stat Strip - Sum equals total tracked IPOs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono pt-1">
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">Currently Open</span>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {openCount} Active
            </div>
            <div className="text-[9px] text-slate-500">Active bidding window</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">Allotment Pending</span>
            <div className="text-base font-bold text-amber-400 mt-0.5">
              {pendingCount} Issues
            </div>
            <div className="text-[9px] text-slate-500">Awaiting allotment</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">Allotment Done</span>
            <div className="text-base font-bold text-cyan-400 mt-0.5">
              {allotmentDoneCount} Finalized
            </div>
            <div className="text-[9px] text-slate-500">Basis finalized</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">Upcoming</span>
            <div className="text-base font-bold text-indigo-400 mt-0.5">
              {upcomingCount} Issues
            </div>
            <div className="text-[9px] text-slate-500">Future scheduled</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">Historical Listings</span>
            <div className="text-base font-bold text-blue-400 mt-0.5">
              {listedCount} Listed
            </div>
            <div className="text-[9px] text-slate-500">Public debuts</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">Draft / DRHP</span>
            <div className="text-base font-bold text-purple-400 mt-0.5">
              {draftCount} Filings
            </div>
            <div className="text-[9px] text-slate-500">Draft / DRHP: {draftCount}</div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search IPOs (e.g. Jio, Swiggy, Tonbo)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'ALL'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            All ({ipos.length})
          </button>
          <button
            onClick={() => setFilterStatus('OPEN_NOW')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'OPEN_NOW'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Open ({openCount})
          </button>
          <button
            onClick={() => setFilterStatus('CLOSED_PENDING')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'CLOSED_PENDING'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('ALLOTMENT_DONE')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'ALLOTMENT_DONE'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Allotment Done ({allotmentDoneCount})
          </button>
          <button
            onClick={() => setFilterStatus('UPCOMING')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'UPCOMING'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Upcoming ({upcomingCount})
          </button>
          <button
            onClick={() => setFilterStatus('LISTED')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'LISTED'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Listed ({listedCount})
          </button>
          <button
            onClick={() => setFilterStatus('DRAFT')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'DRAFT'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Draft / DRHP ({draftCount})
          </button>
          <button
            onClick={() => setFilterStatus('SME')}
            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === 'SME'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            SME ({ipos.filter(i => i.market === 'SME' || i.ipoType === 'SME').length})
          </button>
        </div>
      </div>

      {/* 3. Main Master/Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: IPO Cards List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
            <span>Listing Pipeline ({filteredIPOs.length})</span>
            <span className="text-[10px] text-slate-500 font-normal">Click to view audit</span>
          </h4>

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {filteredIPOs.length > 0 ? (
              filteredIPOs.map(ipo => {
                const isSelected = activeIPO?.id === ipo.id;
                const vStyle = getVerdictStyle(ipo.verdict);
                const badgeClass = getStatusBadgeClass(ipo.status);

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
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-100 text-sm">
                            {ipo.name || ipo.companyName}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${
                            ipo.market === 'SME' || ipo.ipoType === 'SME'
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {ipo.market || ipo.ipoType || 'Mainboard'}
                          </span>
                          {ipo.isHistorical && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              Historical
                            </span>
                          )}
                          {ipo.statusSource === 'Unverified (from news)' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              From News
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 flex-wrap">
                          <span className="font-semibold text-slate-300">{ipo.symbol}</span>
                          <span>·</span>
                          {getIpoBucket(ipo) === 'DRAFT' ? (
                            <span>Filing: <strong className="text-slate-200">{ipo.openDate || 'Draft DRHP Filed'}</strong></span>
                          ) : (
                            <span>Open: <strong className="text-slate-200">{ipo.openDate || 'Unverified'}</strong></span>
                          )}
                          <span>·</span>
                          <span>{ipo.sector}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border shrink-0 text-center ${badgeClass}`}
                      >
                        {ipo.status}
                      </span>
                    </div>

                    {/* Price & Issue Details */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/70 font-mono text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Price Band</span>
                        <span className="font-bold text-slate-200">
                          {ipo.priceBand && ipo.priceBand.trim() ? ipo.priceBand : 'Unverified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Issue Size</span>
                        <span className="font-bold text-slate-200">
                          {ipo.issueSizeCr > 0 ? `₹${ipo.issueSizeCr.toLocaleString()} Cr` : 'Unverified'}
                          {ipo.issueSizeSource && ipo.issueSizeCr > 0 && (
                            <span className="text-[9px] text-slate-400 font-normal ml-1">
                              ({ipo.issueSizeSource})
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Status Basis</span>
                        <span className="font-bold text-slate-300 truncate block">
                          {ipo.statusSource || (ipo.isHistorical ? 'Historical Filing' : 'Exchange Notice')}
                        </span>
                      </div>
                    </div>

                    {/* Educational Status & Exchange */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 font-semibold border border-slate-700/80">
                        Not rated (educational data only)
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
                <p className="font-semibold text-slate-200">No IPO records match this filter.</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Try switching the filter to ALL or clearing your search keywords.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Deep Background Testing & Audit Panel (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5">
          {activeIPO ? (
            <>
              {/* Company Title & External Link */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-lg font-bold text-slate-100 font-mono">
                      {activeIPO.name || activeIPO.companyName}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      activeIPO.market === 'SME' || activeIPO.ipoType === 'SME'
                        ? 'bg-purple-950 text-purple-300 border-purple-800'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {activeIPO.market || activeIPO.ipoType || 'Mainboard'} IPO
                    </span>
                    {activeIPO.statusSource === 'Unverified (from news)' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                        Unverified (from news)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    {activeIPO.symbol} · {activeIPO.exchange} · {getIpoBucket(activeIPO) === 'DRAFT' ? (
                      <span>Filing: <strong className="text-slate-200">{activeIPO.openDate || 'Draft DRHP Filed'}</strong></span>
                    ) : (
                      <span>Open: <strong className="text-slate-200">{activeIPO.openDate || 'Unverified'}</strong></span>
                    )} · {activeIPO.industry}
                  </div>
                </div>

                {activeIPO.website && (
                  <a
                    href={activeIPO.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold transition-all shrink-0"
                  >
                    <span>Website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Status & Timing Verification Audit Banner */}
              <div className="p-4 rounded-xl border bg-slate-950/80 border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Award className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">
                      Status & Date Verification Audit
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 font-bold border border-slate-700">
                    Not rated (educational data only)
                  </span>
                </div>

                <div className="text-base font-bold font-mono tracking-tight text-slate-100">
                  {activeIPO.isHistorical
                    ? `Historical Filing · Listed on ${activeIPO.listingDate}`
                    : `Current Status: ${activeIPO.status}`}
                </div>

                <p className="text-xs leading-relaxed text-slate-400 font-sans">
                  <strong>Verification Audit: </strong>
                  {activeIPO.verdictRationale || 'Calculated dynamically against today\'s date in IST from filing/press records.'}
                </p>

                {/* Key Lifecycle Timestamps */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] block">{getIpoBucket(activeIPO) === 'DRAFT' ? 'Filing Status' : 'Open Date'}</span>
                    <span className="font-bold text-slate-200">{activeIPO.openDate || 'Unverified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Close Date</span>
                    <span className="font-bold text-slate-200">{activeIPO.closeDate || 'Unverified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Allotment</span>
                    <span className="font-bold text-slate-200">
                      {activeIPO.allotmentDate || activeIPO.dates?.allotmentDate || 'Unverified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Listing Date</span>
                    <span className="font-bold text-slate-200">{activeIPO.listingDate || 'Unverified'}</span>
                  </div>
                </div>
              </div>

              {/* Source News Article Links (Mandatory for News-Derived IPOs like Jio Platforms) */}
              {activeIPO.articleLinks && activeIPO.articleLinks.length > 0 && (
                <div className="p-3.5 bg-amber-950/20 border border-amber-800/60 rounded-xl space-y-2 font-mono text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reported News Articles & Sources (Unverified from DRHP):</span>
                  </div>
                  <div className="space-y-1">
                    {activeIPO.articleLinks.map((link, lIdx) => (
                      <a
                        key={lIdx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 truncate"
                      >
                        <span className="truncate">{link}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans">
                    Price band, lot size, and official basis of allotment are left unverified until confirmed by official exchange circulars.
                  </p>
                </div>
              )}

              {/* 1. Business Model & Core Operations */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  1. Business Model & Core Operations
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 font-sans">
                  {activeIPO.businessSummary}
                </p>
              </div>

              {/* 2. Financial Disclosures */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    2. Financial Statement Disclosures
                  </h5>
                  {activeIPO.financialsSource && (
                    <span className="text-[10px] font-mono text-amber-400/90">
                      {activeIPO.financialsSource}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-500 block">Annual Sales</span>
                    <div className="text-base font-bold text-slate-100 mt-0.5">
                      {activeIPO.annualRevenueCr > 0 ? `₹${activeIPO.annualRevenueCr.toLocaleString()} Cr` : 'Unverified'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {activeIPO.annualRevenueCr > 0
                        ? (activeIPO.revenueYoYGrowthPct !== 0 ? `${activeIPO.revenueYoYGrowthPct > 0 ? '+' : ''}${activeIPO.revenueYoYGrowthPct}% YoY` : 'Audited Year')
                        : 'Not in linked sources'}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-500 block">Net Profit / Loss</span>
                    <div
                      className={`text-base font-bold mt-0.5 ${
                        activeIPO.netProfitLossCr > 0
                          ? 'text-emerald-400'
                          : activeIPO.netProfitLossCr < 0
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {activeIPO.netProfitLossCr !== 0
                        ? (activeIPO.netProfitLossCr > 0 ? `₹${activeIPO.netProfitLossCr} Cr` : `-₹${Math.abs(activeIPO.netProfitLossCr)} Cr`)
                        : 'Unverified'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {activeIPO.profitMarginPct > 0 ? `Margin: ${activeIPO.profitMarginPct.toFixed(1)}%` : 'Margin: Unverified'}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-500 block">Debt / Equity</span>
                    <div className="text-base font-bold mt-0.5 text-slate-200">
                      {activeIPO.debtToEquity > 0 ? `${activeIPO.debtToEquity}%` : 'Unverified'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {activeIPO.debtToEquity > 0 ? 'Solvency ratio' : 'Not in linked sources'}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-500 block">Price Band & Lot Size</span>
                    <div className="text-sm font-bold text-slate-200 mt-0.5 truncate">
                      {activeIPO.priceBand && activeIPO.priceBand.trim() ? activeIPO.priceBand : 'Unverified'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {activeIPO.lotSize > 0 ? `Lot: ${activeIPO.lotSize} shares` : 'Lot: Unverified'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Strengths vs Red Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
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

                <div className="bg-rose-950/20 border border-rose-900/60 p-3.5 rounded-xl space-y-2">
                  <h6 className="font-bold text-rose-400 font-mono flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    Key Disclosed Risks & Factors
                  </h6>
                  <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                    {activeIPO.redFlags.map((rf, i) => (
                      <li key={i}>{rf}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 4. Grey Market Premium (GMP) - Kept Honest as N/A unless real timestamped observation exists */}
              <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                    Grey Market Premium (GMP)
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    activeIPO.gmpAmount !== undefined ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {activeIPO.gmpAmount !== undefined ? 'OBSERVED' : 'N/A (NO VERIFIED OBSERVATION)'}
                  </span>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Current Estimated GMP</span>
                    <span className="text-sm font-bold text-slate-200">
                      {activeIPO.gmpAmount !== undefined
                        ? `₹${activeIPO.gmpAmount}${activeIPO.gmpPct !== undefined ? ` (${activeIPO.gmpPct}% premium)` : ''}`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Observation Timestamp</span>
                    <span className="text-xs text-slate-300 font-sans">
                      {activeIPO.gmpUpdated || 'N/A (Unofficial; not fabricated)'}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                  GMP is an unregulated over-the-counter estimate. It is displayed as N/A unless an identifiable, timestamped observation exists.
                </p>
              </div>

              {/* 5. Source Attribution & Verification Details */}
              <div className="pt-2 border-t border-slate-800 space-y-2 text-xs font-mono text-slate-400">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    Status Source: <strong className="text-slate-200">{activeIPO.statusSource || 'Exchange Statutory Filing'}</strong>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>Subscription:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold border border-slate-700 inline-flex items-center gap-1.5">
                      <span>{activeIPO.subscription?.total ? `${activeIPO.subscription.total}x` : 'N/A (Pending notice)'}</span>
                      {activeIPO.subscription?.source && activeIPO.subscription?.total && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          [Source: {activeIPO.subscription.source}]
                        </span>
                      )}
                    </span>
                    {activeIPO.subscription && typeof activeIPO.subscription.qib === 'number' && activeIPO.subscription.qib > 0 ? (
                      <span className="text-[10px] text-slate-500">
                        (QIB: {activeIPO.subscription.qib}x, NII: {activeIPO.subscription.nii || 0}x)
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60 font-sans">
                  <span className="flex items-center gap-1 font-mono">
                    Official Reference: {
                      <a href={getReferenceUrl(activeIPO)} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                        {getReferenceUrl(activeIPO)}
                      </a>
                    }
                  </span>
                  <span>Source: {activeIPO.statusSource || 'Exchange Filing'} (As of {activeIPO.lastVerified || '2026-10-25'})</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-xs font-mono text-slate-400 space-y-3">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-slate-200 font-bold text-sm">
                No IPO Selected
              </div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                Select an issue from the listing pipeline on the left to examine prospectus disclosures and metrics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
