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
import { calculateTotalMarketReceivables } from '../utils/customerBalanceCalculations';
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
  BarChart3
} from 'lucide-react';
import { AppTab } from './HeaderNav';
import { DashboardCharts } from './DashboardCharts';
import { themes, ThemeColor } from './ThemeConfig';
import { Pagination } from './Pagination';

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
  onNewInvoice: () => void;
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
  onNewInvoice,
}) => {
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
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
      const prod = products.find(p => p.id === it.productId || p.name === it.productName);
      const uCost = (prod?.purchasePrice && prod.purchasePrice > 0)
        ? prod.purchasePrice
        : (it.unitPurchasePrice || 0);
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
  const [tableItemsPerPage, setTableItemsPerPage] = useState(10);

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

  const tableTotalPages = Math.ceil(filteredTableInvoices.length / tableItemsPerPage) || 1;
  const paginatedTableInvoices = filteredTableInvoices.slice(
    (tableCurrentPage - 1) * tableItemsPerPage,
    tableCurrentPage * tableItemsPerPage
  );

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
      
      {/* 1. EXECUTIVE HERO BANNER - THEME-HARMONIZED FOR DAY & NIGHT */}
      <motion.div 
        initial={{ opacity: 0, y: -10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 border ${heroStyle.borderColor} ${heroStyle.containerBg} ${heroStyle.gradientOverlay} ${heroStyle.glowShadow} transition-all duration-500`}
      >
        {/* Animated Ambient Backlight Elements - Subtle watercolor sheen in light mode & atmospheric glow in dark mode */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 15, 0],
            y: [0, -10, 0],
            opacity: [0.08, 0.16, 0.08]
          }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-24 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none dark:opacity-30" 
          style={{ backgroundColor: heroStyle.orbHex1 }}
        />
        <motion.div 
          animate={{ 
            scale: [1.1, 0.95, 1.1],
            x: [0, -20, 0],
            y: [0, 15, 0],
            opacity: [0.06, 0.14, 0.06]
          }}
          transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-24 -right-20 w-80 h-80 rounded-full blur-3xl pointer-events-none dark:opacity-25" 
          style={{ backgroundColor: heroStyle.orbHex2 }}
        />

        {/* Subtle Geometric Grid Background */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1.5px 1.5px, currentColor 1.2px, transparent 0)`,
            backgroundSize: '28px 28px'
          }}
        />

        <div className="relative z-10 space-y-6">
          {/* Top Row: Live Status Badges & Quick Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Online Live Status */}
              <span className="inline-flex items-center gap-2 text-[11px] font-black px-3.5 py-1.5 rounded-full border shadow-2xs transition-colors bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>سامانه هوشمند مالی و بازرگانی</span>
              </span>

              {/* Date & Time Capsule */}
              <span className="inline-flex items-center gap-2 text-[11px] font-bold px-3.5 py-1.5 rounded-full border shadow-2xs transition-colors bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                <Calendar className={`w-3.5 h-3.5 ${heroStyle.iconColor}`} />
                <span>{getCurrentPersianDate()}</span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <Clock className={`w-3.5 h-3.5 ${heroStyle.iconColor}`} />
                <span className="font-mono font-bold">{getCurrentPersianTime()}</span>
              </span>

              {/* Security/Backup Badge */}
              <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>پایگاه داده پایدار و امن</span>
              </span>
            </div>

            {/* Store Name Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`text-[11px] font-black px-3 py-1 rounded-xl border ${heroStyle.accentPillBg} flex items-center gap-1.5 shadow-2xs`}>
                <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                <span>{settings.storeNameFa || 'فروشگاه بازرگانی'}</span>
              </span>
            </div>
          </div>

          {/* Middle Row: Title, Subtitle, & Quick Interactive Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug flex items-center gap-3 flex-wrap text-slate-900 dark:text-white">
                <span>
                  مرکز مدیریت و ارزیابی مالی هوشمند
                </span>
                <motion.div 
                  whileHover={{ rotate: 15, scale: 1.12 }}
                  className="inline-flex items-center justify-center p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/90 shadow-2xs cursor-pointer"
                >
                  <Zap className={`w-4 h-4 ${heroStyle.iconColor} animate-pulse`} />
                </motion.div>
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                نظارت یکپارچه بر جریان نقدینگی، سودآوری خالص، موجودی کالای انبار، اسناد فاکتور و تراز حساب مشتریان در پالت تم انتخابی شما.
              </p>
            </div>

            {/* Action Buttons Cluster */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                id="hero-create-invoice-btn"
                onClick={onNewInvoice}
                className={`px-5 py-3 rounded-2xl ${heroStyle.primaryBtn} ${heroStyle.primaryBtnHover} ${heroStyle.primaryBtnText} font-black text-xs transition-all cursor-pointer flex items-center gap-2 ${heroStyle.primaryBtnShadow}`}
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>صدور فاکتور جدید +</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateToTab('inventory')}
                className="px-3.5 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
              >
                <Layers className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>مدیریت انبار</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateToTab('customers')}
                className="px-3.5 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
              >
                <Users className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <span>مشتریان</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateToTab('liquidity')}
                className="px-3.5 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
              >
                <Wallet className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>خزانه‌داری</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigateToTab('returns')}
                className="px-3.5 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
              >
                <RotateCcw className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>مرجوعی ({toPersianDigits(productReturns.length)})</span>
              </motion.button>
            </div>
          </div>

          {/* Bottom Interactive Mini-Insights Strip */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">فروش کل دوره</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">{formatPrice(totalSalesRevenue)}</span>
              </div>
              <div className={`p-2 rounded-xl ${currentTheme.primaryLight} ${currentTheme.primaryText} border ${currentTheme.borderColor} shrink-0`}>
                <DollarSign className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">فاکتورهای نهایی</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">{toPersianDigits(salesInvoices.length)} سند صادرشده</span>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">ارزش ریالی انبار</span>
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">{formatPrice(totalWarehouseSalesValue)}</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                <Package className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800/80 shadow-2xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold block">تراز نقدی و بانک</span>
                <span className={`text-xs sm:text-sm font-black font-mono ${treasuryNet >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  {formatPrice(treasuryNet)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 1.5 PERIOD FILTER SELECTOR - FLAT BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 w-full">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 shrink-0">
          <Filter className={`w-4 h-4 ${currentTheme.primaryText}`} />
          <span>بازه زمانی تحلیل داده‌های داشبورد:</span>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto max-w-full">
          {(['today', 'week', 'month', '3months', '6months', '1year', 'all'] as const).map((periodKey) => {
            const labels: Record<string, string> = {
              today: 'امروز',
              week: 'هفتگی (۷ روزه)',
              month: '۳۰ روزه (ماهیانه)',
              '3months': '۳ ماهه',
              '6months': '۶ ماهه',
              '1year': '۱ ساله',
              all: 'کل دوره'
            };
            const isActive = timePeriod === periodKey;
            return (
              <button
                key={periodKey}
                type="button"
                onClick={() => handleSelectTimePeriod(periodKey)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {labels[periodKey]}
              </button>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>پردازش زنده آمار و اطلاعات</span>
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

      {/* 2.5 INTERACTIVE CHARTS & ANALYTICS SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <DashboardCharts
          invoices={filteredInvoices}
          products={products}
          themeHex={currentTheme.hex}
          isSecretMode={isSecretMode}
        />
      </motion.div>

      {/* 3. EXECUTIVE COMPREHENSIVE TRANSACTIONS & INVOICES TABLE (مستقیماً زیر نمودار تحلیل و آمار پیشرفته) */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-all hover:shadow-md"
      >
        {/* Table Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/60 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl ${currentTheme.primaryLight} ${currentTheme.primaryText} border ${currentTheme.borderColor} shadow-2xs`}>
                <Receipt className="w-4 h-4" />
              </span>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                دفتر اسناد و فهرست ریز فاکتورهای بازرگانی
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black border border-slate-300/60 dark:border-slate-700/60">
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
                className="w-full pr-8 pl-7 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all shadow-2xs"
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
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs">
              <button
                onClick={() => { setTableFilterType('all'); setTableCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                همه ({toPersianDigits(finalInvoices.length)})
              </button>
              <button
                onClick={() => { setTableFilterType('sale'); setTableCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'sale'
                    ? `${currentTheme.primary} text-white shadow-xs`
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                فروش ({toPersianDigits(salesInvoices.length)})
              </button>
              <button
                onClick={() => { setTableFilterType('purchase'); setTableCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'purchase'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                خرید / ورود
              </button>
              <button
                onClick={() => { setTableFilterType('credit'); setTableCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'credit'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                نسیه ({toPersianDigits(creditSales.length)})
              </button>
              <button
                onClick={() => { setTableFilterType('cash'); setTableCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  tableFilterType === 'cash'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
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
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold">
              <tr>
                <th className="p-3.5 w-12 text-center">#</th>
                <th className="p-3.5 w-28">شماره سند</th>
                <th className="p-3.5 w-28">تاریخ و ساعت</th>
                <th className="p-3.5">طرف‌حساب (مشتری / طرف معامله)</th>
                <th className="p-3.5">نوع سند</th>
                <th className="p-3.5">اقلام و شرح کالا</th>
                <th className="p-3.5 text-left w-36">مبلغ کل فاکتور</th>
                <th className="p-3.5 text-left w-32">سود ناخالص</th>
                <th className="p-3.5 text-center w-28">وضعیت تسویه</th>
                <th className="p-3.5 text-center w-24">مشاهده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {paginatedTableInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-400 font-bold">
                    هیچ سندی مطابق با فیلترها و جستجوی شما یافت نشد.
                  </td>
                </tr>
              ) : (
                paginatedTableInvoices.map((inv, idx) => {
                  const absIdx = (tableCurrentPage - 1) * tableItemsPerPage + idx + 1;
                  const isSale = inv.type === 'sale';
                  const isCredit = inv.paymentStatus === 'credit' || inv.paymentMethod?.includes('نسیه');
                  const invoiceCost = inv.items.reduce((s, it) => {
                    const prod = products.find(p => p.id === it.productId || p.name === it.productName);
                    const uCost = (prod?.purchasePrice && prod.purchasePrice > 0)
                      ? prod.purchasePrice
                      : (it.unitPurchasePrice || 0);
                    return s + (it.totalPieces * uCost);
                  }, 0);
                  const invoiceProfit = isSale ? inv.finalAmount - invoiceCost : 0;
                  const itemsSummary = inv.items.map(it => `${it.productName} (${toPersianDigits(it.totalPieces)} عدد)`).slice(0, 2).join('، ');
                  const remainingItemsCount = inv.items.length > 2 ? inv.items.length - 2 : 0;

                  return (
                    <tr key={`dash-inv-${inv.id || idx}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 text-center text-slate-400 font-mono">{toPersianDigits(absIdx)}</td>
                      <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        #{toPersianDigits(inv.invoiceNumber)}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                        {toPersianDigits(inv.date)}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{inv.customerName}</div>
                        {(inv.customerCity || inv.customerPhone) && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {inv.customerCity} {inv.customerPhone ? `• ${toPersianDigits(inv.customerPhone)}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {isSale ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 font-bold text-[11px]">
                            فروش کالا
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/40 font-bold text-[11px]">
                            ورود و خرید
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs">
                        <div className="truncate font-medium">{itemsSummary || 'بدون قلم'}</div>
                        {remainingItemsCount > 0 && (
                          <span className={`text-[10px] font-bold ${currentTheme.primaryText}`}>
                            + {toPersianDigits(remainingItemsCount)} قلم دیگر
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-left dir-ltr font-black text-slate-900 dark:text-white whitespace-nowrap">
                        {formatPrice(isSale ? inv.finalAmount : (invoiceCost || inv.finalAmount))}
                      </td>
                      <td className="p-3.5 text-left dir-ltr whitespace-nowrap">
                        {isSale && !isSecretMode ? (
                          <span className={`font-bold ${invoiceProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                            {invoiceProfit >= 0 ? '+' : ''}{formatPrice(invoiceProfit)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        {isCredit ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-black text-[10px]">
                            حساب نسیه
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-black text-[10px]">
                            تسویه نقدی
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className={`inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 ${currentTheme.accentHoverBg} text-slate-600 dark:text-slate-300 ${currentTheme.activeText} transition-colors cursor-pointer border border-slate-200 dark:border-slate-700`}
                          title="مشاهده فاکتور"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
          itemsPerPageOptions={[10, 20, 50, 100]}
          itemName="سند"
          themeColor={settings.themeColor}
        />
      </motion.div>

      {/* 4. MAIN OPERATIONAL & ANALYTICS DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Columns: Category Distribution & Performance */}
        <div className="lg:col-span-2 space-y-5">
          {/* Category Distribution Meters */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xs hover:shadow-md transition-all"
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
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {toPersianDigits(categories.length)} گروه کالایی
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map(([catName, data], cIdx) => {
                const percentage = totalWarehouseSalesValue > 0 ? (data.value / totalWarehouseSalesValue) * 100 : 0;
                return (
                  <div key={`dash-cat-${catName || 'uncat'}-${cIdx}`} className={`p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 ${currentTheme.accentHoverBorder} transition-colors`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">{catName}</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {toPersianDigits(data.count)} کالا ({toPersianDigits(data.stockCartons)} کارتن)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, Math.max(8, percentage))}%`,
                          backgroundColor: currentTheme.hex
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>ارزش: {formatPrice(data.value)}</span>
                      <span className={`font-bold ${currentTheme.primaryText}`}>{toPersianDigits(percentage.toFixed(0))}٪</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right 1 Column: Low Stock Alerts, Bank Card & Activity Logs */}
        <div className="space-y-5">
          
          {/* Low Stock Alerts */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xs hover:shadow-md transition-all"
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
              <div className="py-4 text-center text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
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
                      className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs hover:border-amber-300 transition-colors"
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
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors text-center block cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              مدیریت موجودی و ورود کالا
            </button>
          </motion.div>

          {/* Bank Card Widget */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-4 space-y-3 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all"
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
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-mono text-xs sm:text-sm font-bold tracking-wider text-slate-900 dark:text-white dir-ltr">
                  {toPersianDigits(settings.cardNumber)}
                </span>
                <button
                  onClick={handleCopyCard}
                  className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="کپی کارت"
                >
                  {copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* IBAN */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">شماره شبا (IBAN):</span>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
                <span className="font-mono text-amber-700 dark:text-amber-300 font-bold dir-ltr truncate max-w-[180px]">
                  {settings.iban}
                </span>
                <button
                  onClick={handleCopyIban}
                  className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="کپی شبا"
                >
                  {copiedIban ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
              📍 {settings.address}
            </div>
          </motion.div>

          {/* Recent Activity & Notification Widget */}
          {activityLogs && activityLogs.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xs hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">رویدادها و اعلان‌های اخیر</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
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
            </motion.div>
          )}

        </div>

      </div>
    </div>
  );
};
