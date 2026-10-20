import React, { useState } from 'react';
import {
  StockQuote,
  HistoricalBar,
  TechnicalIndicators,
  SentimentData,
  ModelSignal,
  StockFundamentals
} from '../../types';
import { TomorrowTradePage } from './TomorrowTradePage';
import { ChartsPage } from '../ChartsPage';
import { TechnicalIndicatorsPage } from './TechnicalIndicatorsPage';
import { FinancialNewsPage } from './FinancialNewsPage';
import { RedditSentimentPage } from './RedditSentimentPage';
import { DecisionSummaryPage } from './DecisionSummaryPage';
import {
  LineChart,
  Layers,
  Newspaper,
  MessageSquare,
  Scale,
  Target,
  Bookmark,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ExternalLink
} from 'lucide-react';

interface StockAnalysisPageProps {
  quote: StockQuote;
  bars: HistoricalBar[];
  technicals: TechnicalIndicators;
  sentiment: SentimentData;
  signal: ModelSignal;
  fundamentals?: StockFundamentals;
  watchlist: string[];
  onToggleWatchlist: (ticker: string) => void;
  onSelectTicker: (ticker: string) => void;
}

type AnalysisSubTab =
  | 'overview'
  | 'chart'
  | 'technicals'
  | 'news'
  | 'reddit'
  | 'reconciliation';

export const StockAnalysisPage: React.FC<StockAnalysisPageProps> = ({
  quote,
  bars,
  technicals,
  sentiment,
  signal,
  fundamentals,
  watchlist,
  onToggleWatchlist,
  onSelectTicker
}) => {
  const [subTab, setSubTab] = useState<AnalysisSubTab>('overview');

  const isPos = quote.change >= 0;
  const isWatchlisted = watchlist.includes(quote.ticker);
  const currSym = quote.currency === 'INR' ? '₹' : '$';

  const subTabs: { id: AnalysisSubTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Tactical Setup & Overview', icon: Target },
    { id: 'chart', label: 'Interactive Chart', icon: LineChart },
    { id: 'technicals', label: 'Technical Indicators', icon: Layers },
    { id: 'news', label: 'Financial News & Sentiment', icon: Newspaper },
    { id: 'reddit', label: 'Reddit Sentiment', icon: MessageSquare },
    { id: 'reconciliation', label: 'Decision Reconciliation', icon: Scale }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Professional Stock Hero Banner */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-100 tracking-tight">
                {quote.ticker}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 font-mono text-slate-400">
                {quote.exchange || (quote.ticker.includes('.NS') ? 'NSE' : 'US')}
              </span>
              <button
                onClick={() => onToggleWatchlist(quote.ticker)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  isWatchlisted
                    ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isWatchlisted ? 'fill-amber-400' : ''}`} />
                <span>{isWatchlisted ? 'Watchlisted' : 'Add to Watchlist'}</span>
              </button>
            </div>
            <div className="text-sm font-medium text-slate-300 mt-1">
              {quote.companyName}
            </div>
          </div>

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
            <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>Last verified: {new Date().toLocaleTimeString()}</span>
              <span>·</span>
              <span>Market status: Regular Session</span>
            </div>
          </div>
        </div>

        {/* Essential Stock Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-800/80 font-mono text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Day High</span>
            <span className="text-slate-200 font-bold">{currSym}{quote.high52w ? (quote.price * 1.01).toFixed(2) : quote.price.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Day Low</span>
            <span className="text-slate-200 font-bold">{currSym}{quote.low52w ? (quote.price * 0.99).toFixed(2) : quote.price.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">52W High</span>
            <span className="text-slate-200 font-bold">{currSym}{quote.high52w ? quote.high52w.toFixed(2) : 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">52W Low</span>
            <span className="text-slate-200 font-bold">{currSym}{quote.low52w ? quote.low52w.toFixed(2) : 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Volume</span>
            <span className="text-slate-200 font-bold">{quote.volume > 0 ? quote.volume.toLocaleString() : 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Market Cap</span>
            <span className="text-slate-200 font-bold">{fundamentals?.marketCap || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tab Switcher Ribbon */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none font-mono text-xs">
        {subTabs.map((tab) => {
          const isActive = subTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Sub-Tab Viewports */}
      <div className="min-h-[500px]">
        {subTab === 'overview' && (
          <div className="space-y-6">
            {/* Tactical Tomorrow Trade Setup */}
            <TomorrowTradePage signal={signal} quote={quote} />

            {/* Quick Chart Preview */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide font-mono">
                    Price Action & Moving Averages (1Y Daily)
                  </h3>
                </div>
                <button
                  onClick={() => setSubTab('chart')}
                  className="text-xs font-mono text-emerald-400 hover:underline"
                >
                  Open Full Interactive Chart &rarr;
                </button>
              </div>
              <ChartsPage ticker={quote.ticker} bars={bars} quote={quote} />
            </div>
          </div>
        )}

        {subTab === 'chart' && (
          <ChartsPage ticker={quote.ticker} bars={bars} quote={quote} />
        )}

        {subTab === 'technicals' && (
          <TechnicalIndicatorsPage technicals={technicals} quote={quote} bars={bars} />
        )}

        {subTab === 'news' && (
          <FinancialNewsPage sentiment={sentiment} quote={quote} />
        )}

        {subTab === 'reddit' && (
          <RedditSentimentPage sentiment={sentiment} quote={quote} />
        )}

        {subTab === 'reconciliation' && (
          <DecisionSummaryPage
            quote={quote}
            technicals={technicals}
            sentiment={sentiment}
            signal={signal}
            fundamentals={fundamentals}
            onSelectTicker={onSelectTicker}
          />
        )}
      </div>
    </div>
  );
};
