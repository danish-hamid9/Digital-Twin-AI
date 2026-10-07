"""
Currency Formatting Utility for Digital Twin AI
Provides centralized currency symbols and formatting functions for multi-currency support.
Guarantees consistent, authentic formatting across all user profiles (USD, INR, EUR, GBP, etc.).
"""

from typing import Optional, Union

CURRENCY_SYMBOLS = {
    "USD": "$",
    "EUR": "€",
    "GBP": "£",
    "INR": "₹",
    "JPY": "¥",
    "CAD": "CA$",
    "AUD": "A$",
    "CHF": "CHF",
    "CNY": "¥",
    "SGD": "S$",
}


def get_currency_symbol(currency: Optional[str]) -> str:
    """Returns the currency symbol for the given currency code (e.g. ₹ for INR, $ for USD)."""
    if not currency:
        return "$"
    code = currency.strip().upper()
    return CURRENCY_SYMBOLS.get(code, f"{code} ")


def format_money(amount: Union[float, int], currency: Optional[str], include_decimals: bool = True) -> str:
    """
    Formats a numeric amount with the user's profile currency symbol and proper number formatting.
    Example:
        format_money(45000, "INR", include_decimals=False) -> "₹45,000"
        format_money(1234.56, "USD") -> "$1,234.56"
        format_money(1234.56, "INR") -> "₹1,234.56"
    """
    sym = get_currency_symbol(currency)
    amt = float(amount)
    if include_decimals:
        formatted_num = f"{amt:,.2f}"
    else:
        formatted_num = f"{amt:,.0f}"
    return f"{sym}{formatted_num}"
