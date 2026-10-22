import React, { useState, useEffect, useMemo } from 'react';
import { StockQuote, HistoricalBar, TechnicalIndicators, BenchmarkData } from '../../types';
import { ScannerTab } from '../tabs/ScannerTab';
import { computeAuthenticBeta } from '../../dataEngine';
import {
  Bookmark,
  ShieldAlert,
  Filter,
  Trash2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  ArrowRight,
  Plus,
  Scale
} from 'lucide-react';

interface WatchlistRiskPageProps {
  watchlist: string[];
  onToggleWatchlist: (ticker: string) => void;
  onSelectTicker: (ticker: string) => void;
  activeQuote: StockQuote;
  bars: HistoricalBar[];
  technicals: TechnicalIndicators;
  benchmark?: BenchmarkData | null;
}

type WatchlistRiskTab = 'watchlist' | 'risk' | 'screener';

export const WatchlistRiskPage: React.FC<WatchlistRiskPageProps> = ({
  watchlist,
  onToggleWatchlist,
  onSelectTicker,
  activeQuote,
  bars,
  technicals,
  benchmark
}) => {
  const [activeTab, setActiveTab] = useState<WatchlistRiskTab>('watchlist');
  const [watchlistQuotes, setWatchlistQuotes] = useState<Record<string, StockQuote>>({});
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [newTickerInput, setNewTickerInput] = useState('');

  // Fetch live quotes for all items in the watchlist
  useEffect(() => {
    let isMounted = true;
    async function loadWatchlistQuotes() {
      if (watchlist.length === 0) return;
      setIsLoadingQuotes(true);
      const map: Record<string, StockQuote> = {};
      await Promise.all(
        watchlist.map(async (sym) => {
          try {
            const res = await fetch(`/api/stock/${sym}?range=5d`);
            if (res.ok) {
              const data = await res.json();
              map[sym] = data;
            }
          } catch (_) {
            // Graceful fallback
          }
        })
      );
      if (isMounted) {
        setWatchlistQuotes(map);
        setIsLoadingQuotes(false);
      }
    }
    loadWatchlistQuotes();
    return () => {
      isMounted = false;
    };
  }, [watchlist]);

  // Quantitative Risk Computations on Historical Bars
  const riskMetrics = useMemo(() => {
    if (!bars || bars.length < 20) {
      return {
        volatility30d: 0,
        volatility1y: 0,
        var95Pct: 0,
        maxDrawdown: 0,
        beta: 1.0,
        avgDailyVolume: 0,
        dataPoints: bars.length
      };
    }

    // Daily percentage returns
    const returns: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i - 1].close;
      const curr = bars[i].close;
      if (prev > 0) returns.push((curr - prev) / prev);
    }

    const n = returns.length;
    const mean = returns.reduce((a, b) => a + b, 0) / n;

    // Standard deviation (daily volatility)
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (n - 1);
    const dailyStd = Math.sqrt(variance);

    // Annualized volatility (assuming 252 trading sessions)
    const volatility1y = dailyStd * Math.sqrt(252) * 100;

    // 30-day volatility
    const last30Returns = returns.slice(-22);
    const mean30 = last30Returns.reduce((a, b) => a + b, 0) / Math.max(1, last30Returns.length);
    const var30 = last30Returns.reduce((acc, r) => acc + Math.pow(r - mean30, 2), 0) / Math.max(1, last30Returns.length - 1);
    const volatility30d = Math.sqrt(var30) * Math.sqrt(252) * 100;

    // Historical Value at Risk (VaR 95% 1-day)
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const varIndex = Math.floor(sortedReturns.length * 0.05);
    const var95Pct = Math.abs(sortedReturns[varIndex] || dailyStd * 1.645) * 100;

    // Peak-to-trough Maximum Drawdown
    let peak = -Infinity;
    let maxDrawdown = 0;
    for (const b of bars) {
      if (b.close > peak) peak = b.close;
      const dd = (peak - b.close) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Average volume
    const avgVol = bars.reduce((acc, b) => acc + b.volume, 0) / bars.length;

    // Authentic statistical Beta calculation against matching benchmark dates
    const authenticBetaCalc = computeAuthenticBeta(bars, benchmark?.benchmarkBars);

    return {
      volatility30d: Math.round(volatility30d * 10) / 10,
      volatility1y: Math.round(volatility1y * 10) / 10,
      var95Pct: Math.round(var95Pct * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 1000) / 10,
      beta: authenticBetaCalc.beta,
      betaMatched: authenticBetaCalc.matchedObservations,
      betaFormula: authenticBetaCalc.formula,
      avgDailyVolume: Math.round(avgVol),
      dataPoints: bars.length
    };
  }, [bars, benchmark]);

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTickerInput.trim().toUpperCase();
    if (clean && !watchlist.includes(clean)) {
      onToggleWatchlist(clean);
      setNewTickerInput('');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Navigation Ribbon */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black font-mono text-slate-100">
                Nexus Watchlist, Risk Analytics & Market Screener
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Locally persisted watchlists, mathematical volatility & VaR analysis, and multi-criteria stock screening.
            </p>
          </div>

          {/* Sub-Tab Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('watchlist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'watchlist'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Watchlist ({watchlist.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'risk'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Risk Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('screener')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'screener'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Stock Screener</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tab Viewport */}
      <div>
        {activeTab === 'watchlist' && (
          <div className="space-y-6">
            {/* Add Stock to Watchlist Bar */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
              <form onSubmit={handleAddTicker} className="flex items-center gap-3 max-w-md">
                <input
                  type="text"
                  placeholder="Add ticker (e.g. INFY.NS, TCS.NS, AAPL)..."
                  value={newTickerInput}
                  onChange={(e) => setNewTickerInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            {/* Watchlist Table */}
            {watchlist.length > 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Ticker</th>
                      <th className="py-3 px-4">Company Name</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4 text-right">Day Change</th>
                      <th className="py-3 px-4 text-right">Volume</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {watchlist.map((sym) => {
                      const q = watchlistQuotes[sym];
                      const isPos = q ? q.change >= 0 : true;
                      const curr = q?.currency === 'INR' ? '₹' : '$';

                      return (
                        <tr
                          key={sym}
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                          onClick={() => onSelectTicker(sym)}
                        >
                          <td className="py-3 px-4 font-bold text-emerald-400">
                            {sym}
                          </td>
                          <td className="py-3 px-4 text-slate-200 font-sans">
                            {q?.companyName || sym}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-100">
                            {q ? `${curr}${q.price.toFixed(2)}` : '...'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {q ? (
                              <span className={`font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPos ? '+' : ''}{q.changePct.toFixed(2)}%
                              </span>
                            ) : (
                              '...'
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400">
                            {q?.volume ? q.volume.toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onToggleWatchlist(sym)}
                              className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                              title="Remove from Watchlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 text-center space-y-3 font-mono">
                <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-slate-300 font-bold text-sm">Your Watchlist is Currently Empty</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click the bookmark icon on any stock analysis page or use the input box above to add tickers to your local session watchlist.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-6">
            {/* Risk Summary for Active Stock */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide font-mono">
                    Quantitative Risk Profile for {activeQuote.ticker}
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {riskMetrics.dataPoints} Observations Analyzed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-500 block uppercase text-[10px]">Annualized Volatility (1Y)</span>
                  <div className="text-xl font-black text-slate-100 mt-1">
                    {riskMetrics.volatility1y}%
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    Standard deviation of 1-year historical daily logarithmic returns annualized (x √252).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-500 block uppercase text-[10px]">Short-Term Vol (30D)</span>
                  <div className="text-xl font-black text-slate-100 mt-1">
                    {riskMetrics.volatility30d}%
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    Recent 30-day realized volatility indicating immediate price turbulence.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-500 block uppercase text-[10px]">Authentic Beta ({benchmark?.benchmarkTicker || 'Index'})</span>
                  <div className="text-xl font-black text-slate-100 mt-1">
                    {riskMetrics.beta !== undefined ? riskMetrics.beta.toFixed(2) : 'Unavailable'}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    {riskMetrics.beta !== undefined
                      ? `Cov(R_s, R_b)/Var(R_b) over ${riskMetrics.betaMatched} matched trading sessions.`
                      : 'Requires matching historical index sessions (min 20).'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-500 block uppercase text-[10px]">Value at Risk (VaR 95%)</span>
                  <div className="text-xl font-black text-rose-400 mt-1">
                    -{riskMetrics.var95Pct}%
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    95% confidence threshold for maximum single-session loss.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-500 block uppercase text-[10px]">Max Drawdown (1Y)</span>
                  <div className="text-xl font-black text-rose-400 mt-1">
                    -{riskMetrics.maxDrawdown}%
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-sans">
                    Largest peak-to-trough decline over trailing 252 sessions.
                  </p>
                </div>
              </div>

              {/* Qualitative Risk Notes */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Disciplined Risk Disclosures & Limitations</span>
                </div>
                <p>
                  1. Historical volatility and past drawdowns do not guarantee future performance during systemic macroeconomic crises.
                </p>
                <p>
                  2. Value at Risk (VaR) does not measure tail risk beyond the 95th percentile (fat tails / black swan events).
                </p>
                <p>
                  3. Always apply strict stop-loss rules (such as the 1:2.5 asymmetric R:R levels computed in the Trade Desk) to prevent catastrophic capital impairment.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'screener' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6">
            <ScannerTab onSelectTicker={onSelectTicker} />
          </div>
        )}
      </div>
    </div>
  );
};
