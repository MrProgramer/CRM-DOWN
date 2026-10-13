import { Invoice, InvoiceItem, ProductReturn, Product } from '../types';

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

/**
 * Normalizes Persian string for accurate comparison
 */
export function normalizePersianStr(str?: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\s\-_]+/g, ' ');
}

/**
 * Calculates the effective acquisition/purchase cost for a product,
 * taking into account any supplier purchase discounts recorded in purchase invoices.
 */
export function getProductDiscountedPurchasePrice(
  productId?: string,
  productName?: string,
  fallbackPrice: number = 0,
  invoices: Invoice[] = [],
  products: Product[] = []
): number {
  let matchingProduct: Product | undefined;
  if (productId && products && products.length > 0) {
    matchingProduct = products.find(p => p.id === productId);
  }
  if (!matchingProduct && productName && products && products.length > 0) {
    const target = normalizePersianStr(productName);
    matchingProduct = products.find(p => {
      const pName = normalizePersianStr(p.name);
      return pName === target || pName.includes(target) || target.includes(pName);
    });
  }

  const basePrice = (matchingProduct && matchingProduct.purchasePrice > 0) ? matchingProduct.purchasePrice : fallbackPrice;

  if (!invoices || invoices.length === 0) {
    return basePrice;
  }

  // Search finalized purchase invoices for the exact acquisition cost including supplier invoice discount
  const purchaseInvs = invoices.filter(inv => inv.type === 'purchase' && !inv.isDraft && inv.items);
  // Sort to inspect latest purchase invoices first
  const sortedPurchases = [...purchaseInvs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  for (const pInv of sortedPurchases) {
    const found = pInv.items.find(pi => 
      (productId && pi.productId === productId) || 
      (productName && pi.productName && normalizePersianStr(pi.productName) === normalizePersianStr(productName))
    );
    if (found) {
      const hasDiscount = Boolean(pInv.hasDiscount || (pInv.discount && pInv.discount > 0));
      const grossSubtotal = (pInv.items || []).reduce((s, it) => s + (it.totalPrice || (it.totalPieces * (it.unitPurchasePrice || it.unitPrice || 0))), 0);
      const discountPercent = pInv.discountPercent || (grossSubtotal > 0 && pInv.discount ? (pInv.discount / grossSubtotal) * 100 : 0);
      
      let rawUnitCost = found.unitPurchasePrice || (found.totalPieces > 0 && found.totalPurchaseCost ? Math.round(found.totalPurchaseCost / found.totalPieces) : (found.unitPrice || 0));
      if (rawUnitCost > 0) {
        if (hasDiscount && discountPercent > 0) {
          return Math.round(rawUnitCost * (1 - (discountPercent / 100)));
        }
        return rawUnitCost;
      }
    }
  }

  return basePrice;
}

