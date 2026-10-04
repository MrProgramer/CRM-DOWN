import React, { useState, useMemo } from 'react';
import { Product, StoreSettings } from '../types';
import { 
  formatPrice, 
  formatCartonText, 
  toPersianDigits, 
  formatProductPackagingSpec,
  formatAmountScale,
  numberToPersianWords,
  isProductUnpackaged,
  getProductEffectiveCartonSize
} from '../utils/formatters';
import { themes, getThemeBadges } from './ThemeConfig';
import { CategoryManagerModal } from './CategoryManagerModal';
import { InventoryAuditReport } from './InventoryAuditReport';
import { ProductFormModal } from './ProductFormModal';
import { SortableTableHeader } from './SortableTableHeader';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Eye, 
  EyeOff, 
  Boxes, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  Calculator,
  X, 
  Save, 
  AlertCircle,
  PlusCircle,
  MinusCircle,
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Ban,
  Check,
  BarChart3,
  FileSpreadsheet,
  Printer,
  PieChart,
  AlertTriangle,
  HelpCircle,
  FileText,
  Settings2,
  FolderPlus,
  SlidersHorizontal,
  CheckCircle2,
  Copy,
  Tag,
  DollarSign,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CreditCard,
  Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pagination } from './Pagination';
import { CustomValidationMessage } from './CustomValidationMessage';
import { SmartPriceInput } from './SmartPriceInput';

const getProductSmartLabel = (prod: Product): string => {
  return formatProductPackagingSpec(prod);
};

const isDefaultPackagingNote = (notes: string): boolean => {
  if (!notes) return false;
  const lower = notes.toLowerCase();
  return (
    (lower.includes('بسته') && lower.includes('عددی') && lower.includes('کارتن')) ||
    (lower.includes('بسته') && lower.includes('تایی') && lower.includes('کارتن'))
  );
};

interface InventoryManagerProps {
  products: Product[];
  settings: StoreSettings;
  isSecretMode: boolean;
  onToggleSecretMode: () => void;
  runWithSecurityCheck?: (
    title: string,
    subtitle: string,
    actionType?: 'edit' | 'delete',
    onSuccess?: () => void
  ) => void;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onRestockProduct?: (
    product: Product,
    piecesAdded: number,
    totalCost: number,
    paymentAccount: 'bank' | 'cash' | 'none'
  ) => void;
  customCategories?: string[];
  onAddCategory?: (category: string) => void;
  onEditCategory?: (oldName: string, newName: string) => void;
  onDeleteCategory?: (name: string) => void;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  settings,
  isSecretMode,
  onToggleSecretMode,
  runWithSecurityCheck,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onRestockProduct,
  customCategories: propCustomCategories,
  onAddCategory: propOnAddCategory,
  onEditCategory: propOnEditCategory,
  onDeleteCategory: propOnDeleteCategory,
  onShowAlert,
}) => {
  const theme = themes[settings.themeColor] || themes.teal;
  const badges = getThemeBadges(settings.themeColor);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // View mode: 'list' (standard table) or 'audit' (full inline report)
  const [isAuditView, setIsAuditView] = useState(false);

  // Category Management State
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('bazargani_inventory_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    return ['لواشک', 'آبنبات', 'شکلات', 'ترشک', 'پاستیل', 'آدامس', 'تنقلات', 'سایر'];
  });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryOld, setEditingCategoryOld] = useState<string | null>(null);
  const [editingCategoryNew, setEditingCategoryNew] = useState('');
  const [categoryActionSuccess, setCategoryActionSuccess] = useState<string | null>(null);

  // Sync customCategories to localStorage
  React.useEffect(() => {
    localStorage.setItem('bazargani_inventory_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  // Merge custom categories with any category present in products
  const allAvailableCategories = Array.from(
    new Set([
      ...customCategories,
      ...products.map(p => p.category).filter(Boolean)
    ])
  );

  const handleAddCategory = (eOrName?: React.FormEvent | string) => {
    if (eOrName && typeof eOrName === 'object' && 'preventDefault' in eOrName) {
      eOrName.preventDefault();
    }
    const nameToAdd = typeof eOrName === 'string' ? eOrName : newCategoryName;
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;
    if (allAvailableCategories.includes(trimmed)) {
      onShowAlert?.('این دسته‌بندی قبلاً ثبت شده است.', 'warning', 'دسته‌بندی تکراری');
      return;
    }
    setCustomCategories(prev => [...prev, trimmed]);
    setFormData(prev => ({ ...prev, category: trimmed }));
    setNewCategoryName('');
    if (onShowAlert) {
      onShowAlert(`دسته‌بندی «${trimmed}» با موفقیت افزوده شد.`, 'success', 'ثبت دسته‌بندی');
    }
    setCategoryActionSuccess(`دسته «${trimmed}» با موفقیت افزوده شد.`);
    setTimeout(() => setCategoryActionSuccess(null), 2500);
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCategoryOld(cat);
    setEditingCategoryNew(cat);
  };

  const handleSaveEditCategory = () => {
    if (!editingCategoryOld) return;
    const trimmedNew = editingCategoryNew.trim();
    if (!trimmedNew) return;
    if (trimmedNew === editingCategoryOld) {
      setEditingCategoryOld(null);
      return;
    }

    // Update customCategories list
    setCustomCategories(prev => prev.map(c => c === editingCategoryOld ? trimmedNew : c));

    // Update all existing products with the old category name
    const prodsToUpdate = products.filter(p => p.category === editingCategoryOld);
    prodsToUpdate.forEach(p => {
      onUpdateProduct({ ...p, category: trimmedNew });
    });

    if (formData.category === editingCategoryOld) {
      setFormData(prev => ({ ...prev, category: trimmedNew }));
    }

    if (onShowAlert) {
      onShowAlert(`نام دسته از «${editingCategoryOld}» به «${trimmedNew}» تغییر یافت.`, 'success', 'ویرایش دسته‌بندی');
    }
    setCategoryActionSuccess(`نام دسته از «${editingCategoryOld}» به «${trimmedNew}» تغییر یافت.`);
    setTimeout(() => setCategoryActionSuccess(null), 2500);
    setEditingCategoryOld(null);
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const productsInCat = products.filter(p => p.category === catToDelete);
    if (productsInCat.length > 0) {
      const confirmDelete = window.confirm(
        `تعداد ${productsInCat.length} کالا در دسته‌بندی «${catToDelete}» قرار دارند.\nآیا می‌خواهید این دسته را حذف کرده و دسته‌بندی این کالاها را به «سایر» تغییر دهید؟`
      );
      if (!confirmDelete) return;

      // Reassign to 'سایر'
      productsInCat.forEach(p => {
        onUpdateProduct({ ...p, category: 'سایر' });
      });
    }

    setCustomCategories(prev => prev.filter(c => c !== catToDelete));
    if (formData.category === catToDelete) {
      setFormData(prev => ({ ...prev, category: 'سایر' }));
    }

    if (onShowAlert) {
      onShowAlert(`دسته‌بندی «${catToDelete}» با موفقیت حذف گردید.`, 'info', 'حذف دسته‌بندی');
    }
    setCategoryActionSuccess(`دسته «${catToDelete}» حذف شد.`);
    setTimeout(() => setCategoryActionSuccess(null), 2500);
  };

  // Pagination State for products
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  // Zero Stock Confirmation Dialog State
  const [zeroConfirmProduct, setZeroConfirmProduct] = useState<Product | null>(null);

  // Inventory Audit Report Filter States
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('all');
  const [auditStockStatusFilter, setAuditStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'zero'>('all');
  const [auditCurrentPage, setAuditCurrentPage] = useState(1);
  const [auditItemsPerPage, setAuditItemsPerPage] = useState(20);
  const [auditCopied, setAuditCopied] = useState(false);

  const handleConfirmZeroStockAction = () => {
    if (!zeroConfirmProduct) return;
    onUpdateProduct({
      ...zeroConfirmProduct,
      stockPieces: 0
    });
    setZeroConfirmProduct(null);
    if (editingProduct && editingProduct.id === zeroConfirmProduct.id) {
      setIsModalOpen(false);
    }
    if (restockingProduct && restockingProduct.id === zeroConfirmProduct.id) {
      setRestockingProduct(null);
    }
  };

  // Quick Restock State
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  const [restockCartons, setRestockCartons] = useState<number>(0);
  const [restockPieces, setRestockPieces] = useState<number>(0);
  const [restockPurchasePrice, setRestockPurchasePrice] = useState<number>(0);
  const [restockPaymentAccount, setRestockPaymentAccount] = useState<'bank' | 'cash' | 'none'>('bank');

  const [showPurchasePricePeek, setShowPurchasePricePeek] = useState(false);
  const [peekCountdown, setPeekCountdown] = useState<number>(0);
  const peekIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleTriggerPurchasePricePeek = () => {
    setShowPurchasePricePeek(true);
    setPeekCountdown(5);

    if (peekIntervalRef.current) {
      clearInterval(peekIntervalRef.current);
    }

    peekIntervalRef.current = setInterval(() => {
      setPeekCountdown((prev) => {
        if (prev <= 1) {
          if (peekIntervalRef.current) clearInterval(peekIntervalRef.current);
          setShowPurchasePricePeek(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  React.useEffect(() => {
    return () => {
      if (peekIntervalRef.current) clearInterval(peekIntervalRef.current);
    };
  }, []);
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    category: string;
    purchasePrice: number;
    sellingPrice: number;
    piecesPerCarton: number;
    packsPerCarton: number;
    piecesPerPack: number;
    leavesPerPiece: number;
    stockCartons: number;
    stockPieces: number;
    unitTitle: string;
    minOrderCartons: number;
    notes: string;
  }>({
    name: '',
    category: '',
    purchasePrice: 0,
    sellingPrice: 0,
    piecesPerCarton: 0,
    packsPerCarton: 0,
    piecesPerPack: 0,
    leavesPerPiece: 0,
    stockCartons: 0,
    stockPieces: 0,
    unitTitle: 'عدد',
    minOrderCartons: 0,
    notes: '',
  });

  // Scroll to top when modal opens or category/view changes
  React.useEffect(() => {
    if (isModalOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isModalOpen]);

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Open modal for new product
  const handleOpenNew = () => {
    const execute = () => {
      setEditingProduct(null);
      setFormErrors({});
      setFormData({
        name: '',
        category: '',
        purchasePrice: 0,
        sellingPrice: 0,
        piecesPerCarton: 0,
        packsPerCarton: 0,
        piecesPerPack: 0,
        leavesPerPiece: 0,
        stockCartons: 0,
        stockPieces: 0,
        unitTitle: 'عدد',
        minOrderCartons: 0,
        notes: '',
      });
      setIsModalOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        'تایید پین‌کد جهت تعریف کالای جدید',
        'برای ثبت کالای جدید در انبار، پین‌کد مدیریت را وارد کنید.',
        'edit',
        execute
      );
    } else {
      execute();
    }
  };

  // Open modal for editing
  const handleOpenEdit = (prod: Product) => {
    const execute = () => {
      setEditingProduct(prod);
      setFormErrors({});
      const ppc = prod.piecesPerCarton || 1;
      const cartons = Math.floor(prod.stockPieces / ppc);
      setFormData({
        id: prod.id,
        name: prod.name,
        category: prod.category,
        purchasePrice: prod.purchasePrice,
        sellingPrice: prod.sellingPrice,
        piecesPerCarton: prod.piecesPerCarton,
        packsPerCarton: prod.packsPerCarton || 0,
        piecesPerPack: prod.piecesPerPack || 0,
        leavesPerPiece: prod.leavesPerPiece || 0,
        stockCartons: cartons,
        stockPieces: prod.stockPieces,
        unitTitle: prod.unitTitle || 'عدد',
        minOrderCartons: prod.minOrderCartons || 1,
        notes: prod.notes || '',
      });
      setIsModalOpen(true);
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        `تایید پین‌کد جهت ویرایش کالای «${prod.name}»`,
        'برای ورود به بخش ویرایش مشخصات، قیمت‌ها و موجودی کالا، پین‌کد مدیریت را وارد کنید.',
        'edit',
        execute
      );
    } else {
      execute();
    }
  };

  // Live calculation of carton pieces when packs change
  const handlePacksOrPiecesChange = (packs: number, perPack: number) => {
    const calculatedPieces = packs > 0 && perPack > 0 ? packs * perPack : formData.piecesPerCarton;
    setFormData(prev => ({
      ...prev,
      packsPerCarton: packs,
      piecesPerPack: perPack,
      piecesPerCarton: calculatedPieces,
    }));
  };

  // Save product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      errors.name = 'ورود نام کامل کالا الزامی است';
    }

    if (!formData.category.trim()) {
      errors.category = 'انتخاب یا ورود دسته‌بندی الزامی است';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        ...formData,
        id: editingProduct.id,
      });
    } else {
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        ...formData,
      };
      onAddProduct(newProduct);
    }
    setIsModalOpen(false);
  };

  // Quick stock adjustment (+ / - 1 carton)
  const adjustStockCarton = (prod: Product, deltaCartons: number) => {
    const ppc = getProductEffectiveCartonSize(prod);
    const deltaPieces = deltaCartons * ppc;
    const newStock = Math.max(0, prod.stockPieces + deltaPieces);
    onUpdateProduct({
      ...prod,
      stockPieces: newStock,
    });
  };

  // Trigger Zero Stock with Security Check
  const handleTriggerZeroConfirm = (prod: Product) => {
    const execute = () => {
      setZeroConfirmProduct(prod);
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        `تایید پین‌کد جهت صفر کردن موجودی کالای «${prod.name}»`,
        'برای صفر کردن موجودی این کالا، پین‌کد مدیریت را وارد کنید.',
        'delete',
        execute
      );
    } else {
      execute();
    }
  };

  // Open Quick Restock Modal
  const handleOpenRestock = (prod: Product) => {
    const execute = () => {
      setRestockingProduct(prod);
      setRestockCartons(0);
      setRestockPieces(0);
      setRestockPurchasePrice(prod.purchasePrice);
      setRestockPaymentAccount('bank');
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        `تایید پین‌کد جهت شارژ انبار کالای «${prod.name}»`,
        'برای ثبت شارژ و ورود محصول به انبار، پین‌کد مدیریت را وارد کنید.',
        'edit',
        execute
      );
    } else {
      execute();
    }
  };

  // Submit Quick Restock
  const handleSubmitRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingProduct) return;

    const ppc = getProductEffectiveCartonSize(restockingProduct);
    const piecesToAdd = (restockCartons * ppc) + restockPieces;
    if (piecesToAdd <= 0) {
      onShowAlert?.('لطفاً مقدار معتبری برای شارژ انبار وارد کنید.', 'warning', 'مقدار نامعتبر');
      return;
    }

    const effectivePrice = restockPurchasePrice > 0 ? restockPurchasePrice : restockingProduct.purchasePrice;
    const totalCost = piecesToAdd * effectivePrice;

    const updatedProduct: Product = {
      ...restockingProduct,
      stockPieces: restockingProduct.stockPieces + piecesToAdd,
      purchasePrice: effectivePrice,
    };

    if (onRestockProduct) {
      onRestockProduct(updatedProduct, piecesToAdd, totalCost, restockPaymentAccount);
    } else {
      onUpdateProduct(updatedProduct);
    }
    setRestockingProduct(null);
  };

  // Categories list - strictly unique, non-empty, and without duplicated 'all'
  const categories = useMemo(() => {
    const rawSet = new Set(
      products
        .map(p => (p.category || '').trim())
        .filter(c => c && c.toLowerCase() !== 'all')
    );
    return ['all', ...Array.from(rawSet)];
  }, [products]);

  // Sorting state
  type ProductSortField = 'index' | 'name' | 'price' | 'stock';
  const [sortField, setSortField] = useState<ProductSortField>('index');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const productSortOrder = sortDirection;
  const setProductSortOrder = (fnOrVal: any) => {
    if (typeof fnOrVal === 'function') {
      setSortDirection(prev => fnOrVal(prev));
    } else {
      setSortDirection(fnOrVal);
    }
  };

  const handleSort = (field: ProductSortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    if (hideZeroStock && p.stockPieces <= 0) return false;
    const matchesSearch = p.name.includes(searchQuery) || (p.notes && p.notes.includes(searchQuery));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name, 'fa');
      } else if (sortField === 'price') {
        cmp = a.sellingPrice - b.sellingPrice;
      } else if (sortField === 'stock') {
        cmp = a.stockPieces - b.stockPieces;
      } else {
        // index / time
        const aTime = (a as any).createdAt || (a.id.startsWith('prod-') ? Number(a.id.replace('prod-', '')) : 0);
        const bTime = (b as any).createdAt || (b.id.startsWith('prod-') ? Number(b.id.replace('prod-', '')) : 0);
        if (aTime && bTime && aTime !== bTime) {
          cmp = aTime - bTime;
        } else {
          const aIdx = products.indexOf(a);
          const bIdx = products.indexOf(b);
          cmp = bIdx - aIdx;
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredProducts, sortField, sortDirection, products]);

  // Reset page when category, search, hideZeroStock or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, hideZeroStock, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);

  // Stock summary totals
  const totalStockPieces = useMemo(() => {
    return products.reduce((acc, p) => acc + Math.max(0, Number(p.stockPieces) || 0), 0);
  }, [products]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (Math.max(0, Number(p.stockPieces) || 0) * (Number(p.purchasePrice) || 0)), 0);
  }, [products]);

  const totalPotentialRevenue = useMemo(() => {
    return products.reduce((acc, p) => acc + (Math.max(0, Number(p.stockPieces) || 0) * (Number(p.sellingPrice) || 0)), 0);
  }, [products]);

  // If user requested full inventory audit report, render inline view!
  if (isAuditView) {
    return (
      <InventoryAuditReport
        products={products}
        settings={settings}
        isSecretMode={isSecretMode}
        onBack={() => setIsAuditView(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 space-y-6">
      {/* Top Bar - Modernized & Executive */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl shadow-2xs border border-slate-200/90 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-5 transition-colors">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} text-xs font-black border ${theme.borderColor} shadow-2xs`}>
              <Boxes className="w-3.5 h-3.5" />
              <span>انبارداری و کاتالوگ محصولات</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{toPersianDigits(products.length)} قلم کالای فعال</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
              <Boxes className="w-5 h-5" />
            </div>
            <span>مدیریت کالاها و موجودی انبار</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
            تعریف ساختار کارتن، بسته و دانه، رصد لحظه‌ای کاردکس موجودی، تعیین بهای خرید و فروش و گزارش‌گیری ارزش انبار
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 max-w-full">
          {/* Purchase Price Peek Button (5 Seconds) - ONLY visible when Secret Mode is OFF */}
          {!isSecretMode && (
            <button
              id="peek-purchase-price-btn"
              type="button"
              onClick={handleTriggerPurchasePricePeek}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border shadow-2xs ${
                showPurchasePricePeek
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-800 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
              }`}
              title="کلیک کنید تا قیمت خرید کالاها به مدت ۵ ثانیه روی صفحه قرار گیرد"
            >
              {showPurchasePricePeek ? (
                <>
                  <Eye className="w-4 h-4 text-white animate-pulse shrink-0" />
                  <span>قیمت خرید ({toPersianDigits(peekCountdown)}s)</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>نمایش قیمت خرید</span>
                </>
              )}
            </button>
          )}

          {/* Manage Categories Button */}
          <button
            id="open-category-modal-btn"
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-700 dark:hover:text-violet-300 border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer shadow-2xs"
            title="مدیریت، ویرایش و افزودن دسته‌بندی‌های محصولات"
          >
            <FolderPlus className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
            <span>مدیریت دسته‌بندی‌ها</span>
          </button>

          {/* Inventory Full Audit & Breakdown Button */}
          <button
            id="open-inventory-audit-btn"
            type="button"
            onClick={() => setIsAuditView(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer shadow-2xs"
            title="مشاهده صورت حساب کامل انبار، جمع کارتن‌ها، دانه‌ای و ارزشیابی مالی"
          >
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>گزارش ارزش انبار</span>
          </button>

          {/* New Product CTA */}
          <button
            id="add-new-product-btn"
            type="button"
            onClick={handleOpenNew}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer ${theme.primary} ${theme.primaryHover} shrink-0`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>افزودن کالای جدید</span>
          </button>
        </div>
      </div>

      {/* Warehouse Summary Cards - Cohesive Rounded-3xl Style like ReturnsManager */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Total Items */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-blue-200/70 dark:border-blue-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">تعداد اقلام تعریف شده</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {toPersianDigits(products.length)} <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">قلم کالا</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>مجموع موجودی عددی:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
              {toPersianDigits(totalStockPieces.toLocaleString())} عدد
            </span>
          </div>
        </div>

        {/* Card 2: Total Cartons */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-amber-200/70 dark:border-amber-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">کارتن‌های فیزیکی انبار</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {toPersianDigits(products.reduce((acc, p) => {
              if (isProductUnpackaged(p)) return acc;
              const ppc = getProductEffectiveCartonSize(p);
              return acc + (ppc > 1 ? Math.floor(p.stockPieces / ppc) : 0);
            }, 0))} <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">کارتن کامل</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>آماده بارگیری و توزیع:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
              {toPersianDigits(products.filter(p => p.stockPieces > 0).length)} قلم موجود
            </span>
          </div>
        </div>

        {/* Card 3: Total Inventory Value */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">ارزش کل انبار (قیمت خرید)</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {!isSecretMode ? formatPrice(totalInventoryValue) : '••••••••'}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>سرمایه در گردش خرید:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {!isSecretMode ? 'موجودی فیزیکی' : 'حالت امنیتی'}
            </span>
          </div>
        </div>

        {/* Card 4: Potential Sales Revenue */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-purple-200/70 dark:border-purple-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400">پتانسیل فروش کل انبار</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-700 dark:text-purple-300 mt-3 dir-ltr text-right">
            {formatPrice(totalPotentialRevenue)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>سود پیش‌بینی توزیع:</span>
            <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">
              {!isSecretMode ? formatPrice(totalPotentialRevenue - totalInventoryValue) : 'نرخ مصوب'}
            </span>
          </div>
        </div>

      </div>

      {/* Search & Categories Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col gap-3.5 transition-colors">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی کالا در انبار (نام کالا، مشخصات بسته‌بندی، یادداشت...)"
              className={`w-full pr-10 pl-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${theme.ring} focus:outline-none text-xs text-black dark:text-white placeholder-slate-500 font-medium transition-colors`}
            />
          </div>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setProductSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer shadow-2xs shrink-0 select-none ${
              productSortOrder === 'desc'
                ? 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
            }`}
            title="تغییر ترتیب مرتب‌سازی کالاها (جدیدترین به قدیمی‌ترین / بالعکس)"
          >
            {productSortOrder === 'desc' ? (
              <>
                <ArrowDownWideNarrow className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>جدیدترین به اول</span>
              </>
            ) : (
              <>
                <ArrowUpNarrowWide className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>قدیمی‌ترین به اول</span>
              </>
            )}
          </button>

          {/* Hide Zero Stock Checkbox / Toggle */}
          <label 
            id="toggle-hide-zero-stock-inventory"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer select-none shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <input
              type="checkbox"
              checked={hideZeroStock}
              onChange={(e) => setHideZeroStock(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-0 cursor-pointer accent-teal-600"
            />
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              عدم نمایش موجودی صفر (فقط کالاهای موجود)
            </span>
            {hideZeroStock && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                فعال
              </span>
            )}
          </label>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto text-xs">
          {categories.map((cat, idx) => (
            <button
              key={`inv-cat-${cat || 'uncat'}-${idx}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap font-black text-xs transition-all cursor-pointer ${
                selectedCategory === cat
                  ? `${theme.primary} text-white shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat === 'all' ? 'همه دسته‌ها' : cat || 'بدون دسته'}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-black dark:text-slate-200 font-black border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <SortableTableHeader
                  field="index"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  align="center"
                  className="w-20"
                >
                  ردیف
                </SortableTableHeader>

                <SortableTableHeader
                  field="name"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="min-w-[220px]"
                >
                  شرح کالا و دسته‌بندی
                </SortableTableHeader>

                <SortableTableHeader
                  field="price"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                  className="min-w-[150px] text-left"
                >
                  {!isSecretMode || showPurchasePricePeek ? 'قیمت (فروش / خرید)' : 'قیمت فروش'}
                </SortableTableHeader>

                <SortableTableHeader
                  field="stock"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  align="center"
                  className="min-w-[150px]"
                >
                  موجودی کالا
                </SortableTableHeader>

                <th className="py-3.5 px-3 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <span>کالایی با فیلترها و معیارهای انتخاب‌شده یافت نشد.</span>
                    {hideZeroStock && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() => setHideZeroStock(false)}
                          className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800 text-xs font-black hover:bg-teal-100 transition-colors cursor-pointer"
                        >
                          نمایش کالاهای ناموجود (برداشتن تیک عدم نمایش موجودی صفر)
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((prod, idx) => {
                const isUnpack = isProductUnpackaged(prod);
                const ppc = getProductEffectiveCartonSize(prod);
                const cartonsInStock = (!isUnpack && ppc > 1) ? Math.floor(prod.stockPieces / ppc) : 0;
                const remainderInStock = (!isUnpack && ppc > 1) ? (prod.stockPieces % ppc) : prod.stockPieces;
                const margin = prod.sellingPrice > 0 ? ((prod.sellingPrice - prod.purchasePrice) / prod.sellingPrice) * 100 : 0;
                const unitProfit = prod.sellingPrice - prod.purchasePrice;

                return (
                  <tr key={`inv-prod-${prod.id || idx}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Index */}
                    <td className="py-3.5 px-3 text-center font-bold text-slate-500 dark:text-slate-500">
                      {toPersianDigits(startIndex + idx + 1)}
                    </td>

                    {/* Name, Category & Notes */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-black dark:text-white text-sm">{prod.name}</span>
                        {/* Category badge inside product description column */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-bold text-[10px] border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
                          <Tag className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                          <span>{prod.category || 'بدون دسته'}</span>
                        </span>
                      </div>

                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className={`${theme.primaryLight} ${theme.primaryText} px-2 py-0.5 rounded-md font-black border ${theme.borderColor} whitespace-nowrap shrink-0`}>
                          {getProductSmartLabel(prod)}
                        </span>
                        {prod.notes && !isDefaultPackagingNote(prod.notes) && (
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            | {prod.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Prices: Professional SaaS Typography without clashing pill boxes */}
                    <td className="py-3 px-3.5 text-left dir-ltr whitespace-nowrap">
                      {!isSecretMode || showPurchasePricePeek ? (
                        <div className="flex flex-col items-end gap-0.5">
                          {/* 1. Selling Price - Primary High Emphasis */}
                          <div className="flex items-center justify-end gap-1.5 font-mono">
                            <span className="text-[10px] font-sans font-medium text-slate-400 dark:text-slate-500">
                              فروش:
                            </span>
                            <span className="font-black text-slate-900 dark:text-white text-xs sm:text-[13px] tracking-tight">
                              {formatPrice(prod.sellingPrice)}
                            </span>
                          </div>

                          {/* 2. Purchase Price - Neutral Secondary */}
                          <div className="flex items-center justify-end gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="text-[10px] font-sans font-normal text-slate-400">
                              خرید:
                            </span>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              {formatPrice(prod.purchasePrice)}
                            </span>
                          </div>

                          {/* 3. Profit & Margin Indicator */}
                          {prod.sellingPrice > 0 && (
                            <div className="flex items-center justify-end gap-1 text-[10px] font-mono pt-0.5 mt-0.5 border-t border-slate-100 dark:border-slate-800/80 w-full max-w-[140px]">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                +{formatPrice(unitProfit)}
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-emerald-700 dark:text-emerald-300 font-black">
                                {toPersianDigits(margin.toFixed(0))}٪
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <div className={`font-black ${theme.primaryText} text-xs sm:text-sm font-mono dir-ltr tracking-tight`}>
                            {formatPrice(prod.sellingPrice)}
                          </div>
                          {prod.sellingPrice >= 1000 && (
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5" title={`به حروف: ${numberToPersianWords(prod.sellingPrice)}`}>
                              ({formatAmountScale(prod.sellingPrice)})
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Unified Stock, Carton & Packaging */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="font-black text-black dark:text-white text-sm">
                          {toPersianDigits(prod.stockPieces.toLocaleString())} {prod.unitTitle || 'عدد'}
                        </div>
                        {prod.stockPieces <= 0 ? (
                          <div className="inline-flex px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-md font-bold text-[10px] border border-rose-200 dark:border-rose-900/60 whitespace-nowrap shrink-0">
                            موجودی صفر
                          </div>
                        ) : isUnpack || ppc <= 1 ? (
                          <div className={`inline-flex px-2 py-0.5 ${badges.draft} rounded-md font-bold text-[10px] whitespace-nowrap shrink-0`}>
                            بدون کارتن (دانه‌ای)
                          </div>
                        ) : cartonsInStock > 0 && remainderInStock > 0 ? (
                          <div className={`inline-flex px-2 py-0.5 ${badges.stock} rounded-md font-black text-[10px] whitespace-nowrap shrink-0`}>
                            {toPersianDigits(cartonsInStock)} کارتن + {toPersianDigits(remainderInStock)} دانه
                          </div>
                        ) : cartonsInStock > 0 ? (
                          <div className={`inline-flex px-2 py-0.5 ${badges.stock} rounded-md font-black text-[10px] whitespace-nowrap shrink-0`}>
                            {toPersianDigits(cartonsInStock)} کارتن کامل
                          </div>
                        ) : (
                          <div className="inline-flex px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-md font-black text-[10px] border border-amber-200 dark:border-amber-900/60 whitespace-nowrap shrink-0">
                            {toPersianDigits(remainderInStock)} دانه (&lt; ۱ کارتن)
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Flat Modern Action buttons */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                        <button
                          onClick={() => handleOpenRestock(prod)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                          title="شارژ موجودی (خرید مجدد)"
                        >
                          <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                        </button>
                        {prod.stockPieces > 0 ? (
                          <button
                            onClick={() => handleTriggerZeroConfirm(prod)}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                            title="صفر کردن موجودی کالا با تأیید"
                          >
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-black border border-rose-200 dark:border-rose-900/60 whitespace-nowrap shrink-0">
                            صفر
                          </span>
                        )}
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                          title="ویرایش کالا و تنظیم موجودی"
                        >
                          <Edit className="w-3.5 h-3.5 shrink-0" />
                        </button>
                        <button
                          onClick={() => {
                            onDeleteProduct(prod.id);
                          }}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                          title="حذف کالا از انبار"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
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
          itemName="کالا"
          themeColor={settings.themeColor}
        />
      </div>

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaveProduct={(savedProduct) => {
          if (editingProduct) {
            onUpdateProduct(savedProduct);
            onShowAlert?.(`کالای «${savedProduct.name}» با موفقیت بروزرسانی شد.`, 'success', 'ویرایش کالا');
          } else {
            onAddProduct(savedProduct);
            onShowAlert?.(`کالای «${savedProduct.name}» به انبار اضافه شد.`, 'success', 'ثبت کالا');
          }
          setIsModalOpen(false);
        }}
        editingProduct={editingProduct}
        products={products}
        settings={settings}
        customCategories={propCustomCategories || customCategories}
        onAddCategory={propOnAddCategory || ((cat) => setCustomCategories(prev => [...prev, cat]))}
        onEditCategory={propOnEditCategory || ((oldName, newName) => setCustomCategories(prev => prev.map(c => c === oldName ? newName : c)))}
        onDeleteCategory={propOnDeleteCategory || ((name) => setCustomCategories(prev => prev.filter(c => c !== name)))}
        onShowAlert={onShowAlert}
      />

      {/* Quick Restock / Charge Product Modal */}
      <AnimatePresence>
        {restockingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden text-xs text-slate-900 dark:text-slate-100"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    شارژ سریع موجودی کالا (خرید جدید)
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                    افزایش موجودی انبار بدون نیاز به تغییر فیلدهای دیگر کالا
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRestockingProduct(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitRestock} className="p-5 space-y-4">
                {/* Product Info Banner */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-400 font-bold mb-0.5">نام محصول:</div>
                  <div className="text-sm font-black text-slate-900 dark:text-white mb-2">{restockingProduct.name}</div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                    <div>
                      موجودی فعلی: <b className="text-slate-900 dark:text-white font-extrabold">{toPersianDigits(restockingProduct.stockPieces.toLocaleString())} عدد</b> {!isProductUnpackaged(restockingProduct) && getProductEffectiveCartonSize(restockingProduct) > 1 ? `(${toPersianDigits(Math.floor(restockingProduct.stockPieces / getProductEffectiveCartonSize(restockingProduct)))} کارتن)` : '(بدون بسته‌بندی)'}
                    </div>
                    <div>دسته‌بندی: <b className="text-slate-900 dark:text-white font-extrabold">{restockingProduct.category}</b></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تعداد کارتن جهت شارژ</label>
                    <input
                      type="number"
                      min="0"
                      value={restockCartons || ''}
                      onChange={(e) => setRestockCartons(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="مثلاً ۵ کارتن"
                      disabled={isProductUnpackaged(restockingProduct) || getProductEffectiveCartonSize(restockingProduct) <= 1}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-extrabold focus:ring-2 focus:ring-emerald-500 text-xs disabled:opacity-50"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {isProductUnpackaged(restockingProduct) || getProductEffectiveCartonSize(restockingProduct) <= 1 
                        ? 'کالای بدون کارتن (فقط دانه وارد کنید)' 
                        : `معادل ${toPersianDigits((restockCartons * getProductEffectiveCartonSize(restockingProduct)).toLocaleString())} عدد`}
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تعداد تکه / دانه اضافه</label>
                    <input
                      type="number"
                      min="0"
                      value={restockPieces || ''}
                      onChange={(e) => setRestockPieces(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="دانه تک"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-extrabold focus:ring-2 focus:ring-emerald-500 text-xs"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">جمعاً {toPersianDigits(((restockCartons * getProductEffectiveCartonSize(restockingProduct)) + restockPieces).toLocaleString())} عدد شارژ می‌شود</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">به‌روزرسانی قیمت خرید جدید (تومان)</label>
                  <input
                    type="number"
                    min="0"
                    value={restockPurchasePrice || ''}
                    onChange={(e) => setRestockPurchasePrice(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="قیمت خرید فعلی"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 font-extrabold focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">قیمت قبلی: {toPersianDigits(restockingProduct.purchasePrice.toLocaleString())} تومان</span>
                </div>

                {/* Real-time Purchase Cost & Liquidity Deduction Account */}
                {(() => {
                  const piecesCount = (restockCartons * getProductEffectiveCartonSize(restockingProduct)) + restockPieces;
                  const effPrice = restockPurchasePrice > 0 ? restockPurchasePrice : restockingProduct.purchasePrice;
                  const totalCost = piecesCount * effPrice;
                  if (totalCost <= 0) return null;

                  return (
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">مجموع بهای خرید این بار:</span>
                        <span className={`text-sm font-black ${theme.primaryText}`}>
                          {formatPrice(totalCost)}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          کسر وجه خرید از نقدینگی و دارایی‌ها:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setRestockPaymentAccount('bank')}
                            className={`py-2 px-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              restockPaymentAccount === 'bank'
                                ? `${theme.primary} text-white shadow-xs font-black`
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>بانک</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestockPaymentAccount('cash')}
                            className={`py-2 px-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              restockPaymentAccount === 'cash'
                                ? `${theme.primary} text-white shadow-xs font-black`
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>صندوق</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestockPaymentAccount('none')}
                            className={`py-2 px-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              restockPaymentAccount === 'none'
                                ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs font-black'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span>خرید نسیه</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    {restockingProduct.stockPieces > 0 && (
                      <button
                        type="button"
                        onClick={() => setZeroConfirmProduct(restockingProduct)}
                        className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px] font-bold cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                        <span>صفر کردن موجودی کالا</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRestockingProduct(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      تایید و شارژ موجودی
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Custom Confirmation Modal for Zeroing Stock */}
        {zeroConfirmProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    تأیید صفر کردن موجودی کالا ⚠️
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    لطفاً قبل از صفر کردن، صورت حساب موجودی این کالا را بررسی کنید
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">نام کالا:</span>
                  <span className="font-black text-slate-900 dark:text-white">{zeroConfirmProduct.name}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">موجودی فعلی:</span>
                  <span className="font-bold text-amber-900 dark:text-amber-300">
                    {!isProductUnpackaged(zeroConfirmProduct) && getProductEffectiveCartonSize(zeroConfirmProduct) > 1 
                      ? `${toPersianDigits(Math.floor(zeroConfirmProduct.stockPieces / getProductEffectiveCartonSize(zeroConfirmProduct)))} کارتن (${toPersianDigits(zeroConfirmProduct.stockPieces.toLocaleString())} دانه)`
                      : `${toPersianDigits(zeroConfirmProduct.stockPieces.toLocaleString())} دانه (بدون کارتن)`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">ارزش ریالی خرید (سرمایه):</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {!isSecretMode ? formatPrice(zeroConfirmProduct.stockPieces * zeroConfirmProduct.purchasePrice) : '🔒 محرمانه'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">ارزش ریالی فروش کالا:</span>
                  <span className={`font-bold ${theme.primaryText}`}>
                    {formatPrice(zeroConfirmProduct.stockPieces * zeroConfirmProduct.sellingPrice)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                آیا مطمئن هستید که می‌خواهید موجودی کالای فوق به <b>صفر (۰)</b> تغییر یابد؟
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setZeroConfirmProduct(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleConfirmZeroStockAction}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>تأیید و صفر کردن موجودی</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Category Manager Modal */}
        <CategoryManagerModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categories={customCategories}
          products={products}
          onAddCategory={handleAddCategory}
          onEditCategory={handleSaveEditCategory}
          onDeleteCategory={handleDeleteCategory}
          themeColor={settings.themeColor}
          onShowAlert={onShowAlert}
        />
      </AnimatePresence>
    </div>
  );
};
