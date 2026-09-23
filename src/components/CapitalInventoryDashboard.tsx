import React, { useState, useMemo } from 'react';
import { Product, Invoice, Customer, CustomerPayment, ProductReturn, TreasuryTransaction, StoreSettings } from '../types';
import { 
  formatPrice, 
  toPersianDigits 
} from '../utils/formatters';
import { calculateCustomerLiveBalance } from '../utils/customerBalanceCalculations';
import { 
  ShoppingBag, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  Coins, 
  CreditCard, 
  FileText, 
  Boxes, 
  ChevronLeft, 
  BarChart3, 
  DollarSign, 
  SlidersHorizontal,
  Calculator,
  Target,
  Flame,
  Search,
  Filter,
  Package,
  Layers,
  Zap,
  RotateCcw,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Pagination } from './Pagination';
import { LiquidityBreakdownType, LiquidityInlineBreakdown } from './LiquidityInlineBreakdown';

interface CapitalInventoryDashboardProps {
  products: Product[];
  invoices: Invoice[];
  customers: Customer[];
  relationalPayments: CustomerPayment[];
  relationalReturns: ProductReturn[];
  treasuryTransactions: TreasuryTransaction[];
  settings: StoreSettings;
  theme: any;
  totalLiquidity: number;
  netCashBalance: number;
  netBankBalance: number;
  netChecksBalance: number;
  totalCurrentNetAssets: number;
  remainingStockPurchaseCost: number;
  remainingStockSellingValue: number;
  potentialStockProfit: number;
  totalMarketCreditReceivables: number;
  totalCustomerPaymentsInflow: number;
  totalCapitalInjected: number;
  totalCustomerReturnsValue: number;
  totalSupplierReturnsValue: number;
  totalOperatingExpenses: number;
  refundedReturnsFromCustomerCash: number;
  refundedReturnsFromCustomerBank: number;
  refundedReturnsToSupplierCash: number;
  refundedReturnsToSupplierBank: number;
  selectedBreakdownType: LiquidityBreakdownType | null;
  onSelectBreakdownType: (type: LiquidityBreakdownType | null) => void;
}

export const CapitalInventoryDashboard: React.FC<CapitalInventoryDashboardProps> = ({
  products,
  invoices,
  customers,
  relationalPayments,
  relationalReturns,
  treasuryTransactions,
  settings,
  theme,
  totalLiquidity,
  netCashBalance,
  netBankBalance,
  netChecksBalance,
  totalCurrentNetAssets,
  remainingStockPurchaseCost,
  remainingStockSellingValue,
  potentialStockProfit,
  totalMarketCreditReceivables,
  totalCustomerPaymentsInflow,
  totalCapitalInjected,
  totalCustomerReturnsValue,
  totalSupplierReturnsValue,
  totalOperatingExpenses,
  refundedReturnsFromCustomerCash,
  refundedReturnsFromCustomerBank,
  refundedReturnsToSupplierCash,
  refundedReturnsToSupplierBank,
  selectedBreakdownType,
  onSelectBreakdownType
}) => {
  // Chart and View state
  const [chartViewMode, setChartViewMode] = useState<'donut' | 'bar'>('donut');
  
  // Interactive Simulator state
  const [simulatedStockSalePct, setSimulatedStockSalePct] = useState<number>(30);
  const [simulatedReceivablesCollectPct, setSimulatedReceivablesCollectPct] = useState<number>(50);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(true);

  // Leaderboard state
  const [leaderboardSort, setLeaderboardSort] = useState<'value' | 'profit' | 'margin' | 'stock'>('value');
  const [leaderboardCategory, setLeaderboardCategory] = useState<string>('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState<string>('');
  const [leaderboardPage, setLeaderboardPage] = useState<number>(1);
  const [leaderboardPerPage, setLeaderboardPerPage] = useState<number>(6);

  // Compute enriched inventory products
  const enrichedProducts = useMemo(() => {
    return products.map(p => {
      const stock = Number(p.stockPieces) || 0;
      const buyPrice = Number(p.purchasePrice) || 0;
      const sellPrice = Number(p.sellingPrice) || 0;
      const totalBuy = stock * buyPrice;
      const totalSell = stock * sellPrice;
      const profit = Math.max(0, totalSell - totalBuy);
      const margin = totalSell > 0 ? (profit / totalSell) * 100 : 0;
      const shareOfTotalStock = remainingStockPurchaseCost > 0 ? (totalBuy / remainingStockPurchaseCost) * 100 : 0;

      return {
        ...p,
        stock,
        buyPrice,
        sellPrice,
        totalBuy,
        totalSell,
        profit,
        margin,
        shareOfTotalStock
      };
    });
  }, [products, remainingStockPurchaseCost]);

  // Categories extraction
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category?.trim()) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [products]);

  // Filtered & Sorted Leaderboard
  const filteredLeaderboard = useMemo(() => {
    let list = enrichedProducts;
    if (leaderboardCategory !== 'all') {
      list = list.filter(p => (p.category || 'بدون دسته‌بندی') === leaderboardCategory);
    }
    if (leaderboardSearch.trim()) {
      const term = leaderboardSearch.trim().toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(term) || 
        (p.category && p.category.toLowerCase().includes(term))
      );
    }
    return list;
  }, [enrichedProducts, leaderboardCategory, leaderboardSearch]);

  const sortedLeaderboard = useMemo(() => {
    return [...filteredLeaderboard].sort((a, b) => {
      if (leaderboardSort === 'value') return b.totalBuy - a.totalBuy;
      if (leaderboardSort === 'profit') return b.profit - a.profit;
      if (leaderboardSort === 'margin') return b.margin - a.margin;
      if (leaderboardSort === 'stock') return b.stock - a.stock;
      return 0;
    });
  }, [filteredLeaderboard, leaderboardSort]);

  const totalLeaderboardPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedLeaderboard.length / (leaderboardPerPage || 6)));
  }, [sortedLeaderboard.length, leaderboardPerPage]);

  const paginatedLeaderboard = useMemo(() => {
    const safePage = Math.min(Math.max(1, leaderboardPage), totalLeaderboardPages);
    const start = (safePage - 1) * leaderboardPerPage;
    return sortedLeaderboard.slice(start, start + leaderboardPerPage);
  }, [sortedLeaderboard, leaderboardPage, totalLeaderboardPages, leaderboardPerPage]);

  // Category breakdown
  const categoryCapitalData = useMemo(() => {
    const map: { [cat: string]: { name: string; count: number; totalPieces: number; buyValue: number; sellValue: number; profit: number } } = {};
    enrichedProducts.forEach(p => {
      const cat = p.category?.trim() || 'سایر / بدون دسته‌بندی';
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
  }, [enrichedProducts]);

  // Donut chart dataset
  const donutChartData = useMemo(() => {
    return [
      { name: 'نقدینگی در دسترس (صندوق و بانک)', value: Math.max(0, totalLiquidity), fill: '#10b981', color: '#10b981', share: ((Math.max(0, totalLiquidity) / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
      { name: 'ارزش خرید موجودی انبار', value: Math.max(0, remainingStockPurchaseCost), fill: '#6366f1', color: '#6366f1', share: ((remainingStockPurchaseCost / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
      { name: 'مطالبات تجاری بازار', value: Math.max(0, totalMarketCreditReceivables), fill: '#f59e0b', color: '#f59e0b', share: ((totalMarketCreditReceivables / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
      { name: 'اسناد تجاری و چک‌های صیادی', value: Math.max(0, netChecksBalance), fill: '#3b82f6', color: '#3b82f6', share: ((netChecksBalance / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
    ].filter(item => item.value > 0);
  }, [totalLiquidity, remainingStockPurchaseCost, totalMarketCreditReceivables, netChecksBalance, totalCurrentNetAssets]);

  // Bar chart dataset
  const barCycleData = useMemo(() => {
    return [
      { name: 'وجوه وصول‌شده', مقدار: totalCustomerPaymentsInflow, fill: '#10b981', share: ((totalCustomerPaymentsInflow / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
      { name: 'مطالبات بازار', مقدار: totalMarketCreditReceivables, fill: '#f59e0b', share: ((totalMarketCreditReceivables / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
      { name: 'موجودی انبار', مقدار: remainingStockPurchaseCost, fill: '#6366f1', share: ((remainingStockPurchaseCost / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
      { name: 'سود پیش‌بینی انبار', مقدار: potentialStockProfit, fill: '#8b5cf6', share: ((potentialStockProfit / (totalCurrentNetAssets || 1)) * 100).toFixed(1) },
    ];
  }, [totalCustomerPaymentsInflow, totalMarketCreditReceivables, remainingStockPurchaseCost, potentialStockProfit, totalCurrentNetAssets]);

  // Health Metrics
  const activeDebtors = useMemo(() => {
    return customers.filter(c => calculateCustomerLiveBalance(c, invoices, relationalPayments, relationalReturns) < -1000).length;
  }, [customers, invoices, relationalPayments, relationalReturns]);

  const totalEnterpriseWealth = totalCurrentNetAssets + potentialStockProfit;
  const expectedProfitMarginPercent = remainingStockSellingValue > 0 ? (potentialStockProfit / remainingStockSellingValue) * 100 : 0;
  const liquidityCoveragePercent = totalCurrentNetAssets > 0 ? (totalLiquidity / totalCurrentNetAssets) * 100 : 0;
  const creditRiskExposurePercent = totalCurrentNetAssets > 0 ? (totalMarketCreditReceivables / totalCurrentNetAssets) * 100 : 0;
  const inventoryLockPercent = totalCurrentNetAssets > 0 ? (remainingStockPurchaseCost / totalCurrentNetAssets) * 100 : 0;

  // Simulator Projections
  const simCashFromStock = remainingStockSellingValue * (simulatedStockSalePct / 100);
  const simProfitFromStock = potentialStockProfit * (simulatedStockSalePct / 100);
  const simCashFromReceivables = totalMarketCreditReceivables * (simulatedReceivablesCollectPct / 100);
  const simTotalNewInflow = simCashFromStock + simCashFromReceivables;
  const simProjectedFinalLiquidity = totalLiquidity + simTotalNewInflow;

  return (
    <div className="space-y-6">
      
      {/* 🌟 1. Executive Master Enterprise Wealth Header (Day/Night Mode Adaptive) */}
      <div className="bg-gradient-to-l from-slate-50 via-indigo-50/60 to-white dark:from-slate-900 dark:via-indigo-950/90 dark:to-slate-950 text-slate-900 dark:text-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-indigo-900/40 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-400/30 rounded-2xl text-indigo-600 dark:text-indigo-400">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>داشبورد جامع جریان سرمایه، ارزش انبار و سود</span>
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                      پایش زنده دارایی‌ها
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    تحلیل جامع بهای تمام‌شده، نقدشوندگی موجودی انبار، اسناد تجاری و شبیه‌ساز سودآوری
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-800/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs dark:shadow-none shrink-0">
              <div className="space-y-0.5 text-left">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300 block text-right">ارزش برآوردی کل ثروت تجاری (با سود انبار):</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr block text-right">
                  {formatPrice(totalEnterpriseWealth)}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Interactive Top KPI Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1 */}
            <div 
              onClick={() => onSelectBreakdownType(selectedBreakdownType === 'stock_purchase_cost' ? null : 'stock_purchase_cost')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedBreakdownType === 'stock_purchase_cost'
                  ? 'bg-indigo-50 dark:bg-indigo-500/25 border-indigo-400 dark:border-indigo-400 shadow-md ring-2 ring-indigo-400/30'
                  : 'bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800/80 shadow-xs dark:shadow-none'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-300 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  سرمایه در انبار (بهای خرید)
                </span>
                <span className="text-[11px] font-black dir-ltr text-indigo-600 dark:text-indigo-400">{toPersianDigits(inventoryLockPercent.toFixed(0))}٪ دارایی</span>
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white dir-ltr text-right">
                {formatPrice(remainingStockPurchaseCost)}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                {selectedBreakdownType === 'stock_purchase_cost' ? '▲ کلیک برای بستن جدول' : 'بهای دفتری اقلام (کلیک برای ریز اقلام)'}
              </span>
            </div>

            {/* Metric 2 */}
            <div 
              onClick={() => onSelectBreakdownType(selectedBreakdownType === 'payments_inflow' ? null : 'payments_inflow')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedBreakdownType === 'payments_inflow'
                  ? 'bg-emerald-50 dark:bg-emerald-500/25 border-emerald-400 dark:border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                  : 'bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800/80 shadow-xs dark:shadow-none'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  مجموع وجوه وصول‌شده
                </span>
                <span className="text-[11px] font-black dir-ltr text-emerald-600 dark:text-emerald-400">قطعی</span>
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
                {formatPrice(totalCustomerPaymentsInflow)}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                {selectedBreakdownType === 'payments_inflow' ? '▲ کلیک برای بستن جدول' : 'دریافتی از مشتریان (کلیک برای ریز اقلام)'}
              </span>
            </div>

            {/* Metric 3 */}
            <div 
              onClick={() => onSelectBreakdownType(selectedBreakdownType === 'market_receivables' ? null : 'market_receivables')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedBreakdownType === 'market_receivables'
                  ? 'bg-amber-50 dark:bg-amber-500/25 border-amber-400 dark:border-amber-400 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800/80 shadow-xs dark:shadow-none'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  مانده مطالبات نسیه بازار
                </span>
                <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">{toPersianDigits(activeDebtors)} بدهکار</span>
              </div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 dir-ltr text-right">
                {formatPrice(totalMarketCreditReceivables)}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                {selectedBreakdownType === 'market_receivables' ? '▲ کلیک برای بستن جدول' : 'مطالبات بازرگانی (کلیک برای ریز اقلام)'}
              </span>
            </div>

            {/* Metric 4 */}
            <div 
              onClick={() => onSelectBreakdownType(selectedBreakdownType === 'stock_profit' ? null : 'stock_profit')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedBreakdownType === 'stock_profit'
                  ? 'bg-purple-50 dark:bg-purple-500/25 border-purple-400 dark:border-purple-400 shadow-md ring-2 ring-purple-400/30'
                  : 'bg-white/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800/80 shadow-xs dark:shadow-none'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  سود ناخالص پیش‌بینی انبار
                </span>
                <span className="text-[11px] font-black dir-ltr text-purple-600 dark:text-purple-400">{toPersianDigits(expectedProfitMarginPercent.toFixed(1))}٪ حاشیه</span>
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 dir-ltr text-right">
                {formatPrice(potentialStockProfit)}
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                {selectedBreakdownType === 'stock_profit' ? '▲ کلیک برای بستن جدول' : 'سود بالقوه فروش (کلیک برای ریز اقلام)'}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* 🌟 2. Five-Step Interactive Capital Lifecycle Pipeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" />
              <span>چرخه ۵ مرحله‌ای جریان پول، موجودی انبار و تحقق سود</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مسیر هدایت سرمایه از مرحله تزریق به خرید کالا تا وصول نهایی در خزانه‌ها
            </p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black">
            گردش کامل سرمایه
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Step 1 */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">۱</span>
              <span className="text-[11px] font-bold text-slate-400">سرمایه‌گذاری</span>
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">۱. خرید و ورود کالا</span>
            <div className="text-sm font-black text-blue-600 dark:text-blue-400 dir-ltr text-right">
              {formatPrice(totalCapitalInjected)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">بهای خرید کل اقلام خریداری‌شده</p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">۲</span>
              <span className="text-[11px] font-bold text-slate-400">انباشت ارزش</span>
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">۲. موجودی انبار (بهای خرید)</span>
            <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 dir-ltr text-right">
              {formatPrice(remainingStockPurchaseCost)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">سرمایه راکد آماده فروش</p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-black">۳</span>
              <span className="text-[11px] font-bold text-slate-400">اعتبار بازار</span>
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">۳. مطالبات و نسیه</span>
            <div className="text-sm font-black text-amber-600 dark:text-amber-400 dir-ltr text-right">
              {formatPrice(totalMarketCreditReceivables)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">فاکتورهای نسیه در انتظار وصول</p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">۴</span>
              <span className="text-[11px] font-bold text-slate-400">نقدشوندگی</span>
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">۴. نقدینگی خزانه‌ها</span>
            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
              {formatPrice(totalLiquidity)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">صندوق و بانک آماده خرج</p>
          </div>

          {/* Step 5 */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 relative">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-black">۵</span>
              <span className="text-[11px] font-bold text-slate-400">خلق سود</span>
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">۵. سود در راه انبار</span>
            <div className="text-sm font-black text-purple-600 dark:text-purple-400 dir-ltr text-right">
              +{formatPrice(potentialStockProfit)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">ارزش افزوده فروش کالاها</p>
          </div>
        </div>
      </div>

      {/* 🌟 3 Detailed Valuation & Liquidation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: ارزش دفتری خرید */}
        <div 
          onClick={() => onSelectBreakdownType(selectedBreakdownType === 'stock_purchase_cost' ? null : 'stock_purchase_cost')}
          className={`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border shadow-2xs space-y-3 cursor-pointer transition-all group ${
            selectedBreakdownType === 'stock_purchase_cost'
              ? 'border-indigo-500 ring-2 ring-indigo-500/40 dark:ring-indigo-500/30 shadow-xl'
              : 'border-slate-200/90 dark:border-slate-800 hover:border-indigo-500/60 hover:shadow-xl hover:-translate-y-0.5'
          }`}
          title="کلیک برای باز/بستن جدول ریز بهای تمام‌شده خرید کالاهای انبار در همین صفحه"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">ارزش دفتری موجودی انبار (بهای خرید)</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all ${
              selectedBreakdownType === 'stock_purchase_cost'
                ? 'bg-indigo-600 text-white border-indigo-700'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
            }`}>
              {selectedBreakdownType === 'stock_purchase_cost' ? 'در حال نمایش' : 'بهای خرید'}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white dir-ltr text-right">
              {formatPrice(remainingStockPurchaseCost)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mt-1">
              ارزش {toPersianDigits(products.length)} قلم کالا بر مبنای قیمت خرید
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
            <span>{selectedBreakdownType === 'stock_purchase_cost' ? '▲ بستن جدول ریز اقلام' : 'مشاهده جدول تفکیکی موجودی کالاها'}</span>
            <ChevronLeft className={`w-3 h-3 transition-transform ${selectedBreakdownType === 'stock_purchase_cost' ? 'rotate-90' : 'group-hover:-translate-x-1'}`} />
          </div>
        </div>

        {/* Card 2: ارزش فروش نهایی */}
        <div 
          onClick={() => onSelectBreakdownType(selectedBreakdownType === 'stock_selling_value' ? null : 'stock_selling_value')}
          className={`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border shadow-2xs space-y-3 cursor-pointer transition-all group ${
            selectedBreakdownType === 'stock_selling_value'
              ? 'border-emerald-500 ring-2 ring-emerald-500/40 dark:ring-emerald-500/30 shadow-xl'
              : 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/60 hover:shadow-xl hover:-translate-y-0.5'
          }`}
          title="کلیک برای باز/بستن جدول ریز ارزش فروش موجودی انبار در همین صفحه"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">ارزش ناخالص فروش کل موجودی انبار</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all ${
              selectedBreakdownType === 'stock_selling_value'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}>
              {selectedBreakdownType === 'stock_selling_value' ? 'در حال نمایش' : 'فروش نهایی'}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
              {formatPrice(remainingStockSellingValue)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mt-1">
              در صورت فروش ۱۰۰٪ موجودی فعلی انبار
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            <span>{selectedBreakdownType === 'stock_selling_value' ? '▲ بستن جدول ریز اقلام' : 'مشاهده جدول ارزش فروش اقلام'}</span>
            <ChevronLeft className={`w-3 h-3 transition-transform ${selectedBreakdownType === 'stock_selling_value' ? 'rotate-90' : 'group-hover:-translate-x-1'}`} />
          </div>
        </div>

        {/* Card 3: گردش مرجوعی */}
        <div 
          onClick={() => onSelectBreakdownType(selectedBreakdownType === 'returns' ? null : 'returns')}
          className={`bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border shadow-2xs space-y-3 cursor-pointer transition-all group ${
            selectedBreakdownType === 'returns'
              ? 'border-rose-500 ring-2 ring-rose-500/40 dark:ring-rose-500/30 shadow-xl'
              : 'border-slate-200/90 dark:border-slate-800 hover:border-rose-500/60 hover:shadow-xl hover:-translate-y-0.5'
          }`}
          title="کلیک برای باز/بستن جدول ریز مرجوعی‌ها در همین صفحه"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200">خالص گردش ریالی کالاهای مرجوعی</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all ${
              selectedBreakdownType === 'returns'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}>
              {selectedBreakdownType === 'returns' ? 'در حال نمایش' : 'مرجوعی'}
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 dir-ltr text-right">
              {formatPrice(totalCustomerReturnsValue + totalSupplierReturnsValue)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mt-1">
              مشتری: {formatPrice(totalCustomerReturnsValue)} • شرکت: {formatPrice(totalSupplierReturnsValue)}
            </span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400 font-bold">
            <span>{selectedBreakdownType === 'returns' ? '▲ بستن جدول ریز اقلام' : 'مشاهده ریز مرجوعی مشتریان و شرکت‌ها'}</span>
            <ChevronLeft className={`w-3 h-3 transition-transform ${selectedBreakdownType === 'returns' ? 'rotate-90' : 'group-hover:-translate-x-1'}`} />
          </div>
        </div>

      </div>

      {/* Inline Breakdown Component */}
      {selectedBreakdownType && [
        'stock_purchase_cost',
        'payments_inflow',
        'market_receivables',
        'stock_profit',
        'stock_selling_value',
        'returns',
        'total_liquidity',
        'cash',
        'bank',
        'checks'
      ].includes(selectedBreakdownType) && (
        <div className="pt-1">
          <LiquidityInlineBreakdown
            type={selectedBreakdownType}
            onClose={() => onSelectBreakdownType(null)}
            payments={relationalPayments}
            customers={customers}
            treasuryTransactions={treasuryTransactions}
            productReturns={relationalReturns}
            invoices={invoices}
            products={products}
            settings={settings}
            theme={theme}
          />
        </div>
      )}

      {/* 🌟 4. Interactive Working Capital Allocation & Chart Dashboard */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <span>گزارش ساختار تخصیص دارایی‌ها و جریان گردش سرمایه</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              صورت وضعیت تفکیکی دارایی‌های در گردش، مطالبات نسیه، اسناد تجاری و نقدینگی عملیاتی.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setChartViewMode('donut')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  chartViewMode === 'donut'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                نمودار دونات
              </button>
              <button
                onClick={() => setChartViewMode('bar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  chartViewMode === 'bar'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                نمودار ستونی
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-left">
              <span className="text-[10px] text-slate-400 font-bold block text-right">کل دارایی‌های جاری:</span>
              <span className="text-sm font-black text-slate-900 dark:text-white dir-ltr block">{formatPrice(totalCurrentNetAssets)}</span>
            </div>
          </div>
        </div>

        {/* Visual Allocation Strip */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>نسبت‌های تفکیکی ساختار سرمایه در گردش</span>
            <span>۱۰۰٪ دارایی‌های جاری</span>
          </div>
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
            {totalLiquidity > 0 && (
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.max(4, (totalLiquidity / (totalCurrentNetAssets || 1)) * 100)}%` }}
                title={`نقدینگی در صندوق و بانک: ${formatPrice(totalLiquidity)} (${toPersianDigits(liquidityCoveragePercent.toFixed(1))}٪)`}
              />
            )}
            {remainingStockPurchaseCost > 0 && (
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.max(4, (remainingStockPurchaseCost / (totalCurrentNetAssets || 1)) * 100)}%` }}
                title={`ارزش ریالی موجودی انبار: ${formatPrice(remainingStockPurchaseCost)} (${toPersianDigits(inventoryLockPercent.toFixed(1))}٪)`}
              />
            )}
            {totalMarketCreditReceivables > 0 && (
              <div 
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${Math.max(4, (totalMarketCreditReceivables / (totalCurrentNetAssets || 1)) * 100)}%` }}
                title={`حساب‌های دریافتنی و نسیه بازار: ${formatPrice(totalMarketCreditReceivables)} (${toPersianDigits(creditRiskExposurePercent.toFixed(1))}٪)`}
              />
            )}
            {netChecksBalance > 0 && (
              <div 
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.max(4, (netChecksBalance / (totalCurrentNetAssets || 1)) * 100)}%` }}
                title={`اسناد تجاری و چک‌های صیادی: ${formatPrice(netChecksBalance)}`}
              />
            )}
          </div>
        </div>

        {/* Chart View */}
        <div className="h-64 pt-2">
          {chartViewMode === 'donut' ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutChartData.map((entry, index) => (
                    <Cell key={`cell-donut-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${formatPrice(value as number)}`, 'مبلغ']} 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px', color: '#fff', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barCycleData} margin={{ left: 10, right: 10, top: 15, bottom: 20 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis hide />
                <Tooltip 
                  formatter={(value: any) => [`${formatPrice(value as number)}`, 'مبلغ']} 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px', color: '#fff', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="مقدار" 
                  radius={[8, 8, 0, 0]} 
                  barSize={44}
                >
                  {barCycleData.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 4 Asset Allocation Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          
          {/* Asset 1: نقدینگی */}
          <div 
            onClick={() => onSelectBreakdownType(selectedBreakdownType === 'total_liquidity' ? null : 'total_liquidity')}
            className={`bg-emerald-50/50 dark:bg-emerald-950/20 border rounded-2xl p-4 space-y-2 cursor-pointer transition-all ${
              selectedBreakdownType === 'total_liquidity'
                ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-md'
                : 'border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 hover:shadow-md'
            }`}
            title="کلیک برای مشاهده ریز نقدینگی در همین صفحه"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ۱. وجوه نقد و حساب‌های بانکی
              </span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {toPersianDigits(((totalLiquidity / (totalCurrentNetAssets || 1)) * 100).toFixed(0))}٪
              </span>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white dir-ltr text-right">
              {formatPrice(totalLiquidity)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>صندوق: {formatPrice(netCashBalance)} • بانک: {formatPrice(netBankBalance)}</span>
              <ChevronLeft className={`w-3 h-3 text-emerald-600 transition-transform ${selectedBreakdownType === 'total_liquidity' ? 'rotate-90' : ''}`} />
            </div>
          </div>

          {/* Asset 2: کالا در انبار */}
          <div 
            onClick={() => onSelectBreakdownType(selectedBreakdownType === 'stock_purchase_cost' ? null : 'stock_purchase_cost')}
            className={`bg-indigo-50/50 dark:bg-indigo-950/20 border rounded-2xl p-4 space-y-2 cursor-pointer transition-all ${
              selectedBreakdownType === 'stock_purchase_cost'
                ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-md'
                : 'border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 hover:shadow-md'
            }`}
            title="کلیک برای مشاهده ریز کالاهای انبار در همین صفحه"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                ۲. ارزش دفتری کالای انبار (خرید)
              </span>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                {toPersianDigits(((remainingStockPurchaseCost / (totalCurrentNetAssets || 1)) * 100).toFixed(0))}٪
              </span>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white dir-ltr text-right">
              {formatPrice(remainingStockPurchaseCost)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>موجودی {toPersianDigits(products.length)} قلم کالا</span>
              <ChevronLeft className={`w-3 h-3 text-indigo-600 transition-transform ${selectedBreakdownType === 'stock_purchase_cost' ? 'rotate-90' : ''}`} />
            </div>
          </div>

          {/* Asset 3: نسیه دست مشتریان */}
          <div 
            onClick={() => onSelectBreakdownType(selectedBreakdownType === 'market_receivables' ? null : 'market_receivables')}
            className={`bg-amber-50/50 dark:bg-amber-950/20 border rounded-2xl p-4 space-y-2 cursor-pointer transition-all ${
              selectedBreakdownType === 'market_receivables'
                ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-md'
                : 'border-amber-200 dark:border-amber-900/60 hover:border-amber-400 hover:shadow-md'
            }`}
            title="کلیک برای مشاهده ریز مطالبات مشتریان در همین صفحه"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ۳. حساب‌های دریافتنی تجاری
              </span>
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                {toPersianDigits(((totalMarketCreditReceivables / (totalCurrentNetAssets || 1)) * 100).toFixed(0))}٪
              </span>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white dir-ltr text-right">
              {formatPrice(totalMarketCreditReceivables)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>مطالبات بازرگانی در انتظار وصول</span>
              <ChevronLeft className={`w-3 h-3 text-amber-600 transition-transform ${selectedBreakdownType === 'market_receivables' ? 'rotate-90' : ''}`} />
            </div>
          </div>

          {/* Asset 4: چک‌های صیادی */}
          <div 
            onClick={() => onSelectBreakdownType(selectedBreakdownType === 'checks' ? null : 'checks')}
            className={`bg-blue-50/50 dark:bg-blue-950/20 border rounded-2xl p-4 space-y-2 cursor-pointer transition-all ${
              selectedBreakdownType === 'checks'
                ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-md'
                : 'border-blue-200 dark:border-blue-900/60 hover:border-blue-400 hover:shadow-md'
            }`}
            title="کلیک برای مشاهده ریز چک‌های صیادی در همین صفحه"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ۴. اسناد تجاری و چک‌های صیادی
              </span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                {toPersianDigits(((netChecksBalance / (totalCurrentNetAssets || 1)) * 100).toFixed(0))}٪
              </span>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white dir-ltr text-right">
              {formatPrice(netChecksBalance)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>اسناد صیادی نزد خزانه‌داری</span>
              <ChevronLeft className={`w-3 h-3 text-blue-600 transition-transform ${selectedBreakdownType === 'checks' ? 'rotate-90' : ''}`} />
            </div>
          </div>

        </div>

        {/* Supplementary Operational & Return Audits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-black text-slate-800 dark:text-slate-200 block">کل هزینه‌های جاری عملیاتی مصرف‌شده:</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">حقوق و دستمزد، اجاره انبار، قبوض و لجستیک</span>
            </div>
            <span className="font-black text-amber-600 dark:text-amber-400 text-sm dir-ltr">
              {formatPrice(totalOperatingExpenses)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-black text-slate-800 dark:text-slate-200 block">کل تسویه مالی اقلام مرجوعی:</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">وجوه مرجوعی مشتریان و برگشتی به شرکت‌ها</span>
            </div>
            <span className="font-black text-rose-600 dark:text-rose-400 text-sm dir-ltr">
              {formatPrice(refundedReturnsFromCustomerCash + refundedReturnsFromCustomerBank + refundedReturnsToSupplierCash + refundedReturnsToSupplierBank)}
            </span>
          </div>
        </div>
      </div>

      {/* 🌟 5. Interactive Working Capital & Cashflow Simulator (What-If Engine - Day/Night Adaptive) */}
      <div className="bg-gradient-to-br from-slate-50 via-indigo-50/60 to-white dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-slate-900 dark:text-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-indigo-800/40 shadow-sm dark:shadow-lg space-y-5 transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200/80 dark:border-indigo-900/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-400/30 rounded-2xl text-indigo-700 dark:text-indigo-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>شبیه‌ساز هوشمند سناریوهای نقدشوندگی و سودآوری</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                  What-If Analysis
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-indigo-200/70 mt-0.5">
                پیش‌بینی ورود نقدینگی و سود خالص در صورت تحقق سناریوهای فروش انبار و وصول مطالبات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: '۲۵٪ محتاطانه', stock: 25, recv: 25 },
              { label: '۵۰٪ میانگین', stock: 50, recv: 50 },
              { label: '۷۵٪ هدف‌گذاری', stock: 75, recv: 75 },
              { label: '۱۰۰٪ تسویه کامل', stock: 100, recv: 100 },
            ].map((preset) => {
              const isActive = simulatedStockSalePct === preset.stock && simulatedReceivablesCollectPct === preset.recv;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => { setSimulatedStockSalePct(preset.stock); setSimulatedReceivablesCollectPct(preset.recv); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-xs ${
                    isActive
                      ? 'bg-indigo-600 text-white border border-indigo-600 shadow-indigo-500/20'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Slider 1: Stock Sale % */}
          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                درصد فروش فرضی از موجودی فعلی انبار:
              </span>
              <span className="text-sm font-black text-indigo-700 dark:text-indigo-400 dir-ltr bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                {toPersianDigits(simulatedStockSalePct)}٪
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="5"
              value={simulatedStockSalePct}
              onChange={(e) => setSimulatedStockSalePct(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>پول حاصل از فروش: <b className="text-slate-900 dark:text-white dir-ltr">{formatPrice(simCashFromStock)}</b></span>
              <span>سود خالص: <b className="text-emerald-600 dark:text-emerald-400 dir-ltr">+{formatPrice(simProfitFromStock)}</b></span>
            </div>
          </div>

          {/* Slider 2: Receivables Collection % */}
          <div className="bg-white dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-none space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                درصد وصول فرضی از مطالبات نسیه بازار:
              </span>
              <span className="text-sm font-black text-amber-700 dark:text-amber-400 dir-ltr bg-amber-50 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                {toPersianDigits(simulatedReceivablesCollectPct)}٪
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="5"
              value={simulatedReceivablesCollectPct}
              onChange={(e) => setSimulatedReceivablesCollectPct(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>مانده بعد از وصول: <b className="text-slate-900 dark:text-white dir-ltr">{formatPrice(totalMarketCreditReceivables - simCashFromReceivables)}</b></span>
              <span>وصولی جدید: <b className="text-amber-600 dark:text-amber-400 dir-ltr">+{formatPrice(simCashFromReceivables)}</b></span>
            </div>
          </div>

        </div>

        {/* Projection Outcome Strip */}
        <div className="bg-indigo-50/80 dark:bg-indigo-950/60 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-right shadow-2xs">
          <div className="space-y-1 border-b sm:border-b-0 sm:border-l border-indigo-200 dark:border-indigo-900/60 pb-3 sm:pb-0 sm:pl-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ورودی پول نقد پیش‌بینی‌شده جدید:</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 dir-ltr block">{formatPrice(simTotalNewInflow)}</span>
          </div>

          <div className="space-y-1 border-b sm:border-b-0 sm:border-l border-indigo-200 dark:border-indigo-900/60 pb-3 sm:pb-0 sm:pl-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">سود خالص تحقق‌یافته جدید:</span>
            <span className="text-lg font-black text-purple-600 dark:text-purple-400 dir-ltr block">+{formatPrice(simProfitFromStock)}</span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block">موجودی نهایی کل نقدینگی خزانه‌ها:</span>
            <span className="text-lg font-black text-slate-900 dark:text-white dir-ltr block">{formatPrice(simProjectedFinalLiquidity)}</span>
          </div>
        </div>
      </div>

      {/* 🌟 6. Warehouse Products Capital & Profit Leaderboard */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <span>تحلیل کالاهای لیدر انبار از نظر سرمایه و پتانسیل سود</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              رتبه‌بندی محصولات بر اساس ارزش سرمایه خوابیده، سودآوری ناخالص و حاشیه سود هر قلم کالا
            </p>
          </div>

          {/* Sort & Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Sort Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => { setLeaderboardSort('value'); setLeaderboardPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  leaderboardSort === 'value'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                بیشترین سرمایه
              </button>
              <button
                onClick={() => { setLeaderboardSort('profit'); setLeaderboardPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  leaderboardSort === 'profit'
                    ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                بیشترین سود
              </button>
              <button
                onClick={() => { setLeaderboardSort('margin'); setLeaderboardPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  leaderboardSort === 'margin'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                بالاترین حاشیه ٪
              </button>
              <button
                onClick={() => { setLeaderboardSort('stock'); setLeaderboardPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  leaderboardSort === 'stock'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                تعداد موجودی
              </button>
            </div>

            {/* Category Filter */}
            {categoriesList.length > 0 && (
              <select
                value={leaderboardCategory}
                onChange={(e) => { setLeaderboardCategory(e.target.value); setLeaderboardPage(1); }}
                className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-2 outline-hidden cursor-pointer"
              >
                <option value="all">همه دسته‌بندی‌ها ({toPersianDigits(products.length)})</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجوی نام کالا یا گروه برای تحلیل سرمایه..."
            value={leaderboardSearch}
            onChange={(e) => { setLeaderboardSearch(e.target.value); setLeaderboardPage(1); }}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500/20 outline-hidden"
          />
        </div>

        {/* Leaderboard Grid */}
        {sortedLeaderboard.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              هیچ کالایی مطابق با فیلتر دسته‌بندی و عبارت جستجو شده یافت نشد.
            </p>
            {(leaderboardSearch || leaderboardCategory !== 'all') && (
              <button
                type="button"
                onClick={() => { setLeaderboardSearch(''); setLeaderboardCategory('all'); setLeaderboardPage(1); }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
              >
                پاک‌سازی فیلترها و نمایش همه کالاها
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {paginatedLeaderboard.map((item, idx) => (
              <div 
                key={item.id || idx}
                className="bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3 hover:border-indigo-400/50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">{item.name}</h4>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-0.5">
                      {item.category || 'بدون دسته‌بندی'} • {toPersianDigits(item.stock)} عدد در انبار
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                    {toPersianDigits(item.shareOfTotalStock.toFixed(1))}٪ از کل انبار
                  </span>
                </div>

                {/* Progress Share Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, item.shareOfTotalStock))}%` }}
                  />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-slate-400 block">بهای خرید کل:</span>
                    <span className="font-black text-slate-900 dark:text-white dir-ltr block text-right">{formatPrice(item.totalBuy)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">سود بالقوه فروش:</span>
                    <span className="font-black text-purple-600 dark:text-purple-400 dir-ltr block text-right">+{formatPrice(item.profit)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">قیمت فی خرید:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 dir-ltr block text-right">{formatPrice(item.buyPrice)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">حاشیه سود:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 dir-ltr block text-right">{toPersianDigits(item.margin.toFixed(1))}٪</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Complete Pagination */}
        {sortedLeaderboard.length > 0 && (
          <div className="pt-2">
            <Pagination
              currentPage={Math.min(Math.max(1, leaderboardPage), totalLeaderboardPages)}
              totalPages={totalLeaderboardPages}
              totalItems={sortedLeaderboard.length}
              itemsPerPage={leaderboardPerPage}
              onPageChange={(page) => setLeaderboardPage(page)}
              onItemsPerPageChange={(newSize) => {
                setLeaderboardPerPage(newSize);
                setLeaderboardPage(1);
              }}
              itemsPerPageOptions={[6, 12, 24, 48]}
              itemName="کالا"
              themeColor={settings.themeColor}
            />
          </div>
        )}
      </div>

      {/* 🌟 7. Category Distribution Grid */}
      {categoryCapitalData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              <span>توزیع سرمایه و سود به تفکیک دسته‌بندی کالاها</span>
            </h3>
            <span className="text-xs text-slate-500 font-bold">{toPersianDigits(categoryCapitalData.length)} گروه کالایی</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categoryCapitalData.map((cat, idx) => {
              const catShare = remainingStockPurchaseCost > 0 ? (cat.buyValue / remainingStockPurchaseCost) * 100 : 0;
              return (
                <div key={idx} className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">{cat.name}</span>
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                      {toPersianDigits(catShare.toFixed(1))}٪
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>تعداد اقلام:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{toPersianDigits(cat.count)} قلم ({toPersianDigits(cat.totalPieces)} عدد)</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>بهای خرید کل:</span>
                      <span className="font-black text-slate-900 dark:text-white dir-ltr">{formatPrice(cat.buyValue)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>سود پیش‌بینی:</span>
                      <span className="font-black text-purple-600 dark:text-purple-400 dir-ltr">+{formatPrice(cat.profit)}</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(5, catShare))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🌟 8. Detailed Financial Balance & Audit Equation Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              جدول رسمی ترازنامه دارایی‌های فعال و معادله سرمایه
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-bold">
            حسابداری استاندارد بازرگانی و انبار
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black">
                <th className="py-3 px-4">ردیف</th>
                <th className="py-3 px-4">عنوان قلم دارایی / سرمایه</th>
                <th className="py-3 px-4">ماهیت حسابداری</th>
                <th className="py-3 px-4">توضیحات و منبع</th>
                <th className="py-3 px-4 text-left">مبلغ (تومان)</th>
                <th className="py-3 px-4 text-center">سهم از کل دارایی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {/* Row 1 */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-bold text-slate-400">۱</td>
                <td className="py-3 px-4 font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-500" />
                  موجودی صندوق نقدی (کشو)
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                    نقدینگی آماده
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                  اسکناس و نقدینگی در محل انبار
                </td>
                <td className="py-3 px-4 font-black text-slate-900 dark:text-white dir-ltr text-left">
                  {formatPrice(netCashBalance)}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-400">
                  {toPersianDigits(((Math.max(0, netCashBalance) / (totalCurrentNetAssets || 1)) * 100).toFixed(1))}٪
                </td>
              </tr>

              {/* Row 2 */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-bold text-slate-400">۲</td>
                <td className="py-3 px-4 font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  موجودی حساب‌های بانکی و پوز
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[11px] font-bold">
                    نقدینگی بانکی
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                  کارت‌خوان، واریزهای بانکی و حواله‌ها
                </td>
                <td className="py-3 px-4 font-black text-slate-900 dark:text-white dir-ltr text-left">
                  {formatPrice(netBankBalance)}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-400">
                  {toPersianDigits(((Math.max(0, netBankBalance) / (totalCurrentNetAssets || 1)) * 100).toFixed(1))}٪
                </td>
              </tr>

              {/* Row 3 */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-bold text-slate-400">۳</td>
                <td className="py-3 px-4 font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-indigo-500" />
                  موجودی کالا در انبار (به بهای خرید)
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-[11px] font-bold">
                    دارایی فیزیکی (انبار)
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                  ارزش خرید {toPersianDigits(products.length)} قلم کالای موجود در انبار
                </td>
                <td className="py-3 px-4 font-black text-indigo-600 dark:text-indigo-400 dir-ltr text-left">
                  {formatPrice(remainingStockPurchaseCost)}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-400">
                  {toPersianDigits(((remainingStockPurchaseCost / (totalCurrentNetAssets || 1)) * 100).toFixed(1))}٪
                </td>
              </tr>

              {/* Row 4 */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-bold text-slate-400">۴</td>
                <td className="py-3 px-4 font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  مطالبات نسیه در بازار (حساب‌های دریافتنی)
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                    مطالبات در گردش
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                  بدهی قطعی مشتریان بابت فاکتورهای نسیه
                </td>
                <td className="py-3 px-4 font-black text-amber-600 dark:text-amber-400 dir-ltr text-left">
                  {formatPrice(totalMarketCreditReceivables)}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-400">
                  {toPersianDigits(((totalMarketCreditReceivables / (totalCurrentNetAssets || 1)) * 100).toFixed(1))}٪
                </td>
              </tr>

              {/* Row 5 */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-bold text-slate-400">۵</td>
                <td className="py-3 px-4 font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  اسناد دریافتنی (چک‌های صیادی نزد صندوق)
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[11px] font-bold">
                    اسناد تجاری
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                  چک‌های دریافت شده در انتظار موعد وصول
                </td>
                <td className="py-3 px-4 font-black text-blue-600 dark:text-blue-400 dir-ltr text-left">
                  {formatPrice(netChecksBalance)}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-400">
                  {toPersianDigits(((netChecksBalance / (totalCurrentNetAssets || 1)) * 100).toFixed(1))}٪
                </td>
              </tr>

              {/* Summary Row */}
              <tr className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-black text-xs border-t-2 border-slate-300 dark:border-slate-700 transition-colors">
                <td colSpan={4} className="py-4 px-4 text-slate-800 dark:text-slate-200">
                  جمع کل دارایی‌های واقعی کسب‌وکار (نقدینگی + انبار به بهای خرید + نسیه بازار + چک)
                </td>
                <td className="py-4 px-4 text-emerald-600 dark:text-emerald-400 text-sm dir-ltr text-left">
                  {formatPrice(totalCurrentNetAssets)}
                </td>
                <td className="py-4 px-4 text-center text-emerald-600 dark:text-emerald-400">
                  ۱۰۰٪
                </td>
              </tr>

              {/* Prospective Profit Realization Row */}
              <tr className="bg-purple-50/80 dark:bg-purple-900/20 text-purple-900 dark:text-purple-200 font-bold text-xs border-t border-purple-200/60 dark:border-purple-800/40">
                <td colSpan={4} className="py-3 px-4">
                  <span className="flex items-center gap-1.5 font-black text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-4 h-4" />
                    سود بالقوه در انتظار تحقق (در صورت فروش باقیمانده کالاهای انبار به قیمت فروش)
                  </span>
                </td>
                <td className="py-3 px-4 text-purple-600 dark:text-purple-400 font-black text-sm dir-ltr text-left">
                  +{formatPrice(potentialStockProfit)}
                </td>
                <td className="py-3 px-4 text-center text-purple-600 dark:text-purple-400 font-black">
                  سود در راه
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
