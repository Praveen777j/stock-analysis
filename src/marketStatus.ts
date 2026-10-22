/**
 * Indian Stock Market (NSE & BSE) Session Status & Holiday Engine
 *
 * Evaluates Indian Standard Time (IST, UTC+5:30) trading sessions:
 * - Regular equity trading hours: 09:15 AM to 03:30 PM IST (Mon–Fri)
 * - Pre-market session: 09:00 AM to 09:15 AM IST
 * - Post-market session: 03:40 PM to 04:00 PM IST
 * - Official statutory trading holidays for NSE and BSE (2025–2026)
 */

export interface IndianMarketSession {
  status: 'MARKET OPEN' | 'MARKET CLOSED' | 'MARKET HOLIDAY' | 'STATUS UNAVAILABLE';
  sessionName: string;
  reason: string;
  istTimeString: string;
  nextSessionText: string;
  isTradingDay: boolean;
  holidayName?: string;
  lastUpdated: string;
}

// Statutory NSE/BSE Trading Holidays (Month-Day format MM-DD or full YYYY-MM-DD for floating dates)
const STATUTORY_INDIAN_HOLIDAYS: Record<string, string> = {
  // Annual fixed national holidays
  '01-26': 'Republic Day',
  '05-01': 'Maharashtra Day',
  '08-15': 'Independence Day',
  '10-02': 'Mahatma Gandhi Jayanti',
  '12-25': 'Christmas',

  // 2025 exchange holidays
  '2025-02-26': 'Mahashivratri',
  '2025-03-14': 'Holi',
  '2025-03-31': 'Id-Ul-Fitr (Ramzan Id)',
  '2025-04-10': 'Shri Mahavir Jayanti',
  '2025-04-14': 'Dr. Baba Saheb Ambedkar Jayanti',
  '2025-04-18': 'Good Friday',
  '2025-06-07': 'Bakri Id (Eid ul-Adha)',
  '2025-07-06': 'Muharram',
  '2025-10-02': 'Mahatma Gandhi Jayanti / Dussehra',
  '2025-10-21': 'Diwali Laxmi Pujan (Special Muhurat Trading Only)',
  '2025-10-22': 'Diwali Balipratipada',
  '2025-11-05': 'Prakash Gurpurb (Sri Guru Nanak Jayanti)',

  // 2026 exchange holidays
  '2026-01-26': 'Republic Day',
  '2026-02-16': 'Mahashivratri',
  '2026-03-04': 'Holi',
  '2026-03-20': 'Id-Ul-Fitr (Ramzan Id)',
  '2026-03-30': 'Shri Mahavir Jayanti',
  '2026-04-03': 'Good Friday',
  '2026-04-14': 'Dr. Baba Saheb Ambedkar Jayanti',
  '2026-05-01': 'Maharashtra Day',
  '2026-05-27': 'Bakri Id (Eid ul-Adha)',
  '2026-06-25': 'Muharram',
  '2026-08-15': 'Independence Day',
  '2026-10-02': 'Mahatma Gandhi Jayanti',
  '2026-10-20': 'Dussehra',
  '2026-11-09': 'Diwali Laxmi Pujan (Special Muhurat Trading Only)',
  '2026-11-10': 'Diwali Balipratipada',
  '2026-11-24': 'Sri Guru Nanak Jayanti',
  '2026-12-25': 'Christmas'
};

export function getIndianMarketStatus(customDate?: Date): IndianMarketSession {
  try {
    const now = customDate || new Date();

    // Convert to Indian Standard Time (Asia/Kolkata)
    const istDateString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const ist = new Date(istDateString);

    if (isNaN(ist.getTime())) {
      return {
        status: 'STATUS UNAVAILABLE',
        sessionName: 'Session Unverified',
        reason: 'Unable to calculate Indian Standard Time (IST)',
        istTimeString: now.toISOString(),
        nextSessionText: 'Regular session hours: Mon–Fri, 09:15 – 15:30 IST',
        isTradingDay: false,
        lastUpdated: now.toISOString()
      };
    }

    const year = ist.getFullYear();
    const month = String(ist.getMonth() + 1).padStart(2, '0');
    const day = String(ist.getDate()).padStart(2, '0');
    const hours = ist.getHours();
    const minutes = ist.getMinutes();
    const dayOfWeek = ist.getDay(); // 0 = Sunday, 6 = Saturday

    const mmdd = `${month}-${day}`;
    const yyyymmdd = `${year}-${month}-${day}`;

    // Format readable IST time string
    const timeFormatted = ist.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const dateFormatted = ist.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const istTimeString = `${dateFormatted}, ${timeFormatted} IST`;

    // 1. Check for statutory exchange holiday
    const holidayName = STATUTORY_INDIAN_HOLIDAYS[yyyymmdd] || STATUTORY_INDIAN_HOLIDAYS[mmdd];
    if (holidayName) {
      return {
        status: 'MARKET HOLIDAY',
        sessionName: 'Exchange Trading Holiday',
        reason: `NSE/BSE equity trading closed for ${holidayName}`,
        istTimeString,
        nextSessionText: 'Next trading session opens on the following business day at 09:15 AM IST',
        isTradingDay: false,
        holidayName,
        lastUpdated: istTimeString
      };
    }

    // 2. Check for weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const dayName = dayOfWeek === 0 ? 'Sunday' : 'Saturday';
      return {
        status: 'MARKET CLOSED',
        sessionName: 'Weekend Session Closure',
        reason: `Exchange closed for the weekend (${dayName})`,
        istTimeString,
        nextSessionText: 'Regular market opens Monday at 09:15 AM IST',
        isTradingDay: false,
        lastUpdated: istTimeString
      };
    }

    // 3. Regular Weekday: Check trading hours
    const currentMinutes = hours * 60 + minutes;
    const preMarketOpen = 9 * 60; // 09:00
    const regularMarketOpen = 9 * 60 + 15; // 09:15
    const regularMarketClose = 15 * 60 + 30; // 15:30
    const postMarketClose = 16 * 60; // 16:00

    if (currentMinutes >= regularMarketOpen && currentMinutes < regularMarketClose) {
      return {
        status: 'MARKET OPEN',
        sessionName: 'Regular Equity Trading Session',
        reason: 'NSE/BSE continuous trading session active (09:15 – 15:30 IST)',
        istTimeString,
        nextSessionText: 'Trading session closes at 03:30 PM IST today',
        isTradingDay: true,
        lastUpdated: istTimeString
      };
    } else if (currentMinutes >= preMarketOpen && currentMinutes < regularMarketOpen) {
      return {
        status: 'MARKET CLOSED',
        sessionName: 'Pre-Open Call Auction Session',
        reason: 'Order collection and equilibrium price discovery (09:00 – 09:15 IST)',
        istTimeString,
        nextSessionText: 'Regular equity trading opens at 09:15 AM IST today',
        isTradingDay: true,
        lastUpdated: istTimeString
      };
    } else if (currentMinutes < preMarketOpen) {
      return {
        status: 'MARKET CLOSED',
        sessionName: 'Pre-Session Hours',
        reason: 'Equity market opens at 09:15 AM IST',
        istTimeString,
        nextSessionText: 'Pre-market opens at 09:00 AM IST · Regular trading opens at 09:15 AM IST',
        isTradingDay: true,
        lastUpdated: istTimeString
      };
    } else if (currentMinutes >= regularMarketClose && currentMinutes < postMarketClose) {
      return {
        status: 'MARKET CLOSED',
        sessionName: 'Post-Close / Settlement Session',
        reason: 'Regular session closed at 03:30 PM IST · Closing price calculation & settlement active',
        istTimeString,
        nextSessionText: 'Next regular trading session opens next business day at 09:15 AM IST',
        isTradingDay: true,
        lastUpdated: istTimeString
      };
    } else {
      return {
        status: 'MARKET CLOSED',
        sessionName: 'Post-Market Hours',
        reason: 'Market closed for the day at 03:30 PM IST',
        istTimeString,
        nextSessionText: 'Next regular trading session opens next business day at 09:15 AM IST',
        isTradingDay: true,
        lastUpdated: istTimeString
      };
    }
  } catch (err) {
    return {
      status: 'STATUS UNAVAILABLE',
      sessionName: 'Status Unverified',
      reason: 'Exchange status could not be verified automatically',
      istTimeString: new Date().toISOString(),
      nextSessionText: 'Regular session hours: Mon–Fri, 09:15 – 15:30 IST',
      isTradingDay: false,
      lastUpdated: new Date().toISOString()
    };
  }
}
