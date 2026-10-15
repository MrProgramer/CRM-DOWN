import React, { useState, useMemo, useEffect } from 'react';
import { Invoice, StoreSettings, Product, ProductReturn, Customer, CustomerPayment } from '../types';
import { 
  formatPrice, 
  formatCartonText, 
  toPersianDigits, 
  toEnglishDigits,
  getCurrentPersianDate, 
  getCurrentPersianTime, 
  getNetReturnAmount, 
  formatProductPackagingSpec,
  matchProduct,
  resolveItemCoverPrice
} from '../utils/formatters';
import { calculateInwardInvoiceSellThrough } from '../utils/inwardSellThrough';
import { calculateCustomerLiveBalance } from '../utils/customerBalanceCalculations';
import { themes, getThemeBadges } from './ThemeConfig';
import { downloadInvoiceAsImage, downloadInvoiceAsPDF, copyInvoiceImageToClipboard } from '../utils/exportInvoice';
import { 
  Printer, 
  Share2, 
  Copy, 
  Check, 
  ArrowRight, 
  ArrowUp,
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
  UserCheck,
  Boxes,
  FileSpreadsheet,
  Layers,
  LayoutTemplate,
  Tag,
  Calendar,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UnifiedMasterCommercialTemplate,
  PrintModernMonoTemplate, 
  GraphicSwissTemplate, 
  GraphicFintechTemplate, 
  GraphicExecutiveTemplate, 
  GraphicArtisanTemplate,
  GraphicCompactTemplate,
  GraphicCommercialLedgerTemplate,
  GraphicNeoCommerceTemplate,
  GraphicHyperMinimalTemplate,
  ProcessedItem 
} from './InvoiceTemplates';

export type InvoiceTemplateMode = 
  | 'print_mono' 
  | 'graphic_swiss' 
  | 'graphic_fintech' 
  | 'graphic_executive' 
  | 'graphic_artisan' 
  | 'graphic_compact'
  | 'graphic_commercial'
  | 'graphic_neo'
  | 'graphic_hyper'
  | 'graphic_minimal'
  | 'graphic_nordic';

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
  customers?: Customer[];
  payments?: CustomerPayment[];
  onExportPDF?: (invoice: Invoice) => void;
  onExportImage?: (invoice: Invoice) => void;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
  invoices?: Invoice[];
  onUpdateInvoice?: (invoice: Invoice) => void;
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
  customers = [],
  payments = [],
  onExportPDF,
  onExportImage,
  onShowAlert,
  invoices = [],
  onUpdateInvoice,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isCopyingScreenshot, setIsCopyingScreenshot] = useState(false);

  // Screen canvas appearance mode: 'auto' (respects app dark/light mode), 'dark' (forced dark), 'paper' (forced day/print preview)
  const [viewPaperMode, setViewPaperMode] = useState<'auto' | 'dark' | 'paper'>('auto');

  // Template Mode: 'print_mono' (pure B&W classic print), or 5 distinct flat graphic models
  const [templateMode, setTemplateMode] = useState<InvoiceTemplateMode>('graphic_swiss');

  // Presentation / Adjusted Display Price Mode (فاکتور نمایشی / قیمت ارائه به مشتری / همکار)
  const [isPresentationModeActive, setIsPresentationModeActive] = useState<boolean>(false);
  const [presentationModeType, setPresentationModeType] = useState<'percent' | 'fixed' | 'selling_price' | 'custom'>('percent');
  const [markupPercent, setMarkupPercent] = useState<number>(10);
  const [fixedMarkupPerUnit, setFixedMarkupPerUnit] = useState<number>(1000);
  const [customItemUnitPrices, setCustomItemUnitPrices] = useState<{ [itemKey: string]: number }>({});
  const [isPresentationPanelOpen, setIsPresentationPanelOpen] = useState<boolean>(false);

  // Toggle to show profit/loss in preview on screen (when prices are in normal display mode)
  const [showProfitMode, setShowProfitMode] = useState<boolean>(false);

  // Toggle to show/hide cover price (قیمت روی جلد) on invoice
  const [showCoverPrice, setShowCoverPrice] = useState<boolean>(() => {
    if (invoice.showCoverPrice !== undefined) return invoice.showCoverPrice;
    return settings?.defaultShowCoverPrice !== undefined ? settings.defaultShowCoverPrice : true;
  });

  // Toggle to include profit/loss rows in print and image exports
  const [includeProfitInExport, setIncludeProfitInExport] = useState<boolean>(false);

  const theme = themes[settings.themeColor] || themes.teal;
  const badges = getThemeBadges(settings.themeColor);
  const isPurchase = invoice.type === 'purchase';

  // Check if active app theme is a gradient palette
  const isAppThemeGradient = useMemo(() => {
    return !!(theme?.isGradient || theme?.secondaryHex || settings.themeColor?.startsWith('gradient-') || settings.themeColor?.startsWith('vip-'));
  }, [theme, settings.themeColor]);

  // Gradient styling active state - defaults to true when app theme is gradient
  const [useGradientStyling, setUseGradientStyling] = useState<boolean>(isAppThemeGradient);

  // Sync state whenever settings.themeColor changes
  useEffect(() => {
    if (isAppThemeGradient) {
      setUseGradientStyling(true);
    } else {
      setUseGradientStyling(false);
    }
  }, [isAppThemeGradient, settings.themeColor]);

  // Determine if the canvas should currently render in dark style on screen
  const isDarkCanvas = useMemo(() => {
    // In pure monochrome print mode, canvas is strictly white paper with black text
    if (templateMode === 'print_mono') return false;
    if (viewPaperMode === 'dark') return true;
    if (viewPaperMode === 'paper') return false;
    // 'auto': follow app dark mode
    if (typeof isDarkMode === 'boolean') return isDarkMode;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  }, [templateMode, viewPaperMode, isDarkMode]);

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
  const netPayableAmount = invoice.finalAmount !== undefined && invoice.finalAmount > 0
    ? invoice.finalAmount
    : Math.max(0, grossAmount - totalInvoiceReturnsAmount - (invoice.expensesTotalDeduction || 0) + (invoice.expensesTotalAddition || 0));

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

  // Robust Persian / English string parser for balance numbers
  const parseBalanceString = (str: string): number => {
    if (!str || str.trim() === '' || str.includes('بی‌حساب (۰)') || str === 'بی‌حساب' || str === '۰') return 0;
    const eng = toEnglishDigits(str);
    const cleanStr = eng.replace(/[^\d]/g, '');
    if (!cleanStr) return 0;
    const val = parseInt(cleanStr, 10) || 0;
    if (str.includes('بستانکار') || str.includes('طلبکار') || str.includes('-')) return -val;
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

  // Match customer from customers registry to ensure complete 100% balance integrity
  const matchedCustomer = useMemo(() => {
    if (!customers || customers.length === 0) return null;
    return customers.find(c => 
      (invoice.customerId && c.id === invoice.customerId) ||
      (c.name && invoice.customerName && c.name.trim().toLowerCase() === invoice.customerName.trim().toLowerCase()) ||
      (c.phone && invoice.customerPhone && c.phone.trim() === invoice.customerPhone.trim())
    );
  }, [customers, invoice.customerId, invoice.customerName, invoice.customerPhone]);

  // Accurate previous balance value (from snapshot string or live calculated from prior ledger)
  const prevValNumber = useMemo(() => {
    const rawParsed = parseBalanceString(invoice.previousBalance || '');
    if (rawParsed !== 0) return rawParsed;

    if (matchedCustomer) {
      if (invoices && invoices.length > 0) {
        const priorInvoices = invoices.filter(inv => 
          inv.id !== invoice.id && 
          ((inv.customerId && inv.customerId === matchedCustomer.id) || 
           (inv.customerName && inv.customerName.trim().toLowerCase() === matchedCustomer.name.trim().toLowerCase()))
        );
        return calculateCustomerLiveBalance(matchedCustomer, priorInvoices, payments, productReturns);
      }
      return Number(matchedCustomer.initialBalance) || 0;
    }
    return 0;
  }, [invoice.previousBalance, invoice.id, matchedCustomer, invoices, payments, productReturns]);

  const unpaidPortion = isPartialPayment ? remainingDebtAmount : (isCashPayment ? 0 : netPayableAmount);
  const cumulativeBalanceVal = isPurchase 
    ? (prevValNumber - unpaidPortion)
    : (prevValNumber + unpaidPortion);
  const isCreditOrPartial = !isCashPayment && unpaidPortion > 0;

  const getDynamicFinalBalance = () => {
    if (isCashPayment) {
      if (prevValNumber > 0) return `${formatPrice(prevValNumber)} بدهکار`;
      if (prevValNumber < 0) return `${formatPrice(Math.abs(prevValNumber))} بستانکار`;
      return 'تسویه شده / بی‌حساب';
    }

    if (invoice.salesType?.includes('خرید') || invoice.salesType?.includes('ورود') || invoice.type === 'purchase') {
      const finalVal = prevValNumber - unpaidPortion;
      if (finalVal > 0) return `${formatPrice(finalVal)} طلبکار (از ما)`;
      if (finalVal < 0) return `${formatPrice(Math.abs(finalVal))} بستانکار (طلبکار از ما)`;
      return 'تسویه شده / بی‌حساب';
    } else {
      const finalVal = prevValNumber + unpaidPortion;
      if (finalVal > 0) return `${formatPrice(finalVal)} بدهکار`;
      if (finalVal < 0) return `${formatPrice(Math.abs(finalVal))} بستانکار`;
      return 'تسویه شده / بی‌حساب';
    }
  };

  const finalBalanceDisplay = getDynamicFinalBalance();
  const hasAdjustments = (invoice.discount > 0) || (invoice.tax > 0) || (totalInvoiceReturnsAmount > 0) || Boolean(invoice.offsetReturnsTotal && invoice.offsetReturnsTotal > 0);

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

  const hasInvDiscount = Boolean((invoice.hasDiscount || (invoice.discount && invoice.discount > 0)));
  const invDiscountPercent = invoice.discountPercent || (grossSubtotal > 0 && invoice.discount > 0 ? Math.round((invoice.discount / grossSubtotal) * 100 * 10) / 10 : 0);

  const processedItems = useMemo<ProcessedItem[]>(() => {
    return (invoice.items || []).map((item, index) => {
      const prod = matchProduct(item, products);
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

      const discountedUnitPrice = hasInvDiscount && invDiscountPercent > 0
        ? Math.round(displayUnitPrice * (1 - (invDiscountPercent / 100)))
        : displayUnitPrice;

      const discountedLineTotal = hasInvDiscount && invDiscountPercent > 0
        ? Math.round(displayLineTotal * (1 - (invDiscountPercent / 100)))
        : displayLineTotal;

      // Profit / loss calculation for item (Both for purchase and sales invoices)
      const prodPurchase = prod?.purchasePrice || (item.totalPurchaseCost && item.totalPieces ? Math.round(item.totalPurchaseCost / item.totalPieces) : 0);
      let unitPurchasePrice = (item.unitPurchasePrice !== undefined && item.unitPurchasePrice > 0)
        ? item.unitPurchasePrice
        : (prodPurchase > 0 ? prodPurchase : (isPurchase ? (discountedUnitPrice || displayUnitPrice) : 0));

      // Fallback: search past purchase invoices if unitPurchasePrice is still 0 (taking past supplier discounts into account)
      if (unitPurchasePrice <= 0 && invoices && invoices.length > 0) {
        for (const pastInv of invoices) {
          if (pastInv.type === 'purchase' && !pastInv.isDraft && pastInv.items) {
            const pastItem = pastInv.items.find(pi =>
              (pi.productId && pi.productId === item.productId) ||
              (pi.productName && item.productName && pi.productName.trim().toLowerCase() === item.productName.trim().toLowerCase())
            );
            if (pastItem) {
              const hasPastDiscount = Boolean(pastInv.hasDiscount || (pastInv.discount && pastInv.discount > 0));
              const pastGrossSubtotal = (pastInv.items || []).reduce((s, it) => s + (it.totalPrice || (it.totalPieces * (it.unitPurchasePrice || it.unitPrice || 0))), 0);
              const pastDiscountPercent = pastInv.discountPercent || (pastGrossSubtotal > 0 && pastInv.discount ? (pastInv.discount / pastGrossSubtotal) * 100 : 0);
              let pp = pastItem.unitPurchasePrice || (pastItem.totalPieces > 0 ? Math.round(pastItem.totalPrice / pastItem.totalPieces) : pastItem.unitPrice);
              if (pp && pp > 0) {
                if (hasPastDiscount && pastDiscountPercent > 0) {
                  pp = Math.round(pp * (1 - (pastDiscountPercent / 100)));
                }
                unitPurchasePrice = pp;
                break;
              }
            }
          }
        }
      }

      const prodSelling = prod?.sellingPrice || item.unitSellingPrice || (item as any).sellingPrice || 0;
      let resolvedSelling = prodSelling;

      // Fallback: search past sales invoices if selling price is 0
      if (resolvedSelling <= 0 && invoices && invoices.length > 0) {
        for (const pastInv of invoices) {
          if (pastInv.type !== 'purchase' && pastInv.items) {
            const pastItem = pastInv.items.find(pi =>
              (pi.productId && pi.productId === item.productId) ||
              (pi.productName && item.productName && pi.productName.trim().toLowerCase() === item.productName.trim().toLowerCase())
            );
            if (pastItem) {
              const sp = pastItem.unitSellingPrice || (pastItem.totalPieces > 0 ? Math.round(pastItem.totalPrice / pastItem.totalPieces) : pastItem.unitPrice);
              if (sp && sp > 0) {
                resolvedSelling = sp;
                break;
              }
            }
          }
        }
      }

      const unitSellingPrice = isPurchase
        ? (isPresentationModeActive ? displayUnitPrice : (resolvedSelling > 0 ? resolvedSelling : displayUnitPrice))
        : (discountedUnitPrice || displayUnitPrice);

      let unitProfit = 0;
      let totalProfit = 0;
      let profitMarginPercent = 0;

      if (isPurchase) {
        // In purchase (ورود) invoice: profit is the expected margin between warehouse selling price and effective discounted purchase cost
        const purchaseCost = discountedUnitPrice || displayUnitPrice || unitPurchasePrice;
        if (unitSellingPrice > 0 && purchaseCost > 0) {
          unitProfit = unitSellingPrice - purchaseCost;
          totalProfit = unitProfit * item.totalPieces;
          profitMarginPercent = Math.round((unitProfit / purchaseCost) * 100 * 10) / 10;
        }
      } else {
        // In sales (فروش) invoice: profit is effective selling price minus purchase cost (which accounts for supplier discount)
        const effectiveSellingUnitPrice = discountedUnitPrice || displayUnitPrice;
        const effectiveSellingLineTotal = discountedLineTotal || displayLineTotal;
        unitProfit = effectiveSellingUnitPrice - unitPurchasePrice;
        const totalCostForLine = unitPurchasePrice * item.totalPieces;
        totalProfit = effectiveSellingLineTotal - totalCostForLine;
        profitMarginPercent = totalCostForLine > 0 
          ? Math.round((totalProfit / totalCostForLine) * 100 * 10) / 10 
          : 0;
      }

      const isProfit = totalProfit > 0;
      const isLoss = totalProfit < 0;

      return {
        item,
        index,
        prod,
        correctPiecesPerCarton,
        unitTitle,
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
        coverPrice: resolveItemCoverPrice(item, products),
        hasDiscount: hasInvDiscount,
        discountPercent: invDiscountPercent,
        discountedUnitPrice,
        discountedLineTotal,
        unitPurchasePrice,
        unitSellingPrice,
        unitProfit,
        totalProfit,
        profitMarginPercent,
        isProfit,
        isLoss,
      };
    });
  }, [invoice.items, products, matchedReturns, isPresentationModeActive, presentationModeType, markupPercent, fixedMarkupPerUnit, customItemUnitPrices, hasInvDiscount, invDiscountPercent, isPurchase, invoices]);

  const isExporting = isExportingImage || isExportingPDF || isCopyingScreenshot;
  const shouldShowProfitUnderItems = showProfitMode && !isPresentationModeActive && !isSecretMode && (!isExporting || includeProfitInExport);

  const totalInvoiceProfit = useMemo(() => {
    return processedItems.reduce((sum, item) => sum + (item.totalProfit || 0), 0);
  }, [processedItems]);

  const totalInvoiceCost = useMemo(() => {
    return processedItems.reduce((sum, item) => {
      const lineCost = isPurchase ? (item.displayUnitPrice || item.unitPurchasePrice || 0) : (item.unitPurchasePrice || 0);
      return sum + (lineCost * item.item.totalPieces);
    }, 0);
  }, [processedItems, isPurchase]);

  const totalInvoiceProfitMargin = useMemo(() => {
    return totalInvoiceCost > 0 ? Math.round((totalInvoiceProfit / totalInvoiceCost) * 100 * 10) / 10 : 0;
  }, [totalInvoiceProfit, totalInvoiceCost]);

  const creditCalculationFormula = useMemo(() => {
    if (!isCreditOrPartial && prevValNumber === 0) return '';
    if (isCreditOrPartial && prevValNumber > 0) {
      return `مانده قبلی (${formatPrice(prevValNumber)}) + نسیه این فاکتور (${formatPrice(unpaidPortion)}) = جمع کل بدهی: ${formatPrice(cumulativeBalanceVal)} بدهکار`;
    }
    if (isCreditOrPartial && prevValNumber === 0) {
      return `نسیه این فاکتور: ${formatPrice(unpaidPortion)} بدهکار`;
    }
    if (isCashPayment && prevValNumber > 0) {
      return `این فاکتور نقداً تسویه شد (مانده قبلی حساب: ${formatPrice(prevValNumber)})`;
    }
    return '';
  }, [isCreditOrPartial, prevValNumber, unpaidPortion, cumulativeBalanceVal, isCashPayment]);

  const templateProps = {
    invoice,
    settings,
    theme,
    isPurchase,
    isSecretMode,
    isPresentationModeActive,
    isDarkCanvas,
    processedItems,
    grossAmount,
    discount: invoice.discount || 0,
    tax: invoice.tax || 0,
    totalInvoiceReturnsAmount,
    offsetReturnsTotal: invoice.offsetReturnsTotal,
    netPayableAmount,
    paidAmount,
    remainingDebtAmount,
    isCashPayment,
    isPartialPayment,
    finalBalanceDisplay,
    previousBalanceNumber: prevValNumber,
    cumulativeBalanceVal,
    isCreditOrPartial,
    creditCalculationFormula,
    invoiceCartonBreakdownText,
    inwardSellThroughSummary,
    onCopyCardNumber: handleCopyCardNumber,
    copiedCard,
    shouldShowProfitUnderItems,
    includeProfitInExport,
    showCoverPrice,
    totalInvoiceProfit,
    totalInvoiceCost,
    totalInvoiceProfitMargin,
    useGradient: useGradientStyling,
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-16 transition-colors print:max-w-none print:w-full print:m-0 print:p-0 print:pb-0">
      {/* 1. Main Executive Header Bar - Unified, Ultra-Balanced & Proportional */}
      <div className="no-print mb-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors space-y-3.5">
        {/* Tier 1: Identity (Right) vs Key Actions (Left) - Perfectly Balanced */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
          {/* Right Wing: Navigation & Document Plaque */}
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            {onBack && (
              <button
                id="invoice-back-btn"
                onClick={onBack}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-black text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-300/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95 group"
                title="بازگشت به فهرست فاکتورها"
              >
                <ArrowRight className="w-4 h-4 stroke-[2.2] group-hover:-translate-x-0.5 transition-transform" />
                <span>بازگشت به لیست</span>
              </button>
            )}

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            {/* Document Plaque */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                isPurchase 
                  ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}>
                {isPurchase ? 'رسید ورود انبار (خرید)' : 'فاکتور فروش رسمی'}
              </span>

              <span className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                سند #{toPersianDigits(invoice.invoiceNumber)}
              </span>

              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]" title={invoice.customerName}>
                طرف حساب: <b className="text-slate-900 dark:text-white font-extrabold">{invoice.customerName || 'مشتری متفرقه'}</b>
              </span>

              <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>

              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono text-xs dir-ltr">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{toPersianDigits(invoice.date)}</span>
              </span>
            </div>
          </div>

          {/* Left Wing: Profit Analysis, Edit & Hero Print Button (Balanced on Left Side) */}
          <div className="flex items-center gap-2 justify-end flex-wrap shrink-0">
            {!isPurchase && onOpenProfitAnalysis && !isSecretMode && (
              <button
                type="button"
                id="top-profit-analysis-btn"
                onClick={() => onOpenProfitAnalysis(invoice)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="تحلیل سود و زیان این فاکتور"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>تحلیل سود و زیان</span>
              </button>
            )}

            {onEdit && (
              <button
                id="invoice-edit-btn"
                onClick={() => onEdit(invoice)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs active:scale-95"
                title="ویرایش اقلام، مقادیر یا مشخصات فاکتور"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>ویرایش فاکتور</span>
              </button>
            )}

            {/* Primary Action Button */}
            <button
              id="invoice-print-btn"
              onClick={() => setIsExportModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white ${theme.primary} ${theme.primaryHover} transition-all cursor-pointer shadow-xs active:scale-95 shrink-0`}
              title="چاپ کاغذی پرینتر، صدور PDF و دانلود عکس فاکتور"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ و صدور رسمی</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Configuration & Display Controls (Consolidated & Compact) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Right: Template Selector (Print Mono vs Graphic Flat Models) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1">قالب فاکتور:</span>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                id="mode-print-mono-btn"
                onClick={() => setTemplateMode('print_mono')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  templateMode === 'print_mono'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="حالت چاپی رسمی: فقط و فقط سیاه و سفید بدون رنگ"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>چاپ رسمی (سیاه و سفید)</span>
              </button>

              <button
                type="button"
                id="mode-graphic-btn"
                onClick={() => {
                  if (templateMode === 'print_mono') setTemplateMode('graphic_swiss');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                  templateMode !== 'print_mono'
                    ? `${theme.primary} text-white shadow-2xs font-black`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="قالب گرافیکی مدرن هماهنگ با پالت رنگی برنامه"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>قالب گرافیکی (۸ مدل)</span>
              </button>
            </div>

            {/* Clean Dropdown for the 8 Graphic Models */}
            {templateMode !== 'print_mono' && (
              <select
                id="template-model-select"
                value={
                  templateMode === 'graphic_minimal' ? 'graphic_swiss' :
                  templateMode === 'graphic_nordic' ? 'graphic_fintech' :
                  templateMode
                }
                onChange={(e) => setTemplateMode(e.target.value as InvoiceTemplateMode)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs focus:outline-none"
              >
                <option value="graphic_swiss">مدل ۱: فلت مینیمال سوئیسی</option>
                <option value="graphic_fintech">مدل ۲: فین‌تک مدولار پیشرفته</option>
                <option value="graphic_executive">مدل ۳: سازمانی رسمی هیئت‌مدیره</option>
                <option value="graphic_artisan">مدل ۴: کارت‌های تفکیکی آرتیسان</option>
                <option value="graphic_compact">مدل ۵: فشرده لجستیک و انبارداری</option>
                <option value="graphic_commercial">مدل ۶: تجاری خطی و بازرگانی</option>
                <option value="graphic_neo">مدل ۷: نئو-کامرس بازرگانی</option>
                <option value="graphic_hyper">مدل ۸: هایپر-مینیمال مدرن</option>
              </select>
            )}
          </div>

          {/* Left: Export Tools, Canvas & Visibility Toggles */}
          <div className="flex items-center gap-2 justify-end flex-wrap">
            {/* Quick Export Group */}
            <div className="flex items-center gap-1.5">
              <button
                id="invoice-copy-screenshot-btn"
                onClick={handleCopyScreenshot}
                disabled={isCopyingScreenshot}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                title="کپی مستقیم تصویر فاکتور در کلیپ‌بورد"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>{isCopyingScreenshot ? 'کپی...' : 'کپی عکس'}</span>
              </button>

              <button
                id="invoice-download-pdf-top-btn"
                onClick={handleDownloadPDF}
                disabled={isExportingPDF}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                title="دانلود فایل PDF فاکتور"
              >
                <FileDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>{isExportingPDF ? 'PDF...' : 'دانلود PDF'}</span>
              </button>

              <button
                id="invoice-copy-summary-btn"
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
                title="کپی متن ریز اقلام و محاسبات فاکتور"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'کپی شد' : 'کپی متن'}</span>
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            {/* Canvas Mode (Paper A4, Dark, Auto) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewPaperMode('paper')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  viewPaperMode === 'paper'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="پیش‌نمایش کاغذ سفید چاپی A4 روی صفحه"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>کاغذ A4</span>
              </button>
              <button
                type="button"
                onClick={() => setViewPaperMode('dark')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  viewPaperMode === 'dark'
                    ? 'bg-slate-900 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="نمایش فاکتور در تم تیره فلت"
              >
                <Moon className="w-3.5 h-3.5" />
                <span>تیره</span>
              </button>
              <button
                type="button"
                onClick={() => setViewPaperMode('auto')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  viewPaperMode === 'auto'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="پیروی خودکار از حالت کلی برنامه"
              >
                <span>خودکار</span>
              </button>
            </div>

            {/* Cover Price Visibility Toggle */}
            <button
              type="button"
              id="invoice-toggle-cover-price-btn"
              onClick={() => {
                const nextVal = !showCoverPrice;
                setShowCoverPrice(nextVal);
                invoice.showCoverPrice = nextVal;
                onUpdateInvoice?.({ ...invoice, showCoverPrice: nextVal });
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                showCoverPrice
                  ? `${theme.primary} text-white shadow-2xs`
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
              title="نمایش یا عدم نمایش ستون قیمت مصرف‌کننده در فاکتور"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{showCoverPrice ? 'قیمت مصرف‌کننده ✓' : 'قیمت مصرف‌کننده'}</span>
            </button>

            {/* Profit Mode Toggle */}
            {!isSecretMode && (
              <button
                type="button"
                id="invoice-toggle-profit-mode-btn"
                onClick={() => setShowProfitMode(!showProfitMode)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                  showProfitMode
                    ? `${theme.primary} text-white shadow-2xs`
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
                title="نمایش یا عدم نمایش سود و حاشیه سود"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{showProfitMode ? 'نمایش سود ✓' : 'نمایش سود'}</span>
              </button>
            )}

            {/* Presentation Mode Toggle (For Purchase Invoices) */}
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                  isPresentationModeActive
                    ? `${theme.primary} text-white shadow-2xs`
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

            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handleDirectPrint}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="چاپ فوری این قالب با پرینتر"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ فوری</span>
            </button>
          </div>
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
            ? 'bg-[#0b0f19] text-slate-100 border-slate-800 shadow-sm' 
            : 'bg-white text-slate-900 border-slate-200/90 shadow-sm'
        } print:p-0 print:m-0 print:border-none print:shadow-none print:bg-white print:text-slate-900 print:w-full print:max-w-none print:min-h-0`}
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

        <div className="relative z-10">
          {(templateMode === 'print_mono' || templateMode === 'graphic_swiss' || templateMode === 'graphic_minimal') && (
            <UnifiedMasterCommercialTemplate {...templateProps} />
          )}
          {(templateMode === 'graphic_fintech' || templateMode === 'graphic_nordic') && (
            <GraphicFintechTemplate {...templateProps} />
          )}
          {templateMode === 'graphic_executive' && <GraphicExecutiveTemplate {...templateProps} />}
          {templateMode === 'graphic_artisan' && <GraphicArtisanTemplate {...templateProps} />}
          {templateMode === 'graphic_compact' && <GraphicCompactTemplate {...templateProps} />}
          {templateMode === 'graphic_commercial' && <GraphicCommercialLedgerTemplate {...templateProps} />}
          {templateMode === 'graphic_neo' && <GraphicNeoCommerceTemplate {...templateProps} />}
          {templateMode === 'graphic_hyper' && <GraphicHyperMinimalTemplate {...templateProps} />}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BALANCED EXECUTIVE BOTTOM ACTION DOCK (نوار ابزار کاملاً متقارن و متناسب پایانی) */}
      {/* ========================================================================= */}
      <div className="no-print mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs transition-colors space-y-3.5">
        {/* Tier 1: Primary Navigation (Right) vs Primary Action (Left) - Perfectly Balanced */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          {/* Right Side: Navigation & Document Plaque */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {onBack && (
              <button
                type="button"
                id="bottom-invoice-back-btn"
                onClick={onBack}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95 group"
                title="بازگشت به فهرست فاکتورها"
              >
                <ArrowRight className="w-4 h-4 stroke-[2.2] group-hover:-translate-x-0.5 transition-transform" />
                <span>بازگشت به لیست فاکتورها</span>
              </button>
            )}

            <button
              type="button"
              id="bottom-invoice-scroll-top-btn"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs active:scale-95"
              title="پرش به ابتدای سند"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>ابتدای فاکتور</span>
            </button>

            {/* Document Quick Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                سند #{toPersianDigits(invoice.invoiceNumber)}
              </span>
              <span>•</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatPrice(invoice.finalAmount || invoice.totalAmount || 0)}
              </span>
            </div>
          </div>

          {/* Left Side: Primary Actions (ویرایش فاکتور + چاپ و صدور رسمی) */}
          <div className="flex items-center gap-2.5 justify-end flex-wrap">
            {onEdit && (
              <button
                type="button"
                id="bottom-invoice-edit-btn"
                onClick={() => onEdit(invoice)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs active:scale-95"
                title="ویرایش مشخصات یا اقلام فاکتور"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>ویرایش فاکتور</span>
              </button>
            )}

            <button
              type="button"
              id="bottom-invoice-print-btn"
              onClick={() => setIsExportModalOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black text-white ${theme.primary} ${theme.primaryHover} transition-all cursor-pointer shadow-xs active:scale-95`}
              title="چاپ کاغذی، صدور PDF و دانلود عکس فاکتور"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ و صدور رسمی</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Financial Intelligence (Right) vs Export Tools (Left) - Perfectly Balanced */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Right Side: Financial Intelligence */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isPurchase && onOpenProfitAnalysis && !isSecretMode && (
              <button
                type="button"
                id="bottom-profit-analysis-btn"
                onClick={() => onOpenProfitAnalysis(invoice)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="تحلیل دقیق سود ناخالص و خالص این فاکتور"
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>تحلیل سود و زیان این فاکتور</span>
              </button>
            )}
            {isPurchase && (
              <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                سند خرید و ورود کالا به انبار
              </span>
            )}
          </div>

          {/* Left Side: Export & Copy Buttons (Symmetrical with Left Wing) */}
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <button
              type="button"
              id="bottom-copy-screenshot-btn"
              onClick={handleCopyScreenshot}
              disabled={isCopyingScreenshot}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              title="کپی مستقیم عکس فاکتور در حافظه"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>{isCopyingScreenshot ? 'کپی...' : 'کپی عکس'}</span>
            </button>

            <button
              type="button"
              id="bottom-download-pdf-btn"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              title="دانلود فایل PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>{isExportingPDF ? 'PDF...' : 'دانلود PDF'}</span>
            </button>

            <button
              type="button"
              id="bottom-download-image-btn"
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
              title="دانلود تصویر با فرمت PNG"
            >
              <ImageIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>دانلود عکس</span>
            </button>

            <button
              type="button"
              id="bottom-copy-summary-btn"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="کپی متن فاکتور"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? 'کپی شد' : 'کپی متن'}</span>
            </button>
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

              {/* Current Active Template Badge in Modal */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">قالب چاپی و صدور فعلی:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {templateMode === 'print_mono'
                    ? 'چاپ رسمی (سیاه و سفید خالص)'
                    : (templateMode === 'graphic_swiss' || templateMode === 'graphic_minimal')
                    ? 'مدل ۱: سوئیسی مینیمال'
                    : (templateMode === 'graphic_fintech' || templateMode === 'graphic_nordic')
                    ? 'مدل ۲: فین‌تک مدولار'
                    : templateMode === 'graphic_executive'
                    ? 'مدل ۳: سازمانی رسمی'
                    : templateMode === 'graphic_artisan'
                    ? 'مدل ۴: کارت‌های تفکیکی آرتیسان'
                    : templateMode === 'graphic_compact'
                    ? 'مدل ۵: فشرده لجستیک'
                    : templateMode === 'graphic_commercial'
                    ? 'مدل ۶: تجاری خطی و مویی'
                    : templateMode === 'graphic_neo'
                    ? 'مدل ۷: نئو-کامرس بازرگانی'
                    : 'مدل ۸: هایپر-مینیمال شرکتی'}
                </span>
              </div>

              {/* Gradient Styling Toggle Option in Export / Print Modal */}
              {isAppThemeGradient && (
                <label className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ background: `linear-gradient(135deg, ${theme.hex}, ${theme.secondaryHex || theme.hex})` }}
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">رنگ‌آمیزی گرادینتی فاکتور در خروجی و چاپ</span>
                      <span className="text-[10px] text-slate-400">با برداشتن تیک، المان‌های فاکتور با رنگ تخت تک‌رنگ چاپ می‌شوند</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={useGradientStyling}
                    onChange={(e) => setUseGradientStyling(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                  />
                </label>
              )}

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
