import { Invoice, Product } from '../types';

export interface ItemSellThroughInfo {
  itemId: string;
  productId: string;
  productName: string;
  totalPieces: number;
  soldPieces: number;
  remainingPieces: number;
  percentSold: number;
  percentRemaining: number;
  isFullySold: boolean;
  realizedProfit: number;
  potentialProfit: number;
  unitPurchasePrice: number;
  unitSellingPrice: number;
  // Carton and financial breakdown
  piecesPerCarton: number;
  totalCartons: number;
  totalExtraPieces: number;
  soldCartons: number;
  soldExtraPieces: number;
  remainingCartons: number;
  remainingExtraPieces: number;
  soldPurchaseAmount: number;
  remainingPurchaseAmount: number;
}

export interface InvoiceSellThroughSummary {
  invoiceId: string;
  totalPieces: number;
  totalPurchasedPieces: number;
  soldPieces: number;
  totalSoldPieces: number;
  remainingPieces: number;
  percentSold: number;
  percentRemaining: number;
  isFullySold: boolean;
  totalRealizedProfit: number;
  totalPotentialProfit: number;
  // Comprehensive Carton Breakdown
  totalPurchasedCartons: number;
  totalPurchasedExtraPieces: number;
  totalSoldCartons: number;
  totalSoldExtraPieces: number;
  totalRemainingCartons: number;
  totalRemainingExtraPieces: number;
  // Comprehensive Tomans Breakdown
  totalInvoiceCost: number;
  totalSoldCost: number;
  totalRemainingCost: number;
  totalSoldRevenue: number;
  itemsSellThrough: ItemSellThroughInfo[];
}

/**
 * Converts a Jalali (Persian) date to Gregorian [year, month, day]
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  return [gy, gm, gd];
}

/**
 * Standardizes any invoice date, time, and timestamp into a unified Epoch Milliseconds timestamp.
 * This guarantees exact chronological sorting whether invoices have Persian dates or Unix timestamps.
 */
export function getInvoiceNormalizedTimestamp(inv: Invoice | { date?: string; time?: string; createdAt?: number; timestamp?: number }): number {
  if (!inv) return 0;

  // 1. If invoice has a valid date string (e.g. "1403/07/04" or "1405/05/14" or "2026/09/24")
  if (inv.date && typeof inv.date === 'string' && inv.date.includes('/')) {
    const cleanDate = inv.date.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
    const dateParts = cleanDate.split('/').map(p => parseInt(p.trim().replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
    
    if (dateParts.length === 3) {
      let [y, m, d] = dateParts;
      let hour = 12;
      let minute = 0;
      let second = 0;

      if (inv.time && typeof inv.time === 'string') {
        const cleanTime = inv.time.replace(/[۰-۹]/g, digit => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit).toString());
        const timeParts = cleanTime.split(':').map(p => parseInt(p.trim().replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
        if (timeParts.length >= 1) hour = Math.min(23, Math.max(0, timeParts[0]));
        if (timeParts.length >= 2) minute = Math.min(59, Math.max(0, timeParts[1]));
        if (timeParts.length >= 3) second = Math.min(59, Math.max(0, timeParts[2]));
      }

      // If Persian year (e.g. 1300 to 1500)
      if (y >= 1300 && y <= 1500) {
        const [gy, gm, gd] = jalaliToGregorian(y, m, d);
        return new Date(gy, gm - 1, gd, hour, minute, second).getTime();
      } else if (y >= 1970 && y <= 2100) {
        // Gregorian year
        return new Date(y, m - 1, d, hour, minute, second).getTime();
      }
    }
  }

  // 2. Fallback to createdAt or timestamp if date string was not present
  if (inv.createdAt && typeof inv.createdAt === 'number' && inv.createdAt > 100000000000) {
    return inv.createdAt;
  }
  if (inv.timestamp && typeof inv.timestamp === 'number' && inv.timestamp > 100000000000) {
    return inv.timestamp;
  }

  return 0;
}

/**
 * Calculates strict FIFO sell-through percentage and realized profit for a purchase (inward) invoice.
 * A purchase batch can ONLY be consumed by sales invoices occurring strictly AFTER this purchase invoice was created.
 */
export function calculateInwardInvoiceSellThrough(
  purchaseInvoice: Invoice,
  allInvoices: Invoice[],
  products: Product[]
): InvoiceSellThroughSummary {
  if (!purchaseInvoice || !purchaseInvoice.items || purchaseInvoice.items.length === 0) {
    return {
      invoiceId: purchaseInvoice?.id || '',
      totalPieces: 0,
      totalPurchasedPieces: 0,
      soldPieces: 0,
      totalSoldPieces: 0,
      remainingPieces: 0,
      percentSold: 0,
      percentRemaining: 100,
      isFullySold: false,
      totalRealizedProfit: 0,
      totalPotentialProfit: 0,
      totalPurchasedCartons: 0,
      totalPurchasedExtraPieces: 0,
      totalSoldCartons: 0,
      totalSoldExtraPieces: 0,
      totalRemainingCartons: 0,
      totalRemainingExtraPieces: 0,
      totalInvoiceCost: 0,
      totalSoldCost: 0,
      totalRemainingCost: 0,
      totalSoldRevenue: 0,
      itemsSellThrough: []
    };
  }

  const targetScore = getInvoiceNormalizedTimestamp(purchaseInvoice);

  // Filter confirmed, non-draft purchases and sales
  const nonDraftPurchases = (allInvoices || [])
    .filter(inv => inv.type === 'purchase' && !inv.isDraft)
    .sort((a, b) => getInvoiceNormalizedTimestamp(a) - getInvoiceNormalizedTimestamp(b));

  const nonDraftSales = (allInvoices || [])
    .filter(inv => inv.type === 'sale' && !inv.isDraft)
    .sort((a, b) => getInvoiceNormalizedTimestamp(a) - getInvoiceNormalizedTimestamp(b));

  const itemsSellThrough: ItemSellThroughInfo[] = purchaseInvoice.items.map((item) => {
    const totalPieces = Math.max(0, item.totalPieces || 0);
    const prod = (products || []).find(p => 
      (item.productId && p.id === item.productId) || 
      (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
    );

    const unitPurchasePrice = (item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0)
      ? item.unitPurchasePrice
      : (prod?.purchasePrice || 0);

    const unitSellingPrice = (item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
      ? item.unitSellingPrice 
      : (prod?.sellingPrice || Math.round(unitPurchasePrice * 1.25));

    const unitProfit = Math.max(0, unitSellingPrice - unitPurchasePrice);
    const potentialProfit = unitProfit * totalPieces;

    const packsCount = item.packsCount || prod?.packsPerCarton || 1;
    const piecesPerPack = item.piecesPerPack || prod?.piecesPerPack || 1;
    const piecesPerCarton = (item.piecesPerCarton && item.piecesPerCarton > 0)
      ? item.piecesPerCarton
      : (prod?.piecesPerCarton && prod.piecesPerCarton > 0
        ? prod.piecesPerCarton
        : (packsCount * piecesPerPack) || 1);

    const isCartonPackaging = piecesPerCarton > 1 && !item.isUnpackaged && !prod?.isUnpackaged;
    const totalCartons = isCartonPackaging ? Math.floor(totalPieces / piecesPerCarton) : 0;
    const totalExtraPieces = isCartonPackaging ? (totalPieces % piecesPerCarton) : totalPieces;

    if (totalPieces === 0) {
      return {
        itemId: item.id,
        productId: item.productId || prod?.id || '',
        productName: item.productName || prod?.name || '',
        totalPieces: 0,
        soldPieces: 0,
        remainingPieces: 0,
        percentSold: 0,
        percentRemaining: 100,
        isFullySold: false,
        realizedProfit: 0,
        potentialProfit: 0,
        unitPurchasePrice,
        unitSellingPrice,
        piecesPerCarton,
        totalCartons: 0,
        totalExtraPieces: 0,
        soldCartons: 0,
        soldExtraPieces: 0,
        remainingCartons: 0,
        remainingExtraPieces: 0,
        soldPurchaseAmount: 0,
        remainingPurchaseAmount: 0
      };
    }

    // Build FIFO queue of all purchase batches for this product
    interface BatchRecord {
      invoiceId: string;
      score: number;
      initialPieces: number;
      remainingPieces: number;
      unitPurchasePrice: number;
      unitSellingPrice: number;
    }

    const batches: BatchRecord[] = [];
    for (const pInv of nonDraftPurchases) {
      const pIt = pInv.items.find(it => 
        (item.productId && it.productId === item.productId) ||
        (prod?.id && it.productId === prod.id) ||
        (it.productName && item.productName && it.productName.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );
      if (pIt && pIt.totalPieces > 0) {
        const uBuy = (pIt.unitPurchasePrice !== undefined && pIt.unitPurchasePrice > 0) 
          ? pIt.unitPurchasePrice 
          : (prod?.purchasePrice || 0);
        const uSell = (pIt.unitSellingPrice !== undefined && pIt.unitSellingPrice > 0)
          ? pIt.unitSellingPrice
          : (prod?.sellingPrice || uBuy);

        batches.push({
          invoiceId: pInv.id,
          score: getInvoiceNormalizedTimestamp(pInv),
          initialPieces: pIt.totalPieces,
          remainingPieces: pIt.totalPieces,
          unitPurchasePrice: uBuy,
          unitSellingPrice: uSell
        });
      }
    }

    // If purchaseInvoice is not yet in nonDraftPurchases (e.g. previewing / editing new invoice), add it
    if (!batches.some(b => b.invoiceId === purchaseInvoice.id)) {
      batches.push({
        invoiceId: purchaseInvoice.id,
        score: targetScore,
        initialPieces: totalPieces,
        remainingPieces: totalPieces,
        unitPurchasePrice,
        unitSellingPrice
      });
      batches.sort((a, b) => a.score - b.score);
    }

    // Track realized profit specifically earned by sales consuming OUR target batch
    let batchRealizedProfit = 0;

    // Simulate FIFO sales consumption chronologically
    for (const sInv of nonDraftSales) {
      const sScore = getInvoiceNormalizedTimestamp(sInv);
      const sIt = sInv.items.find(it => 
        (item.productId && it.productId === item.productId) ||
        (prod?.id && it.productId === prod.id) ||
        (it.productName && item.productName && it.productName.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );
      if (!sIt || !sIt.totalPieces || sIt.totalPieces <= 0) continue;

      let neededPieces = sIt.totalPieces;
      const saleUnitSellPrice = (sIt.unitSellingPrice !== undefined && sIt.unitSellingPrice > 0)
        ? sIt.unitSellingPrice
        : (sIt.unitPrice && sIt.unitPrice > 0 ? sIt.unitPrice : unitSellingPrice);

      // Consume from available batches that arrived STRICTLY BEFORE or AT the same time as this sale
      for (const batch of batches) {
        if (neededPieces <= 0) break;
        // If the batch arrived strictly AFTER the sale occurred, it cannot be consumed by this past sale!
        if (batch.score > sScore) {
          continue;
        }
        if (batch.remainingPieces > 0) {
          const consume = Math.min(neededPieces, batch.remainingPieces);
          batch.remainingPieces -= consume;
          neededPieces -= consume;

          // If this consumed pieces from OUR target purchase invoice, record realized profit
          if (batch.invoiceId === purchaseInvoice.id) {
            const actualProfitPerUnit = Math.max(0, saleUnitSellPrice - batch.unitPurchasePrice);
            batchRealizedProfit += Math.round(consume * actualProfitPerUnit);
          }
        }
      }
    }

    // Look up our batch remaining
    const myBatch = batches.find(b => b.invoiceId === purchaseInvoice.id);
    const remainingPieces = myBatch ? Math.min(totalPieces, Math.max(0, myBatch.remainingPieces)) : totalPieces;
    const soldPieces = Math.max(0, totalPieces - remainingPieces);
    const percentSold = totalPieces > 0 ? Math.min(100, Math.max(0, Math.round((soldPieces / totalPieces) * 100))) : 0;
    const percentRemaining = 100 - percentSold;
    const isFullySold = remainingPieces === 0 && totalPieces > 0;

    // Strict safety guard: If soldPieces is 0, realized profit MUST be 0!
    const finalRealizedProfit = soldPieces > 0 ? batchRealizedProfit : 0;

    const soldCartons = isCartonPackaging ? Math.floor(soldPieces / piecesPerCarton) : 0;
    const soldExtraPieces = isCartonPackaging ? (soldPieces % piecesPerCarton) : soldPieces;

    const remainingCartons = isCartonPackaging ? Math.floor(remainingPieces / piecesPerCarton) : 0;
    const remainingExtraPieces = isCartonPackaging ? (remainingPieces % piecesPerCarton) : remainingPieces;

    const soldPurchaseAmount = soldPieces * unitPurchasePrice;
    const remainingPurchaseAmount = remainingPieces * unitPurchasePrice;

    return {
      itemId: item.id,
      productId: item.productId || prod?.id || '',
      productName: item.productName || prod?.name || '',
      totalPieces,
      soldPieces,
      remainingPieces,
      percentSold,
      percentRemaining,
      isFullySold,
      realizedProfit: finalRealizedProfit,
      potentialProfit,
      unitPurchasePrice,
      unitSellingPrice,
      piecesPerCarton,
      totalCartons,
      totalExtraPieces,
      soldCartons,
      soldExtraPieces,
      remainingCartons,
      remainingExtraPieces,
      soldPurchaseAmount,
      remainingPurchaseAmount
    };
  });

  const totalPieces = itemsSellThrough.reduce((sum, it) => sum + it.totalPieces, 0);
  const soldPieces = itemsSellThrough.reduce((sum, it) => sum + it.soldPieces, 0);
  const remainingPieces = itemsSellThrough.reduce((sum, it) => sum + it.remainingPieces, 0);
  const percentSold = totalPieces > 0 ? Math.min(100, Math.max(0, Math.round((soldPieces / totalPieces) * 100))) : 0;
  const percentRemaining = 100 - percentSold;
  const isFullySold = remainingPieces === 0 && totalPieces > 0;
  const totalRealizedProfit = soldPieces > 0 ? itemsSellThrough.reduce((sum, it) => sum + it.realizedProfit, 0) : 0;

  const totalPurchasedCartons = itemsSellThrough.reduce((sum, it) => sum + (it.totalCartons || 0), 0);
  const totalPurchasedExtraPieces = itemsSellThrough.reduce((sum, it) => sum + (it.totalExtraPieces || 0), 0);
  const totalSoldCartons = itemsSellThrough.reduce((sum, it) => sum + (it.soldCartons || 0), 0);
  const totalSoldExtraPieces = itemsSellThrough.reduce((sum, it) => sum + (it.soldExtraPieces || 0), 0);
  const totalRemainingCartons = itemsSellThrough.reduce((sum, it) => sum + (it.remainingCartons || 0), 0);
  const totalRemainingExtraPieces = itemsSellThrough.reduce((sum, it) => sum + (it.remainingExtraPieces || 0), 0);

  const grossCost = itemsSellThrough.reduce((sum, it) => sum + (it.totalPieces * it.unitPurchasePrice), 0);
  const discountAmount = purchaseInvoice.hasDiscount ? (purchaseInvoice.discount || 0) : 0;
  
  // Freight, handling, waste, and all expenses associated with this shipment directly reduce profit
  const freightAndExpensesIncurred = (purchaseInvoice.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const invoiceTax = purchaseInvoice.tax || 0;

  // True acquisition cost of the shipment = (Gross Cost - Supplier Discount + Tax) + Incurred Freight & Expenses
  const totalInvoiceCost = Math.max(0, grossCost - discountAmount + invoiceTax) + freightAndExpensesIncurred;
  const totalEstimatedSales = itemsSellThrough.reduce((sum, it) => sum + (it.totalPieces * it.unitSellingPrice), 0);
  const totalPotentialProfit = totalEstimatedSales - totalInvoiceCost;

  const totalSoldCost = itemsSellThrough.reduce((sum, it) => sum + (it.soldPurchaseAmount || 0), 0);
  const totalRemainingCost = itemsSellThrough.reduce((sum, it) => sum + (it.remainingPurchaseAmount || 0), 0);
  const totalSoldRevenue = totalSoldCost + totalRealizedProfit;

  return {
    invoiceId: purchaseInvoice.id,
    totalPieces,
    totalPurchasedPieces: totalPieces,
    soldPieces,
    totalSoldPieces: soldPieces,
    remainingPieces,
    percentSold,
    percentRemaining,
    isFullySold,
    totalRealizedProfit,
    totalPotentialProfit,
    totalPurchasedCartons,
    totalPurchasedExtraPieces,
    totalSoldCartons,
    totalSoldExtraPieces,
    totalRemainingCartons,
    totalRemainingExtraPieces,
    totalInvoiceCost,
    totalSoldCost,
    totalRemainingCost,
    totalSoldRevenue,
    itemsSellThrough
  };
}

/**
 * Formats carton and extra pieces cleanly into Persian text
 */
export function formatCartonPiecesSummary(cartons: number, extraPieces: number, unitTitle: string = 'دانه'): string {
  if (cartons > 0 && extraPieces > 0) {
    return `${cartons} کارتن و ${extraPieces} ${unitTitle}`;
  }
  if (cartons > 0) {
    return `${cartons} کارتن`;
  }
  return `${extraPieces} ${unitTitle}`;
}
