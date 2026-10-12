import React from 'react';
import { StockQuote, StockFundamentals, BenchmarkData } from '../../types';

interface OverviewTabProps {
  quote: StockQuote;
  fundamentals: StockFundamentals;
  benchmark: BenchmarkData;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ quote, fundamentals, benchmark }) => {
  return (
    <div className="space-y-6 pt-2">
      {/* Asset Core Information */}
      <section>
        <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 mb-3">
          1. Asset Identity & Exchange Context
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Security Name</span>
            <div className="text-sm font-bold text-slate-100 mt-1">{quote.companyName}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Ticker Symbol</span>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-1">{quote.ticker}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Primary Exchange</span>
            <div className="text-sm font-bold text-slate-100 mt-1">{quote.exchange} ({quote.country})</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Sector / Industry</span>
            <div className="text-sm font-bold text-slate-100 mt-1">{quote.sector}</div>
          </div>
        </div>
      </section>

      {/* Point-in-Time Fundamentals */}
      <section>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-200">
            2. Point-in-Time Valuation & Balance Sheet Snapshot
          </h3>
          <span className="text-[11px] text-amber-400/90 font-mono">
            Excluded from historical backtesting (anti-leakage rule)
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">P/E Ratio</span>
            <div className="text-base font-bold font-mono text-slate-100 mt-1">
              {fundamentals.peRatio !== undefined ? `${fundamentals.peRatio}x` : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">P/B Ratio</span>
            <div className="text-base font-bold font-mono text-slate-100 mt-1">
              {fundamentals.pbRatio !== undefined ? `${fundamentals.pbRatio}x` : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Trailing EPS</span>
            <div className="text-base font-bold font-mono text-slate-100 mt-1">
              {fundamentals.eps !== undefined ? `${quote.currency === 'INR' ? '₹' : '$'}${fundamentals.eps}` : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Market Cap</span>
            <div className="text-base font-bold font-mono text-slate-100 mt-1">{fundamentals.marketCap || 'N/A'}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Return on Equity (ROE)</span>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              {fundamentals.roe !== undefined ? `${fundamentals.roe}%` : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Dividend Yield</span>
            <div className="text-base font-bold font-mono text-slate-100 mt-1">
              {fundamentals.dividendYield !== undefined ? `${fundamentals.dividendYield}%` : 'N/A'}
            </div>
          </div>
        </div>
      </section>

      {/* Macro & Sector Benchmark Context */}
      <section>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-200">
            3. Market & Sector Benchmark Context
          </h3>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
            benchmark.dataStatus === 'LIVE'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {benchmark.dataStatus === 'LIVE' ? 'LIVE BENCHMARK' : 'BENCHMARK FEED UNAVAILABLE'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Benchmark Index</span>
            <div className="text-base font-bold font-mono text-indigo-400 mt-1">{benchmark.benchmarkTicker}</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">1-Day Benchmark Return</span>
            <div className="text-base font-bold font-mono text-slate-100 mt-1">
              {benchmark.marketReturn1d !== undefined
                ? `${benchmark.marketReturn1d >= 0 ? '+' : ''}${(benchmark.marketReturn1d * 100).toFixed(2)}%`
                : 'N/A (Feed Unavailable)'}
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">20-Day Benchmark Momentum</span>
            <div className="text-base font-bold font-mono text-emerald-400 mt-1">
              {benchmark.marketReturn20d !== undefined
                ? `${benchmark.marketReturn20d >= 0 ? '+' : ''}${(benchmark.marketReturn20d * 100).toFixed(2)}%`
                : 'N/A (Feed Unavailable)'}
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-400">Benchmark Volatility</span>
            <div className="text-base font-bold font-mono text-slate-100 mt-1">
              {benchmark.marketVolatility20d !== undefined
                ? `${(benchmark.marketVolatility20d * 100).toFixed(1)}%`
                : 'N/A (Feed Unavailable)'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
