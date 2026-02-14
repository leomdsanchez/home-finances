const ZERO_DECIMAL_CURRENCIES = new Set([
  "ARS", "CLP", "COP", "MXN", "PYG", "DOP", "UYU", "PEN",
]);

export const getCurrencyDecimals = (code?: string): number => {
  if (!code) return 2;
  return ZERO_DECIMAL_CURRENCIES.has(code.toUpperCase()) ? 0 : 2;
};

export const formatAmount = (value: number, currency: string): string => {
  const code = currency.toUpperCase();
  const decimals = getCurrencyDecimals(code);
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${code}`;
};

export const roundForCurrency = (value: number, currency: string): number => {
  const decimals = getCurrencyDecimals(currency);
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};
