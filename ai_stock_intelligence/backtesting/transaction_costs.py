"""
Transaction cost and execution slippage model.
"""

from typing import Tuple


class ExecutionCostModel:
    def __init__(self, commission_bps: float = 10.0, slippage_bps: float = 5.0):
        # Basis points to fractions: 10 bps = 0.0010
        self.commission_rate = commission_bps / 10000.0
        self.slippage_rate = slippage_bps / 10000.0
        self.total_drag_rate = self.commission_rate + self.slippage_rate

    def calculate_entry_cost(self, price: float, shares: float) -> Tuple[float, float]:
        """Returns total outlay including transaction costs and execution slippage."""
        gross = price * shares
        friction = gross * self.total_drag_rate
        return gross + friction, friction

    def calculate_exit_revenue(self, price: float, shares: float) -> Tuple[float, float]:
        """Returns net cash received after commission and exit slippage."""
        gross = price * shares
        friction = gross * self.total_drag_rate
        return gross - friction, friction
