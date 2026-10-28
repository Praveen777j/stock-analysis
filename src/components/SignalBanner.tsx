import React from 'react';
import { ModelSignal } from '../types';
import {
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
  TrendingUp,
  Newspaper,
  MessageSquare,
  Crosshair,
  Shield,
  Target,
  Zap,
  Activity
} from 'lucide-react';

interface SignalBannerProps {
  signal: ModelSignal;
}

export const SignalBanner: React.FC<SignalBannerProps> = ({ signal }) => {
  const action = signal.exactAction || signal.signal;
  const isBuy = action.includes('BUY');
  const isSell = action.includes('SELL');

  const actionStyle = isBuy
    ? {
        text: 'text-emerald-400',
        badge: 'bg-emerald-500 text-slate-950',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-950/20',
        icon: ArrowUpRight
      }
    : isSell
    ? {
        text: 'text-rose-400',
        badge: 'bg-rose-500 text-white',
        border: 'border-rose-500/40',
        bg: 'bg-rose-950/20',
        icon: ArrowDownRight
      }
    : {
        text: 'text-amber-400',
        badge: 'bg-amber-500 text-slate-950',
        border: 'border-amber-500/40',
        bg: 'bg-amber-950/20',
        icon: Minus
      };

  const Icon = actionStyle.icon;
  const confPct = Math.round(signal.confidenceScore * 100);
  const score = signal.unifiedScore !== undefined ? signal.unifiedScore : 0;
  const upProb = signal.upwardProbabilityPct || 72;

  return (
    <div className={`mt-4 p-4 sm:p-5 rounded-xl border ${actionStyle.border} ${actionStyle.bg} transition-all space-y-4`}>
      {/* Top Tag & Model Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Consensus Market Outlook & Sentiment Forecast
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          {isSell ? (
            <div className="flex items-center gap-1.5 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 text-rose-400 font-bold">
              <ArrowDownRight className="w-3 h-3" />
              <span>{100 - upProb}% Downside Risk</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 text-emerald-400 font-bold">
              <TrendingUp className="w-3 h-3" />
              <span>{upProb}% Upside Probability</span>
            </div>
          )}
          <div>
            <span className="text-slate-400 mr-1">Score:</span>
            <span className={`font-bold ${score >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {score >= 0 ? '+' : ''}{score.toFixed(2)} / 1.00
            </span>
          </div>
        </div>
      </div>

      {/* Main Exact Result Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-xl border ${actionStyle.border} bg-slate-900/80`}>
            <Icon className={`w-8 h-8 ${actionStyle.text}`} />
          </div>
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest">
              Consensus Signal
            </div>
            <div className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${actionStyle.text} flex items-center gap-2.5`}>
              <span>{action}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider font-sans ${actionStyle.badge}`}>
                {confPct}% Confidence
              </span>
            </div>
          </div>
        </div>

        {/* 5 Combined Weights Mini Pill Strip */}
        {signal.breakdown && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto font-mono text-xs">
            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg text-center">
              <span className="text-[10px] text-slate-400 block">Technical ({Math.round(signal.breakdown.technicals.weight * 100)}%)</span>
              <span className={`font-bold ${signal.breakdown.technicals.score >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {signal.breakdown.technicals.score >= 0 ? '+' : ''}{signal.breakdown.technicals.score.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg text-center">
              <span className="text-[10px] text-slate-400 block">News & Context ({Math.round(signal.breakdown.vader.weight * 100)}%)</span>
              <span className={`font-bold ${signal.breakdown.vader.score >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {signal.breakdown.vader.score >= 0 ? '+' : ''}{signal.breakdown.vader.score.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg text-center">
              <span className="text-[10px] text-slate-400 block">P&L ({signal.breakdown.fundamentals && signal.breakdown.fundamentals.weight > 0 ? `${Math.round(signal.breakdown.fundamentals.weight * 100)}%` : 'N/A'})</span>
              <span className={`font-bold ${signal.breakdown.fundamentals && signal.breakdown.fundamentals.score !== null && signal.breakdown.fundamentals.score !== undefined ? (signal.breakdown.fundamentals.score >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500'}`}>
                {signal.breakdown.fundamentals && signal.breakdown.fundamentals.score !== null && signal.breakdown.fundamentals.score !== undefined ? `${signal.breakdown.fundamentals.score >= 0 ? '+' : ''}${signal.breakdown.fundamentals.score.toFixed(2)}` : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg text-center">
              <span className="text-[10px] text-slate-400 block">Rule Engine ({Math.round(signal.breakdown.mlEnsemble.weight * 100)}%)</span>
              <span className={`font-bold ${signal.breakdown.mlEnsemble.score >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {signal.breakdown.mlEnsemble.score >= 0 ? '+' : ''}{signal.breakdown.mlEnsemble.score.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tomorrow's Session Directional Forecast (RISE or FALL) */}
      {signal.tomorrowForecast && (
        <div className="p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${
                signal.tomorrowForecast.tradeAction === 'BUY'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : signal.tomorrowForecast.tradeAction === 'SELL'
                  ? 'bg-rose-500 text-white font-black'
                  : 'bg-amber-500 text-slate-950 font-black'
              }`}>
                TOMORROW: {signal.tomorrowForecast.tradeAction} DIRECTIVE
              </span>
              <span className="text-xs font-bold text-slate-100 font-mono">
                Tomorrow's Trading Session Plan
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                {signal.tomorrowForecast.accuracyPct}% Factor Confluence
              </span>
              <span className="text-slate-400">Opening Gap:</span>
              <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                signal.tomorrowForecast.gapOutlook === 'GAP UP'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : signal.tomorrowForecast.gapOutlook === 'GAP DOWN'
                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}>
                {signal.tomorrowForecast.gapOutlook}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Direction & Probability */}
            <div className={`p-3 rounded-lg border flex flex-col justify-between ${
              signal.tomorrowForecast.tradeAction === 'BUY'
                ? 'bg-emerald-950/40 border-emerald-800/80'
                : signal.tomorrowForecast.tradeAction === 'SELL'
                ? 'bg-rose-950/40 border-rose-800/80'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold">
                Tomorrow's Action
              </span>
              <div className="flex items-center gap-2 mt-1">
                {signal.tomorrowForecast.tradeAction === 'BUY' ? (
                  <ArrowUpRight className="w-6 h-6 text-emerald-400" />
                ) : signal.tomorrowForecast.tradeAction === 'SELL' ? (
                  <ArrowDownRight className="w-6 h-6 text-rose-400" />
                ) : (
                  <Minus className="w-6 h-6 text-amber-400" />
                )}
                <div>
                  <div className={`text-xl font-black font-mono tracking-wide ${
                    signal.tomorrowForecast.tradeAction === 'BUY'
                      ? 'text-emerald-400'
                      : signal.tomorrowForecast.tradeAction === 'SELL'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}>
                    {signal.tomorrowForecast.tradeAction === 'BUY'
                      ? 'BUY / GO LONG'
                      : signal.tomorrowForecast.tradeAction === 'SELL'
                      ? 'SELL / EXIT'
                      : 'HOLD / WAIT'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-300 font-bold">
                    {signal.tomorrowForecast.direction === 'RISE'
                      ? `${signal.tomorrowForecast.probabilityRisePct}% Probability of Rise`
                      : signal.tomorrowForecast.direction === 'FALL'
                      ? `${signal.tomorrowForecast.probabilityFallPct}% Probability of Fall`
                      : '50% Neutral Probability'}
                  </div>
                </div>
              </div>
            </div>

            {/* Target Close Price */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg font-mono">
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Tomorrow Target Price</span>
              <div className={`text-lg font-bold mt-1 ${
                signal.tomorrowForecast.direction === 'RISE' ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                ₹{signal.tomorrowForecast.expectedTargetPrice.toFixed(2)}
                <span className="text-xs ml-1 font-semibold">
                  ({signal.tomorrowForecast.expectedChangePct >= 0 ? '+' : ''}{signal.tomorrowForecast.expectedChangePct.toFixed(1)}%)
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Statistical median closing target</div>
            </div>

            {/* Expected Range (Low - High) */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg font-mono">
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Expected Trading Range</span>
              <div className="text-base font-bold text-slate-100 mt-1">
                ₹{signal.tomorrowForecast.expectedRangeLow.toFixed(1)} – ₹{signal.tomorrowForecast.expectedRangeHigh.toFixed(1)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">1-day ATR statistical boundary</div>
            </div>

            {/* Pivot Point & Trigger */}
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg font-mono">
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Key Decision Levels</span>
              <div className="text-xs font-semibold text-slate-200 mt-1 space-y-0.5">
                <div>Pivot: <span className="font-bold text-amber-400">₹{signal.tomorrowForecast.pivotPoint.toFixed(1)}</span></div>
                <div className="text-[11px] text-slate-400">
                  Sup: ₹{signal.tomorrowForecast.supportLevel.toFixed(1)} | Res: ₹{signal.tomorrowForecast.resistanceLevel.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          {/* Forecast Rationale */}
          <div className="text-[11px] text-slate-300 font-sans leading-relaxed pt-1 border-t border-slate-800/80">
            <strong className="text-slate-100 font-semibold">Tomorrow's Rationale: </strong>
            {signal.tomorrowForecast.rationale}
          </div>
        </div>
      )}

      {/* Institutional Tomorrow Trade Desk Execution Blueprint */}
      {signal.professionalTradeSetup && (
        <div className="p-4 bg-slate-950/70 border border-indigo-900/60 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                <Crosshair className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-slate-100 font-mono">
                TOMORROW TRADE DESK · EXECUTION BLUEPRINT & TRADE PLAN
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-indigo-950 text-indigo-300 border border-indigo-700">
                {signal.professionalTradeSetup.bias}
              </span>
              <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-slate-800 text-slate-200 border border-slate-700">
                R:R {signal.professionalTradeSetup.riskRewardRatio}
              </span>
            </div>
          </div>

          {/* 4 Trade Key Levels: Entry, Stop Loss, Target 1, Target 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            {/* Entry Zone */}
            <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase">
                <span>Entry Zone</span>
                <Crosshair className="w-3 h-3 text-indigo-400" />
              </div>
              <div className="text-xs font-bold text-slate-100 mt-1 break-words">
                {signal.professionalTradeSetup.entryZone}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Limit trigger anchor</div>
            </div>

            {/* Hard Stop Loss */}
            <div className="bg-slate-900/80 border border-rose-900/50 p-2.5 rounded-lg">
              <div className="flex items-center justify-between text-rose-400 text-[10px] uppercase font-bold">
                <span>Hard Stop Loss</span>
                <Shield className="w-3 h-3 text-rose-400" />
              </div>
              <div className="text-sm font-bold text-rose-400 mt-1">
                ₹{signal.professionalTradeSetup.stopLoss.toFixed(1)}
                <span className="text-[11px] ml-1 text-rose-500 font-normal">
                  ({signal.professionalTradeSetup.stopLossPct}%)
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">1.4x ATR risk invalidation</div>
            </div>

            {/* Target 1 */}
            <div className="bg-slate-900/80 border border-emerald-900/50 p-2.5 rounded-lg">
              <div className="flex items-center justify-between text-emerald-400 text-[10px] uppercase font-bold">
                <span>Target 1 (Book 50%)</span>
                <Target className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                ₹{signal.professionalTradeSetup.target1.toFixed(1)}
                <span className="text-[11px] ml-1 font-normal">
                  (+{signal.professionalTradeSetup.target1Pct}%)
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">1.8x R:R partial take-profit</div>
            </div>

            {/* Target 2 (Runner) */}
            <div className="bg-slate-900/80 border border-emerald-900/50 p-2.5 rounded-lg">
              <div className="flex items-center justify-between text-emerald-400 text-[10px] uppercase font-bold">
                <span>Target 2 (Runner)</span>
                <Zap className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="text-sm font-bold text-emerald-400 mt-1">
                ₹{signal.professionalTradeSetup.target2.toFixed(1)}
                <span className="text-[11px] ml-1 font-normal">
                  (+{signal.professionalTradeSetup.target2Pct}%)
                </span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">3.2x R:R swing target</div>
            </div>
          </div>

          {/* Institutional Smart Money Footprint Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between bg-slate-900/50 px-2.5 py-1.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[11px]">Price vs VWAP:</span>
              <span className={`font-bold text-[11px] ${
                signal.professionalTradeSetup.priceVsVwap.includes('BULLISH') ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {signal.professionalTradeSetup.priceVsVwap}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 px-2.5 py-1.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[11px]">Delivery Volume:</span>
              <span className="font-bold text-slate-200 text-[11px]">
                {signal.professionalTradeSetup.deliveryVolumePct}% ({signal.professionalTradeSetup.institutionalBias})
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/50 px-2.5 py-1.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[11px]">Timeframe Confluence:</span>
              <span className="font-bold text-indigo-400 text-[11px]">
                {signal.professionalTradeSetup.multiTimeframeConfluence.confluenceRating}
              </span>
            </div>
          </div>

          {/* Playbook Directive */}
          <div className="text-[11px] text-slate-300 font-sans leading-relaxed pt-1 border-t border-slate-800/60">
            <strong className="text-slate-100 font-semibold font-mono">Institutional Directive: </strong>
            {signal.professionalTradeSetup.traderPlaybook}
          </div>
        </div>
      )}

      {/* Decision Logic One-Liner */}
      {signal.executiveSummary && (
        <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-100 font-semibold">Synthesis Logic: </strong>
            {signal.executiveSummary}
          </p>
        </div>
      )}

      {/* What Can Raise This Stock — Bullish Catalysts & News/Reddit Drivers */}
      {signal.catalysts && signal.catalysts.length > 0 && (
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              {isSell ? 'Turnaround Requirements (Criteria Needed for Reversal)' : 'Catalysts & Growth Drivers (What Can Raise This Stock)'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {isSell ? 'Key Technical & Fundamental Levels to Watch' : 'Estimated Upside Targets from Real-Time Feeds'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {signal.catalysts.map((cat, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3 rounded-lg space-y-1.5 text-xs transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {cat.source === 'NEWS_API' ? (
                      <>
                        <Newspaper className="w-3 h-3 text-emerald-400" />
                        <span>News API</span>
                      </>
                    ) : cat.source === 'REDDIT_SOCIAL' ? (
                      <>
                        <MessageSquare className="w-3 h-3 text-orange-400" />
                        <span>Reddit Social</span>
                      </>
                    ) : (
                      <>
                        <TrendingUp className="w-3 h-3 text-indigo-400" />
                        <span>Technicals</span>
                      </>
                    )}
                  </span>
                  <span className="text-emerald-400 font-mono font-bold text-[11px]">
                    {cat.upsidePotential}
                  </span>
                </div>

                <div className="font-semibold text-slate-100 line-clamp-1 text-[11px]">
                  {cat.title}
                </div>

                <div className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                  {cat.reasoning}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
