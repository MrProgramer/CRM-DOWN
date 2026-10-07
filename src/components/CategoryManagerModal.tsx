import React, { useState } from 'react';
import { Product } from '../types';
import { themes, ThemeColor } from './ThemeConfig';
import { toPersianDigits } from '../utils/formatters';
import { 
  FolderPlus, 
  Tag, 
  Edit3, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  Layers, 
  AlertCircle,
  Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  products: Product[];
  onAddCategory: (name: string) => void;
  onEditCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
  themeColor: ThemeColor;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  products,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  themeColor,
  onShowAlert,
}) => {
  const theme = themes[themeColor] || themes.teal;
  const [newCatName, setNewCatName] = useState('');
  const [editingCatOld, setEditingCatOld] = useState<string | null>(null);
  const [editingCatNew, setEditingCatNew] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      onShowAlert?.('این دسته‌بندی قبلاً ثبت شده است.', 'warning', 'دسته‌بندی تکراری');
      return;
    }
    onAddCategory(trimmed);
    setNewCatName('');
  };

  const handleStartEdit = (cat: string) => {
    setEditingCatOld(cat);
    setEditingCatNew(cat);
  };

  const handleSaveEdit = () => {
    if (!editingCatOld) return;
    const trimmed = editingCatNew.trim();
    if (!trimmed) return;
    if (trimmed !== editingCatOld) {
      if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase() && c !== editingCatOld)) {
        onShowAlert?.('دسته‌بندی با این نام هم‌اکنون موجود است.', 'warning', 'نام تکراری');
        return;
      }
      onEditCategory(editingCatOld, trimmed);
    }
    setEditingCatOld(null);
  };

  const filteredCategories = categories.filter(c => 
    c.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs dir-rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden text-xs text-slate-900 dark:text-slate-100"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                مدیریت دسته‌بندی کالاها
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                تعریف دسته‌های جدید، ویرایش نام و حذف گروه‌های کالایی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add New Category Form */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <div className="relative flex-1">
              <FolderPlus className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className={`w-full pr-9 pl-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${theme.ring} text-xs font-bold`}
              />
            </div>
            <button
              type="submit"
              disabled={!newCatName.trim()}
              className={`px-4 py-2.5 rounded-xl text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${theme.primary} ${theme.primaryHover} shadow-xs shrink-0`}
            >
              <Plus className="w-4 h-4" />
              <span>افزودن</span>
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
          <div className="flex items-center justify-between pb-1 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
            <span>لیست دسته‌های ثبت‌شده ({toPersianDigits(categories.length)} دسته)</span>
            <span>تعداد کالاها</span>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              دسته‌بندی‌ای یافت نشد.
            </div>
          ) : (
            filteredCategories.map((cat, idx) => {
              const count = products.filter(p => p.category === cat).length;
              const isEditing = editingCatOld === cat;

              return (
                <div
                  key={`cat-mgr-${cat}-${idx}`}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingCatNew}
                        onChange={(e) => setEditingCatNew(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') setEditingCatOld(null);
                        }}
                        className={`flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 ${theme.ring}`}
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
                        title="ذخیره نام"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCatOld(null)}
                        className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                        title="انصراف"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg ${theme.primaryLight} ${theme.primaryText}`}>
                          <Tag className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-black text-slate-900 dark:text-white text-xs truncate">
                          {cat}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                          {toPersianDigits(count)} کالا
                        </span>

                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="ویرایش نام دسته"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteCategory(cat)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="حذف دسته"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            تغییر نام دسته، به‌صورت خودکار روی تمام کالاهای آن دسته اعمال می‌شود.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            بستن
          </button>
        </div>
      </motion.div>
    </div>
  );
};
