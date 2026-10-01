import React, { useState, useMemo } from 'react';
import { Invoice, Product, StoreSettings, ProductReturn } from '../types';
import { 
  formatPrice, 
  toPersianDigits, 
  formatProductPackagingSpec, 
  isDateInPeriod, 
  TimePeriodFilter, 
  getNetReturnAmount, 
  getSavedTimePeriod, 
  saveTimePeriod 
} from '../utils/formatters';
import { themes } from './ThemeConfig';
import { 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Search, 
  FileText, 
  Eye, 
  EyeOff, 
  ArrowUpRight, 
  Printer, 
  Package, 
  Users, 
  Sparkles, 
  X, 
  ArrowLeft, 
  Boxes, 
  Scale, 
  ArrowDownWideNarrow, 
  ArrowUpNarrowWide,
  Tag,
  Calculator,
  Truck
} from 'lucide-react';
import { Pagination } from './Pagination';
import { SortableTableHeader } from './SortableTableHeader';

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
  const [activeTab, setActiveTab] = useState<'invoices' | 'purchases' | 'products' | 'customers'>('invoices');
  const [detailItemFilter, setDetailItemFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');

  // Sorting state for Sales Invoices tab
  const [salesSortField, setSalesSortField] = useState<'invoiceNumber' | 'date' | 'customer' | 'amount' | 'cost' | 'profit' | 'margin'>('date');
  const [salesSortDirection, setSalesSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sorting state for Purchase Invoices tab
  const [purchaseSortField, setPurchaseSortField] = useState<'invoiceNumber' | 'date' | 'customer' | 'cost' | 'expenses' | 'projectedSales' | 'profit' | 'markup'>('date');
  const [purchaseSortDirection, setPurchaseSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sorting state for Products tab
  const [productSortField, setProductSortField] = useState<'index' | 'name' | 'category' | 'piecesSold' | 'cost' | 'revenue' | 'profit' | 'margin'>('profit');
  const [productSortDirection, setProductSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sorting state for Customers tab
  const [customerSortField, setCustomerSortField] = useState<'name' | 'city' | 'invoicesCount' | 'revenue' | 'cost' | 'profit' | 'margin'>('profit');
  const [customerSortDirection, setCustomerSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSalesSort = (field: 'invoiceNumber' | 'date' | 'customer' | 'amount' | 'cost' | 'profit' | 'margin') => {
    if (salesSortField === field) {
      setSalesSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSalesSortField(field);
      setSalesSortDirection('desc');
    }
  };

  const handlePurchaseSort = (field: 'invoiceNumber' | 'date' | 'customer' | 'cost' | 'expenses' | 'projectedSales' | 'profit' | 'markup') => {
    if (purchaseSortField === field) {
      setPurchaseSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setPurchaseSortField(field);
      setPurchaseSortDirection('desc');
    }
  };

  const handleProductSort = (field: 'index' | 'name' | 'category' | 'piecesSold' | 'cost' | 'revenue' | 'profit' | 'margin') => {
    if (productSortField === field) {
      setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setProductSortField(field);
      setProductSortDirection('desc');
    }
  };

  const handleCustomerSort = (field: 'name' | 'city' | 'invoicesCount' | 'revenue' | 'cost' | 'profit' | 'margin') => {
    if (customerSortField === field) {
      setCustomerSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCustomerSortField(field);
      setCustomerSortDirection('desc');
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

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

  // Helper to get effective discounted purchase price for any product/item
  const getProductDiscountedPurchasePrice = (productId?: string, productName?: string, fallbackPrice: number = 0) => {
    const matchingProduct = getMatchingProduct(productId, productName);
    let basePrice = (matchingProduct && matchingProduct.purchasePrice > 0) ? matchingProduct.purchasePrice : fallbackPrice;

    // Search purchase invoices for the exact acquisition cost including any supplier invoice discount
    const purchaseInvs = invoices.filter(inv => inv.type === 'purchase' && !inv.isDraft && inv.items);
    // Sort to inspect latest purchase invoices first
    const sortedPurchases = [...purchaseInvs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    for (const pInv of sortedPurchases) {
      const found = pInv.items.find(pi => 
        (productId && pi.productId === productId) || 
        (productName && pi.productName && pi.productName.trim().toLowerCase() === productName?.trim().toLowerCase())
      );
      if (found) {
        const hasDiscount = Boolean(pInv.hasDiscount || (pInv.discount && pInv.discount > 0));
        const grossSubtotal = (pInv.items || []).reduce((s, it) => s + (it.totalPrice || (it.totalPieces * (it.unitPurchasePrice || it.unitPrice || 0))), 0);
        const discountPercent = pInv.discountPercent || (grossSubtotal > 0 && pInv.discount ? (pInv.discount / grossSubtotal) * 100 : 0);
        
        let rawUnitCost = found.unitPurchasePrice || (found.totalPieces > 0 && found.totalPurchaseCost ? Math.round(found.totalPurchaseCost / found.totalPieces) : (found.unitPrice || 0));
        if (rawUnitCost > 0) {
          if (hasDiscount && discountPercent > 0) {
            return Math.round(rawUnitCost * (1 - (discountPercent / 100)));
          }
          return rawUnitCost;
        }
      }
    }

    return basePrice;
  };

  // Reset pagination on tab, period, search or sort change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, period, searchQuery, dateSortOrder, salesSortField, salesSortDirection, purchaseSortField, purchaseSortDirection, productSortField, productSortDirection]);

  // Finalized sales invoices
  const salesInvoices = useMemo(() => {
    return invoices.filter(inv => inv.type === 'sale' && !inv.isDraft);
  }, [invoices]);

  // Filtered sales invoices by period & search query and sorted by any column
  const filteredSalesInvoices = useMemo(() => {
    const list = salesInvoices.filter(inv => {
      if (!isDateInPeriod(inv.date, period)) return false;

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
      let cmp = 0;
      if (salesSortField === 'invoiceNumber') {
        cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      } else if (salesSortField === 'customer') {
        cmp = (a.customerName || '').localeCompare(b.customerName || '');
      } else if (salesSortField === 'amount') {
        cmp = (a.finalAmount || 0) - (b.finalAmount || 0);
      } else if (salesSortField === 'cost') {
        const aCost = a.items.reduce((s, it) => {
          const uCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
          return s + (it.totalPieces > 0 ? it.totalPieces * uCost : (it.totalPurchaseCost || 0));
        }, 0);
        const bCost = b.items.reduce((s, it) => {
          const uCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
          return s + (it.totalPieces > 0 ? it.totalPieces * uCost : (it.totalPurchaseCost || 0));
        }, 0);
        cmp = aCost - bCost;
      } else if (salesSortField === 'profit') {
        const aCost = a.items.reduce((s, it) => {
          const uCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
          return s + (it.totalPieces > 0 ? it.totalPieces * uCost : (it.totalPurchaseCost || 0));
        }, 0);
        const bCost = b.items.reduce((s, it) => {
          const uCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
          return s + (it.totalPieces > 0 ? it.totalPieces * uCost : (it.totalPurchaseCost || 0));
        }, 0);
        const aExp = (a.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const bExp = (b.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
        cmp = ((a.finalAmount || 0) - aCost - aExp) - ((b.finalAmount || 0) - bCost - bExp);
      } else if (salesSortField === 'margin') {
        const aCost = a.items.reduce((s, it) => {
          const uCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
          return s + (it.totalPieces > 0 ? it.totalPieces * uCost : (it.totalPurchaseCost || 0));
        }, 0);
        const bCost = b.items.reduce((s, it) => {
          const uCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
          return s + (it.totalPieces > 0 ? it.totalPieces * uCost : (it.totalPurchaseCost || 0));
        }, 0);
        const aMargin = a.finalAmount > 0 ? ((a.finalAmount - aCost) / a.finalAmount) : 0;
        const bMargin = b.finalAmount > 0 ? ((b.finalAmount - bCost) / b.finalAmount) : 0;
        cmp = aMargin - bMargin;
      } else {
        cmp = (a.date || '').localeCompare(b.date || '');
        if (cmp === 0) cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      }
      return salesSortDirection === 'desc' ? -cmp : cmp;
    });
  }, [salesInvoices, period, searchQuery, salesSortField, salesSortDirection]);

  // Purchase invoices (inward goods) with discount and expenses calculation
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
      let calcPurchaseCostGross = 0;
      let calcProjectedSales = 0;
      let totalItemsPieces = 0;

      inv.items.forEach(it => {
        const matchingProduct = getMatchingProduct(it.productId, it.productName);
        const totalPieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));
        totalItemsPieces += totalPieces;

        // Primary source of item cost is the invoice record itself
        let unitCost = 0;
        if (it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0) {
          unitCost = it.unitPurchasePrice;
        } else if (it.totalPurchaseCost && it.totalPurchaseCost > 0 && totalPieces > 0) {
          unitCost = Math.round(it.totalPurchaseCost / totalPieces);
        } else if (it.unitPrice && it.unitPrice > 0) {
          unitCost = it.unitPrice;
        } else if (it.totalPrice > 0 && totalPieces > 0) {
          unitCost = Math.round(it.totalPrice / totalPieces);
        } else if (matchingProduct && matchingProduct.purchasePrice > 0) {
          unitCost = matchingProduct.purchasePrice;
        } else {
          unitCost = it.unitSellingPrice || 0;
        }

        let unitSell = 0;
        if (it.unitSellingPrice !== undefined && it.unitSellingPrice > 0) {
          unitSell = it.unitSellingPrice;
        } else if (matchingProduct && matchingProduct.sellingPrice > 0) {
          unitSell = matchingProduct.sellingPrice;
        } else if (unitCost > 0) {
          unitSell = Math.round(unitCost * 1.25);
        } else {
          unitSell = it.unitSellingPrice || 0;
        }

        calcPurchaseCostGross += totalPieces * unitCost;
        calcProjectedSales += totalPieces * unitSell;
      });

      const itemsSumGross = (inv.items || []).reduce((s, it) => {
        if (it.totalPrice && it.totalPrice > 0) return s + it.totalPrice;
        if (it.unitPurchasePrice && it.unitPurchasePrice > 0) return s + (it.totalPieces * it.unitPurchasePrice);
        if (it.unitPrice && it.unitPrice > 0) return s + (it.totalPieces * it.unitPrice);
        return s;
      }, 0);

      const baseGoodsSubtotal = itemsSumGross > 0 
        ? itemsSumGross 
        : (inv.subtotal > 0 ? inv.subtotal : (calcPurchaseCostGross > 0 ? calcPurchaseCostGross : (inv.finalAmount || 0)));
      const grossPurchaseCost = baseGoodsSubtotal;
      
      const hasDiscount = Boolean(inv.hasDiscount || (inv.discount && inv.discount > 0));
      const discountAmount = hasDiscount ? (inv.discount || 0) : 0;
      const discountPercent = hasDiscount
        ? (inv.discountPercent || (grossPurchaseCost > 0 ? Math.round((discountAmount / grossPurchaseCost) * 100) : 0))
        : 0;
      
      // Real Acquisition cost: Gross Goods Cost - Supplier Discount + Tax + Freight & Expenses
      // Freight is directly ADDED to the main invoice cost!
      const totalExpensesAmount = Math.max(
        (inv.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0),
        (inv.expensesTotalAddition || 0) + (inv.expensesTotalDeduction || 0)
      );
      const invoiceTax = inv.tax || 0;

      // Net purchase cost: Main Goods + Tax - Discount + Freight/Expenses
      const netPurchaseCost = Math.max(0, grossPurchaseCost - discountAmount + invoiceTax) + totalExpensesAmount;

      const totalProjectedSalesValue = calcProjectedSales > 0 ? calcProjectedSales : Math.round(netPurchaseCost * 1.25);
      // Net Profit of inward goods is reduced by freight!
      const projectedProfit = totalProjectedSalesValue - netPurchaseCost;
      const projectedMargin = totalProjectedSalesValue > 0 ? (projectedProfit / totalProjectedSalesValue) * 100 : 0;
      const markupPercentage = netPurchaseCost > 0 ? (projectedProfit / netPurchaseCost) * 100 : 0;

      return {
        ...inv,
        grossPurchaseCost,
        netPurchaseCost,
        hasDiscount,
        discountAmount,
        discountPercent,
        totalExpensesAmount,
        totalItemsPieces,
        totalProjectedSalesValue,
        projectedProfit,
        projectedMargin,
        markupPercentage
      };
    }).sort((a, b) => {
      let cmp = 0;
      if (purchaseSortField === 'invoiceNumber') {
        cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      } else if (purchaseSortField === 'customer') {
        cmp = (a.customerName || '').localeCompare(b.customerName || '');
      } else if (purchaseSortField === 'cost') {
        cmp = a.netPurchaseCost - b.netPurchaseCost;
      } else if (purchaseSortField === 'expenses') {
        cmp = a.totalExpensesAmount - b.totalExpensesAmount;
      } else if (purchaseSortField === 'projectedSales') {
        cmp = a.totalProjectedSalesValue - b.totalProjectedSalesValue;
      } else if (purchaseSortField === 'profit') {
        cmp = a.projectedProfit - b.projectedProfit;
      } else if (purchaseSortField === 'markup') {
        cmp = a.markupPercentage - b.markupPercentage;
      } else {
        cmp = (a.date || '').localeCompare(b.date || '');
        if (cmp === 0) cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
      }
      return purchaseSortDirection === 'desc' ? -cmp : cmp;
    });
  }, [invoices, products, period, searchQuery, purchaseSortField, purchaseSortDirection]);

  // Aggregate Key Profit & Loss Metrics Across The Store
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscountsGiven = 0;
    let totalItemsCount = 0;

    filteredSalesInvoices.forEach(inv => {
      totalRevenue += inv.finalAmount;
      totalDiscountsGiven += (inv.hasDiscount ? (inv.discount || 0) : (inv.discount || 0));
      inv.items.forEach(it => {
        const itemUnitCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
        const cost = it.totalPieces > 0 ? (it.totalPieces * itemUnitCost) : (it.totalPurchaseCost || 0);
        totalCost += cost;
        totalItemsCount += it.totalPieces || 0;
      });
    });

    const rawGrossProfit = totalRevenue - totalCost;

    // Inward Purchase Invoices discounts, freight, and projected profit in this period
    let totalInwardPurchaseDiscounts = 0;
    let totalInwardPurchasesGross = 0;
    let totalInwardPurchasesNet = 0;
    let totalInwardPurchasesProjectedProfit = 0;
    let totalInwardPurchasesFreightAndExpenses = 0;

    purchaseInvoicesProfitability.forEach(pInv => {
      totalInwardPurchaseDiscounts += pInv.discountAmount || 0;
      totalInwardPurchasesGross += pInv.grossPurchaseCost || 0;
      totalInwardPurchasesNet += pInv.netPurchaseCost || 0;
      totalInwardPurchasesProjectedProfit += pInv.projectedProfit || 0;
      totalInwardPurchasesFreightAndExpenses += pInv.totalExpensesAmount || 0;
    });

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

    // Operational expenses from treasury
    const periodExpenses = (treasuryTransactions || []).filter(t => t.type === 'expense' && isDateInPeriod(t.date, period));
    const totalOperationalExpenses = periodExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Effective gross profit incorporating inward discount savings and returns adjustment
    const effectiveGrossProfit = Math.max(0, rawGrossProfit + totalInwardPurchaseDiscounts - totalCustomerReturnsProfit);
    const netOperatingProfit = effectiveGrossProfit - totalOperationalExpenses;

    const overallMargin = totalRevenue > 0 ? (effectiveGrossProfit / totalRevenue) * 100 : 0;
    const avgProfitPerInvoice = filteredSalesInvoices.length > 0 ? Math.round(effectiveGrossProfit / filteredSalesInvoices.length) : 0;
    const avgProfitPerItem = totalItemsCount > 0 ? Math.round(effectiveGrossProfit / totalItemsCount) : 0;

    return {
      totalRevenue,
      totalCost,
      rawGrossProfit,
      totalDiscountsGiven,
      totalInwardPurchaseDiscounts,
      totalInwardPurchasesGross,
      totalInwardPurchasesNet,
      totalInwardPurchasesProjectedProfit,
      totalInwardPurchasesFreightAndExpenses,
      totalCustomerReturnsRevenue,
      totalCustomerReturnsCost,
      totalCustomerReturnsProfit,
      totalCustomerReturnsCount: periodCustomerReturns.length,
      totalOperationalExpenses,
      effectiveGrossProfit,
      netOperatingProfit,
      totalGrossProfit: effectiveGrossProfit,
      overallMargin,
      totalItemsCount,
      invoicesCount: filteredSalesInvoices.length,
      purchasesCount: purchaseInvoicesProfitability.length,
      avgProfitPerInvoice,
      avgProfitPerItem,
    };
  }, [filteredSalesInvoices, purchaseInvoicesProfitability, productReturns, treasuryTransactions, period, products]);

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
        const matchingProduct = getMatchingProduct(it.productId, it.productName);
        const totalPieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));
        const rev = (it.totalPrice !== undefined && it.totalPrice > 0) ? it.totalPrice : (totalPieces * (it.unitSellingPrice || 0));
        const unitCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
        const cost = totalPieces > 0 ? (totalPieces * unitCost) : (it.totalPurchaseCost || 0);
        const profit = rev - cost;

        const current = map.get(key) || {
          id: key,
          name: it.productName,
          category: matchingProduct?.category || 'عمومی',
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

    return list.sort((a, b) => {
      let cmp = 0;
      if (productSortField === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      } else if (productSortField === 'category') {
        cmp = (a.category || '').localeCompare(b.category || '');
      } else if (productSortField === 'piecesSold') {
        cmp = a.totalPiecesSold - b.totalPiecesSold;
      } else if (productSortField === 'cost') {
        cmp = a.totalCost - b.totalCost;
      } else if (productSortField === 'revenue') {
        cmp = a.totalRevenue - b.totalRevenue;
      } else if (productSortField === 'margin') {
        cmp = a.margin - b.margin;
      } else {
        cmp = a.profit - b.profit;
      }
      return productSortDirection === 'desc' ? -cmp : cmp;
    });
  }, [filteredSalesInvoices, products, productSortField, productSortDirection]);

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
      const invCost = inv.items.reduce((s, it) => {
        const itemUnitCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
        return s + (it.totalPieces > 0 ? (it.totalPieces * itemUnitCost) : (it.totalPurchaseCost || 0));
      }, 0);
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

    return list.sort((a, b) => {
      let cmp = 0;
      if (customerSortField === 'name') {
        cmp = (a.customerName || '').localeCompare(b.customerName || '');
      } else if (customerSortField === 'city') {
        cmp = (a.customerCity || '').localeCompare(b.customerCity || '');
      } else if (customerSortField === 'invoicesCount') {
        cmp = a.invoicesCount - b.invoicesCount;
      } else if (customerSortField === 'cost') {
        cmp = a.totalCost - b.totalCost;
      } else if (customerSortField === 'revenue') {
        cmp = a.totalRevenue - b.totalRevenue;
      } else if (customerSortField === 'margin') {
        cmp = a.margin - b.margin;
      } else {
        cmp = a.profit - b.profit;
      }
      return customerSortDirection === 'desc' ? -cmp : cmp;
    });
  }, [filteredSalesInvoices, customerSortField, customerSortDirection]);

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
  // INLINE INVOICE DETAIL VIEW ("محاسبه دقیق اقلام فاکتور")
  // -------------------------------------------------------------------------
  if (selectedInvoiceForDetail) {
    const inv = selectedInvoiceForDetail;
    const isPurchase = inv.type === 'purchase';
    const hasDiscount = Boolean(inv.hasDiscount || (inv.discount && inv.discount > 0));
    const invoiceDiscountAmount = hasDiscount ? (inv.discount || 0) : 0;
    
    const invoiceSubtotal = inv.subtotal || inv.items.reduce((s, it) => s + (it.totalPrice || (it.totalPieces * (it.unitSellingPrice || it.unitPrice || 0))), 0);
    const invoiceDiscountPercent = hasDiscount
      ? (inv.discountPercent || (invoiceSubtotal > 0 ? (invoiceDiscountAmount / invoiceSubtotal) * 100 : 0))
      : 0;
    const discountRatio = invoiceDiscountPercent > 0 ? (invoiceDiscountPercent / 100) : 0;

    // Analyzed items
    const analyzedItems = inv.items.map((it, idx) => {
      const matchingProduct = getMatchingProduct(it.productId, it.productName);
      const totalPieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));

      let unitCostGross = 0;
      let unitSellGross = 0;

      if (isPurchase) {
        if (it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0) {
          unitCostGross = it.unitPurchasePrice;
        } else if (it.totalPurchaseCost && it.totalPurchaseCost > 0 && totalPieces > 0) {
          unitCostGross = Math.round(it.totalPurchaseCost / totalPieces);
        } else if (it.unitPrice && it.unitPrice > 0) {
          unitCostGross = it.unitPrice;
        } else if (it.totalPrice > 0 && totalPieces > 0) {
          unitCostGross = Math.round(it.totalPrice / totalPieces);
        } else if (matchingProduct && matchingProduct.purchasePrice > 0) {
          unitCostGross = matchingProduct.purchasePrice;
        } else {
          unitCostGross = it.unitSellingPrice || 0;
        }

        if (matchingProduct && matchingProduct.sellingPrice > 0) {
          unitSellGross = matchingProduct.sellingPrice;
        } else if (it.unitSellingPrice !== undefined && it.unitSellingPrice > unitCostGross) {
          unitSellGross = it.unitSellingPrice;
        } else if (unitCostGross > 0) {
          unitSellGross = Math.round(unitCostGross * 1.25);
        } else {
          unitSellGross = it.unitSellingPrice || 0;
        }
      } else {
        unitCostGross = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);

        unitSellGross = (it.unitSellingPrice !== undefined && it.unitSellingPrice > 0)
          ? it.unitSellingPrice
          : (totalPieces > 0 && it.totalPrice ? Math.round(it.totalPrice / totalPieces) : (matchingProduct?.sellingPrice || 0));
      }

      const rowCostGross = totalPieces * unitCostGross;
      const rowRevenueGross = totalPieces * unitSellGross;

      let rowCost = rowCostGross;
      let rowRevenue = rowRevenueGross;
      let unitCost = unitCostGross;
      let unitSell = unitSellGross;
      let itemDiscountSavings = 0;

      if (isPurchase) {
        if (hasDiscount && discountRatio > 0) {
          rowCost = Math.round(rowCostGross * (1 - discountRatio));
          unitCost = totalPieces > 0 ? Math.round(rowCost / totalPieces) : Math.round(unitCostGross * (1 - discountRatio));
          itemDiscountSavings = rowCostGross - rowCost;
        }
      } else {
        if (hasDiscount && discountRatio > 0) {
          rowRevenue = Math.round(rowRevenueGross * (1 - discountRatio));
          unitSell = totalPieces > 0 ? Math.round(rowRevenue / totalPieces) : Math.round(unitSellGross * (1 - discountRatio));
          itemDiscountSavings = rowRevenueGross - rowRevenue;
        }
      }

      const rowProfit = rowRevenue - rowCost;
      const profitPerPiece = totalPieces > 0 ? Math.round(rowProfit / totalPieces) : (unitSell - unitCost);
      const margin = isPurchase
        ? (rowCost > 0 ? (rowProfit / rowCost) * 100 : 0)
        : (rowRevenue > 0 ? (rowProfit / rowRevenue) * 100 : 0);

      let tier: 'high' | 'medium' | 'low' = 'medium';
      let tierTitle = 'سود استاندارد';
      let tierBadge = 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';

      if (margin >= 18) {
        tier = 'high';
        tierTitle = isPurchase ? 'مارک‌آپ عالی' : 'سود طلایی';
        tierBadge = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      } else if (margin < 10) {
        tier = 'low';
        tierTitle = 'سود کم / سربه‌سر';
        tierBadge = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      }

      const cartonParts: string[] = [];
      if (it.cartonsCount > 0) cartonParts.push(`${toPersianDigits(it.cartonsCount)} کارتن`);
      if (it.extraPieces > 0) cartonParts.push(`${toPersianDigits(it.extraPieces)} عدد اضافه`);
      if (cartonParts.length === 0) cartonParts.push(`${toPersianDigits(totalPieces)} عدد`);
      const packagingSpec = formatProductPackagingSpec(it);
      const cartonFullText = packagingSpec ? `${cartonParts.join(' و ')} (${packagingSpec})` : cartonParts.join(' و ');

      return {
        ...it,
        idx,
        totalPieces,
        unitCostGross,
        unitCost,
        unitSellGross,
        unitSell,
        rowCostGross,
        rowRevenueGross,
        rowCost,
        rowRevenue,
        rowProfit,
        profitPerPiece,
        itemDiscountSavings,
        margin,
        tier,
        tierTitle,
        tierBadge,
        cartonFullText
      };
    });

    const totalPiecesSum = analyzedItems.reduce((sum, it) => sum + it.totalPieces, 0);
    const totalCartonsSum = analyzedItems.reduce((sum, it) => sum + (it.cartonsCount || 0), 0);
    
    const totalCostGross = analyzedItems.reduce((sum, it) => sum + it.rowCostGross, 0);
    const totalExpensesAmount = (inv.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0) || (inv.expensesTotalAddition || 0) || (inv.expensesTotalDeduction || 0);
    const totalCostNet = isPurchase
      ? (Math.max(0, totalCostGross - invoiceDiscountAmount) + totalExpensesAmount)
      : totalCostGross;

    const totalRevGross = analyzedItems.reduce((sum, it) => sum + it.rowRevenueGross, 0);
    const totalRevNet = !isPurchase
      ? (hasDiscount ? Math.max(0, totalRevGross - invoiceDiscountAmount) : (inv.finalAmount || totalRevGross))
      : totalRevGross;

    const totalCost = isPurchase ? totalCostNet : totalCostGross;
    const totalRev = isPurchase ? totalRevGross : totalRevNet;

    const totalProfit = totalRev - totalCost;
    const overallMargin = isPurchase
      ? (totalCost > 0 ? (totalProfit / totalCost) * 100 : 0)
      : (totalRev > 0 ? (totalProfit / totalRev) * 100 : 0);

    const weightedAvgCost = totalPiecesSum > 0 ? Math.round(totalCost / totalPiecesSum) : 0;
    const weightedAvgSell = totalPiecesSum > 0 ? Math.round(totalRev / totalPiecesSum) : 0;
    const weightedAvgProfitPerPiece = totalPiecesSum > 0 ? Math.round(totalProfit / totalPiecesSum) : 0;
    const roiPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    const displayedItems = analyzedItems.filter(item => {
      if (detailItemFilter === 'all') return true;
      return item.tier === detailItemFilter;
    });

    const highCount = analyzedItems.filter(i => i.tier === 'high').length;
    const mediumCount = analyzedItems.filter(i => i.tier === 'medium').length;
    const lowCount = analyzedItems.filter(i => i.tier === 'low').length;

    return (
      <div className="w-full max-w-7xl mx-auto space-y-5 pb-20 px-2 sm:px-4">
        {/* Top Return Nav & Invoice Header */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedInvoiceForDetail(null)}
              className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>بازگشت به جدول سود و زیان</span>
            </button>

            <div className="border-r border-slate-200 dark:border-slate-800 pr-3 mr-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isPurchase ? `محاسبه دقیق فاکتور ورود کالا #${toPersianDigits(inv.invoiceNumber)}` : `محاسبه دقیق فاکتور فروش #${toPersianDigits(inv.invoiceNumber)}`}
                </h2>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                  isPurchase 
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {isPurchase ? 'ورود به انبار (خرید)' : 'فروش کالا'}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700">
                  {toPersianDigits(inv.items.length)} قلم کالا ({toPersianDigits(totalCartonsSum)} کارتن)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {isPurchase ? 'تأمین‌کننده:' : 'طرف حساب:'} <strong className="text-slate-800 dark:text-slate-200 font-bold">{inv.customerName}</strong> {inv.customerCity ? `(${inv.customerCity})` : ''} • تاریخ: {toPersianDigits(inv.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewInvoice(inv)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl ${theme.primary} ${theme.primaryHover} text-white font-bold text-xs shadow-xs transition-all cursor-pointer`}
            >
              <FileText className="w-4 h-4" />
              <span>مشاهده برگه فاکتور</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
              title="چاپ"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Summary 4-Cards Grid - Standard App Design */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isPurchase ? 'ارزش تخمینی کل فروش کالا' : 'جمع کل فروش فاکتور'}
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block dir-ltr text-right">
              {isSecretMode ? '••••••' : formatPrice(totalRev)}
            </span>
            <span className="text-[11px] text-slate-400 block">
              {toPersianDigits(totalPiecesSum.toLocaleString())} عدد در {toPersianDigits(totalCartonsSum)} کارتن
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {isPurchase ? 'بهای تمام‌شده خرید خالص' : 'بهای تمام‌شده خرید کالا'}
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block dir-ltr text-right">
              {isSecretMode ? '••••••' : formatPrice(totalCost)}
            </span>
            {hasDiscount ? (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-bold dir-rtl">
                {isPurchase 
                  ? `تخفیف خرید: -${formatPrice(invoiceDiscountAmount)} (${toPersianDigits(invoiceDiscountPercent.toFixed(0))}٪)` 
                  : `تخفیف: -${formatPrice(invoiceDiscountAmount)}`
                }
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 block">
                بدون تخفیف
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-emerald-200/90 dark:border-emerald-900/60 shadow-sm space-y-1">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {isPurchase ? 'سود پیش‌بینی شده فاکتور' : 'سود خالص کل اقلام'}
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 block dir-ltr text-right">
              {isSecretMode ? '••••••' : `+${formatPrice(totalProfit)}`}
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-bold">
              میانگین سود هر عدد: +{formatPrice(weightedAvgProfitPerPiece)}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-1">
            <span className={`text-xs font-bold ${theme.primaryText}`}>
              {isPurchase ? 'ضریب مارک‌آپ (سود بر خرید)' : 'حاشیه سود میانگین'}
            </span>
            <span className={`text-base sm:text-lg font-black ${theme.primaryText} block dir-ltr text-right`}>
              {isSecretMode ? '••٪' : `${toPersianDigits(overallMargin.toFixed(1))}٪`}
            </span>
            <span className="text-[11px] text-slate-400 block">
              بازده سرمایه‌گذاری: {toPersianDigits(roiPercentage.toFixed(1))}٪
            </span>
          </div>
        </div>

        {/* Filter Tier Tabs for Invoice Items */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setDetailItemFilter('all')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                detailItemFilter === 'all'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              همه اقلام ({toPersianDigits(analyzedItems.length)})
            </button>
            <button
              onClick={() => setDetailItemFilter('high')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                detailItemFilter === 'high'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              سود طلایی ({toPersianDigits(highCount)})
            </button>
            <button
              onClick={() => setDetailItemFilter('medium')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                detailItemFilter === 'medium'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              سود استاندارد ({toPersianDigits(mediumCount)})
            </button>
            <button
              onClick={() => setDetailItemFilter('low')}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                detailItemFilter === 'low'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              سود کم / سربه‌سر ({toPersianDigits(lowCount)})
            </button>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            تفکیک بر حسب تعداد کل، کارتن، قیمت خرید و حاشیه سود هر سطر
          </span>
        </div>

        {/* Detailed Items Table with Standard Table Design & Footer */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11.5px] select-none">
                <tr>
                  <th className="p-3.5 text-center w-12">ردیف</th>
                  <th className="p-3.5">شرح کالا و بسته‌بندی</th>
                  <th className="p-3.5 text-center">تعداد کل</th>
                  <th className="p-3.5 text-left">قیمت خرید واحد</th>
                  <th className="p-3.5 text-left">{isPurchase ? 'قیمت فروش کالا' : 'قیمت فروش واحد'}</th>
                  <th className="p-3.5 text-left">{isPurchase ? 'بهای تمام‌شده خرید' : 'بهای کل خرید'}</th>
                  <th className="p-3.5 text-left">{isPurchase ? 'ارزش کل فروش تخمینی' : 'مبلغ کل فروش'}</th>
                  <th className="p-3.5 text-left">سود هر عدد</th>
                  <th className="p-3.5 text-left">{isPurchase ? 'سود پیش‌بینی سطر' : 'سود کل سطر'}</th>
                  <th className="p-3.5 text-center">{isPurchase ? 'ضریب مارک‌آپ' : 'حاشیه سود'}</th>
                  <th className="p-3.5 text-center">وضعیت بازدهی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center text-slate-400 font-medium">
                      کالایی در این فیلتر سود یافت نشد.
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((it, itIdx) => (
                    <tr key={`profit-item-${it.id || 'row'}-${it.idx}-${itIdx}`} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 text-center font-bold text-slate-400">
                        {toPersianDigits(it.idx + 1)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div>{it.productName}</div>
                        <div className={`text-[11px] ${theme.primaryText} font-bold mt-0.5 flex items-center gap-1`}>
                          <Boxes className="w-3.5 h-3.5 shrink-0" />
                          <span>{it.cartonFullText}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        {toPersianDigits(it.totalPieces.toLocaleString())} {it.unitTitle || 'عدد'}
                      </td>
                      <td className="p-3.5 text-left dir-ltr">
                        {hasDiscount && isPurchase && it.itemDiscountSavings > 0 ? (
                          <div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {isSecretMode ? '••••' : formatPrice(it.unitCost)}
                            </span>
                            <span className="text-[10px] text-slate-400 line-through mr-1 font-normal">
                              {isSecretMode ? '••••' : formatPrice(it.unitCostGross)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            {isSecretMode ? '••••' : formatPrice(it.unitCost)}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white text-left dir-ltr">
                        {isSecretMode ? '••••' : formatPrice(it.unitSell)}
                      </td>
                      <td className="p-3.5 text-left dir-ltr">
                        {hasDiscount && isPurchase && it.itemDiscountSavings > 0 ? (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {isSecretMode ? '••••••' : formatPrice(it.rowCost)}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal dir-rtl text-right">
                              تخفیف خرید: -{formatPrice(it.itemDiscountSavings)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            {isSecretMode ? '••••••' : formatPrice(it.rowCost)}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white text-left dir-ltr">
                        {isSecretMode ? '••••••' : formatPrice(it.rowRevenue)}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                        {isSecretMode ? '••••' : `+${formatPrice(it.profitPerPiece)}`}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                        {isSecretMode ? '••••••' : `+${formatPrice(it.rowProfit)}`}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${it.tierBadge}`}>
                          {isSecretMode ? '••٪' : `${toPersianDigits(it.margin.toFixed(1))}٪`}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          {it.tierTitle}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* RICH FOOTER ROW FOR DETAILED PROFIT CALCULATION */}
              <tfoot className="bg-slate-50/90 dark:bg-slate-800/70 border-t-2 border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                <tr>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                      جمع کل
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 dark:text-white text-xs">
                      {toPersianDigits(analyzedItems.length)} قلم کالا
                    </div>
                    <div className={`text-[11px] ${theme.primaryText} font-bold mt-0.5 flex items-center gap-1`}>
                      <Boxes className="w-3.5 h-3.5" />
                      <span>{toPersianDigits(totalCartonsSum)} کارتن کالا</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-center font-bold text-slate-900 dark:text-white">
                    {toPersianDigits(totalPiecesSum.toLocaleString())} عدد
                  </td>
                  <td className="p-3.5 text-left dir-ltr">
                    <div className="text-[10px] text-slate-400 font-normal">میانگین خرید:</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">
                      {isSecretMode ? '••••' : formatPrice(weightedAvgCost)}
                    </div>
                  </td>
                  <td className="p-3.5 text-left dir-ltr font-bold text-slate-900 dark:text-white">
                    <div className="text-[10px] text-slate-400 font-normal">میانگین فروش:</div>
                    <div>{isSecretMode ? '••••' : formatPrice(weightedAvgSell)}</div>
                  </td>
                  <td className="p-3.5 text-left dir-ltr font-bold text-slate-900 dark:text-white">
                    <div>{isSecretMode ? '••••••' : formatPrice(totalCost)}</div>
                    {isPurchase && totalExpensesAmount > 0 && (
                      <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold dir-rtl text-right">
                        کرایه بار اضافه شده: +{formatPrice(totalExpensesAmount)}
                      </div>
                    )}
                    {hasDiscount && isPurchase && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal dir-rtl text-right">
                        تخفیف خرید: -{formatPrice(invoiceDiscountAmount)}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-left dir-ltr font-bold text-slate-900 dark:text-white">
                    <div>{isSecretMode ? '••••••' : formatPrice(totalRev)}</div>
                    {hasDiscount && !isPurchase && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal dir-rtl text-right">
                        تخفیف فروش: -{formatPrice(invoiceDiscountAmount)}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-left dir-ltr font-bold text-emerald-600 dark:text-emerald-400">
                    <div className="text-[10px] text-emerald-700 font-normal">سود هر عدد:</div>
                    <div>{isSecretMode ? '••••' : `+${formatPrice(weightedAvgProfitPerPiece)}`}</div>
                  </td>
                  <td className="p-3.5 text-left dir-ltr bg-emerald-500/10 dark:bg-emerald-950/40 border-x border-emerald-300 dark:border-emerald-800">
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                      {isPurchase ? 'سود پیش‌بینی کل:' : 'سود کامل و قطعی:'}
                    </div>
                    <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                      {isSecretMode ? '••••••' : `+${formatPrice(totalProfit)}`}
                    </div>
                  </td>
                  <td className={`p-3.5 text-center font-bold ${theme.primaryText} dir-ltr text-xs`}>
                    {isSecretMode ? '••٪' : `${toPersianDigits(overallMargin.toFixed(1))}٪`}
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold text-[11px]">
                      بازدهی: {isSecretMode ? '••٪' : `${toPersianDigits(roiPercentage.toFixed(0))}٪`}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // MAIN PROFIT & LOSS HUB
  // -------------------------------------------------------------------------
  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-20 px-2 sm:px-4">
      
      {/* 1. Header Banner & Controls - Clean Standard Design Matching App */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-all no-print">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl ${theme.badgeBg} ${theme.badgeText} text-xs font-bold border ${theme.borderColor}`}>
              <Scale className="w-3.5 h-3.5" />
              <span>گزارش جامع سود و زیان بازرگانی</span>
            </span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{toPersianDigits(filteredSalesInvoices.length)} فاکتور فروش · {toPersianDigits(purchaseInvoicesProfitability.length)} فاکتور خرید</span>
            </div>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>تحلیل سود و زیان، حاشیه سود و بهای تمام‌شده</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl font-medium">
            محاسبه دقیق سود ناخالص و خالص، بهای تمام‌شده خرید کالا، تخفیفات و هزینه‌های جاری
          </p>
        </div>

        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 shrink-0">
          {onToggleSecretMode && (
            <button
              onClick={onToggleSecretMode}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                isSecretMode
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isSecretMode ? <EyeOff className="w-4 h-4 text-amber-500 shrink-0" /> : <Eye className="w-4 h-4 text-emerald-500 shrink-0" />}
              <span>{isSecretMode ? 'حالت محرمانه' : 'نمایش ارقام'}</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
            <span>چاپ گزارش</span>
          </button>
        </div>
      </div>

      {/* 2. Period Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3.5 no-print">
        {/* Search & Sort Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی شماره فاکتور، مشتری یا نام کالا..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 rounded-2xl text-xs font-bold focus:outline-none shadow-2xs ${theme.ring}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDateSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 shadow-2xs whitespace-nowrap"
          >
            {dateSortOrder === 'desc' ? (
              <>
                <ArrowDownWideNarrow className={`w-3.5 h-3.5 ${theme.primaryText} shrink-0`} />
                <span>جدیدترین</span>
              </>
            ) : (
              <>
                <ArrowUpNarrowWide className={`w-3.5 h-3.5 ${theme.primaryText} shrink-0`} />
                <span>قدیمی‌ترین</span>
              </>
            )}
          </button>
        </div>

        {/* Time Periods */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          {[
            { id: 'all', label: 'همه دوران' },
            { id: 'today', label: 'امروز' },
            { id: 'week', label: 'هفتگی (۷ روز)' },
            { id: 'month', label: '۳۰ روزه (ماهیانه)' },
            { id: '3months', label: '۳ ماهه' },
            { id: '6months', label: '۶ ماهه' },
            { id: '1year', label: '۱ ساله' },
          ].map((item) => {
            const isSelected = period === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectPeriod(item.id as TimePeriodFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Executive Metric Cards - Clean, Standard, Matching the entire application */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
        
        {/* Card 1: سود خالص بازرگانی */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">سود خالص کل بازرگانی</span>
            <div className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 dir-ltr text-right">
            {isSecretMode ? '••••••' : `+${formatPrice(summaryMetrics.netOperatingProfit)}`}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>سود حاصل از دوره:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {toPersianDigits(summaryMetrics.invoicesCount)} فاکتور صادر شده
            </span>
          </div>
        </div>

        {/* Card 2: مجموع فروش فاکتورها */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">مجموع فروش فاکتورها</span>
            <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white dir-ltr text-right">
            {isSecretMode ? '••••••' : formatPrice(summaryMetrics.totalRevenue)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>تعداد کل اقلام:</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">{toPersianDigits(summaryMetrics.totalItemsCount)} قلم کالا</span>
          </div>
        </div>

        {/* Card 3: سود خالص فاکتورهای ورودی خرید */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">سود خالص فاکتورهای ورودی (خرید)</span>
            <div className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Boxes className="w-4 h-4" />
            </div>
          </div>

          <div className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-300 dir-ltr text-right">
            {isSecretMode ? '••••••' : `+${formatPrice(summaryMetrics.totalInwardPurchasesProjectedProfit)}`}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>بهای کل (اصلی + کرایه):</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">
              {isSecretMode ? '••••••' : formatPrice(summaryMetrics.totalInwardPurchasesNet)}
            </span>
          </div>
        </div>

        {/* Card 4: میانگین بازدهی و حاشیه سود */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${theme.primaryText}`}>حاشیه سود میانگین</span>
            <div className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Percent className="w-4 h-4" />
            </div>
          </div>

          <div className={`text-xl sm:text-2xl font-black ${theme.primaryText} dir-ltr text-right`}>
            {isSecretMode ? '••٪' : `${toPersianDigits(summaryMetrics.overallMargin.toFixed(1))}٪`}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>میانگین سود هر فاکتور:</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">
              {isSecretMode ? '••••••' : formatPrice(summaryMetrics.avgProfitPerInvoice)}
            </span>
          </div>
        </div>

      </div>

      {/* 4. Tab Switcher (Invoices / Purchases / Products / Customers) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/90 dark:border-slate-800 w-full sm:w-fit no-print shadow-2xs">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>فاکتورهای فروش ({toPersianDigits(filteredSalesInvoices.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'purchases'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>فاکتورهای خرید و ورود کالا ({toPersianDigits(purchaseInvoicesProfitability.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'products'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>رتبه‌بندی محصولات ({toPersianDigits(productProfitability.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'customers'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>سودآوری خریداران ({toPersianDigits(customerProfitability.length)})</span>
        </button>
      </div>

      {/* 5. Main Content Area Based on Active Tab */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        
        {/* TAB 1: SALES INVOICES PROFITABILITY */}
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11.5px] select-none">
                <tr>
                  <SortableTableHeader
                    field="invoiceNumber"
                    currentField={salesSortField}
                    currentDirection={salesSortDirection}
                    onSort={handleSalesSort}
                    className="p-3.5"
                  >
                    شماره سند
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="date"
                    currentField={salesSortField}
                    currentDirection={salesSortDirection}
                    onSort={handleSalesSort}
                    className="p-3.5"
                  >
                    تاریخ صدور
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="customer"
                    currentField={salesSortField}
                    currentDirection={salesSortDirection}
                    onSort={handleSalesSort}
                    className="p-3.5"
                  >
                    خریدار / مشتری
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="amount"
                    currentField={salesSortField}
                    currentDirection={salesSortDirection}
                    onSort={handleSalesSort}
                    align="left"
                    className="p-3.5 text-left"
                  >
                    مبلغ کل فاکتور
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="cost"
                    currentField={salesSortField}
                    currentDirection={salesSortDirection}
                    onSort={handleSalesSort}
                    align="left"
                    className="p-3.5 text-left"
                  >
                    بهای خرید (هزینه)
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="profit"
                    currentField={salesSortField}
                    currentDirection={salesSortDirection}
                    onSort={handleSalesSort}
                    align="left"
                    className="p-3.5 text-left"
                  >
                    سود ناخالص فاکتور
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="margin"
                    currentField={salesSortField}
                    currentDirection={salesSortDirection}
                    onSort={handleSalesSort}
                    align="center"
                    className="p-3.5 text-center"
                  >
                    حاشیه سود
                  </SortableTableHeader>

                  <th className="p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedSalesInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                      هیچ فاکتور فروشی با شرایط فیلتر انتخاب شده یافت نشد.
                    </td>
                  </tr>
                ) : (
                  paginatedSalesInvoices.map((inv, idx) => {
                    const invCost = inv.items.reduce((sum, it) => {
                      const uCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
                      return sum + (it.totalPieces > 0 ? (it.totalPieces * uCost) : (it.totalPurchaseCost || 0));
                    }, 0);
                    const invRevenue = inv.finalAmount;
                    const allSalesExpenses = (inv.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
                    const invProfit = invRevenue - invCost - allSalesExpenses;
                    const invMargin = invRevenue > 0 ? (invProfit / invRevenue) * 100 : 0;
                    const hasInvDiscount = Boolean(inv.hasDiscount || (inv.discount && inv.discount > 0));

                    return (
                      <tr key={`profit-sales-inv-${inv.id || idx}-${idx}`} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3.5 font-bold">
                          <span className="font-mono text-xs text-slate-900 dark:text-slate-100 font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                            #{toPersianDigits(inv.invoiceNumber)}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 font-bold font-mono">
                          {toPersianDigits(inv.date)}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          <div>{inv.customerName}</div>
                          {inv.customerCity && (
                            <span className="text-[11px] text-slate-500 font-medium">{inv.customerCity}</span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white text-left dir-ltr">
                          <div>{formatPrice(invRevenue)}</div>
                          {hasInvDiscount && inv.discount && inv.discount > 0 && (
                            <div className="flex items-center justify-end gap-1 mt-0.5 dir-rtl">
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-300 dark:border-amber-700">
                                تخفیف: {formatPrice(inv.discount)}
                              </span>
                            </div>
                          )}
                          {allSalesExpenses > 0 && (
                            <div className="flex items-center justify-end gap-1 mt-0.5 dir-rtl">
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold text-[10px] border border-rose-200 dark:border-rose-900">
                                کسر کرایه/هزینه از سود: -{formatPrice(allSalesExpenses)}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-300 font-bold text-left dir-ltr">
                          {isSecretMode ? '••••••' : formatPrice(invCost)}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                          {isSecretMode ? '••••••' : `+${formatPrice(invProfit)}`}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                            {isSecretMode ? '••٪' : `${toPersianDigits(invMargin.toFixed(1))}٪`}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedInvoiceForDetail(inv)}
                              className={`px-3 py-1.5 ${theme.primaryLight} ${theme.primaryText} hover:opacity-85 rounded-xl text-xs font-bold transition-all cursor-pointer border ${theme.borderColor} shadow-2xs flex items-center gap-1`}
                              title="محاسبه دقیق اقلام و ریز سود در همین صفحه"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              <span>محاسبه دقیق اقلام</span>
                            </button>
                            <button
                              onClick={() => onViewInvoice(inv)}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                              title="مشاهده فاکتور"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Summary Footer Row for Sales Tab */}
              {paginatedSalesInvoices.length > 0 && (
                <tfoot className="bg-slate-50/90 dark:bg-slate-800/70 border-t-2 border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                  <tr>
                    <td colSpan={3} className="p-3.5">
                      <span>جمع کل فاکتورهای فروش این دوره ({toPersianDigits(filteredSalesInvoices.length)} فاکتور)</span>
                    </td>
                    <td className="p-3.5 text-left dir-ltr font-black">
                      {formatPrice(summaryMetrics.totalRevenue)}
                    </td>
                    <td className="p-3.5 text-left dir-ltr font-bold text-slate-700 dark:text-slate-300">
                      {isSecretMode ? '••••••' : formatPrice(summaryMetrics.totalCost)}
                    </td>
                    <td className="p-3.5 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400">
                      {isSecretMode ? '••••••' : `+${formatPrice(summaryMetrics.rawGrossProfit)}`}
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {isSecretMode ? '••٪' : `${toPersianDigits(summaryMetrics.overallMargin.toFixed(1))}٪`}
                    </td>
                    <td className="p-3.5 text-center text-[11px] text-slate-500 font-medium">
                      میانگین سود هر فاکتور: {formatPrice(summaryMetrics.avgProfitPerInvoice)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* TAB 2: PURCHASE INVOICES PROFITABILITY (INWARD GOODS COMPACT & CLEAN) */}
        {activeTab === 'purchases' && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right text-[11px] border-collapse table-auto">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[10.5px] select-none">
                <tr>
                  <SortableTableHeader
                    field="invoiceNumber"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    className="py-2 px-1.5 whitespace-nowrap"
                  >
                    سند / تاریخ
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="customer"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    className="py-2 px-1.5"
                  >
                    تأمین‌کننده
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="cost"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="left"
                    className="py-2 px-1.5 text-left whitespace-nowrap"
                  >
                    بهای خرید
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="projectedSales"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="left"
                    className="py-2 px-1.5 text-left whitespace-nowrap"
                  >
                    ارزش فروش
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="profit"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="left"
                    className="py-2 px-1.5 text-left whitespace-nowrap"
                  >
                    سود برآوردی
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="markup"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="center"
                    className="py-2 px-1 text-center whitespace-nowrap"
                  >
                    مارک‌آپ
                  </SortableTableHeader>

                  <th className="py-2 px-1.5 text-center whitespace-nowrap">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedPurchaseInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">
                      هیچ فاکتور ورودی کالا در این بازه یافت نشد.
                    </td>
                  </tr>
                ) : (
                  paginatedPurchaseInvoices.map((inv, idx) => (
                    <tr key={`profit-pur-inv-${inv.id || idx}-${idx}`} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors">
                      {/* 1. Number & Date */}
                      <td className="py-2 px-1.5 whitespace-nowrap">
                        <span className="font-mono text-[10.5px] text-amber-900 dark:text-amber-200 font-black px-1 py-0.2 rounded bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 inline-block">
                          #{toPersianDigits(inv.invoiceNumber)}
                        </span>
                        <div className="text-[9.5px] text-slate-400 font-mono">
                          {toPersianDigits(inv.date)}
                        </div>
                      </td>

                      {/* 2. Supplier */}
                      <td className="py-2 px-1.5 font-bold text-slate-900 dark:text-white">
                        <div className="truncate max-w-[110px]" title={inv.customerName}>
                          {inv.customerName}
                        </div>
                      </td>

                      {/* 3. Cost (with compact freight & discount info) */}
                      <td className="py-2 px-1.5 text-left dir-ltr whitespace-nowrap">
                        <div className="font-black text-slate-900 dark:text-white text-[11px]">
                          {isSecretMode ? '••••••' : formatPrice(inv.netPurchaseCost)}
                        </div>
                        {(inv.totalExpensesAmount > 0 || (inv.hasDiscount && inv.discountAmount > 0)) && (
                          <div className="flex items-center gap-1 mt-0.2 dir-rtl flex-wrap">
                            {inv.totalExpensesAmount > 0 && (
                              <span className="text-[8.5px] px-0.8 py-0.1 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
                                +حمل
                              </span>
                            )}
                            {inv.hasDiscount && inv.discountAmount > 0 && (
                              <span className="text-[8.5px] px-0.8 py-0.1 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                                -تخفیف
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 4. Projected Sales */}
                      <td className="py-2 px-1.5 text-slate-700 dark:text-slate-300 font-bold text-left dir-ltr text-[11px] whitespace-nowrap">
                        {isSecretMode ? '••••••' : formatPrice(inv.totalProjectedSalesValue)}
                      </td>

                      {/* 5. Projected Profit */}
                      <td className="py-2 px-1.5 font-black text-emerald-600 dark:text-emerald-400 text-left dir-ltr text-[11px] whitespace-nowrap">
                        {isSecretMode ? '••••••' : `+${formatPrice(inv.projectedProfit)}`}
                      </td>

                      {/* 6. Markup */}
                      <td className="py-2 px-1 text-center whitespace-nowrap">
                        <span className="px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800 font-mono">
                          {isSecretMode ? '••٪' : `+${toPersianDigits(inv.markupPercentage.toFixed(0))}٪`}
                        </span>
                      </td>

                      {/* 7. Actions */}
                      <td className="py-2 px-1.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedInvoiceForDetail(inv)}
                            className="px-1.5 py-0.5 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200 hover:opacity-85 rounded-md text-[10px] font-bold transition-all cursor-pointer border border-amber-300 dark:border-amber-800 shadow-2xs flex items-center gap-0.5"
                            title="محاسبه دقیق اقلام در همین صفحه"
                          >
                            <Calculator className="w-2.5 h-2.5" />
                            <span>اقلام</span>
                          </button>
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="p-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                            title="مشاهده فاکتور خرید"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Summary Footer Row for Purchase Tab */}
              {paginatedPurchaseInvoices.length > 0 && (
                <tfoot className="bg-slate-50/90 dark:bg-slate-800/70 border-t-2 border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                  <tr>
                    <td colSpan={2} className="py-3 px-3">
                      <span>جمع ({toPersianDigits(purchaseInvoicesProfitability.length)} فاکتور)</span>
                    </td>
                    <td className="py-3 px-3 text-left dir-ltr font-black">
                      <div>{isSecretMode ? '••••••' : formatPrice(summaryMetrics.totalInwardPurchasesNet)}</div>
                    </td>
                    <td className="py-3 px-3 text-left dir-ltr font-bold text-slate-700 dark:text-slate-300">
                      {isSecretMode ? '••••••' : formatPrice(purchaseInvoicesProfitability.reduce((s, p) => s + p.totalProjectedSalesValue, 0))}
                    </td>
                    <td className="py-3 px-3 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400">
                      {isSecretMode ? '••••••' : `+${formatPrice(purchaseInvoicesProfitability.reduce((s, p) => s + p.projectedProfit, 0))}`}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                      {isSecretMode ? '••٪' : `+${toPersianDigits(
                        summaryMetrics.totalInwardPurchasesNet > 0
                          ? ((purchaseInvoicesProfitability.reduce((s, p) => s + p.projectedProfit, 0) / summaryMetrics.totalInwardPurchasesNet) * 100).toFixed(1)
                          : '0.0'
                      )}٪`}
                    </td>
                    <td className="py-3 px-3 text-center text-[10.5px] text-slate-500 font-medium">
                      {toPersianDigits(purchaseInvoicesProfitability.reduce((s, p) => s + p.totalItemsPieces, 0))} عدد کالا
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* TAB 3: PRODUCTS PROFITABILITY */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11.5px] select-none">
                <tr>
                  <th className="p-3.5 w-12 text-center">رتبه</th>
                  <SortableTableHeader
                    field="name"
                    currentField={productSortField}
                    currentDirection={productSortDirection}
                    onSort={handleProductSort}
                    className="p-3.5"
                  >
                    نام محصول / کالا
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="category"
                    currentField={productSortField}
                    currentDirection={productSortDirection}
                    onSort={handleProductSort}
                    className="p-3.5"
                  >
                    دسته‌بندی
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="piecesSold"
                    currentField={productSortField}
                    currentDirection={productSortDirection}
                    onSort={handleProductSort}
                    align="center"
                    className="p-3.5 text-center"
                  >
                    تعداد فروش رفته
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="cost"
                    currentField={productSortField}
                    currentDirection={productSortDirection}
                    onSort={handleProductSort}
                    align="left"
                    className="p-3.5 text-left"
                  >
                    کل بهای خرید (هزینه)
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="revenue"
                    currentField={productSortField}
                    currentDirection={productSortDirection}
                    onSort={handleProductSort}
                    align="left"
                    className="p-3.5 text-left"
                  >
                    کل مبلغ فروش
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="profit"
                    currentField={productSortField}
                    currentDirection={productSortDirection}
                    onSort={handleProductSort}
                    align="left"
                    className="p-3.5 text-left"
                  >
                    سود ناخالص محصول
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="margin"
                    currentField={productSortField}
                    currentDirection={productSortDirection}
                    onSort={handleProductSort}
                    align="center"
                    className="p-3.5 text-center"
                  >
                    حاشیه سود ٪
                  </SortableTableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                      کالایی در این دوره به فروش نرسیده است.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p, idx) => (
                    <tr key={`profit-prod-${p.id || p.name || idx}-${idx}`} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-500 dark:text-slate-400 font-mono">
                        #{toPersianDigits(startIndex + idx + 1)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div>{p.name}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">
                        {p.category}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        {toPersianDigits(p.totalPiecesSold.toLocaleString())} عدد
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-bold text-left dir-ltr">
                        {isSecretMode ? '••••••' : formatPrice(p.totalCost)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white text-left dir-ltr">
                        {isSecretMode ? '••••••' : formatPrice(p.totalRevenue)}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                        {isSecretMode ? '••••••' : `+${formatPrice(p.profit)}`}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                          {isSecretMode ? '••٪' : `${toPersianDigits(p.margin.toFixed(1))}٪`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Summary Footer Row for Products Tab */}
              {paginatedProducts.length > 0 && (
                <tfoot className="bg-slate-50/90 dark:bg-slate-800/70 border-t-2 border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                  <tr>
                    <td colSpan={3} className="p-3.5">
                      <span>جمع کل اقلام فروش‌رفته ({toPersianDigits(productProfitability.length)} قلم کالا)</span>
                    </td>
                    <td className="p-3.5 text-center font-bold">
                      {toPersianDigits(productProfitability.reduce((s, p) => s + p.totalPiecesSold, 0).toLocaleString())} عدد
                    </td>
                    <td className="p-3.5 text-left dir-ltr font-bold text-slate-700 dark:text-slate-300">
                      {isSecretMode ? '••••••' : formatPrice(productProfitability.reduce((s, p) => s + p.totalCost, 0))}
                    </td>
                    <td className="p-3.5 text-left dir-ltr font-black text-slate-900 dark:text-white">
                      {isSecretMode ? '••••••' : formatPrice(productProfitability.reduce((s, p) => s + p.totalRevenue, 0))}
                    </td>
                    <td className="p-3.5 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400">
                      {isSecretMode ? '••••••' : `+${formatPrice(productProfitability.reduce((s, p) => s + p.profit, 0))}`}
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {isSecretMode ? '••٪' : `${toPersianDigits(
                        productProfitability.reduce((s, p) => s + p.totalRevenue, 0) > 0
                          ? ((productProfitability.reduce((s, p) => s + p.profit, 0) / productProfitability.reduce((s, p) => s + p.totalRevenue, 0)) * 100).toFixed(1)
                          : '0.0'
                      )}٪`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* TAB 4: CUSTOMERS PROFITABILITY */}
        {activeTab === 'customers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11.5px] select-none">
                <tr>
                  <th className="p-3.5 w-12 text-center">رتبه</th>
                  <SortableTableHeader
                    field="name"
                    currentField={customerSortField}
                    currentDirection={customerSortDirection}
                    onSort={handleCustomerSort}
                    className="p-3.5"
                  >
                    نام طرف‌حساب / خریدار
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="city"
                    currentField={customerSortField}
                    currentDirection={customerSortDirection}
                    onSort={handleCustomerSort}
                    className="p-3.5"
                  >
                    شهر / منطقه
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="invoicesCount"
                    currentField={customerSortField}
                    currentDirection={customerSortDirection}
                    onSort={handleCustomerSort}
                    align="center"
                    className="p-3.5 text-center"
                  >
                    تعداد فاکتورها
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="revenue"
                    currentField={customerSortField}
                    currentDirection={customerSortDirection}
                    onSort={handleCustomerSort}
                    align="left"
                    className="p-3.5 text-left"
                  >
                    مجموع خرید خریدار
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="cost"
                    currentField={customerSortField}
                    currentDirection={customerSortDirection}
                    onSort={handleCustomerSort}
                    align="left"
                    className="p-3.5 text-left"
                  >
                    بهای تمام‌شده برای ما
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="profit"
                    currentField={customerSortField}
                    currentDirection={customerSortDirection}
                    onSort={handleCustomerSort}
                    align="left"
                    className="p-3.5 text-left"
                  >
                    سود خالص دریافتی
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="margin"
                    currentField={customerSortField}
                    currentDirection={customerSortDirection}
                    onSort={handleCustomerSort}
                    align="center"
                    className="p-3.5 text-center"
                  >
                    حاشیه سود ٪
                  </SortableTableHeader>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                      اطلاعاتی در این دوره برای طرف‌حساب‌ها یافت نشد.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c, idx) => (
                    <tr key={`profit-cust-${c.customerName || idx}-${idx}`} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-500 dark:text-slate-400 font-mono">
                        #{toPersianDigits(startIndex + idx + 1)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div>{c.customerName}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">
                        {c.customerCity || '-'}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        {toPersianDigits(c.invoicesCount)} فاکتور
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white text-left dir-ltr">
                        {isSecretMode ? '••••••' : formatPrice(c.totalRevenue)}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300 font-bold text-left dir-ltr">
                        {isSecretMode ? '••••••' : formatPrice(c.totalCost)}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-left dir-ltr">
                        {isSecretMode ? '••••••' : `+${formatPrice(c.profit)}`}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                          {isSecretMode ? '••٪' : `${toPersianDigits(c.margin.toFixed(1))}٪`}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {/* Summary Footer Row for Customers Tab */}
              {paginatedCustomers.length > 0 && (
                <tfoot className="bg-slate-50/90 dark:bg-slate-800/70 border-t-2 border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                  <tr>
                    <td colSpan={3} className="p-3.5">
                      <span>جمع کل خریداران ({toPersianDigits(customerProfitability.length)} مشتری)</span>
                    </td>
                    <td className="p-3.5 text-center font-bold">
                      {toPersianDigits(customerProfitability.reduce((s, c) => s + c.invoicesCount, 0))} فاکتور
                    </td>
                    <td className="p-3.5 text-left dir-ltr font-black text-slate-900 dark:text-white">
                      {isSecretMode ? '••••••' : formatPrice(customerProfitability.reduce((s, c) => s + c.totalRevenue, 0))}
                    </td>
                    <td className="p-3.5 text-left dir-ltr font-bold text-slate-700 dark:text-slate-300">
                      {isSecretMode ? '••••••' : formatPrice(customerProfitability.reduce((s, c) => s + c.totalCost, 0))}
                    </td>
                    <td className="p-3.5 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400">
                      {isSecretMode ? '••••••' : `+${formatPrice(customerProfitability.reduce((s, c) => s + c.profit, 0))}`}
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                      {isSecretMode ? '••٪' : `${toPersianDigits(
                        customerProfitability.reduce((s, c) => s + c.totalRevenue, 0) > 0
                          ? ((customerProfitability.reduce((s, c) => s + c.profit, 0) / customerProfitability.reduce((s, c) => s + c.totalRevenue, 0)) * 100).toFixed(1)
                          : '0.0'
                      )}٪`}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Unified Pagination Component */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(newSize) => {
                setItemsPerPage(newSize);
                setCurrentPage(1);
              }}
              totalItems={currentDatasetLength}
            />
          </div>
        )}

      </div>
    </div>
  );
};
