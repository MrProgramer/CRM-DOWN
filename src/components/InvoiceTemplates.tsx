import React from 'react';
import { Invoice, StoreSettings } from '../types';
import { ThemeStyles } from './ThemeConfig';
import { 
  formatPrice, 
  toPersianDigits,
  numberToPersianWords
} from '../utils/formatters';
import { InvoiceSellThroughSummary } from '../utils/inwardSellThrough';
import { 
  CreditCard, 
  Copy, 
  Check, 
  Building2, 
  Phone, 
  MapPin, 
  Calendar, 
  CheckCircle2,
  FileText,
  Barcode,
  Sparkles,
  Layers,
  ArrowDownLeft,
  Scale,
  Receipt,
  ShieldCheck,
  QrCode,
  ShoppingBag,
  ShoppingCart,
  User,
  Truck,
  Percent,
  Heart,
  Wallet,
  ChevronLeft,
  Boxes
} from 'lucide-react';

export interface ProcessedItem {
  item: Invoice['items'][0];
  index: number;
  prod?: any;
  correctPiecesPerCarton: number;
  unitTitle: string;
  cartonLabel: string;
  packagingSpec: string;
  isUnknown: boolean;
  hasCustomNote: boolean;
  itemReturns: any[];
  itemReturnedCartons: number;
  itemReturnedExtraPieces: number;
  itemReturnedTotalAmount: number;
  itemNetPrice: number;
  displayUnitPrice: number;
  displayLineTotal: number;
  coverPrice?: number;
  hasDiscount?: boolean;
  discountPercent?: number;
  discountedUnitPrice?: number;
  discountedLineTotal?: number;
  unitPurchasePrice?: number;
  unitSellingPrice?: number;
  unitProfit?: number;
  totalProfit?: number;
  profitMarginPercent?: number;
  isProfit?: boolean;
  isLoss?: boolean;
}

export interface InvoiceTemplateProps {
  invoice: Invoice;
  settings: StoreSettings;
  theme: ThemeStyles;
  isPurchase: boolean;
  isSecretMode: boolean;
  isPresentationModeActive: boolean;
  isDarkCanvas: boolean;
  processedItems: ProcessedItem[];
  grossAmount: number;
  discount: number;
  tax: number;
  totalInvoiceReturnsAmount: number;
  offsetReturnsTotal?: number;
  netPayableAmount: number;
  paidAmount: number;
  remainingDebtAmount: number;
  isCashPayment: boolean;
  isPartialPayment: boolean;
  finalBalanceDisplay: string;
  previousBalanceNumber?: number;
  cumulativeBalanceVal?: number;
  isCreditOrPartial?: boolean;
  creditCalculationFormula?: string;
  invoiceCartonBreakdownText: string;
  inwardSellThroughSummary: InvoiceSellThroughSummary | null;
  onCopyCardNumber: () => void;
  copiedCard: boolean;
  showCoverPrice?: boolean;
  shouldShowProfitUnderItems?: boolean;
  includeProfitInExport?: boolean;
  totalInvoiceProfit?: number;
  totalInvoiceCost?: number;
  totalInvoiceProfitMargin?: number;
}

/* ========================================================================= */
/* HELPER: RENDER ITEM COVER PRICE (قیمت روی جلد) UNDER UNIT PRICE           */
/* ========================================================================= */
export const renderItemCoverPriceBadge = (
  coverPrice?: number,
  showCoverPrice: boolean = true
) => {
  if (!showCoverPrice || !coverPrice || coverPrice <= 0) return null;

  return (
    <div className="text-[9.5px] text-slate-500 dark:text-slate-400 font-sans mt-0.5 flex items-center justify-center gap-1 select-none print:text-slate-600">
      <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-medium">روی جلد:</span>
      <span className="font-bold text-slate-700 dark:text-slate-300">
        {toPersianDigits(coverPrice.toLocaleString())}
      </span>
      <span className="text-[8px] text-slate-400 font-normal">تومان</span>
    </div>
  );
};

/* ========================================================================= */
/* HELPER: RENDER ITEM PROFIT / LOSS BADGE (CONFIDENTIAL & PRINT-HIDDEN)     */
/* ========================================================================= */
export const renderItemProfitBadge = (
  processedItem: ProcessedItem,
  shouldShowProfit?: boolean,
  includeInExport?: boolean
) => {
  if (!shouldShowProfit) return null;

  const unitPurchasePrice = processedItem.unitPurchasePrice || 0;
  const unitSellingPrice = processedItem.unitSellingPrice || 0;
  const totalProfit = processedItem.totalProfit || 0;
  const profitMarginPercent = processedItem.profitMarginPercent || 0;
  const isProfit = totalProfit > 0;
  const isLoss = totalProfit < 0;

  // Render for any item with calculated cost or profit
  if (unitPurchasePrice <= 0 && totalProfit === 0 && unitSellingPrice <= 0) return null;

  const hideClasses = includeInExport 
    ? 'item-profit-badge-exportable' 
    : 'item-profit-badge no-print hide-on-export confidential-price-data print:hidden';

  return (
    <div 
      className={`${hideClasses} mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100/95 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700/80 text-[10px] font-mono select-none`}
      title={includeInExport ? "سود و زیان این قلم (در چاپ و خروجی فعال)" : "سود و زیان این قلم (در چاپ و خروجی مخفی)"}
    >
      <span className="text-slate-500 dark:text-slate-400">
        خرید: {formatPrice(unitPurchasePrice)}
      </span>
      {unitSellingPrice > 0 && unitSellingPrice !== unitPurchasePrice && (
        <>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-slate-500 dark:text-slate-400">
            فروش: {formatPrice(unitSellingPrice)}
          </span>
        </>
      )}
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <span className={`font-black flex items-center gap-0.5 ${
        isProfit 
          ? 'text-emerald-600 dark:text-emerald-400' 
          : isLoss 
          ? 'text-rose-600 dark:text-rose-400' 
          : 'text-slate-600 dark:text-slate-300'
      }`}>
        <span>{isProfit ? 'سود:' : isLoss ? 'زیان:' : 'تراز:'}</span>
        <span dir="ltr">{formatPrice(Math.abs(totalProfit))}</span>
        {profitMarginPercent !== 0 && (
          <span className="text-[9px] font-bold">
            ({profitMarginPercent > 0 ? '+' : ''}{toPersianDigits(profitMarginPercent)}٪)
          </span>
        )}
      </span>
    </div>
  );
};

/* ========================================================================= */
/* HELPER: RENDER LAST TABLE RECORD: TOTAL PROFIT & FULL MARGIN ROW          */
/* ========================================================================= */
export const renderTableProfitSummaryRow = (
  props: InvoiceTemplateProps,
  colSpan: number = 5
) => {
  const {
    shouldShowProfitUnderItems,
    includeProfitInExport,
    totalInvoiceProfit = 0,
    totalInvoiceProfitMargin = 0,
    isPurchase,
    isSecretMode,
  } = props;

  if (!shouldShowProfitUnderItems || isSecretMode) return null;

  const isProfit = totalInvoiceProfit > 0;
  const isLoss = totalInvoiceProfit < 0;
  const hideClasses = includeProfitInExport
    ? 'item-profit-badge-exportable'
    : 'item-profit-badge no-print hide-on-export confidential-price-data print:hidden';

  return (
    <tr className={`invoice-last-record-profit-row ${hideClasses} border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50/95 dark:bg-slate-800/90 font-bold select-none`}>
      <td colSpan={colSpan} className="py-2.5 px-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 dark:text-white">
              {isPurchase ? '📊 آخرین رکورد جدول — سود انتظاری ورود کالا:' : '📊 آخرین رکورد جدول — سود کامل و حاشیه سود فاکتور:'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {isPurchase ? '(تفاوت بهای خرید با نرخ فروش انبار)' : '(مجموع سود ناخالص تمام اقلام)'}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono">
            <span className={`font-black text-sm flex items-center gap-1 ${
              isProfit ? 'text-emerald-700 dark:text-emerald-400' : isLoss ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
            }`}>
              <span>{isProfit ? 'سود کل:' : isLoss ? 'زیان کل:' : 'تراز:'}</span>
              <span dir="ltr">{isProfit ? `+${formatPrice(totalInvoiceProfit)}` : isLoss ? `-${formatPrice(Math.abs(totalInvoiceProfit))}` : '۰'}</span>
              <span className="text-[10px] font-normal text-slate-400">تومان</span>
            </span>
            {totalInvoiceProfitMargin !== 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                حاشیه سود کامل: {totalInvoiceProfitMargin > 0 ? '+' : ''}{toPersianDigits(totalInvoiceProfitMargin)}٪
              </span>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
};

/* ========================================================================= */
/* HELPER: RENDER TOTAL INVOICE PROFIT SUMMARY ROW / RECORD                  */
/* ========================================================================= */
export const renderTotalInvoiceProfitRow = (props: InvoiceTemplateProps) => {
  const { 
    shouldShowProfitUnderItems, 
    includeProfitInExport, 
    totalInvoiceProfit = 0,
    totalInvoiceProfitMargin = 0,
    isPurchase,
    isSecretMode,
  } = props;

  if (!shouldShowProfitUnderItems || isSecretMode) return null;

  const isProfit = totalInvoiceProfit > 0;
  const isLoss = totalInvoiceProfit < 0;
  const hideClasses = includeProfitInExport 
    ? 'item-profit-badge-exportable' 
    : 'item-profit-badge no-print hide-on-export confidential-price-data print:hidden';

  return (
    <div className={`invoice-total-profit-box ${hideClasses} p-2.5 rounded-xl border mt-2 flex items-center justify-between text-xs font-bold ${
      isProfit
        ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
        : isLoss
        ? 'bg-rose-50/90 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
    }`}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span>{isPurchase 
          ? (isProfit ? '📊 سود ناخالص انتظاری بار ورودی:' : '⚠️ زیان انتظاری بار ورودی:') 
          : (isProfit ? '📊 جمع کل سود ناخالص فاکتور:' : isLoss ? '⚠️ جمع کل زیان ناخالص فاکتور:' : '📊 تراز کل سود فاکتور:')
        }</span>
        {totalInvoiceProfitMargin !== 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/70 border border-current">
            حاشیه سود: {totalInvoiceProfitMargin > 0 ? '+' : ''}{toPersianDigits(totalInvoiceProfitMargin)}٪
          </span>
        )}
      </div>
      <div className="font-mono text-sm font-black dir-ltr">
        {isProfit ? `+${formatPrice(totalInvoiceProfit)}` : isLoss ? `-${formatPrice(Math.abs(totalInvoiceProfit))}` : '۰'}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* HELPER 1: RENDER CUMULATIVE BALANCE ROW UNDER NET PAYABLE BOX             */
/* ========================================================================= */
export const renderCumulativeBalanceSection = (props: InvoiceTemplateProps) => {
  const { 
    finalBalanceDisplay, 
    cumulativeBalanceVal = 0, 
    isCreditOrPartial = false, 
    previousBalanceNumber = 0,
    netPayableAmount = 0,
    remainingDebtAmount = 0,
    isCashPayment = false,
    isPurchase = false,
    isDarkCanvas,
  } = props;

  const unpaidAmount = isCreditOrPartial 
    ? (remainingDebtAmount > 0 ? remainingDebtAmount : netPayableAmount)
    : (isCashPayment ? 0 : netPayableAmount);

  const hasPreviousBalance = previousBalanceNumber !== 0;
  const isCreditInvoice = !isCashPayment || isCreditOrPartial;

  if (!isCreditInvoice && !hasPreviousBalance) {
    return null;
  }

  const borderClass = isDarkCanvas ? 'border-slate-700/80' : 'border-slate-200';
  const boxBg = isDarkCanvas ? 'bg-slate-800/80' : 'bg-slate-50';

  return (
    <div className={`space-y-2 mt-2.5 pt-2 border-t ${borderClass}`}>
      <div className={`p-2.5 rounded-none border ${borderClass} ${boxBg} space-y-2 text-xs`}>
        <div className="flex items-center justify-between font-bold pb-1 border-b border-black/5 dark:border-white/5">
          <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-black text-[11px]">
            <Scale className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{isCreditInvoice ? 'محاسبه نسیه و مانده کل حساب طرف‌حساب:' : 'وضعیت مانده حساب قبلی:'}</span>
          </span>
          <span className={`text-[9.5px] px-2 py-0.5 rounded-none font-black ${
            isCreditInvoice 
              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
          }`}>
            {isCreditInvoice ? 'فاکتور نسیه' : 'تسویه نقدی'}
          </span>
        </div>

        {/* 3-Step Math Formula */}
        <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
          {/* 1. مانده قبلی */}
          <div className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/80 flex flex-col justify-between items-center min-h-[66px]">
            <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-bold block mb-0.5">مانده قبلی:</span>
            <span className="font-mono font-black text-slate-800 dark:text-slate-200 dir-ltr text-xs sm:text-[13px] block tracking-tight select-all">
              {previousBalanceNumber < 0 ? `-${formatPrice(Math.abs(previousBalanceNumber), false)}` : formatPrice(previousBalanceNumber, false)}
            </span>
            <span className="text-[8px] sm:text-[8.5px] leading-tight text-slate-500 dark:text-slate-400 font-medium block mt-1 break-words max-w-full text-center">
              ({numberToPersianWords(previousBalanceNumber, true)})
            </span>
          </div>

          {/* 2. نسیه فاکتور */}
          <div className="p-1.5 sm:p-2 rounded-lg border border-amber-200 dark:border-amber-800/70 bg-amber-50/60 dark:bg-amber-950/40 flex flex-col justify-between items-center min-h-[66px]">
            <span className="text-[9.5px] text-amber-700 dark:text-amber-400 font-bold block mb-0.5">نسیه فاکتور (+):</span>
            <span className="font-mono font-black text-amber-600 dark:text-amber-400 dir-ltr text-xs sm:text-[13px] block tracking-tight select-all">
              +{formatPrice(unpaidAmount, false)}
            </span>
            <span className="text-[8px] sm:text-[8.5px] leading-tight text-amber-800/80 dark:text-amber-400/80 font-medium block mt-1 break-words max-w-full text-center">
              ({numberToPersianWords(unpaidAmount, true)})
            </span>
          </div>

          {/* 3. جمع کل مانده */}
          <div className="p-1.5 sm:p-2 rounded-lg border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/40 flex flex-col justify-between items-center min-h-[66px]">
            <span className="text-[9.5px] text-rose-700 dark:text-rose-400 font-bold block mb-0.5">جمع کل مانده (=):</span>
            <span className="font-mono font-black text-rose-700 dark:text-rose-300 dir-ltr text-xs sm:text-[13px] block tracking-tight select-all">
              {cumulativeBalanceVal < 0 ? `-${formatPrice(Math.abs(cumulativeBalanceVal), false)}` : formatPrice(cumulativeBalanceVal, false)}
            </span>
            <span className="text-[8px] sm:text-[8.5px] leading-tight text-rose-800 dark:text-rose-300 font-bold block mt-1 break-words max-w-full text-center">
              ({numberToPersianWords(cumulativeBalanceVal, true)})
            </span>
          </div>
        </div>

        {/* Running Balance Word Banner */}
        <div className="flex items-center justify-between text-[10.5px] pt-1 font-medium border-t border-black/5 dark:border-white/5">
          <span className="text-slate-500 dark:text-slate-400">وضعیت نهایی حساب طرف‌حساب:</span>
          <span className="font-black text-slate-900 dark:text-white text-[11px]">
            {finalBalanceDisplay}
          </span>
        </div>
      </div>
    </div>
  );
};

export const renderExpensesSummary = (invoice: Invoice) => {
  if (!invoice.expenses || invoice.expenses.length === 0) return null;
  return (
    <div className="space-y-1.5 pt-1.5 border-t border-dashed border-slate-300 dark:border-slate-700">
      {invoice.expenses.map((exp, idx) => (
        <div key={`exp-tmpl-${exp.id || idx}`} className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-bold">
              {exp.action === 'deduct' ? 'کسر ' : exp.action === 'add' ? 'افزودن ' : ''}{exp.title}:
            </span>
            <span className={`dir-ltr font-black ${exp.action === 'deduct' ? 'text-rose-600' : exp.action === 'add' ? 'text-emerald-700' : 'text-slate-600'}`}>
              {exp.action === 'deduct' ? `-${formatPrice(exp.amount)}` : exp.action === 'add' ? `+${formatPrice(exp.amount)}` : formatPrice(exp.amount)}
            </span>
          </div>
          {exp.amount > 0 && (
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium text-right pr-2">
              ({numberToPersianWords(exp.amount)})
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ========================================================================= */
/* HELPER 2: RENDER HARMONIOUS & BALANCED BANK CARD, NOTES & SIGNATURES BOX   */
/* ========================================================================= */
export const renderBankAndSignaturesBox = (props: InvoiceTemplateProps) => {
  const { settings, invoice, onCopyCardNumber, copiedCard, isDarkCanvas } = props;

  const hasBankInfo = Boolean(settings.cardNumber || settings.iban || settings.accountNumber || settings.bankName);
  const hasNotes = Boolean(invoice.notes || settings.minOrderNotice);

  return (
    <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3.5 ${
      isDarkCanvas 
        ? 'bg-slate-900/60 border-slate-800 text-slate-200' 
        : 'bg-slate-50/80 border-slate-200 text-slate-800'
    }`}>
      <div className="space-y-3">
        {/* Bank & Payment Information */}
        {hasBankInfo && (
          <div className={`p-3 rounded-lg border space-y-2 ${
            isDarkCanvas 
              ? 'bg-slate-800/60 border-slate-700/80 text-slate-100' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70 dark:border-slate-700/70">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>اطلاعات واریز بانکی</span>
              </div>
              {settings.cardNumber && (
                <button
                  type="button"
                  onClick={onCopyCardNumber}
                  className="no-print text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  {copiedCard ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>کپی شد ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-emerald-600" />
                      <span>کپی کارت</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              {settings.cardNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">شماره کارت:</span>
                  <span className="font-black text-slate-900 dark:text-white tracking-wider text-xs select-all">
                    {toPersianDigits(settings.cardNumber)}
                  </span>
                </div>
              )}
              {settings.bankName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">بانک:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {settings.bankName}
                  </span>
                </div>
              )}
              {settings.iban && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">شماره شبا:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs tracking-wider select-all">
                    {toPersianDigits(settings.iban)}
                  </span>
                </div>
              )}
              {settings.accountNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">شماره حساب:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs select-all">
                    {toPersianDigits(settings.accountNumber)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terms & Notes */}
        {hasNotes && (
          <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong className="block text-slate-900 dark:text-slate-200 font-bold mb-0.5">توضیحات:</strong>
            <p className="line-clamp-2">{invoice.notes || settings.minOrderNotice}</p>
          </div>
        )}
      </div>

      {/* Signatures & Stamps */}
      <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-center text-xs">
        <div className="space-y-2">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px]">
            {settings.sellerStampName ? `مهر و امضای ${settings.sellerStampName}` : 'مهر و امضای فروشنده'}
          </span>
          <div className="h-7 border-b border-dashed border-slate-300 dark:border-slate-700 rounded flex items-center justify-center text-[10px] text-slate-400/50">
            محل مهر و امضا
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px]">امضای خریدار</span>
          <div className="h-7 border-b border-dashed border-slate-300 dark:border-slate-700 rounded flex items-center justify-center text-[10px] text-slate-400/50">
            محل امضا
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 0. PRINT MODERN MONO: چاپ رسمی مدرن و باکلاس (سیاه و سفید سوئیسی)        */
/* ========================================================================= */
export const PrintModernMonoTemplate: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    isPurchase,
    isSecretMode,
    isPresentationModeActive,
    processedItems,
    grossAmount,
    discount,
    tax,
    totalInvoiceReturnsAmount,
    netPayableAmount,
    invoiceCartonBreakdownText,
    inwardSellThroughSummary,
    shouldShowProfitUnderItems,
    includeProfitInExport,
  } = props;

  return (
    <div className="space-y-6 text-slate-900 bg-white select-text">
      {/* Editorial Minimal Header */}
      <div className="pb-5 border-b-2 border-slate-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="space-y-1.5 text-right">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              {settings.brandName || 'فروشگاه بازرگانی'}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {settings.subtitle || (isPurchase ? 'مرکز ورود و تأمین کالا' : 'فروش عمده و توزیع کالا و خدمات')}
            </p>
            {settings.bismillah && (
              <p className="text-[11px] text-slate-500 tracking-wider">
                {settings.bismillah}
              </p>
            )}
          </div>

          <div className="text-center self-center sm:self-auto">
            <div className="border border-slate-900 px-4 py-1.5 text-xs font-black tracking-wider uppercase">
              {isPurchase
                ? (isPresentationModeActive ? 'سند تأمین و تحویل کالا' : 'سند رسمی ورود کالا به انبار')
                : 'صورت‌حساب رسمی فروش کالا و خدمات'}
            </div>
            {invoice.isDraft && (
              <span className="block text-[11px] font-bold text-slate-600 mt-1">
                (نسخه پیش‌نویس موقت)
              </span>
            )}
          </div>

          {/* Metadata Block: Clean Typographic Alignment */}
          <div className="text-xs space-y-1 min-w-[160px] text-right">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500">شماره سند:</span>
              <span className="font-black text-slate-950">{toPersianDigits(invoice.invoiceNumber)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500">تاریخ صدور:</span>
              <span className="font-bold text-slate-900">{toPersianDigits(invoice.date)}</span>
            </div>
            {invoice.time && (
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-500">زمان ثبت:</span>
                <span className="text-slate-700">{toPersianDigits(invoice.time)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-500">نحوه تسویه:</span>
              <span className="font-bold text-slate-900">{invoice.paymentMethod || 'نقدی'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Parties: Clean Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="space-y-1.5 pb-2 border-b md:border-b-0 md:border-l md:border-slate-200 md:pl-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            {isPurchase ? 'مشخصات تأمین‌کننده (فروشنده):' : 'مشخصات فروشنده / صادرکننده:'}
          </div>
          <div className="text-sm font-black text-slate-950">
            {isPurchase ? (invoice.customerName || 'تامین‌کننده') : (settings.brandName || 'فروشگاه')}
          </div>
          <div className="text-slate-600 flex items-center gap-1.5">
            <span className="text-slate-500">تماس:</span>
            <span>{toPersianDigits(isPurchase ? (invoice.customerPhone || '-') : (settings.phone || '-'))}</span>
          </div>
          <div className="text-slate-600">
            <span className="text-slate-500">نشانی: </span>
            <span>{isPurchase ? (invoice.customerCity || invoice.customerAddress || '-') : (settings.address || '-')}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            {isPurchase ? 'مشخصات خریدار (تحویل‌گیرنده انبار):' : 'مشخصات خریدار (طرف‌حساب):'}
          </div>
          <div className="text-sm font-black text-slate-950">
            {isPurchase ? (settings.brandName || 'انبار مرکزی') : (invoice.customerName || 'مشتری')}
          </div>
          <div className="text-slate-600 flex items-center gap-1.5">
            <span className="text-slate-500">همراه:</span>
            <span>{toPersianDigits(isPurchase ? (settings.phone || '-') : (invoice.customerPhone || '-'))}</span>
          </div>
          <div className="text-slate-600">
            <span className="text-slate-500">نشانی: </span>
            <span>{isPurchase ? settings.address : (invoice.customerCity || invoice.customerAddress || '-')}</span>
          </div>
        </div>
      </div>

      {/* Items Table: Professional Editorial Horizontal Lines */}
      <div className="overflow-hidden border border-slate-300 rounded-lg">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 text-slate-900 font-black text-xs">
              <th className="py-2.5 px-2 text-center w-10 shrink-0">#</th>
              <th className="py-2.5 px-3">شرح کامل کالا و بسته‌بندی</th>
              <th className="py-2.5 px-3 text-center min-w-[120px] shrink-0">مقدار (تعداد / کارتن)</th>
              <th className="py-2.5 px-3 text-center w-28 shrink-0">
                {isPurchase ? (isPresentationModeActive ? 'فی واحد' : 'فی خرید') : 'فی واحد'}
              </th>
              <th className="py-2.5 px-3 text-center w-32 shrink-0">
                {isPurchase ? (isPresentationModeActive ? 'مبلغ کل' : 'مبلغ کل خرید') : 'مبلغ کل (تومان)'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {processedItems.map((processedItem) => {
              const {
                item,
                index,
                cartonLabel,
                packagingSpec,
                isUnknown,
                hasCustomNote,
                itemReturns,
                itemReturnedCartons,
                itemReturnedExtraPieces,
                itemReturnedTotalAmount,
                itemNetPrice,
                displayUnitPrice,
                displayLineTotal,
                hasDiscount,
                discountPercent,
                discountedUnitPrice,
                discountedLineTotal
              } = processedItem;
              return (
                <tr key={`mono-item-${item.id || index}`} className="text-slate-900">
                  <td className="py-2.5 px-2 text-center text-slate-500">
                    {toPersianDigits(index + 1)}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className={`font-bold text-sm ${itemReturns.length > 0 && (item.totalPieces === 0 || itemNetPrice === 0) ? 'line-through text-slate-400' : 'text-slate-950'}`}>
                      {item.productName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                      {!isUnknown && <span>{packagingSpec}</span>}
                      {hasCustomNote && (
                        <>
                          <span>·</span>
                          <span>{item.customDescription}</span>
                        </>
                      )}
                    </div>
                    {itemReturns.length > 0 && (
                      <div className="text-[11px] font-bold text-slate-900 mt-0.5">
                        مرجوع شده: {toPersianDigits(itemReturnedCartons)} کارتن
                        {itemReturnedExtraPieces > 0 ? ` و ${toPersianDigits(itemReturnedExtraPieces)} دانه` : ''}
                        <span className="mr-1 dir-ltr inline-block">(-{formatPrice(itemReturnedTotalAmount)})</span>
                      </div>
                    )}
                    {renderItemProfitBadge(processedItem, shouldShowProfitUnderItems, includeProfitInExport)}
                  </td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  <div className="font-bold text-sm">
                    {toPersianDigits(item.totalPieces.toLocaleString())} {item.unitTitle || 'عدد'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {cartonLabel}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center text-sm whitespace-nowrap">
                  <div>{toPersianDigits(displayUnitPrice.toLocaleString())}</div>
                  {renderItemCoverPriceBadge(processedItem.coverPrice, props.showCoverPrice)}
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode && (
                    <div className="text-[10px] text-slate-900 dark:text-slate-100 font-bold mt-0.5">
                      با {toPersianDigits(discountPercent)}٪ تخفیف: {toPersianDigits((discountedUnitPrice || 0).toLocaleString())}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-sm whitespace-nowrap text-slate-950">
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode ? (
                    <div>
                      <span>{toPersianDigits((discountedLineTotal || 0).toLocaleString())}</span>
                      <span className="text-[10px] text-slate-400 line-through mr-1 font-normal block">
                        {toPersianDigits(displayLineTotal.toLocaleString())}
                      </span>
                    </div>
                  ) : (
                    <span>{toPersianDigits(displayLineTotal.toLocaleString())}</span>
                  )}
                </td>
              </tr>
            ); })}
            {renderTableProfitSummaryRow(props, 5)}
          </tbody>
        </table>
      </div>

      {/* Summary & Bank/Signatures Grid: 2 Balanced Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        {/* Left: Financial Ledger Box Matching Table Border */}
        <div className="p-4 rounded-lg border border-slate-300 bg-slate-50/70 space-y-2 text-slate-900 flex flex-col justify-between">
          <div className="space-y-1.5 pb-2 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">
                جمع ناخالص ({toPersianDigits(processedItems.length)} قلم{invoiceCartonBreakdownText ? ` · ${invoiceCartonBreakdownText}` : ''}):
              </span>
              <span className="font-bold">{formatPrice(grossAmount)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between font-bold">
                <span>تخفیف:</span>
                <span className="dir-ltr">-{formatPrice(discount)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-600">مالیات / ارزش افزوده:</span>
                <span className="dir-ltr">+{formatPrice(tax)}</span>
              </div>
            )}
            {totalInvoiceReturnsAmount > 0 && (
              <div className="flex items-center justify-between font-bold">
                <span>کسر بابت مرجوعی:</span>
                <span className="dir-ltr">-{formatPrice(totalInvoiceReturnsAmount)}</span>
              </div>
            )}
            {renderExpensesSummary(invoice)}
          </div>

          {/* Net Payable: Clean Matching Border */}
          <div className="border border-slate-300 p-3 rounded-lg bg-white text-black">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-black">
                {isPurchase ? (isPresentationModeActive ? 'مبلغ نهایی فاکتور:' : 'مبلغ کل خرید فاکتور:') : 'مبلغ خالص قابل دریافت:'}
              </span>
              <span className="font-black text-xl text-black">
                {formatPrice(netPayableAmount)}
              </span>
            </div>

            {/* Inward Sell-Through Single Line */}
            {isPurchase && !isSecretMode && !isPresentationModeActive && inwardSellThroughSummary && (
              <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                <span className="text-[11px] text-slate-600 font-medium">وضعیت فروش این فاکتور:</span>
                <div className="font-black">
                  <span>{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش‌رفته</span>
                  <span className="mx-2 text-slate-400">|</span>
                  <span>{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ در انبار مانده</span>
                </div>
              </div>
            )}

            {/* Cumulative Balance Underneath Net Amount */}
            {renderCumulativeBalanceSection(props)}
            {renderTotalInvoiceProfitRow(props)}
          </div>
        </div>

        {/* Right: Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* UNIFIED MASTER COMMERCIAL TEMPLATE (عین عکس ارسالی کاربر برای خرید و فروش) */
/* ========================================================================= */
/* UNIFIED MASTER COMMERCIAL TEMPLATE (دقیقاً عین عکس ارسالی کاربر برای خرید و فروش) */
/* ========================================================================= */
export const UnifiedMasterCommercialTemplate: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    theme,
    isPurchase,
    isDarkCanvas,
    processedItems,
    grossAmount,
    discount,
    tax,
    netPayableAmount,
    onCopyCardNumber,
    copiedCard,
    shouldShowProfitUnderItems,
    includeProfitInExport,
  } = props;

  // Primary palette styling matching the active theme color palette:
  const primaryHex = theme?.hex || (isPurchase ? '#5c67f2' : '#0d9488');

  const additionExpenses = invoice.expenses?.filter(e => e.action === 'add' && e.amount > 0) || [];
  const totalAdditionExpenses = additionExpenses.reduce((s, e) => s + e.amount, 0);

  // Soft card background tints matching the selected palette
  const infoCardBg = isDarkCanvas 
    ? 'bg-slate-800/60 border-slate-700/80' 
    : 'bg-[#f8fafc] border-slate-200/90';

  const partyCardStyle = {
    backgroundColor: isDarkCanvas ? `${primaryHex}18` : `${primaryHex}0A`,
    borderColor: `${primaryHex}35`
  };

  const bottomFinanceCardStyle = {
    backgroundColor: isDarkCanvas ? `${primaryHex}14` : `${primaryHex}08`,
    borderColor: `${primaryHex}30`
  };

  const highlightTotalBoxStyle = {
    backgroundColor: primaryHex,
    borderColor: primaryHex,
    color: '#ffffff'
  };

  const brandTitle = settings.brandName || 'بازرگانی';
  const brandSubtitle = settings.subtitle || (isPurchase ? 'همراه مطمئن کسب و کار شما' : 'اعتماد شما سرمایه ماست');

  return (
    <div className={`space-y-5 transition-colors select-text ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* 1. TOP HEADER (لوگوی بازرگانی در راست + بج رسمی فروش/ورود کالا در چپ) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        {/* Right side: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-white flex items-center justify-center shrink-0 shadow-xs"
            style={{ backgroundColor: primaryHex }}
          >
            <Boxes className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {brandTitle}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {brandSubtitle}
            </p>
          </div>
        </div>

        {/* Left side: Rounded Pill Badge */}
        <div className="flex flex-col items-start sm:items-end">
          <div 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-black text-sm shadow-xs"
            style={{ backgroundColor: primaryHex }}
          >
            {isPurchase ? (
              <Truck className="w-4 h-4 stroke-[2.2]" />
            ) : (
              <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
            )}
            <span>{isPurchase ? 'فاکتور ورود کالا' : 'فاکتور فروش'}</span>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">
            {isPurchase ? 'خرید کالا و خدمات' : 'فروش کالا و خدمات'}
          </span>
        </div>
      </div>

      {/* 2. TOP METADATA CARDS (کارت مشخصات طرف‌حساب در چپ + کارت اطلاعات فاکتور در راست) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Left Card: مشخصات طرف‌حساب (مشتری یا تأمین‌کننده) */}
        <div 
          className="rounded-2xl border p-4 sm:p-5 text-right space-y-3 transition-colors"
          style={partyCardStyle}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2">
              <div 
                className="w-7 h-7 rounded-xl text-white flex items-center justify-center shrink-0"
                style={{ backgroundColor: primaryHex }}
              >
                {isPurchase ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <span className="font-bold text-xs" style={{ color: primaryHex }}>
                {isPurchase ? 'مشخصات تأمین کننده' : 'مشخصات مشتری'}
              </span>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2">
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {invoice.customerName || (isPurchase ? 'حسین امامی' : 'صابر کریمی')}
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-mono text-xs sm:text-sm font-bold">
              <Phone className="w-3.5 h-3.5" style={{ color: primaryHex }} />
              <span>{toPersianDigits(invoice.customerPhone || (isPurchase ? '۰۹۱۲۱۳۳۶۸۶۷' : '۰۹۱۸۹۲۲۳۹۴۵'))}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-medium">
              <MapPin className="w-3.5 h-3.5" style={{ color: primaryHex }} />
              <span>{invoice.customerCity || invoice.customerAddress || (isPurchase ? 'کرمانشاه، شهرستان جوانرود' : 'جوانرود، کرمانشاه')}</span>
            </div>
          </div>
        </div>

        {/* Right Card: اطلاعات فاکتور */}
        <div className={`rounded-2xl border p-4 sm:p-5 text-right space-y-3 transition-colors ${infoCardBg}`}>
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/70 dark:border-slate-700/70">
            <div 
              className="w-7 h-7 rounded-xl text-white flex items-center justify-center shrink-0"
              style={{ backgroundColor: primaryHex }}
            >
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
              اطلاعات فاکتور
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">شماره</span>
              <span className="font-mono font-black text-slate-900 dark:text-white">
                {toPersianDigits(invoice.invoiceNumber || '۹۱۲۱۱')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">تاریخ:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {toPersianDigits(invoice.date || '۱۴۰۴/۰۶/۲۵')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">ساعت:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {toPersianDigits(invoice.time || '۱۶:۴۲')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">کاربر:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {isPurchase ? 'کارشناس خرید' : 'کارشناس فروش'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABLE SECTION (جدول اقلام - دقیقاً عین عکس، با حذف عکس محصول) */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold">
              <th className="py-3 px-3 text-center w-12 font-bold">#</th>
              <th className="py-3 px-4 font-bold">شرح کالا</th>
              <th className="py-3 px-3 text-center font-bold min-w-[110px]">تعداد و کارتن</th>
              <th className="py-3 px-3 text-center font-bold min-w-[110px]">
                <div>فی واحد</div>
                <div className="text-[10px] text-slate-400 font-normal">(تومان)</div>
              </th>
              <th className="py-3 px-4 text-left font-bold min-w-[120px]">
                <div>مبلغ کل</div>
                <div className="text-[10px] text-slate-400 font-normal">(تومان)</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {processedItems.map((processedItem) => {
              const {
                item,
                index,
                cartonLabel,
                packagingSpec,
                displayUnitPrice,
                displayLineTotal,
                hasDiscount,
                discountPercent,
                discountedUnitPrice,
                discountedLineTotal,
              } = processedItem;
              const effectiveLineTotal = discountedLineTotal || displayLineTotal;

              return (
                <tr key={`unified-item-${item.id || index}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  {/* # Index */}
                  <td className="py-3.5 px-3 text-center text-slate-400 dark:text-slate-500 font-medium">
                    {toPersianDigits(index + 1)}
                  </td>

                  {/* Description & Packaging (No product thumbnail) */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {item.productName}
                    </div>
                    {packagingSpec && (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                        {packagingSpec}
                      </div>
                    )}
                    {renderItemProfitBadge(processedItem, shouldShowProfitUnderItems, includeProfitInExport)}
                  </td>

                  {/* Quantity & Cartons */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(item.totalPieces.toLocaleString())} عدد
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                      {cartonLabel}
                    </div>
                  </td>

                  {/* Unit Price & Discount */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(displayUnitPrice.toLocaleString())}
                    </div>
                    {renderItemCoverPriceBadge(processedItem.coverPrice, props.showCoverPrice)}
                    {hasDiscount && discountPercent && discountPercent > 0 && (
                      <div className="text-[10px] text-slate-900 dark:text-slate-100 font-bold mt-0.5">
                        با {toPersianDigits(discountPercent)}٪ تخفیف: {toPersianDigits((discountedUnitPrice || 0).toLocaleString())}
                      </div>
                    )}
                  </td>

                  {/* Total Line Amount */}
                  <td className="py-3.5 px-4 text-left whitespace-nowrap">
                    <div className="font-black text-sm sm:text-base text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(effectiveLineTotal.toLocaleString())}
                    </div>
                  </td>
                </tr>
              );
            })}
            {renderTableProfitSummaryRow(props, 5)}
          </tbody>
        </table>
      </div>

      {/* 4. BOTTOM SECTION (اطلاعات واریز بانکی در چپ + خلاصه مالی در راست) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        {/* Left Column: Bank Info & Signatures */}
        <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-colors ${infoCardBg}`}>
          <div className="space-y-3">
            {/* Bank Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-slate-700/70">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
                <div 
                  className="w-7 h-7 rounded-xl text-white flex items-center justify-center shrink-0 shadow-2xs"
                  style={{ backgroundColor: primaryHex }}
                >
                  <Building2 className="w-4 h-4" />
                </div>
                <span>اطلاعات واریز بانکی</span>
              </div>
              {settings.cardNumber && (
                <button
                  type="button"
                  onClick={onCopyCardNumber}
                  className="no-print w-7 h-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                  title="کپی شماره کارت"
                >
                  {copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Bank Rows */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">شماره کارت:</span>
                <span className="font-mono font-black text-slate-900 dark:text-white text-sm tracking-wider select-all">
                  {toPersianDigits(settings.cardNumber || '۶۱۰۴۳۳۷۴۲۰۶۷۲۷۲۵')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">بانک:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {settings.bankName || 'بانک ملت'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">شماره شبا:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs tracking-wider select-all" dir="ltr">
                  {toPersianDigits(settings.iban || 'IR ۴۷۰۱۲۰۰۱۰۰۰۰۰۰۰۸۳۴۹۱۸۳۱۰۵')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-medium">شماره حساب:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs select-all">
                  {toPersianDigits(settings.accountNumber || '۸۳۴۹۱۸۳۱۰۵')}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures: Two distinct rounded cards */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-700 text-center">
            {/* Right Signature Box: Management */}
            <div className="space-y-1 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 p-3 shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                <User className="w-3.5 h-3.5" style={{ color: primaryHex }} />
                <span>{isPurchase ? 'مهر و امضای مدیر خرید' : 'مهر و امضای مدیریت بازرگانی'}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-normal">
                محل مهر و امضا
              </div>
            </div>
            {/* Left Signature Box: Buyer */}
            <div className="space-y-1 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 p-3 shadow-2xs">
              <div className="flex items-center justify-center gap-1 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                <ArrowDownLeft className="w-3.5 h-3.5" style={{ color: primaryHex }} />
                <span>امضای خریدار</span>
              </div>
              <div className="text-[10px] text-slate-400 font-normal">
                محل امضا
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Calculations */}
        <div 
          className="rounded-2xl border p-4 sm:p-5 space-y-3.5 flex flex-col justify-between transition-colors"
          style={bottomFinanceCardStyle}
        >
          <div className="space-y-3">
            {/* Header: Gross subtotal with circular icon */}
            <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div 
                  className="w-7 h-7 rounded-full text-white flex items-center justify-center shrink-0 shadow-2xs"
                  style={{ backgroundColor: primaryHex }}
                >
                  <Receipt className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  جمع فاکتور ({toPersianDigits(processedItems.length)} قلم)
                </span>
              </div>
              <div className="text-left">
                <div className="font-mono font-black text-slate-900 dark:text-white text-base sm:text-lg">
                  {formatPrice(grossAmount, false)}
                </div>
                <div className="text-[11px] text-slate-500 font-normal text-left">تومان</div>
              </div>
            </div>

            {/* Middle Rows: Freight, Tax, Discounts */}
            {isPurchase ? (
              <>
                {additionExpenses.length > 0 ? (
                  additionExpenses.map((exp, expIdx) => (
                    <div key={`exp-add-${exp.id || expIdx}`} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                        <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{exp.title || 'افزودن هزینه حمل و نقل'}</span>
                      </div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm dir-ltr">
                        {formatPrice(exp.amount)}
                      </div>
                    </div>
                  ))
                ) : totalAdditionExpenses > 0 ? (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                      <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>افزودن هزینه حمل و نقل</span>
                    </div>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm dir-ltr">
                      {formatPrice(totalAdditionExpenses)}
                    </div>
                  </div>
                ) : null}

                {discount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold">
                      <Percent className="w-4 h-4 text-amber-500" />
                      <span>تخفیف کل فاکتور:</span>
                    </div>
                    <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs sm:text-sm dir-ltr">
                      {formatPrice(discount)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">مبلغ کل خرید</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatPrice(grossAmount)}
                  </span>
                </div>

                {tax > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
                      <Scale className="w-4 h-4" style={{ color: primaryHex }} />
                      <span>۹٪ مالیات بر ارزش افزوده</span>
                    </div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm dir-ltr">
                      {formatPrice(tax)}
                    </div>
                  </div>
                )}

                {discount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold">
                      <Percent className="w-4 h-4 text-rose-500" />
                      <span>تخفیف فاکتور:</span>
                    </div>
                    <div className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm dir-ltr">
                      -{formatPrice(discount)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2.5 pt-2 border-t border-black/5 dark:border-white/5">
            {/* Highlight Total Box */}
            <div 
              className="p-4 rounded-2xl border flex items-center justify-between transition-colors text-white"
              style={highlightTotalBoxStyle}
            >
              <div className="flex items-center gap-2">
                {!isPurchase && <Wallet className="w-5 h-5 text-white/90" />}
                <span className="text-sm sm:text-base font-black">
                  {isPurchase ? 'مبلغ کل خرید' : 'جمع کل پرداخت'}
                </span>
              </div>
              <div className="text-left">
                <div className="font-mono font-black text-xl sm:text-2xl">
                  {formatPrice(netPayableAmount, false)}
                </div>
                <div className="text-[11px] opacity-90 text-left font-normal">تومان</div>
              </div>
            </div>

            {/* Status Line */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 pt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                وضعیت فاکتور: {invoice.paymentStatus === 'cash' ? 'تسویه شده / نقدی' : 'تسویه نشده / نسیه و بدهکار'}
              </span>
            </div>

            {/* Cumulative Balance Underneath Net Amount (نسیه + مانده قبلی مشتری) */}
            {renderCumulativeBalanceSection(props)}

            {/* Total Profit Row when Profit Mode is toggled ON */}
            {renderTotalInvoiceProfitRow(props)}
          </div>
        </div>
      </div>

      {/* 5. FOOTER (تاریخ فاکتور و با تشکر از اعتماد شما) */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-200/80 dark:border-slate-800">
        {isPurchase ? (
          <>
            <div className="flex items-center gap-1.5">
              <div 
                className="w-5 h-5 rounded-md text-white flex items-center justify-center shrink-0"
                style={{ backgroundColor: primaryHex }}
              >
                <Calendar className="w-3 h-3" />
              </div>
              <span>تاریخ فاکتور: {toPersianDigits(invoice.date || '۱۴۰۴/۰۶/۲۵')}</span>
            </div>
            <div className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
              <span>با تشکر از اعتماد شما</span>
              <Heart className="w-3.5 h-3.5 fill-current inline" style={{ color: primaryHex }} />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
              <User className="w-3.5 h-3.5" style={{ color: primaryHex }} />
              <span>با تشکر از اعتماد شما</span>
              <Heart className="w-3.5 h-3.5 fill-current inline" style={{ color: primaryHex }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span>تاریخ فاکتور: {toPersianDigits(invoice.date || '۱۴۰۴/۰۶/۲۵')}</span>
              <div 
                className="w-5 h-5 rounded-md text-white flex items-center justify-center shrink-0"
                style={{ backgroundColor: primaryHex }}
              >
                <Calendar className="w-3 h-3" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* Backwards compatibility aliases */
export const GraphicInwardPurchaseMasterTemplate = UnifiedMasterCommercialTemplate;
export const GraphicSwissTemplate = UnifiedMasterCommercialTemplate;

/* ========================================================================= */
/* 2. GRAPHIC MODEL 2: MODERN FINTECH NEO-GRID (مدل ۲: فین‌تک مدولار)       */
/* ========================================================================= */
export const GraphicFintechTemplate: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    theme,
    isPurchase,
    isSecretMode,
    isPresentationModeActive,
    isDarkCanvas,
    processedItems,
    grossAmount,
    discount,
    tax,
    totalInvoiceReturnsAmount,
    netPayableAmount,
    invoiceCartonBreakdownText,
    inwardSellThroughSummary,
    shouldShowProfitUnderItems,
    includeProfitInExport,
  } = props;

  return (
    <div className={`space-y-5 transition-colors ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Top Banner Ribbon */}
      <div 
        className="p-5 rounded-2xl text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ backgroundColor: theme.hex }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold bg-white/20 px-2.5 py-0.5 rounded-md">
              {isPurchase ? 'صورت‌حساب تأمین' : 'صورت‌حساب فروش'}
            </span>
            {invoice.isDraft && <span className="text-[11px] bg-amber-400 text-slate-900 font-bold px-2 py-0.5 rounded-md">پیش‌نویس</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">{settings.brandName || 'سازمان تجاری'}</h1>
          <p className="text-xs text-white/80">{settings.subtitle || 'سیستم هوشمند انبارداری و توزیع کالا'}</p>
        </div>

        <div className="bg-black/20 backdrop-blur-xs px-4 py-2 rounded-xl text-left text-xs space-y-0.5 border border-white/10">
          <div className="text-white/80">شماره: <span className="font-black text-white">{toPersianDigits(invoice.invoiceNumber)}</span></div>
          <div className="text-white/80">تاریخ: <span>{toPersianDigits(invoice.date)}</span></div>
        </div>
      </div>

      {/* Grid Cards for Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
        <div className={`p-4 rounded-2xl border ${isDarkCanvas ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
          <div className="text-[10.5px] font-bold text-slate-400 uppercase mb-1">صادرکننده:</div>
          <div className="font-black text-sm text-slate-900 dark:text-white">{isPurchase ? (invoice.customerName || 'تامین‌کننده') : (settings.brandName || 'فروشگاه')}</div>
          <div className="text-slate-500 mt-1">تلفن: {toPersianDigits(isPurchase ? (invoice.customerPhone || '-') : (settings.phone || '-'))}</div>
          <div className="text-slate-500 mt-0.5">نشانی: {isPurchase ? (invoice.customerCity || invoice.customerAddress || '-') : (settings.address || '-')}</div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDarkCanvas ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50/80 border-slate-200'}`}>
          <div className="text-[10.5px] font-bold text-slate-400 uppercase mb-1">تحویل‌گیرنده / خریدار:</div>
          <div className="font-black text-sm text-slate-900 dark:text-white">{isPurchase ? (settings.brandName || 'انبار مرکزی') : (invoice.customerName || 'مشتری')}</div>
          <div className="text-slate-500 mt-1">همراه: {toPersianDigits(isPurchase ? (settings.phone || '-') : (invoice.customerPhone || '-'))}</div>
          <div className="text-slate-500 mt-0.5">نشانی: {isPurchase ? settings.address : (invoice.customerCity || invoice.customerAddress || '-')}</div>
        </div>
      </div>

      {/* Modern Card Table */}
      <div className={`rounded-2xl border overflow-hidden ${isDarkCanvas ? 'border-slate-800' : 'border-slate-200'}`}>
        <table className="w-full text-right text-xs">
          <thead>
            <tr className={isDarkCanvas ? 'bg-slate-800/80 text-slate-200' : 'bg-slate-100 text-slate-800'}>
              <th className="py-3 px-3 text-center w-10">ردیف</th>
              <th className="py-3 px-4">شرح کالا</th>
              <th className="py-3 px-3 text-center">تعداد کل</th>
              <th className="py-3 px-3 text-center">فی واحد</th>
              <th className="py-3 px-4 text-center">مبلغ کل (تومان)</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkCanvas ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {processedItems.map((processedItem) => {
              const { item, index, displayUnitPrice, displayLineTotal, packagingSpec, cartonLabel, hasDiscount, discountPercent, discountedUnitPrice, discountedLineTotal } = processedItem;
              return (
                <tr key={`fintech-item-${item.id || index}`}>
                  <td className="py-3 px-3 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{item.productName}</div>
                    <div className="text-[10.5px] text-slate-400 mt-0.5">{packagingSpec}</div>
                    {renderItemProfitBadge(processedItem, shouldShowProfitUnderItems, includeProfitInExport)}
                  </td>
                <td className="py-3 px-3 text-center">
                  <span className="font-bold">{toPersianDigits(item.totalPieces.toLocaleString())}</span>
                  <div className="text-[10px] text-slate-400">{cartonLabel}</div>
                </td>
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  <div>{toPersianDigits(displayUnitPrice.toLocaleString())}</div>
                  {renderItemCoverPriceBadge(processedItem.coverPrice, props.showCoverPrice)}
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode && (
                    <div className="text-[10px] text-slate-900 dark:text-slate-100 font-bold mt-0.5">
                      با {toPersianDigits(discountPercent)}٪ تخفیف: {toPersianDigits((discountedUnitPrice || 0).toLocaleString())}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode ? (
                    <div>
                      <span className="font-black text-slate-900 dark:text-white">
                        {toPersianDigits((discountedLineTotal || 0).toLocaleString())}
                      </span>
                      <span className="text-[10px] text-slate-400 line-through mr-1 font-normal block">
                        {toPersianDigits(displayLineTotal.toLocaleString())}
                      </span>
                    </div>
                  ) : (
                    <span>{toPersianDigits(displayLineTotal.toLocaleString())}</span>
                  )}
                </td>
              </tr>
            ); })}
            {renderTableProfitSummaryRow(props, 5)}
          </tbody>
        </table>
      </div>

      {/* Summary: 2 Balanced Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        <div className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>جمع کل ناخالص اقلام:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatPrice(grossAmount)}</span>
          </div>
          {renderExpensesSummary(invoice)}

          {/* Net Box Matching Table Border */}
          <div className={`p-4 rounded-xl border ${isDarkCanvas ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                {isPurchase ? (isPresentationModeActive ? 'مبلغ نهایی فاکتور:' : 'مبلغ کل خرید فاکتور:') : 'مبلغ خالص قابل دریافت:'}
              </span>
              <span className="font-black text-xl text-slate-900 dark:text-white">
                {formatPrice(netPayableAmount)}
              </span>
            </div>

            {/* Inward Sell-Through Single Line */}
            {isPurchase && !isSecretMode && !isPresentationModeActive && inwardSellThroughSummary && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 text-[11px]">وضعیت فروش بار ورودی:</span>
                <div className="text-xs">
                  <span className="text-sky-600 font-bold">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش</span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span className="text-amber-600 font-bold">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ مانده</span>
                </div>
              </div>
            )}

            {/* Cumulative Balance Underneath Net Amount */}
            {renderCumulativeBalanceSection(props)}
            {renderTotalInvoiceProfitRow(props)}
          </div>
        </div>

        {/* Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 3. GRAPHIC MODEL 3: EXECUTIVE CORPORATE (مدل ۳: سازمانی رسمی)             */
/* ========================================================================= */
export const GraphicExecutiveTemplate: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    theme,
    isPurchase,
    isSecretMode,
    isPresentationModeActive,
    isDarkCanvas,
    processedItems,
    grossAmount,
    netPayableAmount,
    inwardSellThroughSummary,
    shouldShowProfitUnderItems,
    includeProfitInExport,
  } = props;

  return (
    <div className={`space-y-6 transition-colors ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Formal Header Stripe */}
      <div className="border-b-2 pb-4 flex items-center justify-between" style={{ borderColor: theme.hex }}>
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">{settings.brandName || 'سازمان بازرگانی'}</h1>
          <p className="text-xs text-slate-500">{settings.subtitle || 'سیستم رسمی حسابداری و مدیریت مالی'}</p>
        </div>
        <div className="text-center p-2 rounded border-2 border-slate-900 dark:border-slate-100 font-black text-xs">
          {isPurchase ? 'سند رسمی ورود کالا' : 'صورت‌حساب فروش رسمی'}
        </div>
      </div>

      {/* 2-Column Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className={`p-3.5 rounded-lg border-2 ${isDarkCanvas ? 'border-slate-800 bg-slate-900/40' : 'border-slate-300 bg-slate-50'}`}>
          <div className="font-bold border-b pb-1 mb-1.5" style={{ color: theme.hex }}>مشخصات فروشنده / صادرکننده:</div>
          <div className="font-bold">{isPurchase ? (invoice.customerName || 'تأمین‌کننده') : (settings.brandName || 'فروشگاه')}</div>
          <div className="text-slate-500 mt-1">تلفن: {toPersianDigits(isPurchase ? (invoice.customerPhone || '-') : (settings.phone || '-'))}</div>
        </div>
        <div className={`p-3.5 rounded-lg border-2 ${isDarkCanvas ? 'border-slate-800 bg-slate-900/40' : 'border-slate-300 bg-slate-50'}`}>
          <div className="font-bold border-b pb-1 mb-1.5" style={{ color: theme.hex }}>مشخصات خریدار / تحویل‌گیرنده:</div>
          <div className="font-bold">{isPurchase ? (settings.brandName || 'انبار مرکزی') : (invoice.customerName || 'مشتری')}</div>
          <div className="text-slate-500 mt-1">همراه: {toPersianDigits(isPurchase ? (settings.phone || '-') : (invoice.customerPhone || '-'))}</div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-lg border-2 ${isDarkCanvas ? 'border-slate-800' : 'border-slate-300'} overflow-hidden`}>
        <table className="w-full text-right text-xs">
          <thead className={isDarkCanvas ? 'bg-slate-800 text-slate-100' : 'bg-slate-200 text-slate-900'}>
            <tr className="border-b border-slate-400">
              <th className="py-2.5 px-2 text-center w-10">ردیف</th>
              <th className="py-2.5 px-3">نام و مشخصات کالا</th>
              <th className="py-2.5 px-3 text-center">تعداد کل</th>
              <th className="py-2.5 px-3 text-center">فی واحد</th>
              <th className="py-2.5 px-3 text-center">مبلغ کل (تومان)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 dark:divide-slate-800">
            {processedItems.map((processedItem) => {
              const { item, index, displayUnitPrice, displayLineTotal, packagingSpec, hasDiscount, discountPercent, discountedUnitPrice, discountedLineTotal } = processedItem;
              return (
                <tr key={`exec-item-${item.id || index}`}>
                  <td className="py-2.5 px-2 text-center text-slate-500">{toPersianDigits(index + 1)}</td>
                  <td className="py-2.5 px-3 font-bold">
                    {item.productName}
                    <span className="block text-[10px] text-slate-400 font-normal">{packagingSpec}</span>
                    {renderItemProfitBadge(processedItem, shouldShowProfitUnderItems, includeProfitInExport)}
                  </td>
                <td className="py-2.5 px-3 text-center">{toPersianDigits(item.totalPieces.toLocaleString())}</td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  <div>{toPersianDigits(displayUnitPrice.toLocaleString())}</div>
                  {renderItemCoverPriceBadge(processedItem.coverPrice, props.showCoverPrice)}
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode && (
                    <div className="text-[10px] text-slate-900 dark:text-slate-100 font-bold mt-0.5">
                      با {toPersianDigits(discountPercent)}٪ تخفیف: {toPersianDigits((discountedUnitPrice || 0).toLocaleString())}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center font-bold whitespace-nowrap">
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode ? (
                    <div>
                      <span>{toPersianDigits((discountedLineTotal || 0).toLocaleString())}</span>
                      <span className="text-[10px] text-slate-400 line-through mr-1 font-normal block">
                        {toPersianDigits(displayLineTotal.toLocaleString())}
                      </span>
                    </div>
                  ) : (
                    <span>{toPersianDigits(displayLineTotal.toLocaleString())}</span>
                  )}
                </td>
              </tr>
            ); })}
            {renderTableProfitSummaryRow(props, 5)}
          </tbody>
        </table>
      </div>

      {/* Summary with 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        <div className={`p-4 rounded-lg border-2 flex flex-col justify-between ${isDarkCanvas ? 'border-slate-800 bg-slate-900' : 'border-slate-300 bg-slate-50'}`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-slate-800">
            <span>جمع کل ناخالص:</span>
            <span className="font-bold">{formatPrice(grossAmount)}</span>
          </div>
          {renderExpensesSummary(invoice)}
          <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-300 dark:border-slate-800 mt-2">
            <div className="flex items-center justify-between text-sm font-black text-slate-900 dark:text-white">
              <span>مبلغ خالص قابل دریافت:</span>
              <span className="text-xl">{formatPrice(netPayableAmount)}</span>
            </div>

            {/* Inward Sell-Through Single Line */}
            {isPurchase && !isSecretMode && !isPresentationModeActive && inwardSellThroughSummary && (
              <div className="mt-2.5 pt-2 border-t border-slate-300 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 text-[11px]">وضعیت فروش این فاکتور:</span>
                <div className="text-xs">
                  <span className="text-sky-600 font-black">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش‌رفته</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-amber-600 font-black">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ در انبار مانده</span>
                </div>
              </div>
            )}

            {/* Cumulative Balance Underneath Net Amount */}
            {renderCumulativeBalanceSection(props)}
            {renderTotalInvoiceProfitRow(props)}
          </div>
        </div>

        {/* Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 4. GRAPHIC MODEL 4: ARTISAN CARDS & SPLIT (مدل ۴: کارت‌های تفکیکی)       */
/* ========================================================================= */
export const GraphicArtisanTemplate: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    theme,
    isPurchase,
    isSecretMode,
    isPresentationModeActive,
    isDarkCanvas,
    processedItems,
    grossAmount,
    netPayableAmount,
    inwardSellThroughSummary,
    shouldShowProfitUnderItems,
    includeProfitInExport,
  } = props;

  return (
    <div className={`space-y-5 transition-colors ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black">{settings.brandName || 'فروشگاه بازرگانی'}</h1>
          <p className="text-xs text-slate-400">{settings.subtitle || 'سند فاکتور و توزیع اختصاصی'}</p>
        </div>
        <div 
          className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs"
          style={{ backgroundColor: theme.hex }}
        >
          {isPurchase ? 'فاکتور ورود کالا' : 'صورت‌حساب فروش'}
        </div>
      </div>

      {/* Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className={`p-3.5 rounded-2xl border ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 font-bold">مشخصات صادرکننده:</div>
          <div className="font-bold text-sm mt-0.5">{isPurchase ? (invoice.customerName || 'تامین‌کننده') : (settings.brandName || 'فروشگاه')}</div>
          <div className="text-slate-500 mt-1">{toPersianDigits(isPurchase ? (invoice.customerPhone || '-') : (settings.phone || '-'))}</div>
        </div>
        <div className={`p-3.5 rounded-2xl border ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 font-bold">مشخصات تحویل‌گیرنده:</div>
          <div className="font-bold text-sm mt-0.5">{isPurchase ? (settings.brandName || 'انبار مرکزی') : (invoice.customerName || 'مشتری')}</div>
          <div className="text-slate-500 mt-1">{toPersianDigits(isPurchase ? (settings.phone || '-') : (invoice.customerPhone || '-'))}</div>
        </div>
      </div>

      {/* Table with Tinted Zebra */}
      <div className={`rounded-2xl border overflow-hidden ${isDarkCanvas ? 'border-slate-800' : 'border-slate-200'}`}>
        <table className="w-full text-right text-xs">
          <thead>
            <tr className={isDarkCanvas ? 'bg-slate-800/80 text-slate-200' : 'bg-slate-100 text-slate-800'}>
              <th className="py-3 px-3 text-center w-10">#</th>
              <th className="py-3 px-4">شرح کالا</th>
              <th className="py-3 px-3 text-center">مقدار</th>
              <th className="py-3 px-3 text-center">فی واحد</th>
              <th className="py-3 px-4 text-center">مبلغ کل</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {processedItems.map((processedItem, idx) => {
              const { item, index, displayUnitPrice, displayLineTotal, hasDiscount, discountPercent, discountedUnitPrice, discountedLineTotal } = processedItem;
              return (
                <tr 
                  key={`artisan-item-${item.id || index}`}
                  style={{ backgroundColor: idx % 2 === 1 ? `${theme.hex}08` : 'transparent' }}
                >
                  <td className="py-3 px-3 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                  <td className="py-3 px-4 font-bold">
                    {item.productName}
                    {renderItemProfitBadge(processedItem, shouldShowProfitUnderItems, includeProfitInExport)}
                  </td>
                <td className="py-3 px-3 text-center">{toPersianDigits(item.totalPieces.toLocaleString())}</td>
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  <div>{toPersianDigits(displayUnitPrice.toLocaleString())}</div>
                  {renderItemCoverPriceBadge(processedItem.coverPrice, props.showCoverPrice)}
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode && (
                    <div className="text-[10px] text-slate-900 dark:text-slate-100 font-bold mt-0.5">
                      با {toPersianDigits(discountPercent)}٪ تخفیف: {toPersianDigits((discountedUnitPrice || 0).toLocaleString())}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-bold whitespace-nowrap">
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode ? (
                    <div>
                      <span>{toPersianDigits((discountedLineTotal || 0).toLocaleString())}</span>
                      <span className="text-[10px] text-slate-400 line-through mr-1 font-normal block">
                        {toPersianDigits(displayLineTotal.toLocaleString())}
                      </span>
                    </div>
                  ) : (
                    <span>{toPersianDigits(displayLineTotal.toLocaleString())}</span>
                  )}
                </td>
              </tr>
            ); })}
            {renderTableProfitSummaryRow(props, 5)}
          </tbody>
        </table>
      </div>

      {/* Summary with 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        <div className={`p-4 rounded-2xl border ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2.5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-slate-500">
            <span>جمع کل ناخالص:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatPrice(grossAmount)}</span>
          </div>
          {renderExpensesSummary(invoice)}

          <div className={`p-3.5 rounded-xl border ${isDarkCanvas ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between font-bold text-sm">
              <span>مبلغ خالص قابل دریافت:</span>
              <span className="text-xl font-black">{formatPrice(netPayableAmount)}</span>
            </div>

            {/* Inward Sell-Through Single Line */}
            {isPurchase && !isSecretMode && !isPresentationModeActive && inwardSellThroughSummary && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 text-[11px]">وضعیت فروش این فاکتور:</span>
                <div className="text-xs">
                  <span className="text-sky-600 font-black">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش‌رفته</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-amber-600 font-black">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ در انبار مانده</span>
                </div>
              </div>
            )}

            {/* Cumulative Balance Underneath Net Amount */}
            {renderCumulativeBalanceSection(props)}
            {renderTotalInvoiceProfitRow(props)}
          </div>
        </div>

        {/* Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 5. GRAPHIC MODEL 5: COMPACT LOGISTICS (مدل ۵: فشرده لجستیک)               */
/* ========================================================================= */
export const GraphicCompactTemplate: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    isPurchase,
    isSecretMode,
    isPresentationModeActive,
    isDarkCanvas,
    processedItems,
    grossAmount,
    netPayableAmount,
    inwardSellThroughSummary,
    shouldShowProfitUnderItems,
    includeProfitInExport,
  } = props;

  return (
    <div className={`space-y-4 transition-colors ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* High-Density Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black">{settings.brandName || 'انبارداری و بازرگانی'}</h1>
          <div className="text-[11px] text-slate-400">سند #{toPersianDigits(invoice.invoiceNumber)} · {toPersianDigits(invoice.date)}</div>
        </div>
        <div className="flex items-center gap-2">
          <Barcode className="w-12 h-6 text-slate-400" />
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDarkCanvas ? 'border-slate-800' : 'border-slate-200'}`}>
        <table className="w-full text-right text-xs">
          <thead className={isDarkCanvas ? 'bg-slate-800' : 'bg-slate-100'}>
            <tr>
              <th className="py-2 px-2 text-center w-8">#</th>
              <th className="py-2 px-3">کالا</th>
              <th className="py-2 px-2 text-center">مقدار</th>
              <th className="py-2 px-2 text-center">فی</th>
              <th className="py-2 px-3 text-center">جمع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {processedItems.map((processedItem) => {
              const { item, index, displayUnitPrice, displayLineTotal, hasDiscount, discountPercent, discountedUnitPrice, discountedLineTotal } = processedItem;
              return (
                <tr key={`compact-item-${item.id || index}`}>
                  <td className="py-2 px-2 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                  <td className="py-2 px-3 font-bold">
                    {item.productName}
                    {renderItemProfitBadge(processedItem, shouldShowProfitUnderItems, includeProfitInExport)}
                  </td>
                <td className="py-2 px-2 text-center">{toPersianDigits(item.totalPieces.toLocaleString())}</td>
                <td className="py-2 px-2 text-center whitespace-nowrap">
                  <div>{toPersianDigits(displayUnitPrice.toLocaleString())}</div>
                  {renderItemCoverPriceBadge(processedItem.coverPrice, props.showCoverPrice)}
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode && (
                    <div className="text-[9.5px] text-slate-900 dark:text-slate-100 font-bold">
                      -{toPersianDigits(discountPercent)}٪: {toPersianDigits((discountedUnitPrice || 0).toLocaleString())}
                    </div>
                  )}
                </td>
                <td className="py-2 px-3 text-center font-bold whitespace-nowrap">
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode ? (
                    <div>
                      <span>{toPersianDigits((discountedLineTotal || 0).toLocaleString())}</span>
                      <span className="text-[9px] text-slate-400 line-through block font-normal">
                        {toPersianDigits(displayLineTotal.toLocaleString())}
                      </span>
                    </div>
                  ) : (
                    <span>{toPersianDigits(displayLineTotal.toLocaleString())}</span>
                  )}
                </td>
              </tr>
            ); })}
            {renderTableProfitSummaryRow(props, 5)}
          </tbody>
        </table>
      </div>

      {/* Summary with 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs pt-1">
        <div className={`p-3.5 rounded-xl border ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2 flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-slate-500">
            <span>جمع کل ناخالص:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatPrice(grossAmount)}</span>
          </div>
          {renderExpensesSummary(invoice)}

          <div className={`p-3 rounded-lg border ${isDarkCanvas ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between font-bold">
              <span>مبلغ خالص قابل دریافت:</span>
              <span className="text-lg font-black">{formatPrice(netPayableAmount)}</span>
            </div>

            {/* Inward Sell-Through Single Line */}
            {isPurchase && !isSecretMode && !isPresentationModeActive && inwardSellThroughSummary && (
              <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 text-[10.5px]">وضعیت فروش بار ورودی:</span>
                <div className="text-xs">
                  <span className="text-sky-600 font-bold">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش</span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span className="text-amber-600 font-bold">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ مانده</span>
                </div>
              </div>
            )}

            {/* Cumulative Balance Underneath Net Amount */}
            {renderCumulativeBalanceSection(props)}
            {renderTotalInvoiceProfitRow(props)}
          </div>
        </div>

        {/* Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 6. GRAPHIC MODEL 6: COMMERCIAL PRECISION LEDGER (مدل ۶: تجاری خطی و مویی) */
/* ========================================================================= */
export const GraphicCommercialLedgerTemplate: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    theme,
    isPurchase,
    isSecretMode,
    isPresentationModeActive,
    isDarkCanvas,
    processedItems,
    grossAmount,
    netPayableAmount,
    inwardSellThroughSummary,
    shouldShowProfitUnderItems,
    includeProfitInExport,
  } = props;

  return (
    <div className={`space-y-6 transition-colors ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Luxury Commercial Top Line */}
      <div className="flex items-center justify-between pb-4 border-b-2" style={{ borderColor: theme.hex }}>
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-xs"
            style={{ backgroundColor: theme.hex }}
          >
            {settings.brandName ? settings.brandName.charAt(0) : 'ب'}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{settings.brandName || 'بازرگانی تجاری'}</h1>
            <p className="text-xs text-slate-400 font-medium">{settings.subtitle || 'سیستم مبادلات کالا و خدمات'}</p>
          </div>
        </div>

        <div className="text-left text-xs space-y-0.5">
          <div className="font-bold text-sm" style={{ color: theme.hex }}>
            #{toPersianDigits(invoice.invoiceNumber)}
          </div>
          <div className="text-slate-400">{toPersianDigits(invoice.date)}</div>
        </div>
      </div>

      {/* Clean Dual Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className={`p-4 rounded-xl border space-y-1 ${isDarkCanvas ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase">صادرکننده فاکتور:</div>
          <div className="font-black text-sm">{isPurchase ? (invoice.customerName || 'تأمین‌کننده') : (settings.brandName || 'فروشگاه')}</div>
          <div className="text-slate-500">تلفن: {toPersianDigits(isPurchase ? (invoice.customerPhone || '-') : (settings.phone || '-'))}</div>
          <div className="text-slate-400 text-[11px]">{isPurchase ? (invoice.customerAddress || '-') : (settings.address || '-')}</div>
        </div>

        <div className={`p-4 rounded-xl border space-y-1 ${isDarkCanvas ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase">طرف‌حساب (خریدار):</div>
          <div className="font-black text-sm">{isPurchase ? (settings.brandName || 'انبار مرکزی') : (invoice.customerName || 'مشتری')}</div>
          <div className="text-slate-500">همراه: {toPersianDigits(isPurchase ? (settings.phone || '-') : (invoice.customerPhone || '-'))}</div>
          <div className="text-slate-400 text-[11px]">{isPurchase ? settings.address : (invoice.customerAddress || '-')}</div>
        </div>
      </div>

      {/* Editorial Table */}
      <div className={`rounded-xl border overflow-hidden ${isDarkCanvas ? 'border-slate-800' : 'border-slate-200'}`}>
        <table className="w-full text-right text-xs">
          <thead>
            <tr className={isDarkCanvas ? 'bg-slate-800/80 text-slate-200' : 'bg-slate-100 text-slate-800'}>
              <th className="py-3 px-3 text-center w-10">ردیف</th>
              <th className="py-3 px-4">شرح اقلام تجاری</th>
              <th className="py-3 px-3 text-center">مقدار / کارتن</th>
              <th className="py-3 px-3 text-center">فی واحد</th>
              <th className="py-3 px-4 text-center">مبلغ کل (تومان)</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkCanvas ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
            {processedItems.map((processedItem) => {
              const { item, index, displayUnitPrice, displayLineTotal, packagingSpec, cartonLabel, hasDiscount, discountPercent, discountedUnitPrice, discountedLineTotal } = processedItem;
              return (
                <tr key={`comm-item-${item.id || index}`}>
                  <td className="py-3 px-3 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{item.productName}</div>
                    <div className="text-[10.5px] text-slate-400 mt-0.5">{packagingSpec}</div>
                    {renderItemProfitBadge(processedItem, shouldShowProfitUnderItems, includeProfitInExport)}
                  </td>
                <td className="py-3 px-3 text-center">
                  <span className="font-bold">{toPersianDigits(item.totalPieces.toLocaleString())}</span>
                  <div className="text-[10px] text-slate-400">{cartonLabel}</div>
                </td>
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  <div>{toPersianDigits(displayUnitPrice.toLocaleString())}</div>
                  {renderItemCoverPriceBadge(processedItem.coverPrice, props.showCoverPrice)}
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode && (
                    <div className="text-[10px] text-slate-900 dark:text-slate-100 font-bold mt-0.5">
                      با {toPersianDigits(discountPercent)}٪ تخفیف: {toPersianDigits((discountedUnitPrice || 0).toLocaleString())}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode ? (
                    <div>
                      <span className="font-black text-slate-900 dark:text-white">
                        {toPersianDigits((discountedLineTotal || 0).toLocaleString())}
                      </span>
                      <span className="text-[10px] text-slate-400 line-through mr-1 font-normal block">
                        {toPersianDigits(displayLineTotal.toLocaleString())}
                      </span>
                    </div>
                  ) : (
                    <span>{toPersianDigits(displayLineTotal.toLocaleString())}</span>
                  )}
                </td>
              </tr>
            ); })}
            {renderTableProfitSummaryRow(props, 5)}
          </tbody>
        </table>
      </div>

      {/* Summary with 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${isDarkCanvas ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'} space-y-3`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-300">جمع کل ناخالص:</span>
            <span className="font-bold text-sm">{formatPrice(grossAmount)}</span>
          </div>
          {renderExpensesSummary(invoice)}

          <div className={`p-3.5 rounded-lg border ${isDarkCanvas ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between font-black text-sm">
              <span>مبلغ خالص قابل دریافت:</span>
              <span className="text-xl font-black">{formatPrice(netPayableAmount)}</span>
            </div>

            {/* Inward Sell-Through Single Line */}
            {isPurchase && !isSecretMode && !isPresentationModeActive && inwardSellThroughSummary && (
              <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 text-[10.5px]">وضعیت فروش بار ورودی:</span>
                <div className="text-xs">
                  <span className="text-sky-600 font-bold">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش</span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span className="text-amber-600 font-bold">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ مانده</span>
                </div>
              </div>
            )}

            {/* Cumulative Balance Underneath Net Amount */}
            {renderCumulativeBalanceSection(props)}
            {renderTotalInvoiceProfitRow(props)}
          </div>
        </div>

        {/* Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 7. GRAPHIC MODEL 7: NEO-COMMERCE MODERN GRID (مدل ۷: نئو-کامرس بازرگانی) */
/* ========================================================================= */
export const GraphicNeoCommerceTemplate: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    theme,
    isPurchase,
    isSecretMode,
    isPresentationModeActive,
    isDarkCanvas,
    processedItems,
    grossAmount,
    netPayableAmount,
    inwardSellThroughSummary,
    shouldShowProfitUnderItems,
    includeProfitInExport,
  } = props;

  return (
    <div className={`space-y-6 transition-colors ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Top Graphic Banner */}
      <div 
        className="p-6 rounded-xl text-white shadow-md flex items-center justify-between"
        style={{ backgroundColor: theme.hex }}
      >
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
            {isPurchase ? 'صورت‌حساب ورود کالا' : 'صورت‌حساب رسمی بازرگانی'}
          </span>
          <h1 className="text-2xl font-black">{settings.brandName || 'سامانه بازرگانی'}</h1>
          <p className="text-xs text-white/80">{settings.subtitle || 'فروش، توزیع و حسابداری'}</p>
        </div>

        <div className="bg-black/30 backdrop-blur-sm p-3 rounded-2xl text-left text-xs space-y-1 border border-white/10">
          <div>شماره: <span className="font-black text-white">{toPersianDigits(invoice.invoiceNumber)}</span></div>
          <div>تاریخ: {toPersianDigits(invoice.date)}</div>
        </div>
      </div>

      {/* Neo-Grid Party Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className={`p-4 rounded-2xl border space-y-1 ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] font-bold text-slate-400">طرف اول (فروشنده):</div>
          <div className="font-bold text-sm">{isPurchase ? (invoice.customerName || 'تأمین‌کننده') : (settings.brandName || 'فروشگاه')}</div>
          <div className="text-slate-500">{toPersianDigits(isPurchase ? (invoice.customerPhone || '-') : (settings.phone || '-'))}</div>
        </div>
        <div className={`p-4 rounded-2xl border space-y-1 ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-[10px] font-bold text-slate-400">طرف دوم (خریدار):</div>
          <div className="font-bold text-sm">{isPurchase ? (settings.brandName || 'انبار مرکزی') : (invoice.customerName || 'مشتری')}</div>
          <div className="text-slate-500">{toPersianDigits(isPurchase ? (settings.phone || '-') : (invoice.customerPhone || '-'))}</div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${isDarkCanvas ? 'border-slate-800' : 'border-slate-200'}`}>
        <table className="w-full text-right text-xs">
          <thead style={{ backgroundColor: `${theme.hex}18` }}>
            <tr>
              <th className="py-3 px-3 text-center w-10">ردیف</th>
              <th className="py-3 px-4">شرح کالا و مشخصات</th>
              <th className="py-3 px-3 text-center">مقدار کل</th>
              <th className="py-3 px-3 text-center">فی واحد</th>
              <th className="py-3 px-4 text-center">مبلغ کل</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkCanvas ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {processedItems.map((processedItem) => {
              const { item, index, displayUnitPrice, displayLineTotal, packagingSpec, hasDiscount, discountPercent, discountedUnitPrice, discountedLineTotal } = processedItem;
              return (
                <tr key={`neo-item-${item.id || index}`}>
                  <td className="py-3 px-3 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                  <td className="py-3 px-4 font-bold">
                    {item.productName}
                    <span className="block text-[10.5px] text-slate-400 font-normal">{packagingSpec}</span>
                    {renderItemProfitBadge(processedItem, shouldShowProfitUnderItems, includeProfitInExport)}
                  </td>
                <td className="py-3 px-3 text-center">{toPersianDigits(item.totalPieces.toLocaleString())}</td>
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  <div>{toPersianDigits(displayUnitPrice.toLocaleString())}</div>
                  {renderItemCoverPriceBadge(processedItem.coverPrice, props.showCoverPrice)}
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode && (
                    <div className="text-[10px] text-slate-900 dark:text-slate-100 font-bold mt-0.5">
                      با {toPersianDigits(discountPercent)}٪ تخفیف: {toPersianDigits((discountedUnitPrice || 0).toLocaleString())}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 text-center font-bold whitespace-nowrap">
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode ? (
                    <div>
                      <span>{toPersianDigits((discountedLineTotal || 0).toLocaleString())}</span>
                      <span className="text-[10px] text-slate-400 line-through mr-1 font-normal block">
                        {toPersianDigits(displayLineTotal.toLocaleString())}
                      </span>
                    </div>
                  ) : (
                    <span>{toPersianDigits(displayLineTotal.toLocaleString())}</span>
                  )}
                </td>
              </tr>
            ); })}
            {renderTableProfitSummaryRow(props, 5)}
          </tbody>
        </table>
      </div>

      {/* Summary with 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        <div className={`p-4 rounded-2xl border ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2.5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between text-slate-500">
            <span>جمع کل ناخالص اقلام:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatPrice(grossAmount)}</span>
          </div>

          <div className={`p-3.5 rounded-xl border ${isDarkCanvas ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between font-black text-sm">
              <span>مبلغ خالص قابل دریافت:</span>
              <span className="text-xl font-black">{formatPrice(netPayableAmount)}</span>
            </div>

            {/* Inward Sell-Through Single Line */}
            {isPurchase && !isSecretMode && !isPresentationModeActive && inwardSellThroughSummary && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 text-[11px]">وضعیت فروش این فاکتور:</span>
                <div className="text-xs">
                  <span className="text-sky-600 font-black">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش‌رفته</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-amber-600 font-black">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ در انبار مانده</span>
                </div>
              </div>
            )}

            {/* Cumulative Balance Underneath Net Amount */}
            {renderCumulativeBalanceSection(props)}
            {renderTotalInvoiceProfitRow(props)}
          </div>
        </div>

        {/* Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 8. GRAPHIC MODEL 8: HYPER-MINIMAL EXECUTIVE (مدل ۸: هایپر-مینیمال شرکتی)  */
/* ========================================================================= */
export const GraphicHyperMinimalTemplate: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    isPurchase,
    isSecretMode,
    isPresentationModeActive,
    isDarkCanvas,
    processedItems,
    grossAmount,
    netPayableAmount,
    inwardSellThroughSummary,
    shouldShowProfitUnderItems,
    includeProfitInExport,
  } = props;

  return (
    <div className={`space-y-6 transition-colors ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Hyper-Clean Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-400">صورت‌حساب رسمی بازرگانی</div>
          <h1 className="text-3xl font-black">{settings.brandName || 'فروشگاه بازرگانی'}</h1>
        </div>
        <div className="text-left text-xs">
          <div className="font-bold text-sm">{toPersianDigits(invoice.invoiceNumber)}</div>
          <div className="text-slate-400">{toPersianDigits(invoice.date)}</div>
        </div>
      </div>

      {/* Grid of Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1 pb-2 border-b md:border-b-0 md:border-l md:border-slate-200 md:dark:border-slate-800 md:pl-4">
          <div className="text-[10px] text-slate-400 font-bold uppercase">طرف فروشنده:</div>
          <div className="font-bold text-sm">{isPurchase ? (invoice.customerName || 'تأمین‌کننده') : (settings.brandName || 'فروشگاه')}</div>
          <div className="text-slate-500">{toPersianDigits(isPurchase ? (invoice.customerPhone || '-') : (settings.phone || '-'))}</div>
        </div>
        <div className="space-y-1">
          <div className="text-[10px] text-slate-400 font-bold uppercase">طرف خریدار:</div>
          <div className="font-bold text-sm">{isPurchase ? (settings.brandName || 'انبار مرکزی') : (invoice.customerName || 'مشتری')}</div>
          <div className="text-slate-500">{toPersianDigits(isPurchase ? (settings.phone || '-') : (invoice.customerPhone || '-'))}</div>
        </div>
      </div>

      {/* Modern Hairline Table */}
      <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white font-black">
              <th className="py-2.5 px-2 text-center w-8">#</th>
              <th className="py-2.5 px-3">عنوان و شرح کالا</th>
              <th className="py-2.5 px-3 text-center">مقدار</th>
              <th className="py-2.5 px-3 text-center">فی واحد</th>
              <th className="py-2.5 px-3 text-center">جمع (تومان)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {processedItems.map((processedItem) => {
              const { item, index, displayUnitPrice, displayLineTotal, packagingSpec, hasDiscount, discountPercent, discountedUnitPrice, discountedLineTotal } = processedItem;
              return (
                <tr key={`hyper-item-${item.id || index}`}>
                  <td className="py-2.5 px-2 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                  <td className="py-2.5 px-3 font-bold">
                    {item.productName}
                    <span className="block text-[10px] text-slate-400 font-normal">{packagingSpec}</span>
                    {renderItemProfitBadge(processedItem, shouldShowProfitUnderItems, includeProfitInExport)}
                  </td>
                <td className="py-2.5 px-3 text-center">{toPersianDigits(item.totalPieces.toLocaleString())}</td>
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  <div>{toPersianDigits(displayUnitPrice.toLocaleString())}</div>
                  {renderItemCoverPriceBadge(processedItem.coverPrice, props.showCoverPrice)}
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode && (
                    <div className="text-[10px] text-slate-900 dark:text-slate-100 font-bold mt-0.5">
                      با {toPersianDigits(discountPercent)}٪ تخفیف: {toPersianDigits((discountedUnitPrice || 0).toLocaleString())}
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center font-bold whitespace-nowrap">
                  {hasDiscount && discountPercent && discountPercent > 0 && !isSecretMode ? (
                    <div>
                      <span>{toPersianDigits((discountedLineTotal || 0).toLocaleString())}</span>
                      <span className="text-[10px] text-slate-400 line-through mr-1 font-normal block">
                        {toPersianDigits(displayLineTotal.toLocaleString())}
                      </span>
                    </div>
                  ) : (
                    <span>{toPersianDigits(displayLineTotal.toLocaleString())}</span>
                  )}
                </td>
              </tr>
            ); })}
            {renderTableProfitSummaryRow(props, 5)}
          </tbody>
        </table>
      </div>

      {/* Summary with 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${isDarkCanvas ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2.5`}>
          <div className="flex items-center justify-between text-slate-500">
            <span>جمع کل ناخالص:</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatPrice(grossAmount)}</span>
          </div>
          {renderExpensesSummary(invoice)}

          <div className={`p-3.5 rounded-lg border ${isDarkCanvas ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between font-black text-sm">
              <span>مبلغ خالص قابل دریافت:</span>
              <span className="text-xl font-black">{formatPrice(netPayableAmount)}</span>
            </div>

            {/* Inward Sell-Through Single Line */}
            {isPurchase && !isSecretMode && !isPresentationModeActive && inwardSellThroughSummary && (
              <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 text-[10.5px]">وضعیت فروش بار ورودی:</span>
                <div className="text-xs">
                  <span className="text-sky-600 font-bold">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش</span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span className="text-amber-600 font-bold">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ مانده</span>
                </div>
              </div>
            )}

            {/* Cumulative Balance Underneath Net Amount */}
            {renderCumulativeBalanceSection(props)}
            {renderTotalInvoiceProfitRow(props)}
          </div>
        </div>

        {/* Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

// Aliases and Dedicated Screens for backwards compatibility and clean modular imports
export { SalesInvoiceScreen } from './SalesInvoiceScreen';
export { PurchaseInvoiceScreen } from './PurchaseInvoiceScreen';
export const PrintMonoTemplate = PrintModernMonoTemplate;
export const GraphicMinimalTemplate = GraphicSwissTemplate;
export const GraphicNordicTemplate = GraphicFintechTemplate;
