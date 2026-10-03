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
  Boxes,
  Percent,
  Tag,
  ShieldCheck,
  Scale
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

  const isPurchase = invoice.type === 'purchase';
  const hasInvDiscount = Boolean(invoice.hasDiscount || (invoice.discount && invoice.discount > 0));
  const invoiceDiscountAmount = hasInvDiscount ? (invoice.discount || 0) : 0;
  
  // Effective discount ratio
  const invoiceSubtotal = invoice.subtotal || invoice.items.reduce((s, it) => s + (it.totalPrice || (it.totalPieces * (it.unitSellingPrice || it.unitPrice || 0))), 0);
  const invoiceDiscountPercent = hasInvDiscount
    ? (invoice.discountPercent || (invoiceSubtotal > 0 ? (invoiceDiscountAmount / invoiceSubtotal) * 100 : 0))
    : 0;
  const discountRatio = invoiceDiscountPercent > 0 ? (invoiceDiscountPercent / 100) : 0;

  // Process items with full profit and discount calculations
  const analyzedItems = invoice.items.map((item, index) => {
    const totalPieces = item.totalPieces || ((item.cartonsCount || 0) * (item.piecesPerCarton || 1) + (item.extraPieces || 0));
    
    // Base unit prices
    const unitCostGross = item.unitPurchasePrice ?? (totalPieces > 0 ? ((item.totalPurchaseCost || 0) / totalPieces) : 0);
    const unitSellGross = item.unitSellingPrice ?? (totalPieces > 0 ? ((item.totalPrice || 0) / totalPieces) : 0);
    
    let unitCost = unitCostGross;
    let unitSell = unitSellGross;
    let rowCostGross = item.totalPurchaseCost || (totalPieces * unitCostGross);
    let rowRevenueGross = item.totalPrice || (totalPieces * unitSellGross);

    let rowCost = rowCostGross;
    let rowRevenue = rowRevenueGross;
    let itemDiscountAmount = 0;

    if (isPurchase) {
      // Inward Purchase Invoice:
      // If purchase had discount, supplier discount directly reduces purchase cost and INCREASES profit!
      if (hasInvDiscount && discountRatio > 0) {
        rowCost = Math.round(rowCostGross * (1 - discountRatio));
        unitCost = totalPieces > 0 ? Math.round(rowCost / totalPieces) : Math.round(unitCostGross * (1 - discountRatio));
        itemDiscountAmount = rowCostGross - rowCost;
      }
      rowRevenue = totalPieces * unitSellGross;
    } else {
      // Sales Invoice:
      // If sales invoice had discount, customer discount is applied to revenue
      if (hasInvDiscount && discountRatio > 0) {
        rowRevenue = Math.round(rowRevenueGross * (1 - discountRatio));
        unitSell = totalPieces > 0 ? Math.round(rowRevenue / totalPieces) : Math.round(unitSellGross * (1 - discountRatio));
        itemDiscountAmount = rowRevenueGross - rowRevenue;
      }
      rowCost = rowCostGross;
    }

    const profit = rowRevenue - rowCost;
    const profitPerUnit = totalPieces > 0 ? Math.round(profit / totalPieces) : (unitSell - unitCost);
    const margin = isPurchase
      ? (rowCost > 0 ? (profit / rowCost) * 100 : 0) // Markup % on purchase cost
      : (rowRevenue > 0 ? (profit / rowRevenue) * 100 : 0); // Margin % on sales

    let tier: 'high' | 'medium' | 'low' = 'medium';
    let tierTitle = 'سود استاندارد';
    let tierColor = 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';

    if (margin >= 18) {
      tier = 'high';
      tierTitle = isPurchase ? 'مارک‌آپ طلایی (+۱۸٪)' : 'سود طلایی و عالی (+۱۸٪)';
      tierColor = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    } else if (margin >= 10) {
      tier = 'medium';
      tierTitle = 'سود استاندارد (۱۰-۱۸٪)';
      tierColor = 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    } else {
      tier = 'low';
      tierTitle = 'سود کم / سربه‌سر (زیر ۱۰٪)';
      tierColor = 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    }

    return {
      ...item,
      idx: index,
      totalPieces,
      unitCostGross,
      unitCost,
      unitSellGross,
      unitSell,
      rowCostGross,
      rowRevenueGross,
      calculatedCost: rowCost,
      calculatedRevenue: rowRevenue,
      calculatedProfit: profit,
      calculatedMargin: margin,
      itemDiscountAmount,
      profitPerUnit,
      tier,
      tierTitle,
      tierColor,
      cartonFullText: formatCartonText(totalPieces, item.piecesPerCarton || 1)
    };
  });

  // Overall Invoice Aggregations
  const totalPiecesSum = analyzedItems.reduce((acc, it) => acc + it.totalPieces, 0);
  const totalCartonsSum = analyzedItems.reduce((acc, it) => acc + (it.cartonsCount || 0), 0);
  const totalCostGrossSum = analyzedItems.reduce((acc, it) => acc + it.rowCostGross, 0);

  // Expenses, Freight, and Additions/Direct expenses
  const allExpensesTotal = (invoice.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const invoiceTax = invoice.tax || 0;

  // Acquisition cost accounts for supplier discount, tax, and all incurred expenses/freight (deducted from profit)
  const totalCostNetSum = isPurchase
    ? (Math.max(0, totalCostGrossSum - invoiceDiscountAmount + invoiceTax) + allExpensesTotal)
    : (totalCostGrossSum + allExpensesTotal);

  const totalRevGrossSum = analyzedItems.reduce((acc, it) => acc + it.rowRevenueGross, 0);
  const totalRevNetSum = !isPurchase
    ? (hasInvDiscount ? Math.max(0, totalRevGrossSum - invoiceDiscountAmount) : (invoice.finalAmount || totalRevGrossSum))
    : totalRevGrossSum;

  const totalRevenue = isPurchase ? totalRevGrossSum : totalRevNetSum;
  const totalCost = isPurchase ? totalCostNetSum : totalCostGrossSum;
  
  // Total complete net profit (including purchase discounts / after sales discounts and freight/expenses)
  const totalCompleteProfit = totalRevenue - totalCost;
  
  const overallMargin = isPurchase
    ? (totalCost > 0 ? (totalCompleteProfit / totalCost) * 100 : 0)
    : (totalRevenue > 0 ? (totalCompleteProfit / totalRevenue) * 100 : 0);

  const weightedAvgCost = totalPiecesSum > 0 ? Math.round(totalCost / totalPiecesSum) : 0;
  const weightedAvgSell = totalPiecesSum > 0 ? Math.round(totalRevenue / totalPiecesSum) : 0;
  const weightedAvgProfitPerUnit = totalPiecesSum > 0 ? Math.round(totalCompleteProfit / totalPiecesSum) : 0;
  const roiPercentage = totalCost > 0 ? (totalCompleteProfit / totalCost) * 100 : 0;
  const profitPerCarton = totalCartonsSum > 0 ? Math.round(totalCompleteProfit / totalCartonsSum) : 0;

  // Filter items by tier
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/80 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25 }}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden text-xs text-slate-900 dark:text-slate-100 transition-colors"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{ backgroundColor: theme.hex + '25', borderColor: theme.hex + '50', color: theme.hex }}
            >
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                  {isPurchase ? 'محاسبه دقیق سود و بهای فاکتور ورود کالا' : 'محاسبه دقیق و جامع سود و زیان فاکتور'} #{toPersianDigits(invoice.invoiceNumber)}
                </h3>
                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black border ${
                  isPurchase 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {isPurchase ? 'فاکتور ورود کالا (خرید)' : 'فاکتور فروش کالا'}
                </span>
                {hasInvDiscount && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>دارای {toPersianDigits(invoiceDiscountPercent.toFixed(1))}٪ تخفیف ({formatPrice(invoiceDiscountAmount)})</span>
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-1 font-medium">
                {isPurchase ? 'تأمین‌کننده:' : 'مشتری:'} <b className="text-slate-200 font-black">{invoice.customerName}</b> ({invoice.customerCity || '—'}) • تاریخ: {toPersianDigits(invoice.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer border border-white/10"
              title="چاپ گزارش دقیق"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              id="close-profit-modal-btn"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-500/30 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Discount Banner Notice for Inward Goods */}
          {hasInvDiscount && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-slate-800 dark:text-slate-200 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-black text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <span>{isPurchase ? 'تخفیف ویژه ورود کالا روی این فاکتور اعمال شده است' : 'تخفیف فاکتور فروش'}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[10px]">
                      {toPersianDigits(invoiceDiscountPercent.toFixed(1))}٪ تخفیف
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {isPurchase 
                      ? `مبلغ ${formatPrice(invoiceDiscountAmount)} تخفیف از تأمین‌کننده اخذ شده و بهای تمام‌شده خرید کالا را کاهش داده و مستقیماً به سود نهایی اضافه شده است.`
                      : `مبلغ ${formatPrice(invoiceDiscountAmount)} تخفیف به خریدار اعطا شده و از درآمد کل فاکتور کسر گردیده است.`
                    }
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 text-left font-mono">
                <span className="text-[10px] text-slate-400 block">ارزش سود حاصل از تخفیف:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm dir-ltr">
                  +{formatPrice(invoiceDiscountAmount)}
                </span>
              </div>
            </div>
          )}

          {/* 5 High-Tier Financial Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Card 1: Total Revenue */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block">
                {isPurchase ? 'ارزش تخمینی کل فروش' : 'کل مبلغ فروش (خالص)'}
              </span>
              <span className="text-sm sm:text-lg font-black text-slate-900 dark:text-white block dir-ltr text-right">
                {formatPrice(totalRevenue)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {toPersianDigits(totalPiecesSum.toLocaleString())} عدد در {toPersianDigits(totalCartonsSum)} کارتن
              </span>
            </div>

            {/* Card 2: Total Cost */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 space-y-1">
              <span className="text-amber-800 dark:text-amber-300 font-bold text-[11px] block">
                {isPurchase ? 'بهای خرید خالص پرداختی' : 'بهای تمام‌شده خرید (COGS)'}
              </span>
              <span className="text-sm sm:text-lg font-black text-amber-900 dark:text-amber-200 block dir-ltr text-right">
                {formatPrice(totalCost)}
              </span>
              {hasInvDiscount && isPurchase ? (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-mono">
                  {formatPrice(totalCostGrossSum)} قبل تخفیف
                </span>
              ) : (
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400 block font-mono">
                  میانگین خرید: {formatPrice(weightedAvgCost)}
                </span>
              )}
            </div>

            {/* Card 3: Inward Discount Savings or ROI */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-1">
              <span className="text-sky-800 dark:text-sky-300 font-bold text-[11px] block flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-sky-600" />
                {hasInvDiscount ? (isPurchase ? 'سود تخفیف خرید ورودی' : 'تخفیف اعطا شده') : 'نرخ بازگشت سرمایه (ROI)'}
              </span>
              <span className="text-sm sm:text-lg font-black text-sky-900 dark:text-sky-200 block dir-ltr text-right">
                {hasInvDiscount ? formatPrice(invoiceDiscountAmount) : `${toPersianDigits(roiPercentage.toFixed(1))}٪`}
              </span>
              <span className="text-[10px] text-sky-700/80 dark:text-sky-400 block font-mono">
                {hasInvDiscount ? `${toPersianDigits(invoiceDiscountPercent.toFixed(1))}٪ از کل مبلغ` : `سود به ازای هر کارتن: ${formatPrice(profitPerCarton)}`}
              </span>
            </div>

            {/* Card 4: Complete Net Profit */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 dark:border-emerald-700 space-y-1 shadow-2xs">
              <span className="text-emerald-800 dark:text-emerald-300 font-black text-[11px] block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                {isPurchase ? 'سود پیش‌بینی شده کامل' : 'سود کامل و خالص فاکتور'}
              </span>
              <span className="text-sm sm:text-xl font-black text-emerald-700 dark:text-emerald-300 block dir-ltr text-right">
                +{formatPrice(totalCompleteProfit)}
              </span>
              <span className="text-[10px] text-emerald-800/80 dark:text-emerald-400 block font-mono font-bold">
                سود هر عدد: +{formatPrice(weightedAvgProfitPerUnit)}
              </span>
            </div>

            {/* Card 5: Profit Margin / Markup */}
            <div className={`p-3.5 sm:p-4 rounded-2xl ${theme.primaryLight} border ${theme.borderColor} space-y-1 col-span-2 sm:col-span-1`}>
              <span className={`${theme.primaryText} font-black text-[11px] block`}>
                {isPurchase ? 'ضریب مارک‌آپ (سود بر خرید)' : 'حاشیه سود نهایی فاکتور'}
              </span>
              <span className={`text-sm sm:text-lg font-black ${theme.primaryText} block dir-ltr text-right font-mono`}>
                {toPersianDigits(overallMargin.toFixed(1))}٪
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                {isPurchase ? `ROI سرمایه‌گذاری: ${toPersianDigits(roiPercentage.toFixed(1))}٪` : `فروش میانگین: ${formatPrice(weightedAvgSell)}`}
              </span>
            </div>
          </div>

          {/* Top Profitable Items Highlights */}
          {topProfitableItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-500/5 to-slate-50 dark:to-slate-800/80 border border-emerald-200/70 dark:border-emerald-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  پرسودترین اقلام این فاکتور (بیشترین سهم از سود کل)
                </h4>
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {toPersianDigits(highCount)} محصول با رتبه طلایی
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topProfitableItems.map((item, idx) => (
                  <div key={`modal-top-item-${item.id || idx}-${idx}`} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-xs truncate">{item.productName}</span>
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-[10px] flex items-center justify-center shrink-0">
                        {toPersianDigits(idx + 1)}
                      </span>
                    </div>
                    <div className="mt-2 text-slate-600 dark:text-slate-300 space-y-1 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 dark:text-slate-500">سود کامل این قلم:</span>
                        <span className="font-black text-emerald-700 dark:text-emerald-300 dir-ltr font-mono">+{formatPrice(item.calculatedProfit)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 dark:text-slate-500">{isPurchase ? 'ضریب مارک‌آپ:' : 'حاشیه سود:'}</span>
                        <span className={`font-black ${theme.primaryText} dir-ltr font-mono`}>{toPersianDigits(item.calculatedMargin.toFixed(1))}٪</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classification Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setProfitFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  profitFilter === 'all'
                    ? `${theme.primary} text-white font-black shadow-xs`
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                همه اقلام ({toPersianDigits(analyzedItems.length)})
              </button>

              <button
                onClick={() => setProfitFilter('high')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  profitFilter === 'high'
                    ? 'bg-emerald-600 text-white font-black shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                سود طلایی ({toPersianDigits(highCount)})
              </button>

              <button
                onClick={() => setProfitFilter('medium')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  profitFilter === 'medium'
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800'
                }`}
              >
                سود استاندارد ({toPersianDigits(mediumCount)})
              </button>

              <button
                onClick={() => setProfitFilter('low')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  profitFilter === 'low'
                    ? 'bg-amber-600 text-white font-black shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800'
                }`}
              >
                سود کم / سربه‌سر ({toPersianDigits(lowCount)})
              </button>
            </div>

            <span className="text-[11px] text-slate-500 font-bold">
              محاسبه سود با احتساب تخفیف‌های ورودی و خروجی فاکتور
            </span>
          </div>

          {/* Breakdown Table with Critical Rich Footer Row */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 font-black border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3 text-center w-12">ردیف</th>
                    <th className="py-3 px-4">شرح کالا و بسته‌بندی</th>
                    <th className="py-3 px-3 text-center">تعداد کل</th>
                    <th className="py-3 px-3 text-left">قیمت خرید واحد</th>
                    <th className="py-3 px-3 text-left">{isPurchase ? 'قیمت فروش کالا' : 'قیمت فروش واحد'}</th>
                    <th className="py-3 px-3 text-left">{isPurchase ? 'بهای تمام‌شده خرید' : 'کل بهای خرید'}</th>
                    <th className="py-3 px-3 text-left">{isPurchase ? 'ارزش کل فروش' : 'کل مبلغ فروش'}</th>
                    <th className="py-3 px-3 text-left">سود هر عدد</th>
                    <th className="py-3 px-3 text-left">{isPurchase ? 'سود پیش‌بینی سطر' : 'سود خالص سطر'}</th>
                    <th className="py-3 px-3 text-center">{isPurchase ? 'ضریب مارک‌آپ' : 'حاشیه سود'}</th>
                    <th className="py-3 px-3 text-center">دسته بازدهی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {filteredItems.map((item, index) => {
                    return (
                      <tr key={`profit-modal-row-${item.id || index}-${index}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {toPersianDigits(item.idx + 1)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-black text-slate-900 dark:text-white text-xs block">{item.productName}</span>
                          <span className={`text-[11px] ${theme.primaryText} font-bold flex items-center gap-1 mt-0.5`}>
                            <Boxes className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.cartonFullText}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-black text-slate-800 dark:text-slate-200">
                          {toPersianDigits(item.totalPieces.toLocaleString())} عدد
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr">
                          {hasInvDiscount && isPurchase && item.itemDiscountAmount > 0 ? (
                            <div>
                              <div className="font-black text-emerald-600 dark:text-emerald-400">
                                {formatPrice(item.unitCost)}
                              </div>
                              <div className="text-[10px] text-slate-400 line-through">
                                {formatPrice(item.unitCostGross)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-amber-800 dark:text-amber-300 font-medium">
                              {formatPrice(item.unitCost)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr font-black text-slate-900 dark:text-white">
                          {formatPrice(item.unitSell)}
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr">
                          {hasInvDiscount && isPurchase && item.itemDiscountAmount > 0 ? (
                            <div>
                              <div className="font-black text-slate-900 dark:text-white">
                                {formatPrice(item.calculatedCost)}
                              </div>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                                (-{formatPrice(item.itemDiscountAmount)} تخفیف)
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              {formatPrice(item.calculatedCost)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr font-black text-slate-900 dark:text-white">
                          {formatPrice(item.calculatedRevenue)}
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400">
                          +{formatPrice(item.profitPerUnit)}
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400 text-xs">
                          +{formatPrice(item.calculatedProfit)}
                        </td>
                        <td className={`py-3 px-3 text-center font-black ${theme.primaryText} font-mono dir-ltr`}>
                          {toPersianDigits(item.calculatedMargin.toFixed(1))}٪
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${item.tierColor}`}>
                            {item.tierTitle}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* THE REQUESTED RICH SUMMARY FOOTER ROW */}
                <tfoot className="bg-slate-100/95 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-700 font-black text-slate-900 dark:text-white">
                  {/* Row 1: Primary Aggregate Totals */}
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-4 px-3 text-center">
                      <span className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-black">
                        جمع کل
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-black text-slate-900 dark:text-white">
                        مجموع {toPersianDigits(analyzedItems.length)} قلم کالا
                      </div>
                      <div className={`text-[11px] ${theme.primaryText} font-bold mt-0.5`}>
                        {toPersianDigits(totalCartonsSum)} کارتن کالا
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center font-black text-slate-900 dark:text-white">
                      {toPersianDigits(totalPiecesSum.toLocaleString())} عدد
                    </td>
                    <td className="py-4 px-3 text-left dir-ltr font-medium text-slate-600 dark:text-slate-300">
                      <div className="text-[10px] text-slate-400">میانگین خرید:</div>
                      <div className="font-black text-amber-800 dark:text-amber-300">{formatPrice(weightedAvgCost)}</div>
                    </td>
                    <td className="py-4 px-3 text-left dir-ltr font-black text-slate-900 dark:text-white">
                      <div className="text-[10px] text-slate-400">میانگین فروش:</div>
                      <div className="font-black text-slate-900 dark:text-white">{formatPrice(weightedAvgSell)}</div>
                    </td>
                    <td className="py-4 px-3 text-left dir-ltr font-black text-slate-900 dark:text-white">
                      <div>{formatPrice(totalCost)}</div>
                      {hasInvDiscount && isPurchase && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                          (-{formatPrice(invoiceDiscountAmount)} تخفیف خرید)
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 text-left dir-ltr font-black text-slate-900 dark:text-white">
                      <div>{formatPrice(totalRevenue)}</div>
                      {hasInvDiscount && !isPurchase && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">
                          (-{formatPrice(invoiceDiscountAmount)} تخفیف فروش)
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-3 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400">
                      <div className="text-[10px] text-emerald-700/80">میانگین سود واحد:</div>
                      <div>+{formatPrice(weightedAvgProfitPerUnit)}</div>
                    </td>
                    <td className="py-4 px-3 text-left dir-ltr bg-emerald-500/10 dark:bg-emerald-950/40 border-x border-emerald-300 dark:border-emerald-800">
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-black">
                        {isPurchase ? 'سود پیش‌بینی کل:' : 'سود کامل و خالص:'}
                      </div>
                      <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300">
                        +{formatPrice(totalCompleteProfit)}
                      </div>
                      {hasInvDiscount && isPurchase && (
                        <div className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold">
                          (شامل {formatPrice(invoiceDiscountAmount)} سود تخفیف)
                        </div>
                      )}
                    </td>
                    <td className={`py-4 px-3 text-center font-black ${theme.primaryText} font-mono dir-ltr text-xs sm:text-sm`}>
                      {toPersianDigits(overallMargin.toFixed(1))}٪
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-black text-[10px]">
                        بازدهی: {toPersianDigits(roiPercentage.toFixed(0))}٪
                      </span>
                    </td>
                  </tr>

                  {/* Row 2: Analytical Context Breakdown */}
                  <tr className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <td colSpan={11} className="py-2.5 px-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span>
                            توزیع بازدهی: <b className="text-emerald-600 dark:text-emerald-400">{toPersianDigits(highCount)} قلم سود عالی</b> • <b className="text-blue-600 dark:text-blue-400">{toPersianDigits(mediumCount)} قلم استاندارد</b> • <b className="text-amber-600 dark:text-amber-400">{toPersianDigits(lowCount)} قلم کم‌سود</b>
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span>
                            سود هر کارتن کالا: <b className="text-emerald-600 dark:text-emerald-400 font-black dir-ltr">+{formatPrice(profitPerCarton)}</b>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>کلیه تخفیفات و بهای تمام‌شده مطابق استانداردهای حسابداری موازنه شده است.</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 dark:text-slate-300 font-bold">
              سود کامل و قطعی این فاکتور:
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 text-base sm:text-lg font-black dir-ltr font-mono">
              +{formatPrice(totalCompleteProfit)}
            </span>
            {hasInvDiscount && (
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                (با احتساب {formatPrice(invoiceDiscountAmount)} تخفیف اعمال‌شده)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-black text-xs transition-all cursor-pointer shadow-xs"
          >
            بستن پنجره تحلیل
          </button>
        </div>
      </motion.div>
    </div>
  );
};
