import React, { useState, useEffect } from 'react';
import { Product, StoreSettings } from '../types';
import { 
  formatPrice, 
  toPersianDigits, 
  formatProductPackagingSpec,
  detectCategoryFromName
} from '../utils/formatters';
import { themes } from './ThemeConfig';
import { CategoryManagerModal } from './CategoryManagerModal';
import { SmartPriceInput } from './SmartPriceInput';
import { CustomValidationMessage } from './CustomValidationMessage';
import { 
  Boxes, 
  Sparkles, 
  Calculator, 
  Layers, 
  X, 
  Save, 
  RotateCcw, 
  Settings2, 
  DollarSign,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct: (product: Product) => void;
  editingProduct?: Product | null;
  products?: Product[];
  settings: StoreSettings;
  customCategories?: string[];
  onAddCategory?: (category: string) => void;
  onEditCategory?: (oldName: string, newName: string) => void;
  onDeleteCategory?: (name: string) => void;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
  title?: string;
  subtitle?: string;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSaveProduct,
  editingProduct = null,
  products = [],
  settings,
  customCategories: initialCategories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onShowAlert,
  title,
  subtitle
}) => {
  const theme = themes[settings.themeColor] || themes.teal;

  // Internal category state fallback if not provided
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    if (initialCategories && initialCategories.length > 0) return initialCategories;
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

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategoriesList(initialCategories);
    }
  }, [initialCategories]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUnpackaged, setIsUnpackaged] = useState(false);
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<string | null>(null);

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
    piecesPerCarton: 480,
    packsPerCarton: 20,
    piecesPerPack: 24,
    leavesPerPiece: 0,
    stockCartons: 0,
    stockPieces: 0,
    unitTitle: 'عدد',
    minOrderCartons: 1,
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Reset or populate form state when modal opens or editingProduct changes
  useEffect(() => {
    if (isOpen) {
      setFormErrors({});
      setAutoDetectedCategory(null);
      if (editingProduct) {
        const unpack = !!(
          editingProduct.isUnpackaged ||
          editingProduct.isCartonUnknown ||
          (editingProduct.piecesPerCarton <= 1 &&
            (editingProduct.packsPerCarton || 0) <= 1 &&
            (editingProduct.piecesPerPack || 0) <= 1)
        );
        setIsUnpackaged(unpack);

        const ppc = editingProduct.piecesPerCarton || 1;
        const cartons = Math.floor(editingProduct.stockPieces / ppc);
        
        const initialPacks = unpack ? 1 : (Number(editingProduct.packsPerCarton) > 0 ? Number(editingProduct.packsPerCarton) : 0);
        const initialPpp = unpack ? 1 : (Number(editingProduct.piecesPerPack) > 0 ? Number(editingProduct.piecesPerPack) : 0);

        setFormData({
          id: editingProduct.id,
          name: editingProduct.name,
          category: editingProduct.category || categoriesList[0] || 'سایر',
          purchasePrice: editingProduct.purchasePrice || 0,
          sellingPrice: editingProduct.sellingPrice || 0,
          piecesPerCarton: editingProduct.piecesPerCarton || (unpack ? 1 : (initialPacks > 0 && initialPpp > 0 ? initialPacks * initialPpp : 480)),
          packsPerCarton: initialPacks,
          piecesPerPack: initialPpp,
          leavesPerPiece: editingProduct.leavesPerPiece || 0,
          stockCartons: unpack ? 0 : cartons,
          stockPieces: editingProduct.stockPieces || 0,
          unitTitle: editingProduct.unitTitle || 'عدد',
          minOrderCartons: editingProduct.minOrderCartons || 1,
          notes: editingProduct.notes || '',
        });
      } else {
        setIsUnpackaged(false);
        const defaultCat = categoriesList[0] || 'لواشک';
        setFormData({
          name: '',
          category: defaultCat,
          purchasePrice: 0,
          sellingPrice: 0,
          piecesPerCarton: 480,
          packsPerCarton: 20,
          piecesPerPack: 24,
          leavesPerPiece: 0,
          stockCartons: 0,
          stockPieces: 0,
          unitTitle: 'عدد',
          minOrderCartons: 1,
          notes: '',
        });
      }
    }
  }, [isOpen, editingProduct]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
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

    const rawPacks = Number(formData.packsPerCarton) || 0;
    const rawPpp = Number(formData.piecesPerPack) || 0;
    let piecesPerCartonCalculated = 1;

    if (isUnpackaged) {
      piecesPerCartonCalculated = 1;
    } else if (rawPacks > 0 && rawPpp > 0) {
      piecesPerCartonCalculated = rawPacks * rawPpp;
    } else {
      piecesPerCartonCalculated = formData.piecesPerCarton > 0 ? formData.piecesPerCarton : 1;
    }

    const savedProduct: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: formData.name.trim(),
      category: formData.category.trim(),
      purchasePrice: Number(formData.purchasePrice) || 0,
      sellingPrice: Number(formData.sellingPrice) || 0,
      piecesPerCarton: piecesPerCartonCalculated,
      packsPerCarton: isUnpackaged ? 1 : rawPacks,
      piecesPerPack: isUnpackaged ? 1 : rawPpp,
      leavesPerPiece: formData.leavesPerPiece || 0,
      stockPieces: Number(formData.stockPieces) || 0,
      unitTitle: formData.unitTitle.trim() || 'عدد',
      minOrderCartons: isUnpackaged ? 1 : (formData.minOrderCartons || 1),
      notes: formData.notes.trim(),
      isUnpackaged: isUnpackaged,
      isCartonUnknown: isUnpackaged,
      createdAt: editingProduct?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    onSaveProduct(savedProduct);
    onClose();
  };

  const handleInternalAddCategory = (name: string) => {
    if (onAddCategory) {
      onAddCategory(name);
    } else {
      setCategoriesList(prev => {
        const next = [...prev, name];
        localStorage.setItem('bazargani_inventory_categories', JSON.stringify(next));
        return next;
      });
    }
    setFormData(prev => ({ ...prev, category: name }));
    onShowAlert?.(`دسته‌بندی «${name}» اضافه شد.`, 'success', 'ثبت دسته‌بندی');
  };

  const handleInternalEditCategory = (oldName: string, newName: string) => {
    if (onEditCategory) {
      onEditCategory(oldName, newName);
    } else {
      setCategoriesList(prev => {
        const next = prev.map(c => c === oldName ? newName : c);
        localStorage.setItem('bazargani_inventory_categories', JSON.stringify(next));
        return next;
      });
    }
    if (formData.category === oldName) {
      setFormData(prev => ({ ...prev, category: newName }));
    }
  };

  const handleInternalDeleteCategory = (name: string) => {
    if (onDeleteCategory) {
      onDeleteCategory(name);
    } else {
      setCategoriesList(prev => {
        const next = prev.filter(c => c !== name);
        localStorage.setItem('bazargani_inventory_categories', JSON.stringify(next));
        return next;
      });
    }
    if (formData.category === name) {
      setFormData(prev => ({ ...prev, category: 'سایر' }));
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-xs my-auto"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${theme.badgeBg} ${theme.primaryText}`}>
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    {title || (editingProduct ? 'ویرایش شناسنامه کالا در انبار' : 'افزودن کالای جدید به انبار')}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${theme.badgeBg} ${theme.badgeText}`}>
                    {editingProduct ? 'کد SKU: ' + editingProduct.id.slice(0, 6) : 'جدید'}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
                  {subtitle || 'تنظیم مشخصات کالا، بسته‌بندی، ماشین‌حساب ۱ کارتن و سوددهی فروش'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form noValidate onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            
            {/* 1. SECTION: General Info */}
            <div className="bg-slate-50/80 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <div className="font-black text-slate-900 dark:text-white text-xs flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-lg ${theme.primary} text-white flex items-center justify-center text-[10px] font-black`}>۱</span>
                  <span>مشخصات اصلی و دسته‌بندی کالا</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">فیلدهای ستاره‌دار الزامی است</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Product Name */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام کامل کالا <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                      const detected = detectCategoryFromName(newName, categoriesList);
                      if (detected) {
                        setAutoDetectedCategory(detected);
                        setFormData(prev => ({
                          ...prev,
                          name: newName,
                          category: detected
                        }));
                      } else {
                        setFormData(prev => ({ ...prev, name: newName }));
                      }
                    }}
                    placeholder="مثلاً: لواشک نوشابه‌ای، شکلات تلخ..."
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-slate-900 dark:text-white focus:outline-none focus:ring-2 font-bold text-xs shadow-2xs ${
                      formErrors.name
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : `border-slate-200 dark:border-slate-800 ${theme.ring}`
                    }`}
                  />
                  {autoDetectedCategory && formData.category === autoDetectedCategory && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/80">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                      <span>دسته‌بندی هوشمند: «<b>{autoDetectedCategory}</b>» خودکار انتخاب شد</span>
                    </div>
                  )}
                  <CustomValidationMessage message={formErrors.name} />
                </div>

                {/* Category Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      دسته‌بندی کالا <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className={`text-[11px] font-black ${theme.primaryText} hover:underline flex items-center gap-1 cursor-pointer`}
                      title="مدیریت و ویرایش دسته‌بندی‌ها"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>مدیریت دسته‌ها</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <select
                      value={categoriesList.includes(formData.category) ? formData.category : 'custom'}
                      onChange={(e) => {
                        if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
                        if (e.target.value === '__manage__') {
                          setIsCategoryModalOpen(true);
                        } else if (e.target.value === 'custom') {
                          setFormData({ ...formData, category: '' });
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-slate-900 dark:text-white focus:outline-none focus:ring-2 font-bold text-xs shadow-2xs ${
                        formErrors.category
                          ? 'border-rose-500 ring-2 ring-rose-500/20'
                          : `border-slate-200 dark:border-slate-800 ${theme.ring}`
                      }`}
                    >
                      {categoriesList.map((cat, idx) => (
                        <option key={`opt-cat-${cat}-${idx}`} value={cat}>{cat}</option>
                      ))}
                      <option value="custom">✍️ سایر / ورود نام دسته‌بندی دلخواه...</option>
                      <option value="__manage__">⚙️ + مدیریت و افزودن دسته جدید...</option>
                    </select>

                    {/* Custom Category Name Input - only shown if 'custom' or manual category selected */}
                    {(!categoriesList.includes(formData.category) || formData.category === '') && (
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => {
                          setFormData({ ...formData, category: e.target.value });
                          if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
                        }}
                        placeholder="نام دسته‌بندی جدید را وارد کنید..."
                        className={`w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border text-slate-900 dark:text-white focus:outline-none focus:ring-2 font-bold text-xs shadow-2xs ${
                          formErrors.category
                            ? 'border-rose-500 ring-2 ring-rose-500/20'
                            : `border-slate-200 dark:border-slate-800 ${theme.ring}`
                        }`}
                      />
                    )}
                    <CustomValidationMessage message={formErrors.category} />
                  </div>
                </div>
              </div>

              {/* Unit and Optional Leaves */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    واحد اندازه‌گیری (واحد فروش)
                  </label>
                  <input
                    type="text"
                    value={formData.unitTitle}
                    onChange={(e) => setFormData({ ...formData, unitTitle: e.target.value })}
                    placeholder="عدد / بسته / کیلو"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    تعداد برگی / متری (اختیاری)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.leavesPerPiece || ''}
                    onChange={(e) => setFormData({ ...formData, leavesPerPiece: parseInt(e.target.value) || 0 })}
                    placeholder="مثلاً ۶ برگی"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 2. SECTION: Packaging & 1-Carton Calculator */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                <div className="font-black text-slate-900 dark:text-white text-xs flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-lg ${theme.primary} text-white flex items-center justify-center text-[10px] font-black`}>۲</span>
                  <Calculator className={`w-4 h-4 ${theme.primaryText}`} />
                  <span>ساختار بسته‌بندی و تعداد در ۱ کارتن:</span>
                </div>
                {isUnpackaged && (
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-black border border-indigo-200 dark:border-indigo-800">
                    📦 تعداد کارتن: نامشخص (بدون بسته‌بندی)
                  </span>
                )}
              </div>

              {/* No Packaging / Unknown Carton Checkbox */}
              <label 
                id="toggle-unpackaged-product-form"
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isUnpackaged 
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800' 
                    : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <input
                  type="checkbox"
                  id="chk-no-packaging-product"
                  checked={isUnpackaged}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsUnpackaged(checked);
                    if (checked) {
                      setFormData(prev => ({
                        ...prev,
                        packsPerCarton: 1,
                        piecesPerPack: 1,
                        piecesPerCarton: 1,
                        stockPieces: prev.stockPieces > 0 ? prev.stockPieces : (prev.stockCartons * prev.piecesPerCarton)
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        packsPerCarton: 20,
                        piecesPerPack: 24,
                        piecesPerCarton: 480,
                        stockCartons: prev.stockPieces > 0 ? Math.floor(prev.stockPieces / 480) : 0
                      }));
                    }
                  }}
                  className="w-4 h-4 mt-0.5 rounded text-teal-600 focus:ring-0 cursor-pointer accent-teal-600 shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-slate-900 dark:text-white">
                      کالای بدون بسته‌بندی یا کارتن نامشخص (فروش دانه‌ای، فله یا کیلویی)
                    </span>
                    {isUnpackaged && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black shadow-2xs">
                        تعداد کارتن: نامشخص
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    اگر این کالا بسته‌بندی کارتن ندارد یا تعداد کارتن نامشخص است، تیک بزنید تا تعداد کارتن نامشخص ثبت شده و شمارش و موجودی کالا بر اساس دانه/واحد باشد.
                  </p>
                </div>
              </label>

              {!isUnpackaged ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Packs per Carton */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1">
                        تعداد بسته در ۱ کارتن
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.packsPerCarton || ''}
                        onChange={(e) => {
                          const packs = Math.max(0, parseInt(e.target.value) || 0);
                          const ppp = formData.piecesPerPack || 0;
                          const calculatedPerCarton = packs > 0 && ppp > 0 ? (packs * ppp) : (packs > 0 ? packs : formData.piecesPerCarton);
                          setFormData(prev => ({
                            ...prev,
                            packsPerCarton: packs,
                            piecesPerCarton: calculatedPerCarton > 0 ? calculatedPerCarton : prev.piecesPerCarton,
                            stockPieces: prev.stockCartons * (calculatedPerCarton > 0 ? calculatedPerCarton : prev.piecesPerCarton)
                          }));
                        }}
                        placeholder="مثلاً ۴ یا ۲۰"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-black text-center shadow-2xs text-sm"
                      />
                    </div>

                    {/* Pieces per Pack */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 text-xs mb-1">
                        تعداد دانه در هر بسته
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.piecesPerPack || ''}
                        onChange={(e) => {
                          const ppp = Math.max(0, parseInt(e.target.value) || 0);
                          const packs = formData.packsPerCarton || 0;
                          const calculatedPerCarton = packs > 0 && ppp > 0 ? (packs * ppp) : (ppp > 0 ? ppp : formData.piecesPerCarton);
                          setFormData(prev => ({
                            ...prev,
                            piecesPerPack: ppp,
                            piecesPerCarton: calculatedPerCarton > 0 ? calculatedPerCarton : prev.piecesPerCarton,
                            stockPieces: prev.stockCartons * (calculatedPerCarton > 0 ? calculatedPerCarton : prev.piecesPerCarton)
                          }));
                        }}
                        placeholder="مثلاً ۲۰۰ یا ۲۴"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-black text-center shadow-2xs text-sm"
                      />
                    </div>

                    {/* Total Pieces per 1 Carton */}
                    <div>
                      <label className={`block font-black ${theme.primaryText} text-xs mb-1`}>
                        تعداد کل دانه در ۱ کارتن <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.piecesPerCarton}
                        onChange={(e) => {
                          const totalPerCarton = Math.max(1, parseInt(e.target.value) || 1);
                          const packs = formData.packsPerCarton || 0;
                          const ppp = formData.piecesPerPack || 0;
                          setFormData(prev => ({
                            ...prev,
                            piecesPerCarton: totalPerCarton,
                            packsPerCarton: (packs > 0 && ppp > 0 && packs * ppp === totalPerCarton) ? packs : prev.packsPerCarton,
                            piecesPerPack: (packs > 0 && ppp > 0 && packs * ppp === totalPerCarton) ? ppp : prev.piecesPerPack,
                            stockPieces: prev.stockCartons * totalPerCarton
                          }));
                        }}
                        placeholder="مثلاً ۴۸۰ یا ۱۰۰۰"
                        className={`w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 font-black ${theme.primaryText} text-center shadow-2xs text-base`}
                        style={{ borderColor: theme.hex }}
                      />
                    </div>
                  </div>

                  {/* Calculator Result Box */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800 text-xs leading-relaxed text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <div className="font-extrabold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>فرمول محاسباتی:</span>
                    </div>
                    <div className="text-[11px] font-black text-slate-800 dark:text-slate-200">
                      {(formData.packsPerCarton || 0) > 1 && (formData.piecesPerPack || 0) > 1 ? (
                        <>۱ کارتن = <span className="underline">{toPersianDigits(formData.packsPerCarton || 1)} بسته</span> {toPersianDigits(formData.piecesPerPack || 1)} عددی = <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{toPersianDigits(formData.piecesPerCarton)} عدد</span></>
                      ) : (
                        <>۱ کارتن = <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{toPersianDigits(formData.piecesPerCarton)} عدد</span> مستقیم (بدون زیربسته)</>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>کالای بدون بسته‌بندی کارتن (فروش تک عددی / فله)</span>
                  </span>
                  <span className="font-black text-indigo-700 dark:text-indigo-300">
                    تعداد کارتن: نامشخص
                  </span>
                </div>
              )}
            </div>

            {/* 3. SECTION: Stock & Pricing */}
            <div className="p-4 bg-slate-50/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                <div className="font-black text-slate-900 dark:text-white text-xs flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-lg ${theme.primary} text-white flex items-center justify-center text-[10px] font-black`}>۳</span>
                  <Layers className={`w-4 h-4 ${theme.primaryText}`} />
                  <span>موجودی انبار، قیمت‌ها و هوش مالی کالا</span>
                </div>

                {/* Zero Stock Button */}
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      stockCartons: 0,
                      stockPieces: 0
                    }));
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-xs ${
                    formData.stockPieces === 0
                      ? 'bg-rose-600 text-white shadow-rose-500/20'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                  }`}
                  title="صفر کردن موجودی این کالا"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{formData.stockPieces === 0 ? 'موجودی صفر است ✓' : 'صفر کردن موجودی'}</span>
                </button>
              </div>

              {/* Stock Input & Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    تعداد کارتن موجود در انبار
                  </label>
                  {isUnpackaged ? (
                    <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-center text-xs flex items-center justify-center gap-1">
                      <span>نامشخص (بدون کارتن)</span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      value={formData.stockCartons}
                      onChange={(e) => {
                        const cartons = Math.max(0, parseInt(e.target.value) || 0);
                        setFormData(prev => ({
                          ...prev,
                          stockCartons: cartons,
                          stockPieces: cartons * prev.piecesPerCarton
                        }));
                      }}
                      placeholder="۴"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 text-slate-900 dark:text-white font-black text-center text-base shadow-xs"
                      style={{ borderColor: formData.stockCartons === 0 ? '#f43f5e' : theme.hex }}
                    />
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    {isUnpackaged ? `موجودی کل (${formData.unitTitle || 'عدد'}) *` : 'تعداد کل دانه در انبار (محاسبه خودکار)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockPieces}
                    onChange={(e) => {
                      const totalPieces = Math.max(0, parseInt(e.target.value) || 0);
                      const ppc = isUnpackaged ? 1 : (formData.piecesPerCarton || 1);
                      setFormData({ 
                        ...formData, 
                        stockPieces: totalPieces,
                        stockCartons: isUnpackaged ? 0 : Math.floor(totalPieces / ppc)
                      });
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 font-black text-center text-base ${theme.primaryText}`}
                    style={{ borderColor: formData.stockPieces === 0 ? '#f43f5e' : theme.hex }}
                  />
                </div>
              </div>

              {/* Quick stock presets bar */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {isUnpackaged ? 'تنظیم سریع موجودی:' : 'تنظیم سریع کارتن:'}
                </span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, stockCartons: 0, stockPieces: 0 }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                    formData.stockPieces === 0
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <span>۰ (ناموجود)</span>
                </button>
                {isUnpackaged ? (
                  [10, 50, 100, 200, 500, 1000].map(pieces => {
                    const isSelected = formData.stockPieces === pieces;
                    return (
                      <button
                        key={`quick-pieces-${pieces}`}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, stockPieces: pieces, stockCartons: 0 }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? `${theme.primary} text-white shadow-xs font-black`
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {toPersianDigits(pieces)} {formData.unitTitle || 'عدد'}
                      </button>
                    );
                  })
                ) : (
                  [1, 2, 5, 10, 20, 50, 100].map(cartons => {
                    const ppc = formData.piecesPerCarton || 1;
                    const pieces = cartons * ppc;
                    const isSelected = formData.stockCartons === cartons && formData.stockPieces === pieces;
                    return (
                      <button
                        key={`quick-cartons-${cartons}`}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, stockCartons: cartons, stockPieces: cartons * prev.piecesPerCarton }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? `${theme.primary} text-white shadow-xs font-black`
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {toPersianDigits(cartons)} کارتن
                      </button>
                    );
                  })
                )}
              </div>

              {/* Selling & Purchase Prices */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className={`block font-bold ${theme.primaryText} mb-1`}>
                    قیمت فروش پیش‌فرض (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <SmartPriceInput
                    value={formData.sellingPrice}
                    onChange={(val) => setFormData({ ...formData, sellingPrice: val })}
                    placeholder="مثال: ۶,۵۰۰ یا ۲.۲"
                    themeColor={settings.themeColor}
                  />
                  <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                    فروش هر کارتن: {toPersianDigits(((formData.sellingPrice || 0) * (formData.piecesPerCarton || 1)).toLocaleString())} تومان
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-amber-800 dark:text-amber-400 mb-1">
                    قیمت خرید هر دانه (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <SmartPriceInput
                    value={formData.purchasePrice}
                    onChange={(val) => setFormData({ ...formData, purchasePrice: val })}
                    placeholder="مثال: ۵,۰۰۰ یا ۲.۲"
                    themeColor={settings.themeColor}
                  />
                  <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-1">
                    خرید هر کارتن: {toPersianDigits(((formData.purchasePrice || 0) * (formData.piecesPerCarton || 1)).toLocaleString())} تومان
                  </div>
                </div>
              </div>

              {/* Financial Intelligence Badge (Profit Margin & Valuation) */}
              {formData.sellingPrice > 0 && formData.purchasePrice > 0 && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 rounded-2xl border border-emerald-500/20 dark:border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-black text-emerald-800 dark:text-emerald-300 text-xs">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>تحلیل سودآوری و ارزش کالا:</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px]">
                      سوددهی مثبت ✓
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80">
                      <span className="text-[10px] text-slate-400 font-bold block">سود هر کارتن</span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400 text-xs">
                        {toPersianDigits((((formData.sellingPrice - formData.purchasePrice) * formData.piecesPerCarton) || 0).toLocaleString())} تومان
                      </span>
                    </div>

                    <div className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80">
                      <span className="text-[10px] text-slate-400 font-bold block">درصد سود</span>
                      <span className="font-black text-emerald-700 dark:text-emerald-400 text-xs">
                        +{toPersianDigits((((formData.sellingPrice - formData.purchasePrice) / (formData.purchasePrice || 1)) * 100).toFixed(1))}٪
                      </span>
                    </div>

                    <div className="p-2 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80">
                      <span className="text-[10px] text-slate-400 font-bold block">ارزش انبار این کالا</span>
                      <span className="font-black text-slate-900 dark:text-white text-xs">
                        {toPersianDigits(((formData.stockPieces || 0) * (formData.sellingPrice || 0)).toLocaleString())} تومان
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes / Description */}
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                  توضیحات و یادداشت محصول (در فاکتور هم قابل نمایش است)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="مثلاً: ۲۰ بسته ۲۴ عددی در هر کارتن (۴۸۰ عدد) - انبار اصلی"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${theme.ring}`}
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
              >
                انصراف
              </button>

              <button
                type="submit"
                className={`px-6 py-2.5 rounded-2xl ${theme.primary} hover:opacity-95 text-white font-black cursor-pointer shadow-lg transition-all flex items-center gap-2 active:scale-95`}
              >
                <Save className="w-4 h-4" />
                <span>{editingProduct ? 'ذخیره تغییرات شناسنامه کالا' : 'ثبت و تعریف کالای جدید'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categoriesList}
        products={products}
        onAddCategory={handleInternalAddCategory}
        onEditCategory={handleInternalEditCategory}
        onDeleteCategory={handleInternalDeleteCategory}
        themeColor={settings.themeColor}
        onShowAlert={onShowAlert}
      />
    </AnimatePresence>
  );
};
