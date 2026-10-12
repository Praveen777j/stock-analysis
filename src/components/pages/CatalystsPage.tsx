import React from 'react';
import { ModelSignal, StockQuote } from '../../types';
import {
  Flame,
  TrendingUp,
  Newspaper,
  MessageSquare,
  Activity,
  Zap,
  Target
} from 'lucide-react';

interface CatalystsPageProps {
  signal: ModelSignal;
  quote: StockQuote;
}

export const CatalystsPage: React.FC<CatalystsPageProps> = ({ signal, quote }) => {
  const catalysts = signal.catalysts || [];
  const action = signal.exactAction || signal.signal;
  const isSell = action.includes('SELL');

  return (
    <div className="space-y-6 pt-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-emerald-500/20 text-emerald-400">
              <Flame className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-100 font-mono">
              {isSell ? 'Turnaround Requirements & Reversal Triggers' : 'Market Catalysts & Expansion Drivers'} — {quote.ticker}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Key corporate announcements, retail community momentum, and technical breakout triggers evaluated for forward alpha.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Upward Probability:</span>
          <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-400 border border-slate-700 font-bold">
            {signal.upwardProbabilityPct || 72}% Momentum Edge
          </span>
        </div>
      </div>

      {/* Catalysts Grid */}
      {catalysts.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 font-mono text-xs space-y-2">
          <Activity className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-slate-300 font-semibold text-sm">No Active Catalysts Verified</div>
          <p className="text-slate-500 max-w-md mx-auto text-[11px] leading-relaxed">
            Catalysts require verified factual news or live social sentiment records. When external data is not retrieved, simulated upside claims are disabled.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {catalysts.map((cat, idx) => (
            <div
              key={idx}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl space-y-3 text-xs transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    {cat.source === 'NEWS_API' ? (
                      <>
                        <Newspaper className="w-3.5 h-3.5 text-emerald-400" />
                        <span>News Feed</span>
                      </>
                    ) : cat.source === 'REDDIT_SOCIAL' ? (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                        <span>Social Buzz</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Technicals</span>
                      </>
                    )}
                  </span>
                  <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800/80">
                    {cat.upsidePotential}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-slate-100 leading-snug pt-1">
                  {cat.title}
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {cat.reasoning}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Impact Score: +{cat.impactScore}</span>
                <span className="text-slate-400 font-sans">{cat.category}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
