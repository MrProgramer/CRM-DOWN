import React, { useState } from 'react';
import { Invoice, StoreSettings } from '../types';
import { formatPrice, formatCartonText, formatProductPackagingSpec, toPersianDigits } from '../utils/formatters';
import { themes } from './ThemeConfig';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Printer, 
  Layers, 
  BarChart3,
  DollarSign,
  PieChart,
  Boxes
} from 'lucide-react';
import { motion } from 'motion/react';

interface ProfitAnalysisModalProps {
  invoice: Invoice;
  settings?: StoreSettings;
  onClose: () => void;
}

export const ProfitAnalysisModal: React.FC<ProfitAnalysisModalProps> = ({ invoice, settings, onClose }) => {
  const [profitFilter, setProfitFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const theme = themes[settings?.themeColor || 'teal'] || themes.teal;

  // Calculations
  const totalRevenue = invoice.finalAmount;
  const totalCost = invoice.items.reduce((acc, item) => acc + (item.totalPurchaseCost || (item.totalPieces * item.unitPurchasePrice)), 0);
  const netProfit = totalRevenue - totalCost;
  const overallMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Process items with profit classifications
  const analyzedItems = invoice.items.map(item => {
    const totalPieces = item.totalPieces || ((item.cartonsCount || 0) * (item.piecesPerCarton || 1) + (item.extraPieces || 0));
    const unitCost = item.unitPurchasePrice ?? (totalPieces > 0 ? ((item.totalPurchaseCost || 0) / totalPieces) : 0);
    const unitSell = item.unitSellingPrice ?? (totalPieces > 0 ? ((item.totalPrice || 0) / totalPieces) : 0);
    const cost = item.totalPurchaseCost || (totalPieces * unitCost);
    const revenue = item.totalPrice || (totalPieces * unitSell);
    const profit = item.profitAmount ?? (revenue - cost);
    const profitPerUnit = totalPieces > 0 ? (profit / totalPieces) : (unitSell - unitCost);
    const margin = revenue > 0 ? (profit / revenue) * 100 : (item.profitPercentage ?? 0);

    let tier: 'high' | 'medium' | 'low' = 'medium';
    let tierTitle = 'سود استاندارد';
    let tierColor = 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';

    if (margin >= 18) {
      tier = 'high';
      tierTitle = 'سود عالی و استثنایی (+۱۸٪)';
      tierColor = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    } else if (margin >= 10) {
      tier = 'medium';
      tierTitle = 'سود متوسط و استاندارد (۱۰-۱۸٪)';
      tierColor = 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    } else {
      tier = 'low';
      tierTitle = 'سود اندک یا سربه سر (زیر ۱۰٪)';
      tierColor = 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }

    return {
      ...item,
      calculatedCost: cost,
      calculatedRevenue: revenue,
      calculatedProfit: profit,
      calculatedMargin: margin,
      profitPerUnit,
      tier,
      tierTitle,
      tierColor,
      cartonFullText: formatCartonText(totalPieces, item.piecesPerCarton || 1)
    };
  });

  // Filter items
  const filteredItems = analyzedItems.filter(item => {
    if (profitFilter === 'all') return true;
    return item.tier === profitFilter;
  });

  // Top profitable items
  const topProfitableItems = [...analyzedItems].sort((a, b) => b.calculatedProfit - a.calculatedProfit).slice(0, 3);

  // Counts by tier
  const highCount = analyzedItems.filter(i => i.tier === 'high').length;
  const mediumCount = analyzedItems.filter(i => i.tier === 'medium').length;
  const lowCount = analyzedItems.filter(i => i.tier === 'low').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-xs text-slate-900 dark:text-slate-100 transition-colors"
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border"
              style={{ backgroundColor: theme.hex + '25', borderColor: theme.hex + '50', color: theme.hex }}
            >
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                تحلیل جامع سود و زیان فاکتور #{toPersianDigits(invoice.invoiceNumber)}
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                مشتری: {invoice.customerName} ({invoice.customerCity || 'کرمانشاه'}) • تاریخ: {toPersianDigits(invoice.date)}
              </p>
            </div>
          </div>

          <button
            id="close-profit-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* 4 Financial Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* 1. Total Revenue */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 font-medium block">کل فروش (درآمد)</span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 block">
                {formatPrice(totalRevenue)}
              </span>
            </div>

            {/* 2. Total Cost */}
            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60">
              <span className="text-amber-800 dark:text-amber-300 font-medium block">بهای خرید اقلام</span>
              <span className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-200 mt-1 block">
                {formatPrice(totalCost)}
              </span>
            </div>

            {/* 3. Net Profit */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
              <span className="text-emerald-800 dark:text-emerald-300 font-bold block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                سود خالص فاکتور
              </span>
              <span className="text-base sm:text-xl font-black text-emerald-900 dark:text-emerald-200 mt-1 block">
                {formatPrice(netProfit)}
              </span>
            </div>

            {/* 4. Profit Margin */}
            <div className={`p-4 rounded-2xl ${theme.primaryLight} border ${theme.borderColor}`}>
              <span className={`${theme.primaryText} font-bold block`}>حاشیه سود کل فاکتور</span>
              <span className={`text-base sm:text-xl font-black ${theme.primaryText} mt-1 block`}>
                {toPersianDigits(overallMargin.toFixed(1))}٪
              </span>
            </div>
          </div>

          {/* Top Products with Best Profit */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-slate-500/5 to-slate-50 dark:to-slate-800/80 border border-emerald-200/70 dark:border-emerald-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                پرسودترین اقلام این فاکتور (بیشترین سهم از سود کل)
              </h4>
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                {toPersianDigits(highCount)} محصول با سود عالی
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topProfitableItems.map((item, idx) => (
                <div key={item.id} className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{item.productName}</span>
                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-[10px] flex items-center justify-center">
                      {toPersianDigits(idx + 1)}
                    </span>
                  </div>
                  <div className="mt-2 text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">سود این قلم:</span>
                      <span className="font-black text-emerald-800 dark:text-emerald-300">{formatPrice(item.calculatedProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">درصد بازدهی:</span>
                      <span className={`font-bold ${theme.primaryText}`}>{toPersianDigits(item.calculatedMargin.toFixed(1))}٪</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Classification Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setProfitFilter('all')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  profitFilter === 'all'
                    ? `${theme.primary} text-white`
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                همه اقلام ({toPersianDigits(analyzedItems.length)})
              </button>

              <button
                onClick={() => setProfitFilter('high')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  profitFilter === 'high'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                سود طلایی و عالی ({toPersianDigits(highCount)})
              </button>

              <button
                onClick={() => setProfitFilter('medium')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  profitFilter === 'medium'
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800'
                }`}
              >
                سود متوسط و استاندارد ({toPersianDigits(mediumCount)})
              </button>

              <button
                onClick={() => setProfitFilter('low')}
                className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                  profitFilter === 'low'
                    ? 'bg-amber-700 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800'
                }`}
              >
                سود کم / سربه سر ({toPersianDigits(lowCount)})
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              چاپ گزارش سود
            </button>
          </div>

          {/* Breakdown Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-3 text-center w-12">ردیف</th>
                  <th className="py-3 px-4">شرح کالا</th>
                  <th className="py-3 px-3 text-center">تعداد کل</th>
                  <th className="py-3 px-3 text-center">قیمت خرید</th>
                  <th className="py-3 px-3 text-center">قیمت فروش</th>
                  <th className="py-3 px-3 text-center">کل خرید</th>
                  <th className="py-3 px-3 text-center">کل فروش</th>
                  <th className="py-3 px-3 text-center">سود خالص</th>
                  <th className="py-3 px-3 text-center">حاشیه سود</th>
                  <th className="py-3 px-3 text-center">دسته بازدهی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item, index) => {
                  return (
                    <tr key={`profit-anal-${item.id || index}-${index}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-slate-500 dark:text-slate-400">
                        {toPersianDigits(index + 1)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white text-xs block">{item.productName}</span>
                        <span className={`text-[11px] ${theme.primaryText} font-bold flex items-center gap-1 mt-0.5`}>
                          <Boxes className="w-3 h-3 shrink-0" />
                          <span>{item.cartonFullText}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {toPersianDigits(item.totalPieces.toLocaleString())}
                      </td>
                      <td className="py-3 px-3 text-center text-amber-800 dark:text-amber-400 font-medium">
                        {toPersianDigits(item.unitPurchasePrice.toLocaleString())}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                        {toPersianDigits(item.unitSellingPrice.toLocaleString())}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 dark:text-slate-400">
                        {toPersianDigits(item.calculatedCost.toLocaleString())}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                        {toPersianDigits(item.calculatedRevenue.toLocaleString())}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-emerald-800 dark:text-emerald-400 text-xs">
                        {toPersianDigits(item.calculatedProfit.toLocaleString())} ت
                      </td>
                      <td className={`py-3 px-3 text-center font-black ${theme.primaryText}`}>
                        {toPersianDigits(item.calculatedMargin.toFixed(1))}٪
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.tierColor}`}>
                          {item.tierTitle}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-slate-600 dark:text-slate-300">
            جمع کل سود این فاکتور: <b className="text-emerald-800 dark:text-emerald-400 text-sm font-black">{formatPrice(netProfit)}</b>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold transition-all cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </motion.div>
    </div>
  );
};
