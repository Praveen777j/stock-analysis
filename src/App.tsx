/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DashboardPage } from './components/pages/DashboardPage';
import { StockAnalysisPage } from './components/pages/StockAnalysisPage';
import { CompanyResearchPage } from './components/pages/CompanyResearchPage';
import { ModelLabPage } from './components/pages/ModelLabPage';
import { WatchlistRiskPage } from './components/pages/WatchlistRiskPage';
import { UpcomingIPOsTab } from './components/tabs/UpcomingIPOsTab';
import { HelpModal } from './components/HelpModal';

import {
  fetchLiveStockData,
  fetchLiveNewsAndSentiment,
  fetchLiveBenchmark,
  extractTechnicals,
  extractFundamentals,
  extractBenchmark,
  generateSentiment,
  computeModelSignal,
  searchLiveStocks,
  runBacktest
} from './dataEngine';
import { HistoricalBar, StockQuote, SentimentData, BenchmarkData } from './types';
import {
  LayoutDashboard,
  LineChart,
  Building2,
  Sparkles,
  Brain,
  BookmarkCheck,
  BookOpen,
  Search,
  TrendingUp,
  TrendingDown,
  X,
  AlertCircle,
  Loader2,
  Layers,
  ShieldCheck
} from 'lucide-react';

export type TraderPageId =
  | 'dashboard'
  | 'stock-analysis'
  | 'research'
  | 'ipos'
  | 'model-lab'
  | 'watchlist-risk'
  // Legacy aliases for backward compatibility
  | 'trade'
  | 'investing'
  | 'decision'
  | 'chart'
  | 'technicals'
  | 'news'
  | 'reddit'
  | 'financials'
  | 'backtest';

const INITIAL_WATCHLIST = ['RELIANCE.NS', 'TCS.NS', 'AAPL'];

export default function App() {
  const [currentTicker, setCurrentTicker] = useState('RELIANCE.NS');
  const [selectedRange, setSelectedRange] = useState('1y');
  const [activePage, setActivePage] = useState<TraderPageId>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Persistent Watchlist in localStorage
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_watchlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {
      // Fallback
    }
    return INITIAL_WATCHLIST;
  });

  const toggleWatchlist = (ticker: string) => {
    setWatchlist((prev) => {
      const next = prev.includes(ticker) ? prev.filter((t) => t !== ticker) : [...prev, ticker];
      try {
        localStorage.setItem('nexus_watchlist', JSON.stringify(next));
      } catch (_) {
        // Storage full / disabled
      }
      return next;
    });
  };

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    ticker: string;
    name: string;
    exchange: string;
    country: string;
  }>>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Live Market State: Null initially until the first real stock response arrives
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [bars, setBars] = useState<HistoricalBar[]>([]);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setError(null);
      // Invalidate old stock quote so previous company metrics cannot be mistaken for requested ticker
      setQuote(null);
      setBars([]);
      setSentiment(null);

      try {
        const [data, benchmarkData] = await Promise.all([
          fetchLiveStockData(currentTicker, selectedRange),
          fetchLiveBenchmark(currentTicker)
        ]);

        if (!isMounted) return;

        setQuote(data.quote);
        setBars(data.bars);
        setBenchmark(benchmarkData);

        // Fetch genuine news & financial sentiment for the resolved company
        try {
          const newsData = await fetchLiveNewsAndSentiment(currentTicker, data.quote.companyName, data.quote);
          if (isMounted) setSentiment(newsData);
        } catch (_) {
          if (isMounted) setSentiment(generateSentiment(currentTicker, data.quote.companyName, data.quote));
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Failed to fetch stock data';
        setError(msg);
        setQuote(null);
        setBars([]);
        setSentiment(null);
        setBenchmark(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentTicker, selectedRange]);

  // Autocomplete search
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 1) {
        const res = await searchLiveStocks(searchQuery.trim());
        if (active) setSuggestions(res);
      } else {
        if (active) setSuggestions([]);
      }
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTicker = (ticker: string) => {
    setCurrentTicker(ticker);
    setSearchQuery('');
    setIsSearchOpen(false);
    // Switch to stock analysis view if currently on dashboard or if navigating from another view
    if (activePage === 'dashboard') {
      setActivePage('stock-analysis');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSelectTicker(searchQuery.trim().toUpperCase());
      setActivePage('stock-analysis');
    }
  };

  // Safe fallback quote for types when quote is still loading
  const safeQuote: StockQuote = quote || {
    ticker: currentTicker,
    companyName: currentTicker,
    price: 0,
    change: 0,
    changePct: 0,
    high52w: 0,
    low52w: 0,
    volume: 0,
    currency: currentTicker.includes('.NS') || currentTicker.includes('.BO') || !currentTicker.includes('.') ? 'INR' : 'USD'
  };

  const safeSentiment: SentimentData = sentiment || generateSentiment(currentTicker, safeQuote.companyName, safeQuote);

  // Quantitative derivations from real data
  const technicals = useMemo(() => extractTechnicals(bars), [bars]);
  const fundamentals = useMemo(() => extractFundamentals(currentTicker, safeQuote), [currentTicker, safeQuote]);
  const backtest = useMemo(() => runBacktest(bars), [bars]);

  const signal = useMemo(
    () => computeModelSignal(technicals, safeSentiment, safeQuote),
    [technicals, safeSentiment, safeQuote]
  );

  // The 6 Primary Structured Sections (Phase 2 UX Requirement)
  const mainNavigationSections: {
    id: TraderPageId;
    label: string;
    icon: React.FC<{ className?: string }>;
    desc: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      desc: 'Market overview, global benchmarks, curated movers, and system health'
    },
    {
      id: 'stock-analysis',
      label: 'Stock Analysis',
      icon: LineChart,
      desc: 'Central price charts, technical indicators, dual-engine sentiment, and tactical action plan'
    },
    {
      id: 'research',
      label: 'Company Research',
      icon: Building2,
      desc: 'Statutory filings, annual P&L trajectory, balance sheet solvency, and 12-dimension moat framework'
    },
    {
      id: 'ipos',
      label: 'IPO Centre',
      icon: Sparkles,
      desc: 'Verified primary market pipeline, SEBI DRHP filing metrics, and unofficial GMP tracking'
    },
    {
      id: 'model-lab',
      label: 'Model Lab',
      icon: Brain,
      desc: 'Out-of-fold supervised ML benchmarking, SHAP attribution, and walk-forward backtesting'
    },
    {
      id: 'watchlist-risk',
      label: 'Watchlist & Risk',
      icon: BookmarkCheck,
      desc: 'Locally persisted watchlists, historical volatility, VaR 95%, and multi-exchange screener'
    }
  ];

  const popularStocks = [
    { ticker: 'RELIANCE.NS', name: 'Reliance' },
    { ticker: 'TCS.NS', name: 'TCS' },
    { ticker: 'INFY.NS', name: 'Infosys' },
    { ticker: 'TATAMOTORS.NS', name: 'Tata Motors' },
    { ticker: 'ZOMATO.NS', name: 'Zomato' },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank' },
    { ticker: 'SBIN.NS', name: 'SBI' },
    { ticker: 'AAPL', name: 'Apple' }
  ];

  const isPositive = quote ? quote.change >= 0 : true;

  // Resolve legacy alias pages to the 6 primary pages
  const resolvedActivePage: TraderPageId = useMemo(() => {
    if (activePage === 'trade' || activePage === 'chart' || activePage === 'technicals' || activePage === 'news' || activePage === 'reddit' || activePage === 'decision') {
      return 'stock-analysis';
    }
    if (activePage === 'investing' || activePage === 'financials') {
      return 'research';
    }
    if (activePage === 'backtest') {
      return 'model-lab';
    }
    return activePage;
  }, [activePage]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 1. Developer-Grade Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Left: Terminal Brand & Active Stock Ticker */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setActivePage('dashboard')}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
                <span className="font-mono font-black text-sm tracking-wide text-slate-100 group-hover:text-emerald-400 transition-colors">
                  NEXUS
                </span>
                <span className="hidden sm:inline text-[11px] font-mono text-slate-500">
                  | AI Stock Analysis & Decision Platform
                </span>
              </div>

              {/* Active Stock Summary Pill */}
              <div
                onClick={() => setActivePage('stock-analysis')}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs hover:border-slate-700 cursor-pointer transition-colors"
                title="Click to view full analysis"
              >
                {quote ? (
                  <>
                    <span className="font-bold text-slate-200">{quote.ticker}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-100 font-bold">
                      {quote.currency === 'INR' ? '₹' : '$'}{quote.price.toFixed(2)}
                    </span>
                    <span className={`flex items-center text-[11px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                      {isPositive ? '+' : ''}{quote.changePct.toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    <span>Loading {currentTicker}...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Autocomplete Search & Methodology Trigger */}
            <div className="flex items-center gap-2 relative">
              {/* Autocomplete Input Form */}
              <div ref={searchRef} className="relative w-full sm:w-72">
                <form onSubmit={handleSearchSubmit}>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => setIsSearchOpen(true)}
                      placeholder="Search company or ticker..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSuggestions([]);
                        }}
                        className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </form>

                {/* Autocomplete Suggestion Dropdown */}
                {isSearchOpen && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto font-mono text-xs">
                    {suggestions.map((s) => (
                      <button
                        key={s.ticker}
                        onClick={() => handleSelectTicker(s.ticker)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 last:border-0 transition-colors"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold text-emerald-400">{s.ticker}</span>
                          <span className="text-slate-400 text-[11px] ml-2 truncate">{s.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0">
                          {s.exchange}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Methodology Modal Trigger */}
              <button
                onClick={() => setIsHelpOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors font-mono shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Model Logic</span>
              </button>
            </div>
          </div>

          {/* Quick Stock Chips Row */}
          <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-slate-800/60 overflow-x-auto text-[11px] font-mono scrollbar-none">
            <span className="text-slate-500 text-[10px] shrink-0 uppercase tracking-wider">Quick Switch:</span>
            {popularStocks.map((s) => (
              <button
                key={s.ticker}
                onClick={() => handleSelectTicker(s.ticker)}
                className={`px-2.5 py-0.5 rounded transition-colors shrink-0 ${
                  currentTicker === s.ticker
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Clean 6-Section Primary Navigation Bar (Phase 2 Requirement) */}
          <nav className="flex items-center gap-2 pt-2.5 mt-1 overflow-x-auto scrollbar-none">
            {mainNavigationSections.map((page) => {
              const isActive = resolvedActivePage === page.id;
              const Icon = page.icon;
              return (
                <button
                  key={page.id}
                  onClick={() => setActivePage(page.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400'
                      : 'bg-slate-900/70 border border-slate-800/80 text-slate-300 hover:text-slate-100 hover:bg-slate-800/80'
                  }`}
                  title={page.desc}
                >
                  <Icon className="w-4 h-4" />
                  <span>{page.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 2. Main Page Viewport */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        {/* Error / Not Found Display */}
        {error ? (
          <div className="bg-rose-950/20 border border-rose-800/60 rounded-xl p-6 text-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-rose-300">
                  Stock Symbol Not Available: "{currentTicker}"
                </h3>
                <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          </div>
        ) : isLoading && !quote && resolvedActivePage !== 'dashboard' && resolvedActivePage !== 'ipos' ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-16 text-center space-y-3 font-mono">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <div className="text-slate-200 font-bold text-sm">
              Connecting to live exchange feed for {currentTicker}...
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Fetching real-time market quote, historical candlesticks, and financial disclosures.
            </p>
          </div>
        ) : (
          <main className="min-h-[550px]">
            {/* 1. DASHBOARD */}
            {resolvedActivePage === 'dashboard' && (
              <DashboardPage
                onSelectTicker={handleSelectTicker}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
              />
            )}

            {/* 2. STOCK ANALYSIS (Centralized Hub) */}
            {resolvedActivePage === 'stock-analysis' && quote && (
              <StockAnalysisPage
                quote={quote}
                bars={bars}
                technicals={technicals}
                sentiment={safeSentiment}
                signal={signal}
                fundamentals={fundamentals}
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                onSelectTicker={handleSelectTicker}
              />
            )}

            {/* 3. COMPANY RESEARCH */}
            {resolvedActivePage === 'research' && quote && (
              <CompanyResearchPage
                quote={quote}
                fundamentals={fundamentals}
                benchmark={benchmark || undefined}
              />
            )}

            {/* 4. IPO CENTRE */}
            {resolvedActivePage === 'ipos' && (
              <UpcomingIPOsTab />
            )}

            {/* 5. MODEL LAB & BACKTESTING */}
            {resolvedActivePage === 'model-lab' && quote && (
              <ModelLabPage
                signal={signal}
                backtest={backtest}
                ticker={currentTicker}
              />
            )}

            {/* 6. WATCHLIST & RISK */}
            {resolvedActivePage === 'watchlist-risk' && (
              <WatchlistRiskPage
                watchlist={watchlist}
                onToggleWatchlist={toggleWatchlist}
                onSelectTicker={handleSelectTicker}
                activeQuote={safeQuote}
                bars={bars}
                technicals={technicals}
              />
            )}
          </main>
        )}

        {/* Help & Methodology Modal */}
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

        {/* Professional Minimal Footer */}
        <footer className="mt-14 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2">
          <span>Nexus · Professional AI Stock Analysis & Decision Support Platform</span>
          <span>Disciplined Quantitative Risk Management · Zero-Paid-API Architecture</span>
        </footer>
      </div>
    </div>
  );
}
