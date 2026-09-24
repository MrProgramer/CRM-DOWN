import React, { useState, useMemo } from 'react';
import { ProductReturn, Product, Customer, StoreSettings, Invoice } from '../types';
import { themes, getThemeBadges } from './ThemeConfig';
import { CustomValidationMessage } from './CustomValidationMessage';
import { Pagination } from './Pagination';
import { SmartPriceInput } from './SmartPriceInput';
import { SortableTableHeader } from './SortableTableHeader';
import { 
  formatPrice, 
  toPersianDigits, 
  getCurrentPersianDate, 
  getCurrentPersianTime,
  getNetReturnAmount 
} from '../utils/formatters';
import { 
  RotateCcw, 
  Plus, 
  Search, 
  Trash2, 
  X, 
  CheckCircle2, 
  ArrowUpLeft, 
  ArrowDownRight, 
  TrendingDown, 
  Boxes, 
  Info,
  Layers,
  Edit,
  DollarSign,
  Coins,
  CreditCard,
  Sparkles,
  PackageX,
  FileSpreadsheet,
  AlertTriangle,
  Building2,
  Users,
  Calendar,
  Clock,
  ArrowRightLeft,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ReturnsManagerProps {
  returns: ProductReturn[];
  products: Product[];
  customers: Customer[];
  invoices?: Invoice[];
  settings: StoreSettings;
  runWithSecurityCheck?: (
    title: string,
    subtitle: string,
    actionType?: 'edit' | 'delete',
    onSuccess?: () => void
  ) => void;
  onAddReturn: (newReturn: Omit<ProductReturn, 'id' | 'createdAt'>, updateStock: boolean) => void;
  onDeleteReturn: (returnId: string) => void;
  onUpdateReturn?: (returnId: string, updatedReturn: Omit<ProductReturn, 'id' | 'createdAt' | 'isRefunded' | 'refundMethod'>, updateStock: boolean) => void;
  onApproveRefund?: (returnId: string, refundMethod: 'cash' | 'bank') => void;
}

export const ReturnsManager: React.FC<ReturnsManagerProps> = ({
  returns = [],
  products = [],
  customers = [],
  invoices = [],
  settings,
  runWithSecurityCheck,
  onAddReturn,
  onDeleteReturn,
  onUpdateReturn,
  onApproveRefund,
}) => {
  const theme = themes[settings.themeColor] || themes.teal;
  const badges = useMemo(() => getThemeBadges(settings.themeColor), [settings.themeColor]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'to_supplier' | 'from_customer' | 'refunded' | 'pending'>('all');
  type ReturnSortField = 'date' | 'item' | 'customer' | 'amount' | 'status';
  const [sortField, setSortField] = useState<ReturnSortField>('date');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const returnSortOrder = sortDirection;
  const setReturnSortOrder = (fnOrVal: any) => {
    if (typeof fnOrVal === 'function') {
      setSortDirection(prev => fnOrVal(prev));
    } else {
      setSortDirection(fnOrVal);
    }
  };

  const handleSort = (field: ReturnSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection(field === 'item' || field === 'customer' ? 'asc' : 'desc');
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Edit / Action states
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<ProductReturn | null>(null);
  const [editConfirmItem, setEditConfirmItem] = useState<ProductReturn | null>(null);
  const [refundConfirmItem, setRefundConfirmItem] = useState<ProductReturn | null>(null);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState('');
  const [returnType, setReturnType] = useState<'to_supplier' | 'from_customer'>('to_supplier');
  const [cartons, setCartons] = useState(0);
  const [pieces, setPieces] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [extraCosts, setExtraCosts] = useState(0);
  const [extraCostsReason, setExtraCostsReason] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [updateStock, setUpdateStock] = useState(true);

  // Hide zero-stock products state (persisted to localStorage, default true)
  const [hideZeroStock, setHideZeroStock] = useState<boolean>(() => {
    const saved = localStorage.getItem('bazargani_returns_hide_zero_stock');
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
    localStorage.setItem('bazargani_returns_hide_zero_stock', JSON.stringify(hideZeroStock));
  }, [hideZeroStock]);

  // Quick reasons
  const quickReasons = [
    'تاریخ انقضای کم / نزدیک به انقضا',
    'آسیب‌دیدگی فیزیکی یا خرابی کارتن',
    'عدم تطابق با سفارش اولیه',
    'عدم رضایت از کیفیت کالا',
    'عدم فروش و توافق بازگشت'
  ];

  // Selected product helper
  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Auto set unit price when product or type changes - strictly default to purchasePrice as requested
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      if (selectedInvoiceId) {
        const inv = invoices.find(i => i.id === selectedInvoiceId);
        const invItem = inv?.items.find(item => item.productId === productId || item.productName?.trim().toLowerCase() === prod.name?.trim().toLowerCase());
        if (invItem) {
          const itemPPrice = (invItem.unitPurchasePrice !== undefined && invItem.unitPurchasePrice > 0)
            ? invItem.unitPurchasePrice
            : (prod.purchasePrice > 0 ? prod.purchasePrice : (invItem.unitSellingPrice || (invItem as any).unitPrice || 0));
          setUnitPrice(itemPPrice);
          return;
        }
      }
      // Strictly set return unit price to purchasePrice
      setUnitPrice(prod.purchasePrice > 0 ? prod.purchasePrice : prod.sellingPrice);
    }
  };

  const handleInvoiceChange = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const inv = invoices.find(i => i.id === invoiceId);
    if (inv) {
      setSelectedInvoiceNumber(inv.invoiceNumber || '');
      if (selectedProductId) {
        const prod = products.find(p => p.id === selectedProductId);
        const invItem = inv.items.find(item => item.productId === selectedProductId || (prod && item.productName?.trim().toLowerCase() === prod.name?.trim().toLowerCase()));
        if (invItem) {
          const itemPPrice = (invItem.unitPurchasePrice !== undefined && invItem.unitPurchasePrice > 0)
            ? invItem.unitPurchasePrice
            : (prod ? prod.purchasePrice : ((invItem as any).unitPrice || 0));
          setUnitPrice(itemPPrice);
        }
      }
    } else {
      setSelectedInvoiceNumber('');
      if (selectedProductId) {
        const prod = products.find(p => p.id === selectedProductId);
        if (prod) {
          setUnitPrice(prod.purchasePrice > 0 ? prod.purchasePrice : prod.sellingPrice);
        }
      }
    }
  };

  const handleTypeChange = (type: 'to_supplier' | 'from_customer') => {
    setReturnType(type);
    if (selectedProduct) {
      setUnitPrice(selectedProduct.purchasePrice > 0 ? selectedProduct.purchasePrice : selectedProduct.sellingPrice);
    }
  };

  // Calculations for current form
  const piecesPerCarton = selectedProduct?.piecesPerCarton || 1;
  const totalPiecesInReturn = (cartons * piecesPerCarton) + pieces;
  const totalAmountInReturn = totalPiecesInReturn * unitPrice;

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter(r => {
      const productNameMatch = r.productName?.toLowerCase().includes(searchTerm.toLowerCase());
      const customerNameMatch = r.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      const reasonMatch = r.reason?.toLowerCase().includes(searchTerm.toLowerCase());
      const invoiceMatch = r.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSearch = !searchTerm.trim() || productNameMatch || customerNameMatch || reasonMatch || invoiceMatch;
      
      let matchesType = true;
      if (filterType === 'to_supplier') matchesType = r.type === 'to_supplier';
      else if (filterType === 'from_customer') matchesType = r.type === 'from_customer';
      else if (filterType === 'refunded') matchesType = !!r.isRefunded;
      else if (filterType === 'pending') matchesType = !r.isRefunded;

      return matchesSearch && matchesType;
    });
  }, [returns, searchTerm, filterType]);

  const sortedReturns = useMemo(() => {
    return [...filteredReturns].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'item') {
        cmp = (a.productName || '').localeCompare(b.productName || '', 'fa');
      } else if (sortField === 'customer') {
        cmp = (a.customerName || '').localeCompare(b.customerName || '', 'fa');
      } else if (sortField === 'amount') {
        cmp = (a.totalAmount || 0) - (b.totalAmount || 0);
      } else if (sortField === 'status') {
        cmp = (a.isRefunded ? 1 : 0) - (b.isRefunded ? 1 : 0);
      } else {
        // date
        const ta = a.createdAt || (a.date ? new Date(a.date.replace(/\//g, '-')).getTime() || 0 : 0);
        const tb = b.createdAt || (b.date ? new Date(b.date.replace(/\//g, '-')).getTime() || 0 : 0);
        if (ta && tb && ta !== tb) {
          cmp = ta - tb;
        } else {
          cmp = (a.date || '').localeCompare(b.date || '');
          if (cmp === 0) {
            cmp = (a.time || '').localeCompare(b.time || '');
          }
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredReturns, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedReturns.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReturns = useMemo(() => {
    return sortedReturns.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedReturns, startIndex, itemsPerPage]);

  // Analytical Stats
  const totalToSupplierAmount = returns
    .filter(r => r.type === 'to_supplier')
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const totalFromCustomerAmount = returns
    .filter(r => r.type === 'from_customer')
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const totalRefundedAmount = returns
    .filter(r => r.isRefunded)
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const totalPendingRefundAmount = returns
    .filter(r => !r.isRefunded)
    .reduce((sum, r) => sum + r.totalAmount, 0);

  // Edit click
  const handleEditClick = (item: ProductReturn) => {
    const execute = () => {
      setEditingReturnId(item.id);
      setSelectedProductId(item.productId);
      setSelectedCustomerId(item.customerId);
      setSelectedInvoiceId(item.invoiceId || '');
      setSelectedInvoiceNumber(item.invoiceNumber || '');
      setReturnType(item.type);
      setCartons(item.cartonsCount);
      setPieces(item.extraPieces);
      setUnitPrice(item.unitPrice);
      setExtraCosts(item.extraCosts || 0);
      setExtraCostsReason(item.extraCostsReason || '');
      setReason(item.reason);
      setNotes(item.notes || '');
      setUpdateStock(true);
      setIsFormOpen(true);
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        'تایید پین‌کد جهت ویرایش سند مرجوعی کالا',
        'برای ورود به بخش ویرایش اقلام و مشخصات مرجوعی، پین‌کد مدیریت را وارد کنید.',
        'edit',
        execute
      );
    } else {
      execute();
    }
  };

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Close form
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setFormErrors({});
    setEditingReturnId(null);
    setSelectedProductId('');
    setSelectedCustomerId('');
    setSelectedInvoiceId('');
    setSelectedInvoiceNumber('');
    setCartons(0);
    setPieces(0);
    setUnitPrice(0);
    setExtraCosts(0);
    setExtraCostsReason('');
    setReason('');
    setNotes('');
    setUpdateStock(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!selectedProductId) {
      errors.productId = 'انتخاب کالای مرجوعی از انبار الزامی است';
    }
    if (!selectedCustomerId) {
      errors.customerId = 'انتخاب طرف حساب (مشتری/تامین‌کننده) الزامی است';
    }
    if (!unitPrice || unitPrice <= 0) {
      errors.unitPrice = 'ورود قیمت واحد مرجوعی الزامی است';
    }
    if (!reason.trim()) {
      errors.reason = 'شرح علت مرجوعی کالا الزامی است';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    const prod = products.find(p => p.id === selectedProductId);
    const cust = customers.find(c => c.id === selectedCustomerId);

    if (!prod) return;

    const grossAmount = totalAmountInReturn;
    const netReturnVal = Math.max(0, grossAmount - (extraCosts || 0));

    const fields = {
      productId: selectedProductId,
      productName: prod.name,
      customerId: selectedCustomerId,
      customerName: cust ? cust.name : (selectedCustomerId || (returnType === 'to_supplier' ? 'تامین‌کننده متفرقه' : 'مشتری متفرقه')),
      invoiceId: selectedInvoiceId || undefined,
      invoiceNumber: selectedInvoiceNumber || undefined,
      type: returnType,
      cartonsCount: cartons,
      extraPieces: pieces,
      totalPieces: totalPiecesInReturn,
      unitPrice,
      totalAmount: grossAmount,
      extraCosts: extraCosts || 0,
      extraCostsReason: extraCostsReason || '',
      netAmount: netReturnVal,
      reason: reason || 'ثبت دستی مرجوعی',
      notes,
      date: editingReturnId ? (returns.find(r => r.id === editingReturnId)?.date || getCurrentPersianDate()) : getCurrentPersianDate(),
      time: editingReturnId ? (returns.find(r => r.id === editingReturnId)?.time || getCurrentPersianTime()) : getCurrentPersianTime(),
    };

    if (editingReturnId && onUpdateReturn) {
      onUpdateReturn(editingReturnId, fields, updateStock);
    } else {
      onAddReturn(fields, updateStock);
    }

    handleCloseForm();
  };

  return (
    <div className="w-full space-y-6 pb-24 no-print transition-colors dir-rtl text-slate-800 dark:text-slate-200">
      
      {/* 1. Executive Modern Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-5 transition-all">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} text-xs font-black border ${theme.borderColor} shadow-2xs`}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>مدیریت کالاهای مرجوعی و استرداد</span>
            </span>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{toPersianDigits(returns.length)} سند مرجوعی</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
              <PackageX className="w-5 h-5" />
            </div>
            <span>ثبت، کنترل و تسویه مالی اقلام مرجوعی</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
            مدیریت یکپارچه برگشت از خرید به تامین‌کنندگان و برگشت از فروش مشتریان با اصلاح خودکار موجودی انبار و تراز مالی طرف‌حساب‌ها
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingReturnId(null);
              setIsFormOpen(true);
            }}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} active:scale-95 text-white font-black text-xs sm:text-sm shadow-xs hover:shadow-md transition-all cursor-pointer`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>ثبت مرجوعی جدید</span>
          </button>
        </div>
      </div>

      {/* 2. Analytical KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: To Supplier Returns */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-rose-200/70 dark:border-rose-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">مرجوع به شرکت‌ها (خرید)</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800">
              <ArrowUpLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {formatPrice(totalToSupplierAmount)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>کسر از بدهی شرکت</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
              {toPersianDigits(returns.filter(r => r.type === 'to_supplier').length)} سند
            </span>
          </div>
        </div>

        {/* Card 2: From Customer Returns */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-indigo-200/70 dark:border-indigo-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">مرجوع از مشتریان (فروش)</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {formatPrice(totalFromCustomerAmount)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>برگشت به انبار و کسر از فاکتور</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {toPersianDigits(returns.filter(r => r.type === 'from_customer').length)} سند
            </span>
          </div>
        </div>

        {/* Card 3: Balance Impact */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-teal-200/70 dark:border-teal-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400">خالص تراز مالی مرجوعی‌ها</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {formatPrice(Math.abs(totalToSupplierAmount - totalFromCustomerAmount))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>
              {totalToSupplierAmount >= totalFromCustomerAmount 
                ? 'کاهش خالص تعهدات' 
                : 'کاهش خالص مطالبات'}
            </span>
            <span className="font-bold text-teal-600 dark:text-teal-400 text-[10px]">
              {totalToSupplierAmount >= totalFromCustomerAmount ? 'تراز به نفع فروشگاه' : 'تراز به نفع مشتریان'}
            </span>
          </div>
        </div>

        {/* Card 4: Financial Settlement Status */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">وضعیت تسویه خزانه‌داری</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-3 dir-ltr text-right">
            {formatPrice(totalRefundedAmount)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>در انتظار تسویه:</span>
            <span className="font-black text-amber-600 dark:text-amber-400 dir-ltr font-mono">
              {formatPrice(totalPendingRefundAmount)}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Main Data Table & Filtering Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col md:flex-row gap-3.5 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجوی نام کالا، طرف حساب، فاکتور یا علت مرجوعی..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-500/25 transition-all shadow-2xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
              <button
                onClick={() => { setFilterType('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                همه ({toPersianDigits(returns.length)})
              </button>
              <button
                onClick={() => { setFilterType('to_supplier'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'to_supplier'
                    ? 'bg-rose-600 text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                }`}
              >
                مرجوع به شرکت
              </button>
              <button
                onClick={() => { setFilterType('from_customer'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'from_customer'
                    ? 'bg-indigo-600 text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
                }`}
              >
                مرجوع از مشتری
              </button>
              <button
                onClick={() => { setFilterType('refunded'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'refunded'
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                }`}
              >
                تسویه‌شده ({toPersianDigits(returns.filter(r => r.isRefunded).length)})
              </button>
              <button
                onClick={() => { setFilterType('pending'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                }`}
              >
                در انتظار تسویه
              </button>
            </div>

            {/* Date Sort Toggle Button */}
            <button
              type="button"
              onClick={() => setReturnSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 shadow-2xs"
              title={returnSortOrder === 'desc' ? 'مرتب‌سازی: جدیدترین در ابتدا (کلیک برای صعودی/قدیمی‌ترین)' : 'مرتب‌سازی: قدیمی‌ترین در ابتدا (کلیک برای نزولی/جدیدترین)'}
            >
              {returnSortOrder === 'desc' ? (
                <ArrowDownWideNarrow className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              ) : (
                <ArrowUpNarrowWide className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              )}
              <span>{returnSortOrder === 'desc' ? 'جدیدترین اول' : 'قدیمی‌ترین اول'}</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black select-none">
                <th className="p-3.5 w-12 text-center">ردیف</th>

                <SortableTableHeader
                  field="date"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  تاریخ و ساعت
                </SortableTableHeader>

                <th className="p-3.5">نوع سند</th>

                <SortableTableHeader
                  field="item"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  نام کالا
                </SortableTableHeader>

                <th className="p-3.5">تعداد مرجوعی</th>
                <th className="p-3.5">قیمت واحد</th>

                <SortableTableHeader
                  field="amount"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                >
                  مبلغ کل
                </SortableTableHeader>

                <SortableTableHeader
                  field="customer"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                >
                  طرف حساب / فاکتور
                </SortableTableHeader>

                <SortableTableHeader
                  field="status"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  align="center"
                >
                  وضعیت تسویه
                </SortableTableHeader>

                <th className="p-3.5 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedReturns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 font-medium">
                    <PackageX className="w-10 h-10 mx-auto mb-2.5 text-slate-300 dark:text-slate-600" />
                    <span className="font-bold text-sm block text-slate-700 dark:text-slate-300">سند مرجوعی با این مشخصات یافت نشد.</span>
                    <span className="text-xs text-slate-400 mt-1 block">جهت افزودن اولین مرجوعی، دکمه «ثبت مرجوعی جدید» را بزنید.</span>
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((item, idx) => {
                  const cartonsText = item.cartonsCount > 0 ? `${item.cartonsCount} کارتن` : '';
                  const piecesText = item.extraPieces > 0 ? `${item.extraPieces} دانه` : '';
                  const qtyFormatted = [cartonsText, piecesText].filter(Boolean).join(' و ') || '۰ عدد';
                  const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;

                  return (
                    <tr 
                      key={`ret-row-${item.type}-${item.id || idx}-${idx}`} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5 text-center font-mono text-slate-400 font-bold">
                        {toPersianDigits(rowNumber)}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {toPersianDigits(item.date)}
                        </div>
                        {item.time && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {toPersianDigits(item.time)}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {item.type === 'to_supplier' ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[11px] whitespace-nowrap shrink-0 border ${badges.purchase}`}>
                            <ArrowUpLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>مرجوع به شرکت</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-black text-[11px] whitespace-nowrap shrink-0 border ${badges.sale}`}>
                            <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                            <span>مرجوع از مشتری</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 font-black text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-teal-500 shrink-0" />
                          <span>{item.productName}</span>
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-black text-slate-800 dark:text-slate-200">
                          {toPersianDigits(qtyFormatted)}
                        </div>
                        <span className="inline-block text-[10px] text-slate-400 font-bold mt-0.5 whitespace-nowrap">
                          (معادل {toPersianDigits(item.totalPieces)} عدد کل)
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap dir-ltr text-right">
                        {formatPrice(item.unitPrice)}
                      </td>

                      <td className="p-3.5 whitespace-nowrap dir-ltr text-right">
                        <div className="font-black text-slate-900 dark:text-white">
                          {formatPrice(getNetReturnAmount(item))}
                        </div>
                        {item.extraCosts && item.extraCosts > 0 ? (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5 dir-rtl flex items-center justify-end gap-1 whitespace-nowrap">
                            <span>(ناخالص: {formatPrice(item.totalAmount)} - کسر: {formatPrice(item.extraCosts)})</span>
                          </div>
                        ) : null}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          {item.type === 'to_supplier' ? (
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span>{item.customerName}</span>
                        </div>
                        {item.invoiceNumber && (
                          <div className={`text-[10px] font-black mt-1 px-2 py-0.5 rounded-lg border w-max flex items-center gap-1 whitespace-nowrap shrink-0 ${badges.primaryPill} border-current/20`}>
                            <FileSpreadsheet className="w-3 h-3 shrink-0" />
                            <span>فاکتور: {toPersianDigits(item.invoiceNumber)}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {item.isRefunded ? (
                          item.refundMethod === 'invoice_offset' ? (
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 w-max shadow-2xs whitespace-nowrap shrink-0 border ${badges.returnOffset}`}>
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>تهاتر با فاکتور {item.settlementInvoiceNumber ? `#${toPersianDigits(item.settlementInvoiceNumber)}` : ''} (دریافت جنس)</span>
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 w-max shadow-2xs whitespace-nowrap shrink-0 border ${badges.cash}`}>
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>تسویه شده ({item.refundMethod === 'cash' ? 'صندوق نقدی' : 'حساب بانکی'})</span>
                            </span>
                          )
                        ) : (
                          <button
                            onClick={() => setRefundConfirmItem(item)}
                            className="px-3 py-1.5 text-[11px] font-black text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
                          >
                            <DollarSign className="w-3.5 h-3.5 shrink-0" />
                            <span>تسویه مالی</span>
                          </button>
                        )}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                          <button
                            onClick={() => setEditConfirmItem(item)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                            title="ویرایش سند مرجوعی"
                          >
                            <Edit className="w-3.5 h-3.5 shrink-0" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmItem(item)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                            title="حذف سند مرجوعی"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </div>
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
          totalItems={sortedReturns.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          itemsPerPageOptions={[10, 20, 50, 100]}
          itemName="سند مرجوعی"
          themeColor={settings.themeColor}
        />
      </div>

      {/* 4. Register / Edit Return Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-xl relative z-10 transition-all text-right space-y-5 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Top ambient glow */}
              <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-24 bg-gradient-to-b from-teal-500/15 to-transparent blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={handleCloseForm}
                className="p-2 absolute top-5 left-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Form Title */}
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                <div className={`p-2.5 rounded-2xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor} shadow-xs`}>
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {editingReturnId ? 'ویرایش سند مرجوعی کالا' : 'ثبت سند مرجوعی جدید'}
                  </h2>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                    کنترل انبار، کسر حساب و تسویه خزانه‌داری
                  </span>
                </div>
              </div>

              <form noValidate onSubmit={handleSubmit} className="space-y-4 text-slate-700 dark:text-slate-200">
                {/* Return Type Segment Control */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">نوع مرجوعی کالا:</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('to_supplier')}
                      className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        returnType === 'to_supplier' 
                          ? 'bg-rose-600 text-white shadow-xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <ArrowUpLeft className="w-4 h-4" />
                      <span>مرجوع به شرکت (خرید)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('from_customer')}
                      className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        returnType === 'from_customer' 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <ArrowDownRight className="w-4 h-4" />
                      <span>مرجوع از مشتری (فروش)</span>
                    </button>
                  </div>
                </div>

                {/* Product Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      انتخاب کالای مورد نظر از لیست انبار <span className="text-rose-500">*</span>
                    </label>
                    <label 
                      id="toggle-hide-zero-stock-returns"
                      className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-slate-800 dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={hideZeroStock}
                        onChange={(e) => setHideZeroStock(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-0 cursor-pointer accent-teal-600"
                      />
                      <span>عدم نمایش موجودی صفر</span>
                    </label>
                  </div>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      handleProductChange(e.target.value);
                      if (formErrors.productId) setFormErrors({ ...formErrors, productId: '' });
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-xs font-black outline-none focus:ring-2 focus:ring-teal-500/30 transition-all cursor-pointer text-right shadow-2xs ${
                      formErrors.productId ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <option value="">-- برای انتخاب کلیک کنید --</option>
                    {products
                      .filter(p => !hideZeroStock || (p.stockPieces || 0) > 0 || p.id === selectedProductId)
                      .map((p, pIdx) => (
                        <option key={`ret-prod-opt-${p.id || pIdx}-${pIdx}`} value={p.id}>
                          {p.name} (موجودی فعلی: {toPersianDigits(Math.floor(p.stockPieces / p.piecesPerCarton))} کارتن و {toPersianDigits(p.stockPieces % p.piecesPerCarton)} دانه)
                        </option>
                      ))}
                  </select>
                  <CustomValidationMessage message={formErrors.productId} />

                  {selectedProduct && selectedProduct.stockPieces > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const maxCartons = Math.floor(selectedProduct.stockPieces / selectedProduct.piecesPerCarton);
                        const maxPieces = selectedProduct.stockPieces % selectedProduct.piecesPerCarton;
                        setCartons(maxCartons);
                        setPieces(maxPieces);
                      }}
                      className="mt-2 w-full py-1.5 px-3 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-teal-200/80 dark:border-teal-900"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>انتخاب خودکار کل موجودی ({toPersianDigits(Math.floor(selectedProduct.stockPieces / selectedProduct.piecesPerCarton))} کارتن و {toPersianDigits(selectedProduct.stockPieces % selectedProduct.piecesPerCarton)} دانه)</span>
                    </button>
                  )}
                </div>

                {/* Customer / Supplier Selector */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    {returnType === 'to_supplier' ? 'طرف حساب (شرکت / تامین‌کننده):' : 'طرف حساب (مشتری خریدار):'} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      if (formErrors.customerId) setFormErrors({ ...formErrors, customerId: '' });
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-xs font-black outline-none focus:ring-2 focus:ring-teal-500/30 transition-all cursor-pointer text-right shadow-2xs ${
                      formErrors.customerId ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <option value="">-- انتخاب طرف حساب --</option>
                    {customers.map((c, cIdx) => (
                      <option key={`ret-cust-opt-${c.id || cIdx}-${cIdx}`} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''} - {c.phone || ''}
                      </option>
                    ))}
                  </select>
                  <CustomValidationMessage message={formErrors.customerId} />
                </div>

                {/* Invoice Selector (For sales or purchase invoices) */}
                {invoices.length > 0 && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      اتصال به فاکتور اصلی (جهت کسر هوشمند و اصلاح فاکتور):
                    </label>
                    <select
                      value={selectedInvoiceId}
                      onChange={(e) => handleInvoiceChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer text-right shadow-2xs"
                    >
                      <option value="">-- بدون اتصال به فاکتور خاص (مرجوعی کلی حساب) --</option>
                      {invoices
                        .filter(i => {
                          // Filter purchase vs sales invoices matching returnType
                          const isPurchase = i.type === 'purchase';
                          if (returnType === 'to_supplier' && !isPurchase) return false;
                          if (returnType === 'from_customer' && isPurchase) return false;

                          // If customer/supplier selected, filter by customer/supplier
                          if (selectedCustomerId) {
                            const cust = customers.find(c => c.id === selectedCustomerId);
                            return i.customerId === selectedCustomerId || (cust && i.customerName?.trim().toLowerCase() === cust.name?.trim().toLowerCase());
                          }
                          return true;
                        })
                        .map((i, iIdx) => (
                          <option key={`ret-inv-opt-${i.id || iIdx}-${iIdx}`} value={i.id}>
                            فاکتور {i.type === 'purchase' ? 'خرید' : 'فروش'} #{toPersianDigits(i.invoiceNumber)} - {i.customerName || 'مشتری متفرقه'} - {toPersianDigits(i.date)} - {formatPrice(i.finalAmount)}
                          </option>
                        ))}
                    </select>
                    {selectedInvoiceId && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>این مرجوعی مستقیماً به فاکتور متصل شد؛ مبلغ و اقلام مرجوعی به صورت خودکار در فاکتور کسر و اصلاح گردید.</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Quantities (Carton + Pieces) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">تعداد کارتن:</label>
                    <input
                      type="number"
                      min="0"
                      value={cartons || ''}
                      onChange={(e) => setCartons(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black outline-none focus:ring-2 focus:ring-teal-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">تعداد دانه (اضافی):</label>
                    <input
                      type="number"
                      min="0"
                      value={pieces || ''}
                      onChange={(e) => setPieces(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-black outline-none focus:ring-2 focus:ring-teal-500/30"
                    />
                  </div>
                </div>

                {/* Unit price & total info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                        قیمت واحد برگشتی (تومان) <span className="text-rose-500">*</span>
                      </label>
                      {selectedProduct && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          پیش‌فرض: قیمت خرید
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={unitPrice || ''}
                      onChange={(e) => {
                        setUnitPrice(Math.max(0, parseInt(e.target.value) || 0));
                        if (formErrors.unitPrice) setFormErrors({ ...formErrors, unitPrice: '' });
                      }}
                      placeholder="0"
                      className={`w-full px-3.5 py-2.5 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-xs font-black outline-none focus:ring-2 focus:ring-teal-500/30 font-mono ${
                        formErrors.unitPrice ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    {selectedProduct && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {selectedProduct.purchasePrice > 0 && (
                          <button
                            type="button"
                            onClick={() => setUnitPrice(selectedProduct.purchasePrice)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              unitPrice === selectedProduct.purchasePrice
                                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            قیمت خرید: {formatPrice(selectedProduct.purchasePrice)}
                          </button>
                        )}
                        {selectedProduct.sellingPrice > 0 && (
                          <button
                            type="button"
                            onClick={() => setUnitPrice(selectedProduct.sellingPrice)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              unitPrice === selectedProduct.sellingPrice
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            قیمت فروش: {formatPrice(selectedProduct.sellingPrice)}
                          </button>
                        )}
                      </div>
                    )}
                    <CustomValidationMessage message={formErrors.unitPrice} />
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-right flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">جمع کل دانه‌ها:</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(totalPiecesInReturn)} دانه
                    </span>
                  </div>
                </div>

                {/* Extra Shipping / Damage / Penalty Costs Section */}
                <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-800 dark:text-rose-300">
                    <DollarSign className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>هزینه اضافی مرجوعی (کرایه باربری / کسر خسارت شرکت)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مبلغ هزینه اضافی / باربری (تومان - کسر از مبلغ کل مرجوعی):
                    </label>
                    <SmartPriceInput
                      value={extraCosts}
                      onChange={(val) => setExtraCosts(val)}
                      placeholder="مثلاً ۵۰۰,۰۰۰ یا ۲m"
                      themeColor="rose"
                      showWords={true}
                      showScale={true}
                      showShortcuts={true}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      علت / بابت هزینه اضافی (اختیاری):
                    </label>
                    <input
                      type="text"
                      value={extraCostsReason}
                      onChange={(e) => setExtraCostsReason(e.target.value)}
                      placeholder="مثلاً: کرایه باربری مرجوعی و کسر شرکت"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                </div>

                {/* Live calculations preview card */}
                {selectedProductId && (
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl p-4 border border-emerald-200/80 dark:border-emerald-900/50 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                      <span>مبلغ ناخالص مرجوعی کالا:</span>
                      <span className="font-mono dir-ltr">{formatPrice(totalAmountInReturn)}</span>
                    </div>
                    {extraCosts > 0 && (
                      <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 pt-1 border-t border-emerald-200/50 dark:border-emerald-900/40">
                        <span>کسر هزینه باربری / خسارت شرکت:</span>
                        <span className="font-mono dir-ltr">- {formatPrice(extraCosts)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs font-black text-emerald-800 dark:text-emerald-300 pt-1.5 border-t border-emerald-300/80 dark:border-emerald-800">
                      <span>مبلغ خالص قابل اعمال در بستانکاری:</span>
                      <span className="text-sm dir-ltr font-mono">{formatPrice(Math.max(0, totalAmountInReturn - extraCosts))}</span>
                    </div>
                  </div>
                )}

                {/* Reason Choice and Input */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    علت مرجوعی کالا <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {quickReasons.map((rOpt, rIdx) => (
                      <button
                        key={`quick-reason-${rOpt}-${rIdx}`}
                        type="button"
                        onClick={() => {
                          setReason(rOpt);
                          if (formErrors.reason) setFormErrors({ ...formErrors, reason: '' });
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                          reason === rOpt 
                            ? 'bg-slate-800 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 shadow-2xs' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {rOpt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="شرح دقیق علت مرجوعی..."
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (formErrors.reason) setFormErrors({ ...formErrors, reason: '' });
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-2xl border bg-slate-50 dark:bg-slate-800 text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500/30 ${
                      formErrors.reason ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  <CustomValidationMessage message={formErrors.reason} />
                </div>

                {/* Auto-update stock toggle */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center gap-2.5">
                    <Boxes className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <span className="block text-xs font-black text-slate-900 dark:text-white">بروزرسانی مستقیم موجودی انبار</span>
                      <span className="block text-[10px] text-slate-400 font-medium">کسر یا اضافه شدن خودکار تعداد به کاردکس انبار</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={updateStock}
                    onChange={(e) => setUpdateStock(e.target.checked)}
                    className="w-5 h-5 rounded-lg cursor-pointer text-teal-600 focus:ring-0"
                  />
                </div>

                {/* Submit buttons */}
                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="submit"
                    className={`flex-1 py-3 rounded-2xl ${theme.primary} ${theme.primaryHover} active:scale-95 text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer`}
                  >
                    {editingReturnId ? 'اعمال ویرایش سند' : 'ثبت قطعی مرجوعی'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md relative z-10 transition-colors text-right space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    تأیید حذف سند مرجوعی کالا
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    آیا از حذف این سند مرجوعی از سامانه اطمینان دارید؟
                  </p>
                </div>
              </div>

              {/* Item Info Card */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-500 dark:text-slate-400">نام کالا:</span>
                  <span className="text-slate-900 dark:text-white font-black">{deleteConfirmItem.productName}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-500 dark:text-slate-400">طرف حساب:</span>
                  <span className="text-slate-900 dark:text-white">{deleteConfirmItem.customerName}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-500 dark:text-slate-400">تعداد کل:</span>
                  <span className="text-slate-900 dark:text-white font-mono">{toPersianDigits(deleteConfirmItem.totalPieces)} عدد ({deleteConfirmItem.cartonsCount > 0 ? `${toPersianDigits(deleteConfirmItem.cartonsCount)} کارتن` : ''} {deleteConfirmItem.extraPieces > 0 ? `${toPersianDigits(deleteConfirmItem.extraPieces)} دانه` : ''})</span>
                </div>
                <div className="flex justify-between items-center font-bold pt-2 border-t border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">مبلغ کل سند:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-black text-sm dir-ltr">{formatPrice(deleteConfirmItem.totalAmount)}</span>
                </div>
              </div>

              <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-900 leading-relaxed font-semibold">
                ⚠️ هشدار: در صورت حذف این سند، تغییرات تعداد کالا در انبار و تراز مالی حساب طرف‌حساب به وضعیت قبل بازگردانده می‌شود.
              </p>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const id = deleteConfirmItem.id;
                    setDeleteConfirmItem(null);
                    onDeleteReturn(id);
                  }}
                  className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>بله، حذف قطعی سند</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmItem(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Edit Confirmation Modal */}
      <AnimatePresence>
        {editConfirmItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md relative z-10 transition-colors text-right space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    تأیید ویرایش سند مرجوعی
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    آیا مایل به باز کردن فرم ویرایش این سند مرجوعی هستید؟
                  </p>
                </div>
              </div>

              {/* Item Info */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-500 dark:text-slate-400">کالا:</span>
                  <span className="text-slate-900 dark:text-white font-black">{editConfirmItem.productName}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-500 dark:text-slate-400">طرف حساب:</span>
                  <span className="text-slate-900 dark:text-white">{editConfirmItem.customerName}</span>
                </div>
                <div className="flex justify-between items-center font-bold pt-1.5 border-t border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">مبلغ سند:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black text-sm dir-ltr">{formatPrice(editConfirmItem.totalAmount)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const item = editConfirmItem;
                    setEditConfirmItem(null);
                    handleEditClick(item);
                  }}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Edit className="w-4 h-4" />
                  <span>تأیید و باز کردن فرم ویرایش</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditConfirmItem(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Refund & Settle Confirmation Modal */}
      <AnimatePresence>
        {refundConfirmItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md relative z-10 transition-colors text-right space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    تأیید و اعمال تسویه مالی مرجوعی
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    ثبت پرداخت/دریافت وجه مرجوعی در خزانه‌داری
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-500 dark:text-slate-400">کالا:</span>
                  <span className="text-slate-900 dark:text-white font-black">{refundConfirmItem.productName}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-500 dark:text-slate-400">طرف حساب:</span>
                  <span className="text-slate-900 dark:text-white">{refundConfirmItem.customerName}</span>
                </div>
                <div className="flex justify-between items-center font-bold pt-2 border-t border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">مبلغ مرجوعی:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm dir-ltr">{formatPrice(refundConfirmItem.totalAmount)}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                مبلغ فوق از چه منبعی تسویه و در حساب ثبت شود؟ با کلیک روی هر گزینه، تأیید نهایی انجام خواهد شد:
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const item = refundConfirmItem;
                    setRefundConfirmItem(null);
                    if (onApproveRefund) {
                      onApproveRefund(item.id, 'cash');
                    }
                  }}
                  className="py-3 px-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-black flex flex-col items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>تأیید با صندوق نقدی</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">(کسر/واریز به کشوی دفتر)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = refundConfirmItem;
                    setRefundConfirmItem(null);
                    if (onApproveRefund) {
                      onApproveRefund(item.id, 'bank');
                    }
                  }}
                  className="py-3 px-3 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-xs font-black flex flex-col items-center justify-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>تأیید با حساب بانکی</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">(انتقال کارت / شبا)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setRefundConfirmItem(null)}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                انصراف
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
