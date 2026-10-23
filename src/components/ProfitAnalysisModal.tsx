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
  Scale,
  Calendar,
  ArrowUpRight,
  Receipt,
  Building2
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

  // Total Gross Merchandise Cost for proportional allocation
  const totalCostGrossSum = invoice.items.reduce((acc, it) => {
    const pieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));
    const uCost = it.unitPurchasePrice ?? (pieces > 0 ? ((it.totalPurchaseCost || 0) / pieces) : (it.unitPrice || 0));
    return acc + (it.totalPurchaseCost || (pieces * uCost));
  }, 0);

  // Expenses, Freight, and Inward Logistics (reliably calculated from both expenses array and totals)
  const allExpensesTotal = Math.max(
    (invoice.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0),
    (invoice.expensesTotalAddition || 0) + (invoice.expensesTotalDeduction || 0)
  );
  const invoiceTax = invoice.tax || 0;

  // Process items with full profit, freight share, and discount calculations
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
    let itemFreightShare = 0;

    if (isPurchase) {
      // Inward Purchase Invoice:
      // Proportional allocation of freight and inward expenses based on item merchandise value
      if (allExpensesTotal > 0 && totalCostGrossSum > 0) {
        itemFreightShare = Math.round((rowCostGross / totalCostGrossSum) * allExpensesTotal);
      }

      // If purchase had discount, supplier discount directly reduces purchase cost
      if (hasInvDiscount && discountRatio > 0) {
        rowCost = Math.round(rowCostGross * (1 - discountRatio));
        itemDiscountAmount = rowCostGross - rowCost;
      }
      
      // Landed item acquisition cost: merchandise net + proportional freight
      rowCost = rowCost + itemFreightShare;
      unitCost = totalPieces > 0 ? Math.round(rowCost / totalPieces) : 0;
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

    // Profit is net revenue minus landed cost (with freight strictly deducted!)
    const profit = rowRevenue - rowCost;
    const profitPerUnit = totalPieces > 0 ? Math.round(profit / totalPieces) : (unitSell - unitCost);
    const margin = isPurchase
      ? (rowCost > 0 ? (profit / rowCost) * 100 : 0) // Markup % on landed purchase cost
      : (rowRevenue > 0 ? (profit / rowRevenue) * 100 : 0); // Margin % on sales

    let tier: 'high' | 'medium' | 'low' = 'medium';
    let tierTitle = 'سود استاندارد';
    let tierColor = 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';

    if (margin >= 18) {
      tier = 'high';
      tierTitle = isPurchase ? 'مارک‌آپ طلایی (+۱۸٪)' : 'سود طلایی (+۱۸٪)';
      tierColor = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    } else if (margin >= 10) {
      tier = 'medium';
      tierTitle = 'سود استاندارد (۱۰-۱۸٪)';
      tierColor = 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    } else {
      tier = 'low';
      tierTitle = 'سود کم / سربه‌سر (زیر ۱۰٪)';
      tierColor = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
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
      itemFreightShare,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-xs text-slate-900 dark:text-slate-100 transition-colors"
      >
        {/* Top Accent Strip */}
        <div 
          className="h-1.5 w-full shrink-0" 
          style={{ background: `linear-gradient(90deg, ${theme.hex}, ${theme.secondaryHex || theme.hex}, #10b981)` }}
        />

        {/* 1. Modal Executive Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 transition-colors">
          <div className="flex items-center gap-3.5 min-w-0">
            <div 
              className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs shrink-0 ${theme.badgeBg}`}
              style={{ borderColor: theme.hex + '40', color: theme.hex }}
            >
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isPurchase ? 'تحلیل دقیق سود و بهای فاکتور خرید' : 'تحلیل دقیق و هوشمند سود و زیان فاکتور'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 tracking-tight">#{toPersianDigits(invoice.invoiceNumber)}</span>
                </h3>

                <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black border ${
                  isPurchase 
                    ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800' 
                    : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                }`}>
                  {isPurchase ? 'رسید ورود انبار (خرید)' : 'فاکتور فروش کالا'}
                </span>

                {hasInvDiscount && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    <span>دارای {toPersianDigits(invoiceDiscountPercent.toFixed(1))}٪ تخفیف ({formatPrice(invoiceDiscountAmount)})</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                <span className="truncate max-w-[200px]">
                  {isPurchase ? 'تأمین‌کننده:' : 'مشتری:'} <b className="text-slate-800 dark:text-slate-200 font-extrabold">{invoice.customerName || 'مشتری متفرقه'}</b>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{toPersianDigits(invoice.date)}</span>
                </span>
                {invoice.customerCity && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span>شهر: {invoice.customerCity}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700 shadow-2xs"
              title="چاپ گزارش کامل سود و زیان"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              id="close-profit-modal-btn"
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer border border-slate-300 dark:border-slate-700 shadow-2xs"
              title="بستن پنجره"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Discount Banner Notice (Clean, balanced) */}
          {hasInvDiscount && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800 text-slate-800 dark:text-slate-200 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-black text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <span>{isPurchase ? 'تخفیف ویژه خرید این بار روی محاسبات لحاظ گردید' : 'تخفیف فاکتور فروش'}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[10px]">
                      {toPersianDigits(invoiceDiscountPercent.toFixed(1))}٪ تخفیف
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {isPurchase 
                      ? `مبلغ ${formatPrice(invoiceDiscountAmount)} تخفیف از تأمین‌کننده اخذ شده و بهای خرید کالا را کاهش داده و مستقیماً به سود نهایی اضافه شده است.`
                      : `مبلغ ${formatPrice(invoiceDiscountAmount)} تخفیف به خریدار اعطا شده و از درآمد کل فاکتور کسر گردیده است.`
                    }
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 text-left font-mono shadow-2xs">
                <span className="text-[10px] text-slate-400 block">ارزش سود حاصل از تخفیف:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm dir-ltr">
                  +{formatPrice(invoiceDiscountAmount)}
                </span>
              </div>
            </div>
          )}

          {/* 3. Five High-Impact Financial KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {/* Card 1: Total Revenue */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 space-y-1 shadow-2xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block">
                {isPurchase ? 'ارزش تخمینی کل فروش' : 'کل مبلغ فروش (خالص)'}
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block dir-ltr text-right font-mono">
                {formatPrice(totalRevenue)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {toPersianDigits(totalPiecesSum.toLocaleString())} عدد در {toPersianDigits(totalCartonsSum)} کارتن
              </span>
            </div>

            {/* Card 2: Total Cost */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 space-y-1 shadow-2xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block">
                {isPurchase ? 'بهای خرید خالص پرداختی' : 'بهای تمام‌شده خرید (COGS)'}
              </span>
              <span className="text-sm sm:text-base font-black text-amber-900 dark:text-amber-200 block dir-ltr text-right font-mono">
                {formatPrice(totalCost)}
              </span>
              {hasInvDiscount && isPurchase ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
                  {formatPrice(totalCostGrossSum)} قبل تخفیف
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 block font-mono">
                  میانگین خرید: {formatPrice(weightedAvgCost)}
                </span>
              )}
            </div>

            {/* Card 3: Complete Net Profit (Hero Card) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border-2 border-emerald-500/70 dark:border-emerald-600 space-y-1 shadow-xs">
              <span className="text-emerald-800 dark:text-emerald-300 font-black text-[11px] block flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                {isPurchase ? 'سود پیش‌بینی شده کامل' : 'سود خالص قطعی فاکتور'}
              </span>
              <span className="text-sm sm:text-lg font-black text-emerald-700 dark:text-emerald-300 block dir-ltr text-right font-mono">
                +{formatPrice(totalCompleteProfit)}
              </span>
              <span className="text-[10px] text-emerald-800/80 dark:text-emerald-400 block font-mono font-bold">
                سود هر عدد: +{formatPrice(weightedAvgProfitPerUnit)}
              </span>
            </div>

            {/* Card 4: Profit Margin / Markup */}
            <div className={`p-3.5 sm:p-4 rounded-2xl ${theme.badgeBg} border ${theme.borderColor} space-y-1 shadow-2xs`}>
              <span className={`${theme.primaryText} font-black text-[11px] block`}>
                {isPurchase ? 'مارک‌آپ (سود بر خرید)' : 'حاشیه سود قطعی فاکتور'}
              </span>
              <span className={`text-sm sm:text-base font-black ${theme.primaryText} block dir-ltr text-right font-mono`}>
                {toPersianDigits(overallMargin.toFixed(1))}٪
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">
                {isPurchase ? `ROI سرمایه‌گذاری: ${toPersianDigits(roiPercentage.toFixed(1))}٪` : `میانگین فروش: ${formatPrice(weightedAvgSell)}`}
              </span>
            </div>

            {/* Card 5: Carton Profit or Discount Savings */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 space-y-1 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px] block flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-slate-400" />
                <span>سود به ازای هر کارتن</span>
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white block dir-ltr text-right font-mono">
                +{formatPrice(profitPerCarton)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {totalCartonsSum > 0 ? `تقسیم بر ${toPersianDigits(totalCartonsSum)} کارتن کالا` : 'کالاهای تک‌عددی بدون کارتن'}
              </span>
            </div>
          </div>

          {/* 4. Top Profitable Items Highlights */}
          {topProfitableItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/90 dark:border-slate-750 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-slate-900 dark:text-white text-xs flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>پرسودترین اقلام این فاکتور (بیشترین سهم از سود کل سند)</span>
                </h4>
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {toPersianDigits(highCount)} قلم با رتبه طلایی (+۱۸٪)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topProfitableItems.map((item, idx) => (
                  <div key={`modal-top-item-${item.id || idx}-${idx}`} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-black text-slate-900 dark:text-white text-xs truncate" title={item.productName}>
                        {item.productName}
                      </span>
                      <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-800">
                        {toPersianDigits(idx + 1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 font-medium">سود کل این سطر:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 dir-ltr font-mono">
                        +{formatPrice(item.calculatedProfit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">{isPurchase ? 'مارک‌آپ:' : 'حاشیه سود:'}</span>
                      <span className={`font-black ${theme.primaryText} dir-ltr font-mono`}>
                        {toPersianDigits(item.calculatedMargin.toFixed(1))}٪
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Classification Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
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
                type="button"
                onClick={() => setProfitFilter('high')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  profitFilter === 'high'
                    ? 'bg-emerald-600 text-white font-black shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>سود طلایی ({toPersianDigits(highCount)})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfitFilter('medium')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  profitFilter === 'medium'
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800'
                }`}
              >
                <span>سود استاندارد ({toPersianDigits(mediumCount)})</span>
              </button>

              <button
                type="button"
                onClick={() => setProfitFilter('low')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  profitFilter === 'low'
                    ? 'bg-amber-600 text-white font-black shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800'
                }`}
              >
                <span>سود کم / سربه‌سر ({toPersianDigits(lowCount)})</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>محاسبه سود با لحاظ تخفیفات، هزینه‌ها و استانداردهای حسابداری</span>
            </span>
          </div>

          {/* 6. COMPRESSED 7-COLUMN PROFESSIONAL PROFIT & LOSS TABLE */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 font-black border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 text-center w-12">ردیف</th>
                    <th className="py-2.5 px-3 min-w-[200px]">شرح کالا و بسته‌بندی کارتن</th>
                    <th className="py-2.5 px-3 text-center min-w-[110px]">تعداد کل و کارتن</th>
                    <th className="py-2.5 px-3 text-left min-w-[130px]">نرخ واحد (فروش / خرید)</th>
                    <th className="py-2.5 px-3 text-left min-w-[150px]">مجموع سطر (فروش / خرید)</th>
                    <th className="py-2.5 px-3 text-left min-w-[140px] bg-emerald-50/60 dark:bg-emerald-950/30">سود کل سطر و سود هر عدد</th>
                    <th className="py-2.5 px-3 text-center min-w-[120px]">حاشیه سود و وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-bold">
                  {filteredItems.map((item, index) => {
                    return (
                      <tr key={`profit-modal-row-${item.id || index}-${index}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Col 1: Index */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {toPersianDigits(item.idx + 1)}
                        </td>

                        {/* Col 2: Name & Packaging Spec */}
                        <td className="py-2.5 px-3">
                          <span className="font-black text-slate-900 dark:text-white text-xs block truncate max-w-[260px]" title={item.productName}>
                            {item.productName}
                          </span>
                          <span className={`text-[10.5px] ${theme.primaryText} font-bold flex items-center gap-1 mt-0.5`}>
                            <Boxes className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.cartonFullText}</span>
                          </span>
                        </td>

                        {/* Col 3: Combined Quantity (Pieces + Cartons) */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-black text-slate-900 dark:text-white text-xs block">
                            {toPersianDigits(item.totalPieces.toLocaleString())} عدد
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                            {item.cartonsCount > 0 ? `${toPersianDigits(item.cartonsCount)} کارتن` : 'تک‌عددی'}
                          </span>
                        </td>

                        {/* Col 4: Combined Unit Prices (Selling on top, Purchase on bottom) */}
                        <td className="py-2.5 px-3 text-left dir-ltr">
                          <div className="flex items-center justify-between gap-1 text-xs font-black text-slate-900 dark:text-white">
                            <span className="text-[9px] font-bold text-slate-400 font-sans">فروش:</span>
                            <span className="font-mono">{formatPrice(item.unitSell)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                            <span className="text-[9px] font-bold text-slate-400 font-sans">خرید:</span>
                            <span className="font-mono">{formatPrice(item.unitCost)}</span>
                          </div>
                        </td>

                        {/* Col 5: Combined Row Totals (Gross Revenue on top, Total Cost on bottom) */}
                        <td className="py-2.5 px-3 text-left dir-ltr">
                          <div className="flex items-center justify-between gap-1 text-xs font-black text-slate-900 dark:text-white">
                            <span className="text-[9px] font-bold text-slate-400 font-sans">فروش:</span>
                            <span className="font-mono">{formatPrice(item.calculatedRevenue)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            <span className="text-[9px] font-bold text-slate-400 font-sans">بهای تمام‌شده:</span>
                            <span className="font-mono">{formatPrice(item.calculatedCost)}</span>
                          </div>
                          {item.itemDiscountAmount > 0 && (
                            <div className="text-[9.5px] text-emerald-600 dark:text-emerald-400 text-right mt-0.5">
                              (-{formatPrice(item.itemDiscountAmount)} تخفیف)
                            </div>
                          )}
                          {item.itemFreightShare > 0 && (
                            <div className="text-[9.5px] text-sky-600 dark:text-sky-400 text-right mt-0.5 font-bold">
                              (+{formatPrice(item.itemFreightShare)} سهم کرایه)
                            </div>
                          )}
                        </td>

                        {/* Col 6: Combined Profit (Row Profit on top, Per-Unit Profit on bottom) */}
                        <td className="py-2.5 px-3 text-left dir-ltr bg-emerald-50/40 dark:bg-emerald-950/20 border-x border-emerald-100 dark:border-emerald-900/40">
                          <div className="flex items-center justify-between gap-1 text-xs font-black text-emerald-700 dark:text-emerald-300">
                            <span className="text-[9px] font-bold text-emerald-600 font-sans">سود کل:</span>
                            <span className="font-mono text-xs sm:text-sm">+{formatPrice(item.calculatedProfit)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[10.5px] text-emerald-600/90 dark:text-emerald-400 font-bold mt-0.5">
                            <span className="text-[9px] font-medium text-slate-400 font-sans">هر عدد:</span>
                            <span className="font-mono">+{formatPrice(item.profitPerUnit)}</span>
                          </div>
                        </td>

                        {/* Col 7: Margin % and Performance Status */}
                        <td className="py-2.5 px-3 text-center">
                          <span className={`font-mono font-black text-xs dir-ltr block ${
                            item.tier === 'high' ? 'text-emerald-600 dark:text-emerald-400' :
                            item.tier === 'medium' ? theme.primaryText : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {toPersianDigits(item.calculatedMargin.toFixed(1))}٪
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9.5px] font-black border mt-1 ${item.tierColor}`}>
                            {item.tier === 'high' ? 'سود طلایی' : item.tier === 'medium' ? 'استاندارد' : 'کم‌سود'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* 7. RICH BALANCED FOOTER ROW */}
                <tfoot className="bg-slate-100/95 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-700 font-black text-slate-900 dark:text-white">
                  {/* Primary Aggregate Totals */}
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-black">
                        جمع
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-black text-slate-900 dark:text-white">
                        مجموع {toPersianDigits(analyzedItems.length)} قلم کالا
                      </div>
                      <div className={`text-[11px] ${theme.primaryText} font-bold mt-0.5`}>
                        {toPersianDigits(totalCartonsSum)} کارتن کالا
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-slate-900 dark:text-white">
                      <span className="block">{toPersianDigits(totalPiecesSum.toLocaleString())} عدد</span>
                      <span className="text-[10px] text-slate-400 font-normal">کل حجم بار</span>
                    </td>
                    <td className="py-3 px-3 text-left dir-ltr">
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-[9px] text-slate-400">میانگین فروش:</span>
                        <span className="font-mono">{formatPrice(weightedAvgSell)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 font-medium mt-0.5">
                        <span className="text-[9px] text-slate-400">میانگین خرید:</span>
                        <span className="font-mono">{formatPrice(weightedAvgCost)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-left dir-ltr font-black">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[9px] text-slate-400">کل فروش:</span>
                        <span className="font-mono">{formatPrice(totalRevenue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                        <span className="text-[9px] text-slate-400">کل خرید:</span>
                        <span className="font-mono">{formatPrice(totalCost)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-left dir-ltr bg-emerald-500/10 dark:bg-emerald-950/40 border-x border-emerald-300 dark:border-emerald-800">
                      <div className="text-[9.5px] text-emerald-700 dark:text-emerald-300 font-black">
                        {isPurchase ? 'سود پیش‌بینی کل:' : 'سود خالص و قطعی سند:'}
                      </div>
                      <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">
                        +{formatPrice(totalCompleteProfit)}
                      </div>
                      <div className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                        سود هر عدد: +{formatPrice(weightedAvgProfitPerUnit)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono font-black text-xs sm:text-sm dir-ltr block ${theme.primaryText}`}>
                        {toPersianDigits(overallMargin.toFixed(1))}٪
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-black text-[9.5px] mt-1">
                        بازدهی: {toPersianDigits(roiPercentage.toFixed(0))}٪
                      </span>
                    </td>
                  </tr>

                  {/* Summary Analytical Sub-Strip */}
                  <tr className="bg-slate-50 dark:bg-slate-900/90 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    <td colSpan={7} className="py-2.5 px-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span>
                            توزیع اقلام: <b className="text-emerald-600 dark:text-emerald-400">{toPersianDigits(highCount)} قلم سود عالی</b> • <b className="text-blue-600 dark:text-blue-400">{toPersianDigits(mediumCount)} قلم استاندارد</b> • <b className="text-amber-600 dark:text-amber-400">{toPersianDigits(lowCount)} قلم کم‌سود</b>
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span>
                            سود هر کارتن کالا: <b className="text-emerald-600 dark:text-emerald-400 font-black dir-ltr">+{formatPrice(profitPerCarton)}</b>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
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

        {/* 7. Modal Bottom Action Bar */}
        <div className="p-4 bg-slate-50/90 dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm">
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
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-black text-xs transition-all cursor-pointer shadow-xs active:scale-95"
          >
            بستن پنجره تحلیل
          </button>
        </div>
      </motion.div>
    </div>
  );
};
