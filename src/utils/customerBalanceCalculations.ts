import { Customer, Invoice, CustomerPayment, ProductReturn } from '../types';
import { getNetReturnAmount } from './formatters';

/**
 * Calculates the exact unpaid debt portion from a single sale invoice.
 * - Cash invoices (settled): 0
 * - Partial invoices: remainingAmount or (finalAmount - paidAmount)
 * - Credit / standard sales invoices: finalAmount
 */
export function getInvoiceCreditDebtAmount(inv: Invoice): number {
  if (!inv || inv.isDraft || inv.type !== 'sale') return 0;
  
  // Calculate precise effective final amount from invoice items with strict priority on custom unitSellingPrice
  const computedSubtotal = (inv.items && inv.items.length > 0)
    ? inv.items.reduce((s, it) => {
        const uPrice = (it.unitSellingPrice !== undefined && it.unitSellingPrice > 0)
          ? it.unitSellingPrice
          : (it.totalPieces > 0 ? Math.round((it.totalPrice || 0) / it.totalPieces) : 0);
        return s + (uPrice > 0 ? uPrice * it.totalPieces : (it.totalPrice || 0));
      }, 0)
    : (inv.subtotal || 0);
  const computedFinal = Math.max(0, computedSubtotal - (inv.discount || 0) + (inv.tax || 0) - (inv.offsetReturnsTotal || 0));
  const finalAmt = computedFinal > 0 ? computedFinal : (Number(inv.finalAmount) || 0);

  if (finalAmt <= 0) return 0;
  
  // Explicitly fully paid cash invoice
  if (inv.paymentStatus === 'cash' || (inv.paymentMethod?.includes('نقدی') && !inv.paymentMethod?.includes('نسیه') && !inv.paymentMethod?.includes('غیر') && !inv.paymentStatus && (!inv.paidAmount || inv.paidAmount >= finalAmt))) {
    return 0;
  }
  
  // Partial payment in invoice
  if (inv.paymentStatus === 'partial' || (inv.paidAmount !== undefined && inv.paidAmount > 0)) {
    if (inv.remainingAmount !== undefined && inv.finalAmount === finalAmt) {
      return Math.max(0, Number(inv.remainingAmount) || 0);
    }
    return Math.max(0, finalAmt - (Number(inv.paidAmount) || 0));
  }
  
  // Credit / Unsettled sales invoice
  return finalAmt;
}

/**
 * Finds all finalized sale invoices for a given customer
 */
export function getCustomerSalesInvoices(customer: Customer, invoices: Invoice[] = []): Invoice[] {
  if (!customer) return [];
  const custName = customer.name?.trim().toLowerCase();
  const custPhone = customer.phone?.trim();
  
  return invoices.filter(inv => {
    if (!inv || inv.isDraft || inv.type !== 'sale') return false;
    if ((inv as any).customerId && (inv as any).customerId === customer.id) return true;
    if (custName && inv.customerName && inv.customerName.trim().toLowerCase() === custName) return true;
    if (custPhone && inv.customerPhone && inv.customerPhone.trim() === custPhone) return true;
    return false;
  });
}

/**
 * Finds all finalized purchase invoices from a given supplier
 */
export function getCustomerPurchaseInvoices(customer: Customer, invoices: Invoice[] = []): Invoice[] {
  if (!customer) return [];
  const custName = customer.name?.trim().toLowerCase();
  const custPhone = customer.phone?.trim();
  
  return invoices.filter(inv => {
    if (!inv || inv.isDraft || inv.type !== 'purchase') return false;
    if ((inv as any).customerId && (inv as any).customerId === customer.id) return true;
    if (custName && inv.customerName && inv.customerName.trim().toLowerCase() === custName) return true;
    if (custPhone && inv.customerPhone && inv.customerPhone.trim() === custPhone) return true;
    return false;
  });
}

/**
 * Calculates total credit debt to supplier from purchase invoices
 * (unpaid portion of goods purchased from supplier)
 */
export function getCustomerCreditPurchasesTotal(customer: Customer, invoices: Invoice[] = []): number {
  const purchaseInvoices = getCustomerPurchaseInvoices(customer, invoices);
  return purchaseInvoices.reduce((sum, inv) => {
    const finalAmt = Number(inv.finalAmount) || 0;
    if (finalAmt <= 0) return sum;
    if (inv.paymentStatus === 'cash') return sum;
    if (inv.paymentStatus === 'partial' || (inv.paidAmount !== undefined && inv.paidAmount > 0)) {
      const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : (finalAmt - (inv.paidAmount || 0));
      return sum + Math.max(0, Number(remaining) || 0);
    }
    return sum + finalAmt;
  }, 0);
}

/**
 * Calculates the total sales invoice amount (full value of all invoices)
 */
export function getCustomerTotalInvoicedAmount(customer: Customer, invoices: Invoice[] = []): number {
  const custInvoices = getCustomerSalesInvoices(customer, invoices);
  return custInvoices.reduce((sum, inv) => {
    const computedSubtotal = (inv.items && inv.items.length > 0)
      ? inv.items.reduce((s, it) => {
          const uPrice = (it.unitSellingPrice !== undefined && it.unitSellingPrice > 0)
            ? it.unitSellingPrice
            : (it.totalPieces > 0 ? Math.round((it.totalPrice || 0) / it.totalPieces) : 0);
          return s + (uPrice > 0 ? uPrice * it.totalPieces : (it.totalPrice || 0));
        }, 0)
      : (inv.subtotal || 0);
    const computedFinal = Math.max(0, computedSubtotal - (inv.discount || 0) + (inv.tax || 0) - (inv.offsetReturnsTotal || 0));
    return sum + (computedFinal > 0 ? computedFinal : (Number(inv.finalAmount) || 0));
  }, 0);
}

/**
 * Calculates the total credit debt generated by sales invoices for a customer
 */
export function getCustomerCreditSalesTotal(customer: Customer, invoices: Invoice[] = []): number {
  const custInvoices = getCustomerSalesInvoices(customer, invoices);
  return custInvoices.reduce((sum, inv) => sum + getInvoiceCreditDebtAmount(inv), 0);
}

/**
 * Finds all payments/receipts registered for a customer
 */
export function getCustomerPayments(customer: Customer, payments: CustomerPayment[] = []): CustomerPayment[] {
  if (!customer) return [];
  const custName = customer.name?.trim().toLowerCase();
  return payments.filter(p => {
    if (!p) return false;
    if (p.customerId && p.customerId === customer.id) return true;
    if (custName && p.customerName && p.customerName.trim().toLowerCase() === custName) return true;
    return false;
  });
}

/**
 * Calculates total customer deposits / payments received (which DEDUCTS from customer debt)
 */
export function getCustomerDepositsTotal(customer: Customer, payments: CustomerPayment[] = []): number {
  const custPayments = getCustomerPayments(customer, payments);
  return custPayments
    .filter(p => (Number(p.amount) || 0) > 0)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

/**
 * Calculates total manual debts added (which INCREASES customer debt)
 */
export function getCustomerManualDebtsTotal(customer: Customer, payments: CustomerPayment[] = []): number {
  const custPayments = getCustomerPayments(customer, payments);
  return custPayments
    .filter(p => (Number(p.amount) || 0) < 0)
    .reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0);
}

/**
 * Calculates total UNSETTLED returns from customer (which DEDUCTS from customer debt on ledger)
 * Note: If a return is settled/refunded in cash (isRefunded === true), cash was paid directly to the customer,
 * so it does NOT reduce their remaining unpaid invoice debt balance on the ledger.
 */
export function getCustomerReturnsFromTotal(customer: Customer, productReturns: ProductReturn[] = []): number {
  if (!customer) return 0;
  const custName = customer.name?.trim().toLowerCase();
  return (productReturns || [])
    .filter(r => 
      r && r.type === 'from_customer' && !r.isRefunded &&
      ((r.customerId && r.customerId === customer.id) || (custName && r.customerName && r.customerName.trim().toLowerCase() === custName))
    )
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);
}

/**
 * Calculates total CASH-SETTLED returns from customer (where money was paid back to customer)
 */
export function getCustomerSettledReturnsFromTotal(customer: Customer, productReturns: ProductReturn[] = []): number {
  if (!customer) return 0;
  const custName = customer.name?.trim().toLowerCase();
  return (productReturns || [])
    .filter(r => 
      r && r.type === 'from_customer' && r.isRefunded &&
      ((r.customerId && r.customerId === customer.id) || (custName && r.customerName && r.customerName.trim().toLowerCase() === custName))
    )
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);
}

/**
 * Calculates ALL returns from customer (settled + unsettled)
 */
export function getCustomerAllReturnsFromTotal(customer: Customer, productReturns: ProductReturn[] = []): number {
  if (!customer) return 0;
  const custName = customer.name?.trim().toLowerCase();
  return (productReturns || [])
    .filter(r => 
      r && r.type === 'from_customer' &&
      ((r.customerId && r.customerId === customer.id) || (custName && r.customerName && r.customerName.trim().toLowerCase() === custName))
    )
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);
}

/**
 * Calculates total returns to supplier (unsettled)
 */
export function getCustomerReturnsToSupplierTotal(customer: Customer, productReturns: ProductReturn[] = []): number {
  if (!customer) return 0;
  const custName = customer.name?.trim().toLowerCase();
  return (productReturns || [])
    .filter(r => 
      r && r.type === 'to_supplier' && !r.isRefunded &&
      ((r.customerId && r.customerId === customer.id) || (custName && r.customerName && r.customerName.trim().toLowerCase() === custName))
    )
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);
}

/**
 * Calculates the exact LIVE balance for a customer/supplier.
 * POSITIVE = Customer owes business (بدهکار به ما)
 * ZERO = Settled (تسویه / بی‌حساب)
 * NEGATIVE = Business owes supplier/customer (بستانکار از ما / ما بدهکار به تامین‌کننده)
 * 
 * Standard Accounting Formula:
 * Live Balance = Initial Balance + Credit Sales + Manual Debts - Payments/Deposits - Unsettled Customer Returns + Unsettled Supplier Returns - Credit Purchases From Supplier
 */
export function calculateCustomerLiveBalance(
  customer: Customer,
  invoices: Invoice[] = [],
  payments: CustomerPayment[] = [],
  productReturns: ProductReturn[] = []
): number {
  if (!customer) return 0;
  const initial = Number(customer.initialBalance) || 0;
  const creditSales = getCustomerCreditSalesTotal(customer, invoices);
  const manualDebts = getCustomerManualDebtsTotal(customer, payments);
  const deposits = getCustomerDepositsTotal(customer, payments);
  const returnsFromCust = getCustomerAllReturnsFromTotal(customer, productReturns);
  const returnsToSupp = getCustomerReturnsToSupplierTotal(customer, productReturns);
  const creditPurchases = getCustomerCreditPurchasesTotal(customer, invoices);

  return initial + creditSales + manualDebts - deposits - returnsFromCust + returnsToSupp - creditPurchases;
}

/**
 * Detailed financial summary for a single customer or supplier
 */
export interface CustomerFinanceDetails {
  customer: Customer;
  initialBalance: number;
  totalInvoiced: number;
  creditSalesTotal: number;
  creditPurchasesTotal: number;
  depositsTotal: number;
  manualDebtsTotal: number;
  unsettledReturnsTotal: number;
  settledReturnsTotal: number;
  allReturnsTotal: number;
  returnsToSupplierTotal: number;
  grossDebts: number;           // بدهکاری کل ناخالص (مانده اولیه مثبت + خریدهای نسیه + بدهی‌های دستی)
  grossCredits: number;         // مجموع بستانکاری و واریزی‌ها (مانده اولیه منفی + کل واریزی‌ها + مرجوعی‌های تسویه نشده + خریدهای نسیه از تامین‌کننده)
  liveBalance: number;          // مانده حساب زنده و نهایی
  status: 'debtor' | 'creditor' | 'settled';
  debtAmount: number;           // بدهکاری مانده مشتری (اگر مثبت باشد)
  creditAmount: number;         // بستانکاری مانده طرف‌حساب/تامین‌کننده (اگر منفی باشد)
}

export function getCustomerFinanceDetails(
  customer: Customer,
  invoices: Invoice[] = [],
  payments: CustomerPayment[] = [],
  productReturns: ProductReturn[] = []
): CustomerFinanceDetails {
  const initial = Number(customer?.initialBalance) || 0;
  const totalInvoiced = getCustomerTotalInvoicedAmount(customer, invoices);
  const creditSalesTotal = getCustomerCreditSalesTotal(customer, invoices);
  const creditPurchasesTotal = getCustomerCreditPurchasesTotal(customer, invoices);
  const depositsTotal = getCustomerDepositsTotal(customer, payments);
  const manualDebtsTotal = getCustomerManualDebtsTotal(customer, payments);
  const unsettledReturnsTotal = getCustomerReturnsFromTotal(customer, productReturns);
  const settledReturnsTotal = getCustomerSettledReturnsFromTotal(customer, productReturns);
  const allReturnsTotal = getCustomerAllReturnsFromTotal(customer, productReturns);
  const returnsToSupplierTotal = getCustomerReturnsToSupplierTotal(customer, productReturns);
  const liveBalance = calculateCustomerLiveBalance(customer, invoices, payments, productReturns);

  const initialDebt = initial > 0 ? initial : 0;
  const initialCredit = initial < 0 ? Math.abs(initial) : 0;

  const grossDebts = initialDebt + creditSalesTotal + manualDebtsTotal + returnsToSupplierTotal;
  const grossCredits = initialCredit + depositsTotal + unsettledReturnsTotal + creditPurchasesTotal;

  let status: 'debtor' | 'creditor' | 'settled' = 'settled';
  if (liveBalance > 0) status = 'debtor';
  else if (liveBalance < 0) status = 'creditor';

  return {
    customer,
    initialBalance: initial,
    totalInvoiced,
    creditSalesTotal,
    creditPurchasesTotal,
    depositsTotal,
    manualDebtsTotal,
    unsettledReturnsTotal,
    settledReturnsTotal,
    allReturnsTotal,
    returnsToSupplierTotal,
    grossDebts,
    grossCredits,
    liveBalance,
    status,
    debtAmount: liveBalance > 0 ? liveBalance : 0,
    creditAmount: liveBalance < 0 ? Math.abs(liveBalance) : 0
  };
}

/**
 * Complete Market & Customer Receivables/Payables breakdown
 */
export interface MarketFinancialsSummary {
  debtorsCount: number;
  creditorsCount: number;
  settledCount: number;
  grossDebtorsReceivables: number; // کل طلب ناخالص از مشتریان بدهکار
  totalCustomerCredits: number;    // کل بستانکاری مشتریان (پیش‌پرداخت/طلب مشتریان از ما)
  netMarketReceivables: number;    // خالص طلب بازار = طلب از بدهکاران منهای بستانکاری مشتریان
  allDetails: CustomerFinanceDetails[];
}

export function calculateMarketFinancialsSummary(
  customers: Customer[] = [],
  invoices: Invoice[] = [],
  payments: CustomerPayment[] = [],
  productReturns: ProductReturn[] = []
): MarketFinancialsSummary {
  let debtorsCount = 0;
  let creditorsCount = 0;
  let settledCount = 0;
  let grossDebtorsReceivables = 0;
  let totalCustomerCredits = 0;

  const allDetails = (customers || []).map(cust => {
    const details = getCustomerFinanceDetails(cust, invoices, payments, productReturns);
    if (details.status === 'debtor') {
      debtorsCount++;
      grossDebtorsReceivables += details.debtAmount;
    } else if (details.status === 'creditor') {
      creditorsCount++;
      totalCustomerCredits += details.creditAmount;
    } else {
      settledCount++;
    }
    return details;
  });

  const netMarketReceivables = grossDebtorsReceivables - totalCustomerCredits;

  return {
    debtorsCount,
    creditorsCount,
    settledCount,
    grossDebtorsReceivables,
    totalCustomerCredits,
    netMarketReceivables,
    allDetails
  };
}

/**
 * Calculates total market credit receivables across ALL customers.
 * Sum of all positive customer balances (customers who owe money).
 */
export function calculateTotalMarketReceivables(
  customers: Customer[] = [],
  invoices: Invoice[] = [],
  payments: CustomerPayment[] = [],
  productReturns: ProductReturn[] = []
): number {
  return (customers || []).reduce((sum, cust) => {
    const bal = calculateCustomerLiveBalance(cust, invoices, payments, productReturns);
    return bal > 0 ? sum + bal : sum;
  }, 0);
}

/**
 * Calculates total customer creditor liabilities (negative balances)
 */
export function calculateTotalCustomerCredits(
  customers: Customer[] = [],
  invoices: Invoice[] = [],
  payments: CustomerPayment[] = [],
  productReturns: ProductReturn[] = []
): number {
  return (customers || []).reduce((sum, cust) => {
    const bal = calculateCustomerLiveBalance(cust, invoices, payments, productReturns);
    return bal < 0 ? sum + Math.abs(bal) : sum;
  }, 0);
}

/**
 * Calculates NET market receivables (Gross Receivables - Customer Credits)
 */
export function calculateNetMarketReceivables(
  customers: Customer[] = [],
  invoices: Invoice[] = [],
  payments: CustomerPayment[] = [],
  productReturns: ProductReturn[] = []
): number {
  const gross = calculateTotalMarketReceivables(customers, invoices, payments, productReturns);
  const credits = calculateTotalCustomerCredits(customers, invoices, payments, productReturns);
  return gross - credits;
}
