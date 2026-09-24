import React, { useState } from 'react';
import { Invoice, StoreSettings, ProductReturn, Product } from '../types';
import { formatPrice, toPersianDigits, getNetReturnAmount } from '../utils/formatters';
import { 
  FileText, 
  Search, 
  Plus, 
  Eye, 
  Edit3, 
  Trash2, 
  Receipt,
  Package,
  FileClock,
  Layers,
  RotateCcw,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Banknote,
  CreditCard,
  Clock,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { themes, getThemeBadges } from './ThemeConfig';
import { Pagination } from './Pagination';
import { calculateInwardInvoiceSellThrough } from '../utils/inwardSellThrough';
import { SortableTableHeader } from './SortableTableHeader';

interface InvoiceListProps {
  invoices: Invoice[];
  products?: Product[];
  settings: StoreSettings;
  isSecretMode: boolean;
  productReturns?: ProductReturn[];
  initialFilter?: 'all' | 'sale' | 'purchase' | 'drafts';
  onFilterChange?: (filter: 'all' | 'sale' | 'purchase' | 'drafts') => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onNewInvoice: (type?: 'sale' | 'purchase') => void;
  onOpenProfitAnalysis: (invoice: Invoice) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  products = [],
  settings,
  isSecretMode,
  productReturns = [],
  initialFilter = 'all',
  onFilterChange,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onNewInvoice,
}) => {
  const theme = themes[settings.themeColor] || themes.teal;
  const badges = getThemeBadges(settings.themeColor);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'purchase' | 'drafts'>(initialFilter);
  type InvoiceSortField = 'customer' | 'date' | 'status' | 'amount';
  const [sortField, setSortField] = useState<InvoiceSortField>('date');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const handleSort = (field: InvoiceSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection(field === 'customer' ? 'asc' : 'desc');
    }
  };

  // Synchronize when initialFilter changes from external navigation (e.g. from Dashboard)
  React.useEffect(() => {
    if (initialFilter) {
      setFilterType(initialFilter);
    }
  }, [initialFilter]);

  const handleSelectFilter = (type: 'all' | 'sale' | 'purchase' | 'drafts') => {
    setFilterType(type);
    onFilterChange?.(type);
  };

  // Helper to dynamically calculate invoice subtotal linked to item selling prices & catalog
  const getInvoiceEffectiveSubtotal = (inv: Invoice): number => {
    if (!inv || !inv.items || inv.items.length === 0) return inv?.subtotal || 0;
    if (inv.type === 'purchase') {
      return (inv.items || []).reduce((sum, item) => {
        const prod = products.find(p => p.id === item.productId || p.name?.trim().toLowerCase() === item.productName?.trim().toLowerCase());
        const uPrice = (item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0)
          ? item.unitPurchasePrice
          : ((prod && prod.purchasePrice > 0) ? prod.purchasePrice : (item.unitSellingPrice || 0));
        return sum + (item.totalPieces * uPrice);
      }, 0);
    }
    return (inv.items || []).reduce((sum, item) => {
      const uPrice = (item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
        ? item.unitSellingPrice
        : (item.totalPieces > 0 && item.totalPrice > 0 ? Math.round(item.totalPrice / item.totalPieces) : (item.unitPrice || 0));
      return sum + (uPrice > 0 ? uPrice * item.totalPieces : (item.totalPrice || 0));
    }, 0);
  };

  // Helper to dynamically calculate effective final amount linked to item prices and returns
  const getInvoiceEffectiveAmount = (inv: Invoice): number => {
    const calculatedSub = getInvoiceEffectiveSubtotal(inv);
    const offsetReturns = inv.offsetReturnsTotal || 0;
    return Math.max(0, calculatedSub - (inv.discount || 0) + (inv.tax || 0) - offsetReturns);
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Statistics Calculations for Archive
  const totalInvoicesCount = invoices.length;
  const salesInvoices = invoices.filter(i => i.type === 'sale');
  const purchaseInvoices = invoices.filter(i => i.type === 'purchase');
  const draftInvoicesCount = invoices.filter(i => i.isDraft).length;

  const totalSalesRevenue = salesInvoices.reduce((sum, inv) => {
    const invReturns = (productReturns || []).filter(r => r.type === 'from_customer' && (r.invoiceId === inv.id || r.invoiceNumber === inv.invoiceNumber));
    const retAmount = invReturns.reduce((s, r) => s + getNetReturnAmount(r), 0);
    const effAmount = getInvoiceEffectiveAmount(inv);
    return sum + Math.max(0, effAmount - retAmount);
  }, 0);

  const totalPurchaseValue = purchaseInvoices.reduce((sum, inv) => {
    const invReturns = (productReturns || []).filter(r => r.type === 'to_supplier' && (r.invoiceId === inv.id || r.invoiceNumber === inv.invoiceNumber));
    const retAmount = invReturns.reduce((s, r) => s + getNetReturnAmount(r), 0);
    const effAmount = getInvoiceEffectiveAmount(inv);
    return sum + Math.max(0, effAmount - retAmount);
  }, 0);

  const filteredInvoices = invoices.filter(inv => {
    let matchesType = true;
    if (filterType === 'sale') matchesType = inv.type === 'sale';
    else if (filterType === 'purchase') matchesType = inv.type === 'purchase';
    else if (filterType === 'drafts') matchesType = inv.isDraft === true;

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.customerPhone.toLowerCase().includes(q) ||
      inv.customerCity.toLowerCase().includes(q) ||
      inv.items.some(it => it.productName.toLowerCase().includes(q))
    );
    return matchesType && matchesSearch;
  });

  // Reset page on filter or sort change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery, sortField, sortDirection]);

  // Multi-column sorting
  const sortedInvoices = React.useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'customer') {
        cmp = (a.customerName || '').localeCompare(b.customerName || '', 'fa');
      } else if (sortField === 'amount') {
        const amtA = a.finalAmount ?? a.totalAmount ?? 0;
        const amtB = b.finalAmount ?? b.totalAmount ?? 0;
        cmp = amtA - amtB;
      } else if (sortField === 'status') {
        const statA = a.paymentStatus || 'cash';
        const statB = b.paymentStatus || 'cash';
        cmp = statA.localeCompare(statB);
      } else {
        // Date / Document
        const timeA = a.createdAt || a.timestamp || (a.date ? new Date(a.date.replace(/\//g, '-')).getTime() || 0 : 0);
        const timeB = b.createdAt || b.timestamp || (b.date ? new Date(b.date.replace(/\//g, '-')).getTime() || 0 : 0);
        if (timeA && timeB && timeA !== timeB) {
          cmp = timeA - timeB;
        } else {
          cmp = (a.date || '').localeCompare(b.date || '');
          if (cmp === 0) {
            cmp = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
          }
        }
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredInvoices, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = sortedInvoices.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="w-full space-y-5 pb-20 no-print transition-colors dir-rtl">
      {/* Executive Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-2xs transition-colors">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} text-xs font-black border ${theme.borderColor} shadow-2xs`}>
              <Receipt className="w-3.5 h-3.5" />
              <span>آرشیو و بایگانی اسناد مالی</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>{toPersianDigits(totalInvoicesCount)} فاکتور ثبت شده</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
              <FileText className="w-5 h-5" />
            </div>
            <span>مدیریت و بایگانی فاکتورها</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
            فهرست کامل فاکتورهای فروش، ورود کالا (خرید)، پیش‌نویس‌های تجاری و صدور فاکتورهای رسمی با محاسبه سود
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="invoice-list-new-purchase-btn"
            type="button"
            onClick={() => onNewInvoice('purchase')}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl ${theme.badgeBg} ${theme.primaryText} border ${theme.borderColor} hover:bg-slate-100 dark:hover:bg-slate-800 font-black text-xs shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer`}
            title="ثبت ورود کالا به انبار و صدور فاکتور خرید"
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>+ ورود کالا (خرید)</span>
          </button>
          <button
            id="invoice-list-new-sale-btn"
            type="button"
            onClick={() => onNewInvoice('sale')}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs sm:text-sm shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer`}
            title="صدور فاکتور خروج کالا و فروش به مشتری"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>+ فاکتور فروش (خروج)</span>
          </button>
        </div>
      </div>

      {/* Archive Statistics Summary Cards - Rounded-3xl Style like ReturnsManager */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
        
        {/* Total Documents */}
        <div 
          onClick={() => handleSelectFilter('all')}
          className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
            filterType === 'all'
              ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
              : 'border-blue-200/70 dark:border-blue-900/40'
          }`}
          title="کلیک برای نمایش تمام فاکتورها و اسناد"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <span>تعداد کل اسناد</span>
              {filterType === 'all' && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-500 text-white">فعال</span>
              )}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {toPersianDigits(totalInvoicesCount)} <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">سند</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>آرشیو کل اسناد سیستم:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
              {toPersianDigits(totalInvoicesCount)} سند
            </span>
          </div>
        </div>

        {/* Sales Invoices */}
        <div 
          onClick={() => handleSelectFilter('sale')}
          className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
            filterType === 'sale'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
              : 'border-emerald-200/70 dark:border-emerald-900/40'
          }`}
          title="کلیک برای نمایش فاکتورهای فروش"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span>فاکتورهای فروش</span>
              {filterType === 'sale' && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white">فعال</span>
              )}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {toPersianDigits(salesInvoices.length)} <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">فاکتور</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>مجموع گردش فروش:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatPrice(totalSalesRevenue)}
            </span>
          </div>
        </div>

        {/* Purchase Invoices / Goods Entry */}
        <div 
          onClick={() => handleSelectFilter('purchase')}
          className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
            filterType === 'purchase'
              ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-sm'
              : 'border-purple-200/70 dark:border-purple-900/40'
          }`}
          title="کلیک برای نمایش اسناد ورود کالا و خرید"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
              <span>ورود کالا (خرید)</span>
              {filterType === 'purchase' && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-purple-500 text-white">فعال</span>
              )}
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {toPersianDigits(purchaseInvoices.length)} <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">فاکتور</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>{!isSecretMode ? 'جمع بهای تأمین:' : 'وضعیت تأمین:'}</span>
            <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">
              {!isSecretMode ? formatPrice(totalPurchaseValue) : 'اسناد تأیید شده'}
            </span>
          </div>
        </div>

        {/* Draft Invoices */}
        <div 
          onClick={() => handleSelectFilter('drafts')}
          className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-xs relative overflow-hidden group hover:shadow-md transition-all cursor-pointer ${
            filterType === 'drafts'
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
              : 'border-amber-200/70 dark:border-amber-900/40'
          }`}
          title="کلیک برای نمایش فاکتورهای پیش‌نویس بلاتکلیف"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <span>پیش‌نویس‌ها و موقت</span>
              {filterType === 'drafts' && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white">فعال</span>
              )}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800">
              <FileClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {toPersianDigits(draftInvoicesCount)} <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">پیش‌نویس</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>در انتظار نهایی‌سازی:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
              {toPersianDigits(draftInvoicesCount)} سند موقت
            </span>
          </div>
        </div>

      </div>

      {/* Filter & Search Toolbar - Unified Theme */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
        {/* Search Input */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی شماره فاکتور، مشتری، شهر یا کالا..."
            className="w-full pr-10 pl-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-black dark:text-white placeholder-slate-500 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 shadow-2xs transition-colors"
          />
        </div>

        {/* Filter Type Tabs - Unified Theme Palette */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
            <button
              onClick={() => handleSelectFilter('all')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filterType === 'all'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>همه</span>
              <span className="text-[10px] opacity-90">({toPersianDigits(invoices.length)})</span>
            </button>
            <button
              onClick={() => handleSelectFilter('sale')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filterType === 'sale'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>فروش</span>
              <span className="text-[10px] opacity-90">({toPersianDigits(invoices.filter(i => i.type === 'sale').length)})</span>
            </button>
            <button
              onClick={() => handleSelectFilter('purchase')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filterType === 'purchase'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>ورود کالا</span>
              <span className="text-[10px] opacity-90">({toPersianDigits(invoices.filter(i => i.type === 'purchase').length)})</span>
            </button>
            <button
              onClick={() => handleSelectFilter('drafts')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                filterType === 'drafts'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileClock className="w-3.5 h-3.5" />
              <span>پیش‌نویس‌ها</span>
              <span className="text-[10px] opacity-90">({toPersianDigits(invoices.filter(i => i.isDraft).length)})</span>
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => handleSort('date')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 shadow-2xs whitespace-nowrap"
            title={sortDirection === 'desc' ? 'مرتب‌سازی: جدیدترین در ابتدا (کلیک برای صعودی/قدیمی‌ترین)' : 'مرتب‌سازی: قدیمی‌ترین در ابتدا (کلیک برای نزولی/جدیدترین)'}
          >
            {sortDirection === 'desc' ? (
              <ArrowDownWideNarrow className={`w-3.5 h-3.5 ${theme.primaryText} shrink-0`} />
            ) : (
              <ArrowUpNarrowWide className={`w-3.5 h-3.5 ${theme.primaryText} shrink-0`} />
            )}
            <span>{sortDirection === 'desc' ? 'جدیدترین' : 'قدیمی‌ترین'}</span>
          </button>
        </div>
      </div>

      {/* Invoices Data Grid - Streamlined Professional Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden transition-colors">
        {sortedInvoices.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p>هیچ فاکتوری با مشخصات جستجو شده یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11.5px] select-none">
                <tr>
                  {/* Column 1: Customer / Party */}
                  <SortableTableHeader
                    field="customer"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="min-w-[200px]"
                  >
                    طرف‌حساب / مشتری
                  </SortableTableHeader>

                  {/* Column 2: Date, Document Number & Type */}
                  <SortableTableHeader
                    field="date"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="min-w-[170px]"
                  >
                    تاریخ و شماره سند
                  </SortableTableHeader>

                  {/* Column 3: Settlement Status & Method */}
                  <SortableTableHeader
                    field="status"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="min-w-[180px]"
                  >
                    نحوه و وضعیت تسویه
                  </SortableTableHeader>

                  {/* Column 4: Amount & Items Count */}
                  <SortableTableHeader
                    field="amount"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                    className="min-w-[180px]"
                  >
                    مبلغ نهایی و اقلام
                  </SortableTableHeader>

                  {/* Column 5: Actions */}
                  <th className="p-3.5 text-center whitespace-nowrap min-w-[140px]">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedInvoices.map((inv, index) => {
                  const isPurchaseMode = inv.type === 'purchase';

                  // Calculate effective and original gross amounts linked to catalog and returns
                  const matchedReturns = (productReturns || []).filter(r => {
                    if (isPurchaseMode && r.type !== 'to_supplier') return false;
                    if (!isPurchaseMode && r.type !== 'from_customer') return false;
                    if (r.invoiceId && r.invoiceId === inv.id) return true;
                    if (r.invoiceNumber && r.invoiceNumber === inv.invoiceNumber) return true;
                    const sameCust = inv.customerName && r.customerName?.trim().toLowerCase() === inv.customerName?.trim().toLowerCase();
                    const itemInInvoice = inv.items.some(it => it.productId === r.productId || it.productName?.trim().toLowerCase() === it.productName?.trim().toLowerCase());
                    return sameCust && itemInInvoice && (r.invoiceNumber === inv.invoiceNumber || r.invoiceId === inv.id);
                  });

                  const totalReturnsAmount = matchedReturns.reduce((sum, r) => sum + getNetReturnAmount(r), 0);

                  // 1. Current items sum
                  const itemsCurrentSubtotal = isPurchaseMode
                    ? (inv.items || []).reduce((sum, item) => {
                        const prod = products.find(p => p.id === item.productId || p.name?.trim().toLowerCase() === item.productName?.trim().toLowerCase());
                        const uPrice = (item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0)
                          ? item.unitPurchasePrice
                          : ((prod && prod.purchasePrice > 0) ? prod.purchasePrice : (item.unitSellingPrice || 0));
                        return sum + (item.totalPieces * uPrice);
                      }, 0)
                    : (inv.items || []).reduce((sum, item) => {
                        const uPrice = (item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
                          ? item.unitSellingPrice
                          : (item.totalPieces > 0 && item.totalPrice > 0 ? Math.round(item.totalPrice / item.totalPieces) : (item.unitPrice || 0));
                        return sum + (uPrice > 0 ? uPrice * item.totalPieces : (item.totalPrice || 0));
                      }, 0);

                  // 2. Original items sum
                  const itemsOriginalSubtotal = isPurchaseMode
                    ? (inv.items || []).reduce((sum, item) => {
                        const prod = products.find(p => p.id === item.productId || p.name?.trim().toLowerCase() === item.productName?.trim().toLowerCase());
                        const uPrice = (item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0)
                          ? item.unitPurchasePrice
                          : ((prod && prod.purchasePrice > 0) ? prod.purchasePrice : (item.unitSellingPrice || 0));
                        const origPieces = (item.originalTotalPieces !== undefined && item.originalTotalPieces > item.totalPieces)
                          ? item.originalTotalPieces
                          : item.totalPieces;
                        const origTot = (item.originalTotalPrice !== undefined && item.originalTotalPrice > 0)
                          ? item.originalTotalPrice
                          : (origPieces * uPrice);
                        return sum + origTot;
                      }, 0)
                    : (inv.items || []).reduce((sum, item) => {
                        const uPrice = (item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
                          ? item.unitSellingPrice
                          : (item.totalPieces > 0 && item.totalPrice > 0 ? Math.round(item.totalPrice / item.totalPieces) : (item.unitPrice || 0));
                        const origPieces = (item.originalTotalPieces !== undefined && item.originalTotalPieces > item.totalPieces)
                          ? item.originalTotalPieces
                          : item.totalPieces;
                        return sum + (uPrice > 0 ? origPieces * uPrice : (item.totalPrice || 0));
                      }, 0);

                  // Full original gross before returns
                  const rawGrossSubtotal = totalReturnsAmount > 0
                    ? (itemsOriginalSubtotal > itemsCurrentSubtotal
                        ? itemsOriginalSubtotal
                        : (itemsCurrentSubtotal + totalReturnsAmount))
                  : itemsCurrentSubtotal;

                  const grossOriginalAmount = Math.max(0, rawGrossSubtotal - (inv.discount || 0) + (inv.tax || 0));
                  const effectiveFinalAmount = Math.max(0, grossOriginalAmount - totalReturnsAmount);
                  const hasReturns = totalReturnsAmount > 0;
                  const inwardSellThrough = (isPurchaseMode && !inv.isDraft)
                    ? calculateInwardInvoiceSellThrough(inv, invoices, products)
                    : null;

                  return (
                    <tr 
                      key={`inv-row-${inv.id || index}-${index}`}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Column 1: Customer / Party */}
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                          <span className="truncate max-w-[220px]">{inv.customerName}</span>
                          {(inv.customerName.includes('مدیریت انبار') || isPurchaseMode) && (
                            <span className={`px-1.5 py-0.5 ${badges.supplier} font-bold text-[9px] rounded-md whitespace-nowrap shrink-0`}>
                              تأمین‌کننده
                            </span>
                          )}
                        </div>
                        {inv.customerCity ? (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate max-w-[220px]">
                            {inv.customerCity} {inv.customerPhone ? `• ${toPersianDigits(inv.customerPhone)}` : ''}
                          </div>
                        ) : inv.customerPhone ? (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {toPersianDigits(inv.customerPhone)}
                          </div>
                        ) : null}
                      </td>

                      {/* Column 2: Date, Document Number & Type */}
                      <td className="p-3.5 space-y-1.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-900 dark:text-slate-100 font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                            #{toPersianDigits(inv.invoiceNumber)}
                          </span>
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-300 font-bold">
                            {toPersianDigits(inv.date)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {inv.isDraft ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${badges.draft}`}>
                              <FileClock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>پیش‌نویس موقت</span>
                            </span>
                          ) : isPurchaseMode ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${badges.purchase}`}>
                              <Package className={`w-3 h-3 ${badges.purchaseIcon} shrink-0`} />
                              <span>ورود کالا (خرید)</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${badges.sale}`}>
                              <Receipt className={`w-3 h-3 ${badges.saleIcon} shrink-0`} />
                              <span>فاکتور فروش</span>
                            </span>
                          )}

                          {totalReturnsAmount > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <RotateCcw className="w-2.5 h-2.5 shrink-0" />
                              <span>مرجوعی: -{formatPrice(totalReturnsAmount)}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Settlement Method & Status (SWAPPED) */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {inv.paymentMethod?.includes('نسیه') ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${badges.creditTerm} font-bold rounded-lg text-[10.5px] whitespace-nowrap`}>
                                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>نسیه (اعتباری)</span>
                              </span>
                            ) : inv.paymentMethod?.includes('چک') ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${badges.check} font-bold rounded-lg text-[10.5px] whitespace-nowrap`}>
                                <FileCheck className="w-3 h-3 shrink-0" />
                                <span>چک صیادی</span>
                              </span>
                            ) : inv.paymentMethod?.includes('کارت') || inv.paymentAccount === 'bank' ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${badges.bank} font-bold rounded-lg text-[10.5px] whitespace-nowrap`}>
                                <CreditCard className="w-3 h-3 shrink-0" />
                                <span>کارتخوان (بانک)</span>
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${badges.cash} font-bold rounded-lg text-[10.5px] whitespace-nowrap`}>
                                <Banknote className="w-3 h-3 text-slate-600 dark:text-slate-400 shrink-0" />
                                <span>{inv.paymentMethod || 'نقدی (صندوق)'}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[170px]">
                            {inv.paymentMethodDetails || (inv.paymentMethod?.includes('نسیه') ? 'ثبت در مانده‌حساب مشتری' : 'تسویه کامل انجام شد')}
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Amount & Items Count (SWAPPED) */}
                      <td className="p-3.5 whitespace-nowrap text-left dir-ltr">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded text-[10px] border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
                              {toPersianDigits(inv.items.length)} قلم کالا
                            </span>
                            <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                              {hasReturns ? (
                                <div className="text-left">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{formatPrice(effectiveFinalAmount)}</span>
                                  <span className="text-[10px] text-slate-400 line-through font-normal mr-1.5">{formatPrice(grossOriginalAmount)}</span>
                                </div>
                              ) : (
                                <span>{formatPrice(effectiveFinalAmount)}</span>
                              )}
                            </div>
                          </div>
                          {inv.discount && inv.discount > 0 ? (
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 dir-rtl">
                              تخفیف: {formatPrice(inv.discount)}
                            </span>
                          ) : hasReturns ? (
                            <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium dir-rtl">
                              پس از کسر مرجوعی
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium dir-rtl">
                              مبلغ خالص کل فاکتور
                            </span>
                          )}

                          {/* Sell-Through & Profit Status for Purchase/Inward Invoices */}
                          {inwardSellThrough && !isSecretMode && (
                            <div className="mt-1 flex items-center gap-1.5 justify-end flex-wrap dir-rtl">
                              {inwardSellThrough.isFullySold ? (
                                <>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${badges.profit} font-black text-[10px]`}>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>کاملاً فروخته شده (۱۰۰٪)</span>
                                  </span>
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${badges.profit} font-bold text-[10px] font-mono`}>
                                    <span>سود کل فروش:</span>
                                    <span className={`font-black ${badges.profitText}`}>+{formatPrice(inwardSellThrough.totalRealizedProfit)}</span>
                                  </span>
                                </>
                              ) : inwardSellThrough.percentSold > 0 ? (
                                <>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${badges.stock} font-bold text-[10px]`}>
                                    <span>{toPersianDigits(inwardSellThrough.percentSold)}٪ فروخته شده</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-amber-700 dark:text-amber-300">{toPersianDigits(inwardSellThrough.percentRemaining)}٪ مانده</span>
                                  </span>
                                  {inwardSellThrough.totalRealizedProfit > 0 && (
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${badges.profit} font-bold text-[10px] font-mono`}>
                                      <span>سود تا الان:</span>
                                      <span className={`font-black ${badges.profitText}`}>+{formatPrice(inwardSellThrough.totalRealizedProfit)}</span>
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${badges.draft} font-medium text-[10px]`}>
                                  <span>موجودی کامل در انبار (۰٪ فروش)</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 5: Actions */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                          <button
                            id={`invoice-view-btn-${inv.id || index}`}
                            type="button"
                            onClick={() => onViewInvoice(inv)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${theme.primary} text-white hover:opacity-95 text-[11px] font-black transition-all cursor-pointer shadow-xs whitespace-nowrap`}
                            title="مشاهده جزئیات و چاپ فاکتور"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            <span>مشاهده</span>
                          </button>

                          <button
                            id={`invoice-edit-btn-${inv.id || index}`}
                            type="button"
                            onClick={() => onEditInvoice(inv)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                            title="ویرایش فاکتور"
                          >
                            <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          </button>

                          <button
                            id={`invoice-delete-btn-${inv.id || index}`}
                            type="button"
                            onClick={() => setInvoiceToDelete(inv)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                            title="حذف سند فاکتور"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Unified Professional Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={sortedInvoices.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          itemsPerPageOptions={[10, 20, 50, 100]}
          itemName="فاکتور"
          themeColor={settings.themeColor}
        />
      </div>

      {/* Delete Invoice Modal - Flat */}
      <AnimatePresence>
        {invoiceToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 space-y-4 text-slate-900 dark:text-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg shrink-0 border border-rose-200 dark:border-rose-800">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    حذف فاکتور شماره #{toPersianDigits(invoiceToDelete.invoiceNumber)}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    طرف‌حساب: {invoiceToDelete.customerName}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-xs leading-relaxed text-rose-900 dark:text-rose-200 font-medium border border-rose-200 dark:border-rose-900">
                آیا از حذف دائم این فاکتور به مبلغ <span className="font-bold">{formatPrice(invoiceToDelete.finalAmount)}</span> اطمینان دارید؟
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInvoiceToDelete(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteInvoice(invoiceToDelete.id);
                    setInvoiceToDelete(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  حذف فاکتور
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
