import React, { useState, useMemo } from 'react';
import { Invoice, StoreSettings, Product, ProductReturn } from '../types';
import { formatPrice, formatCartonText, toPersianDigits, getCurrentPersianDate, getCurrentPersianTime, getNetReturnAmount, formatProductPackagingSpec } from '../utils/formatters';
import { themes } from './ThemeConfig';
import { downloadInvoiceAsImage, downloadInvoiceAsPDF, copyInvoiceImageToClipboard } from '../utils/exportInvoice';
import { 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  ArrowRight, 
  Edit3, 
  FileText,
  CreditCard,
  Building2,
  Sparkles,
  FileDown,
  Image as ImageIcon,
  RotateCcw,
  X,
  TrendingUp,
  Camera,
  Percent,
  Coins,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceViewProps {
  invoice: Invoice;
  settings: StoreSettings;
  isSecretMode: boolean;
  onToggleSecretMode: () => void;
  onEdit?: (invoice: Invoice) => void;
  onBack?: () => void;
  onOpenProfitAnalysis?: (invoice: Invoice) => void;
  products?: Product[];
  productReturns?: ProductReturn[];
  onExportPDF?: (invoice: Invoice) => void;
  onExportImage?: (invoice: Invoice) => void;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({
  invoice,
  settings,
  isSecretMode,
  onToggleSecretMode,
  onEdit,
  onBack,
  onOpenProfitAnalysis,
  products = [],
  productReturns = [],
  onExportPDF,
  onExportImage,
  onShowAlert,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isCopyingScreenshot, setIsCopyingScreenshot] = useState(false);

  // Presentation / Adjusted Display Price Mode (فاکتور نمایشی / قیمت ارائه به مشتری / همکار)
  const [isPresentationModeActive, setIsPresentationModeActive] = useState<boolean>(false);
  const [presentationModeType, setPresentationModeType] = useState<'percent' | 'fixed' | 'selling_price' | 'custom'>('percent');
  const [markupPercent, setMarkupPercent] = useState<number>(10); // default 10%
  const [fixedMarkupPerUnit, setFixedMarkupPerUnit] = useState<number>(1000); // default 1000 Toman per unit
  const [customItemUnitPrices, setCustomItemUnitPrices] = useState<{ [itemKey: string]: number }>({});
  const [isPresentationPanelOpen, setIsPresentationPanelOpen] = useState<boolean>(false);

  const theme = themes[settings.themeColor] || themes.teal;
  const isPurchase = invoice.type === 'purchase';

  // Helper to compute effective unit price for item in preview
  const getItemEffectiveUnitPrice = (item: Invoice['items'][0], index: number) => {
    const prod = products.find(p => p.id === item.productId || p.name?.trim().toLowerCase() === item.productName?.trim().toLowerCase());
    
    // Original real purchase price
    const basePurchasePrice = (item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0)
      ? item.unitPurchasePrice
      : ((prod?.purchasePrice && prod.purchasePrice > 0)
          ? prod.purchasePrice
          : (item.totalPurchaseCost && item.totalPieces ? Math.round(item.totalPurchaseCost / item.totalPieces) : (item.unitSellingPrice || 0)));

    const baseSellingPrice = (item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
      ? item.unitSellingPrice
      : ((item as any).unitPurchasePrice || prod?.sellingPrice || 0);

    const basePrice = isPurchase ? basePurchasePrice : baseSellingPrice;

    if (!isPresentationModeActive) {
      return basePrice;
    }

    const itemKey = item.id || `item-${index}`;
    if (presentationModeType === 'custom' && customItemUnitPrices[itemKey] !== undefined) {
      return customItemUnitPrices[itemKey];
    }

    if (presentationModeType === 'selling_price') {
      return (prod?.sellingPrice && prod.sellingPrice > 0) ? prod.sellingPrice : basePrice;
    }

    if (presentationModeType === 'percent') {
      const multiplier = 1 + ((Number(markupPercent) || 0) / 100);
      return Math.round(basePrice * multiplier);
    }

    if (presentationModeType === 'fixed') {
      return Math.max(0, basePrice + (Number(fixedMarkupPerUnit) || 0));
    }

    return basePrice;
  };

  // Calculate carton breakdown summary for this invoice
  const invoiceCartonBreakdownText = useMemo(() => {
    if (!invoice.items || invoice.items.length === 0) return '';
    let packagedCartons = 0;
    let packagedExtraPieces = 0;
    let hasPackaged = false;
    let hasUnpackaged = false;

    invoice.items.forEach(item => {
      const ppc = item.piecesPerCarton || ((item.packsCount || 1) * (item.piecesPerPack || 1));
      if (ppc > 1) {
        hasPackaged = true;
        packagedCartons += (item.cartonsCount || 0);
        packagedExtraPieces += (item.extraPieces !== undefined ? item.extraPieces : (item.totalPieces % ppc));
      } else {
        hasUnpackaged = true;
      }
    });

    if (!hasPackaged && hasUnpackaged) {
      return 'کارتن: نامشخص';
    }

    const parts: string[] = [];
    if (packagedCartons > 0) {
      parts.push(`${toPersianDigits(packagedCartons)} کارتن`);
    }
    if (packagedExtraPieces > 0) {
      parts.push(`${toPersianDigits(packagedExtraPieces)} دانه`);
    }

    if (parts.length > 0) {
      return parts.join(' و ');
    }
    if (hasPackaged) {
      return `${toPersianDigits(0)} کارتن`;
    }
    return '';
  }, [invoice.items]);

  // Find all matched returns for this invoice (both sales and purchase returns)
  const matchedReturns = (productReturns || []).filter(r => {
    if (isPurchase && r.type !== 'to_supplier') return false;
    if (!isPurchase && r.type !== 'from_customer') return false;
    if (r.invoiceId && r.invoiceId === invoice.id) return true;
    if (r.invoiceNumber && r.invoiceNumber === invoice.invoiceNumber) return true;
    const sameCust = invoice.customerName && r.customerName?.trim().toLowerCase() === invoice.customerName?.trim().toLowerCase();
    const itemInInvoice = invoice.items.some(it => it.productId === r.productId || it.productName?.trim().toLowerCase() === r.productName?.trim().toLowerCase());
    if (sameCust && itemInInvoice && (r.invoiceNumber === invoice.invoiceNumber || r.invoiceId === invoice.id)) {
      return true;
    }
    return false;
  });

  const totalInvoiceReturnsAmount = matchedReturns.reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  // 1. Current items sum
  const itemsCurrentSubtotal = isPurchase
    ? invoice.items.reduce((sum, item, idx) => {
        const uPrice = getItemEffectiveUnitPrice(item, idx);
        return sum + (item.totalPieces * uPrice);
      }, 0)
    : invoice.items.reduce((sum, item, idx) => {
        const uPrice = isPresentationModeActive
          ? getItemEffectiveUnitPrice(item, idx)
          : ((item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
              ? item.unitSellingPrice
              : (item.totalPieces > 0 && item.totalPrice > 0 ? Math.round(item.totalPrice / item.totalPieces) : (item.unitPrice || 0)));
        return sum + (uPrice > 0 ? uPrice * item.totalPieces : (item.totalPrice || 0));
      }, 0);

  // Real original purchase subtotal before any presentation adjustment
  const realOriginalSubtotal = invoice.items.reduce((sum, item) => {
    const prod = products.find(p => p.id === item.productId || p.name === item.productName);
    const pPrice = (item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0)
      ? item.unitPurchasePrice
      : ((prod?.purchasePrice && prod.purchasePrice > 0)
          ? prod.purchasePrice
          : (item.totalPurchaseCost && item.totalPieces ? Math.round(item.totalPurchaseCost / item.totalPieces) : (item.unitSellingPrice || 0)));
    return sum + (item.totalPieces * (isPurchase ? pPrice : (item.unitSellingPrice || 0)));
  }, 0);

  // 2. Original items sum if preserved in originalTotalPrice / originalTotalPieces
  const itemsOriginalSubtotal = isPurchase
    ? invoice.items.reduce((sum, item, idx) => {
        const uPrice = getItemEffectiveUnitPrice(item, idx);
        const origPieces = (item.originalTotalPieces !== undefined && item.originalTotalPieces > item.totalPieces)
          ? item.originalTotalPieces
          : item.totalPieces;
        const origTot = (item.originalTotalPrice !== undefined && item.originalTotalPrice > 0 && !isPresentationModeActive)
          ? item.originalTotalPrice
          : (origPieces * uPrice);
        return sum + origTot;
      }, 0)
    : invoice.items.reduce((sum, item, idx) => {
        const uPrice = isPresentationModeActive
          ? getItemEffectiveUnitPrice(item, idx)
          : ((item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
              ? item.unitSellingPrice
              : (item.totalPieces > 0 && item.totalPrice > 0 ? Math.round(item.totalPrice / item.totalPieces) : (item.unitPrice || 0)));
        const origPieces = (item.originalTotalPieces !== undefined && item.originalTotalPieces > item.totalPieces)
          ? item.originalTotalPieces
          : item.totalPieces;
        return sum + (uPrice > 0 ? origPieces * uPrice : (item.totalPrice || 0));
      }, 0);

  // Gross subtotal before any return deduction:
  const grossSubtotal = totalInvoiceReturnsAmount > 0
    ? (itemsOriginalSubtotal > itemsCurrentSubtotal
        ? itemsOriginalSubtotal
        : (itemsCurrentSubtotal + totalInvoiceReturnsAmount))
    : itemsCurrentSubtotal;

  const grossAmount = Math.max(0, grossSubtotal - (invoice.discount || 0) + (invoice.tax || 0));
  const netPayableAmount = Math.max(0, grossAmount - totalInvoiceReturnsAmount);

  const handleDirectPrint = () => {
    setIsExportModalOpen(false);
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) {
      document.documentElement.classList.remove('dark');
    }
    setTimeout(() => {
      window.print();
      if (wasDark) {
        setTimeout(() => {
          document.documentElement.classList.add('dark');
        }, 500);
      }
    }, 150);
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    await downloadInvoiceAsPDF(
      'invoice-paper',
      `Factor-${invoice.invoiceNumber}`,
      (errMsg) => onShowAlert?.(errMsg, 'error', 'خطا در صدور PDF')
    );
    setIsExportingPDF(false);
    setIsExportModalOpen(false);
    if (onExportPDF) onExportPDF(invoice);
    if (onShowAlert) {
      onShowAlert(`فایل PDF فاکتور #${toPersianDigits(invoice.invoiceNumber)} با موفقیت دانلود شد.`, 'success', 'دانلود PDF');
    }
  };

  const handleDownloadImage = async () => {
    setIsExportingImage(true);
    await downloadInvoiceAsImage(
      'invoice-paper',
      `Factor-${invoice.invoiceNumber}`,
      (errMsg) => onShowAlert?.(errMsg, 'error', 'خطا در صدور تصویر')
    );
    setIsExportingImage(false);
    setIsExportModalOpen(false);
    if (onExportImage) onExportImage(invoice);
    if (onShowAlert) {
      onShowAlert(`تصویر باکیفیت فاکتور #${toPersianDigits(invoice.invoiceNumber)} با موفقیت ذخیره شد.`, 'success', 'دانلود تصویر فاکتور');
    }
  };

  const getInvoiceSummaryCaption = () => {
    const cartonPart = invoiceCartonBreakdownText ? ` (${invoiceCartonBreakdownText})` : '';
    const finalDisplayAmount = isPresentationModeActive ? netPayableAmount : invoice.finalAmount;
    const invTitle = isPurchase 
      ? (isPresentationModeActive ? `📄 فاکتور تامین کالا #${toPersianDigits(invoice.invoiceNumber)}` : `📄 فاکتور خرید (ورود به انبار) #${toPersianDigits(invoice.invoiceNumber)}`)
      : `📄 فاکتور فروش #${toPersianDigits(invoice.invoiceNumber)}`;

    return `${invTitle} - ${settings.brandName || 'فروشگاه'}
👤 ${isPurchase ? 'تامین‌کننده / طرف‌حساب' : 'مشتری'}: ${invoice.customerName} ${invoice.customerCity ? `(${invoice.customerCity})` : ''}
📅 تاریخ: ${toPersianDigits(invoice.date)} ${invoice.time ? `- ساعت ${toPersianDigits(invoice.time)}` : ''}
📦 اقلام: ${toPersianDigits(invoice.items.length)} قلم کالا${cartonPart}
💰 مبلغ قابل پرداخت: ${formatPrice(finalDisplayAmount)}
💳 نحوه پرداخت: ${invoice.paymentMethod || 'نقدی'}
${settings.cardNumber ? `💳 شماره کارت جهت واریز: ${settings.cardNumber} (${settings.cardHolder || settings.brandName})` : ''}
${settings.phone ? `📞 شماره تماس: ${toPersianDigits(settings.phone)}` : ''}
با تشکر از حسن انتخاب شما 🙏`;
  };

  const handleCopyScreenshot = async () => {
    setIsCopyingScreenshot(true);
    const summaryText = getInvoiceSummaryCaption();

    await copyInvoiceImageToClipboard(
      'invoice-paper',
      () => {
        if (onShowAlert) {
          onShowAlert(
            '✅ عکس فاکتور در کلیپ‌بورد کپی شد! در تلگرام یا ایتا کلید Paste (Ctrl+V) را بزنید. (برای کپی متن کپشن نیز می‌توانید از دکمه «کپی متن خلاصه» استفاده کنید).',
            'success',
            'کپی عکس فاکتور'
          );
        }
      },
      (errMsg) => {
        if (onShowAlert) {
          onShowAlert(errMsg, 'info', 'کپی اسکرین‌شات');
        }
      },
      summaryText
    );
    setIsCopyingScreenshot(false);
    setIsExportModalOpen(false);
  };

  const handleCopySummary = () => {
    const text = getInvoiceSummaryCaption();
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (onShowAlert) {
      onShowAlert('متن کامل کپشن و خلاصه فاکتور در کلیپ‌بورد کپی شد! اکنون می‌توانید در کادر کپشن تلگرام پیست کنید.', 'success', 'کپی متن خلاصه فاکتور');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  // parse balance values
  const parseBalanceString = (str: string): number => {
    if (!str || str.includes('بی‌حساب') || str.includes('۰') || str.trim() === '') return 0;
    const cleanStr = str.replace(/[^\d]/g, '');
    const val = parseInt(cleanStr) || 0;
    if (str.includes('بستانکار')) return -val;
    return val;
  };

  // Determine actual paid and remaining amounts for this invoice
  const paidAmount = invoice.paidAmount !== undefined 
    ? invoice.paidAmount 
    : (invoice.paymentStatus === 'cash' || (invoice.paymentMethod?.includes('نقدی') && !invoice.paymentMethod?.includes('نسیه') && !invoice.paymentMethod?.includes('غیر')) 
        ? netPayableAmount 
        : 0);

  const remainingDebtAmount = invoice.remainingAmount !== undefined 
    ? invoice.remainingAmount 
    : (invoice.paymentStatus === 'cash' ? 0 : Math.max(0, netPayableAmount - paidAmount));

  const isPartialPayment = (invoice.paymentStatus === 'partial') || (paidAmount > 0 && paidAmount < netPayableAmount);
  const isCashPayment = (invoice.paymentStatus === 'cash') || (!isPartialPayment && paidAmount >= netPayableAmount && netPayableAmount > 0);

  const getDynamicFinalBalance = () => {
    const prevVal = parseBalanceString(invoice.previousBalance || '');

    if (isCashPayment) {
      if (prevVal > 0) return `${toPersianDigits(prevVal.toLocaleString())} تومان بدهکار`;
      if (prevVal < 0) return `${toPersianDigits(Math.abs(prevVal).toLocaleString())} تومان بستانکار`;
      return 'تسویه شده / بی‌حساب';
    }

    const unpaidPortion = isPartialPayment ? remainingDebtAmount : netPayableAmount;

    if (invoice.salesType?.includes('خرید') || invoice.salesType?.includes('ورود') || invoice.type === 'purchase') {
      const finalVal = prevVal - unpaidPortion;
      if (finalVal > 0) return `${toPersianDigits(finalVal.toLocaleString())} تومان طلبکار (از ما)`;
      if (finalVal < 0) return `${toPersianDigits(Math.abs(finalVal).toLocaleString())} تومان بستانکار (طلبکار از ما)`;
      return 'تسویه شده / بی‌حساب';
    } else {
      const finalVal = prevVal + unpaidPortion;
      if (finalVal > 0) return `${toPersianDigits(finalVal.toLocaleString())} تومان بدهکار`;
      if (finalVal < 0) return `${toPersianDigits(Math.abs(finalVal).toLocaleString())} تومان بستانکار`;
      return 'تسویه شده / بی‌حساب';
    }
  };

  const finalBalanceDisplay = getDynamicFinalBalance();
  const hasAdjustments = (invoice.discount > 0) || (invoice.tax > 0) || (totalInvoiceReturnsAmount > 0) || Boolean(invoice.offsetReturnsTotal && invoice.offsetReturnsTotal > 0);
  const prevValNumber = parseBalanceString(invoice.previousBalance || '');

  // Quick preset percentages & fixed addition values
  const percentPresets = [5, 8, 10, 12, 15, 20, 25];
  const fixedPresets = [500, 1000, 2000, 3000, 5000, 10000];

  const handleApplyCustomItemPrice = (itemKey: string, price: number) => {
    setCustomItemUnitPrices(prev => ({
      ...prev,
      [itemKey]: Math.max(0, price)
    }));
  };

  const handleResetToRealPrices = () => {
    setIsPresentationModeActive(false);
    setCustomItemUnitPrices({});
    setMarkupPercent(10);
    setFixedMarkupPerUnit(1000);
    setPresentationModeType('percent');
    if (onShowAlert) {
      onShowAlert('قیمت‌های پیش‌نمایش به قیمت واقعی خرید بازگردانده شدند.', 'info', 'بازنشانی قیمت');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-16">
      {/* Control Bar (Hidden when printing) - Flat, Clean & Modern */}
      <div className="no-print mb-6 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-slate-900 dark:text-slate-100 transition-colors">
        <div className="flex items-center gap-3 flex-wrap">
          {onBack && (
            <button
              id="invoice-back-btn"
              onClick={onBack}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              <span>بازگشت به لیست</span>
            </button>
          )}

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2 flex-wrap">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor} rounded-xl text-xs font-black whitespace-nowrap shrink-0`}>
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>فاکتور #{toPersianDigits(invoice.invoiceNumber)}</span>
            </div>
            {invoice.type === 'purchase' ? (
              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-black rounded-xl whitespace-nowrap shrink-0">
                فاکتور خرید (ورود به انبار)
              </span>
            ) : (
              <span className={`px-2.5 py-1 ${theme.badgeBg} ${theme.badgeText} border ${theme.borderColor} text-xs font-black rounded-xl whitespace-nowrap shrink-0`}>
                فاکتور فروش (مشتری)
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold hidden md:inline-block whitespace-nowrap">
              {toPersianDigits(invoice.date)}
            </span>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Custom Display / Fake Purchase Price Toggle Button */}
          <button
            id="toggle-presentation-price-btn"
            onClick={() => {
              if (!isPresentationModeActive && !isPresentationPanelOpen) {
                setIsPresentationModeActive(true);
                setIsPresentationPanelOpen(true);
              } else {
                setIsPresentationPanelOpen(!isPresentationPanelOpen);
              }
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isPresentationModeActive
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20'
                : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
            title="تنظیم قیمت نمایشی یا درصد افزایش روی قیمت خرید جهت ارائه فاکتور یا اسکرین‌شات"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isPresentationModeActive
                ? `قیمت نمایشی: ${
                    presentationModeType === 'percent'
                      ? `+${toPersianDigits(markupPercent)}٪`
                      : presentationModeType === 'fixed'
                      ? `+${formatPrice(fixedMarkupPerUnit)}`
                      : presentationModeType === 'selling_price'
                      ? 'قیمت فروش انبار'
                      : 'سفارشی'
                  }`
                : '✨ قیمت نمایشی (ارائه فاکتور)'}
            </span>
            {isPresentationPanelOpen ? (
              <ChevronUp className="w-3.5 h-3.5 shrink-0 mr-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 shrink-0 mr-0.5" />
            )}
          </button>

          {/* Edit Invoice */}
          {onEdit && (
            <button
              id="invoice-edit-btn"
              onClick={() => onEdit(invoice)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <span>ویرایش فاکتور</span>
            </button>
          )}

          {/* Copy Screenshot for Telegram / WhatsApp (Direct clipboard image) */}
          <button
            id="invoice-copy-screenshot-btn"
            onClick={handleCopyScreenshot}
            disabled={isCopyingScreenshot}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
            title="کپی مستقیم عکس فاکتور در حافظه جهت ارسال سریع با Paste در تلگرام یا پیام‌رسان‌ها"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{isCopyingScreenshot ? 'در حال تهیه عکس...' : 'کپی اسکرین‌شات (تلگرام)'}</span>
          </button>

          {/* Copy Summary */}
          <button
            id="invoice-copy-summary-btn"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />}
            <span>{copied ? 'کپی شد!' : 'کپی متن خلاصه'}</span>
          </button>

          {/* Print / Export 3-Way Options Button */}
          <button
            id="invoice-print-btn"
            onClick={() => setIsExportModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white transition-all cursor-pointer ${theme.primary} ${theme.primaryHover} whitespace-nowrap shrink-0`}
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>چاپ و صدور فاکتور</span>
          </button>
        </div>
      </div>

      {/* Presentation / Fake Purchase Price Settings Panel */}
      <AnimatePresence>
        {isPresentationPanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            className="no-print mb-6 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 rounded-2xl border-2 border-amber-400/60 dark:border-amber-700/60 p-5 shadow-lg space-y-4 overflow-hidden"
          >
            {/* Header with Switch */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-200 dark:border-amber-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>تنظیم قیمت نمایشی فاکتور (جهت ارائه به مشتری / تهیه عکس و اسکرین‌شات)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200">
                      فقط جنبه نمایشی / بدون تغییر انبار
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    با فعال‌سازی این بخش، قیمت‌های خرید در پیش‌نمایش، اسکرین‌شات و پی‌دی‌اف به میزان دلخواه شما افزایش می‌یابند.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPresentationModeActive}
                    onChange={(e) => setIsPresentationModeActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  <span className="mr-2 text-xs font-black text-slate-800 dark:text-slate-200">
                    {isPresentationModeActive ? 'حالت نمایشی فعال' : 'حالت نمایشی خاموش'}
                  </span>
                </label>

                <button
                  onClick={() => setIsPresentationPanelOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
                  title="بستن پنل تنظیمات"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {/* 1. Percent Markup */}
              <button
                type="button"
                onClick={() => {
                  setPresentationModeType('percent');
                  if (!isPresentationModeActive) setIsPresentationModeActive(true);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  presentationModeType === 'percent' && isPresentationModeActive
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                }`}
              >
                <Percent className="w-4 h-4 shrink-0" />
                <span>افزایش درصدی (+{toPersianDigits(markupPercent)}٪)</span>
              </button>

              {/* 2. Fixed Amount Markup */}
              <button
                type="button"
                onClick={() => {
                  setPresentationModeType('fixed');
                  if (!isPresentationModeActive) setIsPresentationModeActive(true);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  presentationModeType === 'fixed' && isPresentationModeActive
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                }`}
              >
                <Coins className="w-4 h-4 shrink-0" />
                <span>مبلغ ثابت روی هر واحد (+{formatPrice(fixedMarkupPerUnit)})</span>
              </button>

              {/* 3. Selling Price of Warehouse */}
              <button
                type="button"
                onClick={() => {
                  setPresentationModeType('selling_price');
                  if (!isPresentationModeActive) setIsPresentationModeActive(true);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  presentationModeType === 'selling_price' && isPresentationModeActive
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>قیمت فروش کالا در انبار</span>
              </button>

              {/* 4. Custom Item Prices */}
              <button
                type="button"
                onClick={() => {
                  setPresentationModeType('custom');
                  if (!isPresentationModeActive) setIsPresentationModeActive(true);
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  presentationModeType === 'custom' && isPresentationModeActive
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                <span>قیمت‌گذاری دلخواه اقلام</span>
              </button>
            </div>

            {/* Sub Controls according to selected mode */}
            {isPresentationModeActive && (
              <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-4 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                {presentationModeType === 'percent' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        انتخاب یا ورود درصد افزایش روی قیمت خرید:
                      </span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        +{toPersianDigits(markupPercent)} درصد سود روی هر قلم
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {percentPresets.map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setMarkupPercent(pct)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            markupPercent === pct
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          +{toPersianDigits(pct)}٪
                        </button>
                      ))}

                      {/* Custom Percentage Input */}
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">درصد دلخواه:</span>
                        <input
                          type="number"
                          min="0"
                          max="500"
                          step="0.5"
                          value={markupPercent || ''}
                          onChange={(e) => setMarkupPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-16 text-center font-black text-xs bg-transparent text-slate-900 dark:text-white outline-none border-b border-amber-400"
                          placeholder="مثلاً ۱۰"
                        />
                        <span className="text-xs font-bold text-slate-500">٪</span>
                      </div>
                    </div>
                  </div>
                )}

                {presentationModeType === 'fixed' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        مبلغ افزایشی ثابت روی هر دانه/واحد کالا (تومان):
                      </span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        +{formatPrice(fixedMarkupPerUnit)} روی هر دانه
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {fixedPresets.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFixedMarkupPerUnit(amt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            fixedMarkupPerUnit === amt
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          +{formatPrice(amt)}
                        </button>
                      ))}

                      {/* Custom Amount Input */}
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">مبلغ دلخواه:</span>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={fixedMarkupPerUnit || ''}
                          onChange={(e) => setFixedMarkupPerUnit(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-24 text-center font-black text-xs bg-transparent text-slate-900 dark:text-white outline-none border-b border-amber-400"
                          placeholder="مثلاً ۱۰۰۰"
                        />
                        <span className="text-[10px] text-slate-500">تومان</span>
                      </div>
                    </div>
                  </div>
                )}

                {presentationModeType === 'selling_price' && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>قیمت تمام اقلام فاکتور خرید دقیقا مطابق با قیمت‌های فروش تعریف شده در انبار محاسبه و نمایش داده می‌شوند.</span>
                  </div>
                )}

                {presentationModeType === 'custom' && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      تنظیم دستی قیمت هر قلم (قیمت واحد مورد نظر را برای هر کالا وارد کنید):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 max-h-48 overflow-y-auto p-1">
                      {invoice.items.map((item, idx) => {
                        const itemKey = item.id || `item-${idx}`;
                        const currentVal = customItemUnitPrices[itemKey] !== undefined 
                          ? customItemUnitPrices[itemKey] 
                          : getItemEffectiveUnitPrice(item, idx);

                        return (
                          <div key={itemKey} className="bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold truncate max-w-[120px]" title={item.productName}>
                              {item.productName}:
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={currentVal || ''}
                                onChange={(e) => handleApplyCustomItemPrice(itemKey, parseFloat(e.target.value) || 0)}
                                className="w-20 text-center font-black text-xs p-1 bg-white dark:bg-slate-900 rounded border border-amber-400 text-slate-900 dark:text-white"
                              />
                              <span className="text-[10px] text-slate-500">تومان</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Comparison & Quick Action Footer */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">بهای واقعی خرید:</span>
                      <strong className="text-slate-700 dark:text-slate-300">{formatPrice(realOriginalSubtotal)}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-600 dark:text-amber-400 font-bold">مبلغ نمایشی جدید:</span>
                      <strong className="text-amber-600 dark:text-amber-400 text-sm font-black">{formatPrice(netPayableAmount)}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>اختلاف / سود فرضی:</span>
                      <strong className="font-black">+{formatPrice(Math.max(0, netPayableAmount - realOriginalSubtotal))}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyScreenshot}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>کپی اسکرین‌شات (تلگرام)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadImage}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white font-black text-xs cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>ذخیره عکس</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToRealPrices}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 cursor-pointer"
                      title="بازنشانی قیمت‌ها به بهای اصلی خرید"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>بازنشانی به واقعی</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Presentation Mode Subtle Banner (Screen Only) */}
      {isPresentationModeActive && !isPresentationPanelOpen && (
        <div className="no-print mb-4 p-3 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2 font-black">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              حالت قیمت نمایشی فعال است (
              {presentationModeType === 'percent'
                ? `افزایش +${toPersianDigits(markupPercent)}٪`
                : presentationModeType === 'fixed'
                ? `افزایش +${formatPrice(fixedMarkupPerUnit)}`
                : presentationModeType === 'selling_price'
                ? 'قیمت فروش انبار'
                : 'قیمت‌گذاری دلخواه'}
              ). مبالغ زیر جهت ارائه یا اسکرین‌شات تنظیم شده‌اند.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsPresentationPanelOpen(true)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg cursor-pointer"
            >
              تنظیمات
            </button>
            <button
              onClick={handleResetToRealPrices}
              className="px-2.5 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold rounded-lg cursor-pointer hover:bg-slate-100"
            >
              بازگشت به واقعی
            </button>
          </div>
        </div>
      )}

      {/* Draft Warning Banner */}
      {invoice.isDraft && (
        <div className="no-print mb-6 p-4 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h4 className="font-black text-sm">این سند به عنوان «پیش‌نویس» ثبت شده است</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                اقلام این پیش‌نویس از موجودی انبار کسر نگردیده‌اند و در حساب خریدار اعمال نشده‌اند.
              </p>
            </div>
          </div>
          {onEdit && (
            <button
              onClick={() => onEdit(invoice)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl shrink-0 cursor-pointer transition-colors"
            >
              ویرایش و ثبت نهایی فاکتور
            </button>
          )}
        </div>
      )}

      {/* 4-Way Export / Print Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2.5 rounded-xl ${theme.badgeBg} ${theme.primaryText}`}>
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      صدور، چاپ و اشتراک‌گذاری فاکتور
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      فاکتور #{toPersianDigits(invoice.invoiceNumber)} - خریدار: {invoice.customerName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Export Options Grid */}
              <div className="space-y-3">
                {/* 0. Direct Screenshot / Clipboard (Telegram / WhatsApp) */}
                <button
                  type="button"
                  onClick={handleCopyScreenshot}
                  disabled={isCopyingScreenshot}
                  className="w-full text-right p-4 rounded-xl border-2 border-indigo-500/80 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 transition-all flex items-start gap-4 group cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <div className="p-3 rounded-xl bg-indigo-600 text-white group-hover:scale-105 transition-transform shrink-0 shadow-sm">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-black text-sm text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                      <span>۱. کپی مستقیم عکس فاکتور (ارسال تلگرام / ایتا)</span>
                      <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold whitespace-nowrap">سریع‌ترین</span>
                    </div>
                    <p className="text-xs text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed">
                      عکس باکیفیت مستقیم در حافظه سیستم (کلیپ‌بورد) کپی می‌شود؛ کافیست در چت تلگرام یا پیام‌رسان کلید <kbd className="px-1.5 py-0.5 rounded bg-indigo-200 dark:bg-indigo-800 font-mono font-bold">Ctrl+V</kbd> یا گزینه Paste را بزنید.
                    </p>
                  </div>
                </button>

                {/* Copy Summary text option */}
                <button
                  type="button"
                  onClick={() => {
                    handleCopySummary();
                    setIsExportModalOpen(false);
                  }}
                  className="w-full text-right p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 bg-slate-50 dark:bg-slate-950 hover:bg-sky-50/40 dark:hover:bg-sky-950/40 transition-all flex items-start gap-4 group cursor-pointer"
                >
                  <div className="p-3 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 group-hover:scale-105 transition-transform shrink-0">
                    <Copy className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>۲. کپی متن خلاصه (کپشن تلگرام)</span>
                      <span className="text-[10px] bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">متن کپشن</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      متن فرمت‌شده مشخصات فاکتور، مانده حساب، کارتن‌ها و شماره کارت جهت قرار دادن در کادر کپشن تلگرام.
                    </p>
                  </div>
                </button>

                {/* 1. PDF Export */}
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isExportingPDF || isExportingImage || isCopyingScreenshot}
                  className={`w-full text-right p-4 rounded-xl border border-slate-200 dark:border-slate-800 ${theme.accentHoverBorder} bg-slate-50 dark:bg-slate-950 ${theme.accentHoverBg} transition-all flex items-start gap-4 group cursor-pointer disabled:opacity-50`}
                >
                  <div className={`p-3 rounded-xl ${theme.badgeBg} ${theme.primaryText} group-hover:scale-105 transition-transform shrink-0`}>
                    <FileDown className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{isExportingPDF ? 'در حال صدور و ایجاد فایل PDF...' : 'دانلود فایل پی‌دی‌اف (PDF)'}</span>
                      <span className={`text-[10px] ${theme.badgeBg} ${theme.badgeText} px-2 py-0.5 rounded-full font-bold whitespace-nowrap`}>پیشنهادی</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      خروجی باکیفیت و استاندارد A4 مناسب جهت چاپ مستقیم، بایگانی یا ارسال رسمی به مشتری.
                    </p>
                  </div>
                </button>

                {/* 2. Image Export (PNG) */}
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={isExportingImage || isCopyingScreenshot}
                  className="w-full text-right p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 transition-all flex items-start gap-4 group cursor-pointer disabled:opacity-50"
                >
                  <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 group-hover:scale-105 transition-transform shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      {isExportingImage ? 'در حال تبدیل و ذخیره عکس...' : 'دانلود فایل عکس (PNG)'}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      تبدیل فاکتور به فایل تصویر با کیفیت بالا و ذخیره روی دستگاه شما.
                    </p>
                  </div>
                </button>

                {/* 3. Direct Print */}
                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="w-full text-right p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 bg-slate-50 dark:bg-slate-950 hover:bg-amber-50/40 dark:hover:bg-amber-950/40 transition-all flex items-start gap-4 group cursor-pointer"
                >
                  <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 group-hover:scale-105 transition-transform shrink-0">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-black text-sm text-slate-900 dark:text-white">
                      چاپ مستقیم (دستگاه پرینتر)
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      ارسال مستقیم به دستگاه پرینتر متصل به سیستم یا چاپگر حرارتی بدون ذخیره فایل اضافی.
                    </p>
                  </div>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* A4 Paper Canvas Replica - Completely Flat, Clean & Elegant */}
      <div 
        id="invoice-paper"
        className="invoice-paper-container relative bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 overflow-hidden print:p-0 print:border-none print:shadow-none print:bg-white print:text-black"
        style={{ minHeight: '297mm', fontFamily: "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        {/* Subtle Watermark */}
        {settings.enableWatermark && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none -rotate-[35deg]"
            style={{ 
              zIndex: 0,
              opacity: settings.watermarkOpacity !== undefined ? settings.watermarkOpacity : 0.08
            }}
          >
            <span 
              className="font-black text-slate-900 dark:text-slate-100 print:text-slate-900 tracking-widest text-center whitespace-normal max-w-2xl block leading-snug"
              style={{ fontSize: `${settings.watermarkFontSize || 54}px` }}
            >
              {settings.watermarkText || settings.brandName}
            </span>
          </div>
        )}

        {/* Draft Watermark */}
        {invoice.isDraft && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.08] -rotate-45"
            style={{ zIndex: 1 }}
          >
            <span className="text-[120px] font-black text-amber-900 dark:text-amber-200 tracking-widest whitespace-nowrap">
              پیش‌نویس (غیر قابل استناد)
            </span>
          </div>
        )}

        <div className="relative z-10 space-y-6 print:space-y-4">
          {/* Header Section - Modern Flat Header */}
          <div className="flex flex-col items-center justify-between pb-5 print:pb-3 border-b border-slate-200 dark:border-slate-800 print:border-slate-200">
            {/* Top row with Meta, Center and Brand */}
            <div className="w-full flex items-start justify-between gap-4">
              {/* Document Number & Date (Top Left) - Flat Card */}
              <div className="text-right space-y-1.5 print:space-y-0.5 bg-slate-50 dark:bg-slate-900/60 p-3.5 print:p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs min-w-[175px] print:bg-slate-50 print:border-slate-200">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 print:text-slate-600">
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-500 font-medium">شماره سند:</span>
                  <span className="font-black text-slate-900 dark:text-white print:text-slate-900 text-sm font-mono tracking-wide">{toPersianDigits(invoice.invoiceNumber)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 print:text-slate-600">
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-500 font-medium">تــاریخ:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 print:text-slate-800 font-mono">{toPersianDigits(invoice.date)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 print:text-slate-600">
                  <span className="text-slate-500 dark:text-slate-400 print:text-slate-500 font-medium">ساعت ثبت:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 print:text-slate-700 font-mono">{toPersianDigits(invoice.time || '')}</span>
                </div>
              </div>

              {/* Center Title & Bismillah */}
              <div className="text-center flex-1 px-4">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 print:text-slate-400 tracking-wider mb-2">
                  {settings.bismillah || 'هوالرزاق'}
                </p>
                <div 
                  className="inline-flex items-center gap-2 px-6 py-1.5 rounded-lg font-black text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 print:bg-slate-100 print:text-slate-900 print:border-slate-200 whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {invoice.type === 'purchase' 
                      ? (isPresentationModeActive ? 'فاکتور تامین و تحویل کالا' : 'فاکتور خرید و انبار')
                      : (settings.subtitle || 'فاکتور فروش کالا و خدمات')}
                  </span>
                </div>
                <h1 
                  className="text-2xl sm:text-3xl font-black mt-2 tracking-tight text-slate-900 dark:text-white print:text-slate-900"
                >
                  {settings.brandName || 'بازرگانی'}
                </h1>
              </div>

              {/* Brand Logo (Top Right) - Flat Modern Box */}
              <div className="flex flex-col items-center justify-center p-2 min-w-[140px]">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-black border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 print:bg-slate-50 print:border-slate-200"
                >
                  <Sparkles className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 print:text-slate-800 mt-1.5">{settings.brandName || 'بازرگانی'}</span>
              </div>
            </div>
          </div>

          {/* Seller & Customer Information Grid - Flat Modern */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2.5 text-xs">
            {/* Seller / Supplier Box */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 print:p-3 border border-slate-200 dark:border-slate-800 space-y-2.5 print:space-y-1 print:bg-slate-50 print:border-slate-200">
              <div 
                className="flex items-center justify-between pb-2 print:pb-1.5 border-b border-slate-200 dark:border-slate-800 print:border-slate-200"
              >
                <div className="flex items-center gap-2 font-black text-xs text-slate-900 dark:text-white print:text-slate-900">
                  <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400 print:text-slate-600" />
                  <span>{invoice.type === 'purchase' ? 'مشخصات تامین‌کننده (فروشنده کالا):' : 'مشخصات فروشنده:'}</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700 whitespace-nowrap shrink-0">
                  {invoice.type === 'purchase' ? 'طرف‌حساب' : 'صادرکننده'}
                </span>
              </div>
              <div className="space-y-1.5 print:space-y-0.5 text-slate-700 dark:text-slate-300 print:text-slate-700 leading-relaxed print:leading-normal">
                <div className="flex items-start">
                  <span className="text-slate-400 dark:text-slate-500 print:text-slate-400 min-w-[95px] shrink-0">نام شخص / واحد:</span>
                  <span className="font-black text-slate-900 dark:text-white print:text-slate-900">
                    {invoice.type === 'purchase' ? (invoice.customerName || 'تامین‌کننده ناشناس') : (settings.brandName || 'فروشگاه')}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-slate-400 dark:text-slate-500 print:text-slate-400 min-w-[95px] shrink-0">تلفن تماس:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 print:text-slate-800 font-mono">
                    {toPersianDigits(invoice.type === 'purchase' ? (invoice.customerPhone || '-') : (settings.phone || '-'))}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-slate-400 dark:text-slate-500 print:text-slate-400 min-w-[95px] shrink-0">شهر / آدرس:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 print:text-slate-800">
                    {invoice.type === 'purchase' ? (invoice.customerCity || invoice.customerAddress || '-') : (settings.address || '-')}
                  </span>
                </div>
                {settings.economicCode && (
                  <div className="flex items-center">
                    <span className="text-slate-400 dark:text-slate-500 print:text-slate-400 min-w-[95px] shrink-0">کد اقتصادی:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 print:text-slate-800 font-mono">{toPersianDigits(settings.economicCode)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer / Receiver Box */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 print:p-3 border border-slate-200 dark:border-slate-800 space-y-2.5 print:space-y-1 print:bg-slate-50 print:border-slate-200">
              <div 
                className="flex items-center justify-between pb-2 print:pb-1.5 border-b border-slate-200 dark:border-slate-800 print:border-slate-200"
              >
                <div className="flex items-center gap-2 font-black text-xs text-slate-900 dark:text-white print:text-slate-900">
                  <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400 print:text-slate-600" />
                  <span>{invoice.type === 'purchase' ? 'مشخصات خریدار (تحویل‌گیرنده):' : 'مشخصات خریدار (مشتری):'}</span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700 whitespace-nowrap shrink-0">
                  {invoice.type === 'purchase' ? 'انبار مرکزی' : 'طرف‌حساب'}
                </span>
              </div>
              <div className="space-y-1.5 print:space-y-0.5 text-slate-700 dark:text-slate-300 print:text-slate-700 leading-relaxed print:leading-normal">
                <div className="flex items-start">
                  <span className="text-slate-400 dark:text-slate-500 print:text-slate-400 min-w-[95px] shrink-0">نام شخص / واحد:</span>
                  <span className="font-black text-slate-900 dark:text-white print:text-slate-900">
                    {invoice.type === 'purchase' ? (settings.brandName || 'انبار و بازرگانی') : invoice.customerName}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-slate-400 dark:text-slate-500 print:text-slate-400 min-w-[95px] shrink-0">تلفن همراه:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 print:text-slate-800 font-mono">
                    {toPersianDigits(invoice.type === 'purchase' ? (settings.phone || '-') : (invoice.customerPhone || '-'))}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-slate-400 dark:text-slate-500 print:text-slate-400 min-w-[95px] shrink-0">شهر / آدرس:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 print:text-slate-800">
                    {invoice.type === 'purchase' ? settings.address : (invoice.customerCity || invoice.customerAddress || '-')}
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 dark:text-slate-500 print:text-slate-400">روش تسویه:</span>
                    <span 
                      className="px-2 py-0.5 rounded font-black text-[11px] bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 print:bg-slate-200 print:text-slate-800 whitespace-nowrap shrink-0"
                    >
                      {invoice.paymentMethod || 'نقدی'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 dark:text-slate-500 print:text-slate-400">مانده قبلی:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 print:text-slate-800 whitespace-nowrap shrink-0">{invoice.previousBalance || 'بی‌حساب'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table - Truly Flat, High-Contrast Modern Aesthetic */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border-slate-200">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 print:bg-slate-100 print:text-slate-900 font-black border-b border-slate-200 dark:border-slate-800 print:border-slate-200">
                  <th className="py-3 px-3 print:py-1.5 print:px-2 text-center w-12 whitespace-nowrap shrink-0">ردیف</th>
                  <th className="py-3 px-4 print:py-1.5 print:px-3">شرح کالا و مشخصات بسته‌بندی</th>
                  <th className="py-3 px-3 print:py-1.5 print:px-2 text-center min-w-[140px] whitespace-nowrap shrink-0">تعداد (واحد / کارتن)</th>
                  <th className="py-3 px-3 print:py-1.5 print:px-2 text-center w-32 whitespace-nowrap shrink-0">
                    {isPurchase ? (isPresentationModeActive ? 'قیمت واحد (تومان)' : 'قیمت خرید واحد (تومان)') : 'قیمت واحد (تومان)'}
                  </th>
                  <th className="py-3 px-3 print:py-1.5 print:px-2 text-center w-36 whitespace-nowrap shrink-0">
                    {isPurchase ? (isPresentationModeActive ? 'مبلغ کل (تومان)' : 'مبلغ کل خرید (تومان)') : 'مبلغ کل (تومان)'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-200">
                {invoice.items.map((item, index) => {
                  const prod = products.find(p => p.id === item.productId || p.name?.trim().toLowerCase() === item.productName?.trim().toLowerCase());
                  const correctPiecesPerCarton = prod?.piecesPerCarton || item.piecesPerCarton || 1;
                  const unitTitle = prod?.unitTitle || item.unitTitle || 'عدد';
                  const cartonLabel = formatCartonText(item.totalPieces, correctPiecesPerCarton);

                  const packagingSpec = prod ? formatProductPackagingSpec(prod) : formatProductPackagingSpec(item);
                  const isUnknown = !packagingSpec || packagingSpec === 'نامشخص';
                  const hasCustomNote = !!(
                    item.customDescription &&
                    item.customDescription.trim() !== '' &&
                    item.customDescription.trim() !== packagingSpec &&
                    item.customDescription.trim() !== 'نامشخص' &&
                    !item.customDescription.includes('کارتن')
                  );
                  
                  const itemReturns = matchedReturns.filter(r => r.productId === item.productId || r.productName?.trim().toLowerCase() === item.productName?.trim().toLowerCase());
                  const itemReturnedCartons = itemReturns.reduce((sum, r) => sum + (r.cartonsCount || 0), 0);
                  const itemReturnedExtraPieces = itemReturns.reduce((sum, r) => sum + (r.extraPieces || 0), 0);
                  const itemReturnedTotalAmount = itemReturns.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
                  const itemNetPrice = Math.max(0, item.totalPrice - itemReturnedTotalAmount);

                  // Calculate effective unit price with support for presentation mode
                  const displayUnitPrice = getItemEffectiveUnitPrice(item, index);
                  const displayLineTotal = (item.totalPieces * displayUnitPrice);

                  return (
                    <tr 
                      key={`inv-item-${item.id || index}-${index}`}
                      className={index % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-900/40 print:bg-slate-50/70' : 'bg-white dark:bg-slate-900 print:bg-white'}
                    >
                      {/* Row Index */}
                      <td className="py-3 px-3 print:py-1.5 print:px-2 text-center font-bold text-slate-400 dark:text-slate-500 print:text-slate-400 font-mono">
                        {toPersianDigits(index + 1)}
                      </td>

                      {/* Product Name & Packaging Details */}
                      <td className="py-3 px-4 print:py-1.5 print:px-3">
                        <div className={`font-black text-sm print:text-xs leading-snug ${
                          itemReturns.length > 0 && (item.totalPieces === 0 || itemNetPrice === 0)
                            ? 'line-through decoration-rose-500 decoration-2 text-slate-400 dark:text-slate-500 print:text-slate-400 font-bold opacity-80'
                            : 'text-slate-900 dark:text-white print:text-slate-900'
                        }`}>
                          {item.productName}
                          {itemReturns.length > 0 && (item.totalPieces === 0 || itemNetPrice === 0) && (
                            <span className="mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black text-[10px] no-underline whitespace-nowrap shrink-0">
                              مرجوع شده کاملاً
                            </span>
                          )}
                        </div>

                        {/* Packaging Information Line */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            !isUnknown
                              ? 'bg-slate-100 dark:bg-slate-800 print:bg-slate-100 text-slate-700 dark:text-slate-300 print:text-slate-800 border-slate-200/80 dark:border-slate-700/80 print:border-slate-200'
                              : 'bg-slate-50 dark:bg-slate-900 print:bg-slate-50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                          }`}>
                            <span>{packagingSpec || 'نامشخص'}</span>
                          </span>
                          {hasCustomNote && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                              {item.customDescription}
                            </span>
                          )}
                        </div>
                        {itemReturns.length > 0 && (
                          <div className="inline-flex items-start gap-1.5 px-2.5 py-1 mt-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 font-bold text-[11px] border border-rose-200 dark:border-rose-800 leading-snug">
                            <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span>
                                مرجوع شده: {toPersianDigits(itemReturnedCartons)} کارتن
                                {itemReturnedExtraPieces > 0 ? ` و ${toPersianDigits(itemReturnedExtraPieces)} دانه` : ''}
                                <span className="mr-1 text-rose-900 dark:text-rose-100 font-black dir-ltr inline-block">
                                  (-{formatPrice(itemReturnedTotalAmount)})
                                </span>
                              </span>
                              {itemReturns.some(r => r.reason) && (
                                <div className="text-[10px] text-rose-700 dark:text-rose-300 font-medium mt-0.5">
                                  علت مرجوعی: <span className="font-extrabold text-rose-950 dark:text-rose-100">{itemReturns.map(r => r.reason).filter(Boolean).join(' | ')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Quantity & Carton Pill */}
                      <td className="py-3 px-3 print:py-1.5 print:px-2 text-center whitespace-nowrap shrink-0">
                        <div className="flex flex-col items-center justify-center gap-1 my-0.5">
                          <span className="font-black text-slate-900 dark:text-white print:text-slate-900 text-sm print:text-xs leading-none whitespace-nowrap font-mono">
                            {toPersianDigits(item.totalPieces.toLocaleString())} {unitTitle}
                          </span>
                          <span 
                            className="inline-flex items-center justify-center px-2 py-0.5 rounded font-bold text-[10px] print:text-[9px] leading-tight bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 print:bg-slate-100 print:text-slate-700 border border-slate-200 dark:border-slate-700 print:border-slate-200 whitespace-nowrap shrink-0"
                          >
                            {cartonLabel}
                          </span>
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3 print:py-1.5 print:px-2 text-center font-bold text-slate-800 dark:text-slate-200 print:text-slate-800 text-sm print:text-xs whitespace-nowrap shrink-0 dir-ltr font-mono">
                        <span>{toPersianDigits(displayUnitPrice.toLocaleString())}</span>
                      </td>

                      {/* Total Line Price */}
                      <td className="py-3 px-3 print:py-1.5 print:px-2 text-center font-black text-slate-900 dark:text-white print:text-slate-900 text-sm print:text-xs whitespace-nowrap shrink-0 dir-ltr font-mono">
                        {toPersianDigits(displayLineTotal.toLocaleString())}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Summary & Banking Details Grid - Completely Flat Modern Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2.5 text-xs pt-1 print:pt-0">
            {/* Left Box: Totals & Balance Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 print:p-3 border border-slate-200 dark:border-slate-800 space-y-2.5 print:space-y-1.5 print:bg-slate-50 print:border-slate-200">
              {/* Row 1: Invoice Amount Details */}
              {hasAdjustments ? (
                <>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 print:border-slate-200">
                    <span className="text-slate-600 dark:text-slate-400 print:text-slate-600 font-medium">
                      جمع ناخالص اقلام ({toPersianDigits(invoice.items.length)} قلم{invoiceCartonBreakdownText ? ` - ${invoiceCartonBreakdownText}` : ''}):
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 print:text-slate-800 font-mono">
                      {formatPrice(grossAmount)}
                    </span>
                  </div>

                  {invoice.discount > 0 && (
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 print:border-slate-200 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                      <span>تخفیف ویژه:</span>
                      <span className="dir-ltr font-mono">-{formatPrice(invoice.discount)}</span>
                    </div>
                  )}

                  {invoice.tax > 0 && (
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 print:border-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                      <span>مالیات / ارزش افزوده:</span>
                      <span className="dir-ltr font-mono">+{formatPrice(invoice.tax)}</span>
                    </div>
                  )}

                  {totalInvoiceReturnsAmount > 0 && (
                    <div className="flex items-center justify-between pb-1.5 border-b border-rose-200 dark:border-rose-900/60 print:border-rose-200 text-rose-700 dark:text-rose-400 print:text-rose-700 font-bold text-[11px]">
                      <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3 shrink-0" /> کسر بابت مرجوعی کالا:</span>
                      <span className="dir-ltr font-mono">-{formatPrice(totalInvoiceReturnsAmount)}</span>
                    </div>
                  )}

                  {invoice.offsetReturnsTotal && invoice.offsetReturnsTotal > 0 && (
                    <div className="flex items-center justify-between pb-1.5 border-b border-purple-200 dark:border-purple-900/60 print:border-purple-200 text-purple-700 dark:text-purple-400 print:text-purple-700 font-bold text-[11px]">
                      <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3 shrink-0" /> کسر بابت تهاتر مرجوعی (دریافت جنس):</span>
                      <span className="dir-ltr font-mono">-{formatPrice(invoice.offsetReturnsTotal)}</span>
                    </div>
                  )}

                  {/* Net Payable Flat Highlight Card */}
                  <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-between">
                    <span className="text-white font-black text-xs">
                      مبلغ خالص قابل پرداخت:
                    </span>
                    <span className="text-base font-black text-white font-mono">
                      {formatPrice(netPayableAmount)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-between">
                  <span className="text-white font-black text-xs">
                    {isPurchase ? (isPresentationModeActive ? 'مبلغ کل فاکتور' : 'مجموع بهای خرید فاکتور') : 'مبلغ کل فاکتور'} ({toPersianDigits(invoice.items.length)} قلم{invoiceCartonBreakdownText ? ` - ${invoiceCartonBreakdownText}` : ''}):
                  </span>
                  <span className="text-base font-black text-white font-mono">
                    {formatPrice(netPayableAmount)}
                  </span>
                </div>
              )}

              {/* Row 2: Payment Settlement Status */}
              {isCashPayment ? (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 print:border-slate-200 text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">وضعیت تسویه:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 font-black text-[11px] border border-emerald-200 dark:border-emerald-800 whitespace-nowrap shrink-0">
                    ✓ تسویه نقدی کامل ({formatPrice(netPayableAmount)})
                  </span>
                </div>
              ) : isPartialPayment ? (
                <div className="space-y-1.5 pb-2 border-b border-slate-200 dark:border-slate-800 print:border-slate-200 text-xs">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                    <span>مبلغ پرداخت‌شده (نقدی / بیعانه):</span>
                    <span className="font-black font-mono">{formatPrice(paidAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold">
                    <span>مانده بدهی این فاکتور (نسیه):</span>
                    <span className="font-black font-mono">{formatPrice(remainingDebtAmount)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 print:border-slate-200 text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">وضعیت تسویه:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-[11px] border border-slate-300 dark:border-slate-700 whitespace-nowrap shrink-0">
                    نسیه کامل / حساب دفتری
                  </span>
                </div>
              )}

              {/* Row 3: Customer Previous & Final Balance */}
              {prevValNumber !== 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>مانده حساب گذشته مشتری:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                    {invoice.previousBalance || '۰ تومان'}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 print:text-slate-700 pt-0.5">
                <span className="font-bold">{invoice.type === 'purchase' ? 'مانده نهایی تأمین‌کننده:' : 'مانده نهایی کل حساب:'}</span>
                <span 
                  className="font-black px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 text-xs whitespace-nowrap shrink-0 font-mono"
                >
                  {finalBalanceDisplay}
                </span>
              </div>

              {/* Potential Profit & Yield Intelligence for Purchase Invoices (Screen Only, hidden on print) */}
              {isPurchase && !isSecretMode && !isPresentationModeActive && (() => {
                const totalExpectedSales = invoice.items.reduce((sum, item) => {
                  const prod = products.find(p => p.id === item.productId || p.name === item.productName);
                  const sPrice = (item.unitSellingPrice !== undefined && item.unitSellingPrice > 0)
                    ? item.unitSellingPrice
                    : ((prod?.sellingPrice && prod.sellingPrice > 0) ? prod.sellingPrice : 0);
                  return sum + (item.totalPieces * sPrice);
                }, 0);

                if (totalExpectedSales <= 0) return null;

                const potentialNetProfit = totalExpectedSales - netPayableAmount;
                const profitMarginPercent = netPayableAmount > 0 ? (potentialNetProfit / netPayableAmount) * 100 : 0;
                const isLoss = potentialNetProfit < 0;

                return (
                  <div className={`mt-2 p-2.5 rounded-xl border print:hidden ${!isLoss ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200'} space-y-1 text-xs`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>تحلیل سودآوری ورود این بار به انبار:</span>
                      </span>
                      <span className="font-black font-mono">{formatPrice(potentialNetProfit)} سود خالص</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-blue-100 dark:border-blue-900/60">
                      <span>فروش پیش‌بینی شده: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatPrice(totalExpectedSales)}</strong></span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">حاشیه سود: {toPersianDigits(profitMarginPercent.toFixed(1))}٪</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Box: Bank Details, Terms & Signatures */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 print:p-3 border border-slate-200 dark:border-slate-800 space-y-3 print:space-y-1.5 print:bg-slate-50 print:border-slate-200 flex flex-col justify-between">
              <div>
                {/* Bank Card Box */}
                {(settings.cardNumber || settings.sheba) && (
                  <div className="p-3 print:p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 print:space-y-0.5 print:bg-slate-100 print:border-slate-200 mb-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-[11px] pb-1 border-b border-slate-200/80 dark:border-slate-700">
                      <CreditCard className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>اطلاعات حساب جهت واریز وجه:</span>
                    </div>
                    {settings.cardNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">شماره کارت ({settings.cardHolder || settings.brandName}):</span>
                        <span className="font-black text-slate-900 dark:text-white font-mono tracking-wider">{toPersianDigits(settings.cardNumber)}</span>
                      </div>
                    )}
                    {settings.sheba && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">شماره شبا (IR):</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{toPersianDigits(settings.sheba)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Terms / Notes */}
                {(invoice.notes || settings.invoiceTerms) && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">شرایط و توضیحات فاکتور:</span>
                    <p>{invoice.notes || settings.invoiceTerms}</p>
                  </div>
                )}
              </div>

              {/* Signatures Row */}
              <div className="grid grid-cols-2 gap-4 pt-4 print:pt-2 border-t border-slate-200 dark:border-slate-800 print:border-slate-200 text-center text-xs">
                <div className="space-y-6 print:space-y-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">مهر و امضای فروشنده:</span>
                  <div className="h-8 border-b border-dashed border-slate-300 dark:border-slate-700 print:border-slate-300" />
                </div>
                <div className="space-y-6 print:space-y-4">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">امضای خریدار / تحویل‌گیرنده:</span>
                  <div className="h-8 border-b border-dashed border-slate-300 dark:border-slate-700 print:border-slate-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
