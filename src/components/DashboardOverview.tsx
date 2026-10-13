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
      
      {/* 1. EXECUTIVE COMMAND HEADER - PURE FLAT BESPOKE COMMERCIAL DESIGN */}
      <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 transition-colors">
        {/* Top Row: Title, Subtitle, and Integrated Period Segmented Control */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                پیشخوان مدیریت مالی و بازرگانی
              </h1>
              {settings.brandName && (
                <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 mr-2">
                  · {settings.brandName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              نظارت یکپارچه بر گردش نقدینگی، سودآوری، اسناد فاکتور، وضعیت انبار و تراز مشتریان
            </p>
          </div>

          {/* Clean Segmented Time Period Filter */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto gap-0.5">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
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
        </div>

        {/* Quick Action Command Toolbar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="hero-create-invoice-btn"
              onClick={onNewInvoice}
              className={`px-4 py-2 rounded-lg ${currentTheme.primary} ${currentTheme.primaryHover} text-white font-black text-xs transition-colors cursor-pointer flex items-center gap-2 shadow-xs`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>صدور فاکتور جدید</span>
            </button>

            <button
              onClick={() => onNavigateToTab('invoices', 'purchase')}
              className="px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5 text-blue-500" />
              <span>فاکتور خرید / تامین</span>
            </button>

            <button
              onClick={() => onNavigateToTab('inventory')}
              className="px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Boxes className="w-3.5 h-3.5 text-slate-500" />
              <span>موجودی انبار</span>
            </button>

            <button
              onClick={() => onNavigateToTab('customers')}
              className="px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>حساب مشتریان</span>
            </button>

            <button
              onClick={() => onNavigateToTab('liquidity')}
              className="px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5 text-slate-500" />
              <span>خزانه‌داری</span>
            </button>

            <button
              onClick={() => onNavigateToTab('returns')}
              className="px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>مرجوعی ({toPersianDigits(productReturns.length)})</span>
            </button>

            <button
              onClick={() => onNavigateToTab('profit-loss')}
              className="px-3.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5 text-teal-500" />
              <span>سود و زیان</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 dark:text-slate-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{toPersianDigits(getCurrentPersianDate())}</span>
            <span>·</span>
            <Clock className="w-3.5 h-3.5" />
            <span>{toPersianDigits(getCurrentPersianTime())}</span>
          </div>
        </div>
      </div>

      {/* Draft Invoices Quick Alert Banner */}
      {draftInvoicesCount > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100 rounded-lg font-bold text-xs">
              📝
            </span>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">
                شما {toPersianDigits(draftInvoicesCount)} فاکتور پیش‌نویس بلاتکلیف دارید
              </h4>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                این اسناد هنوز از موجودی انبار کسر نگردیده‌اند و در حساب‌های مالی ثبت نشده‌اند.
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

      {/* 1.5 STRATEGIC COMMERCIAL PULSE RIBBON - 5 EXECUTIVE METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: میانگین هر فاکتور فروش (AOV) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-1.5 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span>میانگین هر فاکتور (AOV)</span>
            <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
            {formatPrice(averageOrderValue)}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            گردش از <strong className="text-slate-700 dark:text-slate-300">{toPersianDigits(salesInvoices.length)} فاکتور فروش</strong>
          </div>
        </div>

        {/* Metric 2: ضریب تسویه نقدی */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-1.5 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span>ضریب تسویه نقدی</span>
            <Percent className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {toPersianDigits(cashConversionRate.toFixed(0))}٪
            </span>
            <span className="text-[10px] text-slate-400">نقد به کل فروش</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(5, cashConversionRate))}%` }} 
            />
          </div>
        </div>

        {/* Metric 3: حاشیه سود ناخالص بازرگانی */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-1.5 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span>بازده سود بازرگانی</span>
            <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div className="text-sm sm:text-base font-black text-teal-600 dark:text-teal-400 font-mono">
            +{toPersianDigits(averageMargin.toFixed(1))}٪
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            سود ناخالص: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatPrice(totalProfit)}</strong>
          </div>
        </div>

        {/* Metric 4: تراز خالص بازار (طلب - بدهی) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-1.5 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span>تراز خالص بازار</span>
            <Compass className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className={`text-sm sm:text-base font-black font-mono ${netMarketPosition >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatPrice(Math.abs(netMarketPosition))}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {netMarketPosition >= 0 ? 'مازاد طلب بر بدهی به تامین‌کننده' : 'مازاد بدهی به تامین‌کنندگان'}
          </div>
        </div>

        {/* Metric 5: خریداران فعال دوره */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-1.5 transition-colors hover:border-slate-300 dark:hover:border-slate-700 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold">
            <span>خریداران فعال دوره</span>
            <Users className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono">
            {toPersianDigits(activeBuyerCount)} طرف‌حساب
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            از مجموع {toPersianDigits(customers.length)} مشتری ثبت‌شده
          </div>
        </div>
      </div>

      {/* 2. COMPREHENSIVE STAT CARDS GRID - FLAT DESIGN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: سود خالص دوره */}
        {!isSecretMode ? (
          <div 
            onClick={() => onNavigateToTab('reports')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
            title="مشاهده گزارش‌های تحلیلی و سود دوره"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">سود ناخالص دوره</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {formatPrice(totalProfit)}
              </div>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-slate-400 font-medium">حاشیه بازدهی سود:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  +{toPersianDigits(averageMargin.toFixed(1))}٪
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => onNavigateToTab('customers')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
            title="مشاهده مشتریان و طرف‌حساب‌ها"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">طرف‌حساب‌ها و خریداران</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {toPersianDigits(new Set(invoices.map(i => i.customerName)).size)} طرف‌حساب فعال
              </div>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <span className="text-slate-400 font-medium">اسناد صادر شده:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                  {toPersianDigits(salesInvoices.length)} فقره فاکتور
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Card 2: مجموع فروش */}
        <div 
          onClick={() => onNavigateToTab('invoices', 'sale')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
          title="مشاهده فهرست فاکتورهای فروش"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">گردش فروش صادره</span>
            <div className={`w-8 h-8 rounded-lg ${currentTheme.primaryLight} ${currentTheme.primaryText} flex items-center justify-center shrink-0 border ${currentTheme.borderColor}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatPrice(totalSalesRevenue)}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-slate-400 font-medium">{toPersianDigits(salesInvoices.length)} فقره فاکتور</span>
              <span className="text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                نقدی: {toPersianDigits(cashSales.length)} / نسیه: {toPersianDigits(creditSales.length)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: خزانه‌داری و نقدینگی */}
        <div 
          onClick={() => onNavigateToTab('treasury')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
          title="مشاهده وضعیت حساب‌ها و گردش نقدینگی"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">خزانه‌داری و نقدینگی</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {formatPrice(treasuryNet >= 0 ? treasuryNet : 0)}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-slate-400 font-medium">{toPersianDigits(treasuryTransactions.length)} سند تراکنش</span>
              <span className="text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                واریز: {toPersianDigits(treasuryDeposits > 0 ? (treasuryDeposits / 1000000).toFixed(1) : '۰')} م
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: ارزش کل موجودی انبار */}
        <div 
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
          title="مشاهده مدیریت کالاها و انبارداری"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ارزش سرمایه انبار</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              <Boxes className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {!isSecretMode ? formatPrice(totalWarehouseCostValue) : formatPrice(totalWarehouseSalesValue)}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <span className="text-slate-400 font-medium">{toPersianDigits(products.length)} قلم کالا</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                {toPersianDigits(totalStockPieces.toLocaleString())} عدد
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Secondary Quick Stats Row (Returns, Receivables, Low Stock) - Flat */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Returns Summary Card */}
        <div 
          onClick={() => onNavigateToTab('returns')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 hover:border-rose-300 dark:hover:border-rose-800 transition-colors cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">مرجوعی‌های کالا</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {toPersianDigits(productReturns.length)} مورد ({formatPrice(totalReturnsValue)})
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Customer Receivables / Debt */}
        <div 
          onClick={() => onNavigateToTab('customers')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 hover:border-purple-300 dark:hover:border-purple-800 transition-colors cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">مطالبات باز مشتریان</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatPrice(totalCustomerReceivables || totalCreditAmount)}
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Low Stock Warning */}
        <div 
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 hover:border-amber-300 dark:hover:border-amber-800 transition-colors cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800 shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">اقلام کم‌موجودی انبار</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {toPersianDigits(lowStockProducts.length)} کالا نیازمند شارژ
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>

      {/* 2.2 SALES TARGET & BUSINESS HEALTH DIAGNOSTIC CENTER */}
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
                  سنجش هدف فروش دوره ({toPersianDigits(targetPercent)}٪ تحقق یافته)
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  پایش پیوسته روند گردش درآمدی در برابر تارگت تعیین‌شده ماهانه
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
                  <span>تغییر هدف ({formatPrice(monthlyTarget)})</span>
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
                {toPersianDigits(targetPercent)}٪ از هدف
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/80 dark:border-slate-700/60">
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
                <span className="text-slate-400 block text-[10px]">مبلغ مانده تا تحقق هدف:</span>
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
                <span className="text-slate-400 block text-[10px]">تارگت کل تعیین‌شده:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatPrice(monthlyTarget)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Financial Diagnostic & Health Index */}
        <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5 transition-colors">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Award className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  ارزیابی سلامت مالی و عملیاتی
                </h3>
                <p className="text-[10px] text-slate-400">شاخص‌های تلفیقی ریسک کسب‌وکار</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/80 dark:border-emerald-800/80">
              سطح مطلوب
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-bold">پوشش نقدینگی حاضر</span>
              </div>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatPrice(totalLiquidityNow)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-bold">کنترل ریسک اعتباری</span>
              </div>
              <span className="text-slate-600 dark:text-slate-300 font-bold">
                {toPersianDigits(creditSales.length)} فاکتور نسیه
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Boxes className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-bold">تنوع و سرمایه انبار</span>
              </div>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {toPersianDigits(products.length)} کالا
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* 2.3 EXECUTIVE HUB CONTROLS & SECTION TABS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded-lg ${currentTheme.badgeBg} ${currentTheme.primaryText} border ${currentTheme.borderColor}`}>
            <BarChart2 className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              دیده‌بان تحلیلی و عملیاتی بازرگانی
            </h2>
            <p className="text-[10px] text-slate-400">
              دسترسی سریع به عملکرد فروش کالاها، ریسک وصول مطالبات و گردش نقدینگی
            </p>
          </div>
        </div>

        {/* Segmented Filter Pills */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setExecutiveViewSection('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              executiveViewSection === 'all'
                ? `${currentTheme.primary} text-white shadow-xs`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            همه بخش‌ها
          </button>
          <button
            type="button"
            onClick={() => setExecutiveViewSection('performance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              executiveViewSection === 'performance'
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
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              executiveViewSection === 'risk_radar'
                ? `${currentTheme.primary} text-white shadow-xs`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-purple-500" />
            <span>رادار ریسک و مطالبات</span>
          </button>
          <button
            type="button"
            onClick={() => setExecutiveViewSection('liquidity_stream')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              executiveViewSection === 'liquidity_stream'
                ? `${currentTheme.primary} text-white shadow-xs`
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            <span>نبض نقدینگی و بانک</span>
          </button>
        </div>
      </div>

      {/* 2.4 TOP PERFORMING PRODUCTS & TOP TRADING PARTNERS */}
      {(executiveViewSection === 'all' || executiveViewSection === 'performance') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Products Card */}
          <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-none transition-colors">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Flame className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    پرفروش‌ترین و سودآورترین کالاها
                  </h3>
                  <p className="text-[10px] text-slate-400">بیشترین حجم فروش دوره جاری بر اساس قیمت فروش</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('inventory')}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                مشاهده انبار ←
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
                    className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                        {toPersianDigits(pIdx + 1)}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-[170px] sm:max-w-[240px]">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <span>حجم فروش:</span>
                          <strong className="text-slate-800 dark:text-slate-200 font-bold">
                            {item.cartons > 0 ? `${toPersianDigits(item.cartons)} کارتن` : ''}
                            {item.cartons > 0 && item.loose > 0 ? ' + ' : ''}
                            {item.loose > 0 || item.cartons === 0 ? `${toPersianDigits(item.loose)} دانه` : ''}
                          </strong>
                          <span className="text-slate-400">({toPersianDigits(item.totalQuantity)} عدد)</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm font-mono dir-ltr" title="مبلغ فروش رفته کالا بر اساس قیمت فروش">
                        {formatPrice(item.totalRevenue)}
                      </div>
                      <div className="text-[9.5px] text-slate-400 dir-rtl text-right">
                        مبلغ فروش رفته
                      </div>
                      {!isSecretMode && item.totalProfit > 0 && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono dir-ltr">
                          +{formatPrice(item.totalProfit)} سود خالص
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Trading Partners Card */}
          <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-none transition-colors">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    برترین خریداران و طرف‌حساب‌های تجاری
                  </h3>
                  <p className="text-[10px] text-slate-400">مشتریان با بالاترین گردش مالی دوره</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('customers')}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
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
                    className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                        {toPersianDigits(cIdx + 1)}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-[170px] sm:max-w-[220px]">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {c.city ? `${c.city} • ` : ''}{toPersianDigits(c.count)} فقره فاکتور
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm font-mono dir-ltr">
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

      {/* 2.5 LIVE LIQUIDITY & EXECUTIVE CASH SAFE */}
      {(executiveViewSection === 'all' || executiveViewSection === 'liquidity_stream') && (
        <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-none transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className={`p-1.5 rounded-lg ${currentTheme.primaryLight} ${currentTheme.primaryText} border ${currentTheme.borderColor}`}>
                <Banknote className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  نبض نقدینگی حاضر و سرمایه در گردش بازرگانی
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  تراز زنده موجودی وجوه نقد، سپرده‌های بانکی و تفکیک جریان ورودی/خروجی
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateToTab('liquidity')}
                className={`px-3 py-1.5 rounded-lg ${currentTheme.primaryLight} ${currentTheme.primaryText} border ${currentTheme.borderColor} text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>مدیریت خزانه‌داری ←</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Liquidity Metric 1: Cash Safe */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
                <span>موجودی صندوق نقد</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                {formatPrice(cashBalance)}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span>وجوه فیزیکی حاضر</span>
                <span className="text-slate-600 dark:text-slate-300 font-bold">صندوق اصلی</span>
              </div>
            </div>

            {/* Liquidity Metric 2: Bank Accounts */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
                <span>موجودی حساب‌های بانکی</span>
                <CreditCard className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
                {formatPrice(bankBalance)}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span>کارت‌ها و پوز بانکی</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold font-mono dir-ltr">{settings.bankName?.split('-')[0]?.trim() || 'بانکی'}</span>
              </div>
            </div>

            {/* Liquidity Metric 3: Total Liquid Funds */}
            <div className={`p-3.5 rounded-xl ${currentTheme.badgeBg} border ${currentTheme.borderColor} space-y-1.5`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={currentTheme.primaryText}>مجموع نقدینگی آنی (صندوق + بانک)</span>
                <Zap className={`w-3.5 h-3.5 ${currentTheme.primaryText}`} />
              </div>
              <div className={`text-base sm:text-lg font-black ${currentTheme.primaryText} font-mono`}>
                {formatPrice(totalLiquidityNow)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span>توان پرداخت نقدی بدون نسیه</span>
                <span className="font-bold">۱۰۰٪ آماده</span>
              </div>
            </div>

            {/* Liquidity Metric 4: Market Receivables */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
                <span>طلب تسویه نشده از خریداران</span>
                <Users className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300 font-mono">
                {formatPrice(totalCustomerReceivables || totalCreditAmount)}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span>تعداد فاکتورهای نسیه:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{toPersianDigits(creditSales.length)} سند</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2.6 EXECUTIVE DUAL RADAR: OVERDUE DEBTORS RADAR & DEAD STOCK RADAR */}
      {(executiveViewSection === 'all' || executiveViewSection === 'risk_radar') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Radar 1: Overdue Debtors & Receivables Risk Radar */}
          <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-none transition-colors">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    رادار وصول مطالبات و بدهکاران بازار
                  </h3>
                  <p className="text-[10px] text-slate-400">مشتریان با بالاترین مانده بدهی باز نیازمند پیگیری</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('customers')}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                دفتر مشتریان ←
              </button>
            </div>

            {topDebtors.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                هیچ مانده بدهی بازی در حساب مشتریان وجود ندارد.
              </div>
            ) : (
              <div className="space-y-2">
                {topDebtors.map((d, dIdx) => (
                  <div
                    key={`debtor-${d.customer.id || dIdx}`}
                    className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                        {toPersianDigits(dIdx + 1)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[150px] sm:max-w-[200px]">
                          {d.customer.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                          {d.customer.city && <span>{d.customer.city}</span>}
                          {d.lastDate && <span>• آخرین سند: {toPersianDigits(d.lastDate)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-left">
                        <div className="font-black text-purple-700 dark:text-purple-300 text-xs font-mono">
                          {formatPrice(d.balance)}
                        </div>
                        <span className={`text-[9.5px] font-bold ${d.riskLevel === 'high' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {d.riskLevel === 'high' ? 'پیگیری فوری' : 'بدهی جاری'}
                        </span>
                      </div>

                      {d.customer.phone && (
                        <button
                          onClick={() => handleCopyPhone(d.customer.phone, d.customer.id)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          title={`کپی شماره: ${d.customer.phone}`}
                        >
                          {copiedPhoneId === d.customer.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Phone className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Radar 2: Dead Stock & Capital Trapped Radar */}
          <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-none transition-colors">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <Package className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    دیده‌بان کالاهای راکد و خواب سرمایه
                  </h3>
                  <p className="text-[10px] text-slate-400">اقلام موجود با صفر فروش در دوره جاری ({formatPrice(totalDeadStockCapital)} سرمایه راکد)</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('inventory')}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                کاردکس کالاها ←
              </button>
            </div>

            {deadStockProducts.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-bold bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                گردش انبار عالی است و هیچ کالای خوابیده‌ای در این دوره یافت نشد.
              </div>
            ) : (
              <div className="space-y-2">
                {deadStockProducts.map((item, dsIdx) => (
                  <div
                    key={`dead-stock-${item.product.id || dsIdx}`}
                    className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                        {toPersianDigits(dsIdx + 1)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[150px] sm:max-w-[200px]">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          موجودی انبار: <strong className="text-slate-700 dark:text-slate-300">{toPersianDigits(item.cartons)} کارتن</strong> ({toPersianDigits(item.product.stockPieces)} عدد)
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="font-black text-amber-700 dark:text-amber-400 text-xs font-mono">
                        {formatPrice(item.tiedUpCapital)}
                      </div>
                      <span className="text-[9.5px] text-slate-400 font-medium">
                        ارزش سرمایه خوابیده
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2.7 LIVE TREASURY ACTIVITY & SETTLEMENTS STREAM */}
      {(executiveViewSection === 'all' || executiveViewSection === 'liquidity_stream') && recentTreasury.length > 0 && (
        <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-none transition-colors">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${currentTheme.badgeBg} ${currentTheme.primaryText} border ${currentTheme.borderColor}`}>
                <Wallet className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  آخرین گردش وجوه و اسناد خزانه‌داری
                </h3>
                <p className="text-[10px] text-slate-400">تراکنش‌های واریز و پرداخت صندوق و بانک</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab('liquidity')}
              className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              دفتر خزانه‌داری ←
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {recentTreasury.map((tr, tIdx) => {
              const isDeposit = tr.type === 'deposit';
              return (
                <div
                  key={`tr-rec-${tr.id || tIdx}`}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                      isDeposit 
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    }`}>
                      {isDeposit ? 'واریز به حساب' : 'هزینه / برداشت'}
                    </span>
                    <span className="font-mono text-slate-400 text-[10px]">{toPersianDigits(tr.date)}</span>
                  </div>

                  <div className="font-black text-slate-900 dark:text-white text-xs font-mono">
                    {isDeposit ? '+' : '-'}{formatPrice(tr.amount)}
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <span>{tr.description || 'تراکنش خزانه‌داری'}</span>
                    <span className="font-bold text-slate-600 dark:text-slate-300">
                      {tr.source === 'bank' ? 'بانک' : 'صندوق'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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

      {/* 3. EXECUTIVE COMPREHENSIVE TRANSACTIONS & INVOICES TABLE (مستقیماً زیر نمودار تحلیل و آمار پیشرفته) */}
      <div 
        className="bg-white dark:bg-[#090d16] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-none overflow-hidden transition-colors"
      >
        {/* Table Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${currentTheme.primaryLight} ${currentTheme.primaryText} border ${currentTheme.borderColor}`}>
                <Receipt className="w-4 h-4" />
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                دفتر اسناد و فهرست ریز فاکتورهای بازرگانی
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-300/60 dark:border-slate-700/60">
                {toPersianDigits(filteredTableInvoices.length)} سند
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              مشاهده وضعیت کلیه فاکتورهای فروش، خرید، تسویه‌ها و حاشیه سود لحظه‌ای در صفحه اصلی داشبورد
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو در فاکتور، مشتری، کالا..."
                value={tableSearchQuery}
                onChange={(e) => {
                  setTableSearchQuery(e.target.value);
                  setTableCurrentPage(1);
                }}
                className="w-full pr-8 pl-7 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors shadow-none"
              />
              {tableSearchQuery && (
                <button
                  onClick={() => setTableSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <button
                onClick={() => { setTableFilterType('all'); setTableCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'all'
                    ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white shadow-xs font-black`
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                همه ({toPersianDigits(finalInvoices.length)})
              </button>
              <button
                onClick={() => { setTableFilterType('sale'); setTableCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'sale'
                    ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white shadow-xs font-black`
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                فروش ({toPersianDigits(salesInvoices.length)})
              </button>
              <button
                onClick={() => { setTableFilterType('purchase'); setTableCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'purchase'
                    ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white shadow-xs font-black`
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                خرید / ورود
              </button>
              <button
                onClick={() => { setTableFilterType('credit'); setTableCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'credit'
                    ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white shadow-xs font-black`
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                نسیه ({toPersianDigits(creditSales.length)})
              </button>
              <button
                onClick={() => { setTableFilterType('cash'); setTableCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'cash'
                    ? `${currentTheme.primary} ${currentTheme.primaryHover} text-white shadow-xs font-black`
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                نقدی / بانکی
              </button>
            </div>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold select-none">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>

                <SortableTableHeader
                  field="invoiceNumber"
                  currentField={dashSortField}
                  currentDirection={dashSortDirection}
                  onSort={handleDashSort}
                  className="py-2.5 px-3 w-24"
                >
                  شماره سند
                </SortableTableHeader>

                <SortableTableHeader
                  field="date"
                  currentField={dashSortField}
                  currentDirection={dashSortDirection}
                  onSort={handleDashSort}
                  className="py-2.5 px-3 w-28"
                >
                  تاریخ سند
                </SortableTableHeader>

                <SortableTableHeader
                  field="customer"
                  currentField={dashSortField}
                  currentDirection={dashSortDirection}
                  onSort={handleDashSort}
                  className="py-2.5 px-3"
                >
                  طرف‌حساب
                </SortableTableHeader>

                <th className="py-2.5 px-3">نوع سند</th>

                <SortableTableHeader
                  field="amount"
                  currentField={dashSortField}
                  currentDirection={dashSortDirection}
                  onSort={handleDashSort}
                  align="left"
                  className="py-2.5 px-3 w-32"
                >
                  مبلغ کل فاکتور
                </SortableTableHeader>

                <th className="py-2.5 px-3 text-left w-28">سود فاکتور</th>
                <th className="py-2.5 px-3 text-center w-24">وضعیت تسویه</th>
                <th className="py-2.5 px-3 text-center w-24">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {paginatedTableInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
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
                    const prod = products.find(p => p.id === it.productId || p.name === it.productName);
                    const uCost = (it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0)
                      ? it.unitPurchasePrice
                      : ((prod?.purchasePrice && prod.purchasePrice > 0) ? prod.purchasePrice : (it.unitPrice || 0));
                    return s + (it.totalPieces * uCost);
                  }, 0);

                  const invoiceDisplayAmount = isSale 
                    ? inv.finalAmount 
                    : ((inv.finalAmount && inv.finalAmount > 0) ? inv.finalAmount : ((inv.subtotal || invoiceCost || 0) + totalExpenses));

                  const invoiceProfit = isSale ? inv.finalAmount - invoiceCost : 0;
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
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{toPersianDigits(absIdx)}</td>
                      <td className="py-2.5 px-3 font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap text-xs">
                        #{toPersianDigits(inv.invoiceNumber)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap text-[11px]">
                        {toPersianDigits(inv.date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[200px]">{inv.customerName}</span>
                          {isInvHighlighted && (
                            <RowUpdateBadge label="سند ذخیره شد" />
                          )}
                        </div>
                        {(inv.customerCity || inv.customerPhone) && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                            {inv.customerCity} {inv.customerPhone ? `• ${toPersianDigits(inv.customerPhone)}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isSale ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 font-bold text-[10px]">
                            فروش
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/40 font-bold text-[10px]">
                            خرید / ورود
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-left dir-ltr whitespace-nowrap">
                        <div className="font-black text-slate-900 dark:text-white text-xs">
                          {formatPrice(invoiceDisplayAmount)}
                        </div>
                        {!isSale && totalExpenses > 0 && (
                          <div className="text-[9.5px] text-teal-600 dark:text-teal-400 font-bold dir-rtl text-right">
                            (+{formatPrice(totalExpenses)} کرایه)
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-left dir-ltr whitespace-nowrap text-xs">
                        {isSale && !isSecretMode ? (
                          <span className={`font-bold ${invoiceProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                            {invoiceProfit >= 0 ? '+' : ''}{formatPrice(invoiceProfit)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {isCredit ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-bold text-[10px]">
                            نسیه
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-bold text-[10px]">
                            نقدی
                          </span>
                        )}
                      </td>
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

      {/* 4. MAIN OPERATIONAL & ANALYTICS DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Columns: Category Distribution & Performance */}
        <div className="lg:col-span-2 space-y-5">
          {/* Category Distribution Meters */}
          <div 
            className="bg-white dark:bg-[#090d16] rounded-xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4 shadow-none transition-colors"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${currentTheme.primaryLight} ${currentTheme.primaryText} border ${currentTheme.borderColor}`}>
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">دسته‌بندی و ارزش تنوع انبار</h3>
                  <p className="text-xs text-slate-400 mt-0.5">سهم ریالی هر دسته از کل سرمایه موجود در انبار</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                {toPersianDigits(categories.length)} گروه کالایی
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map(([catName, data], cIdx) => {
                const percentage = totalWarehouseSalesValue > 0 ? (data.value / totalWarehouseSalesValue) * 100 : 0;
                return (
                  <div key={`dash-cat-${catName || 'uncat'}-${cIdx}`} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">{catName}</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
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
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>ارزش: {formatPrice(data.value)}</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{toPersianDigits(percentage.toFixed(0))}٪</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Low Stock Alerts, Bank Card & Activity Logs */}
        <div className="space-y-4">
          
          {/* Low Stock Alerts */}
          <div 
            className="bg-white dark:bg-[#090d16] rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 space-y-3 shadow-none transition-colors"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">هشدار موجودی بحرانی انبار</h3>
              </div>
              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded text-[10px] font-bold">
                {toPersianDigits(lowStockProducts.length)} کالا
              </span>
            </div>

            {lowStockProducts.length === 0 ? (
              <div className="py-4 text-center text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                موجودی انبار در وضعیت مطلوب است.
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 5).map((prod, pIdx) => {
                  const cartons = prod.piecesPerCarton > 0 ? Math.floor(prod.stockPieces / prod.piecesPerCarton) : 0;
                  const loose = prod.piecesPerCarton > 0 ? prod.stockPieces % prod.piecesPerCarton : prod.stockPieces;
                  return (
                    <div 
                      key={`low-stock-${prod.id || pIdx}-${pIdx}`} 
                      className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{prod.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          دسته: {prod.category}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded font-bold text-xs block">
                          {toPersianDigits(cartons)} کارتن {loose > 0 ? `+ ${toPersianDigits(loose)}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => onNavigateToTab('inventory')}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition-colors text-center block cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              مدیریت موجودی و ورود کالا
            </button>
          </div>

          {/* Bank Card Widget */}
          <div 
            className="bg-white dark:bg-[#090d16] text-slate-900 dark:text-white rounded-xl p-4 space-y-3 border border-slate-200/90 dark:border-slate-800 shadow-none transition-colors"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span className="font-bold text-xs text-slate-900 dark:text-white">حساب بانکی و تسویه</span>
              </div>
              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-md text-[10px] font-bold">
                {settings.bankName?.split('-')[0]?.trim() || 'بانک ملت'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">صاحب حساب:</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">
                {settings.bankName?.split('-')[1]?.trim() || 'مدیریت بازرگانی'}
              </span>
            </div>

            {/* Card Number */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">شماره کارت جهت تسویه:</span>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-slate-900 dark:text-white dir-ltr">
                  {toPersianDigits(settings.cardNumber)}
                </span>
                <button
                  onClick={handleCopyCard}
                  className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="کپی کارت"
                >
                  {copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* IBAN */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">شماره شبا (IBAN):</span>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
                <span className="font-mono text-slate-800 dark:text-slate-200 font-bold dir-ltr truncate max-w-[180px]">
                  {settings.iban}
                </span>
                <button
                  onClick={handleCopyIban}
                  className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="کپی شبا"
                >
                  {copiedIban ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
              📍 {settings.address}
            </div>
          </div>

          {/* Recent Activity & Notification Widget */}
          {activityLogs && activityLogs.length > 0 && (
            <div 
              className="bg-white dark:bg-[#090d16] rounded-xl border border-slate-200/90 dark:border-slate-800 p-4 space-y-3 shadow-none transition-colors"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">رویدادها و اعلان‌های اخیر</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  {toPersianDigits(activityLogs.length)} رویداد
                </span>
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-0.5 custom-scrollbar">
                {activityLogs.slice(0, 6).map((log, lIdx) => {
                  const isWarning = log.type === 'warning';
                  return (
                    <div
                      key={`activity-log-${log.id || lIdx}-${lIdx}`}
                      onClick={() => {
                        if (log.tabTarget) {
                          onNavigateToTab(log.tabTarget);
                        }
                      }}
                      className={`p-2.5 rounded-xl transition-colors flex items-start gap-2.5 text-xs ${
                        isWarning
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50'
                          : 'bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      } ${log.tabTarget ? 'cursor-pointer' : ''}`}
                    >
                      <div className={`p-1 rounded-lg shrink-0 mt-0.5 ${
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
                        <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                          isWarning ? 'text-rose-600 dark:text-rose-300 font-medium' : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          {log.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
