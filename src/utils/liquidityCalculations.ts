import { CustomerPayment, TreasuryTransaction, ProductReturn, Customer, Invoice } from '../types';
import { getNetReturnAmount } from './formatters';

export const isCashMethod = (method: string = ''): boolean => {
  const m = method.toLowerCase();
  return m === 'cash' || m.includes('نقد') || m.includes('کشو') || m.includes('صندوق');
};

export const isBankMethod = (method: string = ''): boolean => {
  const m = method.toLowerCase();
  return (
    m === 'card' ||
    m === 'bank_transfer' ||
    m === 'transfer' ||
    m.includes('کارت') ||
    m.includes('بانک') ||
    m.includes('حواله') ||
    m.includes('پوز') ||
    m.includes('ساتنا') ||
    m.includes('پایا')
  );
};

export const isCheckMethod = (method: string = ''): boolean => {
  const m = method.toLowerCase();
  return m === 'check' || m === 'cheque' || m.includes('چک');
};

export interface LiquidityBalances {
  cashBalance: number;
  bankBalance: number;
  totalLiquidity: number;
  netChecksBalance: number;
  totalDeposits: number;
  totalExpenses: number;
}

/**
 * Calculates the exact LIVE cash box, bank, and total liquidity balances
 * across all valid payments, treasury deposits/expenses/transfers, and refunds.
 */
export function calculateRealTimeLiquidity(
  payments: CustomerPayment[] = [],
  treasuryTransactions: TreasuryTransaction[] = [],
  productReturns: ProductReturn[] = [],
  customers: Customer[] = []
): LiquidityBalances {
  // Relational payments (exclude orphaned payments if customers exist)
  let relationalPayments = payments;
  if (customers && customers.length > 0) {
    const validCustIds = new Set(customers.map(c => c.id));
    const validCustNames = new Set(customers.map(c => c.name?.trim().toLowerCase()).filter(Boolean));
    relationalPayments = payments.filter(p => {
      const idValid = p.customerId && validCustIds.has(p.customerId);
      const nameValid = p.customerName && validCustNames.has(p.customerName?.trim().toLowerCase());
      return idValid || nameValid;
    });
  }

  // Valid positive payments received
  const validPositivePayments = relationalPayments.filter(p => (Number(p.amount) || 0) > 0);

  const totalReceivedCash = validPositivePayments
    .filter(p => isCashMethod(p.paymentMethod))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalReceivedCardBank = validPositivePayments
    .filter(p => isBankMethod(p.paymentMethod) || (!isCashMethod(p.paymentMethod) && !isCheckMethod(p.paymentMethod)))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalReceivedChecks = validPositivePayments
    .filter(p => isCheckMethod(p.paymentMethod))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Manual Treasury Transactions
  const totalManualDepositsCash = treasuryTransactions
    .filter(t => (t.type === 'deposit' && t.source === 'cash') || (t.type === 'expense' && t.source === 'personal' && t.impactOnLiquidity === 'inject'))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalManualDepositsBank = treasuryTransactions
    .filter(t => t.type === 'deposit' && t.source === 'bank')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalManualExpensesCash = treasuryTransactions
    .filter(t => t.type === 'expense' && t.source === 'cash' && t.impactOnLiquidity !== 'none')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalManualExpensesBank = treasuryTransactions
    .filter(t => t.type === 'expense' && t.source === 'bank' && t.impactOnLiquidity !== 'none')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Transfers
  const cashToBankTransfers = treasuryTransactions
    .filter(t => t.type === 'transfer' && t.source === 'cash' && t.destination === 'bank')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const bankToCashTransfers = treasuryTransactions
    .filter(t => t.type === 'transfer' && t.source === 'bank' && t.destination === 'cash')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Refunded Returns
  const refundedReturnsToSupplierCash = productReturns
    .filter(r => r.isRefunded && r.type === 'to_supplier' && r.refundMethod === 'cash')
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  const refundedReturnsToSupplierBank = productReturns
    .filter(r => r.isRefunded && r.type === 'to_supplier' && r.refundMethod === 'bank')
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  const refundedReturnsFromCustomerCash = productReturns
    .filter(r => r.isRefunded && r.type === 'from_customer' && r.refundMethod === 'cash')
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  const refundedReturnsFromCustomerBank = productReturns
    .filter(r => r.isRefunded && r.type === 'from_customer' && r.refundMethod === 'bank')
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  // Customer Payouts
  const customerPayoutsCash = relationalPayments
    .filter(p => (Number(p.amount) || 0) < 0 && (p.type === 'payout' || p.description?.includes('عودت') || p.description?.includes('پرداخت بستانکاری') || p.description?.includes('بازپرداخت')) && isCashMethod(p.paymentMethod))
    .reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0);

  const customerPayoutsBank = relationalPayments
    .filter(p => (Number(p.amount) || 0) < 0 && (p.type === 'payout' || p.description?.includes('عودت') || p.description?.includes('پرداخت بستانکاری') || p.description?.includes('بازپرداخت')) && isBankMethod(p.paymentMethod))
    .reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0);

  // Net Liquid Balances
  const cashBalance = totalReceivedCash + totalManualDepositsCash + bankToCashTransfers + refundedReturnsToSupplierCash - totalManualExpensesCash - cashToBankTransfers - customerPayoutsCash - refundedReturnsFromCustomerCash;
  const bankBalance = totalReceivedCardBank + totalManualDepositsBank + cashToBankTransfers + refundedReturnsToSupplierBank - totalManualExpensesBank - bankToCashTransfers - customerPayoutsBank - refundedReturnsFromCustomerBank;
  const netChecksBalance = totalReceivedChecks;
  const totalLiquidity = cashBalance + bankBalance;

  return {
    cashBalance,
    bankBalance,
    totalLiquidity,
    netChecksBalance,
    totalDeposits: totalReceivedCash + totalReceivedCardBank + totalManualDepositsCash + totalManualDepositsBank,
    totalExpenses: totalManualExpensesCash + totalManualExpensesBank + customerPayoutsCash + customerPayoutsBank,
  };
}
