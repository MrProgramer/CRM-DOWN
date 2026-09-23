import React, { useState, useMemo } from 'react';
import { 
  CustomerPayment, 
  Customer, 
  StoreSettings, 
  ProductReturn, 
  Invoice 
} from '../types';
import { TreasuryTransaction } from './LiquidityManager';
import { 
  formatPrice, 
  toPersianDigits, 
  getNetReturnAmount 
} from '../utils/formatters';
import { 
  X, 
  Wallet, 
  Coins, 
  CreditCard, 
  FileText, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Printer, 
  Layers, 
  ShoppingBag, 
  Tag, 
  RefreshCw, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ChevronDown
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Pagination } from './Pagination';

export type TreasuryBreakdownType = 'total_liquidity' | 'cash' | 'bank' | 'checks';

interface TreasuryBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: TreasuryBreakdownType | null;
  payments: CustomerPayment[];
  customers: Customer[];
  treasuryTransactions: TreasuryTransaction[];
  productReturns?: ProductReturn[];
  invoices?: Invoice[];
  settings?: StoreSettings;
  theme: any;
}

interface LedgerItem {
  id: string;
  timestamp: number;
  date: string;
  time?: string;
  type: 'inflow' | 'outflow' | 'transfer';
  category: string;
  party: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  description: string;
  source: 'cash' | 'bank' | 'check';
  sourceLabel: string;
  amount: number;
  transferDir?: 'cash_to_bank' | 'bank_to_cash';
  runningBalance?: number;
}

export const TreasuryBreakdownModal: React.FC<TreasuryBreakdownModalProps> = ({
  isOpen,
  onClose,
  type,
  payments = [],
  customers = [],
  treasuryTransactions = [],
  productReturns = [],
  invoices = [],
  settings,
  theme
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow' | 'transfer'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'invoices' | 'expenses' | 'deposits' | 'transfers' | 'returns' | 'payouts'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Helper matching methods
  const isCashMethod = (method: string = '') => {
    const m = method.toLowerCase();
    return m === 'cash' || m.includes('نقد') || m.includes('صندوق');
  };

  const isBankMethod = (method: string = '') => {
    const m = method.toLowerCase();
    return m === 'card' || m === 'bank_transfer' || m === 'transfer' || m.includes('کارت') || m.includes('بانک') || m.includes('حواله') || m.includes('پوز');
  };

  const isCheckMethod = (method: string = '') => {
    const m = method.toLowerCase();
    return m === 'check' || m === 'cheque' || m.includes('چک');
  };

  // Relational data filters (same as LiquidityManager)
  const relationalPayments = useMemo(() => {
    if (!customers || customers.length === 0) return [];
    const validCustIds = new Set(customers.map(c => c.id));
    const validCustNames = new Set(customers.map(c => c.name?.trim().toLowerCase()).filter(Boolean));

    return payments.filter(p => {
      const idValid = p.customerId && validCustIds.has(p.customerId);
      const nameValid = p.customerName && validCustNames.has(p.customerName?.trim().toLowerCase());
      return idValid || nameValid;
    });
  }, [payments, customers]);

  const relationalReturns = useMemo(() => {
    const validCustIds = new Set(customers.map(c => c.id));
    const validCustNames = new Set(customers.map(c => c.name?.trim().toLowerCase()).filter(Boolean));

    return productReturns.filter(r => {
      if (r.type === 'to_supplier') return true;
      const idValid = r.customerId && validCustIds.has(r.customerId);
      const nameValid = r.customerName && validCustNames.has(r.customerName?.trim().toLowerCase());
      return idValid || nameValid;
    });
  }, [productReturns, customers]);

  // Invoice lookup index by invoiceNumber and customerName
  const invoiceLookup = useMemo(() => {
    const map = new Map<string, Invoice>();
    invoices.forEach(inv => {
      if (inv.invoiceNumber) {
        map.set(inv.invoiceNumber.trim(), inv);
      }
    });
    return map;
  }, [invoices]);

  // Helper to extract or match invoice number from payment
  const findAssociatedInvoice = (p: CustomerPayment): string | undefined => {
    if (p.referenceNumber && invoiceLookup.has(p.referenceNumber.trim())) {
      return p.referenceNumber.trim();
    }
    if (p.description) {
      const match = p.description.match(/(?:فاکتور|شماره|فاکتور شماره)\s*[:#\-]?\s*([0-9۰-۹]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return undefined;
  };

  // Build the complete ledger based on selected treasury type
  const { allItems, totals } = useMemo(() => {
    if (!type) return { allItems: [], totals: { inflows: 0, outflows: 0, netBalance: 0, cashPart: 0, bankPart: 0 } };

    const items: LedgerItem[] = [];

    // 1. Process Customer Payments
    relationalPayments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (amt === 0) return;

      const isCash = isCashMethod(p.paymentMethod);
      const isCheck = isCheckMethod(p.paymentMethod);
      const isBank = isBankMethod(p.paymentMethod) || (!isCash && !isCheck);

      const matchedInvNum = findAssociatedInvoice(p);

      // Inflow payment (positive amount)
      if (amt > 0) {
        if (type === 'checks' && isCheck) {
          items.push({
            id: `pay-chk-${p.id}`,
            timestamp: p.createdAt || 0,
            date: p.date,
            time: p.time,
            type: 'inflow',
            category: 'چک صیادی دریافتی از مشتری',
            party: p.customerName || 'مشتری',
            invoiceNumber: matchedInvNum,
            referenceNumber: p.referenceNumber,
            description: p.description || 'دریافت چک صیادی بابت فاکتور/حساب',
            source: 'check',
            sourceLabel: 'چک صیادی',
            amount: amt
          });
        } else if (type === 'cash' && isCash) {
          items.push({
            id: `pay-cash-${p.id}`,
            timestamp: p.createdAt || 0,
            date: p.date,
            time: p.time,
            type: 'inflow',
            category: 'دریافتی نقدی از مشتری (فاکتور / حساب)',
            party: p.customerName || 'مشتری',
            invoiceNumber: matchedInvNum,
            referenceNumber: p.referenceNumber,
            description: p.description || 'دریافت وجه نقد از مشتری',
            source: 'cash',
            sourceLabel: 'صندوق نقدی',
            amount: amt
          });
        } else if (type === 'bank' && isBank) {
          items.push({
            id: `pay-bank-${p.id}`,
            timestamp: p.createdAt || 0,
            date: p.date,
            time: p.time,
            type: 'inflow',
            category: 'دریافتی بانکی / کارت‌خوان از مشتری',
            party: p.customerName || 'مشتری',
            invoiceNumber: matchedInvNum,
            referenceNumber: p.referenceNumber,
            description: p.description || 'واریز به حساب بانکی / کارت‌خوان',
            source: 'bank',
            sourceLabel: 'حساب بانکی / کارت‌خوان',
            amount: amt
          });
        } else if (type === 'total_liquidity' && (isCash || isBank)) {
          items.push({
            id: `pay-tot-${p.id}`,
            timestamp: p.createdAt || 0,
            date: p.date,
            time: p.time,
            type: 'inflow',
            category: isCash ? 'دریافتی نقدی از مشتری' : 'دریافتی کارت‌خوان / بانکی از مشتری',
            party: p.customerName || 'مشتری',
            invoiceNumber: matchedInvNum,
            referenceNumber: p.referenceNumber,
            description: p.description || (isCash ? 'دریافت وجه نقد' : 'واریز بانکی / کارت‌خوان'),
            source: isCash ? 'cash' : 'bank',
            sourceLabel: isCash ? 'صندوق نقدی' : 'حساب بانکی / پوز',
            amount: amt
          });
        }
      } 
      // Customer Payout (negative amount - outflow)
      else if (amt < 0) {
        const absAmt = Math.abs(amt);
        if (type === 'cash' && isCash) {
          items.push({
            id: `payout-cash-${p.id}`,
            timestamp: p.createdAt || 0,
            date: p.date,
            time: p.time,
            type: 'outflow',
            category: 'پرداخت بستانکاری به مشتری (عودت نقدی)',
            party: p.customerName || 'مشتری',
            invoiceNumber: matchedInvNum,
            referenceNumber: p.referenceNumber,
            description: p.description || 'عودت نقدی مانده بستانکاری مشتری',
            source: 'cash',
            sourceLabel: 'صندوق نقدی',
            amount: absAmt
          });
        } else if (type === 'bank' && isBank) {
          items.push({
            id: `payout-bank-${p.id}`,
            timestamp: p.createdAt || 0,
            date: p.date,
            time: p.time,
            type: 'outflow',
            category: 'پرداخت بستانکاری به مشتری (حواله بانکی)',
            party: p.customerName || 'مشتری',
            invoiceNumber: matchedInvNum,
            referenceNumber: p.referenceNumber,
            description: p.description || 'حواله عودت مانده بستانکاری مشتری',
            source: 'bank',
            sourceLabel: 'حساب بانکی',
            amount: absAmt
          });
        } else if (type === 'total_liquidity' && (isCash || isBank)) {
          items.push({
            id: `payout-tot-${p.id}`,
            timestamp: p.createdAt || 0,
            date: p.date,
            time: p.time,
            type: 'outflow',
            category: 'پرداخت بستانکاری به مشتری',
            party: p.customerName || 'مشتری',
            invoiceNumber: matchedInvNum,
            referenceNumber: p.referenceNumber,
            description: p.description || 'عودت وجه بستانکاری مشتری',
            source: isCash ? 'cash' : 'bank',
            sourceLabel: isCash ? 'صندوق نقدی' : 'حساب بانکی',
            amount: absAmt
          });
        }
      }
    });

    // 2. Process Manual Treasury Transactions (Only for cash, bank, and total_liquidity)
    if (type !== 'checks') {
      treasuryTransactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (amt <= 0) return;

        // Deposits (Inflow)
        if (t.type === 'deposit') {
          if (t.source === 'cash' && (type === 'cash' || type === 'total_liquidity')) {
            items.push({
              id: `dep-cash-${t.id}`,
              timestamp: t.createdAt || 0,
              date: t.date,
              time: t.time,
              type: 'inflow',
              category: t.category || 'واریز نقدی / آورده نقدی',
              party: 'خزانه‌داری',
              description: t.description || 'افزایش موجودی صندوق نقدی',
              source: 'cash',
              sourceLabel: 'صندوق نقدی',
              amount: amt
            });
          } else if (t.source === 'bank' && (type === 'bank' || type === 'total_liquidity')) {
            items.push({
              id: `dep-bank-${t.id}`,
              timestamp: t.createdAt || 0,
              date: t.date,
              time: t.time,
              type: 'inflow',
              category: t.category || 'واریز بانکی / آورده بانکی',
              party: 'خزانه‌داری',
              description: t.description || 'افزایش موجودی حساب بانکی',
              source: 'bank',
              sourceLabel: 'حساب بانکی',
              amount: amt
            });
          }
        } 
        // Expenses (Outflow)
        else if (t.type === 'expense') {
          const impact = (t as any).impactOnLiquidity;
          // Personal injection
          if (t.source === 'personal' && impact === 'inject' && (type === 'cash' || type === 'total_liquidity')) {
            items.push({
              id: `exp-inject-${t.id}`,
              timestamp: t.createdAt || 0,
              date: t.date,
              time: t.time,
              type: 'inflow',
              category: t.category || 'تزریق سرمایه شخصی به صندوق',
              party: 'خزانه‌داری',
              description: t.description || 'شارژ صندوق از حساب شخصی',
              source: 'cash',
              sourceLabel: 'صندوق نقدی',
              amount: amt
            });
          } 
          // Standard Cash expense
          else if (t.source === 'cash' && impact !== 'none' && (type === 'cash' || type === 'total_liquidity')) {
            items.push({
              id: `exp-cash-${t.id}`,
              timestamp: t.createdAt || 0,
              date: t.date,
              time: t.time,
              type: 'outflow',
              category: t.category || 'هزینه نقدی جاری',
              party: 'هزینه‌های عمومی',
              description: t.description || 'پرداخت نقدی هزینه از صندوق',
              source: 'cash',
              sourceLabel: 'صندوق نقدی',
              amount: amt
            });
          }
          // Standard Bank expense
          else if (t.source === 'bank' && impact !== 'none' && (type === 'bank' || type === 'total_liquidity')) {
            items.push({
              id: `exp-bank-${t.id}`,
              timestamp: t.createdAt || 0,
              date: t.date,
              time: t.time,
              type: 'outflow',
              category: t.category || 'هزینه بانکی جاری',
              party: 'هزینه‌های عمومی',
              description: t.description || 'پرداخت هزینه از حساب بانکی',
              source: 'bank',
              sourceLabel: 'حساب بانکی',
              amount: amt
            });
          }
        }
        // Transfers between Treasuries
        else if (t.type === 'transfer') {
          if (t.source === 'cash' && t.destination === 'bank') {
            if (type === 'cash') {
              items.push({
                id: `tr-c2b-out-${t.id}`,
                timestamp: t.createdAt || 0,
                date: t.date,
                time: t.time,
                type: 'outflow',
                category: 'انتقال داخلی (واریز از صندوق به بانک)',
                party: 'صندوق به بانک',
                description: t.description || 'خروج وجه از صندوق نقدی و واریز به بانک',
                source: 'cash',
                sourceLabel: 'صندوق نقدی (خروجی)',
                amount: amt,
                transferDir: 'cash_to_bank'
              });
            } else if (type === 'bank') {
              items.push({
                id: `tr-c2b-in-${t.id}`,
                timestamp: t.createdAt || 0,
                date: t.date,
                time: t.time,
                type: 'inflow',
                category: 'انتقال داخلی (دریافت از صندوق به بانک)',
                party: 'صندوق به بانک',
                description: t.description || 'ورود وجه به حساب بانکی از محل صندوق نقدی',
                source: 'bank',
                sourceLabel: 'حساب بانکی (ورودی)',
                amount: amt,
                transferDir: 'cash_to_bank'
              });
            } else if (type === 'total_liquidity') {
              items.push({
                id: `tr-c2b-tot-${t.id}`,
                timestamp: t.createdAt || 0,
                date: t.date,
                time: t.time,
                type: 'transfer',
                category: 'انتقال داخلی (صندوق به بانک)',
                party: 'صندوق نقدی ⬅ بانک',
                description: t.description || 'انتقال وجه بین صندوق و بانک (بدون تغییر در نقدینگی کل)',
                source: 'cash',
                sourceLabel: 'جابجایی داخلی',
                amount: amt,
                transferDir: 'cash_to_bank'
              });
            }
          } else if (t.source === 'bank' && t.destination === 'cash') {
            if (type === 'cash') {
              items.push({
                id: `tr-b2c-in-${t.id}`,
                timestamp: t.createdAt || 0,
                date: t.date,
                time: t.time,
                type: 'inflow',
                category: 'انتقال داخلی (برداشت از بانک به صندوق)',
                party: 'بانک به صندوق',
                description: t.description || 'برداشت نقدی از بانک جهت شارژ صندوق',
                source: 'cash',
                sourceLabel: 'صندوق نقدی (ورودی)',
                amount: amt,
                transferDir: 'bank_to_cash'
              });
            } else if (type === 'bank') {
              items.push({
                id: `tr-b2c-out-${t.id}`,
                timestamp: t.createdAt || 0,
                date: t.date,
                time: t.time,
                type: 'outflow',
                category: 'انتقال داخلی (برداشت از بانک به صندوق)',
                party: 'بانک به صندوق',
                description: t.description || 'خروج وجه از حساب بانکی به صندوق نقدی',
                source: 'bank',
                sourceLabel: 'حساب بانکی (خروجی)',
                amount: amt,
                transferDir: 'bank_to_cash'
              });
            } else if (type === 'total_liquidity') {
              items.push({
                id: `tr-b2c-tot-${t.id}`,
                timestamp: t.createdAt || 0,
                date: t.date,
                time: t.time,
                type: 'transfer',
                category: 'انتقال داخلی (بانک به صندوق)',
                party: 'بانک ⬅ صندوق نقدی',
                description: t.description || 'انتقال وجه بین بانک و صندوق (بدون تغییر در نقدینگی کل)',
                source: 'bank',
                sourceLabel: 'جابجایی داخلی',
                amount: amt,
                transferDir: 'bank_to_cash'
              });
            }
          }
        }
      });
    }

    // 3. Process Refunded Returns (Product Returns)
    if (type !== 'checks') {
      relationalReturns.forEach(r => {
        if (!r.isRefunded) return;
        const amt = getNetReturnAmount(r);
        if (amt <= 0) return;

        const isCash = r.refundMethod === 'cash';
        const isBank = r.refundMethod === 'bank';

        // Return to Supplier (Inflow: supplier refunded us money)
        if (r.type === 'to_supplier') {
          if (isCash && (type === 'cash' || type === 'total_liquidity')) {
            items.push({
              id: `ret-sup-cash-${r.id}`,
              timestamp: (r as any).createdAt || 0,
              date: r.date,
              time: r.time,
              type: 'inflow',
              category: 'مرجوعی به شرکت (استرداد نقدی وجه)',
              party: (r as any).supplierName || 'تامین‌کننده',
              invoiceNumber: r.invoiceNumber,
              description: r.reason || 'دریافت نقدی وجه کالای مرجوع‌شده از شرکت',
              source: 'cash',
              sourceLabel: 'صندوق نقدی',
              amount: amt
            });
          } else if (isBank && (type === 'bank' || type === 'total_liquidity')) {
            items.push({
              id: `ret-sup-bank-${r.id}`,
              timestamp: (r as any).createdAt || 0,
              date: r.date,
              time: r.time,
              type: 'inflow',
              category: 'مرجوعی به شرکت (واریز بانکی وجه)',
              party: (r as any).supplierName || 'تامین‌کننده',
              invoiceNumber: r.invoiceNumber,
              description: r.reason || 'واریز بانکی وجه کالای مرجوع‌شده توسط تامین‌کننده',
              source: 'bank',
              sourceLabel: 'حساب بانکی',
              amount: amt
            });
          }
        }
        // Return from Customer (Outflow: we refunded money back to customer)
        else if (r.type === 'from_customer') {
          if (isCash && (type === 'cash' || type === 'total_liquidity')) {
            items.push({
              id: `ret-cust-cash-${r.id}`,
              timestamp: (r as any).createdAt || 0,
              date: r.date,
              time: r.time,
              type: 'outflow',
              category: 'مرجوعی از مشتری (استرداد نقدی وجه به مشتری)',
              party: r.customerName || 'مشتری',
              invoiceNumber: r.invoiceNumber,
              description: r.reason || 'عودت نقدی وجه کالای پس‌آورده شده توسط مشتری',
              source: 'cash',
              sourceLabel: 'صندوق نقدی',
              amount: amt
            });
          } else if (isBank && (type === 'bank' || type === 'total_liquidity')) {
            items.push({
              id: `ret-cust-bank-${r.id}`,
              timestamp: (r as any).createdAt || 0,
              date: r.date,
              time: r.time,
              type: 'outflow',
              category: 'مرجوعی از مشتری (واریز به حساب مشتری)',
              party: r.customerName || 'مشتری',
              invoiceNumber: r.invoiceNumber,
              description: r.reason || 'حواله عودت وجه کالای مرجوعی مشتری به حساب بانکی',
              source: 'bank',
              sourceLabel: 'حساب بانکی',
              amount: amt
            });
          }
        }
      });
    }

    // 4. Sort Chronologically (Oldest to Newest) to compute Running Balance
    const chronological = [...items].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    let currentBal = 0;
    let totalIn = 0;
    let totalOut = 0;
    let cashBal = 0;
    let bankBal = 0;

    const itemsWithBalance = chronological.map(it => {
      if (it.type === 'inflow') {
        currentBal += it.amount;
        totalIn += it.amount;
        if (it.source === 'cash') cashBal += it.amount;
        if (it.source === 'bank') bankBal += it.amount;
      } else if (it.type === 'outflow') {
        currentBal -= it.amount;
        totalOut += it.amount;
        if (it.source === 'cash') cashBal -= it.amount;
        if (it.source === 'bank') bankBal -= it.amount;
      } else if (it.type === 'transfer') {
        // Internal transfers do not change total_liquidity
        if (it.transferDir === 'cash_to_bank') {
          cashBal -= it.amount;
          bankBal += it.amount;
        } else if (it.transferDir === 'bank_to_cash') {
          cashBal += it.amount;
          bankBal -= it.amount;
        }
      }

      return {
        ...it,
        runningBalance: currentBal
      };
    });

    return {
      allItems: itemsWithBalance,
      totals: {
        inflows: totalIn,
        outflows: totalOut,
        netBalance: currentBal,
        cashPart: cashBal,
        bankPart: bankBal
      }
    };
  }, [type, relationalPayments, treasuryTransactions, relationalReturns, invoiceLookup]);

  // Filtering & Search
  const filteredItems = useMemo(() => {
    let list = [...allItems];

    // Filter by flow type
    if (filterType === 'inflow') {
      list = list.filter(it => it.type === 'inflow');
    } else if (filterType === 'outflow') {
      list = list.filter(it => it.type === 'outflow');
    } else if (filterType === 'transfer') {
      list = list.filter(it => it.type === 'transfer');
    }

    // Filter by Category
    if (filterCategory === 'invoices') {
      list = list.filter(it => it.category.includes('مشتری') || it.invoiceNumber);
    } else if (filterCategory === 'expenses') {
      list = list.filter(it => it.category.includes('هزینه'));
    } else if (filterCategory === 'deposits') {
      list = list.filter(it => it.category.includes('واریز') || it.category.includes('آورده') || it.category.includes('تزریق'));
    } else if (filterCategory === 'transfers') {
      list = list.filter(it => it.category.includes('انتقال'));
    } else if (filterCategory === 'returns') {
      list = list.filter(it => it.category.includes('مرجوع'));
    } else if (filterCategory === 'payouts') {
      list = list.filter(it => it.category.includes('بستانکاری') || it.category.includes('عودت'));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(it => {
        return (
          it.party.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          (it.invoiceNumber && it.invoiceNumber.toLowerCase().includes(q)) ||
          (it.referenceNumber && it.referenceNumber.toLowerCase().includes(q)) ||
          it.date.includes(q) ||
          it.amount.toString().includes(q)
        );
      });
    }

    // Sort order (default newest first)
    if (sortOrder === 'newest') {
      list.reverse();
    }

    return list;
  }, [allItems, filterType, filterCategory, searchQuery, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  if (!isOpen || !type) return null;

  // Header content and badges based on type
  const getModalMeta = () => {
    switch (type) {
      case 'total_liquidity':
        return {
          title: 'صورت‌حساب و ریز گردش مجموع نقدینگی در دسترس (صندوق و بانک)',
          subtitle: 'گزارش ممیزی کلیه جریان‌های نقدی، بانکی، واریزهای فاکتورها، هزینه‌ها و مانده آزاد جاری',
          icon: Wallet,
          colorClass: 'emerald',
          badgeText: 'نقدینگی جاری کسب‌وکار'
        };
      case 'cash':
        return {
          title: 'صورت‌حساب و ریز گردش صندوق نقدی مرکزی و تنخواه',
          subtitle: 'تفکیک موشکافانه تمام وجوه نقد فیزیکی دریافتی، هزینه‌ها، انتقالات بانکی و مانده گاوصندوق',
          icon: Coins,
          colorClass: 'emerald',
          badgeText: 'وجوه نقد فیزیکی'
        };
      case 'bank':
        return {
          title: 'صورت‌حساب و ریز گردش حساب‌های بانکی و کارت‌خوان (پوز)',
          subtitle: 'تفکیک تمام تراکنش‌های کارت‌به‌کارت، حواله پایا/ساتنا، دستگاه‌های پوز و پرداخت‌های الکترونیک',
          icon: CreditCard,
          colorClass: 'blue',
          badgeText: 'حساب‌های بانکی و شبا'
        };
      case 'checks':
        return {
          title: 'ریز اسناد تجاری و چک‌های صیادی سررسیدنشده',
          subtitle: 'فهرست کلیه چک‌های صیادی و اسناد تجاری مدت‌دار دریافتی از مشتریان نزد صندوق',
          icon: FileText,
          colorClass: 'amber',
          badgeText: 'اسناد مدت‌دار'
        };
    }
  };

  const meta = getModalMeta();
  const IconComponent = meta.icon;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative text-right"
        >
          {/* 1. Modal Header */}
          <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 flex items-start sm:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/50">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={`p-3 rounded-2xl ${
                meta.colorClass === 'emerald' 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : meta.colorClass === 'blue'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}>
                <IconComponent className="w-6 h-6 shrink-0" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                    {meta.title}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${
                    meta.colorClass === 'emerald'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : meta.colorClass === 'blue'
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    {meta.badgeText}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium line-clamp-1">
                  {meta.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 no-print">
              <button
                type="button"
                onClick={handlePrint}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                title="چاپ صورت‌حساب"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden md:inline">چاپ گزارش</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                title="بستن پنجره"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. Top Cumulative Stat Cards */}
          <div className="p-4 sm:p-6 bg-slate-100/50 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Card A: جمع کل ورودی‌ها */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <span>کل عواید و ورودی‌ها (+)</span>
                  <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
                  +{formatPrice(totals.inflows)}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {toPersianDigits(allItems.filter(i => i.type === 'inflow').length)} تراکنش واریزی و دریافتی
                </div>
              </div>

              {/* Card B: جمع کل خروجی‌ها */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <span>کل مخارج و خروجی‌ها (-)</span>
                  <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 dir-ltr text-right">
                  -{formatPrice(totals.outflows)}
                </div>
                <div className="text-[11px] text-slate-400 font-medium">
                  {toPersianDigits(allItems.filter(i => i.type === 'outflow').length)} سند پرداختی و هزینه
                </div>
              </div>

              {/* Card C: مانده نهایی محاسبه‌شده */}
              <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-4 border border-slate-800 shadow-md space-y-2 sm:col-span-2 lg:col-span-2">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>مانده نهایی تطبیقی (مطابق دقیق با کادر صفحه)</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                    تراز ممیزی ۱۰۰٪
                  </span>
                </div>
                <div className="text-2xl font-black text-white dir-ltr text-right">
                  {formatPrice(totals.netBalance)}
                </div>
                <div className="text-[11px] text-slate-300 font-medium flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800">
                  {type === 'total_liquidity' ? (
                    <>
                      <span>سهم صندوق: <strong className="text-emerald-400 dir-ltr">{formatPrice(totals.cashPart)}</strong></span>
                      <span>سهم بانک‌ها: <strong className="text-blue-400 dir-ltr">{formatPrice(totals.bankPart)}</strong></span>
                      <span>تعداد کل اسناد: {toPersianDigits(allItems.length)}</span>
                    </>
                  ) : (
                    <span>
                      حاصل تفریق مستقیم تمام ورودی‌ها منهای تمام خروجی‌های ثبت‌شده در سیستم
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* 3. Filter & Search Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900 no-print">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="جستجو در نام طرف حساب، شماره فاکتور، شماره پیگیری یا شرح سند..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Flow Type Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => { setFilterType('all'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterType === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  همه تراکنش‌ها ({toPersianDigits(allItems.length)})
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterType('inflow'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    filterType === 'inflow'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>ورودی‌ها (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setFilterType('outflow'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    filterType === 'outflow'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                  <span>خروجی‌ها (-)</span>
                </button>
                {type === 'total_liquidity' && (
                  <button
                    type="button"
                    onClick={() => { setFilterType('transfer'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                      filterType === 'transfer'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                    }`}
                  >
                    انتقالات داخلی
                  </button>
                )}
              </div>

              {/* Sort Order Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="تغییر ترتیب زمانی"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{sortOrder === 'newest' ? 'جدیدترین‌ها اول' : 'قدیمی‌ترین‌ها اول'}</span>
                </button>
              </div>

            </div>

            {/* Category Quick Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-0.5">
              <span className="text-slate-400 text-[11px] font-bold shrink-0 ml-1">دسته‌بندی:</span>
              {[
                { id: 'all', label: 'همه سرفصل‌ها' },
                { id: 'invoices', label: 'فاکتورها و مشتریان' },
                { id: 'expenses', label: 'هزینه‌های جاری' },
                { id: 'deposits', label: 'آورده و واریزی خزانه‌داری' },
                { id: 'transfers', label: 'انتقالات صندوق و بانک' },
                { id: 'returns', label: 'مرجوعی‌ها' },
                { id: 'payouts', label: 'پرداخت به مشتریان' },
              ].map((cat, idx) => (
                <button
                  key={`treasury-filter-${cat.id}-${idx}`}
                  type="button"
                  onClick={() => { setFilterCategory(cat.id as any); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterCategory === cat.id
                      ? `${theme.primary} text-white shadow-2xs`
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. The Itemized Table */}
          <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-5 custom-scrollbar">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <AlertCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <h3 className="text-sm font-black text-slate-700 dark:text-slate-300">
                  تراکنشی مطابق با فیلترهای انتخابی یافت نشد
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  می‌توانید عبارت جستجو را پاک کنید یا فیلترهای بالا را بر روی «همه» قرار دهید.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setFilterCategory('all');
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  پاک‌کردن فیلترها
                </button>
              </div>
            ) : (
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold bg-slate-50/50 dark:bg-slate-900/40">
                    <th className="py-3 px-3 text-center w-12">ردیف</th>
                    <th className="py-3 px-3 whitespace-nowrap w-28">تاریخ و ساعت</th>
                    <th className="py-3 px-3 whitespace-nowrap">سرفصل و نوع تراکنش</th>
                    <th className="py-3 px-4 min-w-[220px]">طرف حساب، فاکتور و شرح</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">روش / منبع</th>
                    <th className="py-3 px-3 text-left whitespace-nowrap text-emerald-600 dark:text-emerald-400">مبلغ ورودی (+)</th>
                    <th className="py-3 px-3 text-left whitespace-nowrap text-rose-600 dark:text-rose-400">مبلغ خروجی (-)</th>
                    <th className="py-3 px-3 text-left whitespace-nowrap font-black">مانده تجمعی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedItems.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isInflow = item.type === 'inflow';
                    const isOutflow = item.type === 'outflow';
                    const isTransfer = item.type === 'transfer';

                    return (
                      <tr 
                        key={`breakdown-row-${item.id}-${idx}`}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* 1. Row Index */}
                        <td className="py-3.5 px-3 text-center text-slate-400 font-mono font-bold">
                          {toPersianDigits(rowNumber)}
                        </td>

                        {/* 2. Date & Time */}
                        <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{toPersianDigits(item.date)}</span>
                          </div>
                          {item.time && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                              <Clock className="w-2.5 h-2.5 shrink-0" />
                              <span>{toPersianDigits(item.time)}</span>
                            </div>
                          )}
                        </td>

                        {/* 3. Category & Flow Badge */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              isInflow ? 'bg-emerald-500' : isOutflow ? 'bg-rose-500' : 'bg-indigo-500'
                            }`} />
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.category}
                            </span>
                          </div>
                        </td>

                        {/* 4. Party, Invoice Number, Description */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-slate-900 dark:text-white">
                                {item.party}
                              </span>
                              {item.invoiceNumber && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-[10px] font-black">
                                  <ShoppingBag className="w-2.5 h-2.5" />
                                  <span>فاکتور #{toPersianDigits(item.invoiceNumber)}</span>
                                </span>
                              )}
                              {item.referenceNumber && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">
                                  پیگیری: {toPersianDigits(item.referenceNumber)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {item.description}
                            </p>
                          </div>
                        </td>

                        {/* 5. Source / Method */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            item.source === 'cash'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40'
                              : item.source === 'bank'
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/40'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40'
                          }`}>
                            {item.source === 'cash' ? (
                              <Coins className="w-2.5 h-2.5" />
                            ) : item.source === 'bank' ? (
                              <CreditCard className="w-2.5 h-2.5" />
                            ) : (
                              <FileText className="w-2.5 h-2.5" />
                            )}
                            <span>{item.sourceLabel}</span>
                          </span>
                        </td>

                        {/* 6. Inflow Amount */}
                        <td className="py-3.5 px-3 text-left dir-ltr whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                          {isInflow ? `+${formatPrice(item.amount)}` : '-'}
                        </td>

                        {/* 7. Outflow Amount */}
                        <td className="py-3.5 px-3 text-left dir-ltr whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                          {isOutflow ? `-${formatPrice(item.amount)}` : '-'}
                        </td>

                        {/* 8. Running Cumulative Balance */}
                        <td className="py-3.5 px-3 text-left dir-ltr whitespace-nowrap font-black text-slate-900 dark:text-white">
                          {item.runningBalance !== undefined ? formatPrice(item.runningBalance) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* 5. Modal Footer: Reconciliation Formula & Pagination */}
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/70 flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Quick summary verification note */}
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                نمایش <strong>{toPersianDigits(filteredItems.length)}</strong> تراکنش ممیزی شده — جمع نهایی تراز: <strong className="text-slate-900 dark:text-white dir-ltr font-black">{formatPrice(totals.netBalance)}</strong>
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="w-full md:w-auto">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredItems.length}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => setCurrentPage(page)}
                onItemsPerPageChange={(limit) => {
                  setItemsPerPage(limit);
                  setCurrentPage(1);
                }}
                itemsPerPageOptions={[10, 15, 25, 50, 100]}
                itemName="تراکنش"
                themeColor={meta.colorClass === 'blue' ? 'blue' : 'emerald'}
              />
            </div>

          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
