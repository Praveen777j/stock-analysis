import React, { useState } from 'react';
import { SentimentData, StockQuote, RedditPost } from '../../types';
import {
  MessageSquare,
  Users,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react';

interface RedditSentimentPageProps {
  sentiment: SentimentData;
  quote: StockQuote;
}

export const RedditSentimentPage: React.FC<RedditSentimentPageProps> = ({ sentiment, quote }) => {
  const [selectedSubreddit, setSelectedSubreddit] = useState<string>('ALL');

  const redditPosts: RedditPost[] = sentiment.reddit?.posts || [];
  const hasPosts = redditPosts.length > 0;
  const redditBuzz = hasPosts && sentiment.reddit?.socialBuzzScore !== undefined
    ? sentiment.reddit.socialBuzzScore
    : hasPosts ? (sentiment.vaderCompound || 0) : 0;

  const totalUpvotes = redditPosts.reduce((acc, p) => acc + (p.score || 0), 0);
  const totalComments = redditPosts.reduce((acc, p) => acc + (p.numComments || 0), 0);

  const subreddits = Array.from(new Set(redditPosts.map(p => p.subreddit).filter(Boolean)));

  const filteredPosts = redditPosts.filter(p => {
    if (selectedSubreddit === 'ALL') return true;
    return p.subreddit === selectedSubreddit;
  });

  const bullishCount = redditPosts.filter(p => (p.finbertScore ?? p.vaderScore ?? 0) > 0.05).length;
  const bearishCount = redditPosts.filter(p => (p.finbertScore ?? p.vaderScore ?? 0) < -0.05).length;
  const totalAnalyzed = Math.max(1, bullishCount + bearishCount);
  const bullPct = hasPosts ? Math.round((bullishCount / totalAnalyzed) * 100) : 0;
  const bearPct = hasPosts ? 100 - bullPct : 0;

  return (
    <div className="space-y-6 pt-1 max-w-6xl mx-auto font-sans">
      {/* 1. Header & Retail Sentiment Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400">
                <MessageSquare className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-100 font-mono">
                Reddit Investor Community Sentiment — {quote.ticker}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Grassroots retail investor discussion, order flow debate, and retail momentum aggregated across premier financial subreddits.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">Retail Consensus:</span>
            <span className={`px-3 py-1.5 rounded-lg font-bold uppercase border ${
              !hasPosts
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : redditBuzz >= 0.10
                ? 'bg-orange-950 text-orange-400 border-orange-800'
                : redditBuzz <= -0.10
                ? 'bg-rose-950 text-rose-400 border-rose-800'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {!hasPosts ? 'DATA UNAVAILABLE' : redditBuzz >= 0.10 ? 'RETAIL ACCUMULATION' : redditBuzz <= -0.10 ? 'RETAIL DISTRIBUTION' : 'BALANCED DEBATE'}
            </span>
          </div>
        </div>

        {/* Sentiment Gauge Bar */}
        <div className="pt-4 space-y-1.5">
          {hasPosts ? (
            <>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {bullPct}% Bullish (Dip Buying / Holding)
                </span>
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  {bearPct}% Bearish (Profit Taking / Exit)
                  <TrendingDown className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800">
                <div style={{ width: `${bullPct}%` }} className="bg-emerald-500 h-full transition-all" />
                <div style={{ width: `${bearPct}%` }} className="bg-rose-500 h-full transition-all" />
              </div>
            </>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-slate-500 font-mono text-xs text-center">
              Social discussion stream inactive · No live public Reddit posts currently fetched
            </div>
          )}
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 text-[11px] block uppercase">Active Discussions</span>
            <div className="text-2xl font-bold text-slate-100">{hasPosts ? redditPosts.length : '0'}</div>
            <div className="text-[10px] text-slate-500">{hasPosts ? 'Tracked Forum Threads' : 'No Active Feed'}</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 text-[11px] block uppercase">Total Upvotes</span>
            <div className="text-2xl font-bold text-orange-400">{hasPosts ? `▲ ${totalUpvotes}` : 'N/A'}</div>
            <div className="text-[10px] text-slate-500">Retail Community Upvotes</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 text-[11px] block uppercase">Retail Comments</span>
            <div className="text-2xl font-bold text-slate-200">{hasPosts ? `💬 ${totalComments}` : 'N/A'}</div>
            <div className="text-[10px] text-slate-500">Thread Comment Engagements</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-1">
            <span className="text-slate-400 text-[11px] block uppercase">Retail Polarity Score</span>
            <div className={`text-2xl font-bold ${
              !hasPosts ? 'text-slate-500' : redditBuzz >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {!hasPosts ? 'N/A' : `${redditBuzz >= 0 ? '+' : ''}${redditBuzz.toFixed(2)}`}
            </div>
            <div className="text-[10px] text-slate-500">
              VADER Community Discussion Index
            </div>
          </div>
        </div>
      </div>

      {/* 2. Subreddit Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none font-mono text-xs">
        <span className="text-slate-400 text-[11px] uppercase mr-1">Filter Subreddit:</span>
        <button
          onClick={() => setSelectedSubreddit('ALL')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
            selectedSubreddit === 'ALL'
              ? 'bg-orange-500 text-slate-950 font-bold'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100'
          }`}
        >
          All Subreddits ({redditPosts.length})
        </button>
        {subreddits.map(sub => (
          <button
            key={sub}
            onClick={() => setSelectedSubreddit(sub)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
              selectedSubreddit === sub
                ? 'bg-orange-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            {sub} ({redditPosts.filter(p => p.subreddit === sub).length})
          </button>
        ))}
      </div>

      {/* 3. Detailed Reddit Discussions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            Live Retail Discussion Threads
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            r/IndianStockMarket · r/dalalstreetbets · r/IndiaInvestments
          </span>
        </div>

        <div className="space-y-3">
          {!hasPosts ? (
            <div className="p-8 sm:p-10 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-300 font-sans text-xs space-y-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-100 font-mono">
                    Reddit Public Data API Authentication Required
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Under Reddit's official Data API terms, third-party applications must authenticate using OAuth credentials. Live unauthenticated scraping of Reddit is strictly disabled to comply with provider terms and prevent IP bans.
                  </p>
                </div>
              </div>

              {/* Step-by-Step Setup Guide */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 font-mono">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                  Official Reddit API Configuration Guide (Free Tier)
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300 font-sans">
                  <li>Visit the official Reddit Developer App Portal: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-orange-300 font-mono">https://www.reddit.com/prefs/apps</code></li>
                  <li>Click <strong>"create app..."</strong> (or "create another app...").</li>
                  <li>Select the <strong>"script"</strong> radio button (for automated server-side scripts).</li>
                  <li>Enter Name: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-200 font-mono">NexusStockIntelligence</code> and Redirect URI: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-200 font-mono">http://localhost:3000</code>.</li>
                  <li>Click <strong>"create app"</strong>. Copy the generated <strong>Client ID</strong> (shown below the app name) and the <strong>secret</strong>.</li>
                  <li>In your Render Service Dashboard (or local <code className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-200 font-mono">.env</code>), configure:
                    <div className="mt-1.5 pl-4 space-y-1 font-mono text-[10px] text-emerald-400 bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <div>REDDIT_CLIENT_ID=your_client_id_here</div>
                      <div>REDDIT_CLIENT_SECRET=your_client_secret_here</div>
                    </div>
                  </li>
                  <li className="text-slate-400 text-[10px] pt-1">
                    *Never share credentials in chat or commit secrets to git repositories.
                  </li>
                </ol>
              </div>

              {/* Retail Sentiment Limitations */}
              <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5 text-[11px] text-slate-400">
                <strong className="text-slate-200 font-semibold block font-mono">
                  Retail Sentiment Methodological Limitations:
                </strong>
                <p>
                  Social media sentiment does not drive equity valuation. Retail discussions suffer from heavy selection bias (over-indexing on volatile microcaps and recent large-cap gainers), coordinated herd behaviour, and small sample sizes. An abundance of Reddit upvotes or comments does not imply institutional accumulation or future price appreciation.
                </p>
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-400 font-mono text-xs">
              No discussion threads found for this subreddit.
            </div>
          ) : (
            filteredPosts.map((post: RedditPost, idx: number) => {
              const postScore: number = (post.finbertScore !== undefined && post.finbertScore !== null) ? post.finbertScore : (post.vaderScore ?? 0);
              const isBullishPost = postScore > 0.08;
              const isBearishPost = postScore < -0.08;

              return (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 p-4 sm:p-5 rounded-2xl transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-orange-950 text-orange-400 border border-orange-800 font-bold">
                          {post.subreddit}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{post.date || 'Today'}</span>
                        <span className="text-xs text-slate-200 font-mono font-bold">▲ {post.score} upvotes</span>
                        <span className="text-xs text-slate-400 font-mono">💬 {post.numComments} comments</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          isBullishPost
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : isBearishPost
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {isBullishPost ? 'RETAIL BUY BIAS' : isBearishPost ? 'RETAIL SELL BIAS' : 'COMMUNITY DEBATE'}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-bold text-slate-100 leading-snug pt-0.5">
                        {post.title}
                      </h4>

                      <div className="pt-1 flex items-center gap-3">
                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-orange-400 hover:text-orange-300 transition-colors"
                          >
                            <span>Open Thread on Reddit</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 font-mono text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800 min-w-[120px]">
                      <span className="text-[10px] text-slate-500 uppercase block font-sans">Sentiment Polarity</span>
                      <span className={`text-lg font-bold ${
                        postScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {postScore >= 0 ? '+' : ''}{postScore.toFixed(2)}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                        {isBullishPost ? 'Accumulation' : isBearishPost ? 'Profit Taking' : 'Neutral'}
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
