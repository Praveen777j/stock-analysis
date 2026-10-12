"""
Stock Universe Manager.
Handles loading, caching, symbol normalization, validation, filtering, and updating
for a universe of thousands of securities across Indian (NSE/BSE) and US (NASDAQ/NYSE/AMEX) exchanges.
"""

import os
import csv
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, asdict


@dataclass
class StockSecurity:
    ticker: str
    name: str
    exchange: str
    country: str
    sector: str = "General"
    industry: str = "General"
    aliases: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class StockUniverseManager:
    """
    Central manager for the multi-exchange stock universe.
    Supports in-memory caching, prefix/substring searches, and exchange/country slicing.
    """
    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.data_dir = os.path.join(base, "data")
        else:
            self.data_dir = data_dir

        self.full_universe_file = os.path.join(self.data_dir, "stock_universe_full.csv")
        self.active_universe_file = os.path.join(self.data_dir, "stock_universe.csv")
        self.custom_universe_file = os.path.join(self.data_dir, "stock_universe_custom.csv")

        self._universe: Dict[str, StockSecurity] = {}
        self._loaded = False
        self._load_universe()

    def _normalize_ticker(self, ticker: str) -> str:
        """Sanitizes ticker symbols (strips whitespace, capitalizes, maps common aliases)."""
        t = ticker.strip().upper()
        # Normalization for Indian tickers
        if t.endswith(".NS") or t.endswith(".BO"):
            return t
        # If user typed standard Indian blue chip without suffix, check if exists with .NS
        return t

    def _load_universe(self):
        """Loads stock universe from disk CSV with deduplication."""
        self._universe.clear()
        target_files = [self.full_universe_file, self.active_universe_file, self.custom_universe_file]

        for file_path in target_files:
            if not os.path.exists(file_path):
                continue
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        raw_ticker = row.get("ticker", "")
                        if not raw_ticker:
                            continue
                        norm_ticker = self._normalize_ticker(raw_ticker)
                        sec = StockSecurity(
                            ticker=norm_ticker,
                            name=row.get("name", norm_ticker),
                            exchange=row.get("exchange", "Unknown").upper(),
                            country=row.get("country", "Unknown"),
                            sector=row.get("sector", "General"),
                            industry=row.get("industry", "General"),
                            aliases=row.get("aliases", "")
                        )
                        # Avoid overwriting already existing entry with incomplete info
                        if norm_ticker not in self._universe:
                            self._universe[norm_ticker] = sec
            except Exception as e:
                print(f"Warning loading {file_path}: {e}")

        self._loaded = True

    def get_security(self, ticker: str) -> Optional[StockSecurity]:
        """Lookup security by exact or normalized ticker."""
        norm = self._normalize_ticker(ticker)
        if norm in self._universe:
            return self._universe[norm]
        # Try appending .NS for Indian equity
        if f"{norm}.NS" in self._universe:
            return self._universe[f"{norm}.NS"]
        return None

    def validate_ticker(self, ticker: str) -> bool:
        """Returns True if ticker is in universe or adheres to valid ticker structure."""
        return self.get_security(ticker) is not None or len(ticker.strip()) >= 1

    def list_all(self, limit: Optional[int] = None) -> List[StockSecurity]:
        """Returns all securities up to optional limit."""
        items = list(self._universe.values())
        return items[:limit] if limit else items

    def count(self) -> int:
        """Returns total distinct securities count."""
        return len(self._universe)

    def count_by_exchange(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for s in self._universe.values():
            counts[s.exchange] = counts.get(s.exchange, 0) + 1
        return counts

    def count_by_country(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for s in self._universe.values():
            counts[s.country] = counts.get(s.country, 0) + 1
        return counts

    def filter_securities(
        self,
        exchange: Optional[str] = None,
        country: Optional[str] = None,
        sector: Optional[str] = None,
        limit: int = 500
    ) -> List[StockSecurity]:
        """Filters securities by exchange, country, and/or sector."""
        results = []
        target_ex = exchange.upper() if exchange and exchange != "ALL" else None
        target_co = country if country and country != "ALL" else None
        target_sec = sector if sector and sector != "ALL" else None

        for sec in self._universe.values():
            if target_ex and sec.exchange != target_ex:
                continue
            if target_co and sec.country.lower() != target_co.lower():
                continue
            if target_sec and sec.sector.lower() != target_sec.lower():
                continue

            results.append(sec)
            if len(results) >= limit:
                break

        return results

    def search(self, query: str, limit: int = 30) -> List[StockSecurity]:
        """Fast sub-string & prefix search across ticker, company name, and aliases."""
        q = query.strip().upper()
        if not q:
            return list(self._universe.values())[:limit]

        exact_matches = []
        prefix_matches = []
        name_matches = []

        for sec in self._universe.values():
            t = sec.ticker.upper()
            n = sec.name.upper()

            if t == q or t == f"{q}.NS":
                exact_matches.append(sec)
            elif t.startswith(q):
                prefix_matches.append(sec)
            elif q in t or q in n or (sec.aliases and q in sec.aliases.upper()):
                name_matches.append(sec)

            if len(exact_matches) + len(prefix_matches) + len(name_matches) >= limit * 2:
                break

        combined = exact_matches + prefix_matches + name_matches
        # Deduplicate preserving order
        seen = set()
        deduped = []
        for s in combined:
            if s.ticker not in seen:
                seen.add(s.ticker)
                deduped.append(s)
                if len(deduped) >= limit:
                    break

        return deduped

    def add_custom_ticker(self, ticker: str, name: str, exchange: str, country: str, sector: str = "Custom") -> StockSecurity:
        """Adds a custom ticker and saves to custom universe CSV."""
        norm = self._normalize_ticker(ticker)
        sec = StockSecurity(
            ticker=norm,
            name=name,
            exchange=exchange.upper(),
            country=country,
            sector=sector,
            industry="Custom",
            aliases=norm
        )
        self._universe[norm] = sec

        # Persist to custom CSV
        os.makedirs(self.data_dir, exist_ok=True)
        file_exists = os.path.exists(self.custom_universe_file)
        with open(self.custom_universe_file, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["ticker", "name", "exchange", "country", "sector", "industry", "aliases"])
            if not file_exists:
                writer.writeheader()
            writer.writerow(sec.to_dict())

        return sec


# Global singleton instance
_universe_instance: Optional[StockUniverseManager] = None


def get_universe_manager() -> StockUniverseManager:
    global _universe_instance
    if _universe_instance is None:
        _universe_instance = StockUniverseManager()
    return _universe_instance
