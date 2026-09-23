import { Invoice, ProductReturn } from '../types';
import { getMatchedReturnsForInvoice, getInvoiceCalculatedTotals } from './invoiceCalculations';

/**
 * Synchronizes an invoice with all product returns.
 * Adjusts items in the invoice so returned items are reduced (or zeroed out if fully returned).
 * Recalculates subtotal and finalAmount deterministically:
 * Final Amount = Original Total Money of Invoice - Total Returned Goods.
 */
export function syncInvoiceWithReturns(invoice: Invoice, allReturns: ProductReturn[]): Invoice {
  const isPurchase = invoice.type === 'purchase';

  // Find returns matching this invoice using unified matcher
  const matchedReturns = getMatchedReturnsForInvoice(invoice, allReturns);

  if (matchedReturns.length === 0) {
    let baseNotes = (invoice.notes || '').split('\n[خلاصه مرجوعی و کسورات فاکتور]:')[0].trim();
    if (baseNotes === (invoice.notes || '')) return invoice;
    return {
      ...invoice,
      notes: baseNotes,
    };
  }

  // Matched returns exist! Adjust items based on original quantities
  const updatedItems = (invoice.items || []).map(item => {
    // Preserve original values
    const origPieces = item.originalTotalPieces !== undefined ? item.originalTotalPieces : item.totalPieces;
    const origCartons = item.originalCartonsCount !== undefined ? item.originalCartonsCount : item.cartonsCount;
    const origExtra = item.originalExtraPieces !== undefined ? item.originalExtraPieces : item.extraPieces;
    const origPrice = item.originalTotalPrice !== undefined ? item.originalTotalPrice : item.totalPrice;

    // Find returns for this specific product item
    const itemReturns = matchedReturns.filter(r => 
      r.productId === item.productId || 
      (r.productName && item.productName && r.productName.trim().toLowerCase() === item.productName.trim().toLowerCase())
    );

    const sumReturnedPieces = itemReturns.reduce((s, r) => s + r.totalPieces, 0);

    if (sumReturnedPieces <= 0) {
      return {
        ...item,
        originalTotalPieces: origPieces,
        originalCartonsCount: origCartons,
        originalExtraPieces: origExtra,
        originalTotalPrice: origPrice,
        cartonsCount: origCartons,
        extraPieces: origExtra,
        totalPieces: origPieces,
        totalPrice: origPrice,
      };
    }

    const remainingPieces = Math.max(0, origPieces - sumReturnedPieces);
    const piecesPerCarton = item.piecesPerCarton || 1;
    const netCartons = Math.floor(remainingPieces / piecesPerCarton);
    const netExtra = remainingPieces % piecesPerCarton;
    const unitSelling = item.unitSellingPrice || 0;
    const unitPurchase = item.unitPurchasePrice || 0;

    const effectiveUnitPrice = isPurchase 
      ? (item.unitPurchasePrice || (item as any).unitPrice || (origPieces > 0 ? (origPrice / origPieces) : 0))
      : (item.unitSellingPrice || (item as any).unitPrice || (origPieces > 0 ? (origPrice / origPieces) : 0));

    const netTotalPrice = remainingPieces * effectiveUnitPrice;
    const netTotalPurchaseCost = remainingPieces * unitPurchase;
    const netProfitAmount = (remainingPieces * unitSelling) - netTotalPurchaseCost;

    let note = '';
    if (remainingPieces === 0) {
      note = '(مرجوعی کامل - کالا صفر شد)';
    } else {
      note = `(اصلاح‌شده بابت کسر ${sumReturnedPieces} عدد مرجوعی)`;
    }

    return {
      ...item,
      originalTotalPieces: origPieces,
      originalCartonsCount: origCartons,
      originalExtraPieces: origExtra,
      originalTotalPrice: origPrice,
      cartonsCount: netCartons,
      extraPieces: netExtra,
      totalPieces: remainingPieces,
      totalPrice: netTotalPrice,
      totalPurchaseCost: netTotalPurchaseCost,
      profitAmount: netProfitAmount,
      customDescription: note,
    };
  });

  // Calculate precise totals using single-source-of-truth helper
  const totals = getInvoiceCalculatedTotals({ ...invoice, items: updatedItems }, allReturns);
  const subtotal = updatedItems.reduce((s, it) => s + it.totalPrice, 0);
  const finalAmount = totals.netFinalAmount;

  // Build automatic return notes summary
  const returnSummaryLines = matchedReturns.map(r => {
    const gross = r.totalAmount || 0;
    const extra = r.extraCosts || 0;
    const net = r.netAmount !== undefined ? r.netAmount : Math.max(0, gross - extra);
    const grossFormatted = Math.round(gross).toLocaleString('fa-IR');
    const extraFormatted = Math.round(extra).toLocaleString('fa-IR');
    const netFormatted = Math.round(net).toLocaleString('fa-IR');

    if (extra > 0) {
      const reasonText = r.extraCostsReason ? ` - بابت: ${r.extraCostsReason}` : '';
      return `• مرجوعی کالا «${r.productName}»: ناخالص ${grossFormatted} تومان | کسر هزینه بار/خسارت: ${extraFormatted} تومان${reasonText} | مبلغ خالص بستانکار: ${netFormatted} تومان`;
    }
    return `• مرجوعی کالا «${r.productName}»: به ارزش ${grossFormatted} تومان (علت: ${r.reason})`;
  }).join('\n');

  // Strip existing automated return summary header if previously added
  let baseNotes = (invoice.notes || '').split('\n[خلاصه مرجوعی و کسورات فاکتور]:')[0].trim();
  let updatedNotes = baseNotes;
  if (returnSummaryLines) {
    updatedNotes = baseNotes 
      ? `${baseNotes}\n\n[خلاصه مرجوعی و کسورات فاکتور]:\n${returnSummaryLines}` 
      : `[خلاصه مرجوعی و کسورات فاکتور]:\n${returnSummaryLines}`;
  }

  return {
    ...invoice,
    items: updatedItems,
    subtotal,
    finalAmount,
    notes: updatedNotes,
  };
}

/**
 * Syncs an array of invoices with all returns.
 */
export function syncAllInvoicesWithReturns(invoices: Invoice[], returns: ProductReturn[]): Invoice[] {
  return invoices.map(inv => syncInvoiceWithReturns(inv, returns));
}
