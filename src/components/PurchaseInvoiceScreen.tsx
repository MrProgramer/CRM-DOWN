import React from 'react';
import { InvoiceTemplateProps, renderCumulativeBalanceSection, renderItemCoverPriceBadge } from './InvoiceTemplates';
import { toPersianDigits, formatPrice } from '../utils/formatters';
import { 
  Boxes, 
  Truck, 
  Building2, 
  Phone, 
  MapPin, 
  Calendar, 
  Hash, 
  CreditCard, 
  Copy, 
  Check, 
  Receipt, 
  Percent,
  Wallet,
  Heart
} from 'lucide-react';

export const PurchaseInvoiceScreen: React.FC<InvoiceTemplateProps> = (props) => {
  const {
    invoice,
    settings,
    theme,
    isDarkCanvas,
    processedItems,
    grossAmount,
    discount,
    netPayableAmount,
    onCopyCardNumber,
    copiedCard,
  } = props;

  // Commercial Navy & Indigo / Purple for Purchase Invoices
  const purchaseAccent = settings.themeColor ? (theme?.hex || '#5c67f2') : '#5c67f2';
  const brandTitle = settings.brandName || 'بازرگانی';
  const brandSubtitle = settings.subtitle || 'فاکتور ورود کالا و خرید به انبار';

  const additionExpenses = invoice.expenses?.filter(e => e.action === 'add' && e.amount > 0) || [];
  const totalAdditionExpenses = additionExpenses.reduce((s, e) => s + e.amount, 0);

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
            style={{ backgroundColor: purchaseAccent }}
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
            style={{ backgroundColor: purchaseAccent }}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>فاکتور ورود کالا</span>
          </div>
          <span className="px-2.5 py-1 rounded-none border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
            {invoice.paymentStatus === 'cash' ? 'تسویه شده' : 'مانده / بستانکار'}
          </span>
        </div>
      </div>

      {/* 2. INFORMATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Supplier Information Card */}
        <div 
          className="p-3.5 border rounded-none space-y-2.5 transition-colors"
          style={{
            backgroundColor: isDarkCanvas ? `${purchaseAccent}18` : `${purchaseAccent}0A`,
            borderColor: `${purchaseAccent}35`
          }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5">
            <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" style={{ color: purchaseAccent }} />
              <span>مشخصات فروشنده / تأمین‌کننده</span>
            </span>
            <span className="text-[10px] text-slate-400">طرف حساب</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">نام تأمین‌کننده:</span>
              <span className="font-black text-slate-900 dark:text-white truncate block">
                {invoice.customerName || 'تأمین‌کننده اصلی'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">شماره تماس:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 dir-ltr text-right block">
                {invoice.customerPhone ? toPersianDigits(invoice.customerPhone) : '---'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[10px]">آدرس و انبار مبدا:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">
                {invoice.customerAddress || 'ثبت نشده'}
              </span>
            </div>
          </div>
        </div>

        {/* Purchase Specs Card */}
        <div className={`p-3.5 border rounded-none space-y-2.5 ${cardBg}`}>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
            <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" style={{ color: purchaseAccent }} />
              <span>مشخصات خرید و سند ورود</span>
            </span>
            <span className="text-[10px] text-slate-400">رسید ورود</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">شماره فاکتور / بارنامه:</span>
              <span className="font-mono font-black text-slate-900 dark:text-white">
                {toPersianDigits(invoice.invoiceNumber || invoice.id.slice(0, 6))}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">تاریخ ورود بار:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {toPersianDigits(invoice.date)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">انبار مقصد:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                انبار مرکزی بازرگانی
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">تعداد اقلام:</span>
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
              <th className="py-2.5 px-3">شرح کامل کالای وارده</th>
              <th className="py-2.5 px-3 text-center min-w-[100px]">تعداد و کارتن</th>
              <th className="py-2.5 px-3 text-center min-w-[110px]">فی واحد خرید (تومان)</th>
              <th className="py-2.5 px-3 text-left min-w-[120px]">مبلغ کل خرید (تومان)</th>
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
                <tr key={`purchase-row-${item.id || index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
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
        {/* Bank & Settlement Details */}
        <div className={`p-3.5 border rounded-none flex flex-col justify-between space-y-3 ${cardBg}`}>
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
              <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" style={{ color: purchaseAccent }} />
                <span>اطلاعات حساب بانکی و تسویه</span>
              </span>
              {settings.bankCardNumber && (
                <button
                  type="button"
                  onClick={() => onCopyCardNumber(settings.bankCardNumber)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-bold cursor-pointer"
                >
                  {copiedCard ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCard ? 'کپی شد' : 'کپی کارت'}</span>
                </button>
              )}
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">بانک و حساب:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {settings.bankName || 'ملی'} - {settings.bankAccountOwner || settings.storeName}
                </span>
              </div>
              {settings.bankCardNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">شماره کارت:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white dir-ltr">
                    {toPersianDigits(settings.bankCardNumber)}
                  </span>
                </div>
              )}
              {settings.bankIban && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">شماره شبا:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 dir-ltr">
                    IR{toPersianDigits(settings.bankIban)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 6. SIGNATURE BOX */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-center text-[10px] text-slate-500">
            <div className="p-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-none h-14 flex flex-col justify-between">
              <span>تحویل‌دهنده (تأمین‌کننده / راننده)</span>
            </div>
            <div className="p-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-none h-14 flex flex-col justify-between">
              <span>مسئول انبار و مدیریت بازرگانی</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div 
          className="p-3.5 border rounded-none flex flex-col justify-between space-y-3 transition-colors"
          style={{
            backgroundColor: isDarkCanvas ? `${purchaseAccent}14` : `${purchaseAccent}08`,
            borderColor: `${purchaseAccent}30`
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5">
              <span className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" style={{ color: purchaseAccent }} />
                <span>خلاصه مالی فاکتور خرید</span>
              </span>
              <span className="font-bold text-[11px] text-slate-600 dark:text-slate-400">
                جمع اقلام: {toPersianDigits(processedItems.length)}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">جمع کل خرید:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatPrice(grossAmount)}
                </span>
              </div>

              {totalAdditionExpenses > 0 && (
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                  <span className="flex items-center gap-1 font-bold">
                    <Truck className="w-3 h-3" />
                    <span>هزینه حمل و نقل:</span>
                  </span>
                  <span className="font-mono font-bold dir-ltr">
                    +{formatPrice(totalAdditionExpenses)}
                  </span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                  <span className="flex items-center gap-1 font-bold">
                    <Percent className="w-3 h-3" />
                    <span>تخفیف دریافتی از تأمین‌کننده:</span>
                  </span>
                  <span className="font-mono font-bold dir-ltr">
                    -{formatPrice(discount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Highlight Net Total Box */}
          <div 
            className="p-3 rounded-none text-white flex items-center justify-between shadow-none"
            style={{ backgroundColor: purchaseAccent }}
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span className="font-black text-xs sm:text-sm">مبلغ نهایی خرید:</span>
            </div>
            <div className="text-left font-mono font-black text-base sm:text-lg dir-ltr">
              {formatPrice(netPayableAmount)}
            </div>
          </div>

          {/* Cumulative Balance Underneath Net Amount (نسیه + مانده قبلی طرف‌حساب) */}
          {renderCumulativeBalanceSection(props)}
        </div>
      </div>

      {/* 7. FOOTER */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
        <span>تاریخ ثبت در سیستم: {toPersianDigits(invoice.date)}</span>
        <div className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
          <span>با تشکر از اعتماد شما</span>
          <Heart className="w-3.5 h-3.5 fill-current inline" style={{ color: purchaseAccent }} />
        </div>
      </div>
    </div>
  );
};
