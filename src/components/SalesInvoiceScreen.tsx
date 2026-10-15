import React from 'react';
import { InvoiceTemplateProps, renderCumulativeBalanceSection, renderItemCoverPriceBadge } from './InvoiceTemplates';
import { toPersianDigits, formatPrice } from '../utils/formatters';
import { 
  Boxes, 
  ShoppingCart, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Hash, 
  CreditCard, 
  Copy, 
  Check, 
  Scale, 
  Receipt, 
  Percent,
  Wallet,
  Heart
} from 'lucide-react';

export const SalesInvoiceScreen: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    theme,
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

  // Commercial Navy & Slate styling with brand accent
  const primaryNavy = '#1e293b'; // Commercial slate navy
  const brandTeal = settings.themeColor ? (theme?.hex || '#0d9488') : '#0d9488';
  const brandTitle = settings.brandName || 'بازرگانی';
  const brandSubtitle = settings.subtitle || 'فاکتور رسمی فروش کالا و خدمات';

  // Flat styling classes
  const cardBg = isDarkCanvas 
    ? 'bg-slate-800/80 border-slate-700 text-slate-200' 
    : 'bg-[#f8fafc] border-slate-200 text-slate-800';

  const tableHeaderBg = isDarkCanvas ? 'bg-slate-800' : 'bg-slate-100';

  return (
    <div className={`space-y-4 font-sans text-xs select-text ${isDarkCanvas ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div 
            className="w-11 h-11 rounded-none flex items-center justify-center text-white shrink-0 font-bold"
            style={{ backgroundColor: brandTeal }}
          >
            <Boxes className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {brandTitle}
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {brandSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div 
            className="px-3 py-1.5 rounded-none text-white font-black text-xs flex items-center gap-1.5"
            style={{ backgroundColor: brandTeal }}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>فاکتور فروش</span>
          </div>
          <span className="px-2.5 py-1 rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
            {invoice.paymentStatus === 'cash' ? 'نقدی / تسویه' : 'نسیه / مدت‌دار'}
          </span>
        </div>
      </div>

      {/* 2. INFORMATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Customer Information Card */}
        <div 
          className="p-3.5 border rounded-none space-y-2.5 transition-colors"
          style={{
            backgroundColor: isDarkCanvas ? `${brandTeal}18` : `${brandTeal}0A`,
            borderColor: `${brandTeal}35`
          }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5">
            <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" style={{ color: brandTeal }} />
              <span>مشخصات خریدار / مشتری</span>
            </span>
            <span className="text-[10px] text-slate-400">طرف حساب</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">نام مشتری:</span>
              <span className="font-black text-slate-900 dark:text-white truncate block">
                {invoice.customerName || 'مشتری متفرقه / نقدی'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">شماره تماس:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr text-right block">
                {invoice.customerPhone ? toPersianDigits(invoice.customerPhone) : '---'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[10px]">آدرس و موقعیت:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                {invoice.customerAddress || 'ثبت نشده'}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Specification Card */}
        <div className={`p-3.5 border rounded-none space-y-2.5 ${cardBg}`}>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
            <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" style={{ color: brandTeal }} />
              <span>اطلاعات سند و فاکتور</span>
            </span>
            <span className="text-[10px] text-slate-400">شناسه</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">شماره فاکتور:</span>
              <span className="font-mono font-black text-slate-900 dark:text-white">
                {toPersianDigits(invoice.invoiceNumber || invoice.id.slice(0, 6))}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">تاریخ صدور:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {toPersianDigits(invoice.date)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">نوع فروش:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {invoice.salesType || 'نقدی'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">تعداد ردیف:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {toPersianDigits(processedItems.length)} قلم کالا
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PRODUCT TABLE */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-none overflow-x-auto bg-white dark:bg-slate-900">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className={`${tableHeaderBg} text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800`}>
              <th className="py-2.5 px-3 text-center w-10">#</th>
              <th className="py-2.5 px-3">شرح کالا / خدمات</th>
              <th className="py-2.5 px-3 text-center min-w-[100px]">تعداد و کارتن</th>
              <th className="py-2.5 px-3 text-center min-w-[110px]">فی واحد (تومان)</th>
              <th className="py-2.5 px-3 text-left min-w-[120px]">مبلغ کل (تومان)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {processedItems.map((itemObj) => {
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
              } = itemObj;
              const effectiveLineTotal = discountedLineTotal || displayLineTotal;

              return (
                <tr key={`sales-row-${item.id || index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                    {toPersianDigits(index + 1)}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.productName}
                    </div>
                    {packagingSpec && (
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        {packagingSpec}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="font-bold text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(item.totalPieces.toLocaleString())} عدد
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      {cartonLabel}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {toPersianDigits(displayUnitPrice.toLocaleString())}
                    </div>
                    {renderItemCoverPriceBadge((itemObj as any).coverPrice, props.showCoverPrice)}
                    {hasDiscount && discountPercent && discountPercent > 0 && (
                      <div className="text-[9.5px] text-amber-600 dark:text-amber-400 font-bold">
                        تخفیف: {toPersianDigits((discountedUnitPrice || 0).toLocaleString())}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-left font-mono font-black text-slate-900 dark:text-white">
                    {toPersianDigits(effectiveLineTotal.toLocaleString())}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. SUMMARY & 5. BANK INFO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Bank Details & Signatures */}
        {/* Bank Details & Signatures - Full, Balanced, Prestigious */}
        <div className={`p-4 border rounded-xl flex flex-col justify-between space-y-3.5 ${cardBg} shadow-xs`}>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" style={{ color: brandTeal }} />
                <span>اطلاعات حساب و واریز بانکی</span>
              </span>
              <button
                type="button"
                onClick={() => onCopyCardNumber(settings.cardNumber || (settings as any).bankCardNumber || '۶۰۳۷۹۹۷۱۴۵۶۷۸۹۱۰')}
                className="text-[11px] text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-1 font-bold cursor-pointer bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800"
              >
                {copiedCard ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCard ? 'کپی شد' : 'کپی شماره کارت'}</span>
              </button>
            </div>

            {/* Stylized Bank Card Box */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">بانک و صاحب حساب:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {settings.bankName || 'بانک ملت'} · {(settings as any).bankAccountOwner || settings.sellerStampName || settings.storeName || 'مدیریت بازرگانی'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">شماره کارت:</span>
                <span className="font-mono font-black text-slate-900 dark:text-white tracking-wider select-all dir-ltr text-xs sm:text-sm">
                  {toPersianDigits(settings.cardNumber || (settings as any).bankCardNumber || '۶۰۳۷۹۹۷۱۴۵۶۷۸۹۱۰')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">شماره شبا (IBAN):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] tracking-wide select-all dir-ltr">
                  IR{toPersianDigits(settings.iban || (settings as any).bankIban || '۴۷۰۱۲۰۰۱۰۰۰۰۰۰۰۸۳۴۹۱۸۳۱۰۵')}
                </span>
              </div>
              {(settings.accountNumber || (settings as any).bankAccountNumber) && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">شماره حساب:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs select-all">
                    {toPersianDigits(settings.accountNumber || (settings as any).bankAccountNumber || '')}
                  </span>
                </div>
              )}
            </div>

            {/* Settlement Status & Payment Instructions Strip */}
            <div className="p-2.5 rounded-lg bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/80 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-teal-900 dark:text-teal-200">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                <span className="font-bold">وضعیت تسویه فاکتور:</span>
                <span>{invoice.paymentStatus === 'cash' ? 'نقدی تسویه‌شده' : invoice.paymentStatus === 'credit' ? 'نسیه (طبق قرارداد)' : 'پرداخت ترکیبی / علی‌الحساب'}</span>
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono">
                سند #{toPersianDigits(invoice.invoiceNumber)}
              </span>
            </div>
          </div>

          {/* 6. SIGNATURE BOXES */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2.5 text-center text-[10px] text-slate-600 dark:text-slate-400">
            <div className="p-2.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg h-16 flex flex-col justify-between bg-white/60 dark:bg-slate-900/40">
              <span className="font-bold">امضاء خریدار / مشتری</span>
              <span className="text-[9px] text-slate-400">تحویل کالا مورد تایید است</span>
            </div>
            <div className="p-2.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg h-16 flex flex-col justify-between bg-white/60 dark:bg-slate-900/40">
              <span className="font-bold">مهر و امضای مدیریت</span>
              <span className="text-[9px] text-slate-400">{settings.sellerStampName || settings.storeName || 'امضای رسمی'}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div 
          className="p-3.5 border rounded-none flex flex-col justify-between space-y-3 transition-colors"
          style={{
            backgroundColor: isDarkCanvas ? `${brandTeal}14` : `${brandTeal}08`,
            borderColor: `${brandTeal}30`
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5">
              <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" style={{ color: brandTeal }} />
                <span>خلاصه محاسبات مالی</span>
              </span>
              <span className="font-bold text-[11px] text-slate-600 dark:text-slate-400">
                جمع اقلام: {toPersianDigits(processedItems.length)}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">جمع کل کالاها:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatPrice(grossAmount)}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                  <span className="flex items-center gap-1 font-bold">
                    <Percent className="w-3 h-3" />
                    <span>تخفیف:</span>
                  </span>
                  <span className="font-mono font-bold dir-ltr">
                    -{formatPrice(discount)}
                  </span>
                </div>
              )}

              {tax > 0 && (
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span>مالیات بر ارزش افزوده:</span>
                  <span className="font-mono font-bold">
                    {formatPrice(tax)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Highlight Net Total Box */}
          <div 
            className="p-3 rounded-none text-white flex items-center justify-between shadow-none"
            style={{ backgroundColor: brandTeal }}
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="font-black text-xs sm:text-sm">مبلغ قابل دریافت:</span>
            </div>
            <div className="text-left font-mono font-black text-base sm:text-lg dir-ltr">
              {formatPrice(netPayableAmount)}
            </div>
          </div>

          {/* Cumulative Balance Underneath Net Amount (نسیه + مانده قبلی مشتری) */}
          {renderCumulativeBalanceSection(props)}
        </div>
      </div>

      {/* 7. FOOTER */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
        <span>تاریخ چاپ / صدور: {toPersianDigits(invoice.date)}</span>
        <div className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
          <span>با تشکر از اعتماد شما</span>
          <Heart className="w-3.5 h-3.5 fill-current inline" style={{ color: brandTeal }} />
        </div>
      </div>
    </div>
  );
};
