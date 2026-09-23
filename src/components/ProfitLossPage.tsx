import React, { useState, useMemo } from 'react';
import { Invoice, Product, StoreSettings, InvoiceItem, ProductReturn } from '../types';
import { formatPrice, toPersianDigits, getCurrentPersianDate, formatCartonText, formatProductPackagingSpec, isDateInPeriod, TimePeriodFilter, getNetReturnAmount, getSavedTimePeriod, saveTimePeriod } from '../utils/formatters';
import { themes } from './ThemeConfig';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  Eye, 
  EyeOff,
  ArrowUpRight, 
  Printer, 
  Building2, 
  Package, 
  Users, 
  Layers, 
  ShoppingBag, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Award,
  ShieldAlert,
  Boxes,
  ArrowLeft,
  RotateCcw,
  Receipt,
  PieChart,
  BarChart3,
  Scale,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pagination } from './Pagination';

interface ProfitLossPageProps {
  invoices: Invoice[];
  products: Product[];
  settings: StoreSettings;
  productReturns?: ProductReturn[];
  treasuryTransactions?: any[];
  isSecretMode?: boolean;
  onToggleSecretMode?: () => void;
  onViewInvoice: (invoice: Invoice) => void;
}

export const ProfitLossPage: React.FC<ProfitLossPageProps> = ({
  invoices,
  products,
  settings,
  productReturns = [],
  treasuryTransactions = [],
  isSecretMode = false,
  onToggleSecretMode,
  onViewInvoice,
}) => {
  const theme = themes[settings.themeColor] || themes.teal;
  const [period, setPeriod] = useState<TimePeriodFilter>(() => getSavedTimePeriod('month'));

  // Listen to global time period changes across components
  React.useEffect(() => {
    const handlePeriodChange = (e: Event) => {
      const customEvent = e as CustomEvent<TimePeriodFilter>;
      if (customEvent.detail && customEvent.detail !== period) {
        setPeriod(customEvent.detail);
      }
    };
    window.addEventListener('bazargani_time_period_changed', handlePeriodChange);
    return () => window.removeEventListener('bazargani_time_period_changed', handlePeriodChange);
  }, [period]);

  const handleSelectPeriod = (p: TimePeriodFilter) => {
    setPeriod(p);
    saveTimePeriod(p);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);
  const [activeTab, setActiveTab] = useState<'invoices' | 'products' | 'customers' | 'purchases'>('invoices');
  const [detailItemFilter, setDetailItemFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const today = getCurrentPersianDate();

  const normalizePersianStr = (str?: string) => {
    if (!str) return '';
    return str
      .trim()
      .toLowerCase()
      .replace(/[\u200c\u200b\uFEFF]/g, '')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[\s\-_]+/g, ' ');
  };

  const getMatchingProduct = (productId?: string, productName?: string) => {
    if (productId) {
      const match = products.find(p => p.id === productId);
      if (match) return match;
    }
    if (!productName) return undefined;
    const target = normalizePersianStr(productName);
    return products.find(p => {
      const pName = normalizePersianStr(p.name);
      return pName === target || pName.includes(target) || target.includes(pName);
    });
  };

  // Reset pagination on tab, period, search or sort change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, period, searchQuery, dateSortOrder]);

  // Filter only finalized sales invoices for profit analysis (excluding drafts)
  const salesInvoices = useMemo(() => {
    return invoices.filter(inv => inv.type === 'sale' && !inv.isDraft);
  }, [invoices]);

  // Filtered by period & search query and sorted by date
  const filteredSalesInvoices = useMemo(() => {
    const list = salesInvoices.filter(inv => {
      // Period filter (today, week, month, 3months, 6months, 1year, all)
      if (!isDateInPeriod(inv.date, period)) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchNumber = inv.invoiceNumber?.toLowerCase().includes(query);
        const matchCustomer = inv.customerName?.toLowerCase().includes(query);
        const matchItem = inv.items?.some(it => it.productName?.toLowerCase().includes(query));
        if (!matchNumber && !matchCustomer && !matchItem) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return dateSortOrder === 'desc' ? cmp : -cmp;
      return dateSortOrder === 'desc' ? b.invoiceNumber.localeCompare(a.invoiceNumber) : a.invoiceNumber.localeCompare(b.invoiceNumber);
    });
  }, [salesInvoices, period, searchQuery, dateSortOrder]);

  // Aggregate Key Profit & Loss Metrics
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscounts = 0;
    let totalItemsCount = 0;

    filteredSalesInvoices.forEach(inv => {
      totalRevenue += inv.finalAmount;
      totalDiscounts += inv.discount || 0;
      inv.items.forEach(it => {
        const cost = it.totalPurchaseCost || (it.totalPieces * (it.unitPurchasePrice || 0));
        totalCost += cost;
        totalItemsCount += it.totalPieces || 0;
      });
    });

    const rawGrossProfit = totalRevenue - totalCost;

    // Customer returns deduction logic
    const periodCustomerReturns = (productReturns || []).filter(r => r.type === 'from_customer' && isDateInPeriod(r.date, period));
    let totalCustomerReturnsRevenue = 0;
    let totalCustomerReturnsCost = 0;
    let totalCustomerReturnsProfit = 0;

    periodCustomerReturns.forEach(r => {
      const prod = products.find(p => p.id === r.productId || p.name?.trim().toLowerCase() === r.productName?.trim().toLowerCase());
      const costPerUnit = prod && prod.purchasePrice > 0 ? Number(prod.purchasePrice) : (r.unitPrice * 0.85);
      const totalCostVal = r.totalPieces * costPerUnit;
      const netReturnVal = getNetReturnAmount(r);
      const profitVal = Math.max(0, netReturnVal - totalCostVal);

      totalCustomerReturnsRevenue += netReturnVal;
      totalCustomerReturnsCost += totalCostVal;
      totalCustomerReturnsProfit += profitVal;
    });

    // Operational expenses
    const periodExpenses = (treasuryTransactions || []).filter(t => t.type === 'expense' && isDateInPeriod(t.date, period));
    const totalOperationalExpenses = periodExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Net gross profit after deducting returns profit
    const totalGrossProfit = Math.max(0, rawGrossProfit - totalCustomerReturnsProfit);
    const netOperatingProfit = totalGrossProfit - totalOperationalExpenses;

    const overallMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;
    const avgProfitPerInvoice = filteredSalesInvoices.length > 0 ? totalGrossProfit / filteredSalesInvoices.length : 0;
    const avgProfitPerItem = totalItemsCount > 0 ? totalGrossProfit / totalItemsCount : 0;

    return {
      totalRevenue,
      totalCost,
      rawGrossProfit,
      totalCustomerReturnsRevenue,
      totalCustomerReturnsCost,
      totalCustomerReturnsProfit,
      totalCustomerReturnsCount: periodCustomerReturns.length,
      totalOperationalExpenses,
      netOperatingProfit,
      totalGrossProfit,
      overallMargin,
      totalDiscounts,
      totalItemsCount,
      invoicesCount: filteredSalesInvoices.length,
      avgProfitPerInvoice,
      avgProfitPerItem,
    };
  }, [filteredSalesInvoices, productReturns, treasuryTransactions, period, products]);

  // Product profitability breakdown
  const productProfitability = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      category: string;
      totalPiecesSold: number;
      piecesPerCarton: number;
      totalRevenue: number;
      totalCost: number;
      profit: number;
      margin: number;
    }>();

    filteredSalesInvoices.forEach(inv => {
      inv.items.forEach(it => {
        const key = it.productId || it.productName;
        const matchingProduct = products.find(p => (it.productId && p.id === it.productId) || p.name.trim() === it.productName?.trim());
        const totalPieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));
        const rev = (it.totalPrice !== undefined && it.totalPrice > 0) ? it.totalPrice : (totalPieces * (it.unitSellingPrice || 0));
        const unitCost = (matchingProduct?.purchasePrice && matchingProduct.purchasePrice > 0)
          ? matchingProduct.purchasePrice
          : ((it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0) ? it.unitPurchasePrice : 0);
        const cost = (it.totalPurchaseCost !== undefined && it.totalPurchaseCost > 0) ? it.totalPurchaseCost : (totalPieces * unitCost);
        const profit = rev - cost;

        const current = map.get(key) || {
          id: key,
          name: it.productName,
          category: it.category || 'متفرقه',
          totalPiecesSold: 0,
          piecesPerCarton: it.piecesPerCarton || matchingProduct?.piecesPerCarton || 1,
          totalRevenue: 0,
          totalCost: 0,
          profit: 0,
          margin: 0,
        };

        current.totalPiecesSold += totalPieces;
        current.totalRevenue += rev;
        current.totalCost += cost;
        current.profit += profit;

        map.set(key, current);
      });
    });

    const list = Array.from(map.values()).map(item => ({
      ...item,
      margin: item.totalRevenue > 0 ? (item.profit / item.totalRevenue) * 100 : 0
    }));

    return list.sort((a, b) => b.profit - a.profit);
  }, [filteredSalesInvoices]);

  // Customer profitability breakdown
  const customerProfitability = useMemo(() => {
    const map = new Map<string, {
      customerName: string;
      customerCity: string;
      invoicesCount: number;
      totalRevenue: number;
      totalCost: number;
      profit: number;
      margin: number;
    }>();

    filteredSalesInvoices.forEach(inv => {
      const key = inv.customerId || inv.customerName;
      const invRevenue = inv.finalAmount;
      const invCost = inv.items.reduce((s, it) => s + (it.totalPurchaseCost || (it.totalPieces * (it.unitPurchasePrice || 0))), 0);
      const invProfit = invRevenue - invCost;

      const current = map.get(key) || {
        customerName: inv.customerName,
        customerCity: inv.customerCity || '',
        invoicesCount: 0,
        totalRevenue: 0,
        totalCost: 0,
        profit: 0,
        margin: 0,
      };

      current.invoicesCount += 1;
      current.totalRevenue += invRevenue;
      current.totalCost += invCost;
      current.profit += invProfit;

      map.set(key, current);
    });

    const list = Array.from(map.values()).map(item => ({
      ...item,
      margin: item.totalRevenue > 0 ? (item.profit / item.totalRevenue) * 100 : 0
    }));

    return list.sort((a, b) => b.profit - a.profit);
  }, [filteredSalesInvoices]);

  // Purchase invoices profit & margin analysis
  const purchaseInvoicesProfitability = useMemo(() => {
    const rawPurchases = invoices.filter(inv => inv.type === 'purchase' && !inv.isDraft);

    return rawPurchases.filter(inv => {
      if (!isDateInPeriod(inv.date, period)) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchNumber = inv.invoiceNumber?.toLowerCase().includes(query);
        const matchCustomer = inv.customerName?.toLowerCase().includes(query);
        const matchItem = inv.items?.some(it => it.productName?.toLowerCase().includes(query));
        if (!matchNumber && !matchCustomer && !matchItem) return false;
      }
      return true;
    }).map(inv => {
      let calcPurchaseCost = 0;
      let calcProjectedSales = 0;

      inv.items.forEach(it => {
        const matchingProduct = getMatchingProduct(it.productId, it.productName);
        const totalPieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));

        let unitCost = 0;
        if (matchingProduct && matchingProduct.purchasePrice > 0) {
          unitCost = matchingProduct.purchasePrice;
        } else if (it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0) {
          unitCost = it.unitPurchasePrice;
        } else if (it.totalPurchaseCost && it.totalPurchaseCost > 0 && totalPieces > 0) {
          unitCost = Math.round(it.totalPurchaseCost / totalPieces);
        } else {
          unitCost = it.unitSellingPrice || 0;
        }

        let unitSell = 0;
        if (matchingProduct && matchingProduct.sellingPrice > 0) {
          unitSell = matchingProduct.sellingPrice;
        } else if (it.unitSellingPrice !== undefined && it.unitSellingPrice > unitCost) {
          unitSell = it.unitSellingPrice;
        } else if (unitCost > 0) {
          unitSell = Math.round(unitCost * 1.25);
        } else {
          unitSell = it.unitSellingPrice || 0;
        }

        calcPurchaseCost += totalPieces * unitCost;
        calcProjectedSales += totalPieces * unitSell;
      });

      const totalPurchaseCost = calcPurchaseCost > 0 ? calcPurchaseCost : (inv.finalAmount || inv.totalAmount || 0);
      const totalProjectedSalesValue = calcProjectedSales;
      const projectedProfit = totalProjectedSalesValue - totalPurchaseCost;
      const projectedMargin = totalProjectedSalesValue > 0 ? (projectedProfit / totalProjectedSalesValue) * 100 : 0;
      const markupPercentage = totalPurchaseCost > 0 ? (projectedProfit / totalPurchaseCost) * 100 : 0;

      return {
        ...inv,
        totalPurchaseCost,
        totalProjectedSalesValue,
        projectedProfit,
        projectedMargin,
        markupPercentage
      };
    }).sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return dateSortOrder === 'desc' ? cmp : -cmp;
      return dateSortOrder === 'desc' ? b.invoiceNumber.localeCompare(a.invoiceNumber) : a.invoiceNumber.localeCompare(b.invoiceNumber);
    });
  }, [invoices, products, period, searchQuery, dateSortOrder]);

  // Determine current dataset and pagination slice
  const currentDatasetLength = useMemo(() => {
    if (activeTab === 'invoices') return filteredSalesInvoices.length;
    if (activeTab === 'purchases') return purchaseInvoicesProfitability.length;
    if (activeTab === 'products') return productProfitability.length;
    if (activeTab === 'customers') return customerProfitability.length;
    return 0;
  }, [activeTab, filteredSalesInvoices.length, purchaseInvoicesProfitability.length, productProfitability.length, customerProfitability.length]);

  const totalPages = Math.ceil(currentDatasetLength / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedSalesInvoices = useMemo(() => {
    return filteredSalesInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSalesInvoices, startIndex, itemsPerPage]);

  const paginatedPurchaseInvoices = useMemo(() => {
    return purchaseInvoicesProfitability.slice(startIndex, startIndex + itemsPerPage);
  }, [purchaseInvoicesProfitability, startIndex, itemsPerPage]);

  const paginatedProducts = useMemo(() => {
    return productProfitability.slice(startIndex, startIndex + itemsPerPage);
  }, [productProfitability, startIndex, itemsPerPage]);

  const paginatedCustomers = useMemo(() => {
    return customerProfitability.slice(startIndex, startIndex + itemsPerPage);
  }, [customerProfitability, startIndex, itemsPerPage]);

  // -------------------------------------------------------------------------
  // INLINE INVOICE DETAIL VIEW (Replacing modal popup)
  // -------------------------------------------------------------------------
  if (selectedInvoiceForDetail) {
    const inv = selectedInvoiceForDetail;
    const isPurchase = inv.type === 'purchase';

    // Analyzed items
    const analyzedItems = inv.items.map((it, idx) => {
      const matchingProduct = getMatchingProduct(it.productId, it.productName);
      const totalPieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));

      let unitCost = 0;
      let unitSell = 0;

      if (isPurchase) {
        // PURCHASE INVOICE:
        // 1. Purchase cost per unit paid (linked to product catalog purchasePrice)
        if (matchingProduct && matchingProduct.purchasePrice > 0) {
          unitCost = matchingProduct.purchasePrice;
        } else if (it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0) {
          unitCost = it.unitPurchasePrice;
        } else if (it.totalPurchaseCost && it.totalPurchaseCost > 0 && totalPieces > 0) {
          unitCost = Math.round(it.totalPurchaseCost / totalPieces);
        } else {
          unitCost = it.unitSellingPrice || 0;
        }

        // 2. Selling price per unit (true sales price in warehouse/inventory)
        if (matchingProduct && matchingProduct.sellingPrice > 0) {
          unitSell = matchingProduct.sellingPrice;
        } else if (it.unitSellingPrice !== undefined && it.unitSellingPrice > unitCost) {
          unitSell = it.unitSellingPrice;
        } else if (unitCost > 0) {
          unitSell = Math.round(unitCost * 1.25);
        } else {
          unitSell = it.unitSellingPrice || 0;
        }
      } else {
        // SALES INVOICE:
        unitCost = (matchingProduct && matchingProduct.purchasePrice > 0)
          ? matchingProduct.purchasePrice
          : ((it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0) ? it.unitPurchasePrice : 0);

        unitSell = (it.unitSellingPrice !== undefined && it.unitSellingPrice > 0)
          ? it.unitSellingPrice
          : (totalPieces > 0 && it.totalPrice ? (it.totalPrice / totalPieces) : (matchingProduct?.sellingPrice || 0));
      }

      // ROW TOTALS:
      // For purchase: rowCost = totalPieces * unitCost (what was paid to buy)
      // rowRevenue = totalPieces * unitSell (projected gross revenue when sold)
      const rowCost = isPurchase
        ? (totalPieces * unitCost)
        : ((it.totalPurchaseCost !== undefined && it.totalPurchaseCost > 0) ? it.totalPurchaseCost : (totalPieces * unitCost));

      const rowRevenue = isPurchase
        ? (totalPieces * unitSell)
        : ((it.totalPrice !== undefined && it.totalPrice > 0) ? it.totalPrice : (totalPieces * unitSell));

      const rowProfit = rowRevenue - rowCost;
      const profitPerPiece = totalPieces > 0 ? (unitSell - unitCost) : 0;
      const margin = isPurchase
        ? (rowCost > 0 ? (rowProfit / rowCost) * 100 : 0) // Markup % on purchase cost
        : (rowRevenue > 0 ? (rowProfit / rowRevenue) * 100 : 0); // Margin % on revenue

      let tier: 'high' | 'medium' | 'low' = 'medium';
      let tierTitle = 'سود استاندارد';
      let tierBadge = 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';

      if (margin >= 18) {
        tier = 'high';
        tierTitle = isPurchase ? 'سود پیش‌بینی شده عالی' : 'سود طلایی (عالی)';
        tierBadge = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      } else if (margin < 10) {
        tier = 'low';
        tierTitle = 'سود کم / سربه‌سر';
        tierBadge = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      }

      // Carton description text
      const cartonParts: string[] = [];
      if (it.cartonsCount > 0) {
        cartonParts.push(`${toPersianDigits(it.cartonsCount)} کارتن`);
      }
      if (it.extraPieces > 0) {
        cartonParts.push(`${toPersianDigits(it.extraPieces)} عدد اضافه`);
      }
      if (cartonParts.length === 0) {
        cartonParts.push(`${toPersianDigits(totalPieces)} عدد`);
      }
      const packagingSpec = formatProductPackagingSpec(it);
      const cartonFullText = packagingSpec ? `${cartonParts.join(' و ')} (${packagingSpec})` : cartonParts.join(' و ');

      return {
        ...it,
        idx,
        totalPieces,
        unitSell,
        unitCost,
        rowRevenue,
        rowCost,
        rowProfit,
        profitPerPiece,
        margin,
        tier,
        tierTitle,
        tierBadge,
        cartonFullText
      };
    });

    const totalCost = analyzedItems.reduce((sum, it) => sum + it.rowCost, 0);
    const totalRev = isPurchase
      ? analyzedItems.reduce((sum, it) => sum + it.rowRevenue, 0)
      : (inv.finalAmount || analyzedItems.reduce((sum, it) => sum + it.rowRevenue, 0));

    const totalProfit = totalRev - totalCost;
    const overallMargin = isPurchase
      ? (totalCost > 0 ? (totalProfit / totalCost) * 100 : 0)
      : (totalRev > 0 ? (totalProfit / totalRev) * 100 : 0);

    const displayedItems = analyzedItems.filter(item => {
      if (detailItemFilter === 'all') return true;
      return item.tier === detailItemFilter;
    });

    const highCount = analyzedItems.filter(i => i.tier === 'high').length;
    const mediumCount = analyzedItems.filter(i => i.tier === 'medium').length;
    const lowCount = analyzedItems.filter(i => i.tier === 'low').length;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4"
      >
        {/* Top Return Nav & Invoice Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:shadow-md">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedInvoiceForDetail(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-black border border-slate-200/80 dark:border-slate-700 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>بازگشت به گزارشات</span>
            </motion.button>

            <div className="border-r border-slate-200 dark:border-slate-800 pr-3 mr-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isPurchase ? `ریز سود تخمینی فاکتور ورود کالا #${toPersianDigits(inv.invoiceNumber)}` : `ریز سود اقلام فاکتور #${toPersianDigits(inv.invoiceNumber)}`}
                </h2>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-black text-[11px] border border-slate-200/70 dark:border-slate-700">
                  {toPersianDigits(inv.items.length)} قلم کالا
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                {isPurchase ? 'تأمین‌کننده / فروشنده:' : 'خریدار:'} <strong className="text-slate-900 dark:text-slate-200 font-black">{inv.customerName}</strong> {inv.customerCity ? `(${inv.customerCity})` : ''} • تاریخ: {toPersianDigits(inv.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewInvoice(inv)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs shadow-xs transition-all cursor-pointer`}
            >
              <FileText className="w-4 h-4" />
              <span>نمایش برگه فاکتور</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-2xs"
              title="چاپ"
            >
              <Printer className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* Invoice Summary 4-Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all space-y-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isPurchase ? 'ارزش تخمینی کل فروش کالا' : 'جمع کل فروش فاکتور'}
            </span>
            <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white block dir-ltr text-right">
              {isSecretMode ? '••••••' : formatPrice(totalRev)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all space-y-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isPurchase ? 'بهای خرید کل فاکتور ورودی' : 'بهای خرید اقلام (هزینه)'}
            </span>
            <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white block dir-ltr text-right">
              {isSecretMode ? '••••••' : formatPrice(totalCost)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all space-y-1.5">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {isPurchase ? 'سود پیش‌بینی شده کل فاکتور' : 'سود خالص کل فاکتور'}
            </span>
            <span className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 block dir-ltr text-right">
              {isSecretMode ? '••••••' : `+${formatPrice(totalProfit)}`}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all space-y-1.5">
            <span className={`text-xs font-bold ${theme.primaryText}`}>
              {isPurchase ? 'ضریب سود بر خرید (مارک‌آپ)' : 'حاشیه سود میانگین'}
            </span>
            <span className={`text-base sm:text-xl font-black ${theme.primaryText} block dir-ltr text-right`}>
              {isSecretMode ? '••٪' : `${toPersianDigits(overallMargin.toFixed(1))}٪`}
            </span>
          </div>
        </div>

        {/* Filter Tier Tabs for Invoice Items */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setDetailItemFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                detailItemFilter === 'all'
                  ? `${theme.primary} text-white font-black shadow-xs`
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              همه اقلام ({toPersianDigits(analyzedItems.length)})
            </button>
            <button
              onClick={() => setDetailItemFilter('high')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                detailItemFilter === 'high'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              سود طلایی ({toPersianDigits(highCount)})
            </button>
            <button
              onClick={() => setDetailItemFilter('medium')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                detailItemFilter === 'medium'
                  ? `${theme.primary} text-white font-black shadow-xs`
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              سود استاندارد ({toPersianDigits(mediumCount)})
            </button>
            <button
              onClick={() => setDetailItemFilter('low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                detailItemFilter === 'low'
                  ? 'bg-amber-600 text-white font-black shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              سود کم / سربه‌سر ({toPersianDigits(lowCount)})
            </button>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            تفکیک بر حسب تعداد کل، کارتن و حاشیه سود هر سطر
          </span>
        </div>

        {/* Detailed Items Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-300 font-black">
                <tr>
                  <th className="p-3.5 text-center w-12">ردیف</th>
                  <th className="p-3.5">شرح کالا و بسته‌بندی</th>
                  <th className="p-3.5 text-center">تعداد کل</th>
                  <th className="p-3.5 text-left">قیمت خرید واحد</th>
                  <th className="p-3.5 text-left">{isPurchase ? 'قیمت فروش کالا' : 'قیمت فروش واحد'}</th>
                  <th className="p-3.5 text-left">{isPurchase ? 'بهای کل خرید (هزینه)' : 'بهای کل خرید'}</th>
                  <th className="p-3.5 text-left">{isPurchase ? 'ارزش کل فروش تخمینی' : 'مبلغ کل فروش'}</th>
                  <th className="p-3.5 text-left">سود هر عدد</th>
                  <th className="p-3.5 text-left">{isPurchase ? 'سود پیش‌بینی سطر' : 'سود کل سطر'}</th>
                  <th className="p-3.5 text-center">{isPurchase ? 'مارک‌آپ سود' : 'حاشیه سود'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-bold">
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400">
                      کالایی در این فیلتر سود یافت نشد.
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((it, itIdx) => (
                    <tr key={`profit-item-${it.id || 'row'}-${it.idx}-${itIdx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 text-center font-bold text-slate-400">
                        {toPersianDigits(it.idx + 1)}
                      </td>
                      <td className="p-3.5 font-black text-slate-900 dark:text-white">
                        <div className="text-xs">{it.productName}</div>
                        <div className={`text-[11px] ${theme.primaryText} font-bold mt-0.5 flex items-center gap-1`}>
                          <Boxes className="w-3.5 h-3.5 shrink-0" />
                          <span>{it.cartonFullText}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        {toPersianDigits(it.totalPieces.toLocaleString())} {it.unitTitle || 'عدد'}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium text-left dir-ltr">
                        {isSecretMode ? '••••' : formatPrice(it.unitCost)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white text-left dir-ltr">
                        {isSecretMode ? '••••' : formatPrice(it.unitSell)}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium text-left dir-ltr">
                        {isSecretMode ? '••••••' : formatPrice(it.rowCost)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white text-left dir-ltr">
                        {isSecretMode ? '••••••' : formatPrice(it.rowRevenue)}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                        {isSecretMode ? '••••' : `+${formatPrice(it.profitPerPiece)}`}
                      </td>
                      <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                        {isSecretMode ? '••••••' : `+${formatPrice(it.rowProfit)}`}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-md font-black text-[11px] border ${it.tierBadge}`}>
                          {isSecretMode ? '••٪' : `${toPersianDigits(it.margin.toFixed(1))}٪`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  }

  // -------------------------------------------------------------------------
  // MAIN PROFIT & LOSS HUB
  // -------------------------------------------------------------------------
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4">
      
      {/* 1. Header Banner & Period Controls */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-5 transition-all no-print"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} text-xs font-black border ${theme.borderColor} shadow-2xs`}>
              <Scale className="w-3.5 h-3.5" />
              <span>واحد نظارت مالی و سودآوری بازرگانی</span>
            </span>
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{toPersianDigits(filteredSalesInvoices.length)} فاکتور در بازه انتخابی</span>
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
              <Scale className="w-5 h-5" />
            </div>
            <span>تحلیل سود و زیان و حاشیه سود بازرگانی</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
            محاسبه دقیق حاشیه سود اقلام، بهای تمام‌شده خرید، سود حاصل از مشتریان و دسته‌بندی کالاهای سودده
          </p>
        </div>

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 shrink-0">
          {onToggleSecretMode && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onToggleSecretMode}
              className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-2xs ${
                isSecretMode
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isSecretMode ? <EyeOff className="w-4 h-4 text-amber-500 shrink-0" /> : <Eye className="w-4 h-4 text-emerald-500 shrink-0" />}
              <span>{isSecretMode ? 'حالت محرمانه' : 'نمایش ارقام'}</span>
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
            <span>چاپ گزارش</span>
          </motion.button>
        </div>
      </motion.div>

      {/* 2. Period Filter Tabs & Search Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3.5 transition-all hover:shadow-md no-print"
      >
        {/* Search & Sort Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی شماره فاکتور، مشتری یا نام کالا..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 rounded-xl text-xs font-bold focus:outline-none shadow-2xs ${theme.ring}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDateSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer shadow-2xs shrink-0 select-none ${
              dateSortOrder === 'desc'
                ? 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
            }`}
            title="تغییر ترتیب مرتب‌سازی تاریخ (جدیدترین به قدیمی‌ترین / بالعکس)"
          >
            {dateSortOrder === 'desc' ? (
              <>
                <ArrowDownWideNarrow className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>جدیدترین به اول</span>
              </>
            ) : (
              <>
                <ArrowUpNarrowWide className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>قدیمی‌ترین به اول</span>
              </>
            )}
          </button>
        </div>

        {/* Time Periods (day, week, month, 3months, 6months, 1year, all) */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto bg-slate-100/80 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          {[
            { id: 'all', label: 'همه دوران' },
            { id: 'today', label: 'امروز' },
            { id: 'week', label: 'هفتگی (۷ روز)' },
            { id: 'month', label: '۳۰ روزه (ماهیانه)' },
            { id: '3months', label: '۳ ماهه (۹۰ روز)' },
            { id: '6months', label: '۶ ماهه (۱۸۰ روز)' },
            { id: '1year', label: '۱ ساله (۳۶۵ روز)' },
          ].map((item) => {
            const isSelected = period === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectPeriod(item.id as TimePeriodFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? `${theme.primary} text-white font-black shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* 3. Executive Profit Metric Cards - Rounded-3xl Style like ReturnsManager */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
        
        {/* Card 1: سود ناخالص کل */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">سود ناخالص کل (ریالی)</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-3 dir-ltr text-right">
            {isSecretMode ? '••••••' : formatPrice(summaryMetrics.totalGrossProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>حاشیه سود کل دوره:</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 dir-ltr font-mono">
              {isSecretMode ? '••٪' : `${toPersianDigits(summaryMetrics.overallMargin.toFixed(1))}٪`}
            </span>
          </div>
        </motion.div>

        {/* Card 2: کل گردش فروش */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-blue-200/70 dark:border-blue-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">مجموع فروش ناخالص</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {isSecretMode ? '••••••' : formatPrice(summaryMetrics.totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>{toPersianDigits(summaryMetrics.invoicesCount)} فقره فاکتور</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold font-mono">{toPersianDigits(summaryMetrics.totalItemsCount)} قلم کالا</span>
          </div>
        </motion.div>

        {/* Card 3: بهای تمام‌شده خرید کالاها */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-200/70 dark:border-amber-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">بهای تمام‌شده خرید (COGS)</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800">
              <Package className="w-4 h-4" />
            </div>
          </div>

          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {isSecretMode ? '••••••' : formatPrice(summaryMetrics.totalCost)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>سهم تأمین از فروش:</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">
              {isSecretMode ? '••٪' : `${toPersianDigits(((summaryMetrics.totalCost / (summaryMetrics.totalRevenue || 1)) * 100).toFixed(0))}٪`}
            </span>
          </div>
        </motion.div>

        {/* Card 4: میانگین بازدهی فاکتور */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-indigo-200/70 dark:border-indigo-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">میانگین سود هر فاکتور</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {isSecretMode ? '••••••' : formatPrice(summaryMetrics.avgProfitPerInvoice)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>میانگین سود هر قلم:</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">
              {isSecretMode ? '••••' : formatPrice(summaryMetrics.avgProfitPerItem)}
            </span>
          </div>
        </motion.div>

      </div>

      {/* 3.5. Returns & Operational Audit Strip */}
      {(summaryMetrics.totalCustomerReturnsProfit > 0 || summaryMetrics.totalOperationalExpenses > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 transition-colors no-print shadow-2xs"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-300 dark:border-amber-800 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    حسابرسی خالص سود پس از کسر مرجوعی‌ها و هزینه‌ها
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                    تعدیل خودکار سود
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                  مطابق اصول حسابداری، سود حاصل از کالاهای مرجوع شده از سود ناخالص فروش اولیه کسر شده است.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-xs">
              <div>
                <div className="text-[10px] text-slate-500 font-bold">سود ناخالص اولیه:</div>
                <div className="font-bold text-slate-900 dark:text-white dir-ltr text-right">
                  {isSecretMode ? '••••••' : formatPrice(summaryMetrics.rawGrossProfit)}
                </div>
              </div>
              <div className="text-slate-300 dark:text-slate-700 font-black">−</div>
              <div>
                <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">کسر سود مرجوعی مشتری:</div>
                <div className="font-black text-rose-600 dark:text-rose-400 dir-ltr text-right">
                  {isSecretMode ? '••••••' : `−${formatPrice(summaryMetrics.totalCustomerReturnsProfit)}`}
                </div>
              </div>
              {summaryMetrics.totalOperationalExpenses > 0 && (
                <>
                  <div className="text-slate-300 dark:text-slate-700 font-black">−</div>
                  <div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">هزینه‌های جاری عملیاتی:</div>
                    <div className="font-black text-amber-600 dark:text-amber-400 dir-ltr text-right">
                      {isSecretMode ? '••••••' : `−${formatPrice(summaryMetrics.totalOperationalExpenses)}`}
                    </div>
                  </div>
                </>
              )}
              <div className="text-slate-300 dark:text-slate-700 font-black">=</div>
              <div className="border-r border-slate-200 dark:border-slate-800 pr-3">
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">سود خالص نهایی:</div>
                <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm dir-ltr text-right">
                  {isSecretMode ? '••••••' : formatPrice(summaryMetrics.netOperatingProfit)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. Tab Switcher (Invoices / Products / Customers / Purchases) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.28 }}
        className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/90 dark:border-slate-800 w-full sm:w-fit no-print shadow-2xs"
      >
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>سود و زیان فاکتور فروش ({toPersianDigits(filteredSalesInvoices.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'purchases'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>سود فاکتور خرید و ورود کالا ({toPersianDigits(purchaseInvoicesProfitability.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'products'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>رتبه‌بندی محصولات ({toPersianDigits(productProfitability.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'customers'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>سودآوری خریداران ({toPersianDigits(customerProfitability.length)})</span>
        </button>
      </motion.div>

      {/* 5. Main Content Area Based on Active Tab */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden transition-all hover:shadow-md"
      >
        
        {/* TAB 1: SALES INVOICES PROFITABILITY */}
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-300 font-black">
                <tr>
                  <th className="p-3.5">شماره فاکتور</th>
                  <th 
                    className="p-3.5 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    onClick={() => setDateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title="کلیک برای تغییر مرتب‌سازی تاریخ (جدیدترین / قدیمی‌ترین)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>تاریخ صدور</span>
                      {dateSortOrder === 'desc' ? (
                        <ArrowDownWideNarrow className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpNarrowWide className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </th>
                  <th className="p-3.5">نام خریدار / شرکت</th>
                  <th className="p-3.5 text-left">مبلغ کل فاکتور</th>
                  <th className="p-3.5 text-left">بهای خرید (هزینه)</th>
                  <th className="p-3.5 text-left">سود خالص فاکتور</th>
                  <th className="p-3.5 text-center">حاشیه سود</th>
                  <th className="p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {paginatedSalesInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-bold">
                      هیچ فاکتور فروشی با شرایط فیلتر انتخاب شده یافت نشد.
                    </td>
                  </tr>
                ) : (
                  paginatedSalesInvoices.map((inv, idx) => {
                    const invCost = inv.items.reduce((sum, it) => sum + (it.totalPurchaseCost || (it.totalPieces * (it.unitPurchasePrice || 0))), 0);
                    const invRevenue = inv.finalAmount;
                    const invProfit = invRevenue - invCost;
                    const invMargin = invRevenue > 0 ? (invProfit / invRevenue) * 100 : 0;

                    return (
                      <tr key={`profit-sales-inv-${inv.id || idx}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5 font-black">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono font-black text-slate-900 dark:text-white border border-slate-200/60 dark:border-slate-700">
                            #{toPersianDigits(inv.invoiceNumber)}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-bold">
                          {toPersianDigits(inv.date)}
                        </td>
                        <td className="p-3.5 font-black text-slate-900 dark:text-white">
                          <div>{inv.customerName}</div>
                          {inv.customerCity && (
                            <span className="text-[10px] text-slate-500 font-medium">{inv.customerCity}</span>
                          )}
                        </td>
                        <td className="p-3.5 font-black text-slate-900 dark:text-white text-left dir-ltr">
                          {formatPrice(invRevenue)}
                        </td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-400 font-bold text-left dir-ltr">
                          {isSecretMode ? '••••••' : formatPrice(invCost)}
                        </td>
                        <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                          {isSecretMode ? '••••••' : `+${formatPrice(invProfit)}`}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[11px] border border-emerald-200 dark:border-emerald-800">
                            {isSecretMode ? '••٪' : `${toPersianDigits(invMargin.toFixed(1))}٪`}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedInvoiceForDetail(inv)}
                              className={`px-3 py-1.5 ${theme.primaryLight} ${theme.primaryText} hover:opacity-85 rounded-xl text-xs font-black transition-all cursor-pointer border ${theme.borderColor} shadow-2xs`}
                              title="مشاهده ریز سود اقلام در همین صفحه"
                            >
                              ریز سود اقلام
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onViewInvoice(inv)}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                              title="مشاهده فاکتور کامل"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: PURCHASE INVOICES PROFITABILITY */}
        {activeTab === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-300 font-black">
                <tr>
                  <th className="p-3.5">شماره فاکتور خرید</th>
                  <th 
                    className="p-3.5 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                    onClick={() => setDateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title="کلیک برای تغییر مرتب‌سازی تاریخ (جدیدترین / قدیمی‌ترین)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>تاریخ ورود</span>
                      {dateSortOrder === 'desc' ? (
                        <ArrowDownWideNarrow className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpNarrowWide className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </th>
                  <th className="p-3.5">تأمین‌کننده / انبار</th>
                  <th className="p-3.5 text-left">بهای تمام‌شده خرید</th>
                  <th className="p-3.5 text-left">ارزش تخمینی فروش</th>
                  <th className="p-3.5 text-left">سود پیش‌بینی شده</th>
                  <th className="p-3.5 text-center">ضریب مارک‌آپ (سود ٪)</th>
                  <th className="p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {paginatedPurchaseInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-bold">
                      هیچ فاکتور ورودی کالا در این بازه یافت نشد.
                    </td>
                  </tr>
                ) : (
                  paginatedPurchaseInvoices.map((inv, idx) => (
                    <tr key={`profit-pur-inv-${inv.id || idx}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-black">
                        <span className="px-2.5 py-1 bg-amber-100/70 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 rounded-lg text-xs font-mono font-black border border-amber-200/80 dark:border-amber-800">
                          #{toPersianDigits(inv.invoiceNumber)}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-bold">
                        {toPersianDigits(inv.date)}
                      </td>
                      <td className="p-3.5 font-black text-slate-900 dark:text-white">
                        <div>{inv.customerName}</div>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">ورود به انبار اصلی</span>
                      </td>
                      <td className="p-3.5 font-black text-slate-900 dark:text-white text-left dir-ltr">
                        {isSecretMode ? '••••••' : formatPrice(inv.totalPurchaseCost)}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-400 font-bold text-left dir-ltr">
                        {isSecretMode ? '••••••' : formatPrice(inv.totalProjectedSalesValue)}
                      </td>
                      <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                        {isSecretMode ? '••••••' : `+${formatPrice(inv.projectedProfit)}`}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[11px] border border-emerald-200 dark:border-emerald-800">
                          {isSecretMode ? '••٪' : `+${toPersianDigits(inv.markupPercentage.toFixed(1))}٪`}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedInvoiceForDetail(inv)}
                            className="px-3 py-1.5 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 hover:opacity-85 rounded-xl text-xs font-black transition-all cursor-pointer border border-amber-300 dark:border-amber-800 shadow-2xs"
                            title="مشاهده ریز سود اقلام در همین صفحه"
                          >
                            محاسبه دقیق اقلام
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onViewInvoice(inv)}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                            title="مشاهده فاکتور خرید"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: PRODUCTS PROFITABILITY */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-300 font-black">
                <tr>
                  <th className="p-3.5">رتبه</th>
                  <th className="p-3.5">نام محصول / کالا</th>
                  <th className="p-3.5">دسته‌بندی</th>
                  <th className="p-3.5 text-center">تعداد فروش رفته</th>
                  <th className="p-3.5 text-left">کل بهای خرید (هزینه)</th>
                  <th className="p-3.5 text-left">کل مبلغ فروش</th>
                  <th className="p-3.5 text-left">سود ناخالص محصول</th>
                  <th className="p-3.5 text-center">حاشیه سود ٪</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {paginatedProducts.map((p, idx) => (
                  <tr key={`profit-prod-${p.id || p.name || idx}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5 font-black text-slate-500 dark:text-slate-400">
                      #{toPersianDigits(startIndex + idx + 1)}
                    </td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white">
                      <div>{p.name}</div>
                      <div className={`text-[11px] ${theme.primaryText} font-black mt-0.5 flex items-center gap-1`}>
                        <Boxes className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatCartonText(p.totalPiecesSold, p.piecesPerCarton)}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400 font-bold">
                      {p.category}
                    </td>
                    <td className="p-3.5 text-center font-black text-slate-900 dark:text-white">
                      {toPersianDigits(p.totalPiecesSold.toLocaleString())} عدد
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-400 font-bold text-left dir-ltr">
                      {isSecretMode ? '••••••' : formatPrice(p.totalCost)}
                    </td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white text-left dir-ltr">
                      {formatPrice(p.totalRevenue)}
                    </td>
                    <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                      {isSecretMode ? '••••••' : `+${formatPrice(p.profit)}`}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[11px] border border-emerald-200 dark:border-emerald-800">
                        {isSecretMode ? '••٪' : `${toPersianDigits(p.margin.toFixed(1))}٪`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: CUSTOMERS PROFITABILITY */}
        {activeTab === 'customers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-300 font-black">
                <tr>
                  <th className="p-3.5">رتبه</th>
                  <th className="p-3.5">نام مشتری / طرف‌حساب</th>
                  <th className="p-3.5">شهر / منطقه</th>
                  <th className="p-3.5 text-center">تعداد فاکتورها</th>
                  <th className="p-3.5 text-left">حجم کل خرید</th>
                  <th className="p-3.5 text-left">بهای تمام‌شده تأمین</th>
                  <th className="p-3.5 text-left">سود حاصل از مشتری</th>
                  <th className="p-3.5 text-center">حاشیه سود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {paginatedCustomers.map((c, idx) => (
                  <tr key={`profit-cust-${c.customerName || idx}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3.5 font-black text-slate-500 dark:text-slate-400">
                      #{toPersianDigits(startIndex + idx + 1)}
                    </td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white">
                      {c.customerName}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400 font-bold">
                      {c.customerCity || '—'}
                    </td>
                    <td className="p-3.5 text-center font-black text-slate-900 dark:text-white">
                      {toPersianDigits(c.invoicesCount)} فاکتور
                    </td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white text-left dir-ltr">
                      {formatPrice(c.totalRevenue)}
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-400 font-bold text-left dir-ltr">
                      {isSecretMode ? '••••••' : formatPrice(c.totalCost)}
                    </td>
                    <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                      {isSecretMode ? '••••••' : `+${formatPrice(c.profit)}`}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-[11px] border border-emerald-200 dark:border-emerald-800">
                        {isSecretMode ? '••٪' : `${toPersianDigits(c.margin.toFixed(1))}٪`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Global Unified Pagination Component for Profit/Loss Tables */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={currentDatasetLength}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          itemsPerPageOptions={[10, 20, 50, 100]}
          itemName="مورد"
          themeColor={settings.themeColor}
        />

      </motion.div>

    </div>
  );
};
