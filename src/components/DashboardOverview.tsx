import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Invoice, 
  Product, 
  Customer, 
  CustomerPayment, 
  StoreSettings, 
  ActivityLog,
  ProductReturn,
  TreasuryTransaction
} from '../types';
import { formatPrice, toPersianDigits, getCurrentPersianDate, getCurrentPersianTime, isDateInPeriod, TimePeriodFilter, getNetReturnAmount, getSavedTimePeriod, saveTimePeriod } from '../utils/formatters';
import { calculateTotalMarketReceivables, calculateCustomerLiveBalance } from '../utils/customerBalanceCalculations';
import { getProductDiscountedPurchasePrice } from '../utils/invoiceCalculations';
import { 
  TrendingUp, 
  Boxes, 
  FileText, 
  PlusCircle, 
  ArrowUpRight, 
  ShieldAlert, 
  ShieldCheck,
  CreditCard, 
  Users, 
  Copy, 
  Check, 
  ArrowRight, 
  Zap, 
  DollarSign, 
  Package, 
  Wallet, 
  Filter, 
  Bell, 
  AlertTriangle,
  RotateCcw,
  Calendar,
  CheckCircle2,
  Search,
  X,
  Eye,
  EyeOff,
  Layers,
  Receipt,
  Sparkles,
  Activity,
  Clock,
  Flame,
  BarChart3,
  Pencil,
  ArrowDownLeft,
  Banknote,
  Target,
  Compass,
  AlertCircle,
  Phone,
  ArrowDownRight,
  RefreshCw,
  BarChart2,
  CheckCheck,
  ShoppingCart,
  Percent,
  Award
} from 'lucide-react';
import { AppTab } from './HeaderNav';
import { DashboardCharts } from './DashboardCharts';
import { SortableTableHeader } from './SortableTableHeader';
import { themes, ThemeColor } from './ThemeConfig';
import { Pagination } from './Pagination';
import { RowUpdateBadge } from './RowUpdateBadge';

interface DashboardOverviewProps {
  invoices: Invoice[];
  products: Product[];
  customers?: Customer[];
  payments?: CustomerPayment[];
  productReturns?: ProductReturn[];
  treasuryTransactions?: TreasuryTransaction[];
  settings: StoreSettings;
  activityLogs?: ActivityLog[];
  isSecretMode: boolean;
  onToggleSecretMode: () => void;
  onNavigateToTab: (tab: AppTab, filter?: string) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onNewInvoice: () => void;
  highlightedInvoiceId?: string | null;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  invoices,
  products,
  customers = [],
  payments = [],
  productReturns = [],
  treasuryTransactions = [],
  settings,
  activityLogs = [],
  isSecretMode,
  onToggleSecretMode,
  onNavigateToTab,
  onViewInvoice,
  onEditInvoice,
  onNewInvoice,
  highlightedInvoiceId = null,
}) => {
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriodFilter>(() => getSavedTimePeriod('month'));
  const [executiveViewSection, setExecutiveViewSection] = useState<'all' | 'performance' | 'risk_radar' | 'liquidity_stream'>('all');

  // Sales Target State (Persisted)
  const [monthlyTarget, setMonthlyTarget] = useState<number>(() => {
    const saved = localStorage.getItem('bazargani_sales_target');
    if (saved) return Number(saved) || 50000000;
    return 50000000;
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInputVal, setTargetInputVal] = useState(monthlyTarget.toString());

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

  const currentTheme = themes[settings.themeColor] || themes.teal;

  // Filter invoices by time period (excluding drafts for financial calculations)
  const filteredInvoices = invoices.filter(inv => {
    return isDateInPeriod(inv.date, timePeriod);
  });

  const finalInvoices = filteredInvoices.filter(i => !i.isDraft);
  const draftInvoicesCount = filteredInvoices.filter(i => i.isDraft).length;

  // Sales metrics (finalized invoices only)
  const salesInvoices = finalInvoices.filter(i => i.type === 'sale');

  const totalSalesRevenue = salesInvoices.reduce((sum, inv) => sum + inv.finalAmount, 0);
  const totalSalesCost = salesInvoices.reduce((sum, inv) => {
    return sum + inv.items.reduce((s, it) => {
      // Acquisition cost incorporating purchase discounts
      const uCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0, invoices, products);
      return s + (it.totalPieces * uCost);
    }, 0);
  }, 0);
  const totalProfit = totalSalesRevenue - totalSalesCost;
  const averageMargin = totalSalesRevenue > 0 ? (totalProfit / totalSalesRevenue) * 100 : 0;

  // Credit vs Cash split
  const creditSales = salesInvoices.filter(i => i.paymentStatus === 'credit' || i.paymentMethod?.includes('نسیه') || i.paymentMethod?.includes('اعتباری'));
  const cashSales = salesInvoices.filter(i => i.paymentStatus !== 'credit' && !i.paymentMethod?.includes('نسیه'));
  const totalCreditAmount = creditSales.reduce((sum, inv) => sum + inv.finalAmount, 0);

  // Inventory valuation metrics
  const totalWarehouseCostValue = products.reduce((sum, p) => sum + (p.stockPieces * p.purchasePrice), 0);
  const totalWarehouseSalesValue = products.reduce((sum, p) => sum + (p.stockPieces * p.sellingPrice), 0);
  const totalStockPieces = products.reduce((sum, p) => sum + p.stockPieces, 0);

  // Low stock products (less than or equal to 3 cartons)
  const lowStockProducts = products.filter(p => {
    const cartons = p.piecesPerCarton > 0 ? p.stockPieces / p.piecesPerCarton : p.stockPieces;
    return cartons <= 3;
  });

  // Returns metrics
  const filteredReturns = productReturns.filter(r => isDateInPeriod(r.date, timePeriod));
  const totalReturnsValue = filteredReturns.reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  // Treasury & Liquidity metrics
  const filteredTreasury = treasuryTransactions.filter(t => isDateInPeriod(t.date, timePeriod));
  const treasuryDeposits = filteredTreasury.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
  const treasuryExpenses = filteredTreasury.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const treasuryNet = treasuryDeposits - treasuryExpenses;

  // Customer debt / receivables metrics
  const totalCustomerReceivables = calculateTotalMarketReceivables(customers, invoices, payments, productReturns);

  // Supplier credit payables
  const totalSupplierPayables = invoices
    .filter(i => !i.isDraft && i.type === 'purchase' && (i.paymentStatus === 'credit' || i.paymentMethod?.includes('نسیه')))
    .reduce((sum, i) => sum + (i.remainingAmount !== undefined ? i.remainingAmount : (i.finalAmount - (i.paidAmount || 0))), 0);
  const netMarketPosition = totalCustomerReceivables - totalSupplierPayables;

  // Strategic KPI Metrics
  const averageOrderValue = salesInvoices.length > 0 ? Math.round(totalSalesRevenue / salesInvoices.length) : 0;
  const cashSettledRevenue = cashSales.reduce((sum, inv) => sum + inv.finalAmount, 0);
  const cashConversionRate = totalSalesRevenue > 0 ? (cashSettledRevenue / totalSalesRevenue) * 100 : 0;
  const activeBuyerCount = new Set(salesInvoices.map(i => i.customerName).filter(Boolean)).size;

  // Target achievement
  const targetPercent = monthlyTarget > 0 ? Math.min(100, Math.round((totalSalesRevenue / monthlyTarget) * 100)) : 0;
  const targetGap = Math.max(0, monthlyTarget - totalSalesRevenue);

  // Dead stock products (products in inventory with >= 2 cartons or >= 20 pieces but 0 sales in period)
  const soldProductKeys = new Set<string>();
  salesInvoices.forEach(inv => {
    inv.items.forEach(it => {
      if (it.productId) soldProductKeys.add(it.productId);
      if (it.productName) soldProductKeys.add(it.productName);
    });
  });

  const deadStockProducts = products
    .filter(p => {
      const hasSold = soldProductKeys.has(p.id) || soldProductKeys.has(p.name);
      const cartons = p.piecesPerCarton > 0 ? p.stockPieces / p.piecesPerCarton : p.stockPieces;
      return !hasSold && cartons >= 2 && p.stockPieces > 0;
    })
    .map(p => ({
      product: p,
      tiedUpCapital: p.stockPieces * (p.purchasePrice > 0 ? p.purchasePrice : p.sellingPrice),
      cartons: p.piecesPerCarton > 0 ? Math.floor(p.stockPieces / p.piecesPerCarton) : 0,
      loose: p.piecesPerCarton > 0 ? p.stockPieces % p.piecesPerCarton : p.stockPieces
    }))
    .sort((a, b) => b.tiedUpCapital - a.tiedUpCapital)
    .slice(0, 4);

  const totalDeadStockCapital = deadStockProducts.reduce((sum, d) => sum + d.tiedUpCapital, 0);

  // Top Debtors Radar (Customers with highest outstanding debt)
  const topDebtors = customers
    .map(cust => {
      const liveBalance = calculateCustomerLiveBalance(cust, invoices, payments, productReturns);
      const custInvoices = invoices.filter(inv =>
        !inv.isDraft && inv.type === 'sale' &&
        ((inv as any).customerId === cust.id || inv.customerName?.trim().toLowerCase() === cust.name?.trim().toLowerCase())
      );
      const lastInvoice = custInvoices.length > 0 ? custInvoices[custInvoices.length - 1] : null;
      return {
        customer: cust,
        balance: liveBalance,
        lastDate: lastInvoice?.date || '',
        invoicesCount: custInvoices.length,
        riskLevel: liveBalance >= 20000000 ? 'high' : liveBalance >= 5000000 ? 'medium' : 'normal'
      };
    })
    .filter(d => d.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 4);

  // Recent Treasury Activity
  const recentTreasury = [...treasuryTransactions]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 4);

  // Category breakdown
  const categoriesMap: Record<string, { count: number; stockCartons: number; value: number }> = {};
  products.forEach(p => {
    const cat = p.category || 'سایر دسته‌ها';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = { count: 0, stockCartons: 0, value: 0 };
    }
    categoriesMap[cat].count += 1;
    categoriesMap[cat].stockCartons += p.piecesPerCarton > 0 ? Math.floor(p.stockPieces / p.piecesPerCarton) : 0;
    categoriesMap[cat].value += p.stockPieces * p.sellingPrice;
  });

  const categories = Object.entries(categoriesMap).sort((a, b) => b[1].value - a[1].value);

  // Table state on dashboard overview (صفحه اول)
  const [tableSearchQuery, setTableSearchQuery] = useState('');
  const [tableFilterType, setTableFilterType] = useState<'all' | 'sale' | 'purchase' | 'credit' | 'cash'>('all');
  const [tableCurrentPage, setTableCurrentPage] = useState(1);
  const [tableItemsPerPage, setTableItemsPerPage] = useState(6);

  const filteredTableInvoices = finalInvoices.filter(inv => {
    if (tableFilterType === 'sale' && inv.type !== 'sale') return false;
    if (tableFilterType === 'purchase' && inv.type !== 'purchase') return false;
    if (tableFilterType === 'credit' && inv.paymentStatus !== 'credit' && !inv.paymentMethod?.includes('نسیه')) return false;
    if (tableFilterType === 'cash' && (inv.paymentStatus === 'credit' || inv.paymentMethod?.includes('نسیه'))) return false;

    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.trim().toLowerCase();
      const matchInvNo = inv.invoiceNumber?.toLowerCase().includes(q);
      const matchCust = inv.customerName?.toLowerCase().includes(q);
      const matchPhone = inv.customerPhone?.toLowerCase().includes(q);
      const matchCity = inv.customerCity?.toLowerCase().includes(q);
      const matchItem = inv.items?.some(it => it.productName.toLowerCase().includes(q));
      return matchInvNo || matchCust || matchPhone || matchCity || matchItem;
    }
    return true;
  });

  type DashSortField = 'index' | 'invoiceNumber' | 'date' | 'customer' | 'amount';
  const [dashSortField, setDashSortField] = useState<DashSortField>('date');
  const [dashSortDirection, setDashSortDirection] = useState<'desc' | 'asc'>('desc');

  const handleDashSort = (field: DashSortField) => {
    if (dashSortField === field) {
      setDashSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setDashSortField(field);
      setDashSortDirection(field === 'customer' ? 'asc' : 'desc');
    }
  };

  const sortedTableInvoices = React.useMemo(() => {
    return [...filteredTableInvoices].sort((a, b) => {
      let cmp = 0;
      if (dashSortField === 'invoiceNumber') {
        cmp = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
      } else if (dashSortField === 'customer') {
        cmp = (a.customerName || '').localeCompare(b.customerName || '', 'fa');
      } else if (dashSortField === 'amount') {
        cmp = (a.finalAmount || 0) - (b.finalAmount || 0);
      } else {
        // date / timestamp
        const ta = a.createdAt || (a.date ? new Date(a.date.replace(/\//g, '-')).getTime() || 0 : 0);
        const tb = b.createdAt || (b.date ? new Date(b.date.replace(/\//g, '-')).getTime() || 0 : 0);
        if (ta && tb && ta !== tb) cmp = ta - tb;
        else cmp = (a.date || '').localeCompare(b.date || '');
      }
      return dashSortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredTableInvoices, dashSortField, dashSortDirection]);

  const tableTotalPages = Math.ceil(sortedTableInvoices.length / tableItemsPerPage) || 1;
  const paginatedTableInvoices = sortedTableInvoices.slice(
    (tableCurrentPage - 1) * tableItemsPerPage,
    tableCurrentPage * tableItemsPerPage
  );

  // Auto-scroll and paginate to highlighted invoice row in Dashboard table ONLY if not already visible
  useEffect(() => {
    if (!highlightedInvoiceId) return;
    const targetIdx = sortedTableInvoices.findIndex(inv => inv.id === highlightedInvoiceId);
    if (targetIdx >= 0) {
      const targetPage = Math.floor(targetIdx / tableItemsPerPage) + 1;
      if (tableCurrentPage !== targetPage) {
        setTableCurrentPage(targetPage);
      }
      setTimeout(() => {
        const el = document.getElementById(`dash-inv-row-${highlightedInvoiceId}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const windowHeight = window.innerHeight || document.documentElement.clientHeight;
          const isVisible = rect.top >= 70 && rect.bottom <= (windowHeight - 30);
          if (!isVisible) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 300);
    }
  }, [highlightedInvoiceId, sortedTableInvoices, tableItemsPerPage]);

  // Live Executive Liquidity Breakdown (صندوق و بانک)
  const cashBalance = treasuryTransactions
    .filter(t => t.source === 'cash')
    .reduce((s, t) => s + (t.impactOnLiquidity === 'deduct' ? -t.amount : t.amount), 0);
  const bankBalance = treasuryTransactions
    .filter(t => t.source === 'bank')
    .reduce((s, t) => s + (t.impactOnLiquidity === 'deduct' ? -t.amount : t.amount), 0);
  const totalLiquidityNow = cashBalance + bankBalance;

  // Top fast-selling & profitable products
  const topProducts = React.useMemo(() => {
    const map = new Map<string, { product: Product; totalQuantity: number; totalRevenue: number; totalProfit: number; cartons: number; loose: number }>();
    salesInvoices.forEach(inv => {
      inv.items.forEach(it => {
        const prod = products.find(p => p.id === it.productId || p.name === it.productName);
        const key = prod?.id || it.productId || it.productName;
        if (!key) return;
        const cur = map.get(key) || {
          product: prod || { 
            id: key, 
            name: it.productName, 
            category: 'عمومی', 
            purchasePrice: it.unitPurchasePrice || 0, 
            sellingPrice: it.unitSellingPrice || it.unitPrice || 0, 
            stockPieces: 0, 
            piecesPerCarton: it.piecesPerCarton || 1, 
            packsPerCarton: 1, 
            piecesPerPack: 1, 
            unitTitle: it.unitTitle || 'عدد', 
            createdAt: 0, 
            updatedAt: 0 
          },
          totalQuantity: 0,
          totalRevenue: 0,
          totalProfit: 0,
          cartons: 0,
          loose: 0,
        };
        const uCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0, invoices, products);
        const itemRev = (it.totalPrice !== undefined && it.totalPrice > 0)
          ? it.totalPrice
          : (it.totalPieces * (it.unitSellingPrice || it.unitPrice || prod?.sellingPrice || 0));
        const itemCost = it.totalPieces * uCost;
        const itemProfit = itemRev - itemCost;

        const ppc = it.piecesPerCarton || prod?.piecesPerCarton || 1;
        const cCount = it.cartonsCount !== undefined ? it.cartonsCount : (ppc > 1 ? Math.floor(it.totalPieces / ppc) : 0);
        const lCount = it.extraPieces !== undefined ? it.extraPieces : (ppc > 1 ? it.totalPieces % ppc : it.totalPieces);

        cur.totalQuantity += it.totalPieces;
        cur.totalRevenue += itemRev;
        cur.totalProfit += itemProfit;
        cur.cartons += cCount;
        cur.loose += lCount;
        map.set(key, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
  }, [salesInvoices, products, invoices]);

  // Top active trading partners / customers
  const topCustomers = React.useMemo(() => {
    const map = new Map<string, { name: string; city?: string; count: number; totalAmount: number }>();
    salesInvoices.forEach(inv => {
      if (!inv.customerName) return;
      const key = inv.customerName.trim();
      const cur = map.get(key) || { name: key, city: inv.customerCity, count: 0, totalAmount: 0 };
      cur.count += 1;
      cur.totalAmount += inv.finalAmount || 0;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 4);
  }, [salesInvoices]);

  const handleCopyCard = () => {
    navigator.clipboard.writeText(settings.cardNumber.replace(/\s+/g, ''));
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2000);
  };

  const handleCopyIban = () => {
    navigator.clipboard.writeText(settings.iban.replace(/\s+/g, ''));
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const handleCopyPhone = (phone: string, id: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // Dynamic Hero Banner styling driven directly by currentTheme and adapted to Day/Night themes
  const heroStyle = {
    containerBg: 'bg-white dark:bg-slate-900',
    gradientOverlay: 'bg-gradient-to-br from-white via-slate-50/70 to-slate-100/50 dark:from-slate-900 dark:via-slate-900/95 dark:to-slate-950',
    borderColor: 'border-slate-200/90 dark:border-slate-800',
    glowShadow: 'shadow-2xs dark:shadow-[0_12px_35px_rgba(0,0,0,0.35)]',
    orbHex1: currentTheme.hex,
    orbHex2: currentTheme.secondaryHex || currentTheme.hex,
    accentPillBg: `${currentTheme.primaryLight} ${currentTheme.primaryText} ${currentTheme.borderColor}`,
    primaryBtn: currentTheme.primary,
    primaryBtnHover: currentTheme.primaryHover,
    primaryBtnText: 'text-white font-black',
    primaryBtnShadow: currentTheme.glowClass || 'shadow-sm',
    iconColor: currentTheme.primaryText,
  };

  return (
    <div className="w-full space-y-5 pb-20 no-print transition-colors dir-rtl">
      
      {/* 1. EXECUTIVE COMMAND HEADER - CLEAN, COMPACT & BESPOKE */}
      <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 transition-colors shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                پیشخوان مدیریت مالی و بازرگانی
              </h1>
              {settings.brandName && (
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  · {settings.brandName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              دیده‌بان جامع جریان نقدینگی، سودآوری، اسناد فاکتور، وضعیت انبار و تراز مشتریان
            </p>
          </div>

          {/* Right Header Controls: Period Filter & Main Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Clean Segmented Time Period Filter */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 overflow-x-auto gap-0.5">
              {(['today', 'week', 'month', '3months', '1year', 'all'] as const).map((periodKey) => {
                const labels: Record<string, string> = {
                  today: 'امروز',
                  week: '۷ روز',
                  month: 'ماه جاری',
                  '3months': '۳ ماهه',
                  '1year': '۱ ساله',
                  all: 'کل دوره'
                };
                const isActive = timePeriod === periodKey;
                return (
                  <button
                    key={periodKey}
                    type="button"
                    onClick={() => handleSelectTimePeriod(periodKey)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white font-black shadow-xs`
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800'
                    }`}
                  >
                    {labels[periodKey]}
                  </button>
                );
              })}
            </div>

            {/* Secret Mode Toggle */}
            <button
              onClick={onToggleSecretMode}
              title={isSecretMode ? 'غیرفعال‌سازی حالت محرمانه' : 'فعال‌سازی حالت محرمانه (مخفی‌سازی مبالغ حساس سود)'}
              className={`p-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                isSecretMode
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {isSecretMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* Primary Action Button: New Invoice */}
            <button
              id="hero-create-invoice-btn"
              onClick={onNewInvoice}
              className={`px-3.5 py-2 rounded-lg ${currentTheme.primary} ${currentTheme.primaryHover} text-white font-black text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>صدور فاکتور جدید</span>
            </button>
          </div>
        </div>

        {/* Date & Quick Reference Bar */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{toPersianDigits(getCurrentPersianDate())}</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{toPersianDigits(getCurrentPersianTime())}</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">{toPersianDigits(salesInvoices.length)}</span>
              <span>فاکتور فروش دوره</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">{toPersianDigits(products.length)}</span>
              <span>کالای انبار</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">{toPersianDigits(customers.length)}</span>
              <span>مشتری ثبت‌شده</span>
            </span>
          </div>
        </div>

        {/* Executive Quick Actions Ribbon - Neat, Clean & Fast */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10.5px] font-bold text-slate-400 ml-1">دسترسی سریع:</span>
            
            <button
              onClick={() => onNavigateToTab('invoices', 'new')}
              className={`px-2.5 py-1 rounded-lg ${currentTheme.badgeBg} ${currentTheme.primaryText} hover:opacity-85 text-xs font-bold transition-all cursor-pointer border ${currentTheme.borderColor} flex items-center gap-1.5`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>فاکتور جدید</span>
            </button>

            <button
              onClick={() => onNavigateToTab('inventory')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5 text-blue-500" />
              <span>مدیریت کالا و انبار</span>
            </button>

            <button
              onClick={() => onNavigateToTab('customers')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span>دفتر حساب و مشتریان</span>
            </button>

            <button
              onClick={() => onNavigateToTab('liquidity')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5 text-teal-500" />
              <span>خزانه‌داری و گردش نقد</span>
            </button>

            <button
              onClick={() => onNavigateToTab('profit-loss')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>گزارش سود و زیان</span>
            </button>
          </div>

          {/* Quick Health Summary Pill */}
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span>حاشیه سود دوره:</span>
              <span className="font-mono">{toPersianDigits(averageMargin.toFixed(1))}٪</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <span>تحقق هدف:</span>
              <span className="font-mono">{toPersianDigits(targetPercent)}٪</span>
            </span>
          </div>
        </div>
      </div>

      {/* Draft Invoices Alert Banner */}
      {draftInvoicesCount > 0 && (
        <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center justify-center font-bold text-sm shrink-0">
              📝
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">
                شما {toPersianDigits(draftInvoicesCount)} فاکتور پیش‌نویس بلاتکلیف دارید
              </h4>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                این اسناد هنوز در گردش انبار و محاسبات مالی قطعی اعمال نشده‌اند.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('invoices', 'drafts')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0 shadow-2xs"
          >
            مشاهده پیش‌نویس‌ها ←
          </button>
        </div>
      )}

      {/* 2. THE 4 ESSENTIAL COMMERCIAL PILLARS - UNIFIED, POLISHED & NON-REDUNDANT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Pillar 1: کل فروش و گردش دوره */}
        <div 
          onClick={() => onNavigateToTab('invoices', 'sale')}
          className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all group"
          title="مشاهده فاکتورهای فروش"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">گردش فروش صادره</span>
            <div className={`w-8 h-8 rounded-lg ${currentTheme.primaryLight} ${currentTheme.primaryText} flex items-center justify-center shrink-0 border ${currentTheme.borderColor}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {formatPrice(totalSalesRevenue)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>میانگین فاکتور (AOV):</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatPrice(averageOrderValue)}</span>
            </div>
          </div>

          {/* Cash vs Credit Conversion Meter */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">تسویه نقدی: {toPersianDigits(cashConversionRate.toFixed(0))}٪</span>
              <span className="text-slate-500 dark:text-slate-400 font-bold">
                {toPersianDigits(cashSales.length)} نقدی / {toPersianDigits(creditSales.length)} نسیه
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(5, cashConversionRate))}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Pillar 2: سود ناخالص و بازدهی بازرگانی */}
        <div 
          onClick={() => onNavigateToTab('profit-loss')}
          className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all group"
          title="مشاهده تحلیل سود و زیان"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">سود ناخالص بازرگانی</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {!isSecretMode ? (
                <span className={totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}>
                  {totalProfit >= 0 ? '+' : ''}{formatPrice(totalProfit)}
                </span>
              ) : (
                <span className="text-slate-400">••••••••</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>بهای تمام‌شده خرید (COGS):</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {!isSecretMode ? formatPrice(totalSalesCost) : '••••••••'}
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">حاشیه بازدهی سود:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              +{toPersianDigits(averageMargin.toFixed(1))}٪
            </span>
          </div>
        </div>

        {/* Pillar 3: وضعیت نقدینگی و خزانه‌داری */}
        <div 
          onClick={() => onNavigateToTab('liquidity')}
          className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all group"
          title="مشاهده گردش خزانه‌داری و حساب‌ها"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نقدینگی حاضر (صندوق + بانک)</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
              {formatPrice(totalLiquidityNow)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>صندوق نقد:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatPrice(cashBalance)}</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">حساب‌های بانکی:</span>
            <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
              {formatPrice(bankBalance)}
            </span>
          </div>
        </div>

        {/* Pillar 4: مطالبات بازار و سرمایه انبار */}
        <div 
          onClick={() => onNavigateToTab('customers')}
          className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all group"
          title="مشاهده حساب مشتریان و مطالبات بازار"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مطالبات باز از خریداران</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xl font-black text-purple-700 dark:text-purple-300 tracking-tight font-mono">
              {formatPrice(totalCustomerReceivables || totalCreditAmount)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>ارزش سرمایه انبار:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {!isSecretMode ? formatPrice(totalWarehouseCostValue) : formatPrice(totalWarehouseSalesValue)}
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">تراز خالص بازار:</span>
            <span className={`font-mono font-bold ${netMarketPosition >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netMarketPosition >= 0 ? '+' : ''}{formatPrice(netMarketPosition)}
            </span>
          </div>
        </div>

      </div>

      {/* 3. STRATEGIC TARGET PACING & OPERATIONAL HEALTH (2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        
        {/* Left 2 Cols: Monthly Sales Target Gauge */}
        <div className="lg:col-span-2 bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${currentTheme.badgeBg} ${currentTheme.primaryText} border ${currentTheme.borderColor}`}>
                <Target className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  سنجش تارگت فروش دوره ({toPersianDigits(targetPercent)}٪ محقق شده)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  روند پیشرفت فروش در برابر هدف مصوب بازرگانی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditingTarget ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={targetInputVal}
                    onChange={(e) => setTargetInputVal(e.target.value)}
                    placeholder="مبلغ هدف (تومان)"
                    className="w-32 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const parsed = Number(targetInputVal.replace(/[^0-9]/g, '')) || 50000000;
                      setMonthlyTarget(parsed);
                      localStorage.setItem('bazargani_sales_target', parsed.toString());
                      setIsEditingTarget(false);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${currentTheme.primary} text-white cursor-pointer`}
                  >
                    ذخیره
                  </button>
                  <button
                    onClick={() => setIsEditingTarget(false)}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setTargetInputVal(monthlyTarget.toString());
                    setIsEditingTarget(true);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3 text-slate-400" />
                  <span>تغییر تارگت ({formatPrice(monthlyTarget)})</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar & Target Key Metrics */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 dark:text-slate-300">
                فروش ثبت‌شده: <strong className="text-slate-900 dark:text-white font-mono">{formatPrice(totalSalesRevenue)}</strong>
              </span>
              <span className={`font-mono font-black ${targetPercent >= 100 ? 'text-emerald-600 dark:text-emerald-400' : currentTheme.primaryText}`}>
                {toPersianDigits(targetPercent)}٪ از کل هدف
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/80 dark:border-slate-700/60">
              <div 
                className="h-full rounded-full transition-all duration-700"
                style={{ 
                  width: `${Math.min(100, Math.max(4, targetPercent))}%`,
                  backgroundColor: targetPercent >= 100 ? '#10b981' : currentTheme.hex 
                }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">مانده تا تحقق هدف:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {targetGap > 0 ? formatPrice(targetGap) : 'هدف ۱۰۰٪ تکمیل شد 🎉'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">میانگین روزانه فروش:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatPrice(Math.round(totalSalesRevenue / (timePeriod === 'today' ? 1 : timePeriod === 'week' ? 7 : 30)))}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[10px]">تارگت مصوب دوره:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatPrice(monthlyTarget)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Operational Pulse & Alerts */}
        <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5 transition-colors">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Award className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  دیده‌بان سلامت بازرگانی
                </h3>
                <p className="text-[10px] text-slate-400">ریسک‌ها و پایش لحظه‌ای انبار</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/80 dark:border-emerald-800/80">
              فعال و پایدار
            </span>
          </div>

          <div className="space-y-2">
            {/* Low stock notice */}
            <div 
              onClick={() => onNavigateToTab('inventory')}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-bold">اقلام کم‌موجودی انبار</span>
              </div>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {toPersianDigits(lowStockProducts.length)} کالا
              </span>
            </div>

            {/* Dead stock / trapped capital notice */}
            <div 
              onClick={() => onNavigateToTab('inventory')}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Boxes className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-bold">کالاهای بدون فروش (خوابیده)</span>
              </div>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {toPersianDigits(deadStockProducts.length)} قلم
              </span>
            </div>

            {/* Credit Risk */}
            <div 
              onClick={() => onNavigateToTab('customers')}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-bold">گردش نسیه و اعتبار</span>
              </div>
              <span className="text-slate-600 dark:text-slate-300 font-bold">
                {toPersianDigits(creditSales.length)} سند نسیه
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. COMMERCIAL INTELLIGENCE HUB (CLEAN SEGMENTED TABS) */}
      <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${currentTheme.badgeBg} ${currentTheme.primaryText} border ${currentTheme.borderColor}`}>
              <BarChart2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                دیده‌بان تحلیلی و عملیاتی بازرگانی
              </h2>
              <p className="text-[10px] text-slate-400">
                تفکیک متمرکز کالاها، مشتریان، رادار ریسک و نبض خزانه‌داری
              </p>
            </div>
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setExecutiveViewSection('performance')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                executiveViewSection === 'performance' || executiveViewSection === 'all'
                  ? `${currentTheme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>پرفروش‌ترین‌ها و خریداران</span>
            </button>
            <button
              type="button"
              onClick={() => setExecutiveViewSection('risk_radar')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                executiveViewSection === 'risk_radar'
                  ? `${currentTheme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />
              <span>رادار مطالبات و کالاهای راکد</span>
            </button>
            <button
              type="button"
              onClick={() => setExecutiveViewSection('liquidity_stream')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                executiveViewSection === 'liquidity_stream'
                  ? `${currentTheme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-teal-500" />
              <span>گردش خزانه‌داری و اطلاعات حساب</span>
            </button>
          </div>
        </div>

        {/* TAB 1: TOP PRODUCTS & TOP TRADING PARTNERS */}
        {(executiveViewSection === 'performance' || executiveViewSection === 'all') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Products Card */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">پرفروش‌ترین کالاهای دوره</h4>
                </div>
                <button
                  onClick={() => onNavigateToTab('inventory')}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  انبار ←
                </button>
              </div>

              {topProducts.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-bold">
                  هنوز فاکتور فروشی در این دوره ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((item, pIdx) => (
                    <div
                      key={`top-prod-${item.product.id || pIdx}`}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                          {toPersianDigits(pIdx + 1)}
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[170px] sm:max-w-[220px]">
                            {item.product.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            حجم فروش: <strong className="text-slate-700 dark:text-slate-300">{item.cartons > 0 ? `${toPersianDigits(item.cartons)} کارتن` : ''}{item.cartons > 0 && item.loose > 0 ? ' + ' : ''}{item.loose > 0 || item.cartons === 0 ? `${toPersianDigits(item.loose)} دانه` : ''}</strong> ({toPersianDigits(item.totalQuantity)} عدد)
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <div className="font-black text-slate-900 dark:text-white text-xs font-mono dir-ltr">
                          {formatPrice(item.totalRevenue)}
                        </div>
                        {!isSecretMode && item.totalProfit > 0 && (
                          <div className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold font-mono dir-ltr">
                            +{formatPrice(item.totalProfit)} سود
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Customers Card */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">برترین خریداران و طرف‌حساب‌ها</h4>
                </div>
                <button
                  onClick={() => onNavigateToTab('customers')}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  دفتر حساب‌ها ←
                </button>
              </div>

              {topCustomers.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-bold">
                  هنوز خریدی در این دوره ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2">
                  {topCustomers.map((c, cIdx) => (
                    <div
                      key={`top-cust-${c.name}-${cIdx}`}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                          {toPersianDigits(cIdx + 1)}
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[170px] sm:max-w-[220px]">
                            {c.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {c.city ? `${c.city} • ` : ''}{toPersianDigits(c.count)} فقره فاکتور
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <div className="font-black text-slate-900 dark:text-white text-xs font-mono dir-ltr">
                          {formatPrice(c.totalAmount)}
                        </div>
                        <span className="text-[9.5px] text-blue-600 dark:text-blue-400 font-bold">
                          گردش خرید
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DEBTORS RADAR & DEAD STOCK RADAR */}
        {executiveViewSection === 'risk_radar' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Debtors */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">رادار وصول مطالبات بازار</h4>
                </div>
                <button
                  onClick={() => onNavigateToTab('customers')}
                  className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                >
                  دفتر مشتریان ←
                </button>
              </div>

              {topDebtors.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                  هیچ مانده بدهی بازی در حساب مشتریان وجود ندارد.
                </div>
              ) : (
                <div className="space-y-2">
                  {topDebtors.map((d, dIdx) => (
                    <div
                      key={`debtor-${d.customer.id || dIdx}`}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                          {toPersianDigits(dIdx + 1)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[150px] sm:max-w-[200px]">
                            {d.customer.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {d.customer.city && <span>{d.customer.city}</span>}
                            {d.lastDate && <span> • آخرین سند: {toPersianDigits(d.lastDate)}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-left font-mono font-bold text-purple-700 dark:text-purple-300 text-xs">
                          {formatPrice(d.balance)}
                        </div>
                        {d.customer.phone && (
                          <button
                            onClick={() => handleCopyPhone(d.customer.phone, d.customer.id)}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                            title={`کپی شماره: ${d.customer.phone}`}
                          >
                            {copiedPhoneId === d.customer.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Phone className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dead Stock Radar */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">کالاهای راکد ({formatPrice(totalDeadStockCapital)} سرمایه خوابیده)</h4>
                </div>
                <button
                  onClick={() => onNavigateToTab('inventory')}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  انبار ←
                </button>
              </div>

              {deadStockProducts.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                  گردش انبار عالی است و هیچ کالای خوابیده‌ای در این دوره یافت نشد.
                </div>
              ) : (
                <div className="space-y-2">
                  {deadStockProducts.map((item, dsIdx) => (
                    <div
                      key={`dead-stock-${item.product.id || dsIdx}`}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                          {toPersianDigits(dsIdx + 1)}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[150px] sm:max-w-[200px]">
                            {item.product.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            موجودی: {toPersianDigits(item.cartons)} کارتن ({toPersianDigits(item.product.stockPieces)} عدد)
                          </div>
                        </div>
                      </div>

                      <div className="text-left font-mono font-bold text-amber-700 dark:text-amber-400 text-xs shrink-0">
                        {formatPrice(item.tiedUpCapital)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: TREASURY ACTIVITY & BANK SETTLEMENT INFO */}
        {executiveViewSection === 'liquidity_stream' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Treasury Transactions */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-teal-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">آخرین گردش خزانه‌داری</h4>
                </div>
                <button
                  onClick={() => onNavigateToTab('liquidity')}
                  className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  دفتر خزانه‌داری ←
                </button>
              </div>

              {recentTreasury.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-bold">
                  هنوز تراکنشی در خزانه‌داری ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTreasury.map((tr, tIdx) => {
                    const isDeposit = tr.type === 'deposit';
                    return (
                      <div
                        key={`tr-rec-${tr.id || tIdx}`}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            isDeposit 
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          }`}>
                            {isDeposit ? 'واریز' : 'پرداخت'}
                          </span>
                          <span className="text-xs text-slate-800 dark:text-slate-200 truncate max-w-[140px] sm:max-w-[180px]">
                            {tr.description || 'تراکنش خزانه‌داری'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-slate-400 text-[10px]">{toPersianDigits(tr.date)}</span>
                          <span className={`font-mono font-black text-xs ${isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {isDeposit ? '+' : '-'}{formatPrice(tr.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Bank & Settlement Account Card */}
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">مشخصات حساب بانکی و تسویه</h4>
                </div>
                <span className="text-[10px] font-bold text-slate-500">{settings.bankName?.split('-')[0]?.trim() || 'بانک تجارت / ملت'}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500">شماره کارت:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white dir-ltr">
                      {toPersianDigits(settings.cardNumber)}
                    </span>
                    <button
                      onClick={handleCopyCard}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      title="کپی شماره کارت"
                    >
                      {copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500">شماره شبا (IBAN):</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 dir-ltr text-[11px] truncate max-w-[160px] sm:max-w-[200px]">
                      {settings.iban}
                    </span>
                    <button
                      onClick={handleCopyIban}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                      title="کپی شماره شبا"
                    >
                      {copiedIban ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. INTERACTIVE ANALYTICAL CHARTS */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <DashboardCharts
          invoices={filteredInvoices}
          products={products}
          themeHex={currentTheme.hex}
          settings={settings}
          isSecretMode={isSecretMode}
        />
      </motion.div>

      {/* 6. STREAMLINED & COMPACT INVOICES TABLE (MATCHING INVOICELIST STANDARD) */}
      <div 
        className="bg-white dark:bg-[#090d16] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-none overflow-hidden transition-colors"
      >
        {/* Table Header & Controls */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${currentTheme.primaryLight} ${currentTheme.primaryText} border ${currentTheme.borderColor}`}>
                <Receipt className="w-4 h-4" />
              </span>
              <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                دفتر اسناد و فهرست ریز فاکتورهای بازرگانی
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300/60 dark:border-slate-700/60">
                {toPersianDigits(filteredTableInvoices.length)} سند
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              نمایش فشرده و یکپارچه اسناد فروش، خرید، تسویه‌ها و سود ناخالص لحظه‌ای
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در فاکتور، مشتری، کالا..."
                value={tableSearchQuery}
                onChange={(e) => {
                  setTableSearchQuery(e.target.value);
                  setTableCurrentPage(1);
                }}
                className="w-full pr-7 pl-6 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors shadow-none"
              />
              {tableSearchQuery && (
                <button
                  onClick={() => setTableSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <button
                onClick={() => { setTableFilterType('all'); setTableCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'all'
                    ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white shadow-xs font-black`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                همه ({toPersianDigits(finalInvoices.length)})
              </button>
              <button
                onClick={() => { setTableFilterType('sale'); setTableCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'sale'
                    ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white shadow-xs font-black`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                فروش ({toPersianDigits(salesInvoices.length)})
              </button>
              <button
                onClick={() => { setTableFilterType('purchase'); setTableCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'purchase'
                    ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white shadow-xs font-black`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                خرید / تأمین
              </button>
              <button
                onClick={() => { setTableFilterType('credit'); setTableCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'credit'
                    ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white shadow-xs font-black`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                نسیه ({toPersianDigits(creditSales.length)})
              </button>
              <button
                onClick={() => { setTableFilterType('cash'); setTableCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'cash'
                    ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white shadow-xs font-black`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                نقدی
              </button>
            </div>
          </div>
        </div>

        {/* The Compact Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead className="bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs select-none">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>

                {/* Column 1: Customer & Type (Merged) */}
                <SortableTableHeader
                  field="customer"
                  currentField={dashSortField}
                  currentDirection={dashSortDirection}
                  onSort={handleDashSort}
                  className="py-2.5 px-3 min-w-[180px]"
                >
                  طرف‌حساب و نوع سند
                </SortableTableHeader>

                {/* Column 2: Document Number & Date (Merged) */}
                <SortableTableHeader
                  field="date"
                  currentField={dashSortField}
                  currentDirection={dashSortDirection}
                  onSort={handleDashSort}
                  className="py-2.5 px-3 min-w-[140px]"
                >
                  شماره و تاریخ سند
                </SortableTableHeader>

                {/* Column 3: Settlement Method & Status */}
                <th className="py-2.5 px-3 min-w-[110px]">نحوه و وضعیت تسویه</th>

                {/* Column 4: Amount & Items (Merged & Centered) */}
                <SortableTableHeader
                  field="amount"
                  currentField={dashSortField}
                  currentDirection={dashSortDirection}
                  onSort={handleDashSort}
                  align="center"
                  className="py-2.5 px-3 text-center min-w-[150px]"
                >
                  مبلغ کل و اقلام
                </SortableTableHeader>

                {/* Column 5: Profit & Margin (Merged & Centered) */}
                <th className="py-2.5 px-3 text-center min-w-[140px]">سود و حاشیه فاکتور</th>

                {/* Column 6: Actions */}
                <th className="py-2.5 px-3 text-center w-24">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
              {paginatedTableInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                    هیچ سندی مطابق با فیلترها و جستجوی شما یافت نشد.
                  </td>
                </tr>
              ) : (
                paginatedTableInvoices.map((inv, idx) => {
                  const absIdx = (tableCurrentPage - 1) * tableItemsPerPage + idx + 1;
                  const isSale = inv.type === 'sale';
                  const isCredit = inv.paymentStatus === 'credit' || inv.paymentMethod?.includes('نسیه');
                  const totalExpenses = (inv.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0) || (inv.expensesTotalAddition || 0) || (inv.expensesTotalDeduction || 0);
                  
                  const invoiceCost = inv.items.reduce((s, it) => {
                    const uCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0, invoices, products);
                    return s + (it.totalPieces * uCost);
                  }, 0);

                  const invoiceDisplayAmount = isSale 
                    ? inv.finalAmount 
                    : ((inv.finalAmount && inv.finalAmount > 0) ? inv.finalAmount : ((inv.subtotal || invoiceCost || 0) + totalExpenses));

                  const invoiceProfit = isSale ? inv.finalAmount - invoiceCost : 0;
                  const invoiceMargin = (isSale && inv.finalAmount > 0) ? (invoiceProfit / inv.finalAmount) * 100 : 0;
                  const isInvHighlighted = Boolean(highlightedInvoiceId && highlightedInvoiceId === inv.id);

                  return (
                    <tr 
                      id={`dash-inv-row-${inv.id || idx}`}
                      key={`dash-inv-${inv.id || idx}-${idx}`} 
                      className={`transition-all duration-500 ${
                        isInvHighlighted
                          ? 'row-updated-highlight bg-emerald-500/15 dark:bg-emerald-500/20 ring-2 ring-emerald-500 shadow-md'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors'
                      }`}
                    >
                      {/* # Index */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {toPersianDigits(absIdx)}
                      </td>

                      {/* 1. Customer & Type (Merged) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[190px]">
                            {inv.customerName}
                          </span>
                          {isInvHighlighted && (
                            <RowUpdateBadge label="سند ذخیره شد" />
                          )}
                          {isSale ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 font-bold text-[9.5px]">
                              فروش
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/40 font-bold text-[9.5px]">
                              خرید
                            </span>
                          )}
                        </div>
                        {(inv.customerCity || inv.customerPhone) && (
                          <div className="text-[10.5px] text-slate-400 truncate max-w-[200px] mt-0.5">
                            {inv.customerCity} {inv.customerPhone ? `• ${toPersianDigits(inv.customerPhone)}` : ''}
                          </div>
                        )}
                      </td>

                      {/* 2. Document Number & Date (Merged) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-900 dark:text-slate-100 font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                            #{toPersianDigits(inv.invoiceNumber)}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          {toPersianDigits(inv.date)}
                        </div>
                      </td>

                      {/* 3. Settlement Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isCredit ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold text-[10px]">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>نسیه (اعتباری)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold text-[10px]">
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>نقدی / واریز</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Total Amount & Items (Merged & Centered) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="font-black text-slate-900 dark:text-white text-xs font-mono text-center">
                          {formatPrice(invoiceDisplayAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                          <span>{toPersianDigits(inv.items.length)} قلم کالا</span>
                          {!isSale && totalExpenses > 0 && (
                            <span className="text-teal-600 dark:text-teal-400 font-bold">
                              (+{formatPrice(totalExpenses)} کرایه)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Profit & Margin (Merged & Centered) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap text-xs">
                        {isSale && !isSecretMode ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-center gap-1.5 font-mono">
                              <span className={`font-black ${invoiceProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                                {invoiceProfit >= 0 ? '+' : ''}{formatPrice(invoiceProfit)}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                                {toPersianDigits(invoiceMargin.toFixed(1))}٪
                              </span>
                            </div>
                            <div className="text-[9.5px] text-slate-400 font-sans text-center">
                              سود ناخالص سند
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      {/* 6. Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className={`inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 ${currentTheme.accentHoverBg} text-slate-600 dark:text-slate-300 ${currentTheme.activeText} transition-colors cursor-pointer border border-slate-200 dark:border-slate-700`}
                            title="مشاهده فاکتور"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {onEditInvoice && (
                            <button
                              onClick={() => onEditInvoice(inv)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                              title="ویرایش فاکتور"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Comprehensive Pagination Component */}
        <Pagination
          currentPage={tableCurrentPage}
          totalPages={tableTotalPages}
          totalItems={filteredTableInvoices.length}
          itemsPerPage={tableItemsPerPage}
          onPageChange={setTableCurrentPage}
          onItemsPerPageChange={setTableItemsPerPage}
          itemsPerPageOptions={[6, 10, 20, 50]}
          itemName="سند"
          themeColor={settings.themeColor}
        />
      </div>

      {/* 7. WAREHOUSE DIVERSITY & RECENT NOTIFICATIONS (2 CLEAN COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Category Distribution Meters */}
        <div 
          className="bg-white dark:bg-[#090d16] rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-none transition-colors"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${currentTheme.primaryLight} ${currentTheme.primaryText} border ${currentTheme.borderColor}`}>
                <Layers className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">دسته‌بندی و ارزش تنوع انبار</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">سهم ریالی هر دسته از کل سرمایه کالاهای موجود</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              {toPersianDigits(categories.length)} گروه کالایی
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {categories.slice(0, 6).map(([catName, data], cIdx) => {
              const percentage = totalWarehouseSalesValue > 0 ? (data.value / totalWarehouseSalesValue) * 100 : 0;
              return (
                <div key={`dash-cat-${catName || 'uncat'}-${cIdx}`} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{catName}</span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                      {toPersianDigits(data.count)} کالا ({toPersianDigits(data.stockCartons)} کارتن)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, Math.max(8, percentage))}%`,
                        backgroundColor: currentTheme.hex
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{formatPrice(data.value)}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{toPersianDigits(percentage.toFixed(0))}٪</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity & Event Log */}
        <div 
          className="bg-white dark:bg-[#090d16] rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 space-y-3.5 shadow-none transition-colors"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">رویدادها و اعلان‌های اخیر</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">گزارش لحظه‌ای ثبت اسناد و هشدارها</p>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              {toPersianDigits(activityLogs.length)} رویداد
            </span>
          </div>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-0.5 custom-scrollbar">
            {activityLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-bold">
                هنوز رویدادی ثبت نشده است.
              </div>
            ) : (
              activityLogs.slice(0, 5).map((log, lIdx) => {
                const isWarning = log.type === 'warning';
                return (
                  <div
                    key={`activity-log-${log.id || lIdx}-${lIdx}`}
                    onClick={() => {
                      if (log.tabTarget) {
                        onNavigateToTab(log.tabTarget);
                      }
                    }}
                    className={`p-2.5 rounded-lg transition-colors flex items-start gap-2.5 text-xs ${
                      isWarning
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50'
                        : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    } ${log.tabTarget ? 'cursor-pointer' : ''}`}
                  >
                    <div className={`p-1 rounded-md shrink-0 mt-0.5 ${
                      isWarning
                        ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-600 dark:text-rose-300'
                        : log.type === 'payment'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                        : log.type === 'product'
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    }`}>
                      {isWarning ? (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      ) : log.type === 'payment' ? (
                        <DollarSign className="w-3.5 h-3.5" />
                      ) : log.type === 'product' ? (
                        <Boxes className="w-3.5 h-3.5" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-bold text-xs truncate ${
                          isWarning ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {log.title}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono shrink-0">
                          {toPersianDigits(log.time)}
                        </span>
                      </div>
                      <p className={`text-[11px] line-clamp-1 leading-relaxed ${
                        isWarning ? 'text-rose-600 dark:text-rose-300 font-medium' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {log.description}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
