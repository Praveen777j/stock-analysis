import React, { useState } from 'react';
import { SentimentData, StockQuote, NewsArticle, EventCluster } from '../../types';
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
  Sparkles,
  Layers,
  AlertTriangle,
  Brain,
  Scale,
  Info
} from 'lucide-react';

interface NewsIntelligencePageProps {
  sentiment: SentimentData;
  quote: StockQuote;
}

export const NewsIntelligencePage: React.FC<NewsIntelligencePageProps> = ({ sentiment, quote }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const articles = sentiment.articles || [];
  const eventClusters: EventCluster[] = sentiment.eventClusters || [];

  const distinctExpansionCount = sentiment.expansionCatalystsCount ?? 0;
  const distinctRiskCount = sentiment.cautionaryOverhangsCount ?? 0;
  const distinctEventsCount = sentiment.distinctEventsCount ?? articles.length;

  const posCount = articles.filter(a => a.sentimentLabel === 'POSITIVE' || a.vaderScore >= 0.05).length;
  const negCount = articles.filter(a => a.sentimentLabel === 'NEGATIVE' || a.vaderScore <= -0.05).length;
  const neuCount = Math.max(0, articles.length - posCount - negCount);

  // FinBERT model status & score
  const isFinbertLive = sentiment.finbertStatus === 'LIVE' && sentiment.finbertScore !== null;
  const finbertScore = sentiment.finbertScore;
  const finbertDiagnostic = sentiment.finbertDiagnostic || (sentiment.finbertStatus === 'UNAVAILABLE' ? 'Model unavailable; VADER fallback engaged' : undefined);
  const finbertReason = sentiment.finbertReason;

  // DistilBERT model status & score
  const isDistilbertLive = sentiment.distilbertStatus === 'AVAILABLE' && typeof sentiment.distilbertScore === 'number' && sentiment.distilbertScore !== null;
  const distilbertScore = sentiment.distilbertScore;

  // Single Concise News Conclusion (Requirement 3C)
  const getConciseNewsTone = (): {
    tone: 'Positive news tone' | 'Mixed news tone' | 'Negative news tone' | 'Insufficient relevant coverage';
    explanation: string;
    modelAgreement: string;
  } => {
    if (articles.length === 0) {
      return {
        tone: 'Insufficient relevant coverage',
        explanation: `Zero verified institutional news stories or regulatory disclosures are currently indexed for ${quote.ticker}. Market decisions should rely on price action and audited fundamentals.`,
        modelAgreement: 'Models inactive due to lack of news inputs.'
      };
    }

    const vaderTone = sentiment.vaderCompound >= 0.12 ? 'POSITIVE' : sentiment.vaderCompound <= -0.12 ? 'NEGATIVE' : 'NEUTRAL';
    const transformerTone = isFinbertLive
      ? (finbertScore! >= 0.1 ? 'POSITIVE' : finbertScore! <= -0.1 ? 'NEGATIVE' : 'NEUTRAL')
      : isDistilbertLive
      ? (distilbertScore! >= 0.1 ? 'POSITIVE' : distilbertScore! <= -0.1 ? 'NEGATIVE' : 'NEUTRAL')
      : null;
    const activeTransformerName = isFinbertLive ? 'FinBERT' : isDistilbertLive ? 'DistilBERT' : null;

    let tone: 'Positive news tone' | 'Mixed news tone' | 'Negative news tone' | 'Insufficient relevant coverage' = 'Mixed news tone';
    let explanation = '';
    let agreement = '';

    if (posCount > negCount * 1.5 && sentiment.overallScore >= 0.08) {
      tone = 'Positive news tone';
      explanation = `Corporate disclosures and news headlines emphasize business growth, positive financial performance, or institutional contracts (${posCount} of ${articles.length} headlines positive).`;
    } else if (negCount > posCount * 1.5 && sentiment.overallScore <= -0.08) {
      tone = 'Negative news tone';
      explanation = `Headlines reflect heightened corporate headwinds, regulatory scrutiny, earnings misses, or sectoral margin pressures (${negCount} of ${articles.length} headlines negative).`;
    } else {
      tone = 'Mixed news tone';
      explanation = `Media coverage is balanced between expansion catalysts and cautionary factors, with no single directional narrative dominating news headlines.`;
    }

    if (activeTransformerName && transformerTone && articles.length > 0) {
      if (vaderTone === transformerTone) {
        agreement = `Model Consensus: Both VADER (${vaderTone}) and ${activeTransformerName} (${transformerTone}) agree on the prevailing news sentiment.`;
      } else {
        agreement = `Model Divergence: VADER registers a ${vaderTone} baseline while ${activeTransformerName} classifies headline context as ${transformerTone}.`;
      }
    } else if (articles.length === 0) {
      agreement = `Insufficient news coverage to evaluate sentiment models.`;
    } else {
      agreement = `Transformer sentiment is currently unavailable. VADER sentiment remains available.`;
    }

    return { tone, explanation, modelAgreement: agreement };
  };

  const newsConclusion = getConciseNewsTone();

  // Percentage calculations when valid article data exists
  const hasArticles = articles.length > 0;
  const vaderPosPct = hasArticles ? Math.round((posCount / articles.length) * 100) : 0;
  const vaderNeuPct = hasArticles ? Math.round((neuCount / articles.length) * 100) : 0;
  const vaderNegPct = hasArticles ? Math.max(0, 100 - vaderPosPct - vaderNeuPct) : 0;

  // Real FinBERT percentages when FinBERT inference is live
  const finbertArticles = articles.filter(a => typeof a.finbertScore === 'number' && a.finbertScore !== null);
  const finbertPosCount = finbertArticles.filter(a => (a.finbertScore ?? 0) >= 0.05).length;
  const finbertNegCount = finbertArticles.filter(a => (a.finbertScore ?? 0) <= -0.05).length;
  const finbertNeuCount = Math.max(0, finbertArticles.length - finbertPosCount - finbertNegCount);
  const hasFinbertData = isFinbertLive && finbertArticles.length > 0;
  const fbPosPct = hasFinbertData ? Math.round((finbertPosCount / finbertArticles.length) * 100) : 0;
  const fbNeuPct = hasFinbertData ? Math.round((finbertNeuCount / finbertArticles.length) * 100) : 0;
  const fbNegPct = hasFinbertData ? Math.max(0, 100 - fbPosPct - fbNeuPct) : 0;

  // Real DistilBERT percentages when DistilBERT inference is live
  const distilbertArticles = articles.filter(a => typeof a.distilbertScore === 'number' && a.distilbertScore !== null);
  const distilbertPosCount = distilbertArticles.filter(a => (a.distilbertLabel === 'POSITIVE') || ((a.distilbertScore ?? 0) >= 0.05)).length;
  const distilbertNegCount = distilbertArticles.filter(a => (a.distilbertLabel === 'NEGATIVE') || ((a.distilbertScore ?? 0) <= -0.05)).length;
  const distilbertNeuCount = Math.max(0, distilbertArticles.length - distilbertPosCount - distilbertNegCount);
  const hasDistilbertData = isDistilbertLive && distilbertArticles.length > 0;
  const dbPosPct = hasDistilbertData ? Math.round((distilbertPosCount / distilbertArticles.length) * 100) : 0;
  const dbNeuPct = hasDistilbertData ? Math.round((distilbertNeuCount / distilbertArticles.length) * 100) : 0;
  const dbNegPct = hasDistilbertData ? Math.max(0, 100 - dbPosPct - dbNeuPct) : 0;

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
      {/* 1. Overall News Tone Banner */}
      <div className={`p-5 sm:p-6 rounded-2xl border shadow-sm space-y-3 font-mono ${
        newsConclusion.tone === 'Positive news tone'
          ? 'bg-emerald-950/30 border-emerald-800/80'
          : newsConclusion.tone === 'Negative news tone'
          ? 'bg-rose-950/30 border-rose-800/80'
          : newsConclusion.tone === 'Mixed news tone'
          ? 'bg-amber-950/30 border-amber-800/80'
          : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-emerald-400" />
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                Overall News Tone — {quote.ticker}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-1 font-sans">
              {newsConclusion.tone}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-xl font-bold uppercase text-xs border ${
              newsConclusion.tone === 'Positive news tone'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : newsConclusion.tone === 'Negative news tone'
                ? 'bg-rose-950 text-rose-300 border-rose-700'
                : newsConclusion.tone === 'Mixed news tone'
                ? 'bg-amber-950 text-amber-300 border-amber-700'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {newsConclusion.tone}
            </span>
          </div>
        </div>

        {/* Plain English explanation */}
        <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
          {newsConclusion.explanation}
        </p>

        {/* Model agreement disclosure */}
        <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/60 flex items-center gap-2">
          <Scale className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{newsConclusion.modelAgreement}</span>
        </div>

        {/* Mandatory statutory sentiment disclaimer */}
        <div className="text-[10px] text-slate-500 font-sans flex items-start gap-1.5 pt-1">
          <Info className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
          <span>
            Financial sentiment scores quantify the linguistic tone of published articles (-1.00 to +1.00). A sentiment score is not a forecast, buy/sell instruction, or probability of upward stock price movement.
          </span>
        </div>
      </div>

      {/* 2. Plain-Language Sentiment Analysis Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-sans">
              Sentiment Analysis
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-sans">Transparent Model Attribution</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: News Sentiment (Overall) */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs font-sans">News Sentiment</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                articles.length === 0
                  ? 'bg-slate-900 text-slate-400 border-slate-800'
                  : sentiment.overallScore >= 0.05
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : sentiment.overallScore <= -0.05
                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {articles.length === 0 ? 'NO COVERAGE' : sentiment.overallScore >= 0.05 ? 'POSITIVE' : sentiment.overallScore <= -0.05 ? 'NEGATIVE' : 'NEUTRAL'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Composite tone derived from institutional news feeds and corporate filings.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400">Composite Score:</span>
              <span className={`text-base font-bold ${
                articles.length === 0 ? 'text-slate-500' : sentiment.overallScore >= 0.05 ? 'text-emerald-400' : sentiment.overallScore <= -0.05 ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {articles.length === 0 ? 'N/A' : `${sentiment.overallScore >= 0 ? '+' : ''}${sentiment.overallScore.toFixed(2)}`}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-sans">
              {articles.length > 0 ? `${articles.length} verified news article${articles.length > 1 ? 's' : ''} analyzed` : 'Insufficient news coverage'}
            </div>
          </div>

          {/* Card 2: VADER Sentiment */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs font-sans">VADER Sentiment</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                ACTIVE (LEXICON)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Financial lexicon evaluating headline word valences, negations, and degree modifiers.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400">VADER Score:</span>
              <span className={`text-base font-bold ${
                articles.length === 0 ? 'text-slate-500' : sentiment.vaderCompound >= 0.05 ? 'text-emerald-400' : sentiment.vaderCompound <= -0.05 ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {articles.length === 0 ? 'N/A' : `${sentiment.vaderCompound >= 0 ? '+' : ''}${sentiment.vaderCompound.toFixed(2)}`}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              {articles.length > 0 ? `${vaderPosPct}% Pos · ${vaderNeuPct}% Neu · ${vaderNegPct}% Neg` : 'Insufficient news coverage'}
            </div>
          </div>

          {/* Card 3: FinBERT Sentiment */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs font-sans">FinBERT Sentiment</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                isFinbertLive
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {isFinbertLive ? 'ACTIVE' : 'UNAVAILABLE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              {isFinbertLive
                ? 'Pretrained transformer language model specialized for financial text classification.'
                : 'FinBERT is currently unavailable. VADER sentiment remains available.'}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400">FinBERT Score:</span>
              <span className={`text-base font-bold ${
                isFinbertLive
                  ? (finbertScore! >= 0.05 ? 'text-emerald-400' : finbertScore! <= -0.05 ? 'text-rose-400' : 'text-slate-300')
                  : 'text-slate-500'
              }`}>
                {isFinbertLive ? `${finbertScore! >= 0 ? '+' : ''}${finbertScore!.toFixed(2)}` : 'Unavailable'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              {isFinbertLive && hasFinbertData
                ? `${fbPosPct}% Pos · ${fbNeuPct}% Neu · ${fbNegPct}% Neg`
                : 'VADER sentiment remains available.'}
            </div>
          </div>

          {/* Card 4: DistilBERT Sentiment */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs font-sans">DistilBERT Sentiment</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                isDistilbertLive
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {isDistilbertLive ? 'ACTIVE' : 'UNAVAILABLE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              {isDistilbertLive
                ? 'Lightweight distilled transformer specialized for financial news headlines.'
                : 'DistilBERT is currently unavailable. VADER sentiment remains available.'}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400">DistilBERT Score:</span>
              <span className={`text-base font-bold ${
                isDistilbertLive
                  ? (distilbertScore! >= 0.05 ? 'text-emerald-400' : distilbertScore! <= -0.05 ? 'text-rose-400' : 'text-slate-300')
                  : 'text-slate-500'
              }`}>
                {isDistilbertLive ? `${distilbertScore! >= 0 ? '+' : ''}${distilbertScore!.toFixed(2)}` : 'Unavailable'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              {isDistilbertLive && hasDistilbertData
                ? `${dbPosPct}% Pos · ${dbNeuPct}% Neu · ${dbNegPct}% Neg`
                : 'VADER sentiment remains available.'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Event Clusters & Categorization */}
      {eventClusters.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Distinct Corporate Event Clusters ({eventClusters.length})
              </span>
            </div>
            <span className="text-slate-500 text-[10px]">Deduplicated Catalysts & Overhangs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {eventClusters.map((cluster) => (
              <div
                key={cluster.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-200 text-xs font-sans">{cluster.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    cluster.type === 'EXPANSION' || cluster.category === 'CATALYST'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : cluster.type === 'RISK' || cluster.category === 'RISK'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {cluster.type || cluster.category}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{cluster.articleCount} article{cluster.articleCount > 1 ? 's' : ''} in cluster</span>
                  <span className="text-slate-400">
                    {typeof cluster.impactScore === 'number'
                      ? `Impact: ${cluster.impactScore > 0 ? `+${cluster.impactScore}` : cluster.impactScore}`
                      : `Cluster ID: ${cluster.id.slice(0, 8)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Article Feed Header, Filters & Search */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
              Chronological Financial News Wire ({articles.length})
            </h3>
            <span className="text-xs text-slate-500 font-mono">Sorted newest to oldest</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tone Filter Buttons */}
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
              {(['ALL', 'BULLISH', 'BEARISH', 'NEUTRAL'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterType === f
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* In-feed keyword filter */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter headlines..."
                className="bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 w-36 sm:w-44"
              />
              <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
            </div>
          </div>
        </div>

        {/* Article Cards List */}
        {filteredArticles.length > 0 ? (
          <div className="space-y-3">
            {filteredArticles.map((article, idx) => {
              const isPositive = article.sentimentLabel === 'POSITIVE' || article.vaderScore >= 0.05;
              const isNegative = article.sentimentLabel === 'NEGATIVE' || article.vaderScore <= -0.05;

              return (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-all space-y-2 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-slate-100 hover:text-emerald-400 transition-colors inline-flex items-start gap-1.5"
                      >
                        <span>{cleanHtmlText(article.title)}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 text-emerald-400 mt-0.5 transition-opacity" />
                      </a>

                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        {cleanHtmlText(article.summary)}
                      </p>
                    </div>

                    {/* Sentiment Label Badge */}
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                        isPositive
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                          : isNegative
                          ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {article.sentimentLabel || (isPositive ? 'POSITIVE' : isNegative ? 'NEGATIVE' : 'NEUTRAL')}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Footer: Publisher, Date, and Scores */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800/60 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-300">{article.publisher || 'Financial Wire'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {article.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span>VADER: <strong className={isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-300'}>
                        {article.vaderScore >= 0 ? '+' : ''}{article.vaderScore.toFixed(2)}
                      </strong></span>
                      {article.finbertScore !== null && (
                        <span>FinBERT: <strong className={article.finbertScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{article.finbertScore >= 0 ? '+' : ''}{article.finbertScore.toFixed(2)}</strong></span>
                      )}
                      {typeof article.distilbertScore === 'number' && article.distilbertScore !== null && (
                        <span>DistilBERT: <strong className={article.distilbertScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{article.distilbertScore >= 0 ? '+' : ''}{article.distilbertScore.toFixed(2)}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-1">
            <AlertTriangle className="w-6 h-6 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-300 font-semibold">No news articles match your filter criteria.</p>
            <p className="text-[11px]">Clear search or change tone filter to view all indexed articles.</p>
          </div>
        )}
      </div>
    </div>
  );
};
