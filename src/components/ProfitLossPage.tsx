import React, { useState, useMemo } from 'react';
import { Invoice, Product, StoreSettings, ProductReturn, Customer, CustomerPayment, TreasuryTransaction } from '../types';
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
  ArrowRight,
  Boxes, 
  Scale, 
  ArrowDownWideNarrow, 
  ArrowUpNarrowWide,
  Tag,
  Calculator,
  Truck,
  Landmark,
  Wallet,
  Coins,
  Receipt,
  Layers,
  ShieldCheck,
  TrendingDown,
  Info,
  CheckCircle2,
  Activity,
  FileSpreadsheet
} from 'lucide-react';
import { Pagination } from './Pagination';
import { SortableTableHeader } from './SortableTableHeader';
import { calculateRealTimeLiquidity, LiquidityBalances } from '../utils/liquidityCalculations';
import { calculateCustomerLiveBalance } from '../utils/customerBalanceCalculations';

interface ProfitLossPageProps {
  invoices: Invoice[];
  products: Product[];
  settings: StoreSettings;
  productReturns?: ProductReturn[];
  treasuryTransactions?: TreasuryTransaction[];
  customers?: Customer[];
  payments?: CustomerPayment[];
  liquidityBalances?: LiquidityBalances;
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
  customers = [],
  payments = [],
  liquidityBalances,
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
  const [activeTab, setActiveTab] = useState<'invoices' | 'purchases' | 'capital-analysis' | 'products' | 'customers'>('invoices');
  const [detailItemFilter, setDetailItemFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');

  // Selected inward invoices for multi-batch simulation & capital analysis
  const [selectedInwardInvoiceIds, setSelectedInwardInvoiceIds] = useState<string[]>([]);
  // Simulation Basis for Tab 3: 'remaining-stock' (بر مبنای موجودی فعلی انبار) vs 'full-batch' (بر مبنای کل بار اولیه)
  const [simulationBasis, setSimulationBasis] = useState<'remaining-stock' | 'full-batch'>('remaining-stock');

  const toggleInwardInvoiceSelection = (invId: string) => {
    setSelectedInwardInvoiceIds(prev => 
      prev.includes(invId) ? prev.filter(id => id !== invId) : [...prev, invId]
    );
  };

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

      // Net purchase cost: Main Goods + Tax - Discount (Freight is displayed as transparent info, not double-deducted)
      const netPurchaseCost = Math.max(0, grossPurchaseCost - discountAmount + invoiceTax);

      const totalProjectedSalesValue = calcProjectedSales > 0 ? calcProjectedSales : Math.round(netPurchaseCost * 1.25);
      // Expected gross profit of inward goods (Sales Value minus Net Purchase Cost)
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
    let totalSalesExpenses = 0;
    let totalItemsCount = 0;

    filteredSalesInvoices.forEach(inv => {
      totalRevenue += (inv.finalAmount || 0);
      totalDiscountsGiven += (inv.hasDiscount ? (inv.discount || 0) : (inv.discount || 0));
      const invExpenses = (inv.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      totalSalesExpenses += invExpenses;
      inv.items.forEach(it => {
        const itemUnitCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
        const cost = it.totalPieces > 0 ? (it.totalPieces * itemUnitCost) : (it.totalPurchaseCost || 0);
        totalCost += cost;
        totalItemsCount += it.totalPieces || 0;
      });
    });

    // Real Gross Profit from Sales Invoices (سود ناخالص واقعی فاکتورهای فروش)
    const rawGrossProfit = Math.max(0, totalRevenue - totalCost - totalSalesExpenses);

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

    // Operational expenses & personal drawings from treasury (STRICTLY EXCLUDING purchase invoices / restocks)
    const operationalExpenses = (treasuryTransactions || []).filter(t => {
      if (t.type !== 'expense') return false;
      if (!isDateInPeriod(t.date, period)) return false;
      const cat = (t.category || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const isPurchaseRestock = cat.includes('خرید') || cat.includes('ورود به انبار') || cat.includes('تامین') || 
                               desc.includes('فاکتور خرید') || desc.includes('ورود به انبار') || desc.includes('تامین‌کننده') || desc.includes('تامین کننده');
      return !isPurchaseRestock;
    });
    const totalOperationalExpenses = operationalExpenses.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Effective gross profit from sales (realized from filtered sales invoices minus customer returns profit)
    const effectiveGrossProfit = Math.max(0, rawGrossProfit - totalCustomerReturnsProfit);
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

  // -------------------------------------------------------------------------
  // COMPREHENSIVE CAPITAL, FREIGHT & NET BUSINESS PROFIT CALCULATIONS
  // -------------------------------------------------------------------------
  const capitalAnalysisData = useMemo(() => {
    // 1. Inward (Purchase) Invoices in this period (excluding drafts)
    const periodInwardInvoices = invoices.filter(inv => inv.type === 'purchase' && !inv.isDraft && isDateInPeriod(inv.date, period));

    // Per-invoice analysis
    const inwardLedger = periodInwardInvoices.map((inv, idx) => {
      const itemsCount = inv.items?.length || 0;
      const totalPieces = (inv.items || []).reduce((s, it) => s + (it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0))), 0);
      const totalCartons = (inv.items || []).reduce((s, it) => s + (it.cartonsCount || 0), 0);

      // Gross purchase price
      const grossPurchaseCost = (inv.items || []).reduce((s, it) => {
        const uPrice = (it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0) ? it.unitPurchasePrice : (it.unitPrice || 0);
        const pieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));
        return s + (uPrice * pieces);
      }, 0);

      const discount = Number(inv.discount) || 0;
      // Net merchandise principal (مایه اصلی خرید کالا)
      const netMerchandisePrincipal = Math.max(0, grossPurchaseCost - discount);

      // Freight and logistics expenses (کرایه بار صرفاً جهت تفکیک و اطلاع)
      const freightExpenses = (inv.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0) || (inv.expensesTotalAddition || 0) || (inv.expensesTotalDeduction || 0);

      // Projected Sales Revenue
      const projectedRevenue = (inv.items || []).reduce((s, it) => {
        const matchingProd = products.find(p => p.id === it.productId || (p.name && it.productName && p.name.trim().toLowerCase() === it.productName.trim().toLowerCase()));
        const sellPrice = (it.unitSellingPrice && it.unitSellingPrice > 0) ? it.unitSellingPrice : (matchingProd?.sellingPrice || (it.unitPurchasePrice ? Math.round(it.unitPurchasePrice * 1.25) : 0));
        const pieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));
        return s + (sellPrice * pieces);
      }, 0);

      // Gross profit (ارزش فروش منهای بهای خرید - بدون کسر مجدد کرایه)
      const projectedGrossProfit = projectedRevenue - netMerchandisePrincipal;
      const markupPercent = netMerchandisePrincipal > 0 ? (projectedGrossProfit / netMerchandisePrincipal) * 100 : 0;
      const freightRatio = netMerchandisePrincipal > 0 ? (freightExpenses / netMerchandisePrincipal) * 100 : 0;

      return {
        inv,
        idx,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        supplierName: inv.customerName || 'تأمین‌کننده نامشخص',
        supplierCity: inv.customerCity || '',
        itemsCount,
        totalCartons,
        totalPieces,
        grossPurchaseCost,
        discount,
        netMerchandisePrincipal,
        freightExpenses,
        landedCost: netMerchandisePrincipal,
        projectedRevenue,
        projectedGrossProfit,
        markupPercent,
        freightRatio
      };
    });

    // Inward totals
    const totalInwardInvoicesCount = inwardLedger.length;
    const totalInwardPieces = inwardLedger.reduce((s, i) => s + i.totalPieces, 0);
    const totalInwardCartons = inwardLedger.reduce((s, i) => s + i.totalCartons, 0);
    const totalInwardMerchandisePrincipal = inwardLedger.reduce((s, i) => s + i.netMerchandisePrincipal, 0); // کل مایه اصلی فاکتورهای ورودی
    const totalInwardFreightExpenses = inwardLedger.reduce((s, i) => s + i.freightExpenses, 0); // کل کرایه‌ها
    const totalInwardLandedCost = totalInwardMerchandisePrincipal; // بهای کل خرید فاکتورها
    const totalInwardProjectedRevenue = inwardLedger.reduce((s, i) => s + i.projectedRevenue, 0); // کل ارزش فروش
    const totalInwardProjectedGrossProfit = inwardLedger.reduce((s, i) => s + i.projectedGrossProfit, 0); // سود ناخالص بارها
    const overallInwardMarkup = totalInwardLandedCost > 0 ? (totalInwardProjectedGrossProfit / totalInwardLandedCost) * 100 : 0;

    // 2. Personal Drawings & Non-Purchase Operational Expenses (برداشت‌های شخصی و مخارج جاری - بدون احتساب خرید کالا)
    // CRITICAL: فاکتورهای خرید کالا و ورود به انبار، تبدیل دارایی و مایه اصلی انبار هستند و نباید به عنوان هزینه از سود کم شوند
    const operationalExpenses = (treasuryTransactions || [])
      .filter(t => {
        if (t.type !== 'expense') return false;
        if (!isDateInPeriod(t.date, period)) return false;
        const cat = (t.category || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const isPurchaseRestock = cat.includes('خرید') || cat.includes('ورود به انبار') || cat.includes('تامین') || 
                                 desc.includes('فاکتور خرید') || desc.includes('ورود به انبار') || desc.includes('تامین‌کننده') || desc.includes('تامین کننده');
        return !isPurchaseRestock;
      });

    const personalDrawings = operationalExpenses.filter(t => {
      const cat = (t.category || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      return cat.includes('برداشت') || cat.includes('شخصی') || desc.includes('برداشت') || desc.includes('شخصی') || desc.includes('خرج شخصی');
    });

    const totalPersonalDrawings = personalDrawings.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalOperationalExpenses = operationalExpenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);

    // Group expenses by category
    const expensesByCategory = new Map<string, number>();
    operationalExpenses.forEach(t => {
      const cat = t.category || 'سایر مخارج شخصی و جاری';
      expensesByCategory.set(cat, (expensesByCategory.get(cat) || 0) + (Number(t.amount) || 0));
    });

    // 3. Final Net Business Profit (سود خالص نهایی بازرگانی = کل سود ناخالص بارها - برداشت‌های شخصی و مخارج جاری)
    const finalNetBusinessProfit = totalInwardProjectedGrossProfit - totalOperationalExpenses;
    const isNetPositive = finalNetBusinessProfit >= 0;

    // 4. Realized Sales & Live Business Performance To Date (عملکرد واقعی و قطعی فروش‌های انجام‌شده تا این لحظه)
    let realizedSalesRevenue = 0;
    let realizedSalesCost = 0;
    let realizedPiecesSold = 0;
    let realizedCashAndBankCollected = 0;
    let realizedCreditSalesAmount = 0;

    filteredSalesInvoices.forEach(inv => {
      realizedSalesRevenue += (inv.finalAmount || 0);

      // Payments tracked for this invoice
      const invPayments = (payments || []).filter(p => p.invoiceId === inv.id && p.type === 'in');
      const paidForInv = invPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      realizedCashAndBankCollected += paidForInv;
      const remainingUnpaid = Math.max(0, (inv.finalAmount || 0) - paidForInv);
      realizedCreditSalesAmount += remainingUnpaid;

      (inv.items || []).forEach(it => {
        const itemUnitCost = getProductDiscountedPurchasePrice(it.productId, it.productName, it.unitPurchasePrice || 0);
        const pieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));
        realizedPiecesSold += pieces;
        realizedSalesCost += (pieces * itemUnitCost);
      });
    });

    const periodInflowPayments = (payments || [])
      .filter(p => p.type === 'in' && isDateInPeriod(p.date, period))
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const totalCollectedCashInflow = periodInflowPayments > 0 ? periodInflowPayments : realizedCashAndBankCollected;
    const realizedGrossProfit = realizedSalesRevenue - realizedSalesCost;
    const realizedProfitMargin = realizedSalesRevenue > 0 ? (realizedGrossProfit / realizedSalesRevenue) * 100 : 0;
    const salesProgressPercent = totalInwardPieces > 0 ? Math.min(100, (realizedPiecesSold / totalInwardPieces) * 100) : 0;

    // Expected live liquid cash from collected inflows minus personal drawings & expenses
    const expectedLiveCashInHand = totalCollectedCashInflow - totalOperationalExpenses;

    // 5. Live Business Assets & Liquidity
    const liquidity = liquidityBalances || calculateRealTimeLiquidity(payments, treasuryTransactions, productReturns, customers);
    
    // Inventory valuation
    const stockCostValue = products.reduce((s, p) => s + ((p.stockPieces || 0) * (p.purchasePrice || 0)), 0);
    const stockSellValue = products.reduce((s, p) => s + ((p.stockPieces || 0) * (p.sellingPrice || 0)), 0);
    const totalStockPieces = products.reduce((s, p) => s + (p.stockPieces || 0), 0);

    // Trade Receivables (طلب‌های تجاری از مشتریان)
    let totalTradeReceivables = 0;
    let totalTradePayables = 0;
    (customers || []).forEach(c => {
      const balance = calculateCustomerLiveBalance(c, invoices, payments, productReturns);
      if (balance > 0) {
        totalTradeReceivables += balance;
      } else if (balance < 0) {
        totalTradePayables += Math.abs(balance);
      }
    });

    // Net Commercial Worth (خالص کل دارایی‌های جاری کسب‌وکار)
    const netCurrentAssets = (liquidity.totalLiquidity + stockCostValue + totalTradeReceivables) - totalTradePayables;
    const totalInwardRecoveredCapital = totalInwardMerchandisePrincipal + Math.max(0, finalNetBusinessProfit);

    return {
      inwardLedger,
      totalInwardInvoicesCount,
      totalInwardPieces,
      totalInwardCartons,
      totalInwardMerchandisePrincipal,
      totalInwardFreightExpenses,
      totalInwardLandedCost,
      totalInwardProjectedRevenue,
      totalInwardProjectedGrossProfit,
      overallInwardMarkup,
      operationalExpenses,
      personalDrawings,
      totalPersonalDrawings,
      totalOperationalExpenses,
      expensesByCategory,
      finalNetBusinessProfit,
      isNetPositive,
      totalInwardRecoveredCapital,
      // Realized Sales & Live Stock metrics
      realizedSalesRevenue,
      realizedSalesCost,
      realizedGrossProfit,
      realizedProfitMargin,
      realizedPiecesSold,
      salesProgressPercent,
      totalCollectedCashInflow,
      realizedCreditSalesAmount,
      expectedLiveCashInHand,
      liquidity,
      stockCostValue,
      stockSellValue,
      totalStockPieces,
      totalTradeReceivables,
      totalTradePayables,
      netCurrentAssets
    };
  }, [invoices, products, period, treasuryTransactions, payments, productReturns, customers, liquidityBalances, filteredSalesInvoices]);

  // Interactive Simulation for selected inward invoices / remaining stock
  const simulationMetrics = useMemo(() => {
    const isCustomSelection = selectedInwardInvoiceIds.length > 0;
    const targets = isCustomSelection
      ? capitalAnalysisData.inwardLedger.filter(i => selectedInwardInvoiceIds.includes(i.inv.id))
      : capitalAnalysisData.inwardLedger.slice(0, 3); // پیش‌فرض: ۳ فاکتور ورودی اخیر

    const count = targets.length;

    // 1. Full Initial Batch Figures (دست نخورده / اولیه)
    const fullMerchandisePrincipal = targets.reduce((s, i) => s + i.netMerchandisePrincipal, 0);
    const fullFreightExpenses = targets.reduce((s, i) => s + i.freightExpenses, 0);
    const fullLandedCost = targets.reduce((s, i) => s + i.landedCost, 0);
    const fullProjectedRevenue = targets.reduce((s, i) => s + i.projectedRevenue, 0);
    const fullProjectedGrossProfit = targets.reduce((s, i) => s + i.projectedGrossProfit, 0);
    const fullTotalCartons = targets.reduce((s, i) => s + i.totalCartons, 0);
    const fullTotalPieces = targets.reduce((s, i) => s + i.totalPieces, 0);

    // 2. Remaining Current Physical Stock Figures (موجودی حال حاضر انبار پس از فروش‌های انجام شده)
    const targetProductIds = new Set<string>();
    const targetProductNames = new Set<string>();
    targets.forEach(t => {
      (t.inv.items || []).forEach(it => {
        if (it.productId) targetProductIds.add(it.productId);
        if (it.productName) targetProductNames.add(it.productName.trim().toLowerCase());
      });
    });

    const isAllSelected = selectedInwardInvoiceIds.length === capitalAnalysisData.inwardLedger.length && capitalAnalysisData.inwardLedger.length > 0;
    const relevantProducts = (!isCustomSelection || isAllSelected)
      ? products
      : products.filter(p => targetProductIds.has(p.id) || targetProductNames.has(p.name?.trim().toLowerCase()));

    const remainingStockPieces = relevantProducts.reduce((s, p) => s + Math.max(0, Number(p.stockPieces) || 0), 0);
    const remainingStockCartons = relevantProducts.reduce((s, p) => {
      const ppc = p.cartonQuantity || p.piecesPerCarton || 1;
      const stock = Math.max(0, Number(p.stockPieces) || 0);
      return s + (ppc > 1 ? Math.floor(stock / ppc) : 0);
    }, 0);

    const remainingMerchandisePrincipal = relevantProducts.reduce((s, p) => s + (Math.max(0, Number(p.stockPieces) || 0) * (Number(p.purchasePrice) || 0)), 0);
    const remainingProjectedRevenue = relevantProducts.reduce((s, p) => s + (Math.max(0, Number(p.stockPieces) || 0) * (Number(p.sellingPrice) || 0)), 0);
    const remainingProjectedGrossProfit = Math.max(0, remainingProjectedRevenue - remainingMerchandisePrincipal);

    // Proportional share of operational expenses for this batch of invoices
    const expenseShare = capitalAnalysisData.inwardLedger.length > 0
      ? Math.round((capitalAnalysisData.totalOperationalExpenses / capitalAnalysisData.inwardLedger.length) * count)
      : 0;

    // Determine values based on chosen simulationBasis
    const isRemainingMode = simulationBasis === 'remaining-stock';
    const merchandisePrincipal = isRemainingMode ? remainingMerchandisePrincipal : fullMerchandisePrincipal;
    const freightExpenses = isRemainingMode ? 0 : fullFreightExpenses;
    const landedCost = isRemainingMode ? remainingMerchandisePrincipal : fullLandedCost;
    const projectedRevenue = isRemainingMode ? remainingProjectedRevenue : fullProjectedRevenue;
    const projectedGrossProfit = isRemainingMode ? remainingProjectedGrossProfit : fullProjectedGrossProfit;
    const markupPercent = landedCost > 0 ? (projectedGrossProfit / landedCost) * 100 : 0;
    const totalCartons = isRemainingMode ? remainingStockCartons : fullTotalCartons;
    const totalPieces = isRemainingMode ? remainingStockPieces : fullTotalPieces;

    const netProfit = projectedGrossProfit - expenseShare;
    // Direct Cash from Inventory: اصل سرمایه موجودی + سود خالص منهای مخارج = ارزش فروش منهای مخارج
    const inventoryCashReturn = merchandisePrincipal + netProfit;

    // Comprehensive Business Realizable Cash (فرمول ۵گانه جامع: موجودی خرید + سود موجودی + مطالبات نسیه + نقدینگی حاضر - مخارج)
    const currentLiquidity = capitalAnalysisData.liquidity.totalLiquidity;
    const tradeReceivables = capitalAnalysisData.totalTradeReceivables;
    const comprehensiveExpenses = isRemainingMode ? capitalAnalysisData.totalOperationalExpenses : expenseShare;
    const comprehensiveTotalRealizableCash = (merchandisePrincipal + projectedGrossProfit + tradeReceivables + currentLiquidity) - comprehensiveExpenses;

    return {
      isCustomSelection,
      simulationBasis,
      isRemainingMode,
      targets,
      count,
      merchandisePrincipal,
      freightExpenses,
      landedCost,
      projectedRevenue,
      projectedGrossProfit,
      markupPercent,
      expenseShare,
      netProfit,
      totalCashReturn: isRemainingMode ? comprehensiveTotalRealizableCash : inventoryCashReturn,
      inventoryCashReturn,
      comprehensiveTotalRealizableCash,
      currentLiquidity,
      tradeReceivables,
      comprehensiveExpenses,
      totalCartons,
      totalPieces,
      // Full vs Remaining details
      fullMerchandisePrincipal,
      fullProjectedRevenue,
      fullProjectedGrossProfit,
      remainingMerchandisePrincipal,
      remainingProjectedRevenue,
      remainingProjectedGrossProfit,
      remainingStockPieces,
      relevantProductsCount: relevantProducts.length
    };
  }, [selectedInwardInvoiceIds, capitalAnalysisData, simulationBasis, products]);

  const currentDatasetLength = useMemo(() => {
    if (activeTab === 'invoices') return filteredSalesInvoices.length;
    if (activeTab === 'purchases') return purchaseInvoicesProfitability.length;
    if (activeTab === 'capital-analysis') return capitalAnalysisData.inwardLedger.length;
    if (activeTab === 'products') return productProfitability.length;
    if (activeTab === 'customers') return customerProfitability.length;
    return 0;
  }, [activeTab, filteredSalesInvoices.length, purchaseInvoicesProfitability.length, capitalAnalysisData.inwardLedger.length, productProfitability.length, customerProfitability.length]);

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

  const paginatedInwardLedger = useMemo(() => {
    return capitalAnalysisData.inwardLedger.slice(startIndex, startIndex + itemsPerPage);
  }, [capitalAnalysisData.inwardLedger, startIndex, itemsPerPage]);

  const selectAllInwardInvoices = () => {
    setSelectedInwardInvoiceIds(capitalAnalysisData.inwardLedger.map(i => i.inv.id));
  };
  const selectLatestThreeInvoices = () => {
    setSelectedInwardInvoiceIds(capitalAnalysisData.inwardLedger.slice(0, 3).map(i => i.inv.id));
  };
  const clearInwardSelection = () => {
    setSelectedInwardInvoiceIds([]);
  };

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
      let tierTitle = isPurchase ? 'حاشیه سود متعارف' : 'سود متعارف';
      let tierBadge = 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';

      if (margin >= 18) {
        tier = 'high';
        tierTitle = isPurchase ? 'حاشیه سود بالا' : 'سود بالا';
        tierBadge = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      } else if (margin < 10) {
        tier = 'low';
        tierTitle = isPurchase ? 'حاشیه سود اندک' : 'سود اندک / سربه‌سر';
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
    const netMerchandiseCost = Math.max(0, totalCostGross - invoiceDiscountAmount);

    const totalRevGross = analyzedItems.reduce((sum, it) => sum + it.rowRevenueGross, 0);
    const totalRevNet = !isPurchase
      ? (hasDiscount ? Math.max(0, totalRevGross - invoiceDiscountAmount) : (inv.finalAmount || totalRevGross))
      : totalRevGross;

    // For purchase invoices, totalCost is the invoice purchase amount. Freight is displayed for information and NOT double-deducted.
    const totalCost = isPurchase ? netMerchandiseCost : totalCostGross;
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
        {/* 1. Header Toolbar with Clear Navigation & Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedInvoiceForDetail(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>بازگشت به جدول اصلی</span>
            </button>

            <div className="border-r border-slate-200 dark:border-slate-800 pr-3 mr-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isPurchase ? `ریز محاسبات و سود فاکتور خرید #${toPersianDigits(inv.invoiceNumber)}` : `ریز محاسبات سود فاکتور فروش #${toPersianDigits(inv.invoiceNumber)}`}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                  isPurchase 
                    ? `${theme.badgeBg} ${theme.badgeText} ${theme.borderColor}`
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {isPurchase ? 'ورود به انبار (خرید)' : 'فروش کالا'}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700">
                  {toPersianDigits(inv.items.length)} قلم کالا ({toPersianDigits(totalCartonsSum)} کارتن)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {isPurchase ? 'تأمین‌کننده:' : 'مشتری:'} <strong className="text-slate-800 dark:text-slate-200 font-bold">{inv.customerName}</strong> {inv.customerCity ? `(${inv.customerCity})` : ''} • تاریخ: {toPersianDigits(inv.date)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => onViewInvoice(inv)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-bold text-xs shadow-xs transition-all cursor-pointer`}
            >
              <FileText className="w-4 h-4" />
              <span>مشاهده فاکتور کامل</span>
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
              title="چاپ برگه محاسبات"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Structured Executive Financial Cards */}
        {isPurchase ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Projected Revenue */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">ارزش کل فروش ۱۰۰٪ اقلام</span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block dir-ltr text-right font-mono tabular-nums">
                {isSecretMode ? '••••••' : formatPrice(totalRev)}
              </span>
              <span className="text-[10.5px] text-slate-400 block truncate">
                {toPersianDigits(totalPiecesSum.toLocaleString())} عدد کالا در {toPersianDigits(totalCartonsSum)} کارتن
              </span>
            </div>

            {/* Card 2: Merchandise Principal */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">بهای خرید فاکتور (خالص)</span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block dir-ltr text-right font-mono tabular-nums">
                {isSecretMode ? '••••••' : formatPrice(netMerchandiseCost)}
              </span>
              <span className="text-[10.5px] text-slate-400 block truncate">
                {hasDiscount ? `تخفیف نقدی: -${formatPrice(invoiceDiscountAmount)}` : 'بدون تخفیف خرید'}
              </span>
            </div>

            {/* Card 3: Freight Expenses (Display only) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-sky-200/80 dark:border-sky-900/60 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 block">کرایه بار (نمایش تفکیکی)</span>
              <span className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-300 block dir-ltr text-right font-mono tabular-nums">
                {isSecretMode ? '••••••' : (totalExpensesAmount > 0 ? `+${formatPrice(totalExpensesAmount)}` : '۰ تومان')}
              </span>
              <span className="text-[10.5px] text-sky-600 dark:text-sky-400 block truncate font-medium">
                {(inv.expenses && inv.expenses.length > 0) ? `${toPersianDigits(inv.expenses.length)} سرفصل کرایه حمل` : 'بدون هزینه حمل'}
              </span>
            </div>

            {/* Card 4: Projected Profit */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-700/80 shadow-xs space-y-1">
              <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 block">سود پیش‌بینی‌شده فاکتور</span>
              <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 block dir-ltr text-right font-mono tabular-nums">
                {isSecretMode ? '••••••' : `+${formatPrice(totalProfit)}`}
              </span>
              <span className="text-[10.5px] text-emerald-700 dark:text-emerald-400 block truncate font-bold">
                مارک‌آپ: {toPersianDigits(overallMargin.toFixed(1))}٪ · فی سود: +{formatPrice(weightedAvgProfitPerPiece)}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">مبلغ کل فروش فاکتور</span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block dir-ltr text-right font-mono tabular-nums">
                {isSecretMode ? '••••••' : formatPrice(totalRev)}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {toPersianDigits(totalPiecesSum.toLocaleString())} عدد در {toPersianDigits(totalCartonsSum)} کارتن
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">بهای تمام‌شده خرید کالا</span>
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block dir-ltr text-right font-mono tabular-nums">
                {isSecretMode ? '••••••' : formatPrice(totalCost)}
              </span>
              <span className="text-[11px] text-slate-400 block">
                {hasDiscount ? `تخفیف: -${formatPrice(invoiceDiscountAmount)}` : 'بدون تخفیف'}
              </span>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-700/80 shadow-xs space-y-1">
              <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 block">سود خالص کل فاکتور</span>
              <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 block dir-ltr text-right font-mono tabular-nums">
                {isSecretMode ? '••••••' : `+${formatPrice(totalProfit)}`}
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-bold">
                میانگین سود هر عدد: +{formatPrice(weightedAvgProfitPerPiece)}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-1">
              <span className={`text-xs font-bold ${theme.primaryText} block`}>حاشیه سود و بازدهی</span>
              <span className={`text-base sm:text-lg font-black ${theme.primaryText} block dir-ltr text-right font-mono tabular-nums`}>
                {isSecretMode ? '••٪' : `${toPersianDigits(overallMargin.toFixed(1))}٪`}
              </span>
              <span className="text-[11px] text-slate-400 block">
                بازده سرمایه: {toPersianDigits(roiPercentage.toFixed(1))}٪
              </span>
            </div>
          </div>
        )}

        {/* 3. Inward Freight Expenses Breakdown Banner (If Logged) */}
        {isPurchase && inv.expenses && inv.expenses.length > 0 && (
          <div className="bg-sky-50/60 dark:bg-sky-950/30 rounded-2xl p-4 border border-sky-200/80 dark:border-sky-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-200">
                <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>ریز سرفصل‌های کرایه بار و هزینه‌های ورود ({toPersianDigits(inv.expenses.length)} مورد)</span>
              </div>
              <span className="text-xs font-black text-sky-800 dark:text-sky-200 font-mono tabular-nums dir-ltr">
                جمع کل کرایه: +{formatPrice(totalExpensesAmount)} تومان
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {inv.expenses.map((exp, eIdx) => (
                <div key={`exp-${exp.id || eIdx}`} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{exp.description || 'کرایه حمل کالا'}</span>
                  <span className="font-bold font-mono text-slate-900 dark:text-white dir-ltr tabular-nums shrink-0 mr-2">
                    {formatPrice(exp.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Filter Tabs for Invoice Items */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setDetailItemFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                detailItemFilter === 'all'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              همه اقلام ({toPersianDigits(analyzedItems.length)})
            </button>
            <button
              onClick={() => setDetailItemFilter('high')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                detailItemFilter === 'high'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              حاشیه سود بالا ({toPersianDigits(highCount)})
            </button>
            <button
              onClick={() => setDetailItemFilter('medium')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                detailItemFilter === 'medium'
                  ? `${theme.primary} text-white shadow-xs`
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              حاشیه سود متعارف ({toPersianDigits(mediumCount)})
            </button>
            <button
              onClick={() => setDetailItemFilter('low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                detailItemFilter === 'low'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              حاشیه سود اندک ({toPersianDigits(lowCount)})
            </button>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            تفکیک بر حسب تعداد کل، کارتن، قیمت خرید و حاشیه سود هر سطر
          </span>
        </div>

        {/* 5. Clean Detailed Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-[13px] select-none">
                <tr>
                  <th className="p-3.5 text-center w-12 font-black">ردیف</th>
                  <th className="p-3.5 font-black text-right">شرح کالا و مشخصات کارتن</th>
                  <th className="p-3.5 text-center font-black">تعداد کل</th>
                  <th className="p-3.5 text-left font-black">فی خرید</th>
                  <th className="p-3.5 text-left font-black">{isPurchase ? 'فی فروش مصوب' : 'فی فروش واحد'}</th>
                  <th className="p-3.5 text-left font-black">{isPurchase ? 'جمع بهای خرید' : 'بهای کل خرید'}</th>
                  <th className="p-3.5 text-left font-black">{isPurchase ? 'جمع ارزش فروش' : 'مبلغ کل فروش'}</th>
                  <th className="p-3.5 text-left font-black">سود هر عدد</th>
                  <th className="p-3.5 text-left font-black">{isPurchase ? 'سود ناخالص سطر' : 'سود کل سطر'}</th>
                  <th className="p-3.5 text-center font-black">{isPurchase ? 'مارک‌آپ' : 'حاشیه سود'}</th>
                  <th className="p-3.5 text-center font-black">وضعیت</th>
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
                      <td className="p-3.5 text-center font-bold text-slate-400 font-mono tabular-nums">
                        {toPersianDigits(it.idx + 1)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <div>{it.productName}</div>
                        <div className={`text-[11px] ${theme.primaryText} font-bold mt-0.5 flex items-center gap-1`}>
                          <Boxes className="w-3.5 h-3.5 shrink-0" />
                          <span>{it.cartonFullText}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                        {toPersianDigits(it.totalPieces.toLocaleString())} {it.unitTitle || 'عدد'}
                      </td>
                      <td className="p-3.5 text-left dir-ltr font-mono tabular-nums">
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
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white text-left dir-ltr font-mono tabular-nums">
                        {isSecretMode ? '••••' : formatPrice(it.unitSell)}
                      </td>
                      <td className="p-3.5 text-left dir-ltr font-mono tabular-nums">
                        {hasDiscount && isPurchase && it.itemDiscountSavings > 0 ? (
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {isSecretMode ? '••••••' : formatPrice(it.rowCost)}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal dir-rtl text-right">
                              تخفیف: -{formatPrice(it.itemDiscountSavings)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            {isSecretMode ? '••••••' : formatPrice(it.rowCost)}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white text-left dir-ltr font-mono tabular-nums">
                        {isSecretMode ? '••••••' : formatPrice(it.rowRevenue)}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-left dir-ltr font-mono tabular-nums">
                        {isSecretMode ? '••••' : `+${formatPrice(it.profitPerPiece)}`}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-left dir-ltr font-mono tabular-nums">
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

              {/* Comprehensive Footer Row */}
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
                  <td className="p-3.5 text-center font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    {toPersianDigits(totalPiecesSum.toLocaleString())} عدد
                  </td>
                  <td className="p-3.5 text-left dir-ltr font-mono tabular-nums">
                    <div className="text-[10px] text-slate-400 font-normal">میانگین خرید:</div>
                    <div className="font-bold text-slate-700 dark:text-slate-300">
                      {isSecretMode ? '••••' : formatPrice(weightedAvgCost)}
                    </div>
                  </td>
                  <td className="p-3.5 text-left dir-ltr font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    <div className="text-[10px] text-slate-400 font-normal">میانگین فروش:</div>
                    <div>{isSecretMode ? '••••' : formatPrice(weightedAvgSell)}</div>
                  </td>
                  <td className="p-3.5 text-left dir-ltr font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    <div>{isSecretMode ? '••••••' : formatPrice(totalCost)}</div>
                    {isPurchase && totalExpensesAmount > 0 && (
                      <div className="text-[10px] text-sky-600 dark:text-sky-400 font-bold dir-rtl text-right">
                        کرایه بار: +{formatPrice(totalExpensesAmount)}
                      </div>
                    )}
                    {hasDiscount && isPurchase && (
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal dir-rtl text-right">
                        تخفیف: -{formatPrice(invoiceDiscountAmount)}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-left dir-ltr font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                    <div>{isSecretMode ? '••••••' : formatPrice(totalRev)}</div>
                    {hasDiscount && !isPurchase && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal dir-rtl text-right">
                        تخفیف فروش: -{formatPrice(invoiceDiscountAmount)}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-left dir-ltr font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    <div className="text-[10px] text-emerald-700 font-normal">سود هر عدد:</div>
                    <div>{isSecretMode ? '••••' : `+${formatPrice(weightedAvgProfitPerPiece)}`}</div>
                  </td>
                  <td className="p-3.5 text-left dir-ltr bg-emerald-500/10 dark:bg-emerald-950/40 border-x border-emerald-300 dark:border-emerald-800 font-mono tabular-nums">
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                      {isPurchase ? 'سود پیش‌بینی کل:' : 'سود خالص قطعی:'}
                    </div>
                    <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                      {isSecretMode ? '••••••' : `+${formatPrice(totalProfit)}`}
                    </div>
                  </td>
                  <td className={`p-3.5 text-center font-bold ${theme.primaryText} dir-ltr text-xs font-mono tabular-nums`}>
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
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-all no-print">
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
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3.5 no-print">
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
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">سود خالص کل بازرگانی</span>
            <div className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className={`text-xl sm:text-2xl font-black ${summaryMetrics.netOperatingProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} dir-ltr text-right font-mono`}>
            {isSecretMode ? '••••••' : (summaryMetrics.netOperatingProfit >= 0 ? `+${formatPrice(summaryMetrics.netOperatingProfit)}` : formatPrice(summaryMetrics.netOperatingProfit))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>سود ناخالص فروش ({toPersianDigits(summaryMetrics.invoicesCount)} فاکتور):</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
              {isSecretMode ? '••••••' : formatPrice(summaryMetrics.effectiveGrossProfit)}
            </span>
          </div>
        </div>

        {/* Card 2: مجموع فروش فاکتورها */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
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
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
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
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2">
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
          onClick={() => setActiveTab('capital-analysis')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'capital-analysis'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>تحلیل سرمایه، بار ورودی و سود خالص</span>
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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        
        {/* TAB 1: SALES INVOICES PROFITABILITY */}
        {activeTab === 'invoices' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-[13px] select-none">
                <tr>
                  <SortableTableHeader
                    field="invoiceNumber"
                    currentField={salesSortField}
                    currentDirection={salesSortDirection}
                    onSort={handleSalesSort}
                    align="right"
                    className="p-3.5"
                  >
                    شماره سند
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="date"
                    currentField={salesSortField}
                    currentDirection={salesSortDirection}
                    onSort={handleSalesSort}
                    align="right"
                    className="p-3.5"
                  >
                    تاریخ صدور
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="customer"
                    currentField={salesSortField}
                    currentDirection={salesSortDirection}
                    onSort={handleSalesSort}
                    align="right"
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

                  <th className="p-3.5 text-center font-black text-xs sm:text-[13px]">عملیات</th>
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

        {/* TAB 2: PURCHASE INVOICES PROFITABILITY (INWARD GOODS - CLEAN & PROPORTIONAL) */}
        {activeTab === 'purchases' && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-[13px] select-none">
                <tr>
                  <SortableTableHeader
                    field="invoiceNumber"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="right"
                    className="p-3.5 whitespace-nowrap"
                  >
                    شماره و تاریخ
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="customer"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="right"
                    className="p-3.5"
                  >
                    تأمین‌کننده
                  </SortableTableHeader>

                  <th className="p-3.5 text-center font-black">اقلام و کارتن</th>

                  <SortableTableHeader
                    field="cost"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="left"
                    className="p-3.5 text-left whitespace-nowrap"
                  >
                    بهای خرید فاکتور
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="expenses"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="left"
                    className="p-3.5 text-left whitespace-nowrap"
                  >
                    کرایه بار (تفکیکی)
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="projectedSales"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="left"
                    className="p-3.5 text-left whitespace-nowrap"
                  >
                    ارزش فروش اقلام
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="profit"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="left"
                    className="p-3.5 text-left whitespace-nowrap"
                  >
                    سود پیش‌بینی‌شده
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="markup"
                    currentField={purchaseSortField}
                    currentDirection={purchaseSortDirection}
                    onSort={handlePurchaseSort}
                    align="center"
                    className="p-3.5 text-center whitespace-nowrap"
                  >
                    مارک‌آپ
                  </SortableTableHeader>

                  <th className="p-3.5 text-center whitespace-nowrap w-24 font-black">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {paginatedPurchaseInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400 font-medium">
                      هیچ فاکتور ورود کالا در این بازه زمانی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  paginatedPurchaseInvoices.map((inv, idx) => {
                    const totalCartons = (inv.items || []).reduce((s, it) => s + (it.cartonsCount || 0), 0);
                    return (
                      <tr key={`profit-pur-inv-${inv.id || idx}-${idx}`} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors">
                        {/* 1. Number & Date */}
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-lg ${theme.light} ${theme.primaryText} border ${theme.borderColor} inline-block`}>
                            #{toPersianDigits(inv.invoiceNumber)}
                          </span>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {toPersianDigits(inv.date)}
                          </div>
                        </td>

                        {/* 2. Supplier */}
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          <div>{inv.customerName}</div>
                          {inv.customerCity && (
                            <div className="text-[10.5px] text-slate-400 font-normal">
                              {inv.customerCity}
                            </div>
                          )}
                        </td>

                        {/* 3. Items & Cartons */}
                        <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                          <div>{toPersianDigits(inv.items.length)} قلم</div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-normal">
                            {toPersianDigits(totalCartons)} کارتن · {toPersianDigits(inv.totalItemsPieces.toLocaleString())} عدد
                          </div>
                        </td>

                        {/* 4. Net Purchase Cost */}
                        <td className="p-3.5 text-left dir-ltr whitespace-nowrap">
                          <div className="font-black text-slate-900 dark:text-white font-mono tabular-nums">
                            {isSecretMode ? '••••••' : formatPrice(inv.netPurchaseCost)}
                          </div>
                          {inv.hasDiscount && inv.discountAmount > 0 && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal dir-rtl text-right">
                              تخفیف: -{formatPrice(inv.discountAmount)}
                            </div>
                          )}
                        </td>

                        {/* 5. Freight (Informational) */}
                        <td className="p-3.5 text-left dir-ltr font-bold text-sky-700 dark:text-sky-300 font-mono tabular-nums whitespace-nowrap">
                          <div>{isSecretMode ? '••••••' : (inv.totalExpensesAmount > 0 ? `+${formatPrice(inv.totalExpensesAmount)}` : '۰ تومان')}</div>
                          {inv.totalExpensesAmount > 0 && (
                            <div className="text-[10px] text-sky-600 dark:text-sky-400 font-normal dir-rtl text-right">
                              هزینه باربری
                            </div>
                          )}
                        </td>

                        {/* 6. Projected Sales */}
                        <td className="p-3.5 text-slate-800 dark:text-slate-200 font-bold text-left dir-ltr font-mono tabular-nums whitespace-nowrap">
                          {isSecretMode ? '••••••' : formatPrice(inv.totalProjectedSalesValue)}
                        </td>

                        {/* 7. Projected Profit */}
                        <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400 text-left dir-ltr font-mono tabular-nums whitespace-nowrap">
                          {isSecretMode ? '••••••' : `+${formatPrice(inv.projectedProfit)}`}
                        </td>

                        {/* 8. Markup */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 font-mono">
                            {isSecretMode ? '••٪' : `+${toPersianDigits(inv.markupPercentage.toFixed(1))}٪`}
                          </span>
                        </td>

                        {/* 9. Actions */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedInvoiceForDetail(inv)}
                              className={`px-2.5 py-1 ${theme.light} ${theme.primaryText} hover:opacity-85 rounded-lg text-xs font-bold transition-all cursor-pointer border ${theme.borderColor} shadow-2xs flex items-center gap-1`}
                              title="محاسبه دقیق اقلام در همین صفحه"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              <span>اقلام</span>
                            </button>
                            <button
                              onClick={() => onViewInvoice(inv)}
                              className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                              title="مشاهده فاکتور خرید"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Summary Footer Row for Purchase Tab */}
              {paginatedPurchaseInvoices.length > 0 && (
                <tfoot className="bg-slate-50/90 dark:bg-slate-800/70 border-t-2 border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                  <tr>
                    <td colSpan={3} className="py-3.5 px-3.5">
                      <span>جمع ({toPersianDigits(purchaseInvoicesProfitability.length)} فاکتور ورود کالا)</span>
                    </td>
                    <td className="py-3.5 px-3.5 text-left dir-ltr font-black">
                      <div>{isSecretMode ? '••••••' : formatPrice(summaryMetrics.totalInwardPurchasesNet)}</div>
                    </td>
                    <td className="py-3.5 px-3.5 text-left dir-ltr font-bold text-sky-700 dark:text-sky-300">
                      <div>{isSecretMode ? '••••••' : (summaryMetrics.totalInwardPurchasesFreightAndExpenses > 0 ? `+${formatPrice(summaryMetrics.totalInwardPurchasesFreightAndExpenses)}` : '۰ تومان')}</div>
                    </td>
                    <td className="py-3.5 px-3.5 text-left dir-ltr font-bold text-slate-800 dark:text-slate-200">
                      {isSecretMode ? '••••••' : formatPrice(purchaseInvoicesProfitability.reduce((s, p) => s + p.totalProjectedSalesValue, 0))}
                    </td>
                    <td className="py-3.5 px-3.5 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400">
                      {isSecretMode ? '••••••' : `+${formatPrice(purchaseInvoicesProfitability.reduce((s, p) => s + p.projectedProfit, 0))}`}
                    </td>
                    <td className="py-3.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                      {isSecretMode ? '••٪' : `+${toPersianDigits(
                        summaryMetrics.totalInwardPurchasesNet > 0
                          ? ((purchaseInvoicesProfitability.reduce((s, p) => s + p.projectedProfit, 0) / summaryMetrics.totalInwardPurchasesNet) * 100).toFixed(1)
                          : '0.0'
                      )}٪`}
                    </td>
                    <td className="py-3.5 px-3.5 text-center text-[11px] text-slate-500 font-medium">
                      {toPersianDigits(purchaseInvoicesProfitability.reduce((s, p) => s + p.totalItemsPieces, 0))} عدد کالا
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* TAB 3: CAPITAL, INWARD FREIGHT & NET PROFIT ANALYSIS (تحلیل سرمایه، بار ورودی و سود خالص) */}
        {activeTab === 'capital-analysis' && (
          <div className="p-3 sm:p-5 space-y-6">
            {/* 1. SECTION: LIVE STORE & REALIZED PERFORMANCE TO DATE (صورت وضعیت جامع دارایی‌ها، عملکرد زنده فروش تا الان و نسیه) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Activity className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      صورت وضعیت جامع دارایی‌ها، نقدینگی و عملکرد زنده انبار
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      حساب و کتاب دقیق فروش‌های تحقق‌یافته تا این لحظه، سود قطعی، ارزش انبار و نسیه‌ها
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>عملکرد واقعی و زنده تا این لحظه</span>
                </div>
              </div>

              {/* 6 Realized Financial Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {/* 1. Realized Gross Sales */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 space-y-1">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    کل فروش تحقق‌یافته
                  </span>
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.realizedSalesRevenue)}
                  </div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>فروش واقعی ثبت‌شده</span>
                    <span>{toPersianDigits(filteredSalesInvoices.length)} فاکتور</span>
                  </div>
                </div>

                {/* 2. Realized Gross Profit */}
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 space-y-1">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 block">
                    سود قطعی به‌دست‌آمده
                  </span>
                  <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••••••' : `+${formatPrice(capitalAnalysisData.realizedGrossProfit)}`}
                  </div>
                  <div className="text-[10.5px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 font-bold">
                    <span>حاشیه سود واقعی:</span>
                    <span>{toPersianDigits(capitalAnalysisData.realizedProfitMargin.toFixed(1))}٪</span>
                  </div>
                </div>

                {/* 3. Sales Progress & Depletion Rate */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 space-y-1">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    پیشرفت فروش کل بارها
                  </span>
                  <div className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••٪' : `${toPersianDigits(capitalAnalysisData.salesProgressPercent.toFixed(1))}٪`}
                  </div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 font-mono">
                    <span>فروش رفته:</span>
                    <span>{toPersianDigits(capitalAnalysisData.realizedPiecesSold.toLocaleString())} از {toPersianDigits(capitalAnalysisData.totalInwardPieces.toLocaleString())}</span>
                  </div>
                </div>

                {/* 4. Live Inventory Valuation */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 space-y-1">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    موجودی زنده در انبار
                  </span>
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.stockCostValue)}
                  </div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span>{toPersianDigits(capitalAnalysisData.totalStockPieces.toLocaleString())} عدد کالا</span>
                    <span className="font-mono">فروش: {formatPrice(capitalAnalysisData.stockSellValue)}</span>
                  </div>
                </div>

                {/* 5. Expected Live Cash in Hand vs Actual Liquidity */}
                <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 space-y-1">
                  <span className="text-xs font-black text-amber-900 dark:text-amber-200 block">
                    نقدینگی انتظاری در حساب
                  </span>
                  <div className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-200 font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.expectedLiveCashInHand)}
                  </div>
                  <div className="text-[10.5px] text-amber-800 dark:text-amber-300 flex items-center justify-between pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                    <span>دریافتی منهای مخارج</span>
                    <span className="font-mono">صندوق+بانک: {formatPrice(capitalAnalysisData.liquidity.totalLiquidity)}</span>
                  </div>
                </div>

                {/* 6. Pending Trade Receivables (Credit Sales / نسیه) */}
                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/70 space-y-1">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 block">
                    مطالبات نسیه معوق
                  </span>
                  <div className="text-base sm:text-lg font-black text-indigo-800 dark:text-indigo-200 font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.totalTradeReceivables)}
                  </div>
                  <div className="text-[10.5px] text-indigo-700 dark:text-indigo-300 flex items-center justify-between pt-1 border-t border-indigo-200/60 dark:border-indigo-800/60">
                    <span>طلب از مشتریان</span>
                    <span>فروش نسیه</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SECTION: EXECUTIVE ACTION TOOLBAR & SIMULATION CONTROLS */}
            <div className="bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`p-2.5 rounded-xl ${theme.light} ${theme.primaryText}`}>
                    <Coins className="w-5 h-5" />
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {simulationBasis === 'remaining-stock'
                      ? 'محاسبه سودآوری و عایدی بر مبنای «موجودی باقیمانده انبار»'
                      : 'شبیه‌ساز سودآوری کل بارنامه‌ها (تحلیل سناریوی فروش کامل ۱۰۰٪)'}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${simulationBasis === 'remaining-stock' ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'}`}>
                    {simulationBasis === 'remaining-stock' ? 'موجودی پس از کسر فروش‌های انجام‌شده' : 'کل بار اولیه فاکتورها'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {simulationBasis === 'remaining-stock'
                    ? 'محاسبه ارزش خرید موجودی فعلی انبار، به اضافه سودی که از فروش این کالاها عایدتان می‌شود، منهای مخارج دوره = خالص نقدینگی نهایی در دست:'
                    : 'با فروش کامل این فاکتورهای ورودی، پس از کسر مخارج و برداشت‌های شخصی دقیقاً چقدر سود و اصل سرمایه به دست شما بازمی‌گردد:'}
                </p>

                {/* Simulation Basis Switcher Toggle Buttons */}
                <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-700 shadow-2xs w-fit">
                  <button
                    type="button"
                    onClick={() => setSimulationBasis('remaining-stock')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer select-none ${
                      simulationBasis === 'remaining-stock'
                        ? `${theme.primary} text-white shadow-xs`
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="تحلیل بر اساس موجودی واقعی حاضر در انبار پس از فروش‌های انجام شده"
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>موجودی فعلی انبار</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulationBasis('full-batch')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer select-none ${
                      simulationBasis === 'full-batch'
                        ? `${theme.primary} text-white shadow-xs`
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="تحلیل بر اساس کل بارهای اولیه فاکتورهای ورودی دست‌نخورده (فروش ۱۰۰٪)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>کل بار اولیه فاکتورها (۱۰۰٪)</span>
                  </button>
                </div>
              </div>

              {/* Quick Multi-Batch Selection Simulator Buttons */}
              <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-1">
                  فاکتورهای تحت بررسی:
                </span>

                <button
                  type="button"
                  onClick={selectLatestThreeInvoices}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    !simulationMetrics.isCustomSelection && simulationMetrics.count === 3
                      ? `${theme.primary} text-white shadow-xs border-transparent`
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700'
                  }`}
                  title="تحلیل فوری و مجزای ۳ فاکتور ورودی اخیر"
                >
                  ۳ فاکتور اخیر
                </button>

                <button
                  type="button"
                  onClick={selectAllInwardInvoices}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedInwardInvoiceIds.length === capitalAnalysisData.inwardLedger.length && capitalAnalysisData.inwardLedger.length > 0
                      ? `${theme.primary} text-white shadow-xs border-transparent`
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700'
                  }`}
                  title="انتخاب و محاسبه کل فاکتورهای ورودی"
                >
                  همه ({toPersianDigits(capitalAnalysisData.inwardLedger.length)})
                </button>

                {selectedInwardInvoiceIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearInwardSelection}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all cursor-pointer border border-rose-200 dark:border-rose-800 flex items-center gap-1"
                    title="حذف فیلتر انتخابی و بازگشت به ۳ فاکتور پیش‌فرض"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>پاک کردن ({toPersianDigits(selectedInwardInvoiceIds.length)})</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. DYNAMIC SIMULATOR & CAPITAL RETURN HIGHLIGHTS (چیدمان پایدار، فراخ و بدون به‌هم‌ریختگی) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {simulationBasis === 'remaining-stock'
                      ? `نتیجه موجودی فعلی: ${toPersianDigits(simulationMetrics.totalPieces.toLocaleString())} عدد کالا در قفسه‌های انبار`
                      : `نتیجه مالی: ${toPersianDigits(simulationMetrics.count)} فاکتور ورودی اولیه تحت بررسی`}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {toPersianDigits(simulationMetrics.totalCartons)} کارتن · {toPersianDigits(simulationMetrics.totalPieces.toLocaleString())} عدد کالا
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {simulationBasis === 'remaining-stock'
                    ? 'محاسبه ارزش موجودی واقعی حاضر در انبار + سود انتظاری - مخارج'
                    : (simulationMetrics.isCustomSelection 
                        ? 'فاکتورهای انتخاب شده به‌صورت دستی از جدول پایین' 
                        : 'پیش‌فرض: ۳ فاکتور ورودی اخیر')}
                </div>
              </div>

              {/* Group 1: Goods, Costs & Freight (4 Cards) */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: Projected Sales Revenue */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200/90 dark:border-slate-700 space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block truncate">
                      {simulationBasis === 'remaining-stock' ? 'ارزش فروش موجودی فعلی انبار' : 'ارزش کل فروش اقلام'}
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block font-mono tabular-nums dir-ltr text-right">
                      {isSecretMode ? '••••••' : formatPrice(simulationMetrics.projectedRevenue)}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {simulationBasis === 'remaining-stock' ? 'بر مبنای نرخ مصوب فروش اقلام موجود' : 'بر مبنای نرخ مصوب فروش کالاها'}
                    </span>
                  </div>

                  {/* Card 2: Merchandise Principal */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200/90 dark:border-slate-700 space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block truncate">
                      {simulationBasis === 'remaining-stock' ? 'مایه خرید موجودی فعلی (سرمایه خوابیده)' : 'مایه اصلی خرید (خالص فاکتور)'}
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block font-mono tabular-nums dir-ltr text-right">
                      {isSecretMode ? '••••••' : formatPrice(simulationMetrics.merchandisePrincipal)}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {simulationBasis === 'remaining-stock' ? 'سرمایه در گردش موجود در قفسه‌ها' : 'سرمایه در گردش خرید کالا'}
                    </span>
                  </div>

                  {/* Card 3: Freight Expenses (Display only) */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 space-y-1.5">
                    <span className="text-xs font-bold text-sky-700 dark:text-sky-300 block truncate">
                      {simulationBasis === 'remaining-stock' ? 'کرایه بار اولیه فاکتورها' : 'کرایه بار و باربری (تفکیکی)'}
                    </span>
                    <span className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-300 block font-mono tabular-nums dir-ltr text-right">
                      {isSecretMode ? '••••••' : (simulationMetrics.freightExpenses > 0 ? `+${formatPrice(simulationMetrics.freightExpenses)}` : '۰ تومان')}
                    </span>
                    <span className="text-[11px] text-sky-600 dark:text-sky-400 block truncate">
                      {simulationBasis === 'remaining-stock' ? 'پرداخت‌شده در مبدا ورود کالا' : 'هزینه حمل کالا'}
                    </span>
                  </div>

                  {/* Card 4: Landed Cost */}
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200/90 dark:border-slate-700 space-y-1.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block truncate">
                      {simulationBasis === 'remaining-stock' ? 'بهای خرید موجودی فعلی' : 'بهای تمام‌شده بار (Landed Cost)'}
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white block font-mono tabular-nums dir-ltr text-right">
                      {isSecretMode ? '••••••' : formatPrice(simulationMetrics.landedCost)}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {simulationBasis === 'remaining-stock' ? 'ارزش دفتری انبار فعلی' : 'بهای خالص خرید فاکتور'}
                    </span>
                  </div>
                </div>

                {/* Group 2: Profits, Personal Drawings & Final Cash Return (3 Spacious Highlight Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Card 5: Projected Gross Profit */}
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/50 p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 block truncate">
                        {simulationBasis === 'remaining-stock' ? 'سود انتظاری از موجودی فعلی' : 'سود ناخالص بارها'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold">
                        مارک‌آپ: {toPersianDigits(simulationMetrics.markupPercent.toFixed(1))}٪
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 block font-mono tabular-nums dir-ltr text-right">
                      {isSecretMode ? '••••••' : `+${formatPrice(simulationMetrics.projectedGrossProfit)}`}
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block truncate font-bold">
                      {simulationBasis === 'remaining-stock' ? 'ارزش فروش فعلی منهای بهای خرید' : 'ارزش فروش منهای بهای خرید'}
                    </span>
                  </div>

                  {/* Card 6: Personal Drawings & Operating Expense Share */}
                  <div className="bg-rose-50/70 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block truncate">
                        سهم برداشت‌های شخصی و مخارج
                      </span>
                      <span className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400">کسر از سود</span>
                    </div>
                    <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 block font-mono tabular-nums dir-ltr text-right">
                      {isSecretMode ? '••••••' : (simulationMetrics.expenseShare > 0 ? `-${formatPrice(simulationMetrics.expenseShare)}` : '۰ تومان')}
                    </span>
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 block truncate">
                      برداشت مالک و خرج شخصی دوره
                    </span>
                  </div>

                  {/* Card 7: Total Realizable Cash Return (موجودی خرید + سود + مطالبات + نقدینگی - مخارج) */}
                  <div className="bg-amber-50/90 dark:bg-amber-950/60 p-4 rounded-xl border-2 border-amber-300 dark:border-amber-600 shadow-2xs space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-900 dark:text-amber-200 block truncate">
                        {simulationBasis === 'remaining-stock' ? 'کل وجه و عایدی نهایی نقدینگی' : 'کل نقدینگی بازگشتی به جیب'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 text-[10.5px] font-bold">
                        {simulationBasis === 'remaining-stock' ? 'موجودی + سود + نسیه + نقدینگی - مخارج' : 'بازگشت نهایی'}
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-amber-900 dark:text-amber-200 font-mono tabular-nums dir-ltr text-right">
                      {isSecretMode ? '••••••' : formatPrice(simulationMetrics.totalCashReturn)}
                    </div>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 block truncate font-bold">
                      {simulationBasis === 'remaining-stock' ? 'مجموع ارزش فروش موجودی + مطالبات + نقدینگی - مخارج' : 'مایه اصلی خرید + سود خالص باقی‌مانده'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clear Equation Formula Visualization (سازگار با فرمول ۵گانه در حالت موجودی انبار) */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                {simulationBasis === 'remaining-stock' ? (
                  <div className="flex items-center gap-1.5 flex-wrap font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">فرمول جامع نقدینگی نهایی:</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono" title="مایه خرید موجودی فعلی انبار">
                      موجودی خرید: {formatPrice(simulationMetrics.merchandisePrincipal)}
                    </span>
                    <span className="text-emerald-600 font-black">+</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono" title="سود حاصل از فروش موجودی">
                      سود موجودی: {formatPrice(simulationMetrics.projectedGrossProfit)}
                    </span>
                    <span className="text-indigo-600 font-black">+</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-mono" title="مطالبات نسیه مشتریان">
                      مطالبات مشتریان: {formatPrice(simulationMetrics.tradeReceivables)}
                    </span>
                    <span className="text-sky-600 font-black">+</span>
                    <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono" title="نقدینگی در دسترس بانک و صندوق">
                      نقدینگی حاضر: {formatPrice(simulationMetrics.currentLiquidity)}
                    </span>
                    <span className="text-rose-600 font-black">−</span>
                    <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono" title="کل مخارج دوره">
                      مخارج: {formatPrice(simulationMetrics.comprehensiveExpenses)}
                    </span>
                    <span>=</span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-black font-mono">
                      کل وجه نهایی در دست: {formatPrice(simulationMetrics.totalCashReturn)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap font-bold text-slate-800 dark:text-slate-200">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">فرمول حسابداری بازگشت نقدینگی:</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono">
                      ارزش فروش: {formatPrice(simulationMetrics.projectedRevenue)}
                    </span>
                    <span>−</span>
                    <span className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono">
                      کرایه بار: {formatPrice(simulationMetrics.freightExpenses)}
                    </span>
                    <span>−</span>
                    <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono">
                      برداشت شخصی: {formatPrice(simulationMetrics.expenseShare)}
                    </span>
                    <span>=</span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-black font-mono">
                      کل نقدینگی نهایی دریافتی: {formatPrice(simulationMetrics.totalCashReturn)}
                    </span>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>محاسبه استاندارد بهای تمام‌شده بازرگانی (خرید کالا از سود کسر نمی‌شود)</span>
                </div>
              </div>
            </div>

            {/* 3. INTERACTIVE INWARD INVOICES LEDGER TABLE (کارتابل فاکتورهای ورودی با قابلیت انتخاب، نمایش مایه اصلی و کرایه بار) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200/90 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    کارتابل فاکتورهای ورود کالا به انبار و سود هر فاکتور
                  </h4>
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                    {toPersianDigits(capitalAnalysisData.inwardLedger.length)} فاکتور ورودی
                  </span>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  با علامت زدن هر فاکتور، سود و نقدینگی بازگشتی آن در بخش شبیه‌ساز بالا محاسبه می‌شود
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-[13px] select-none">
                    <tr>
                      <th className="p-3.5 text-center w-10 font-black">انتخاب</th>
                      <th className="p-3.5 text-center w-14 font-black">ردیف</th>
                      <th className="p-3.5 font-black text-right">شماره و تاریخ</th>
                      <th className="p-3.5 font-black text-right">تأمین‌کننده</th>
                      <th className="p-3.5 text-center font-black">اقلام و کارتن</th>
                      <th className="p-3.5 text-left font-black">مایه اصلی خرید</th>
                      <th className="p-3.5 text-left font-black">کرایه بار</th>
                      <th className="p-3.5 text-left font-black">بهای تمام‌شده (Landed)</th>
                      <th className="p-3.5 text-left font-black">ارزش فروش اقلام</th>
                      <th className="p-3.5 text-left font-black">سود ناخالص فاکتور</th>
                      <th className="p-3.5 text-center font-black">مارک‌آپ</th>
                      <th className="p-3.5 text-center w-24 font-black">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {paginatedInwardLedger.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-12 text-center text-slate-400 font-medium">
                          هیچ فاکتور ورودی در این دوره زمانی ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      paginatedInwardLedger.map((row, idx) => {
                        const isSelected = selectedInwardInvoiceIds.includes(row.inv.id);
                        return (
                          <tr 
                            key={`inward-row-${row.inv.id || idx}`}
                            className={`transition-colors ${
                              isSelected 
                                ? 'bg-teal-50/60 dark:bg-teal-950/30' 
                                : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <td className="p-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleInwardInvoiceSelection(row.inv.id)}
                                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                                title="انتخاب برای شبیه‌سازی سود"
                              />
                            </td>
                            <td className="p-3.5 text-center font-bold text-slate-400 font-mono tabular-nums">
                              {toPersianDigits(startIndex + idx + 1)}
                            </td>
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                              <div>#{toPersianDigits(row.invoiceNumber)}</div>
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-normal">
                                {toPersianDigits(row.date)}
                              </div>
                            </td>
                            <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                              <div>{row.supplierName}</div>
                              {row.supplierCity && (
                                <div className="text-[10.5px] text-slate-400 font-normal">
                                  {row.supplierCity}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-center font-bold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                              <div>{toPersianDigits(row.itemsCount)} قلم</div>
                              <div className="text-[10.5px] text-slate-500 font-normal">
                                {toPersianDigits(row.totalCartons)} کارتن · {toPersianDigits(row.totalPieces.toLocaleString())} عدد
                              </div>
                            </td>
                            <td className="p-3.5 text-left dir-ltr font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                              <div>{isSecretMode ? '••••••' : formatPrice(row.netMerchandisePrincipal)}</div>
                              {row.discount > 0 && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal dir-rtl text-right">
                                  تخفیف: -{formatPrice(row.discount)}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-left dir-ltr font-bold text-sky-700 dark:text-sky-300 font-mono tabular-nums">
                              <div>{isSecretMode ? '••••••' : (row.freightExpenses > 0 ? `+${formatPrice(row.freightExpenses)}` : '۰ تومان')}</div>
                              {row.freightRatio > 0 && (
                                <div className="text-[10px] text-sky-600 dark:text-sky-400 font-normal dir-rtl text-right font-mono">
                                  {toPersianDigits(row.freightRatio.toFixed(1))}٪ از مایه
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-left dir-ltr font-black text-slate-900 dark:text-white font-mono tabular-nums">
                              {isSecretMode ? '••••••' : formatPrice(row.landedCost)}
                            </td>
                            <td className="p-3.5 text-left dir-ltr font-bold text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                              {isSecretMode ? '••••••' : formatPrice(row.projectedRevenue)}
                            </td>
                            <td className="p-3.5 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                              {isSecretMode ? '••••••' : `+${formatPrice(row.projectedGrossProfit)}`}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                                {isSecretMode ? '••٪' : `${toPersianDigits(row.markupPercent.toFixed(1))}٪`}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoiceForDetail(row.inv)}
                                  className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-[11px] font-bold transition-all cursor-pointer border border-teal-200 dark:border-teal-800 shadow-2xs"
                                  title="مشاهده محاسبه دقیق تک‌تک اقلام و کرایه"
                                >
                                  اقلام
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onViewInvoice(row.inv)}
                                  className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                                  title="مشاهده فاکتور کامل"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Summary Footer for Inward Ledger */}
                  {paginatedInwardLedger.length > 0 && (
                    <tfoot className="bg-slate-50/90 dark:bg-slate-800/70 border-t-2 border-slate-200/90 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white">
                      <tr>
                        <td colSpan={5} className="py-3 px-3">
                          <span>جمع کل دوره ({toPersianDigits(capitalAnalysisData.inwardLedger.length)} فاکتور ورودی)</span>
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr font-black">
                          <div>{isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.totalInwardMerchandisePrincipal)}</div>
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr font-black text-sky-700 dark:text-sky-300">
                          <div>{isSecretMode ? '••••••' : (capitalAnalysisData.totalInwardFreightExpenses > 0 ? `+${formatPrice(capitalAnalysisData.totalInwardFreightExpenses)}` : '۰ تومان')}</div>
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr font-black text-slate-900 dark:text-white">
                          <div>{isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.totalInwardLandedCost)}</div>
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr font-black">
                          <div>{isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.totalInwardProjectedRevenue)}</div>
                        </td>
                        <td className="py-3 px-3 text-left dir-ltr font-black text-emerald-600 dark:text-emerald-400">
                          <div>{isSecretMode ? '••••••' : `+${formatPrice(capitalAnalysisData.totalInwardProjectedGrossProfit)}`}</div>
                        </td>
                        <td className="py-3 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                          {isSecretMode ? '••٪' : `${toPersianDigits(capitalAnalysisData.overallInwardMarkup.toFixed(1))}٪`}
                        </td>
                        <td className="py-3 px-3 text-center text-[10.5px] text-slate-500 font-medium">
                          {toPersianDigits(capitalAnalysisData.totalInwardPieces.toLocaleString())} عدد کالا
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* 4. PERSONAL DRAWINGS & OVERHEAD LEDGER (تفکیک شفاف برداشت‌های شخصی و هزینه‌ها) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <Receipt className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    برداشت‌های شخصی و مخارج جاری کسر شده از سود
                  </h4>
                  <span className="text-xs px-2.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold">
                    {toPersianDigits(capitalAnalysisData.operationalExpenses.length)} تراکنش
                  </span>
                </div>

                <div className="text-xs font-bold text-rose-700 dark:text-rose-400 font-mono tabular-nums dir-ltr">
                  مجموع برداشت و خرج‌های دوره: -{formatPrice(capitalAnalysisData.totalOperationalExpenses)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                💡 <span className="font-bold text-slate-800 dark:text-slate-200">شفافیت حسابداری:</span> خرید کالا و ورود بار به انبار طبق اصول مالی تبدیل نقدینگی به دارایی انبار است و مایه آن هنگام فروش بازمی‌گردد؛ بنابراین از سود کسر نمی‌شود. در این بخش تنها برداشت‌های شخصی شما و هزینه‌های جاری غیرکالایی ثبت و از سود ناخالص بارها کسر می‌گردند.
              </div>

              {capitalAnalysisData.operationalExpenses.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  هیچ برداشت شخصی یا هزینه جاری در این بازه زمانی ثبت نشده است.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {Array.from(capitalAnalysisData.expensesByCategory.entries()).map(([cat, amt]) => {
                    const ratio = capitalAnalysisData.totalOperationalExpenses > 0 ? (amt / capitalAnalysisData.totalOperationalExpenses) * 100 : 0;
                    return (
                      <div key={cat} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block truncate">
                          {cat}
                        </span>
                        <div className="text-xs font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums dir-ltr text-right">
                          -{formatPrice(amt)}
                        </div>
                        <div className="text-[10px] text-slate-400 block font-mono">
                          {toPersianDigits(ratio.toFixed(1))}٪ از کل مخارج
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. TOTAL BUSINESS ASSETS & LIVE BALANCE SHEET (ترازنامه جامع کل دارایی‌ها و حقوق مالی) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    صورت وضعیت جامع دارایی‌ها، نقدینگی و ارزش ویژه کسب‌وکار
                  </h4>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  محاسبه زنده بر اساس صندوق، بانک‌ها، انبار و مانده اشخاص
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Total Liquid Cash (صندوق و بانک) */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      کل نقدینگی زنده
                    </span>
                    <span className="text-[10.5px] font-bold text-teal-600 dark:text-teal-400">در دسترس</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.liquidity.totalLiquidity)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 font-mono">
                    <span>صندوق: {formatPrice(capitalAnalysisData.liquidity.cashBalance)}</span>
                    <span>بانک: {formatPrice(capitalAnalysisData.liquidity.bankBalance)}</span>
                  </div>
                </div>

                {/* 2. Warehouse Inventory Valuation (ارزش ریالی انبار) */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Boxes className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      ارزش موجودی انبار
                    </span>
                    <span className="text-[10.5px] font-bold text-slate-500">{toPersianDigits(capitalAnalysisData.totalStockPieces.toLocaleString())} عدد</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.stockCostValue)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 font-mono">
                    <span>بهای خرید</span>
                    <span>ارزش فروش: {formatPrice(capitalAnalysisData.stockSellValue)}</span>
                  </div>
                </div>

                {/* 3. Trade Receivables (طلب‌های تجاری از مشتریان) */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      مطالبات تجاری (طلب‌ها)
                    </span>
                    <span className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400">حساب دریافتنی</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.totalTradeReceivables)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    مانده بدهکار فاکتورهای فروش
                  </div>
                </div>

                {/* 4. Trade Payables (بدهی‌های تجاری به تأمین‌کنندگان) */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-rose-200/80 dark:border-rose-900/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      بدهی‌های تجاری
                    </span>
                    <span className="text-[10.5px] font-bold text-rose-600 dark:text-rose-400">حساب پرداختنی</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••••••' : (capitalAnalysisData.totalTradePayables > 0 ? `-${formatPrice(capitalAnalysisData.totalTradePayables)}` : '۰ تومان')}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-rose-200/60 dark:border-rose-900/60">
                    بدهی مانده به طرف‌های حساب
                  </div>
                </div>

                {/* 5. Net Commercial Worth / Equity (ارزش ویژه کل دارایی‌های جاری) */}
                <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      خالص کل دارایی‌ها
                    </span>
                    <span className="text-[10.5px] font-black text-emerald-700 dark:text-emerald-300">ارزش ویژه</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums dir-ltr text-right">
                    {isSecretMode ? '••••••' : formatPrice(capitalAnalysisData.netCurrentAssets)}
                  </div>
                  <div className="text-[11px] text-emerald-800/80 dark:text-emerald-400 pt-1 border-t border-emerald-200 dark:border-emerald-800">
                    نقدینگی + انبار + مطالبات - بدهی
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PRODUCTS PROFITABILITY */}
        {activeTab === 'products' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-[13px] select-none">
                <tr>
                  <th className="p-3.5 w-12 text-center font-black">رتبه</th>
                  <SortableTableHeader
                    field="name"
                    currentField={productSortField}
                    currentDirection={productSortDirection}
                    onSort={handleProductSort}
                    align="right"
                    className="p-3.5"
                  >
                    نام محصول / کالا
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="category"
                    currentField={productSortField}
                    currentDirection={productSortDirection}
                    onSort={handleProductSort}
                    align="right"
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
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-[13px] select-none">
                <tr>
                  <th className="p-3.5 w-12 text-center font-black">رتبه</th>
                  <SortableTableHeader
                    field="name"
                    currentField={customerSortField}
                    currentDirection={customerSortDirection}
                    onSort={handleCustomerSort}
                    align="right"
                    className="p-3.5"
                  >
                    نام طرف‌حساب / خریدار
                  </SortableTableHeader>

                  <SortableTableHeader
                    field="city"
                    currentField={customerSortField}
                    currentDirection={customerSortDirection}
                    onSort={handleCustomerSort}
                    align="right"
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
