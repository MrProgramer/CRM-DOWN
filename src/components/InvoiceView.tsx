import React, { useState, useMemo } from 'react';
import { Invoice, StoreSettings, Product, ProductReturn } from '../types';
import { 
  formatPrice, 
  formatCartonText, 
  toPersianDigits, 
  getCurrentPersianDate, 
  getCurrentPersianTime, 
  getNetReturnAmount, 
  formatProductPackagingSpec 
} from '../utils/formatters';
import { calculateInwardInvoiceSellThrough } from '../utils/inwardSellThrough';
import { themes, getThemeBadges } from './ThemeConfig';
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
  CheckCircle2,
  Package,
  Sun,
  Moon,
  Info,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceViewProps {
  invoice: Invoice;
  settings: StoreSettings;
  isSecretMode: boolean;
  isDarkMode?: boolean;
  onToggleSecretMode: () => void;
  onEdit?: (invoice: Invoice) => void;
  onBack?: () => void;
  onOpenProfitAnalysis?: (invoice: Invoice) => void;
  products?: Product[];
  productReturns?: ProductReturn[];
  onExportPDF?: (invoice: Invoice) => void;
  onExportImage?: (invoice: Invoice) => void;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
  invoices?: Invoice[];
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({
  invoice,
  settings,
  isSecretMode,
  isDarkMode = false,
  onToggleSecretMode,
  onEdit,
  onBack,
  onOpenProfitAnalysis,
  products = [],
  productReturns = [],
  onExportPDF,
  onExportImage,
  onShowAlert,
  invoices = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isCopyingScreenshot, setIsCopyingScreenshot] = useState(false);

  // Screen canvas appearance mode: 'auto' (respects app dark/light mode), 'dark' (forced dark), 'paper' (forced day/print preview)
  const [viewPaperMode, setViewPaperMode] = useState<'auto' | 'dark' | 'paper'>('auto');

  // Presentation / Adjusted Display Price Mode (فاکتور نمایشی / قیمت ارائه به مشتری / همکار)
  const [isPresentationModeActive, setIsPresentationModeActive] = useState<boolean>(false);
  const [presentationModeType, setPresentationModeType] = useState<'percent' | 'fixed' | 'selling_price' | 'custom'>('percent');
  const [markupPercent, setMarkupPercent] = useState<number>(10);
  const [fixedMarkupPerUnit, setFixedMarkupPerUnit] = useState<number>(1000);
  const [customItemUnitPrices, setCustomItemUnitPrices] = useState<{ [itemKey: string]: number }>({});
  const [isPresentationPanelOpen, setIsPresentationPanelOpen] = useState<boolean>(false);

  const theme = themes[settings.themeColor] || themes.teal;
  const badges = getThemeBadges(settings.themeColor);
  const isPurchase = invoice.type === 'purchase';

  // Determine if the canvas should currently render in dark style on screen
  const isDarkCanvas = useMemo(() => {
    if (viewPaperMode === 'dark') return true;
    if (viewPaperMode === 'paper') return false;
    // 'auto': follow app dark mode
    if (typeof isDarkMode === 'boolean') return isDarkMode;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  }, [viewPaperMode, isDarkMode]);

  // Inward invoice sell-through analysis
  const inwardSellThroughSummary = useMemo(() => {
    if (invoice.type !== 'purchase') return null;
    return calculateInwardInvoiceSellThrough(invoice, invoices, products);
  }, [invoice, invoices, products]);

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

  // Find all matched returns for this invoice
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

  // Current items sum
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

  // Original items sum if preserved in originalTotalPrice / originalTotalPieces
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

  // Gross subtotal before any return deduction
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
            '✅ عکس فاکتور در حافظه کپی شد! در تلگرام یا ایتا کلید Paste (Ctrl+V) را بزنید.',
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
      onShowAlert('متن کامل کپشن و خلاصه فاکتور در کلیپ‌بورد کپی شد.', 'success', 'کپی متن خلاصه فاکتور');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCardNumber = () => {
    if (!settings.cardNumber) return;
    navigator.clipboard.writeText(settings.cardNumber.replace(/\s+/g, ''));
    setCopiedCard(true);
    if (onShowAlert) {
      onShowAlert('شماره کارت در کلیپ‌بورد کپی شد.', 'success', 'کپی شماره کارت');
    }
    setTimeout(() => setCopiedCard(false), 2000);
  };

  // Parse balance values
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
    <div className="w-full max-w-5xl mx-auto pb-16 transition-colors">
      {/* Control Bar (Hidden when printing) - Flat, Clean, Modern */}
      <div className="no-print mb-5 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-slate-900 dark:text-slate-100 shadow-none transition-colors">
        <div className="flex items-center gap-2.5 flex-wrap">
          {onBack && (
            <button
              id="invoice-back-btn"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 stroke-[2]" />
              <span>بازگشت</span>
            </button>
          )}

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Clean metadata badge */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-900 dark:text-white">
              فاکتور #{toPersianDigits(invoice.invoiceNumber)}
            </span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              isPurchase 
                ? 'bg-amber-100/70 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}>
              {isPurchase ? 'ورود به انبار (خرید)' : 'فروش مشتری'}
            </span>
            <span className="text-slate-400 dark:text-slate-600 hidden md:inline">·</span>
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] hidden md:inline">
              {toPersianDigits(invoice.date)}
            </span>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Day / Night View Canvas Toggle (Preview Mode) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewPaperMode('auto')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                viewPaperMode === 'auto'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="پیروی خودکار از حالت شب/روز کل برنامه"
            >
              <span>خودکار</span>
            </button>
            <button
              type="button"
              onClick={() => setViewPaperMode('dark')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                viewPaperMode === 'dark'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="نمایش فاکتور در تم تیره (حالت شب فلت)"
            >
              <Moon className="w-3.5 h-3.5" />
              <span>تیره</span>
            </button>
            <button
              type="button"
              onClick={() => setViewPaperMode('paper')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                viewPaperMode === 'paper'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="پیش‌نمایش کاغذ سفید چاپی A4 روی صفحه"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>کاغذ چاپی</span>
            </button>
          </div>

          {/* Presentation Mode Toggle Button */}
          {isPurchase && (
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
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                isPresentationModeActive
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
              title="قیمت نمایشی یا درصد افزایش روی قیمت خرید جهت ارائه به مشتری"
            >
              <Sparkles className="w-3.5 h-3.5" />
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
                  : 'قیمت نمایشی'}
              </span>
              {isPresentationPanelOpen ? (
                <ChevronUp className="w-3.5 h-3.5 mr-0.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 mr-0.5" />
              )}
            </button>
          )}

          {/* Edit Invoice */}
          {onEdit && (
            <button
              id="invoice-edit-btn"
              onClick={() => onEdit(invoice)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>ویرایش</span>
            </button>
          )}

          {/* Copy Screenshot */}
          <button
            id="invoice-copy-screenshot-btn"
            onClick={handleCopyScreenshot}
            disabled={isCopyingScreenshot}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="کپی مستقیم تصویر فاکتور در کلیپ‌بورد برای تلگرام یا ایتا"
          >
            <Camera className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>{isCopyingScreenshot ? 'کپی عکس...' : 'کپی عکس'}</span>
          </button>

          {/* Copy Summary Text */}
          <button
            id="invoice-copy-summary-btn"
            onClick={handleCopySummary}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'کپی شد' : 'کپی متن'}</span>
          </button>

          {/* Print / Export Button */}
          <button
            id="invoice-print-btn"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-800 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>چاپ و صدور</span>
          </button>
        </div>
      </div>

      {/* Presentation Mode Settings Panel (Flat, Clean) */}
      <AnimatePresence>
        {isPresentationPanelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            className="no-print mb-5 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-800/80 p-4 space-y-3 overflow-hidden text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="font-black text-slate-900 dark:text-white">
                  تنظیم قیمت نمایشی فاکتور (ارائه به همکار / اسکرین‌شات)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-bold">
                  بدون تغییر انبار
                </span>
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPresentationModeActive}
                    onChange={(e) => setIsPresentationModeActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  <span className="mr-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isPresentationModeActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </label>

                <button
                  onClick={() => setIsPresentationPanelOpen(false)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPresentationModeType('percent');
                  if (!isPresentationModeActive) setIsPresentationModeActive(true);
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  presentationModeType === 'percent' && isPresentationModeActive
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>درصدی (+{toPersianDigits(markupPercent)}٪)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPresentationModeType('fixed');
                  if (!isPresentationModeActive) setIsPresentationModeActive(true);
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  presentationModeType === 'fixed' && isPresentationModeActive
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>مبلغ ثابت (+{formatPrice(fixedMarkupPerUnit)})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPresentationModeType('selling_price');
                  if (!isPresentationModeActive) setIsPresentationModeActive(true);
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  presentationModeType === 'selling_price' && isPresentationModeActive
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>قیمت فروش انبار</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPresentationModeType('custom');
                  if (!isPresentationModeActive) setIsPresentationModeActive(true);
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                  presentationModeType === 'custom' && isPresentationModeActive
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>قیمت‌گذاری دلخواه</span>
              </button>
            </div>

            {/* Sub-controls */}
            {isPresentationModeActive && (
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700 space-y-2.5">
                {presentationModeType === 'percent' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">انتخاب درصد:</span>
                    {percentPresets.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setMarkupPercent(pct)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                          markupPercent === pct
                            ? 'bg-amber-500 text-white'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        +{toPersianDigits(pct)}٪
                      </button>
                    ))}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 mr-auto">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">درصد دلخواه:</span>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        step="0.5"
                        value={markupPercent || ''}
                        onChange={(e) => setMarkupPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-12 text-center font-bold text-xs bg-transparent text-slate-900 dark:text-white outline-none"
                      />
                      <span className="text-[10px] text-slate-500">٪</span>
                    </div>
                  </div>
                )}

                {presentationModeType === 'fixed' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">مبلغ افزایشی روی هر دانه:</span>
                    {fixedPresets.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setFixedMarkupPerUnit(amt)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                          fixedMarkupPerUnit === amt
                            ? 'bg-amber-500 text-white'
                            : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        +{formatPrice(amt)}
                      </button>
                    ))}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 mr-auto">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">مبلغ دلخواه:</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={fixedMarkupPerUnit || ''}
                        onChange={(e) => setFixedMarkupPerUnit(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 text-center font-bold text-xs bg-transparent text-slate-900 dark:text-white outline-none"
                      />
                      <span className="text-[10px] text-slate-500">تومان</span>
                    </div>
                  </div>
                )}

                {presentationModeType === 'custom' && (
                  <div className="space-y-1.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium block">
                      تنظیم قیمت واحد هر قلم:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                      {invoice.items.map((item, idx) => {
                        const itemKey = item.id || `item-${idx}`;
                        const currentVal = customItemUnitPrices[itemKey] !== undefined 
                          ? customItemUnitPrices[itemKey] 
                          : getItemEffectiveUnitPrice(item, idx);

                        return (
                          <div key={itemKey} className="bg-white dark:bg-slate-700/60 p-2 rounded border border-slate-200 dark:border-slate-600 flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold truncate max-w-[120px]" title={item.productName}>
                              {item.productName}
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={currentVal || ''}
                                onChange={(e) => handleApplyCustomItemPrice(itemKey, parseFloat(e.target.value) || 0)}
                                className="w-18 text-center font-bold text-xs p-1 bg-slate-50 dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                              />
                              <span className="text-[10px] text-slate-500">تومان</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer comparison */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                    <span>خرید واقعی: <strong>{formatPrice(realOriginalSubtotal)}</strong></span>
                    <span>مبلغ نمایشی: <strong className="text-amber-600 dark:text-amber-400">{formatPrice(netPayableAmount)}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToRealPrices}
                    className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>بازنشانی به قیمت‌های واقعی</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comprehensive Sell-Through & Inventory Audit Banner for Inward Purchase Invoices (درصدی، تومانی، کارتنی، عددی) */}
      {isPurchase && !isSecretMode && inwardSellThroughSummary && (
        <div className="no-print mb-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 text-xs transition-colors shadow-2xs space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    وضعیت جامع فروش و موجودی این فاکتور ورود کالا:
                  </span>
                  {inwardSellThroughSummary.isFullySold ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                      ۱۰۰٪ فروش رفته (تکمیل)
                    </span>
                  ) : inwardSellThroughSummary.percentSold > 0 ? (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">
                      {toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش رفته · {toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ در انبار
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      موجودی کامل در انبار (۰٪ فروش)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  ردیابی خروج کالا و سود قطعی حاصل از این بار ورودی بر مبنای حسابداری انبارداری FIFO
                </p>
              </div>
            </div>

            {/* Profit Pill */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-right">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">سود قطعی محقق‌شده:</div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {inwardSellThroughSummary.totalRealizedProfit > 0 ? `+${formatPrice(inwardSellThroughSummary.totalRealizedProfit)}` : '۰ تومان'}
                </div>
              </div>
              {inwardSellThroughSummary.totalPotentialProfit > inwardSellThroughSummary.totalRealizedProfit && (
                <div className="border-r border-slate-200 dark:border-slate-700 pr-3 text-right">
                  <div className="text-[10px] text-slate-400 font-medium">کل سود پیش‌بینی:</div>
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">
                    {formatPrice(inwardSellThroughSummary.totalPotentialProfit)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4 Pillars of Sell-Through: درصدی، کارتنی، عددی، تومانی */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-right">
            {/* 1. درصدی */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                ۱. درصد فروش و باقیمانده:
              </span>
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-sky-600 dark:text-sky-400">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش</span>
                <span className="text-amber-600 dark:text-amber-400">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ مانده</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden flex">
                <div 
                  className="bg-sky-500 h-full transition-all duration-300"
                  style={{ width: `${inwardSellThroughSummary.percentSold}%` }}
                />
                <div 
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${inwardSellThroughSummary.percentRemaining}%` }}
                />
              </div>
            </div>

            {/* 2. عددی */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                ۲. تعداد عددی:
              </span>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                فروش: <span className="text-sky-600 dark:text-sky-400 font-black">{toPersianDigits(inwardSellThroughSummary.totalSoldPieces.toLocaleString())}</span> عدد
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                مانده: {toPersianDigits(inwardSellThroughSummary.remainingPieces.toLocaleString())} از {toPersianDigits(inwardSellThroughSummary.totalPurchasedPieces.toLocaleString())} عدد
              </div>
            </div>

            {/* 3. کارتنی */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                ۳. تفکیک کارتنی:
              </span>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                فروش: <span className="text-sky-600 dark:text-sky-400 font-black">{toPersianDigits(inwardSellThroughSummary.totalSoldCartons)} کارتن</span>
                {inwardSellThroughSummary.totalSoldExtraPieces > 0 && (
                  <span className="text-[10px] text-slate-500"> ({toPersianDigits(inwardSellThroughSummary.totalSoldExtraPieces)} دانه)</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                مانده: {toPersianDigits(inwardSellThroughSummary.totalRemainingCartons)} کارتن
                {inwardSellThroughSummary.totalRemainingExtraPieces > 0 && ` (${toPersianDigits(inwardSellThroughSummary.totalRemainingExtraPieces)} دانه)`}
              </div>
            </div>

            {/* 4. تومانی */}
            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                ۴. ارزش تومانی:
              </span>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                فروش: <span className="text-sky-600 dark:text-sky-400">{formatPrice(inwardSellThroughSummary.totalSoldCost)}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                مانده انبار: {formatPrice(inwardSellThroughSummary.totalRemainingCost)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* THE FLAT, MODERN INVOICE CANVAS (Supports Dark Mode & Standard Paper Mode) */}
      {/* ========================================================================= */}
      <div 
        id="invoice-paper"
        className={`invoice-paper-container invoice-scalable-view relative rounded-xl border p-6 sm:p-10 overflow-hidden transition-colors ${
          isDarkCanvas 
            ? 'bg-[#0b0f19] text-slate-100 border-slate-800/90 shadow-none' 
            : 'bg-white text-slate-900 border-slate-200 shadow-none'
        } print:p-0 print:border-none print:shadow-none print:bg-white print:text-black`}
        style={{ minHeight: '297mm', fontFamily: "var(--app-font-family)" }}
      >
        {/* Subtle Watermark */}
        {settings.enableWatermark && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none -rotate-[30deg]"
            style={{ 
              zIndex: 0,
              opacity: isDarkCanvas ? 0.03 : (settings.watermarkOpacity !== undefined ? settings.watermarkOpacity : 0.05)
            }}
          >
            <span 
              className={`font-black tracking-widest text-center whitespace-normal max-w-2xl block leading-snug ${
                isDarkCanvas ? 'text-slate-100' : 'text-slate-900'
              } print:text-slate-900`}
              style={{ fontSize: `${settings.watermarkFontSize || 54}px` }}
            >
              {settings.watermarkText || settings.brandName}
            </span>
          </div>
        )}

        {/* Draft Watermark */}
        {invoice.isDraft && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.06] -rotate-45"
            style={{ zIndex: 1 }}
          >
            <span className="text-[100px] font-black text-amber-500 tracking-widest whitespace-nowrap">
              پیش‌نویس
            </span>
          </div>
        )}

        <div className="relative z-10 space-y-6 print:space-y-4">
          {/* Header Section: Modern, Flat, Balanced */}
          <div className={`pb-5 print:pb-3 border-b ${
            isDarkCanvas ? 'border-slate-800' : 'border-slate-200'
          } print:border-slate-300`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              
              {/* Right Side: Brand & Business Info */}
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2">
                  <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    isDarkCanvas ? 'text-white' : 'text-slate-900'
                  } print:text-slate-900`}>
                    {settings.brandName || 'بازرگانی'}
                  </h1>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600 font-medium">
                  {settings.subtitle || (isPurchase ? 'مرکز ورود و تأمین کالا' : 'فروش عمده و توزیع کالا و خدمات')}
                </p>
                {settings.bismillah && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 print:text-slate-400 tracking-wider">
                    {settings.bismillah}
                  </p>
                )}
              </div>

              {/* Center: Document Title */}
              <div className="text-center sm:text-center self-center sm:self-auto py-1">
                <span className={`inline-block px-4 py-1.5 rounded-lg text-sm font-black tracking-wide border ${
                  isDarkCanvas
                    ? 'bg-slate-800/80 text-white border-slate-700'
                    : 'bg-slate-100 text-slate-900 border-slate-200'
                } print:bg-white print:text-black print:border-slate-300`}>
                  {invoice.type === 'purchase'
                    ? (isPresentationModeActive ? 'فاکتور تامین و تحویل کالا' : 'فاکتور ورود کالا به انبار')
                    : 'فاکتور فروش کالا و خدمات'}
                </span>
                {invoice.isDraft && (
                  <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                    (نسخه پیش‌نویس)
                  </span>
                )}
              </div>

              {/* Left Side: Metadata Card (Invoice #, Date, Time) */}
              <div className={`p-3 rounded-lg border text-xs min-w-[170px] space-y-1 ${
                isDarkCanvas
                  ? 'bg-slate-800/40 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              } print:bg-white print:border-slate-300 print:text-slate-800`}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">شماره سند:</span>
                  <span className={`font-mono font-bold ${
                    isDarkCanvas ? 'text-white' : 'text-slate-900'
                  } print:text-black`}>
                    {toPersianDigits(invoice.invoiceNumber)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">تــاریخ:</span>
                  <span className="font-mono font-medium">{toPersianDigits(invoice.date)}</span>
                </div>
                {invoice.time && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">ساعت ثبت:</span>
                    <span className="font-mono font-medium">{toPersianDigits(invoice.time)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">روش تسویه:</span>
                  <span className="font-bold">{invoice.paymentMethod || 'نقدی'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Parties Section: Clean Flat 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 print:gap-2.5 text-xs">
            {/* Supplier / Seller Column */}
            <div className={`p-3.5 rounded-lg border space-y-1.5 ${
              isDarkCanvas
                ? 'bg-slate-800/30 border-slate-800/90 text-slate-300'
                : 'bg-slate-50/60 border-slate-200 text-slate-700'
            } print:bg-white print:border-slate-300 print:text-slate-800`}>
              <div className={`flex items-center justify-between pb-1.5 border-b font-bold text-xs ${
                isDarkCanvas ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
              } print:border-slate-200 print:text-black`}>
                <span>{invoice.type === 'purchase' ? 'مشخصات تامین‌کننده (فروشنده):' : 'مشخصات فروشنده:'}</span>
                <span className="text-[10px] text-slate-500">
                  {invoice.type === 'purchase' ? 'طرف‌حساب' : 'صادرکننده'}
                </span>
              </div>
              <div className="space-y-1 leading-relaxed">
                <div className="flex items-start">
                  <span className="text-slate-500 min-w-[85px] shrink-0">نام شخص / واحد:</span>
                  <strong className={isDarkCanvas ? 'text-white' : 'text-slate-900'}>
                    {invoice.type === 'purchase' ? (invoice.customerName || 'تامین‌کننده') : (settings.brandName || 'فروشگاه')}
                  </strong>
                </div>
                <div className="flex items-center">
                  <span className="text-slate-500 min-w-[85px] shrink-0">تلفن تماس:</span>
                  <span className="font-mono">
                    {toPersianDigits(invoice.type === 'purchase' ? (invoice.customerPhone || '-') : (settings.phone || '-'))}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-slate-500 min-w-[85px] shrink-0">نشانی / شهر:</span>
                  <span>
                    {invoice.type === 'purchase' ? (invoice.customerCity || invoice.customerAddress || '-') : (settings.address || '-')}
                  </span>
                </div>
                {settings.economicCode && invoice.type !== 'purchase' && (
                  <div className="flex items-center">
                    <span className="text-slate-500 min-w-[85px] shrink-0">کد اقتصادی:</span>
                    <span className="font-mono">{toPersianDigits(settings.economicCode)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer / Customer Column */}
            <div className={`p-3.5 rounded-lg border space-y-1.5 ${
              isDarkCanvas
                ? 'bg-slate-800/30 border-slate-800/90 text-slate-300'
                : 'bg-slate-50/60 border-slate-200 text-slate-700'
            } print:bg-white print:border-slate-300 print:text-slate-800`}>
              <div className={`flex items-center justify-between pb-1.5 border-b font-bold text-xs ${
                isDarkCanvas ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
              } print:border-slate-200 print:text-black`}>
                <span>{invoice.type === 'purchase' ? 'مشخصات خریدار (تحویل‌گیرنده):' : 'مشخصات خریدار (مشتری):'}</span>
                <span className="text-[10px] text-slate-500">
                  {invoice.type === 'purchase' ? 'انبار مرکزی' : 'طرف‌حساب'}
                </span>
              </div>
              <div className="space-y-1 leading-relaxed">
                <div className="flex items-start">
                  <span className="text-slate-500 min-w-[85px] shrink-0">نام شخص / واحد:</span>
                  <strong className={isDarkCanvas ? 'text-white' : 'text-slate-900'}>
                    {invoice.type === 'purchase' ? (settings.brandName || 'انبار مرکزی') : (invoice.customerName || 'مشتری')}
                  </strong>
                </div>
                <div className="flex items-center">
                  <span className="text-slate-500 min-w-[85px] shrink-0">تلفن همراه:</span>
                  <span className="font-mono">
                    {toPersianDigits(invoice.type === 'purchase' ? (settings.phone || '-') : (invoice.customerPhone || '-'))}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-slate-500 min-w-[85px] shrink-0">نشانی / شهر:</span>
                  <span>
                    {invoice.type === 'purchase' ? settings.address : (invoice.customerCity || invoice.customerAddress || '-')}
                  </span>
                </div>
                <div className="flex items-center gap-4 pt-0.5 text-[11px]">
                  <div>
                    <span className="text-slate-500">وضعیت مانده: </span>
                    <span className="font-bold">{invoice.previousBalance || 'بی‌حساب'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table: Flat, Clean, Crisp Typography */}
          <div className={`rounded-lg border overflow-hidden ${
            isDarkCanvas ? 'border-slate-800' : 'border-slate-200'
          } print:border-slate-300`}>
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className={`border-b text-xs font-bold ${
                  isDarkCanvas
                    ? 'bg-slate-800/80 text-slate-200 border-slate-700'
                    : 'bg-slate-100/90 text-slate-800 border-slate-200'
                } print:bg-slate-100 print:text-black print:border-slate-300`}>
                  <th className="py-2.5 px-3 text-center w-12 shrink-0">ردیف</th>
                  <th className="py-2.5 px-4">شرح کالا و مشخصات</th>
                  <th className="py-2.5 px-3 text-center min-w-[130px] shrink-0">تعداد (واحد / کارتن)</th>
                  <th className="py-2.5 px-3 text-center w-32 shrink-0">
                    {isPurchase ? (isPresentationModeActive ? 'قیمت واحد (تومان)' : 'قیمت خرید (تومان)') : 'قیمت واحد (تومان)'}
                  </th>
                  <th className="py-2.5 px-3 text-center w-36 shrink-0">
                    {isPurchase ? (isPresentationModeActive ? 'مبلغ کل (تومان)' : 'مبلغ کل خرید (تومان)') : 'مبلغ کل (تومان)'}
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isDarkCanvas ? 'divide-slate-800' : 'divide-slate-200'
              } print:divide-slate-200`}>
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

                  const displayUnitPrice = getItemEffectiveUnitPrice(item, index);
                  const displayLineTotal = (item.totalPieces * displayUnitPrice);

                  return (
                    <tr 
                      key={`inv-item-${item.id || index}-${index}`}
                      className={`transition-colors ${
                        isDarkCanvas 
                          ? 'hover:bg-slate-800/30' 
                          : 'hover:bg-slate-50/60'
                      } print:hover:bg-transparent`}
                    >
                      {/* Row Index */}
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {toPersianDigits(index + 1)}
                      </td>

                      {/* Product Name & Packaging Specs */}
                      <td className="py-2.5 px-4">
                        <div className={`font-bold text-sm leading-snug ${
                          itemReturns.length > 0 && (item.totalPieces === 0 || itemNetPrice === 0)
                            ? 'line-through text-slate-400'
                            : (isDarkCanvas ? 'text-white' : 'text-slate-900')
                        } print:text-black`}>
                          {item.productName}
                        </div>

                        {/* Quiet unboxed packaging spec */}
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                          {!isUnknown && <span>{packagingSpec}</span>}
                          {hasCustomNote && (
                            <>
                              <span>·</span>
                              <span>{item.customDescription}</span>
                            </>
                          )}
                        </div>

                        {/* Return note if applicable */}
                        {itemReturns.length > 0 && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-1">
                            مرجوع شده: {toPersianDigits(itemReturnedCartons)} کارتن
                            {itemReturnedExtraPieces > 0 ? ` و ${toPersianDigits(itemReturnedExtraPieces)} دانه` : ''}
                            <span className="mr-1 dir-ltr inline-block">(-{formatPrice(itemReturnedTotalAmount)})</span>
                          </div>
                        )}

                        {/* Inward Sell-Through & Stock Remaining (زیر هر کالا: چقدر مانده، چقدر فروخته شده، کارتنی، عددی، درصدی و تومانی) */}
                        {isPurchase && !isSecretMode && !isPresentationModeActive && (() => {
                          const rowSellThrough = inwardSellThroughSummary?.itemsSellThrough.find(s => 
                            (item.productId && s.productId === item.productId) ||
                            (s.itemId && s.itemId === item.id) ||
                            (s.productName && item.productName && s.productName.trim().toLowerCase() === item.productName.trim().toLowerCase())
                          );
                          if (!rowSellThrough) return null;

                          return (
                            <div className="mt-2 p-2 rounded-lg border text-[11px] space-y-1 bg-slate-50/90 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 print:bg-slate-50 print:border-slate-300">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                {/* Sold Part */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-500 dark:text-slate-400">فروخته شده:</span>
                                  {rowSellThrough.percentSold > 0 ? (
                                    <span className="font-bold text-sky-700 dark:text-sky-300 font-mono">
                                      {toPersianDigits(rowSellThrough.soldPieces)} عدد
                                      {rowSellThrough.piecesPerCarton > 1 && (
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 mr-1">
                                          ({toPersianDigits(rowSellThrough.soldCartons)} کارتن{rowSellThrough.soldExtraPieces > 0 ? ` و ${toPersianDigits(rowSellThrough.soldExtraPieces)} دانه` : ''})
                                        </span>
                                      )}
                                      <span className="mr-1 text-emerald-600 dark:text-emerald-400 font-black">({toPersianDigits(rowSellThrough.percentSold)}٪)</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-medium">۰ عدد (۰٪)</span>
                                  )}
                                </div>

                                {/* Remaining Part */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-500 dark:text-slate-400">مانده در انبار:</span>
                                  <span className={`font-bold font-mono ${rowSellThrough.remainingPieces > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-400'}`}>
                                    {toPersianDigits(rowSellThrough.remainingPieces)} عدد
                                    {rowSellThrough.piecesPerCarton > 1 && (
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mr-1">
                                        ({toPersianDigits(rowSellThrough.remainingCartons)} کارتن{rowSellThrough.remainingExtraPieces > 0 ? ` و ${toPersianDigits(rowSellThrough.remainingExtraPieces)} دانه` : ''})
                                      </span>
                                    )}
                                    <span className="mr-1 font-black">({toPersianDigits(rowSellThrough.percentRemaining)}٪)</span>
                                  </span>
                                </div>
                              </div>

                              {/* Financial Value of Sold vs Remaining */}
                              <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px] text-slate-500 dark:text-slate-400">
                                <span>
                                  ارزش فروش‌رفته: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatPrice(rowSellThrough.soldPurchaseAmount)}</strong>
                                  {rowSellThrough.realizedProfit > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold mr-1.5 font-mono">(سود: +{formatPrice(rowSellThrough.realizedProfit)})</span>
                                  )}
                                </span>
                                <span>
                                  ارزش مانده انبار: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatPrice(rowSellThrough.remainingPurchaseAmount)}</strong>
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Quantity & Carton text */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="font-bold font-mono text-sm leading-none">
                          {toPersianDigits(item.totalPieces.toLocaleString())} {unitTitle}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {cartonLabel}
                        </div>
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3 text-center font-mono text-sm whitespace-nowrap">
                        {toPersianDigits(displayUnitPrice.toLocaleString())}
                      </td>

                      {/* Total Price */}
                      <td className={`py-2.5 px-3 text-center font-mono font-bold text-sm whitespace-nowrap ${
                        isDarkCanvas ? 'text-white' : 'text-slate-900'
                      } print:text-black`}>
                        {toPersianDigits(displayLineTotal.toLocaleString())}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Comprehensive Inward Invoice Audit Panel (جمع‌بندی کاملاً فاکتور: درصدی، کارتنی، عددی، تومانی) */}
          {isPurchase && !isSecretMode && !isPresentationModeActive && inwardSellThroughSummary && (
            <div className={`mb-3 p-3.5 sm:p-4 rounded-xl border ${
              isDarkCanvas
                ? 'bg-slate-800/40 border-slate-800 text-slate-200'
                : 'bg-slate-50/90 border-slate-200 text-slate-800'
            } print:bg-white print:border-slate-300 print:text-black space-y-2.5`}>
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-extrabold text-xs sm:text-sm">
                    جمع‌بندی جامع فروش و وضعیت انبار این فاکتور ورود کالا
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  سود قطعی فروش: {inwardSellThroughSummary.totalRealizedProfit > 0 ? `+${formatPrice(inwardSellThroughSummary.totalRealizedProfit)}` : '۰ تومان'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-right">
                {/* 1. درصدی */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">
                    ۱. درصد فروش و باقیمانده:
                  </span>
                  <div className="text-xs font-bold font-mono">
                    <span className="text-sky-600 dark:text-sky-400">{toPersianDigits(inwardSellThroughSummary.percentSold)}٪ فروش</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="text-amber-600 dark:text-amber-400">{toPersianDigits(inwardSellThroughSummary.percentRemaining)}٪ مانده</span>
                  </div>
                </div>

                {/* 2. کارتنی */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">
                    ۲. تفکیک کارتنی:
                  </span>
                  <div className="text-xs font-bold font-mono">
                    فروش: <span className="text-sky-600 dark:text-sky-400">{toPersianDigits(inwardSellThroughSummary.totalSoldCartons)} کارتن</span>
                    {inwardSellThroughSummary.totalSoldExtraPieces > 0 && ` (${toPersianDigits(inwardSellThroughSummary.totalSoldExtraPieces)} دانه)`}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    مانده: {toPersianDigits(inwardSellThroughSummary.totalRemainingCartons)} کارتن
                    {inwardSellThroughSummary.totalRemainingExtraPieces > 0 && ` (${toPersianDigits(inwardSellThroughSummary.totalRemainingExtraPieces)} دانه)`}
                  </div>
                </div>

                {/* 3. عددی */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">
                    ۳. تعداد عددی کل:
                  </span>
                  <div className="text-xs font-bold font-mono">
                    فروش: <span className="text-sky-600 dark:text-sky-400">{toPersianDigits(inwardSellThroughSummary.totalSoldPieces.toLocaleString())} عدد</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    مانده: {toPersianDigits(inwardSellThroughSummary.remainingPieces.toLocaleString())} از {toPersianDigits(inwardSellThroughSummary.totalPurchasedPieces.toLocaleString())}
                  </div>
                </div>

                {/* 4. تومانی */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-1">
                  <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 block">
                    ۴. ارزش تومانی:
                  </span>
                  <div className="text-xs font-bold font-mono">
                    فروش: <span className="text-sky-600 dark:text-sky-400">{formatPrice(inwardSellThroughSummary.totalSoldCost)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    مانده انبار: {formatPrice(inwardSellThroughSummary.totalRemainingCost)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Summary: Flat, Professional, Modern */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 print:gap-2.5 text-xs pt-1">
            {/* Left Column: Totals & Financial Settlement */}
            <div className={`p-4 rounded-lg border space-y-2.5 ${
              isDarkCanvas
                ? 'bg-slate-800/30 border-slate-800/90 text-slate-300'
                : 'bg-slate-50/60 border-slate-200 text-slate-700'
            } print:bg-white print:border-slate-300 print:text-slate-800`}>
              
              {/* Detailed Breakdown */}
              <div className="space-y-1.5 pb-2 border-b border-slate-200 dark:border-slate-800 print:border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">
                    جمع ناخالص ({toPersianDigits(invoice.items.length)} قلم{invoiceCartonBreakdownText ? ` · ${invoiceCartonBreakdownText}` : ''}):
                  </span>
                  <span className="font-mono font-bold">{formatPrice(grossAmount)}</span>
                </div>

                {invoice.discount > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>تخفیف:</span>
                    <span className="font-mono dir-ltr">-{formatPrice(invoice.discount)}</span>
                  </div>
                )}

                {invoice.tax > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">مالیات / ارزش افزوده:</span>
                    <span className="font-mono dir-ltr">+{formatPrice(invoice.tax)}</span>
                  </div>
                )}

                {totalInvoiceReturnsAmount > 0 && (
                  <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold">
                    <span>کسر بابت مرجوعی:</span>
                    <span className="font-mono dir-ltr">-{formatPrice(totalInvoiceReturnsAmount)}</span>
                  </div>
                )}

                {invoice.offsetReturnsTotal && invoice.offsetReturnsTotal > 0 && (
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-bold">
                    <span>کسر بابت تهاتر مرجوعی:</span>
                    <span className="font-mono dir-ltr">-{formatPrice(invoice.offsetReturnsTotal)}</span>
                  </div>
                )}
              </div>

              {/* Net Payable: Clean, Bold, Flat Panel (Fix Black Box Issue) */}
              <div className={`p-3.5 rounded-lg flex items-center justify-between border ${
                isDarkCanvas
                  ? 'bg-slate-800/80 border-slate-700/80 text-white'
                  : 'bg-emerald-50/70 border-emerald-300 text-slate-900'
              } print:bg-slate-50 print:border-slate-300 print:text-black`}>
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 print:text-black">
                  {isPurchase ? (isPresentationModeActive ? 'مبلغ نهایی فاکتور:' : 'مبلغ کل خرید فاکتور:') : 'مبلغ خالص قابل پرداخت:'}
                </span>
                <span className={`font-black font-mono text-xl ${
                  isDarkCanvas ? 'text-emerald-400' : 'text-emerald-700'
                } print:text-black`}>
                  {formatPrice(netPayableAmount)}
                </span>
              </div>

              {/* Settlement Status */}
              <div className="space-y-1 pt-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">وضعیت پرداخت:</span>
                  <span className="font-bold">
                    {isCashPayment
                      ? `تسویه نقدی کامل (${formatPrice(netPayableAmount)})`
                      : isPartialPayment
                      ? `پرداخت بیعانه: ${formatPrice(paidAmount)} · مانده: ${formatPrice(remainingDebtAmount)}`
                      : 'نسیه کامل / دفتری'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 print:border-slate-200">
                  <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black">
                    {invoice.type === 'purchase' ? 'مانده نهایی تأمین‌کننده:' : 'مانده نهایی حساب مشتری:'}
                  </span>
                  <span className="font-black font-mono text-sm">
                    {finalBalanceDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Bank Details, Terms & Signatures */}
            <div className={`p-4 rounded-lg border space-y-3 flex flex-col justify-between ${
              isDarkCanvas
                ? 'bg-slate-800/30 border-slate-800/90 text-slate-300'
                : 'bg-slate-50/60 border-slate-200 text-slate-700'
            } print:bg-white print:border-slate-300 print:text-slate-800`}>
              <div className="space-y-2.5">
                {/* Bank Card Details */}
                {(settings.cardNumber || settings.sheba) && (
                  <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                    isDarkCanvas
                      ? 'bg-slate-800/60 border-slate-800'
                      : 'bg-white border-slate-200'
                  } print:bg-white print:border-slate-300`}>
                    <div className="flex items-center justify-between font-bold pb-1 border-b border-slate-200 dark:border-slate-800 print:border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                        <span>اطلاعات حساب بانکی:</span>
                      </div>
                      {settings.cardNumber && (
                        <button
                          type="button"
                          onClick={handleCopyCardNumber}
                          className="no-print text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer flex items-center gap-1"
                        >
                          {copiedCard ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCard ? 'کپی شد' : 'کپی کارت'}</span>
                        </button>
                      )}
                    </div>
                    {settings.cardNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">شماره کارت ({settings.cardHolder || settings.brandName}):</span>
                        <span className={`font-mono font-bold tracking-wider ${
                          isDarkCanvas ? 'text-white' : 'text-slate-900'
                        } print:text-black`}>
                          {toPersianDigits(settings.cardNumber)}
                        </span>
                      </div>
                    )}
                    {settings.sheba && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">شماره شبا (IR):</span>
                        <span className="font-mono">{toPersianDigits(settings.sheba)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Terms / Notes */}
                {(invoice.notes || settings.invoiceTerms) && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-600 leading-relaxed">
                    <strong className="block text-slate-700 dark:text-slate-300 print:text-black mb-0.5">شرایط و توضیحات:</strong>
                    <p>{invoice.notes || settings.invoiceTerms}</p>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 text-center text-xs">
                <div className="space-y-6">
                  <span className="text-slate-500 font-medium">مهر و امضای فروشنده</span>
                  <div className="h-6 border-b border-dashed border-slate-300 dark:border-slate-700 print:border-slate-400" />
                </div>
                <div className="space-y-6">
                  <span className="text-slate-500 font-medium">امضای خریدار / تحویل‌گیرنده</span>
                  <div className="h-6 border-b border-dashed border-slate-300 dark:border-slate-700 print:border-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export / Print Modal (Flat, Clean) */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      صدور و چاپ فاکتور
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      فاکتور #{toPersianDigits(invoice.invoiceNumber)} · {invoice.customerName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {/* 1. Direct Screenshot to Clipboard */}
                <button
                  type="button"
                  onClick={handleCopyScreenshot}
                  disabled={isCopyingScreenshot}
                  className="w-full text-right p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      کپی مستقیم عکس فاکتور (ارسال تلگرام / ایتا)
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      عکس باکیفیت در حافظه کپی می‌شود؛ در پیام‌رسان Paste (Ctrl+V) را بزنید.
                    </p>
                  </div>
                </button>

                {/* 2. Download PDF */}
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isExportingPDF || isExportingImage || isCopyingScreenshot}
                  className="w-full text-right p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                    <FileDown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      {isExportingPDF ? 'در حال صدور PDF...' : 'دانلود فایل پی‌دی‌اف (PDF)'}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      نسخه استاندارد کاغذ سفید A4 جهت چاپ رسمی یا ارسال به مشتری.
                    </p>
                  </div>
                </button>

                {/* 3. Download Image */}
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={isExportingImage || isCopyingScreenshot}
                  className="w-full text-right p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      {isExportingImage ? 'در حال تبدیل به عکس...' : 'دانلود فایل تصویر (PNG)'}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ذخیره تصویر فاکتور روی دستگاه شما.
                    </p>
                  </div>
                </button>

                {/* 4. Direct Browser Print */}
                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="w-full text-right p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-3 cursor-pointer"
                >
                  <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      چاپ مستقیم پرینتر
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ارسال مستقیم به دستگاه چاپگر یا چاپگر حرارتی.
                    </p>
                  </div>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="w-full py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
