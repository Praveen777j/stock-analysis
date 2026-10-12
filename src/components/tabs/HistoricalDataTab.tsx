import React from 'react';
import { HistoricalBar, StockQuote } from '../../types';

interface HistoricalDataTabProps {
  bars: HistoricalBar[];
  quote: StockQuote;
}

export const HistoricalDataTab: React.FC<HistoricalDataTabProps> = ({ bars, quote }) => {
  const recentBars = bars.slice(-100).reverse();

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">
            Historical OHLCV Market Data — {quote.ticker} ({quote.companyName})
          </h3>
          <p className="text-xs text-slate-400">
            Historical exchange price series and volume execution.
          </p>
        </div>
        <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded">
          Currency: ₹ INR
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-x-auto text-xs font-mono max-h-[500px]">
        <table className="w-full text-left">
          <thead className="bg-slate-900/90 sticky top-0 text-slate-400 border-b border-slate-800 z-10">
            <tr>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Open (₹)</th>
              <th className="py-2.5 px-3">High (₹)</th>
              <th className="py-2.5 px-3">Low (₹)</th>
              <th className="py-2.5 px-3">Close (₹)</th>
              <th className="py-2.5 px-3">Volume</th>
              <th className="py-2.5 px-3">EMA 20 (₹)</th>
              <th className="py-2.5 px-3">RSI (14)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {recentBars.map((b, i) => (
              <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2 px-3 text-slate-400">{b.date}</td>
                <td className="py-2 px-3">₹{b.open.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2 px-3">₹{b.high.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className="py-2 px-3">₹{b.low.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td className={`py-2 px-3 font-semibold ${b.close >= b.open ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{b.close.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2 px-3 text-slate-400">{b.volume.toLocaleString('en-IN')}</td>
                <td className="py-2 px-3 text-amber-400/90">
                  {b.ema20 ? `₹${b.ema20.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                </td>
                <td className="py-2 px-3 text-indigo-400/90">{b.rsi?.toFixed(1) || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
