import { Invoice, InvoiceItem, Product } from '../types';

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
}

export interface InvoiceSellThroughSummary {
  invoiceId: string;
  totalPieces: number;
  soldPieces: number;
  remainingPieces: number;
  percentSold: number;
  percentRemaining: number;
  isFullySold: boolean;
  totalRealizedProfit: number;
  totalPotentialProfit: number;
  itemsSellThrough: ItemSellThroughInfo[];
}

/**
 * Calculates FIFO sell-through percentage and realized profit for a purchase (inward) invoice.
 * Respects overall sales, purchase batches, and current warehouse stock.
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
      soldPieces: 0,
      remainingPieces: 0,
      percentSold: 0,
      percentRemaining: 100,
      isFullySold: false,
      totalRealizedProfit: 0,
      totalPotentialProfit: 0,
      itemsSellThrough: []
    };
  }

  // All valid confirmed purchase invoices sorted chronologically (FIFO)
  const nonDraftPurchases = allInvoices
    .filter(inv => inv.type === 'purchase' && !inv.isDraft)
    .sort((a, b) => {
      const timeA = a.timestamp || new Date(a.date.replace(/\//g, '-')).getTime() || 0;
      const timeB = b.timestamp || new Date(b.date.replace(/\//g, '-')).getTime() || 0;
      return timeA - timeB;
    });

  // All sales invoices
  const salesInvoices = allInvoices.filter(inv => inv.type === 'sale' && !inv.isDraft);

  const itemsSellThrough: ItemSellThroughInfo[] = purchaseInvoice.items.map((item) => {
    const totalPieces = Math.max(0, item.totalPieces || 0);
    const prod = products.find(p => 
      (item.productId && p.id === item.productId) || 
      (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
    );

    const unitPurchasePrice = item.unitPurchasePrice > 0 ? item.unitPurchasePrice : (prod?.purchasePrice || 0);
    const unitSellingPrice = item.unitSellingPrice > 0 
      ? item.unitSellingPrice 
      : (prod?.sellingPrice || Math.round(unitPurchasePrice * 1.25));

    const unitProfit = Math.max(0, unitSellingPrice - unitPurchasePrice);
    const potentialProfit = unitProfit * totalPieces;

    if (totalPieces === 0) {
      return {
        itemId: item.id,
        productId: item.productId || prod?.id || '',
        productName: item.productName || prod?.name || '',
        totalPieces: 0,
        soldPieces: 0,
        remainingPieces: 0,
        percentSold: 100,
        percentRemaining: 0,
        isFullySold: true,
        realizedProfit: 0,
        potentialProfit: 0,
        unitPurchasePrice,
        unitSellingPrice
      };
    }

    // Determine current warehouse stock for this product
    const currentStock = Math.max(0, prod ? prod.stockPieces : 0);

    // Calculate total historical sales for this product across all sales invoices
    const totalHistoricalSales = salesInvoices.reduce((sum, saleInv) => {
      const saleItem = saleInv.items.find(sIt => 
        (item.productId && sIt.productId === item.productId) ||
        (prod?.id && sIt.productId === prod.id) ||
        (sIt.productName && item.productName && sIt.productName.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );
      return sum + (saleItem ? Math.max(0, saleItem.totalPieces || 0) : 0);
    }, 0);

    // Calculate total purchases before this invoice for this product
    let priorPurchases = 0;
    for (const pInv of nonDraftPurchases) {
      if (pInv.id === purchaseInvoice.id) break;
      const pIt = pInv.items.find(it => 
        (item.productId && it.productId === item.productId) ||
        (prod?.id && it.productId === prod.id) ||
        (it.productName && item.productName && it.productName.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );
      if (pIt) {
        priorPurchases += Math.max(0, pIt.totalPieces || 0);
      }
    }

    let soldPieces = 0;
    if (currentStock === 0) {
      // Stock is completely depleted in warehouse -> 100% sold
      soldPieces = totalPieces;
    } else if (totalHistoricalSales > 0) {
      // FIFO allocation based on historical sales
      const salesReachingThisBatch = Math.max(0, totalHistoricalSales - priorPurchases);
      soldPieces = Math.min(totalPieces, salesReachingThisBatch);
    } else {
      // If no explicit sales invoices recorded yet but warehouse stock has decreased below total pieces
      const estimatedSold = Math.max(0, totalPieces - currentStock);
      soldPieces = Math.min(totalPieces, estimatedSold);
    }

    const remainingPieces = Math.max(0, totalPieces - soldPieces);
    const percentSold = totalPieces > 0 ? Math.min(100, Math.max(0, Math.round((soldPieces / totalPieces) * 100))) : 100;
    const percentRemaining = 100 - percentSold;
    const isFullySold = remainingPieces === 0 || percentSold >= 100;
    const realizedProfit = Math.round(soldPieces * unitProfit);

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
      realizedProfit,
      potentialProfit,
      unitPurchasePrice,
      unitSellingPrice
    };
  });

  const totalPieces = itemsSellThrough.reduce((sum, it) => sum + it.totalPieces, 0);
  const soldPieces = itemsSellThrough.reduce((sum, it) => sum + it.soldPieces, 0);
  const remainingPieces = itemsSellThrough.reduce((sum, it) => sum + it.remainingPieces, 0);
  const percentSold = totalPieces > 0 ? Math.min(100, Math.max(0, Math.round((soldPieces / totalPieces) * 100))) : 100;
  const percentRemaining = 100 - percentSold;
  const isFullySold = remainingPieces === 0 || percentSold >= 100;
  const totalRealizedProfit = itemsSellThrough.reduce((sum, it) => sum + it.realizedProfit, 0);
  const totalPotentialProfit = itemsSellThrough.reduce((sum, it) => sum + it.potentialProfit, 0);

  return {
    invoiceId: purchaseInvoice.id,
    totalPieces,
    soldPieces,
    remainingPieces,
    percentSold,
    percentRemaining,
    isFullySold,
    totalRealizedProfit,
    totalPotentialProfit,
    itemsSellThrough
  };
}
