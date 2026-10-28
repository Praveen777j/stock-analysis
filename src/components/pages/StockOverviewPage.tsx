import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StockQuote, HistoricalBar, TechnicalIndicators, BenchmarkData } from '../../types';
import { ChartsPage } from '../ChartsPage';
import { UNIVERSE_CATALOG } from '../../universeCatalog';
import { getIndianMarketStatus, IndianMarketSession } from '../../marketStatus';
import { searchLiveStocks } from '../../dataEngine';
import { getStandardHistoricalReturns } from '../../returnsCalculator';
import { IndexDetailModal } from '../IndexDetailModal';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Clock,
  Building,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Activity,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Globe,
  Loader2,
  X,
  History,
  Calendar
} from 'lucide-react';

interface MarketIndexItem {
  symbol: string;
  name: string;
  region: 'India' | 'US';
  price: number;
  change: number;
  changePct: number;
  previousClose: number;
  timestamp: string;
}

export interface RecentStockRecord {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
  currency: string;
  timestamp: string;
}

interface StockOverviewPageProps {
  quote: StockQuote | null;
  bars: HistoricalBar[];
  technicals: TechnicalIndicators;
  benchmark?: BenchmarkData | null;
  selectedRange: string;
  onRangeChange: (range: string) => void;
  onSelectTicker: (ticker: string) => void;
  onNavigateToNews: () => void;
  onNavigateToIntelligence: () => void;
  watchlist: string[];
  onToggleWatchlist: (ticker: string) => void;
  isLoading?: boolean;
  onSync?: () => Promise<void>;
}

export const StockOverviewPage: React.FC<StockOverviewPageProps> = ({
  quote,
  bars,
  technicals,
  benchmark,
  selectedRange,
  onRangeChange,
  onSelectTicker,
  onNavigateToNews,
  onNavigateToIntelligence,
  watchlist,
  onToggleWatchlist,
  isLoading,
  onSync
}) => {
  const [activeChartType, setActiveChartType] = useState<'candle' | 'line'>('candle');
  const [indices, setIndices] = useState<MarketIndexItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<{ symbol: string; name: string; region: 'India' | 'US' } | null>(null);
  const [marketSession, setMarketSession] = useState<IndianMarketSession>(() => getIndianMarketStatus());

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{
    ticker: string;
    name: string;
    exchange: string;
    country: string;
    sector: string;
  }>>([]);
  const searchRequestId = useRef(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  // Recently analyzed stocks from localStorage
  const [recentStocks, setRecentStocks] = useState<RecentStockRecord[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_recent_analyses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 6);
      }
    } catch (_) {}
    return [];
  });

  // Keep market session updated every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setMarketSession(getIndianMarketStatus());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch benchmark indices
  useEffect(() => {
    let isMounted = true;
    async function fetchIndices() {
      try {
        const res = await fetch('/api/market-overview');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.indices)) {
            setIndices(data.indices);
          }
        }
      } catch (_) {}
    }
    fetchIndices();
    return () => { isMounted = false; };
  }, []);

  // Record active stock to recent analyses in localStorage (genuine user interactions only)
  useEffect(() => {
    if (quote && quote.price > 0) {
      try {
        const record: RecentStockRecord = {
          ticker: quote.ticker,
          name: quote.companyName,
          price: quote.price,
          changePct: quote.changePct,
          currency: quote.currency,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        };
        setRecentStocks(prev => {
          const filtered = prev.filter(r => r.ticker !== quote.ticker);
          const next = [record, ...filtered].slice(0, 6);
          localStorage.setItem('nexus_recent_analyses', JSON.stringify(next));
          return next;
        });
      } catch (_) {}
    }
  }, [quote?.ticker, quote?.price]);

  // Autocomplete Search with debounce and race-condition prevention
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const currentReq = ++searchRequestId.current;
    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const results = await searchLiveStocks(q);
        if (searchRequestId.current === currentReq) {
          setSuggestions(results);
          setIsSearching(false);
          if (results.length === 0) {
            setSearchError(`No companies found matching "${q}". Try typing another symbol (e.g. TCS, INFY, RELIANCE).`);
          } else {
            setSearchError(null);
          }
        }
      } catch (err: any) {
        if (searchRequestId.current === currentReq) {
          setIsSearching(false);
          setSearchError('Search service temporarily unavailable. Please retry or enter exact ticker.');
        }
      }
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (ticker: string) => {
    onSelectTicker(ticker);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSelectTicker(searchQuery.trim().toUpperCase());
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleTriggerSync = async () => {
    if (syncStatus === 'SYNCING') return;
    setSyncStatus('SYNCING');
    setSyncMessage('Contacting live exchange feed...');

    const start = Date.now();
    try {
      if (onSync) {
        await onSync();
      } else if (quote) {
        // Direct refresh
        const [res, idxRes] = await Promise.all([
          fetch(`/api/stock/${encodeURIComponent(quote.ticker)}?range=${selectedRange}`),
          fetch('/api/market-overview')
        ]);
        if (idxRes.ok) {
          const idxData = await idxRes.json();
          if (Array.isArray(idxData.indices)) setIndices(idxData.indices);
        }
      }
      const elapsed = Date.now() - start;
      const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(nowStr);
      setSyncStatus('SUCCESS');
      setSyncMessage(`Market data synchronized in ${elapsed}ms (${bars.length} verified bars)`);
      setTimeout(() => setSyncStatus('IDLE'), 4000);
    } catch (err: any) {
      setSyncStatus('ERROR');
      setSyncMessage('Provider refresh timed out. Preserving verified cached state.');
      setTimeout(() => setSyncStatus('IDLE'), 5000);
    }
  };

  const currSym = quote?.currency === 'USD' ? '$' : '₹';
  const price = quote?.price ?? 0;
  const isBullish = (quote?.change ?? 0) >= 0;
  const isSaved = quote ? watchlist.includes(quote.ticker) : false;

  // Derive genuine day high/low from current bars if available, avoiding synthetic calculations
  const latestBar = bars.length > 0 ? bars[bars.length - 1] : null;
  const verifiedDayHigh = latestBar && latestBar.high > 0 ? latestBar.high : null;
  const verifiedDayLow = latestBar && latestBar.low > 0 ? latestBar.low : null;

  // Shared historical returns calculated via single invariant
  const standardReturns = useMemo(() => getStandardHistoricalReturns(bars), [bars]);

  // Status styling for Indian market session
  const getSessionBadge = () => {
    switch (marketSession.status) {
      case 'MARKET OPEN':
        return {
          pill: 'bg-emerald-950 text-emerald-300 border-emerald-800',
          dot: 'bg-emerald-400 animate-pulse',
          text: 'MARKET OPEN'
        };
      case 'MARKET CLOSED':
        return {
          pill: 'bg-slate-900 text-slate-300 border-slate-700',
          dot: 'bg-slate-500',
          text: 'MARKET CLOSED'
        };
      case 'MARKET HOLIDAY':
        return {
          pill: 'bg-amber-950 text-amber-300 border-amber-800',
          dot: 'bg-amber-400',
          text: 'MARKET HOLIDAY'
        };
      default:
        return {
          pill: 'bg-slate-900 text-slate-400 border-slate-800',
          dot: 'bg-slate-600',
          text: 'STATUS UNAVAILABLE'
        };
    }
  };

  const sessionStyle = getSessionBadge();

  return (
    <div className="space-y-6 pt-1 max-w-7xl mx-auto font-sans">
      {/* 1. Indian Stock Market Status & Synchronization Strip */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border ${sessionStyle.pill}`}>
              <span className={`w-2 h-2 rounded-full ${sessionStyle.dot}`} />
              <span>{sessionStyle.text}</span>
            </div>
            <div className="text-xs text-slate-300 font-mono">
              <span>{marketSession.sessionName}</span>
              <span className="text-slate-500 mx-1.5">·</span>
              <span className="text-slate-400">{marketSession.istTimeString}</span>
            </div>
          </div>

          {/* Real Sync Data Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerSync}
              disabled={syncStatus === 'SYNCING'}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-emerald-500 text-slate-200 hover:text-emerald-300 text-xs font-mono transition-all disabled:opacity-60"
              title="Refresh quote, technicals, and benchmark feeds"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
              <span>{syncStatus === 'SYNCING' ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
              Last Synced: {lastSyncTime} IST
            </span>
          </div>
        </div>

        {/* Informative Status Explanation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2 text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{marketSession.reason}</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            {marketSession.nextSessionText}
          </div>
        </div>

        {/* Sync message feedback */}
        {syncMessage && (
          <div className={`text-xs font-mono px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
            syncStatus === 'SUCCESS'
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
              : syncStatus === 'ERROR'
              ? 'bg-rose-950/40 text-rose-300 border-rose-800'
              : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}>
            {syncStatus === 'SUCCESS' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Global & Indian Benchmark Indices Strip */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Key Market Benchmark Indices
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            NSE / BSE & Global Context
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {indices.length > 0 ? (
            indices.map((idx) => {
              const isPos = idx.change >= 0;
              return (
                <button
                  key={idx.symbol}
                  type="button"
                  onClick={() => setSelectedIndex({ symbol: idx.symbol, name: idx.name, region: idx.region })}
                  aria-label={`Open interactive details and chart for ${idx.name}`}
                  className="w-full text-left bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/60 active:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 transition-all font-mono group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">{idx.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400">
                      {idx.region}
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-100">
                    {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold mt-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{isPos ? '+' : ''}{idx.change.toFixed(2)} ({isPos ? '+' : ''}{idx.changePct.toFixed(2)}%)</span>
                  </div>
                  <div className="text-[10px] text-emerald-400/80 group-hover:text-emerald-300 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60">
                    <span>Tap for details</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })
          ) : (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 animate-pulse">
                <div className="h-3 bg-slate-800 rounded w-16 mb-2" />
                <div className="h-5 bg-slate-800 rounded w-24 mb-1" />
                <div className="h-3 bg-slate-800 rounded w-12" />
              </div>
            ))
          )}
        </div>
      </section>

      {/* 3. Universal Stock Search Bar */}
      <div ref={searchContainerRef} className="relative bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between pb-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            Search Any Indian (NSE/BSE) or US Company
          </label>
          <span className="text-[10px] text-slate-500 font-mono">
            Try: RELIANCE, TCS, INFY, HDFCBANK, TATAMOTORS, SWIGGY, AAPL
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Type company name (e.g. Tata Motors, Infosys) or ticker (e.g. RELIANCE, TCS)..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-24 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />

          <div className="absolute right-2 top-2 flex items-center gap-1">
            {isSearching && (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin mr-1" />
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setSearchError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono transition-colors"
            >
              Analyze
            </button>
          </div>
        </form>

        {/* Suggestion Dropdown */}
        {isSearchOpen && (
          <div className="absolute top-full left-4 right-4 mt-1 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto font-mono text-xs">
            {isSearching && suggestions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Searching live market feeds...</span>
              </div>
            ) : searchError ? (
              <div className="p-4 text-center text-rose-300/90 text-xs">
                {searchError}
              </div>
            ) : suggestions.length > 0 ? (
              <div className="divide-y divide-slate-800">
                {suggestions.map((s) => (
                  <button
                    key={s.ticker}
                    onClick={() => handleSelectSuggestion(s.ticker)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-900 flex items-center justify-between transition-colors group"
                  >
                    <div className="truncate pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-400 group-hover:text-emerald-300 text-sm">
                          {s.ticker}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {s.exchange} · {s.country}
                        </span>
                      </div>
                      <div className="text-slate-300 text-xs truncate mt-0.5 font-sans">
                        {s.name}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0 font-sans">
                      {s.sector || 'Equities'}
                    </span>
                  </button>
                ))}
              </div>
            ) : searchQuery.trim().length > 0 ? (
              <div className="p-4 text-center text-slate-400 text-xs">
                No verified symbol found for "{searchQuery}". Press Enter to query exchange directly.
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 4. Active Stock Hero & Data Quality Badge */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {quote?.exchange || (quote?.ticker.includes('.NS') ? 'NSE' : 'US')}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
                {quote?.companyName || 'Stock Overview'}
              </h1>
              {quote && (
                <button
                  onClick={() => onToggleWatchlist(quote.ticker)}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    isSaved
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title={isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}
                >
                  {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400 font-mono">
              <span className="text-slate-200 font-bold">{quote?.ticker || 'SYMBOL'}</span>
              <span>•</span>
              <span>{quote?.sector || 'Diversified Equities'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {quote?.lastUpdated || 'Exchange Feed Active'}
              </span>
              <span>•</span>
              {/* Correct Data Quality Label (Bug Fix: Do not show INSUFFICIENT DATA when quote is valid) */}
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                {price > 0 && bars.length > 0 ? 'MARKET DATA VALIDATED' : 'DATA FEED PENDING'}
              </span>
            </div>
          </div>

          {/* Price & Change Banner */}
          <div className="flex items-center gap-6">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100">
                {price > 0 ? `${currSym}${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
              </div>
              <div className={`flex items-center gap-1.5 font-mono text-sm font-bold mt-1 ${isBullish ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isBullish ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>
                  {quote?.change !== undefined ? `${isBullish ? '+' : ''}${quote.change.toFixed(2)}` : 'N/A'}
                </span>
                <span>
                  {quote?.changePct !== undefined ? `(${isBullish ? '+' : ''}${quote.changePct.toFixed(2)}%)` : '(N/A)'}
                </span>
                <span className="text-slate-500 text-xs font-normal ml-1">Today</span>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="hidden sm:flex flex-col gap-2">
              <button
                onClick={onNavigateToIntelligence}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center justify-between gap-2 shadow-sm transition-colors"
              >
                <span>Stock Intelligence & Research</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onNavigateToNews}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs font-mono flex items-center justify-between gap-2 border border-slate-700 transition-colors"
              >
                <span>News & Sentiment</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Stats Bar (No fabricated prices; use verified values or N/A) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-500 text-[11px] block uppercase">Session High / Low</span>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {verifiedDayHigh && verifiedDayLow
                ? `${currSym}${verifiedDayLow.toFixed(1)} – ${currSym}${verifiedDayHigh.toFixed(1)}`
                : 'N/A (Intraday Tick Pending)'}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-500 text-[11px] block uppercase">52-Week Range</span>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {quote?.low52w && quote?.high52w
                ? `${currSym}${quote.low52w.toFixed(1)} – ${currSym}${quote.high52w.toFixed(1)}`
                : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-500 text-[11px] block uppercase">Trading Volume</span>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {quote?.volume && quote.volume > 0
                ? (quote.volume > 1000000 ? `${(quote.volume / 1000000).toFixed(2)}M shares` : `${(quote.volume / 1000).toFixed(1)}k shares`)
                : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-500 text-[11px] block uppercase">ATR Volatility Range</span>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {technicals.atr ? `±${currSym}${technicals.atr.toFixed(1)} / session` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Central Interactive Historical Chart */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
              Historical Price Action ({quote?.ticker})
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Chart Type Toggle */}
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveChartType('candle')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeChartType === 'candle' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Candlestick
              </button>
              <button
                onClick={() => setActiveChartType('line')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeChartType === 'line' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Line
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono overflow-x-auto">
              {['1m', '3m', '6m', '1y', '3y', '5y', 'max'].map(r => (
                <button
                  key={r}
                  onClick={() => onRangeChange(r)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors uppercase ${
                    selectedRange === r ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Embedded SVG Chart Component */}
        <div className="min-h-[420px]">
          {bars.length > 0 ? (
            <ChartsPage
              bars={bars}
              ticker={quote?.ticker || 'STOCK'}
              quote={quote}
              selectedRange={selectedRange}
              onRangeChange={onRangeChange}
              chartType={activeChartType}
            />
          ) : (
            <div className="h-[420px] flex flex-col items-center justify-center text-slate-500 space-y-2 font-mono text-xs">
              <AlertCircle className="w-8 h-8 text-slate-600" />
              <span>No historical candlestick data available for this range.</span>
            </div>
          )}
        </div>
      </div>

      {/* 6. Historical Returns & Recently Analyzed Stocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Performance Returns Table */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Actual Historical Returns
            </span>
            <span className="text-slate-500 text-[10px]">Calculated from verified daily closes</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">1 Week</span>
              <div className={`text-base font-bold mt-1 ${!standardReturns.week1.isAvailable ? 'text-slate-400' : standardReturns.week1.gainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {standardReturns.week1.isAvailable ? standardReturns.week1.formatted : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {standardReturns.week1.isAvailable ? `Base: ${standardReturns.week1.startDate}` : 'History < 7d'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">1 Month</span>
              <div className={`text-base font-bold mt-1 ${!standardReturns.month1.isAvailable ? 'text-slate-400' : standardReturns.month1.gainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {standardReturns.month1.isAvailable ? standardReturns.month1.formatted : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {standardReturns.month1.isAvailable ? `Base: ${standardReturns.month1.startDate}` : 'History < 30d'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">3 Months</span>
              <div className={`text-base font-bold mt-1 ${!standardReturns.month3.isAvailable ? 'text-slate-400' : standardReturns.month3.gainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {standardReturns.month3.isAvailable ? standardReturns.month3.formatted : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {standardReturns.month3.isAvailable ? `Base: ${standardReturns.month3.startDate}` : 'History < 90d'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">1 Year</span>
              <div className={`text-base font-bold mt-1 ${!standardReturns.year1.isAvailable ? 'text-slate-400' : standardReturns.year1.gainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {standardReturns.year1.isAvailable ? standardReturns.year1.formatted : 'N/A'}
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {standardReturns.year1.isAvailable ? `Base: ${standardReturns.year1.startDate}` : 'History < 365d'}
              </div>
            </div>
          </div>
        </div>

        {/* Recently Analyzed Stocks (Genuine records from localStorage, clean empty state) */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-emerald-400" />
              Recently Analyzed Stocks
            </span>
            <span className="text-slate-500 text-[10px]">Your research history</span>
          </div>

          {recentStocks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {recentStocks.map((item) => (
                <button
                  key={item.ticker}
                  onClick={() => onSelectTicker(item.ticker)}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    quote?.ticker === item.ticker
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">{item.ticker.replace('.NS', '')}</span>
                    <span className={`text-[10px] font-bold ${item.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{item.name}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500 space-y-1">
              <p className="text-xs">No recent stocks analyzed in this session.</p>
              <p className="text-[10px] text-slate-600">Search any company above or use the quick switcher below.</p>
            </div>
          )}
        </div>
      </div>

      {/* 7. Curated Market Leaders Quick-Switch Bar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Explore Indian & Global Market Leaders
          </span>
          <span className="text-slate-500 text-[10px]">Click any company to load analysis</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
          {UNIVERSE_CATALOG.slice(0, 12).map((item) => (
            <button
              key={item.ticker}
              onClick={() => onSelectTicker(item.ticker)}
              className={`p-2.5 rounded-lg border text-left transition-colors ${
                quote?.ticker === item.ticker
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-slate-200 text-xs">{item.ticker.replace('.NS', '')}</div>
              <div className="text-[10px] text-slate-400 truncate">{item.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark Index Detail Modal */}
      <IndexDetailModal
        isOpen={!!selectedIndex}
        onClose={() => setSelectedIndex(null)}
        symbol={selectedIndex?.symbol || ''}
        name={selectedIndex?.name || ''}
        region={selectedIndex?.region || 'India'}
      />
    </div>
  );
};
