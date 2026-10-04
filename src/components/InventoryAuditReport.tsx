import React, { useState, useMemo } from 'react';
import { Product, StoreSettings } from '../types';
import { 
  formatPrice, 
  toPersianDigits, 
  formatProductPackagingSpec, 
  isProductUnpackaged, 
  getProductEffectiveCartonSize 
} from '../utils/formatters';
import { themes } from './ThemeConfig';
import { Pagination } from './Pagination';
import { 
  BarChart3, 
  ArrowRight, 
  Printer, 
  Search, 
  Boxes, 
  Layers, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Filter,
  DollarSign,
  Package,
  ArrowUpDown,
  Coins,
  Percent,
  Sparkles,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';

interface InventoryAuditReportProps {
  products: Product[];
  settings: StoreSettings;
  isSecretMode: boolean;
  onBack: () => void;
}

type StockFilterType = 'all' | 'in_stock' | 'low_stock' | 'zero' | 'packaged' | 'unpackaged';
type SortFieldType = 'default' | 'profit_desc' | 'profit_asc' | 'purchase_val_desc' | 'sales_val_desc' | 'stock_desc' | 'stock_asc' | 'cartons_desc' | 'margin_desc' | 'name_asc';

export const InventoryAuditReport: React.FC<InventoryAuditReportProps> = ({
  products,
  settings,
  isSecretMode,
  onBack,
}) => {
  const theme = themes[settings.themeColor] || themes.teal;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('all');
  const [sortField, setSortField] = useState<SortFieldType>('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [copied, setCopied] = useState(false);

  // Hide zero-stock products state (persisted to localStorage, default true)
  const [hideZeroStock, setHideZeroStock] = useState<boolean>(() => {
    const saved = localStorage.getItem('bazargani_inventory_hide_zero_stock');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return true;
      }
    }
    return true; // Default to true as requested
  });

  React.useEffect(() => {
    localStorage.setItem('bazargani_inventory_hide_zero_stock', JSON.stringify(hideZeroStock));
  }, [hideZeroStock]);

  // Financial and volume calculations across ALL inventory
  const totalPackagedCartons = useMemo(() => {
    return products.reduce((acc, p) => {
      if (isProductUnpackaged(p)) return acc;
      const ppc = getProductEffectiveCartonSize(p);
      return acc + (ppc > 1 ? Math.floor((p.stockPieces || 0) / ppc) : 0);
    }, 0);
  }, [products]);

  const totalPackagedLoosePieces = useMemo(() => {
    return products.reduce((acc, p) => {
      if (isProductUnpackaged(p)) return acc;
      const ppc = getProductEffectiveCartonSize(p);
      return acc + (ppc > 1 ? ((p.stockPieces || 0) % ppc) : 0);
    }, 0);
  }, [products]);

  const totalUnpackagedPieces = useMemo(() => {
    return products.reduce((acc, p) => {
      if (isProductUnpackaged(p) || getProductEffectiveCartonSize(p) <= 1) {
        return acc + (p.stockPieces || 0);
      }
      return acc;
    }, 0);
  }, [products]);

  const totalPieces = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.stockPieces || 0), 0);
  }, [products]);

  const totalPurchaseValue = useMemo(() => {
    return products.reduce((acc, p) => acc + ((p.stockPieces || 0) * (p.purchasePrice || 0)), 0);
  }, [products]);

  const totalSalesValue = useMemo(() => {
    return products.reduce((acc, p) => acc + ((p.stockPieces || 0) * (p.sellingPrice || 0)), 0);
  }, [products]);

  const totalProfit = totalSalesValue - totalPurchaseValue;
  const overallMarkup = totalPurchaseValue > 0 ? (totalProfit / totalPurchaseValue) * 100 : 0;
  const overallMargin = totalSalesValue > 0 ? (totalProfit / totalSalesValue) * 100 : 0;

  // Categories list - strictly deduplicated
  const categories = useMemo(() => {
    const rawSet = new Set(
      products
        .map(p => (p.category || '').trim())
        .filter(c => c && c.toLowerCase() !== 'all')
    );
    return ['all', ...Array.from(rawSet)];
  }, [products]);

  // Stock status counts
  const inStockCount = useMemo(() => products.filter(p => (p.stockPieces || 0) > 0).length, [products]);
  const zeroStockCount = useMemo(() => products.filter(p => (p.stockPieces || 0) <= 0).length, [products]);
  const lowStockCount = useMemo(() => products.filter(p => {
    if ((p.stockPieces || 0) <= 0) return false;
    const isUnpack = isProductUnpackaged(p);
    const ppc = getProductEffectiveCartonSize(p);
    if (!isUnpack && ppc > 1) {
      const cartons = Math.floor(p.stockPieces / ppc);
      return cartons < 5;
    }
    return p.stockPieces < 20;
  }).length, [products]);

  const packagedCount = useMemo(() => products.filter(p => !isProductUnpackaged(p) && getProductEffectiveCartonSize(p) > 1).length, [products]);
  const unpackagedCount = useMemo(() => products.filter(p => isProductUnpackaged(p) || getProductEffectiveCartonSize(p) <= 1).length, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const stock = p.stockPieces || 0;
      // When hideZeroStock is enabled, hide items with stock <= 0 (unless user specifically chose 'zero' status tab)
      if (hideZeroStock && stockFilter !== 'zero' && stock <= 0) {
        return false;
      }

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        p.name.toLowerCase().includes(query) ||
        (p.code && p.code.toLowerCase().includes(query)) ||
        (p.notes && p.notes.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query));
      
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

      let matchesStock = true;
      const isUnpack = isProductUnpackaged(p);
      const ppc = getProductEffectiveCartonSize(p);
      const cartons = (!isUnpack && ppc > 1) ? Math.floor(stock / ppc) : 0;

      if (stockFilter === 'in_stock') {
        matchesStock = stock > 0;
      } else if (stockFilter === 'low_stock') {
        matchesStock = stock > 0 && ((!isUnpack && ppc > 1) ? cartons < 5 : stock < 20);
      } else if (stockFilter === 'zero') {
        matchesStock = stock <= 0;
      } else if (stockFilter === 'packaged') {
        matchesStock = !isUnpack && ppc > 1;
      } else if (stockFilter === 'unpackaged') {
        matchesStock = isUnpack || ppc <= 1;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter, hideZeroStock]);

  // Sort filtered products
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortField) {
      case 'profit_desc':
        return list.sort((a, b) => {
          const profA = (a.sellingPrice - a.purchasePrice) * a.stockPieces;
          const profB = (b.sellingPrice - b.purchasePrice) * b.stockPieces;
          return profB - profA;
        });
      case 'profit_asc':
        return list.sort((a, b) => {
          const profA = (a.sellingPrice - a.purchasePrice) * a.stockPieces;
          const profB = (b.sellingPrice - b.purchasePrice) * b.stockPieces;
          return profA - profB;
        });
      case 'purchase_val_desc':
        return list.sort((a, b) => (b.purchasePrice * b.stockPieces) - (a.purchasePrice * a.stockPieces));
      case 'sales_val_desc':
        return list.sort((a, b) => (b.sellingPrice * b.stockPieces) - (a.sellingPrice * a.stockPieces));
      case 'stock_desc':
        return list.sort((a, b) => b.stockPieces - a.stockPieces);
      case 'stock_asc':
        return list.sort((a, b) => a.stockPieces - b.stockPieces);
      case 'cartons_desc':
        return list.sort((a, b) => {
          const ppcA = getProductEffectiveCartonSize(a);
          const ppcB = getProductEffectiveCartonSize(b);
          const cA = (!isProductUnpackaged(a) && ppcA > 1) ? Math.floor(a.stockPieces / ppcA) : 0;
          const cB = (!isProductUnpackaged(b) && ppcB > 1) ? Math.floor(b.stockPieces / ppcB) : 0;
          return cB - cA;
        });
      case 'margin_desc':
        return list.sort((a, b) => {
          const mA = a.purchasePrice > 0 ? ((a.sellingPrice - a.purchasePrice) / a.purchasePrice) : 0;
          const mB = b.purchasePrice > 0 ? ((b.sellingPrice - b.purchasePrice) / b.purchasePrice) : 0;
          return mB - mA;
        });
      case 'name_asc':
        return list.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
      case 'default':
      default:
        return list;
    }
  }, [filteredProducts, sortField]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, stockFilter, sortField, hideZeroStock]);

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);

  // Filtered totals for footer
  const filteredTotals = useMemo(() => {
    let cartons = 0;
    let pieces = 0;
    let purchaseVal = 0;
    let salesVal = 0;

    for (const p of filteredProducts) {
      const isUnpack = isProductUnpackaged(p);
      const ppc = getProductEffectiveCartonSize(p);
      if (!isUnpack && ppc > 1) {
        cartons += Math.floor((p.stockPieces || 0) / ppc);
      }
      pieces += (p.stockPieces || 0);
      purchaseVal += (p.stockPieces || 0) * (p.purchasePrice || 0);
      salesVal += (p.stockPieces || 0) * (p.sellingPrice || 0);
    }

    const profit = salesVal - purchaseVal;
    const markup = purchaseVal > 0 ? (profit / purchaseVal) * 100 : 0;

    return {
      count: filteredProducts.length,
      cartons,
      pieces,
      purchaseVal,
      salesVal,
      profit,
      markup
    };
  }, [filteredProducts]);

  const handleCopySummary = () => {
    const text = `📊 گزارش ارزش و موجودی انبار:
📦 موجودی کارتن‌ها: ${toPersianDigits(totalPackagedCartons)} کارتن (${toPersianDigits(totalPackagedLoosePieces)} دانه تک در کارتن باز)
📦 کالای بدون بسته‌بندی / فله: ${toPersianDigits(totalUnpackagedPieces.toLocaleString())} دانه
🔢 کل موجودی فیزیکی انبار: ${toPersianDigits(totalPieces.toLocaleString())} عدد
💰 ارزش کل سرمایه خرید: ${formatPrice(totalPurchaseValue)}
📈 ارزش کل فروش بالقوه: ${formatPrice(totalSalesValue)}
✨ سود پیش‌بینی شده: ${formatPrice(totalProfit)} (ضریب سود: +${toPersianDigits(overallMarkup.toFixed(1))}٪ | حاشیه سود: ${toPersianDigits(overallMargin.toFixed(1))}٪)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-7xl mx-auto pb-24 space-y-6 dir-rtl"
    >
      {/* Top Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-2xs border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <button
            id="back-to-inventory-btn"
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-95"
            title="بازگشت به فهرست مدیریت کالاها"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به لیست کالاها</span>
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>گزارش جامع موجودی، کارتن‌ها و ارزش سرمایه انبار</span>
              <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {toPersianDigits(products.length)} قلم کالا
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              صورت‌وضعیت دقیق مالی سرمایه انبار، تفکیک صحیح کارتن و دانه‌ای، تحلیل نرخ خرید و فروش و سود هر قلم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="copy-summary-btn"
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-95"
            title="کپی متن خلاصه ارزش و موجودی انبار"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-black">کپی شد!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>کپی خلاصه آماری</span>
              </>
            )}
          </button>

          <button
            id="print-report-btn"
            type="button"
            onClick={() => window.print()}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black text-white ${theme.primary} ${theme.primaryHover} shadow-xs transition-all cursor-pointer active:scale-95`}
            title="چاپ رسمی صورت موجودی و ارزش انبار"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ گزارش انبار</span>
          </button>
        </div>
      </div>

      {/* 4 Financial & Volume KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        {/* Card 1: Total Volume Breakdown */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 font-bold text-xs">📦 موجودی کارتن‌ها و انبار</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/50">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1.5">
              <span>{toPersianDigits(totalPackagedCartons)}</span>
              <span className="text-xs text-slate-500 font-bold">کارتن کامل</span>
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span>دانه‌های تک در کارتن باز:</span>
                <b className="text-blue-600 dark:text-blue-400 font-bold">{toPersianDigits(totalPackagedLoosePieces)} عدد</b>
              </div>
              {totalUnpackagedPieces > 0 && (
                <div className="flex items-center justify-between">
                  <span>کالای بدون کارتن / فله:</span>
                  <b className="text-slate-700 dark:text-slate-300 font-bold">{toPersianDigits(totalUnpackagedPieces.toLocaleString())} عدد</b>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                <span>کل شمارش فیزیکی:</span>
                <b className="text-slate-800 dark:text-slate-200">{toPersianDigits(totalPieces.toLocaleString())} عدد</b>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Purchase Value / Capital */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 font-bold text-xs">💰 کل سرمایه خرید انبار</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white dir-ltr text-right">
              {!isSecretMode ? formatPrice(totalPurchaseValue) : '🔒 محرمانه'}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span>ارزش خرید کارتن‌دار:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 dir-ltr text-[10px]">
                  {!isSecretMode ? formatPrice(products.filter(p => !isProductUnpackaged(p) && getProductEffectiveCartonSize(p) > 1).reduce((s, p) => s + (p.stockPieces * p.purchasePrice), 0)) : '🔒'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>ارزش خرید کالای فله:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 dir-ltr text-[10px]">
                  {!isSecretMode ? formatPrice(products.filter(p => isProductUnpackaged(p) || getProductEffectiveCartonSize(p) <= 1).reduce((s, p) => s + (p.stockPieces * p.purchasePrice), 0)) : '🔒'}
                </span>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                مجموع بهای تمام‌شده خرید موجودی
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Potential Revenue / Sales Value */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 font-bold text-xs">📈 ارزش کل فروش انبار</span>
            <div className={`p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white dir-ltr text-right">
              {formatPrice(totalSalesValue)}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span>میانگین ارزش هر قلم کالا:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 dir-ltr text-[10px]">
                  {products.length > 0 ? formatPrice(Math.round(totalSalesValue / products.length)) : '۰'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>تعداد کل اقلام قابل عرضه:</span>
                <b className="text-emerald-600 dark:text-emerald-400 font-bold">{toPersianDigits(inStockCount)} از {toPersianDigits(products.length)} کالا</b>
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                درآمد ناخالص حاصل از تخلیه کامل موجودی
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Potential Gross Profit */}
        <div className="bg-white dark:bg-slate-900 p-4.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 font-bold text-xs">✨ سود ناخالص بالقوه</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-900/50">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
              {!isSecretMode ? (totalProfit >= 0 ? `+${formatPrice(totalProfit)}` : `-${formatPrice(Math.abs(totalProfit))}`) : '🔒 محرمانه'}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <span>ضریب سود بر خرید (Markup):</span>
                <b className="text-emerald-600 dark:text-emerald-400 font-black text-xs">
                  +{toPersianDigits(overallMarkup.toFixed(1))}٪
                </b>
              </div>
              <div className="flex items-center justify-between">
                <span>حاشیه سود از فروش (Margin):</span>
                <b className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                  {toPersianDigits(overallMargin.toFixed(1))}٪
                </b>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                اختلاف کل ارزش فروش منهای کل ارزش خرید
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            <input
              id="audit-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام کالا، کد، دسته‌بندی یا مشخصات بسته‌بندی..."
              className="w-full pr-10 pl-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-bold focus:outline-none focus:border-slate-400 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-between sm:justify-start">
            {/* Hide Zero Stock Checkbox / Toggle */}
            <label 
              id="toggle-hide-zero-stock-audit"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer select-none shrink-0 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
              title="عدم نمایش کالاهایی با موجودی صفر در جدول و آمار فیلترشده"
            >
              <input
                type="checkbox"
                checked={hideZeroStock}
                onChange={(e) => {
                  const val = e.target.checked;
                  setHideZeroStock(val);
                  if (val && stockFilter === 'zero') {
                    setStockFilter('all');
                  }
                }}
                className="w-4 h-4 rounded text-teal-600 focus:ring-0 cursor-pointer accent-teal-600"
              />
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 whitespace-nowrap">
                عدم نمایش موجودی صفر (فقط کالاهای موجود)
              </span>
              {hideZeroStock && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  فعال
                </span>
              )}
            </label>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-400 text-xs font-bold shrink-0 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>مرتب‌سازی:</span>
              </span>
              <select
                id="audit-sort-select"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortFieldType)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="default">پیش‌فرض (ترتیب ثبت)</option>
                <option value="profit_desc">بیشترین سود پیش‌بینی‌شده کل (نزولی)</option>
                <option value="profit_asc">کمترین سود / زیان کل (صعودی)</option>
                <option value="margin_desc">بیشترین درصد سود (Markup %)</option>
                <option value="purchase_val_desc">بیشترین ارزش سرمایه خرید</option>
                <option value="sales_val_desc">بیشترین ارزش فروش بالقوه</option>
                <option value="stock_desc">بیشترین موجودی (تعداد کل)</option>
                <option value="stock_asc">کمترین موجودی (کسری موجودی)</option>
                <option value="cartons_desc">بیشترین کارتن کامل</option>
                <option value="name_asc">نام کالا (الفبا)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stock Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
              stockFilter === 'all'
                ? `${theme.primary} text-white border-transparent shadow-xs font-black`
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>همه اقلام</span>
            <span className="mr-1 text-[10px] opacity-80">({toPersianDigits(products.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('in_stock')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
              stockFilter === 'in_stock'
                ? 'bg-emerald-600 text-white border-transparent shadow-xs font-black'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>دارای موجودی</span>
            <span className="mr-1 text-[10px] opacity-80">({toPersianDigits(inStockCount)})</span>
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('low_stock')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
              stockFilter === 'low_stock'
                ? 'bg-amber-500 text-white border-transparent shadow-xs font-black'
                : 'bg-slate-50 dark:bg-slate-800 text-amber-700 dark:text-amber-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>کسری انبار (&lt; ۵ کارتن)</span>
            <span className="mr-1 text-[10px] opacity-80">({toPersianDigits(lowStockCount)})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStockFilter('zero');
              setHideZeroStock(false);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
              stockFilter === 'zero'
                ? 'bg-rose-600 text-white border-transparent shadow-xs font-black'
                : 'bg-slate-50 dark:bg-slate-800 text-rose-700 dark:text-rose-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>موجودی صفر / ناموجود</span>
            <span className="mr-1 text-[10px] opacity-80">({toPersianDigits(zeroStockCount)})</span>
          </button>

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" />

          <button
            type="button"
            onClick={() => setStockFilter('packaged')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
              stockFilter === 'packaged'
                ? 'bg-blue-600 text-white border-transparent shadow-xs font-black'
                : 'bg-slate-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>کارتن‌دار</span>
            <span className="mr-1 text-[10px] opacity-80">({toPersianDigits(packagedCount)})</span>
          </button>

          <button
            type="button"
            onClick={() => setStockFilter('unpackaged')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap border ${
              stockFilter === 'unpackaged'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-transparent shadow-xs font-black'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>بدون کارتن / فله</span>
            <span className="mr-1 text-[10px] opacity-80">({toPersianDigits(unpackagedCount)})</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 text-[11px] font-bold shrink-0 ml-1">دسته‌بندی:</span>
          {categories.map((cat, cIdx) => {
            const isSelected = selectedCategory === cat;
            const count = cat === 'all' 
              ? products.length 
              : products.filter(p => p.category === cat).length;

            return (
              <button
                key={`audit-cat-${cat || 'all'}-${cIdx}`}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? `${theme.primary} text-white border-transparent shadow-xs font-black`
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat === 'all' ? 'همه دسته‌ها' : cat}
                <span className="opacity-75 mr-1 text-[10px]">({toPersianDigits(count)})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Report Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs sm:text-[13px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-black border-b border-slate-200 dark:border-slate-800 text-xs sm:text-[13px] select-none">
                <th className="py-3 px-2 text-center w-12 font-black">ردیف</th>
                <th className="py-3 px-3 min-w-[160px] font-black text-right">شرح و نام کالا</th>
                <th className="py-3 px-3 text-center min-w-[140px] font-black">موجودی، کارتن و بسته‌بندی</th>
                <th className="py-3 px-3 text-center min-w-[130px] font-black">نرخ خرید و فروش</th>
                <th className="py-3 px-3 text-center min-w-[140px] font-black">سود و زیان هر قلم</th>
                <th className="py-3 px-3 text-center min-w-[140px] font-black">ارزش کل موجودی</th>
                <th className="py-3 px-3 text-center w-24 font-black">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <span>کالایی با فیلترها و معیارهای انتخاب‌شده یافت نشد.</span>
                    {hideZeroStock && zeroStockCount > 0 && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => setHideZeroStock(false)}
                          className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800 text-xs font-black hover:bg-teal-100 transition-colors cursor-pointer"
                        >
                          نمایش {toPersianDigits(zeroStockCount)} کالای ناموجود (برداشتن تیک عدم نمایش موجودی صفر)
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod, idx) => {
                  const isUnpack = isProductUnpackaged(prod);
                  const ppc = getProductEffectiveCartonSize(prod);
                  const stockPieces = prod.stockPieces || 0;

                  // Carton & loose pieces calculation
                  let cartons = 0;
                  let remainderPieces = 0;
                  if (!isUnpack && ppc > 1) {
                    cartons = Math.floor(stockPieces / ppc);
                    remainderPieces = stockPieces % ppc;
                  } else {
                    remainderPieces = stockPieces;
                  }

                  // Financial calculations
                  const purchasePrice = prod.purchasePrice || 0;
                  const sellingPrice = prod.sellingPrice || 0;
                  const unitProfit = sellingPrice - purchasePrice;
                  const cartonProfit = (!isUnpack && ppc > 1) ? unitProfit * ppc : 0;
                  const itemPurchaseVal = stockPieces * purchasePrice;
                  const itemSalesVal = stockPieces * sellingPrice;
                  const itemTotalProfit = stockPieces * unitProfit;
                  const markupPercent = purchasePrice > 0 ? (unitProfit / purchasePrice) * 100 : 0;

                  return (
                    <tr 
                      key={`audit-prod-${prod.id || idx}-${idx}`} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Row Index */}
                      <td className="py-2 px-2 text-center font-bold text-slate-400 text-[11px]">
                        {toPersianDigits(startIndex + idx + 1)}
                      </td>

                      {/* Product Name & Details */}
                      <td className="py-2 px-2.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <div className="font-black text-slate-900 dark:text-white text-xs">
                              {prod.name}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[9px] border border-slate-200 dark:border-slate-700">
                                {prod.category || 'سایر'}
                              </span>
                              {prod.code && (
                                <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500">
                                  کد: {toPersianDigits(prod.code)}
                                </span>
                              )}
                            </div>
                            {prod.notes && (
                              <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[160px]" title={prod.notes}>
                                {prod.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Unified Stock, Carton & Packaging Cell */}
                      <td className="py-2 px-2">
                        <div className="flex flex-col items-center justify-center gap-1 text-center min-w-[125px]">
                          {/* Total Stock Count */}
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {toPersianDigits(stockPieces.toLocaleString())}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                              {prod.unitTitle || 'عدد'}
                            </span>
                          </div>

                          {/* Carton Breakdown Badge */}
                          {stockPieces <= 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-bold text-[9px] whitespace-nowrap">
                              موجودی صفر
                            </span>
                          ) : isUnpack || ppc <= 1 ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-[9px] whitespace-nowrap">
                              بدون کارتن (دانه‌ای)
                            </span>
                          ) : cartons > 0 && remainderPieces > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 font-black text-[10px] whitespace-nowrap">
                              {toPersianDigits(cartons)} کارتن + {toPersianDigits(remainderPieces)} دانه
                            </span>
                          ) : cartons > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 font-black text-[10px] whitespace-nowrap">
                              {toPersianDigits(cartons)} کارتن کامل
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 font-black text-[9px] whitespace-nowrap">
                              {toPersianDigits(remainderPieces)} دانه (&lt; ۱ کارتن)
                            </span>
                          )}

                          {/* Packaging Spec */}
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.2 rounded border border-slate-200/60 dark:border-slate-700/60 max-w-[145px] truncate" title={formatProductPackagingSpec(prod)}>
                            {formatProductPackagingSpec(prod)}
                          </div>
                        </div>
                      </td>

                      {/* Buy Price & Sell Price Unified Cell */}
                      <td className="py-2 px-2">
                        <div className="flex flex-col gap-0.5 min-w-[115px] max-w-[140px] mx-auto text-[11px]">
                          {/* Purchase Price */}
                          <div className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70">
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">خرید:</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 dir-ltr text-[10px]">
                              {!isSecretMode ? formatPrice(purchasePrice) : '🔒'}
                            </span>
                          </div>

                          {/* Selling Price */}
                          <div className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50">
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">فروش:</span>
                            <span className="font-black text-emerald-800 dark:text-emerald-300 dir-ltr text-[10px]">
                              {formatPrice(sellingPrice)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Profit & Margin Column */}
                      <td className="py-2 px-2">
                        <div className="flex flex-col gap-0.5 min-w-[130px] max-w-[160px] mx-auto text-[11px]">
                          {/* Per-Unit Profit */}
                          <div className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
                            unitProfit > 0 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                              : unitProfit < 0
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            <span className="text-[9px] font-bold opacity-80">سود دانه:</span>
                            <span className="font-black dir-ltr text-[10px]">
                              {!isSecretMode ? (
                                unitProfit > 0 
                                  ? `+${formatPrice(unitProfit)}` 
                                  : unitProfit < 0 
                                    ? `-${formatPrice(Math.abs(unitProfit))}` 
                                    : '۰'
                              ) : '🔒'}
                            </span>
                          </div>

                          {/* Total Potential Profit for Current Stock */}
                          <div className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded border text-[10px] ${
                            itemTotalProfit > 0 
                              ? 'bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700' 
                              : itemTotalProfit < 0
                                ? 'bg-rose-100/70 dark:bg-rose-900/40 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold">کل:</span>
                              {!isSecretMode && (
                                <span className={`text-[8px] font-black px-1 py-0.2 rounded ${unitProfit >= 0 ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100' : 'bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-100'}`}>
                                  {markupPercent >= 0 ? '+' : ''}{toPersianDigits(markupPercent.toFixed(0))}٪
                                </span>
                              )}
                            </div>
                            <span className="font-black dir-ltr text-[11px]">
                              {!isSecretMode ? (
                                itemTotalProfit > 0 
                                  ? `+${formatPrice(itemTotalProfit)}` 
                                  : itemTotalProfit < 0 
                                    ? `-${formatPrice(Math.abs(itemTotalProfit))}` 
                                    : '۰'
                              ) : '🔒'}
                            </span>
                          </div>

                          {/* Per Carton Profit if applicable */}
                          {!isUnpack && ppc > 1 && !isSecretMode && (
                            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between px-1">
                              <span>سود کارتن:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300 dir-ltr text-[9px]">
                                {cartonProfit >= 0 ? `+${formatPrice(cartonProfit)}` : `-${formatPrice(Math.abs(cartonProfit))}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Capital (Purchase & Sales) */}
                      <td className="py-2 px-2">
                        <div className="flex flex-col gap-0.5 min-w-[120px] max-w-[145px] mx-auto text-[10px]">
                          {/* Total Purchase Capital */}
                          <div className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                            <span className="font-bold text-amber-700 dark:text-amber-400">سرمایه:</span>
                            <span className="font-black text-amber-900 dark:text-amber-200 dir-ltr text-[10px]">
                              {!isSecretMode ? formatPrice(itemPurchaseVal) : '🔒'}
                            </span>
                          </div>

                          {/* Total Sales Value */}
                          <div className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                            <span className="font-bold text-blue-700 dark:text-blue-400">فروش:</span>
                            <span className="font-black text-blue-900 dark:text-blue-200 dir-ltr text-[10px]">
                              {formatPrice(itemSalesVal)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Stock Status Pill */}
                      <td className="py-2 px-2 text-center">
                        {stockPieces <= 0 ? (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 block whitespace-nowrap">
                            ناموجود
                          </span>
                        ) : (!isUnpack && ppc > 1 ? cartons < 5 : stockPieces < 20) ? (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 block whitespace-nowrap">
                            کسری انبار
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 block whitespace-nowrap">
                            موجود
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Totals */}
            {filteredProducts.length > 0 && (
              <tfoot className="bg-slate-100/90 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200">
                <tr>
                  {/* Col 1 & 2: Row count & Filter summary */}
                  <td colSpan={2} className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="leading-tight">
                        <div className="font-black text-slate-900 dark:text-white text-xs">
                          مجموع ردیف‌های فیلترشده
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                          ({toPersianDigits(filteredTotals.count)} قلم کالا)
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Col 3: Total Stock & Cartons */}
                  <td className="py-3 px-2 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="flex items-baseline justify-center gap-1 font-black text-slate-900 dark:text-white">
                        <span className="text-xs">{toPersianDigits(filteredTotals.pieces.toLocaleString())}</span>
                        <span className="text-[10px] text-slate-500 font-bold">دانه کل</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 font-black text-[10px] whitespace-nowrap">
                        {toPersianDigits(filteredTotals.cartons)} کارتن کل
                      </span>
                    </div>
                  </td>

                  {/* Col 4: Rates label */}
                  <td className="py-3 px-2 text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                    میانگین انبار
                  </td>

                  {/* Col 5: Total Profit & Markup */}
                  <td className="py-3 px-2 text-center">
                    {!isSecretMode ? (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center justify-center gap-1 font-black text-xs text-emerald-700 dark:text-emerald-400 dir-ltr">
                          <span>
                            {filteredTotals.profit >= 0 
                              ? `+${formatPrice(filteredTotals.profit)}` 
                              : `-${formatPrice(Math.abs(filteredTotals.profit))}`}
                          </span>
                        </div>
                        <span className="text-[9px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                          سود میانگین: +{toPersianDigits(filteredTotals.markup.toFixed(1))}٪
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">🔒</span>
                    )}
                  </td>

                  {/* Col 6: Total Capital (Purchase & Sales) */}
                  <td className="py-3 px-2">
                    <div className="flex flex-col gap-1 text-[10px] min-w-[120px] max-w-[145px] mx-auto">
                      <div className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200">
                        <span className="font-bold text-amber-700 dark:text-amber-400">سرمایه:</span>
                        <span className="font-black dir-ltr text-[10px]">
                          {!isSecretMode ? formatPrice(filteredTotals.purchaseVal) : '🔒'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-blue-900 dark:text-blue-200">
                        <span className="font-bold text-blue-700 dark:text-blue-400">فروش:</span>
                        <span className="font-black dir-ltr text-[10px]">
                          {formatPrice(filteredTotals.salesVal)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Col 7: Status column */}
                  <td className="py-3 px-2 text-center">
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700 block whitespace-nowrap">
                      تراز کل
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedProducts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          itemsPerPageOptions={[10, 20, 50, 100]}
          itemName="کالا در گزارش"
          themeColor={settings.themeColor}
        />
      </div>
    </motion.div>
  );
};
