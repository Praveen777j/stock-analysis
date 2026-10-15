import React, { useState, useEffect } from 'react';
import { StockQuote } from '../types';
import { searchLiveStocks } from '../dataEngine';
import { Search, TrendingUp, TrendingDown, Clock, Percent } from 'lucide-react';

interface StockSearchProps {
  currentTicker: string;
  quote: StockQuote;
  onAnalyze: (ticker: string) => void;
  isLoading: boolean;
}

export const StockSearch: React.FC<StockSearchProps> = ({
  currentTicker,
  quote,
  onAnalyze,
  isLoading
}) => {
  const [query, setQuery] = useState(currentTicker);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    ticker: string;
    name: string;
    exchange: string;
    country: string;
  }>>([]);

  // Fetch search suggestions
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (query.trim().length >= 1) {
        const res = await searchLiveStocks(query);
        if (active) setSuggestions(res);
      } else {
        if (active) setSuggestions([]);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onAnalyze(query.trim().toUpperCase());
      setShowDropdown(false);
    }
  };

  const handleSelectEntry = (ticker: string) => {
    setQuery(ticker);
    onAnalyze(ticker);
    setShowDropdown(false);
  };

  const isPositive = quote.change >= 0;
  const is1mPositive = (quote.change1mPct || 0) >= 0;
  const currSym = quote.currency === 'USD' ? '$' : '₹';

  const quickPicks = [
    { ticker: 'RELIANCE.NS', label: 'Reliance' },
    { ticker: 'TCS.NS', label: 'TCS' },
    { ticker: 'INFY.NS', label: 'Infosys' },
    { ticker: 'HDFCBANK.NS', label: 'HDFC Bank' },
    { ticker: 'SHADOWFAX.NS', label: 'Shadowfax' },
    { ticker: 'SBIN.NS', label: 'SBI' },
    { ticker: 'TATAMOTORS.NS', label: 'Tata Motors' },
    { ticker: 'ZOMATO.NS', label: 'Zomato' }
  ];

  return (
    <div className="w-full">
      {/* Live Market Status Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mb-3 pb-2 border-b border-slate-800/80 gap-2">
        <div className="flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-semibold">Live Market Feed Active</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-300 font-mono">{quote.ticker} ({quote.exchange || 'NSE'})</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{quote.lastUpdated || 'Real-time Feed'}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>Asset Class: <strong className="text-slate-200">Equities</strong></span>
          <span>·</span>
          <span>Volume: <strong className="text-slate-200">{quote.volume ? quote.volume.toLocaleString('en-IN') : 'Active'}</strong></span>
        </div>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search ticker (e.g. RELIANCE, TCS, INFY, SBIN, HDFCBANK, SHADOWFAX, ZOMATO)..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 font-mono text-xs tracking-wide focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />

            {/* Live Autocomplete Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-800 text-xs font-mono">
                {suggestions.map((entry) => (
                  <button
                    key={entry.ticker}
                    type="button"
                    onClick={() => handleSelectEntry(entry.ticker)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-bold text-emerald-400 mr-2">{entry.ticker}</span>
                      <span className="text-slate-200 font-sans font-medium">{entry.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      <span>{entry.exchange}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50 shrink-0 font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <span>FETCHING LIVE...</span>
            ) : (
              <span>ANALYZE TICKER</span>
            )}
          </button>
        </div>
      </form>

      {/* Quick Select Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px] font-mono">
        <span className="text-slate-500 text-[11px] mr-1">Popular Equities:</span>
        {quickPicks.map((p) => (
          <button
            key={p.ticker}
            type="button"
            onClick={() => handleSelectEntry(p.ticker)}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              currentTicker === p.ticker
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 font-semibold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100 border border-slate-800'
            }`}
          >
            <span>{p.label}</span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-1 rounded border border-slate-700">
              {p.ticker.replace('.NS', '')}
            </span>
          </button>
        ))}
      </div>

      {/* Quote Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 font-mono">
        {/* Live Price */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold font-sans">
            Live Market Price
          </div>
          <div className="text-2xl font-extrabold tabular-nums text-slate-100 mt-1">
            {currSym}{quote.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-300 truncate font-sans font-medium mt-0.5">
            {quote.companyName}
          </div>
        </div>

        {/* Session Return */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-3">
          <div className="flex items-center justify-between font-sans">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Session (1D)</span>
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className={`text-2xl font-extrabold tabular-nums mt-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{quote.changePct.toFixed(2)}%
          </div>
          <div className="text-[11px] text-slate-400">
            {isPositive ? '+' : '-'}{currSym}{Math.abs(quote.change).toFixed(2)} today
          </div>
        </div>

        {/* 1 Month Return Percentage */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-3">
          <div className="flex items-center justify-between font-sans">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">1 Month Gain</span>
            {quote.change1mPct !== undefined ? (
              is1mPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )
            ) : null}
          </div>
          <div className={`text-2xl font-extrabold tabular-nums mt-1 ${
            quote.change1mPct !== undefined
              ? (is1mPositive ? 'text-emerald-400' : 'text-rose-400')
              : 'text-slate-400 text-lg'
          }`}>
            {quote.change1mPct !== undefined
              ? `${is1mPositive ? '+' : ''}${quote.change1mPct.toFixed(1)}%`
              : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400">
            {quote.change1mAmount !== undefined
              ? `${is1mPositive ? '+' : '-'}${currSym}${Math.abs(quote.change1mAmount).toFixed(2)} this month`
              : 'Insufficient history'}
          </div>
        </div>

        {/* 52-Week Range */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-3">
          <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold font-sans">
            52-Week High / Low
          </div>
          <div className="text-lg font-bold tabular-nums text-slate-100 mt-1">
            <span className="text-emerald-400">{currSym}{quote.high52w.toFixed(0)}</span>
            <span className="text-slate-500 mx-1.5">/</span>
            <span className="text-rose-400">{currSym}{quote.low52w.toFixed(0)}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-sans mt-0.5">
            1Y High: {currSym}{quote.high52w.toLocaleString('en-IN')} · Low: {currSym}{quote.low52w.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </div>
  );
};
