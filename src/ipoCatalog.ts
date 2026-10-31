import { IPODetails, IPOStatus } from './types';

/**
 * Notice & Limitation Disclosure:
 * This catalog provides a curated selection of tracked Indian Mainboard and SME IPOs
 * with verified filings and news reports, not an exhaustive registry of all Indian public offerings.
 */
export const IPO_CATALOG_DISCLOSURE =
  'Limited Curated List: This catalog provides a curated selection of tracked Indian Mainboard and SME IPOs with verified filings and news reports, not an exhaustive registry of all Indian public offerings.';

/**
 * Normalizes common Indian and international date formats into ISO YYYY-MM-DD.
 */
export function normalizeDateToIso(dateStr?: string): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // Already ISO YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD Mon YYYY (e.g. 24 Oct 2026, 24-Oct-2026, 06 Nov 2024)
  const dmyMatch = clean.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const monthStr = dmyMatch[2].slice(0, 3).toLowerCase();
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = months[monthStr];
    if (!month) return null;
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Fallback to Date.parse
  const parsed = Date.parse(clean);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return null;
}

/**
 * Checks if a given date string falls on a Saturday or Sunday.
 */
export function isWeekendDate(dateStr?: string): boolean {
  if (!dateStr) return false;
  const iso = normalizeDateToIso(dateStr);
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00Z');
  const day = d.getUTCDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export function formatWithWeekendCheck(dateStr?: string): string {
  if (!dateStr) return 'Unverified';
  return isWeekendDate(dateStr) ? `${dateStr} (check date)` : dateStr;
}

/**
 * Dynamically computes an IPO's status against today's date in IST.
 *
 * Rules:
 * - Postponed / Withdrawn takes immediate precedence
 * - Unverified if dates are missing/unparseable (e.g. Draft DRHP filed)
 * - 'Upcoming' if today < openDate
 * - 'Open' if today >= openDate && today <= closeDate
 * - 'Closed (allotment pending)' if today > closeDate && (today < allotmentDate || no allotment date)
 * - 'Allotment done' if today >= allotmentDate && (today < listingDate || !isVerifiedListed)
 * - 'Listed' ONLY if verified listed on exchange (do not mark listed just because expected listing date has passed)
 */
export function calculateIPOStatus(params: {
  openDate?: string;
  closeDate?: string;
  allotmentDate?: string;
  listingDate?: string;
  isPostponed?: boolean;
  isWithdrawn?: boolean;
  isVerifiedListed?: boolean;
  todayIst?: string; // Format: YYYY-MM-DD
}): IPOStatus {
  if (params.isPostponed) return 'Postponed';
  if (params.isWithdrawn) return 'Withdrawn';

  const today = params.todayIst || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const openIso = normalizeDateToIso(params.openDate);
  const closeIso = normalizeDateToIso(params.closeDate);
  const allotmentIso = normalizeDateToIso(params.allotmentDate);

  if (!openIso) {
    return 'Draft / DRHP';
  }

  // 1. Before Open Date
  if (today < openIso) {
    return 'Upcoming';
  }

  // 2. Open Period (inclusive of openDate and closeDate)
  if (closeIso) {
    if (today >= openIso && today <= closeIso) {
      return 'Open';
    }
  } else if (today === openIso) {
    return 'Open';
  }

  // 3. After Close Date
  if (closeIso && today > closeIso) {
    // Check allotment
    if (allotmentIso) {
      if (today < allotmentIso) {
        return 'Closed (allotment pending)';
      }
      // today >= allotmentIso
      // Check listing: Do not mark listed just because the date has passed!
      if (params.isVerifiedListed) {
        return 'Listed';
      }
      return 'Allotment done';
    }

    // No allotment date provided
    if (params.isVerifiedListed) {
      return 'Listed';
    }
    return 'Closed (allotment pending)';
  }

  return 'Unverified';
}

/**
 * Unified, single easy-to-edit catalog of Indian IPOs.
 * Each entry includes: name, market, exchange, dates, statusSource, sourceUrl, lastVerified.
 */
export const UPCOMING_IPOS_CATALOG: IPODetails[] = [
  // 1. Recent Issue (Detected from institutional financial press / Livemint wire)
  {
    id: 'jio-platforms',
    name: 'Jio Platforms Limited',
    companyName: 'Jio Platforms Limited',
    symbol: 'JIOPLAT',
    market: 'Mainboard',
    ipoType: 'Mainboard',
    exchange: 'NSE / BSE',
    dates: {
      openDate: '21 Oct 2026',
      closeDate: '23 Oct 2026',
      allotmentDate: '26 Oct 2026',
      refundsDate: '27 Oct 2026',
      listingDate: '28 Oct 2026'
    },
    openDate: '21 Oct 2026',
    closeDate: '23 Oct 2026',
    allotmentDate: '26 Oct 2026',
    refundsDate: '27 Oct 2026',
    listingDate: '28 Oct 2026',
    statusSource: 'Unverified (news/broker sites) - confirm on NSE/BSE',
    sourceUrl: 'https://www.livemint.com/market/ipo/reliance-jio-platforms-ipo-gmp-allotment-date-listing-date-time-overall-subscription-status-qib-nii-retail-ril-11792812938496.html',
    articleLinks: [
      'https://www.livemint.com/market/ipo/reliance-jio-platforms-ipo-gmp-allotment-date-listing-date-time-overall-subscription-status-qib-nii-retail-ril-11792812938496.html',
      'https://www.livemint.com/market/ipo/reliance-jio-platforms-ipo-gmp-listing-date-and-time-share-price-prediction-for-nse-bse-debut-details-11792848439962.html'
    ],
    lastVerified: '2026-10-25',
    isHistorical: false,
    isVerifiedListed: false,
    status: 'Allotment done', // Calculated dynamically at runtime
    sector: 'Telecommunications & Digital Services',
    industry: 'Telecom 5G Infrastructure & Cloud Services',
    priceBand: '₹1,065 – ₹1,119',
    minPrice: 1065,
    maxPrice: 1119,
    lotSize: 12,
    minInvestment: 13428,
    issueSizeCr: 30213, // Stated in Livemint article: ₹30,213-crore issue
    issueSizeSource: 'Livemint (Unverified - confirm on NSE/BSE)',
    freshIssueCr: 0,
    ofsCr: 0,
    retailQuotaPct: 35,
    subscription: {
      qib: 70.55, // Stated in Livemint: QIB subscribed 70.55 times
      nii: 14.0, // Stated in Livemint: NII received bids 14 times
      retail: 0,
      total: 22.19, // Stated in Livemint: overall subscribed 22.19 times
      asOf: 'Day 3 (Final subscription reported in press)',
      isFinal: true,
      source: 'Livemint',
      sourceUrl: 'https://www.livemint.com/market/ipo/reliance-jio-platforms-ipo-gmp-allotment-date-listing-date-time-overall-subscription-status-qib-nii-retail-ril-11792812938496.html'
    },
    gmpAmount: undefined, // GMP is unofficial / unverified: shown as N/A
    gmpPct: undefined,
    gmpUpdated: undefined,
    website: 'https://www.jio.com',
    businessSummary: 'Jio Platforms is the telecommunications and digital services business of Reliance Industries, operating 5G mobile networks and broadband services across India.',
    revenueYoYGrowthPct: 0,
    annualRevenueCr: 0, // Unverified: Not in linked news source
    netProfitLossCr: 0, // Unverified: Not in linked news source
    profitMarginPct: 0, // Unverified: Not in linked news source
    debtToEquity: 0, // Unverified: Not in linked news source
    financialsSource: 'Unverified (Not in linked news articles)',
    postIssuePe: 0,
    peerAveragePe: 0,
    promoterHoldingPostPct: 0,
    strengths: [
      'Issue subscribed 22.19 times overall, led by 70.55x QIB demand and 14x NII bids as of Day 3 [Source: Livemint]',
      'Total issue size of ₹30,213 crore scheduled for allotment on October 26, 2026 [Source: Livemint]',
      'Nationwide 5G mobile and digital connectivity infrastructure [Source: Livemint]'
    ],
    redFlags: [
      'Annual sales, net profit, margin, debt/equity, and user count are unverified (not disclosed in linked press reports)',
      'Price band (₹1,065–₹1,119) and retail lot size (12 shares / ₹13,428 min) reported by news/broker sites await official exchange circular'
    ],
    verdict: 'Not rated (educational data only)',
    verdictRationale: 'Unverified (news/broker sites) - confirm on NSE/BSE: Bidding window closed on October 23, 2026 with allotment on October 26, 2026.'
  },

  // 2. Verified Historical Mainboard & SME Listings (2024)
  {
    id: 'swiggy',
    name: 'Swiggy Limited',
    companyName: 'Swiggy Limited',
    symbol: 'SWIGGY',
    market: 'Mainboard',
    ipoType: 'Mainboard',
    exchange: 'NSE / BSE',
    dates: {
      openDate: '06 Nov 2024',
      closeDate: '08 Nov 2024',
      allotmentDate: '11 Nov 2024',
      listingDate: '13 Nov 2024'
    },
    openDate: '06 Nov 2024',
    closeDate: '08 Nov 2024',
    allotmentDate: '11 Nov 2024',
    listingDate: '13 Nov 2024',
    statusSource: 'NSE / BSE Official Filing',
    sourceUrl: 'https://www.nseindia.com',
    lastVerified: '2026-10-25',
    isHistorical: true,
    isVerifiedListed: true,
    status: 'Listed',
    sector: 'Consumer Discretionary',
    industry: 'Hyperlocal Food Delivery & Quick Commerce',
    priceBand: '₹371 – ₹390',
    minPrice: 371,
    maxPrice: 390,
    issuePrice: 390,
    listingPrice: 412,
    issueSizeCr: 11327,
    freshIssueCr: 4499,
    ofsCr: 6828,
    lotSize: 38,
    minInvestment: 14820,
    retailQuotaPct: 10,
    website: 'https://www.swiggy.com',
    businessSummary: 'Swiggy is one of India\'s leading consumer tech platforms, pioneering online food delivery and quick commerce via Instamart.',
    revenueYoYGrowthPct: 36.1,
    annualRevenueCr: 11247,
    netProfitLossCr: -2350,
    profitMarginPct: -20.89,
    debtToEquity: 18.4,
    postIssuePe: 0,
    peerAveragePe: 85.4,
    promoterHoldingPostPct: 0.0,
    strengths: [
      'Rapid growth in Instamart quick commerce dark stores expanding gross order value',
      'High brand recall and sticky customer engagement across top Indian metro areas'
    ],
    redFlags: [
      'Historical net losses (-₹2,350 Cr) with negative operating cash flows at filing',
      'Intense competition against Blinkit and Zepto in rapid grocery delivery'
    ],
    verdict: 'HISTORICAL FILING',
    verdictRationale: 'Statutory historical disclosure: Swiggy listed successfully on NSE/BSE on 13 Nov 2024 with issue price ₹390.'
  },
  {
    id: 'hyundai',
    name: 'Hyundai Motor India Limited',
    companyName: 'Hyundai Motor India Limited',
    symbol: 'HYUNDAI',
    market: 'Mainboard',
    ipoType: 'Mainboard',
    exchange: 'NSE / BSE',
    dates: {
      openDate: '15 Oct 2024',
      closeDate: '17 Oct 2024',
      allotmentDate: '18 Oct 2024',
      listingDate: '22 Oct 2024'
    },
    openDate: '15 Oct 2024',
    closeDate: '17 Oct 2024',
    allotmentDate: '18 Oct 2024',
    listingDate: '22 Oct 2024',
    statusSource: 'NSE / BSE Official Filing',
    sourceUrl: 'https://www.nseindia.com',
    lastVerified: '2026-10-25',
    isHistorical: true,
    isVerifiedListed: true,
    status: 'Listed',
    sector: 'Consumer Cyclical',
    industry: 'Automobile OEM & Electric Vehicles',
    priceBand: '₹1,865 – ₹1,960',
    minPrice: 1865,
    maxPrice: 1960,
    issuePrice: 1960,
    listingPrice: 1934,
    issueSizeCr: 27870,
    freshIssueCr: 0,
    ofsCr: 27870,
    lotSize: 7,
    minInvestment: 13720,
    retailQuotaPct: 35,
    website: 'https://www.hyundai.com/in',
    businessSummary: 'Hyundai Motor India is the second-largest passenger car OEM in India with ~15% market share, leading compact and mid-size SUV segments.',
    revenueYoYGrowthPct: 15.8,
    annualRevenueCr: 69829,
    netProfitLossCr: 6060,
    profitMarginPct: 8.68,
    debtToEquity: 0.1,
    postIssuePe: 26.3,
    peerAveragePe: 28.5,
    promoterHoldingPostPct: 82.5,
    strengths: [
      'Consistent profitability with ₹6,060 Cr PAT and pristine zero net debt balance sheet',
      'High brand trust with market-leading SUV product portfolio (Creta, Venue)'
    ],
    redFlags: [
      '100% Offer for Sale (OFS) with zero primary capital infusion into Indian operational entity'
    ],
    verdict: 'HISTORICAL FILING',
    verdictRationale: 'Statutory historical disclosure: Hyundai Motor India listed on NSE/BSE on 22 Oct 2024.'
  },
  {
    id: 'waaree',
    name: 'Waaree Energies Limited',
    companyName: 'Waaree Energies Limited',
    symbol: 'WAAREEENER',
    market: 'Mainboard',
    ipoType: 'Mainboard',
    exchange: 'NSE / BSE',
    dates: {
      openDate: '21 Oct 2024',
      closeDate: '23 Oct 2024',
      allotmentDate: '24 Oct 2024',
      listingDate: '28 Oct 2024'
    },
    openDate: '21 Oct 2024',
    closeDate: '23 Oct 2024',
    allotmentDate: '24 Oct 2024',
    listingDate: '28 Oct 2024',
    statusSource: 'NSE / BSE Official Filing',
    sourceUrl: 'https://www.nseindia.com',
    lastVerified: '2026-10-25',
    isHistorical: true,
    isVerifiedListed: true,
    status: 'Listed',
    sector: 'Technology & Renewable Energy',
    industry: 'Solar PV Modules & Clean Power EPC',
    priceBand: '₹1,427 – ₹1,503',
    minPrice: 1427,
    maxPrice: 1503,
    issuePrice: 1503,
    listingPrice: 2550,
    issueSizeCr: 4321,
    freshIssueCr: 3600,
    ofsCr: 721,
    lotSize: 9,
    minInvestment: 13527,
    retailQuotaPct: 35,
    website: 'https://www.waaree.com',
    businessSummary: 'Waaree Energies is India\'s largest solar module manufacturer with 12 GW installed module capacity.',
    revenueYoYGrowthPct: 68.8,
    annualRevenueCr: 11633,
    netProfitLossCr: 1274,
    profitMarginPct: 10.95,
    debtToEquity: 18.2,
    postIssuePe: 33.8,
    peerAveragePe: 45.2,
    promoterHoldingPostPct: 64.3,
    strengths: [
      '12 GW installed module manufacturing capacity serving domestic and international export hubs',
      'Strong revenue expansion (+68.8%) and healthy EBITDA margin generation'
    ],
    redFlags: [
      'Global solar supply chain dependencies on raw polysilicon imports'
    ],
    verdict: 'HISTORICAL FILING',
    verdictRationale: 'Statutory historical disclosure: Waaree Energies listed on NSE/BSE on 28 Oct 2024 with a 69.7% listing gain.'
  },
  {
    id: 'afcons',
    name: 'Afcons Infrastructure Limited',
    companyName: 'Afcons Infrastructure Limited',
    symbol: 'AFCONS',
    market: 'Mainboard',
    ipoType: 'Mainboard',
    exchange: 'NSE / BSE',
    dates: {
      openDate: '25 Oct 2024',
      closeDate: '29 Oct 2024',
      allotmentDate: '30 Oct 2024',
      listingDate: '04 Nov 2024'
    },
    openDate: '25 Oct 2024',
    closeDate: '29 Oct 2024',
    allotmentDate: '30 Oct 2024',
    listingDate: '04 Nov 2024',
    statusSource: 'NSE / BSE Official Filing',
    sourceUrl: 'https://www.nseindia.com',
    lastVerified: '2026-10-25',
    isHistorical: true,
    isVerifiedListed: true,
    status: 'Listed',
    sector: 'Industrials',
    industry: 'Heavy Civil Infrastructure & Marine Engineering',
    priceBand: '₹440 – ₹463',
    minPrice: 440,
    maxPrice: 463,
    issuePrice: 463,
    listingPrice: 430,
    issueSizeCr: 5430,
    freshIssueCr: 1250,
    ofsCr: 4180,
    lotSize: 32,
    minInvestment: 14816,
    retailQuotaPct: 35,
    website: 'https://www.afcons.com',
    businessSummary: 'Afcons Infrastructure is the flagship EPC infrastructure engineering arm of the Shapoorji Pallonji Group.',
    revenueYoYGrowthPct: 5.9,
    annualRevenueCr: 13647,
    netProfitLossCr: 449,
    profitMarginPct: 3.29,
    debtToEquity: 84.5,
    postIssuePe: 37.9,
    peerAveragePe: 31.2,
    promoterHoldingPostPct: 68.9,
    strengths: [
      'Tier-1 engineering capability executing marquee marine, tunnel, and highway megaprojects',
      'Robust consolidated order book providing revenue visibility'
    ],
    redFlags: [
      'High debt-to-equity ratio (84.5%) and working capital intensive contract cycles'
    ],
    verdict: 'HISTORICAL FILING',
    verdictRationale: 'Statutory historical disclosure: Afcons Infrastructure listed on NSE/BSE on 04 Nov 2024.'
  },
  {
    id: 'premier-energies',
    name: 'Premier Energies Limited',
    companyName: 'Premier Energies Limited',
    symbol: 'PREMIERENE',
    market: 'Mainboard',
    ipoType: 'Mainboard',
    exchange: 'NSE / BSE',
    dates: {
      openDate: '27 Aug 2024',
      closeDate: '29 Aug 2024',
      allotmentDate: '30 Aug 2024',
      listingDate: '03 Sep 2024'
    },
    openDate: '27 Aug 2024',
    closeDate: '29 Aug 2024',
    allotmentDate: '30 Aug 2024',
    listingDate: '03 Sep 2024',
    statusSource: 'NSE / BSE Official Filing',
    sourceUrl: 'https://www.nseindia.com',
    lastVerified: '2026-10-25',
    isHistorical: true,
    isVerifiedListed: true,
    status: 'Listed',
    sector: 'Technology & Renewable Energy',
    industry: 'Solar Cells, Modules & Clean Power Engineering',
    priceBand: '₹427 – ₹450',
    minPrice: 427,
    maxPrice: 450,
    issuePrice: 450,
    listingPrice: 991,
    issueSizeCr: 2830,
    freshIssueCr: 1291,
    ofsCr: 1539,
    lotSize: 33,
    minInvestment: 14850,
    retailQuotaPct: 35,
    website: 'https://premierenergies.com',
    businessSummary: 'Premier Energies is India\'s second-largest integrated solar cell and module manufacturer.',
    revenueYoYGrowthPct: 120.5,
    annualRevenueCr: 3171,
    netProfitLossCr: 231,
    profitMarginPct: 7.28,
    debtToEquity: 48.2,
    postIssuePe: 42.1,
    peerAveragePe: 45.0,
    promoterHoldingPostPct: 72.3,
    strengths: [
      'Vertically integrated solar cell and module manufacturing facilities in Telangana',
      'Over 120% YoY top-line revenue expansion driven by rooftop solar initiatives'
    ],
    redFlags: [
      'Intense global component price competition and policy tariff sensitivities'
    ],
    verdict: 'HISTORICAL FILING',
    verdictRationale: 'Statutory historical disclosure: Premier Energies listed on NSE/BSE on 03 Sep 2024 with a 120.2% listing gain.'
  },
  {
    id: 'bajaj-housing',
    name: 'Bajaj Housing Finance Limited',
    companyName: 'Bajaj Housing Finance Limited',
    symbol: 'BAJAJHFL',
    market: 'Mainboard',
    ipoType: 'Mainboard',
    exchange: 'NSE / BSE',
    dates: {
      openDate: '09 Sep 2024',
      closeDate: '11 Sep 2024',
      allotmentDate: '12 Sep 2024',
      listingDate: '16 Sep 2024'
    },
    openDate: '09 Sep 2024',
    closeDate: '11 Sep 2024',
    allotmentDate: '12 Sep 2024',
    listingDate: '16 Sep 2024',
    statusSource: 'NSE / BSE Official Filing',
    sourceUrl: 'https://www.nseindia.com',
    lastVerified: '2026-10-25',
    isHistorical: true,
    isVerifiedListed: true,
    status: 'Listed',
    sector: 'Financial Services',
    industry: 'Housing Finance & Mortgage Lending',
    priceBand: '₹66 – ₹70',
    minPrice: 66,
    maxPrice: 70,
    issuePrice: 70,
    listingPrice: 150,
    issueSizeCr: 6560,
    freshIssueCr: 3560,
    ofsCr: 3000,
    lotSize: 214,
    minInvestment: 14980,
    retailQuotaPct: 35,
    website: 'https://www.bajajhousingfinance.in',
    businessSummary: 'Bajaj Housing Finance is India\'s second-largest non-deposit housing finance company (HFC).',
    revenueYoYGrowthPct: 34.2,
    annualRevenueCr: 7617,
    netProfitLossCr: 1731,
    profitMarginPct: 22.73,
    debtToEquity: 580.0,
    postIssuePe: 33.5,
    peerAveragePe: 22.1,
    promoterHoldingPostPct: 88.75,
    strengths: [
      'Impeccable credit underwriting with Gross NPA under 0.28% and pristine asset quality',
      'Strong parentage benefits from Bajaj Finserv and Bajaj Finance ecosystem'
    ],
    redFlags: [
      'High valuation multiple compared to housing finance peers at listing'
    ],
    verdict: 'HISTORICAL FILING',
    verdictRationale: 'Statutory historical disclosure: Bajaj Housing Finance listed on NSE/BSE on 16 Sep 2024 with a 114.3% listing gain.'
  },
  {
    id: 'ola-electric',
    name: 'Ola Electric Mobility Limited',
    companyName: 'Ola Electric Mobility Limited',
    symbol: 'OLAELEC',
    market: 'Mainboard',
    ipoType: 'Mainboard',
    exchange: 'NSE / BSE',
    dates: {
      openDate: '02 Aug 2024',
      closeDate: '06 Aug 2024',
      allotmentDate: '07 Aug 2024',
      listingDate: '09 Aug 2024'
    },
    openDate: '02 Aug 2024',
    closeDate: '06 Aug 2024',
    allotmentDate: '07 Aug 2024',
    listingDate: '09 Aug 2024',
    statusSource: 'NSE / BSE Official Filing',
    sourceUrl: 'https://www.nseindia.com',
    lastVerified: '2026-10-25',
    isHistorical: true,
    isVerifiedListed: true,
    status: 'Listed',
    sector: 'Consumer Discretionary',
    industry: 'Electric Vehicles (EV) & Cell Manufacturing',
    priceBand: '₹72 – ₹76',
    minPrice: 72,
    maxPrice: 76,
    issuePrice: 76,
    listingPrice: 76,
    issueSizeCr: 6145,
    freshIssueCr: 5500,
    ofsCr: 645,
    lotSize: 195,
    minInvestment: 14820,
    retailQuotaPct: 10,
    website: 'https://www.olaelectric.com',
    businessSummary: 'Ola Electric is India\'s pure-play EV market leader manufacturing electric scooters and constructing the Gigafactory in Tamil Nadu.',
    revenueYoYGrowthPct: 90.4,
    annualRevenueCr: 5440,
    netProfitLossCr: -1584,
    profitMarginPct: -29.12,
    debtToEquity: 110.2,
    postIssuePe: 0,
    peerAveragePe: 35.0,
    promoterHoldingPostPct: 36.9,
    strengths: [
      'Number one market share (>35%) in Indian electric two-wheeler registrations',
      'Vertical cell manufacturing initiative (Ola Futurefactory) targeting battery cost parity'
    ],
    redFlags: [
      'Persistent net losses (-₹1,584 Cr) and operational service complaints'
    ],
    verdict: 'HISTORICAL FILING',
    verdictRationale: 'Statutory historical disclosure: Ola Electric Mobility listed on NSE/BSE on 09 Aug 2024 at flat parity ₹76.'
  },
  {
    id: 'paramount-dye-tec',
    name: 'Paramount Dye Tec Limited',
    companyName: 'Paramount Dye Tec Limited',
    symbol: 'PARAMOUNT',
    market: 'SME',
    ipoType: 'SME',
    exchange: 'NSE SME',
    dates: {
      openDate: '03 Oct 2024',
      closeDate: '07 Oct 2024',
      allotmentDate: '08 Oct 2024',
      listingDate: '10 Oct 2024'
    },
    openDate: '03 Oct 2024',
    closeDate: '07 Oct 2024',
    allotmentDate: '08 Oct 2024',
    listingDate: '10 Oct 2024',
    statusSource: 'NSE SME Official Filing',
    sourceUrl: 'https://www.nseindia.com',
    lastVerified: '2026-10-25',
    isHistorical: true,
    isVerifiedListed: true,
    status: 'Listed',
    sector: 'Industrials',
    industry: 'Textile Yarn Dyeing & Recycled Fibers',
    priceBand: '₹111 – ₹117',
    minPrice: 111,
    maxPrice: 117,
    issuePrice: 117,
    listingPrice: 118,
    issueSizeCr: 28.43,
    freshIssueCr: 28.43,
    ofsCr: 0,
    lotSize: 1200,
    minInvestment: 140400,
    retailQuotaPct: 35,
    website: 'https://www.paramountdyetec.com',
    businessSummary: 'Paramount Dye Tec is an SME specialized yarn dyeing enterprise processing fibers for commercial garment manufacturers.',
    revenueYoYGrowthPct: 18.2,
    annualRevenueCr: 42.5,
    netProfitLossCr: 4.8,
    profitMarginPct: 11.29,
    debtToEquity: 42.1,
    postIssuePe: 14.8,
    peerAveragePe: 21.0,
    promoterHoldingPostPct: 69.5,
    strengths: [
      '100% fresh issue funding capacity expansion',
      'Healthy EBITDA margins'
    ],
    redFlags: [
      'SME segment with larger lot size and lower secondary liquidity'
    ],
    verdict: 'HISTORICAL FILING',
    verdictRationale: 'Statutory historical disclosure: Paramount Dye Tec listed on NSE SME on 10 Oct 2024.'
  },

  // 3. Draft DRHP Filed / Proposed Pipeline
  {
    id: 'tonbo',
    name: 'Tonbo Imaging India Limited',
    companyName: 'Tonbo Imaging India Limited',
    symbol: 'TONBO',
    market: 'Mainboard',
    ipoType: 'Mainboard',
    exchange: 'NSE / BSE',
    dates: {
      openDate: 'Draft DRHP Filed',
      closeDate: 'Pending SEBI Approval',
      listingDate: 'T+3 from Allotment'
    },
    openDate: 'Draft DRHP Filed',
    closeDate: 'Pending SEBI Approval',
    listingDate: 'T+3 from Allotment',
    statusSource: 'SEBI Draft Red Herring Prospectus (DRHP)',
    sourceUrl: 'https://www.sebi.gov.in',
    lastVerified: '2026-10-25',
    isHistorical: false,
    isVerifiedListed: false,
    status: 'Draft / DRHP', // Calculated dynamically as Draft / DRHP due to pending open date
    sector: 'Industrials & Defence Technology',
    industry: 'Electro-Optics, Autonomous Surveillance & Defence Systems',
    priceBand: '', // Left blank / unverified until official RHP price band
    minPrice: 0,
    maxPrice: 0,
    issueSizeCr: 1000,
    freshIssueCr: 750,
    ofsCr: 250,
    lotSize: 0, // Unverified until RHP
    minInvestment: 0,
    retailQuotaPct: 35,
    website: 'https://tonboimaging.com',
    businessSummary: 'Tonbo Imaging designs and manufactures advanced electro-optics, night vision, and autonomous surveillance systems for global defence and aerospace applications.',
    revenueYoYGrowthPct: 42.0,
    annualRevenueCr: 410,
    netProfitLossCr: 58,
    profitMarginPct: 14.15,
    debtToEquity: 12.0,
    postIssuePe: 0,
    peerAveragePe: 65.0,
    promoterHoldingPostPct: 45.0,
    strengths: [
      'Proprietary thermal imaging and AI sensor fusion intellectual property',
      'Export footprint across 25+ countries and key contracts with Indian Armed Forces'
    ],
    redFlags: [
      'Customer concentration in government defense procurement cycles',
      'Price band, retail bidding lot, and issue schedule pending final SEBI observation letter'
    ],
    verdict: 'REFERENCE DISCLOSURE',
    verdictRationale: 'Draft Red Herring Prospectus (DRHP) filed with SEBI for proposed initial public offering.'
  }
];

/**
 * Returns all catalog IPOs with their status dynamically calculated against today's date in IST.
 */
export function getEnrichedIPOs(todayIst?: string): IPODetails[] {
  const istToday = todayIst || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  return UPCOMING_IPOS_CATALOG.map(ipo => {
    const computedStatus = calculateIPOStatus({
      openDate: ipo.dates?.openDate || ipo.openDate,
      closeDate: ipo.dates?.closeDate || ipo.closeDate,
      allotmentDate: ipo.dates?.allotmentDate || ipo.allotmentDate,
      listingDate: ipo.dates?.listingDate || ipo.listingDate,
      isVerifiedListed: ipo.isVerifiedListed,
      todayIst: istToday
    });

    return {
      ...ipo,
      status: computedStatus,
      // Ensure market and name backward compatibility
      market: ipo.market || ipo.ipoType || 'Mainboard',
      name: ipo.name || ipo.companyName
    };
  });
}

export function getIPOById(id: string, todayIst?: string): IPODetails | undefined {
  const list = getEnrichedIPOs(todayIst);
  return list.find(ipo => ipo.id === id || ipo.symbol.toUpperCase() === id.toUpperCase());
}

export function searchIPOs(query: string, todayIst?: string): IPODetails[] {
  const list = getEnrichedIPOs(todayIst);
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(
    ipo =>
      ipo.companyName.toLowerCase().includes(q) ||
      ipo.symbol.toLowerCase().includes(q) ||
      ipo.sector.toLowerCase().includes(q) ||
      ipo.industry.toLowerCase().includes(q)
  );
}
