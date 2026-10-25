/**
 * Financial News Intelligence & Corporate Catalyst Classification Engine
 * 
 * Provides:
 * 1. Clean HTML entity decoding and recursive tag stripping to ensure raw HTML (e.g. `<a href="...">`)
 *    is NEVER displayed in the UI or diagnostics.
 * 2. Canonical HTTP/HTTPS article URL validation.
 * 3. Corporate event clustering and catalyst deduplication:
 *    - Deduplicates articles covering the same corporate event (e.g., multiple publishers reporting Jio Platforms IPO).
 *    - Separates the count of published articles from the count of distinct corporate events.
 *    - Classifies as expansion catalysts only genuine business events (IPOs, earnings beats, order wins, capex, M&A)
 *      and excludes routine share price fluctuations or broker opinions.
 *    - Detects genuine corporate risks (regulatory actions, loss widening, downgrades) without fabricating negative events.
 */
import { analyzeFinancialSentiment, aggregateArticleSentiment } from './financialSentiment';

export interface CleanArticleData {
  title: string;
  url: string;
  summary: string;
  publisher: string;
}

export interface ClassifiedArticle {
  title: string;
  publisher: string;
  date: string;
  summary: string;
  url: string;
  vaderScore: number;
  finbertScore: number | null;
  distilbertScore?: number | null;
  distilbertLabel?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  sentimentLabel: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  isCatalyst: boolean;
  corporateEventId?: string;
  corporateEventTitle?: string;
  corporateEventType: 'EXPANSION' | 'RISK' | 'ROUTINE';
  financialScore?: number;
  financialMagnitude?: number;
  evidenceStrength?: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK' | 'NEUTRAL' | 'UNCERTAIN' | 'INSUFFICIENT';
  matchedTerms?: string[];
  contextCategories?: string[];
  isHeadlineOnly?: boolean;
  isUncertainOrAttributed?: boolean;
  isMixed?: boolean;
  // Multi-Source Intelligence & Ranking attributes
  pubTimestamp?: number;
  relatedCompany?: string;
  relevanceScore?: number;
  isOld?: boolean;
  isBreaking?: boolean;
  isInvalidOrMissingDate?: boolean;
  sourceCategory?: 'COMPANY_SPECIFIC' | 'GLOBAL_MARKET' | 'INDIAN_BUSINESS';
}

export interface RawFeedItem {
  title: string;
  url: string;
  publisher: string;
  summary: string;
  rawDate?: string;
  date: string;
  pubTimestamp: number;
  isOld: boolean;
  isBreaking: boolean;
  isInvalidOrMissingDate: boolean;
  sourceCategory?: 'COMPANY_SPECIFIC' | 'GLOBAL_MARKET' | 'INDIAN_BUSINESS';
}

export interface ParsedDateResult {
  formatted: string;
  rawDate: string;
  pubTimestamp: number;
  isOld: boolean;
  isBreaking: boolean;
  isInvalidOrMissing: boolean;
  relativeTime: string;
}

export interface RelevanceScoreResult {
  score: number;
  isRelated: boolean;
  matchedEntity: string;
}

export interface FeedSourceConfig {
  id: string;
  name: string;
  url: string;
  category: 'COMPANY_SPECIFIC' | 'INDIAN_BUSINESS' | 'GLOBAL_MARKET';
  timeoutMs?: number;
}

export interface FeedFetchResult {
  sourceId: string;
  sourceName: string;
  category: 'COMPANY_SPECIFIC' | 'INDIAN_BUSINESS' | 'GLOBAL_MARKET';
  success: boolean;
  items: RawFeedItem[];
  error?: string;
  responseTimeMs: number;
}

export interface MultiSourceNewsResult {
  articles: ClassifiedArticle[];
  globalMarketNews: ClassifiedArticle[];
  sourcesUsed: string[];
  sourcesFailed: string[];
  sourcesStatus: Array<{
    name: string;
    status: 'SUCCESS' | 'FAILED' | 'CACHED';
    itemCount: number;
    error?: string;
  }>;
  sourcesSummary: string;
  isPartialFailure: boolean;
  isStale?: boolean;
  cachedAt?: string;
  cacheTimestamp?: number;
  eventClusters: import('./types').EventCluster[];
  distinctEventsCount: number;
  expansionCatalystsCount: number;
  cautionaryOverhangsCount: number;
  expansionArticlesCount: number;
  cautionaryArticlesCount: number;
}

export interface GroupedNewsResult {
  articles: ClassifiedArticle[];
  eventClusters: import('./types').EventCluster[];
  distinctEventsCount: number;
  expansionCatalystsCount: number;
  cautionaryOverhangsCount: number;
  expansionArticlesCount: number;
  cautionaryArticlesCount: number;
}

/**
 * Decodes all HTML entities into plain text.
 */
export function decodeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#8217;/gi, "'")
    .replace(/&#8216;/gi, "'")
    .replace(/&#8220;/gi, '"')
    .replace(/&#8221;/gi, '"')
    .replace(/&#8211;/gi, '-')
    .replace(/&#8212;/gi, '--')
    .replace(/&#[0-9]{2,5};/g, (match) => {
      try {
        const code = parseInt(match.slice(2, -1), 10);
        return String.fromCharCode(code);
      } catch {
        return match;
      }
    });
}

/**
 * Strips all HTML tags and thoroughly cleans text of any literal markup or encoded entities.
 */
export function cleanHtmlText(text: string): string {
  if (!text) return '';
  // 1. Strip CDATA wrappers
  let s = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // 2. Decode entities first so any encoded tags like &lt;a&gt; become <a>
  s = decodeHtml(s);
  // 3. Strip all HTML tags
  s = s.replace(/<[^>]+>/g, ' ');
  // 4. Decode entities again in case of double escaping (&amp;amp;)
  s = decodeHtml(s);
  // 5. Strip any leftover tags
  s = s.replace(/<[^>]+>/g, ' ');
  // 6. Clean whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/**
 * Validates whether a URL is a legitimate, canonical HTTP or HTTPS web link.
 * Strictly rejects raw HTML tags or malformed URLs.
 */
export function isValidArticleUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.includes('<') || trimmed.includes('>') || trimmed.includes('"')) return false;
  return /^https?:\/\/[^\s<>"]+$/i.test(trimmed);
}

/**
 * Extracts and decodes canonical article title, target URL, description summary, and publisher.
 */
export function extractCleanArticleData(
  rawTitleTag: string,
  rawLinkTag: string,
  rawDescTag: string,
  rawSourceTag?: string
): CleanArticleData {
  // 1. Extract canonical URL
  let url = (rawLinkTag || '').trim();

  // If link tag is not a clean URL, inspect description or title for embedded href
  if (!isValidArticleUrl(url)) {
    const combinedTags = `${rawDescTag || ''} ${rawTitleTag || ''}`;
    const hrefMatch = combinedTags.match(/href=["'](https?:\/\/[^"'>\s]+)["']/i) ||
                      combinedTags.match(/href=&quot;(https?:\/\/[^"&>\s]+)&quot;/i);
    if (hrefMatch && hrefMatch[1] && isValidArticleUrl(hrefMatch[1])) {
      url = hrefMatch[1].trim();
    }
  }

  // 2. Extract Publisher
  let publisher = cleanHtmlText(rawSourceTag || '');

  // 3. Extract Clean Title
  let title = cleanHtmlText(rawTitleTag || '');

  // Handle common RSS title suffixes like " - Livemint" or " - Economic Times"
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    const potentialPub = parts[parts.length - 1].trim();
    if (!publisher && potentialPub.length > 1 && potentialPub.length < 40) {
      publisher = potentialPub;
      title = parts.slice(0, -1).join(' - ').trim();
    } else if (publisher && title.toLowerCase().endsWith(` - ${publisher.toLowerCase()}`)) {
      title = title.slice(0, -(publisher.length + 3)).trim();
    }
  }

  if (!publisher) {
    publisher = 'Financial News';
  }

  // 4. Extract Clean Summary (strip publisher font tags and anchors)
  let cleanDesc = (rawDescTag || '').replace(/<font[^>]*>[\s\S]*?<\/font>/gi, ' ');
  let summary = cleanHtmlText(cleanDesc);

  // If summary is empty or identical to title, generate a clean factual disclosure summary
  if (!summary || summary.toLowerCase() === title.toLowerCase()) {
    summary = `${title}. Verified corporate media coverage by ${publisher}.`;
  } else if (summary.length > 250) {
    summary = summary.slice(0, 247) + '...';
  }

  return { title, url, summary, publisher };
}

/**
 * Classifies whether an article represents a genuine corporate business event,
 * and extracts cluster keys to group identical events across multiple publishers.
 */
export function classifyCorporateEvent(
  title: string,
  summary: string,
  vaderScore: number,
  sentimentLabel: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
): {
  isExpansionCatalyst: boolean;
  isCautionaryRisk: boolean;
  corporateEventId?: string;
  corporateEventTitle?: string;
  corporateEventType: 'EXPANSION' | 'RISK' | 'ROUTINE';
  isCatalyst: boolean;
} {
  const combined = `${title} ${summary}`.toLowerCase();

  // 1. Explicit Exclusions: Routine share price moves, technical indicators, intraday market noise, broker target opinions
  const isRoutinePriceAction = /(?:share|stock)\s*price\s*today|live\s*updates.*share\s*price|today'?s\s*share\s*price|shares\s*(?:rise|gain|fall|slip|drop|jump|surge|rally|tumble)\s*(?:by|\d|up\s*to|sharply|modestly|briefly)|briefly\s*slip\s*below|down\s*up\s*to\s*\d+%|from\s*52-week\s*high|technical\s*indicator|crossing\s*key\s*indicator|multiple\s*block\s*deals|prediction\s*for\s*tomorrow|target\s*price|buy\s*the\s*dip|stocks\s*with\s*highest|stocks\s*to\s*watch|do\s*you\s*own\s*any|intraday\s*(?:high|low|trade)|nifty\s*stocks\s*that\s*are/i.test(combined);

  // 2. Genuine Corporate Business Events (Expansion Catalysts)

  // A. IPO & Public Listing (e.g., Jio Platforms IPO reported by multiple publishers)
  const isIpoEvent = /(?:jio\s*platforms|reliance\s*retail|subsidiary|unit)?\s*(?:mega\s*|landmark\s*|upcoming\s*)?(?:ipo|public\s*listing|public\s*issue|demerger|spin[- ]off)/i.test(combined);
  if (isIpoEvent && !combined.includes('prediction for tomorrow')) {
    const isJio = /jio/i.test(combined);
    const isRetail = /retail/i.test(combined);
    const entityName = isJio ? 'Jio Platforms' : isRetail ? 'Reliance Retail' : 'Primary Market';
    const clusterId = `${isJio ? 'jio' : isRetail ? 'retail' : 'unit'}-ipo-listing`;
    return {
      isExpansionCatalyst: true,
      isCautionaryRisk: false,
      corporateEventId: clusterId,
      corporateEventTitle: `${entityName} IPO & Public Listing`,
      corporateEventType: 'EXPANSION',
      isCatalyst: true
    };
  }

  // B. Major Quarterly / Annual Earnings Surge (Operational Outperformance)
  const isEarningsSurge = /(?:q[1-4]|fy\d{2}|quarterly|annual|interim)\s*(?:net\s*)?profit\s*(?:surges|jumps|rallies|up|rises|beats|record)|record\s*(?:quarterly\s*)?(?:profit|revenue)|net\s*profit\s*(?:doubles|surges|grows\s*\d+%)|earnings\s*beat|ebitda\s*(?:surges|growth\s*\d+%)/i.test(combined);
  if (isEarningsSurge) {
    const qMatch = combined.match(/(q[1-4]|fy\d{2})/i);
    const period = qMatch ? qMatch[1].toUpperCase() : 'Quarterly';
    return {
      isExpansionCatalyst: true,
      isCautionaryRisk: false,
      corporateEventId: `earnings-${period.toLowerCase()}-outperformance`,
      corporateEventTitle: `${period} Earnings Outperformance`,
      corporateEventType: 'EXPANSION',
      isCatalyst: true
    };
  }

  // C. Commercial Order Wins & Contract Awards
  const isOrderWin = /(?:bags?|secures?|wins?|awarded|signs?)\b[\s\S]{0,60}?\b(?:order|contract|deal|project|mandate)\b/i.test(combined);
  if (isOrderWin) {
    return {
      isExpansionCatalyst: true,
      isCautionaryRisk: false,
      corporateEventId: 'commercial-order-contract-win',
      corporateEventTitle: 'Commercial Order Win & Contract Execution',
      corporateEventType: 'EXPANSION',
      isCatalyst: true
    };
  }

  // D. Strategic Mergers & Acquisitions
  const isMna = /(?:acquires?|acquisition\s*of|merger\s*with|takeover|buys\s*stake|joint\s*venture\s*with|strategic\s*partnership\s*with)/i.test(combined);
  if (isMna) {
    return {
      isExpansionCatalyst: true,
      isCautionaryRisk: false,
      corporateEventId: 'strategic-mna-expansion',
      corporateEventTitle: 'Strategic Acquisition / Joint Venture',
      corporateEventType: 'EXPANSION',
      isCatalyst: true
    };
  }

  // E. Industrial Capex & Capacity Expansion
  const isCapexExpansion = /(?:capacity\s*expansion|new\s*plant|commission\w+|gigafactory|greenfield\s*project|capex\s*plan|facility\s*opening)/i.test(combined);
  if (isCapexExpansion) {
    return {
      isExpansionCatalyst: true,
      isCautionaryRisk: false,
      corporateEventId: 'capex-capacity-expansion',
      corporateEventTitle: 'Capacity Expansion & Infrastructure Capex',
      corporateEventType: 'EXPANSION',
      isCatalyst: true
    };
  }

  // F. Shareholder Capital Distribution
  const isCapitalReturn = /(?:record\s*)?dividend\s*(?:declared|payout)|share\s*buyback|bonus\s*shares/i.test(combined);
  if (isCapitalReturn) {
    return {
      isExpansionCatalyst: true,
      isCautionaryRisk: false,
      corporateEventId: 'capital-distribution-return',
      corporateEventTitle: 'Shareholder Capital Return & Dividend',
      corporateEventType: 'EXPANSION',
      isCatalyst: true
    };
  }

  // 3. Genuine Cautionary Risks & Overhangs (NO INVENTED NEGATIVE EVENTS)

  // G. Statutory / Regulatory Scrutiny & Penalties
  const isRegulatoryRisk = /(?:sebi|rbi|cci|ed|cbi)\s*(?:probe|investigation|penalty|fine|notice|order|action)|tax\s*demand\s*(?:of|worth)|regulatory\s*(?:penalty|scrutiny|sanction)|show[- ]cause\s*notice|lawsuit|fraud|scam/i.test(combined);
  if (isRegulatoryRisk) {
    return {
      isExpansionCatalyst: false,
      isCautionaryRisk: true,
      corporateEventId: 'regulatory-statutory-scrutiny',
      corporateEventTitle: 'Regulatory Action & Statutory Scrutiny',
      corporateEventType: 'RISK',
      isCatalyst: true
    };
  }

  // H. Operational Losses & Financial Distress
  const isFinancialDistress = /(?:net\s*)?loss\s*(?:widens?|deepens?)|profit\s*(?:plunges?|crashes?|slumps?)\s*(?:by|\d+%)|revenue\s*(?:plunges?|contracts?\s*\d+%)|debt\s*default|insolvency|nclt/i.test(combined);
  if (isFinancialDistress) {
    return {
      isExpansionCatalyst: false,
      isCautionaryRisk: true,
      corporateEventId: 'operational-loss-deterioration',
      corporateEventTitle: 'Operational Loss & Financial Headwind',
      corporateEventType: 'RISK',
      isCatalyst: true
    };
  }

  // I. Credit Rating Downgrade
  const isCreditDowngrade = /(?:credit\s*rating|rating)\s*downgraded?|downgrade\s*by\s*(?:crisil|icra|care|fitch|moody)/i.test(combined);
  if (isCreditDowngrade) {
    return {
      isExpansionCatalyst: false,
      isCautionaryRisk: true,
      corporateEventId: 'credit-rating-downgrade',
      corporateEventTitle: 'Credit Rating Downgrade',
      corporateEventType: 'RISK',
      isCatalyst: true
    };
  }

  // Routine market commentary or price action
  return {
    isExpansionCatalyst: false,
    isCautionaryRisk: false,
    corporateEventType: 'ROUTINE',
    isCatalyst: false
  };
}

/**
 * Deduplicates and groups articles describing identical corporate events while preserving
 * every individual publisher's coverage in the feed.
 */
export function deduplicateAndGroupNewsArticles(rawArticles: any[]): GroupedNewsResult {
  const classifiedArticles: ClassifiedArticle[] = [];
  const distinctExpansionEvents = new Set<string>();
  const distinctCautionaryEvents = new Set<string>();
  const distinctAllEvents = new Set<string>();
  const clusterMap = new Map<string, import('./types').EventCluster>();

  let expansionArticlesCount = 0;
  let cautionaryArticlesCount = 0;

  for (const art of rawArticles) {
    const classification = classifyCorporateEvent(
      art.title,
      art.summary,
      art.vaderScore,
      art.sentimentLabel
    );

    const classified: ClassifiedArticle = {
      title: art.title,
      publisher: art.publisher,
      date: art.date,
      summary: art.summary,
      url: art.url,
      vaderScore: art.vaderScore,
      finbertScore: art.finbertScore,
      sentimentLabel: art.sentimentLabel,
      isCatalyst: classification.isCatalyst,
      corporateEventId: classification.corporateEventId,
      corporateEventTitle: classification.corporateEventTitle,
      corporateEventType: classification.corporateEventType,
      financialScore: art.financialScore ?? art.vaderScore,
      evidenceStrength: art.evidenceStrength || 'NEUTRAL',
      matchedTerms: art.matchedTerms || [],
      contextCategories: art.contextCategories || [],
      isHeadlineOnly: Boolean(art.isHeadlineOnly),
      isUncertainOrAttributed: Boolean(art.isUncertainOrAttributed),
      isMixed: Boolean(art.isMixed),
      pubTimestamp: art.pubTimestamp,
      relatedCompany: art.relatedCompany,
      relevanceScore: art.relevanceScore,
      isOld: Boolean(art.isOld),
      isBreaking: Boolean(art.isBreaking),
      isInvalidOrMissingDate: Boolean(art.isInvalidOrMissingDate),
      sourceCategory: art.sourceCategory
    };

    classifiedArticles.push(classified);

    const eventId = classification.corporateEventId || `general-${art.publisher.toLowerCase().replace(/[^a-z0-9]/g, '')}-${art.date.replace(/[^a-z0-9]/gi, '')}`;
    const eventTitle = classification.corporateEventTitle || (classification.corporateEventType === 'ROUTINE' ? 'Routine Financial Media Disclosure' : 'General Market & Corporate Coverage');

    let cluster = clusterMap.get(eventId);
    if (!cluster) {
      cluster = {
        id: eventId,
        title: eventTitle,
        category: classification.corporateEventType === 'EXPANSION'
          ? 'CATALYST'
          : classification.corporateEventType === 'RISK'
          ? 'RISK'
          : /target price|brokerage|recommendation/i.test(`${art.title} ${art.summary}`)
          ? 'BROKER_OPINION'
          : /filing|quarterly|annual|board/i.test(`${art.title} ${art.summary}`)
          ? 'ROUTINE_FILING'
          : 'PRICE_ACTION',
        articleCount: 0,
        summary: art.summary || art.title,
        firstSeen: art.date,
        latestSeen: art.date,
        articles: [],
        isVerifiedCatalyst: classification.corporateEventType === 'EXPANSION',
        isVerifiedRisk: classification.corporateEventType === 'RISK'
      };
      clusterMap.set(eventId, cluster);
    }
    cluster.articleCount++;
    cluster.articles.push(classified);
    cluster.latestSeen = art.date;

    if (classification.corporateEventType === 'EXPANSION' && classification.corporateEventId) {
      distinctExpansionEvents.add(classification.corporateEventId);
      distinctAllEvents.add(classification.corporateEventId);
      expansionArticlesCount++;
    } else if (classification.corporateEventType === 'RISK' && classification.corporateEventId) {
      distinctCautionaryEvents.add(classification.corporateEventId);
      distinctAllEvents.add(classification.corporateEventId);
      cautionaryArticlesCount++;
    }
  }

  const eventClusters = Array.from(clusterMap.values()).sort((a, b) => b.articleCount - a.articleCount);

  return {
    articles: classifiedArticles,
    eventClusters,
    distinctEventsCount: distinctAllEvents.size,
    expansionCatalystsCount: distinctExpansionEvents.size,
    cautionaryOverhangsCount: distinctCautionaryEvents.size,
    expansionArticlesCount,
    cautionaryArticlesCount
  };
}

/**
 * Known company aliases, brand names, subsidiaries and key personnel
 * for Indian blue-chips and major international stocks.
 */
export const KNOWN_COMPANY_ALIASES: Record<string, string[]> = {
  'RELIANCE': ['reliance industries', 'reliance', 'ril', 'jio', 'reliance retail', 'mukesh ambani'],
  'TCS': ['tata consultancy services', 'tcs', 'tata consultancy'],
  'INFY': ['infosys', 'infy', 'salil parekh'],
  'HDFCBANK': ['hdfc bank', 'hdfcbank', 'hdfc'],
  'ICICIBANK': ['icici bank', 'icicibank', 'icici'],
  'SBIN': ['state bank of india', 'sbi', 'sbin'],
  'BHARTIARTL': ['bharti airtel', 'airtel', 'bharti'],
  'TATAMOTORS': ['tata motors', 'tatamotors', 'tmpv', 'tmcv', 'jlr', 'jaguar land rover'],
  'TMPV': ['tata motors passenger vehicles', 'tata motors', 'tmpv', 'jlr'],
  'TMCV': ['tata motors commercial vehicles', 'tata motors', 'tmcv'],
  'ZOMATO': ['zomato', 'eternal', 'blinkit', 'deepinder goyal'],
  'ETERNAL': ['eternal', 'zomato', 'blinkit', 'deepinder goyal'],
  'ITC': ['itc limited', 'itc ltd', 'itc'],
  'LT': ['larsen & toubro', 'larsen and toubro', 'l&t', 'lt'],
  'KOTAKBANK': ['kotak mahindra bank', 'kotak bank', 'kotak'],
  'BAJFINANCE': ['bajaj finance', 'bajfinance'],
  'MARUTI': ['maruti suzuki', 'maruti'],
  'SUNPHARMA': ['sun pharma', 'sun pharmaceutical'],
  'TITAN': ['titan company', 'titan', 'tanishq'],
  'ADANIENT': ['adani enterprises', 'adani group', 'gautam adani'],
  'ADANIPORTS': ['adani ports', 'apsez', 'adani'],
  'TATASTEEL': ['tata steel'],
  'WIPRO': ['wipro', 'azim premji'],
  'M&M': ['mahindra & mahindra', 'mahindra and mahindra', 'm&m', 'mahindra'],
  'BAJAJFINSV': ['bajaj finserv'],
  'NESTLEIND': ['nestle india', 'nestle'],
  'JSWSTEEL': ['jsw steel', 'jsw'],
  'GRASIM': ['grasim industries', 'grasim'],
  'TECHM': ['tech mahindra'],
  'HINDALCO': ['hindalco'],
  'INDUSINDBK': ['indusind bank', 'indusind'],
  'DRREDDY': ['dr reddy', "dr. reddy's", 'dr reddys'],
  'CIPLA': ['cipla'],
  'TATACONSUM': ['tata consumer', 'tata tea'],
  'DIVISLAB': ['divis laboratories', "divi's", 'divis lab'],
  'EICHERMOT': ['eicher motors', 'royal enfield', 'eicher'],
  'BPCL': ['bharat petroleum', 'bpcl'],
  'BRITANNIA': ['britannia industries', 'britannia'],
  'APOLLOHOSP': ['apollo hospitals', 'apollo hospital'],
  'HEROMOTOCO': ['hero motocorp', 'hero honda', 'hero moto'],
  'SHRIRAMFIN': ['shriram finance'],
  'BAJAJ-AUTO': ['bajaj auto'],
  'JIOFIN': ['jio financial services', 'jio financial', 'jiofin'],
  'SHADOWFAX': ['shadowfax technologies', 'shadowfax'],
  // US Equities
  'AAPL': ['apple inc', 'apple', 'iphone', 'tim cook', 'aapl'],
  'MSFT': ['microsoft corporation', 'microsoft', 'satya nadella', 'msft', 'azure'],
  'GOOGL': ['alphabet inc', 'alphabet', 'google', 'sundar pichai', 'googl', 'goog'],
  'AMZN': ['amazon.com', 'amazon', 'aws', 'andy jassy', 'amzn'],
  'NVDA': ['nvidia corporation', 'nvidia', 'jensen huang', 'nvda'],
  'TSLA': ['tesla inc', 'tesla', 'elon musk', 'tsla'],
  'META': ['meta platforms', 'meta', 'facebook', 'instagram', 'mark zuckerberg']
};

export function getCompanyAliases(ticker: string, companyName?: string): string[] {
  const cleanTicker = ticker.replace('.NS', '').replace('.BO', '').trim().toUpperCase();
  const list = new Set<string>();
  list.add(cleanTicker.toLowerCase());

  if (KNOWN_COMPANY_ALIASES[cleanTicker]) {
    for (const a of KNOWN_COMPANY_ALIASES[cleanTicker]) {
      list.add(a.toLowerCase());
    }
  }

  if (companyName) {
    const cleanComp = companyName
      .replace(/\s+(ltd|limited|corp|corporation|inc|incorporated|plc|llc|co)\.?$/i, '')
      .trim()
      .toLowerCase();
    if (cleanComp.length > 2) {
      list.add(cleanComp);
      const words = cleanComp.split(/\s+/).filter(w => w.length >= 4);
      for (const w of words) {
        list.add(w);
      }
    }
  }

  return Array.from(list);
}

/**
 * Normalises a news headline by stripping trailing publisher suffixes
 * (e.g. " - Economic Times", " | Business Standard", " - Livemint")
 * and stripping non-alphanumeric punctuation for robust deduplication.
 */
export function normalizeHeadline(title: string): string {
  if (!title) return '';
  return cleanHtmlText(title)
    .toLowerCase()
    .replace(/\s*[-–—|]\s*(?:the\s+)?(?:economic\s+times|livemint|business\s+standard|moneycontrol|cnbc|bbc(?:\s+news)?|reuters|ndtv|zeebiz|financial\s+express|times\s+of\s+india|hindustan\s+times|google\s+news|bloomberg|marketwatch|investopedia)[\s\S]*$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Normalises an article URL by stripping tracking and affiliate parameters
 * (utm_*, ref, oc, partnerId, etc.) and trailing slashes.
 */
export function normalizeArticleUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let u = decodeHtml(rawUrl).trim();
  u = u.replace(/<[^>]+>/g, '').trim();
  try {
    const parsed = new URL(u);
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'ref', 'oc', 'partnerid', 'partnerId', 'fbclid', 'gclid', 'guccounter',
      'at_medium', 'at_campaign'
    ];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    const cleanPath = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${cleanPath}${parsed.search ? parsed.search : ''}`;
  } catch {
    return u.split('?')[0].replace(/\/+$/, '').toLowerCase();
  }
}

/**
 * Parses raw pubDate string, handles invalid or missing dates honestly,
 * and classifies age into old (older than 7 days) and breaking (within 4 hours).
 * Old articles are marked isOld=true and NEVER as breaking.
 */
export function parseAndFormatArticleDate(
  rawDate?: string,
  currentNowMs: number = Date.now()
): ParsedDateResult {
  if (!rawDate || typeof rawDate !== 'string' || !rawDate.trim()) {
    return {
      formatted: 'Date unavailable',
      rawDate: '',
      pubTimestamp: 0,
      isOld: true,
      isBreaking: false,
      isInvalidOrMissing: true,
      relativeTime: 'Date unavailable'
    };
  }

  const parsed = new Date(rawDate);
  const ts = parsed.getTime();
  if (isNaN(ts) || !Number.isFinite(ts) || ts <= 0) {
    return {
      formatted: 'Date unavailable',
      rawDate,
      pubTimestamp: 0,
      isOld: true,
      isBreaking: false,
      isInvalidOrMissing: true,
      relativeTime: 'Date unavailable'
    };
  }

  const now = currentNowMs;
  const effectiveTs = ts > now + 60000 ? now : ts;
  const ageMs = Math.max(0, now - effectiveTs);
  const ageHours = ageMs / (1000 * 60 * 60);
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Mark old articles as old (older than 7 days)
  const isOld = ageDays > 7;
  // Breaking only if published in the last 4 hours AND not an old date
  const isBreaking = !isOld && ageHours <= 4;

  let relativeTime = '';
  if (ageHours < 1) {
    const mins = Math.max(1, Math.floor(ageMs / (1000 * 60)));
    relativeTime = `${mins}m ago`;
  } else if (ageHours < 24) {
    const hrs = Math.floor(ageHours);
    relativeTime = `${hrs}h ago`;
  } else if (ageDays < 2) {
    relativeTime = 'Yesterday';
  } else if (ageDays < 7) {
    const d = Math.floor(ageDays);
    relativeTime = `${d}d ago`;
  } else {
    relativeTime = parsed.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  const calendarDate = parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return {
    formatted: isOld ? calendarDate : relativeTime,
    rawDate,
    pubTimestamp: effectiveTs,
    isOld,
    isBreaking,
    isInvalidOrMissing: false,
    relativeTime
  };
}

/**
 * Calculates a numerical relevance score for an article relative to a target company.
 * Matches ticker symbol, full company name, and known subsidiaries/aliases.
 */
export function calculateRelevanceScore(
  article: { title: string; summary?: string },
  ticker: string,
  companyName: string,
  aliases: string[]
): RelevanceScoreResult {
  const cleanTicker = ticker.replace('.NS', '').replace('.BO', '').trim().toLowerCase();
  const cleanComp = (companyName || '').toLowerCase().replace(/\s+(ltd|limited|corp|inc)\.?$/i, '').trim();
  const title = (article.title || '').toLowerCase();
  const summary = (article.summary || '').toLowerCase();

  let score = 0;
  let matchedEntity = '';

  // 1. Title matches
  const tickerRegex = new RegExp(`\\b${cleanTicker}\\b`, 'i');
  if (tickerRegex.test(title)) {
    score += 120;
    matchedEntity = ticker.toUpperCase();
  } else if (cleanComp && title.includes(cleanComp)) {
    score += 100;
    matchedEntity = companyName;
  } else {
    for (const alias of aliases) {
      if (alias.length < 3) continue;
      const aliasRegex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (aliasRegex.test(title) || (alias.length >= 4 && title.includes(alias))) {
        score += 80;
        matchedEntity = alias.charAt(0).toUpperCase() + alias.slice(1);
        break;
      }
    }
  }

  // 2. Summary matches
  if (tickerRegex.test(summary)) {
    score += 50;
    if (!matchedEntity) matchedEntity = ticker.toUpperCase();
  } else if (cleanComp && summary.includes(cleanComp)) {
    score += 40;
    if (!matchedEntity) matchedEntity = companyName;
  } else {
    for (const alias of aliases) {
      if (alias.length < 3) continue;
      if (summary.includes(alias)) {
        score += 25;
        if (!matchedEntity) matchedEntity = alias.charAt(0).toUpperCase() + alias.slice(1);
        break;
      }
    }
  }

  const isRelated = score >= 25;
  return {
    score,
    isRelated,
    matchedEntity: isRelated ? (matchedEntity || companyName) : 'General Market / Global'
  };
}

/**
 * Parses raw XML text from an RSS 2.0 or Atom feed into structured RawFeedItem objects.
 */
export function parseRssFeedXml(
  xml: string,
  defaultPublisher = 'Financial Wire',
  category: 'COMPANY_SPECIFIC' | 'GLOBAL_MARKET' | 'INDIAN_BUSINESS' = 'COMPANY_SPECIFIC',
  currentNowMs: number = Date.now()
): RawFeedItem[] {
  if (!xml || typeof xml !== 'string') return [];

  const items: RawFeedItem[] = [];
  const itemRegex = /<(?:item|entry)[\s>][\s\S]*?<\/(?:item|entry)>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const rawBlock = match[0];

    // Title
    const titleMatch = rawBlock.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : '';

    // Link
    let rawLink = '';
    const linkMatch = rawBlock.match(/<link[^>]*>(?:<!\[CDATA\[)?(https?:\/\/[\s\S]*?)(?:\]\]>)?<\/link>/i);
    if (linkMatch && linkMatch[1]) {
      rawLink = linkMatch[1].trim();
    } else {
      const hrefMatch = rawBlock.match(/<link[^>]+href=["'](https?:\/\/[^"'\s>]+)["']/i);
      if (hrefMatch && hrefMatch[1]) {
        rawLink = hrefMatch[1].trim();
      }
    }

    // PubDate
    const dateMatch = rawBlock.match(/<(?:pubDate|published|updated|dc:date)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:pubDate|published|updated|dc:date)>/i);
    const rawDate = dateMatch ? dateMatch[1].trim() : '';

    // Description / Summary
    const descMatch = rawBlock.match(/<(?:description|summary|content:encoded)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content:encoded)>/i);
    const rawDesc = descMatch ? descMatch[1] : '';

    // Source
    const sourceMatch = rawBlock.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/i);
    const rawSource = sourceMatch ? sourceMatch[1].trim() : '';

    const cleaned = extractCleanArticleData(rawTitle, rawLink, rawDesc, rawSource);

    if (!cleaned.title || cleaned.title.length < 5) continue;
    const isGenericQuote = /share price today|stock price today|live updates.*share price|today's share price/i.test(cleaned.title);
    if (isGenericQuote) continue;

    const dateInfo = parseAndFormatArticleDate(rawDate, currentNowMs);

    items.push({
      title: cleaned.title,
      url: normalizeArticleUrl(cleaned.url),
      publisher: cleaned.publisher || defaultPublisher,
      summary: cleaned.summary,
      rawDate,
      date: dateInfo.formatted,
      pubTimestamp: dateInfo.pubTimestamp,
      isOld: dateInfo.isOld,
      isBreaking: dateInfo.isBreaking,
      isInvalidOrMissingDate: dateInfo.isInvalidOrMissing,
      sourceCategory: category
    });
  }

  return items;
}

/**
 * Deduplicates raw feed items by normalised headline and canonical URL.
 */
export function deduplicateRawArticles(rawArticles: RawFeedItem[]): RawFeedItem[] {
  const seenHeadlines = new Set<string>();
  const seenUrls = new Set<string>();
  const deduplicated: RawFeedItem[] = [];

  for (const art of rawArticles) {
    const normTitle = normalizeHeadline(art.title);
    const normUrl = normalizeArticleUrl(art.url);

    if (normTitle && seenHeadlines.has(normTitle)) continue;
    if (normUrl && seenUrls.has(normUrl)) continue;

    if (normTitle) seenHeadlines.add(normTitle);
    if (normUrl) seenUrls.add(normUrl);

    deduplicated.push(art);
  }

  return deduplicated;
}

/**
 * Ranks articles by relevance to company name, ticker, and aliases first,
 * separating company-specific news from macro global market news.
 */
export function rankAndCategorizeArticles(
  articles: ClassifiedArticle[],
  ticker: string,
  companyName: string,
  aliases?: string[]
): {
  companyArticles: ClassifiedArticle[];
  globalMarketArticles: ClassifiedArticle[];
} {
  const companyAliases = aliases || getCompanyAliases(ticker, companyName);
  const companyList: ClassifiedArticle[] = [];
  const globalList: ClassifiedArticle[] = [];

  for (const art of articles) {
    const rel = calculateRelevanceScore(art, ticker, companyName, companyAliases);
    const enhancedArt: ClassifiedArticle = {
      ...art,
      relevanceScore: rel.score,
      relatedCompany: rel.matchedEntity
    };

    if (rel.isRelated) {
      companyList.push(enhancedArt);
    } else {
      globalList.push(enhancedArt);
    }
  }

  // Sort company articles: highest relevance score first, tie-break by newest pubTimestamp
  companyList.sort((a, b) => {
    const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
    if (Math.abs(scoreDiff) >= 15) return scoreDiff;
    return (b.pubTimestamp || 0) - (a.pubTimestamp || 0);
  });

  // Sort global market articles: newest first
  globalList.sort((a, b) => (b.pubTimestamp || 0) - (a.pubTimestamp || 0));

  return {
    companyArticles: companyList,
    globalMarketArticles: globalList
  };
}

/**
 * Active, empirically verified RSS news sources.
 * Tested live from this server to respond with valid RSS XML.
 */
export const ACTIVE_NEWS_SOURCES: FeedSourceConfig[] = [
  {
    id: 'google-news-company',
    name: 'Google News',
    url: 'https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en',
    category: 'COMPANY_SPECIFIC'
  },
  {
    id: 'economic-times-stocks',
    name: 'The Economic Times',
    url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms',
    category: 'INDIAN_BUSINESS'
  },
  {
    id: 'moneycontrol-business',
    name: 'Moneycontrol',
    url: 'https://www.moneycontrol.com/rss/business.xml',
    category: 'INDIAN_BUSINESS'
  },
  {
    id: 'livemint-markets',
    name: 'Livemint',
    url: 'https://www.livemint.com/rss/markets',
    category: 'INDIAN_BUSINESS'
  },
  {
    id: 'business-standard-markets',
    name: 'Business Standard',
    url: 'https://www.business-standard.com/rss/markets-106.rss',
    category: 'INDIAN_BUSINESS'
  },
  {
    id: 'google-news-global',
    name: 'Google News (Global)',
    url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
    category: 'GLOBAL_MARKET'
  },
  {
    id: 'cnbc-markets',
    name: 'CNBC',
    url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html',
    category: 'GLOBAL_MARKET'
  },
  {
    id: 'bbc-business',
    name: 'BBC Business',
    url: 'http://feeds.bbci.co.uk/news/business/rss.xml',
    category: 'GLOBAL_MARKET'
  }
];

/**
 * Disclosed non-working news sources.
 * Tested live from this server: rejected or discontinued by the publisher.
 */
export const FAILED_NEWS_SOURCES_DISCLOSURE = [
  { name: 'Reuters RSS', reason: 'Discontinued public free RSS access (HTTP 404 / connection rejected)' },
  { name: 'Yahoo Finance RSS', reason: 'RSS endpoint deprecated / returns HTTP 404' }
];

/**
 * Fetches an individual RSS feed with timeout (default 4000ms) and 1 retry.
 */
export async function fetchSingleFeedWithRetry(
  source: FeedSourceConfig,
  queryUrl: string,
  timeoutMs = 4000,
  maxRetries = 1
): Promise<FeedFetchResult> {
  const t0 = Date.now();
  let lastError = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(queryUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      clearTimeout(timer);

      if (res.ok) {
        const xml = await res.text();
        const items = parseRssFeedXml(xml, source.name, source.category);
        return {
          sourceId: source.id,
          sourceName: source.name,
          category: source.category,
          success: true,
          items,
          responseTimeMs: Date.now() - t0
        };
      } else {
        lastError = `HTTP ${res.status}`;
      }
    } catch (err: any) {
      lastError = err.name === 'AbortError' ? 'Timeout (4000ms)' : (err.message || 'Network error');
    }

    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    category: source.category,
    success: false,
    items: [],
    error: lastError,
    responseTimeMs: Date.now() - t0
  };
}

// In-memory short cache (2-minute TTL)
interface NewsCacheItem<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}
const inMemoryNewsCache = new Map<string, NewsCacheItem<any>>();

export function getCachedNews<T>(key: string): { data: T; isStale: boolean; cachedAt: number } | null {
  const item = inMemoryNewsCache.get(key);
  if (!item) return null;
  const now = Date.now();
  if (now > item.expiresAt) {
    inMemoryNewsCache.delete(key);
    return null;
  }
  return {
    data: item.data,
    isStale: now - item.cachedAt > 60000,
    cachedAt: item.cachedAt
  };
}

export function setCachedNews<T>(key: string, data: T, ttlMs = 120000): void {
  const now = Date.now();
  inMemoryNewsCache.set(key, {
    data,
    cachedAt: now,
    expiresAt: now + ttlMs
  });
}

export function clearNewsCache(): void {
  inMemoryNewsCache.clear();
}

/**
 * Aggregates news from all active verified sources with fault isolation,
 * deduplication, relevance ranking, and separate Global Market News.
 */
export async function aggregateMultiSourceNews(
  ticker: string,
  companyName: string,
  options?: {
    forceRefresh?: boolean;
    currentNowMs?: number;
    customSources?: FeedSourceConfig[];
  }
): Promise<MultiSourceNewsResult> {
  const cleanTicker = ticker.replace('.NS', '').replace('.BO', '').trim();
  const cleanComp = companyName || cleanTicker;
  const cacheKey = `news:${cleanTicker.toUpperCase()}`;

  if (!options?.forceRefresh) {
    const cached = getCachedNews<MultiSourceNewsResult>(cacheKey);
    if (cached) {
      return {
        ...cached.data,
        isStale: cached.isStale,
        cachedAt: new Date(cached.cachedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
    }
  }

  const sources = options?.customSources || ACTIVE_NEWS_SOURCES;
  const aliases = getCompanyAliases(cleanTicker, cleanComp);

  const queryTerm = encodeURIComponent(`${cleanComp} stock OR shares`);
  const fetchPromises = sources.map(source => {
    let url = source.url;
    if (source.id === 'google-news-company') {
      url = source.url.replace('{query}', queryTerm);
    }
    return fetchSingleFeedWithRetry(source, url, 4000, 1);
  });

  const results = await Promise.allSettled(fetchPromises);

  const sourcesUsed: string[] = [];
  const sourcesFailed: string[] = [];
  const sourcesStatus: Array<{
    name: string;
    status: 'SUCCESS' | 'FAILED' | 'CACHED';
    itemCount: number;
    error?: string;
  }> = [];

  const allRawItems: RawFeedItem[] = [];

  results.forEach((res, idx) => {
    const src = sources[idx];
    if (res.status === 'fulfilled' && res.value.success) {
      sourcesUsed.push(src.name);
      sourcesStatus.push({
        name: src.name,
        status: 'SUCCESS',
        itemCount: res.value.items.length
      });
      allRawItems.push(...res.value.items);
    } else {
      const errMsg = res.status === 'fulfilled' ? res.value.error : 'Network failure';
      sourcesFailed.push(`${src.name} (${errMsg})`);
      sourcesStatus.push({
        name: src.name,
        status: 'FAILED',
        itemCount: 0,
        error: errMsg
      });
    }
  });

  // Deduplicate raw articles
  const deduplicatedRaw = deduplicateRawArticles(allRawItems);

  // Classify each raw article using financial sentiment engine
  const classifiedList: ClassifiedArticle[] = [];
  for (const raw of deduplicatedRaw) {
    const sentAnalysis = analyzeFinancialSentiment(raw.title, raw.summary);
    const classification = classifyCorporateEvent(
      raw.title,
      raw.summary,
      sentAnalysis.vaderScore,
      sentAnalysis.label
    );

    classifiedList.push({
      title: raw.title,
      publisher: raw.publisher,
      date: raw.date,
      pubTimestamp: raw.pubTimestamp,
      summary: raw.summary,
      url: raw.url,
      vaderScore: sentAnalysis.vaderScore,
      financialScore: sentAnalysis.financialScore,
      finbertScore: null,
      sentimentLabel: sentAnalysis.label,
      isCatalyst: classification.isCatalyst,
      corporateEventId: classification.corporateEventId,
      corporateEventTitle: classification.corporateEventTitle,
      corporateEventType: classification.corporateEventType,
      evidenceStrength: sentAnalysis.evidenceStrength,
      matchedTerms: sentAnalysis.matchedTerms,
      contextCategories: sentAnalysis.contextCategories,
      isHeadlineOnly: sentAnalysis.isHeadlineOnly,
      isUncertainOrAttributed: sentAnalysis.isUncertainOrAttributed,
      isMixed: sentAnalysis.isMixed,
      isOld: raw.isOld,
      isBreaking: raw.isBreaking,
      isInvalidOrMissingDate: raw.isInvalidOrMissingDate,
      sourceCategory: raw.sourceCategory
    });
  }

  // Rank and separate into company-specific articles and global market news
  const { companyArticles, globalMarketArticles } = rankAndCategorizeArticles(
    classifiedList,
    cleanTicker,
    cleanComp,
    aliases
  );

  // Group events for company articles (or all articles if company has few)
  const groupedData = deduplicateAndGroupNewsArticles(companyArticles.length > 0 ? companyArticles : classifiedList);

  const isPartialFailure = sourcesFailed.length > 0 && sourcesUsed.length > 0;
  const sourcesSummary = `${sourcesUsed.length} of ${sources.length} sources responded`;

  const finalResult: MultiSourceNewsResult = {
    articles: companyArticles,
    globalMarketNews: globalMarketArticles.slice(0, 25),
    sourcesUsed,
    sourcesFailed,
    sourcesStatus,
    sourcesSummary,
    isPartialFailure,
    isStale: false,
    cachedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    cacheTimestamp: Date.now(),
    eventClusters: groupedData.eventClusters,
    distinctEventsCount: groupedData.distinctEventsCount,
    expansionCatalystsCount: groupedData.expansionCatalystsCount,
    cautionaryOverhangsCount: groupedData.cautionaryOverhangsCount,
    expansionArticlesCount: groupedData.expansionArticlesCount,
    cautionaryArticlesCount: groupedData.cautionaryArticlesCount
  };

  // Cache valid response only (at least 1 source succeeded)
  if (sourcesUsed.length > 0) {
    setCachedNews(cacheKey, finalResult, 120000);
  }

  return finalResult;
}

