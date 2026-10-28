import React, { useState } from 'react';
import { SentimentData, StockQuote, NewsArticle } from '../../types';
import { cleanHtmlText, isValidArticleUrl } from '../../newsIntelligence';
import {
  Newspaper,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Building,
  TrendingUp,
  TrendingDown,
  Filter,
  Flame,
  Search,
  Clock,
  Sparkles
} from 'lucide-react';

interface FinancialNewsPageProps {
  sentiment: SentimentData;
  quote: StockQuote;
}

export const FinancialNewsPage: React.FC<FinancialNewsPageProps> = ({ sentiment, quote }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const articles = sentiment.articles || [];

  // Compute distinct corporate events and expansion catalysts
  const distinctExpansionEvents = new Set<string>();
  const distinctRiskEvents = new Set<string>();
  const distinctTotalEvents = new Set<string>();

  articles.forEach(a => {
    if (a.corporateEventType === 'EXPANSION' && a.corporateEventId) {
      distinctExpansionEvents.add(a.corporateEventId);
      distinctTotalEvents.add(a.corporateEventId);
    } else if (a.corporateEventType === 'RISK' && a.corporateEventId) {
      distinctRiskEvents.add(a.corporateEventId);
      distinctTotalEvents.add(a.corporateEventId);
    }
  });

  const distinctExpansionCount = sentiment.expansionCatalystsCount ?? distinctExpansionEvents.size;
  const distinctRiskCount = sentiment.cautionaryOverhangsCount ?? distinctRiskEvents.size;
  const distinctEventsCount = sentiment.distinctEventsCount ?? distinctTotalEvents.size;

  const posCount = articles.filter(a => a.sentimentLabel === 'POSITIVE' || a.vaderScore >= 0.05).length;
  const negCount = articles.filter(a => a.sentimentLabel === 'NEGATIVE' || a.vaderScore <= -0.05).length;
  const neuCount = Math.max(0, articles.length - posCount - negCount);

  const filteredArticles = articles.filter(a => {
    const isBull = a.sentimentLabel === 'POSITIVE' || a.vaderScore >= 0.05;
    const isBear = a.sentimentLabel === 'NEGATIVE' || a.vaderScore <= -0.05;
    const isNeu = !isBull && !isBear;

    if (filterType === 'BULLISH' && !isBull) return false;
    if (filterType === 'BEARISH' && !isBear) return false;
    if (filterType === 'NEUTRAL' && !isNeu) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const cleanTitle = cleanHtmlText(a.title).toLowerCase();
      const cleanSummary = cleanHtmlText(a.summary).toLowerCase();
      const cleanPub = cleanHtmlText(a.publisher).toLowerCase();
      return cleanTitle.includes(q) || cleanSummary.includes(q) || cleanPub.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pt-1 max-w-6xl mx-auto font-sans">
      {/* 1. Page Header & Press Consensus Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Newspaper className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-100 font-mono">
                Verified Financial Press Intelligence — {quote.ticker}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Curated corporate disclosures, quarterly earnings briefs, institutional order wins, and macro analysis from top financial publications.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">Institutional Tone:</span>
            <span className={`px-3 py-1.5 rounded-lg font-bold uppercase border ${
              sentiment.overallScore >= 0.10
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : sentiment.overallScore <= -0.10
                ? 'bg-rose-950 text-rose-400 border-rose-800'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {sentiment.newsCount === 0 ? 'NO ACTIVE DISCLOSURES' : sentiment.overallScore >= 0.10 ? 'BULLISH CONSENSUS' : sentiment.overallScore <= -0.10 ? 'BEARISH OVERHANG' : 'NEUTRAL DISCLOSURES'}
            </span>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 text-[11px] block uppercase">Indexed Stories</span>
            <div className="text-2xl font-bold text-slate-100">{articles.length}</div>
            <div className="text-[10px] text-slate-500">{distinctEventsCount} Corporate Events</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 text-[11px] block uppercase">Expansion Catalysts</span>
            <div className="text-2xl font-bold text-emerald-400">+{distinctExpansionCount}</div>
            <div className="text-[10px] text-slate-500">{distinctExpansionCount} Distinct Business Events</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 text-[11px] block uppercase">Cautionary Overhangs</span>
            <div className="text-2xl font-bold text-rose-400">{distinctRiskCount}</div>
            <div className="text-[10px] text-slate-500">{distinctRiskCount} Distinct Corporate Risks</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 text-[11px] block uppercase">News Sentiment Score</span>
            <div className={`text-2xl font-bold ${
              sentiment.newsCount === 0 ? 'text-slate-500' : sentiment.vaderCompound >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {sentiment.newsCount === 0 ? 'N/A' : `${sentiment.vaderCompound >= 0 ? '+' : ''}${sentiment.vaderCompound.toFixed(2)}`}
            </div>
            <div className="text-[10px] text-slate-500">
              Finance-tuned VADER + Context Engine
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterType === 'ALL'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            All Stories ({articles.length})
          </button>
          <button
            onClick={() => setFilterType('BULLISH')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterType === 'BULLISH'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            Bullish Stories ({posCount})
          </button>
          <button
            onClick={() => setFilterType('BEARISH')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterType === 'BEARISH'
                ? 'bg-rose-500 text-white font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            Risk / Caution ({negCount})
          </button>
          <button
            onClick={() => setFilterType('NEUTRAL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              filterType === 'NEUTRAL'
                ? 'bg-slate-700 text-slate-100 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            Neutral ({neuCount})
          </button>
        </div>

        {/* Search Filter Input */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search news headlines..."
            className="bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:outline-none rounded-lg pl-3 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono w-full sm:w-64"
          />
        </div>
      </div>

      {/* 3. Detailed Chronological Articles List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-400" />
            Verified Financial Media Coverage
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            The Economic Times · Livemint · Moneycontrol · Reuters · Business Standard
          </span>
        </div>

        <div className="space-y-3">
          {articles.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-400 font-mono text-xs space-y-2">
              <Newspaper className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-slate-300 font-semibold text-sm">News data unavailable</div>
              <p className="text-slate-500 max-w-md mx-auto text-[11px] leading-relaxed">
                Live news coverage could not be retrieved for {quote.ticker}. Synthetic or fabricated press articles are strictly disabled.
              </p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 font-mono text-xs">
              No articles match the current filter selection.
            </div>
          ) : (
            filteredArticles.map((art: NewsArticle, idx: number) => {
              const isPos = art.sentimentLabel === 'POSITIVE' || art.vaderScore >= 0.05;
              const isNeg = art.sentimentLabel === 'NEGATIVE' || art.vaderScore <= -0.05;
              const cleanTitle = cleanHtmlText(art.title);
              const cleanSummary = cleanHtmlText(art.summary);
              const cleanPublisher = cleanHtmlText(art.publisher);
              const isUrlValid = isValidArticleUrl(art.url);

              return (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-4 sm:p-5 rounded-2xl transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                          {cleanPublisher}
                        </span>
                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {art.date}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          art.corporateEventType === 'EXPANSION' || (isPos && art.isCatalyst)
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : art.corporateEventType === 'RISK' || (isNeg && art.isCatalyst)
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : isPos
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                            : isNeg
                            ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {art.corporateEventType === 'EXPANSION'
                            ? 'EXPANSION CATALYST'
                            : art.corporateEventType === 'RISK'
                            ? 'CAUTIONARY RISK'
                            : isPos
                            ? 'POSITIVE SENTIMENT'
                            : isNeg
                            ? 'BEARISH CONCERN'
                            : 'ROUTINE DISCLOSURE'}
                        </span>
                        {art.corporateEventTitle ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                            Event: {cleanHtmlText(art.corporateEventTitle)}
                          </span>
                        ) : art.isCatalyst ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                            Corporate Catalyst
                          </span>
                        ) : null}
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-slate-100 leading-snug pt-0.5">
                        {isUrlValid ? (
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-emerald-400 hover:underline transition-colors inline-flex items-baseline gap-1.5"
                          >
                            <span>{cleanTitle}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0 inline" />
                          </a>
                        ) : (
                          <span>{cleanTitle}</span>
                        )}
                      </h4>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans pt-0.5">
                        {cleanSummary}
                      </p>

                      <div className="pt-1 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>Impact: <strong className={isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-slate-300'}>
                          {art.corporateEventType === 'EXPANSION'
                            ? 'Corporate Expansion & Valuation Driver'
                            : art.corporateEventType === 'RISK'
                            ? 'Operational & Regulatory Risk'
                            : isPos
                            ? 'Revenue & Valuation Boost'
                            : isNeg
                            ? 'Operational Cost Pressure'
                            : 'Informational Filing'}
                        </strong></span>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 font-mono text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800 min-w-[120px]">
                      <span className="text-[10px] text-slate-500 uppercase block font-sans">VADER Sentiment</span>
                      <span className={`text-lg font-bold ${
                        art.vaderScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {art.vaderScore >= 0 ? '+' : ''}{art.vaderScore.toFixed(2)}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                        {isPos ? 'Expansion Event' : isNeg ? 'Headwind' : 'Neutral'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
