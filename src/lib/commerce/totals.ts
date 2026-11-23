export type PricedCartLine = { productId: string; name: string; sku: string; quantity: number; unitAmountMinor: number; currency: string };
export type CartTotals = { currency: string; subtotalMinor: number; lines: Array<PricedCartLine & { lineTotalMinor: number }>; itemCount: number };

/** Server-only callers must load active products from the database; never accept prices from a browser. */
export function calculateCartTotals(lines: PricedCartLine[]): CartTotals {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("Cart is empty");
  const currency = lines[0]?.currency.trim().toUpperCase();
  if (!currency || !/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid cart currency");
  let subtotalMinor = 0;
  let itemCount = 0;
  const priced = lines.map((line) => {
    if (!line.productId || !line.name || !line.sku || line.currency.trim().toUpperCase() !== currency) throw new Error("Invalid or mixed-currency cart");
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new Error("Invalid quantity");
    if (!Number.isSafeInteger(line.unitAmountMinor) || line.unitAmountMinor < 0) throw new Error("Invalid product price");
    const lineTotalMinor = line.quantity * line.unitAmountMinor;
    if (!Number.isSafeInteger(lineTotalMinor)) throw new Error("Cart line total exceeds safe integer range");
    subtotalMinor += lineTotalMinor;
    itemCount += line.quantity;
    if (!Number.isSafeInteger(subtotalMinor)) throw new Error("Cart total exceeds safe integer range");
    return { ...line, currency, lineTotalMinor };
  });
  return { currency, subtotalMinor, lines: priced, itemCount };
}
