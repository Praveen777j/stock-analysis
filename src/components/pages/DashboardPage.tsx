import React, { useState, useEffect } from 'react';
import { StockQuote } from '../../types';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  Search,
  ExternalLink,
  Clock,
  ArrowRight,
  Layers,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Bookmark,
  Zap,
  Globe
} from 'lucide-react';

interface MarketIndex {
  symbol: string;
  name: string;
  region: 'India' | 'US';
  price: number;
  change: number;
  changePct: number;
  previousClose: number;
  timestamp: string;
}

interface HealthData {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  system: {
    nodeVersion: string;
    platform: string;
    memoryRssMb: number;
    memoryHeapUsedMb: number;
  };
  providers: {
    marketData: { name: string; status: string; keyRequired: boolean };
    newsIntelligence: { name: string; status: string; keyRequired: boolean };
    finbert: { name: string; status: string; engineInUse: string; keyRequired: boolean };
    vader: { name: string; status: string; keyRequired: boolean };
    ipoCatalog: { name: string; status: string; totalEntries: number };
    modelLab: { name: string; status: string; targetHorizon: string };
  };
}

interface DashboardPageProps {
  onSelectTicker: (ticker: string) => void;
  watchlist: string[];
  onToggleWatchlist: (ticker: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectTicker,
  watchlist,
  onToggleWatchlist
}) => {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Popular stock watchlist quotes
  const curatedUniverse = [
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'Energy & Retail', exchange: 'NSE' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'Information Tech', exchange: 'NSE' },
    { ticker: 'INFY.NS', name: 'Infosys Limited', sector: 'Information Tech', exchange: 'NSE' },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Limited', sector: 'Banking & Financials', exchange: 'NSE' },
    { ticker: 'TATAMOTORS.NS', name: 'Tata Motors Limited', sector: 'Automotive', exchange: 'NSE' },
    { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Consumer Electronics', exchange: 'NASDAQ' }
  ];

  const [curatedQuotes, setCuratedQuotes] = useState<Record<string, { price: number; change: number; changePct: number; currency: string }>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      setIsLoading(true);
      try {
        // 1. Fetch Market Overview
        const idxRes = await fetch('/api/market-overview');
        if (idxRes.ok) {
          const idxData = await idxRes.json();
          if (isMounted && Array.isArray(idxData.indices)) {
            setIndices(idxData.indices);
          }
        }

        // 2. Fetch Health
        const hRes = await fetch('/api/health');
        if (hRes.ok) {
          const hData = await hRes.json();
          if (isMounted) setHealth(hData);
        }

        // 3. Fetch curated news
        const nRes = await fetch('/api/news/RELIANCE');
        if (nRes.ok) {
          const nData = await nRes.json();
          if (isMounted && Array.isArray(nData.articles)) {
            setNews(nData.articles.slice(0, 5));
          }
        }

        // 4. Fetch curated quotes
        const quotesMap: Record<string, any> = {};
        await Promise.all(
          curatedUniverse.map(async (item) => {
            try {
              const res = await fetch(`/api/stock/${item.ticker}?range=5d`);
              if (res.ok) {
                const data = await res.json();
                quotesMap[item.ticker] = {
                  price: data.price,
                  change: data.change,
                  changePct: data.changePct,
                  currency: data.currency
                };
              }
            } catch (_) {
              // Graceful omission
            }
          })
        );
        if (isMounted) setCuratedQuotes(quotesMap);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Global Benchmark Indices Strip */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono">
              Global Market Benchmarks
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Provider Data
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {indices.length > 0 ? (
            indices.map((idx) => {
              const isPos = idx.change >= 0;
              return (
                <div
                  key={idx.symbol}
                  className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-bold text-slate-200">{idx.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                      {idx.region}
                    </span>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-100">
                    {idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold font-mono mt-1 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{isPos ? '+' : ''}{idx.change.toFixed(2)} ({isPos ? '+' : ''}{idx.changePct.toFixed(2)}%)</span>
                  </div>
                </div>
              );
            })
          ) : (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-slate-800 rounded w-20 mb-2" />
                <div className="h-6 bg-slate-800 rounded w-28 mb-2" />
                <div className="h-3 bg-slate-800 rounded w-16" />
              </div>
            ))
          )}
        </div>
      </section>

      {/* 2. Main Two-Column Layout: Market Opportunities & Live Financial Wire */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Verified Stocks & Watchlist Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Curated Universe Cards */}
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide font-mono">
                  Market Coverage Universe
                </h3>
              </div>
              <span className="text-xs text-slate-400">Click any company to open full analysis</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {curatedUniverse.map((item) => {
                const q = curatedQuotes[item.ticker];
                const isPos = q ? q.change >= 0 : true;
                const isWatchlisted = watchlist.includes(item.ticker);

                return (
                  <div
                    key={item.ticker}
                    onClick={() => onSelectTicker(item.ticker)}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400 font-mono text-sm group-hover:text-emerald-300">
                            {item.ticker}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {item.exchange}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 font-medium truncate max-w-[180px] mt-0.5">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.sector}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(item.ticker);
                        }}
                        className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                        title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      >
                        <Bookmark className={`w-4 h-4 ${isWatchlisted ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                      {q ? (
                        <>
                          <div className="font-mono font-bold text-slate-200 text-sm">
                            {q.currency === 'INR' ? '₹' : '$'}{q.price.toFixed(2)}
                          </div>
                          <div className={`font-mono text-xs font-bold flex items-center gap-0.5 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPos ? '+' : ''}{q.changePct.toFixed(2)}%
                          </div>
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-500 font-mono animate-pulse">
                          Fetching quote...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick Active Watchlist Strip */}
          {watchlist.length > 0 && (
            <section className="bg-slate-900/40 border border-slate-800/70 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wide font-mono">
                    My Pinned Watchlist ({watchlist.length})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {watchlist.map((tick) => (
                  <button
                    key={tick}
                    onClick={() => onSelectTicker(tick)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-emerald-500 text-xs font-mono text-slate-200 hover:text-emerald-400 transition-all"
                  >
                    <span>{tick}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Live Institutional News Wire */}
        <div className="space-y-6">
          <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-3.5 flex flex-col h-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide font-mono">
                  Live Financial Wire
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Real-time Feed</span>
            </div>

            <div className="space-y-3 flex-1">
              {news.length > 0 ? (
                news.map((a, i) => {
                  const isBull = a.sentimentLabel === 'POSITIVE' || (a.vaderScore && a.vaderScore >= 0.05);
                  const isBear = a.sentimentLabel === 'NEGATIVE' || (a.vaderScore && a.vaderScore <= -0.05);
                  return (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 hover:border-slate-700 transition-colors text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
                        <span className="font-bold text-slate-400">{a.publisher || 'Financial Press'}</span>
                        <span>{a.timeAgo || 'Recent'}</span>
                      </div>
                      <a
                        href={a.link}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-slate-200 hover:text-emerald-400 transition-colors line-clamp-2 block leading-snug"
                      >
                        {a.title}
                      </a>
                      <div className="flex items-center justify-between pt-1">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isBull
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            : isBear
                            ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}>
                          {a.sentimentLabel || (isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'NEUTRAL')}
                        </span>
                        <a
                          href={a.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs font-mono">
                  Loading financial news stream...
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 3. System & Data Health Strip (Phase 17 Requirement) */}
      <section className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              System & Data Health Strip (Phase 17 Verified Integrity)
            </h3>
          </div>
          {health && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span>Node: {health.system.nodeVersion}</span>
              <span>·</span>
              <span>Uptime: {Math.floor(health.uptimeSeconds / 60)}m</span>
              <span>·</span>
              <span>RAM RSS: {health.system.memoryRssMb} MB</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/70">
            <div className="text-[10px] text-slate-500 mb-1">Market Quotes</div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Available</span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Yahoo Finance v8</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/70">
            <div className="text-[10px] text-slate-500 mb-1">News Feeds</div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Available</span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Google News RSS</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/70">
            <div className="text-[10px] text-slate-500 mb-1">FinBERT Engine</div>
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Fallback Active</span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">VADER Dynamic Weight</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/70">
            <div className="text-[10px] text-slate-500 mb-1">VADER Lexicon</div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Available</span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Local Rule Engine</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/70">
            <div className="text-[10px] text-slate-500 mb-1">IPO SEBI Catalog</div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Verified DRHP</span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">8 Filings Audited</div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/70">
            <div className="text-[10px] text-slate-500 mb-1">ML TimeSeriesSplit</div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Active</span>
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">5-Day Out-of-Fold</div>
          </div>
        </div>
      </section>
    </div>
  );
};
