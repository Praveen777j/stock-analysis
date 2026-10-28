import React, { useState, useEffect } from 'react';
import { SentimentData, StockQuote, NewsArticle, EventCluster } from '../../types';
import { cleanHtmlText, isValidArticleUrl, ACTIVE_NEWS_SOURCES, FAILED_NEWS_SOURCES_DISCLOSURE } from '../../newsIntelligence';
import { fetchLiveNewsAndSentiment } from '../../dataEngine';
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
  Info,
  RefreshCw,
  Globe,
  Radio,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface NewsIntelligencePageProps {
  sentiment: SentimentData;
  quote: StockQuote;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

export const NewsIntelligencePage: React.FC<NewsIntelligencePageProps> = ({
  sentiment: initialSentiment,
  quote,
  isLoading: propIsLoading = false,
  onRefresh
}) => {
  const [activeSentiment, setActiveSentiment] = useState<SentimentData>(initialSentiment);
  const [filterType, setFilterType] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Pagination / Show More State (Top 10 items per section, top 8 for event clusters)
  const [companyLimit, setCompanyLimit] = useState<number>(10);
  const [globalLimit, setGlobalLimit] = useState<number>(10);
  const [clusterLimit, setClusterLimit] = useState<number>(8);

  // Reset limits when ticker, filter or search changes
  useEffect(() => {
    setCompanyLimit(10);
    setGlobalLimit(10);
    setClusterLimit(8);
  }, [quote.ticker, filterType, searchTerm]);

  // Sync when initialSentiment changes from parent
  useEffect(() => {
    setActiveSentiment(initialSentiment);
  }, [initialSentiment]);

  const handleRefreshWire = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        const fresh = await fetchLiveNewsAndSentiment(quote.ticker, quote.companyName, quote, true);
        setActiveSentiment(fresh);
      }
    } catch (e: any) {
      setRefreshError(e.message || 'Failed to refresh news feed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const sentiment = activeSentiment;
  const articles = sentiment.articles || [];
  const globalMarketNews = sentiment.globalMarketNews || [];
  const allEventClusters: EventCluster[] = sentiment.eventClusters || [];

  // Group near-duplicate wire headlines
  interface GroupedNewsArticle extends NewsArticle {
    alsoReportedBy?: { publisher: string; url?: string; date: string }[];
  }

  function groupArticles(items: NewsArticle[]): GroupedNewsArticle[] {
    const result: GroupedNewsArticle[] = [];
    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'shares', 'stock', 'share', 'q1', 'q2', 'q3', 'q4', 'fy24', 'fy25', 'fy26', 'crore', 'cr', 'ltd', 'limited', 'rises', 'falls', 'jumps', 'drops', 'gain', 'loss']);

    function getTokens(t: string): Set<string> {
      return new Set(
        cleanHtmlText(t)
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2 && !stopWords.has(w))
      );
    }

    for (const item of items) {
      const itemTokens = getTokens(item.title);
      let matchedGroup: GroupedNewsArticle | null = null;

      if (itemTokens.size >= 2) {
        for (const g of result) {
          const gTokens = getTokens(g.title);
          let intersection = 0;
          for (const tok of itemTokens) {
            if (gTokens.has(tok)) intersection++;
          }
          const minSize = Math.min(itemTokens.size, gTokens.size);
          if (minSize > 0 && intersection / minSize >= 0.70) {
            matchedGroup = g;
            break;
          }
        }
      }

      if (matchedGroup) {
        if (!matchedGroup.alsoReportedBy) matchedGroup.alsoReportedBy = [];
        matchedGroup.alsoReportedBy.push({
          publisher: item.publisher || 'Financial Wire',
          url: item.url,
          date: item.date
        });
      } else {
        result.push({ ...item, alsoReportedBy: [] });
      }
    }

    return result;
  }

  // Req 8: Show only clusters with 2 or more articles, or tagged catalyst or risk.
  // Hide single-article "Routine Financial Media Disclosure" clusters and show a count.
  const qualifyingClusters = allEventClusters.filter(c => {
    const isMultiArticle = c.articleCount >= 2;
    const isCatalyst = c.isVerifiedCatalyst || c.category === 'CATALYST' || (c as any).type === 'EXPANSION';
    const isRisk = c.isVerifiedRisk || c.category === 'RISK' || (c as any).type === 'RISK';
    return isMultiArticle || isCatalyst || isRisk;
  });
  const hiddenRoutineCount = allEventClusters.length - qualifyingClusters.length;

  // Req 12 & D5: Dominating story note if 25%+ of headlines focus on one cluster
  const dominatingCluster = allEventClusters.find(c =>
    articles.length > 0 && (c.articleCount / articles.length) >= 0.25
  );

  const distinctExpansionCount = sentiment.expansionCatalystsCount ?? 0;
  const distinctRiskCount = sentiment.cautionaryOverhangsCount ?? 0;
  const distinctEventsCount = sentiment.distinctEventsCount ?? articles.length;

  const posCount = articles.filter(a => a.sentimentLabel === 'POSITIVE' || a.vaderScore >= 0.05).length;
  const negCount = articles.filter(a => a.sentimentLabel === 'NEGATIVE' || a.vaderScore <= -0.05).length;
  const neuCount = Math.max(0, articles.length - posCount - negCount);

  // Active sources & failure tracking
  const sourcesUsed = sentiment.sourcesUsed || ACTIVE_NEWS_SOURCES.map(s => s.name);
  const sourcesFailed = sentiment.sourcesFailed || [];
  const isPartialFailure = Boolean(sentiment.isPartialFailure);
  const isStale = Boolean(sentiment.isStale);
  const sourcesSummary = sentiment.sourcesSummary || `${sourcesUsed.length} active news sources responded`;

  // Req 10: Evidence strength calculation
  const isHeadlineOnly = articles.length === 0 || articles.every(a => a.isHeadlineOnly ?? true);
  const absScore = Math.abs(sentiment.overallScore);
  let displayEvidenceStrength: 'Weak' | 'Moderate' | 'Strong' | 'Neutral' = 'Neutral';

  if (articles.length === 0) {
    displayEvidenceStrength = 'Neutral';
  } else if (isHeadlineOnly) {
    // Under headline-only evidence: must be "Weak" when score is within +/-0.15. Never "STRONG".
    if (absScore <= 0.15) {
      displayEvidenceStrength = 'Weak';
    } else {
      displayEvidenceStrength = 'Moderate';
    }
  } else {
    if (absScore <= 0.15) {
      displayEvidenceStrength = 'Weak';
    } else if (articles.length >= 5 && absScore > 0.25) {
      displayEvidenceStrength = 'Strong';
    } else {
      displayEvidenceStrength = 'Moderate';
    }
  }

  // Req 11: Tone label thresholds and count-only summary sentence
  const getConciseNewsTone = (): {
    tone: 'Positive news tone' | 'Mildly positive news tone' | 'Mixed news tone' | 'Mildly negative news tone' | 'Negative news tone' | 'Insufficient relevant coverage';
    shortLabel: 'Positive' | 'Mildly positive' | 'Mixed' | 'Mildly negative' | 'Negative' | 'No Coverage';
    explanation: string;
    modelAgreement: string;
  } => {
    if (articles.length === 0) {
      return {
        tone: 'No clear signal' as any,
        shortLabel: 'No clear signal' as any,
        explanation: `Zero verified institutional news stories or regulatory disclosures are currently indexed specifically for ${quote.ticker}. See Global Market News below for macro developments.`,
        modelAgreement: 'Company-specific sentiment inactive due to lack of direct headline inputs.'
      };
    }

    const score = sentiment.overallScore;
    const total = articles.length;
    let tone: 'Positive news tone' | 'Mildly positive news tone' | 'Mixed news tone' | 'Mildly negative news tone' | 'Negative news tone' = 'Mixed news tone';
    let shortLabel: 'Positive' | 'Mildly positive' | 'Mixed' | 'Mildly negative' | 'Negative' = 'Mixed';
    let explanation = '';

    if (score > 0.25) {
      tone = 'Positive news tone';
      shortLabel = 'Positive';
      explanation = `${posCount} of ${total} headlines positive, ${negCount} negative. Corporate disclosures and headlines reflect business expansion and strong financial performance.`;
    } else if (score >= 0.10 && score <= 0.25) {
      tone = 'Mildly positive news tone';
      shortLabel = 'Mildly positive';
      explanation = `${posCount} of ${total} headlines positive, ${negCount} negative. Corporate news headlines lean mildly constructive with modest expansion indicators.`;
    } else if (score < -0.25) {
      tone = 'Negative news tone';
      shortLabel = 'Negative';
      explanation = `${negCount} of ${total} headlines negative, ${posCount} positive. Headlines reflect heightened corporate headwinds, regulatory scrutiny, or margin pressures.`;
    } else if (score <= -0.10 && score >= -0.25) {
      tone = 'Mildly negative news tone';
      shortLabel = 'Mildly negative';
      explanation = `${negCount} of ${total} headlines negative, ${posCount} positive. Coverage leans mildly cautious with isolated concerns or margin headwinds.`;
    } else {
      tone = 'Mixed news tone';
      shortLabel = 'Mixed';
      explanation = `${posCount} of ${total} headlines positive, ${negCount} negative. Media coverage is balanced between expansion catalysts and cautionary factors, with no single directional narrative dominating news headlines.`;
    }

    const agreement = `Deterministic Consensus: VADER financial lexicon and the Financial Context Engine analyze corporate disclosures in unison without external API dependencies.`;

    return { tone, shortLabel, explanation, modelAgreement: agreement };
  };

  const newsConclusion = getConciseNewsTone();

  // Percentage calculations when valid article data exists
  const hasArticles = articles.length > 0;
  const vaderPosPct = hasArticles ? Math.round((posCount / articles.length) * 100) : 0;
  const vaderNeuPct = hasArticles ? Math.round((neuCount / articles.length) * 100) : 0;
  const vaderNegPct = hasArticles ? Math.max(0, 100 - vaderPosPct - vaderNeuPct) : 0;

  const financialContextScore = sentiment.financialScore !== undefined ? sentiment.financialScore : sentiment.overallScore;

  // Company articles filtered by tone & search
  const filteredCompanyArticles = articles.filter(a => {
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
      const cleanComp = cleanHtmlText(a.relatedCompany || '').toLowerCase();
      return cleanTitle.includes(q) || cleanSummary.includes(q) || cleanPub.includes(q) || cleanComp.includes(q);
    }
    return true;
  });

  // Group near-duplicate company headlines (D4)
  const groupedCompanyArticles = React.useMemo(() => {
    return groupArticles(filteredCompanyArticles);
  }, [filteredCompanyArticles]);

  // Global market news filtered by search
  const filteredGlobalArticles = globalMarketNews.filter(a => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const cleanTitle = cleanHtmlText(a.title).toLowerCase();
      const cleanSummary = cleanHtmlText(a.summary).toLowerCase();
      const cleanPub = cleanHtmlText(a.publisher).toLowerCase();
      return cleanTitle.includes(q) || cleanSummary.includes(q) || cleanPub.includes(q);
    }
    return true;
  });

  const isLoadingState = propIsLoading || isRefreshing;

  return (
    <div className="space-y-6 pt-1 max-w-6xl mx-auto font-sans">
      {/* 0. Source Transparency, Response Status & Retry Action Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 font-mono text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
              Live Verified RSS Network
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
              {sourcesSummary}
            </span>
            {isStale && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                Stale Cache
              </span>
            )}
            {sentiment.cachedAt && (
              <span className="text-[11px] text-slate-500 font-mono">
                Cached {sentiment.cachedAt} (120s TTL)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshWire}
              disabled={isLoadingState}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingState ? 'animate-spin' : ''}`} />
              <span>{isLoadingState ? 'Refreshing Wire...' : 'Refresh Wire'}</span>
            </button>
          </div>
        </div>

        {/* Active Sources Badges Strip */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Verified Sources Responding:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sourcesUsed.map((src, sIdx) => (
              <span
                key={sIdx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-950 border border-slate-800 text-slate-300"
              >
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                {src}
              </span>
            ))}
          </div>
        </div>

        {/* Partial Failure Warning Alert (if any feed timed out or failed) */}
        {isPartialFailure && (
          <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3 flex items-start gap-2 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Partial Feed Notice:</span>
              <p className="text-[11px] text-amber-200/90 font-sans">
                {sourcesSummary}. Failed or unreachable: {sourcesFailed.join(', ')}. Articles from all responsive sources are preserved and displayed below.
              </p>
            </div>
          </div>
        )}

        {/* Non-Claim of Complete Global Coverage Disclosure */}
        <div className="flex items-start gap-1.5 text-[10px] text-slate-500 font-sans pt-1 border-t border-slate-800/60">
          <Info className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
          <span>
            Feeds are polled directly from free public RSS endpoints (Google News, Economic Times, Moneycontrol, Livemint, Business Standard, CNBC, BBC Business). Inactive/paywalled feeds (such as discontinued Reuters open RSS) are excluded. This does not claim exhaustive global press coverage.
          </span>
        </div>
      </div>

      {/* 1. Overall News Tone Banner */}
      <div className={`p-5 sm:p-6 rounded-2xl border shadow-sm space-y-3 font-mono ${
        newsConclusion.tone === 'Positive news tone' || newsConclusion.tone === 'Mildly positive news tone'
          ? 'bg-emerald-950/30 border-emerald-800/80'
          : newsConclusion.tone === 'Negative news tone' || newsConclusion.tone === 'Mildly negative news tone'
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
              newsConclusion.tone === 'Positive news tone' || newsConclusion.tone === 'Mildly positive news tone'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : newsConclusion.tone === 'Negative news tone' || newsConclusion.tone === 'Mildly negative news tone'
                ? 'bg-rose-950 text-rose-300 border-rose-700'
                : newsConclusion.tone === 'Mixed news tone'
                ? 'bg-amber-950 text-amber-300 border-amber-700'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {newsConclusion.shortLabel}
            </span>
          </div>
        </div>

        {/* Plain English explanation using strictly real counts */}
        <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
          {newsConclusion.explanation}
        </p>

        {/* Req 12: Dominating Story Note if one cluster has >= 30% of headlines */}
        {dominatingCluster && (
          <div className="bg-sky-950/40 border border-sky-800/80 rounded-xl p-3 flex items-start gap-2.5 text-sky-200 text-xs font-sans">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-sky-100">Dominating Story Note: </span>
              <span>
                {dominatingCluster.articleCount} of {articles.length} headlines are about {dominatingCluster.title.toLowerCase().startsWith('the ') ? dominatingCluster.title : `the ${dominatingCluster.title}`}, which may affect the overall tone.
              </span>
            </div>
          </div>
        )}

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
          <span className="text-[11px] text-slate-500 font-sans">Transparent Attribution & Context</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: News Sentiment (Overall) */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs font-sans">News Sentiment</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                articles.length === 0
                  ? 'bg-slate-900 text-slate-400 border-slate-800'
                  : sentiment.overallScore > 0.25
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : sentiment.overallScore >= 0.10
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                  : sentiment.overallScore < -0.25
                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                  : sentiment.overallScore <= -0.10
                  ? 'bg-rose-950/70 text-rose-300 border-rose-800'
                  : 'bg-amber-950/70 text-amber-300 border-amber-800'
              }`}>
                {articles.length === 0 ? 'No clear signal' : newsConclusion.shortLabel.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Composite tone derived from verified institutional news feeds and filings.
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

          {/* Card 3: Financial Context Engine */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs font-sans">Financial Context</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                ACTIVE (DOMAIN)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Catalyst & risk phrase classifier: earnings, margins, balance sheets, and guidance.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400">Context Score:</span>
              <span className={`text-base font-bold ${
                articles.length === 0 ? 'text-slate-500' : financialContextScore >= 0.05 ? 'text-cyan-400' : financialContextScore <= -0.05 ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {articles.length === 0 ? 'N/A' : `${financialContextScore >= 0 ? '+' : ''}${financialContextScore.toFixed(2)}`}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              {articles.length > 0 ? `${distinctExpansionCount} Expansion${distinctExpansionCount === 1 ? '' : 's'} · ${distinctRiskCount} Risk${distinctRiskCount === 1 ? '' : 's'}` : 'Zero event overhangs'}
            </div>
          </div>

          {/* Card 4: Evidence & Sources (Req 10 & Req 13) */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs font-sans">Evidence & Sources</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                {hasArticles ? `Headline-only, ${articles.length} items` : 'No items'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Verified institutional headlines and corporate filings.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400">Strength:</span>
              <span className="text-xs font-bold text-indigo-300 font-mono">
                {displayEvidenceStrength}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-sans">
              {hasArticles ? `${articles.length} RSS headlines & summaries analyzed` : 'No RSS coverage'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Event Clusters & Categorization (Req 8) */}
      {qualifyingClusters.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Distinct Corporate Event Clusters ({qualifyingClusters.length})
              </span>
              {hiddenRoutineCount > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                  {hiddenRoutineCount} routine item{hiddenRoutineCount > 1 ? 's' : ''} hidden
                </span>
              )}
            </div>
            <span className="text-slate-500 text-[10px]">Deduplicated Catalysts & Overhangs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {qualifyingClusters.slice(0, clusterLimit).map((cluster) => (
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

          {qualifyingClusters.length > 8 && (
            <div className="pt-2 flex items-center justify-center gap-2">
              {clusterLimit < qualifyingClusters.length ? (
                <button
                  onClick={() => setClusterLimit(prev => Math.min(prev + 8, qualifyingClusters.length))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 font-mono transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Show More Clusters ({qualifyingClusters.length - clusterLimit} remaining)</span>
                </button>
              ) : (
                <button
                  onClick={() => setClusterLimit(8)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 font-mono transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Show Less</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Company Article Feed Header, Filters & Search */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
                Company News Wire — {quote.ticker} ({articles.length})
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Ranked by company ticker, name, and aliases first · Deduplicated across publishers
            </p>
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

        {/* Company Article Cards List */}
        {isLoadingState && articles.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs space-y-2">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-2" />
            <p className="font-semibold text-slate-200">Aggregating live news from verified RSS publishers...</p>
            <p className="text-[11px] text-slate-500">Querying Economic Times, Moneycontrol, Livemint, Business Standard, CNBC & Google News</p>
          </div>
        ) : groupedCompanyArticles.length > 0 ? (
          <div className="space-y-3">
            {groupedCompanyArticles.slice(0, companyLimit).map((article, idx) => {
              const isPositive = article.sentimentLabel === 'POSITIVE' || article.vaderScore >= 0.05;
              const isNegative = article.sentimentLabel === 'NEGATIVE' || article.vaderScore <= -0.05;
              const isZeroScores = Math.abs(article.vaderScore) < 0.001 && (!article.financialScore || Math.abs(article.financialScore) < 0.001);

              return (
                <div
                  key={idx}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 hover:border-slate-700 transition-all space-y-2.5 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1.5 flex-1">
                      {/* Related Company & Publisher Header */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-semibold">
                          <Building className="w-3 h-3 text-emerald-400 shrink-0" />
                          {article.relatedCompany || quote.companyName || quote.ticker}
                        </span>

                        <span className="font-semibold text-slate-300">
                          {article.publisher || 'Financial Wire'}
                        </span>

                        <span>•</span>

                        {/* Date and Age Flags */}
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          {article.date}
                        </span>

                        {article.isBreaking && !article.isOld && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            <Flame className="w-2.5 h-2.5 text-rose-400" />
                            Breaking
                          </span>
                        )}

                        {article.isOld && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-900 text-slate-400 border border-slate-800">
                            Older Article
                          </span>
                        )}

                        {article.isInvalidOrMissingDate && (
                          <span className="text-[10px] text-slate-500 italic">
                            (Date unverified)
                          </span>
                        )}
                      </div>

                      {/* Clickable Headline */}
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-slate-100 hover:text-emerald-400 transition-colors inline-flex items-start gap-1.5 leading-snug"
                      >
                        <span>{cleanHtmlText(article.title)}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 text-emerald-400 mt-0.5 transition-opacity" />
                      </a>

                      {article.summary && (
                        <p className="text-xs text-slate-400 leading-relaxed font-sans line-clamp-2">
                          {cleanHtmlText(article.summary)}
                        </p>
                      )}

                      {/* D4: Group near-duplicate wire headlines */}
                      {article.alsoReportedBy && article.alsoReportedBy.length > 0 && (
                        <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                          <span className="text-slate-500">Also reported by {article.alsoReportedBy.length} {article.alsoReportedBy.length === 1 ? 'source' : 'sources'}:</span>
                          {article.alsoReportedBy.map((src, sIdx) => (
                            <span key={sIdx} className="inline-flex items-center gap-1">
                              {src.url ? (
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:underline"
                                >
                                  {src.publisher}
                                </a>
                              ) : (
                                <span className="text-slate-300">{src.publisher}</span>
                              )}
                              {sIdx < article.alsoReportedBy!.length - 1 && <span className="text-slate-600">·</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sentiment Label Badge */}
                    <div className="flex items-center gap-2 shrink-0 font-mono self-start sm:self-auto">
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

                  {/* Metadata Footer: Scores & Catalysts */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800/60 gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      {!isZeroScores && (
                        <>
                          <span>VADER: <strong className={isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-300'}>
                            {article.vaderScore >= 0 ? '+' : ''}{article.vaderScore.toFixed(2)}
                          </strong></span>
                          {article.financialScore !== undefined && (
                            <span>Financial: <strong className={article.financialScore >= 0.05 ? 'text-cyan-400' : article.financialScore <= -0.05 ? 'text-rose-400' : 'text-slate-300'}>
                              {article.financialScore >= 0 ? '+' : ''}{article.financialScore.toFixed(2)}
                            </strong></span>
                          )}
                        </>
                      )}
                      {article.evidenceStrength && article.evidenceStrength !== 'NEUTRAL' && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {article.evidenceStrength}
                        </span>
                      )}
                      {article.isHeadlineOnly && (
                        <span className="text-[10px] text-slate-500 italic">Headline</span>
                      )}
                    </div>

                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Read Original</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {article.matchedTerms && article.matchedTerms.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-slate-400 font-mono">
                      <span className="text-slate-500">Matched Catalysts/Risks:</span>
                      {article.matchedTerms.slice(0, 4).map((term, tIdx) => (
                        <span key={tIdx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {groupedCompanyArticles.length > 10 && (
              <div className="pt-3 flex items-center justify-center gap-2">
                {companyLimit < groupedCompanyArticles.length ? (
                  <button
                    onClick={() => setCompanyLimit(prev => Math.min(prev + 10, groupedCompanyArticles.length))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-200 transition-colors shadow-sm"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Show More Company News ({groupedCompanyArticles.length - companyLimit} remaining)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setCompanyLimit(10)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-400 transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Show Less</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-2">
            <AlertTriangle className="w-6 h-6 text-slate-600 mx-auto mb-1" />
            <p className="text-slate-300 font-semibold">
              {articles.length === 0
                ? `No company-specific articles found for ${quote.ticker}.`
                : 'No articles match your active filter criteria.'}
            </p>
            <p className="text-[11px]">
              {articles.length === 0
                ? 'Check the Global Market News section below for macroeconomic updates, or click Refresh Wire.'
                : 'Clear search keyword or switch the tone filter to ALL to view indexed stories.'}
            </p>
            {articles.length === 0 && (
              <button
                onClick={handleRefreshWire}
                disabled={isLoadingState}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingState ? 'animate-spin' : ''}`} />
                <span>Retry Feeds</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 5. Dedicated "Global Market News & Macro Wire" Section (Always Has Items) */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-200 font-mono uppercase tracking-wider">
                Global Market News & Macro Wire — Market-wide, not about this company ({globalMarketNews.length})
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Live macro financial wire from Economic Times, Moneycontrol, Livemint, Business Standard, CNBC & BBC. Excluded from company sentiment score.
            </p>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Always indexed regardless of single stock volume
          </span>
        </div>

        {filteredGlobalArticles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredGlobalArticles.slice(0, globalLimit).map((article, idx) => {
                const isPositive = article.sentimentLabel === 'POSITIVE' || article.vaderScore >= 0.05;
                const isNegative = article.sentimentLabel === 'NEGATIVE' || article.vaderScore <= -0.05;

                return (
                  <div
                    key={idx}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition-all space-y-2 flex flex-col justify-between group"
                  >
                    <div className="space-y-1.5">
                      {/* Header: Publisher & Date */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="font-semibold text-slate-300">{article.publisher || 'Financial Wire'}</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-2.5 h-2.5" />
                          {article.date}
                        </span>
                      </div>

                      {/* Headline */}
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-slate-200 hover:text-cyan-400 transition-colors inline-flex items-start gap-1 line-clamp-2"
                      >
                        <span>{cleanHtmlText(article.title)}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity mt-0.5" />
                      </a>

                      {article.summary && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 font-sans">
                          {cleanHtmlText(article.summary)}
                        </p>
                      )}
                    </div>

                    {/* Footer: Related Topic & Sentiment */}
                    <div className="flex items-center justify-between text-[10px] font-mono pt-2 border-t border-slate-800/60">
                      <span className="text-slate-500">
                        {article.relatedCompany || 'Macro & Markets'}
                      </span>

                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        isPositive
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                          : isNegative
                          ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        {article.sentimentLabel || 'NEUTRAL'} ({article.vaderScore >= 0 ? '+' : ''}{article.vaderScore.toFixed(2)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredGlobalArticles.length > 10 && (
              <div className="pt-3 flex items-center justify-center gap-2">
                {globalLimit < filteredGlobalArticles.length ? (
                  <button
                    onClick={() => setGlobalLimit(prev => Math.min(prev + 10, filteredGlobalArticles.length))}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-200 transition-colors shadow-sm"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Show More Global News ({filteredGlobalArticles.length - globalLimit} remaining)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setGlobalLimit(10)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-semibold text-slate-400 transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Show Less</span>
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="p-6 text-center text-slate-500 font-mono text-xs">
            No global market news matches your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
