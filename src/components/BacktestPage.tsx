import React, { useState } from 'react';
import { BacktestResult } from '../types';

interface BacktestPageProps {
  backtest: BacktestResult;
  ticker: string;
}

export const BacktestPage: React.FC<BacktestPageProps> = ({ backtest, ticker }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { metrics, equityCurve, trades } = backtest;

  const currSym = ticker.endsWith('.NS') || ticker.endsWith('.BO') || (!ticker.includes('.') && ticker !== 'AAPL') ? '₹' : '$';
  const locale = currSym === '₹' ? 'en-IN' : 'en-US';

  const isAlphaPositive = metrics.strategyReturnPct >= metrics.buyHoldReturnPct;

  // Layout for SVG equity curve chart
  const width = 800;
  const height = 280;
  const padLeft = 10;
  const padRight = 60;
  const padTop = 20;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = equityCurve;
  const n = points.length;

  let minVal = Infinity;
  let maxVal = -Infinity;
  for (const p of points) {
    if (p.strategy < minVal) minVal = p.strategy;
    if (p.buyHold < minVal) minVal = p.buyHold;
    if (p.strategy > maxVal) maxVal = p.strategy;
    if (p.buyHold > maxVal) maxVal = p.buyHold;
  }
  const valPad = (maxVal - minVal) * 0.08 || 5000;
  minVal = Math.max(0, minVal - valPad);
  maxVal += valPad;

  const getX = (i: number) => padLeft + (i / Math.max(1, n - 1)) * chartW;
  const getY = (val: number) => padTop + chartH - ((val - minVal) / (maxVal - minVal || 1)) * chartH;

  const stratPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.strategy).toFixed(1)}`)
    .join(' ');

  const bhPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.buyHold).toFixed(1)}`)
    .join(' ');

  const activePoint = hoverIdx !== null ? points[hoverIdx] : points[points.length - 1];

  // Defensive de-duplication: Ensure strictly no duplicate orders or degenerate same-date trades are displayed
  const displayTrades = React.useMemo(() => {
    const list = trades || [];
    const seen = new Set<string>();
    const res: typeof list = [];
    for (const tr of list) {
      if (!tr.entryDate || !tr.exitDate || tr.entryDate === tr.exitDate) continue;
      const key = `${tr.entryDate}_${tr.exitDate}_${tr.entryPrice}_${tr.exitPrice}`;
      if (!seen.has(key)) {
        seen.add(key);
        res.push(tr);
      }
    }
    return res;
  }, [trades]);

  return (
    <div className="space-y-6 pt-2">
      {/* Overview Intro */}
      <div>
        <h3 className="text-base font-semibold text-slate-200">
          Walk-Forward Strategy Simulation — {ticker}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Walk-forward backtest simulating algorithmic execution with disciplined stop-loss protection and 15 bps transaction drag.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-xs text-slate-400">Cumulative Return</span>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {metrics.strategyReturnPct >= 0 ? '+' : ''}{metrics.strategyReturnPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {isAlphaPositive ? '+' : ''}{(metrics.strategyReturnPct - metrics.buyHoldReturnPct).toFixed(1)}% vs B&H
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-xs text-slate-400">Buy & Hold Return</span>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-300 mt-1">
            {metrics.buyHoldReturnPct >= 0 ? '+' : ''}{metrics.buyHoldReturnPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Benchmark Asset</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-xs text-slate-400">Sharpe Ratio</span>
          <div className="text-lg font-bold font-mono tabular-nums text-indigo-400 mt-1">
            {metrics.sharpeRatio.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Rf = 5.0% Annual</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-xs text-slate-400">Max Drawdown</span>
          <div className="text-lg font-bold font-mono tabular-nums text-rose-400 mt-1">
            {metrics.maxDrawdownPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">B&H: {metrics.buyHoldMaxDrawdownPct.toFixed(1)}%</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-xs text-slate-400">Win Rate</span>
          <div className="text-lg font-bold font-mono tabular-nums text-amber-400 mt-1">
            {metrics.totalTrades === 0 ? 'No trades' : `${metrics.winRatePct.toFixed(1)}%`}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {metrics.totalTrades === 0 ? '0 trades in this period' : `${metrics.winningTrades} of ${metrics.totalTrades} Won`}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-xs text-slate-400">Total Trades</span>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-200 mt-1">
            {metrics.totalTrades}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Round-Trip Swings</div>
        </div>
      </div>

      {/* Cumulative Return Equity Curve Chart */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
        <div className="flex flex-wrap items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-200">Portfolio Equity Trajectory (Base: {currSym}{metrics.initialCapital.toLocaleString(locale)})</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Quantitative Strategy
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-0.5 bg-slate-400 inline-block border-t border-dashed" /> Buy & Hold
              </span>
            </div>
          </div>
          {activePoint && (
            <div className="font-mono text-slate-300">
              <span className="text-slate-500 mr-2">{activePoint.date}:</span>
              <span className="text-emerald-400 font-semibold mr-3">Strategy: {currSym}{activePoint.strategy.toLocaleString(locale)}</span>
              <span className="text-slate-400">B&H: {currSym}{activePoint.buyHold.toLocaleString(locale)}</span>
            </div>
          )}
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const ratio = (relX - padLeft) / chartW;
            const idx = Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1))));
            setHoverIdx(idx);
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, idx) => {
            const y = padTop + pct * chartH;
            const val = maxVal - pct * (maxVal - minVal);
            return (
              <g key={`eq-grid-${idx}`}>
                <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                <text x={padLeft + chartW + 6} y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                  {currSym}{Math.round(val).toLocaleString(locale)}
                </text>
              </g>
            );
          })}

          {/* Curves */}
          <path d={bhPath} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d={stratPath} fill="none" stroke="#10b981" strokeWidth="2.2" />

          {/* Hover indicator */}
          {hoverIdx !== null && (
            <g pointerEvents="none">
              <line
                x1={getX(hoverIdx)}
                y1={padTop}
                x2={getX(hoverIdx)}
                y2={padTop + chartH}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIdx)}
                cy={getY(points[hoverIdx].strategy)}
                r="4"
                fill="#10b981"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* X Dates */}
          <g fill="#64748b" fontSize="9" fontFamily="monospace">
            {[0, 0.33, 0.66, 1].map((pct, idx) => {
              const i = Math.min(n - 1, Math.round(pct * (n - 1)));
              const p = points[i];
              if (!p) return null;
              return (
                <text key={`d-${idx}`} x={getX(i)} y={height - 8} textAnchor="middle">
                  {p.date}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Recent Trade History Log */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Recent Executed Trades
        </h4>
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Entry Date</th>
                <th className="py-2.5 px-3">Exit Date</th>
                <th className="py-2.5 px-3">Entry Price ({currSym})</th>
                <th className="py-2.5 px-3">Exit Price ({currSym})</th>
                <th className="py-2.5 px-3 text-right">Return %</th>
                <th className="py-2.5 px-3 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {displayTrades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 px-3 text-center text-slate-500">
                    No trades executed in the sample timeframe.
                  </td>
                </tr>
              ) : (
                displayTrades.map((tr, i) => (
                  <tr key={`${tr.entryDate}-${tr.exitDate}-${tr.entryPrice}-${i}`} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3">{tr.entryDate}</td>
                    <td className="py-2 px-3">{tr.exitDate}</td>
                    <td className="py-2 px-3">{currSym}{tr.entryPrice.toLocaleString(locale, { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3">{currSym}{tr.exitPrice.toLocaleString(locale, { minimumFractionDigits: 2 })}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${tr.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tr.returnPct >= 0 ? '+' : ''}{tr.returnPct.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        tr.won ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                      }`}>
                        {tr.won ? 'GAIN' : 'LOSS'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
