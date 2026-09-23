import { Invoice, InvoiceItem, ProductReturn } from '../types';

export interface InvoiceCalculatedTotals {
  matchedReturns: ProductReturn[];
  totalReturnsAmount: number;
  originalGrossAmount: number; // جمع ناخالص اقلام اصلی فاکتور قبل از مرجوعی
  originalFinalAmount: number; // پول اصلی کل فاکتور قبل از مرجوعی
  netFinalAmount: number;      // پول فاکتور پس از کسر کالای مرجوعی (اصل فاکتور منهای مرجوعی)
  hasReturns: boolean;
}

/**
 * Finds all product returns that belong to the given invoice.
 * Matches by invoice ID, invoice number, or (for unlinked returns) customer and product name.
 */
export function getMatchedReturnsForInvoice(
  invoice: Invoice,
  allReturns: ProductReturn[] = []
): ProductReturn[] {
  if (!invoice || !allReturns || allReturns.length === 0) return [];
  const isPurchase = invoice.type === 'purchase';

  return allReturns.filter(r => {
    // Only supplier returns for purchase invoices; customer returns for sales invoices
    if (isPurchase && r.type !== 'to_supplier') return false;
    if (!isPurchase && r.type !== 'from_customer') return false;

    // Direct link by invoice ID or invoice number
    if (r.invoiceId && r.invoiceId === invoice.id) return true;
    if (r.invoiceNumber && r.invoiceNumber === invoice.invoiceNumber) return true;

    // Fallback: unlinked return with identical customer and matching product in invoice
    if (!r.invoiceId && !r.invoiceNumber) {
      const sameCust = invoice.customerName && r.customerName &&
        r.customerName.trim().toLowerCase() === invoice.customerName.trim().toLowerCase();
      const itemInInvoice = (invoice.items || []).some(it =>
        it.productId === r.productId ||
        (it.productName && r.productName && it.productName.trim().toLowerCase() === r.productName.trim().toLowerCase())
      );
      return Boolean(sameCust && itemInInvoice);
    }

    return false;
  });
}

/**
 * Calculates the total value of returned items for matched returns.
 */
export function getInvoiceReturnsTotal(matchedReturns: ProductReturn[]): number {
  return matchedReturns.reduce((sum, r) => {
    const val = (r.totalAmount !== undefined && r.totalAmount > 0)
      ? r.totalAmount
      : ((r.totalPieces || 0) * (r.unitPrice || 0));
    return sum + Math.max(0, val);
  }, 0);
}

/**
 * Calculates the original and net amounts for an invoice considering returned items.
 * Rule: Net Final Amount = Original Total Money of Invoice - Returned Goods Amount.
 */
export function getInvoiceCalculatedTotals(
  invoice: Invoice,
  productReturns: ProductReturn[] = []
): InvoiceCalculatedTotals {
  if (!invoice) {
    return {
      matchedReturns: [],
      totalReturnsAmount: 0,
      originalGrossAmount: 0,
      originalFinalAmount: 0,
      netFinalAmount: 0,
      hasReturns: false,
    };
  }

  const isPurchase = invoice.type === 'purchase';
  const matchedReturns = getMatchedReturnsForInvoice(invoice, productReturns);
  const totalReturnsAmount = getInvoiceReturnsTotal(matchedReturns);

  let itemsOriginalGross = 0;
  let itemsCurrentGross = 0;

  (invoice.items || []).forEach(item => {
    const unitPrice = isPurchase
      ? ((item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0)
          ? item.unitPurchasePrice
          : (item.totalPieces > 0 && item.totalPrice > 0 ? Math.round(item.totalPrice / item.totalPieces) : (item.unitSellingPrice || 0)))
      : ((item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
          ? item.unitSellingPrice
          : (item.totalPieces > 0 && item.totalPrice > 0 ? Math.round(item.totalPrice / item.totalPieces) : (item.unitPurchasePrice || 0)));

    const currentLineTotal = (item.totalPrice !== undefined && item.totalPrice > 0)
      ? item.totalPrice
      : (item.totalPieces * unitPrice);
    itemsCurrentGross += currentLineTotal;

    // Check if this item has matched returns
    const itemMatchedReturns = matchedReturns.filter(r =>
      r.productId === item.productId ||
      (r.productName && item.productName && r.productName.trim().toLowerCase() === item.productName.trim().toLowerCase())
    );
    const itemReturnedAmount = itemMatchedReturns.reduce((s, r) => {
      const val = (r.totalAmount !== undefined && r.totalAmount > 0)
        ? r.totalAmount
        : ((r.totalPieces || 0) * (r.unitPrice || 0));
      return s + Math.max(0, val);
    }, 0);

    const origLineTotal = (item.originalTotalPrice !== undefined && item.originalTotalPrice > 0)
      ? item.originalTotalPrice
      : ((item.originalTotalPieces !== undefined && item.originalTotalPieces > item.totalPieces)
          ? (item.originalTotalPieces * unitPrice)
          : (currentLineTotal + itemReturnedAmount));

    itemsOriginalGross += origLineTotal;
  });

  // Original gross amount of all items before returns
  const originalGrossAmount = totalReturnsAmount > 0
    ? Math.max(itemsOriginalGross, itemsCurrentGross + totalReturnsAmount)
    : (itemsCurrentGross > 0 ? itemsCurrentGross : (invoice.subtotal || 0));

  // Original total money of invoice before returns (اصل پول کل فاکتور)
  const originalFinalAmount = Math.max(
    0,
    originalGrossAmount - (invoice.discount || 0) + (invoice.tax || 0)
  );

  // Net final amount after subtracting returned goods (اصل پول فاکتور منهای کالای مرجوعی)
  const netFinalAmount = Math.max(0, originalFinalAmount - totalReturnsAmount);

  return {
    matchedReturns,
    totalReturnsAmount,
    originalGrossAmount,
    originalFinalAmount,
    netFinalAmount,
    hasReturns: totalReturnsAmount > 0,
  };
}
