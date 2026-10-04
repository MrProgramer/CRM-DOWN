import React, { useState, useEffect, useMemo } from 'react';
import { Product, StoreSettings, InvoiceItem, ThemeColor } from '../types';
import { formatPrice, formatAmountScale, toPersianDigits, formatProductPackagingSpec, detectCategoryFromName } from '../utils/formatters';
import { themes } from './ThemeConfig';
import { SmartPriceInput } from './SmartPriceInput';
import { CategoryManagerModal } from './CategoryManagerModal';
import { ProductFormModal } from './ProductFormModal';
import { 
  Boxes, 
  Plus, 
  CheckCircle2, 
  X, 
  Search, 
  Calculator, 
  Sparkles, 
  AlertCircle, 
  Check, 
  PackagePlus,
  Layers,
  FolderPlus,
  Package,
  Hash,
  Pencil,
  Edit3,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Wallet,
  Building2,
  ShieldCheck,
  AlertTriangle,
  TrendingDown,
  Coins,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InwardProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings?: StoreSettings;
  isSecretMode?: boolean;
  themeColor?: string;
  customCategories?: string[];
  onAddInwardItem?: (
    item: InvoiceItem, 
    newProductToCreate?: Product,
    updateExistingProductPrice?: { productId: string; newPurchasePrice: number; newSellingPrice?: number },
    keepModalOpen?: boolean
  ) => void;
  onAddProductToInvoice?: (
    item: InvoiceItem, 
    newProductToCreate?: Product,
    updateExistingProductPrice?: { productId: string; newPurchasePrice: number; newSellingPrice?: number },
    keepModalOpen?: boolean
  ) => void;
  onUpdateProduct?: (product: Product) => void;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
  liquidityBalances?: {
    cashBalance: number;
    bankBalance: number;
    totalLiquidity: number;
  };
  supplierName?: string;
  supplierBalance?: number;
  currentInvoiceSubtotal?: number;
  currentItemsCount?: number;
}

export const InwardProductModal: React.FC<InwardProductModalProps> = ({
  isOpen,
  onClose,
  products = [],
  settings,
  isSecretMode,
  themeColor,
  customCategories = [],
  onAddInwardItem,
  onAddProductToInvoice,
  onUpdateProduct,
  onShowAlert,
  liquidityBalances,
  supplierName,
  supplierBalance = 0,
  currentInvoiceSubtotal = 0,
  currentItemsCount = 0,
}) => {
  const activeColorKey = themeColor || settings?.themeColor || 'teal';
  const theme = themes[activeColorKey] || themes.teal;
  const submitInwardItem = onAddInwardItem || onAddProductToInvoice;

  // Determine if profit/loss information should be displayed (if secret mode is disabled)
  const isProfitVisible = isSecretMode !== undefined
    ? !isSecretMode
    : (() => {
        try {
          return localStorage.getItem('bazargani_secret_mode_v2') !== 'true' && localStorage.getItem('dastaval_secret_mode_v2') !== 'true';
        } catch {
          return true;
        }
      })();

  // --- INWARD PURCHASING POWER & FINANCIAL INTELLIGENCE CALCULATIONS ---
  const totalLiquidity = useMemo(() => {
    if (liquidityBalances) {
      return (Number(liquidityBalances.cashBalance) || 0) + (Number(liquidityBalances.bankBalance) || 0);
    }
    return 0;
  }, [liquidityBalances]);

  const cashBal = Number(liquidityBalances?.cashBalance) || 0;
  const bankBal = Number(liquidityBalances?.bankBalance) || 0;

  // Supplier Balance: positive = supplier owes us (بدهی تامین‌کننده به ما / طلب ما), negative = we owe supplier (بدهی ما به تامین‌کننده)
  const supplierDebtToUs = supplierBalance > 0 ? supplierBalance : 0;
  const ourDebtToSupplier = supplierBalance < 0 ? Math.abs(supplierBalance) : 0;

  // Maximum purchasing power without creating credit / debt:
  // Can purchase up to total liquid cash + whatever can be offset against existing debt of supplier to us!
  const maxNonCreditPurchasingPower = totalLiquidity + supplierDebtToUs;

  // Keep modal open checkbox state (persisted)
  const [keepOpenAfterAdd, setKeepOpenAfterAdd] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bazargani_inward_keep_open');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Active Tab: 'existing' (شارژ و ورود کالای موجود) or 'new' (تعریف کالای جدید)
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('new');

  // Search & Filter for existing products
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedExistingProduct, setSelectedExistingProduct] = useState<Product | null>(null);

  // Hide zero-stock products state (persisted to localStorage, default true)
  const [hideZeroStock, setHideZeroStock] = useState<boolean>(() => {
    const saved = localStorage.getItem('bazargani_inward_hide_zero_stock');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return true;
      }
    }
    return true; // Default to true as requested
  });

  useEffect(() => {
    localStorage.setItem('bazargani_inward_hide_zero_stock', JSON.stringify(hideZeroStock));
  }, [hideZeroStock]);

  // Existing product inward form state (STRICTLY INWARD / PURCHASE)
  const [existingCartons, setExistingCartons] = useState<number | ''>('');
  const [existingPacks, setExistingPacks] = useState<number | ''>('');
  const [existingPiecesPerPack, setExistingPiecesPerPack] = useState<number | ''>('');
  const [existingPiecesPerCarton, setExistingPiecesPerCarton] = useState<number | ''>('');
  const [existingExtraPieces, setExistingExtraPieces] = useState<number | ''>('');
  const [existingTotalPieces, setExistingTotalPieces] = useState<number | ''>('');
  const [existingPurchasePrice, setExistingPurchasePrice] = useState<number>(0);
  const [existingSellingPrice, setExistingSellingPrice] = useState<number>(0);
  const [distinctNewName, setDistinctNewName] = useState('');
  const [distinctHandlingMode, setDistinctHandlingMode] = useState<'create_distinct' | 'update_existing'>('create_distinct');

  // In-modal Edit Product Form for selected existing product
  const [isEditingProductDetails, setIsEditingProductDetails] = useState(false);
  const [editProdName, setEditProdName] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('');
  const [editProdUnit, setEditProdUnit] = useState('');
  const [editProdPacks, setEditProdPacks] = useState<number | ''>('');
  const [editProdPpp, setEditProdPpp] = useState<number | ''>('');
  const [editProdTotalPerCarton, setEditProdTotalPerCarton] = useState<number | ''>('');
  const [editProdPurchasePrice, setEditProdPurchasePrice] = useState<number>(0);
  const [editProdSellingPrice, setEditProdSellingPrice] = useState<number>(0);

  // New product inward form state (COMPLETELY EMPTY DEFAULT TEXTBOXES)
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(customCategories[0] || 'تنقلات');
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newLeavesPerPiece, setNewLeavesPerPiece] = useState<number | undefined>(undefined);
  
  // Section 2: 1-Carton Packaging Calculator State (Clean empty by default)
  const [newPacksPerCarton, setNewPacksPerCarton] = useState<number | ''>('');
  const [newPiecesPerPack, setNewPiecesPerPack] = useState<number | ''>('');
  const [newPiecesPerCarton, setNewPiecesPerCarton] = useState<number | ''>('');

  // Section 3: Inward Invoice Receiving Quantity, Purchase Price & Selling Price
  const [newCartons, setNewCartons] = useState<number | ''>('');
  const [newExtraPieces, setNewExtraPieces] = useState<number | ''>('');
  const [newPurchasePrice, setNewPurchasePrice] = useState<number>(0);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(0);
  const [newNotes, setNewNotes] = useState('');

  // Unpackaged & Unknown Cartons Modes
  const [isExistingUnpackaged, setIsExistingUnpackaged] = useState<boolean>(false);
  const [isNewUnpackaged, setIsNewUnpackaged] = useState<boolean>(false);
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<string | null>(null);

  // Modals & Validation
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const resetNewProductForm = () => {
    setNewName('');
    setNewCategory(customCategories[0] || 'تنقلات');
    setAutoDetectedCategory(null);
    setIsNewUnpackaged(false);
    setNewUnitTitle('');
    setNewLeavesPerPiece(undefined);
    setNewPacksPerCarton('');
    setNewPiecesPerPack('');
    setNewPiecesPerCarton('');
    setNewCartons('');
    setNewExtraPieces('');
    setNewPurchasePrice(0);
    setNewSellingPrice(0);
    setNewNotes('');
    setFormErrors({});
  };

  const resetExistingProductForm = () => {
    setIsExistingUnpackaged(false);
    setExistingCartons('');
    setExistingPacks('');
    setExistingPiecesPerPack('');
    setExistingPiecesPerCarton('');
    setExistingExtraPieces('');
    setExistingTotalPieces('');
    setExistingPurchasePrice(0);
    setExistingSellingPrice(0);
    setIsEditingProductDetails(false);
    setFormErrors({});
  };

  // Synchronize pieces per carton on packaging changes (New Product Tab)
  const handlePacksPerCartonChanged = (val: string | number) => {
    if (val === '' || val === undefined) {
      setNewPacksPerCarton('');
      return;
    }
    const num = Math.max(1, typeof val === 'number' ? val : parseInt(val) || 1);
    setNewPacksPerCarton(num);
    if (typeof newPiecesPerPack === 'number' && newPiecesPerPack > 1 && num > 1) {
      setNewPiecesPerCarton(num * newPiecesPerPack);
    }
  };

  const handlePiecesPerPackChanged = (val: string | number) => {
    if (val === '' || val === undefined) {
      setNewPiecesPerPack('');
      return;
    }
    const num = Math.max(1, typeof val === 'number' ? val : parseInt(val) || 1);
    setNewPiecesPerPack(num);
    if (typeof newPacksPerCarton === 'number' && newPacksPerCarton > 1 && num > 1) {
      setNewPiecesPerCarton(newPacksPerCarton * num);
    }
  };

  const handlePiecesPerCartonChanged = (val: string | number) => {
    if (val === '' || val === undefined) {
      setNewPiecesPerCarton('');
      return;
    }
    const num = Math.max(1, typeof val === 'number' ? val : parseInt(val) || 1);
    setNewPiecesPerCarton(num);
  };

  // Synchronize packaging & quantity for Existing Product Tab
  const handleExistingCartonsChange = (val: string | number) => {
    const cartons = val === '' ? '' : Math.max(0, typeof val === 'number' ? val : parseInt(val) || 0);
    setExistingCartons(cartons);

    const ppc = typeof existingPiecesPerCarton === 'number' && existingPiecesPerCarton > 0
      ? existingPiecesPerCarton
      : (typeof existingPacks === 'number' && typeof existingPiecesPerPack === 'number' && existingPacks > 1 && existingPiecesPerPack > 1
          ? existingPacks * existingPiecesPerPack
          : selectedExistingProduct?.piecesPerCarton || 480);

    const cartonsNum = typeof cartons === 'number' ? cartons : 0;
    const extraNum = typeof existingExtraPieces === 'number' ? existingExtraPieces : 0;
    setExistingTotalPieces(cartons === '' && existingExtraPieces === '' ? '' : (cartonsNum * ppc) + extraNum);
  };

  const handleExistingPacksChange = (val: string | number) => {
    const packs = val === '' ? '' : Math.max(1, typeof val === 'number' ? val : parseInt(val) || 1);
    setExistingPacks(packs);
    
    const ppp = typeof existingPiecesPerPack === 'number' && existingPiecesPerPack > 0 
      ? existingPiecesPerPack 
      : (selectedExistingProduct?.piecesPerPack || 24);
    
    let currentPpc = typeof existingPiecesPerCarton === 'number' && existingPiecesPerCarton > 0
      ? existingPiecesPerCarton
      : (selectedExistingProduct?.piecesPerCarton || 1);

    if (typeof packs === 'number' && packs > 1 && ppp > 1) {
      currentPpc = packs * ppp;
      setExistingPiecesPerCarton(currentPpc);
    }

    const cartonsNum = typeof existingCartons === 'number' ? existingCartons : 0;
    const extraNum = typeof existingExtraPieces === 'number' ? existingExtraPieces : 0;
    setExistingTotalPieces(existingCartons === '' && existingExtraPieces === '' ? '' : (cartonsNum * currentPpc) + extraNum);
  };

  const handleExistingPiecesPerPackChange = (val: string | number) => {
    const ppp = val === '' ? '' : Math.max(1, typeof val === 'number' ? val : parseInt(val) || 1);
    setExistingPiecesPerPack(ppp);
    
    const packs = typeof existingPacks === 'number' && existingPacks > 0 
      ? existingPacks 
      : (selectedExistingProduct?.packsPerCarton || 20);

    let currentPpc = typeof existingPiecesPerCarton === 'number' && existingPiecesPerCarton > 0
      ? existingPiecesPerCarton
      : (selectedExistingProduct?.piecesPerCarton || 1);

    if (typeof ppp === 'number' && ppp > 1 && packs > 1) {
      currentPpc = packs * ppp;
      setExistingPiecesPerCarton(currentPpc);
    }

    const cartonsNum = typeof existingCartons === 'number' ? existingCartons : 0;
    const extraNum = typeof existingExtraPieces === 'number' ? existingExtraPieces : 0;
    setExistingTotalPieces(existingCartons === '' && existingExtraPieces === '' ? '' : (cartonsNum * currentPpc) + extraNum);
  };

  const handleExistingPiecesPerCartonChange = (val: string | number) => {
    const ppc = val === '' ? '' : Math.max(1, typeof val === 'number' ? val : parseInt(val) || 1);
    setExistingPiecesPerCarton(ppc);

    const cartonsNum = typeof existingCartons === 'number' ? existingCartons : 0;
    const extraNum = typeof existingExtraPieces === 'number' ? existingExtraPieces : 0;
    const ppcNum = typeof ppc === 'number' ? ppc : 1;

    // If total pieces is already established and cartons was equal to total pieces (e.g. unknown carton),
    // preserve total pieces and recalculate cartons
    if (typeof existingTotalPieces === 'number' && existingTotalPieces > 0 && (cartonsNum === existingTotalPieces || cartonsNum === 0)) {
      setExistingCartons(Math.floor(existingTotalPieces / ppcNum));
      setExistingExtraPieces(existingTotalPieces % ppcNum);
    } else {
      setExistingTotalPieces(existingCartons === '' && existingExtraPieces === '' ? '' : (cartonsNum * ppcNum) + extraNum);
    }
  };

  const handleExistingExtraPiecesChange = (val: string | number) => {
    const extra = val === '' ? '' : Math.max(0, typeof val === 'number' ? val : parseInt(val) || 0);
    setExistingExtraPieces(extra);

    const ppc = typeof existingPiecesPerCarton === 'number' && existingPiecesPerCarton > 0
      ? existingPiecesPerCarton
      : (typeof existingPacks === 'number' && typeof existingPiecesPerPack === 'number' && existingPacks > 0 && existingPiecesPerPack > 0
          ? existingPacks * existingPiecesPerPack
          : selectedExistingProduct?.piecesPerCarton || 480);

    const cartonsNum = typeof existingCartons === 'number' ? existingCartons : 0;
    const extraNum = typeof extra === 'number' ? extra : 0;
    setExistingTotalPieces(existingCartons === '' && extra === '' ? '' : (cartonsNum * ppc) + extraNum);
  };

  const handleExistingTotalPiecesChange = (val: string | number) => {
    const total = val === '' ? '' : Math.max(0, typeof val === 'number' ? val : parseInt(val) || 0);
    setExistingTotalPieces(total);

    const ppc = typeof existingPiecesPerCarton === 'number' && existingPiecesPerCarton > 0
      ? existingPiecesPerCarton
      : (selectedExistingProduct?.piecesPerCarton || 480);

    if (typeof total === 'number' && ppc > 0) {
      setExistingCartons(Math.floor(total / ppc));
      setExistingExtraPieces(total % ppc);
    } else if (total === '') {
      setExistingCartons('');
      setExistingExtraPieces('');
    }
  };

  // Reset states on modal open - ALWAYS start with completely clean textboxes in 'new' tab
  useEffect(() => {
    if (isOpen) {
      resetNewProductForm();
      resetExistingProductForm();
      setActiveTab('new');
      setFormErrors({});
      if (products.length > 0 && !selectedExistingProduct) {
        handleSelectProduct(products[0]);
      }
    }
  }, [isOpen]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    customCategories.forEach(c => set.add(c));
    return ['all', ...Array.from(set)];
  }, [products, customCategories]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (hideZeroStock && (p.stockPieces || 0) <= 0) {
        return false;
      }
      const matchSearch = !searchQuery.trim() || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory, hideZeroStock]);

  const handleSelectProduct = (prod: Product) => {
    setSelectedExistingProduct(prod);
    const isUnpack = !!(prod.isUnpackaged || prod.isCartonUnknown || (prod.piecesPerCarton || 1) <= 1);
    setIsExistingUnpackaged(isUnpack);
    setExistingPurchasePrice(prod.purchasePrice || 0);
    setExistingSellingPrice(prod.sellingPrice || 0);
    setDistinctNewName(`${prod.name} (فی جدید ${formatPrice(prod.purchasePrice || 0)})`);
    setDistinctHandlingMode('create_distinct');

    const ppc = prod.piecesPerCarton || 0;
    let packs = prod.packsPerCarton || 0;
    let ppp = prod.piecesPerPack || 0;

    if (ppc > 0) {
      if (packs > 0 && ppp === 0) {
        ppp = Math.round(ppc / packs);
      } else if (ppp > 0 && packs === 0) {
        packs = Math.round(ppc / ppp);
      } else if (packs === 0 && ppp === 0) {
        packs = 1;
        ppp = ppc;
      }
    } else {
      packs = packs || 20;
      ppp = ppp || 24;
    }
    const finalPpc = ppc > 0 ? ppc : (packs * ppp);

    setExistingPacks(packs);
    setExistingPiecesPerPack(ppp);
    setExistingPiecesPerCarton(finalPpc);
    setExistingCartons('');
    setExistingExtraPieces('');
    setExistingTotalPieces('');

    // populate edit fields
    setEditProdName(prod.name);
    setEditProdCategory(prod.category || '');
    setEditProdUnit(prod.unitTitle || 'عدد');
    setEditProdPacks(packs);
    setEditProdPpp(ppp);
    setEditProdTotalPerCarton(finalPpc);
    setEditProdPurchasePrice(prod.purchasePrice || 0);
    setEditProdSellingPrice(prod.sellingPrice || 0);
    setIsEditingProductDetails(false);
  };

  const handleSaveProductFromModal = (updated: Product) => {
    setSelectedExistingProduct(updated);
    setExistingPacks(updated.packsPerCarton || 20);
    setExistingPiecesPerPack(updated.piecesPerPack || 24);
    setExistingPiecesPerCarton(updated.piecesPerCarton || 480);
    if (updated.purchasePrice) setExistingPurchasePrice(updated.purchasePrice);
    if (updated.sellingPrice) setExistingSellingPrice(updated.sellingPrice);
    onUpdateProduct?.(updated);
    setIsEditingProductDetails(false);
    onShowAlert?.(`مشخصات کالای «${updated.name}» با موفقیت در انبار به‌روزرسانی شد.`, 'success', 'ویرایش کالا');
  };

  // Check if purchase price is different for existing product
  const isPurchasePriceDifferent = useMemo(() => {
    if (!selectedExistingProduct) return false;
    const oldPrice = Number(selectedExistingProduct.purchasePrice) || 0;
    const newPrice = Number(existingPurchasePrice) || 0;
    return oldPrice > 0 && newPrice > 0 && oldPrice !== newPrice;
  }, [selectedExistingProduct, existingPurchasePrice]);

  // Update distinct item name suggestion when purchase price changes
  useEffect(() => {
    if (selectedExistingProduct && isPurchasePriceDifferent) {
      setDistinctNewName(`${selectedExistingProduct.name} (فی ${formatPrice(existingPurchasePrice)})`);
    }
  }, [existingPurchasePrice, isPurchasePriceDifferent, selectedExistingProduct]);

  // --- REAL-TIME IMPACT ON PURCHASING CAPACITY & LIQUIDITY ---
  const currentItemEstimatedCost = useMemo(() => {
    if (activeTab === 'existing') {
      const cartonsNum = typeof existingCartons === 'number' ? existingCartons : 0;
      const extraNum = typeof existingExtraPieces === 'number' ? existingExtraPieces : 0;
      const ppc = typeof existingPiecesPerCarton === 'number' && existingPiecesPerCarton > 0
        ? existingPiecesPerCarton
        : (selectedExistingProduct?.piecesPerCarton || 480);
      const totalPieces = typeof existingTotalPieces === 'number'
        ? existingTotalPieces
        : (cartonsNum * ppc + extraNum);
      const unitCost = existingPurchasePrice > 0 ? existingPurchasePrice : (selectedExistingProduct?.purchasePrice || 0);
      return totalPieces * unitCost;
    } else {
      const cartonsNum = typeof newCartons === 'number' ? newCartons : 0;
      const extraNum = typeof newExtraPieces === 'number' ? newExtraPieces : 0;
      const ppc = typeof newPiecesPerCarton === 'number' && newPiecesPerCarton > 0 ? newPiecesPerCarton : 1;
      const totalPieces = (cartonsNum * ppc) + extraNum;
      const unitCost = newPurchasePrice > 0 ? newPurchasePrice : 0;
      return totalPieces * unitCost;
    }
  }, [
    activeTab, 
    existingCartons, 
    existingExtraPieces, 
    existingPiecesPerCarton, 
    selectedExistingProduct, 
    existingTotalPieces, 
    existingPurchasePrice, 
    newCartons, 
    newExtraPieces, 
    newPiecesPerCarton, 
    newPurchasePrice
  ]);

  const baseInvoiceSubtotal = currentInvoiceSubtotal || 0;
  const projectedInvoiceTotal = baseInvoiceSubtotal + currentItemEstimatedCost;
  const remainingNonCreditCapacity = maxNonCreditPurchasingPower - projectedInvoiceTotal;
  const willExceedCashCapacity = remainingNonCreditCapacity < 0;
  const exceedingCreditAmount = willExceedCashCapacity ? Math.abs(remainingNonCreditCapacity) : 0;
  const capacityPercent = maxNonCreditPurchasingPower > 0
    ? Math.min(100, Math.round((projectedInvoiceTotal / maxNonCreditPurchasingPower) * 100))
    : 0;

  if (!isOpen) return null;

  // Submit Handler for Existing Product (Strictly Inward / Purchase)
  const handleSubmitExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExistingProduct) {
      onShowAlert?.('لطفاً کالای مورد نظر را از لیست انتخاب کنید.', 'warning', 'انتخاب کالا');
      return;
    }

    const isUnpack = isExistingUnpackaged;
    const packs = isUnpack ? 1 : (Number(existingPacks) > 0 ? Number(existingPacks) : (Number(selectedExistingProduct.packsPerCarton) > 0 ? Number(selectedExistingProduct.packsPerCarton) : 1));
    const ppp = isUnpack ? 1 : (Number(existingPiecesPerPack) > 0 ? Number(existingPiecesPerPack) : (Number(selectedExistingProduct.piecesPerPack) > 0 ? Number(selectedExistingProduct.piecesPerPack) : 1));
    const piecesPerCarton = isUnpack ? 1 : (Number(existingPiecesPerCarton) > 0 ? Number(existingPiecesPerCarton) : (Number(selectedExistingProduct.piecesPerCarton) > 0 ? Number(selectedExistingProduct.piecesPerCarton) : (packs * ppp)));
    
    const cartonsCount = isUnpack ? 0 : Number(existingCartons || 0);
    const totalPieces = isUnpack 
      ? Number(existingTotalPieces || existingExtraPieces || 0)
      : (typeof existingTotalPieces === 'number' && existingTotalPieces > 0
        ? existingTotalPieces
        : (cartonsCount * piecesPerCarton) + Number(existingExtraPieces || 0));
    const extraPieces = isUnpack ? totalPieces : Number(existingExtraPieces || 0);

    if (totalPieces <= 0) {
      onShowAlert?.('تعداد کارتن یا دانه ورودی باید بیشتر از صفر باشد.', 'warning', 'تعداد کالا');
      return;
    }

    if (existingPurchasePrice <= 0) {
      onShowAlert?.('لطفاً قیمت خرید این بار را مشخص فرمایید.', 'warning', 'قیمت خرید');
      return;
    }

    const unitPurchasePrice = existingPurchasePrice;
    const unitSellingPrice = existingSellingPrice > 0 ? existingSellingPrice : (selectedExistingProduct.sellingPrice || Math.round(unitPurchasePrice * 1.25));
    const totalPrice = totalPieces * unitPurchasePrice;
    const totalPurchaseCost = totalPrice;
    const profitAmount = Math.max(0, (unitSellingPrice - unitPurchasePrice) * totalPieces);
    const profitPercentage = totalPurchaseCost > 0 ? (profitAmount / totalPurchaseCost) * 100 : 0;

    // SCENARIO 1: Different purchase price AND user chose to create distinct product entry
    if (isPurchasePriceDifferent && distinctHandlingMode === 'create_distinct') {
      const distinctProdName = distinctNewName.trim() || `${selectedExistingProduct.name} (فی خرید ${formatPrice(unitPurchasePrice)})`;
      const distinctProduct: Product = {
        id: `prod-distinct-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: distinctProdName,
        category: selectedExistingProduct.category,
        purchasePrice: unitPurchasePrice,
        sellingPrice: unitSellingPrice,
        piecesPerCarton: piecesPerCarton,
        packsPerCarton: packs,
        piecesPerPack: ppp,
        isUnpackaged: isUnpack,
        isCartonUnknown: isUnpack,
        leavesPerPiece: selectedExistingProduct.leavesPerPiece,
        stockPieces: 0,
        unitTitle: selectedExistingProduct.unitTitle || 'عدد',
        notes: `ورود با فی خرید جدید: ${formatPrice(unitPurchasePrice)} (مشتق از ${selectedExistingProduct.name})`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const invoiceItem: InvoiceItem = {
        id: `item-inward-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        productId: distinctProduct.id,
        productName: distinctProduct.name,
        unitTitle: distinctProduct.unitTitle,
        cartonsCount: cartonsCount,
        packsCount: packs,
        piecesPerPack: ppp,
        extraPieces: extraPieces,
        piecesPerCarton: piecesPerCarton,
        totalPieces,
        isUnpackaged: isUnpack,
        isCartonUnknown: isUnpack,
        unitPurchasePrice,
        unitSellingPrice,
        totalPrice,
        totalPurchaseCost,
        profitAmount,
        profitPercentage,
        customDescription: isUnpack ? 'نامشخص' : undefined
      };

      submitInwardItem?.(invoiceItem, distinctProduct, undefined, keepOpenAfterAdd);
      onShowAlert?.(`کالای «${distinctProdName}» به عنوان ردیف جدید با فی خرید ${formatPrice(unitPurchasePrice)} به فاکتور ورود اضافه شد (افزایش موجودی انبار پس از ثبت نهایی فاکتور انجام می‌شود).`, 'success', 'ثبت ردیف مجزا');
      if (keepOpenAfterAdd) {
        resetExistingProductForm();
      } else {
        onClose();
      }
      return;
    }

    // SCENARIO 2: Same price OR user chose to update existing product purchase price
    const invoiceItem: InvoiceItem = {
      id: `item-inward-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: selectedExistingProduct.id,
      productName: selectedExistingProduct.name,
      unitTitle: selectedExistingProduct.unitTitle || 'عدد',
      cartonsCount: cartonsCount,
      packsCount: packs,
      piecesPerPack: ppp,
      extraPieces: extraPieces,
      piecesPerCarton: piecesPerCarton,
      totalPieces,
      isUnpackaged: isUnpack,
      isCartonUnknown: isUnpack,
      unitPurchasePrice,
      unitSellingPrice,
      totalPrice,
      totalPurchaseCost,
      profitAmount,
      profitPercentage,
      customDescription: isUnpack ? 'نامشخص' : undefined
    };

    const updatePrice = {
      productId: selectedExistingProduct.id,
      newPurchasePrice: unitPurchasePrice,
      newSellingPrice: unitSellingPrice
    };

    // Synchronize packaging, carton counts, and pricing directly to product catalog in warehouse
    const updatedProductInCatalog: Product = {
      ...selectedExistingProduct,
      piecesPerCarton: piecesPerCarton,
      packsPerCarton: isUnpack ? 1 : packs,
      piecesPerPack: isUnpack ? 1 : ppp,
      isUnpackaged: isUnpack,
      isCartonUnknown: isUnpack,
      purchasePrice: unitPurchasePrice,
      sellingPrice: unitSellingPrice,
      unitTitle: selectedExistingProduct.unitTitle || 'عدد',
      updatedAt: Date.now()
    };
    onUpdateProduct?.(updatedProductInCatalog);

    submitInwardItem?.(invoiceItem, undefined, updatePrice, keepOpenAfterAdd);
    onShowAlert?.(`کالای «${selectedExistingProduct.name}» (${toPersianDigits(cartonsCount)} کارتن) با موفقیت به فاکتور ورود اضافه شد (افزایش موجودی انبار پس از ثبت نهایی فاکتور انجام می‌شود).`, 'success', 'ورود کالا');
    if (keepOpenAfterAdd) {
      resetExistingProductForm();
    } else {
      onClose();
    }
  };

  // Submit Handler for Brand New Product (Strictly Inward / Purchase)
  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!newName.trim()) {
      errors.name = 'نام کامل کالا الزامی است.';
    }

    if (!newCategory.trim()) {
      errors.category = 'انتخاب دسته‌بندی کالا الزامی است.';
    }

    const isUnpack = isNewUnpackaged;
    const packs = isUnpack ? 1 : (Number(newPacksPerCarton) > 0 ? Number(newPacksPerCarton) : 1);
    const ppp = isUnpack ? 1 : (Number(newPiecesPerPack) > 0 ? Number(newPiecesPerPack) : 1);
    const piecesPerCarton = isUnpack ? 1 : (Number(newPiecesPerCarton) > 0 ? Number(newPiecesPerCarton) : (packs * ppp));
    const totalPieces = isUnpack 
      ? Number(newExtraPieces || 0)
      : (Number(newCartons || 0) * piecesPerCarton) + Number(newExtraPieces || 0);

    if (totalPieces <= 0) {
      errors.cartons = isUnpack ? 'تعداد کل دانه / ورودی باید بیشتر از صفر باشد.' : 'تعداد کارتن یا دانه ورودی باید بیشتر از صفر باشد.';
    }

    if (newPurchasePrice <= 0) {
      errors.purchasePrice = 'قیمت خرید کالا باید بیشتر از صفر باشد.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const firstError = Object.values(errors)[0];
      onShowAlert?.(firstError, 'warning', 'تکمیل فیلدهای کالا');
      return;
    }

    const unitPurchasePrice = newPurchasePrice;
    const unitSellingPrice = newSellingPrice > 0 ? newSellingPrice : Math.round(unitPurchasePrice * 1.25);
    const totalPrice = totalPieces * unitPurchasePrice;
    const totalPurchaseCost = totalPrice;
    const profitAmount = Math.max(0, (unitSellingPrice - unitPurchasePrice) * totalPieces);
    const profitPercentage = totalPurchaseCost > 0 ? (profitAmount / totalPurchaseCost) * 100 : 0;

    const brandNewProduct: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: newName.trim(),
      category: newCategory.trim(),
      purchasePrice: unitPurchasePrice,
      sellingPrice: unitSellingPrice,
      piecesPerCarton: isUnpack ? 1 : piecesPerCarton,
      packsPerCarton: isUnpack ? 1 : packs,
      piecesPerPack: isUnpack ? 1 : ppp,
      isUnpackaged: isUnpack,
      isCartonUnknown: isUnpack,
      leavesPerPiece: newLeavesPerPiece,
      stockPieces: 0,
      unitTitle: newUnitTitle.trim() || 'عدد',
      notes: newNotes.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const invoiceItem: InvoiceItem = {
      id: `item-inward-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: brandNewProduct.id,
      productName: brandNewProduct.name,
      unitTitle: brandNewProduct.unitTitle,
      cartonsCount: isUnpack ? 0 : Number(newCartons || 0),
      packsCount: isUnpack ? 1 : packs,
      piecesPerPack: isUnpack ? 1 : ppp,
      extraPieces: isUnpack ? totalPieces : Number(newExtraPieces || 0),
      piecesPerCarton: isUnpack ? 1 : piecesPerCarton,
      totalPieces,
      isUnpackaged: isUnpack,
      isCartonUnknown: isUnpack,
      unitPurchasePrice,
      unitSellingPrice,
      totalPrice,
      totalPurchaseCost,
      profitAmount,
      profitPercentage,
      customDescription: isUnpack ? 'نامشخص' : undefined
    };

    submitInwardItem?.(invoiceItem, brandNewProduct, undefined, keepOpenAfterAdd);
    onShowAlert?.(`کالای جدید «${brandNewProduct.name}» با فی خرید ${formatPrice(unitPurchasePrice)} ثبت و به فاکتور ورود اضافه شد (افزایش موجودی انبار پس از ثبت نهایی انجام می‌شود).`, 'success', 'تعریف و ورود کالا');
    if (keepOpenAfterAdd) {
      resetNewProductForm();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto dir-rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto transition-colors"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                  ویرایش و تامین کالا
                </h3>
                <span className={`px-2.5 py-0.5 rounded-lg ${theme.badgeBg} ${theme.badgeText} text-[10px] font-black border ${theme.borderColor}`}>
                  فاکتور خرید و شارژ انبار
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                شارژ بار کالاهای موجود یا تعریف کالای جدید با تفکیک فی خرید
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Continuous entry toggle checkbox */}
            <label 
              id="inward-keep-open-label"
              className="flex items-center gap-2 cursor-pointer select-none px-2.5 sm:px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              title="با فعال بودن این گزینه، پس از ثبت کالا، پنجره باز می‌ماند و فرم برای درج سریع کالای بعدی خالی می‌شود"
            >
              <input
                type="checkbox"
                id="inward-keep-open-checkbox"
                checked={keepOpenAfterAdd}
                onChange={(e) => {
                  setKeepOpenAfterAdd(e.target.checked);
                  try {
                    localStorage.setItem('bazargani_inward_keep_open', String(e.target.checked));
                  } catch {}
                }}
                className={`w-4 h-4 ${theme.primaryText} rounded focus:${theme.ring} border-slate-300 dark:border-slate-700 cursor-pointer`}
              />
              <span className="hidden sm:inline">ثبت پیوسته (ماندن در صفحه)</span>
              <span className="sm:hidden">ثبت پیوسته</span>
            </label>

            <button
              type="button"
              id="close-inward-product-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="px-5 pt-2 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="tab-new-inward-btn"
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-black text-xs border-b-2 transition-all cursor-pointer ${
                activeTab === 'new'
                  ? `${theme.borderColor} ${theme.primaryText} ${theme.primaryLight}`
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>تعریف و ورود کالای جدید</span>
            </button>

            <button
              type="button"
              id="tab-existing-inward-btn"
              onClick={() => setActiveTab('existing')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-black text-xs border-b-2 transition-all cursor-pointer ${
                activeTab === 'existing'
                  ? `${theme.borderColor} ${theme.primaryText} ${theme.primaryLight}`
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>انتخاب از کالاهای موجود ({toPersianDigits(products.length)})</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* EXECUTIVE FINANCIAL & PURCHASING POWER INTELLIGENCE BANNER */}
          <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-950/80 dark:to-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4 sm:p-4.5 space-y-3.5 shadow-2xs">
            {/* Top Metric Cards - 4 Column Modern Analytical Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Card 1: نقدینگی حاضر (صندوق + بانک) */}
              <div className="bg-white dark:bg-slate-900 border border-emerald-200/70 dark:border-emerald-900/40 rounded-2xl p-3.5 shadow-2xs space-y-1.5 transition-all hover:shadow-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-[11px] font-bold">نقدینگی در دسترس (حاضر)</span>
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {formatPrice(totalLiquidity)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span>صندوق: <strong className="text-slate-700 dark:text-slate-300">{formatPrice(cashBal)}</strong></span>
                  <span>•</span>
                  <span>بانک: <strong className="text-slate-700 dark:text-slate-300">{formatPrice(bankBal)}</strong></span>
                </div>
              </div>

              {/* Card 2: وضعیت بدهی تامین‌کننده */}
              <div className="bg-white dark:bg-slate-900 border border-blue-200/70 dark:border-blue-900/40 rounded-2xl p-3.5 shadow-2xs space-y-1.5 transition-all hover:shadow-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-[11px] font-bold truncate">
                    {supplierName ? `تراز: ${supplierName}` : 'تراز تامین‌کننده'}
                  </span>
                  <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black">
                  {supplierDebtToUs > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {formatPrice(supplierDebtToUs)} <span className="text-[10px] font-normal">(بدهکار به شما)</span>
                    </span>
                  ) : ourDebtToSupplier > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      {formatPrice(ourDebtToSupplier)} <span className="text-[10px] font-normal">(بستانکار)</span>
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400">
                      بی‌حساب و تسویه <span className="text-[10px] font-normal">(۰ تومان)</span>
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80 truncate">
                  {supplierDebtToUs > 0 
                    ? '✨ قابل تهاتر با کالا بدون نیاز به پرداخت پول' 
                    : ourDebtToSupplier > 0 
                      ? 'بدهی قبلی ما به طرف‌حساب از فاکتورهای قبل' 
                      : 'تراز دفتری طرف‌حساب کاملاً صفر و تسویه است'}
                </div>
              </div>

              {/* Card 3: سقف خرید بدون نسیه */}
              <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white dark:to-slate-900 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl p-3.5 shadow-2xs space-y-1.5 transition-all hover:shadow-xs">
                <div className="flex items-center justify-between text-teal-800 dark:text-teal-300">
                  <span className="text-[11px] font-black">سقف خرید بدون نسیه</span>
                  <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-teal-700 dark:text-teal-300">
                  {formatPrice(maxNonCreditPurchasingPower)}
                </div>
                <div className="text-[10px] text-teal-700/90 dark:text-teal-400/90 pt-1 border-t border-teal-100 dark:border-teal-900/60 font-bold truncate">
                  {supplierDebtToUs > 0 ? 'نقدینگی کل + تهاتر کامل با بدهی تامین‌کننده' : 'خرید ۱۰۰٪ نقدی و بدون ایجاد بدهکاری دفتری'}
                </div>
              </div>

              {/* Card 4: بهای این قلم و مانده قدرت خرید */}
              <div className={`border rounded-2xl p-3.5 shadow-2xs space-y-1.5 transition-all hover:shadow-xs ${
                willExceedCashCapacity 
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800' 
                  : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
              }`}>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="text-[11px] font-bold">بهای قلم جاری و تراز</span>
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    willExceedCashCapacity 
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}>
                    {willExceedCashCapacity ? <AlertTriangle className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  </div>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {formatPrice(currentItemEstimatedCost)}
                </div>
                <div className="text-[10px] font-bold pt-1 border-t border-slate-100 dark:border-slate-800/80 truncate">
                  {currentItemEstimatedCost === 0 ? (
                    <span className="text-slate-500">تعداد و فی را تکمیل نمایید</span>
                  ) : !willExceedCashCapacity ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      مانده نقدی آزاد: {formatPrice(remainingNonCreditCapacity)}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-black">
                      مازاد به نسیه: {formatPrice(exceedingCreditAmount)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Smart Financial Narrative & Capacity Bar */}
            <div className={`p-3 sm:p-3.5 rounded-2xl text-xs space-y-2 border transition-all ${
              willExceedCashCapacity
                ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="flex items-start sm:items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-500 mt-0.5 sm:mt-0" />
                  <div className="leading-relaxed text-[11px] sm:text-xs">
                    {currentItemEstimatedCost === 0 ? (
                      <span>
                        <strong>تحلیل زنده توان خرید:</strong> نقدینگی حاضر شما <strong>{formatPrice(totalLiquidity)}</strong> است
                        {supplierDebtToUs > 0 ? (
                          <> و تامین‌کننده <strong>{formatPrice(supplierDebtToUs)}</strong> به شما بدهکار است. بنابراین می‌توانید تا سقف <strong>{formatPrice(maxNonCreditPurchasingPower)}</strong> کالا بدون نسیه یا پرداخت اضافه به انبار وارد کنید.</>
                        ) : (
                          <>. با احتساب این نقدینگی، تا رقم <strong>{formatPrice(maxNonCreditPurchasingPower)}</strong> امکان خرید ۱۰۰٪ نقدی و بدون نسیه برای شما فراهم است.</>
                        )}
                      </span>
                    ) : !willExceedCashCapacity ? (
                      <span>
                        <strong>✓ خرید ۱۰۰٪ نقدی و مطمئن:</strong> ارزش این قلم <strong>{formatPrice(currentItemEstimatedCost)}</strong> است. با اضافه شدن این کالا، جمع فاکتور به <strong>{formatPrice(projectedInvoiceTotal)}</strong> می‌رسد و شما هنوز <strong>{formatPrice(remainingNonCreditCapacity)}</strong> توان خرید بدون نسیه دارید.
                      </span>
                    ) : (
                      <span>
                        <strong>⚠️ هشدار ورود به نسیه:</strong> ارزش خرید جاری به <strong>{formatPrice(projectedInvoiceTotal)}</strong> خواهد رسید که به میزان <strong>{formatPrice(exceedingCreditAmount)}</strong> از نقدینگی حاضر فراتر است و به عنوان بدهی دفتری به حساب تامین‌کننده منظور خواهد شد.
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 bg-white/90 dark:bg-slate-900/90 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] font-black">
                  <span className="text-slate-500">مصرف نقدینگی:</span>
                  <span className={willExceedCashCapacity ? 'text-amber-600 font-black' : 'text-emerald-600'}>
                    %{toPersianDigits(capacityPercent)}
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-slate-200/70 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    willExceedCashCapacity 
                      ? 'bg-amber-500' 
                      : capacityPercent > 80 
                        ? 'bg-teal-500' 
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>
            </div>
          </div>
          {activeTab === 'existing' ? (
            /* TAB 1: EXISTING PRODUCT WITH SMART PURCHASE PRICE SEPARATION */
            <div className="space-y-4">
              {/* Product Selector Bar */}
              <div className="bg-slate-50 dark:bg-slate-950/40 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      id="search-inward-existing-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="جستجوی نام یا دسته کالا..."
                      className="w-full pr-9 pl-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Category Filter Dropdown */}
                  <div className="relative shrink-0">
                    <select
                      id="inward-category-filter-select"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className={`w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none focus:ring-2 ${theme.ring} shadow-2xs cursor-pointer`}
                    >
                      <option value="all">همه دسته‌ها</option>
                      {categories.filter(c => c !== 'all').map((cat, idx) => (
                        <option key={`modal-cat-${cat || idx}`} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Hide Zero Stock Checkbox / Toggle */}
                  <label 
                    id="toggle-hide-zero-stock-inward"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer select-none shrink-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    title="عدم نمایش کالاهایی با موجودی صفر"
                  >
                    <input
                      type="checkbox"
                      checked={hideZeroStock}
                      onChange={(e) => setHideZeroStock(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-0 cursor-pointer accent-teal-600"
                    />
                    <span className="whitespace-nowrap">عدم نمایش موجودی صفر</span>
                  </label>
                </div>

                {/* Quick Product Grid List */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      <span>کالایی با این عنوان یافت نشد.</span>
                      {hideZeroStock && (
                        <button
                          type="button"
                          onClick={() => setHideZeroStock(false)}
                          className="mr-2 text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                        >
                          (نمایش کالاهای با موجودی صفر)
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const isSelected = selectedExistingProduct?.id === p.id;
                      return (
                        <button
                          key={`exist-grid-${p.id}`}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className={`p-2 rounded-xl text-right transition-all cursor-pointer border flex flex-col justify-between text-xs ${
                            isSelected
                              ? `${theme.primaryLight} ${theme.borderColor} ${theme.primaryText} font-black shadow-2xs ring-1 ${theme.ring}`
                              : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="truncate font-black text-xs">{p.name}</div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            <span>فی: {formatPrice(p.purchasePrice)}</span>
                            <span className={`font-mono ${theme.primaryText} font-bold`}>{toPersianDigits(p.stockPieces)} موجود</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Active Selected Product Details Card */}
              {selectedExistingProduct && (
                <div className={`bg-white dark:bg-slate-900 border ${theme.borderColor} rounded-2xl p-3.5 space-y-3 shadow-2xs`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 dark:text-white text-base">
                          {selectedExistingProduct.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          {selectedExistingProduct.category}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                        بسته‌بندی: {toPersianDigits(selectedExistingProduct.packsPerCarton || 20)} بسته × {toPersianDigits(selectedExistingProduct.piecesPerPack || 24)} عددی = <b className="text-slate-700 dark:text-slate-300">{toPersianDigits(selectedExistingProduct.piecesPerCarton)} عدد در کارتن</b>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <div className={`px-2.5 py-1 ${theme.primaryLight} rounded-xl border ${theme.borderColor}`}>
                        <span className={`${theme.primaryText} font-black text-xs font-mono`}>
                          موجودی انبار: {toPersianDigits(selectedExistingProduct.stockPieces)} {selectedExistingProduct.unitTitle || 'عدد'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingProductDetails(true)}
                        className={`px-3 py-1.5 rounded-xl ${theme.primary} text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs hover:opacity-90 transition-all`}
                        title="ویرایش تخصصی مشخصات، قیمت‌ها و ساختار کارتن در انبار"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>ویرایش کالا</span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity, Packaging & Purchase Price Inputs (STRICTLY INWARD) */}
                  <form onSubmit={handleSubmitExisting} className="space-y-3 pt-1">
                    {/* Checkbox for No Packaging / Unknown Cartons */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="existing-unpackaged-checkbox"
                          checked={isExistingUnpackaged}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIsExistingUnpackaged(checked);
                            if (checked) {
                              setExistingCartons('');
                              setExistingPacks(1);
                              setExistingPiecesPerPack(1);
                              setExistingPiecesPerCarton(1);
                            } else {
                              setExistingPacks(selectedExistingProduct.packsPerCarton || 20);
                              setExistingPiecesPerPack(selectedExistingProduct.piecesPerPack || 24);
                              setExistingPiecesPerCarton(selectedExistingProduct.piecesPerCarton || 480);
                            }
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          بدون بسته‌بندی یا کارتن نامشخص (تعداد کارتن نامشخص / ورود بر اساس دانه، فله یا کیلویی)
                        </span>
                      </label>
                      {isExistingUnpackaged && (
                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                          تعداد کارتن: نامشخص / فله
                        </span>
                      )}
                    </div>

                    {/* Packaging & Quantities 5-Column Grid */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>{isExistingUnpackaged ? 'مقدار ورودی کالا (فروش فله / دانه‌ای):' : 'مقدار ورودی و ساختار کارتن:'}</span>
                        </span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          {isExistingUnpackaged ? 'بدون کارتن (ورود دانه‌ای)' : `هر ۱ کارتن = ${toPersianDigits(typeof existingPiecesPerCarton === 'number' && existingPiecesPerCarton > 0 ? existingPiecesPerCarton : ((typeof existingPacks === 'number' ? existingPacks : 20) * (typeof existingPiecesPerPack === 'number' ? existingPiecesPerPack : 24)))} عدد`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {/* Cartons Count */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            تعداد کارتن {isExistingUnpackaged ? '(نامشخص)' : <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            disabled={isExistingUnpackaged}
                            id="existing-cartons-input"
                            value={isExistingUnpackaged ? 'نامشخص' : (existingCartons === '' ? '' : existingCartons)}
                            onChange={(e) => !isExistingUnpackaged && handleExistingCartonsChange(e.target.value)}
                            className={`w-full px-2.5 py-2 rounded-xl border text-center font-black text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                              isExistingUnpackaged 
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                            }`}
                            placeholder={isExistingUnpackaged ? 'نامشخص' : 'مثلاً ۵'}
                          />
                        </div>

                        {/* Packs Per Carton */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            بسته در کارتن
                          </label>
                          <input
                            type="number"
                            min="1"
                            disabled={isExistingUnpackaged}
                            id="existing-packs-input"
                            value={isExistingUnpackaged ? 1 : (existingPacks === '' ? '' : existingPacks)}
                            onChange={(e) => !isExistingUnpackaged && handleExistingPacksChange(e.target.value)}
                            className={`w-full px-2.5 py-2 rounded-xl border text-center font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                              isExistingUnpackaged
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                            placeholder="۲۰"
                          />
                        </div>

                        {/* Pieces Per Pack */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            دانه در هر بسته
                          </label>
                          <input
                            type="number"
                            min="1"
                            disabled={isExistingUnpackaged}
                            id="existing-ppp-input"
                            value={isExistingUnpackaged ? 1 : (existingPiecesPerPack === '' ? '' : existingPiecesPerPack)}
                            onChange={(e) => !isExistingUnpackaged && handleExistingPiecesPerPackChange(e.target.value)}
                            className={`w-full px-2.5 py-2 rounded-xl border text-center font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                              isExistingUnpackaged
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                            placeholder="۲۴"
                          />
                        </div>

                        {/* Extra Pieces */}
                        <div>
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                            دانه اضافی (تک)
                          </label>
                          <input
                            type="number"
                            min="0"
                            disabled={isExistingUnpackaged}
                            id="existing-extra-pieces-input"
                            value={isExistingUnpackaged ? 0 : (existingExtraPieces === '' ? '' : existingExtraPieces)}
                            onChange={(e) => !isExistingUnpackaged && handleExistingExtraPiecesChange(e.target.value)}
                            className={`w-full px-2.5 py-2 rounded-xl border text-center font-bold text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                              isExistingUnpackaged
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                            placeholder="۰"
                          />
                        </div>

                        {/* Total Pieces (Calculated & Editable) */}
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block font-black text-emerald-700 dark:text-emerald-400 mb-1 text-[11px] flex items-center justify-between">
                            <span>تعداد کل (دانه) {isExistingUnpackaged && <span className="text-red-500">*</span>}</span>
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                          </label>
                          <input
                            type="number"
                            min="0"
                            id="existing-total-pieces-input"
                            value={existingTotalPieces === '' ? '' : existingTotalPieces}
                            onChange={(e) => handleExistingTotalPiecesChange(e.target.value)}
                            className="w-full px-2.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-center font-black text-emerald-800 dark:text-emerald-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
                            placeholder={isExistingUnpackaged ? 'مثلاً: ۵۰۰' : 'خودکار'}
                            title="تعداد کل دانه برای ورود به فاکتور"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price Inputs: Unit Purchase Price First, Unit Selling Price Second, Carton Purchase Price Third */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* 1. Purchase Price Input (فی خرید هر دانه - اول) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            فی خرید هر دانه <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">
                            قبلی: {formatPrice(selectedExistingProduct.purchasePrice)}
                          </span>
                        </div>
                        <SmartPriceInput
                          value={existingPurchasePrice}
                          onChange={(val) => setExistingPurchasePrice(val)}
                          placeholder="فی خرید هر دانه"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-left font-black text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                        />
                      </div>

                      {/* 2. Selling Price Input (فی فروش محصول - دوم) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            فی فروش هر دانه
                          </label>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                            سود: {existingPurchasePrice > 0 && existingSellingPrice > 0 ? `${toPersianDigits(Math.round(((existingSellingPrice - existingPurchasePrice) / existingPurchasePrice) * 100))}%` : '۰%'}
                          </span>
                        </div>
                        <SmartPriceInput
                          value={existingSellingPrice}
                          onChange={(val) => setExistingSellingPrice(val)}
                          placeholder="قیمت فروش کالا"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-left font-black text-blue-700 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        />
                      </div>

                      {/* 3. Carton Purchase Price (قیمت ۱ کارتن کامل خرید) */}
                      {(() => {
                        const ppc = typeof existingPiecesPerCarton === 'number' && existingPiecesPerCarton > 0 
                          ? existingPiecesPerCarton 
                          : ((typeof existingPacks === 'number' ? existingPacks : 20) * (typeof existingPiecesPerPack === 'number' ? existingPiecesPerPack : 24));
                        const cartonCost = ppc * (existingPurchasePrice || 0);

                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                بهای ۱ کارتن خرید ({toPersianDigits(ppc)} تایی)
                              </label>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                کارتن کامل
                              </span>
                            </div>
                            <SmartPriceInput
                              value={cartonCost}
                              onChange={(val) => {
                                if (ppc > 0) {
                                  setExistingPurchasePrice(Math.round(val / ppc));
                                }
                              }}
                              placeholder="قیمت هر کارتن خرید"
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-left font-black text-teal-700 dark:text-teal-400 focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                            />
                          </div>
                        );
                      })()}
                    </div>

                    {/* Purchase Price Comparison Banner & Mode Selection */}
                    {isPurchasePriceDifferent && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                            فی خرید جدید ({formatPrice(existingPurchasePrice)} ت) با فی قبلی ({formatPrice(selectedExistingProduct.purchasePrice)} ت) تفاوت دارد.
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <label 
                            className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all text-xs ${
                              distinctHandlingMode === 'create_distinct'
                                ? 'bg-white dark:bg-slate-900 border-amber-500 font-black ring-1 ring-amber-500 text-amber-950 dark:text-white'
                                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="distinctMode"
                              checked={distinctHandlingMode === 'create_distinct'}
                              onChange={() => setDistinctHandlingMode('create_distinct')}
                              className="text-amber-600 focus:ring-0 cursor-pointer"
                            />
                            <span>ایجاد ردیف کالای مجزا با قیمت جدید (پیشنهادی)</span>
                          </label>

                          <label 
                            className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all text-xs ${
                              distinctHandlingMode === 'update_existing'
                                ? 'bg-white dark:bg-slate-900 border-amber-500 font-black ring-1 ring-amber-500 text-amber-950 dark:text-white'
                                : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="distinctMode"
                              checked={distinctHandlingMode === 'update_existing'}
                              onChange={() => setDistinctHandlingMode('update_existing')}
                              className="text-amber-600 focus:ring-0 cursor-pointer"
                            />
                            <span>به‌روزرسانی قیمت خرید همین کالای موجود</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Live Summary Calculation & Inward Add Button */}
                    {(() => {
                      const packs = typeof existingPacks === 'number' && existingPacks > 0 ? existingPacks : (selectedExistingProduct.packsPerCarton || 20);
                      const ppp = typeof existingPiecesPerPack === 'number' && existingPiecesPerPack > 0 ? existingPiecesPerPack : (selectedExistingProduct.piecesPerPack || 24);
                      const piecesPerCarton = typeof existingPiecesPerCarton === 'number' && existingPiecesPerCarton > 0 ? existingPiecesPerCarton : (selectedExistingProduct.piecesPerCarton || (packs * ppp));
                      
                      const cartonsNum = Number(existingCartons || 0);
                      const extraNum = Number(existingExtraPieces || 0);
                      const totalPieces = typeof existingTotalPieces === 'number' && existingTotalPieces > 0
                        ? existingTotalPieces
                        : (cartonsNum * piecesPerCarton) + extraNum;
                      
                      const cartonPurchaseCost = piecesPerCarton * (existingPurchasePrice || 0);
                      const totalCost = totalPieces * (existingPurchasePrice || 0);

                      return (
                        <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800/80 space-y-3 shadow-xs">
                          <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>خلاصه و محاسبات دقیق بار ورودی:</span>
                            </div>
                            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                              {cartonsNum > 0 
                                ? `${toPersianDigits(cartonsNum)} کارتن${extraNum > 0 ? ` و ${toPersianDigits(extraNum)} دانه` : ''} (${toPersianDigits(totalPieces.toLocaleString())} عدد)` 
                                : `${toPersianDigits(totalPieces.toLocaleString())} عدد`}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block mb-0.5">قیمت ۱ عدد خرید:</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm font-mono">
                                {formatPrice(existingPurchasePrice)}
                              </span>
                            </div>
                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block mb-0.5">بهای ۱ کارتن ({toPersianDigits(piecesPerCarton)} عدد):</span>
                              <span className={`font-extrabold ${theme.primaryText} text-sm font-mono`}>
                                {formatPrice(cartonPurchaseCost)}
                              </span>
                            </div>
                            <div className={`p-2.5 ${theme.primary} text-white rounded-xl shadow-xs`}>
                              <span className="text-[10px] text-white/80 block mb-0.5 font-bold">مبلغ کل فاکتور برای این کالا:</span>
                              <span className="font-black text-base sm:text-lg font-mono">
                                {formatPrice(totalCost)}
                              </span>
                            </div>
                          </div>

                          {/* Financial Intelligence & Potential Profit/Loss Panel */}
                          {isProfitVisible && (() => {
                            const sellingPriceForCalc = existingSellingPrice > 0 
                              ? existingSellingPrice 
                              : (selectedExistingProduct.sellingPrice || 0);
                            
                            if (sellingPriceForCalc <= 0) return null;

                            const unitProfit = sellingPriceForCalc - (existingPurchasePrice || 0);
                            const profitMarginPercent = (existingPurchasePrice || 0) > 0 
                              ? ((sellingPriceForCalc - existingPurchasePrice) / existingPurchasePrice) * 100 
                              : 0;
                            const cartonProfit = piecesPerCarton * unitProfit;
                            const totalExpectedRevenue = totalPieces * sellingPriceForCalc;
                            const totalPotentialProfit = totalPieces * unitProfit;
                            const isLoss = unitProfit < 0;

                            return (
                              <div className={`p-3 rounded-xl border ${
                                !isLoss 
                                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60' 
                                  : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                              } space-y-2`}>
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-200">
                                    <TrendingUp className={`w-4 h-4 ${!isLoss ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`} />
                                    <span>پیش‌بینی و تخمین سود/زیان احتمالی این بار:</span>
                                  </div>
                                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border font-mono ${
                                    !isLoss 
                                      ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800' 
                                      : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                                  }`}>
                                    {!isLoss ? `+${toPersianDigits(profitMarginPercent.toFixed(1))}٪ مارجین سود` : `${toPersianDigits(profitMarginPercent.toFixed(1))}٪ زیان احتمالی`}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  <div className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400 block mb-0.5">سود هر دانه ({formatPrice(sellingPriceForCalc)} ت):</span>
                                    <span className={`font-black text-xs font-mono ${!isLoss ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                      {!isLoss ? `+${formatPrice(unitProfit)}` : `-${formatPrice(Math.abs(unitProfit))}`}
                                    </span>
                                  </div>

                                  {!isExistingUnpackaged && (
                                    <div className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800">
                                      <span className="text-[10px] text-slate-400 block mb-0.5">سود هر کارتن ({toPersianDigits(piecesPerCarton)} تایی):</span>
                                      <span className={`font-black text-xs font-mono ${!isLoss ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {!isLoss ? `+${formatPrice(cartonProfit)}` : `-${formatPrice(Math.abs(cartonProfit))}`}
                                      </span>
                                    </div>
                                  )}

                                  <div className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] text-slate-400 block mb-0.5">ارزش فروش کل این بار:</span>
                                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs font-mono">
                                      {formatPrice(totalExpectedRevenue)}
                                    </span>
                                  </div>

                                  <div className={`p-2 rounded-lg border ${
                                    !isLoss 
                                      ? 'bg-emerald-100/80 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800' 
                                      : 'bg-rose-100/80 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
                                  }`}>
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                                      {!isLoss ? 'سود خالص کل بار:' : 'زیان خالص کل:'}
                                    </span>
                                    <div className={`font-black text-xs sm:text-sm font-mono flex items-center gap-1.5 flex-wrap ${!isLoss ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                      <span>{!isLoss ? `+${formatPrice(totalPotentialProfit)}` : `-${formatPrice(Math.abs(totalPotentialProfit))}`}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/70 border border-emerald-300 dark:border-emerald-700 font-sans">
                                        ({formatAmountScale(Math.abs(totalPotentialProfit))})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="flex items-center justify-end pt-1">
                            <button
                              type="submit"
                              id="submit-existing-inward-btn"
                              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.02]`}
                            >
                              <Check className="w-4 h-4" />
                              <span>تایید و درج در فاکتور ورود کالا</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: BRAND NEW PRODUCT REGISTRATION - ORGANIZED AND CLEAN */
            <form onSubmit={handleSubmitNew} className="space-y-3.5">
              {/* CARD 1: مشخصات و ساختار بسته‌بندی کالا */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="font-black text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>مشخصات کالا و ساختار بسته‌بندی کارتن</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>مدیریت دسته‌ها</span>
                  </button>
                </div>

                {/* Row 1: Name & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-xs text-slate-700 dark:text-slate-300">
                      نام کامل کالا <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="new-inward-product-name-input"
                      value={newName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewName(val);
                        if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                        
                        // Smart Auto-detection of category
                        const detected = detectCategoryFromName(val, categories.filter(c => c !== 'all'));
                        if (detected) {
                          setNewCategory(detected);
                          setAutoDetectedCategory(detected);
                        } else {
                          setAutoDetectedCategory(null);
                        }
                      }}
                      placeholder="مثلاً: لواشک انار، شکلات تلخ باراکا یا آبنبات..."
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-slate-900 dark:text-white font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                        formErrors.name
                          ? 'border-red-500 ring-2 ring-red-500/20'
                          : 'border-slate-300 dark:border-slate-700 focus:ring-emerald-500'
                      }`}
                      required
                    />
                    {formErrors.name && (
                      <span className="text-[10px] font-bold text-red-500 block">{formErrors.name}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-xs text-slate-700 dark:text-slate-300">
                        دسته‌بندی کالا <span className="text-red-500">*</span>
                      </label>
                      {autoDetectedCategory && (
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3 h-3" />
                          <span>پیشنهاد هوشمند: {autoDetectedCategory}</span>
                        </span>
                      )}
                    </div>
                    <select
                      id="new-inward-category-select"
                      value={newCategory}
                      onChange={(e) => {
                        if (e.target.value === '__manage__') {
                          setIsCategoryModalOpen(true);
                        } else {
                          setNewCategory(e.target.value);
                          if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                    >
                      {categories.filter(c => c !== 'all').map((cat, idx) => (
                        <option key={`new-cat-opt-${cat || idx}`} value={cat}>{cat}</option>
                      ))}
                      <option value="__manage__">⚙️ + مدیریت و افزودن دسته جدید...</option>
                    </select>
                  </div>
                </div>

                {/* Checkbox for No Packaging / Unknown Cartons in Tab 2 */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="new-unpackaged-checkbox"
                      checked={isNewUnpackaged}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsNewUnpackaged(checked);
                        if (checked) {
                          setNewPacksPerCarton(1);
                          setNewPiecesPerPack(1);
                          setNewPiecesPerCarton(1);
                          setNewCartons('');
                        }
                      }}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      بدون بسته‌بندی یا کارتن نامشخص (تعداد کارتن نامشخص / ورود بر اساس دانه، فله یا کیلویی)
                    </span>
                  </label>
                  {isNewUnpackaged && (
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                      تعداد کارتن: نامشخص / فله
                    </span>
                  )}
                </div>

                {/* Row 2: Packaging Formula: Packs x Pieces = Total per Carton */}
                {!isNewUnpackaged ? (
                  <div className="p-3 bg-slate-50/80 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                        فرمول بسته‌بندی ۱ کارتن:
                      </span>
                      <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {toPersianDigits(newPacksPerCarton || 1)} بسته × {toPersianDigits(newPiecesPerPack || 1)} تایی = {toPersianDigits(newPiecesPerCarton || 1)} دانه در ۱ کارتن
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          تعداد بسته در ۱ کارتن
                        </label>
                        <input
                          type="number"
                          min="1"
                          id="new-packs-per-carton-input"
                          value={newPacksPerCarton === '' ? '' : newPacksPerCarton}
                          onChange={(e) => handlePacksPerCartonChanged(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                          placeholder="مثلاً ۲۰"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          تعداد دانه در هر بسته
                        </label>
                        <input
                          type="number"
                          min="1"
                          id="new-pieces-per-pack-input"
                          value={newPiecesPerPack === '' ? '' : newPiecesPerPack}
                          onChange={(e) => handlePiecesPerPackChanged(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                          placeholder="مثلاً ۲۴"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-center text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-emerald-800 dark:text-emerald-300 mb-1">
                          کل دانه در ۱ کارتن <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          id="new-pieces-per-carton-input"
                          value={newPiecesPerCarton === '' ? '' : newPiecesPerCarton}
                          onChange={(e) => handlePiecesPerCartonChanged(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                          placeholder="مثلاً ۴۸۰"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-200 font-black text-center text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>کالا به صورت بدون بسته‌بندی، فله یا دانه‌ای تعریف می‌شود. تعداد کارتن برای این کالا نامشخص لحاظ خواهد شد.</span>
                  </div>
                )}

                {/* Optional Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      واحد سنجش (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={newUnitTitle}
                      onChange={(e) => setNewUnitTitle(e.target.value)}
                      placeholder="عدد / بسته / کیلو"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      یادداشت کالا / مشخصات تامین‌کننده (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="توضیحات بسته‌بندی یا شرکت تامین‌کننده"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: ورود بار در این فاکتور و قیمت‌گذاری */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="font-black text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>تعداد بار ورودی و قیمت‌گذاری (فی خرید و فی فروش)</span>
                  </div>
                  {newPurchasePrice > 0 && newSellingPrice > 0 && (
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                      سود: {toPersianDigits(Math.round(((newSellingPrice - newPurchasePrice) / newPurchasePrice) * 100))}%
                    </span>
                  )}
                </div>

                {/* Input Grid: Cartons, Extra pieces, Purchase Price, Selling Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <label className="block font-bold text-xs text-slate-700 dark:text-slate-300">
                      تعداد کارتن ورودی {isNewUnpackaged ? '(نامشخص)' : <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      disabled={isNewUnpackaged}
                      id="new-inward-cartons-input"
                      value={isNewUnpackaged ? 'نامشخص' : (newCartons === '' ? '' : newCartons)}
                      onChange={(e) => {
                        if (!isNewUnpackaged) {
                          setNewCartons(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0));
                          if (formErrors.cartons) setFormErrors({ ...formErrors, cartons: '' });
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-center font-black text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                        isNewUnpackaged 
                          ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                      placeholder={isNewUnpackaged ? 'نامشخص' : 'مثلاً: ۵۰'}
                    />
                    {!isNewUnpackaged && formErrors.cartons && (
                      <span className="text-[10px] font-bold text-red-500 block">{formErrors.cartons}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className={`block font-bold text-xs ${isNewUnpackaged ? 'text-emerald-700 dark:text-emerald-400 font-black' : 'text-slate-700 dark:text-slate-300'}`}>
                      {isNewUnpackaged ? `تعداد کل ورودی (${newUnitTitle || 'عدد'})` : 'دانه اضافی (تک)'} {isNewUnpackaged && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      min="0"
                      id="new-inward-extra-pieces-input"
                      value={newExtraPieces === '' ? '' : newExtraPieces}
                      onChange={(e) => {
                        setNewExtraPieces(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0));
                        if (isNewUnpackaged && formErrors.cartons) setFormErrors({ ...formErrors, cartons: '' });
                      }}
                      className={`w-full px-3 py-2 rounded-xl border text-center font-black text-base focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                        isNewUnpackaged
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                      placeholder={isNewUnpackaged ? 'مثلاً: ۵۰۰' : '۰'}
                    />
                    {isNewUnpackaged && formErrors.cartons && (
                      <span className="text-[10px] font-bold text-red-500 block">{formErrors.cartons}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-xs text-slate-700 dark:text-slate-300">
                      فی خرید هر دانه <span className="text-red-500">*</span>
                    </label>
                    <SmartPriceInput
                      value={newPurchasePrice}
                      onChange={(val) => {
                        setNewPurchasePrice(val);
                        if (formErrors.purchasePrice) setFormErrors({ ...formErrors, purchasePrice: '' });
                      }}
                      placeholder="قیمت خرید کالا"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-left font-black text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {formErrors.purchasePrice && (
                      <span className="text-[10px] font-bold text-red-500 block">{formErrors.purchasePrice}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-xs text-slate-700 dark:text-slate-300">
                      فی فروش هر دانه (اختیاری)
                    </label>
                    <SmartPriceInput
                      value={newSellingPrice}
                      onChange={(val) => setNewSellingPrice(val)}
                      placeholder="قیمت فروش کالا"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-left font-black text-blue-700 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Carton & Pack calculated costs banner */}
                {!isNewUnpackaged && newPurchasePrice > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-0.5">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block">بهای خرید ۱ بسته ({toPersianDigits(newPiecesPerPack || 1)} تایی):</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs mt-0.5 block">{formatPrice(newPurchasePrice * (newPiecesPerPack || 1))} ت</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] block">بهای خرید ۱ کارتن ({toPersianDigits(newPiecesPerCarton || 1)} تایی):</span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400 text-xs mt-0.5 block">{formatPrice(newPurchasePrice * (newPiecesPerCarton || 1))} ت</span>
                    </div>
                    {newSellingPrice > 0 && (
                      <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                        <span className="text-blue-700 dark:text-blue-300 text-[10px] block">سود هر کارتن:</span>
                        <span className="font-black text-blue-700 dark:text-blue-400 text-xs mt-0.5 block">
                          {formatPrice(Math.max(0, (newSellingPrice - newPurchasePrice) * (newPiecesPerCarton || 1)))} ت
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Total Calculation & Confirm Action */}
              {(() => {
                const totalPieces = isNewUnpackaged 
                  ? Number(newExtraPieces || 0)
                  : (Number(newCartons || 0) * (newPiecesPerCarton || 1)) + Number(newExtraPieces || 0);
                const totalCost = totalPieces * newPurchasePrice;

                const hasSellingPrice = newSellingPrice > 0;
                const unitProfit = hasSellingPrice ? newSellingPrice - newPurchasePrice : 0;
                const profitMarginPercent = newPurchasePrice > 0 && hasSellingPrice 
                  ? ((newSellingPrice - newPurchasePrice) / newPurchasePrice) * 100 
                  : 0;
                const cartonProfit = (newPiecesPerCarton || 1) * unitProfit;
                const totalExpectedRevenue = totalPieces * newSellingPrice;
                const totalPotentialProfit = totalPieces * unitProfit;
                const isLoss = unitProfit < 0;

                return (
                  <div className="space-y-3">
                    {/* Financial Intelligence & Potential Profit/Loss Panel for New Product */}
                    {isProfitVisible && hasSellingPrice && newPurchasePrice > 0 && (
                      <div className={`p-3 rounded-xl border ${
                        !isLoss 
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60' 
                          : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                      } space-y-2`}>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-slate-200">
                            <TrendingUp className={`w-4 h-4 ${!isLoss ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`} />
                            <span>پیش‌بینی و تخمین سود/زیان احتمالی این بار جدید:</span>
                          </div>
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border font-mono ${
                            !isLoss 
                              ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800' 
                              : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                          }`}>
                            {!isLoss ? `+${toPersianDigits(profitMarginPercent.toFixed(1))}٪ مارجین سود` : `${toPersianDigits(profitMarginPercent.toFixed(1))}٪ زیان احتمالی`}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 block mb-0.5">سود هر دانه ({formatPrice(newSellingPrice)} ت):</span>
                            <span className={`font-black text-xs font-mono ${!isLoss ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {!isLoss ? `+${formatPrice(unitProfit)}` : `-${formatPrice(Math.abs(unitProfit))}`}
                            </span>
                          </div>

                          {!isNewUnpackaged && (
                            <div className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800">
                              <span className="text-[10px] text-slate-400 block mb-0.5">سود هر کارتن ({toPersianDigits(newPiecesPerCarton || 1)} تایی):</span>
                              <span className={`font-black text-xs font-mono ${!isLoss ? 'text-blue-700 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {!isLoss ? `+${formatPrice(cartonProfit)}` : `-${formatPrice(Math.abs(cartonProfit))}`}
                              </span>
                            </div>
                          )}

                          <div className="p-2 bg-white/90 dark:bg-slate-900/90 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 block mb-0.5">ارزش فروش کل این بار:</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs font-mono">
                              {formatPrice(totalExpectedRevenue)}
                            </span>
                          </div>

                          <div className={`p-2 rounded-lg border ${
                            !isLoss 
                              ? 'bg-emerald-100/80 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800' 
                              : 'bg-rose-100/80 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
                          }`}>
                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                              {!isLoss ? 'سود خالص کل بار:' : 'زیان خالص کل:'}
                            </span>
                            <div className={`font-black text-xs sm:text-sm font-mono flex items-center gap-1.5 flex-wrap ${!isLoss ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                              <span>{!isLoss ? `+${formatPrice(totalPotentialProfit)}` : `-${formatPrice(Math.abs(totalPotentialProfit))}`}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/70 border border-emerald-300 dark:border-emerald-700 font-sans">
                                ({formatAmountScale(Math.abs(totalPotentialProfit))})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xs">
                      <div className="text-xs space-y-0.5 text-center sm:text-right">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                          {isNewUnpackaged 
                            ? `مجموع بار ورودی بدون کارتن / فله: ${toPersianDigits(totalPieces.toLocaleString())} ${newUnitTitle || 'عدد'}`
                            : `مجموع بار ورودی: ${toPersianDigits(newCartons || 0)} کارتن و ${toPersianDigits(newExtraPieces || 0)} دانه (${toPersianDigits(totalPieces.toLocaleString())} عدد کل)`
                          }
                        </span>
                        <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                          بهای کل خرید این قلم: <span className="text-emerald-600 dark:text-emerald-400 font-mono">{formatPrice(totalCost)}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={onClose}
                          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          انصراف
                        </button>
                        <button
                          type="submit"
                          id="submit-new-inward-btn"
                          className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl ${theme.primary} text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-[1.02]`}
                        >
                          <Check className="w-4 h-4" />
                          <span>ثبت کالا و ورود به فاکتور</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </form>
          )}
        </div>

        {/* Product Form Modal for Advanced Product Editing */}
        {selectedExistingProduct && (
          <ProductFormModal
            isOpen={isEditingProductDetails}
            onClose={() => setIsEditingProductDetails(false)}
            onSaveProduct={handleSaveProductFromModal}
            editingProduct={selectedExistingProduct}
            products={products}
            settings={settings}
            customCategories={customCategories}
            onShowAlert={onShowAlert}
            title="ویرایش جامع و تخصصی کالا در انبار"
            subtitle="مشخصات، دسته‌بندی، ساختار کارتن و قیمت‌های کالا را به‌صورت کامل به‌روزرسانی کنید."
          />
        )}

        {/* Category Manager Modal if opened */}
        <CategoryManagerModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categories={categories.filter(c => c !== 'all')}
          products={products}
          onAddCategory={(cat) => {
            setNewCategory(cat);
            setIsCategoryModalOpen(false);
          }}
          onEditCategory={() => {}}
          onDeleteCategory={() => {}}
          themeColor={activeColorKey as ThemeColor}
          onShowAlert={onShowAlert}
        />
      </motion.div>
    </div>
  );
};
