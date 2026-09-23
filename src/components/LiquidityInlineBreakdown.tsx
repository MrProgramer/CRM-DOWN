import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CustomerPayment, 
  Customer, 
  StoreSettings, 
  ProductReturn, 
  Invoice, 
  Product 
} from '../types';
import { TreasuryTransaction } from './LiquidityManager';
import { 
  formatPrice, 
  toPersianDigits, 
  getNetReturnAmount 
} from '../utils/formatters';
import {
  getCustomerCreditSalesTotal,
  getCustomerDepositsTotal,
  getCustomerReturnsFromTotal,
  getCustomerManualDebtsTotal,
  calculateCustomerLiveBalance
} from '../utils/customerBalanceCalculations';
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
  ShoppingBag, 
  Tag, 
  Boxes, 
  TrendingUp, 
  ChevronUp, 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  DollarSign, 
  Scale, 
  Users, 
  BarChart3, 
  Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pagination } from './Pagination';

export type LiquidityBreakdownType = 
  | 'total_liquidity'       // مجموع نقدینگی در دسترس (صندوق و بانک)
  | 'cash'                  // صندوق نقدی مرکزی و تنخواه
  | 'bank'                  // حساب‌های بانکی و پوز
  | 'checks'                // اسناد تجاری و چک‌های صیادی سررسیدنشده
  | 'stock_purchase_cost'   // مجموع بهای تمام‌شده خرید موجودی انبار (ارزش دفتری انبار)
  | 'payments_inflow'       // مجموع عواید و دریافتی‌های نقدینگی وصول‌شده
  | 'market_receivables'    // مانده مطالبات تجاری و اسناد باز بازار (بدهکاران)
  | 'stock_profit'          // حاشیه سود ناخالص پیش‌بینی‌شده موجودی
  | 'stock_selling_value'   // ارزش ناخالص فروش کل موجودی انبار
  | 'returns';              // گردش ریالی کالاهای مرجوعی

export interface LiquidityInlineBreakdownProps {
  type: LiquidityBreakdownType | null;
  onClose: () => void;
  payments?: CustomerPayment[];
  customers?: Customer[];
  treasuryTransactions?: TreasuryTransaction[];
  productReturns?: ProductReturn[];
  invoices?: Invoice[];
  products?: Product[];
  suppliers?: any[];
  categories?: any[];
  settings?: StoreSettings;
  theme?: any;
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

export const LiquidityInlineBreakdown: React.FC<LiquidityInlineBreakdownProps> = ({
  type,
  onClose,
  payments = [],
  customers = [],
  treasuryTransactions = [],
  productReturns = [],
  invoices = [],
  products = [],
  suppliers = [],
  categories = [],
  settings,
  theme
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Common UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Specific Filters
  const [treasuryFilterFlow, setTreasuryFilterFlow] = useState<'all' | 'inflow' | 'outflow' | 'transfer'>('all');
  const [treasuryFilterCategory, setTreasuryFilterCategory] = useState<'all' | 'invoices' | 'expenses' | 'deposits' | 'transfers' | 'returns' | 'payouts'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockAvailabilityFilter, setStockAvailabilityFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'bank' | 'check'>('all');
  const [returnTypeFilter, setReturnTypeFilter] = useState<'all' | 'from_customer' | 'to_supplier'>('all');
  const [marketFilterStatus, setMarketFilterStatus] = useState<'all' | 'debtor' | 'creditor' | 'settled'>('all');

  // Reset page on filter or type change
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery('');
  }, [type]);

  // Smooth scroll into view when opened or type changed
  useEffect(() => {
    if (type && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [type]);

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

  // Map invoices by ID and number for rapid lookup
  const invoiceLookup = useMemo(() => {
    const map = new Map<string, Invoice>();
    invoices.forEach(inv => {
      if (inv.id) map.set(inv.id, inv);
      if (inv.invoiceNumber) map.set(inv.invoiceNumber, inv);
    });
    return map;
  }, [invoices]);

  // Map customers by ID and name
  const customerLookup = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => {
      if (c.id) map.set(c.id, c);
      if (c.name) map.set(c.name.trim().toLowerCase(), c);
    });
    return map;
  }, [customers]);

  // Available categories (from props or extracted from products)
  const availableCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set).map(name => ({ id: name, name }));
  }, [categories, products]);

  // =========================================================================
  // 1. TREASURY / LIQUIDITY LEDGER (total_liquidity, cash, bank, checks)
  // =========================================================================
  const treasuryLedger = useMemo(() => {
    if (!type || !['total_liquidity', 'cash', 'bank', 'checks'].includes(type)) {
      return { allItems: [], totals: { inflows: 0, outflows: 0, netBalance: 0, cashPart: 0, bankPart: 0, checksPart: 0 } };
    }

    const items: LedgerItem[] = [];

    // Process Customer Payments
    payments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (amt === 0) return;

      const isCash = isCashMethod(p.paymentMethod);
      const isBank = isBankMethod(p.paymentMethod) || (!isCash && !isCheckMethod(p.paymentMethod));
      const isCheck = isCheckMethod(p.paymentMethod);

      if (amt > 0) {
        // INFLOW
        if (isCheck) {
          if (type === 'checks') {
            items.push({
              id: `pay-chk-${p.id}`,
              timestamp: p.createdAt || 0,
              date: p.date,
              time: p.time,
              type: 'inflow',
              category: 'چک صیادی دریافتی',
              party: p.customerName || 'مشتری بازار',
              referenceNumber: p.referenceNumber,
              description: p.description || 'دریافت چک بابت فاکتور / تسویه حساب',
              source: 'check',
              sourceLabel: 'صندوق اسناد تجاری (چک)',
              amount: amt
            });
          }
        } else if (isCash) {
          if (type === 'cash' || type === 'total_liquidity') {
            items.push({
              id: `pay-csh-${p.id}`,
              timestamp: p.createdAt || 0,
              date: p.date,
              time: p.time,
              type: 'inflow',
              category: 'دریافت نقدی از مشتری',
              party: p.customerName || 'مشتری',
              referenceNumber: p.referenceNumber,
              description: p.description || 'واریز نقدی به صندوق بابت فاکتور/مطالبات',
              source: 'cash',
              sourceLabel: 'صندوق نقدی',
              amount: amt
            });
          }
        } else if (isBank) {
          if (type === 'bank' || type === 'total_liquidity') {
            items.push({
              id: `pay-bnk-${p.id}`,
              timestamp: p.createdAt || 0,
              date: p.date,
              time: p.time,
              type: 'inflow',
              category: 'تراکنش کارت‌خوان / واریز بانکی',
              party: p.customerName || 'مشتری',
              referenceNumber: p.referenceNumber,
              description: p.description || 'تراکنش پوز یا حواله پایا بابت تسویه فاکتور',
              source: 'bank',
              sourceLabel: 'حساب بانکی / کارت‌خوان',
              amount: amt
            });
          }
        }
      } else {
        // OUTFLOW (Negative payments = Payout / Refund to customer)
        const payoutAmt = Math.abs(amt);
        if (isCash && (type === 'cash' || type === 'total_liquidity')) {
          items.push({
            id: `pay-out-csh-${p.id}`,
            timestamp: p.createdAt || 0,
            date: p.date,
            time: p.time,
            type: 'outflow',
            category: 'پرداخت بستانکاری / عودت نقدی',
            party: p.customerName || 'مشتری',
            referenceNumber: p.referenceNumber,
            description: p.description || 'عودت وجه مازاد یا پرداخت بستانکاری از صندوق',
            source: 'cash',
            sourceLabel: 'صندوق نقدی',
            amount: payoutAmt
          });
        } else if (isBank && (type === 'bank' || type === 'total_liquidity')) {
          items.push({
            id: `pay-out-bnk-${p.id}`,
            timestamp: p.createdAt || 0,
            date: p.date,
            time: p.time,
            type: 'outflow',
            category: 'پرداخت بستانکاری / حواله به مشتری',
            party: p.customerName || 'مشتری',
            referenceNumber: p.referenceNumber,
            description: p.description || 'انتقال وجه و پرداخت مانده بستانکار مشتری از حساب بانکی',
            source: 'bank',
            sourceLabel: 'حساب بانکی',
            amount: payoutAmt
          });
        }
      }
    });

    // Process Manual Treasury Transactions
    if (type !== 'checks') {
      treasuryTransactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (amt <= 0) return;

        if (t.type === 'deposit') {
          if (t.source === 'cash' && (type === 'cash' || type === 'total_liquidity')) {
            items.push({
              id: `dep-cash-${t.id}`,
              timestamp: t.createdAt || 0,
              date: t.date,
              time: t.time,
              type: 'inflow',
              category: t.category || 'واریز نقدی / آورده صندوق',
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
              category: t.category || 'واریز بانکی / آورده حساب',
              party: 'خزانه‌داری',
              description: t.description || 'افزایش موجودی حساب بانکی',
              source: 'bank',
              sourceLabel: 'حساب بانکی',
              amount: amt
            });
          }
        } else if (t.type === 'expense') {
          const impact = (t as any).impactOnLiquidity;
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
          } else if (t.source === 'cash' && impact !== 'none' && (type === 'cash' || type === 'total_liquidity')) {
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
          } else if (t.source === 'bank' && impact !== 'none' && (type === 'bank' || type === 'total_liquidity')) {
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
        } else if (t.type === 'transfer') {
          if (t.source === 'cash' && t.destination === 'bank') {
            if (type === 'cash') {
              items.push({
                id: `tr-c2b-out-${t.id}`,
                timestamp: t.createdAt || 0,
                date: t.date,
                time: t.time,
                type: 'outflow',
                category: 'انتقال داخلی (صندوق به بانک)',
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
                description: t.description || 'انتقال وجه بین صندوق و بانک (بدون اثر بر نقدینگی کل)',
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
                category: 'انتقال داخلی (بانک به صندوق)',
                party: 'بانک به صندوق',
                description: t.description || 'برداشت نقدی از بانک جهت شارژ صندوق نقدی',
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
                category: 'انتقال داخلی (بانک به صندوق)',
                party: 'بانک به صندوق',
                description: t.description || 'خروج وجه از حساب بانکی جهت شارژ صندوق نقدی',
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
                description: t.description || 'برداشت از حساب و انتقال به صندوق (بدون اثر بر نقدینگی کل)',
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

    // Process Cash/Bank Refunded Returns
    if (type !== 'checks') {
      productReturns.forEach(r => {
        if (!r.isRefunded) return;
        const amt = getNetReturnAmount(r);
        if (amt <= 0) return;

        if (r.type === 'from_customer') {
          if (r.refundMethod === 'cash' && (type === 'cash' || type === 'total_liquidity')) {
            items.push({
              id: `ret-refund-csh-${r.id}`,
              timestamp: r.createdAt || 0,
              date: r.date,
              time: r.time,
              type: 'outflow',
              category: 'عودت نقدی مرجوعی مشتری',
              party: r.customerName || 'مشتری',
              description: `پرداخت وجه مرجوعی کالای «${r.productName}» از صندوق`,
              source: 'cash',
              sourceLabel: 'صندوق نقدی',
              amount: amt
            });
          } else if (r.refundMethod === 'bank' && (type === 'bank' || type === 'total_liquidity')) {
            items.push({
              id: `ret-refund-bnk-${r.id}`,
              timestamp: r.createdAt || 0,
              date: r.date,
              time: r.time,
              type: 'outflow',
              category: 'عودت بانکی مرجوعی مشتری',
              party: r.customerName || 'مشتری',
              description: `حواله وجه مرجوعی کالای «${r.productName}» از حساب بانکی`,
              source: 'bank',
              sourceLabel: 'حساب بانکی',
              amount: amt
            });
          }
        } else if (r.type === 'to_supplier') {
          if (r.refundMethod === 'cash' && (type === 'cash' || type === 'total_liquidity')) {
            items.push({
              id: `ret-supp-csh-${r.id}`,
              timestamp: r.createdAt || 0,
              date: r.date,
              time: r.time,
              type: 'inflow',
              category: 'دریافت نقدی مرجوعی شرکت',
              party: r.customerName || 'شرکت تامین‌کننده',
              description: `دریافت وجه برگشت کالا «${r.productName}» به صندوق`,
              source: 'cash',
              sourceLabel: 'صندوق نقدی',
              amount: amt
            });
          } else if (r.refundMethod === 'bank' && (type === 'bank' || type === 'total_liquidity')) {
            items.push({
              id: `ret-supp-bnk-${r.id}`,
              timestamp: r.createdAt || 0,
              date: r.date,
              time: r.time,
              type: 'inflow',
              category: 'واریز بانکی مرجوعی شرکت',
              party: r.customerName || 'شرکت تامین‌کننده',
              description: `واریز وجه برگشت کالا «${r.productName}» به حساب بانکی`,
              source: 'bank',
              sourceLabel: 'حساب بانکی',
              amount: amt
            });
          }
        }
      });
    }

    // Sort chronologically ascending to compute progressive running balance accurately
    items.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    let currentBal = 0;
    let totalIn = 0;
    let totalOut = 0;
    let cashBal = 0;
    let bankBal = 0;
    let checksBal = 0;

    const itemsWithBalance = items.map(it => {
      if (it.type === 'inflow') {
        currentBal += it.amount;
        totalIn += it.amount;
        if (it.source === 'cash') cashBal += it.amount;
        if (it.source === 'bank') bankBal += it.amount;
        if (it.source === 'check') checksBal += it.amount;
      } else if (it.type === 'outflow') {
        currentBal -= it.amount;
        totalOut += it.amount;
        if (it.source === 'cash') cashBal -= it.amount;
        if (it.source === 'bank') bankBal -= it.amount;
      } else if (it.type === 'transfer') {
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
        bankPart: bankBal,
        checksPart: checksBal
      }
    };
  }, [type, payments, treasuryTransactions, productReturns, invoiceLookup]);

  // =========================================================================
  // 2. INVENTORY ITEMS (stock_purchase_cost, stock_selling_value, stock_profit)
  // =========================================================================
  const inventoryStockItems = useMemo(() => {
    if (!type || !['stock_purchase_cost', 'stock_selling_value', 'stock_profit'].includes(type)) {
      return { items: [], totalPurchaseCost: 0, totalSellingValue: 0, totalProfit: 0, totalPieces: 0 };
    }

    let totPurchase = 0;
    let totSelling = 0;
    let totPieces = 0;

    const items = products.map(p => {
      const stock = Number(p.stockPieces) || 0;
      const purchasePrice = Number(p.purchasePrice) || 0;
      const sellingPrice = Number(p.sellingPrice) || 0;
      const piecesPerCarton = Number(p.piecesPerCarton) || 1;

      const cartons = Math.floor(stock / piecesPerCarton);
      const extraPieces = stock % piecesPerCarton;

      const totalPurchase = stock * purchasePrice;
      const totalSelling = stock * sellingPrice;
      const unitMargin = Math.max(0, sellingPrice - purchasePrice);
      const totalMargin = stock * unitMargin;
      const markupPercentage = purchasePrice > 0 ? ((unitMargin / purchasePrice) * 100) : 0;

      totPurchase += totalPurchase;
      totSelling += totalSelling;
      totPieces += stock;

      return {
        id: p.id,
        name: p.name,
        category: p.category || 'دسته‌بندی نشده',
        barcode: p.barcode || '—',
        stockPieces: stock,
        piecesPerCarton,
        cartons,
        extraPieces,
        purchasePrice,
        sellingPrice,
        totalPurchase,
        totalSelling,
        unitMargin,
        totalMargin,
        markupPercentage
      };
    });

    const totProfit = Math.max(0, totSelling - totPurchase);

    return {
      items,
      totalPurchaseCost: totPurchase,
      totalSellingValue: totSelling,
      totalProfit: totProfit,
      totalPieces: totPieces
    };
  }, [type, products]);

  // =========================================================================
  // 3. PAYMENTS INFLOW LEDGER (payments_inflow)
  // =========================================================================
  const paymentsInflowItems = useMemo(() => {
    if (type !== 'payments_inflow') return { items: [], totalCash: 0, totalBank: 0, totalChecks: 0, totalInflow: 0 };

    let csh = 0;
    let bnk = 0;
    let chk = 0;
    let tot = 0;

    const validPayments = payments.filter(p => (Number(p.amount) || 0) > 0);

    const items = validPayments.map(p => {
      const amt = Number(p.amount) || 0;
      tot += amt;

      let methodLabel = 'حساب بانکی / کارت‌خوان';
      let methodType: 'cash' | 'bank' | 'check' = 'bank';

      if (isCashMethod(p.paymentMethod)) {
        methodLabel = 'نقدی (صندوق)';
        methodType = 'cash';
        csh += amt;
      } else if (isCheckMethod(p.paymentMethod)) {
        methodLabel = 'چک صیادی';
        methodType = 'check';
        chk += amt;
      } else {
        bnk += amt;
      }

      return {
        id: p.id,
        date: p.date,
        time: p.time,
        timestamp: p.createdAt || 0,
        customerName: p.customerName || 'مشتری نامشخص',
        methodLabel,
        methodType,
        referenceNumber: p.referenceNumber || '—',
        description: p.description || 'دریافتی بابت تسویه حساب فاکتور',
        amount: amt
      };
    });

    return {
      items,
      totalCash: csh,
      totalBank: bnk,
      totalChecks: chk,
      totalInflow: tot
    };
  }, [type, payments]);

  // =========================================================================
  // 4. MARKET RECEIVABLES LEDGER (market_receivables)
  // =========================================================================
  const marketReceivablesItems = useMemo(() => {
    if (type !== 'market_receivables') {
      return {
        items: [],
        totalGrossDebt: 0,
        totalCustomerCredits: 0,
        netMarketReceivables: 0,
        totalDebt: 0,
        indebtedCount: 0,
        creditorCount: 0,
        settledCount: 0
      };
    }

    let totalGrossDebt = 0;
    let totalCustomerCredits = 0;
    let debtorCount = 0;
    let creditorCount = 0;
    let settledCount = 0;

    const items: Array<{
      id: string;
      name: string;
      company?: string;
      phone: string;
      city: string;
      initialBalance: number;
      creditSales: number;
      totalPayments: number;
      returnsDeducted: number;
      manualDebts: number;
      liveBalance: number;
      status: 'debtor' | 'creditor' | 'settled';
      openDebt: number;
      creditBalance: number;
      sharePercent: number;
    }> = [];

    customers.forEach(c => {
      const custCreditInvoicesTotal = getCustomerCreditSalesTotal(c, invoices);
      const custPaidTotal = getCustomerDepositsTotal(c, payments);
      const custReturnsDeducted = getCustomerReturnsFromTotal(c, productReturns);
      const custManualDebts = getCustomerManualDebtsTotal(c, payments);
      const liveBalance = calculateCustomerLiveBalance(c, invoices, payments, productReturns);

      let status: 'debtor' | 'creditor' | 'settled' = 'settled';
      if (liveBalance > 0) {
        status = 'debtor';
        debtorCount++;
        totalGrossDebt += liveBalance;
      } else if (liveBalance < 0) {
        status = 'creditor';
        creditorCount++;
        totalCustomerCredits += Math.abs(liveBalance);
      } else {
        settledCount++;
      }

      items.push({
        id: c.id,
        name: c.name,
        company: c.company,
        phone: c.phone || '—',
        city: c.city || '—',
        initialBalance: Number(c.initialBalance) || 0,
        creditSales: custCreditInvoicesTotal,
        totalPayments: custPaidTotal,
        returnsDeducted: custReturnsDeducted,
        manualDebts: custManualDebts,
        liveBalance,
        status,
        openDebt: liveBalance > 0 ? liveBalance : 0,
        creditBalance: liveBalance < 0 ? Math.abs(liveBalance) : 0,
        sharePercent: 0
      });
    });

    // Compute share percentage of gross debt
    items.forEach(it => {
      it.sharePercent = totalGrossDebt > 0 && it.openDebt > 0 ? (it.openDebt / totalGrossDebt) * 100 : 0;
    });

    // Sort by largest debt first
    items.sort((a, b) => {
      if (a.status === 'debtor' && b.status !== 'debtor') return -1;
      if (b.status === 'debtor' && a.status !== 'debtor') return 1;
      return b.openDebt - a.openDebt;
    });

    return {
      items,
      totalGrossDebt,
      totalCustomerCredits,
      netMarketReceivables: totalGrossDebt - totalCustomerCredits,
      totalDebt: totalGrossDebt,
      debtorCount,
      indebtedCount: debtorCount,
      creditorCount,
      settledCount
    };
  }, [type, customers, invoices, payments, productReturns]);

  // =========================================================================
  // 5. RETURNS LEDGER (returns)
  // =========================================================================
  const returnsItems = useMemo(() => {
    if (type !== 'returns') return { items: [], totalCustomerReturns: 0, totalSupplierReturns: 0, totalNetImpact: 0 };

    let custTot = 0;
    let supTot = 0;

    const items = productReturns.map(ret => {
      const netAmt = getNetReturnAmount(ret);
      if (ret.type === 'from_customer') {
        custTot += Number(ret.totalAmount) || 0;
      } else {
        supTot += Number(ret.totalAmount) || 0;
      }

      return {
        id: ret.id,
        date: ret.date,
        time: ret.time,
        timestamp: ret.createdAt || 0,
        type: ret.type,
        typeLabel: ret.type === 'from_customer' ? 'مرجوع از مشتری' : 'برگشت به شرکت / تامین‌کننده',
        partyName: ret.customerName || (ret.type === 'from_customer' ? 'مشتری' : 'تامین‌کننده'),
        productName: ret.productName,
        cartonsCount: ret.cartonsCount || 0,
        extraPieces: ret.extraPieces || 0,
        totalPieces: ret.totalPieces || 0,
        unitPrice: ret.unitPrice || 0,
        totalAmount: ret.totalAmount || 0,
        extraCosts: ret.extraCosts || 0,
        netAmount: netAmt,
        isRefunded: !!ret.isRefunded,
        refundMethod: ret.refundMethod,
        reason: ret.reason || 'نامشخص'
      };
    });

    return {
      items,
      totalCustomerReturns: custTot,
      totalSupplierReturns: supTot,
      totalNetImpact: custTot + supTot
    };
  }, [type, productReturns]);

  // =========================================================================
  // FILTERING & SEARCHING ACROSS ALL TYPES
  // =========================================================================
  const filteredData = useMemo(() => {
    if (!type) return [];
    const q = searchQuery.trim().toLowerCase();

    // 1. Treasury / Liquidity
    if (['total_liquidity', 'cash', 'bank', 'checks'].includes(type)) {
      let list = [...treasuryLedger.allItems];

      if (treasuryFilterFlow === 'inflow') list = list.filter(it => it.type === 'inflow');
      else if (treasuryFilterFlow === 'outflow') list = list.filter(it => it.type === 'outflow');
      else if (treasuryFilterFlow === 'transfer') list = list.filter(it => it.type === 'transfer');

      if (treasuryFilterCategory === 'invoices') list = list.filter(it => it.category.includes('مشتری') || it.invoiceNumber);
      else if (treasuryFilterCategory === 'expenses') list = list.filter(it => it.category.includes('هزینه'));
      else if (treasuryFilterCategory === 'deposits') list = list.filter(it => it.category.includes('واریز') || it.category.includes('آورده'));
      else if (treasuryFilterCategory === 'transfers') list = list.filter(it => it.category.includes('انتقال'));
      else if (treasuryFilterCategory === 'returns') list = list.filter(it => it.category.includes('مرجوع'));
      else if (treasuryFilterCategory === 'payouts') list = list.filter(it => it.category.includes('بستانکاری') || it.category.includes('عودت'));

      if (q) {
        list = list.filter(it => 
          it.party.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          (it.invoiceNumber && it.invoiceNumber.toLowerCase().includes(q)) ||
          (it.referenceNumber && it.referenceNumber.toLowerCase().includes(q)) ||
          it.date.includes(q) ||
          it.amount.toString().includes(q)
        );
      }

      if (sortOrder === 'newest') list.reverse();
      return list;
    }

    // 2. Inventory / Stock
    if (['stock_purchase_cost', 'stock_selling_value', 'stock_profit'].includes(type)) {
      let list = [...inventoryStockItems.items];

      if (selectedCategory !== 'all') {
        list = list.filter(it => it.category === selectedCategory);
      }

      if (stockAvailabilityFilter === 'in_stock') {
        list = list.filter(it => it.stockPieces > 0);
      } else if (stockAvailabilityFilter === 'low_stock') {
        list = list.filter(it => it.stockPieces > 0 && it.stockPieces <= (it.piecesPerCarton * 2));
      } else if (stockAvailabilityFilter === 'out_of_stock') {
        list = list.filter(it => it.stockPieces <= 0);
      }

      if (q) {
        list = list.filter(it => 
          it.name.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.barcode.toLowerCase().includes(q)
        );
      }

      if (sortOrder === 'highest') {
        list.sort((a, b) => type === 'stock_profit' ? (b.totalMargin - a.totalMargin) : (b.totalPurchase - a.totalPurchase));
      } else if (sortOrder === 'lowest') {
        list.sort((a, b) => type === 'stock_profit' ? (a.totalMargin - b.totalMargin) : (a.totalPurchase - b.totalPurchase));
      }

      return list;
    }

    // 3. Payments Inflow
    if (type === 'payments_inflow') {
      let list = [...paymentsInflowItems.items];

      if (paymentMethodFilter !== 'all') {
        list = list.filter(it => it.methodType === paymentMethodFilter);
      }

      if (q) {
        list = list.filter(it => 
          it.customerName.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.referenceNumber.toLowerCase().includes(q) ||
          it.date.includes(q) ||
          it.amount.toString().includes(q)
        );
      }

      if (sortOrder === 'highest') list.sort((a, b) => b.amount - a.amount);
      else if (sortOrder === 'lowest') list.sort((a, b) => a.amount - b.amount);
      else if (sortOrder === 'oldest') list.sort((a, b) => a.timestamp - b.timestamp);
      else list.sort((a, b) => b.timestamp - a.timestamp);

      return list;
    }

    // 4. Market Receivables
    if (type === 'market_receivables') {
      let list = [...marketReceivablesItems.items];

      if (marketFilterStatus === 'debtor') list = list.filter(it => it.status === 'debtor');
      else if (marketFilterStatus === 'creditor') list = list.filter(it => it.status === 'creditor');
      else if (marketFilterStatus === 'settled') list = list.filter(it => it.status === 'settled');

      if (q) {
        list = list.filter(it => 
          it.name.toLowerCase().includes(q) ||
          (it.company && it.company.toLowerCase().includes(q)) ||
          it.phone.includes(q) ||
          it.city.toLowerCase().includes(q)
        );
      }

      if (sortOrder === 'lowest') list.sort((a, b) => a.liveBalance - b.liveBalance);
      else if (sortOrder === 'highest') list.sort((a, b) => b.liveBalance - a.liveBalance);
      else list.sort((a, b) => b.openDebt - a.openDebt);

      return list;
    }

    // 5. Returns
    if (type === 'returns') {
      let list = [...returnsItems.items];

      if (returnTypeFilter !== 'all') {
        list = list.filter(it => it.type === returnTypeFilter);
      }

      if (q) {
        list = list.filter(it => 
          it.partyName.toLowerCase().includes(q) ||
          it.productName.toLowerCase().includes(q) ||
          it.reason.toLowerCase().includes(q) ||
          it.date.includes(q)
        );
      }

      if (sortOrder === 'highest') list.sort((a, b) => b.netAmount - a.netAmount);
      else if (sortOrder === 'lowest') list.sort((a, b) => a.netAmount - b.netAmount);
      else if (sortOrder === 'oldest') list.sort((a, b) => a.timestamp - b.timestamp);
      else list.sort((a, b) => b.timestamp - a.timestamp);

      return list;
    }

    return [];
  }, [
    type,
    searchQuery,
    treasuryLedger,
    treasuryFilterFlow,
    treasuryFilterCategory,
    inventoryStockItems,
    selectedCategory,
    stockAvailabilityFilter,
    paymentsInflowItems,
    paymentMethodFilter,
    marketReceivablesItems,
    marketFilterStatus,
    returnsItems,
    returnTypeFilter,
    sortOrder
  ]);

  // Pagination slice
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  if (!type) return null;

  // Header metadata based on current type
  const getMeta = () => {
    switch (type) {
      case 'total_liquidity':
        return {
          title: 'ریز محاسبات و صورت‌حساب مجموع نقدینگی در دسترس (صندوق و بانک)',
          subtitle: 'گزارش ممیزی کلیه جریان‌های نقدی، بانکی، واریزهای فاکتورها، هزینه‌ها و مانده آزاد',
          icon: Wallet,
          colorClass: 'emerald',
          badgeText: 'نقدینگی جاری'
        };
      case 'cash':
        return {
          title: 'ریز صورت‌حساب و گردش صندوق نقدی مرکزی و تنخواه',
          subtitle: 'تفکیک تمام وجوه نقد فیزیکی دریافتی، هزینه‌ها، انتقالات بانکی و مانده گاوصندوق',
          icon: Coins,
          colorClass: 'emerald',
          badgeText: 'صندوق نقدی'
        };
      case 'bank':
        return {
          title: 'ریز صورت‌حساب و گردش حساب‌های بانکی و کارت‌خوان (پوز)',
          subtitle: 'تفکیک تمام تراکنش‌های کارت‌به‌کارت، حواله پایا/ساتنا، دستگاه‌های پوز و پرداخت‌های الکترونیک',
          icon: CreditCard,
          colorClass: 'blue',
          badgeText: 'حساب‌های بانکی'
        };
      case 'checks':
        return {
          title: 'ریز اسناد تجاری و چک‌های صیادی سررسیدنشده',
          subtitle: 'فهرست کلیه چک‌های صیادی و اسناد تجاری مدت‌دار دریافتی از مشتریان نزد صندوق',
          icon: FileText,
          colorClass: 'amber',
          badgeText: 'اسناد تجاری'
        };
      case 'stock_purchase_cost':
        return {
          title: 'ریز ارزش دفتری و بهای تمام‌شده خرید موجودی انبار',
          subtitle: 'فهرست موشکافانه تک‌تک اقلام موجود در انبار، تعداد دانه و کارتن، قیمت خرید واحد و سرمایه کل خوابیده در انبار',
          icon: Boxes,
          colorClass: 'indigo',
          badgeText: 'ارزش خرید انبار'
        };
      case 'stock_selling_value':
        return {
          title: 'ریز ارزش ناخالص فروش کل موجودی انبار',
          subtitle: 'برآورد درآمد ناخالص حاصل از فروش ۱۰۰٪ موجودی کالاهای فعلی انبار بر اساس نرخ فروش جاری',
          icon: ShoppingBag,
          colorClass: 'emerald',
          badgeText: 'ارزش فروش انبار'
        };
      case 'stock_profit':
        return {
          title: 'ریز حاشیه سود ناخالص پیش‌بینی‌شده کالاهای انبار',
          subtitle: 'سود ناخالص بالقوه اقلام انبار حاصل از تفاوت نرخ فروش و نرخ خرید به تفکیک هر کالا و درصد مارک‌آپ',
          icon: Sparkles,
          colorClass: 'purple',
          badgeText: 'سود بالقوه موجودی'
        };
      case 'payments_inflow':
        return {
          title: 'ریز عواید و دریافتی‌های نقدینگی وصول‌شده',
          subtitle: 'ریز تمام مبالغ نقدی، کارت‌خوان، حواله و چک‌های دریافتی از مشتریان بابت فاکتورها و تسویه‌ها',
          icon: TrendingUp,
          colorClass: 'emerald',
          badgeText: 'عواید وصولی'
        };
      case 'market_receivables':
        return {
          title: 'ریز مطالبات تجاری و بدهکاران بازرگانی بازار',
          subtitle: 'فهرست مشتریان دارای مانده بدهی معوق و نسیه، سهم از کل بازار و وضعیت حساب',
          icon: Users,
          colorClass: 'amber',
          badgeText: 'مطالبات بازار'
        };
      case 'returns':
        return {
          title: 'ریز گردش ریالی و کالاهای مرجوعی',
          subtitle: 'صورت‌حساب کالاهای مرجوعی از مشتری و برگشتی به تامین‌کننده، وضعیت استرداد وجه و خالص گردش ریالی',
          icon: RotateCcw,
          colorClass: 'rose',
          badgeText: 'گردش مرجوعی'
        };
    }
  };

  const meta = getMeta();
  const IconComponent = meta.icon;

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: -16, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.99 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700/80 rounded-3xl shadow-xl overflow-hidden text-right transition-all scroll-mt-6"
    >
      {/* 1. Header with Close Button, Title, and Actions */}
      <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`p-3 rounded-2xl shrink-0 ${
            meta.colorClass === 'emerald' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
            meta.colorClass === 'blue' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30' :
            meta.colorClass === 'amber' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
            meta.colorClass === 'purple' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30' :
            meta.colorClass === 'rose' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
            'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
          }`}>
            <IconComponent className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {meta.title}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                meta.colorClass === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' :
                meta.colorClass === 'blue' ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800' :
                meta.colorClass === 'amber' ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800' :
                meta.colorClass === 'purple' ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800' :
                meta.colorClass === 'rose' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800' :
                'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
              }`}>
                {meta.badgeText}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors shadow-2xs"
            title="چاپ یا ذخیره PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>چاپ گزارش</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer transition-all shadow-2xs group"
            title="بستن بخش ریز اقلام"
          >
            <span>بستن ریز اقلام</span>
            <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* 2. Top Metric Tiles / Audit Summary */}
      <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800">
        {/* Metric tiles for Treasury (total_liquidity, cash, bank, checks) */}
        {['total_liquidity', 'cash', 'bank', 'checks'].includes(type) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                مجموع ورودی‌های وصولی
              </span>
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
                {formatPrice(treasuryLedger.totals.inflows)}
              </div>
              <span className="text-[10px] text-slate-400 block">فاکتورها، واریزها و تسویه‌ها</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
                مجموع خروجی‌ها و هزینه‌ها
              </span>
              <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 dir-ltr text-right">
                {formatPrice(treasuryLedger.totals.outflows)}
              </div>
              <span className="text-[10px] text-slate-400 block">هزینه‌های جاری، پرداخت‌ها و عودت</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-blue-500" />
                مانده تراز نهایی
              </span>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white dir-ltr text-right">
                {formatPrice(treasuryLedger.totals.netBalance)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                {type === 'total_liquidity' ? 'مجموع صندوق و بانک' : type === 'cash' ? 'صندوق نقدی' : type === 'bank' ? 'بانک و پوز' : 'چک‌های صیادی'}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-purple-500" />
                تعداد اقلام گردش
              </span>
              <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400">
                {toPersianDigits(filteredData.length)} <span className="text-xs text-slate-400 font-normal">تراکنش</span>
              </div>
              <span className="text-[10px] text-slate-400 block">از کل {toPersianDigits(treasuryLedger.allItems.length)} ردیف مالی</span>
            </div>
          </div>
        )}

        {/* Metric tiles for Inventory (stock_purchase_cost, stock_selling_value, stock_profit) */}
        {['stock_purchase_cost', 'stock_selling_value', 'stock_profit'].includes(type) && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-indigo-500" />
                ارزش دفتری خرید موجودی
              </span>
              <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 dir-ltr text-right">
                {formatPrice(inventoryStockItems.totalPurchaseCost)}
              </div>
              <span className="text-[10px] text-slate-400 block">سرمایه اصلی خرید کالاها</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
                ارزش ناخالص فروش کل
              </span>
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
                {formatPrice(inventoryStockItems.totalSellingValue)}
              </div>
              <span className="text-[10px] text-slate-400 block">در صورت فروش تمام موجودی</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                سود ناخالص پیش‌بینی‌شده
              </span>
              <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 dir-ltr text-right">
                {formatPrice(inventoryStockItems.totalProfit)}
              </div>
              <span className="text-[10px] text-slate-400 block">مارک‌آپ و سود بالقوه</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                تعداد کل دانه‌های انبار
              </span>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {toPersianDigits(inventoryStockItems.totalPieces.toLocaleString())} <span className="text-xs text-slate-400 font-normal">عدد</span>
              </div>
              <span className="text-[10px] text-slate-400 block">{toPersianDigits(products.length)} ردیف کالای تعریف شده</span>
            </div>
          </div>
        )}

        {/* Metric tiles for Payments Inflow */}
        {type === 'payments_inflow' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-emerald-500" />
                دریافتی‌های نقد (صندوق)
              </span>
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
                {formatPrice(paymentsInflowItems.totalCash)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                کارت‌خوان و واریز بانکی
              </span>
              <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 dir-ltr text-right">
                {formatPrice(paymentsInflowItems.totalBank)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                چک‌های دریافتی
              </span>
              <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 dir-ltr text-right">
                {formatPrice(paymentsInflowItems.totalChecks)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                مجموع کل عواید وصول‌شده
              </span>
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
                {formatPrice(paymentsInflowItems.totalInflow)}
              </div>
            </div>
          </div>
        )}

        {/* Metric tiles for Market Receivables */}
        {type === 'market_receivables' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                طلب ناخالص از مشتریان بدهکار
              </span>
              <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 dir-ltr text-right">
                {formatPrice(marketReceivablesItems.totalGrossDebt)}
              </div>
              <span className="text-[10px] text-slate-400 block">{toPersianDigits(marketReceivablesItems.debtorCount)} مشتری بدهکار</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" />
                بستانکاری و پیش‌دریافت مشتریان
              </span>
              <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 dir-ltr text-right">
                {formatPrice(marketReceivablesItems.totalCustomerCredits)}
              </div>
              <span className="text-[10px] text-slate-400 block">{toPersianDigits(marketReceivablesItems.creditorCount)} مشتری بستانکار</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-emerald-500" />
                خالص مطالبات تجاری بازار
              </span>
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
                {formatPrice(marketReceivablesItems.netMarketReceivables)}
              </div>
              <span className="text-[10px] text-slate-400 block">طلب ناخالص منهای بستانکاری</span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                مجموع طرف‌حساب‌های فعال
              </span>
              <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400">
                {toPersianDigits(customers.length)} <span className="text-xs text-slate-400 font-normal">طرف‌حساب</span>
              </div>
              <span className="text-[10px] text-slate-400 block">{toPersianDigits(marketReceivablesItems.settledCount)} مشتری کاملاً تسویه</span>
            </div>
          </div>
        )}

        {/* Metric tiles for Returns */}
        {type === 'returns' && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                مرجوعی از مشتریان (عودتی)
              </span>
              <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 dir-ltr text-right">
                {formatPrice(returnsItems.totalCustomerReturns)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                برگشت کالا به شرکت/تامین‌کننده
              </span>
              <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 dir-ltr text-right">
                {formatPrice(returnsItems.totalSupplierReturns)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-1 shadow-2xs col-span-2 lg:col-span-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-purple-500" />
                مجموع گردش ریالی مرجوعی‌ها
              </span>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white dir-ltr text-right">
                {formatPrice(returnsItems.totalNetImpact)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Interactive Filter & Search Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو در اقلام، مشتری، شرح، شماره فاکتور..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter chips depending on type */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {/* Treasury Filter Chips */}
          {['total_liquidity', 'cash', 'bank', 'checks'].includes(type) && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setTreasuryFilterFlow('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  treasuryFilterFlow === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                همه ({toPersianDigits(treasuryLedger.allItems.length)})
              </button>
              <button
                onClick={() => setTreasuryFilterFlow('inflow')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  treasuryFilterFlow === 'inflow' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-500'
                }`}
              >
                ورودی‌ها
              </button>
              <button
                onClick={() => setTreasuryFilterFlow('outflow')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  treasuryFilterFlow === 'outflow' ? 'bg-rose-500 text-white shadow-2xs' : 'text-slate-500 hover:text-rose-500'
                }`}
              >
                خروجی‌ها
              </button>
              {type === 'total_liquidity' && (
                <button
                  onClick={() => setTreasuryFilterFlow('transfer')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    treasuryFilterFlow === 'transfer' ? 'bg-blue-500 text-white shadow-2xs' : 'text-slate-500 hover:text-blue-500'
                  }`}
                >
                  انتقالات
                </button>
              )}
            </div>
          )}

          {/* Stock Category Filter */}
          {['stock_purchase_cost', 'stock_selling_value', 'stock_profit'].includes(type) && (
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">همه دسته‌بندی‌ها</option>
                {availableCategories.map((c, cIdx) => (
                  <option key={`liq-cat-opt-${c.id || cIdx}-${cIdx}`} value={c.name}>{c.name}</option>
                ))}
              </select>

              <select
                value={stockAvailabilityFilter}
                onChange={e => setStockAvailabilityFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">همه وضعیت‌های انبار</option>
                <option value="in_stock">کالاهای موجود</option>
                <option value="low_stock">موجودی رو به اتمام</option>
                <option value="out_of_stock">کالاهای صفر</option>
              </select>
            </div>
          )}

          {/* Payment Method Filter */}
          {type === 'payments_inflow' && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setPaymentMethodFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  paymentMethodFilter === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                همه
              </button>
              <button
                onClick={() => setPaymentMethodFilter('bank')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  paymentMethodFilter === 'bank' ? 'bg-blue-500 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                کارت‌خوان و بانک
              </button>
              <button
                onClick={() => setPaymentMethodFilter('cash')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  paymentMethodFilter === 'cash' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                نقدی
              </button>
              <button
                onClick={() => setPaymentMethodFilter('check')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  paymentMethodFilter === 'check' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                چک
              </button>
            </div>
          )}

          {/* Returns Filter */}
          {type === 'returns' && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setReturnTypeFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  returnTypeFilter === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                همه
              </button>
              <button
                onClick={() => setReturnTypeFilter('from_customer')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  returnTypeFilter === 'from_customer' ? 'bg-rose-500 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                از مشتریان
              </button>
              <button
                onClick={() => setReturnTypeFilter('to_supplier')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  returnTypeFilter === 'to_supplier' ? 'bg-indigo-500 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                به تامین‌کننده
              </button>
            </div>
          )}

          {/* Market Receivables Status Filter */}
          {type === 'market_receivables' && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setMarketFilterStatus('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  marketFilterStatus === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                همه ({toPersianDigits(customers.length)})
              </button>
              <button
                onClick={() => setMarketFilterStatus('debtor')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  marketFilterStatus === 'debtor' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                بدهکاران ({toPersianDigits(marketReceivablesItems.debtorCount)})
              </button>
              <button
                onClick={() => setMarketFilterStatus('creditor')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  marketFilterStatus === 'creditor' ? 'bg-blue-500 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                بستانکاران ({toPersianDigits(marketReceivablesItems.creditorCount)})
              </button>
              <button
                onClick={() => setMarketFilterStatus('settled')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  marketFilterStatus === 'settled' ? 'bg-emerald-500 text-white shadow-2xs' : 'text-slate-500'
                }`}
              >
                تسویه شده ({toPersianDigits(marketReceivablesItems.settledCount)})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Table Body Section */}
      <div className="overflow-x-auto">
        {/* VIEW A: Treasury Ledger Table */}
        {['total_liquidity', 'cash', 'bank', 'checks'].includes(type) && (
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">ردیف</th>
                <th className="py-3 px-4 w-28">تاریخ و ساعت</th>
                <th className="py-3 px-4">نوع و بابت</th>
                <th className="py-3 px-4">طرف‌حساب / مشتری</th>
                <th className="py-3 px-4">خزانه / منبع</th>
                <th className="py-3 px-4">توضیحات و اسناد</th>
                <th className="py-3 px-4 text-left">مبلغ گردش (تومان)</th>
                <th className="py-3 px-4 text-left font-black">مانده تجمعی (تومان)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    موردی مطابق با فیلترها و جستجوی شما یافت نشد.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item: any, idx: number) => {
                  const rowIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={`ledger-${item.id || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {toPersianDigits(rowIndex)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{toPersianDigits(item.date)}</span>
                        </div>
                        {item.time && (
                          <span className="text-[10px] text-slate-400 block mt-0.5 dir-ltr text-right">
                            {toPersianDigits(item.time)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          item.type === 'inflow' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                          item.type === 'outflow' ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' :
                          'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        }`}>
                          {item.type === 'inflow' ? <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> :
                           item.type === 'outflow' ? <ArrowUpRight className="w-3 h-3 text-rose-500" /> :
                           <TrendingUp className="w-3 h-3 text-blue-500" />}
                          <span>{item.category}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {item.party}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {item.sourceLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        <p className="line-clamp-1">{item.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          {item.invoiceNumber && <span>فاکتور: {toPersianDigits(item.invoiceNumber)}</span>}
                          {item.referenceNumber && <span>پیگیری: {toPersianDigits(item.referenceNumber)}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <span className={`font-black text-sm dir-ltr ${
                          item.type === 'inflow' ? 'text-emerald-600 dark:text-emerald-400' :
                          item.type === 'outflow' ? 'text-rose-600 dark:text-rose-400' :
                          'text-blue-600 dark:text-blue-400'
                        }`}>
                          {item.type === 'inflow' ? '+' : item.type === 'outflow' ? '-' : '⇄ '}
                          {formatPrice(item.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap font-black text-slate-900 dark:text-white dir-ltr">
                        {formatPrice(item.runningBalance || 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* VIEW B: Inventory Valuation Table (stock_purchase_cost, stock_selling_value, stock_profit) */}
        {['stock_purchase_cost', 'stock_selling_value', 'stock_profit'].includes(type) && (
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">ردیف</th>
                <th className="py-3 px-4">نام و مشخصات کالا</th>
                <th className="py-3 px-4">دسته‌بندی</th>
                <th className="py-3 px-4 text-center">موجودی کل</th>
                <th className="py-3 px-4 text-left">قیمت خرید (تومان)</th>
                <th className="py-3 px-4 text-left">قیمت فروش (تومان)</th>
                {type === 'stock_profit' ? (
                  <>
                    <th className="py-3 px-4 text-left text-purple-600 dark:text-purple-400 font-black">سود هر عدد</th>
                    <th className="py-3 px-4 text-center">درصد مارک‌آپ</th>
                    <th className="py-3 px-4 text-left text-purple-600 dark:text-purple-400 font-black">سود کل موجودی</th>
                  </>
                ) : type === 'stock_selling_value' ? (
                  <>
                    <th className="py-3 px-4 text-left text-emerald-600 dark:text-emerald-400 font-black">ارزش کل فروش</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4 text-left text-indigo-600 dark:text-indigo-400 font-black">ارزش دفتری خرید</th>
                    <th className="py-3 px-4 text-center">سهم از انبار</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    کالایی یافت نشد.
                  </td>
                </tr>
              ) : (
                paginatedData.map((p: any, idx: number) => {
                  const rowIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  const share = inventoryStockItems.totalPurchaseCost > 0 
                    ? ((p.totalPurchase / inventoryStockItems.totalPurchaseCost) * 100).toFixed(1)
                    : '0';

                  return (
                    <tr key={`stock-${p.id || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {toPersianDigits(rowIndex)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900 dark:text-white">{p.name}</div>
                        <span className="text-[10px] text-slate-400">کد/بارکد: {toPersianDigits(p.barcode)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-[11px] font-bold">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <div className="text-slate-900 dark:text-white">
                          {toPersianDigits(p.stockPieces.toLocaleString())} عدد
                        </div>
                        {p.piecesPerCarton > 1 && (
                          <span className="text-[10px] text-slate-400 block">
                            ({toPersianDigits(p.cartons)} کارتن {p.extraPieces > 0 ? `+ ${toPersianDigits(p.extraPieces)} دانه` : ''})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-left dir-ltr text-slate-700 dark:text-slate-300 font-bold">
                        {formatPrice(p.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-left dir-ltr text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatPrice(p.sellingPrice)}
                      </td>

                      {type === 'stock_profit' ? (
                        <>
                          <td className="py-3 px-4 text-left dir-ltr font-black text-purple-600 dark:text-purple-400">
                            {formatPrice(p.unitMargin)}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-400">
                            {toPersianDigits(p.markupPercentage.toFixed(1))}٪
                          </td>
                          <td className="py-3 px-4 text-left dir-ltr font-black text-purple-600 dark:text-purple-400">
                            {formatPrice(p.totalMargin)}
                          </td>
                        </>
                      ) : type === 'stock_selling_value' ? (
                        <>
                          <td className="py-3 px-4 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400">
                            {formatPrice(p.totalSelling)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-left dir-ltr font-black text-indigo-600 dark:text-indigo-400">
                            {formatPrice(p.totalPurchase)}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-500">
                            {toPersianDigits(share)}٪
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* VIEW C: Payments Inflow Table (payments_inflow) */}
        {type === 'payments_inflow' && (
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">ردیف</th>
                <th className="py-3 px-4 w-28">تاریخ و ساعت</th>
                <th className="py-3 px-4">مشتری / طرف‌حساب</th>
                <th className="py-3 px-4">روش دریافت</th>
                <th className="py-3 px-4">شماره پیگیری / فیش</th>
                <th className="py-3 px-4">بابت و شرح</th>
                <th className="py-3 px-4 text-left font-black">مبلغ دریافتی (تومان)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    موردی یافت نشد.
                  </td>
                </tr>
              ) : (
                paginatedData.map((p: any, idx: number) => {
                  const rowIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={`pay-${p.id || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {toPersianDigits(rowIndex)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div>{toPersianDigits(p.date)}</div>
                        {p.time && <span className="text-[10px] text-slate-400 block dir-ltr text-right">{toPersianDigits(p.time)}</span>}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {p.customerName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          p.methodType === 'cash' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200' :
                          p.methodType === 'check' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200' :
                          'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200'
                        }`}>
                          {p.methodLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {toPersianDigits(p.referenceNumber)}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {p.description}
                      </td>
                      <td className="py-3 px-4 text-left font-black text-sm text-emerald-600 dark:text-emerald-400 dir-ltr whitespace-nowrap">
                        +{formatPrice(p.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* VIEW D: Market Receivables Table (market_receivables) */}
        {type === 'market_receivables' && (
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">ردیف</th>
                <th className="py-3 px-4">نام طرف‌حساب</th>
                <th className="py-3 px-4">شماره تماس و شهر</th>
                <th className="py-3 px-4 text-left">مانده اولیه (تومان)</th>
                <th className="py-3 px-4 text-left">خرید نسیه/اعتباری (تومان)</th>
                <th className="py-3 px-4 text-left">مجموع پرداختی‌ها (تومان)</th>
                <th className="py-3 px-4 text-left">مرجوعی کسر شده (تومان)</th>
                <th className="py-3 px-4 text-center">وضعیت حساب</th>
                <th className="py-3 px-4 text-left font-black">مانده حساب زنده (تومان)</th>
                <th className="py-3 px-4 text-center">سهم از کل مطالبات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    هیچ طرف‌حسابی مطابق با فیلتر انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                paginatedData.map((c: any, idx: number) => {
                  const rowIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={`cust-${c.id || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {toPersianDigits(rowIndex)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-black text-slate-900 dark:text-white">{c.name}</div>
                        {c.company && <span className="text-[10px] text-slate-400">{c.company}</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div>{toPersianDigits(c.phone)}</div>
                        <span className="text-[10px] text-slate-400">{c.city}</span>
                      </td>
                      <td className="py-3 px-4 text-left dir-ltr text-slate-500">
                        {formatPrice(c.initialBalance)}
                      </td>
                      <td className="py-3 px-4 text-left dir-ltr text-slate-700 dark:text-slate-300 font-bold">
                        {formatPrice(c.creditSales)}
                      </td>
                      <td className="py-3 px-4 text-left dir-ltr text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatPrice(c.totalPayments)}
                      </td>
                      <td className="py-3 px-4 text-left dir-ltr text-rose-500 font-bold">
                        {c.returnsDeducted > 0 ? `-${formatPrice(c.returnsDeducted)}` : '۰'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          c.status === 'debtor'
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            : c.status === 'creditor'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {c.status === 'debtor' ? 'بدهکار' : c.status === 'creditor' ? 'بستانکار' : 'تسویه کامل'}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-left dir-ltr font-black text-sm ${
                        c.status === 'debtor'
                          ? 'text-amber-600 dark:text-amber-400'
                          : c.status === 'creditor'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {c.status === 'creditor' ? `(${formatPrice(c.creditBalance)})` : formatPrice(c.liveBalance)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {c.openDebt > 0 ? `${toPersianDigits(c.sharePercent.toFixed(1))}٪` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {/* VIEW E: Product Returns Table (returns) */}
        {type === 'returns' && (
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/70 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">ردیف</th>
                <th className="py-3 px-4 w-28">تاریخ و ساعت</th>
                <th className="py-3 px-4">نوع مرجوعی</th>
                <th className="py-3 px-4">طرف‌حساب</th>
                <th className="py-3 px-4">نام کالا و تعداد</th>
                <th className="py-3 px-4">علت مرجوعی</th>
                <th className="py-3 px-4 text-left">مبلغ ناخالص (تومان)</th>
                <th className="py-3 px-4 text-left font-black text-rose-600 dark:text-rose-400">مبلغ خالص مرجوعی (تومان)</th>
                <th className="py-3 px-4 text-center">وضعیت تسویه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    موردی یافت نشد.
                  </td>
                </tr>
              ) : (
                paginatedData.map((ret: any, idx: number) => {
                  const rowIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={`ret-${ret.id || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {toPersianDigits(rowIndex)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div>{toPersianDigits(ret.date)}</div>
                        {ret.time && <span className="text-[10px] text-slate-400 block dir-ltr text-right">{toPersianDigits(ret.time)}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          ret.type === 'from_customer'
                            ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200'
                            : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200'
                        }`}>
                          {ret.typeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {ret.partyName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{ret.productName}</div>
                        <span className="text-[10px] text-slate-400">
                          {toPersianDigits(ret.totalPieces)} دانه ({toPersianDigits(ret.cartonsCount)} کارتن)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {ret.reason}
                      </td>
                      <td className="py-3 px-4 text-left dir-ltr text-slate-500 font-medium">
                        {formatPrice(ret.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-left dir-ltr font-black text-sm text-rose-600 dark:text-rose-400">
                        {formatPrice(ret.netAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ret.isRefunded
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                        }`}>
                          {ret.isRefunded ? `تسویه شده (${ret.refundMethod === 'cash' ? 'نقد' : 'بانک'})` : 'تسویه در حساب'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. Pagination & Footer Summary Bar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>تعداد کل نتایج: {toPersianDigits(filteredData.length)} ردیف</span>
          <span>•</span>
          <span>صفحه {toPersianDigits(currentPage)} از {toPersianDigits(totalPages)}</span>
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </motion.div>
  );
};
