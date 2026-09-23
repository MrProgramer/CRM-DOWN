import React, { useState } from 'react';
import { Invoice, Product, Customer, StoreSettings } from '../types';
import { Search, X, FileText, Boxes, Users, ArrowRight, Sparkles, Command } from 'lucide-react';
import { formatPrice, toPersianDigits } from '../utils/formatters';
import { AppTab } from './HeaderNav';
import { themes } from './ThemeConfig';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalSearchModalProps {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  settings: StoreSettings;
  isDarkMode?: boolean;
  onClose: () => void;
  onNavigateTab: (tab: AppTab) => void;
  onViewInvoice: (inv: Invoice) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  invoices,
  products,
  customers,
  settings,
  isDarkMode = false,
  onClose,
  onNavigateTab,
  onViewInvoice,
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'invoices' | 'products' | 'customers'>('all');
  const theme = themes[settings.themeColor] || themes.teal;

  const trimmed = query.trim().toLowerCase();

  const toEnglishDigitsStr = (str: string) =>
    str.replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());

  const trimmedEn = toEnglishDigitsStr(trimmed);

  const safeContains = (val: any) => {
    if (val === null || val === undefined) return false;
    const str = String(val).toLowerCase();
    return str.includes(trimmed) || str.includes(trimmedEn);
  };

  const matchingInvoices = trimmed ? invoices.filter(i => {
    try {
      return (
        safeContains(i.invoiceNumber) ||
        safeContains(i.customerName) ||
        safeContains(i.customerPhone) ||
        (Array.isArray(i.items) && i.items.some(item => safeContains(item?.productName)))
      );
    } catch (e) {
      return false;
    }
  }).slice(0, 8) : [];

  const matchingProducts = trimmed ? products.filter(p => {
    try {
      return (
        safeContains(p.name) ||
        safeContains(p.category) ||
        safeContains(p.code)
      );
    } catch (e) {
      return false;
    }
  }).slice(0, 8) : [];

  const matchingCustomers = trimmed ? customers.filter(c => {
    try {
      return (
        safeContains(c.name) ||
        safeContains(c.phone) ||
        safeContains(c.city) ||
        safeContains(c.company)
      );
    } catch (e) {
      return false;
    }
  }).slice(0, 8) : [];

  const totalResults = matchingInvoices.length + matchingProducts.length + matchingCustomers.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md flex items-start justify-center pt-12 sm:pt-20 px-4 no-print transition-all">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 transition-colors"
      >
        {/* Input Command Header */}
        <div className={`p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3 transition-colors`}>
          <div className={`p-2.5 rounded-2xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی هوشمند در فاکتورها، انبار کالا و طرف‌حساب‌ها..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 font-bold text-sm sm:text-base focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl bg-slate-200/60 dark:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-2xl bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black shrink-0 transition-colors cursor-pointer"
          >
            بستن (Esc)
          </button>
        </div>

        {/* Quick Filter Categories */}
        {trimmed && (
          <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-950/40 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? `${theme.primary} text-white font-black shadow-xs`
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              همه نتایج ({toPersianDigits(totalResults)})
            </button>
            {matchingInvoices.length > 0 && (
              <button
                onClick={() => setActiveFilter('invoices')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  activeFilter === 'invoices'
                    ? `${theme.primary} text-white font-black shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                فاکتورها ({toPersianDigits(matchingInvoices.length)})
              </button>
            )}
            {matchingProducts.length > 0 && (
              <button
                onClick={() => setActiveFilter('products')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  activeFilter === 'products'
                    ? `${theme.primary} text-white font-black shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                کالاهای انبار ({toPersianDigits(matchingProducts.length)})
              </button>
            )}
            {matchingCustomers.length > 0 && (
              <button
                onClick={() => setActiveFilter('customers')}
                className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
                  activeFilter === 'customers'
                    ? `${theme.primary} text-white font-black shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                طرف‌حساب‌ها ({toPersianDigits(matchingCustomers.length)})
              </button>
            )}
          </div>
        )}

        {/* Results Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {!trimmed && (
            <div className="py-16 text-center space-y-3">
              <div className={`w-14 h-14 rounded-3xl ${theme.primaryLight} ${theme.primaryText} mx-auto flex items-center justify-center border ${theme.borderColor}`}>
                <Search className="w-7 h-7" />
              </div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                جستجوی سراسری در سامانه بازرگانی
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                نام محصول، شماره فاکتور (مانند ۱۰۳۹)، نام مشتری یا شماره تلفن را جستجو نمایید.
              </p>
            </div>
          )}

          {trimmed && totalResults === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <X className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
              <p>موردی با عبارات «{query}» یافت نشد.</p>
            </div>
          )}

          {/* Invoices Results */}
          {matchingInvoices.length > 0 && (activeFilter === 'all' || activeFilter === 'invoices') && (
            <div className="space-y-2.5">
              <div className={`text-xs font-black ${theme.primaryText} flex items-center gap-2 px-1`}>
                <FileText className="w-4 h-4" />
                <span>فاکتورهای منطبق ({toPersianDigits(matchingInvoices.length)})</span>
              </div>
              <div className="space-y-2">
                {matchingInvoices.map((inv, idx) => (
                  <div
                    key={`gsearch-inv-${inv.id || idx}-${idx}`}
                    onClick={() => {
                      onViewInvoice(inv);
                      onClose();
                    }}
                    className={`p-3.5 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-700 group`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor} rounded-xl text-xs font-black`}>
                        #{toPersianDigits(inv.invoiceNumber)}
                      </span>
                      <div>
                        <div className={`font-bold text-slate-900 dark:text-white text-xs group-hover:${theme.primaryText} transition-colors`}>
                          {inv.customerName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          تاريخ: {toPersianDigits(inv.date)} • {toPersianDigits(inv.items.length)} قلم کالا
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className={`font-black ${theme.primaryText} text-xs`}>
                        {formatPrice(inv.finalAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold">نمایش فاکتور ↵</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Results */}
          {matchingProducts.length > 0 && (activeFilter === 'all' || activeFilter === 'products') && (
            <div className="space-y-2.5">
              <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2 px-1">
                <Boxes className="w-4 h-4" />
                <span>کالاهای انبار ({toPersianDigits(matchingProducts.length)})</span>
              </div>
              <div className="space-y-2">
                {matchingProducts.map((p, idx) => {
                  const cartons = p.piecesPerCarton > 0 ? Math.floor(p.stockPieces / p.piecesPerCarton) : 0;
                  return (
                    <div
                      key={`gsearch-prod-${p.id || idx}-${idx}`}
                      onClick={() => {
                        onNavigateTab('inventory');
                        onClose();
                      }}
                      className="p-3.5 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-700 group"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          گروه: {p.category} • قیمت فروش: {formatPrice(p.sellingPrice)}
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-black">
                          {toPersianDigits(cartons)} کارتن موجود
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customers Results */}
          {matchingCustomers.length > 0 && (activeFilter === 'all' || activeFilter === 'customers') && (
            <div className="space-y-2.5">
              <div className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-2 px-1">
                <Users className="w-4 h-4" />
                <span>طرف‌حساب‌ها ({toPersianDigits(matchingCustomers.length)})</span>
              </div>
              <div className="space-y-2">
                {matchingCustomers.map((c, idx) => (
                  <div
                    key={`gsearch-cust-${c.id || idx}-${idx}`}
                    onClick={() => {
                      onNavigateTab('customers');
                      onClose();
                    }}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex items-center justify-between cursor-pointer transition-all hover:border-slate-300 dark:hover:border-slate-700 group"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        شهر: {c.city || 'ثبت نشده'} • تلفن: {toPersianDigits(c.phone)}
                      </div>
                    </div>
                    <div className="text-left text-[11px] font-black text-slate-500 dark:text-slate-400">
                      مشاهده پرونده ↵
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
