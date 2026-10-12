export interface StockCatalogEntry {
  ticker: string;
  name: string;
  exchange: 'NSE' | 'NASDAQ' | 'NYSE' | 'AMEX';
  country: 'India' | 'United States';
  sector: string;
  industry: string;
}

export const UNIVERSE_CATALOG: StockCatalogEntry[] = [
  // Top NSE India
  { ticker: 'RELIANCE.NS', name: 'Reliance Industries Ltd', exchange: 'NSE', country: 'India', sector: 'Energy', industry: 'Oil & Gas Refining' },
  { ticker: 'TCS.NS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE', country: 'India', sector: 'Technology', industry: 'IT Services' },
  { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', exchange: 'NSE', country: 'India', sector: 'Financial Services', industry: 'Private Sector Bank' },
  { ticker: 'INFY.NS', name: 'Infosys Ltd', exchange: 'NSE', country: 'India', sector: 'Technology', industry: 'IT Services' },
  { ticker: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', exchange: 'NSE', country: 'India', sector: 'Financial Services', industry: 'Private Sector Bank' },
  { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Defensive', industry: 'Household & Personal' },
  { ticker: 'ITC.NS', name: 'ITC Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Defensive', industry: 'Tobacco & FMCG' },
  { ticker: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE', country: 'India', sector: 'Financial Services', industry: 'Public Sector Bank' },
  { ticker: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd', exchange: 'NSE', country: 'India', sector: 'Communication Services', industry: 'Telecom Services' },
  { ticker: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE', country: 'India', sector: 'Financial Services', industry: 'Private Sector Bank' },
  { ticker: 'LT.NS', name: 'Larsen & Toubro Ltd', exchange: 'NSE', country: 'India', sector: 'Industrials', industry: 'Engineering & Construction' },
  { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd', exchange: 'NSE', country: 'India', sector: 'Financial Services', industry: 'Asset Financing NBFC' },
  { ticker: 'HCLTECH.NS', name: 'HCL Technologies Ltd', exchange: 'NSE', country: 'India', sector: 'Technology', industry: 'IT Services' },
  { ticker: 'ASIANPAINT.NS', name: 'Asian Paints Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Cyclical', industry: 'Paints & Coatings' },
  { ticker: 'MARUTI.NS', name: 'Maruti Suzuki India Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Cyclical', industry: 'Automobiles' },
  { ticker: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Ltd', exchange: 'NSE', country: 'India', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'TITAN.NS', name: 'Titan Company Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Cyclical', industry: 'Luxury Goods & Jewelry' },
  { ticker: 'TATAMOTORS.NS', name: 'Tata Motors Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Cyclical', industry: 'Automobiles' },
  { ticker: 'ULTRACEMCO.NS', name: 'UltraTech Cement Ltd', exchange: 'NSE', country: 'India', sector: 'Basic Materials', industry: 'Cement' },
  { ticker: 'AXISBANK.NS', name: 'Axis Bank Ltd', exchange: 'NSE', country: 'India', sector: 'Financial Services', industry: 'Private Sector Bank' },
  { ticker: 'NTPC.NS', name: 'NTPC Ltd', exchange: 'NSE', country: 'India', sector: 'Utilities', industry: 'Power Generation' },
  { ticker: 'ONGC.NS', name: 'Oil and Natural Gas Corporation Ltd', exchange: 'NSE', country: 'India', sector: 'Energy', industry: 'Oil & Gas Exploration' },
  { ticker: 'POWERGRID.NS', name: 'Power Grid Corporation of India Ltd', exchange: 'NSE', country: 'India', sector: 'Utilities', industry: 'Power Transmission' },
  { ticker: 'ADANIENT.NS', name: 'Adani Enterprises Ltd', exchange: 'NSE', country: 'India', sector: 'Industrials', industry: 'Conglomerate' },
  { ticker: 'ADANIPORTS.NS', name: 'Adani Ports and SEZ Ltd', exchange: 'NSE', country: 'India', sector: 'Industrials', industry: 'Marine Ports & Services' },
  { ticker: 'COALINDIA.NS', name: 'Coal India Ltd', exchange: 'NSE', country: 'India', sector: 'Energy', industry: 'Coal Mining' },
  { ticker: 'TATASTEEL.NS', name: 'Tata Steel Ltd', exchange: 'NSE', country: 'India', sector: 'Basic Materials', industry: 'Steel' },
  { ticker: 'WIPRO.NS', name: 'Wipro Ltd', exchange: 'NSE', country: 'India', sector: 'Technology', industry: 'IT Services' },
  { ticker: 'M&M.NS', name: 'Mahindra & Mahindra Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Cyclical', industry: 'Automobiles & Tractors' },
  { ticker: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Ltd', exchange: 'NSE', country: 'India', sector: 'Financial Services', industry: 'Financial Services' },
  { ticker: 'NESTLEIND.NS', name: 'Nestle India Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Defensive', industry: 'Packaged Foods' },
  { ticker: 'JSWSTEEL.NS', name: 'JSW Steel Ltd', exchange: 'NSE', country: 'India', sector: 'Basic Materials', industry: 'Steel' },
  { ticker: 'GRASIM.NS', name: 'Grasim Industries Ltd', exchange: 'NSE', country: 'India', sector: 'Basic Materials', industry: 'Chemicals & Textiles' },
  { ticker: 'TECHM.NS', name: 'Tech Mahindra Ltd', exchange: 'NSE', country: 'India', sector: 'Technology', industry: 'IT Services' },
  { ticker: 'HINDALCO.NS', name: 'Hindalco Industries Ltd', exchange: 'NSE', country: 'India', sector: 'Basic Materials', industry: 'Aluminium & Copper' },
  { ticker: 'INDUSINDBK.NS', name: 'IndusInd Bank Ltd', exchange: 'NSE', country: 'India', sector: 'Financial Services', industry: 'Private Sector Bank' },
  { ticker: 'DRREDDY.NS', name: 'Dr. Reddy\'s Laboratories Ltd', exchange: 'NSE', country: 'India', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'CIPLA.NS', name: 'Cipla Ltd', exchange: 'NSE', country: 'India', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { ticker: 'TATACONSUM.NS', name: 'Tata Consumer Products Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Defensive', industry: 'Tea, Coffee & Foods' },
  { ticker: 'DIVISLAB.NS', name: 'Divi\'s Laboratories Ltd', exchange: 'NSE', country: 'India', sector: 'Healthcare', industry: 'Active Pharmaceutical Ingredients' },
  { ticker: 'EICHERMOT.NS', name: 'Eicher Motors Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Cyclical', industry: 'Motorcycles & Commercial Vehicles' },
  { ticker: 'BPCL.NS', name: 'Bharat Petroleum Corporation Ltd', exchange: 'NSE', country: 'India', sector: 'Energy', industry: 'Oil Refining & Marketing' },
  { ticker: 'BRITANNIA.NS', name: 'Britannia Industries Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Defensive', industry: 'Biscuits & Bakery' },
  { ticker: 'APOLLOHOSP.NS', name: 'Apollo Hospitals Enterprise Ltd', exchange: 'NSE', country: 'India', sector: 'Healthcare', industry: 'Hospital Services' },
  { ticker: 'HEROMOTOCO.NS', name: 'Hero MotoCorp Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Cyclical', industry: 'Motorcycles & Scooters' },
  { ticker: 'SHRIRAMFIN.NS', name: 'Shriram Finance Ltd', exchange: 'NSE', country: 'India', sector: 'Financial Services', industry: 'Asset Financing NBFC' },
  { ticker: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Cyclical', industry: 'Two & Three Wheelers' },
  { ticker: 'ZOMATO.NS', name: 'Zomato Ltd', exchange: 'NSE', country: 'India', sector: 'Consumer Cyclical', industry: 'Food Delivery & Quick Commerce' },
  { ticker: 'JIOFIN.NS', name: 'Jio Financial Services Ltd', exchange: 'NSE', country: 'India', sector: 'Financial Services', industry: 'Fintech & Wealth' },

  // Top NASDAQ US
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Consumer Electronics' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Software - Infrastructure' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Consumer Cyclical', industry: 'Internet Retail' },
  { ticker: 'GOOGL', name: 'Alphabet Inc. (Class A)', exchange: 'NASDAQ', country: 'United States', sector: 'Communication Services', industry: 'Internet Content & Information' },
  { ticker: 'GOOG', name: 'Alphabet Inc. (Class C)', exchange: 'NASDAQ', country: 'United States', sector: 'Communication Services', industry: 'Internet Content & Information' },
  { ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Communication Services', industry: 'Internet Content & Information' },
  { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Consumer Cyclical', industry: 'Auto Manufacturers' },
  { ticker: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'COST', name: 'Costco Wholesale Corporation', exchange: 'NASDAQ', country: 'United States', sector: 'Consumer Defensive', industry: 'Discount Stores' },
  { ticker: 'ASML', name: 'ASML Holding N.V.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Semiconductor Equipment' },
  { ticker: 'PEP', name: 'PepsiCo Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Consumer Defensive', industry: 'Beverages - Non-Alcoholic' },
  { ticker: 'CSCO', name: 'Cisco Systems Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Communication Equipment' },
  { ticker: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Software - Infrastructure' },
  { ticker: 'TMUS', name: 'T-Mobile US Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Communication Services', industry: 'Telecom Services' },
  { ticker: 'AMD', name: 'Advanced Micro Devices Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Communication Services', industry: 'Entertainment' },
  { ticker: 'QCOM', name: 'QUALCOMM Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'AMGN', name: 'Amgen Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Healthcare', industry: 'Biotechnology' },
  { ticker: 'TXN', name: 'Texas Instruments Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'ISRG', name: 'Intuitive Surgical Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Healthcare', industry: 'Medical Instruments & Supplies' },
  { ticker: 'INTU', name: 'Intuit Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Software - Application' },
  { ticker: 'BKNG', name: 'Booking Holdings Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Consumer Cyclical', industry: 'Travel Services' },
  { ticker: 'AMAT', name: 'Applied Materials Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Semiconductor Equipment' },
  { ticker: 'VRTX', name: 'Vertex Pharmaceuticals Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Healthcare', industry: 'Biotechnology' },
  { ticker: 'SBUX', name: 'Starbucks Corporation', exchange: 'NASDAQ', country: 'United States', sector: 'Consumer Cyclical', industry: 'Restaurants' },
  { ticker: 'MDLZ', name: 'Mondelez International Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Consumer Defensive', industry: 'Confectionery' },
  { ticker: 'GILD', name: 'Gilead Sciences Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Healthcare', industry: 'Biotechnology' },
  { ticker: 'ADI', name: 'Analog Devices Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Semiconductors' },
  { ticker: 'PANW', name: 'Palo Alto Networks Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Technology', industry: 'Software - Infrastructure' },
  { ticker: 'PYPL', name: 'PayPal Holdings Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Financial Services', industry: 'Credit Services' },
  { ticker: 'MELI', name: 'MercadoLibre Inc.', exchange: 'NASDAQ', country: 'United States', sector: 'Consumer Cyclical', industry: 'Internet Retail' },

  // Top NYSE / AMEX US
  { ticker: 'BRK-B', name: 'Berkshire Hathaway Inc.', exchange: 'NYSE', country: 'United States', sector: 'Financial Services', industry: 'Multi-sector Insurance' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', country: 'United States', sector: 'Financial Services', industry: 'Banks - Diversified' },
  { ticker: 'V', name: 'Visa Inc.', exchange: 'NYSE', country: 'United States', sector: 'Financial Services', industry: 'Credit Services' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', country: 'United States', sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { ticker: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', country: 'United States', sector: 'Consumer Defensive', industry: 'Discount Stores' },
  { ticker: 'PG', name: 'Procter & Gamble Company', exchange: 'NYSE', country: 'United States', sector: 'Consumer Defensive', industry: 'Household & Personal' },
  { ticker: 'MA', name: 'Mastercard Inc.', exchange: 'NYSE', country: 'United States', sector: 'Financial Services', industry: 'Credit Services' },
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE', country: 'United States', sector: 'Energy', industry: 'Oil & Gas Integrated' },
  { ticker: 'HD', name: 'Home Depot Inc.', exchange: 'NYSE', country: 'United States', sector: 'Consumer Cyclical', industry: 'Home Improvement Retail' },
  { ticker: 'CVX', name: 'Chevron Corporation', exchange: 'NYSE', country: 'United States', sector: 'Energy', industry: 'Oil & Gas Integrated' },
  { ticker: 'LLY', name: 'Eli Lilly and Company', exchange: 'NYSE', country: 'United States', sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { ticker: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE', country: 'United States', sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { ticker: 'MRK', name: 'Merck & Co. Inc.', exchange: 'NYSE', country: 'United States', sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { ticker: 'BAC', name: 'Bank of America Corporation', exchange: 'NYSE', country: 'United States', sector: 'Financial Services', industry: 'Banks - Diversified' },
  { ticker: 'KO', name: 'Coca-Cola Company', exchange: 'NYSE', country: 'United States', sector: 'Consumer Defensive', industry: 'Beverages - Non-Alcoholic' },
  { ticker: 'DIS', name: 'Walt Disney Company', exchange: 'NYSE', country: 'United States', sector: 'Communication Services', industry: 'Entertainment' },
  { ticker: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE', country: 'United States', sector: 'Healthcare', industry: 'Drug Manufacturers' },
  { ticker: 'MCD', name: 'McDonald\'s Corporation', exchange: 'NYSE', country: 'United States', sector: 'Consumer Cyclical', industry: 'Restaurants' },
  { ticker: 'VZ', name: 'Verizon Communications Inc.', exchange: 'NYSE', country: 'United States', sector: 'Communication Services', industry: 'Telecom Services' },
  { ticker: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE', country: 'United States', sector: 'Technology', industry: 'Software - Application' },
  { ticker: 'WFC', name: 'Wells Fargo & Company', exchange: 'NYSE', country: 'United States', sector: 'Financial Services', industry: 'Banks - Diversified' },
  { ticker: 'NKE', name: 'NIKE Inc.', exchange: 'NYSE', country: 'United States', sector: 'Consumer Cyclical', industry: 'Footwear & Accessories' },
  { ticker: 'UNH', name: 'UnitedHealth Group Inc.', exchange: 'NYSE', country: 'United States', sector: 'Healthcare', industry: 'Healthcare Plans' },
  { ticker: 'IBM', name: 'International Business Machines Corp.', exchange: 'NYSE', country: 'United States', sector: 'Technology', industry: 'Information Technology' },
  { ticker: 'GE', name: 'General Electric Company', exchange: 'NYSE', country: 'United States', sector: 'Industrials', industry: 'Aerospace & Energy' },
  { ticker: 'CAT', name: 'Caterpillar Inc.', exchange: 'NYSE', country: 'United States', sector: 'Industrials', industry: 'Farm & Heavy Construction' }
];

export const TOTAL_UNIVERSE_STATS = {
  total: 9726,
  nse: 2319,
  nasdaq: 4263,
  nyse: 2829,
  amex: 315
};

export function searchCatalog(
  query: string,
  exchangeFilter: string = 'ALL',
  countryFilter: string = 'ALL',
  limit: number = 25
): StockCatalogEntry[] {
  const q = query.trim().toUpperCase();

  // If user searched for custom ticker not in primary catalog, synthesize it dynamically
  const matches = UNIVERSE_CATALOG.filter(item => {
    if (exchangeFilter !== 'ALL' && item.exchange !== exchangeFilter) return false;
    if (countryFilter !== 'ALL' && item.country !== countryFilter) return false;

    if (!q) return true;
    return (
      item.ticker.toUpperCase().includes(q) ||
      item.name.toUpperCase().includes(q) ||
      item.sector.toUpperCase().includes(q)
    );
  });

  if (matches.length === 0 && q.length > 0) {
    const isIndian = q.endsWith('.NS') || q.endsWith('.BO');
    const autoEntry: StockCatalogEntry = {
      ticker: q,
      name: `${q} Equity Security`,
      exchange: isIndian ? 'NSE' : 'NASDAQ',
      country: isIndian ? 'India' : 'United States',
      sector: 'General Equity',
      industry: 'Publicly Traded'
    };
    return [autoEntry];
  }

  return matches.slice(0, limit);
}
