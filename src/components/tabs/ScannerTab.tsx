import React, { useState } from 'react';
import { executeLiveMarketScan } from '../../dataEngine';
import { ScannerResult, ScannerCandidate } from '../../types';
import { Play, Filter, CheckCircle2, AlertCircle } from 'lucide-react';

interface ScannerTabProps {
  onSelectTicker: (ticker: string) => void;
}

export const ScannerTab: React.FC<ScannerTabProps> = ({ onSelectTicker }) => {
  const [exchange, setExchange] = useState('ALL');
  const [country, setCountry] = useState('ALL');
  const [maxStocks, setMaxStocks] = useState(25);
  const [requireEmaBullish, setRequireEmaBullish] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ScannerResult | null>(null);

  const handleStartScan = async () => {
    setIsScanning(true);
    setProgress(15);
    setScanResult(null);

    try {
      setProgress(45);
      const res = await executeLiveMarketScan(exchange, country, maxStocks, requireEmaBullish);
      setScanResult(res);
      setProgress(100);
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 mb-3">
          Multi-Exchange Market Scanner (Controlled Batch Processing)
        </h3>
        <p className="text-xs text-slate-400">
          Processes groups of securities across the loaded stock universe without memory overhead or rate-limit violations.
        </p>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-slate-400 font-medium block mb-1">Exchange Filter</label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-medium focus:outline-none"
            >
              <option value="ALL">All Exchanges (NSE, NASDAQ, NYSE)</option>
              <option value="NSE">NSE (India)</option>
              <option value="NASDAQ">NASDAQ (US)</option>
              <option value="NYSE">NYSE (US)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Country Filter</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-medium focus:outline-none"
            >
              <option value="ALL">All Countries</option>
              <option value="India">India</option>
              <option value="United States">United States</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-medium block mb-1">Batch Batch Limit</label>
            <select
              value={maxStocks}
              onChange={(e) => setMaxStocks(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-medium focus:outline-none"
            >
              <option value={15}>15 Stocks (Quick Sample)</option>
              <option value={25}>25 Stocks</option>
              <option value={50}>50 Stocks (Standard Batch)</option>
              <option value={100}>100 Stocks (Deep Scan)</option>
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={requireEmaBullish}
                onChange={(e) => setRequireEmaBullish(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span>EMA20 &gt; EMA50 Bullish Alignment</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <div className="text-xs text-slate-400">
            Batch size: 20 · Worker threads: 4 · Rate limit backoff: 0.1s
          </div>
          <button
            onClick={handleStartScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors font-mono tracking-wider disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isScanning ? 'PROCESSING SCAN...' : 'RUN MARKET SCAN'}</span>
          </button>
        </div>

        {/* Progress Bar */}
        {isScanning && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Scanning universe batches...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${progress}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* Scan Results Table */}
      {scanResult && (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-semibold">
              Scanned: {scanResult.totalCandidates} | Matches Found: {scanResult.matchesFound}
            </span>
            <span className="text-slate-500">Click any row to load into detailed analyzer</span>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-x-auto text-xs font-mono">
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Ticker</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Exchange</th>
                  <th className="py-2.5 px-3">Price (₹)</th>
                  <th className="py-2.5 px-3">Change %</th>
                  <th className="py-2.5 px-3">RSI (14)</th>
                  <th className="py-2.5 px-3">EMA Spread</th>
                  <th className="py-2.5 px-3 text-right">Signal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {scanResult.results.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-slate-500 font-sans">
                      No securities matched the selected filters.
                    </td>
                  </tr>
                ) : (
                  scanResult.results.map((c) => (
                    <tr
                      key={c.ticker}
                      onClick={() => onSelectTicker(c.ticker)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-bold text-emerald-400">{c.ticker}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-200">{c.name}</td>
                      <td className="py-2.5 px-3 text-slate-400">{c.exchange}</td>
                      <td className="py-2.5 px-3 font-bold">₹{c.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className={`py-2.5 px-3 font-semibold ${c.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.changePct >= 0 ? '+' : ''}{c.changePct.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3">{c.rsi.toFixed(1)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          c.emaAlignment === 'Bullish' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                        }`}>
                          {c.emaAlignment}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-bold ${
                          c.signal === 'BUY' ? 'text-emerald-400' : c.signal === 'SELL' ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {c.signal}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
