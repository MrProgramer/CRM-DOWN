import React from 'react';
import { Invoice, StoreSettings } from '../types';
import { ThemeStyles } from './ThemeConfig';
import { 
  formatPrice, 
  toPersianDigits 
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
  QrCode
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
}

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
    isDarkCanvas,
  } = props;

  const unpaidAmount = isCreditOrPartial 
    ? (remainingDebtAmount > 0 ? remainingDebtAmount : netPayableAmount)
    : 0;

  return (
    <div className="space-y-2 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-800">
      {/* 1. Main Cumulative Balance Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
        <span className="font-bold text-[11.5px] text-slate-700 dark:text-slate-300">
          {isCreditOrPartial 
            ? 'مانده کل حساب (حساب قبلی + نسیه این فاکتور):' 
            : 'مانده نهایی حساب طرف‌حساب:'}
        </span>
        <div className="font-black text-sm text-left">
          <span className={cumulativeBalanceVal > 0 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-emerald-600 dark:text-emerald-400 font-black'}>
            {finalBalanceDisplay}
          </span>
        </div>
      </div>

      {/* 2. Explicit Math Formula if Credit & Previous Balance */}
      {isCreditOrPartial && (
        <div className={`p-2.5 rounded-xl text-xs border flex items-center justify-between flex-wrap gap-2 ${
          isDarkCanvas 
            ? 'bg-slate-800/80 border-slate-700/90 text-slate-100' 
            : 'bg-slate-100/90 border-slate-200 text-slate-900'
        }`}>
          <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold">
            <span>حساب قبلی: <strong className="font-black">{formatPrice(previousBalanceNumber)}</strong></span>
            <span className="text-slate-400">+</span>
            <span>نسیه این فاکتور: <strong className="font-black">{formatPrice(unpaidAmount)}</strong></span>
            <span className="text-slate-400">=</span>
            <span className="font-black text-rose-600 dark:text-rose-400">
              جمع کل بدهی: {formatPrice(cumulativeBalanceVal)}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black">
            نسیه
          </span>
        </div>
      )}

      {/* 3. Cash Payment Case with Previous Balance */}
      {!isCreditOrPartial && previousBalanceNumber > 0 && (
        <div className={`p-2 rounded-xl text-xs border flex items-center justify-between ${
          isDarkCanvas ? 'bg-slate-800/50 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <span>فاکتور جاری تسویه شد · مانده قبلی حساب: <strong className="font-black">{formatPrice(previousBalanceNumber)}</strong></span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">تسویه نقدی</span>
        </div>
      )}
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
            {processedItems.map(({
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
              displayLineTotal
            }) => (
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
                  {toPersianDigits(displayUnitPrice.toLocaleString())}
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-sm whitespace-nowrap text-slate-950">
                  {toPersianDigits(displayLineTotal.toLocaleString())}
                </td>
              </tr>
            ))}
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
          </div>
        </div>

        {/* Right: Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 1. GRAPHIC MODEL 1: SWISS MINIMALIST FLAT (مدل ۱: فلت سوئیسی مینیمال)    */
/* ========================================================================= */
export const GraphicSwissTemplate: React.FC<InvoiceTemplateProps> = (props) => {
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
  } = props;

  return (
    <div className={`space-y-6 transition-colors ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Top Palette Hairline */}
      <div className="w-full h-1 rounded-full" style={{ backgroundColor: theme.hex }} />

      {/* Header */}
      <div className={`pb-5 border-b ${isDarkCanvas ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {settings.brandName || 'فروشگاه بازرگانی'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {settings.subtitle || (isPurchase ? 'مرکز ورود و تأمین کالا' : 'فروش عمده و توزیع تخصصی کالا')}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div 
              className="px-3 py-1 rounded-lg text-xs font-black text-white"
              style={{ backgroundColor: theme.hex }}
            >
              {isPurchase
                ? (isPresentationModeActive ? 'سند تحویل کالا' : 'سند رسمی ورود کالا')
                : 'صورت‌حساب فروش'}
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className={`p-4 rounded-xl border space-y-1.5 ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50/70 border-slate-200'}`}>
          <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">صادرکننده فاکتور:</div>
          <div className="text-sm font-black text-slate-900 dark:text-white">
            {isPurchase ? (invoice.customerName || 'تأمین‌کننده') : (settings.brandName || 'فروشگاه')}
          </div>
          <div className="text-slate-500 flex items-center gap-1.5">
            <span>تماس:</span>
            <span>{toPersianDigits(isPurchase ? (invoice.customerPhone || '-') : (settings.phone || '-'))}</span>
          </div>
          <div className="text-slate-500">
            <span>نشانی:</span> <span>{isPurchase ? (invoice.customerCity || invoice.customerAddress || '-') : (settings.address || '-')}</span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border space-y-1.5 ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50/70 border-slate-200'}`}>
          <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">طرف‌حساب (خریدار):</div>
          <div className="text-sm font-black text-slate-900 dark:text-white">
            {isPurchase ? (settings.brandName || 'انبار مرکزی') : (invoice.customerName || 'مشتری')}
          </div>
          <div className="text-slate-500 flex items-center gap-1.5">
            <span>همراه:</span>
            <span>{toPersianDigits(isPurchase ? (settings.phone || '-') : (invoice.customerPhone || '-'))}</span>
          </div>
          <div className="text-slate-500">
            <span>نشانی:</span> <span>{isPurchase ? settings.address : (invoice.customerCity || invoice.customerAddress || '-')}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDarkCanvas ? 'border-slate-800' : 'border-slate-200'}`}>
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className={`border-b ${isDarkCanvas ? 'bg-slate-800/60 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'} font-black`}>
              <th className="py-3 px-3 text-center w-10">#</th>
              <th className="py-3 px-4">شرح کامل کالا</th>
              <th className="py-3 px-3 text-center min-w-[110px]">تعداد و کارتن</th>
              <th className="py-3 px-3 text-center w-28">فی واحد</th>
              <th className="py-3 px-4 text-center w-32">مبلغ کل (تومان)</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isDarkCanvas ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
            {processedItems.map(({
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
              displayLineTotal
            }) => (
              <tr key={`swiss-item-${item.id || index}`}>
                <td className="py-3 px-3 text-center text-slate-400">
                  {toPersianDigits(index + 1)}
                </td>
                <td className="py-3 px-4">
                  <div className={`font-bold text-sm ${itemReturns.length > 0 && (item.totalPieces === 0 || itemNetPrice === 0) ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {item.productName}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                    {!isUnknown && <span>{packagingSpec}</span>}
                    {hasCustomNote && <span>· {item.customDescription}</span>}
                  </div>
                  {itemReturns.length > 0 && (
                    <div className="text-[11px] font-bold text-rose-500 mt-0.5">
                      مرجوع: {toPersianDigits(itemReturnedCartons)} کارتن {itemReturnedExtraPieces > 0 ? ` و ${toPersianDigits(itemReturnedExtraPieces)} دانه` : ''} (-{formatPrice(itemReturnedTotalAmount)})
                    </div>
                  )}
                </td>
                <td className="py-3 px-3 text-center whitespace-nowrap">
                  <span className="font-bold">
                    {toPersianDigits(item.totalPieces.toLocaleString())} {item.unitTitle || 'عدد'}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">{cartonLabel}</div>
                </td>
                <td className="py-3 px-3 text-center">
                  {toPersianDigits(displayUnitPrice.toLocaleString())}
                </td>
                <td className="py-3 px-4 text-center font-bold">
                  {toPersianDigits(displayLineTotal.toLocaleString())}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary: 2 Balanced Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
        <div className={`p-4 rounded-xl border space-y-2.5 flex flex-col justify-between ${isDarkCanvas ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50/70 border-slate-200'}`}>
          <div className="flex items-center justify-between text-slate-500">
            <span>جمع ناخالص ({toPersianDigits(processedItems.length)} قلم{invoiceCartonBreakdownText ? ` · ${invoiceCartonBreakdownText}` : ''}):</span>
            <span className="font-bold text-slate-900 dark:text-white">{formatPrice(grossAmount)}</span>
          </div>

          {/* Net Payable: Matching Table Border */}
          <div className={`p-3.5 rounded-lg border ${isDarkCanvas ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                {isPurchase ? (isPresentationModeActive ? 'مبلغ نهایی فاکتور:' : 'مبلغ کل خرید فاکتور:') : 'مبلغ خالص قابل دریافت:'}
              </span>
              <span className="font-black text-xl text-slate-900 dark:text-white">
                {formatPrice(netPayableAmount)}
              </span>
            </div>

            {/* Inward Sell-Through Single Line */}
            {isPurchase && !isSecretMode && !isPresentationModeActive && inwardSellThroughSummary && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 text-[11px]">وضعیت فروش این فاکتور:</span>
                <div className="text-xs">
                  <span className="text-sky-600 font-black">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش‌رفته</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-amber-600 font-black">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ مانده انبار</span>
                </div>
              </div>
            )}

            {/* Cumulative Balance Underneath Net Amount */}
            {renderCumulativeBalanceSection(props)}
          </div>
        </div>

        {/* Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

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
            {processedItems.map(({ item, index, displayUnitPrice, displayLineTotal, packagingSpec, cartonLabel }) => (
              <tr key={`fintech-item-${item.id || index}`}>
                <td className="py-3 px-3 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900 dark:text-white">{item.productName}</div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">{packagingSpec}</div>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="font-bold">{toPersianDigits(item.totalPieces.toLocaleString())}</span>
                  <div className="text-[10px] text-slate-400">{cartonLabel}</div>
                </td>
                <td className="py-3 px-3 text-center">{toPersianDigits(displayUnitPrice.toLocaleString())}</td>
                <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                  {toPersianDigits(displayLineTotal.toLocaleString())}
                </td>
              </tr>
            ))}
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
            {processedItems.map(({ item, index, displayUnitPrice, displayLineTotal, packagingSpec }) => (
              <tr key={`exec-item-${item.id || index}`}>
                <td className="py-2.5 px-2 text-center text-slate-500">{toPersianDigits(index + 1)}</td>
                <td className="py-2.5 px-3 font-bold">
                  {item.productName}
                  <span className="block text-[10px] text-slate-400 font-normal">{packagingSpec}</span>
                </td>
                <td className="py-2.5 px-3 text-center">{toPersianDigits(item.totalPieces.toLocaleString())}</td>
                <td className="py-2.5 px-3 text-center">{toPersianDigits(displayUnitPrice.toLocaleString())}</td>
                <td className="py-2.5 px-3 text-center font-bold">{toPersianDigits(displayLineTotal.toLocaleString())}</td>
              </tr>
            ))}
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
            {processedItems.map(({ item, index, displayUnitPrice, displayLineTotal }, idx) => (
              <tr 
                key={`artisan-item-${item.id || index}`}
                style={{ backgroundColor: idx % 2 === 1 ? `${theme.hex}08` : 'transparent' }}
              >
                <td className="py-3 px-3 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                <td className="py-3 px-4 font-bold">{item.productName}</td>
                <td className="py-3 px-3 text-center">{toPersianDigits(item.totalPieces.toLocaleString())}</td>
                <td className="py-3 px-3 text-center">{toPersianDigits(displayUnitPrice.toLocaleString())}</td>
                <td className="py-3 px-4 text-center font-bold">{toPersianDigits(displayLineTotal.toLocaleString())}</td>
              </tr>
            ))}
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
            {processedItems.map(({ item, index, displayUnitPrice, displayLineTotal }) => (
              <tr key={`compact-item-${item.id || index}`}>
                <td className="py-2 px-2 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                <td className="py-2 px-3 font-bold">{item.productName}</td>
                <td className="py-2 px-2 text-center">{toPersianDigits(item.totalPieces.toLocaleString())}</td>
                <td className="py-2 px-2 text-center">{toPersianDigits(displayUnitPrice.toLocaleString())}</td>
                <td className="py-2 px-3 text-center font-bold">{toPersianDigits(displayLineTotal.toLocaleString())}</td>
              </tr>
            ))}
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
            {processedItems.map(({ item, index, displayUnitPrice, displayLineTotal, packagingSpec, cartonLabel }) => (
              <tr key={`comm-item-${item.id || index}`}>
                <td className="py-3 px-3 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900 dark:text-white">{item.productName}</div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">{packagingSpec}</div>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="font-bold">{toPersianDigits(item.totalPieces.toLocaleString())}</span>
                  <div className="text-[10px] text-slate-400">{cartonLabel}</div>
                </td>
                <td className="py-3 px-3 text-center">{toPersianDigits(displayUnitPrice.toLocaleString())}</td>
                <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                  {toPersianDigits(displayLineTotal.toLocaleString())}
                </td>
              </tr>
            ))}
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
  } = props;

  return (
    <div className={`space-y-6 transition-colors ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* Top Graphic Banner */}
      <div 
        className="p-6 rounded-3xl text-white shadow-md flex items-center justify-between"
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
            {processedItems.map(({ item, index, displayUnitPrice, displayLineTotal, packagingSpec }) => (
              <tr key={`neo-item-${item.id || index}`}>
                <td className="py-3 px-3 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                <td className="py-3 px-4 font-bold">
                  {item.productName}
                  <span className="block text-[10.5px] text-slate-400 font-normal">{packagingSpec}</span>
                </td>
                <td className="py-3 px-3 text-center">{toPersianDigits(item.totalPieces.toLocaleString())}</td>
                <td className="py-3 px-3 text-center">{toPersianDigits(displayUnitPrice.toLocaleString())}</td>
                <td className="py-3 px-4 text-center font-bold">{toPersianDigits(displayLineTotal.toLocaleString())}</td>
              </tr>
            ))}
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
            {processedItems.map(({ item, index, displayUnitPrice, displayLineTotal, packagingSpec }) => (
              <tr key={`hyper-item-${item.id || index}`}>
                <td className="py-2.5 px-2 text-center text-slate-400">{toPersianDigits(index + 1)}</td>
                <td className="py-2.5 px-3 font-bold">
                  {item.productName}
                  <span className="block text-[10px] text-slate-400 font-normal">{packagingSpec}</span>
                </td>
                <td className="py-2.5 px-3 text-center">{toPersianDigits(item.totalPieces.toLocaleString())}</td>
                <td className="py-2.5 px-3 text-center">{toPersianDigits(displayUnitPrice.toLocaleString())}</td>
                <td className="py-2.5 px-3 text-center font-bold">{toPersianDigits(displayLineTotal.toLocaleString())}</td>
              </tr>
            ))}
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
          </div>
        </div>

        {/* Bank Details & Signatures */}
        {renderBankAndSignaturesBox(props)}
      </div>
    </div>
  );
};

// Aliases for backwards compatibility and clean imports
export const PrintMonoTemplate = PrintModernMonoTemplate;
export const GraphicMinimalTemplate = GraphicSwissTemplate;
export const GraphicNordicTemplate = GraphicFintechTemplate;
