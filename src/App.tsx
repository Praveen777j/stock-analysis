/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TomorrowTradePage } from './components/pages/TomorrowTradePage';
import { ChartsPage } from './components/ChartsPage';
import { TechnicalIndicatorsPage } from './components/pages/TechnicalIndicatorsPage';
import { FinancialNewsPage } from './components/pages/FinancialNewsPage';
import { RedditSentimentPage } from './components/pages/RedditSentimentPage';
import { BalanceSheetPage } from './components/pages/BalanceSheetPage';
import { UpcomingIPOsTab } from './components/tabs/UpcomingIPOsTab';
import { BacktestPage } from './components/BacktestPage';
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
  Target,
  LineChart,
  Layers,
  Newspaper,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Search,
  TrendingUp,
  TrendingDown,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';

export type TraderPageId =
  | 'trade'
  | 'chart'
  | 'technicals'
  | 'news'
  | 'reddit'
  | 'financials'
  | 'ipos'
  | 'backtest';

export default function App() {
  const [currentTicker, setCurrentTicker] = useState('RELIANCE.NS');
  const [selectedRange, setSelectedRange] = useState('1y');
  const [activePage, setActivePage] = useState<TraderPageId>('trade');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

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
          fetchLiveBenchmark(currentTicker).catch(() => extractBenchmark(currentTicker))
        ]);

        if (!isMounted) return;
        setQuote(data.quote);
        setBars(data.bars);
        setBenchmark(benchmarkData);

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
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSelectTicker(searchQuery.trim().toUpperCase());
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

  const traderPages: { id: TraderPageId; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
    { id: 'trade', label: "Tomorrow Trade Desk", icon: Target, desc: "Direct Action Directive (Buy/Sell/Hold), Entry Zone, Stop Loss & Targets" },
    { id: 'chart', label: "Interactive Chart", icon: LineChart, desc: "Full Interactive Candlestick Chart, Timeframes & EMAs" },
    { id: 'technicals', label: "Technical Indicators", icon: Layers, desc: "RSI (14), Moving Averages, MACD, ATR Oscillators" },
    { id: 'news', label: "Financial News", icon: Newspaper, desc: "Verified Financial Media Coverage & Market Impact" },
    { id: 'reddit', label: "Reddit Community", icon: MessageSquare, desc: "Grassroots Retail Investor Discussions & Sentiment" },
    { id: 'financials', label: "Company Financials & P&L", icon: ShieldCheck, desc: "Annual Profit & Loss Trajectory, Corporate Details & Solvency Audit" },
    { id: 'ipos', label: "Upcoming IPOs & GMP", icon: Sparkles, desc: "Primary Market Pipeline, Grey Market Premium & Allotment" },
    { id: 'backtest', label: "Strategy Backtest", icon: TrendingUp, desc: "Historical Strategy Simulation, Return & Drawdown Track Record" }
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* 1. Developer-Grade Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            {/* Left: Terminal Brand & Active Stock Ticker */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono font-extrabold text-sm tracking-wide text-slate-100">
                  NEXUS STOCK SENTIMENT DASHBOARD
                </span>
              </div>

              {/* Active Stock Summary Pill */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs">
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

            {/* Right: Search Input + Methodology Button */}
            <div className="flex items-center gap-2.5 flex-1 max-w-xl justify-end">
              {/* Compact Search Bar with Autocomplete Dropdown */}
              <div ref={searchRef} className="relative flex-1 max-w-md">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder="Search stock (e.g. RELIANCE, TCS, INFY, AAPL)..."
                    className="w-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 focus:border-emerald-500 focus:outline-none rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>

                {/* Autocomplete Suggestions Dropdown */}
                {isSearchOpen && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden font-mono text-xs max-h-64 overflow-y-auto">
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

          {/* Clean 4-Tab Navigation Bar */}
          <nav className="flex items-center gap-2 pt-2.5 mt-1 overflow-x-auto scrollbar-none">
            {traderPages.map((page) => {
              const isActive = activePage === page.id;
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
                >
                  <Icon className="w-4 h-4" />
                  <span>{page.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 2. Main Page Viewport — Strictly Only The Selected Feature Page */}
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
        ) : isLoading && !quote && activePage !== 'ipos' ? (
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
            {/* STRICT PAGE 1: Tomorrow Trade Desk (Action Plan, Targets, SL, VWAP, Gap) */}
            {activePage === 'trade' && quote && (
              <TomorrowTradePage signal={signal} quote={quote} />
            )}

            {/* STRICT PAGE 2: Interactive Chart (Full-width Candlestick & Volume Chart) */}
            {activePage === 'chart' && quote && (
              <ChartsPage ticker={currentTicker} bars={bars} quote={quote} />
            )}

            {/* STRICT PAGE 3: Technical Indicators (RSI, MACD, EMAs, ATR & Volatility) */}
            {activePage === 'technicals' && quote && (
              <TechnicalIndicatorsPage technicals={technicals} quote={quote} />
            )}

            {/* STRICT PAGE 4: Financial News (Verified Institutional Financial Press) */}
            {activePage === 'news' && quote && sentiment && (
              <FinancialNewsPage sentiment={sentiment} quote={quote} />
            )}

            {/* STRICT PAGE 5: Reddit Community (Retail Investor Sentiment & Discussion) */}
            {activePage === 'reddit' && quote && sentiment && (
              <RedditSentimentPage sentiment={sentiment} quote={quote} />
            )}

            {/* STRICT PAGE 6: Company Financials (Balance Sheet Solvency & Debt Health) */}
            {activePage === 'financials' && quote && (
              <BalanceSheetPage quote={quote} fundamentals={fundamentals} benchmark={benchmark || undefined} />
            )}

            {/* STRICT PAGE 7: Upcoming IPOs & GMP Tracker */}
            {activePage === 'ipos' && (
              <UpcomingIPOsTab />
            )}

            {/* STRICT PAGE 8: Strategy Backtest (Historical Walk-Forward Simulation) */}
            {activePage === 'backtest' && quote && (
              <BacktestPage backtest={backtest} ticker={currentTicker} />
            )}
          </main>
        )}

        {/* Help & Methodology Modal */}
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

        {/* Professional Minimal Footer */}
        <footer className="mt-14 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-2">
          <span>Nexus Stock Sentiment Dashboard · Real-Time Stock Market Intelligence</span>
          <span>Disciplined Risk Management · 1:2.5 Asymmetric R:R</span>
        </footer>
      </div>
    </div>
  );
}
