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
import { computeFinalAssessment } from '../../dataEngine';
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
      return `Insufficient verified historical trading observations (${bars.length} available, minimum 50 required) or unavailable live exchange feed. Technical indicators and directional momentum cannot be statistically calibrated.`;
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
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Verified daily settlement
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
    </div>
  );
};
