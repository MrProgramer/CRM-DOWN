import React, { useState, useEffect, useMemo } from 'react';
import { 
  Invoice, 
  InvoiceItem, 
  Product, 
  StoreSettings, 
  InvoiceType, 
  PaymentStatus, 
  Customer, 
  CustomerPayment, 
  ProductReturn,
  InvoiceExpense,
  InvoiceExpenseType,
  InvoiceExpenseAction
} from '../types';
import { 
  formatPrice, 
  formatAmountScale,
  formatCartonText, 
  toPersianDigits, 
  toEnglishDigits,
  getCurrentPersianDate, 
  getCurrentPersianTime,
  numberToPersianWords,
  formatProductPackagingSpec
} from '../utils/formatters';
import { themes } from './ThemeConfig';
import { PricePeekButton } from './PricePeekButton';
import { ProductFormModal } from './ProductFormModal';
import { InwardProductModal } from './InwardProductModal';
import { LiquidityBalances } from '../utils/liquidityCalculations';
import { calculateCustomerLiveBalance } from '../utils/customerBalanceCalculations';
import { 
  Plus, 
  Trash2, 
  Pencil,
  Eye, 
  EyeOff, 
  ArrowDownToLine, 
  ChevronUp, 
  ChevronDown, 
  Percent, 
  Package, 
  Boxes, 
  Save, 
  X, 
  AlertCircle, 
  Search, 
  Sparkles,
  Calculator,
  Layers,
  ArrowRight,
  Users,
  CheckCircle2,
  HelpCircle,
  FileText,
  Bookmark,
  Zap,
  CreditCard,
  Coins,
  Wallet,
  Building2,
  TrendingDown,
  ArrowUpRight,
  ShieldCheck,
  PackagePlus,
  AlertTriangle,
  TrendingUp,
  Banknote,
  DollarSign,
  Check,
  CheckCheck,
  RotateCcw,
  ArrowRightLeft,
  Truck,
  PackageX,
  Receipt,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SmartPriceInput } from './SmartPriceInput';
import { calculateInwardInvoiceSellThrough } from '../utils/inwardSellThrough';

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

interface InvoiceEditorProps {
  initialInvoice?: Invoice | null;
  products: Product[];
  customers?: Customer[];
  settings: StoreSettings;
  isSecretMode: boolean;
  onToggleSecretMode: () => void;
  onSave: (invoice: Invoice, newProducts?: Product[]) => void;
  onAddProduct?: (product: Product) => void;
  onUpdateProduct?: (product: Product) => void;
  onCancel: () => void;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
  liquidityBalances?: LiquidityBalances;
  invoices?: Invoice[];
  payments?: CustomerPayment[];
  productReturns?: ProductReturn[];
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({
  initialInvoice,
  products,
  customers = [],
  settings,
  isSecretMode,
  onToggleSecretMode,
  onSave,
  onAddProduct,
  onUpdateProduct,
  onCancel,
  onShowAlert,
  liquidityBalances,
  invoices = [],
  payments = [],
  productReturns = [],
}) => {
  const theme = themes[settings.themeColor] || themes.teal;

  // Pending new products defined in this invoice session (buffered locally - NOT saved to warehouse until final invoice registration)
  const [pendingNewProducts, setPendingNewProducts] = useState<Product[]>([]);
  const [pendingPriceUpdates, setPendingPriceUpdates] = useState<{ productId: string; newPurchasePrice: number; newSellingPrice?: number }[]>([]);

  // Combined product catalog for local view and modal selection within this invoice
  // Allows modified products and newly created products in this invoice session to be reflected locally
  // WITHOUT modifying the master product store until final invoice save
  const currentProductsList = useMemo(() => {
    const pendingMap = new Map(pendingNewProducts.map(p => [p.id, p]));
    const merged = products.map(p => pendingMap.get(p.id) || p);
    const existingIds = new Set(products.map(p => p.id));
    pendingNewProducts.forEach(p => {
      if (!existingIds.has(p.id)) {
        merged.push(p);
      }
    });
    return merged;
  }, [products, pendingNewProducts]);

  // Invoice Form State
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(initialInvoice?.type || 'sale');
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialInvoice?.invoiceNumber || String(Math.floor(1000 + Math.random() * 9000))
  );
  const [date, setDate] = useState(initialInvoice?.date || getCurrentPersianDate());
  const [time, setTime] = useState(initialInvoice?.time || getCurrentPersianTime());
  const [customerName, setCustomerName] = useState(initialInvoice?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialInvoice?.customerPhone || '');
  const [customerCity, setCustomerCity] = useState(initialInvoice?.customerCity || '');
  const [customerAddress, setCustomerAddress] = useState(initialInvoice?.customerAddress || '');
  const [salesType, setSalesType] = useState(initialInvoice?.salesType || 'نقدی عادی (تا ۱۰۰ میلیون تومان)');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(() => {
    if (initialInvoice?.paymentStatus) return initialInvoice.paymentStatus;
    if (initialInvoice?.paymentMethod?.includes('نسیه') || initialInvoice?.paymentMethod?.includes('غیر')) return 'credit';
    if (initialInvoice?.paymentMethod?.includes('نقد')) return 'cash';
    if (initialInvoice?.type === 'purchase' || invoiceType === 'purchase') return 'credit';
    return 'cash';
  });
  const [paidAmount, setPaidAmount] = useState<number>(() => {
    if (initialInvoice?.paidAmount !== undefined) return initialInvoice.paidAmount;
    if (initialInvoice?.paymentStatus === 'cash') return initialInvoice.finalAmount || 0;
    return 0;
  });
  const [paymentMethodDetails, setPaymentMethodDetails] = useState<string>(
    initialInvoice?.paymentMethodDetails || ''
  );
  const [paymentAccount, setPaymentAccount] = useState<'bank' | 'cash'>(() => {
    if (initialInvoice?.paymentAccount) return initialInvoice.paymentAccount;
    if (initialInvoice?.paymentMethodDetails?.includes('نقد')) return 'cash';
    return 'bank';
  });
  const [paymentMethod, setPaymentMethod] = useState(initialInvoice?.paymentMethod || 'نقدی (تسویه شده کامل)');
  const [previousBalance, setPreviousBalance] = useState(initialInvoice?.previousBalance || 'بی‌حساب (۰)');
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    if (!initialInvoice?.items) return [];
    return initialInvoice.items.map(it => {
      const matchingProd = products.find(p => p.id === it.productId || p.name?.trim() === it.productName?.trim());
      const pPrice = (it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0)
        ? it.unitPurchasePrice
        : (matchingProd?.purchasePrice || 0);
      const sPrice = (it.unitSellingPrice !== undefined && it.unitSellingPrice > 0)
        ? it.unitSellingPrice
        : (matchingProd?.sellingPrice || (pPrice > 0 ? Math.round(pPrice * 1.25) : (it.unitPrice || 0)));
      
      const totPieces = it.totalPieces > 0 ? it.totalPieces : ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));
      const totPrice = initialInvoice.type === 'purchase'
        ? (it.totalPrice > 0 ? it.totalPrice : totPieces * pPrice)
        : (sPrice > 0 && totPieces > 0 ? totPieces * sPrice : (it.totalPrice || 0));
      const totPurchaseCost = totPieces * pPrice;
      const profit = Math.max(0, (sPrice - pPrice) * totPieces);

      return {
        ...it,
        cartonsCount: it.cartonsCount !== undefined ? it.cartonsCount : (matchingProd && matchingProd.piecesPerCarton > 0 ? Math.floor(totPieces / matchingProd.piecesPerCarton) : 0),
        extraPieces: it.extraPieces !== undefined ? it.extraPieces : (matchingProd && matchingProd.piecesPerCarton > 0 ? totPieces % matchingProd.piecesPerCarton : 0),
        piecesPerCarton: it.piecesPerCarton || matchingProd?.piecesPerCarton || 1,
        totalPieces: totPieces,
        unitPurchasePrice: pPrice,
        unitSellingPrice: sPrice,
        totalPrice: totPrice,
        totalPurchaseCost: totPurchaseCost,
        profitAmount: it.profitAmount !== undefined && it.profitAmount > 0 ? it.profitAmount : profit,
        profitPercentage: it.profitPercentage !== undefined && it.profitPercentage > 0 ? it.profitPercentage : (totPrice > 0 ? (profit / totPrice) * 100 : 0),
      };
    });
  });
  const [hasDiscount, setHasDiscount] = useState<boolean>(() => {
    if (initialInvoice?.hasDiscount !== undefined) return initialInvoice.hasDiscount;
    return Boolean(initialInvoice?.discount && initialInvoice.discount > 0);
  });
  const [discountPercent, setDiscountPercent] = useState<number>(() => {
    if (initialInvoice?.discountPercent !== undefined && initialInvoice.discountPercent > 0) return initialInvoice.discountPercent;
    if (initialInvoice?.discount && initialInvoice?.subtotal && initialInvoice.subtotal > 0) {
      return Math.round((initialInvoice.discount / initialInvoice.subtotal) * 100 * 10) / 10;
    }
    return 8; // Default 8% when activated
  });
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [discount, setDiscount] = useState<number>(initialInvoice?.discount || 0);
  const [tax, setTax] = useState<number>(initialInvoice?.tax || 0);
  const [notes, setNotes] = useState(initialInvoice?.notes || settings.minOrderNotice || '');

  // Invoice Expenses, Freight, Losses and Deductions
  const [invoiceExpenses, setInvoiceExpenses] = useState<InvoiceExpense[]>(() => {
    return initialInvoice?.expenses ? JSON.parse(JSON.stringify(initialInvoice.expenses)) : [];
  });
  const [isExpensesSectionOpen, setIsExpensesSectionOpen] = useState<boolean>(() => {
    return Boolean(initialInvoice?.expenses && initialInvoice.expenses.length > 0);
  });

  // Fast customer selector dropdown toggle
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Product Selection Modal State
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Hide zero-stock products in invoice item picker (persisted, default true)
  const [hideZeroStock, setHideZeroStock] = useState<boolean>(() => {
    const saved = localStorage.getItem('bazargani_invoice_picker_hide_zero_stock');
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
    localStorage.setItem('bazargani_invoice_picker_hide_zero_stock', JSON.stringify(hideZeroStock));
  }, [hideZeroStock]);

  // Synchronize invoice form state whenever initialInvoice changes
  useEffect(() => {
    if (initialInvoice) {
      const type = initialInvoice.type || 'sale';
      setInvoiceType(type);
      setInvoiceNumber(initialInvoice.invoiceNumber || String(Math.floor(1000 + Math.random() * 9000)));
      setDate(initialInvoice.date || getCurrentPersianDate());
      setTime(initialInvoice.time || getCurrentPersianTime());
      setCustomerName(initialInvoice.customerName || '');
      setCustomerPhone(initialInvoice.customerPhone || '');
      setCustomerCity(initialInvoice.customerCity || '');
      setCustomerAddress(initialInvoice.customerAddress || '');
      setSalesType(initialInvoice.salesType || (type === 'purchase' ? 'خرید کالا (ورود به انبار)' : 'نقدی عادی (تا ۱۰۰ میلیون تومان)'));
      
      const pStatus: PaymentStatus = initialInvoice.paymentStatus || (
        initialInvoice.paymentMethod?.includes('نسیه') || initialInvoice.paymentMethod?.includes('غیر') ? 'credit' :
        initialInvoice.paymentMethod?.includes('نقد') ? 'cash' :
        type === 'purchase' ? 'credit' : 'cash'
      );
      setPaymentStatus(pStatus);
      
      setPaidAmount(initialInvoice.paidAmount !== undefined ? initialInvoice.paidAmount : (pStatus === 'cash' ? (initialInvoice.finalAmount || 0) : 0));
      setPaymentMethodDetails(initialInvoice.paymentMethodDetails || '');
      setPaymentAccount(initialInvoice.paymentAccount || (initialInvoice.paymentMethodDetails?.includes('نقد') ? 'cash' : 'bank'));
      setPaymentMethod(initialInvoice.paymentMethod || (pStatus === 'cash' ? 'نقدی (تسویه شده کامل)' : 'غیر نقدی (نسیه / حساب مشتری)'));
      setPreviousBalance(initialInvoice.previousBalance || 'بی‌حساب (۰)');
      
      if (initialInvoice.items) {
        setItems(initialInvoice.items.map(it => {
          const matchingProd = products.find(p => p.id === it.productId || p.name?.trim() === it.productName?.trim());
          const pPrice = (it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0)
            ? it.unitPurchasePrice
            : (matchingProd?.purchasePrice || 0);
          const sPrice = (it.unitSellingPrice !== undefined && it.unitSellingPrice > 0)
            ? it.unitSellingPrice
            : (matchingProd?.sellingPrice || (pPrice > 0 ? Math.round(pPrice * 1.25) : (it.unitPrice || 0)));
          
          const totPieces = it.totalPieces > 0 ? it.totalPieces : ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));
          const totPrice = type === 'purchase'
            ? (it.totalPrice > 0 ? it.totalPrice : totPieces * pPrice)
            : (sPrice > 0 && totPieces > 0 ? totPieces * sPrice : (it.totalPrice || 0));
          const totPurchaseCost = totPieces * pPrice;
          const profit = Math.max(0, (sPrice - pPrice) * totPieces);

          return {
            ...it,
            cartonsCount: it.cartonsCount !== undefined ? it.cartonsCount : (matchingProd && matchingProd.piecesPerCarton > 0 ? Math.floor(totPieces / matchingProd.piecesPerCarton) : 0),
            extraPieces: it.extraPieces !== undefined ? it.extraPieces : (matchingProd && matchingProd.piecesPerCarton > 0 ? totPieces % matchingProd.piecesPerCarton : 0),
            piecesPerCarton: it.piecesPerCarton || matchingProd?.piecesPerCarton || 1,
            totalPieces: totPieces,
            unitPurchasePrice: pPrice,
            unitSellingPrice: sPrice,
            totalPrice: totPrice,
            totalPurchaseCost: totPurchaseCost,
            profitAmount: it.profitAmount !== undefined && it.profitAmount > 0 ? it.profitAmount : profit,
            profitPercentage: it.profitPercentage !== undefined && it.profitPercentage > 0 ? it.profitPercentage : (totPrice > 0 ? (profit / totPrice) * 100 : 0),
          };
        }));
      }

      setHasDiscount(initialInvoice.hasDiscount !== undefined ? initialInvoice.hasDiscount : Boolean(initialInvoice.discount && initialInvoice.discount > 0));
      setDiscountPercent(initialInvoice.discountPercent !== undefined && initialInvoice.discountPercent > 0 ? initialInvoice.discountPercent : 8);
      setDiscount(initialInvoice.discount || 0);
      setTax(initialInvoice.tax || 0);
      setNotes(initialInvoice.notes || settings.minOrderNotice || '');
      setInvoiceExpenses(initialInvoice.expenses ? JSON.parse(JSON.stringify(initialInvoice.expenses)) : []);
      setIsExpensesSectionOpen(Boolean(initialInvoice.expenses && initialInvoice.expenses.length > 0));
    }
  }, [initialInvoice?.id]);

  // Multi-item quick add customizer in picker
  const [activePickingProduct, setActivePickingProduct] = useState<Product | null>(null);
  const [pickerQuantityMode, setPickerQuantityMode] = useState<'pieces' | 'cartons'>('pieces');
  const [pickCartons, setPickCartons] = useState<number>(1);
  const [pickPacks, setPickPacks] = useState<number>(20);
  const [pickPiecesPerPack, setPickPiecesPerPack] = useState<number>(24);
  const [pickExtraPieces, setPickExtraPieces] = useState<number>(0);
  const [pickTotalPieces, setPickTotalPieces] = useState<number>(480);
  const [pickSellingPrice, setPickSellingPrice] = useState<number>(0);
  const [pickPurchasePrice, setPickPurchasePrice] = useState<number>(0);
  const [customDescription, setCustomDescription] = useState<string>('');

  // Inward sell-through analysis (for purchase invoices)
  const inwardSellThroughSummary = useMemo(() => {
    if (invoiceType !== 'purchase' || !initialInvoice) return null;
    return calculateInwardInvoiceSellThrough(initialInvoice, invoices, currentProductsList);
  }, [invoiceType, initialInvoice, invoices, currentProductsList]);

  // Item Edit Modal State
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [editingOriginalMeta, setEditingOriginalMeta] = useState<{ id?: string; name?: string; productId?: string; category?: string }>({});
  const [isUnknownCartonMode, setIsUnknownCartonMode] = useState<boolean>(false);

  // Helper to open edit item modal with smart detection of unpackaged / unknown carton items
  const openEditItemModal = (item: InvoiceItem) => {
    const associatedProduct = currentProductsList.find(p => p.id === item.productId || (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase()));
    
    const packs = item.packsCount || associatedProduct?.packsPerCarton || 1;
    const ppp = item.piecesPerPack || associatedProduct?.piecesPerPack || 1;
    const ppc = item.piecesPerCarton || associatedProduct?.piecesPerCarton || (packs * ppp) || 1;

    setEditingOriginalMeta({
      id: item.id,
      name: item.productName,
      productId: item.productId || associatedProduct?.id,
      category: (item as any).category || associatedProduct?.category || '',
    });

    setEditingItem({
      ...item,
      productId: item.productId || associatedProduct?.id || '',
      productName: item.productName || associatedProduct?.name || '',
      category: (item as any).category || associatedProduct?.category || '',
      packsCount: packs,
      piecesPerPack: ppp,
      piecesPerCarton: ppc,
      unitTitle: item.unitTitle || associatedProduct?.unitTitle || 'عدد'
    } as any);
    const isUnpack = (ppc <= 1) || item.cartonsCount === 0 || item.cartonsCount === item.totalPieces || !!item.isUnpackaged || !!associatedProduct?.isUnpackaged;
    setIsUnknownCartonMode(isUnpack);
  };

  // Quick Restock State inside Invoice Editor
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockCartons, setRestockCartons] = useState<number>(1);
  const [restockExtraPieces, setRestockExtraPieces] = useState<number>(0);

  // Inward Product Modal State (for purchase invoices)
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);

  // Quick New Product Modal inside Picker
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductCustomCategory, setNewProductCustomCategory] = useState('');
  const [newProductPurchasePrice, setNewProductPurchasePrice] = useState<number>(0);
  const [newProductSellingPrice, setNewProductSellingPrice] = useState<number>(0);
  const [newProductPacksPerCarton, setNewProductPacksPerCarton] = useState<number>(20);
  const [newProductPiecesPerPack, setNewProductPiecesPerPack] = useState<number>(24);
  const [newProductInitialStockCartons, setNewProductInitialStockCartons] = useState<number>(10);
  const [newProductInitialStockExtraPieces, setNewProductInitialStockExtraPieces] = useState<number>(0);
  const [newProductUnitTitle, setNewProductUnitTitle] = useState('عدد');
  const [newProductNotes, setNewProductNotes] = useState('');

  const handleCreateAndAddProduct = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProductName.trim()) {
      onShowAlert?.('لطفاً نام کالا را وارد کنید.', 'warning', 'نام کالا الزامی است');
      return;
    }

    const cat = newProductCategory === 'custom' 
      ? (newProductCustomCategory.trim() || 'متفرقه')
      : (newProductCategory.trim() || 'آبنبات و شکلات');

    const ppp = Math.max(1, newProductPiecesPerPack || 24);
    const packs = Math.max(1, newProductPacksPerCarton || 20);
    const piecesPerCarton = packs * ppp;
    const initialTotalPieces = (Math.max(0, newProductInitialStockCartons) * piecesPerCarton) + Math.max(0, newProductInitialStockExtraPieces);

    const newProd: Product = {
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: newProductName.trim(),
      category: cat,
      purchasePrice: Math.max(0, newProductPurchasePrice),
      sellingPrice: Math.max(0, newProductSellingPrice),
      stockPieces: initialTotalPieces,
      packsPerCarton: packs,
      piecesPerPack: ppp,
      piecesPerCarton: piecesPerCarton,
      unitTitle: newProductUnitTitle.trim() || 'عدد',
      minOrderCartons: 1,
      notes: newProductNotes.trim(),
    };

    // Buffer new product in pendingNewProducts until final invoice save
    setPendingNewProducts(prev => {
      const filtered = prev.filter(p => p.id !== newProd.id);
      return [...filtered, newProd];
    });
    onShowAlert?.(`کالای «${newProd.name}» به اقلام این فاکتور افزوده شد. (ثبت قطعی در انبار با ثبت نهایی فاکتور انجام می‌شود).`, 'success', 'ثبت کالا');

    // Reset form
    setNewProductName('');
    setNewProductPurchasePrice(0);
    setNewProductSellingPrice(0);
    setNewProductNotes('');
    setIsNewProductModalOpen(false);

    // Immediately open customizer for this newly added product
    openProductCustomizer(newProd);
  };

  const handleOpenRestock = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRestockProduct(prod);
    setRestockCartons(1);
    setRestockExtraPieces(0);
  };

  const handleConfirmRestock = () => {
    if (!restockProduct) return;
    const piecesPerCarton = restockProduct.piecesPerCarton || 1;
    const addedTotal = (restockCartons * piecesPerCarton) + restockExtraPieces;

    if (addedTotal <= 0) return;

    const newStock = Math.max(0, restockProduct.stockPieces + addedTotal);
    const updatedProd: Product = {
      ...restockProduct,
      stockPieces: newStock,
    };

    onUpdateProduct?.(updatedProd);

    // If currently customizing this product in picker, update active picking product reference
    if (activePickingProduct && activePickingProduct.id === restockProduct.id) {
      setActivePickingProduct(updatedProd);
    }

    setRestockProduct(null);
  };

  // Add or merge inward product items from InwardProductModal
  const handleAddInwardItem = (
    item: InvoiceItem,
    newProductToCreate?: Product,
    updateExistingProductPrice?: { productId: string; newPurchasePrice: number; newSellingPrice?: number },
    keepModalOpen?: boolean
  ) => {
    // 1. Buffer brand new product locally (saved to warehouse catalog only on final invoice save)
    if (newProductToCreate) {
      setPendingNewProducts(prev => {
        const filtered = prev.filter(p => p.id !== newProductToCreate.id);
        return [...filtered, newProductToCreate];
      });
    }

    // 2. Buffer price update locally (saved to warehouse catalog only on final invoice save)
    if (updateExistingProductPrice) {
      setPendingPriceUpdates(prev => {
        const filtered = prev.filter(u => u.productId !== updateExistingProductPrice.productId);
        return [...filtered, updateExistingProductPrice];
      });
    }

    // 3. Sync packaging and details to local buffer (transient until final save)
    if (item.productId && !newProductToCreate) {
      const existing = currentProductsList.find(p => p.id === item.productId || (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase()));
      if (existing) {
        const itemPacks = Number(item.packsCount) > 0 ? Number(item.packsCount) : (existing.packsPerCarton || 1);
        const itemPpp = Number(item.piecesPerPack) > 0 ? Number(item.piecesPerPack) : (existing.piecesPerPack || 1);
        const itemPpc = Number(item.piecesPerCarton) > 0 ? Number(item.piecesPerCarton) : (itemPacks * itemPpp);

        const updatedProd: Product = {
          ...existing,
          piecesPerCarton: itemPpc,
          packsPerCarton: itemPacks,
          piecesPerPack: itemPpp,
          unitTitle: item.unitTitle || existing.unitTitle || 'عدد',
          purchasePrice: (item.unitPurchasePrice && item.unitPurchasePrice > 0) ? item.unitPurchasePrice : existing.purchasePrice,
          sellingPrice: (item.unitSellingPrice && item.unitSellingPrice > 0) ? item.unitSellingPrice : existing.sellingPrice,
          updatedAt: Date.now()
        };
        setPendingNewProducts(prev => {
          const filtered = prev.filter(p => p.id !== updatedProd.id);
          return [...filtered, updatedProd];
        });
      }
    }

    // 4. Merge with existing item if product ID and unit purchase price are identical; otherwise add as distinct row
    setItems(prevItems => {
      const existingIdx = prevItems.findIndex(
        it => it.productId === item.productId && it.unitPurchasePrice === item.unitPurchasePrice
      );

      if (existingIdx >= 0) {
        const existing = prevItems[existingIdx];
        const mergedCartons = existing.cartonsCount + item.cartonsCount;
        const mergedExtra = (existing.extraPieces || 0) + (item.extraPieces || 0);
        const mergedTotalPieces = existing.totalPieces + item.totalPieces;
        const mergedTotalPrice = existing.totalPrice + item.totalPrice;
        const mergedTotalPurchaseCost = existing.totalPurchaseCost + item.totalPurchaseCost;
        const mergedProfitAmount = mergedTotalPrice - mergedTotalPurchaseCost;
        const mergedProfitPct = mergedTotalPrice > 0 ? (mergedProfitAmount / mergedTotalPrice) * 100 : 0;

        const updated = [...prevItems];
        updated[existingIdx] = {
          ...existing,
          cartonsCount: mergedCartons,
          extraPieces: mergedExtra,
          totalPieces: mergedTotalPieces,
          totalPrice: mergedTotalPrice,
          totalPurchaseCost: mergedTotalPurchaseCost,
          profitAmount: mergedProfitAmount,
          profitPercentage: mergedProfitPct,
        };
        return updated;
      } else {
        return [...prevItems, item];
      }
    });

    if (!keepModalOpen) {
      setIsInwardModalOpen(false);
    }
    onShowAlert?.(`کالای «${item.productName}» با موفقیت به اقلام ورود کالا اضافه شد.`, 'success', 'ثبت ردیف ورود');
  };

  // Categories - strictly unique, non-empty, and without duplicated 'all'
  const categories = useMemo(() => {
    const rawSet = new Set(
      currentProductsList
        .map(p => (p.category || '').trim())
        .filter(c => c && c.toLowerCase() !== 'all')
    );
    return ['all', ...Array.from(rawSet)];
  }, [currentProductsList]);

  // Quick Customer Select Handler - computes exact live balance
  const handleSelectCustomer = (cust: Customer) => {
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone || '');
    setCustomerCity(cust.city || '');
    setCustomerAddress(cust.address || '');
    const liveBal = calculateCustomerLiveBalance(cust, invoices, payments, productReturns);
    if (liveBal > 0) {
      setPreviousBalance(`${toPersianDigits(liveBal.toLocaleString())} بدهکار به ما`);
    } else if (liveBal < 0) {
      setPreviousBalance(`${toPersianDigits(Math.abs(liveBal).toLocaleString())} بستانکار از ما`);
    } else {
      setPreviousBalance('بی‌حساب (۰)');
    }
    setIsCustomerDropdownOpen(false);
  };

  // Helper to reliably check if a product is unpackaged (بدون بسته‌بندی کارتن)
  const isProductUnpackaged = (prod?: Product | null): boolean => {
    if (!prod) return false;
    const ppc = prod.piecesPerCarton || 1;
    const packs = prod.packsPerCarton || 1;
    const ppp = prod.piecesPerPack || 1;
    return (ppc <= 1 && packs <= 1 && ppp <= 1) || prod.unitTitle === 'کیلوگرم' || prod.unitTitle === 'متر' || prod.unitTitle === 'گرم';
  };

  // Helper to reliably determine piecesPerCarton from product or pack structure
  const getProductPiecesPerCarton = (prod?: Product | null, packs?: number, ppp?: number): number => {
    if (prod && isProductUnpackaged(prod)) {
      return 1;
    }
    // If packs and ppp are provided and both are > 1, their multiplication defines the carton
    if (packs !== undefined && ppp !== undefined && packs > 1 && ppp > 1) {
      return packs * ppp;
    }
    // If the product has an explicit carton size > 1, that is the authoritative carton size! (e.g. 38 or 32 or 480)
    if (prod?.piecesPerCarton && prod.piecesPerCarton > 1) {
      return prod.piecesPerCarton;
    }
    // If product has explicit packs > 1 and piecesPerPack > 1
    if (prod?.packsPerCarton && prod?.piecesPerPack && prod.packsPerCarton > 1 && prod.piecesPerPack > 1) {
      return prod.packsPerCarton * prod.piecesPerPack;
    }
    if (packs && ppp && packs > 0 && ppp > 0) {
      return packs * ppp;
    }
    return prod?.piecesPerCarton && prod.piecesPerCarton > 0 ? prod.piecesPerCarton : 1;
  };

  // Open product picker
  const openProductCustomizer = (prod: Product, selectAllStock: boolean = false) => {
    const isUnpackaged = isProductUnpackaged(prod);
    const piecesPerCarton = isUnpackaged ? 1 : getProductPiecesPerCarton(prod, prod.packsPerCarton, prod.piecesPerPack);
    const defaultPacks = isUnpackaged ? 1 : (prod.packsPerCarton || 1);
    const defaultPPP = isUnpackaged ? 1 : (prod.piecesPerPack || piecesPerCarton);

    let defaultCartons = 1;
    let total = piecesPerCarton;

    if (selectAllStock && prod.stockPieces > 0) {
      total = prod.stockPieces;
      defaultCartons = (!isUnpackaged && piecesPerCarton > 1) ? Math.floor(total / piecesPerCarton) : 0;
    } else if (isUnpackaged) {
      defaultCartons = 0;
      total = 1;
    } else {
      defaultCartons = prod.minOrderCartons || 1;
      total = defaultCartons * piecesPerCarton;
    }

    setActivePickingProduct(prod);
    setPickerQuantityMode('pieces');
    setPickCartons(defaultCartons);
    setPickPacks(defaultPacks);
    setPickPiecesPerPack(defaultPPP);
    setPickExtraPieces((!isUnpackaged && piecesPerCarton > 1) ? (total % piecesPerCarton) : 0);
    setPickTotalPieces(total);
    setPickSellingPrice(prod.sellingPrice > 0 ? prod.sellingPrice : (prod.purchasePrice > 0 ? Math.round(prod.purchasePrice * 1.25) : 0));
    setPickPurchasePrice(prod.purchasePrice);
    setCustomDescription('');
  };

  // Smart Recalculation for Customizer: Cartons / Packs / PiecesPerPack / ExtraPieces / TotalPieces
  const handlePickerCartonsChange = (cartons: number) => {
    const validCartons = Math.max(0, cartons);
    setPickCartons(validCartons);

    const isUnpackaged = isProductUnpackaged(activePickingProduct);
    const piecesPerCarton = isUnpackaged ? 1 : getProductPiecesPerCarton(activePickingProduct, pickPacks, pickPiecesPerPack);
    const newTotal = (validCartons * piecesPerCarton) + pickExtraPieces;
    setPickTotalPieces(newTotal);
  };

  const handlePickerPacksChange = (packs: number) => {
    const validPacks = Math.max(1, packs);
    setPickPacks(validPacks);

    const ppp = pickPiecesPerPack || activePickingProduct?.piecesPerPack || 1;
    const piecesPerCarton = (validPacks > 1 && ppp > 1) ? (validPacks * ppp) : getProductPiecesPerCarton(activePickingProduct, validPacks, ppp);

    const newTotal = (pickCartons * piecesPerCarton) + pickExtraPieces;
    setPickTotalPieces(newTotal);
  };

  const handlePickerPiecesPerPackChange = (ppp: number) => {
    const validPpp = Math.max(1, ppp);
    setPickPiecesPerPack(validPpp);

    const packs = pickPacks || activePickingProduct?.packsPerCarton || 1;
    const piecesPerCarton = (packs > 1 && validPpp > 1) ? (packs * validPpp) : getProductPiecesPerCarton(activePickingProduct, packs, validPpp);

    const newTotal = (pickCartons * piecesPerCarton) + pickExtraPieces;
    setPickTotalPieces(newTotal);
  };

  const handlePickerExtraPiecesChange = (extra: number) => {
    const validExtra = Math.max(0, extra);
    setPickExtraPieces(validExtra);

    const isUnpackaged = isProductUnpackaged(activePickingProduct);
    const piecesPerCarton = isUnpackaged ? 1 : getProductPiecesPerCarton(activePickingProduct, pickPacks, pickPiecesPerPack);
    const newTotal = (pickCartons * piecesPerCarton) + validExtra;
    setPickTotalPieces(newTotal);
  };

  const handlePickerTotalPiecesChange = (total: number) => {
    const validTotal = Math.max(0, total);
    setPickTotalPieces(validTotal);

    const isUnpackaged = isProductUnpackaged(activePickingProduct);
    const piecesPerCarton = isUnpackaged ? 1 : getProductPiecesPerCarton(activePickingProduct, pickPacks, pickPiecesPerPack);

    if (piecesPerCarton > 1) {
      setPickCartons(Math.floor(validTotal / piecesPerCarton));
      setPickExtraPieces(validTotal % piecesPerCarton);
    } else {
      setPickCartons(0);
      setPickExtraPieces(validTotal);
    }
  };

  // Add customized product to invoice items
  const handleAddProductToInvoice = () => {
    if (!activePickingProduct) return;

    const isUnpackaged = isProductUnpackaged(activePickingProduct);
    const piecesPerCarton = isUnpackaged ? 1 : getProductPiecesPerCarton(activePickingProduct, pickPacks, pickPiecesPerPack);
    const ppp = isUnpackaged ? 1 : (pickPiecesPerPack || activePickingProduct.piecesPerPack || (piecesPerCarton > 0 ? piecesPerCarton : 24));
    const packs = isUnpackaged ? 1 : (pickPacks || activePickingProduct.packsPerCarton || 1);

    // Mathematically exact total pieces
    const computedTotal = (Math.max(0, pickCartons) * piecesPerCarton) + Math.max(0, pickExtraPieces);
    const totalPieces = pickTotalPieces > 0 ? pickTotalPieces : computedTotal;

    // Synchronize cartons count and loose pieces with totalPieces
    const finalCartons = (!isUnpackaged && piecesPerCarton > 1) ? Math.floor(totalPieces / piecesPerCarton) : 0;
    const finalExtra = (!isUnpackaged && piecesPerCarton > 1) ? (totalPieces % piecesPerCarton) : totalPieces;

    let unitPurchasePrice = pickPurchasePrice;
    let unitSellingPrice = pickSellingPrice;
    let totalPrice = totalPieces * unitSellingPrice;
    let totalPurchaseCost = totalPieces * unitPurchasePrice;
    let profitAmount = totalPrice - totalPurchaseCost;
    let profitPercentage = totalPrice > 0 ? (profitAmount / totalPrice) * 100 : 0;

    if (invoiceType === 'purchase') {
      unitPurchasePrice = pickPurchasePrice > 0 ? pickPurchasePrice : (activePickingProduct.purchasePrice || pickSellingPrice);
      unitSellingPrice = (pickSellingPrice > 0 && pickSellingPrice !== unitPurchasePrice)
        ? pickSellingPrice
        : (activePickingProduct.sellingPrice > 0 ? activePickingProduct.sellingPrice : Math.round(unitPurchasePrice * 1.25));
      totalPrice = totalPieces * unitPurchasePrice;
      totalPurchaseCost = totalPrice;
      profitAmount = Math.max(0, (unitSellingPrice - unitPurchasePrice) * totalPieces);
      profitPercentage = totalPurchaseCost > 0 ? (profitAmount / totalPurchaseCost) * 100 : 0;
    }

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      productId: activePickingProduct.id,
      productName: activePickingProduct.name,
      unitTitle: activePickingProduct.unitTitle || 'عدد',
      cartonsCount: finalCartons,
      packsCount: packs,
      piecesPerPack: ppp,
      extraPieces: finalExtra,
      piecesPerCarton: piecesPerCarton,
      totalPieces,
      unitPurchasePrice,
      unitSellingPrice,
      totalPrice,
      totalPurchaseCost,
      profitAmount,
      profitPercentage,
      customDescription: customDescription.trim() || undefined,
    };

    setItems([...items, newItem]);
    setActivePickingProduct(null);
    setIsProductPickerOpen(false);
  };

  // Update item field directly in invoice table with Smart Carton / Pack / Total Calculations
  const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };

      const associatedProduct = currentProductsList.find(p => p.id === item.productId || (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase()));
      
      let packs = updates.packsCount ?? item.packsCount ?? associatedProduct?.packsPerCarton ?? 1;
      let ppp = updates.piecesPerPack ?? item.piecesPerPack ?? associatedProduct?.piecesPerPack ?? 1;
      let piecesPerCarton: number;

      // 1. Authoritative resolution of piecesPerCarton
      if (updates.piecesPerCarton !== undefined && updates.piecesPerCarton > 0) {
        piecesPerCarton = updates.piecesPerCarton;
        // Never overwrite user-defined packs or piecesPerPack!
        // Especially if packs === 1 and ppp === 1, keep them as 1 and do NOT change either to piecesPerCarton!
      } else if (updates.packsCount !== undefined || updates.piecesPerPack !== undefined) {
        if (packs > 1 && ppp > 1) {
          piecesPerCarton = Math.max(1, packs * ppp);
        } else {
          piecesPerCarton = updated.piecesPerCarton ?? item.piecesPerCarton ?? associatedProduct?.piecesPerCarton ?? Math.max(1, packs * ppp);
        }
      } else {
        piecesPerCarton = updated.piecesPerCarton ?? item.piecesPerCarton ?? associatedProduct?.piecesPerCarton ?? Math.max(1, packs * ppp);
      }
      if (!piecesPerCarton || piecesPerCarton <= 0) piecesPerCarton = 1;

      // 2. Authoritative resolution of totalPieces and carton counts
      let totalPieces: number;
      let cartons = updates.cartonsCount !== undefined ? updates.cartonsCount : (item.cartonsCount ?? 0);
      let extra = updates.extraPieces !== undefined ? updates.extraPieces : (item.extraPieces ?? 0);

      if (updates.totalPieces !== undefined && updates.cartonsCount === undefined) {
        // Direct total pieces input
        totalPieces = Math.max(0, updates.totalPieces);
        if (piecesPerCarton > 0) {
          cartons = Math.floor(totalPieces / piecesPerCarton);
          extra = totalPieces % piecesPerCarton;
        }
      } else if (updates.cartonsCount !== undefined && updates.totalPieces === undefined) {
        // Direct cartons count input
        cartons = Math.max(0, updates.cartonsCount);
        totalPieces = (cartons * piecesPerCarton) + extra;
      } else if (updates.extraPieces !== undefined && updates.totalPieces === undefined && updates.cartonsCount === undefined) {
        // Direct extra pieces input
        extra = Math.max(0, updates.extraPieces);
        totalPieces = (cartons * piecesPerCarton) + extra;
      } else if (updates.totalPieces !== undefined) {
        // Full item or explicit total passed (e.g. saving from editingItem modal): NEVER overwrite totalPieces!
        totalPieces = Math.max(0, updates.totalPieces);
        if (updates.cartonsCount !== undefined) {
          cartons = updates.cartonsCount;
          extra = updates.extraPieces !== undefined ? updates.extraPieces : (piecesPerCarton > 0 ? totalPieces % piecesPerCarton : 0);
        } else if (piecesPerCarton > 0) {
          cartons = Math.floor(totalPieces / piecesPerCarton);
          extra = totalPieces % piecesPerCarton;
        }
      } else if (updates.piecesPerCarton !== undefined || updates.packsCount !== undefined || updates.piecesPerPack !== undefined) {
        // Packaging spec changed without changing total count: preserve existing totalPieces, recalculate cartons and loose pieces
        totalPieces = Math.max(0, item.totalPieces);
        if (piecesPerCarton > 0) {
          cartons = Math.floor(totalPieces / piecesPerCarton);
          extra = totalPieces % piecesPerCarton;
        }
      } else {
        totalPieces = (cartons * piecesPerCarton) + extra;
      }

      updated.piecesPerCarton = piecesPerCarton;
      updated.piecesPerPack = ppp;
      updated.packsCount = packs;
      updated.cartonsCount = cartons;
      updated.extraPieces = extra;
      updated.totalPieces = totalPieces;

      // 3. Financial calculations with respect to invoice type (purchase vs sale)
      if (invoiceType === 'purchase') {
        let purchasePrice = updates.unitPurchasePrice !== undefined
          ? updates.unitPurchasePrice
          : (updated.unitPurchasePrice !== undefined && updated.unitPurchasePrice > 0
            ? updated.unitPurchasePrice
            : (item.unitPurchasePrice || 0));

        if (purchasePrice <= 0 && updates.unitSellingPrice !== undefined && updates.unitSellingPrice > 0) {
          purchasePrice = updates.unitSellingPrice;
        }
        if (purchasePrice <= 0 && associatedProduct?.purchasePrice) {
          purchasePrice = associatedProduct.purchasePrice;
        }

        let sellingPrice = updates.unitSellingPrice !== undefined && updates.unitSellingPrice > 0
          ? updates.unitSellingPrice
          : (updated.unitSellingPrice || associatedProduct?.sellingPrice || Math.round(purchasePrice * 1.25));

        updated.unitPurchasePrice = purchasePrice;
        updated.unitSellingPrice = sellingPrice;
        updated.totalPrice = updated.totalPieces * updated.unitPurchasePrice;
        updated.totalPurchaseCost = updated.totalPrice;
        updated.profitAmount = Math.max(0, (updated.unitSellingPrice - updated.unitPurchasePrice) * updated.totalPieces);
        updated.profitPercentage = updated.totalPurchaseCost > 0 ? (updated.profitAmount / updated.totalPurchaseCost) * 100 : 0;
      } else {
        // Recalculate financial amounts for sales invoice with strict priority on custom selling price
        const effectiveUnitSellingPrice = (updates.unitSellingPrice !== undefined && updates.unitSellingPrice > 0)
          ? updates.unitSellingPrice
          : (updated.unitSellingPrice !== undefined && updated.unitSellingPrice > 0
            ? updated.unitSellingPrice
            : (item.unitSellingPrice || associatedProduct?.sellingPrice || 0));

        const effectivePurchasePrice = updates.unitPurchasePrice !== undefined
          ? updates.unitPurchasePrice
          : (updated.unitPurchasePrice || item.unitPurchasePrice || associatedProduct?.purchasePrice || 0);

        updated.unitSellingPrice = effectiveUnitSellingPrice;
        updated.unitPurchasePrice = effectivePurchasePrice;
        updated.totalPrice = updated.totalPieces * effectiveUnitSellingPrice;
        updated.totalPurchaseCost = updated.totalPieces * effectivePurchasePrice;
        updated.profitAmount = updated.totalPrice - updated.totalPurchaseCost;
        updated.profitPercentage = updated.totalPrice > 0 ? (updated.profitAmount / updated.totalPrice) * 100 : 0;
      }

      return updated;
    }));
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Step price up / down by 1,000 Tomans
  const stepPrice = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (invoiceType === 'purchase') {
      const currentPrice = item.unitPurchasePrice || item.unitSellingPrice || 0;
      const newPrice = Math.max(0, currentPrice + delta);
      handleUpdateItem(id, { unitPurchasePrice: newPrice });
    } else {
      const newPrice = Math.max(0, (item.unitSellingPrice || 0) + delta);
      handleUpdateItem(id, { unitSellingPrice: newPrice });
    }
  };

  // Copy purchase price to selling price
  const copyPurchaseToSellingPrice = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    handleUpdateItem(id, { unitSellingPrice: item.unitPurchasePrice });
  };

  // Apply markup percentage on purchase price
  const applyMarkupPercent = (id: string, percent: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newPrice = Math.round((item.unitPurchasePrice * (1 + percent / 100)) / 100) * 100;
    handleUpdateItem(id, { unitSellingPrice: newPrice });
  };

  // Matched customer or supplier for account balance & return offset tracking
  const matchedCustomerOrSupplier = useMemo(() => {
    if (!customerName.trim()) return null;
    return customers.find(c => 
      c.name.trim().toLowerCase() === customerName.trim().toLowerCase() ||
      (c.phone && customerPhone && c.phone.trim() === customerPhone.trim())
    ) || null;
  }, [customers, customerName, customerPhone]);

  // Selected return IDs to offset (تهاتر مرجوعی تسویه نشده با فاکتور جاری)
  const [selectedOffsetReturnIds, setSelectedOffsetReturnIds] = useState<string[]>(() => {
    if (initialInvoice?.offsetReturnIds && Array.isArray(initialInvoice.offsetReturnIds)) {
      return initialInvoice.offsetReturnIds;
    }
    return [];
  });

  // Find all unsettled returns matching this customer / supplier
  const unsettledPartyReturns = useMemo(() => {
    if (!customerName.trim()) return [];
    const trimmedName = customerName.trim().toLowerCase();
    const custId = matchedCustomerOrSupplier?.id;

    return productReturns.filter(ret => {
      // Must be unsettled, OR already offset by this specific invoice during edit
      const isSettledByOther = ret.isRefunded && (!initialInvoice || !initialInvoice.offsetReturnIds?.includes(ret.id));
      if (isSettledByOther) {
        return false;
      }

      // Match by party ID or party name
      const matchById = Boolean(custId && ret.customerId === custId);
      const matchByName = Boolean(ret.customerName && ret.customerName.trim().toLowerCase() === trimmedName);

      return matchById || matchByName;
    });
  }, [productReturns, customerName, matchedCustomerOrSupplier, initialInvoice]);

  // Clean selected returns if customer changes and returns are no longer applicable
  useEffect(() => {
    setSelectedOffsetReturnIds(prev => {
      const validIds = new Set(unsettledPartyReturns.map(r => r.id));
      const filtered = prev.filter(id => validIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [unsettledPartyReturns]);

  // Calculate total offset value of selected returns (تومان)
  const totalOffsetReturnsAmount = useMemo(() => {
    return unsettledPartyReturns
      .filter(r => selectedOffsetReturnIds.includes(r.id))
      .reduce((sum, r) => sum + (r.netAmount !== undefined ? r.netAmount : r.totalAmount), 0);
  }, [unsettledPartyReturns, selectedOffsetReturnIds]);

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);
  const totalPurchaseCost = items.reduce((acc, item) => acc + item.totalPurchaseCost, 0);

  // Synchronize discount with discountPercent if discountMode === 'percent' and hasDiscount is true
  useEffect(() => {
    if (hasDiscount) {
      if (discountMode === 'percent') {
        const calculatedDiscount = Math.round((subtotal * Math.max(0, discountPercent)) / 100);
        setDiscount(calculatedDiscount);
      }
    } else {
      setDiscount(0);
    }
  }, [hasDiscount, discountPercent, discountMode, subtotal]);

  const effectiveDiscountPercent = useMemo(() => {
    if (!hasDiscount) return 0;
    if (discountMode === 'percent' && discountPercent > 0) return discountPercent;
    if (subtotal > 0 && discount > 0) return Math.round((discount / subtotal) * 100 * 10) / 10;
    return 0;
  }, [hasDiscount, discountMode, discountPercent, subtotal, discount]);

  const activeDiscountAmount = hasDiscount ? discount : 0;

  // Invoice Expenses, Freight & Losses aggregations
  const expensesTotalDeduction = useMemo(() => {
    return invoiceExpenses
      .filter(e => e.action === 'deduct')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [invoiceExpenses]);

  const expensesTotalAddition = useMemo(() => {
    return invoiceExpenses
      .filter(e => e.action === 'add')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [invoiceExpenses]);

  const expensesTotalRecordedOnly = useMemo(() => {
    return invoiceExpenses
      .filter(e => e.action === 'record_only')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [invoiceExpenses]);

  const expensesPaidFromLiquidity = useMemo(() => {
    return invoiceExpenses
      .filter(e => e.sourceAccount === 'cash' || e.sourceAccount === 'bank')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [invoiceExpenses]);

  // Final amount after offsetting returns, active discount, taxes, and expenses deductions/additions
  const finalAmount = Math.max(0, subtotal - totalOffsetReturnsAmount - activeDiscountAmount + tax - expensesTotalDeduction + expensesTotalAddition);

  const estimatedSalesRevenue = useMemo(() => {
    return items.reduce((sum, item) => {
      const prod = products.find(p => p.id === item.productId || p.name === item.productName);
      const sPrice = (item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
        ? item.unitSellingPrice
        : ((prod?.sellingPrice && prod.sellingPrice > 0) ? prod.sellingPrice : 0);
      return sum + (item.totalPieces * sPrice);
    }, 0);
  }, [items, products]);

  const directPaidExpenses = useMemo(() => {
    return invoiceExpenses
      .filter(e => e.action === 'record_only' && (e.sourceAccount === 'cash' || e.sourceAccount === 'bank'))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [invoiceExpenses]);

  // Actual total net profit from sales (or estimated profit for inward purchases)
  const totalProfit = useMemo(() => {
    if (invoiceType === 'sale') {
      // Net revenue from selling = subtotal - activeDiscountAmount - expensesTotalDeduction + expensesTotalAddition
      // Profit = Net Revenue - Total Purchase Cost (COGS) - Direct operational expenses paid
      const netSaleRevenue = Math.max(0, subtotal - activeDiscountAmount - expensesTotalDeduction + expensesTotalAddition);
      return netSaleRevenue - totalPurchaseCost - directPaidExpenses;
    } else {
      // For purchase invoice:
      // Net Inward Cost = subtotal - activeDiscountAmount + expensesTotalAddition + tax + directPaidExpenses
      // Estimated Net Profit = estimatedSalesRevenue - Net Inward Cost
      const actualNetInwardCost = Math.max(0, subtotal - activeDiscountAmount + expensesTotalAddition + tax) + directPaidExpenses;
      return estimatedSalesRevenue - actualNetInwardCost;
    }
  }, [invoiceType, subtotal, activeDiscountAmount, expensesTotalAddition, totalPurchaseCost, directPaidExpenses, tax, estimatedSalesRevenue]);

  const overallMargin = useMemo(() => {
    if (invoiceType === 'sale') {
      const netSaleRevenue = Math.max(0, subtotal - activeDiscountAmount - expensesTotalDeduction + expensesTotalAddition);
      return netSaleRevenue > 0 ? (totalProfit / netSaleRevenue) * 100 : 0;
    } else {
      const actualNetInwardCost = Math.max(0, subtotal - activeDiscountAmount + expensesTotalAddition + tax) + directPaidExpenses;
      return actualNetInwardCost > 0 ? (totalProfit / actualNetInwardCost) * 100 : 0;
    }
  }, [invoiceType, subtotal, activeDiscountAmount, expensesTotalDeduction, expensesTotalAddition, totalProfit, tax, directPaidExpenses]);
  const totalCartons = items.reduce((acc, item) => acc + item.cartonsCount, 0);
  const totalPiecesSum = items.reduce((acc, item) => acc + item.totalPieces, 0);
  const totalExtraPiecesSum = items.reduce((acc, item) => {
    const ppc = item.piecesPerCarton || ((item.packsCount || 1) * (item.piecesPerPack || 1));
    return acc + (item.extraPieces !== undefined ? item.extraPieces : (ppc > 0 ? item.totalPieces % ppc : 0));
  }, 0);

  const invoiceCartonBreakdownText = useMemo(() => {
    if (items.length === 0) return '';
    let packagedCartons = 0;
    let packagedExtraPieces = 0;
    let hasPackaged = false;
    let hasUnpackaged = false;

    items.forEach(item => {
      const ppc = item.piecesPerCarton || ((item.packsCount || 1) * (item.piecesPerPack || 1));
      if (ppc > 1) {
        hasPackaged = true;
        packagedCartons += (item.cartonsCount || 0);
        packagedExtraPieces += (item.extraPieces !== undefined ? item.extraPieces : (item.totalPieces % ppc));
      } else {
        hasUnpackaged = true;
      }
    });

    if (!hasPackaged && hasUnpackaged) {
      return 'کارتن: نامشخص';
    }

    const parts: string[] = [];
    if (packagedCartons > 0) {
      parts.push(`${toPersianDigits(packagedCartons)} کارتن`);
    }
    if (packagedExtraPieces > 0) {
      parts.push(`${toPersianDigits(packagedExtraPieces)} دانه`);
    }

    if (parts.length > 0) {
      return parts.join(' و ');
    }
    if (hasPackaged) {
      return `${toPersianDigits(0)} کارتن`;
    }
    return '';
  }, [items]);

  // Sync cash payment with full finalAmount if paymentStatus === 'cash'
  useEffect(() => {
    if (paymentStatus === 'cash') {
      setPaidAmount(finalAmount);
    }
  }, [finalAmount, paymentStatus]);

  // parse previous balance string accurately (with Persian / English digits support)
  const parseBalanceNumber = (str: string): number => {
    if (!str || str.trim() === '' || str.includes('بی‌حساب (۰)') || str === 'بی‌حساب' || str === '۰') return 0;
    const eng = toEnglishDigits(str);
    const cleanStr = eng.replace(/[^\d]/g, '');
    if (!cleanStr) return 0;
    const val = parseInt(cleanStr, 10) || 0;
    if (str.includes('بستانکار') || str.includes('طلبکار') || str.includes('-')) return -val;
    return val;
  };

  const remainingDebtAmount = paymentStatus === 'cash' 
    ? 0 
    : (paymentStatus === 'credit' ? finalAmount : Math.max(0, finalAmount - paidAmount));

  // Real-time Liquidity & Supplier Debt Calculations for Purchase Invoices
  const cashBalance = liquidityBalances?.cashBalance ?? 0;
  const bankBalance = liquidityBalances?.bankBalance ?? 0;
  const totalLiquidity = liquidityBalances?.totalLiquidity ?? 0;

  const currentSelectedAccountBalance = paymentAccount === 'cash' ? cashBalance : bankBalance;
  const effectivePaid = paymentStatus === 'credit' ? 0 : (paymentStatus === 'cash' ? finalAmount : paidAmount);
  const afterPaymentBalance = currentSelectedAccountBalance - effectivePaid;
  const supplierDebtAmount = Math.max(0, finalAmount - effectivePaid);

  const supplierCurrentBalance = useMemo(() => {
    if (matchedCustomerOrSupplier) {
      return calculateCustomerLiveBalance(matchedCustomerOrSupplier, invoices, payments, productReturns);
    }
    return parseBalanceNumber(previousBalance);
  }, [matchedCustomerOrSupplier, invoices, payments, productReturns, previousBalance]);

  // If purchase invoice with credit portion, balance decreases by supplierDebtAmount (reduces what supplier owes us, or increases what we owe supplier)
  const supplierNewBalance = supplierCurrentBalance - supplierDebtAmount;

  // --- INWARD PURCHASING POWER & DEBT INTELLIGENCE (ورود کالا) ---
  const supplierDebtToUs = supplierCurrentBalance > 0 ? supplierCurrentBalance : 0;
  const ourDebtToSupplier = supplierCurrentBalance < 0 ? Math.abs(supplierCurrentBalance) : 0;
  const maxNonCreditPurchasingPower = totalLiquidity + supplierDebtToUs;
  const remainingNonCreditPurchasingPower = maxNonCreditPurchasingPower - finalAmount;
  const isPurchasingExceedingCash = remainingNonCreditPurchasingPower < 0;
  const exceedingCreditAmount = isPurchasingExceedingCash ? Math.abs(remainingNonCreditPurchasingPower) : 0;
  const purchaseCapacityPercent = maxNonCreditPurchasingPower > 0
    ? Math.min(100, Math.round((finalAmount / maxNonCreditPurchasingPower) * 100))
    : 0;

  const calculatedFinalBalance = useMemo(() => {
    if (invoiceType === 'purchase') {
      if (supplierNewBalance > 0) {
        return `${toPersianDigits(supplierNewBalance.toLocaleString())} تومان مانده بدهی تامین‌کننده (بدهکار به ما)`;
      }
      if (supplierNewBalance < 0) {
        return `${toPersianDigits(Math.abs(supplierNewBalance).toLocaleString())} تومان مانده بستانکاری تامین‌کننده (تعهد پرداخت ما)`;
      }
      return 'تسویه کامل حساب و بی‌حساب (۰ تومان)';
    } else {
      if (matchedCustomerOrSupplier) {
        const custNewBal = supplierCurrentBalance + remainingDebtAmount;
        if (custNewBal > 0) return `${toPersianDigits(custNewBal.toLocaleString())} تومان بدهکار`;
        if (custNewBal < 0) return `${toPersianDigits(Math.abs(custNewBal).toLocaleString())} تومان بستانکار`;
        return 'تسویه شده / بی‌حساب';
      }
      const prevVal = parseBalanceNumber(previousBalance);
      if (paymentStatus === 'cash') {
        if (prevVal > 0) return `${toPersianDigits(prevVal.toLocaleString())} تومان بدهکار`;
        if (prevVal < 0) return `${toPersianDigits(Math.abs(prevVal).toLocaleString())} تومان بستانکار`;
        return 'تسویه شده / بی‌حساب (نقدی)';
      }
      const finalVal = prevVal + remainingDebtAmount;
      if (finalVal > 0) return `${toPersianDigits(finalVal.toLocaleString())} تومان بدهکار`;
      if (finalVal < 0) return `${toPersianDigits(Math.abs(finalVal).toLocaleString())} تومان بستانکار`;
      return 'تسویه شده / بی‌حساب';
    }
  }, [invoiceType, supplierNewBalance, matchedCustomerOrSupplier, supplierCurrentBalance, remainingDebtAmount, previousBalance, paymentStatus]);

  // Save validation
  const handleSaveInvoice = (asDraft: boolean = false) => {
    if (!customerName.trim()) {
      onShowAlert?.('لطفاً نام خریدار / تامین‌کننده را وارد کنید.', 'warning', 'نام طرف‌حساب الزامی است');
      return;
    }
    if (items.length === 0) {
      onShowAlert?.('لطفاً حداقل یک کالا به اقلام فاکتور اضافه کنید.', 'warning', 'اقلام فاکتور خالی است');
      return;
    }

    // Apply any pending price updates and synchronize items' packaging to master product catalog
    if (onUpdateProduct) {
      if (pendingPriceUpdates.length > 0) {
        pendingPriceUpdates.forEach(u => {
          const existing = currentProductsList.find(p => p.id === u.productId);
          if (existing) {
            onUpdateProduct({
              ...existing,
              purchasePrice: u.newPurchasePrice,
              sellingPrice: u.newSellingPrice !== undefined 
                ? u.newSellingPrice 
                : existing.sellingPrice,
              updatedAt: Date.now(),
            });
          }
        });
      }

      // Sync items' names, categories, packaging, pricing, and specs to products
      items.forEach(it => {
        const prod = currentProductsList.find(p => p.id === it.productId || (p.name && it.productName && p.name.trim().toLowerCase() === it.productName.trim().toLowerCase()));
        if (prod) {
          const itemPacks = Number(it.packsCount) > 0 ? Number(it.packsCount) : (prod.packsPerCarton || 1);
          const itemPpp = Number(it.piecesPerPack) > 0 ? Number(it.piecesPerPack) : (prod.piecesPerPack || 1);
          const itemPpc = Number(it.piecesPerCarton) > 0 ? Number(it.piecesPerCarton) : (itemPacks * itemPpp);
          const itemUnitTitle = it.unitTitle?.trim() || prod.unitTitle || 'عدد';
          const itemNewName = it.productName?.trim() || prod.name;
          const itemCategory = (it as any).category || prod.category;

          onUpdateProduct({
            ...prod,
            name: itemNewName,
            category: itemCategory,
            piecesPerCarton: itemPpc,
            packsPerCarton: itemPacks,
            piecesPerPack: itemPpp,
            unitTitle: itemUnitTitle,
            purchasePrice: (invoiceType === 'purchase' && it.unitPurchasePrice > 0) ? it.unitPurchasePrice : prod.purchasePrice,
            sellingPrice: (it.unitSellingPrice && it.unitSellingPrice > 0) ? it.unitSellingPrice : prod.sellingPrice,
            updatedAt: Date.now()
          });
        }
      });
    }

    const finalPaid = paymentStatus === 'cash' 
      ? finalAmount 
      : (paymentStatus === 'credit' ? 0 : Math.min(finalAmount, Math.max(0, paidAmount)));
    const finalRemaining = Math.max(0, finalAmount - finalPaid);
    const effectiveInvoiceType: InvoiceType = initialInvoice?.type || invoiceType || 'sale';

    const newInvoice: Invoice = {
      id: initialInvoice?.id || `inv-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim() || '1001',
      date,
      time,
      type: effectiveInvoiceType,
      paymentStatus,
      paidAmount: finalPaid,
      remainingAmount: finalRemaining,
      paymentAccount,
      paymentMethodDetails: paymentMethodDetails.trim() || undefined,
      isDraft: asDraft,
      customerId: matchedCustomerOrSupplier?.id || initialInvoice?.customerId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerCity: customerCity.trim(),
      customerAddress: customerAddress.trim(),
      salesType,
      paymentMethod: paymentStatus === 'cash' 
        ? 'نقدی (تسویه شده کامل)' 
        : paymentStatus === 'partial' 
          ? `پرداخت بخشی (${formatPrice(finalPaid)} نقد / ${formatPrice(finalRemaining)} نسیه)` 
          : 'غیر نقدی (نسیه / حساب مشتری)',
      previousBalance,
      finalCustomerBalance: calculatedFinalBalance,
      items: items.map(it => ({
        ...it,
        originalCartonsCount: it.cartonsCount,
        originalExtraPieces: it.extraPieces,
        originalTotalPieces: it.totalPieces,
        originalTotalPrice: it.totalPrice,
      })),
      hasDiscount,
      discountPercent: hasDiscount ? effectiveDiscountPercent : 0,
      subtotal,
      discount: activeDiscountAmount,
      tax,
      finalAmount,
      offsetReturnIds: selectedOffsetReturnIds.length > 0 ? selectedOffsetReturnIds : undefined,
      offsetReturnsTotal: totalOffsetReturnsAmount > 0 ? totalOffsetReturnsAmount : undefined,
      expenses: invoiceExpenses.length > 0 ? invoiceExpenses : undefined,
      expensesTotalDeduction: expensesTotalDeduction > 0 ? expensesTotalDeduction : undefined,
      expensesTotalAddition: expensesTotalAddition > 0 ? expensesTotalAddition : undefined,
      notes,
      createdAt: initialInvoice?.createdAt || Date.now(),
    };

    onSave(newInvoice, pendingNewProducts);
  };

  // Filter products in picker
  const filteredProducts = currentProductsList.filter(p => {
    if (hideZeroStock && p.stockPieces <= 0) return false;
    const matchesSearch = p.name.includes(searchQuery) || (p.notes && p.notes.includes(searchQuery));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 space-y-6">
      {/* Header bar */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <button
            id="editor-cancel-back-btn"
            onClick={onCancel}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="انصراف و بازگشت"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className={`w-5 h-5 ${theme.activeIcon}`} />
              {initialInvoice ? `ویرایش فاکتور #${toPersianDigits(invoiceNumber)}` : 'صدور فاکتور جدید'}
            </h2>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Secret Mode Toggle */}
          <button
            id="editor-secret-mode-toggle"
            type="button"
            onClick={onToggleSecretMode}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isSecretMode
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                : `${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`
            }`}
          >
            {isSecretMode ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>حالت محرمانه: <b className="font-bold">فعال (قیمت خرید مخفی)</b></span>
              </>
            ) : (
              <>
                <Eye className={`w-3.5 h-3.5 ${theme.activeIcon}`} />
                <span>حالت محرمانه: <b className="font-bold">آشکار</b></span>
              </>
            )}
          </button>

          {/* Invoice Type Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex items-center text-xs font-bold border border-slate-200 dark:border-slate-700">
            <button
              id="type-sale-btn"
              type="button"
              onClick={() => {
                setInvoiceType('sale');
                setSalesType('نقدی عادی');
              }}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                invoiceType === 'sale'
                  ? `${theme.primary} text-white font-black shadow-xs`
                  : 'text-slate-800 dark:text-slate-300 hover:text-black dark:hover:text-white'
              }`}
            >
              <span>🧾 مشتری (فروش)</span>
            </button>
            <button
              id="type-purchase-btn"
              type="button"
              onClick={() => {
                setInvoiceType('purchase');
                setSalesType('خرید کالا (ورود به انبار)');
                if (!customerName || customerName === 'مدیریت انبار') {
                  setCustomerName('مدیریت انبار');
                  setCustomerPhone('09120000000');
                  setCustomerCity('مرکزی');
                }
              }}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                invoiceType === 'purchase'
                  ? `${theme.primary} text-white font-black shadow-xs`
                  : 'text-slate-800 dark:text-slate-300 hover:text-black dark:hover:text-white'
              }`}
            >
              <span>📦 ورود کالا (خرید)</span>
            </button>
          </div>

          {/* Draft & Save Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="save-draft-invoice-btn"
              type="button"
              onClick={() => handleSaveInvoice(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
              title="ذخیره فاکتور به عنوان پیش‌نویس بدون کسر اقلام از موجودی انبار"
            >
              <FileText className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>پیش‌نویس</span>
            </button>

            <button
              id="save-final-invoice-btn"
              type="button"
              onClick={() => handleSaveInvoice(false)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${theme.primary} ${theme.primaryHover}`}
              title="ثبت نهایی فاکتور و اعمال هوشمند به موجودی انبار و نقدینگی"
            >
              <Save className="w-4 h-4" />
              <span>ثبت نهایی فاکتور</span>
            </button>
          </div>
        </div>
      </div>

      {initialInvoice?.isDraft && (
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center gap-3 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-xs">
          <FileText className="w-5 h-5 shrink-0 text-amber-500" />
          <div>
            <b>توجه:</b> این سند هم‌اکنون به عنوان <span className="underline font-black">پیش‌نویس</span> ذخیره شده است. هیچ تغییری در موجودی انبار یا نقدینگی اعمال نشده است. با کلیک روی «ثبت نهایی فاکتور»، تغییرات به انبار و نقدینگی منتقل خواهد شد.
          </div>
        </div>
      )}

      {/* 📦 EXECUTIVE INWARD PRODUCT INTELLIGENCE & PURCHASING POWER DASHBOARD (فقط در فاکتور ورود کالا / خرید) */}
      {invoiceType === 'purchase' && (
        <div className="space-y-4">
          {/* Section Header with Quick Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    مرکز تحلیل هوشمند قدرت خرید ورود کالا و تراز تامین‌کننده
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    کنترل نقدینگی و نسیه
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  محاسبه زنده سقف خرید امن بدون نسیه، تهاتر طلب و تفکیک بدهی تامین‌کننده
                </p>
              </div>
            </div>

            <button
              type="button"
              id="open-inward-product-modal-from-banner"
              onClick={() => setIsInwardModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl ${theme.primary} ${theme.primaryHover} active:scale-95 text-white text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer w-full sm:w-auto justify-center`}
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ ورود و شارژ کالا به انبار</span>
            </button>
          </div>

          {/* 4 Analytical KPI Metric Cards (Matching ReturnsManager Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: نقدینگی حاضر */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">نقدینگی در دسترس (صندوق و بانک)</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
                {formatPrice(totalLiquidity)} <span className="text-xs font-normal text-slate-500">تومان</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>صندوق: {formatPrice(cashBalance)}</span>
                <span>بانک: {formatPrice(bankBalance)}</span>
              </div>
            </div>

            {/* Card 2: بدهی / تراز تامین‌کننده */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-blue-200/70 dark:border-blue-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 truncate">
                  تراز تامین‌کننده {customerName ? `(${customerName})` : ''}
                </span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg font-black mt-3 dir-ltr text-right">
                {supplierDebtToUs > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatPrice(supplierDebtToUs)} <span className="text-xs font-normal">تومان (بدهکار به ما)</span>
                  </span>
                ) : ourDebtToSupplier > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    {formatPrice(ourDebtToSupplier)} <span className="text-xs font-normal">تومان (بستانکار)</span>
                  </span>
                ) : (
                  <span className="text-slate-600 dark:text-slate-400">
                    بی‌حساب و تسویه <span className="text-xs font-normal">(۰ تومان)</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>
                  {supplierDebtToUs > 0 
                    ? '✨ قابل تهاتر مستقیم با کالا' 
                    : ourDebtToSupplier > 0 
                      ? 'بدهی قبلی ما به شرکت' 
                      : 'حساب طرف‌حساب کاملاً صفر است'}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-[10px]">
                  {supplierDebtToUs > 0 ? 'طلبکاریم' : ourDebtToSupplier > 0 ? 'بدهکاریم' : 'صاف'}
                </span>
              </div>
            </div>

            {/* Card 3: حداکثر سقف خرید بدون نسیه */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-teal-200/70 dark:border-teal-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400">سقف خرید بدون نسیه (نقدی و تهاتر)</span>
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 border border-teal-200/80 dark:border-teal-800">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg font-black text-teal-600 dark:text-teal-300 mt-3 dir-ltr text-right">
                {formatPrice(maxNonCreditPurchasingPower)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>{supplierDebtToUs > 0 ? 'نقدینگی کل + تهاتر طلب تامین‌کننده' : 'حداکثر خرید ۱۰۰٪ نقدی بدون ایجاد بدهی'}</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-[10px]">سقف امن</span>
              </div>
            </div>

            {/* Card 4: ارزش فاکتور ورود جاری و مانده توان خرید */}
            <div className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border ${
              isPurchasingExceedingCash 
                ? 'border-amber-200/80 dark:border-amber-900/50' 
                : 'border-emerald-200/70 dark:border-emerald-900/40'
            } shadow-xs relative overflow-hidden group hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  فاکتور جاری ({toPersianDigits(items.length)} قلم)
                </span>
                <div className={`p-2 rounded-xl border ${
                  isPurchasingExceedingCash
                    ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800'
                }`}>
                  {isPurchasingExceedingCash ? <AlertTriangle className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                </div>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
                {formatPrice(finalAmount)}
              </div>
              <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {!isPurchasingExceedingCash ? (
                  <>
                    <span className="text-slate-500">مانده سقف نقدی:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      {formatPrice(remainingNonCreditPurchasingPower)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">⚠️ مازاد به نسیه:</span>
                    <span className="font-black text-amber-600 dark:text-amber-400">
                      {formatPrice(exceedingCreditAmount)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Smart Analytical Narrative Banner with Gauge */}
          <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
            isPurchasingExceedingCash
              ? 'bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
              : 'bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-2xl shrink-0 ${
                  isPurchasingExceedingCash
                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                }`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-xs sm:text-sm">
                    {finalAmount === 0
                      ? 'راهنمای توان خرید و مدیریت ریسک نقدینگی'
                      : !isPurchasingExceedingCash
                        ? 'تراکنش ۱۰۰٪ نقدی و امن (در محدوده سقف نقدینگی)'
                        : 'هشدار ورود به نسیه و بدهی دفتری'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
                    {finalAmount === 0 ? (
                      <>
                        شما در حال حاضر <strong>{formatPrice(totalLiquidity)}</strong> نقدینگی حاضر (صندوق: {formatPrice(cashBalance)} | بانک: {formatPrice(bankBalance)}) دارید.
                        {supplierDebtToUs > 0 ? (
                          <> تامین‌کننده <strong>{formatPrice(supplierDebtToUs)}</strong> به شما بدهکار است؛ از این رو تا سقف <strong>{formatPrice(maxNonCreditPurchasingPower)}</strong> می‌توانید بدون پرداخت پول نقد اضافه یا ایجاد نسیه، کالا به انبار اضافه فرمایید.</>
                        ) : (
                          <> حداکثر رقمی که می‌توانید بدون نسیه خرید کنید <strong>{formatPrice(maxNonCreditPurchasingPower)}</strong> است.</>
                        )}
                      </>
                    ) : !isPurchasingExceedingCash ? (
                      <>
                        ارزش فاکتور تا این لحظه <strong>{formatPrice(finalAmount)}</strong> است که کاملاً تحت پوشش نقدینگی حاضر{supplierDebtToUs > 0 ? ' و تهاتر با طلب تامین‌کننده' : ''} قرار دارد. شما هنوز <strong>{formatPrice(remainingNonCreditPurchasingPower)}</strong> ظرفیت خرید نقدی بدون ایجاد نسیه در اختیار دارید.
                      </>
                    ) : (
                      <>
                        فاکتور جاری به رقم <strong>{formatPrice(finalAmount)}</strong> رسیده است که به میزان <strong>{formatPrice(exceedingCreditAmount)}</strong> از نقدینگی در دسترس شما فراتر رفته است. در صورت ثبت نهایی، این مابه‌التفاوت به عنوان تعهد بدهی به حساب تامین‌کننده منظور خواهد شد.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-stretch md:self-auto shrink-0 bg-white/90 dark:bg-slate-900/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="space-y-1 text-right">
                  <div className="text-[10px] text-slate-500 font-bold">مصرف سقف خرید بدون نسیه:</div>
                  <div className={`text-base font-black ${isPurchasingExceedingCash ? 'text-amber-600' : 'text-emerald-600'}`}>
                    %{toPersianDigits(purchaseCapacityPercent)}
                  </div>
                </div>
                <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isPurchasingExceedingCash
                        ? 'bg-amber-500'
                        : purchaseCapacityPercent > 80
                          ? 'bg-teal-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${purchaseCapacityPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Meta & Customer Details Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Document Details Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4 text-xs transition-colors">
          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calculator className={`w-4 h-4 ${theme.activeIcon}`} />
              <span>مشخصات سند</span>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
              invoiceType === 'purchase'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : `${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`
            }`}>
              {invoiceType === 'purchase' ? '📦 فاکتور خرید (ورود به انبار)' : '🧾 فاکتور فروش (مشتری)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">شماره سند</label>
              <input
                id="input-invoice-number"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 ${theme.ring} font-bold text-slate-900 dark:text-white`}
                placeholder="1039"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">تاریخ ثبت</label>
              <input
                id="input-invoice-date"
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 ${theme.ring} text-slate-900 dark:text-white`}
                placeholder="1405/05/14"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">ساعت ثبت</label>
              <input
                id="input-invoice-time"
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 ${theme.ring} text-slate-900 dark:text-white`}
                placeholder="13:48"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">
                {invoiceType === 'purchase' ? 'نوع تسویه خرید' : 'روش فروش'}
              </label>
              <input
                id="input-sales-type"
                type="text"
                value={salesType}
                onChange={(e) => setSalesType(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 ${theme.ring} text-slate-900 dark:text-white`}
                placeholder={invoiceType === 'purchase' ? 'خرید نقدی' : 'نقدی عادی'}
              />
            </div>
          </div>
        </div>

        {/* Customer / Supplier Details Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3.5 text-xs transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Package className={`w-4 h-4 ${theme.activeIcon}`} />
              <span>{invoiceType === 'purchase' ? 'مشخصات تامین‌کننده / فروشنده کالا' : 'مشخصات خریدار / طرف‌حساب'}</span>
              {unsettledPartyReturns.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1 animate-pulse">
                  <RotateCcw className="w-3 h-3" />
                  <span>دارای {toPersianDigits(unsettledPartyReturns.length)} مرجوعی تسویه نشده</span>
                </span>
              )}
            </div>

            {/* Quick Customer Picker from registered database */}
            {customers && customers.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} ${theme.accentHoverBg} font-bold text-[11px] border ${theme.borderColor} transition-colors cursor-pointer`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{invoiceType === 'purchase' ? 'انتخاب از لیست' : 'انتخاب مشتری'} ({toPersianDigits(customers.length)})</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isCustomerDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-20 max-h-56 overflow-y-auto">
                    <div className="px-3 py-1.5 text-[10px] text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                      طرف‌حساب‌های ثبت‌شده:
                    </div>
                    {customers.map((c, cIdx) => (
                      <button
                        key={`inv-edit-cust-${c.id || cIdx}-${cIdx}`}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className={`w-full px-3 py-2 text-right ${theme.accentHoverBg} flex items-center justify-between text-xs transition-colors cursor-pointer`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.phone || c.city || 'بدون تلفن'}</div>
                        </div>
                        {customerName === c.name && (
                          <CheckCircle2 className={`w-3.5 h-3.5 ${theme.activeIcon}`} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                {invoiceType === 'purchase' ? 'نام تامین‌کننده / فروشنده' : 'نام خریدار'} <span className="text-red-500">*</span>
              </label>
              <input
                id="input-customer-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 ${theme.ring} font-bold text-slate-900 dark:text-white`}
                placeholder={invoiceType === 'purchase' ? 'نام شرکت تامین‌کننده یا پخش' : 'مثلاً: علی رضایی'}
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">شماره تماس</label>
              <input
                id="input-customer-phone"
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 ${theme.ring} text-slate-900 dark:text-white dir-ltr`}
                placeholder="09184052345"
              />
            </div>
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">شهر / آدرس</label>
              <input
                id="input-customer-city"
                type="text"
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 ${theme.ring} text-slate-900 dark:text-white`}
                placeholder="مثلاً: کرمانشاه"
              />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 text-xs">
                نحوه تسویه و پرداخت فاکتور <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  id="btn-payment-cash"
                  onClick={() => {
                    setPaymentStatus('cash');
                    setPaidAmount(finalAmount);
                    setPaymentMethod('نقدی (تسویه شده کامل)');
                  }}
                  className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentStatus === 'cash'
                      ? `${theme.primary} text-white shadow-md font-black`
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>💵 نقدی کامل</span>
                </button>

                <button
                  type="button"
                  id="btn-payment-partial"
                  onClick={() => {
                    setPaymentStatus('partial');
                    if (paidAmount <= 0 || paidAmount >= finalAmount) {
                      setPaidAmount(Math.round(finalAmount / 2));
                    }
                    setPaymentMethod('پرداخت بخشی (نقد + مانده نسیه)');
                  }}
                  className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentStatus === 'partial'
                      ? `${theme.primary} text-white shadow-md font-black`
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>⚖️ پرداخت بخشی (بیعانه)</span>
                </button>

                <button
                  type="button"
                  id="btn-payment-credit"
                  onClick={() => {
                    setPaymentStatus('credit');
                    setPaidAmount(0);
                    setPaymentMethod('غیر نقدی (نسیه کامل / دفتری)');
                  }}
                  className={`py-2.5 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentStatus === 'credit'
                      ? `${theme.primary} text-white shadow-md font-black`
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>📝 نسیه کامل</span>
                </button>
              </div>

              {/* Dynamic Info & Input for Partial Payment */}
              {paymentStatus === 'partial' && (
                <div className="mt-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="space-y-1 flex-1">
                      <label className="block text-amber-900 dark:text-amber-200 font-extrabold text-xs">
                        {invoiceType === 'purchase' ? 'مبلغ پرداختی نقد / واریزی به تامین‌کننده (تومان):' : 'مبلغ دریافتی نقد / واریزی خریدار (تومان):'}
                      </label>
                      <input
                        id="input-paid-amount"
                        type="number"
                        min={0}
                        max={finalAmount}
                        value={paidAmount || ''}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setPaidAmount(Math.min(finalAmount, val));
                        }}
                        placeholder="مبلغ پرداختی نقد..."
                        className="w-full px-3 py-2 text-sm font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center sm:self-end">
                      <button
                        type="button"
                        onClick={() => setPaidAmount(Math.round(finalAmount * 0.25))}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-bold text-[11px] cursor-pointer"
                      >
                        ۲۵٪ ({formatPrice(Math.round(finalAmount * 0.25))})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaidAmount(Math.round(finalAmount * 0.5))}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-bold text-[11px] cursor-pointer"
                      >
                        ۵۰٪ ({formatPrice(Math.round(finalAmount * 0.5))})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaidAmount(Math.round(finalAmount * 0.75))}
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-bold text-[11px] cursor-pointer"
                      >
                        ۷۵٪ ({formatPrice(Math.round(finalAmount * 0.75))})
                      </button>
                    </div>
                  </div>

                  {/* Summary Breakdown for Partial */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-amber-200/80 dark:border-amber-900">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/50">
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">پرداخت شده نقد:</span>
                      <span className="font-black text-emerald-800 dark:text-emerald-200">{formatPrice(paidAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/50">
                      <span className="text-rose-700 dark:text-rose-300 font-bold">مانده نسیه فاکتور:</span>
                      <span className="font-black text-rose-800 dark:text-rose-200">{formatPrice(Math.max(0, finalAmount - paidAmount))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Liquidity Source / Destination & Step-by-Step Accounting for Purchase Invoices */}
              {invoiceType === 'purchase' ? (
                <div className="mt-3 p-4 rounded-3xl bg-slate-50 dark:bg-slate-950/70 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  {/* Liquidity Overview Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">مدیریت تراز مالی و حساب تامین‌کننده</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">تراز خودکار و لحظه‌ای حساب دفتری، کسر از مطالبات و نقدینگی</p>
                      </div>
                    </div>

                    {/* Current Available Liquidity Badges */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-1.5">
                        <Coins className={`w-3.5 h-3.5 ${theme.activeIcon}`} />
                        <span className="text-slate-600 dark:text-slate-300">موجودی صندوق:</span>
                        <span className={`font-black ${theme.primaryText}`}>{formatPrice(cashBalance)}</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-1.5">
                        <CreditCard className={`w-3.5 h-3.5 ${theme.activeIcon}`} />
                        <span className="text-slate-600 dark:text-slate-300">موجودی بانک:</span>
                        <span className={`font-black ${theme.primaryText}`}>{formatPrice(bankBalance)}</span>
                      </div>
                    </div>
                  </div>

                  {/* One-Touch Fast Liquidity & Settlement Options */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-black text-slate-800 dark:text-slate-200">روش تسویه و پرداخت این فاکتور ورود:</span>
                      {supplierCurrentBalance > 0 && (
                        <span className={`text-[11px] font-black ${theme.primaryText} ${theme.badgeBg} px-2.5 py-1 rounded-lg border ${theme.borderColor}`}>
                          مطالبات پیشین از تامین‌کننده: {formatPrice(supplierCurrentBalance)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {/* 1. Automated Account Offset / Credit */}
                      <button
                        type="button"
                        id="purchase-pay-full-credit-btn"
                        onClick={() => {
                          setPaymentStatus('credit');
                          setPaidAmount(0);
                        }}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                          paymentStatus === 'credit'
                            ? `${theme.primary} text-white ${theme.borderColor} shadow-sm font-black`
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <TrendingDown className={`w-4 h-4 ${paymentStatus === 'credit' ? 'text-white' : theme.activeIcon}`} />
                        <span className="font-black">تسویه دفتری و اعتباری</span>
                        <span className={`text-[10px] ${paymentStatus === 'credit' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>کسر خودکار از مطالبات / ثبت بدهی</span>
                      </button>

                      {/* 2. Hybrid Payment / Partial */}
                      <button
                        type="button"
                        id="purchase-smart-hybrid-settle-btn"
                        onClick={() => {
                          setPaymentStatus('partial');
                          if (paidAmount <= 0 || paidAmount >= finalAmount) {
                            const availBal = paymentAccount === 'cash' ? cashBalance : bankBalance;
                            setPaidAmount(Math.min(Math.round(finalAmount / 2), Math.max(0, availBal)));
                          }
                        }}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                          paymentStatus === 'partial'
                            ? `${theme.primary} text-white ${theme.borderColor} shadow-sm font-black`
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Sparkles className={`w-4 h-4 ${paymentStatus === 'partial' ? 'text-white' : theme.activeIcon}`} />
                        <span className="font-black">پرداخت ترکیبی (نقد + دفتری)</span>
                        <span className={`text-[10px] ${paymentStatus === 'partial' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>پرداخت بخشی نقد + کسر مابقی</span>
                      </button>

                      {/* 3. Full Cash Box */}
                      <button
                        type="button"
                        id="purchase-pay-full-cash-btn"
                        onClick={() => {
                          setPaymentAccount('cash');
                          setPaymentStatus('cash');
                          setPaidAmount(finalAmount);
                        }}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                          paymentAccount === 'cash' && paymentStatus === 'cash'
                            ? `${theme.primary} text-white ${theme.borderColor} shadow-sm font-black`
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <Coins className={`w-4 h-4 ${paymentAccount === 'cash' && paymentStatus === 'cash' ? 'text-white' : theme.activeIcon}`} />
                        <span className="font-black">پرداخت نقدی از صندوق</span>
                        <span className={`text-[10px] ${paymentAccount === 'cash' && paymentStatus === 'cash' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>موجودی: {formatPrice(cashBalance)}</span>
                      </button>

                      {/* 4. Full Bank Account */}
                      <button
                        type="button"
                        id="purchase-pay-full-bank-btn"
                        onClick={() => {
                          setPaymentAccount('bank');
                          setPaymentStatus('cash');
                          setPaidAmount(finalAmount);
                        }}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                          paymentAccount === 'bank' && paymentStatus === 'cash'
                            ? `${theme.primary} text-white ${theme.borderColor} shadow-sm font-black`
                            : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <CreditCard className={`w-4 h-4 ${paymentAccount === 'bank' && paymentStatus === 'cash' ? 'text-white' : theme.activeIcon}`} />
                        <span className="font-black">واریز کامل از بانک</span>
                        <span className={`text-[10px] ${paymentAccount === 'bank' && paymentStatus === 'cash' ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>موجودی: {formatPrice(bankBalance)}</span>
                      </button>
                    </div>
                  </div>

                  {/* Account Selector and Paid Amount Input if paying non-zero */}
                  {paymentStatus !== 'credit' && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-700 dark:text-slate-300 font-bold">حساب مبدا کسر نقدینگی:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentAccount('cash')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              paymentAccount === 'cash'
                                ? `${theme.primary} text-white ${theme.borderColor} shadow-xs font-black`
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>صندوق نقدی ({formatPrice(cashBalance)})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentAccount('bank')}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                              paymentAccount === 'bank'
                                ? `${theme.primary} text-white ${theme.borderColor} shadow-xs font-black`
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>حساب بانکی ({formatPrice(bankBalance)})</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            مبلغ پرداخت نقدی / بانکی به تامین‌کننده:
                          </label>
                          <SmartPriceInput
                            value={paidAmount}
                            onChange={(val) => {
                              const valid = Math.max(0, Math.min(finalAmount, val));
                              setPaidAmount(valid);
                              if (valid === 0) setPaymentStatus('credit');
                              else if (valid >= finalAmount) setPaymentStatus('cash');
                              else setPaymentStatus('partial');
                            }}
                            placeholder="مبلغ پرداختی"
                            className={`w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-left font-black ${theme.primaryText} focus:ring-2 ${theme.ring} focus:outline-none`}
                          />
                        </div>
                        <div className="flex flex-col justify-end">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">تسهیم خودکار باقیمانده:</span>
                          <span className="font-black text-xs text-slate-800 dark:text-slate-200 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            مبلغ تسویه دفتری / ثبت در حساب تامین‌کننده: <span className={theme.primaryText}>{formatPrice(Math.max(0, finalAmount - paidAmount))}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step-by-Step Formal Accounting Calculation Grid */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs shadow-xs">
                    <span className={`block font-black ${theme.primaryText}`}>تراز و محاسبات جامع این فاکتور ورود:</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
                        <span className="text-slate-600 dark:text-slate-400">۱. ارزش کل بار ورودی:</span>
                        <span className="font-black text-slate-900 dark:text-white text-sm">{formatPrice(finalAmount)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
                        <span className="text-slate-600 dark:text-slate-400">
                          ۲. کسر از نقدینگی ({paymentAccount === 'cash' ? 'صندوق' : 'بانک'}):
                        </span>
                        <span className={`font-black ${theme.primaryText} text-sm`}>{formatPrice(effectivePaid)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
                        <span className="text-slate-600 dark:text-slate-400">
                          ۳. مانده موجودی {paymentAccount === 'cash' ? 'صندوق' : 'بانک'} پس از خرید:
                        </span>
                        <span className={`font-black text-sm ${afterPaymentBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {formatPrice(afterPaymentBalance)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
                        <span className="text-slate-600 dark:text-slate-400">۴. مبلغ تسویه دفتری / ثبت در حساب تامین‌کننده:</span>
                        <span className={`font-black ${theme.primaryText} text-sm`}>{formatPrice(supplierDebtAmount)}</span>
                      </div>
                    </div>

                    {/* Insufficient Balance Alert if negative */}
                    {afterPaymentBalance < 0 && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>
                          هشدار: پرداختی نقدی ({formatPrice(effectivePaid)}) از موجودی فعلی {paymentAccount === 'cash' ? 'صندوق نقدی' : 'حساب بانکی'} ({formatPrice(currentSelectedAccountBalance)}) بیشتر است و حساب به میزان {formatPrice(Math.abs(afterPaymentBalance))} منفی خواهد شد!
                        </span>
                      </div>
                    )}

                    {/* Supplier Account Status */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-800">
                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-bold">
                          <Building2 className={`w-4 h-4 ${theme.activeIcon}`} />
                          <span>حساب دفتری تامین‌کننده ({customerName || 'تامین‌کننده مشخص نشده'}):</span>
                        </span>
                        <span className="font-black text-slate-800 dark:text-slate-200">
                          {matchedCustomerOrSupplier ? (
                            supplierCurrentBalance === 0 ? 'بی‌حساب (۰)' :
                            supplierCurrentBalance < 0 ? `${formatPrice(Math.abs(supplierCurrentBalance))} (بستانکار / تعهد پرداخت ما)` :
                            `${formatPrice(supplierCurrentBalance)} (بدهکار به ما)`
                          ) : (
                            previousBalance || 'بی‌حساب (۰)'
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 text-xs py-1 border-b border-slate-200/80 dark:border-slate-800">
                        <span>ارزش کسر و تسویه شده از حساب تامین‌کننده در این فاکتور:</span>
                        <span className={`font-black ${theme.primaryText} font-mono`}>
                          - {formatPrice(supplierDebtAmount)}
                        </span>
                      </div>

                      <div className="pt-1 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-800 dark:text-slate-200 font-black">تراز نهایی تامین‌کننده پس از ثبت این فاکتور:</span>
                          <span className={`font-black text-xs px-2.5 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} border ${theme.borderColor}`}>
                            {supplierNewBalance === 0 ? 'تسویه کامل حساب و بی‌حساب' :
                             supplierNewBalance < 0 ? `${formatPrice(Math.abs(supplierNewBalance))} مانده بستانکاری تامین‌کننده (تعهد پرداخت ما)` :
                             `${formatPrice(supplierNewBalance)} مانده بدهی تامین‌کننده (بدهکار به ما)`}
                          </span>
                        </div>

                        {/* Literary formal accounting report */}
                        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                          {supplierCurrentBalance > 0 ? (
                            supplierNewBalance > 0 ? (
                              <div>
                                <b>گزارش تراز دفتری:</b> بهای کالاهای ورودی این فاکتور به مبلغ <b>{formatPrice(supplierDebtAmount)}</b> از مانده بدهی پیشین تامین‌کننده ({formatPrice(supplierCurrentBalance)}) کسر و تسویه گردید. مانده مطالبات باقیمانده تامین‌کننده به مبلغ <b>{formatPrice(supplierNewBalance)}</b> کماکان بر عهده وی (بدهکار به ما) باقی می‌ماند.
                              </div>
                            ) : supplierNewBalance === 0 ? (
                              <div>
                                <b>گزارش تراز دفتری:</b> بهای کالاهای ورودی این فاکتور ({formatPrice(supplierDebtAmount)}) دقیقاً معادل مانده بدهی پیشین تامین‌کننده بوده و موجب تسویه کامل حساب و بی‌حساب شدن طرف‌حساب گردید.
                              </div>
                            ) : (
                              <div>
                                <b>گزارش تراز دفتری:</b> بهای کالاهای ورودی این فاکتور ({formatPrice(supplierDebtAmount)}) از مانده بدهی پیشین تامین‌کننده ({formatPrice(supplierCurrentBalance)}) فراتر رفته است. بدهی پیشین وی به صورت کامل تسویه گردیده و مازاد ارزش کالا به مبلغ <b>{formatPrice(Math.abs(supplierNewBalance))}</b> به عنوان مانده بستانکاری تامین‌کننده (تعهد پرداخت خریدار) در حساب وی منظور گردید.
                              </div>
                            )
                          ) : supplierCurrentBalance === 0 ? (
                            supplierNewBalance < 0 ? (
                              <div>
                                <b>گزارش تراز دفتری:</b> طرف‌حساب پیش از این فاکتور بی‌حساب بوده است. با ثبت این سند غیرنقدی، مبلغ <b>{formatPrice(Math.abs(supplierNewBalance))}</b> به عنوان مانده بستانکاری تامین‌کننده (تعهد پرداخت خریدار) در حساب دفتری وی ثبت می‌گردد.
                              </div>
                            ) : (
                              <div>
                                <b>گزارش تراز دفتری:</b> این فاکتور به صورت نقدی تسویه شده و تاثیری بر مانده حساب دفتری تامین‌کننده ندارد.
                              </div>
                            )
                          ) : (
                            <div>
                              <b>گزارش تراز دفتری:</b> طرف‌حساب پیش از این فاکتور به مبلغ {formatPrice(Math.abs(supplierCurrentBalance))} بستانکار بوده است. با افزوده شدن این فاکتور غیرنقدی، مانده بستانکاری وی (تعهد پرداخت ما) به مبلغ <b>{formatPrice(Math.abs(supplierNewBalance))}</b> افزایش یافت.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                paymentStatus !== 'credit' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        حساب واریز مبلغ دریافتی (نقدینگی):
                      </span>
                      <span className={`text-[11px] font-bold ${theme.primaryText}`}>
                        افزایش موجودی {paymentAccount === 'bank' ? 'بانک' : 'صندوق'}
                        {' '}({formatPrice(paymentStatus === 'partial' ? paidAmount : finalAmount)})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentAccount('bank')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          paymentAccount === 'bank'
                            ? `${theme.primary} text-white shadow-xs font-black`
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>💳 حساب بانکی</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentAccount('cash')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          paymentAccount === 'cash'
                            ? `${theme.primary} text-white shadow-xs font-black`
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                        <span>💵 صندوق نقدی</span>
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-xs">شیوه و جزئیات پرداخت</label>
                <input
                  id="input-payment-details"
                  type="text"
                  value={paymentMethodDetails}
                  onChange={(e) => setPaymentMethodDetails(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 ${theme.ring} text-slate-900 dark:text-white text-xs`}
                  placeholder="مثال: دستگاه کارتخوان فروشگاه / کارت به کارت / نقد"
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1 text-xs">
                  {invoiceType === 'purchase' ? 'مانده حساب گذشته تامین‌کننده' : 'مانده حساب گذشته خریدار'}
                </label>
                <input
                  id="input-previous-balance"
                  type="text"
                  value={previousBalance}
                  onChange={(e) => setPreviousBalance(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 ${theme.ring} text-slate-900 dark:text-white text-xs`}
                  placeholder="بی‌حساب (۰)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligent Inward Sell-Through & Realized Profit Summary for Purchase Invoices (درصدی، تومانی، کارتنی، عددی) */}
      {invoiceType === 'purchase' && !isSecretMode && inwardSellThroughSummary && (
        <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-emerald-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-emerald-950/40 border border-purple-200/80 dark:border-purple-800/80 rounded-3xl shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                    وضعیت جامع فروش این فاکتور ورود کالا:
                  </span>
                  {inwardSellThroughSummary.isFullySold ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center gap-1 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>کاملاً فروخته شده (۱۰۰٪)</span>
                    </span>
                  ) : inwardSellThroughSummary.percentSold > 0 ? (
                    <span className="px-2.5 py-1 rounded-xl bg-sky-100 dark:bg-sky-900/80 text-sky-900 dark:text-sky-200 font-black text-xs border border-sky-300 dark:border-sky-700">
                      {toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروخته شده • {toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ باقیمانده در انبار
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs border border-slate-200 dark:border-slate-700">
                      ۰٪ فروش (موجودی کامل دست‌نخورده در انبار)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  فروش‌رفته: {toPersianDigits(inwardSellThroughSummary.totalSoldPieces)} از {toPersianDigits(inwardSellThroughSummary.totalPurchasedPieces)} عدد کل اقلام فاکتور
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                  سود قطعی حاصل از فروش:
                </div>
                <div className={`text-sm sm:text-base font-black ${inwardSellThroughSummary.totalRealizedProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'} font-mono`}>
                  {inwardSellThroughSummary.totalRealizedProfit > 0 ? `+${formatPrice(inwardSellThroughSummary.totalRealizedProfit)}` : '۰ تومان'}
                </div>
              </div>
              {inwardSellThroughSummary.totalPotentialProfit > inwardSellThroughSummary.totalRealizedProfit && (
                <div className="border-r border-slate-200 dark:border-slate-700 pr-3 text-right">
                  <div className="text-[10px] text-slate-400 font-medium">
                    کل سود پیش‌بینی:
                  </div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">
                    {formatPrice(inwardSellThroughSummary.totalPotentialProfit)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4 Pillars Breakdown in Editor */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs text-right pt-2 border-t border-purple-200/50 dark:border-purple-800/40">
            <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-purple-100 dark:border-purple-900/50">
              <span className="text-[10px] text-slate-500 font-bold block">درصدی:</span>
              <span className="font-mono font-black text-sky-700 dark:text-sky-300">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش</span>
              <span className="text-slate-400 mx-1">·</span>
              <span className="font-mono text-amber-700 dark:text-amber-300">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ مانده</span>
            </div>
            <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-purple-100 dark:border-purple-900/50">
              <span className="text-[10px] text-slate-500 font-bold block">کارتنی:</span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                فروش: {toPersianDigits(inwardSellThroughSummary.totalSoldCartons)} کارتن · مانده: {toPersianDigits(inwardSellThroughSummary.totalRemainingCartons)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-purple-100 dark:border-purple-900/50">
              <span className="text-[10px] text-slate-500 font-bold block">عددی:</span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                فروش: {toPersianDigits(inwardSellThroughSummary.totalSoldPieces)} از {toPersianDigits(inwardSellThroughSummary.totalPurchasedPieces)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-purple-100 dark:border-purple-900/50">
              <span className="text-[10px] text-slate-500 font-bold block">ارزش تومانی:</span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                فروش: {formatPrice(inwardSellThroughSummary.totalSoldCost)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Items Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Table top toolbar */}
        <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <Boxes className={`w-5 h-5 ${theme.activeIcon}`} />
              اقلام فاکتور
              <span className={`px-2.5 py-0.5 ${theme.badgeBg} ${theme.badgeText} rounded-full text-xs font-black`}>
                {toPersianDigits(items.length)} قلم
              </span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              (مجموع: {toPersianDigits(totalPiecesSum.toLocaleString())} عدد{totalCartons > 0 ? ` معادل ${toPersianDigits(totalCartons)} کارتن` : ''}{totalExtraPiecesSum > 0 && totalCartons > 0 ? ` و ${toPersianDigits(totalExtraPiecesSum)} دانه` : ''})
            </span>
          </div>

          <button
            id="add-item-picker-btn"
            type="button"
            onClick={() => {
              if (invoiceType === 'purchase') {
                setIsInwardModalOpen(true);
              } else {
                setIsProductPickerOpen(true);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${theme.primary} ${theme.primaryHover}`}
          >
            <Plus className="w-4 h-4" />
            {invoiceType === 'purchase' ? 'ورود کالا به انبار و فاکتور خرید' : 'افزودن کالا به فاکتور'}
          </button>
        </div>

        {/* Real-time Dynamic Supplier Offset & Balance Banner for Purchase Invoices */}
        {invoiceType === 'purchase' && (
          <div className="px-4 pt-4 sm:px-5 sm:pt-5">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${theme.badgeBg} ${theme.badgeText} border ${theme.borderColor}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <span>تراز و تسویه خودکار حساب تامین‌کننده</span>
                      {customerName && (
                        <span className={`${theme.primaryText} font-black`}>
                          («{customerName}»)
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      محاسبه هوشمند و لحظه‌ای کسر از مطالبات پیشین و تعیین تراز مالی نهایی همگام با تغییر اقلام
                    </span>
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2 text-xs">
                  <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold">
                    <span className="text-slate-500 dark:text-slate-400">مانده بدهی پیشین: </span>
                    <span className="text-slate-900 dark:text-white font-black font-mono">
                      {supplierCurrentBalance > 0 
                        ? `${formatPrice(supplierCurrentBalance)} (بدهکار به ما)` 
                        : supplierCurrentBalance < 0 
                          ? `${formatPrice(Math.abs(supplierCurrentBalance))} (بستانکار)` 
                          : 'بی‌حساب (۰)'}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900 font-bold">
                    <span className="text-slate-500 dark:text-slate-400">مبلغ تسویه دفتری: </span>
                    <span className={`${theme.primaryText} font-black font-mono`}>
                      - {formatPrice(supplierDebtAmount)}
                    </span>
                  </div>

                  <div className={`px-3.5 py-1.5 rounded-xl font-black border text-xs shadow-xs ${theme.primary} text-white ${theme.borderColor}`}>
                    {supplierNewBalance === 0 ? 'تراز نهایی: تسویه کامل و بی‌حساب' :
                     supplierNewBalance < 0 ? `تراز نهایی: ${formatPrice(Math.abs(supplierNewBalance))} بستانکاری تامین‌کننده` :
                     `تراز نهایی: ${formatPrice(supplierNewBalance)} مانده بدهی تامین‌کننده`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        {items.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center">
              <Boxes className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">
              {invoiceType === 'purchase' ? 'هنوز کالایی به فاکتور ورود اضافه نشده است' : 'هنوز کالایی به فاکتور اضافه نشده است'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {invoiceType === 'purchase'
                ? 'برای ورود کالای جدید به انبار یا افزایش بار ورودی از کالاهای موجود (با قابلیت کنترل و تطبیق قیمت خرید)، دکمه زیر را کلیک کنید:'
                : 'برای افزودن اقلام، دکمه «افزودن کالا به فاکتور» را بزنید و تعداد کارتن و دانه را مشخص کنید.'}
            </p>
            <button
              id="empty-state-add-item-btn"
              type="button"
              onClick={() => {
                if (invoiceType === 'purchase') {
                  setIsInwardModalOpen(true);
                } else {
                  setIsProductPickerOpen(true);
                }
              }}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                invoiceType === 'purchase'
                  ? `${theme.primary} ${theme.primaryHover} text-white shadow-md`
                  : `${theme.badgeBg} ${theme.badgeText} ${theme.accentHoverBg} border ${theme.borderColor}`
              }`}
            >
              <Plus className="w-4 h-4" />
              {invoiceType === 'purchase' ? 'افزودن کالا به انبار و فاکتور خرید' : 'انتخاب کالا از لیست انبار'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3 text-center w-12">ردیف</th>
                  <th className="py-3 px-4 min-w-[200px]">شرح کالا و مشخصات بسته‌بندی</th>
                  <th className="py-3 px-3 text-center min-w-[130px]">تعداد / مقدار</th>
                  
                  {!isSecretMode ? (
                    <>
                      {/* 1. ستون قیمت خرید (اول) */}
                      <th className="py-3 px-3 text-center min-w-[145px] bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-x border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-center gap-1">
                          <span>قیمت خرید (تومان)</span>
                        </div>
                      </th>

                      {/* 2. ستون قیمت فروش (دوم) */}
                      <th className="py-3 px-3 text-center min-w-[190px] bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 border-r border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>قیمت فروش (تومان)</span>
                          <PricePeekButton 
                            isSecretMode={isSecretMode} 
                            onToggle={onToggleSecretMode} 
                            title="حالت امنیتی و مخفی‌سازی قیمت خرید"
                          />
                        </div>
                      </th>

                      {/* 3. ستون سود ردیف */}
                      <th className="py-3 px-3 text-center min-w-[160px] bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border-r border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-center gap-1">
                          <span>سود ناخالص ردیف</span>
                        </div>
                      </th>
                    </>
                  ) : (
                    <th className="py-3 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{invoiceType === 'purchase' ? 'قیمت خرید (تومان)' : 'قیمت فروش (تومان)'}</span>
                        <PricePeekButton 
                          isSecretMode={isSecretMode} 
                          onToggle={onToggleSecretMode} 
                          title="نمایش قیمت خرید، فروش و سود ردیف‌ها"
                        />
                      </div>
                    </th>
                  )}

                  <th className="py-3 px-4 text-center min-w-[130px]">مبلغ کل (تومان)</th>
                  <th className="py-3 px-3 text-center w-24">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, index) => {
                  const associatedProduct = products.find(p => p.id === item.productId || (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase()));
                  const productStock = associatedProduct?.stockPieces || 0;
                  const isLowStock = invoiceType === 'sale' && item.totalPieces > productStock;
                  const livePackagingSpec = associatedProduct ? formatProductPackagingSpec(associatedProduct) : formatProductPackagingSpec(item);
                  const isUnknown = !livePackagingSpec || livePackagingSpec === 'نامشخص';
                  const hasCustomNote = !!(
                    item.customDescription &&
                    item.customDescription.trim() !== '' &&
                    item.customDescription.trim() !== livePackagingSpec &&
                    item.customDescription.trim() !== 'نامشخص' &&
                    !item.customDescription.includes('کارتن')
                  );
                  const ppc = associatedProduct?.piecesPerCarton || item.piecesPerCarton || ((item.packsCount || 20) * (item.piecesPerPack || 24)) || 1;

                  const unitPur = item.unitPurchasePrice || 0;
                  const unitSell = item.unitSellingPrice || 0;
                  const unitDiff = unitSell - unitPur;
                  const rowProfit = unitDiff * item.totalPieces;
                  const marginPct = unitPur > 0 ? (unitDiff / unitPur) * 100 : 0;
                  const isLoss = rowProfit < 0;

                  const rowSellThrough = inwardSellThroughSummary?.itemsSellThrough.find(s =>
                    s.itemId === item.id ||
                    (s.productId && item.productId && s.productId === item.productId) ||
                    (s.productName && item.productName && s.productName.trim().toLowerCase() === item.productName.trim().toLowerCase())
                  ) || (associatedProduct ? {
                    itemId: item.id,
                    productId: associatedProduct.id,
                    productName: associatedProduct.name,
                    purchasedPieces: item.totalPieces,
                    soldPieces: associatedProduct.stockPieces <= 0 ? item.totalPieces : Math.max(0, item.totalPieces - associatedProduct.stockPieces),
                    remainingPieces: Math.max(0, associatedProduct.stockPieces),
                    percentSold: associatedProduct.stockPieces <= 0 ? 100 : (item.totalPieces > 0 ? Math.min(100, Math.max(0, Math.round(((item.totalPieces - Math.max(0, associatedProduct.stockPieces)) / item.totalPieces) * 100))) : 0),
                    percentRemaining: associatedProduct.stockPieces <= 0 ? 0 : (item.totalPieces > 0 ? Math.max(0, Math.min(100, Math.round((Math.max(0, associatedProduct.stockPieces) / item.totalPieces) * 100))) : 100),
                    isFullySold: associatedProduct.stockPieces <= 0,
                    realizedProfit: 0,
                    potentialProfit: 0
                  } : null);

                  return (
                    <tr key={`edit-inv-item-${item.id || index}-${index}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Row Index (ردیف) */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-500 dark:text-slate-400">
                        {toPersianDigits(index + 1)}
                      </td>

                      {/* Product Name & Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.productName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                            !isUnknown
                              ? `${theme.badgeBg} ${theme.primaryText} ${theme.borderColor}`
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            <span>{livePackagingSpec || 'نامشخص'}</span>
                          </span>
                          {hasCustomNote && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {item.customDescription}
                            </span>
                          )}
                          {isLowStock && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-1.5 py-0.5 rounded font-bold border border-red-200 dark:border-red-900 text-[10px]">
                                کسری موجودی! موجودی انبار: {toPersianDigits(productStock)}
                              </span>
                              {associatedProduct && (
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenRestock(associatedProduct, e)}
                                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-black text-[10px] shadow-xs flex items-center gap-1 cursor-pointer transition-transform hover:scale-105"
                                  title="شارژ فوری موجودی این کالا در انبار"
                                >
                                  <Zap className="w-3 h-3" />
                                  <span>شارژ انبار</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Inward Sell-Through & Realized Profit Status */}
                          {invoiceType === 'purchase' && !isSecretMode && rowSellThrough && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              {rowSellThrough.isFullySold ? (
                                <>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-black text-[10px] border border-emerald-300 dark:border-emerald-800">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>کاملاً فروخته شده (۱۰۰٪)</span>
                                  </span>
                                  {rowSellThrough.realizedProfit > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800 font-mono">
                                      <span>سود فروش:</span>
                                      <span className="font-black">+{formatPrice(rowSellThrough.realizedProfit)}</span>
                                    </span>
                                  )}
                                </>
                              ) : rowSellThrough.percentSold > 0 ? (
                                <>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-bold text-[10px] border border-sky-200 dark:border-sky-800">
                                    <span>{toPersianDigits(rowSellThrough.percentSold)}٪ فروخته شده ({toPersianDigits(rowSellThrough.soldPieces)} عدد{rowSellThrough.piecesPerCarton > 1 ? ` · ${toPersianDigits(rowSellThrough.soldCartons)} کارتن` : ''})</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-amber-700 dark:text-amber-300">{toPersianDigits(rowSellThrough.percentRemaining)}٪ مانده ({toPersianDigits(rowSellThrough.remainingPieces)} عدد{rowSellThrough.piecesPerCarton > 1 ? ` · ${toPersianDigits(rowSellThrough.remainingCartons)} کارتن` : ''})</span>
                                  </span>
                                  {rowSellThrough.realizedProfit > 0 && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800 font-mono">
                                      <span>سود فروش:</span>
                                      <span className="font-black">+{formatPrice(rowSellThrough.realizedProfit)}</span>
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-[10px] border border-slate-200 dark:border-slate-700">
                                  <span>موجودی کامل در انبار ({toPersianDigits(rowSellThrough.remainingPieces)} عدد{rowSellThrough.piecesPerCarton > 1 ? ` · ${toPersianDigits(rowSellThrough.remainingCartons)} کارتن` : ''} · ۰٪ فروش)</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Quantity (تعداد / مقدار) */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(item.id, { totalPieces: Math.max(0, item.totalPieces - 1) })}
                              title="کاهش ۱ عدد"
                              className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={item.totalPieces}
                              onChange={(e) => handleUpdateItem(item.id, { totalPieces: Math.max(0, parseInt(e.target.value) || 0) })}
                              className={`w-20 px-2 py-1 text-center font-extrabold ${theme.primaryText} bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 focus:ring-2 ${theme.ring} focus:outline-none text-xs`}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateItem(item.id, { totalPieces: item.totalPieces + 1 })}
                              title="افزایش ۱ عدد"
                              className={`p-1 rounded bg-slate-100 dark:bg-slate-800 ${theme.accentHoverBg} hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className={`inline-flex items-center justify-center px-2 py-0.5 ${theme.badgeBg} ${theme.badgeText} border ${theme.borderColor} rounded-md font-bold text-[10px] leading-tight whitespace-nowrap`}>
                            {formatCartonText(item.totalPieces, item.piecesPerCarton || ((item.packsCount || 20) * (item.piecesPerPack || 24)))}
                          </span>
                        </div>
                      </td>

                      {/* --- Pricing Columns --- */}
                      {!isSecretMode ? (
                        <>
                          {/* 1. ستون قیمت خرید (اول) */}
                          <td className="py-3.5 px-3 bg-amber-50/30 dark:bg-amber-950/10 border-x border-slate-200/60 dark:border-slate-800/60">
                            <div className="space-y-1 text-center">
                              {invoiceType === 'purchase' ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = item.unitPurchasePrice || 0;
                                      handleUpdateItem(item.id, { unitPurchasePrice: Math.max(0, cur - 1000) });
                                    }}
                                    title="کاهش ۱۰۰۰ تومان خرید"
                                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 text-slate-600 dark:text-slate-400 cursor-pointer"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    step="500"
                                    value={item.unitPurchasePrice || 0}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      handleUpdateItem(item.id, { unitPurchasePrice: val });
                                    }}
                                    className="w-24 px-1.5 py-1 text-center font-black text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900 rounded-lg border border-amber-300 dark:border-amber-700/60 focus:ring-2 focus:ring-amber-500 text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = item.unitPurchasePrice || 0;
                                      handleUpdateItem(item.id, { unitPurchasePrice: cur + 1000 });
                                    }}
                                    title="افزایش ۱۰۰۰ تومان خرید"
                                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-600 dark:text-slate-400 cursor-pointer"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = item.unitPurchasePrice || 0;
                                      handleUpdateItem(item.id, { unitPurchasePrice: Math.max(0, cur - 500) });
                                    }}
                                    title="کاهش ۵۰۰ تومان قیمت خرید این قلم"
                                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 cursor-pointer"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                  </button>
                                  <span className="font-extrabold text-amber-900 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/70 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800 text-xs font-mono">
                                    {formatPrice(item.unitPurchasePrice)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = item.unitPurchasePrice || 0;
                                      handleUpdateItem(item.id, { unitPurchasePrice: cur + 500 });
                                    }}
                                    title="افزایش ۵۰۰ تومان قیمت خرید این قلم"
                                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 cursor-pointer"
                                  >
                                    <ChevronUp className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              {ppc > 1 && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block text-center font-mono">
                                  کارتن: {formatPrice(unitPur * ppc)}
                                </span>
                              )}
                              {hasDiscount && effectiveDiscountPercent > 0 && (
                                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block text-center font-mono bg-amber-100/70 dark:bg-amber-950/70 px-1.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-800 mt-1">
                                  با {toPersianDigits(effectiveDiscountPercent)}٪ تخفیف: {formatPrice(Math.round(unitPur * (1 - effectiveDiscountPercent / 100)))}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 2. ستون قیمت فروش (دوم) */}
                          <td className="py-3.5 px-3 bg-blue-50/30 dark:bg-blue-950/10 border-r border-slate-200/60 dark:border-slate-800/60">
                            <div className="space-y-1.5 text-center">
                              {/* Price input + Stepper Buttons */}
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => stepPrice(item.id, -1000)}
                                  title="کاهش ۱۰۰۰ تومان"
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 dark:hover:text-red-400 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="number"
                                  step="500"
                                  value={item.unitSellingPrice || 0}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    handleUpdateItem(item.id, { unitSellingPrice: val });
                                  }}
                                  className={`w-28 px-2 py-1.5 text-center font-extrabold text-blue-900 dark:text-blue-100 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-800 focus:ring-2 ${theme.ring} focus:outline-none text-xs`}
                                />
                                <button
                                  type="button"
                                  onClick={() => stepPrice(item.id, 1000)}
                                  title="افزایش ۱۰۰۰ تومان"
                                  className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 ${theme.accentHoverBg} hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer`}
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Action Buttons: Markup & Copy */}
                              <div className="flex items-center justify-center gap-1 flex-wrap text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => copyPurchaseToSellingPrice(item.id)}
                                  title="انتقال قیمت خرید به فروش"
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                                >
                                  کپی خرید
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyMarkupPercent(item.id, 10)}
                                  className={`px-1.5 py-0.5 rounded ${theme.badgeBg} ${theme.primaryText} font-bold cursor-pointer`}
                                >
                                  +۱۰٪
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyMarkupPercent(item.id, 15)}
                                  className={`px-1.5 py-0.5 rounded ${theme.badgeBg} ${theme.primaryText} font-bold cursor-pointer`}
                                >
                                  +۱۵٪
                                </button>
                              </div>

                              {ppc > 1 && (
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 block text-center font-mono font-medium">
                                  کارتن: {formatPrice(unitSell * ppc)}
                                </span>
                              )}
                              {hasDiscount && effectiveDiscountPercent > 0 && (
                                <span className="text-[10px] text-sky-700 dark:text-sky-300 font-bold block text-center font-mono bg-sky-100/70 dark:bg-sky-950/70 px-1.5 py-0.5 rounded-md border border-sky-300 dark:border-sky-800 mt-1">
                                  با {toPersianDigits(effectiveDiscountPercent)}٪ تخفیف: {formatPrice(Math.round(unitSell * (1 - effectiveDiscountPercent / 100)))}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. ستون سود ردیف (تومان + مقیاس میلیون/هزار) */}
                          <td className="py-3.5 px-3 bg-emerald-50/30 dark:bg-emerald-950/10 border-r border-slate-200/60 dark:border-slate-800/60">
                            <div className="space-y-1 text-center">
                              <div className={`inline-flex flex-col items-center justify-center p-1.5 rounded-xl border ${
                                isLoss 
                                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300' 
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                              }`}>
                                <div className="flex items-center justify-center gap-1 font-black text-xs font-mono">
                                  <span>{isLoss ? `-` : `+`}{formatPrice(Math.abs(rowProfit))}</span>
                                </div>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 border border-current/20 mt-0.5 font-sans">
                                  {isLoss ? 'زیان: ' : 'سود: '}{formatAmountScale(Math.abs(rowProfit))}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center gap-1">
                                <span>دانه: {isLoss ? '-' : '+'}{toPersianDigits(Math.abs(unitDiff).toLocaleString())} ت</span>
                                <span className={`px-1 rounded font-mono ${isLoss ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                                  {isLoss ? '' : '+'}{toPersianDigits(marginPct.toFixed(1))}٪
                                </span>
                              </div>
                            </div>
                          </td>
                        </>
                      ) : (
                        /* When Secret Mode is ON (حالت امنیتی) */
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => stepPrice(item.id, -1000)}
                                title="کاهش ۱۰۰۰ تومان"
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 text-slate-600 dark:text-slate-400 cursor-pointer"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                step="500"
                                value={item.unitSellingPrice || 0}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  handleUpdateItem(item.id, { unitSellingPrice: val });
                                }}
                                className={`w-28 px-2 py-1.5 text-center font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 focus:ring-2 ${theme.ring} focus:outline-none text-xs`}
                              />
                              <button
                                type="button"
                                onClick={() => stepPrice(item.id, 1000)}
                                title="افزایش ۱۰۰۰ تومان"
                                className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 ${theme.accentHoverBg} hover:text-emerald-700 text-slate-600 cursor-pointer`}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center justify-center">
                              <PricePeekButton
                                isSecretMode={isSecretMode}
                                onToggle={onToggleSecretMode}
                                purchasePrice={item.unitPurchasePrice}
                                profit={item.profitAmount}
                                marginPercent={item.profitPercentage}
                              />
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Total Item Price (مبلغ کل) */}
                      <td className="py-3.5 px-4 text-center font-black text-slate-900 dark:text-white text-sm">
                        {hasDiscount && effectiveDiscountPercent > 0 ? (
                          <div>
                            <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                              {toPersianDigits(Math.round(item.totalPrice * (1 - effectiveDiscountPercent / 100)).toLocaleString())}
                            </span>
                            <span className="text-[10px] text-slate-400 line-through block font-normal mt-0.5">
                              {toPersianDigits(item.totalPrice.toLocaleString())} تومان
                            </span>
                          </div>
                        ) : (
                          <>
                            {toPersianDigits(item.totalPrice.toLocaleString())}
                            <span className="text-[10px] font-normal text-slate-400 block mt-0.5">تومان</span>
                          </>
                        )}
                      </td>

                      {/* Actions: Edit & Delete */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditItemModal(item)}
                            className={`p-1.5 rounded-lg ${theme.badgeBg} ${theme.primaryText} hover:opacity-80 transition-colors cursor-pointer`}
                            title="ویرایش کامل این ردیف"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
                            title="حذف این ردیف"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* 🔄 SMART RETURN BARTER / OFFSET SECTION (تهاتر هوشمند مرجوعی تسویه نشده با فاکتور جاری) */}
      {unsettledPartyReturns.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50/90 via-indigo-50/70 to-blue-50/90 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/40 p-5 rounded-3xl border-2 border-purple-200/90 dark:border-purple-800/80 shadow-sm space-y-4 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-200/70 dark:border-purple-800/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">
                    تهاتر هوشمند و کسر مرجوعی‌های تسویه نشده (دریافت جنس به‌جای مرجوعی)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-200/80 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                    {toPersianDigits(unsettledPartyReturns.length)} سند مرجوعی
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  این طرف‌حساب دارای کالای مرجوعی تسویه نشده است. با انتخاب آن‌ها، ارزش مرجوعی به عنوان دریافت جنس از مبلغ فاکتور کسر شده و پس از صدور، تسویه خواهد شد.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedOffsetReturnIds(unsettledPartyReturns.map(r => r.id))}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>انتخاب همه جهت تهاتر</span>
              </button>
              {selectedOffsetReturnIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedOffsetReturnIds([])}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-purple-200 dark:border-purple-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  لغو انتخاب
                </button>
              )}
            </div>
          </div>

          {/* List of returns */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400 border-b border-purple-100 dark:border-purple-900/40 text-[11px]">
                  <th className="pb-2 pr-2">انتخاب جهت تهاتر</th>
                  <th className="pb-2">کالای مرجوعی</th>
                  <th className="pb-2">نوع مرجوعی</th>
                  <th className="pb-2">تعداد و مشخصات</th>
                  <th className="pb-2">تاریخ</th>
                  <th className="pb-2 text-left pl-2">مبلغ خالص مرجوعی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100/60 dark:divide-purple-900/30">
                {unsettledPartyReturns.map((ret) => {
                  const isChecked = selectedOffsetReturnIds.includes(ret.id);
                  const retVal = ret.netAmount !== undefined ? ret.netAmount : ret.totalAmount;

                  return (
                    <tr
                      key={ret.id}
                      onClick={() => {
                        setSelectedOffsetReturnIds(prev =>
                          isChecked ? prev.filter(id => id !== ret.id) : [...prev, ret.id]
                        );
                      }}
                      className={`cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-purple-100/60 dark:bg-purple-900/30 font-semibold text-purple-950 dark:text-purple-100' 
                          : 'hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <td className="py-2.5 pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by row onClick
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 font-bold">
                        <span>{ret.productName}</span>
                        {ret.reason && (
                          <span className="text-[10px] block text-slate-500 dark:text-slate-400 font-normal">
                            علت: {ret.reason}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          ret.type === 'to_supplier' 
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300' 
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                        }`}>
                          {ret.type === 'to_supplier' ? 'مرجوع شده به تامین‌کننده' : 'مرجوعی از مشتری'}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span>
                          {toPersianDigits(ret.totalPieces)} عدد
                          {ret.cartonsCount > 0 && ` (${toPersianDigits(ret.cartonsCount)} کارتن)`}
                          {ret.extraPieces > 0 && ` (+${toPersianDigits(ret.extraPieces)} دانه)`}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                        {toPersianDigits(ret.date)}
                      </td>
                      <td className="py-2.5 text-left pl-2 font-black text-purple-900 dark:text-purple-200 text-sm">
                        {formatPrice(retVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Barter Status Summary */}
          {selectedOffsetReturnIds.length > 0 && (
            <div className="pt-2 border-t border-purple-200/80 dark:border-purple-800/70 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span>مبلغ کسر شده بابت {toPersianDigits(selectedOffsetReturnIds.length)} مرجوعی انتخابی:</span>
                  <strong className="text-emerald-700 dark:text-emerald-300 text-base font-black tracking-normal">
                    {formatPrice(totalOffsetReturnsAmount)}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const barterNote = `بابت تسویه و تهاتر با مرجوعی کالا: کسر مبلغ ${formatPrice(totalOffsetReturnsAmount)} از فاکتور (دریافت جنس به‌جای مرجوعی).`;
                  if (!notes.includes('تهاتر با مرجوعی')) {
                    setNotes(prev => prev ? `${prev}\n${barterNote}` : barterNote);
                    onShowAlert?.('توضیحات تهاتر در یادداشت فاکتور درج شد.', 'info', 'ثبت در یادداشت');
                  }
                }}
                className="px-2.5 py-1 rounded-xl bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-800 dark:text-purple-200 text-[11px] font-bold transition-colors cursor-pointer border border-purple-300 dark:border-purple-700 flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                <span>درج خودکار توضیح تهاتر در توضیحات فاکتور</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invoice Totals & Notes Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Notes & Notice */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs transition-colors">
          <label className="block font-bold text-slate-800 dark:text-slate-200">یادداشت و شرایط پایین فاکتور</label>
          <textarea
            id="input-invoice-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 ${theme.ring} focus:outline-none leading-relaxed text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500`}
            placeholder="یادداشت‌ها، شرایط تسویه، یا تعهدات تحویل این فاکتور..."
          />
        </div>

        {/* Financial Summary Calculation Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3.5 text-xs transition-colors">
          <div className="font-extrabold text-slate-900 dark:text-white text-sm pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>خلاصه محاسبات مالی فاکتور</span>
            <span className={`${theme.primaryText} font-bold text-xs`}>
              {toPersianDigits(items.length)} قلم کالا {invoiceCartonBreakdownText ? `(${invoiceCartonBreakdownText})` : ''}
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span>جمع اقلام (خالص):</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{formatPrice(subtotal)}</span>
            </div>

            {totalOffsetReturnsAmount > 0 && (
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 font-bold text-xs">
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>کسر بابت تهاتر مرجوعی (دریافت جنس):</span>
                </span>
                <span className="font-black dir-ltr text-rose-600 dark:text-rose-400 text-sm">-{formatPrice(totalOffsetReturnsAmount)}</span>
              </div>
            )}

            {/* Toggleable Discount Section (Disabled by default) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasDiscount}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setHasDiscount(enabled);
                      if (enabled && discountPercent <= 0) {
                        setDiscountPercent(8);
                      }
                    }}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                  />
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Percent className={`w-3.5 h-3.5 ${theme.primaryText}`} />
                    <span>اعمال تخفیف روی این فاکتور</span>
                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                      (پیش‌فرض: غیرفعال)
                    </span>
                  </span>
                </label>
                {hasDiscount ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-[10.5px] border border-amber-300 dark:border-amber-700">
                    {toPersianDigits(effectiveDiscountPercent)}٪ تخفیف فعال
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">بدون تخفیف</span>
                )}
              </div>

              {hasDiscount && (
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 space-y-2.5">
                  {/* Preset percent quick buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">درصدهای سریع:</span>
                    {[5, 8, 10, 12, 15, 20].map((pct) => (
                      <button
                        key={`disc-preset-${pct}`}
                        type="button"
                        onClick={() => {
                          setDiscountPercent(pct);
                          setDiscountMode('percent');
                          setDiscount(Math.round((subtotal * pct) / 100));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          effectiveDiscountPercent === pct && discountMode === 'percent'
                            ? `${theme.primary} text-white shadow-2xs scale-105`
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {toPersianDigits(pct)}٪
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1 text-[11px]">
                        درصد تخفیف (٪)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={discountPercent}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                            setDiscountPercent(val);
                            setDiscountMode('percent');
                            setDiscount(Math.round((subtotal * val) / 100));
                          }}
                          className={`w-full pr-3 pl-7 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 ${theme.ring} text-slate-900 dark:text-white font-black text-xs text-center`}
                          placeholder="8"
                        />
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
                          ٪
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1 text-[11px]">
                        مبلغ تخفیف (تومان)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setDiscount(val);
                          setDiscountMode('amount');
                          if (subtotal > 0) {
                            setDiscountPercent(Math.round((val / subtotal) * 100 * 10) / 10);
                          }
                        }}
                        className={`w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 ${theme.ring} text-slate-900 dark:text-white font-black text-xs text-center`}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed flex items-center justify-between">
                    <span>مبلغ تخفیف کسر شده از فاکتور:</span>
                    <span className="font-black text-xs font-mono">
                      -{formatPrice(activeDiscountAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Section: Invoice Expenses, Freight & Losses (کرایه بار، ضایعات، هزینه‌ها و ضررهای فاکتور) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isExpensesSectionOpen}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setIsExpensesSectionOpen(enabled);
                      if (enabled && invoiceExpenses.length === 0) {
                        setInvoiceExpenses([
                          {
                            id: `exp-${Date.now()}`,
                            title: 'کرایه بار و حمل',
                            amount: 0,
                            type: 'freight',
                            action: 'deduct',
                            sourceAccount: 'none',
                          }
                        ]);
                      }
                    }}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                  />
                  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Truck className={`w-3.5 h-3.5 ${theme.primaryText}`} />
                    <span>کرایه بار، ضایعات و ضررهای فاکتور</span>
                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                      (اختیاری)
                    </span>
                  </span>
                </label>
                {invoiceExpenses.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-black text-[10.5px] border border-blue-300 dark:border-blue-700">
                    {toPersianDigits(invoiceExpenses.length)} مورد ثبت شده
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">بدون هزینه جانبی</span>
                )}
              </div>

              {isExpensesSectionOpen && (
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 space-y-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    می‌توانید کرایه بار، ضایعات، کالای تاریخ مصرف گذشته و هزینه‌های فاکتور را ثبت کنید و نحوه کسر یا اضافه شدن آن به فاکتور و نقدینگی را مشخص فرمایید:
                  </p>

                  <div className="space-y-2.5">
                    {invoiceExpenses.map((exp, expIdx) => (
                      <div 
                        key={exp.id || `exp-${expIdx}`}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-black flex items-center justify-center shrink-0">
                              {toPersianDigits(expIdx + 1)}
                            </span>
                            <input
                              type="text"
                              value={exp.title}
                              onChange={(e) => {
                                const newTitle = e.target.value;
                                setInvoiceExpenses(prev => prev.map((item, i) => i === expIdx ? { ...item, title: newTitle } : item));
                              }}
                              placeholder="عنوان هزینه (مثلاً: کرایه بار، ضایعات تاریخ گذشته، انبارداری)"
                              className="w-full text-xs font-bold bg-transparent border-b border-slate-200 dark:border-slate-800 focus:outline-none focus:border-teal-500 pb-0.5 text-slate-900 dark:text-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceExpenses(prev => prev.filter((_, i) => i !== expIdx));
                            }}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="حذف این مورد"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Title Presets */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-slate-400">عناوین سریع:</span>
                          {[
                            { label: 'کرایه باربری', type: 'freight', defaultAction: 'deduct' },
                            { label: 'ضایعات و تاریخ منقضی', type: 'loss_waste', defaultAction: 'deduct' },
                            { label: 'کارگری و تخلیه بار', type: 'handling', defaultAction: 'deduct' },
                            { label: 'کسری و خسارت کالا', type: 'damage', defaultAction: 'deduct' },
                            { label: 'سایر هزینه‌ها', type: 'other', defaultAction: 'record_only' },
                          ].map((preset) => (
                            <button
                              key={`exp-preset-${preset.label}-${expIdx}`}
                              type="button"
                              onClick={() => {
                                setInvoiceExpenses(prev => prev.map((item, i) => i === expIdx ? { 
                                  ...item, 
                                  title: preset.label, 
                                  type: preset.type as InvoiceExpenseType,
                                  action: preset.defaultAction as InvoiceExpenseAction
                                } : item));
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* Amount & Action & Source Account - Spacious and Highly Legible */}
                        <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                          {/* Dedicated Prominent Amount Input Card */}
                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>مبلغ هزینه / کرایه بار (تومان):</span>
                              </label>
                              {exp.amount > 0 && (
                                <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-black text-xs font-mono">
                                  {formatPrice(exp.amount)}
                                </span>
                              )}
                            </div>

                            <div className="relative">
                              <SmartPriceInput
                                value={exp.amount || 0}
                                onChange={(val) => {
                                  setInvoiceExpenses(prev => prev.map((item, i) => i === expIdx ? { ...item, amount: Math.max(0, val) } : item));
                                }}
                                placeholder=""
                                className="w-full text-base sm:text-lg font-black text-center text-teal-950 dark:text-teal-100 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-teal-500 rounded-xl py-2 px-3 shadow-inner"
                              />
                            </div>

                            {/* Quick Amount Step Buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[10px] text-slate-400 font-bold">افزودن سریع:</span>
                              {[
                                { label: '+۵۰ هزار', val: 50000 },
                                { label: '+۱۰۰ هزار', val: 100000 },
                                { label: '+۲۰۰ هزار', val: 200000 },
                                { label: '+۵۰۰ هزار', val: 500000 },
                                { label: '+۱ میلیون', val: 1000000 },
                                { label: '+۲ میلیون', val: 2000000 },
                                { label: '+۵ میلیون', val: 5000000 },
                              ].map((step) => (
                                <button
                                  key={`step-btn-${step.label}-${expIdx}`}
                                  type="button"
                                  onClick={() => {
                                    setInvoiceExpenses(prev => prev.map((item, i) => i === expIdx ? { ...item, amount: (item.amount || 0) + step.val } : item));
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 font-black text-[10.5px] border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                >
                                  {step.label}
                                </button>
                              ))}
                              {exp.amount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInvoiceExpenses(prev => prev.map((item, i) => i === expIdx ? { ...item, amount: 0 } : item));
                                  }}
                                  className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-[10.5px] border border-rose-200 dark:border-rose-900 mr-auto hover:bg-rose-100 transition-colors cursor-pointer"
                                >
                                  صفر کردن
                                </button>
                              )}
                            </div>

                            {/* Prominent High-Contrast Persian Words Banner */}
                            {exp.amount > 0 && (
                              <div className="p-2.5 rounded-xl bg-gradient-to-r from-teal-50 via-emerald-50/60 to-white dark:from-teal-950/60 dark:via-slate-900 dark:to-slate-900 border border-teal-200 dark:border-teal-800/80 text-xs flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-slate-500 dark:text-slate-400 font-bold shrink-0">به حروف:</span>
                                <span className="font-black text-teal-800 dark:text-teal-200 text-xs sm:text-sm leading-snug">
                                  {numberToPersianWords(exp.amount)} تومان
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action and Source Account Settings */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Action on Invoice */}
                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                نحوه اعمال بر فاکتور:
                              </label>
                              <select
                                value={exp.action}
                                onChange={(e) => {
                                  const act = e.target.value as InvoiceExpenseAction;
                                  setInvoiceExpenses(prev => prev.map((item, i) => i === expIdx ? { ...item, action: act } : item));
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none cursor-pointer"
                              >
                                <option value="deduct">کسر از فاکتور (-) [کرایه بار / ضایعات]</option>
                                <option value="add">اضافه به فاکتور (+) [افزودن به حساب]</option>
                                <option value="record_only">فقط قید در سند (بدون تغییر مبلغ فاکتور)</option>
                              </select>
                            </div>

                            {/* Source Account for Liquidity */}
                            <div className="space-y-1">
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                محل پرداخت / خروج نقدینگی:
                              </label>
                              <select
                                value={exp.sourceAccount || 'none'}
                                onChange={(e) => {
                                  const acc = e.target.value as 'cash' | 'bank' | 'none';
                                  setInvoiceExpenses(prev => prev.map((item, i) => i === expIdx ? { ...item, sourceAccount: acc } : item));
                                }}
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none cursor-pointer"
                              >
                                <option value="none">بدون خروج وجه (ثبت دفتری / طرف‌حساب)</option>
                                <option value="cash">پرداخت نقدی از دخل / صندوق</option>
                                <option value="bank">پرداخت از حساب بانکی / کارتخوان</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceExpenses(prev => [
                          ...prev,
                          {
                            id: `exp-${Date.now()}-${prev.length}`,
                            title: 'کرایه بار و حمل',
                            amount: 0,
                            type: 'freight',
                            action: 'deduct',
                            sourceAccount: 'none',
                          }
                        ]);
                      }}
                      className="w-full py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن کرایه بار، ضایعات یا هزینه دیگر</span>
                    </button>
                  </div>

                  {/* Summary of Expense impacts */}
                  {(expensesTotalDeduction > 0 || expensesTotalAddition > 0 || expensesTotalRecordedOnly > 0) && (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
                      {expensesTotalDeduction > 0 && (
                        <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                          <span>مجموع کسر از فاکتور (کرایه بار / ضایعات):</span>
                          <span className="dir-ltr font-black">-{formatPrice(expensesTotalDeduction)}</span>
                        </div>
                      )}
                      {expensesTotalAddition > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                          <span>مجموع اضافه به فاکتور:</span>
                          <span className="dir-ltr font-black">+{formatPrice(expensesTotalAddition)}</span>
                        </div>
                      )}
                      {expensesTotalRecordedOnly > 0 && (
                        <div className="flex justify-between text-slate-500 dark:text-slate-400">
                          <span>هزینه‌های قید شده (بدون تغییر در فاکتور):</span>
                          <span className="dir-ltr font-bold">{formatPrice(expensesTotalRecordedOnly)}</span>
                        </div>
                      )}
                      {expensesPaidFromLiquidity > 0 && (
                        <div className="flex justify-between text-blue-600 dark:text-blue-400 pt-1 border-t border-slate-200 dark:border-slate-800 font-bold">
                          <span>کسر از موجودی نقدینگی (صندوق/بانک):</span>
                          <span className="dir-ltr font-black">-{formatPrice(expensesPaidFromLiquidity)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Deductions and Additions Lines in Final Calculation */}
            {expensesTotalDeduction > 0 && (
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold text-xs py-1 px-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>کسر کرایه بار و ضایعات از فاکتور:</span>
                </span>
                <span className="dir-ltr font-black">-{formatPrice(expensesTotalDeduction)}</span>
              </div>
            )}

            {expensesTotalAddition > 0 && (
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold text-xs py-1 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                <span className="flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن کرایه بار و خدمات به فاکتور:</span>
                </span>
                <span className="dir-ltr font-black">+{formatPrice(expensesTotalAddition)}</span>
              </div>
            )}

            <div className="pt-1">
              <label className="block text-slate-500 dark:text-slate-400 mb-1">مالیات / ارزش افزوده (تومان)</label>
              <input
                type="number"
                value={tax}
                onChange={(e) => setTax(Math.max(0, parseInt(e.target.value) || 0))}
                className={`w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 ${theme.ring} text-slate-900 dark:text-white font-semibold`}
                placeholder="0"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">مبلغ نهایی قابل پرداخت:</span>
              <span 
                className="text-lg sm:text-xl font-black"
                style={{ color: theme.hex }}
              >
                {formatPrice(finalAmount)}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              <span className="font-semibold text-slate-400">به حروف: </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{numberToPersianWords(finalAmount)}</span>
            </div>

            {/* Secret Profit Panel - For Sales and Purchase Invoices */}
            {invoiceType === 'sale' && !isSecretMode && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">کل بهای خرید اجناس:</span>
                  <span className="font-bold">{formatPrice(totalPurchaseCost)}</span>
                </div>
                <div className="flex justify-between font-black text-emerald-900 dark:text-emerald-200 text-sm">
                  <span>سود خالص فاکتور:</span>
                  <span>{formatPrice(totalProfit)} ({toPersianDigits(overallMargin.toFixed(1))}٪)</span>
                </div>
              </div>
            )}

            {invoiceType === 'purchase' && !isSecretMode && (() => {
              const estimatedSalesTotal = items.reduce((sum, item) => {
                const prod = products.find(p => p.id === item.productId || p.name === item.productName);
                const sPrice = (item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
                  ? item.unitSellingPrice
                  : ((prod?.sellingPrice && prod.sellingPrice > 0) ? prod.sellingPrice : 0);
                return sum + (item.totalPieces * sPrice);
              }, 0);

              // All freight, handling, waste, and expenses associated with this shipment directly deducted from profit
              const totalExpensesAll = invoiceExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

              // True Net Inward Acquisition Cost of this shipment:
              // Goods Cost - Supplier Discount + Taxes + All Incurred Expenses
              const effectiveInwardCost = Math.max(0, subtotal - activeDiscountAmount + tax) + totalExpensesAll;
              const estimatedProfit = estimatedSalesTotal - effectiveInwardCost;
              const estimatedMargin = effectiveInwardCost > 0 ? (estimatedProfit / effectiveInwardCost) * 100 : 0;
              const isLoss = estimatedProfit < 0;

              return (
                <div className={`p-3.5 rounded-2xl border ${!isLoss ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200' : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200'} text-xs space-y-2.5`}>
                  <div className="flex justify-between items-center font-bold pb-2 border-b border-blue-200/70 dark:border-blue-800/70">
                    <span className="text-blue-900 dark:text-blue-200 font-extrabold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>ارزش پیش‌بینی فروش کل این بار خرید:</span>
                    </span>
                    <span className="font-black font-mono text-sm sm:text-base text-blue-950 dark:text-blue-100">{formatPrice(estimatedSalesTotal)}</span>
                  </div>

                  {/* Itemized cost breakdown including discount, freight, deductions and additions */}
                  <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50">
                    <div className="flex justify-between">
                      <span>بهای ناخالص خرید اجناس:</span>
                      <span className="font-bold font-mono">{formatPrice(subtotal)}</span>
                    </div>

                    {hasDiscount && activeDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                        <span>تخفیف تامین‌کننده ({toPersianDigits(effectiveDiscountPercent)}٪):</span>
                        <span className="font-mono dir-ltr font-black">-{formatPrice(activeDiscountAmount)}</span>
                      </div>
                    )}

                    {totalExpensesAll > 0 && (
                      <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3 text-rose-500" />
                          <span>کرایه بار و هزینه‌ها (کسر از سود بار):</span>
                        </span>
                        <span className="font-mono dir-ltr font-black">+{formatPrice(totalExpensesAll)}</span>
                      </div>
                    )}

                    {expensesTotalDeduction > 0 && (
                      <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[10px]">
                        <span>کسر شده از فاکتور تسویه فروشنده:</span>
                        <span className="font-mono dir-ltr">-{formatPrice(expensesTotalDeduction)}</span>
                      </div>
                    )}

                    {tax > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>مالیات و عوارض:</span>
                        <span className="font-mono font-bold">+{formatPrice(tax)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-extrabold text-xs">
                      <span>بهای تمام‌شده کل این بار (خرید + کرایه):</span>
                      <span className="font-mono">{formatPrice(effectiveInwardCost)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center font-black text-sm pt-0.5">
                    <span className={!isLoss ? 'text-emerald-900 dark:text-emerald-200' : 'text-rose-900 dark:text-rose-200'}>
                      {!isLoss ? 'سود خالص احتمالی از فروش:' : 'زیان احتمالی فروش:'}
                    </span>
                    <span className={`font-mono text-base ${!isLoss ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                      {!isLoss ? `+${formatPrice(estimatedProfit)}` : `-${formatPrice(Math.abs(estimatedProfit))}`} ({toPersianDigits(estimatedMargin.toFixed(1))}٪)
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Product Picker Modal */}
      <AnimatePresence>
        {isProductPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-xs"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Boxes className={`w-5 h-5 ${theme.activeIcon}`} />
                    انتخاب کالا از لیست انبار
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                    کالای مورد نظر را انتخاب و تعداد کارتن و قیمت را مشخص نمایید.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onAddProduct && (
                    <button
                      type="button"
                      id="btn-quick-add-new-product-picker"
                      onClick={() => setIsNewProductModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 cursor-pointer"
                      title="تعریف کالا و افزودن مستقیم به انبار بدون ترک فاکتور"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ افزودن کالای جدید</span>
                    </button>
                  )}
                  <button
                    id="close-product-picker-btn"
                    onClick={() => {
                      setIsProductPickerOpen(false);
                      setActivePickingProduct(null);
                    }}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {/* Search & Category Filter & Zero Stock Toggle */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="جستجوی نام کالا (مثلاً نوشابه ای، شلاقی، آبنبات...)"
                        className={`w-full pr-10 pl-3 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 ${theme.ring} focus:outline-none`}
                      />
                    </div>

                    <label 
                      id="toggle-hide-zero-stock-invoice-picker"
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer select-none shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={hideZeroStock}
                        onChange={(e) => setHideZeroStock(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-0 cursor-pointer accent-teal-600"
                      />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        عدم نمایش موجودی صفر
                      </span>
                      {hideZeroStock && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                          فعال
                        </span>
                      )}
                    </label>
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {categories.map((cat, idx) => (
                      <button
                        key={`inv-cat-${cat || 'uncat'}-${idx}`}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-2 rounded-xl whitespace-nowrap font-bold transition-all cursor-pointer ${
                          selectedCategory === cat
                            ? `${theme.primary} text-white`
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {cat === 'all' ? 'همه دسته‌ها' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product List Grid */}
                {!activePickingProduct ? (
                  filteredProducts.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                      <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-bold">کالایی با این مشخصات یافت نشد.</p>
                      {hideZeroStock && (
                        <button
                          type="button"
                          onClick={() => setHideZeroStock(false)}
                          className="mt-2 text-xs font-black text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                        >
                          نمایش کالاهای ناموجود (برداشتن تیک عدم نمایش موجودی صفر)
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredProducts.map((prod, idx) => {
                      const isUnpack = isProductUnpackaged(prod);
                      const ppc = isUnpack ? 1 : (prod.piecesPerCarton || 1);
                      const stockCartons = ppc > 1 ? Math.floor(prod.stockPieces / ppc) : 0;
                      return (
                        <div
                          key={`picker-prod-${prod.id || idx}-${idx}`}
                          onClick={() => openProductCustomizer(prod)}
                          className={`p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 ${theme.accentHoverBorder} hover:shadow-md cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/50 ${theme.accentHoverBg} flex flex-col justify-between`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                                {prod.name}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[10px] font-bold">
                                {prod.category}
                              </span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-black border border-slate-200 dark:border-slate-700">
                                {getProductSmartLabel(prod)}
                              </span>
                              {prod.notes && !isDefaultPackagingNote(prod.notes) && (
                                <span className="text-slate-400 dark:text-slate-500 font-normal">
                                  | {prod.notes}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 text-slate-600 dark:text-slate-400 text-[11px] space-y-1">
                              <div>
                                {isUnpack || ppc <= 1 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">📦 کالای بدون بسته‌بندی (فروش دانه‌ای)</span>
                                ) : (
                                  <>هر کارتن: <b className="text-slate-800 dark:text-slate-200">{toPersianDigits(prod.piecesPerCarton)} عدد</b></>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  موجودی انبار: <b className={prod.stockPieces <= 0 ? "text-red-600 dark:text-red-400 font-extrabold" : theme.primaryText}>
                                    {toPersianDigits(prod.stockPieces.toLocaleString())} {prod.unitTitle || 'عدد'}
                                    {!isUnpack && ppc > 1 && ` (${toPersianDigits(stockCartons)} کارتن)`}
                                  </b>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {invoiceType === 'sale' && prod.stockPieces > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openProductCustomizer(prod, true);
                                      }}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] shadow-xs flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 shrink-0"
                                      title="انتخاب کل موجودی برای فاکتور"
                                    >
                                      <CheckCheck className="w-3 h-3" />
                                      <span>کل موجودی</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenRestock(prod, e)}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] shadow-xs flex items-center gap-1 cursor-pointer transition-transform hover:scale-105 shrink-0"
                                    title="شارژ سریع موجودی این کالا"
                                  >
                                    <Zap className="w-3 h-3" />
                                    <span>شارژ انبار</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block">قیمت فروش پیش‌فرض:</span>
                              <span className={`font-black ${theme.primaryText} text-sm`}>{formatPrice(prod.sellingPrice)}</span>
                            </div>
                            {!isSecretMode && (
                              <div className="text-left">
                                <span className="text-[10px] text-slate-400 block">قیمت خرید:</span>
                                <span className="font-bold text-amber-800 dark:text-amber-400">{formatPrice(prod.purchasePrice)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )
                ) : (
                  /* Customizer for picked product */
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">تنظیم اقلام برای افزودن به فاکتور:</span>
                        <h4 className="font-black text-slate-900 dark:text-white text-base mt-0.5">{activePickingProduct.name}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivePickingProduct(null)}
                        className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white underline cursor-pointer"
                      >
                        تغییر کالا
                      </button>
                    </div>

                    {/* Stock Info Bar & Select All Stock Button */}
                    {(() => {
                      const isUnpack = isProductUnpackaged(activePickingProduct);
                      const activePickerPpc = getProductPiecesPerCarton(activePickingProduct, pickPacks, pickPiecesPerPack);
                      const isCartonExceedingStock = invoiceType === 'sale' && 
                        activePickingProduct.stockPieces > 0 && 
                        pickCartons > 0 && 
                        (pickCartons * activePickerPpc) > activePickingProduct.stockPieces &&
                        pickCartons <= activePickingProduct.stockPieces;

                      return (
                        <>
                          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-slate-500" />
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">موجودی در انبار:</span>
                              <span className={`text-xs font-black ${activePickingProduct.stockPieces > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {toPersianDigits(activePickingProduct.stockPieces.toLocaleString())} {activePickingProduct.unitTitle || 'عدد'}
                                {!isUnpack && activePickerPpc > 1 && activePickingProduct.stockPieces > 0 && (
                                  <span className="text-[11px] text-slate-500 font-normal mr-1">
                                    ({toPersianDigits(Math.floor(activePickingProduct.stockPieces / activePickerPpc))} کارتن{activePickingProduct.stockPieces % activePickerPpc > 0 ? ` و ${toPersianDigits(activePickingProduct.stockPieces % activePickerPpc)} دانه` : ''})
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {invoiceType === 'sale' && activePickingProduct.stockPieces > 0 && (
                                <button
                                  id="btn-select-all-stock-customizer"
                                  type="button"
                                  onClick={() => {
                                    handlePickerTotalPiecesChange(activePickingProduct.stockPieces);
                                    setPickerQuantityMode('pieces');
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                                  title="انتخاب تمام موجودی این کالا برای فاکتور"
                                >
                                  <CheckCheck className="w-4 h-4" />
                                  <span>انتخاب کل موجودی ({toPersianDigits(activePickingProduct.stockPieces.toLocaleString())} {activePickingProduct.unitTitle || 'عدد'})</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {invoiceType === 'sale' && activePickingProduct.stockPieces <= 0 && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                                <span>موجودی این کالا در انبار صفر است! در صورت نیاز می‌توانید آن را شارژ کنید:</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleOpenRestock(activePickingProduct, e)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-105 shrink-0"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>شارژ فوری انبار</span>
                              </button>
                            </div>
                          )}

                          {/* Mode Switcher or Unpackaged Notification */}
                          {isUnpack ? (
                            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black">
                                <Package className="w-4 h-4" />
                                <span>کالای بدون بسته‌بندی کارتن (فروش تک / فله بر اساس {activePickingProduct.unitTitle || 'عدد'})</span>
                              </div>
                              <span className="text-[11px] text-slate-500 font-bold">هر واحد = ۱ {activePickingProduct.unitTitle || 'عدد'}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
                              <button
                                id="mode-pieces-tab"
                                type="button"
                                onClick={() => setPickerQuantityMode('pieces')}
                                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                  pickerQuantityMode === 'pieces'
                                    ? `bg-white dark:bg-slate-900 ${theme.primaryText} shadow-xs font-black`
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>فروش بر اساس دانه / عدد (تک فروشی)</span>
                              </button>

                              <button
                                id="mode-cartons-tab"
                                type="button"
                                onClick={() => setPickerQuantityMode('cartons')}
                                className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                  pickerQuantityMode === 'cartons'
                                    ? `bg-white dark:bg-slate-900 ${theme.primaryText} shadow-xs font-black`
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                <Boxes className="w-3.5 h-3.5" />
                                <span>فروش بر اساس کارتن و بسته (عمده)</span>
                              </button>
                            </div>
                          )}

                          {/* Smart Warning: If user typed quantity into cartons by mistake */}
                          {isCartonExceedingStock && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                                <span>
                                  توجه: {toPersianDigits(pickCartons)} کارتن معادل {toPersianDigits(pickCartons * activePickerPpc)} عدد است (موجودی انبار: {toPersianDigits(activePickingProduct.stockPieces)} عدد). اگر قصد ثبت {toPersianDigits(pickCartons)} عدد (دانه تک) را داشتید:
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handlePickerTotalPiecesChange(pickCartons);
                                  setPickerQuantityMode('pieces');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs cursor-pointer"
                              >
                                تبدیل به {toPersianDigits(pickCartons)} عدد
                              </button>
                            </div>
                          )}

                          {/* PRIMARY VIEW 1: Direct Pieces / Units Mode */}
                          {pickerQuantityMode === 'pieces' || isUnpack ? (
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="block font-black text-slate-900 dark:text-white text-sm">
                                  تعداد کل برای فروش ({activePickingProduct.unitTitle || 'عدد'}):
                                </label>
                                {!isUnpack && activePickerPpc > 1 && (
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    ساختار بسته: هر کارتن {toPersianDigits(activePickerPpc)} عدد ({toPersianDigits(pickPacks)} بسته × {toPersianDigits(pickPiecesPerPack)})
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handlePickerTotalPiecesChange(Math.max(0, pickTotalPieces - 10))}
                                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs hover:bg-slate-200 cursor-pointer"
                                  title="کاهش ۱۰ عدد"
                                >
                                  -۱۰
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePickerTotalPiecesChange(Math.max(0, pickTotalPieces - 1))}
                                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs hover:bg-slate-200 cursor-pointer"
                                  title="کاهش ۱ عدد"
                                >
                                  -۱
                                </button>
                                <div className="flex-1 relative">
                                  <input
                                    id="picker-total-pieces-input"
                                    type="number"
                                    min="0"
                                    value={pickTotalPieces}
                                    onChange={(e) => handlePickerTotalPiecesChange(parseInt(e.target.value) || 0)}
                                    className={`w-full px-3 py-2.5 rounded-xl ${theme.badgeBg} border-2 ${theme.borderColor} focus:ring-2 ${theme.ring} font-black ${theme.primaryText} text-xl text-center shadow-xs focus:outline-none`}
                                    placeholder="مثلاً: ۲۸"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handlePickerTotalPiecesChange(pickTotalPieces + 1)}
                                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs hover:bg-slate-200 cursor-pointer"
                                  title="افزایش ۱ عدد"
                                >
                                  +۱
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePickerTotalPiecesChange(pickTotalPieces + 10)}
                                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs hover:bg-slate-200 cursor-pointer"
                                  title="افزایش ۱۰ عدد"
                                >
                                  +۱۰
                                </button>
                              </div>

                              {/* Breakdown badge */}
                              {!isUnpack && activePickerPpc > 1 ? (
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs">
                                  <span className="font-bold text-slate-600 dark:text-slate-400">
                                    محاسبه معادل کارتن:
                                  </span>
                                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                    {pickCartons > 0 ? (
                                      <>
                                        <span className={`${theme.primaryText}`}>{toPersianDigits(pickCartons)} کارتن کامل</span>
                                        {pickExtraPieces > 0 && <span> و {toPersianDigits(pickExtraPieces)} دانه تک</span>}
                                      </>
                                    ) : (
                                      <span>{toPersianDigits(pickTotalPieces)} دانه تک (کمتر از ۱ کارتن کامل)</span>
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs">
                                  <span className="font-bold text-slate-600 dark:text-slate-400">
                                    وضعیت بسته:
                                  </span>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    فروش مستقیم تکی / بدون کارتن ({toPersianDigits(pickTotalPieces)} {activePickingProduct.unitTitle || 'عدد'})
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* PRIMARY VIEW 2: Carton & Packaging Mode */
                            <div className={`grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-white dark:bg-slate-900 p-4 rounded-2xl border ${theme.borderColor} shadow-xs`}>
                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                                  تعداد کارتن
                                </label>
                                <input
                                  id="picker-cartons-input"
                                  type="number"
                                  min="0"
                                  value={pickCartons}
                                  onChange={(e) => handlePickerCartonsChange(parseInt(e.target.value) || 0)}
                                  className={`w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border ${theme.borderColor} focus:ring-2 ${theme.ring} font-black text-slate-900 dark:text-white text-sm text-center`}
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                                  تعداد بسته در کارتن
                                </label>
                                <input
                                  id="picker-packs-input"
                                  type="number"
                                  min="1"
                                  value={pickPacks}
                                  onChange={(e) => handlePickerPacksChange(parseInt(e.target.value) || 1)}
                                  className={`w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border ${theme.borderColor} focus:ring-2 ${theme.ring} font-black text-slate-900 dark:text-white text-sm text-center`}
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                                  تعداد در هر بسته
                                </label>
                                <input
                                  id="picker-ppp-input"
                                  type="number"
                                  min="1"
                                  value={pickPiecesPerPack}
                                  onChange={(e) => handlePickerPiecesPerPackChange(parseInt(e.target.value) || 1)}
                                  className={`w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border ${theme.borderColor} focus:ring-2 ${theme.ring} font-bold text-slate-800 dark:text-slate-200 text-sm text-center`}
                                />
                              </div>

                              <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                                  دانه اضافه (تک)
                                </label>
                                <input
                                  id="picker-extra-input"
                                  type="number"
                                  min="0"
                                  value={pickExtraPieces}
                                  onChange={(e) => handlePickerExtraPiecesChange(parseInt(e.target.value) || 0)}
                                  className={`w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border ${theme.borderColor} focus:ring-2 ${theme.ring} font-bold text-slate-800 dark:text-slate-200 text-sm text-center`}
                                />
                              </div>

                              <div>
                                <label className={`block font-bold ${theme.primaryText} mb-1 text-[11px] flex items-center justify-between`}>
                                  <span>تعداد کل (دانه/عدد)</span>
                                  <Sparkles className={`w-3 h-3 ${theme.activeIcon}`} />
                                </label>
                                <input
                                  id="picker-total-pieces-carton-mode-input"
                                  type="number"
                                  min="0"
                                  value={pickTotalPieces}
                                  onChange={(e) => handlePickerTotalPiecesChange(parseInt(e.target.value) || 0)}
                                  className={`w-full px-2.5 py-2 rounded-xl ${theme.badgeBg} border-2 ${theme.borderColor} focus:ring-2 ${theme.ring} font-black ${theme.primaryText} text-sm text-center shadow-xs`}
                                  title="خودکار بر اساس کارتن × ساختار بسته محاسبه می‌شود"
                                />
                              </div>
                            </div>
                          )}

                          {/* Live Calculated Price & Summary Card */}
                          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-2">
                                <Calculator className={`w-4 h-4 ${theme.activeIcon} shrink-0`} />
                                <span>خلاصه محاسبات و مبلغ کل این کالا:</span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                {!isUnpack && pickCartons > 0 
                                  ? `${toPersianDigits(pickCartons)} کارتن${pickExtraPieces > 0 ? ` و ${toPersianDigits(pickExtraPieces)} دانه` : ''} (${toPersianDigits(pickTotalPieces.toLocaleString())} عدد)` 
                                  : `${toPersianDigits(pickTotalPieces.toLocaleString())} ${activePickingProduct.unitTitle || 'عدد'}`}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] text-slate-400 block mb-0.5">قیمت واحد هر عدد:</span>
                                <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                                  {formatPrice(pickSellingPrice)}
                                </span>
                              </div>
                              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                                {isUnpack || activePickerPpc <= 1 ? (
                                  <>
                                    <span className="text-[10px] text-slate-400 block mb-0.5">نوع عرضه:</span>
                                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                                      بدون بسته‌بندی کارتن
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10px] text-slate-400 block mb-0.5">قیمت ۱ کارتن کامل ({toPersianDigits(activePickerPpc)} عدد):</span>
                                    <span className={`font-extrabold ${theme.primaryText} text-sm`}>
                                      {formatPrice(activePickerPpc * pickSellingPrice)}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className={`p-2.5 ${theme.primary} text-white rounded-xl shadow-xs`}>
                                <span className="text-[10px] text-white/80 block mb-0.5 font-bold">مبلغ کل محاسبه شده:</span>
                                <span className="font-black text-lg">
                                  {formatPrice(pickTotalPieces * pickSellingPrice)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Price settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {invoiceType === 'purchase' ? 'قیمت واحد خرید (تومان)' : 'قیمت واحد فروش (تومان)'}
                        </label>
                        <SmartPriceInput
                          id="picker-selling-price-input"
                          value={pickSellingPrice}
                          onChange={(val) => setPickSellingPrice(val)}
                          placeholder="مثال: ۵,۰۰۰ یا ۲.۲"
                          themeColor={settings.themeColor}
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          شرح کالا و مشخصات بسته‌بندی
                        </label>
                        <input
                          type="text"
                          value={customDescription}
                          onChange={(e) => setCustomDescription(e.target.value)}
                          placeholder="مثلاً: ۲۰ بسته ۲۴ عددی (کارتن ۴۸۰ عددی) یا نامشخص"
                          className={`w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-950 border ${theme.borderColor} focus:ring-2 ${theme.ring} text-slate-800 dark:text-slate-200`}
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePickingProduct(null)}
                        className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold cursor-pointer"
                      >
                        انصراف
                      </button>
                      <button
                        id="confirm-add-item-btn"
                        type="button"
                        onClick={handleAddProductToInvoice}
                        className={`px-6 py-2.5 rounded-xl text-white font-black shadow-md flex items-center gap-2 cursor-pointer ${theme.primary} ${theme.primaryHover}`}
                      >
                        <span>افزودن به فاکتور</span>
                        <span className="px-2 py-0.5 bg-black/20 rounded-lg text-xs font-mono font-bold">
                          {formatPrice(pickTotalPieces * pickSellingPrice)}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Restock Dialog Modal */}
      <AnimatePresence>
        {restockProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">شارژ فوری موجودی انبار</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px]">{restockProduct.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRestockProduct(null)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex justify-between font-bold text-slate-600 dark:text-slate-400">
                  <span>موجودی کنونی انبار:</span>
                  <span className={restockProduct.stockPieces <= 0 ? "text-red-600 dark:text-red-400 font-extrabold" : "text-emerald-600 font-extrabold"}>
                    {toPersianDigits(restockProduct.stockPieces.toLocaleString())} عدد ({toPersianDigits(Math.floor(restockProduct.stockPieces / (restockProduct.piecesPerCarton || 1)))} کارتن)
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-extrabold text-slate-800 dark:text-slate-200 mb-1">
                    تعداد کارتن جهت افزودن به انبار:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={restockCartons}
                      onChange={(e) => setRestockCartons(Math.max(0, parseInt(e.target.value) || 0))}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-black text-base text-center focus:ring-2 ${theme.ring} focus:outline-none text-slate-900 dark:text-white`}
                    />
                    <span className="font-bold text-slate-500 shrink-0 text-xs">کارتن ({toPersianDigits(restockProduct.piecesPerCarton || 480)} عددی)</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                    تعداد دانه تک (در صورت نیاز علاوه بر کارتن):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={restockExtraPieces}
                    onChange={(e) => setRestockExtraPieces(Math.max(0, parseInt(e.target.value) || 0))}
                    className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-center focus:ring-2 ${theme.ring} focus:outline-none text-slate-900 dark:text-white`}
                  />
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <span>موجودی جدید پس از شارژ:</span>
                  <span className="font-black text-sm">
                    {toPersianDigits((restockProduct.stockPieces + (restockCartons * (restockProduct.piecesPerCarton || 1)) + restockExtraPieces).toLocaleString())} عدد
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestock}
                  className={`px-5 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black shadow-md flex items-center gap-1.5 cursor-pointer`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ثبت شارژ و افزایش موجودی</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Add New Product Modal Dialog using Professional ProductFormModal */}
      <ProductFormModal
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        onSaveProduct={(newProd) => {
          onAddProduct?.(newProd);
          onShowAlert?.(`کالای «${newProd.name}» با موفقیت به انبار افزوده شد و آماده درج در فاکتور است.`, 'success', 'ثبت کالا');
          setIsNewProductModalOpen(false);
          openProductCustomizer(newProd);
        }}
        products={products}
        settings={settings}
        customCategories={categories.filter(c => c !== 'all')}
        onShowAlert={onShowAlert}
        title="تعریف و ثبت کالای جدید در انبار"
        subtitle="پس از ثبت مشخصات، کالا بلافاصله به انبار اضافه شده و جهت درج در فاکتور انتخاب می‌گردد."
      />

      {/* Inward Product Modal for Purchase Invoices (Add / Inward to Warehouse with intelligent price matching) */}
      <InwardProductModal
        isOpen={isInwardModalOpen}
        onClose={() => setIsInwardModalOpen(false)}
        products={currentProductsList}
        settings={settings}
        isSecretMode={isSecretMode}
        themeColor={settings?.themeColor || 'teal'}
        onAddInwardItem={handleAddInwardItem}
        onUpdateProduct={onUpdateProduct}
        onShowAlert={onShowAlert}
        liquidityBalances={liquidityBalances}
        supplierName={customerName}
        supplierBalance={supplierCurrentBalance}
        currentInvoiceSubtotal={subtotal}
        currentItemsCount={items.length}
      />

      {/* Modal for Detailed Item Editing (ویرایش حرفه‌ای و کامل مشخصات ردیف فاکتور) */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden my-auto"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    <Pencil className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                        ویرایش مشخصات ردیف فاکتور
                      </h3>
                      <span className={`px-2 py-0.5 rounded-md ${theme.badgeBg} ${theme.badgeText} text-[10px] font-black border ${theme.borderColor}`}>
                        {invoiceType === 'purchase' ? 'فاکتور خرید' : 'فاکتور فروش'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-bold">
                      «{editingItem.productName}»
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  title="بستن پنجره"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
                {/* 1. Basic Product Info Card */}
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <Boxes className={`w-4 h-4 ${theme.primaryText}`} />
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                      مشخصات پایه و عنوان کالا
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        عنوان / شرح کالا <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editingItem.productName}
                        onChange={(e) => setEditingItem({ ...editingItem, productName: e.target.value })}
                        placeholder="نام کامل کالا..."
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-xs focus:ring-2 ${theme.ring} focus:outline-none`}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        دسته‌بندی کالا
                      </label>
                      <input
                        type="text"
                        list="edit-item-categories-list"
                        value={(editingItem as any).category || (products.find(p => p.id === editingItem.productId)?.category) || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value } as any)}
                        placeholder="دسته‌بندی..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-bold text-slate-900 dark:text-white text-xs focus:outline-none"
                      />
                      <datalist id="edit-item-categories-list">
                        {categories.filter(c => c !== 'all').map(c => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        واحد شمارش
                      </label>
                      <input
                        type="text"
                        value={editingItem.unitTitle || 'عدد'}
                        onChange={(e) => setEditingItem({ ...editingItem, unitTitle: e.target.value })}
                        placeholder="عدد / کارتن / بسته..."
                        className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-bold text-slate-900 dark:text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Packaging Formula & Breakdown Card */}
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Package className={`w-4 h-4 ${theme.primaryText}`} />
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                        ساختار کارتن، بسته‌بندی و مقادیر
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                      ۱ کارتن = {toPersianDigits(editingItem.piecesPerCarton || ((editingItem.packsCount || 1) * (editingItem.piecesPerPack || 1)))} {editingItem.unitTitle || 'عدد'}
                    </span>
                  </div>

                  {/* Mode Selector for Unknown Carton / Loose Goods */}
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isUnknownCartonMode}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsUnknownCartonMode(checked);
                          const ppc = editingItem.piecesPerCarton || ((editingItem.packsCount || 1) * (editingItem.piecesPerPack || 1)) || 1;
                          if (checked) {
                            // Total pieces is the base driver!
                            const c = ppc > 0 ? Math.floor(editingItem.totalPieces / ppc) : 0;
                            const extra = ppc > 0 ? editingItem.totalPieces % ppc : 0;
                            setEditingItem({
                              ...editingItem,
                              cartonsCount: c,
                              extraPieces: extra,
                            });
                          }
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        تعداد کارتن نامشخص یا فاقد بسته‌بندی کارتنی (مبنای ورود: تعداد کل دانه)
                      </span>
                    </label>
                    {isUnknownCartonMode ? (
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        تعداد کل ثابت می‌ماند و کارتن‌ها محاسبه می‌شوند
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        محاسبه مستقیم بر اساس تعداد کارتن × دانه
                      </span>
                    )}
                  </div>

                  {/* Packaging Formula Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        بسته در هر کارتن
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingItem.packsCount || 1}
                        onChange={(e) => {
                          const p = Math.max(1, parseInt(e.target.value) || 1);
                          let ppp = editingItem.piecesPerPack || 1;
                          let newPpc = editingItem.piecesPerCarton || 1;

                          if (p > 1 && ppp > 1) {
                            newPpc = p * ppp;
                          }

                          const preserveTotal = isUnknownCartonMode || editingItem.cartonsCount === 0 || editingItem.cartonsCount === editingItem.totalPieces;
                          let newTotal = editingItem.totalPieces;
                          let newCartons = editingItem.cartonsCount;
                          let newExtra = editingItem.extraPieces;

                          if (preserveTotal) {
                            newCartons = newPpc > 0 ? Math.floor(newTotal / newPpc) : 0;
                            newExtra = newPpc > 0 ? newTotal % newPpc : 0;
                          } else {
                            newTotal = (newCartons * newPpc) + newExtra;
                          }

                          setEditingItem({
                            ...editingItem,
                            packsCount: p,
                            piecesPerPack: ppp,
                            piecesPerCarton: newPpc,
                            cartonsCount: newCartons,
                            extraPieces: newExtra,
                            totalPieces: newTotal,
                          });
                        }}
                        className="w-full px-2.5 py-2 text-center font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        دانه در هر بسته
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingItem.piecesPerPack || 1}
                        onChange={(e) => {
                          const ppp = Math.max(1, parseInt(e.target.value) || 1);
                          let p = editingItem.packsCount || 1;
                          let newPpc = editingItem.piecesPerCarton || 1;

                          if (p > 1 && ppp > 1) {
                            newPpc = p * ppp;
                          }

                          const preserveTotal = isUnknownCartonMode || editingItem.cartonsCount === 0 || editingItem.cartonsCount === editingItem.totalPieces;
                          let newTotal = editingItem.totalPieces;
                          let newCartons = editingItem.cartonsCount;
                          let newExtra = editingItem.extraPieces;

                          if (preserveTotal) {
                            newCartons = newPpc > 0 ? Math.floor(newTotal / newPpc) : 0;
                            newExtra = newPpc > 0 ? newTotal % newPpc : 0;
                          } else {
                            newTotal = (newCartons * newPpc) + newExtra;
                          }

                          setEditingItem({
                            ...editingItem,
                            packsCount: p,
                            piecesPerPack: ppp,
                            piecesPerCarton: newPpc,
                            cartonsCount: newCartons,
                            extraPieces: newExtra,
                            totalPieces: newTotal,
                          });
                        }}
                        className="w-full px-2.5 py-2 text-center font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        کل دانه در ۱ کارتن
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={editingItem.piecesPerCarton || 1}
                        onChange={(e) => {
                          const newPpc = Math.max(1, parseInt(e.target.value) || 1);
                          let p = editingItem.packsCount || 1;
                          let ppp = editingItem.piecesPerPack || 1;

                          // Never overwrite p (packsCount) or ppp (piecesPerPack) when newPpc changes!
                          // When user inputs packs=1, ppp=1, and piecesPerCarton=400, keep packs=1 and ppp=1!

                          const preserveTotal = isUnknownCartonMode || editingItem.cartonsCount === 0 || editingItem.cartonsCount === editingItem.totalPieces;
                          let newTotal = editingItem.totalPieces;
                          let newCartons = editingItem.cartonsCount;
                          let newExtra = editingItem.extraPieces;

                          if (preserveTotal) {
                            newCartons = newPpc > 0 ? Math.floor(newTotal / newPpc) : 0;
                            newExtra = newPpc > 0 ? newTotal % newPpc : 0;
                          } else {
                            newTotal = (newCartons * newPpc) + newExtra;
                          }

                          setEditingItem({
                            ...editingItem,
                            packsCount: p,
                            piecesPerPack: ppp,
                            piecesPerCarton: newPpc,
                            cartonsCount: newCartons,
                            extraPieces: newExtra,
                            totalPieces: newTotal,
                          });
                        }}
                        className="w-full px-2.5 py-2 text-center font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Quantities Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                          تعداد کارتن
                        </label>
                        {isUnknownCartonMode && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            محاسبه‌شده
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editingItem.cartonsCount}
                        onChange={(e) => {
                          const c = Math.max(0, parseInt(e.target.value) || 0);
                          const ppc = editingItem.piecesPerCarton || 1;
                          const extra = editingItem.extraPieces || 0;
                          const tot = (c * ppc) + extra;
                          setEditingItem({ ...editingItem, cartonsCount: c, totalPieces: tot });
                        }}
                        className={`w-full px-3 py-2 text-center font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 ${theme.ring} focus:outline-none`}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                        دانه اضافی (تک)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingItem.extraPieces || 0}
                        onChange={(e) => {
                          const extra = Math.max(0, parseInt(e.target.value) || 0);
                          const c = editingItem.cartonsCount || 0;
                          const ppc = editingItem.piecesPerCarton || 1;
                          const tot = (c * ppc) + extra;
                          setEditingItem({ ...editingItem, extraPieces: extra, totalPieces: tot });
                        }}
                        className="w-full px-3 py-2 text-center font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                          تعداد کل ({editingItem.unitTitle || 'عدد'}) <span className="text-rose-500">*</span>
                        </label>
                        {isUnknownCartonMode && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            مبنای اصلی
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={editingItem.totalPieces}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          const ppc = editingItem.piecesPerCarton || 1;
                          const cartons = ppc > 0 ? Math.floor(val / ppc) : 0;
                          const extra = ppc > 0 ? val % ppc : 0;
                          setEditingItem({
                            ...editingItem,
                            totalPieces: val,
                            cartonsCount: cartons,
                            extraPieces: extra,
                          });
                        }}
                        className={`w-full px-3 py-2 text-center font-black ${theme.primaryText} bg-white dark:bg-slate-900 border ${isUnknownCartonMode ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-400/20' : 'border-slate-200 dark:border-slate-800'} rounded-xl text-sm focus:ring-2 ${theme.ring} focus:outline-none`}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Pricing & Margins Card */}
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Banknote className={`w-4 h-4 ${theme.primaryText}`} />
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                        قیمت‌گذاری و بهای واحد ردیف
                      </span>
                    </div>

                    {/* Margin Badge */}
                    {(() => {
                      const uSell = editingItem.unitSellingPrice || 0;
                      const uPur = editingItem.unitPurchasePrice || 0;
                      if (uPur > 0 && uSell > 0) {
                        const marginPercent = ((uSell - uPur) / uPur) * 100;
                        const isProfit = marginPercent >= 0;
                        return (
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isProfit 
                              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                              : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}>
                            حاشیه سود: {isProfit ? '+' : ''}{toPersianDigits(marginPercent.toFixed(1))}%
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        قیمت واحد خرید هر {editingItem.unitTitle || 'دانه'} (تومان)
                      </label>
                      <SmartPriceInput
                        value={editingItem.unitPurchasePrice || 0}
                        onChange={(val) => setEditingItem({ ...editingItem, unitPurchasePrice: val })}
                        placeholder="قیمت خرید"
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-xs focus:ring-2 ${theme.ring} focus:outline-none`}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        قیمت واحد فروش هر {editingItem.unitTitle || 'دانه'} (تومان)
                      </label>
                      <SmartPriceInput
                        value={editingItem.unitSellingPrice}
                        onChange={(val) => setEditingItem({ ...editingItem, unitSellingPrice: val })}
                        placeholder="قیمت فروش"
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white text-xs focus:ring-2 ${theme.ring} focus:outline-none`}
                      />
                    </div>
                  </div>

                  {/* Carton price breakdown preview */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">بهای ۱ کارتن خرید:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                        {formatPrice((editingItem.unitPurchasePrice || 0) * (editingItem.piecesPerCarton || 1))}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">بهای ۱ کارتن فروش:</span>
                      <span className={`font-black ${theme.primaryText} font-mono`}>
                        {formatPrice((editingItem.unitSellingPrice || 0) * (editingItem.piecesPerCarton || 1))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Custom Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      شرح کالا و مشخصات بسته‌بندی
                    </label>
                    <span className="text-[10px] text-slate-500 font-normal">
                      بسته‌بندی فعلی: {formatProductPackagingSpec(editingItem) || 'نامشخص'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editingItem.customDescription || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, customDescription: e.target.value })}
                    placeholder="مثلاً: ۲۰ بسته ۲۴ عددی (کارتن ۴۸۰ عددی) یا نامشخص"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-slate-400 focus:outline-none"
                  />
                </div>

                {/* 5. Live Financial Summary Card */}
                {(() => {
                  const uPrice = invoiceType === 'purchase'
                    ? ((editingItem.unitPurchasePrice && editingItem.unitPurchasePrice > 0) ? editingItem.unitPurchasePrice : (editingItem.unitSellingPrice || 0))
                    : (editingItem.unitSellingPrice || 0);
                  const rowSubtotal = editingItem.totalPieces * uPrice;
                  const rowProfit = (editingItem.unitSellingPrice - (editingItem.unitPurchasePrice || 0)) * editingItem.totalPieces;

                  return (
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                      <div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">
                          تعداد کل:
                        </span>
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {toPersianDigits(editingItem.totalPieces.toLocaleString())} {editingItem.unitTitle || 'عدد'}
                          {editingItem.piecesPerCarton && editingItem.piecesPerCarton > 1 ? (
                            <span className="text-xs text-slate-500 mr-1.5 font-normal">
                              ({formatCartonText(editingItem.totalPieces, editingItem.piecesPerCarton)})
                            </span>
                          ) : (
                            editingItem.cartonsCount > 0 && (
                              <span className="text-xs text-slate-500 mr-1.5 font-normal">
                                ({toPersianDigits(editingItem.cartonsCount)} کارتن {editingItem.extraPieces > 0 ? `و ${toPersianDigits(editingItem.extraPieces)} دانه` : ''})
                              </span>
                            )
                          )}
                        </span>
                      </div>

                      <div className="text-left dir-ltr">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5 dir-rtl">
                          مبلغ کل این ردیف ({invoiceType === 'purchase' ? 'بهای خرید' : 'بهای فروش'}):
                        </span>
                        <span className={`font-black ${theme.primaryText} text-base sm:text-lg font-mono`}>
                          {formatPrice(rowSubtotal)}
                        </span>
                        <div className="text-[10px] text-slate-400 dir-rtl mt-0.5">
                          محاسبه: {toPersianDigits(editingItem.totalPieces.toLocaleString())} × {formatPrice(uPrice)}
                        </div>
                        {invoiceType === 'sale' && rowProfit !== 0 && (
                          <div className={`text-[10px] font-bold dir-rtl mt-0.5 ${rowProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {rowProfit > 0 ? 'سود ناخالص ردیف: ' : 'زیان ناخالص ردیف: '}
                            {rowProfit > 0 ? `+${formatPrice(rowProfit)}` : `-${formatPrice(Math.abs(rowProfit))}`}
                            <span className="mr-1 opacity-90 font-sans">
                              ({formatAmountScale(Math.abs(rowProfit))})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingItem) {
                      const newName = editingItem.productName?.trim() || '';
                      const newCat = (editingItem as any).category;
                      const calculatedPacks = Number(editingItem.packsCount) > 0 ? Number(editingItem.packsCount) : 1;
                      const ppp = Number(editingItem.piecesPerPack) > 0 ? Number(editingItem.piecesPerPack) : 1;
                      const ppc = Number(editingItem.piecesPerCarton) > 0 ? Number(editingItem.piecesPerCarton) : (calculatedPacks * ppp);
                      const unitTitle = editingItem.unitTitle?.trim() || 'عدد';
                      const purchasePrice = Number(editingItem.unitPurchasePrice || 0);
                      const sellingPrice = Number(editingItem.unitSellingPrice || 0);

                      // 1. Locate master product in products catalog or pending new products
                      const targetProduct = currentProductsList.find(p => 
                        (editingItem.productId && p.id === editingItem.productId) ||
                        (editingOriginalMeta.productId && p.id === editingOriginalMeta.productId) ||
                        (editingOriginalMeta.name && p.name && p.name.trim().toLowerCase() === editingOriginalMeta.name.trim().toLowerCase()) ||
                        (newName && p.name && p.name.trim().toLowerCase() === newName.trim().toLowerCase())
                      );

                      const effectiveProdId = targetProduct?.id || editingItem.productId || editingOriginalMeta.productId || `prod-${Date.now()}`;

                      const updatedProd: Product = {
                        ...(targetProduct || {
                          id: effectiveProdId,
                          stockPieces: 0,
                          createdAt: Date.now(),
                        }),
                        id: effectiveProdId,
                        name: newName || targetProduct?.name || 'کالای بدون نام',
                        category: (newCat !== undefined && newCat !== '') ? newCat : (targetProduct?.category || 'متفرقه'),
                        piecesPerCarton: ppc,
                        packsPerCarton: calculatedPacks,
                        piecesPerPack: ppp,
                        unitTitle: unitTitle || targetProduct?.unitTitle || 'عدد',
                        purchasePrice: purchasePrice > 0 ? purchasePrice : (targetProduct?.purchasePrice || 0),
                        sellingPrice: sellingPrice > 0 ? sellingPrice : (targetProduct?.sellingPrice || 0),
                        updatedAt: Date.now()
                      };

                      // Update pending products buffer
                      setPendingNewProducts(prev => {
                        const filtered = prev.filter(p => 
                          p.id !== updatedProd.id && 
                          (!editingOriginalMeta.name || p.name.trim().toLowerCase() !== editingOriginalMeta.name.trim().toLowerCase())
                        );
                        return [...filtered, updatedProd];
                      });

                      // 2. Update this item and all other invoice items sharing this productId or original name
                      setItems(prevItems => prevItems.map(it => {
                        const isThisItem = it.id === editingItem.id;
                        const isSameProduct = (effectiveProdId && it.productId === effectiveProdId) ||
                          (editingOriginalMeta.productId && it.productId === editingOriginalMeta.productId) ||
                          (editingOriginalMeta.name && it.productName && it.productName.trim().toLowerCase() === editingOriginalMeta.name.trim().toLowerCase());

                        if (isThisItem || isSameProduct) {
                          const itemTotalPieces = isThisItem ? editingItem.totalPieces : it.totalPieces;
                          const itemCartons = ppc > 1 ? Math.floor(itemTotalPieces / ppc) : (isThisItem ? editingItem.cartonsCount : it.cartonsCount);
                          const itemExtra = ppc > 1 ? (itemTotalPieces % ppc) : (isThisItem ? editingItem.extraPieces : it.extraPieces);
                          const unitPriceForTotal = invoiceType === 'purchase' ? purchasePrice : sellingPrice;

                          return {
                            ...it,
                            ...(isThisItem ? editingItem : {}),
                            productId: effectiveProdId,
                            productName: newName || it.productName,
                            category: (newCat !== undefined && newCat !== '') ? newCat : (it as any).category,
                            unitTitle,
                            packsCount: calculatedPacks,
                            piecesPerPack: ppp,
                            piecesPerCarton: ppc,
                            cartonsCount: itemCartons,
                            extraPieces: itemExtra,
                            totalPieces: itemTotalPieces,
                            unitPurchasePrice: purchasePrice > 0 ? purchasePrice : it.unitPurchasePrice,
                            unitSellingPrice: sellingPrice > 0 ? sellingPrice : it.unitSellingPrice,
                            totalPrice: unitPriceForTotal > 0 ? itemTotalPieces * unitPriceForTotal : it.totalPrice,
                          };
                        }
                        return it;
                      }));

                      // 3. Product changes are buffered locally in items and pending state, and will commit to warehouse on final invoice save
                      onShowAlert?.(`تغییرات ردیف کالا «${newName || editingItem.productName}» در این فاکتور اعمال شد. (ذخیره قطعی در انبار با ثبت نهایی فاکتور انجام می‌شود).`, 'success', 'ویرایش ردیف فاکتور');
                      setEditingItem(null);
                    }
                  }}
                  className={`px-6 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black shadow-md transition-all cursor-pointer flex items-center gap-2`}
                >
                  <Check className="w-4 h-4" />
                  <span>ذخیره تغییرات ردیف</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
