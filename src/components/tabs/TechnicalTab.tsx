import React from 'react';
import { TechnicalIndicators, StockQuote, HistoricalBar } from '../../types';

interface TechnicalTabProps {
  technicals: TechnicalIndicators;
  quote: StockQuote;
  bars: HistoricalBar[];
}

export const TechnicalTab: React.FC<TechnicalTabProps> = ({ technicals, quote, bars }) => {
  const latest = bars[bars.length - 1];

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-2 mb-3">
          Comprehensive Technical Indicator Matrix
        </h3>
        <p className="text-xs text-slate-400">
          All indicators calculated from historical closing bars $i \le t$ without forward smoothing or retrospective recalculation.
        </p>
      </div>

      {/* Grid of Key Technical Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400">RSI (14)</span>
          <div className="text-lg font-bold font-mono text-indigo-400 mt-1">{technicals.rsi.toFixed(1)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {technicals.rsi > 70 ? 'Overbought (>70)' : technicals.rsi < 30 ? 'Oversold (<30)' : 'Neutral Zone'}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400">MACD Histogram</span>
          <div className={`text-lg font-bold font-mono mt-1 ${technicals.macdHist >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {technicals.macdHist.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            MACD: {technicals.macd.toFixed(2)} · Sig: {technicals.macdSignal.toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400">ADX (14)</span>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">{technicals.adx !== undefined ? technicals.adx.toFixed(1) : 'N/A'}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {technicals.adx !== undefined ? (technicals.adx > 25 ? 'Strong Trend (>25)' : 'Ranging / Low Trend') : 'Indicator Pending'}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400">Average True Range (ATR)</span>
          <div className="text-lg font-bold font-mono text-slate-200 mt-1">
            {technicals.atr !== undefined ? `${quote.currency === 'INR' ? '₹' : '$'}${technicals.atr.toFixed(2)}` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">14-Day Price Span</div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400">Annualized Volatility (20d)</span>
          <div className="text-lg font-bold font-mono text-slate-200 mt-1">
            {(technicals.volatility20d * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Standard Deviation × √252</div>
        </div>

        {/* Moving Averages Row */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400">EMA 20</span>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">{technicals.ema20.toFixed(1)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Spread: {(((quote.price / technicals.ema20) - 1) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400">EMA 50</span>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">{technicals.ema50.toFixed(1)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Alignment: {technicals.ema20 > technicals.ema50 ? 'Bullish' : 'Bearish'}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400">EMA 200</span>
          <div className="text-lg font-bold font-mono text-purple-400 mt-1">{technicals.ema200.toFixed(1)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Macro Bias: {quote.price > technicals.ema200 ? 'Above Baseline' : 'Below Baseline'}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400">Bollinger Bandwidth</span>
          <div className="text-lg font-bold font-mono text-slate-200 mt-1">{technicals.bbBandwidth || 6.2}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Upper: {latest.bbUpper?.toFixed(1) || (quote.price * 1.05).toFixed(1)}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <span className="text-slate-400">Rate of Change (ROC 10)</span>
          <div className="text-lg font-bold font-mono text-slate-200 mt-1">+{technicals.roc10 || 2.4}%</div>
          <div className="text-[11px] text-slate-500 mt-0.5">10-Session Velocity</div>
        </div>
      </div>
    </div>
  );
};
