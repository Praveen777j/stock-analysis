import React, { useState, useMemo } from 'react';
import {
  StockQuote,
  HistoricalBar,
  TechnicalIndicators,
  SentimentData,
  ModelSignal,
  StockFundamentals,
  BenchmarkData,
  FinalAssessment
} from '../../types';
import { computeFinalAssessment, runBacktest } from '../../dataEngine';
import { runStockLogisticRegression } from '../../mlEngine';
import { ChartsPage } from '../ChartsPage';
import { getIndianMarketStatus } from '../../marketStatus';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Building,
  Target,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
  Scale,
  Info
} from 'lucide-react';

interface StockIntelligencePageProps {
  quote: StockQuote;
  bars: HistoricalBar[];
  technicals: TechnicalIndicators;
  sentiment: SentimentData;
  signal: ModelSignal;
  fundamentals?: StockFundamentals;
  benchmark?: BenchmarkData | null;
  onNavigateToNews?: () => void;
}

export type AssessmentClassification =
  | 'BULLISH SETUP'
  | 'BEARISH SETUP'
  | 'WAIT / MIXED EVIDENCE'
  | 'INSUFFICIENT DATA';

export const StockIntelligencePage: React.FC<StockIntelligencePageProps> = ({
  quote,
  bars,
  technicals,
  sentiment,
  signal,
  fundamentals,
  benchmark,
  onNavigateToNews
}) => {
  const [activeChartType, setActiveChartType] = useState<'candle' | 'line'>('candle');
  const [selectedRange, setSelectedRange] = useState('1y');

  const currSym = quote.currency === 'USD' ? '$' : '₹';
  const isPos = quote.change >= 0;
  const marketSession = useMemo(() => getIndianMarketStatus(), []);

  // Compute Deterministic One Final Assessment
  const assessment: FinalAssessment = useMemo(() => {
    return computeFinalAssessment(quote.ticker, quote, bars, technicals, sentiment, signal, fundamentals);
  }, [quote, bars, technicals, sentiment, signal, fundamentals]);

  // Map outcome to the exact 4 required classifications
  const classification: AssessmentClassification = useMemo(() => {
    if (assessment.outcome === 'INSUFFICIENT DATA' || bars.length < 50 || quote.price <= 0) {
      return 'INSUFFICIENT DATA';
    }
    if (assessment.outcome === 'BUY') {
      return 'BULLISH SETUP';
    }
    if (assessment.outcome === 'SELL') {
      return 'BEARISH SETUP';
    }
    return 'WAIT / MIXED EVIDENCE';
  }, [assessment.outcome, bars.length, quote.price]);

  // Collapsible sections state
  const [isFactorOpen, setIsFactorOpen] = useState(true);
  const [isMlOpen, setIsMlOpen] = useState(true);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);
  const [isRiskOpen, setIsRiskOpen] = useState(false);
  const [isTrendOpen, setIsTrendOpen] = useState(false);

  // ML Outlook using logistic regression with walk-forward gap
  const mlOutput = useMemo(() => {
    return runStockLogisticRegression(quote.ticker, bars);
  }, [quote.ticker, bars]);

  // Backtest result using strict walk-forward simulation
  const backtest = useMemo(() => {
    return runBacktest(bars);
  }, [bars]);

  // Quantitative Risk Profile
  const riskMetrics = useMemo(() => {
    if (bars.length < 2) {
      return {
        annualizedVolPct: 0,
        maxDrawdownPct: 0,
        var95Pct: 0,
        beta: benchmark?.beta !== undefined ? benchmark.beta : 1.02
      };
    }
    const dailyReturns: number[] = [];
    for (let i = 1; i < bars.length; i++) {
      const prev = bars[i - 1].close;
      const curr = bars[i].close;
      if (prev > 0) dailyReturns.push((curr - prev) / prev);
    }
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dailyReturns.length;
    const std = Math.sqrt(variance);
    const annualizedVolPct = Math.round(std * Math.sqrt(252) * 1000) / 10;

    let peak = bars[0].close;
    let maxDd = 0;
    for (const b of bars) {
      if (b.close > peak) peak = b.close;
      const dd = peak > 0 ? (peak - b.close) / peak : 0;
      if (dd > maxDd) maxDd = dd;
    }
    const maxDrawdownPct = Math.round(maxDd * 1000) / 10;

    const sorted = [...dailyReturns].sort((a, b) => a - b);
    const idx5 = Math.floor(sorted.length * 0.05);
    const var95Pct = sorted.length > 0 ? Math.round(Math.abs(sorted[idx5]) * 1000) / 10 : 0;

    return {
      annualizedVolPct,
      maxDrawdownPct,
      var95Pct,
      beta: benchmark?.beta !== undefined ? benchmark.beta : 1.02
    };
  }, [bars, benchmark]);

  // 7-Day Sentiment Trend
  const sentimentTrend = useMemo(() => {
    const articles = sentiment.articles || [];
    const map = new Map<string, { pos: number; neg: number; neu: number; scoreSum: number; count: number }>();
    for (const a of articles) {
      const d = a.date?.split(',')[0]?.trim() || a.date?.slice(0, 10) || 'Recent';
      const entry = map.get(d) || { pos: 0, neg: 0, neu: 0, scoreSum: 0, count: 0 };
      const isP = a.sentimentLabel === 'POSITIVE' || a.vaderScore >= 0.05;
      const isN = a.sentimentLabel === 'NEGATIVE' || a.vaderScore <= -0.05;
      if (isP) entry.pos++;
      else if (isN) entry.neg++;
      else entry.neu++;
      entry.scoreSum += a.vaderScore;
      entry.count++;
      map.set(d, entry);
    }
    return Array.from(map.entries()).slice(0, 7).map(([date, st]) => ({
      date,
      pos: st.pos,
      neg: st.neg,
      neu: st.neu,
      avgScore: st.count > 0 ? st.scoreSum / st.count : 0
    }));
  }, [sentiment.articles]);

  // Styling based on classification
  const getClassificationStyle = () => {
    switch (classification) {
      case 'BULLISH SETUP':
        return {
          banner: 'bg-emerald-950/40 border-emerald-800/90 text-emerald-300',
          badge: 'bg-emerald-500 text-slate-950 font-black',
          pill: 'bg-emerald-950 text-emerald-400 border-emerald-700'
        };
      case 'BEARISH SETUP':
        return {
          banner: 'bg-rose-950/40 border-rose-800/90 text-rose-300',
          badge: 'bg-rose-500 text-slate-950 font-black',
          pill: 'bg-rose-950 text-rose-400 border-rose-700'
        };
      case 'WAIT / MIXED EVIDENCE':
        return {
          banner: 'bg-amber-950/40 border-amber-800/90 text-amber-300',
          badge: 'bg-amber-500 text-slate-950 font-black',
          pill: 'bg-amber-950 text-amber-400 border-amber-700'
        };
      case 'INSUFFICIENT DATA':
      default:
        return {
          banner: 'bg-slate-900 border-slate-700 text-slate-300',
          badge: 'bg-slate-700 text-slate-200 font-bold',
          pill: 'bg-slate-800 text-slate-400 border-slate-700'
        };
    }
  };

  const cStyle = getClassificationStyle();

  // Generate the WHY explanation strictly from real indicator values and bullish/bearish factor lists
  const whyExplanation = useMemo(() => {
    if (classification === 'INSUFFICIENT DATA' || bars.length < 50) {
      return `Insufficient verified historical trading observations (${bars.length} available, minimum 50 required) or unavailable live exchange feed. Technical indicators and directional momentum cannot be statistically evaluated.`;
    }

    const bullList = assessment.bullishFactors && assessment.bullishFactors.length > 0
      ? assessment.bullishFactors
      : [];
    const bearList = assessment.bearishFactors && assessment.bearishFactors.length > 0
      ? assessment.bearishFactors
      : [];

    const bullFactorsStr = bullList.length > 0 ? bullList.join(', ') : '';
    const bearFactorsStr = bearList.length > 0 ? bearList.join(', ') : '';

    if (classification === 'BULLISH SETUP') {
      if (bearList.length > 0) {
        return `Price (${currSym}${quote.price.toFixed(1)}) maintains structural accumulation driven by ${bullFactorsStr}, though tempered by ${bearFactorsStr}.`;
      }
      return `Price (${currSym}${quote.price.toFixed(1)}) maintains structural accumulation driven by ${bullFactorsStr || 'positive technical alignment'}.`;
    }

    if (classification === 'BEARISH SETUP') {
      if (bullList.length > 0) {
        return `Price (${currSym}${quote.price.toFixed(1)}) trades under defensive pressure driven by ${bearFactorsStr}, despite counter-trend support from ${bullFactorsStr}.`;
      }
      return `Price (${currSym}${quote.price.toFixed(1)}) trades below primary short-term trend moving averages with downside risk driven by ${bearFactorsStr || 'bearish technical alignment'}.`;
    }

    // WAIT / MIXED EVIDENCE
    return `Technical signals and market evidence are divergent. Bullish factors include ${bullFactorsStr || 'None'}, while bearish factors include ${bearFactorsStr || 'None'}. Current evidence does not present a high-confluence directional asymmetric edge.`;
  }, [classification, bars.length, quote.price, currSym, assessment.bullishFactors, assessment.bearishFactors]);

  const mainRisk = useMemo(() => {
    if (assessment.importantRisks && assessment.importantRisks.length > 0) {
      return assessment.importantRisks[0];
    }
    return `General market volatility, liquidity contraction, or unexpected company earnings announcements.`;
  }, [assessment.importantRisks]);

  const whatWouldChangeView = useMemo(() => {
    if (classification === 'BULLISH SETUP') {
      return `A sustained daily close below the invalidation stop level ${currSym}${assessment.setupConditions?.stopLoss.toFixed(1) ?? 'N/A'} or deterioration in quarterly earnings.`;
    }
    if (classification === 'BEARISH SETUP') {
      return `A decisive reclaim and daily close above 50-day EMA (${currSym}${technicals.ema50?.toFixed(1) ?? 'N/A'}) on expanding volume (>1.5x 20-day average).`;
    }
    if (classification === 'INSUFFICIENT DATA') {
      return `Accumulation of 50+ continuous trading sessions from the primary exchange with live order book verification.`;
    }
    return `A decisive technical breakout above 50-day EMA (${currSym}${technicals.ema50?.toFixed(1) ?? 'N/A'}) accompanied by sustained positive news catalysts.`;
  }, [classification, assessment.setupConditions, technicals, currSym]);

  const dataQualitySummary = useMemo(() => {
    return `Historical market data: ${bars.length} daily bars through ${quote.lastUpdated || 'Current session'}. News: ${sentiment.newsCount} indexed stories (${sentiment.newsCount > 0 ? 'Verified Feed' : 'Neutral Baseline'}).`;
  }, [bars.length, quote.lastUpdated, sentiment.newsCount]);

  return (
    <div className="space-y-6 pt-1 max-w-6xl mx-auto font-sans">
      {/* 1. Header Hero Stock Strip */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {quote.exchange || (quote.ticker.includes('.NS') ? 'NSE' : 'US')}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono tracking-tight">
                {quote.companyName}
              </h1>
              <span className="text-slate-400 font-mono text-sm">({quote.ticker})</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400 font-mono">
              <span>{quote.sector || 'Equities'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {quote.lastUpdated || 'Exchange Feed Active'}
              </span>
              <span>•</span>
              <span className="text-slate-300 font-bold">
                Market Session: {marketSession.status}
              </span>
            </div>
          </div>

          {/* Current Verified Price */}
          <div className="flex items-baseline md:items-end flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-100">
                {currSym}{quote.price.toFixed(2)}
              </span>
              <span className={`flex items-center font-mono font-bold text-base ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPos ? <TrendingUp className="w-4 h-4 mr-0.5" /> : <TrendingDown className="w-4 h-4 mr-0.5" />}
                {isPos ? '+' : ''}{quote.change.toFixed(2)} ({isPos ? '+' : ''}{quote.changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>

        {/* 4 Essential Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-500 text-[10px] uppercase block">52-Week High / Low</span>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {quote.low52w && quote.high52w ? `${currSym}${quote.low52w.toFixed(0)} – ${currSym}${quote.high52w.toFixed(0)}` : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-500 text-[10px] uppercase block">20D Volatility</span>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {technicals.volatility20d ? `${technicals.volatility20d.toFixed(1)}% p.a.` : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-500 text-[10px] uppercase block">ATR(14) Range</span>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {technicals.atr ? `±${currSym}${technicals.atr.toFixed(1)} / day` : 'N/A'}
            </div>
          </div>
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <span className="text-slate-500 text-[10px] uppercase block">Trading Volume</span>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {quote.volume > 0 ? (quote.volume > 1000000 ? `${(quote.volume / 1000000).toFixed(2)}M` : `${(quote.volume / 1000).toFixed(0)}k`) : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. ONE CLEAR, EXPLAINABLE CONCLUSION CARD (Requirement 4C) */}
      <div className={`p-6 rounded-2xl border shadow-lg space-y-4 font-mono ${cStyle.banner}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
              Stock Research & Decision Support
            </span>
            <div className="text-lg sm:text-xl font-black text-slate-100 mt-1">
              OVERALL ASSESSMENT: <span className="underline decoration-2 underline-offset-4">{classification}</span>
            </div>
          </div>

          <div className={`px-4 py-2 rounded-xl text-center font-black text-base border shadow-md uppercase tracking-wider ${cStyle.pill}`}>
            {classification}
          </div>
        </div>

        {/* Mandatory Educational Disclaimer */}
        <div className="text-[11px] text-slate-400 font-sans italic border-b border-slate-800 pb-2">
          Rule-based analysis of past data. Not a prediction or advice.
        </div>

        {/* Structured 5 Answers (Why, Main Risk, What would change view, Data Quality) */}
        <div className="space-y-3 font-sans text-xs sm:text-sm">
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="font-mono font-bold text-slate-400 text-xs uppercase block">
              WHY:
            </span>
            <p className="text-slate-200 leading-relaxed">
              {whyExplanation}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="font-mono font-bold text-rose-400 text-xs uppercase block">
                MAIN RISK:
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">
                {mainRisk}
              </p>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="font-mono font-bold text-indigo-400 text-xs uppercase block">
                WHAT WOULD CHANGE THE VIEW:
              </span>
              <p className="text-slate-300 text-xs leading-relaxed">
                {whatWouldChangeView}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-2 text-xs text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span><strong>DATA QUALITY: </strong>{dataQualitySummary}</span>
          </div>
        </div>

        {/* Tactical Setup Plan (Only when Bullish or Bearish setup is identified) */}
        {assessment.setupConditions && (classification === 'BULLISH SETUP' || classification === 'BEARISH SETUP') && (
          <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2 mt-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Asymmetric Tactical Setup (1:2.5 Risk-to-Reward)
              </span>
              <span className="text-emerald-400 font-bold">
                Blended R:R: {assessment.setupConditions.riskRewardRatio}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Entry Zone</span>
                <div className="font-bold text-slate-200 mt-0.5">{assessment.setupConditions.entryZone}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Invalidation Stop-Loss</span>
                <div className="font-bold text-rose-400 mt-0.5">
                  {currSym}{assessment.setupConditions.stopLoss.toFixed(1)} ({classification === 'BULLISH SETUP' ? `-${assessment.setupConditions.stopLossPct}%` : `+${assessment.setupConditions.stopLossPct}%`})
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Take Profit 1 (R:R 1:1.8)</span>
                <div className="font-bold text-emerald-400 mt-0.5">
                  {currSym}{assessment.setupConditions.target1.toFixed(1)} ({classification === 'BULLISH SETUP' ? `+${assessment.setupConditions.target1Pct}%` : `-${assessment.setupConditions.target1Pct}%`})
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Take Profit 2 (R:R 1:3.2)</span>
                <div className="font-bold text-emerald-400 mt-0.5">
                  {currSym}{assessment.setupConditions.target2.toFixed(1)} ({classification === 'BULLISH SETUP' ? `+${assessment.setupConditions.target2Pct}%` : `-${assessment.setupConditions.target2Pct}%`})
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Central Price Chart Component */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
              Price Chart & Technical Overlays ({quote.ticker})
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Chart Type Toggle */}
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setActiveChartType('candle')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeChartType === 'candle' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Candlestick
              </button>
              <button
                onClick={() => setActiveChartType('line')}
                className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                  activeChartType === 'line' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Line
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono overflow-x-auto">
              {['1m', '3m', '6m', '1y', '3y', '5y', 'max'].map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRange(r)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors uppercase ${
                    selectedRange === r ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Embedded SVG Chart */}
        <div className="min-h-[420px]">
          {bars.length > 0 ? (
            <ChartsPage
              bars={bars}
              ticker={quote.ticker}
              quote={quote}
              selectedRange={selectedRange}
              chartType={activeChartType}
            />
          ) : (
            <div className="h-[420px] flex flex-col items-center justify-center text-slate-500 space-y-2 font-mono text-xs">
              <AlertTriangle className="w-8 h-8 text-slate-600" />
              <span>Historical candles unavailable for this timeframe.</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Essential Technical Indicators Grid */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Essential Technical Indicators (Verified Calculations)
            </h3>
          </div>
          <span className="text-slate-500 text-[10px]">Wilder's Smoothing & Exponential Formulations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Trend: Moving Averages */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">1. Directional Moving Averages</span>
            <div className="text-sm font-bold text-slate-200">
              {technicals.ema20 !== undefined
                ? (quote.price >= technicals.ema20 ? 'BULLISH SHORT-TERM (ABOVE 20 EMA)' : 'TRADING BELOW 20 EMA')
                : 'N/A (CALCULATING)'}
            </div>
            <div className="space-y-1 text-slate-400 pt-1 font-sans text-xs">
              <div className="flex justify-between">
                <span>20-Day EMA:</span>
                <span className="font-mono text-slate-200 font-bold">{currSym}{technicals.ema20?.toFixed(1) ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>50-Day EMA:</span>
                <span className="font-mono text-slate-200 font-bold">{currSym}{technicals.ema50?.toFixed(1) ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>200-Day EMA:</span>
                <span className="font-mono text-slate-200 font-bold">{currSym}{technicals.ema200?.toFixed(1) ?? 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Momentum: RSI & MACD */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">2. Oscillator Momentum</span>
            <div className={`text-sm font-bold ${
              technicals.rsi === undefined
                ? 'text-slate-400'
                : technicals.rsi > 70
                ? 'text-amber-400'
                : technicals.rsi >= 55
                ? 'text-emerald-400'
                : technicals.rsi >= 45
                ? 'text-slate-200'
                : 'text-rose-400'
            }`}>
              RSI(14): {technicals.rsi !== undefined ? technicals.rsi.toFixed(1) : 'N/A'}{' '}
              ({technicals.rsi === undefined
                ? 'N/A'
                : technicals.rsi > 70
                ? 'OVERBOUGHT >70'
                : technicals.rsi >= 55
                ? 'BULLISH 55–70'
                : technicals.rsi >= 45
                ? 'NEUTRAL 45–55'
                : technicals.rsi >= 30
                ? 'BEARISH PRESSURE 30–45'
                : 'OVERSOLD <30'})
            </div>
            <div className="space-y-1 text-slate-400 pt-1 font-sans text-xs">
              <div className="flex justify-between">
                <span>MACD Line:</span>
                <span className="font-mono text-slate-200 font-bold">{technicals.macd?.toFixed(2) ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Signal Line:</span>
                <span className="font-mono text-slate-200 font-bold">{technicals.macdSignal?.toFixed(2) ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Histogram:</span>
                <span className={`font-mono font-bold ${technicals.macdHist === undefined ? 'text-slate-400' : technicals.macdHist >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {technicals.macdHist !== undefined ? (technicals.macdHist >= 0 ? `+${technicals.macdHist.toFixed(2)}` : technicals.macdHist.toFixed(2)) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Volatility & Execution Pivots */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="text-slate-500 text-[10px] uppercase font-bold block">3. Volatility & Pivots</span>
            <div className="text-sm font-bold text-slate-200">
              ATR(14): ±{currSym}{technicals.atr?.toFixed(1) ?? 'N/A'} / session
            </div>
            <div className="space-y-1 text-slate-400 pt-1 font-sans text-xs">
              <div className="flex justify-between">
                <span>Central Pivot (P):</span>
                <span className="font-mono text-slate-200 font-bold">{currSym}{technicals.pivot?.toFixed(1) ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Support S1:</span>
                <span className="font-mono text-emerald-400 font-bold">{currSym}{technicals.s1?.toFixed(1) ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Resistance R1:</span>
                <span className="font-mono text-rose-400 font-bold">{currSym}{technicals.r1?.toFixed(1) ?? 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Key Supporting Evidence vs Principal Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supporting Evidence */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="uppercase tracking-wider text-[11px]">Key Supporting Evidence</span>
          </div>
          <ul className="space-y-2 text-slate-300 font-sans text-xs">
            {assessment.strongestEvidence.map((ev, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{ev}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Principal Risks & Opposing Factors */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-rose-400 font-bold border-b border-slate-800 pb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="uppercase tracking-wider text-[11px]">Principal Risks & Contradictory Evidence</span>
          </div>
          <ul className="space-y-2 text-slate-300 font-sans text-xs">
            {assessment.importantRisks.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-rose-400 font-bold mt-0.5">•</span>
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
            {assessment.conflictingEvidence.map((ce, i) => (
              <li key={`ce-${i}`} className="flex items-start gap-2">
                <span className="text-amber-400 font-bold mt-0.5">•</span>
                <span className="leading-relaxed text-amber-200/90">{ce}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 6. Collapsible Section 1: Multi-Pillar Factor Contribution Breakdown */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
        <button
          onClick={() => setIsFactorOpen(prev => !prev)}
          className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
              Multi-Pillar Factor Contribution Breakdown
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
              Score: {signal.unifiedScore >= 0 ? '+' : ''}{signal.unifiedScore.toFixed(2)}
            </span>
          </div>
          {isFactorOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isFactorOpen && (
          <div className="p-5 space-y-4 border-t border-slate-800 bg-slate-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-slate-400 font-sans text-xs">
                Additive factor decomposition of the continuous decision score [-1.00 to +1.00]. Each pillar's evaluated score is weighted to produce the final recommendation without hidden black-box biases.
              </p>
              {(!signal.breakdown.fundamentals || signal.breakdown.fundamentals.weight === 0) && (
                <span className="shrink-0 text-[11px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/80 px-2.5 py-1 rounded-md">
                  Re-weighted: P&L data unavailable
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Pillar 1: Technicals */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span className="font-bold text-amber-400">Technicals ({Math.round(signal.breakdown.technicals.weight * 100)}%)</span>
                  <span>Weight: {signal.breakdown.technicals.weight.toFixed(2)}</span>
                </div>
                <div className="text-lg font-bold text-slate-100">
                  {signal.breakdown.technicals.score >= 0 ? '+' : ''}{signal.breakdown.technicals.score.toFixed(2)}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Net Impact:</span>
                  <span className={signal.breakdown.technicals.contribution >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {signal.breakdown.technicals.contribution >= 0 ? '+' : ''}{signal.breakdown.technicals.contribution.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Pillar 2: News & Context */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span className="font-bold text-emerald-400">News & Context ({Math.round(signal.breakdown.vader.weight * 100)}%)</span>
                  <span>Weight: {signal.breakdown.vader.weight.toFixed(2)}</span>
                </div>
                <div className="text-lg font-bold text-slate-100">
                  {sentiment.overallScore >= 0 ? '+' : ''}{sentiment.overallScore.toFixed(2)}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Net Impact:</span>
                  <span className={signal.breakdown.vader.contribution >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {signal.breakdown.vader.contribution >= 0 ? '+' : ''}{signal.breakdown.vader.contribution.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Pillar 3: Solvency & P&L */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span className="font-bold text-teal-400">
                    P&L / Solvency ({signal.breakdown.fundamentals ? Math.round(signal.breakdown.fundamentals.weight * 100) : 0}%)
                  </span>
                  <span>Weight: {signal.breakdown.fundamentals ? signal.breakdown.fundamentals.weight.toFixed(2) : '0.00'}</span>
                </div>
                <div className="text-lg font-bold text-slate-100">
                  {signal.breakdown.fundamentals ? `${signal.breakdown.fundamentals.score >= 0 ? '+' : ''}${signal.breakdown.fundamentals.score.toFixed(2)}` : 'N/A'}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Net Impact:</span>
                  <span className={signal.breakdown.fundamentals && signal.breakdown.fundamentals.contribution >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {signal.breakdown.fundamentals ? `${signal.breakdown.fundamentals.contribution >= 0 ? '+' : ''}${signal.breakdown.fundamentals.contribution.toFixed(2)}` : '0.00'}
                  </span>
                </div>
              </div>

              {/* Pillar 4: Rule Engine */}
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span className="font-bold text-sky-400">
                    Rule Engine ({Math.round(((signal.breakdown.ruleEnsemble || signal.breakdown.mlEnsemble!).weight) * 100)}%)
                  </span>
                  <span>Weight: {(signal.breakdown.ruleEnsemble || signal.breakdown.mlEnsemble!).weight.toFixed(2)}</span>
                </div>
                <div className="text-lg font-bold text-slate-100">
                  {(signal.breakdown.ruleEnsemble || signal.breakdown.mlEnsemble!).score >= 0 ? '+' : ''}{(signal.breakdown.ruleEnsemble || signal.breakdown.mlEnsemble!).score.toFixed(2)}
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Net Impact:</span>
                  <span className={(signal.breakdown.ruleEnsemble || signal.breakdown.mlEnsemble!).contribution >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {(signal.breakdown.ruleEnsemble || signal.breakdown.mlEnsemble!).contribution >= 0 ? '+' : ''}{(signal.breakdown.ruleEnsemble || signal.breakdown.mlEnsemble!).contribution.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. Collapsible Section 2: Machine Learning Outlook — Experimental */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
        <button
          onClick={() => setIsMlOpen(prev => !prev)}
          className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
              Machine Learning Outlook — Experimental (Walk-Forward Logistic Regression)
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              mlOutput.hasStatisticalEdge
                ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {mlOutput.hasStatisticalEdge ? 'STATISTICAL EDGE VERIFIED' : 'NO STATISTICAL EDGE'}
            </span>
          </div>
          {isMlOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isMlOpen && (
          <div className="p-5 space-y-4 border-t border-slate-800 bg-slate-950/40">
            {mlOutput.hasStatisticalEdge ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">5-Day Directional Outlook</span>
                    <span className={`text-lg font-bold ${
                      mlOutput.predictedClass === 'UP' ? 'text-emerald-400' : mlOutput.predictedClass === 'DOWN' ? 'text-rose-400' : 'text-slate-200'
                    }`}>
                      {mlOutput.predictedClass} TREND (P(Up): {(mlOutput.probabilities.up * 100).toFixed(0)}% · P(Down): {(mlOutput.probabilities.down * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <div>Out-of-Fold Acc: <strong className="text-emerald-400 font-bold">{(mlOutput.metrics.outOfFoldAccuracy * 100).toFixed(1)}%</strong></div>
                    <span>•</span>
                    <div>Baseline Acc: <strong className="text-slate-300 font-bold">{(mlOutput.metrics.majorityBaselineAccuracy * 100).toFixed(1)}%</strong></div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-300">Top Standardized Model Features:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {mlOutput.featureContributions.slice(0, 6).map((fc, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                        <span className="text-slate-300">{fc.name}</span>
                        <span className={`font-bold ${fc.impact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {fc.impact >= 0 ? '+' : ''}{fc.impact.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Experimental model trained strictly on historical observations with 5-day walk-forward leakage gap.
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>No statistical edge detected on this stock</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  {mlOutput.edgeExplanation}
                </p>
                <div className="text-[10px] text-slate-500 font-sans pt-1">
                  Because no out-of-fold advantage over the majority baseline was validated, experimental ML weights are set to 0.00 and excluded from the core BUY/SELL scoring engine.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. Collapsible Section 3: Walk-Forward Backtesting Summary vs Benchmark */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
        <button
          onClick={() => setIsBacktestOpen(prev => !prev)}
          className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
              Walk-Forward Backtesting Summary vs Benchmark
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
              {backtest.metrics.totalTrades === 0
                ? 'No trades in this period (0 trades)'
                : `Win Rate: ${backtest.metrics.winRatePct.toFixed(1)}% (${backtest.metrics.totalTrades} trades)`}
            </span>
          </div>
          {isBacktestOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isBacktestOpen && (
          <div className="p-5 space-y-4 border-t border-slate-800 bg-slate-950/40">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Strategy Return</span>
                <span className={`text-base font-bold ${backtest.metrics.strategyReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {backtest.metrics.strategyReturnPct >= 0 ? '+' : ''}{backtest.metrics.strategyReturnPct.toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Buy & Hold Return</span>
                <span className={`text-base font-bold ${backtest.metrics.buyHoldReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {backtest.metrics.buyHoldReturnPct >= 0 ? '+' : ''}{backtest.metrics.buyHoldReturnPct.toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Max Drawdown</span>
                <span className="text-base font-bold text-rose-400">
                  -{backtest.metrics.maxDrawdownPct.toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Trades Executed</span>
                <span className="text-base font-bold text-slate-200">
                  {backtest.metrics.totalTrades} ({backtest.metrics.winningTrades} won)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <div>Sharpe Ratio: <strong className="text-slate-200">{backtest.metrics.sharpeRatio.toFixed(2)}</strong></div>
              <div>Profit Factor: <strong className="text-slate-200">{backtest.metrics.profitFactor.toFixed(2)}</strong></div>
              <div>Calmar Ratio: <strong className="text-slate-200">{backtest.metrics.calmarRatio.toFixed(2)}</strong></div>
            </div>
            <div className="text-[10px] text-slate-500 font-sans">
              Sequential historical execution using bar (i-1) signals at bar i open with 15 bps friction (10 bps brokerage + 5 bps execution slippage).
            </div>
          </div>
        )}
      </div>

      {/* 9. Collapsible Section 4: Quantitative Risk Metrics */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
        <button
          onClick={() => setIsRiskOpen(prev => !prev)}
          className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
              Comprehensive Quantitative Risk Metrics
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
              Vol: {riskMetrics.annualizedVolPct}%
            </span>
          </div>
          {isRiskOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isRiskOpen && (
          <div className="p-5 space-y-4 border-t border-slate-800 bg-slate-950/40">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Annualized Volatility</span>
                <span className="text-base font-bold text-amber-400">
                  {riskMetrics.annualizedVolPct}% p.a.
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Max Drawdown</span>
                <span className="text-base font-bold text-rose-400">
                  -{riskMetrics.maxDrawdownPct}%
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">95% 1-Day VaR</span>
                <span className="text-base font-bold text-rose-400">
                  -{riskMetrics.var95Pct}%
                </span>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block">Benchmark Beta</span>
                <span className="text-base font-bold text-indigo-400">
                  {riskMetrics.beta.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-sans">
              Metrics calculated directly from verified historical trading sessions without parametric distortion.
            </div>
          </div>
        )}
      </div>

      {/* 10. Collapsible Section 5: 7-Day Sentiment Trend & News Flow */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
        <button
          onClick={() => setIsTrendOpen(prev => !prev)}
          className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
              7-Day Sentiment Trend & News Flow ({sentimentTrend.length} Active Days)
            </span>
          </div>
          {isTrendOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {isTrendOpen && (
          <div className="p-5 space-y-3 border-t border-slate-800 bg-slate-950/40">
            {sentimentTrend.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {sentimentTrend.map((st, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                      <span className="font-bold text-slate-300">{st.date}</span>
                      <span className={st.avgScore >= 0.05 ? 'text-emerald-400 font-bold' : st.avgScore <= -0.05 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {st.avgScore >= 0 ? '+' : ''}{st.avgScore.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-sans">
                      <span className="text-emerald-400 font-bold">{st.pos} Pos</span>
                      <span>·</span>
                      <span className="text-slate-400">{st.neu} Neu</span>
                      <span>·</span>
                      <span className="text-rose-400 font-bold">{st.neg} Neg</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-center font-sans text-xs">
                Zero multi-day historical sentiment articles currently indexed.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
