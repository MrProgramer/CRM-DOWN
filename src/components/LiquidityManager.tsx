import React, { useState, useMemo, useEffect } from 'react';
import { CustomerPayment, Customer, StoreSettings, ProductReturn, Invoice, Product, TreasuryTransaction } from '../types';
export type { TreasuryTransaction };
import { themes, getThemeBadges } from './ThemeConfig';
import { SmartPriceInput } from './SmartPriceInput';
import { SortableTableHeader } from './SortableTableHeader';
import { 
  formatPrice, 
  formatAmountScale,
  toPersianDigits, 
  getCurrentPersianDate, 
  getCurrentPersianTime,
  formatCartonText,
  isDateInPeriod,
  TimePeriodFilter,
  getNetReturnAmount,
  getSavedTimePeriod,
  saveTimePeriod
} from '../utils/formatters';
import {
  getCustomerSalesInvoices,
  getCustomerPayments,
  getCustomerCreditSalesTotal,
  getCustomerReturnsFromTotal,
  calculateCustomerLiveBalance,
  calculateTotalMarketReceivables
} from '../utils/customerBalanceCalculations';
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  X, 
  RefreshCw, 
  CreditCard, 
  Coins, 
  FileText,
  AlertCircle,
  Trash2,
  Package,
  Layers,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  Search,
  Filter,
  CheckCircle2,
  RotateCcw,
  Boxes,
  PieChart as PieChartIcon,
  BarChart3,
  DollarSign,
  FileSpreadsheet,
  Users,
  CheckCheck,
  Building2,
  Scale,
  Pencil,
  AlertTriangle,
  Settings2,
  Tag,
  Truck,
  Activity,
  Zap,
  ShieldCheck,
  Check,
  Calendar,
  Clock,
  ArrowRightLeft,
  Percent,
  ArrowUp,
  ArrowDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Info,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Calculator,
  Target,
  Flame,
  Eye,
  Printer,
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid,
  Legend
} from 'recharts';
import { Pagination } from './Pagination';
import { LiquidityInlineBreakdown, LiquidityBreakdownType } from './LiquidityInlineBreakdown';
import { CapitalInventoryDashboard } from './CapitalInventoryDashboard';



interface LiquidityManagerProps {
  payments: CustomerPayment[];
  customers: Customer[];
  settings: StoreSettings;
  treasuryTransactions: TreasuryTransaction[];
  productReturns?: ProductReturn[];
  invoices?: Invoice[];
  products?: Product[];
  onAddTreasuryTransaction: (tx: Omit<TreasuryTransaction, 'id' | 'createdAt'>) => void;
  onUpdateTreasuryTransaction?: (tx: TreasuryTransaction) => void;
  onDeleteTreasuryTransaction: (id: string) => void;
  onDeletePayment?: (paymentId: string) => void;
}

export const LiquidityManager: React.FC<LiquidityManagerProps> = ({
  payments = [],
  customers = [],
  settings,
  treasuryTransactions = [],
  productReturns = [],
  invoices = [],
  products = [],
  onAddTreasuryTransaction,
  onUpdateTreasuryTransaction,
  onDeleteTreasuryTransaction,
  onDeletePayment,
}) => {
  const theme = themes[settings.themeColor] || themes.teal;
  const badges = useMemo(() => getThemeBadges(settings.themeColor), [settings.themeColor]);
  const [activeMainTab, setActiveMainTab] = useState<'treasury' | 'inventory_capital' | 'audit_report' | 'logs'>('treasury');
  const [auditSubTab, setAuditSubTab] = useState<'products' | 'credits' | 'returns' | 'summary'>('products');
  const [timePeriod, setTimePeriod] = useState<TimePeriodFilter>(() => getSavedTimePeriod('month'));

  // Listen to global time period changes across components
  useEffect(() => {
    const handlePeriodChange = (e: Event) => {
      const customEvent = e as CustomEvent<TimePeriodFilter>;
      if (customEvent.detail && customEvent.detail !== timePeriod) {
        setTimePeriod(customEvent.detail);
      }
    };
    window.addEventListener('bazargani_time_period_changed', handlePeriodChange);
    return () => window.removeEventListener('bazargani_time_period_changed', handlePeriodChange);
  }, [timePeriod]);

  const handleSelectTimePeriod = (periodKey: TimePeriodFilter) => {
    setTimePeriod(periodKey);
    saveTimePeriod(periodKey);
  };
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TreasuryTransaction | null>(null);
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<{ 
    id: string; 
    rawId?: string;
    itemType?: 'treasury' | 'payment';
    amount: number; 
    description: string; 
    type: string; 
    category?: string 
  } | null>(null);
  const [activeAccountTab, setActiveAccountTab] = useState<'all' | 'cash' | 'bank' | 'checks' | 'inflow' | 'expense' | 'returns'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  
  // Pagination for logs
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  type LogSortField = 'date' | 'type' | 'amount' | 'desc';
  const [logSortField, setLogSortField] = useState<LogSortField>('date');
  const [logSortDirection, setLogSortDirection] = useState<'desc' | 'asc'>('desc');
  const logSortOrder = logSortDirection;
  const setLogSortOrder = (fnOrVal: any) => {
    if (typeof fnOrVal === 'function') {
      setLogSortDirection(prev => fnOrVal(prev));
    } else {
      setLogSortDirection(fnOrVal);
    }
  };

  const handleLogSort = (field: LogSortField) => {
    if (logSortField === field) {
      setLogSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setLogSortField(field);
      setLogSortDirection(field === 'type' || field === 'desc' ? 'asc' : 'desc');
    }
  };
  const [auditReturnsSortOrder, setAuditReturnsSortOrder] = useState<'desc' | 'asc'>('desc');

  // Liquidity & Treasury Breakdown Audit Inline state
  const [selectedBreakdownType, setSelectedBreakdownType] = useState<LiquidityBreakdownType | null>(null);

  // Capital & Inventory Advanced States
  const [capitalChartType, setCapitalChartType] = useState<'donut' | 'bar'>('donut');
  const [capitalSimulatorStockPct, setCapitalSimulatorStockPct] = useState(30);
  const [capitalSimulatorReceivablesPct, setCapitalSimulatorReceivablesPct] = useState(50);
  const [capitalLeaderSort, setCapitalLeaderSort] = useState<'value' | 'profit' | 'margin' | 'stock'>('value');
  const [capitalLeaderCategory, setCapitalLeaderCategory] = useState('all');
  const [capitalLeaderSearch, setCapitalLeaderSearch] = useState('');
  const [capitalLeaderPage, setCapitalLeaderPage] = useState(1);
  const [capitalLeaderPerPage] = useState(6);
  const [capitalSimulatorExpanded, setCapitalSimulatorExpanded] = useState(true);

  // Pagination for audit sub-tables
  const [auditProductsPage, setAuditProductsPage] = useState(1);
  const [auditProductsPerPage, setAuditProductsPerPage] = useState(10);

  const [auditCreditsPage, setAuditCreditsPage] = useState(1);
  const [auditCreditsPerPage, setAuditCreditsPerPage] = useState(10);

  const [auditReturnsPage, setAuditReturnsPage] = useState(1);
  const [auditReturnsPerPage, setAuditReturnsPerPage] = useState(10);

  // Form states
  const [txType, setTxType] = useState<'expense' | 'transfer' | 'deposit'>('expense');
  const [source, setSource] = useState<'cash' | 'bank' | 'personal'>('cash');
  const [destination, setDestination] = useState<'cash' | 'bank'>('bank');
  const [impactOnLiquidity, setImpactOnLiquidity] = useState<'deduct' | 'none' | 'inject'>('deduct');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('کرایه بار و پیک / حمل‌ونقل کالا');
  const [description, setDescription] = useState('');

  // Default initial categories
  const defaultExpenseCategories = [
    'کرایه بار و پیک / حمل‌ونقل کالا',
    'حقوق و دستمزد پرسنل',
    'اجاره‌بهای انبار و دفتر',
    'قبوض و انرژی انبار',
    'هزینه بسته‌بندی و ارسال (لجستیک)',
    'خرید تنخواه انبار',
    'سایر هزینه‌ها'
  ];

  // Persistent user-defined custom categories
  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('app_expense_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return defaultExpenseCategories;
  });

  // Save custom categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_expense_categories', JSON.stringify(expenseCategories));
    } catch (e) {
      console.error('Failed to save expense categories to localStorage', e);
    }
  }, [expenseCategories]);

  // Category Manager Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState('');

  // 🌟 Advanced Chart Fullscreen & Display Modes
  const [fullscreenChart, setFullscreenChart] = useState<'treasury_distribution' | 'payment_channels' | 'cashflow_timeline' | 'expenses_breakdown' | null>(null);
  const [treasuryChartMode, setTreasuryChartMode] = useState<'bar' | 'donut'>('bar');
  const [cashflowTimelineChartMode, setCashflowTimelineChartMode] = useState<'area' | 'bar'>('area');

  // Helper for detecting payment methods reliably
  const isCashMethod = (method: string = '') => {
    const m = method.toLowerCase();
    return m === 'cash' || m.includes('نقد') || m.includes('کشو');
  };

  const isBankMethod = (method: string = '') => {
    const m = method.toLowerCase();
    return m === 'card' || m === 'bank_transfer' || m === 'transfer' || m.includes('کارت') || m.includes('بانک') || m.includes('حواله') || m.includes('پوز');
  };

  const isCheckMethod = (method: string = '') => {
    const m = method.toLowerCase();
    return m === 'check' || m === 'cheque' || m.includes('چک');
  };

  // Ensure relational integrity: filter out any orphaned payments from deleted customers
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

  // Ensure relational integrity for customer returns
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

  // --- Cumulative Balances (All-Time Instant Liquidity & Net Assets) ---
  const validPayments = useMemo(() => {
    return relationalPayments.filter(p => (Number(p.amount) || 0) > 0);
  }, [relationalPayments]);

  const totalReceivedCash = useMemo(() => {
    return validPayments
      .filter(p => isCashMethod(p.paymentMethod))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [validPayments]);

  const totalReceivedCardBank = useMemo(() => {
    return validPayments
      .filter(p => isBankMethod(p.paymentMethod) || (!isCashMethod(p.paymentMethod) && !isCheckMethod(p.paymentMethod)))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [validPayments]);

  const totalReceivedChecks = useMemo(() => {
    return validPayments
      .filter(p => isCheckMethod(p.paymentMethod))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [validPayments]);

  const totalCustomerPaymentsInflow = useMemo(() => {
    return validPayments
      .filter(p => Number(p.amount || 0) > 0)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [validPayments]);

  // Direct Cash Sales from finalized invoices
  const directCashSalesInvoices = useMemo(() => {
    return invoices.filter(inv => inv.type === 'sale' && !inv.isDraft && (inv.paymentStatus === 'cash' || inv.paymentMethod?.includes('نقد') || inv.paymentMethod?.includes('کارت')));
  }, [invoices]);

  // Manual Treasury Transactions (All Time)
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

  const totalManualExpensesPersonal = treasuryTransactions
    .filter(t => t.type === 'expense' && (t.source === 'personal' || t.impactOnLiquidity === 'none'))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Transfers
  const cashToBankTransfers = treasuryTransactions
    .filter(t => t.type === 'transfer' && t.source === 'cash' && t.destination === 'bank')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const bankToCashTransfers = treasuryTransactions
    .filter(t => t.type === 'transfer' && t.source === 'bank' && t.destination === 'cash')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Refunded Returns (All Time)
  const refundedReturnsToSupplierCash = relationalReturns
    .filter(r => r.isRefunded && r.type === 'to_supplier' && r.refundMethod === 'cash')
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  const refundedReturnsToSupplierBank = relationalReturns
    .filter(r => r.isRefunded && r.type === 'to_supplier' && r.refundMethod === 'bank')
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  const refundedReturnsFromCustomerCash = relationalReturns
    .filter(r => r.isRefunded && r.type === 'from_customer' && r.refundMethod === 'cash')
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  const refundedReturnsFromCustomerBank = relationalReturns
    .filter(r => r.isRefunded && r.type === 'from_customer' && r.refundMethod === 'bank')
    .reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  // Customer Payouts / Refunds from Treasury (All Time)
  const customerPayoutsCash = useMemo(() => {
    return relationalPayments
      .filter(p => (Number(p.amount) || 0) < 0 && (p.type === 'payout' || p.description?.includes('عودت') || p.description?.includes('پرداخت بستانکاری') || p.description?.includes('بازپرداخت')) && isCashMethod(p.paymentMethod))
      .reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0);
  }, [relationalPayments]);

  const customerPayoutsBank = useMemo(() => {
    return relationalPayments
      .filter(p => (Number(p.amount) || 0) < 0 && (p.type === 'payout' || p.description?.includes('عودت') || p.description?.includes('پرداخت بستانکاری') || p.description?.includes('بازپرداخت')) && isBankMethod(p.paymentMethod))
      .reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0);
  }, [relationalPayments]);

  // Invoice Expenses Paid from Cash or Bank
  const invoiceExpensesCash = useMemo(() => {
    return invoices.filter(inv => !inv.isDraft).reduce((sum, inv) => {
      const exps = (inv.expenses || []).filter(e => e.sourceAccount === 'cash');
      return sum + exps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    }, 0);
  }, [invoices]);

  const invoiceExpensesBank = useMemo(() => {
    return invoices.filter(inv => !inv.isDraft).reduce((sum, inv) => {
      const exps = (inv.expenses || []).filter(e => e.sourceAccount === 'bank');
      return sum + exps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    }, 0);
  }, [invoices]);

  // Net Liquid Balances (Cumulative Real-Time Safe & Bank strictly from actual cash/bank flows)
  const netCashBalance = totalReceivedCash + totalManualDepositsCash + bankToCashTransfers + refundedReturnsToSupplierCash - totalManualExpensesCash - cashToBankTransfers - customerPayoutsCash - refundedReturnsFromCustomerCash;
  const netBankBalance = totalReceivedCardBank + totalManualDepositsBank + cashToBankTransfers + refundedReturnsToSupplierBank - totalManualExpensesBank - bankToCashTransfers - customerPayoutsBank - refundedReturnsFromCustomerBank;
  const netChecksBalance = totalReceivedChecks;
  const totalLiquidity = netCashBalance + netBankBalance;

  // Capital, Inventory & Market Credit Cycle
  const totalPurchasesCostFromInvoices = useMemo(() => {
    return invoices
      .filter(inv => inv.type === 'purchase' && !inv.isDraft)
      .reduce((sum, inv) => sum + (Number(inv.finalAmount) || 0), 0);
  }, [invoices]);

  const remainingStockPurchaseCost = useMemo(() => {
    return products.reduce((sum, p) => {
      const stock = Number(p.stockPieces) || 0;
      const price = Number(p.purchasePrice) || 0;
      return sum + (stock * price);
    }, 0);
  }, [products]);

  const remainingStockSellingValue = useMemo(() => {
    return products.reduce((sum, p) => {
      const stock = Number(p.stockPieces) || 0;
      const price = Number(p.sellingPrice) || 0;
      return sum + (stock * price);
    }, 0);
  }, [products]);

  const potentialStockProfit = useMemo(() => {
    return Math.max(0, remainingStockSellingValue - remainingStockPurchaseCost);
  }, [remainingStockSellingValue, remainingStockPurchaseCost]);

  const totalMarketCreditReceivables = useMemo(() => {
    return calculateTotalMarketReceivables(customers, invoices, relationalPayments, relationalReturns);
  }, [customers, invoices, relationalPayments, relationalReturns]);

  const totalCustomerReturnsValue = useMemo(() => {
    return relationalReturns
      .filter(r => r.type === 'from_customer')
      .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  }, [relationalReturns]);

  const totalSupplierReturnsValue = useMemo(() => {
    return relationalReturns
      .filter(r => r.type === 'to_supplier')
      .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  }, [relationalReturns]);

  const totalCapitalInjected = totalPurchasesCostFromInvoices > 0 
    ? (totalPurchasesCostFromInvoices + (remainingStockPurchaseCost > totalPurchasesCostFromInvoices ? remainingStockPurchaseCost - totalPurchasesCostFromInvoices : 0))
    : remainingStockPurchaseCost;

  const salesSummary = useMemo(() => {
    let salesRev = 0;
    let salesCost = 0;
    invoices.filter(inv => inv.type === 'sale' && !inv.isDraft).forEach(inv => {
      salesRev += Number(inv.finalAmount) || 0;
      inv.items.forEach(it => {
        const cost = it.totalPurchaseCost || (it.totalPieces * (it.unitPurchasePrice || 0));
        salesCost += cost;
      });
    });
    return { salesRev, salesCost, grossProfit: Math.max(0, salesRev - salesCost) };
  }, [invoices]);

  const totalCurrentNetAssets = totalLiquidity + remainingStockPurchaseCost + totalMarketCreditReceivables + netChecksBalance;
  const totalOperatingExpenses = totalManualExpensesCash + totalManualExpensesBank + totalManualExpensesPersonal;

  // --- 🌟 PERIOD FILTERED CALCULATIONS (عملکرد دوره انتخابی: ماه، ۳ ماهه، ۶ ماهه، سالیانه، ...) ---
  const periodPayments = useMemo(() => {
    return relationalPayments.filter(p => isDateInPeriod(p.date, timePeriod));
  }, [relationalPayments, timePeriod]);

  const periodValidPayments = useMemo(() => {
    return periodPayments.filter(p => (Number(p.amount) || 0) > 0);
  }, [periodPayments]);

  const periodReceivedCash = useMemo(() => {
    return periodValidPayments
      .filter(p => isCashMethod(p.paymentMethod))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [periodValidPayments]);

  const periodReceivedCardBank = useMemo(() => {
    return periodValidPayments
      .filter(p => isBankMethod(p.paymentMethod) || (!isCashMethod(p.paymentMethod) && !isCheckMethod(p.paymentMethod)))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [periodValidPayments]);

  const periodReceivedChecks = useMemo(() => {
    return periodValidPayments
      .filter(p => isCheckMethod(p.paymentMethod))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [periodValidPayments]);

  const periodCustomerInflow = useMemo(() => {
    return periodValidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [periodValidPayments]);

  const periodTreasuryTransactions = useMemo(() => {
    return treasuryTransactions.filter(t => isDateInPeriod(t.date, timePeriod));
  }, [treasuryTransactions, timePeriod]);

  const periodManualDeposits = useMemo(() => {
    return periodTreasuryTransactions
      .filter(t => (t.type === 'deposit') || (t.type === 'expense' && t.source === 'personal' && t.impactOnLiquidity === 'inject'))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [periodTreasuryTransactions]);

  const periodManualExpenses = useMemo(() => {
    return periodTreasuryTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [periodTreasuryTransactions]);

  const periodTransfersVolume = useMemo(() => {
    return periodTreasuryTransactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [periodTreasuryTransactions]);

  const periodReturns = useMemo(() => {
    return relationalReturns.filter(r => isDateInPeriod(r.date, timePeriod));
  }, [relationalReturns, timePeriod]);

  const periodSupplierRefunds = useMemo(() => {
    return periodReturns
      .filter(r => r.isRefunded && r.type === 'to_supplier')
      .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  }, [periodReturns]);

  const periodCustomerRefunds = useMemo(() => {
    return periodReturns
      .filter(r => r.isRefunded && r.type === 'from_customer')
      .reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  }, [periodReturns]);

  const periodInvoiceExpenses = useMemo(() => {
    return invoices
      .filter(inv => !inv.isDraft && isDateInPeriod(inv.date, timePeriod))
      .reduce((sum, inv) => {
        const exps = (inv.expenses || []).filter(e => e.sourceAccount === 'cash' || e.sourceAccount === 'bank');
        return sum + exps.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      }, 0);
  }, [invoices, timePeriod]);

  // Total Inflows & Outflows in the selected period (strictly cash/bank movements)
  const periodTotalInflows = periodCustomerInflow + periodManualDeposits;
  const periodTotalOutflows = periodManualExpenses + periodInvoiceExpenses;
  const periodNetCashflow = periodTotalInflows - periodTotalOutflows;

  // Invoices in selected period
  const periodInvoices = useMemo(() => {
    return invoices.filter(inv => isDateInPeriod(inv.date, timePeriod) && !inv.isDraft);
  }, [invoices, timePeriod]);

  const periodSalesSummary = useMemo(() => {
    let salesRev = 0;
    let salesCost = 0;
    let count = 0;
    periodInvoices.filter(inv => inv.type === 'sale').forEach(inv => {
      count++;
      salesRev += Number(inv.finalAmount) || 0;
      inv.items.forEach(it => {
        const cost = it.totalPurchaseCost || (it.totalPieces * (it.unitPurchasePrice || 0));
        salesCost += cost;
      });
    });
    return {
      count,
      salesRev,
      salesCost,
      grossProfit: Math.max(0, salesRev - salesCost),
    };
  }, [periodInvoices]);

  const periodPurchasesTotal = useMemo(() => {
    return periodInvoices
      .filter(inv => inv.type === 'purchase')
      .reduce((sum, inv) => sum + (Number(inv.finalAmount) || 0), 0);
  }, [periodInvoices]);

  // 7. Combined Unified Log Rows
  type LiquidityLog = {
    id: string;
    rawId?: string;
    itemType?: 'treasury' | 'payment' | 'return';
    type: 'inflow' | 'expense' | 'transfer' | 'deposit' | 'return';
    category: string;
    sourceName: string;
    targetName: string;
    amount: number;
    date: string;
    time: string;
    description: string;
    referenceCode?: string;
    timestamp: number;
  };

  const logs: LiquidityLog[] = useMemo(() => {
    const list: LiquidityLog[] = [];

    // Add customer payments (only relational/active customers)
    relationalPayments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (amt === 0) return;

      const isDeposit = amt > 0;
      const methodLabel = isCashMethod(p.paymentMethod) 
        ? 'صندوق نقدی' 
        : isBankMethod(p.paymentMethod) 
        ? 'حساب بانکی' 
        : isCheckMethod(p.paymentMethod) 
        ? 'صندوق چک صیادی' 
        : 'حساب بانکی';

      list.push({
        id: `pay-${p.id}`,
        rawId: p.id,
        itemType: 'payment',
        type: isDeposit ? 'inflow' : 'expense',
        category: isDeposit ? 'واریزی مشتری' : 'ثبت بدهی',
        sourceName: `مشتری: ${p.customerName}`,
        targetName: isDeposit ? methodLabel : 'افزایش بدهی دفتری',
        amount: Math.abs(amt),
        date: p.date,
        time: p.time || '12:00',
        description: p.description || (isDeposit ? `واریز وجه و تسویه حساب` : 'ثبت بدهی دستی'),
        referenceCode: p.referenceNumber,
        timestamp: p.createdAt || Date.now(),
      });
    });

    // Add manual treasury transactions
    treasuryTransactions.forEach(t => {
      let srcLabel = 'صندوق نقدی';
      let tgtLabel = t.type === 'transfer' 
        ? (t.destination === 'cash' ? 'صندوق نقدی' : 'حساب بانکی') 
        : (t.type === 'expense' ? t.category : 'افزایش اعتبار خزانه');

      if (t.source === 'personal') {
        if (t.impactOnLiquidity === 'inject') {
          srcLabel = 'جیب شخصی (با افزایش آورده به صندوق)';
        } else {
          srcLabel = 'جیب شخصی مالک (بدون کسر از نقدینگی)';
        }
      } else if (t.source === 'bank') {
        srcLabel = 'حساب بانکی';
      } else {
        srcLabel = 'صندوق نقدی';
      }

      list.push({
        id: t.id.startsWith('tx-') ? t.id : `tx-${t.id}`,
        rawId: t.id,
        itemType: 'treasury',
        type: t.type,
        category: t.category,
        sourceName: srcLabel,
        targetName: tgtLabel,
        amount: Number(t.amount) || 0,
        date: t.date,
        time: t.time || '12:00',
        description: t.description,
        timestamp: t.createdAt || Date.now(),
      });
    });

    // Add returns
    relationalReturns.forEach(r => {
      if (r.isRefunded) {
        list.push({
          id: `ret-${r.id}`,
          rawId: r.id,
          itemType: 'return',
          type: 'return',
          category: r.type === 'to_supplier' ? 'مرجوعی به شرکت' : 'مرجوعی از مشتری',
          sourceName: r.type === 'to_supplier' ? `شرکت: ${r.customerName}` : (r.refundMethod === 'cash' ? 'صندوق نقدی' : 'حساب بانکی'),
          targetName: r.type === 'to_supplier' ? (r.refundMethod === 'cash' ? 'صندوق نقدی' : 'حساب بانکی') : `مشتری: ${r.customerName}`,
          amount: Number(r.totalAmount) || 0,
          date: r.date,
          time: r.time || '12:00',
          description: `تسویه نقدی مرجوعی - ${r.productName} (${r.reason})`,
          timestamp: r.createdAt || Date.now(),
        });
      }
    });

    // Add invoice expenses, freights and losses (کرایه بار و ضایعات فاکتور)
    invoices.forEach(inv => {
      if (inv.isDraft) return;
      (inv.expenses || []).forEach((exp, eIdx) => {
        if (!exp.amount || exp.amount <= 0) return;
        const isCash = exp.sourceAccount === 'cash';
        const isBank = exp.sourceAccount === 'bank';
        const srcLabel = isCash ? 'صندوق نقدی' : isBank ? 'حساب بانکی' : 'ثبت دفتری فاکتور (بدون وجه نقد)';
        const catLabel = exp.type === 'freight' ? 'کرایه باربری' : exp.type === 'loss_waste' ? 'ضایعات و کالای منقضی' : exp.type === 'handling' ? 'تخلیه و بارگیری' : exp.type === 'damage' ? 'خسارت بار' : 'هزینه فاکتور';

        list.push({
          id: `inv-exp-${inv.id}-${exp.id || eIdx}`,
          rawId: exp.id,
          itemType: 'treasury',
          type: 'expense',
          category: catLabel,
          sourceName: srcLabel,
          targetName: `فاکتور #${toPersianDigits(inv.invoiceNumber)} (${inv.customerName})`,
          amount: exp.amount,
          date: inv.date,
          time: inv.time || '12:00',
          description: `${exp.title} (فاکتور #${toPersianDigits(inv.invoiceNumber)} - ${exp.action === 'deduct' ? 'کسر از فاکتور' : exp.action === 'add' ? 'افزودن به فاکتور' : 'ثبت در نقدینگی'})`,
          referenceCode: `INV-${inv.invoiceNumber}`,
          timestamp: (inv.createdAt || Date.now()) + eIdx,
        });
      });
    });

    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  }, [relationalPayments, treasuryTransactions, relationalReturns, invoices]);

  // Detailed Product Audit (گردش، ورود، خروج، مرجوعی، قیمت‌های بروز و ارزش موجودی)
  const itemizedProductAudit = useMemo(() => {
    return products.map((prod) => {
      const pId = prod.id;
      const pName = prod.name?.trim().toLowerCase();

      // Purchases (ورود کالا)
      let totalPurchasedPieces = 0;
      let totalPurchasedCost = 0;
      invoices.filter(inv => inv.type === 'purchase' && !inv.isDraft).forEach(inv => {
        inv.items.forEach(it => {
          if (it.productId === pId || it.productName?.trim().toLowerCase() === pName) {
            totalPurchasedPieces += it.totalPieces || 0;
            totalPurchasedCost += it.totalPrice || (it.totalPieces * (it.unitPurchasePrice || prod.purchasePrice || 0));
          }
        });
      });

      // Sales (خروج و فروش کالا)
      let totalSoldPieces = 0;
      let totalSoldRevenue = 0;
      invoices.filter(inv => inv.type === 'sale' && !inv.isDraft).forEach(inv => {
        inv.items.forEach(it => {
          if (it.productId === pId || it.productName?.trim().toLowerCase() === pName) {
            totalSoldPieces += it.totalPieces || 0;
            totalSoldRevenue += it.totalPrice || (it.totalPieces * (it.unitPrice || prod.sellingPrice || 0));
          }
        });
      });

      // Returns from Customer (مرجوعی از مشتری)
      let customerReturnsPieces = 0;
      let customerReturnsAmount = 0;
      relationalReturns.filter(r => r.type === 'from_customer').forEach(r => {
        if (r.productId === pId || r.productName?.trim().toLowerCase() === pName) {
          customerReturnsPieces += r.totalPieces || 0;
          customerReturnsAmount += getNetReturnAmount(r);
        }
      });

      // Returns to Supplier (مرجوعی به شرکت)
      let supplierReturnsPieces = 0;
      let supplierReturnsAmount = 0;
      relationalReturns.filter(r => r.type === 'to_supplier').forEach(r => {
        if (r.productId === pId || r.productName?.trim().toLowerCase() === pName) {
          supplierReturnsPieces += r.totalPieces || 0;
          supplierReturnsAmount += getNetReturnAmount(r);
        }
      });

      const stockPieces = Number(prod.stockPieces) || 0;
      const purchasePrice = Number(prod.purchasePrice) || 0;
      const sellingPrice = Number(prod.sellingPrice) || 0;
      const piecesPerCarton = Number(prod.piecesPerCarton) || 1;

      const totalInventoryPurchaseValue = stockPieces * purchasePrice;
      const totalInventorySellingValue = stockPieces * sellingPrice;
      const potentialProfit = Math.max(0, totalInventorySellingValue - totalInventoryPurchaseValue);
      const marginPercent = sellingPrice > 0 ? ((sellingPrice - purchasePrice) / sellingPrice) * 100 : 0;

      return {
        id: prod.id,
        name: prod.name,
        category: prod.category || 'عمومی',
        purchasePrice,
        sellingPrice,
        piecesPerCarton,
        stockPieces,
        stockCartonsText: formatCartonText(stockPieces, piecesPerCarton),
        totalPurchasedPieces,
        totalPurchasedCost,
        totalSoldPieces,
        totalSoldRevenue,
        customerReturnsPieces,
        customerReturnsAmount,
        supplierReturnsPieces,
        supplierReturnsAmount,
        totalInventoryPurchaseValue,
        totalInventorySellingValue,
        potentialProfit,
        marginPercent,
      };
    });
  }, [products, invoices, relationalReturns]);

  // Detailed Customer Receivables Audit (ریز نسیه و مانده حساب طرف‌حساب‌ها)
  const itemizedCustomerCreditAudit = useMemo(() => {
    return customers.map(cust => {
      const custInvoices = getCustomerSalesInvoices(cust, invoices);
      const totalInvoiced = custInvoices.reduce((sum, inv) => sum + (Number(inv.finalAmount) || 0), 0);

      const custPayments = getCustomerPayments(cust, relationalPayments);
      const totalPaid = custPayments.filter(p => (Number(p.amount) || 0) > 0).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalManualDebts = custPayments.filter(p => (Number(p.amount) || 0) < 0).reduce((sum, p) => sum + Math.abs(Number(p.amount || 0)), 0);

      const totalReturnedAmount = getCustomerReturnsFromTotal(cust, relationalReturns);

      const initialBal = Number(cust.initialBalance) || 0;
      const netDue = calculateCustomerLiveBalance(cust, invoices, relationalPayments, relationalReturns);

      const sharePercent = totalMarketCreditReceivables > 0 && netDue > 0 ? (netDue / totalMarketCreditReceivables) * 100 : 0;

      return {
        id: cust.id,
        name: cust.name,
        phone: cust.phone || '-',
        city: cust.city || '-',
        initialBalance: initialBal,
        invoicesCount: custInvoices.length,
        totalInvoiced,
        totalPaid,
        totalManualDebts,
        totalReturnedAmount,
        netDue,
        sharePercent,
      };
    }).sort((a, b) => b.netDue - a.netDue);
  }, [customers, invoices, relationalPayments, relationalReturns, totalMarketCreditReceivables]);

  // Filtered Logs by Search, Account and Time Period
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      // Period filter
      if (!isDateInPeriod(l.date, timePeriod)) {
        return false;
      }

      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term ||
        l.sourceName.toLowerCase().includes(term) ||
        l.targetName.toLowerCase().includes(term) ||
        l.description.toLowerCase().includes(term) ||
        (l.referenceCode && l.referenceCode.toLowerCase().includes(term)) ||
        l.date.includes(term) ||
        toPersianDigits(l.date).includes(term) ||
        l.amount.toString().includes(term);

      if (!matchesSearch) return false;

      if (activeAccountTab === 'all') return true;
      if (activeAccountTab === 'cash') return l.sourceName.includes('صندوق') || l.targetName.includes('صندوق');
      if (activeAccountTab === 'bank') return l.sourceName.includes('بانک') || l.targetName.includes('بانک');
      if (activeAccountTab === 'checks') return l.sourceName.includes('چک') || l.targetName.includes('چک');
      if (activeAccountTab === 'inflow') return l.type === 'inflow' || l.type === 'deposit';
      if (activeAccountTab === 'expense') return l.type === 'expense';
      if (activeAccountTab === 'returns') return l.type === 'return';

      return true;
    });
  }, [logs, searchTerm, activeAccountTab, timePeriod]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let cmp = 0;
      if (logSortField === 'amount') {
        cmp = a.amount - b.amount;
      } else if (logSortField === 'type') {
        cmp = (a.type || '').localeCompare(b.type || '');
      } else if (logSortField === 'desc') {
        cmp = (a.description || '').localeCompare(b.description || '', 'fa');
      } else {
        // date / timestamp
        if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) {
          cmp = a.timestamp - b.timestamp;
        } else {
          cmp = (a.date || '').localeCompare(b.date || '');
          if (cmp === 0) {
            cmp = (a.time || '').localeCompare(b.time || '');
          }
        }
      }
      return logSortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredLogs, logSortField, logSortDirection]);

  const totalPages = Math.ceil(sortedLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + itemsPerPage);

  // Paginated Audit Products
  const filteredAuditProducts = useMemo(() => {
    const term = auditSearchTerm.trim().toLowerCase();
    if (!term) return itemizedProductAudit;
    return itemizedProductAudit.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.category.toLowerCase().includes(term)
    );
  }, [itemizedProductAudit, auditSearchTerm]);

  const paginatedAuditProducts = useMemo(() => {
    const start = (auditProductsPage - 1) * auditProductsPerPage;
    return filteredAuditProducts.slice(start, start + auditProductsPerPage);
  }, [filteredAuditProducts, auditProductsPage, auditProductsPerPage]);

  // Paginated Audit Credits
  const filteredAuditCredits = useMemo(() => {
    const term = auditSearchTerm.trim().toLowerCase();
    if (!term) return itemizedCustomerCreditAudit;
    return itemizedCustomerCreditAudit.filter(c => 
      c.name.toLowerCase().includes(term) || 
      c.phone.includes(term) || 
      c.city.includes(term)
    );
  }, [itemizedCustomerCreditAudit, auditSearchTerm]);

  const paginatedAuditCredits = useMemo(() => {
    const start = (auditCreditsPage - 1) * auditCreditsPerPage;
    return filteredAuditCredits.slice(start, start + auditCreditsPerPage);
  }, [filteredAuditCredits, auditCreditsPage, auditCreditsPerPage]);

  // Paginated Audit Returns
  const filteredAuditReturns = useMemo(() => {
    const term = auditSearchTerm.trim().toLowerCase();
    if (!term) return relationalReturns;
    return relationalReturns.filter(r => 
      r.productName.toLowerCase().includes(term) || 
      r.customerName.toLowerCase().includes(term)
    );
  }, [relationalReturns, auditSearchTerm]);

  const sortedAuditReturns = useMemo(() => {
    return [...filteredAuditReturns].sort((a, b) => {
      const ta = a.createdAt || (a.date ? new Date(a.date.replace(/\//g, '-')).getTime() || 0 : 0);
      const tb = b.createdAt || (b.date ? new Date(b.date.replace(/\//g, '-')).getTime() || 0 : 0);
      if (ta && tb && ta !== tb) {
        return auditReturnsSortOrder === 'desc' ? tb - ta : ta - tb;
      }
      const cmp = (b.date || '').localeCompare(a.date || '');
      return auditReturnsSortOrder === 'desc' ? cmp : -cmp;
    });
  }, [filteredAuditReturns, auditReturnsSortOrder]);

  const paginatedAuditReturns = useMemo(() => {
    const start = (auditReturnsPage - 1) * auditReturnsPerPage;
    return sortedAuditReturns.slice(start, start + auditReturnsPerPage);
  }, [sortedAuditReturns, auditReturnsPage, auditReturnsPerPage]);

  // Visual Chart Data & Treasury Proportions
  const totalTreasuryAssets = useMemo(() => {
    return Math.max(0, netCashBalance) + Math.max(0, netBankBalance) + Math.max(0, netChecksBalance);
  }, [netCashBalance, netBankBalance, netChecksBalance]);

  const treasuryChartData = useMemo(() => {
    const total = totalTreasuryAssets || 1;
    return [
      { 
        name: 'وجوه نقد صندوق و تنخواه', 
        shortName: 'صندوق',
        مقدار: Math.max(0, netCashBalance), 
        color: '#10b981', 
        icon: Coins, 
        share: ((Math.max(0, netCashBalance) / total) * 100).toFixed(1) 
      },
      { 
        name: 'موجودی حساب‌های بانکی و کارت‌خوان', 
        shortName: 'بانک و پوز',
        مقدار: Math.max(0, netBankBalance), 
        color: '#3b82f6', 
        icon: CreditCard, 
        share: ((Math.max(0, netBankBalance) / total) * 100).toFixed(1) 
      },
      { 
        name: 'اسناد تجاری و چک‌های صیادی', 
        shortName: 'چک صیادی',
        مقدار: Math.max(0, netChecksBalance), 
        color: '#f59e0b', 
        icon: FileText, 
        share: ((Math.max(0, netChecksBalance) / total) * 100).toFixed(1) 
      },
    ];
  }, [netCashBalance, netBankBalance, netChecksBalance, totalTreasuryAssets]);

  const capitalCycleChartData = [
    { name: 'وجوه وصول‌شده', مقدار: totalCustomerPaymentsInflow, fill: '#10b981', share: ((totalCustomerPaymentsInflow / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
    { name: 'مطالبات تجاری بازار', مقدار: totalMarketCreditReceivables, fill: '#f59e0b', share: ((totalMarketCreditReceivables / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
    { name: 'موجودی انبار (بهای خرید)', مقدار: remainingStockPurchaseCost, fill: '#6366f1', share: ((remainingStockPurchaseCost / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
    { name: 'سود پیش‌بینی انبار', مقدار: potentialStockProfit, fill: '#8b5cf6', share: ((potentialStockProfit / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
  ];

  // Capital Donut Distribution
  const capitalDonutData = useMemo(() => {
    const data = [
      { name: 'نقدینگی در دسترس (صندوق و بانک)', value: Math.max(0, totalLiquidity), color: '#10b981', fill: '#10b981', share: ((Math.max(0, totalLiquidity) / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
      { name: 'ارزش دفتری انبار (بهای خرید)', value: Math.max(0, remainingStockPurchaseCost), color: '#6366f1', fill: '#6366f1', share: ((remainingStockPurchaseCost / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
      { name: 'مطالبات نسیه در بازار', value: Math.max(0, totalMarketCreditReceivables), color: '#f59e0b', fill: '#f59e0b', share: ((totalMarketCreditReceivables / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
      { name: 'اسناد تجاری و چک‌های صیادی', value: Math.max(0, netChecksBalance), color: '#3b82f6', fill: '#3b82f6', share: ((netChecksBalance / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
    ];
    return data.filter(d => d.value > 0);
  }, [totalLiquidity, remainingStockPurchaseCost, totalMarketCreditReceivables, netChecksBalance, totalCurrentNetAssets]);

  // Inventory Products Rich Analysis
  const inventoryLeaderProducts = useMemo(() => {
    return products.map(p => {
      const stock = Number(p.stockPieces) || 0;
      const buyPrice = Number(p.purchasePrice) || 0;
      const sellPrice = Number(p.sellingPrice) || 0;
      const totalBuy = stock * buyPrice;
      const totalSell = stock * sellPrice;
      const profit = Math.max(0, totalSell - totalBuy);
      const margin = totalSell > 0 ? ((profit / totalSell) * 100) : 0;
      const shareOfStock = remainingStockPurchaseCost > 0 ? ((totalBuy / remainingStockPurchaseCost) * 100) : 0;
      return {
        ...p,
        stock,
        buyPrice,
        sellPrice,
        totalBuy,
        totalSell,
        profit,
        margin,
        shareOfStock
      };
    });
  }, [products, remainingStockPurchaseCost]);

  // Filtered & Sorted Leader Products
  const filteredCapitalLeaderProducts = useMemo(() => {
    let list = inventoryLeaderProducts;
    if (capitalLeaderCategory !== 'all') {
      list = list.filter(p => (p.category || 'بدون دسته‌بندی') === capitalLeaderCategory);
    }
    if (capitalLeaderSearch.trim()) {
      const term = capitalLeaderSearch.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(term) || (p.category && p.category.toLowerCase().includes(term)));
    }
    return list;
  }, [inventoryLeaderProducts, capitalLeaderCategory, capitalLeaderSearch]);

  const sortedCapitalLeaderProducts = useMemo(() => {
    return [...filteredCapitalLeaderProducts].sort((a, b) => {
      if (capitalLeaderSort === 'value') return b.totalBuy - a.totalBuy;
      if (capitalLeaderSort === 'profit') return b.profit - a.profit;
      if (capitalLeaderSort === 'margin') return b.margin - a.margin;
      if (capitalLeaderSort === 'stock') return b.stock - a.stock;
      return 0;
    });
  }, [filteredCapitalLeaderProducts, capitalLeaderSort]);

  const paginatedCapitalLeaderProducts = useMemo(() => {
    const start = (capitalLeaderPage - 1) * capitalLeaderPerPage;
    return sortedCapitalLeaderProducts.slice(start, start + capitalLeaderPerPage);
  }, [sortedCapitalLeaderProducts, capitalLeaderPage, capitalLeaderPerPage]);

  // Category Distribution for Inventory Capital
  const categoryCapitalDistribution = useMemo(() => {
    const map: { [cat: string]: { name: string; count: number; totalPieces: number; buyValue: number; sellValue: number; profit: number } } = {};
    inventoryLeaderProducts.forEach(p => {
      const cat = p.category?.trim() || 'بدون دسته‌بندی';
      if (!map[cat]) {
        map[cat] = { name: cat, count: 0, totalPieces: 0, buyValue: 0, sellValue: 0, profit: 0 };
      }
      map[cat].count += 1;
      map[cat].totalPieces += p.stock;
      map[cat].buyValue += p.totalBuy;
      map[cat].sellValue += p.totalSell;
      map[cat].profit += p.profit;
    });
    return Object.values(map).sort((a, b) => b.buyValue - a.buyValue);
  }, [inventoryLeaderProducts]);

  // Active Debtors Count
  const activeDebtorsCount = useMemo(() => {
    return customers.filter(c => {
      const bal = calculateCustomerLiveBalance(c, invoices, relationalPayments, relationalReturns);
      return bal < -1000;
    }).length;
  }, [customers, invoices, relationalPayments, relationalReturns]);

  // Simulator Projections
  const simulatorProjectedCashFromStock = remainingStockSellingValue * (capitalSimulatorStockPct / 100);
  const simulatorProjectedProfitFromStock = potentialStockProfit * (capitalSimulatorStockPct / 100);
  const simulatorProjectedCashFromReceivables = totalMarketCreditReceivables * (capitalSimulatorReceivablesPct / 100);
  const simulatorTotalProjectedNewInflow = simulatorProjectedCashFromStock + simulatorProjectedCashFromReceivables;
  const simulatorProjectedFinalLiquidity = totalLiquidity + simulatorTotalProjectedNewInflow;
  const totalEstimatedEnterpriseWealth = totalCurrentNetAssets + potentialStockProfit;

  // Payment Breakdown for Selected Period
  const periodPaymentMethodsBreakdown = [
    { name: 'نقدی (صندوق)', value: periodReceivedCash, fill: '#10b981' },
    { name: 'کارت و پوز بانکی', value: periodReceivedCardBank, fill: '#3b82f6' },
    { name: 'چک صیادی', value: periodReceivedChecks, fill: '#f59e0b' },
  ];

  // Dynamic Expenses Breakdown by Category (in Period)
  const periodExpenseByCategoryData = useMemo(() => {
    const map: { [key: string]: number } = {};
    periodTreasuryTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'سایر هزینه‌ها';
      map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
    });
    const palette = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#10b981', '#3b82f6'];
    const list = Object.keys(map).map((cat, idx) => ({
      name: cat,
      amount: map[cat],
      fill: palette[idx % palette.length],
      percent: periodManualExpenses > 0 ? ((map[cat] / periodManualExpenses) * 100).toFixed(1) : '0'
    }));
    return list.sort((a, b) => b.amount - a.amount);
  }, [periodTreasuryTransactions, periodManualExpenses]);

  // Cashflow Timeline Trend in Period (ورودی در برابر خروجی روزانه/دوره‌ای)
  const cashflowTimelineData = useMemo(() => {
    const dateMap: { [date: string]: { date: string; inflow: number; expense: number; net: number } } = {};

    // Inflows from payments
    periodPayments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (amt > 0) {
        if (!dateMap[p.date]) dateMap[p.date] = { date: p.date, inflow: 0, expense: 0, net: 0 };
        dateMap[p.date].inflow += amt;
      }
    });

    // Treasury transactions
    periodTreasuryTransactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (!dateMap[t.date]) dateMap[t.date] = { date: t.date, inflow: 0, expense: 0, net: 0 };
      if (t.type === 'deposit') {
        dateMap[t.date].inflow += amt;
      } else if (t.type === 'expense') {
        dateMap[t.date].expense += amt;
      }
    });

    // Refunds
    periodReturns.forEach(r => {
      if (r.isRefunded) {
        if (!dateMap[r.date]) dateMap[r.date] = { date: r.date, inflow: 0, expense: 0, net: 0 };
        const netVal = getNetReturnAmount(r);
        if (r.type === 'to_supplier') {
          dateMap[r.date].inflow += netVal;
        } else {
          dateMap[r.date].expense += netVal;
        }
      }
    });

    const entries = Object.values(dateMap).map(d => ({
      ...d,
      net: d.inflow - d.expense,
      displayDate: toPersianDigits(d.date.length > 5 ? d.date.substring(5) : d.date),
    }));

    // Sort chronologically
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }, [periodPayments, periodTreasuryTransactions, periodReturns]);

  // Key Timeline Trend Financial Insights
  const timelineStats = useMemo(() => {
    let peakInflow = 0;
    let peakInflowDate = '';
    let peakExpense = 0;
    let peakExpenseDate = '';
    let totalInflow = 0;
    let totalExpense = 0;
    cashflowTimelineData.forEach(item => {
      if (item.inflow > peakInflow) {
        peakInflow = item.inflow;
        peakInflowDate = item.displayDate;
      }
      if (item.expense > peakExpense) {
        peakExpense = item.expense;
        peakExpenseDate = item.displayDate;
      }
      totalInflow += item.inflow;
      totalExpense += item.expense;
    });
    const daysCount = Math.max(1, cashflowTimelineData.length);
    return {
      peakInflow,
      peakInflowDate,
      peakExpense,
      peakExpenseDate,
      avgDailyInflow: Math.round(totalInflow / daysCount),
      avgDailyExpense: Math.round(totalExpense / daysCount),
      netPeriodCashflow: totalInflow - totalExpense,
      activeDays: daysCount,
    };
  }, [cashflowTimelineData]);

  // Executive Treasury Financial Health Indicators
  const treasuryHealth = useMemo(() => {
    const totalAssets = Math.max(0, netCashBalance) + Math.max(0, netBankBalance) + Math.max(0, netChecksBalance);
    // Instant liquidity (cash + bank available right now)
    const instantLiquid = Math.max(0, netCashBalance) + Math.max(0, netBankBalance);
    const instantLiquidPct = totalAssets > 0 ? (instantLiquid / totalAssets) * 100 : 0;
    
    // Coverage ratio: periodTotalInflows / periodTotalOutflows
    const coverageRatio = periodTotalOutflows > 0 
      ? (periodTotalInflows / periodTotalOutflows) 
      : (periodTotalInflows > 0 ? 5 : 1);
    
    // Estimated cash runway days based on daily expenses in period
    const dailyExpenseRate = timelineStats.avgDailyExpense > 0 ? timelineStats.avgDailyExpense : (periodTotalOutflows / 30);
    const runwayDays = dailyExpenseRate > 0 ? Math.round(totalLiquidity / dailyExpenseRate) : 999;

    return {
      totalAssets,
      instantLiquid,
      instantLiquidPct,
      coverageRatio,
      dailyExpenseRate,
      runwayDays,
      isNetPositive: periodNetCashflow >= 0,
    };
  }, [netCashBalance, netBankBalance, netChecksBalance, periodTotalInflows, periodTotalOutflows, periodNetCashflow, totalLiquidity, timelineStats.avgDailyExpense]);

  // --- 🌟 ALL-TIME COMPREHENSIVE TREASURY BREAKDOWNS (محاسبه جامع و ریز به ریز خزانه‌داری) ---
  const allTimeInflowDetails = useMemo(() => {
    const customerCash = totalReceivedCash;
    const customerBank = totalReceivedCardBank;
    const customerChecks = totalReceivedChecks;
    const customerTotal = totalCustomerPaymentsInflow;

    const manualDepositCash = totalManualDepositsCash;
    const manualDepositBank = totalManualDepositsBank;
    const manualDepositTotal = manualDepositCash + manualDepositBank;

    const supplierRefundCash = refundedReturnsToSupplierCash;
    const supplierRefundBank = refundedReturnsToSupplierBank;
    const supplierRefundTotal = supplierRefundCash + supplierRefundBank;

    const grandTotalInflow = customerTotal + manualDepositTotal + supplierRefundTotal;

    return {
      customerCash,
      customerBank,
      customerChecks,
      customerTotal,
      manualDepositCash,
      manualDepositBank,
      manualDepositTotal,
      supplierRefundCash,
      supplierRefundBank,
      supplierRefundTotal,
      grandTotalInflow,
    };
  }, [
    totalReceivedCash,
    totalReceivedCardBank,
    totalReceivedChecks,
    totalCustomerPaymentsInflow,
    totalManualDepositsCash,
    totalManualDepositsBank,
    refundedReturnsToSupplierCash,
    refundedReturnsToSupplierBank,
  ]);

  const allTimeOutflowDetails = useMemo(() => {
    const operatingExpenseCash = totalManualExpensesCash;
    const operatingExpenseBank = totalManualExpensesBank;
    const operatingExpensePersonal = totalManualExpensesPersonal;
    const operatingExpenseTotal = totalOperatingExpenses;

    const customerRefundCash = refundedReturnsFromCustomerCash;
    const customerRefundBank = refundedReturnsFromCustomerBank;
    const customerRefundTotal = customerRefundCash + customerRefundBank;

    const customerPayoutCash = customerPayoutsCash;
    const customerPayoutBank = customerPayoutsBank;
    const customerPayoutTotal = customerPayoutCash + customerPayoutBank;

    // Total outflow affecting cash/bank liquidity
    const totalLiquidOutflow = operatingExpenseCash + operatingExpenseBank + customerRefundTotal + customerPayoutTotal;
    // Total gross outflow including personal expenditures
    const grandTotalOutflow = operatingExpenseTotal + customerRefundTotal + customerPayoutTotal;

    return {
      operatingExpenseCash,
      operatingExpenseBank,
      operatingExpensePersonal,
      operatingExpenseTotal,
      customerRefundCash,
      customerRefundBank,
      customerRefundTotal,
      customerPayoutCash,
      customerPayoutBank,
      customerPayoutTotal,
      totalLiquidOutflow,
      grandTotalOutflow,
    };
  }, [
    totalManualExpensesCash,
    totalManualExpensesBank,
    totalManualExpensesPersonal,
    totalOperatingExpenses,
    refundedReturnsFromCustomerCash,
    refundedReturnsFromCustomerBank,
    customerPayoutsCash,
    customerPayoutsBank,
  ]);

  const allTimeExpenseCategoriesList = useMemo(() => {
    const map: { [key: string]: { amount: number; count: number; cash: number; bank: number; personal: number } } = {};
    treasuryTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || 'سایر هزینه‌ها';
      if (!map[cat]) {
        map[cat] = { amount: 0, count: 0, cash: 0, bank: 0, personal: 0 };
      }
      const amt = Number(t.amount) || 0;
      map[cat].amount += amt;
      map[cat].count += 1;
      if (t.source === 'cash') map[cat].cash += amt;
      else if (t.source === 'bank') map[cat].bank += amt;
      else map[cat].personal += amt;
    });

    const totalExp = totalOperatingExpenses || 1;
    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      percent: ((data.amount / totalExp) * 100).toFixed(1),
    })).sort((a, b) => b.amount - a.amount);
  }, [treasuryTransactions, totalOperatingExpenses]);

  const filteredLogsSummary = useMemo(() => {
    let inflowSum = 0;
    let outflowSum = 0;
    let transferSum = 0;

    filteredLogs.forEach(l => {
      if (l.type === 'inflow' || l.type === 'deposit') {
        inflowSum += l.amount;
      } else if (l.type === 'expense') {
        outflowSum += l.amount;
      } else if (l.type === 'return') {
        if (l.category?.includes('تأمین') || l.category?.includes('شرکت')) {
          inflowSum += l.amount;
        } else {
          outflowSum += l.amount;
        }
      } else if (l.type === 'transfer') {
        transferSum += l.amount;
      }
    });

    return {
      count: filteredLogs.length,
      inflowSum,
      outflowSum,
      transferSum,
      netBalance: inflowSum - outflowSum,
    };
  }, [filteredLogs]);

  // Category management functions
  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (!expenseCategories.includes(trimmed)) {
      setExpenseCategories(prev => [...prev, trimmed]);
      setCategory(trimmed);
    }
    setNewCategoryName('');
  };

  const handleUpdateCategory = (index: number) => {
    const trimmed = editingCategoryValue.trim();
    if (!trimmed) return;
    const oldCat = expenseCategories[index];
    setExpenseCategories(prev => {
      const copy = [...prev];
      copy[index] = trimmed;
      return copy;
    });
    if (category === oldCat) {
      setCategory(trimmed);
    }
    setEditingCategoryIndex(null);
    setEditingCategoryValue('');
  };

  const handleDeleteCategory = (index: number) => {
    const catToDelete = expenseCategories[index];
    if (expenseCategories.length <= 1) return;
    setExpenseCategories(prev => prev.filter((_, i) => i !== index));
    if (category === catToDelete) {
      const remaining = expenseCategories.filter((_, i) => i !== index);
      setCategory(remaining[0] || 'سایر هزینه‌ها');
    }
  };

  const handleOpenNewTx = () => {
    setEditingTx(null);
    setTxType('expense');
    setSource('cash');
    setDestination('bank');
    setImpactOnLiquidity('deduct');
    setAmount(0);
    setCategory('کرایه بار و پیک / حمل‌ونقل کالا');
    setDescription('');
    setIsTxFormOpen(true);
  };

  const handleOpenTransfer = (src: 'cash' | 'bank' = 'cash', selectFullBalance: boolean = false) => {
    setEditingTx(null);
    setTxType('transfer');
    setSource(src);
    setDestination(src === 'cash' ? 'bank' : 'cash');
    setImpactOnLiquidity('deduct');
    const fullBal = src === 'cash' ? Math.max(0, netCashBalance) : Math.max(0, netBankBalance);
    if (selectFullBalance) {
      setAmount(fullBal);
    } else {
      setAmount(0);
    }
    setCategory('انتقال وجه');
    setDescription(src === 'cash' ? 'واریز و انتقال موجودی صندوق نقدی به حساب بانکی / کارت‌خوان' : 'برداشت از حساب بانکی و انتقال به صندوق نقدی');
    setIsTxFormOpen(true);
  };

  const handleOpenEditTx = (txId: string) => {
    const cleanId = txId.startsWith('tx-') ? txId : `tx-${txId}`;
    const rawId = txId.replace('tx-', '');
    const found = treasuryTransactions.find(t => t.id === txId || t.id === cleanId || t.id === rawId);
    if (found) {
      setEditingTx(found);
      setTxType(found.type);
      setSource(found.source || 'cash');
      if (found.destination) setDestination(found.destination);
      setImpactOnLiquidity(found.impactOnLiquidity || (found.source === 'personal' ? 'none' : 'deduct'));
      setAmount(found.amount);
      setCategory(found.category || (found.type === 'expense' ? 'کرایه بار و پیک / حمل‌ونقل کالا' : 'سایر هزینه‌ها'));
      setDescription(found.description || '');
      setIsTxFormOpen(true);
    }
  };

  const handleSubmitTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const finalImpact: 'deduct' | 'none' | 'inject' = 
      txType === 'expense'
        ? (source === 'personal' ? impactOnLiquidity : 'deduct')
        : (txType === 'deposit' ? 'inject' : 'deduct');

    if (editingTx && onUpdateTreasuryTransaction) {
      onUpdateTreasuryTransaction({
        ...editingTx,
        type: txType,
        source,
        destination: txType === 'transfer' ? destination : undefined,
        amount,
        impactOnLiquidity: finalImpact,
        category: txType === 'expense' ? category : txType === 'transfer' ? 'انتقال وجه' : 'افزایش اعتبار',
        description: description || (txType === 'expense' ? `هزینه بابت ${category}` : txType === 'transfer' ? 'انتقال موجودی بین حساب‌ها' : 'افزایش اعتبار دستی خزانه'),
      });
    } else {
      onAddTreasuryTransaction({
        type: txType,
        source,
        destination: txType === 'transfer' ? destination : undefined,
        amount,
        impactOnLiquidity: finalImpact,
        date: getCurrentPersianDate(),
        time: getCurrentPersianTime(),
        description: description || (txType === 'expense' ? `هزینه بابت ${category}` : txType === 'transfer' ? 'انتقال موجودی بین حساب‌ها' : 'افزایش اعتبار دستی خزانه'),
        category: txType === 'expense' ? category : txType === 'transfer' ? 'انتقال وجه' : 'افزایش اعتبار',
      });
    }

    setEditingTx(null);
    setAmount(0);
    setDescription('');
    setIsTxFormOpen(false);
  };

  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const chartTooltipStyle = {
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '12px',
    color: isDarkMode ? '#ffffff' : '#0f172a',
    fontWeight: 'bold' as const,
    boxShadow: isDarkMode ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
  };
  const chartFullscreenTooltipStyle = {
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    borderRadius: '14px',
    fontSize: '13px',
    color: isDarkMode ? '#ffffff' : '#0f172a',
    fontWeight: 'bold' as const,
    boxShadow: isDarkMode ? '0 12px 28px -5px rgba(0, 0, 0, 0.5)' : '0 12px 28px -5px rgba(0, 0, 0, 0.1)'
  };

  return (
    <div className="w-full space-y-6 pb-24 transition-colors dir-rtl text-slate-800 dark:text-slate-200">
      
      {/* 1. Executive Modern Header & Action Center */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-5 transition-all no-print">
        <div className="space-y-2.5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} text-xs font-black border ${theme.borderColor} shadow-2xs`}>
              <Scale className="w-3.5 h-3.5" />
              <span>خزانه‌داری، پایش نقدینگی و مدیریت سرمایه</span>
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-800/80 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>تراز برخط حساب‌ها و تسویه‌ها</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <span>صورت وضعیت جامع جریان وجوه نقد و تخصیص دارایی‌ها</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-medium">
              پایش برخط موجودی صندوق و بانک، ثبت منعطف هزینه‌ها و کرایه بار، ارزیابی مطالبات بازار و سود ناخالص کالاها
            </p>
          </div>

          {/* Quick Metrics Bar in Header */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold">نقدینگی در دسترس:</span>
              <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(totalLiquidity)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold">ارزش کل دارایی‌ها:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 dir-ltr">{formatPrice(totalCurrentNetAssets)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold">سود انتظاری موجودی:</span>
              <span className="font-black text-purple-600 dark:text-purple-400 dir-ltr">+{formatPrice(potentialStockProfit)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenTransfer('cash', true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 font-black text-xs sm:text-sm transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            title="انتقال سریع و واریز تمام موجودی صندوق نقدی به حساب بانکی / کارت‌خوان"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>انتقال حساب (واریز دخل به کارت‌خوان)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setTxType('expense');
              setSource('cash');
              setImpactOnLiquidity('deduct');
              setCategory('کرایه بار و پیک / حمل‌ونقل کالا');
              setAmount(0);
              setDescription('');
              setIsTxFormOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
            title="ثبت سریع هزینه کرایه بار و مخارج عملیاتی با امکان کسر یا عدم کسر از صندوق"
          >
            <Truck className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
            <span>ثبت هزینه / کرایه بار</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewTx}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs sm:text-sm shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer shrink-0`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>عملیات خزانه‌داری</span>
          </button>
        </div>
      </div>

      {/* 2. Global Time Period & Interval Controller Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 no-print">
        {/* Top: Title & Description Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor} shrink-0`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">بازه زمانی و دوره تحلیلی گزارش‌ها</span>
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black ${theme.badgeBg} ${theme.badgeText} border ${theme.borderColor}`}>
                فیلتر هوشمند دوره‌ای
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              انتخاب دوره زمانی جهت محاسبه دقیق جریان ورودی، مخارج، تراز عملیاتی و فیلتر خودکار اسناد
            </p>
          </div>
        </div>

        {/* Bottom: Dedicated Spacious Period Filter Buttons Row */}
        <div className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-1.5 bg-slate-100/90 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleSelectTimePeriod('all')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                timePeriod === 'all'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              همه دوران
            </button>
            <button
              type="button"
              onClick={() => handleSelectTimePeriod('today')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                timePeriod === 'today'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => handleSelectTimePeriod('week')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                timePeriod === 'week'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              هفتگی (۷ روز)
            </button>
            <button
              type="button"
              onClick={() => handleSelectTimePeriod('month')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 text-center ${
                timePeriod === 'month'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>۳۰ روزه (ماهیانه)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectTimePeriod('3months')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                timePeriod === '3months'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              ۳ ماهه (۹۰ روز)
            </button>
            <button
              type="button"
              onClick={() => handleSelectTimePeriod('6months')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                timePeriod === '6months'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              ۶ ماهه (۱۸۰ روز)
            </button>
            <button
              type="button"
              onClick={() => handleSelectTimePeriod('1year')}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                timePeriod === '1year'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              سالیانه (۳۶۵ روز)
            </button>
          </div>
        </div>

        {/* Period Executive Snapshot Summary - Rounded-3xl Style like ReturnsManager */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          
          {/* Card 1: ورودی نقدینگی در دوره */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">کل ورودی‌های نقدینگی دوره</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
              {formatPrice(periodTotalInflows)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>تعداد تراکنش‌های دریافتی:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {toPersianDigits(periodPayments.length + periodTreasuryTransactions.filter(t => t.type === 'deposit').length)} تراکنش
              </span>
            </div>
          </div>

          {/* Card 2: مخارج و هزینه‌ها در دوره */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-rose-200/70 dark:border-rose-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-400">مخارج، کرایه بار و هزینه‌ها</span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
              {formatPrice(periodTotalOutflows)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>هزینه‌ها و تنخواه مصرفی:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                {toPersianDigits(periodTreasuryTransactions.filter(t => t.type === 'expense').length)} فقره
              </span>
            </div>
          </div>

          {/* Card 3: خالص جریان وجوه در دوره */}
          <div className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border ${
            periodNetCashflow >= 0 ? 'border-teal-200/70 dark:border-teal-900/40' : 'border-amber-200/70 dark:border-amber-900/40'
          } shadow-xs relative overflow-hidden group hover:shadow-md transition-all`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${periodNetCashflow >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-amber-700 dark:text-amber-400'}`}>
                خالص جریان نقدینگی (تراز)
              </span>
              <div className={`p-2 rounded-xl border ${
                periodNetCashflow >= 0
                  ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 border-teal-200/80 dark:border-teal-800'
                  : 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800'
              }`}>
                <ArrowRightLeft className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-lg sm:text-xl font-black mt-3 dir-ltr text-right ${
              periodNetCashflow >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {periodNetCashflow >= 0 ? `+${formatPrice(periodNetCashflow)}` : formatPrice(periodNetCashflow)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>وضعیت تراز نقدی:</span>
              <span className={`font-bold font-mono ${periodNetCashflow >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {periodNetCashflow >= 0 ? 'تراز مثبت' : 'تراز منفی'}
              </span>
            </div>
          </div>

          {/* Card 4: فروش و سود ناخالص دوره */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-purple-200/70 dark:border-purple-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-400">سود ناخالص فروش در دوره</span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400 mt-3 dir-ltr text-right">
              +{formatPrice(periodSalesSummary.grossProfit)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>فاکتورهای صادرشده:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">
                {toPersianDigits(periodSalesSummary.count)} فاکتور
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. Main Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 no-print overflow-x-auto">
        <button
          onClick={() => setActiveMainTab('treasury')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'treasury'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>تراز نقدینگی و موجودی خزانه‌ها</span>
        </button>

        <button
          onClick={() => setActiveMainTab('inventory_capital')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'inventory_capital'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>جریان سرمایه، مطالبات، ارزش انبار و سود</span>
        </button>

        <button
          onClick={() => setActiveMainTab('audit_report')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'audit_report'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>صورت‌های مالی، ممیزی جامع و ترازنامه</span>
        </button>

        <button
          onClick={() => setActiveMainTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
            activeMainTab === 'logs'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>دفتر کل تراکنش‌های مالی و خزانه‌داری ({toPersianDigits(filteredLogs.length)})</span>
        </button>
      </div>

      {/* 3. Tab 1: Treasury & Account Balances */}
      {activeMainTab === 'treasury' && (
        <div className="space-y-6">

          {/* 🌟 Executive Treasury Balance & Health Strip */}
          <div className="bg-gradient-to-l from-slate-50 via-emerald-50/40 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-lg text-slate-900 dark:text-white transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/80 dark:border-emerald-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">تراز نقدینگی و پایش سلامت خزانه‌داری</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                      مانیتورینگ زنده دارایی‌ها
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                    بررسی یکپارچه نقدینگی آزاد، ضریب پوشش هزینه‌های جاری و وضعیت اسناد تجاری
                  </p>
                </div>
              </div>

              {/* Instant Health Metrics */}
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 flex items-center gap-2 shadow-2xs dark:shadow-none">
                  <span className="text-slate-500 dark:text-slate-300 font-bold">سهم نقدشوندگی سریع:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-300 dir-ltr">{toPersianDigits(treasuryHealth.instantLiquidPct.toFixed(1))}٪</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 flex items-center gap-2 shadow-2xs dark:shadow-none">
                  <span className="text-slate-500 dark:text-slate-300 font-bold">ضریب پوشش مخارج:</span>
                  <span className={`font-black dir-ltr ${treasuryHealth.coverageRatio >= 1 ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'}`}>
                    {toPersianDigits(treasuryHealth.coverageRatio.toFixed(1))}x
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 flex items-center gap-2 shadow-2xs dark:shadow-none">
                  <span className="text-slate-500 dark:text-slate-300 font-bold">پایداری ذخیره نقدینگی:</span>
                  <span className="font-black text-blue-600 dark:text-blue-300 dir-ltr">
                    {treasuryHealth.runwayDays >= 365 ? 'بیش از ۱ سال' : `${toPersianDigits(treasuryHealth.runwayDays)} روز`}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
              <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs dark:shadow-none space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">مجموع دارایی‌های خزانه</span>
                <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white dir-ltr block mt-0.5">{formatPrice(totalTreasuryAssets)}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block font-medium">شامل نقد، بانک و چک‌ها</span>
              </div>
              <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs dark:shadow-none space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">نقدینگی در دسترس (صندوق+بانک)</span>
                <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 dir-ltr block mt-0.5">{formatPrice(totalLiquidity)}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-medium">{toPersianDigits(treasuryHealth.instantLiquidPct.toFixed(0))}٪ از کل دارایی‌ها</span>
              </div>
              <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs dark:shadow-none space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">تراز خالص نقدینگی دوره</span>
                <span className={`text-sm sm:text-base font-black dir-ltr block mt-0.5 ${treasuryHealth.isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {treasuryHealth.isNetPositive ? '+' : ''}{formatPrice(periodNetCashflow)}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-medium">{treasuryHealth.isNetPositive ? 'مازاد عملیاتی' : 'کسری در دوره'}</span>
              </div>
              <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs dark:shadow-none space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">اسناد تجاری و چک‌های نزد صندوق</span>
                <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 dir-ltr block mt-0.5">{formatPrice(netChecksBalance)}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-medium">{toPersianDigits(treasuryChartData[2].share)}٪ از کل دارایی‌ها</span>
              </div>
            </div>
          </div>
          
          {/* 4 Core Financial Stat Cards - Rounded-3xl Luxury Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Stat 1: کل نقدینگی آماده خرج */}
            <div 
              onClick={() => setSelectedBreakdownType(prev => prev === 'total_liquidity' ? null : 'total_liquidity')}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-xs relative overflow-hidden flex flex-col justify-between space-y-3 cursor-pointer transition-all group select-none hover:shadow-md ${
                selectedBreakdownType === 'total_liquidity'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg'
                  : 'border-emerald-200/70 dark:border-emerald-900/40 hover:border-emerald-500/60'
              }`}
              title="کلیک برای باز/بستن جدول ریز اقلام و محاسبات مجموع نقدینگی در همین صفحه"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">مجموع نقدینگی در دسترس</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">نقد و بانک تجاری</span>
                </div>
                <div className={`p-2.5 rounded-xl border transition-all ${
                  selectedBreakdownType === 'total_liquidity'
                    ? 'bg-emerald-500 text-white border-emerald-600 scale-105'
                    : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800 group-hover:scale-105'
                }`}>
                  <Wallet className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white dir-ltr text-right">
                  {formatPrice(totalLiquidity)}
                </div>
                {/* Visual Progress / Share Indicator */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, treasuryHealth.instantLiquidPct))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>سهم از کل دارایی‌های خزانه</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 dir-ltr">{toPersianDigits(treasuryHealth.instantLiquidPct.toFixed(1))}٪</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold group-hover:text-emerald-500 transition-colors">
                <span>{selectedBreakdownType === 'total_liquidity' ? '▲ بستن جدول ریز اقلام' : 'ریز اقلام و ممیزی نقدینگی'}</span>
                <span className="flex items-center gap-0.5 text-[10px]">
                  <span>{selectedBreakdownType === 'total_liquidity' ? 'بستن' : 'مشاهده'}</span>
                  <ChevronLeft className={`w-3 h-3 transition-transform ${selectedBreakdownType === 'total_liquidity' ? 'rotate-90' : 'group-hover:-translate-x-1'}`} />
                </span>
              </div>
            </div>

            {/* Stat 2: صندوق نقدی */}
            <div 
              onClick={() => setSelectedBreakdownType(prev => prev === 'cash' ? null : 'cash')}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-xs flex flex-col justify-between space-y-3 cursor-pointer transition-all group select-none hover:shadow-md ${
                selectedBreakdownType === 'cash'
                  ? 'border-teal-500 ring-2 ring-teal-500/40 shadow-lg'
                  : 'border-teal-200/70 dark:border-teal-900/40 hover:border-teal-500/60'
              }`}
              title="کلیک برای باز/بستن جدول ریز اقلام و محاسبات صندوق نقدی در همین صفحه"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400 group-hover:text-teal-800 dark:group-hover:text-teal-300 transition-colors">مانده صندوق نقدی و تنخواه</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">وجه نقد فیزیکی</span>
                </div>
                <div className={`p-2.5 rounded-xl border transition-all ${
                  selectedBreakdownType === 'cash'
                    ? 'bg-teal-500 text-white border-teal-600 scale-105'
                    : 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 border-teal-200/80 dark:border-teal-800 group-hover:scale-105'
                }`}>
                  <Coins className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white dir-ltr text-right">
                  {formatPrice(netCashBalance)}
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                  <div 
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, parseFloat(treasuryChartData[0].share) || 0))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>سهم از کل دارایی‌های خزانه</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400 dir-ltr">{toPersianDigits(treasuryChartData[0].share)}٪</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold">
                <span className="text-teal-600 dark:text-teal-400 group-hover:text-teal-500 transition-colors">
                  {selectedBreakdownType === 'cash' ? '▲ بستن جدول ریز اقلام' : 'ریز اقلام و اسناد صندوق'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTransfer('cash', true);
                  }}
                  className="px-2 py-1 bg-amber-50 dark:bg-amber-950/70 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-300 dark:border-amber-700/80 text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  title="واریز مستقیم کل موجودی صندوق نقدی به حساب بانکی / کارت‌خوان"
                >
                  <ArrowRightLeft className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>انتقال به کارت‌خوان</span>
                </button>
              </div>
            </div>

            {/* Stat 3: حساب‌های بانکی */}
            <div 
              onClick={() => setSelectedBreakdownType(prev => prev === 'bank' ? null : 'bank')}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-xs flex flex-col justify-between space-y-3 cursor-pointer transition-all group select-none hover:shadow-md ${
                selectedBreakdownType === 'bank'
                  ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg'
                  : 'border-blue-200/70 dark:border-blue-900/40 hover:border-blue-500/60'
              }`}
              title="کلیک برای باز/بستن جدول ریز اقلام و محاسبات حساب‌های بانکی در همین صفحه"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors">موجودی بانک و کارت‌خوان</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">پایانه‌های فروش و حساب‌ها</span>
                </div>
                <div className={`p-2.5 rounded-xl border transition-all ${
                  selectedBreakdownType === 'bank'
                    ? 'bg-blue-500 text-white border-blue-600 scale-105'
                    : 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-800 group-hover:scale-105'
                }`}>
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white dir-ltr text-right">
                  {formatPrice(netBankBalance)}
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, parseFloat(treasuryChartData[1].share) || 0))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>سهم از کل دارایی‌های خزانه</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 dir-ltr">{toPersianDigits(treasuryChartData[1].share)}٪</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-bold group-hover:text-blue-500 transition-colors">
                <span>{selectedBreakdownType === 'bank' ? '▲ بستن جدول ریز اقلام' : 'ریز واریزی‌ها و پوز'}</span>
                <span className="flex items-center gap-0.5 text-[10px]">
                  <span>{selectedBreakdownType === 'bank' ? 'بستن' : 'مشاهده'}</span>
                  <ChevronLeft className={`w-3 h-3 transition-transform ${selectedBreakdownType === 'bank' ? 'rotate-90' : 'group-hover:-translate-x-1'}`} />
                </span>
              </div>
            </div>

            {/* Stat 4: صندوق چک‌های صیادی */}
            <div 
              onClick={() => setSelectedBreakdownType(prev => prev === 'checks' ? null : 'checks')}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-xs flex flex-col justify-between space-y-3 cursor-pointer transition-all group select-none hover:shadow-md ${
                selectedBreakdownType === 'checks'
                  ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-lg'
                  : 'border-amber-200/70 dark:border-amber-900/40 hover:border-amber-500/60'
              }`}
              title="کلیک برای باز/بستن جدول ریز چک‌های صیادی دریافتی در همین صفحه"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">اسناد تجاری و چک‌های صیادی</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">چک‌های نزد صندوق</span>
                </div>
                <div className={`p-2.5 rounded-xl border transition-all ${
                  selectedBreakdownType === 'checks'
                    ? 'bg-amber-500 text-white border-amber-600 scale-105'
                    : 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800 group-hover:scale-105'
                }`}>
                  <FileText className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white dir-ltr text-right">
                  {formatPrice(netChecksBalance)}
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, parseFloat(treasuryChartData[2].share) || 0))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>سهم از کل دارایی‌های خزانه</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 dir-ltr">{toPersianDigits(treasuryChartData[2].share)}٪</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-bold group-hover:text-amber-500 transition-colors">
                <span>{selectedBreakdownType === 'checks' ? '▲ بستن جدول ریز اقلام' : 'ریز چک‌های دریافتی صیادی'}</span>
                <span className="flex items-center gap-0.5 text-[10px]">
                  <span>{selectedBreakdownType === 'checks' ? 'بستن' : 'مشاهده'}</span>
                  <ChevronLeft className={`w-3 h-3 transition-transform ${selectedBreakdownType === 'checks' ? 'rotate-90' : 'group-hover:-translate-x-1'}`} />
                </span>
              </div>
            </div>

          </div>

          {/* Detailed Inline Breakdown Ledger for Treasury Cards (No popup modal!) */}
          <AnimatePresence>
            {selectedBreakdownType && ['total_liquidity', 'cash', 'bank', 'checks'].includes(selectedBreakdownType) && (
              <div className="pt-2">
                <LiquidityInlineBreakdown
                  type={selectedBreakdownType}
                  onClose={() => setSelectedBreakdownType(null)}
                  payments={payments}
                  customers={customers}
                  treasuryTransactions={treasuryTransactions}
                  productReturns={productReturns}
                  invoices={invoices}
                  products={products}
                  settings={settings}
                  theme={theme}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Charts & Inflow Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart 1: Treasury Distribution & Account Balance with View Mode Toggle & Fullscreen */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 lg:col-span-2 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <span>توزیع نقدینگی و موجودی خزانه‌ها</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">تفکیک موجودی زنده صندوق‌ها، کارت‌خوان‌ها و چک‌های صیادی</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* View Mode Toggle */}
                  <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setTreasuryChartMode('bar')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        treasuryChartMode === 'bar'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      ستون
                    </button>
                    <button
                      type="button"
                      onClick={() => setTreasuryChartMode('donut')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        treasuryChartMode === 'donut'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      دونات
                    </button>
                  </div>

                  {/* Fullscreen Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setFullscreenChart('treasury_distribution')}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-bold"
                    title="نمایش تمام‌صفحه و تحلیل دقیق"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">تمام‌صفحه</span>
                  </button>
                </div>
              </div>

              {/* Chart Visual Presentation */}
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  {treasuryChartMode === 'bar' ? (
                    <BarChart data={treasuryChartData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.15} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={150} 
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${formatPrice(value as number)}`, 'موجودی']} 
                        contentStyle={chartTooltipStyle}
                      />
                      <Bar 
                        dataKey="مقدار" 
                        radius={[0, 8, 8, 0]} 
                        barSize={24}
                      >
                        {treasuryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={treasuryChartData.map(d => ({ name: d.name, value: d.مقدار, color: d.color }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {treasuryChartData.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${formatPrice(value as number)}`, 'موجودی']} 
                        contentStyle={chartTooltipStyle}
                      />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Progress and Share Badges */}
              <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                {treasuryChartData.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate">{item.shortName}</span>
                    </div>
                    <span className="text-xs font-black dir-ltr block" style={{ color: item.color }}>{toPersianDigits(item.share)}٪</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 dir-ltr block mt-0.5">{formatPrice(item.مقدار)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Payment Methods Breakdown in Selected Period with Fullscreen */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-emerald-500" />
                    <span>کانال‌های دریافتی در دوره</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">تفکیک وصولی‌های دوره بر حسب روش پرداخت</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {timePeriod === 'all' ? 'همه دوران' : timePeriod === 'today' ? 'امروز' : timePeriod === 'week' ? 'هفتگی' : timePeriod === 'month' ? 'ماهیانه' : timePeriod === '3months' ? '۳ ماهه' : timePeriod === '6months' ? '۶ ماهه' : 'سالیانه'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFullscreenChart('payment_channels')}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                    title="نمایش تمام‌صفحه"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center h-36 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={periodPaymentMethodsBreakdown.filter(p => p.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {periodPaymentMethodsBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`${formatPrice(value as number)}`, 'مبلغ']} 
                      contentStyle={chartTooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl flex items-center justify-between text-xs font-black border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">جمع دریافتی دوره:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold dir-ltr">{formatPrice(periodCustomerInflow)}</span>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                {periodPaymentMethodsBreakdown.map((entry, entryIdx) => (
                  <div key={`pm-${entry.name || entryIdx}-${entryIdx}`} className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span>{entry.name}</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Chart 3: Cashflow Timeline Trend in Period with Area / Bar toggle & Fullscreen */}
          {cashflowTimelineData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-500" />
                    <span>روند زمانی گردش نقدینگی و مقایسه جریان ورودی با مخارج</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    نمودار زمانی و تحلیلی ورودی‌ها در برابر هزینه‌ها و کرایه‌ها در بازه انتخابی
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Legend Chips */}
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <span>ورودی وجه</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span>هزینه و مخارج</span>
                    </div>
                  </div>

                  {/* Mode Toggle: Area vs Bar */}
                  <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setCashflowTimelineChartMode('area')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        cashflowTimelineChartMode === 'area'
                          ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      مساحتی
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashflowTimelineChartMode('bar')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        cashflowTimelineChartMode === 'bar'
                          ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      ستونی
                    </button>
                  </div>

                  {/* Fullscreen Trigger */}
                  <button
                    type="button"
                    onClick={() => setFullscreenChart('cashflow_timeline')}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-bold"
                    title="نمایش تمام‌صفحه و تحلیل روندهای زمانی"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">تمام‌صفحه</span>
                  </button>
                </div>
              </div>

              {/* Chart Visual Canvas */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {cashflowTimelineChartMode === 'area' ? (
                    <AreaChart data={cashflowTimelineData} margin={{ left: 10, right: 10, top: 15, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                      <XAxis 
                        dataKey="displayDate" 
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis hide />
                      <Tooltip 
                        formatter={(value: any, name: any) => [
                          `${formatPrice(value as number)}`, 
                          name === 'inflow' ? 'ورودی وجه' : name === 'expense' ? 'هزینه و مخارج' : 'تراز'
                        ]} 
                        labelFormatter={(label) => `تاریخ: ${label}`}
                        contentStyle={chartTooltipStyle}
                      />
                      <Area type="monotone" dataKey="inflow" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInflow)" />
                      <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  ) : (
                    <BarChart data={cashflowTimelineData} margin={{ left: 10, right: 10, top: 15, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                      <XAxis 
                        dataKey="displayDate" 
                        tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis hide />
                      <Tooltip 
                        formatter={(value: any, name: any) => [
                          `${formatPrice(value as number)}`, 
                          name === 'inflow' ? 'ورودی وجه' : name === 'expense' ? 'هزینه و مخارج' : 'تراز'
                        ]} 
                        labelFormatter={(label) => `تاریخ: ${label}`}
                        contentStyle={chartTooltipStyle}
                      />
                      <Bar dataKey="inflow" name="inflow" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Key Timeline Analytical Highlights Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">اوج وصولی در یک روز</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 dir-ltr block mt-0.5">{formatPrice(timelineStats.peakInflow)}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{timelineStats.peakInflowDate ? `در تاریخ ${timelineStats.peakInflowDate}` : '—'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">میانگین ورودی روزانه</span>
                  <span className="font-black text-slate-800 dark:text-slate-200 dir-ltr block mt-0.5">{formatPrice(timelineStats.avgDailyInflow)}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">در {toPersianDigits(timelineStats.activeDays)} روز فعالیت</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">میانگین مخارج روزانه</span>
                  <span className="font-black text-rose-600 dark:text-rose-400 dir-ltr block mt-0.5">{formatPrice(timelineStats.avgDailyExpense)}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">کرایه‌ها و هزینه‌ها</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">تراز خالص نقدینگی دوره</span>
                  <span className={`font-black dir-ltr block mt-0.5 ${timelineStats.netPeriodCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {timelineStats.netPeriodCashflow >= 0 ? '+' : ''}{formatPrice(timelineStats.netPeriodCashflow)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{timelineStats.netPeriodCashflow >= 0 ? 'مازاد نقدینگی' : 'کسری دوره'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Chart 4: Expenses Analysis Breakdown in Period with Fullscreen */}
          {periodExpenseByCategoryData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    <span>آنالیز هزینه‌ها در دوره به تفکیک دسته‌بندی</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    بررسی هوشمند مخارج و سرفصل‌های پرداختی دوره انتخابی (کرایه بار، حقوق، اجاره و...)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>مدیریت سرفصل‌ها</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFullscreenChart('expenses_breakdown')}
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-xs font-bold"
                    title="نمایش تمام‌صفحه و تحلیل هزینه‌ها"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">تمام‌صفحه</span>
                  </button>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900">
                    مجموع هزینه‌های دوره: {formatPrice(periodManualExpenses)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {periodExpenseByCategoryData.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.fill }}></span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                      </div>
                      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0">{toPersianDigits(item.percent)}٪</span>
                    </div>
                    <div className="text-sm font-black text-slate-900 dark:text-white dir-ltr text-right">
                      {formatPrice(item.amount)}
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(5, parseFloat(item.percent) || 0))}%`, backgroundColor: item.fill }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Tab 2: Inventory Capital, Credit, Stock Value & Profit */}
      {activeMainTab === 'inventory_capital' && (
        <CapitalInventoryDashboard
          products={products}
          invoices={invoices}
          customers={customers}
          relationalPayments={relationalPayments}
          relationalReturns={relationalReturns}
          treasuryTransactions={treasuryTransactions}
          settings={settings}
          theme={theme}
          totalLiquidity={totalLiquidity}
          netCashBalance={netCashBalance}
          netBankBalance={netBankBalance}
          netChecksBalance={netChecksBalance}
          totalCurrentNetAssets={totalCurrentNetAssets}
          remainingStockPurchaseCost={remainingStockPurchaseCost}
          remainingStockSellingValue={remainingStockSellingValue}
          potentialStockProfit={potentialStockProfit}
          totalMarketCreditReceivables={totalMarketCreditReceivables}
          totalCustomerPaymentsInflow={totalCustomerPaymentsInflow}
          totalCapitalInjected={totalCapitalInjected}
          totalCustomerReturnsValue={totalCustomerReturnsValue}
          totalSupplierReturnsValue={totalSupplierReturnsValue}
          totalOperatingExpenses={totalOperatingExpenses}
          refundedReturnsFromCustomerCash={refundedReturnsFromCustomerCash}
          refundedReturnsFromCustomerBank={refundedReturnsFromCustomerBank}
          refundedReturnsToSupplierCash={refundedReturnsToSupplierCash}
          refundedReturnsToSupplierBank={refundedReturnsToSupplierBank}
          selectedBreakdownType={selectedBreakdownType}
          onSelectBreakdownType={setSelectedBreakdownType}
        />
      )}



      {/* Tab: Comprehensive Audit Report (ریز کالا، نسیه، مرجوعی، قیمت‌های بروز) */}
      {activeMainTab === 'audit_report' && (
        <div className="space-y-6">
          
          {/* Sub Navigation Bar for Audit */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setAuditSubTab('products')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  auditSubTab === 'products'
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>حساب‌رسی کالاها و قیمت روز ({toPersianDigits(products.length)})</span>
              </button>

              <button
                onClick={() => setAuditSubTab('credits')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  auditSubTab === 'credits'
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ریز مطالبات نسیه طرف‌حساب‌ها ({toPersianDigits(customers.length)})</span>
              </button>

              <button
                onClick={() => setAuditSubTab('returns')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  auditSubTab === 'returns'
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تراز مرجوعی‌ها ({toPersianDigits(relationalReturns.length)})</span>
              </button>

              <button
                onClick={() => setAuditSubTab('summary')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  auditSubTab === 'summary'
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>ترازنامه نهایی حساب‌رسی</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در اقلام حساب‌رسی..."
                value={auditSearchTerm}
                onChange={(e) => setAuditSearchTerm(e.target.value)}
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {auditSearchTerm && (
                <button
                  onClick={() => setAuditSearchTerm('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sub-view 1: Products & Live Prices Audit */}
          {auditSubTab === 'products' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xs">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-600" />
                    <span>جدول حساب‌رسی جامع اقلام انبار، قیمت خرید و فروش و ارزش مانده</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    بررسی دقیق گردش ورودی، خروجی فروش، مرجوعی‌ها و سودآوری به تفکیک کالا
                  </p>
                </div>
                <div className="text-left font-black text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                  ارزش کل انبار (فروش): {formatPrice(remainingStockSellingValue)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold">
                    <tr>
                      <th className="p-3.5 text-center w-10">#</th>
                      <th className="p-3.5">نام کالا / دسته‌بندی</th>
                      <th className="p-3.5 text-center">موجودی فعلی (کارتن / عدد)</th>
                      <th className="p-3.5 text-left">قیمت خرید بروز</th>
                      <th className="p-3.5 text-left">قیمت فروش بروز</th>
                      <th className="p-3.5 text-center">حاشیه سود</th>
                      <th className="p-3.5 text-left">ارزش کل به بهای خرید</th>
                      <th className="p-3.5 text-left">ارزش کل به قیمت فروش</th>
                      <th className="p-3.5 text-left text-emerald-600 dark:text-emerald-400">سود مورد انتظار</th>
                      <th className="p-3.5 text-center">مرجوعی کالا</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {paginatedAuditProducts.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                          کالایی در ارزیابی انبار یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      paginatedAuditProducts.map((prod, idx) => {
                        const absIdx = (auditProductsPage - 1) * auditProductsPerPage + idx + 1;
                        return (
                          <tr key={`audit-prod-${prod.id || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                            <td className="p-3.5 text-center text-slate-400 font-mono">{toPersianDigits(absIdx)}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 dark:text-white">{prod.name}</div>
                              <span className="text-[10px] text-slate-400">{prod.category}</span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="font-black text-slate-900 dark:text-white">{prod.stockCartonsText}</span>
                              <div className="text-[10px] text-slate-400">({toPersianDigits(prod.stockPieces)} عدد)</div>
                            </td>
                            <td className="p-3.5 text-left font-bold text-slate-700 dark:text-slate-300 dir-ltr">{formatPrice(prod.purchasePrice)}</td>
                            <td className="p-3.5 text-left font-bold text-slate-900 dark:text-white dir-ltr">{formatPrice(prod.sellingPrice)}</td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-black text-[11px] border border-amber-200/80 dark:border-amber-800/40">
                                {toPersianDigits(prod.marginPercent.toFixed(1))}٪
                              </span>
                            </td>
                            <td className="p-3.5 text-left font-bold text-slate-700 dark:text-slate-300 dir-ltr">{formatPrice(prod.totalInventoryPurchaseValue)}</td>
                            <td className="p-3.5 text-left font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(prod.totalInventorySellingValue)}</td>
                            <td className="p-3.5 text-left font-black text-emerald-600 dark:text-emerald-400 dir-ltr">+{formatPrice(prod.potentialProfit)}</td>
                            <td className="p-3.5 text-center">
                              {prod.customerReturnsPieces > 0 ? (
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                                  {toPersianDigits(prod.customerReturnsPieces)} عدد برگشتی
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-700">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={auditProductsPage}
                totalPages={Math.ceil(filteredAuditProducts.length / auditProductsPerPage)}
                totalItems={filteredAuditProducts.length}
                itemsPerPage={auditProductsPerPage}
                onPageChange={setAuditProductsPage}
                onItemsPerPageChange={(val) => {
                  setAuditProductsPerPage(val);
                  setAuditProductsPage(1);
                }}
                itemsPerPageOptions={[10, 20, 50, 100]}
                itemName="قلم کالا"
                themeColor={settings.themeColor}
              />
            </div>
          )}

          {/* Sub-view 2: Customer Credit / Receivables Audit */}
          {auditSubTab === 'credits' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xs">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>جدول حساب‌رسی مطالبات، نسیه بازار و وضعیت مانده حساب طرف‌حساب‌ها</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    بررسی دقیق فاکتورهای صادره، تسویه‌های نقدی، بدهی‌های دستی و خالص مانده بدهکاری هر مشتری
                  </p>
                </div>
                <div className="text-left font-black text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                  کل نسیه بازار: {formatPrice(totalMarketCreditReceivables)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold">
                    <tr>
                      <th className="p-3.5 text-center w-10">#</th>
                      <th className="p-3.5">نام طرف‌حساب</th>
                      <th className="p-3.5">شماره تماس / شهر</th>
                      <th className="p-3.5 text-left">مانده اولیه</th>
                      <th className="p-3.5 text-left">مجموع فاکتورها ({toPersianDigits(invoices.length)})</th>
                      <th className="p-3.5 text-left">کل پرداختی مشتری</th>
                      <th className="p-3.5 text-left">مرجوعی کسر شده</th>
                      <th className="p-3.5 text-left text-amber-600 dark:text-amber-400">مانده نسیه بدهی فعلی</th>
                      <th className="p-3.5 text-center">سهم از کل نسیه بازار</th>
                      <th className="p-3.5 text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {paginatedAuditCredits.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                          طرف‌حسابی با این مشخصات یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      paginatedAuditCredits.map((cust, idx) => {
                        const absIdx = (auditCreditsPage - 1) * auditCreditsPerPage + idx + 1;
                        return (
                          <tr key={`audit-cust-${cust.id || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                            <td className="p-3.5 text-center text-slate-400 font-mono">{toPersianDigits(absIdx)}</td>
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">{cust.name}</td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-400 font-mono">{toPersianDigits(cust.phone)} {cust.city !== '-' ? `(${cust.city})` : ''}</td>
                            <td className="p-3.5 text-left font-medium text-slate-600 dark:text-slate-400 dir-ltr">{formatPrice(cust.initialBalance)}</td>
                            <td className="p-3.5 text-left font-bold text-slate-800 dark:text-slate-200 dir-ltr">{formatPrice(cust.totalInvoiced)}</td>
                            <td className="p-3.5 text-left font-bold text-emerald-600 dark:text-emerald-400 dir-ltr">{formatPrice(cust.totalPaid)}</td>
                            <td className="p-3.5 text-left font-medium text-purple-600 dark:text-purple-400 dir-ltr">{formatPrice(cust.totalReturnedAmount)}</td>
                            <td className={`p-3.5 text-left font-black dir-ltr text-sm ${cust.netDue > 0 ? 'text-amber-600 dark:text-amber-400' : cust.netDue < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                              {formatPrice(cust.netDue)}
                            </td>
                            <td className="p-3.5 text-center font-bold text-slate-600 dark:text-slate-400">
                              {cust.netDue > 0 ? `${toPersianDigits(cust.sharePercent.toFixed(1))}٪` : '-'}
                            </td>
                            <td className="p-3.5 text-center">
                              {cust.netDue > 0 ? (
                                <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 font-bold text-[10px]">
                                  بدهکار نسیه
                                </span>
                              ) : cust.netDue === 0 ? (
                                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px]">
                                  تسویه کامل
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                  بستانکار
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={auditCreditsPage}
                totalPages={Math.ceil(filteredAuditCredits.length / auditCreditsPerPage)}
                totalItems={filteredAuditCredits.length}
                itemsPerPage={auditCreditsPerPage}
                onPageChange={setAuditCreditsPage}
                onItemsPerPageChange={(val) => {
                  setAuditCreditsPerPage(val);
                  setAuditCreditsPage(1);
                }}
                itemsPerPageOptions={[10, 20, 50, 100]}
                itemName="طرف‌حساب"
                themeColor={settings.themeColor}
              />
            </div>
          )}

          {/* Sub-view 3: Returns Audit */}
          {auditSubTab === 'returns' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xs">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-purple-600" />
                    <span>جدول حساب‌رسی کالاهای مرجوعی و اصلاح مالی سود و زیان</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    ثبت دقیق مبالغ مرجوعی مشتریان و شرکت‌ها، نحوه تسویه نقدی/دفتری و تاثیر بر سود انبار
                  </p>
                </div>
                <div className="text-left font-black text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-200/60 dark:border-purple-800/40">
                  کل مرجوعی مشتریان: {formatPrice(totalCustomerReturnsValue)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold select-none">
                    <tr>
                      <th className="p-3.5 text-center w-10">#</th>
                      <th 
                        className="p-3.5 cursor-pointer select-none hover:text-black dark:hover:text-white transition-colors"
                        onClick={() => setAuditReturnsSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        title="تغییر جهت مرتب‌سازی تاریخ (جدیدترین / قدیمی‌ترین)"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>تاریخ</span>
                          {auditReturnsSortOrder === 'desc' ? (
                            <ArrowDownWideNarrow className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          ) : (
                            <ArrowUpNarrowWide className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          )}
                          <span className="text-[10px] font-normal px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {auditReturnsSortOrder === 'desc' ? 'جدید' : 'قدیم'}
                          </span>
                        </div>
                      </th>
                      <th className="p-3.5">نوع مرجوعی</th>
                      <th className="p-3.5">طرف‌حساب</th>
                      <th className="p-3.5">کالا و تعداد</th>
                      <th className="p-3.5 text-left">مبلغ کل مرجوعی</th>
                      <th className="p-3.5">دلیل ارجاع</th>
                      <th className="p-3.5 text-center">وضعیت تسویه مالی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {paginatedAuditReturns.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                          هیچ کالای مرجوعی در سیستم ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      paginatedAuditReturns.map((r, idx) => {
                        const absIdx = (auditReturnsPage - 1) * auditReturnsPerPage + idx + 1;
                        return (
                          <tr key={`audit-ret-${r.id || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                            <td className="p-3.5 text-center text-slate-400 font-mono">{toPersianDigits(absIdx)}</td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">{toPersianDigits(r.date)}</td>
                            <td className="p-3.5">
                              {r.type === 'from_customer' ? (
                                <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 font-bold text-[10px]">
                                  برگشت از مشتری
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 font-bold text-[10px]">
                                  برگشت به شرکت
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">{r.customerName}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{r.productName}</div>
                              <span className="text-[10px] text-slate-400">{toPersianDigits(r.totalPieces)} عدد</span>
                            </td>
                            <td className="p-3.5 text-left font-black text-rose-600 dark:text-rose-400 dir-ltr">
                              <div>{formatPrice(getNetReturnAmount(r))}</div>
                              {r.extraCosts && r.extraCosts > 0 ? (
                                <div className="text-[10px] text-slate-400 font-normal dir-rtl">
                                  (ناخالص {formatPrice(r.totalAmount)} - کسر {formatPrice(r.extraCosts)})
                                </div>
                              ) : null}
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-400">{r.reason}</td>
                            <td className="p-3.5 text-center">
                              {r.isRefunded ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 font-bold text-[10px]">
                                  <CheckCheck className="w-3 h-3" />
                                  تسویه وجه انجام شده
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 font-bold text-[10px]">
                                  کسر از مانده دفتری
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={auditReturnsPage}
                totalPages={Math.ceil(sortedAuditReturns.length / auditReturnsPerPage)}
                totalItems={sortedAuditReturns.length}
                itemsPerPage={auditReturnsPerPage}
                onPageChange={setAuditReturnsPage}
                onItemsPerPageChange={(val) => {
                  setAuditReturnsPerPage(val);
                  setAuditReturnsPage(1);
                }}
                itemsPerPageOptions={[10, 20, 50, 100]}
                itemName="مرجوعی"
                themeColor={settings.themeColor}
              />
            </div>
          )}

          {/* Sub-view 4: Summary Balance Sheet */}
          {auditSubTab === 'summary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-4">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>تراز نقدینگی و دارایی‌های نقدی</span>
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-bold">صندوق نقدی محل انبار:</span>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(netCashBalance)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-bold">موجودی حساب‌های بانکی و کارتخوان:</span>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(netBankBalance)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-bold">چک‌های صیادی در دست وصول:</span>
                    <span className="font-black text-blue-600 dark:text-blue-400 dir-ltr">{formatPrice(netChecksBalance)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-emerald-50 dark:bg-emerald-950/40 px-3 rounded-xl font-black text-emerald-700 dark:text-emerald-300">
                    <span>جمع کل دارایی‌های نقدی و شبه‌نقد:</span>
                    <span className="dir-ltr text-sm">{formatPrice(totalLiquidity + netChecksBalance)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-2xs space-y-4">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  <span>تراز کالا، مطالبات نسیه و سود در انتظار</span>
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-bold">ارزش موجودی کالا به بهای خرید (سرمایه انبار):</span>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(remainingStockPurchaseCost)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-bold">کل مطالبات نسیه از بازار (دست مشتریان):</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 dir-ltr">{formatPrice(totalMarketCreditReceivables)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 font-bold">سود بالقوه فروش کل کالاهای موجود انبار:</span>
                    <span className="font-black text-purple-600 dark:text-purple-400 dir-ltr">+{formatPrice(potentialStockProfit)}</span>
                  </div>
                  <div className="flex justify-between py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white px-3.5 rounded-xl font-black border border-slate-200 dark:border-slate-700">
                    <span>ارزش کل دارایی خالص تجاری (سرمایه در گردش):</span>
                    <span className="dir-ltr text-sm text-emerald-600 dark:text-emerald-400">{formatPrice(totalCurrentNetAssets)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 5. Tab 3: Unified Transaction Logs, Treasury Master Audit & Search */}
      {activeMainTab === 'logs' && (
        <div className="space-y-6">
          
          {/* Header Action Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor} shrink-0`}>
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>دفتر کل و ممیزی جامع نقدینگی و خزانه‌داری</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                    {toPersianDigits(logs.length)} سند مالی
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  محاسبه کل گردش وجوه، تراز لحظه‌ای صندوق و بانک، ریز به ریز ورودی‌ها، خروجی‌ها، سرفصل مخارج و لیست تراکنش‌ها
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-black transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
                title="مدیریت سرفصل‌های هزینه"
              >
                <Tag className="w-4 h-4 text-slate-500" />
                <span>سرفصل‌های مخارج</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewTx}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${theme.primary} text-white hover:opacity-95 text-xs font-black transition-all cursor-pointer shadow-xs whitespace-nowrap`}
              >
                <Plus className="w-4 h-4" />
                <span>ثبت سند خزانه‌داری / هزینه جدید</span>
              </button>
            </div>
          </div>

          {/* 🌟 بخش ۱: ۴ کارت شاخص‌های اصلی خزانه‌داری و جریان نقدینگی */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* کارت ۱: کل ورودی پول */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border border-emerald-200/80 dark:border-emerald-900/40 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>مجموع کل ورودی پول</span>
                </span>
                <span className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white dir-ltr text-right">
                +{formatPrice(allTimeInflowDetails.grandTotalInflow)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span>دریافتی از مشتریان:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">{formatPrice(allTimeInflowDetails.customerTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>آورده دستی و شارژ خزانه:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">{formatPrice(allTimeInflowDetails.manualDepositTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>استرداد نقدی تأمین‌کننده:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">{formatPrice(allTimeInflowDetails.supplierRefundTotal)}</span>
                </div>
              </div>
            </div>

            {/* کارت ۲: کل خروجی پول و مخارج */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border border-rose-200/80 dark:border-rose-900/40 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>مجموع کل خروجی و مخارج</span>
                </span>
                <span className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800">
                  <TrendingDown className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 dir-ltr text-right">
                -{formatPrice(allTimeOutflowDetails.grandTotalOutflow)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span>هزینه‌های عملیاتی انبار:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">{formatPrice(allTimeOutflowDetails.operatingExpenseTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>تسویه مرجوعی مشتریان:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">{formatPrice(allTimeOutflowDetails.customerRefundTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>عودت بستانکاری مشتری:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">{formatPrice(allTimeOutflowDetails.customerPayoutTotal)}</span>
                </div>
              </div>
            </div>

            {/* کارت ۳: خالص جریان نقدینگی */}
            <div className={`bg-white dark:bg-slate-900 rounded-3xl p-4.5 border shadow-2xs space-y-3 ${
              allTimeInflowDetails.grandTotalInflow >= allTimeOutflowDetails.totalLiquidOutflow
                ? 'border-teal-200/80 dark:border-teal-900/40'
                : 'border-amber-200/80 dark:border-amber-900/40'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black flex items-center gap-1.5 ${
                  allTimeInflowDetails.grandTotalInflow >= allTimeOutflowDetails.totalLiquidOutflow
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}>
                  <Scale className="w-4 h-4" />
                  <span>تراز خالص جریان نقدینگی</span>
                </span>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                  allTimeInflowDetails.grandTotalInflow >= allTimeOutflowDetails.totalLiquidOutflow
                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}>
                  {allTimeInflowDetails.grandTotalInflow >= allTimeOutflowDetails.totalLiquidOutflow ? 'مازاد نقدینگی' : 'کسری نقدینگی'}
                </span>
              </div>
              <div className={`text-lg sm:text-xl font-black dir-ltr text-right ${
                allTimeInflowDetails.grandTotalInflow >= allTimeOutflowDetails.totalLiquidOutflow
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {allTimeInflowDetails.grandTotalInflow >= allTimeOutflowDetails.totalLiquidOutflow ? '+' : '-'}
                {formatPrice(Math.abs(allTimeInflowDetails.grandTotalInflow - allTimeOutflowDetails.totalLiquidOutflow))}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span>نسبت ورودی به خروجی:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">
                    {allTimeOutflowDetails.totalLiquidOutflow > 0 
                      ? `${toPersianDigits(((allTimeInflowDetails.grandTotalInflow / allTimeOutflowDetails.totalLiquidOutflow) * 100).toFixed(1))}٪`
                      : '۱۰۰٪'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>خالص ایجاد وجوه نقد:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">
                    {formatPrice(allTimeInflowDetails.grandTotalInflow - allTimeOutflowDetails.operatingExpenseTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* کارت ۴: مجموع نقدینگی لحظه‌ای خزانه‌داری */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4.5 border border-blue-200/80 dark:border-blue-900/40 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" />
                  <span>موجودی نقدینگی در دسترس</span>
                </span>
                <span className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800">
                  <Coins className="w-4 h-4" />
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 dir-ltr text-right">
                {formatPrice(totalLiquidity)}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-emerald-500" />
                    صندوق نقدی:
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">{formatPrice(netCashBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-blue-500" />
                    حساب‌های بانکی:
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">{formatPrice(netBankBalance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-amber-500" />
                    چک‌های صیادی:
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr">{formatPrice(netChecksBalance)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* 🌟 بخش ۲: ۳ کادر بزرگ تحلیلی و تفکیکی ریز به ریز */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            
            {/* کادر ۱: صورت ریز کل ورودی‌های پول */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                      <ArrowDownLeft className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">صورت ریز کل ورودی‌های پول</h4>
                      <p className="text-[10px] text-slate-400">تفکیک منابع واریز، وصول و تزریق نقدینگی</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200/80 dark:border-emerald-800/40">
                    ورودی خزانه
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs mt-3 space-y-0.5">
                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">واریز نقدی مشتریان (صندوق):</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(allTimeInflowDetails.customerCash)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">واریز کارتخوان و حواله بانکی:</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(allTimeInflowDetails.customerBank)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">چک‌های صیادی دریافتی:</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(allTimeInflowDetails.customerChecks)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">آورده نقدی مالک به صندوق:</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(allTimeInflowDetails.manualDepositCash)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">واریز دستی به حساب بانکی:</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(allTimeInflowDetails.manualDepositBank)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">استرداد نقدی مرجوعی شرکت:</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(allTimeInflowDetails.supplierRefundTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
                <span className="font-black text-emerald-900 dark:text-emerald-200 text-xs">جمع کل ورودی پول به خزانه‌داری:</span>
                <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm dir-ltr">+{formatPrice(allTimeInflowDetails.grandTotalInflow)}</span>
              </div>
            </div>

            {/* کادر ۲: صورت ریز کل مصارف و خروجی‌های پول */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">صورت ریز کل خروجی‌ها و مخارج</h4>
                      <p className="text-[10px] text-slate-400">تفکیک مخارج عملیاتی، مرجوعی و عودت وجه</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-bold text-[10px] border border-rose-200/80 dark:border-rose-800/40">
                    خروجی خزانه
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs mt-3 space-y-0.5">
                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">مخارج عملیاتی از صندوق نقدی:</span>
                    </div>
                    <span className="font-black text-rose-600 dark:text-rose-400 dir-ltr">-{formatPrice(allTimeOutflowDetails.operatingExpenseCash)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">مخارج عملیاتی از حساب بانکی:</span>
                    </div>
                    <span className="font-black text-rose-600 dark:text-rose-400 dir-ltr">-{formatPrice(allTimeOutflowDetails.operatingExpenseBank)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">مخارج از جیب شخصی مالک:</span>
                    </div>
                    <span className="font-black text-slate-700 dark:text-slate-300 dir-ltr">{formatPrice(allTimeOutflowDetails.operatingExpensePersonal)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">تسویه نقدی مرجوعی مشتری:</span>
                    </div>
                    <span className="font-black text-rose-600 dark:text-rose-400 dir-ltr">-{formatPrice(allTimeOutflowDetails.customerRefundTotal)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">عودت بستانکاری به مشتریان:</span>
                    </div>
                    <span className="font-black text-rose-600 dark:text-rose-400 dir-ltr">-{formatPrice(allTimeOutflowDetails.customerPayoutTotal)}</span>
                  </div>

                  <div className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">خالص خروجی مستقیم نقدینگی:</span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr">-{formatPrice(allTimeOutflowDetails.totalLiquidOutflow)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl flex items-center justify-between">
                <span className="font-black text-rose-900 dark:text-rose-200 text-xs">جمع کل مصارف و مخارج ثبت شده:</span>
                <span className="font-black text-rose-700 dark:text-rose-300 text-sm dir-ltr">-{formatPrice(allTimeOutflowDetails.grandTotalOutflow)}</span>
              </div>
            </div>

            {/* کادر ۳: ریز سرفصل‌های مخارج و هزینه‌های عملیاتی */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4 md:col-span-2 xl:col-span-1">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">ریز سرفصل‌های مخارج عملیاتی</h4>
                      <p className="text-[10px] text-slate-400">{toPersianDigits(allTimeExpenseCategoriesList.length)} سرفصل هزینه فعال</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title="ویرایش یا افزودن سرفصل‌های هزینه"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-2.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {allTimeExpenseCategoriesList.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      هیچ سند هزینه‌ای تاکنون در سیستم ثبت نشده است.
                    </div>
                  ) : (
                    allTimeExpenseCategoriesList.map((cat, idx) => (
                      <div key={`cat-item-${cat.name}-${idx}`} className="space-y-1 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/70">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{cat.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">({toPersianDigits(cat.count)} بار)</span>
                          </div>
                          <span className="font-black text-slate-900 dark:text-white dir-ltr shrink-0">{formatPrice(cat.amount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div 
                              className="h-full bg-rose-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(2, Number(cat.percent)))}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 shrink-0 dir-ltr">{toPersianDigits(cat.percent)}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl flex items-center justify-between">
                <span className="font-black text-amber-900 dark:text-amber-200 text-xs">جمع کل مخارج سرفصل‌ها:</span>
                <span className="font-black text-amber-700 dark:text-amber-300 text-sm dir-ltr">-{formatPrice(totalOperatingExpenses)}</span>
              </div>
            </div>

          </div>

          {/* 🌟 بخش ۳: کادرهای وضعیت گردش انتقالات داخلی و اسناد تجاری */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold">انتقال از صندوق به بانک:</span>
                <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white dir-ltr text-right">
                {formatPrice(cashToBankTransfers)}
              </div>
              <p className="text-[10px] text-slate-400">جابجایی وجوه نقد به حساب‌های بانکی</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold">انتقال از بانک به صندوق:</span>
                <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white dir-ltr text-right">
                {formatPrice(bankToCashTransfers)}
              </div>
              <p className="text-[10px] text-slate-400">برداشت از بانک جهت شارژ صندوق نقدی</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold">گردش کل انتقالات بین‌حسابی:</span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-base font-black text-purple-600 dark:text-purple-400 dir-ltr text-right">
                {formatPrice(cashToBankTransfers + bankToCashTransfers)}
              </div>
              <p className="text-[10px] text-slate-400">بدون تغییر در نقدینگی کل سیستم</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold">چک‌های صیادی نزد خزانه‌دار:</span>
                <FileText className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-base font-black text-amber-600 dark:text-amber-400 dir-ltr text-right">
                {formatPrice(netChecksBalance)}
              </div>
              <p className="text-[10px] text-slate-400">اسناد تجاری وصول‌نشده دست خزانه‌دار</p>
            </div>

          </div>

          {/* 🌟 بخش ۴: جدول دفتر کل و ریزتراکنش‌ها */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xs transition-colors">
            
            {/* Header & Filter Controls */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/50">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  <span>ریزتراکنش‌ها و ردیف‌های دفتر کل نقدینگی</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  جستجو، تفکیک حساب، مرتب‌سازی و مدیریت تراکنش‌های دریافتی، پرداختی و انتقالی
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="جستجو در طرف‌حساب، شرح، مبلغ..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs & Sort */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                    <button
                      onClick={() => { setActiveAccountTab('all'); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer whitespace-nowrap ${
                        activeAccountTab === 'all'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      همه ({toPersianDigits(logs.length)})
                    </button>
                    <button
                      onClick={() => { setActiveAccountTab('cash'); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer whitespace-nowrap ${
                        activeAccountTab === 'cash'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      صندوق نقدی
                    </button>
                    <button
                      onClick={() => { setActiveAccountTab('bank'); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer whitespace-nowrap ${
                        activeAccountTab === 'bank'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      حساب‌های بانکی
                    </button>
                    <button
                      onClick={() => { setActiveAccountTab('inflow'); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer whitespace-nowrap ${
                        activeAccountTab === 'inflow'
                          ? `${theme.primary} text-white shadow-xs`
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      دریافتی‌ها
                    </button>
                    <button
                      onClick={() => { setActiveAccountTab('expense'); setCurrentPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer whitespace-nowrap ${
                        activeAccountTab === 'expense'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      هزینه‌ها
                    </button>
                  </div>

                  {/* Date Sort Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setLogSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 shadow-2xs"
                    title={logSortOrder === 'desc' ? 'مرتب‌سازی: جدیدترین در ابتدا (کلیک برای صعودی/قدیمی‌ترین)' : 'مرتب‌سازی: قدیمی‌ترین در ابتدا (کلیک برای نزولی/جدیدترین)'}
                  >
                    {logSortOrder === 'desc' ? (
                      <ArrowDownWideNarrow className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    ) : (
                      <ArrowUpNarrowWide className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    )}
                    <span>{logSortOrder === 'desc' ? 'جدیدترین اول' : 'قدیمی‌ترین اول'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Filter Summary Strip (آمار زنده فیلترهای انتخابی) */}
            {(searchTerm || activeAccountTab !== 'all') && (
              <div className="px-5 py-3 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-800 dark:text-slate-200">
                    نتایج فیلتر جاری ({toPersianDigits(filteredLogsSummary.count)} تراکنش):
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    ورودی فیلتر: +{formatPrice(filteredLogsSummary.inflowSum)}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
                    خروجی فیلتر: -{formatPrice(filteredLogsSummary.outflowSum)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg font-black border ${
                    filteredLogsSummary.netBalance >= 0
                      ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}>
                    تراز خالص فیلتر: {filteredLogsSummary.netBalance >= 0 ? '+' : ''}{formatPrice(filteredLogsSummary.netBalance)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setActiveAccountTab('all');
                    setCurrentPage(1);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>پاکسازی فیلترها</span>
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold select-none">
                  <tr>
                    <th className="p-3.5 w-12 text-center">#</th>

                    <SortableTableHeader
                      field="date"
                      currentField={logSortField}
                      currentDirection={logSortDirection}
                      onSort={handleLogSort}
                      className="w-36"
                    >
                      تاریخ و ساعت
                    </SortableTableHeader>

                    <SortableTableHeader
                      field="type"
                      currentField={logSortField}
                      currentDirection={logSortDirection}
                      onSort={handleLogSort}
                      className="w-32"
                    >
                      نوع رویداد
                    </SortableTableHeader>

                    <th className="p-3.5">مبداء تراکنش</th>
                    <th className="p-3.5">مقصد / حساب</th>

                    <SortableTableHeader
                      field="amount"
                      currentField={logSortField}
                      currentDirection={logSortDirection}
                      onSort={handleLogSort}
                      align="left"
                      className="w-36"
                    >
                      مبلغ تراکنش
                    </SortableTableHeader>

                    <SortableTableHeader
                      field="desc"
                      currentField={logSortField}
                      currentDirection={logSortDirection}
                      onSort={handleLogSort}
                    >
                      شرح و پیگیری
                    </SortableTableHeader>

                    <th className="p-3.5 text-center w-28 no-print">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                        هیچ تراکنشی مطابق با فیلترها و جستجوی شما یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log, idx) => {
                      const absIdx = startIndex + idx + 1;
                      const isExpense = log.type === 'expense';
                      const isTreasuryTx = log.id.startsWith('tx-');

                      return (
                        <tr key={`liq-log-${log.id || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="p-3.5 text-center text-slate-400 font-mono">{toPersianDigits(absIdx)}</td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                            {toPersianDigits(log.date)} {log.time ? ` - ${toPersianDigits(log.time)}` : ''}
                          </td>
                          <td className="p-3.5">
                            {log.type === 'inflow' ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-black text-[11px] border ${badges.cash}`}>
                                <CheckCircle2 className="w-3 h-3" />
                                دریافت از مشتری
                              </span>
                            ) : log.type === 'expense' ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-black text-[11px] border ${badges.debt}`}>
                                <TrendingDown className="w-3 h-3" />
                                هزینه انبار
                              </span>
                            ) : log.type === 'transfer' ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-black text-[11px] border ${badges.draft}`}>
                                <RefreshCw className="w-3 h-3" />
                                انتقال بین‌حساب
                              </span>
                            ) : log.type === 'return' ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-black text-[11px] border ${badges.returnOffset}`}>
                                <RotateCcw className="w-3 h-3" />
                                تسویه مرجوعی
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-black text-[11px] border ${badges.stock}`}>
                                <TrendingUp className="w-3 h-3" />
                                افزایش اعتبار
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">{log.sourceName}</td>
                          <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">{log.targetName}</td>
                          <td className={`p-3.5 text-left dir-ltr font-black text-sm ${isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isExpense ? '-' : '+'}{formatPrice(log.amount)}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-400">
                            <div>{log.description}</div>
                            {log.referenceCode && (
                              <span className="text-[10px] text-slate-400 font-mono">پیگیری: {toPersianDigits(log.referenceCode)}</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center no-print">
                            {isTreasuryTx ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTx(log.id)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="ویرایش اطلاعات تراکنش"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cleanId = log.id.startsWith('tx-') ? log.id : `tx-${log.id}`;
                                    setDeleteConfirmTx({
                                      id: cleanId,
                                      rawId: log.rawId,
                                      itemType: 'treasury',
                                      amount: log.amount,
                                      description: log.description || 'تراکنش صندوق',
                                      type: log.type,
                                    });
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="حذف تراکنش"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : log.itemType === 'payment' && onDeletePayment ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteConfirmTx({
                                      id: log.id,
                                      rawId: log.rawId,
                                      itemType: 'payment',
                                      amount: log.amount,
                                      description: log.description || 'پرداختی مشتری',
                                      type: log.type,
                                    });
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="حذف پرداخت مشتری"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                                سیستمی
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Unified Professional Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedLogs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
              itemsPerPageOptions={[10, 20, 50, 100]}
              itemName="تراکنش"
              themeColor={settings.themeColor}
            />

          </div>

        </div>
      )}

      {/* 6. Manual Treasury Modal (Create / Edit) */}
      <AnimatePresence>
        {isTxFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs no-print overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl relative z-10 shadow-2xl text-right flex flex-col max-h-[88vh] overflow-hidden my-auto"
            >
              {/* Fixed Header */}
              <div className="p-4 sm:p-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor} shrink-0`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {editingTx ? 'ویرایش سند خزانه‌داری و هزینه' : 'ثبت تراکنش و هزینه عملیاتی'}
                      </h2>
                      {editingTx && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-black">
                          در حال ویرایش
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ثبت مخارج، کرایه بار، افزایش آورده یا انتقال بین‌حسابی
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsTxFormOpen(false); setEditingTx(null); }}
                  className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSubmitTx} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="overflow-y-auto p-4 sm:p-5 space-y-3.5 flex-1 custom-scrollbar text-slate-800 dark:text-slate-200">
                  {/* 1. Transaction Type Tabs */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">نوع تراکنش خزانه‌داری:</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => { setTxType('expense'); setSource('cash'); }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          txType === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                        <span>ثبت هزینه</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTxType('transfer'); setSource('cash'); setDestination('bank'); }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          txType === 'transfer' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        <span>انتقال حساب</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTxType('deposit'); setSource('cash'); }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          txType === 'deposit' ? `${theme.primary} text-white shadow-xs` : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                        <span>افزایش سرمایه</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Amount & Category / Transfer Flow */}
                  {txType === 'transfer' ? (
                    <div className="space-y-4">
                      {/* A. Live Account Balances Overview */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300">
                            موجودی زنده خزانه‌ها و حساب‌ها:
                          </label>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            بروزرسانی همگام با تراکنش‌ها
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {/* Cash Balance Box */}
                          <div 
                            onClick={() => {
                              setSource('cash');
                              setDestination('bank');
                              setDescription('واریز و انتقال موجودی صندوق نقدی به حساب بانکی / کارت‌خوان');
                            }}
                            className={`p-2.5 rounded-2xl border text-right cursor-pointer transition-all ${
                              source === 'cash'
                                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/20'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                                <Coins className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span>صندوق نقدی (دخل)</span>
                              </div>
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                source === 'cash' 
                                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200' 
                                  : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}>
                                {source === 'cash' ? 'مبداء (برداشت)' : 'مقصد (واریز)'}
                              </span>
                            </div>
                            <div className="text-sm font-black text-teal-700 dark:text-teal-300 mt-1.5 dir-ltr text-right">
                              {formatPrice(netCashBalance)}
                            </div>
                          </div>

                          {/* Bank Balance Box */}
                          <div 
                            onClick={() => {
                              setSource('bank');
                              setDestination('cash');
                              setDescription('برداشت از حساب بانکی و انتقال به صندوق نقدی');
                            }}
                            className={`p-2.5 rounded-2xl border text-right cursor-pointer transition-all ${
                              source === 'bank'
                                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 ring-2 ring-blue-400/20'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                                <CreditCard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>حساب بانکی / کارت‌خوان</span>
                              </div>
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                source === 'bank' 
                                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200' 
                                  : 'bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}>
                                {source === 'bank' ? 'مبداء (برداشت)' : 'مقصد (واریز)'}
                              </span>
                            </div>
                            <div className="text-sm font-black text-blue-700 dark:text-blue-300 mt-1.5 dir-ltr text-right">
                              {formatPrice(netBankBalance)}
                            </div>
                          </div>

                          {/* Checks Balance Box (Info) */}
                          <div className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 text-right opacity-80">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                <FileText className="w-3.5 h-3.5 text-amber-500" />
                                <span>چک‌های صیادی نزد صندوق</span>
                              </div>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">خزانه اسناد</span>
                            </div>
                            <div className="text-sm font-black text-amber-600 dark:text-amber-400 mt-1.5 dir-ltr text-right">
                              {formatPrice(netChecksBalance)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* B. Transfer Direction Switch */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          مسیر انتقال وجه بین حساب‌ها:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSource('cash');
                              setDestination('bank');
                              setDescription('واریز و انتقال موجودی صندوق نقدی به حساب بانکی / کارت‌خوان');
                            }}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                              source === 'cash' && destination === 'bank'
                                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/20 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-xl ${source === 'cash' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                <ArrowRightLeft className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-black">از صندوق نقدی به کارت‌خوان / بانک</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">واریز دخل مغازه به حساب بانکی</div>
                              </div>
                            </div>
                            <span className="text-xs font-black text-teal-600 dark:text-teal-400 dir-ltr shrink-0">
                              {formatPrice(netCashBalance)}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSource('bank');
                              setDestination('cash');
                              setDescription('برداشت از حساب بانکی و انتقال به صندوق نقدی');
                            }}
                            className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                              source === 'bank' && destination === 'cash'
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-xl ${source === 'bank' ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                <ArrowRightLeft className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-black">از حساب بانکی به صندوق نقدی</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">برداشت نقدی و شارژ تنخواه دخل</div>
                              </div>
                            </div>
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400 dir-ltr shrink-0">
                              {formatPrice(netBankBalance)}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* C. Quick Full Amount & Percentage Presets */}
                      <div className="bg-gradient-to-l from-amber-50/70 via-slate-50 to-teal-50/70 dark:from-amber-950/30 dark:via-slate-900/50 dark:to-teal-950/30 p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>دکمه‌های انتخاب سریع مبلغ انتقال:</span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            موجودی حساب مبدا ({source === 'cash' ? 'صندوق' : 'بانک'}): <strong className="text-slate-900 dark:text-white dir-ltr">{formatPrice(source === 'cash' ? netCashBalance : netBankBalance)}</strong>
                          </span>
                        </div>

                        {/* ⚡ Prominent Big Full Cash / Source Balance Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const maxAmt = Math.max(0, source === 'cash' ? netCashBalance : netBankBalance);
                            setAmount(maxAmt);
                          }}
                          className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.99] text-white rounded-xl text-xs font-black flex items-center justify-between shadow-xs transition-all cursor-pointer border border-amber-400/60"
                        >
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
                            <span>{source === 'cash' ? '⚡ انتخاب و انتقال کل موجودی صندوق (۱۰۰٪ دخل)' : '⚡ انتخاب و انتقال کل موجودی حساب بانکی (۱۰۰٪)'}</span>
                          </div>
                          <span className="bg-amber-700/60 px-2 py-0.5 rounded-lg text-xs font-mono dir-ltr">
                            {formatPrice(source === 'cash' ? netCashBalance : netBankBalance)}
                          </span>
                        </button>

                        {/* Percentage Buttons Grid */}
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { label: 'کل موجودی (۱۰۰٪)', pct: 1.0 },
                            { label: '۷۵٪ موجودی', pct: 0.75 },
                            { label: '۵۰٪ (نصف دخل)', pct: 0.5 },
                            { label: '۲۵٪ موجودی', pct: 0.25 },
                          ].map((item, idx) => {
                            const srcBal = Math.max(0, source === 'cash' ? netCashBalance : netBankBalance);
                            const targetVal = Math.round(srcBal * item.pct);
                            const isSelected = amount === targetVal && targetVal > 0;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setAmount(targetVal)}
                                className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center border ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border-amber-700 shadow-2xs font-black'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300 hover:bg-amber-50/50'
                                }`}
                              >
                                <span>{item.label}</span>
                                <span className="text-[10px] opacity-80 dir-ltr mt-0.5">{targetVal > 0 ? formatPrice(targetVal) : '۰'}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* D. Amount Input */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          مبلغ مورد نظر برای انتقال (تومان): <span className="text-rose-500">*</span>
                        </label>
                        <SmartPriceInput
                          value={amount}
                          onChange={(val) => setAmount(val)}
                          placeholder="مبلغ انتقال به تومان (مثلاً ۵,۰۰۰,۰۰۰ یا کل مبلغ)"
                          themeColor={settings.themeColor}
                          showWords={true}
                          showScale={true}
                          showShortcuts={true}
                        />
                      </div>

                      {/* E. Live Transfer Flow & Before/After Projection */}
                      {amount > 0 && (
                        <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-black text-slate-600 dark:text-slate-400">
                            <span>پیش‌نمایش تراز حساب‌ها پس از انتقال:</span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold">مبلغ انتقال: {formatPrice(amount)}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {/* Source Box */}
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                                <span>مبداء: {source === 'cash' ? 'صندوق نقدی' : 'حساب بانکی'}</span>
                                <span className="text-rose-600 dark:text-rose-400 font-black">-{formatPrice(amount)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-slate-600 dark:text-slate-400">مانده جدید:</span>
                                <span className={`font-black dir-ltr ${(source === 'cash' ? netCashBalance : netBankBalance) - amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                                  {formatPrice((source === 'cash' ? netCashBalance : netBankBalance) - amount)}
                                </span>
                              </div>
                            </div>

                            {/* Destination Box */}
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                                <span>مقصد: {destination === 'cash' ? 'صندوق نقدی' : 'حساب بانکی / کارت‌خوان'}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">+{formatPrice(amount)}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-slate-600 dark:text-slate-400">مانده جدید:</span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400 dir-ltr">
                                  {formatPrice((destination === 'cash' ? netCashBalance : netBankBalance) + amount)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Overdraft Warning if amount exceeds source balance */}
                          {amount > (source === 'cash' ? netCashBalance : netBankBalance) && (
                            <div className="bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border border-rose-200 dark:border-rose-800 mt-2">
                              <div className="flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                <span>مبلغ انتقال از موجودی فعلی حساب مبدا بیشتر است!</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAmount(Math.max(0, source === 'cash' ? netCashBalance : netBankBalance))}
                                className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black cursor-pointer hover:bg-rose-700 transition-colors shrink-0"
                              >
                                تنظیم روی سقف موجودی
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Amount Input */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          مبلغ تراکنش (تومان): <span className="text-rose-500">*</span>
                        </label>
                        <SmartPriceInput
                          value={amount}
                          onChange={(val) => setAmount(val)}
                          placeholder="مبلغ به تومان (مثلاً ۵,۰۰۰,۰۰۰ یا ۲.۵m)"
                          themeColor={settings.themeColor}
                          showWords={true}
                          showScale={true}
                          showShortcuts={true}
                        />
                      </div>

                      {/* Category Selection for expense or deposit */}
                      {txType === 'expense' ? (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">سرفصل / دسته‌بندی هزینه:</label>
                            <button
                              type="button"
                              onClick={() => setIsCategoryModalOpen(true)}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                            >
                              <Settings2 className="w-3 h-3" />
                              <span>مدیریت</span>
                            </button>
                          </div>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold outline-none cursor-pointer text-right text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          >
                            {expenseCategories.map((cat, catIdx) => (
                              <option key={`exp-cat-${cat}-${catIdx}`} value={cat}>{cat}</option>
                            ))}
                          </select>
                          {category !== 'کرایه بار و پیک / حمل‌ونقل کالا' && expenseCategories.includes('کرایه بار و پیک / حمل‌ونقل کالا') && (
                            <button
                              type="button"
                              onClick={() => setCategory('کرایه بار و پیک / حمل‌ونقل کالا')}
                              className="mt-1 text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Truck className="w-3 h-3" />
                              <span>انتخاب سریع: کرایه بار و پیک</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">واریز به حساب:</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setSource('cash')}
                              className={`py-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${
                                source === 'cash' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-500' : 'border-slate-200 dark:border-slate-700 text-slate-500'
                              }`}
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>صندوق نقدی</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSource('bank')}
                              className={`py-2 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${
                                source === 'bank' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-500' : 'border-slate-200 dark:border-slate-700 text-slate-500'
                              }`}
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>حساب بانکی</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. DYNAMIC Source & Impact Selector (Responsive 2x2 Grid) */}
                  {txType === 'expense' && (
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        نحوه تأمین وجه و اثر بر نقدینگی فروشگاه:
                      </label>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Option 1: Cash Direct Deduction */}
                        <div
                          onClick={() => { setSource('cash'); setImpactOnLiquidity('deduct'); }}
                          className={`p-2.5 rounded-2xl border text-right cursor-pointer transition-all relative ${
                            source === 'cash' && impactOnLiquidity === 'deduct'
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-xl shrink-0 ${source === 'cash' && impactOnLiquidity === 'deduct' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                <Coins className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="text-xs font-black text-slate-900 dark:text-white">
                                  کسر مستقیم از صندوق نقدی
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  پرداخت از دخل مغازه
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                              source === 'cash' && impactOnLiquidity === 'deduct'
                                ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {amount > 0 ? `کسر ${formatPrice(amount)}` : 'کسر از صندوق'}
                            </span>
                          </div>
                          
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 dark:text-slate-400 font-bold">
                              موجودی: {formatPrice(netCashBalance)}
                            </span>
                            {amount > 0 && (
                              <span className={`font-black ${netCashBalance - amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                مانده: {formatPrice(netCashBalance - amount)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Option 2: Bank Direct Deduction */}
                        <div
                          onClick={() => { setSource('bank'); setImpactOnLiquidity('deduct'); }}
                          className={`p-2.5 rounded-2xl border text-right cursor-pointer transition-all relative ${
                            source === 'bank' && impactOnLiquidity === 'deduct'
                              ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-xl shrink-0 ${source === 'bank' && impactOnLiquidity === 'deduct' ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                <CreditCard className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="text-xs font-black text-slate-900 dark:text-white">
                                  کسر مستقیم از حساب بانکی
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  پرداخت با کارت / کارت‌خوان
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                              source === 'bank' && impactOnLiquidity === 'deduct'
                                ? 'bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {amount > 0 ? `کسر ${formatPrice(amount)}` : 'کسر از بانک'}
                            </span>
                          </div>
                          
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 dark:text-slate-400 font-bold">
                              موجودی: {formatPrice(netBankBalance)}
                            </span>
                            {amount > 0 && (
                              <span className={`font-black ${netBankBalance - amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                مانده: {formatPrice(netBankBalance - amount)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Option 3: Personal Money - No Shop Deduction */}
                        <div
                          onClick={() => { setSource('personal'); setImpactOnLiquidity('none'); }}
                          className={`p-2.5 rounded-2xl border text-right cursor-pointer transition-all relative ${
                            source === 'personal' && impactOnLiquidity === 'none'
                              ? 'bg-purple-50/90 dark:bg-purple-950/50 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-xl shrink-0 ${source === 'personal' && impactOnLiquidity === 'none' ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                <Wallet className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="text-xs font-black text-slate-900 dark:text-white">
                                  جیب شخصی (بدون کسر از دخل)
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  ثبت در سودوزیان، بدون کسر وجه
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                              source === 'personal' && impactOnLiquidity === 'none'
                                ? 'bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              بدون کسر از نقدینگی
                            </span>
                          </div>
                          
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 dark:text-slate-400 font-bold">
                              اثر بر دخل و بانک:
                            </span>
                            <span className="font-black text-purple-600 dark:text-purple-400">
                              دست‌نخورده (۰ کسر)
                            </span>
                          </div>
                        </div>

                        {/* Option 4: Personal Money - Injected to Capital */}
                        <div
                          onClick={() => { setSource('personal'); setImpactOnLiquidity('inject'); }}
                          className={`p-2.5 rounded-2xl border text-right cursor-pointer transition-all relative ${
                            source === 'personal' && impactOnLiquidity === 'inject'
                              ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-xl shrink-0 ${source === 'personal' && impactOnLiquidity === 'inject' ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                <TrendingUp className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="text-xs font-black text-slate-900 dark:text-white">
                                  پرداخت شخصی + افزایش آورده
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  هزینه + تزریق به صندوق
                                </div>
                              </div>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                              source === 'personal' && impactOnLiquidity === 'inject'
                                ? 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {amount > 0 ? `+${formatPrice(amount)} آورده` : '+ آورده به صندوق'}
                            </span>
                          </div>
                          
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 dark:text-slate-400 font-bold">
                              مانده صندوق پس از ثبت:
                            </span>
                            <span className="font-black text-amber-600 dark:text-amber-400">
                              {amount > 0 ? formatPrice(netCashBalance + amount) : formatPrice(netCashBalance)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Description Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">توضیحات و شرح سند:</label>
                    <input
                      type="text"
                      placeholder="توضیحات تکمیلی (مثلاً: کرایه باربری، نام راننده، شماره بارنامه یا بابت...)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>

                  {/* 5. Live Dynamic Accounting Summary Banner */}
                  {amount > 0 && (
                    <div className={`p-2.5 rounded-2xl border text-xs leading-relaxed space-y-0.5 ${
                      txType === 'expense'
                        ? (source === 'personal' && impactOnLiquidity === 'none'
                            ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                            : source === 'personal' && impactOnLiquidity === 'inject'
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                            : source === 'bank'
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                            : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200')
                        : 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200'
                    }`}>
                      <div className="font-black flex items-center gap-1.5 text-[11px]">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>اثر حسابداری سند:</span>
                      </div>
                      <div className="font-medium text-[11px] text-slate-700 dark:text-slate-300">
                        {txType === 'expense' && source === 'cash' && `مبلغ ${formatPrice(amount)} در سرفصل «${category}» ثبت شده و از نقدینگی صندوق کسر می‌گردد.`}
                        {txType === 'expense' && source === 'bank' && `مبلغ ${formatPrice(amount)} در سرفصل «${category}» ثبت شده و از موجودی حساب بانکی کسر می‌گردد.`}
                        {txType === 'expense' && source === 'personal' && impactOnLiquidity === 'none' && `مبلغ ${formatPrice(amount)} از جیب شخصی پرداخت شده؛ در سودوزیان ثبت شده ولی نقدینگی فروشگاه دست‌نخورده می‌ماند.`}
                        {txType === 'expense' && source === 'personal' && impactOnLiquidity === 'inject' && `مبلغ ${formatPrice(amount)} به عنوان هزینه ثبت و معادل آن به نقدینگی صندوق اضافه می‌گردد.`}
                        {txType === 'deposit' && `مبلغ ${formatPrice(amount)} به عنوان افزایش سرمایه به ${source === 'cash' ? 'صندوق نقدی' : 'حساب بانکی'} اضافه خواهد شد.`}
                        {txType === 'transfer' && `مبلغ ${formatPrice(amount)} از ${source === 'cash' ? 'صندوق نقدی' : 'حساب بانکی'} به ${destination === 'cash' ? 'صندوق نقدی' : 'حساب بانکی'} منتقل خواهد شد.`}
                      </div>
                    </div>
                  )}

                  {/* Validation Warnings */}
                  {txType === 'expense' && source === 'cash' && impactOnLiquidity === 'deduct' && amount > (netCashBalance + (editingTx?.source === 'cash' && editingTx?.type === 'expense' ? editingTx.amount : 0)) && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-rose-200 dark:border-rose-800">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>مبلغ هزینه از موجودی صندوق نقدی ({formatPrice(netCashBalance)}) بیشتر است!</span>
                    </div>
                  )}

                  {txType === 'expense' && source === 'bank' && impactOnLiquidity === 'deduct' && amount > (netBankBalance + (editingTx?.source === 'bank' && editingTx?.type === 'expense' ? editingTx.amount : 0)) && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-rose-200 dark:border-rose-800">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>مبلغ هزینه از موجودی حساب بانکی ({formatPrice(netBankBalance)}) بیشتر است!</span>
                    </div>
                  )}
                </div>

                {/* Fixed Sticky Footer */}
                <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 rounded-b-3xl">
                  <div className="text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-bold block sm:inline">مبلغ سند:</span>{' '}
                    <span className="font-black text-slate-900 dark:text-white text-sm dir-ltr">
                      {formatPrice(amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsTxFormOpen(false); setEditingTx(null); }}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={amount <= 0}
                      className={`px-4 py-2 rounded-xl ${theme.primary} ${theme.primaryHover} disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-1.5`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingTx ? 'ذخیره اصلاحات' : 'ثبت در خزانه‌داری'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-xl text-right space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  حذف تراکنش صندوق / نقدینگی
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  آیا از حذف این تراکنش از دفتر کل نقدینگی اطمینان دارید؟
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>مبلغ تراکنش:</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm dir-ltr">
                    {formatPrice(deleteConfirmTx.amount)}
                  </span>
                </div>
                {deleteConfirmTx.description && (
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <span>شرح:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                      {deleteConfirmTx.description}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-3 rounded-2xl text-[11px] font-bold flex items-start gap-2 border border-amber-200/80 dark:border-amber-800/50">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  با حذف این تراکنش، موجودی صندوق و مانده حساب‌ها به‌طور خودکار مجدداً محاسبه و اصلاح خواهند شد.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmTx.itemType === 'payment') {
                      if (onDeletePayment) {
                        const cleanPayId = deleteConfirmTx.rawId || deleteConfirmTx.id.replace(/^pay-/, '');
                        onDeletePayment(cleanPayId);
                      }
                    } else {
                      const cleanTxId = deleteConfirmTx.rawId || deleteConfirmTx.id.replace(/^tx-tx-/, 'tx-').replace(/^tx-/, '');
                      onDeleteTreasuryTransaction(cleanTxId);
                    }
                    setDeleteConfirmTx(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                >
                  حذف قطعی تراکنش
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTx(null)}
                  className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Expense Category Manager Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg relative z-10 shadow-xl text-right space-y-4"
            >
              <button
                type="button"
                onClick={() => { setIsCategoryModalOpen(false); setEditingCategoryIndex(null); }}
                className="p-1.5 absolute top-5 left-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className={`w-5 h-5 ${theme.primaryText}`} />
                  <span>مدیریت دسته‌بندی‌های هزینه و مخارج</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  می‌توانید سرفصل‌های هزینه دلخواه (مانند کرایه بار، بسته‌بندی، تبلیغات و...) را اضافه، ویرایش یا حذف کنید.
                </p>
              </div>

              {/* Add New Category Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="عنوان سرفصل هزینه جدید..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>افزودن دسته</span>
                </button>
              </div>

              {/* Categories List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {expenseCategories.map((cat, idx) => (
                  <div
                    key={`exp-cat-edit-${cat || idx}-${idx}`}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2"
                  >
                    {editingCategoryIndex === idx ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editingCategoryValue}
                          onChange={(e) => setEditingCategoryValue(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-blue-500 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleUpdateCategory(idx);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCategory(idx)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                          title="ذخیره"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryIndex(null)}
                          className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                          title="انصراف"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{cat}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryIndex(idx);
                              setEditingCategoryValue(cat);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="ویرایش نام"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={expenseCategories.length <= 1}
                            onClick={() => handleDeleteCategory(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="حذف دسته"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => { setIsCategoryModalOpen(false); setEditingCategoryIndex(null); }}
                  className={`px-5 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white text-xs font-black shadow-xs transition-all cursor-pointer`}
                >
                  بستن و ذخیره
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. 🌟 Ultra-Professional Fullscreen Chart Studio Modal */}
      <AnimatePresence>
        {fullscreenChart && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md no-print overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 w-full max-w-5xl my-auto relative shadow-2xl text-right space-y-5"
            >
              {/* Modal Top Navigation Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200 dark:border-blue-800">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      {fullscreenChart === 'treasury_distribution' && 'استودیو تمام‌صفحه توزیع نقدینگی و موجودی خزانه‌ها'}
                      {fullscreenChart === 'payment_channels' && 'استودیو تمام‌صفحه کانال‌های دریافتی و وصولی‌ها'}
                      {fullscreenChart === 'cashflow_timeline' && 'استودیو تمام‌صفحه روند زمانی گردش وجوه نقد'}
                      {fullscreenChart === 'expenses_breakdown' && 'استودیو تمام‌صفحه آنالیز دسته‌بندی مخارج و هزینه‌ها'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {fullscreenChart === 'treasury_distribution' && 'تفکیک مانده صندوق نقدی و تنخواه، حساب‌های بانکی و پوز، و اسناد تجاری و چک‌های صیادی'}
                      {fullscreenChart === 'payment_channels' && 'بررسی دقیق وصولی‌ها بر اساس روش‌های پرداخت در بازه انتخابی'}
                      {fullscreenChart === 'cashflow_timeline' && 'روند مقایسه‌ای روزانه ورودی‌ها در برابر هزینه‌ها، کرایه‌ها و تراز نهایی'}
                      {fullscreenChart === 'expenses_breakdown' && 'سرفصل‌های هزینه‌ای ثبت‌شده در سیستم و سهم هر بخش از کل مخارج'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* View Switchers for Specific Charts */}
                  {fullscreenChart === 'treasury_distribution' && (
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setTreasuryChartMode('bar')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          treasuryChartMode === 'bar'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        نمودار ستونی
                      </button>
                      <button
                        type="button"
                        onClick={() => setTreasuryChartMode('donut')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          treasuryChartMode === 'donut'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        نمودار دونات
                      </button>
                    </div>
                  )}

                  {fullscreenChart === 'cashflow_timeline' && (
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setCashflowTimelineChartMode('area')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          cashflowTimelineChartMode === 'area'
                            ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        مساحتی گرادیان
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashflowTimelineChartMode('bar')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          cashflowTimelineChartMode === 'bar'
                            ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        ستونی مقایسه‌ای
                      </button>
                    </div>
                  )}

                  {/* Exit Fullscreen Button */}
                  <button
                    type="button"
                    onClick={() => setFullscreenChart(null)}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Minimize2 className="w-4 h-4" />
                    <span>خروج از تمام‌صفحه</span>
                  </button>
                </div>
              </div>

              {/* Chart Fullscreen Canvas */}
              <div className="h-[360px] sm:h-[420px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {fullscreenChart === 'treasury_distribution' ? (
                    treasuryChartMode === 'bar' ? (
                      <BarChart data={treasuryChartData} layout="vertical" margin={{ left: 15, right: 30, top: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.15} />
                        <XAxis type="number" tickFormatter={(val) => formatPrice(val)} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          width={180} 
                          tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <Tooltip 
                          formatter={(value: any) => [`${formatPrice(value as number)}`, 'موجودی']} 
                          contentStyle={chartFullscreenTooltipStyle}
                        />
                        <Bar 
                          dataKey="مقدار" 
                          radius={[0, 10, 10, 0]} 
                          barSize={32}
                        >
                          {treasuryChartData.map((entry, index) => (
                            <Cell key={`fs-cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <PieChart>
                        <Pie
                          data={treasuryChartData.map(d => ({ name: d.name, value: d.مقدار, color: d.color }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={135}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {treasuryChartData.map((entry, index) => (
                            <Cell key={`fs-donut-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`${formatPrice(value as number)}`, 'موجودی']} 
                          contentStyle={chartFullscreenTooltipStyle}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    )
                  ) : fullscreenChart === 'payment_channels' ? (
                    <PieChart>
                      <Pie
                        data={periodPaymentMethodsBreakdown.filter(p => p.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={130}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {periodPaymentMethodsBreakdown.map((entry, index) => (
                          <Cell key={`fs-pm-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`${formatPrice(value as number)}`, 'مبلغ']} 
                        contentStyle={chartFullscreenTooltipStyle}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  ) : fullscreenChart === 'cashflow_timeline' ? (
                    cashflowTimelineChartMode === 'area' ? (
                      <AreaChart data={cashflowTimelineData} margin={{ left: 15, right: 25, top: 20, bottom: 25 }}>
                        <defs>
                          <linearGradient id="fsColorInflow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.45}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="fsColorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                        <XAxis 
                          dataKey="displayDate" 
                          tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <YAxis 
                          tickFormatter={(val) => formatPrice(val)}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          formatter={(value: any, name: any) => [
                            `${formatPrice(value as number)}`, 
                            name === 'inflow' ? 'ورودی وجه' : name === 'expense' ? 'هزینه و مخارج' : 'تراز'
                          ]} 
                          labelFormatter={(label) => `تاریخ: ${label}`}
                          contentStyle={chartFullscreenTooltipStyle}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Area type="monotone" dataKey="inflow" name="ورودی وجه" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#fsColorInflow)" />
                        <Area type="monotone" dataKey="expense" name="هزینه و مخارج" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#fsColorExpense)" />
                      </AreaChart>
                    ) : (
                      <BarChart data={cashflowTimelineData} margin={{ left: 15, right: 25, top: 20, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                        <XAxis 
                          dataKey="displayDate" 
                          tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <YAxis 
                          tickFormatter={(val) => formatPrice(val)}
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          formatter={(value: any, name: any) => [
                            `${formatPrice(value as number)}`, 
                            name === 'inflow' ? 'ورودی وجه' : name === 'expense' ? 'هزینه و مخارج' : 'تراز'
                          ]} 
                          labelFormatter={(label) => `تاریخ: ${label}`}
                          contentStyle={chartFullscreenTooltipStyle}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="inflow" name="ورودی وجه" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={36} />
                        <Bar dataKey="expense" name="هزینه و مخارج" fill="#f43f5e" radius={[8, 8, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    )
                  ) : (
                    <BarChart data={periodExpenseByCategoryData} layout="vertical" margin={{ left: 15, right: 30, top: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.15} />
                      <XAxis type="number" tickFormatter={(val) => formatPrice(val)} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={140} 
                        tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        formatter={(value: any) => [`${formatPrice(value as number)}`, 'مبلغ هزینه']} 
                        contentStyle={chartFullscreenTooltipStyle}
                      />
                      <Bar dataKey="amount" radius={[0, 8, 8, 0]} barSize={26}>
                        {periodExpenseByCategoryData.map((entry, index) => (
                          <Cell key={`fs-exp-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Modal Analytical Breakdown Table & Deep Statistics */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                {fullscreenChart === 'treasury_distribution' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {treasuryChartData.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.name}</span>
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        </div>
                        <div className="text-base font-black text-slate-900 dark:text-white dir-ltr text-right">
                          {formatPrice(item.مقدار)}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>سهم از کل دارایی‌های خزانه:</span>
                          <span className="font-black text-slate-900 dark:text-white dir-ltr">{toPersianDigits(item.share)}٪</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {fullscreenChart === 'payment_channels' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {periodPaymentMethodsBreakdown.map((entry, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{entry.name}</span>
                        </div>
                        <div className="text-sm font-black text-slate-900 dark:text-white dir-ltr text-right">
                          {formatPrice(entry.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {fullscreenChart === 'cashflow_timeline' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">بیشترین ورودی روزانه</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 dir-ltr block mt-1">{formatPrice(timelineStats.peakInflow)}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{timelineStats.peakInflowDate ? `در ${timelineStats.peakInflowDate}` : '—'}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">بیشترین هزینه روزانه</span>
                      <span className="text-sm font-black text-rose-600 dark:text-rose-400 dir-ltr block mt-1">{formatPrice(timelineStats.peakExpense)}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{timelineStats.peakExpenseDate ? `در ${timelineStats.peakExpenseDate}` : '—'}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">میانگین روزانه ورودی</span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200 dir-ltr block mt-1">{formatPrice(timelineStats.avgDailyInflow)}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">طی {toPersianDigits(timelineStats.activeDays)} روز</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">تراز خالص نهایی</span>
                      <span className={`text-sm font-black dir-ltr block mt-1 ${timelineStats.netPeriodCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {timelineStats.netPeriodCashflow >= 0 ? '+' : ''}{formatPrice(timelineStats.netPeriodCashflow)}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">{timelineStats.netPeriodCashflow >= 0 ? 'مازاد تراز' : 'کسری دوره'}</span>
                    </div>
                  </div>
                )}

                {fullscreenChart === 'expenses_breakdown' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {periodExpenseByCategoryData.map((cat, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{cat.name}</span>
                          <span className="text-[11px] font-black dir-ltr" style={{ color: cat.fill }}>{toPersianDigits(cat.percent)}٪</span>
                        </div>
                        <div className="text-sm font-black text-slate-900 dark:text-white dir-ltr text-right">
                          {formatPrice(cat.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Close footer button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setFullscreenChart(null)}
                  className={`px-6 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5`}
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>بستن تمام‌صفحه</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
