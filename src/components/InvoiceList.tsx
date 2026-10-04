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
  CheckCircle2,
  Percent,
  Truck
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

  // Helper to dynamically calculate effective final amount linked to item prices, returns, and expenses
  const getInvoiceEffectiveAmount = (inv: Invoice): number => {
    const calculatedSub = getInvoiceEffectiveSubtotal(inv);
    const offsetReturns = inv.offsetReturnsTotal || 0;
    const totalExpenses = (inv.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0) || (inv.expensesTotalAddition || 0) || (inv.expensesTotalDeduction || 0);
    if (inv.type === 'purchase') {
      return Math.max(0, calculatedSub - (inv.discount || 0) + (inv.tax || 0) - offsetReturns) + totalExpenses;
    }
    const expDeductions = inv.expensesTotalDeduction || (inv.expenses || []).filter(e => e.action === 'deduct').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const expAdditions = inv.expensesTotalAddition || (inv.expenses || []).filter(e => e.action === 'add').reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return Math.max(0, calculatedSub - (inv.discount || 0) + (inv.tax || 0) - offsetReturns - expDeductions + expAdditions);
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
        const amtA = getInvoiceEffectiveAmount(a);
        const amtB = getInvoiceEffectiveAmount(b);
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
    <div className="w-full space-y-4 pb-20 no-print transition-colors dir-rtl">
      {/* Executive Header Bar - Flat Commercial */}
      <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-none transition-colors">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <Receipt className="w-3.5 h-3.5 text-slate-500" />
              <span>آرشیو و بایگانی اسناد مالی</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{toPersianDigits(totalInvoicesCount)} سند ثبت شده</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>مدیریت و بایگانی فاکتورها</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
            فهرست کامل فاکتورهای فروش، ورود کالا (خرید)، پیش‌نویس‌های تجاری و صدور فاکتورهای رسمی
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="invoice-list-new-purchase-btn"
            type="button"
            onClick={() => onNewInvoice('purchase')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="ثبت ورود کالا به انبار و صدور فاکتور خرید"
          >
            <Package className="w-4 h-4 shrink-0 text-slate-500" />
            <span>+ ورود کالا (خرید)</span>
          </button>
          <button
            id="invoice-list-new-sale-btn"
            type="button"
            onClick={() => onNewInvoice('sale')}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg ${theme.primary} ${theme.primaryHover} text-white font-bold text-xs transition-colors cursor-pointer shadow-xs`}
            title="صدور فاکتور خروج کالا و فروش به مشتری"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>+ فاکتور فروش (خروج)</span>
          </button>
        </div>
      </div>

      {/* Archive Statistics Summary Cards - Flat Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        
        {/* Total Documents */}
        <div 
          onClick={() => handleSelectFilter('all')}
          className={`bg-white dark:bg-[#090d16] rounded-xl p-4 border transition-colors cursor-pointer flex flex-col justify-between ${
            filterType === 'all'
              ? `${theme.borderColor} ${theme.primaryLight} ring-1 ring-current/20`
              : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          title="کلیک برای نمایش تمام فاکتورها و اسناد"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span>تعداد کل اسناد</span>
              {filterType === 'all' && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${theme.primary} text-white`}>انتخاب شده</span>
              )}
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-2.5 dir-ltr text-right">
            {toPersianDigits(totalInvoicesCount)} <span className="text-xs text-slate-500 font-medium">سند</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>آرشیو کل اسناد:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
              {toPersianDigits(totalInvoicesCount)} سند
            </span>
          </div>
        </div>

        {/* Sales Invoices */}
        <div 
          onClick={() => handleSelectFilter('sale')}
          className={`bg-white dark:bg-[#090d16] rounded-xl p-4 border transition-colors cursor-pointer flex flex-col justify-between ${
            filterType === 'sale'
              ? 'border-emerald-600 dark:border-emerald-500 ring-1 ring-emerald-500/20'
              : 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/50'
          }`}
          title="کلیک برای نمایش فاکتورهای فروش"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span>فاکتورهای فروش</span>
              {filterType === 'sale' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">انتخاب شده</span>
              )}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-2.5 dir-ltr text-right">
            {toPersianDigits(salesInvoices.length)} <span className="text-xs text-slate-500 font-medium">فاکتور</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>گردش فروش:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatPrice(totalSalesRevenue)}
            </span>
          </div>
        </div>

        {/* Purchase Invoices / Goods Entry */}
        <div 
          onClick={() => handleSelectFilter('purchase')}
          className={`bg-white dark:bg-[#090d16] rounded-xl p-4 border transition-colors cursor-pointer flex flex-col justify-between ${
            filterType === 'purchase'
              ? 'border-blue-600 dark:border-blue-500 ring-1 ring-blue-500/20'
              : 'border-slate-200/90 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50'
          }`}
          title="کلیک برای نمایش اسناد ورود کالا و خرید"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <span>ورود کالا (خرید)</span>
              {filterType === 'purchase' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white">انتخاب شده</span>
              )}
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-2.5 dir-ltr text-right">
            {toPersianDigits(purchaseInvoices.length)} <span className="text-xs text-slate-500 font-medium">فاکتور</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>{!isSecretMode ? 'بهای تأمین:' : 'وضعیت:'}</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
              {!isSecretMode ? formatPrice(totalPurchaseValue) : 'تأیید شده'}
            </span>
          </div>
        </div>

        {/* Draft Invoices */}
        <div 
          onClick={() => handleSelectFilter('drafts')}
          className={`bg-white dark:bg-[#090d16] rounded-xl p-4 border transition-colors cursor-pointer flex flex-col justify-between ${
            filterType === 'drafts'
              ? 'border-amber-600 dark:border-amber-500 ring-1 ring-amber-500/20'
              : 'border-slate-200/90 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/50'
          }`}
          title="کلیک برای نمایش فاکتورهای پیش‌نویس بلاتکلیف"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <span>پیش‌نویس‌ها و موقت</span>
              {filterType === 'drafts' && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-600 text-white">انتخاب شده</span>
              )}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <FileClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-2.5 dir-ltr text-right">
            {toPersianDigits(draftInvoicesCount)} <span className="text-xs text-slate-500 font-medium">پیش‌نویس</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>در انتظار نهایی‌سازی:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
              {toPersianDigits(draftInvoicesCount)} سند
            </span>
          </div>
        </div>

      </div>

      {/* Filter & Search Toolbar - Flat Segmented Style */}
      <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-none flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full lg:w-96">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی شماره فاکتور، مشتری، شهر یا کالا..."
            className="w-full pr-9 pl-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-bold focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
          />
        </div>

        {/* Filter Type Tabs - Clean Segmented Control */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
            <button
              onClick={() => handleSelectFilter('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filterType === 'all'
                  ? `bg-white dark:bg-slate-800 ${theme.primaryText} shadow-xs font-black`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>همه</span>
              <span className="text-[10px] opacity-75 font-mono">({toPersianDigits(invoices.length)})</span>
            </button>
            <button
              onClick={() => handleSelectFilter('sale')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filterType === 'sale'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>فروش</span>
              <span className="text-[10px] opacity-75 font-mono">({toPersianDigits(invoices.filter(i => i.type === 'sale').length)})</span>
            </button>
            <button
              onClick={() => handleSelectFilter('purchase')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filterType === 'purchase'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>ورود کالا</span>
              <span className="text-[10px] opacity-75 font-mono">({toPersianDigits(invoices.filter(i => i.type === 'purchase').length)})</span>
            </button>
            <button
              onClick={() => handleSelectFilter('drafts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filterType === 'drafts'
                  ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileClock className="w-3.5 h-3.5" />
              <span>پیش‌نویس‌ها</span>
              <span className="text-[10px] opacity-75 font-mono">({toPersianDigits(invoices.filter(i => i.isDraft).length)})</span>
            </button>
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => handleSort('date')}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 whitespace-nowrap"
            title={sortDirection === 'desc' ? 'مرتب‌سازی: جدیدترین در ابتدا' : 'مرتب‌سازی: قدیمی‌ترین در ابتدا'}
          >
            {sortDirection === 'desc' ? (
              <ArrowDownWideNarrow className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            ) : (
              <ArrowUpNarrowWide className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span>{sortDirection === 'desc' ? 'جدیدترین' : 'قدیمی‌ترین'}</span>
          </button>
        </div>
      </div>

      {/* Invoices Data Grid - Streamlined Professional Flat Table */}
      <div className="bg-white dark:bg-[#090d16] border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-none overflow-hidden transition-colors">
        {sortedInvoices.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p>هیچ فاکتوری با مشخصات جستجو شده یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-[13px] select-none">
                <tr>
                  {/* Column 1: Customer / Party */}
                  <SortableTableHeader
                    field="customer"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
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
                    align="right"
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
                    align="right"
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
                  <th className="p-3.5 text-center whitespace-nowrap min-w-[140px] font-black">عملیات</th>
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
                  const resolvedGrossSubtotal = itemsOriginalSubtotal > 0 
                    ? itemsOriginalSubtotal 
                    : (itemsCurrentSubtotal > 0 ? itemsCurrentSubtotal : (inv.subtotal || inv.finalAmount || 0));

                  const hasInvDiscount = Boolean(inv.hasDiscount || (inv.discount && inv.discount > 0));
                  const invDiscountAmount = inv.discount || 0;
                  const discountPct = inv.discountPercent || (resolvedGrossSubtotal > 0 && invDiscountAmount > 0 ? Math.round((invDiscountAmount / resolvedGrossSubtotal) * 100 * 10) / 10 : 0);

                  const grossOriginalAmount = Math.max(0, resolvedGrossSubtotal + (inv.tax || 0));
                  const totalExpenses = (inv.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0) || (inv.expensesTotalAddition || 0) || (inv.expensesTotalDeduction || 0);
                  const effectiveFinalAmount = inv.type === 'purchase'
                    ? (Math.max(0, resolvedGrossSubtotal - invDiscountAmount + (inv.tax || 0) - totalReturnsAmount) + totalExpenses)
                    : Math.max(0, resolvedGrossSubtotal - invDiscountAmount + (inv.tax || 0) - totalReturnsAmount);
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
                              {hasInvDiscount || hasReturns ? (
                                <div className="text-left">
                                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{formatPrice(effectiveFinalAmount)}</span>
                                  <span className="text-[10.5px] text-slate-400 line-through font-normal mr-1.5">{formatPrice(grossOriginalAmount)}</span>
                                </div>
                              ) : (
                                <span>{formatPrice(effectiveFinalAmount)}</span>
                              )}
                            </div>
                          </div>
                          {hasInvDiscount ? (
                            <div className="flex items-center justify-end gap-1.5 mt-0.5 dir-rtl">
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-[9.5px] border border-amber-300 dark:border-amber-700 flex items-center gap-0.5">
                                <Percent className="w-2.5 h-2.5 shrink-0" />
                                <span>{toPersianDigits(discountPct)}٪ تخفیف</span>
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                (-{formatPrice(invDiscountAmount)})
                              </span>
                            </div>
                          ) : hasReturns ? (
                            <span className="text-[10px] text-rose-500 dark:text-rose-400 font-medium dir-rtl">
                              پس از کسر مرجوعی
                            </span>
                          ) : (inv.type === 'purchase' && totalExpenses > 0) ? (
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold dir-rtl">
                              بهای تمام‌شده کل (با {formatPrice(totalExpenses)} کرایه/هزینه)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium dir-rtl">
                              مبلغ خالص کل فاکتور
                            </span>
                          )}

                          {/* Inward Sell-Through: Clean single line without any box */}
                          {inwardSellThrough && !isSecretMode && (
                            <div className="text-[10.5px] font-bold mt-0.5 whitespace-nowrap dir-rtl text-left font-mono">
                              {inwardSellThrough.isFullySold ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                  ۱۰۰٪ فروش‌رفته
                                </span>
                              ) : (
                                <span>
                                  <span className="text-sky-600 dark:text-sky-400 font-black">
                                    {toPersianDigits(inwardSellThrough.percentSold)}٪ فروش‌رفته
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-600 mx-1.5 font-normal">|</span>
                                  <span className="text-amber-600 dark:text-amber-400 font-black">
                                    {toPersianDigits(inwardSellThrough.percentRemaining)}٪ مانده
                                  </span>
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
