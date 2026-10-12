import React, { useState } from 'react';
import { SentimentData, StockQuote, RedditPost } from '../../types';
import {
  Newspaper,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building,
  Flame,
  Users
} from 'lucide-react';

interface SentimentTabProps {
  sentiment: SentimentData;
  quote: StockQuote;
}

export const SentimentTab: React.FC<SentimentTabProps> = ({ sentiment, quote }) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEWS' | 'REDDIT'>('ALL');

  const isBullish = sentiment.label === 'BULLISH';
  const isBearish = sentiment.label === 'BEARISH';

  // Calculate positive / neutral / negative proportions across articles
  const posCount = sentiment.articles.filter(a => a.finbertScore > 0.15).length;
  const negCount = sentiment.articles.filter(a => a.finbertScore < -0.15).length;
  const neuCount = Math.max(0, sentiment.articles.length - posCount - negCount);
  const total = Math.max(1, sentiment.articles.length);

  const posPct = Math.round((posCount / total) * 100);
  const neuPct = Math.round((neuCount / total) * 100);
  const negPct = 100 - posPct - neuPct;

  const redditPosts = sentiment.reddit?.posts || [];
  const redditBuzz = sentiment.reddit?.socialBuzzScore !== undefined
    ? sentiment.reddit.socialBuzzScore
    : sentiment.vaderCompound || 0;

  return (
    <div className="space-y-6 pt-2">
      {/* 1. Header Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
            <Newspaper className="w-5 h-5 text-emerald-400" />
            Financial Media & Community Sentiment Intelligence — {quote.ticker}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time feed tracking institutional corporate press coverage and retail community discussions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Consensus Tone:</span>
          <span className={`text-xs px-2.5 py-1 rounded font-mono font-bold uppercase border ${
            isBullish
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
              : isBearish
              ? 'bg-rose-950/80 text-rose-400 border-rose-800'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            {sentiment.label}
          </span>
        </div>
      </div>

      {/* 2. Key Intelligence Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <span className="text-slate-400 uppercase tracking-wider text-[11px] font-sans font-semibold">Media & Social Bias</span>
          <div className={`text-2xl font-extrabold mt-1 ${
            sentiment.overallScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {sentiment.overallScore >= 0 ? '+' : ''}{sentiment.overallScore.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
            {sentiment.overallScore >= 0.15 ? 'Bullish Media Consensus' : sentiment.overallScore <= -0.15 ? 'Cautious / Negative Press' : 'Balanced Disclosure'}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <span className="text-slate-400 uppercase tracking-wider text-[11px] font-sans font-semibold">Financial Press Tone</span>
          <div className={`text-2xl font-extrabold mt-1 ${
            sentiment.finbertScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {sentiment.finbertScore >= 0 ? '+' : ''}{sentiment.finbertScore.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-sans">Corporate News Analysis</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <span className="text-slate-400 uppercase tracking-wider text-[11px] font-sans font-semibold">Reddit Community Bias</span>
          <div className={`text-2xl font-extrabold mt-1 ${
            redditBuzz >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {redditBuzz >= 0 ? '+' : ''}{redditBuzz.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-sans">{redditPosts.length} Active Investor Threads</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <span className="text-slate-400 uppercase tracking-wider text-[11px] font-sans font-semibold">Tracked Media Items</span>
          <div className="text-2xl font-extrabold text-slate-100 mt-1">
            {sentiment.newsCount + redditPosts.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-sans">{sentiment.newsCount} Press Articles + {redditPosts.length} Community Feeds</div>
        </div>
      </div>

      {/* 3. Executive Media & Community Intelligence Briefing */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800/80 gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
              Live Media Consensus & Market Buzz Briefing
            </h4>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Feeds: Economic Times · Mint · Moneycontrol · Reddit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Financial Press Column */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 font-mono flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                Institutional Press Reporting
              </span>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                sentiment.finbertScore >= 0.15
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : sentiment.finbertScore <= -0.15
                  ? 'bg-rose-950 text-rose-400 border-rose-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {sentiment.finbertScore >= 0.15 ? 'BULLISH REPORTING' : sentiment.finbertScore <= -0.15 ? 'BEARISH CONCERNS' : 'NEUTRAL DISCLOSURE'}
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              Financial media coverage highlights key quarterly earnings metrics, capital expenditure announcements, and regulatory disclosures. Articles are indexed in real time to assess institutional positioning.
            </p>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono text-[11px] text-slate-400">
              <span>Verified Press Articles: <strong className="text-slate-200">{sentiment.articles.length}</strong></span>
              <span className="text-emerald-400">Institutional Impact: High</span>
            </div>
          </div>

          {/* Reddit Community Column */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 font-mono flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-orange-400" />
                Reddit Investor Community
              </span>
              <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                redditBuzz >= 0.10
                  ? 'bg-orange-950 text-orange-400 border-orange-800'
                  : redditBuzz <= -0.10
                  ? 'bg-rose-950 text-rose-400 border-rose-800'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {redditBuzz >= 0.10 ? 'RETAIL ACCUMULATION' : redditBuzz <= -0.10 ? 'PROFIT TAKING' : 'BALANCED DEBATE'}
              </span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
              Active sentiment from prominent Indian and global investor subreddits (<span className="text-orange-400 font-mono">r/IndianStockMarket</span>, <span className="text-orange-400 font-mono">r/dalalstreetbets</span>, <span className="text-orange-400 font-mono">r/IndiaInvestments</span>). Captures grassroots liquidity, retail stop-loss discussions, and trade momentum.
            </p>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between font-mono text-[11px] text-slate-400">
              <span>Tracked Threads: <strong className="text-slate-200">{redditPosts.length}</strong></span>
              <span className="text-orange-400">Grassroots Momentum</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Semantic Sentiment Distribution Bar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200 font-mono">Media Coverage Sentiment Split</span>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-emerald-400 font-semibold">{posPct}% Positive News</span>
            <span className="text-slate-400">{neuPct}% Neutral</span>
            <span className="text-rose-400 font-semibold">{negPct}% Negative News</span>
          </div>
        </div>
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div style={{ width: `${posPct}%` }} className="bg-emerald-500 transition-all duration-300" title={`Positive: ${posPct}%`} />
          <div style={{ width: `${neuPct}%` }} className="bg-slate-500 transition-all duration-300" title={`Neutral: ${neuPct}%`} />
          <div style={{ width: `${negPct}%` }} className="bg-rose-500 transition-all duration-300" title={`Negative: ${negPct}%`} />
        </div>
      </div>

      {/* 5. Feed Filters Toggle */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeFilter === 'ALL'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          All Verified Feeds ({sentiment.articles.length + redditPosts.length})
        </button>
        <button
          onClick={() => setActiveFilter('NEWS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeFilter === 'NEWS'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Newspaper className="w-3.5 h-3.5" />
          Financial Media News ({sentiment.articles.length})
        </button>
        <button
          onClick={() => setActiveFilter('REDDIT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeFilter === 'REDDIT'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Reddit Community Discussions ({redditPosts.length})
        </button>
      </div>

      {/* 6. Financial Press Articles Section (when ALL or NEWS) */}
      {(activeFilter === 'ALL' || activeFilter === 'NEWS') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Newspaper className="w-4 h-4 text-emerald-400" />
              Verified Financial Press Articles
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              Economic Times · Mint · Moneycontrol · Reuters · Business Standard
            </span>
          </div>

          <div className="space-y-2.5">
            {sentiment.articles.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 font-mono text-xs space-y-2">
                <Newspaper className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-slate-300 font-semibold">News data unavailable</div>
                <div className="text-slate-500 text-[11px]">Real-time press feed is currently unavailable for {quote.ticker}. Synthetic news generation is disabled.</div>
              </div>
            ) : (
              sentiment.articles.map((art, idx) => {
              const isPositiveArticle = art.finbertScore > 0.15;
              const isNegativeArticle = art.finbertScore < -0.15;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                          {art.publisher}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{art.date}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          isPositiveArticle
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                            : isNegativeArticle
                            ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {isPositiveArticle ? 'BULLISH IMPACT' : isNegativeArticle ? 'BEARISH CONCERN' : 'NEUTRAL DISCLOSURE'}
                        </span>
                      </div>

                      <h5 className="text-sm font-semibold text-slate-100 leading-snug pt-0.5">
                        {art.title}
                      </h5>

                      <p className="text-xs text-slate-300 leading-relaxed pt-0.5 font-sans">
                        {art.summary}
                      </p>
                    </div>

                    <div className="sm:text-right shrink-0 font-mono text-xs bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-sans">Market Bias Score</span>
                      <span className={`text-base font-bold ${
                        art.finbertScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {art.finbertScore >= 0 ? '+' : ''}{art.finbertScore.toFixed(2)}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                        {art.finbertScore >= 0.15 ? 'Positive Catalyst' : art.finbertScore <= -0.15 ? 'Downside Risk' : 'Neutral Event'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </section>
      )}

      {/* 7. Reddit Social Media Section (when ALL or REDDIT) */}
      {(activeFilter === 'ALL' || activeFilter === 'REDDIT') && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <MessageSquare className="w-4 h-4 text-orange-400" />
              Reddit Investor Community Discussions
            </h4>
            <span className="text-[11px] text-slate-400 font-mono">
              r/IndianStockMarket · r/dalalstreetbets · r/IndiaInvestments
            </span>
          </div>

          <div className="space-y-2.5">
            {redditPosts.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 font-mono text-xs space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-slate-300 font-semibold">Social sentiment data unavailable</div>
                <div className="text-slate-500 text-[11px]">{sentiment.reddit?.message || 'Live Reddit data unavailable. Simulated forum posts are disabled.'}</div>
              </div>
            ) : (
              redditPosts.map((post: RedditPost, idx: number) => {
              const postScore = post.finbertScore !== undefined ? post.finbertScore : post.vaderScore || 0;
              const isBullishPost = postScore > 0.10;
              const isBearishPost = postScore < -0.10;

              return (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-4 rounded-xl transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-950/80 text-orange-400 border border-orange-800 font-bold">
                          {post.subreddit}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{post.date}</span>
                        <span className="text-xs text-slate-300 font-mono font-semibold">▲ {post.score} upvotes</span>
                        <span className="text-xs text-slate-400 font-mono">💬 {post.numComments} comments</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          isBullishPost
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                            : isBearishPost
                            ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {isBullishPost ? 'COMMUNITY BULLISH' : isBearishPost ? 'COMMUNITY BEARISH' : 'DISCUSSION'}
                        </span>
                      </div>

                      <h5 className="text-sm font-semibold text-slate-100 leading-snug pt-0.5">
                        {post.title}
                      </h5>
                    </div>

                    <div className="sm:text-right shrink-0 font-mono text-xs bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block font-sans">Community Sentiment</span>
                      <span className={`text-base font-bold ${
                        postScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {postScore >= 0 ? '+' : ''}{postScore.toFixed(2)}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                        {isBullishPost ? 'Retail Accumulation' : isBearishPost ? 'Retail Caution' : 'Neutral Debate'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </section>
      )}
    </div>
  );
};
