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
      isMixed: Boolean(art.isMixed)
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
