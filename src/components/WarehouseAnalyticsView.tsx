import React, { useState, useMemo } from 'react';
import { Product, StoreSettings, Invoice } from '../types';
import { 
  formatPrice, 
  toPersianDigits, 
  formatProductPackagingSpec, 
  isProductUnpackaged, 
  getProductEffectiveCartonSize,
  getCurrentPersianDate
} from '../utils/formatters';
import { getProductDiscountedPurchasePrice } from '../utils/invoiceCalculations';
import { themes, getThemeBadges } from './ThemeConfig';
import { Pagination } from './Pagination';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Boxes, 
  ArrowRight, 
  Printer, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Sparkles, 
  Calendar, 
  Layers, 
  Truck, 
  Clock, 
  DollarSign, 
  Percent, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  Zap, 
  RotateCcw, 
  ArrowUpDown, 
  ShieldCheck, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  ShoppingCart,
  PlusCircle,
  Timer,
  Hourglass,
  ArrowDownToLine,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WarehouseAnalyticsViewProps {
  products: Product[];
  invoices: Invoice[];
  settings: StoreSettings;
  isSecretMode: boolean;
  onBack: () => void;
  onOpenRestock?: (product: Product) => void;
}

export type AnalyticsPeriod = 'today' | '7days' | '4weeks' | 'month' | '3months' | '6months' | 'year' | 'all' | 'custom';
type TabView = 'items' | 'fast_depletion' | 'restock' | 'trends' | 'categories' | 'shipments';
type SortField = 'sold_cartons' | 'sold_pieces' | 'revenue' | 'profit' | 'margin' | 'stock_cartons' | 'runway' | 'burn_rate' | 'name';

export const WarehouseAnalyticsView: React.FC<WarehouseAnalyticsViewProps> = ({
  products,
  invoices,
  settings,
  isSecretMode,
  onBack,
  onOpenRestock,
}) => {
  const theme = themes[settings.themeColor] || themes.teal;
  const badges = getThemeBadges(settings.themeColor);

  // Filter States
  const [period, setPeriod] = useState<AnalyticsPeriod>('4weeks');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [packagingFilter, setPackagingFilter] = useState<'all' | 'packaged' | 'unpackaged'>('all');
  const [velocityFilter, setVelocityFilter] = useState<'all' | 'top' | 'fast_depletion' | 'restock_needed' | 'moving' | 'slow' | 'idle'>('all');
  const [depletionSubFilter, setDepletionSubFilter] = useState<'all' | 'out_of_stock' | 'hours' | 'days' | 'week'>('all');
  
  // Tab view
  const [activeTab, setActiveTab] = useState<TabView>('items');

  // Sorting and Pagination (default 20, options for 20, 35, 50, 100, all)
  const [sortField, setSortField] = useState<SortField>('sold_cartons');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [copied, setCopied] = useState(false);
  const [copiedRestockList, setCopiedRestockList] = useState(false);
  const [copiedDepletionAlert, setCopiedDepletionAlert] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Date filtering helper
  const isInvoiceInPeriod = useMemo(() => {
    const todayStr = getCurrentPersianDate();
    const todayParts = todayStr.split('/').map(s => parseInt(s.trim()) || 0);
    const todayDays = todayParts.length === 3 ? todayParts[0] * 365 + todayParts[1] * 30 + todayParts[2] : 0;

    return (invDateStr: string | undefined): boolean => {
      if (!invDateStr) return false;
      if (period === 'all') return true;

      if (period === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const invParts = invDateStr.split('/').map(s => parseInt(s.trim()) || 0);
        const invDays = invParts[0] * 365 + invParts[1] * 30 + invParts[2];

        if (customStartDate) {
          const sParts = customStartDate.split('/').map(s => parseInt(s.trim()) || 0);
          if (sParts.length === 3) {
            const sDays = sParts[0] * 365 + sParts[1] * 30 + sParts[2];
            if (invDays < sDays) return false;
          }
        }
        if (customEndDate) {
          const eParts = customEndDate.split('/').map(s => parseInt(s.trim()) || 0);
          if (eParts.length === 3) {
            const eDays = eParts[0] * 365 + eParts[1] * 30 + eParts[2];
            if (invDays > eDays) return false;
          }
        }
        return true;
      }

      if (period === 'today') {
        return invDateStr === todayStr;
      }

      const invParts = invDateStr.split('/').map(s => parseInt(s.trim()) || 0);
      if (invParts.length !== 3 || todayParts.length !== 3) return true;
      const invDays = invParts[0] * 365 + invParts[1] * 30 + invParts[2];
      const diffDays = todayDays - invDays;

      if (diffDays < -1) return false;

      if (period === '7days') return diffDays <= 7;
      if (period === '4weeks') return diffDays <= 28;
      if (period === 'month') return diffDays <= 30;
      if (period === '3months') return diffDays <= 90;
      if (period === '6months') return diffDays <= 180;
      if (period === 'year') return diffDays <= 365;

      return true;
    };
  }, [period, customStartDate, customEndDate]);

  // Filtered invoices for the period
  const periodInvoices = useMemo(() => {
    return invoices.filter(inv => !inv.isDraft && isInvoiceInPeriod(inv.date));
  }, [invoices, isInvoiceInPeriod]);

  // Sales and Purchase breakdown
  const salesInvoices = useMemo(() => {
    return periodInvoices.filter(inv => inv.type === 'sale');
  }, [periodInvoices]);

  const purchaseInvoices = useMemo(() => {
    return periodInvoices.filter(inv => inv.type === 'purchase');
  }, [periodInvoices]);

  // Aggregate item stats inside this period
  const itemAnalyticsMap = useMemo(() => {
    const map = new Map<string, {
      soldPieces: number;
      soldCartons: number;
      soldLoose: number;
      revenue: number;
      cost: number;
      profit: number;
      inPieces: number;
      inCartons: number;
      inLoose: number;
      saleOrdersCount: number;
      purchaseOrdersCount: number;
    }>();

    for (const p of products) {
      map.set(p.id, {
        soldPieces: 0,
        soldCartons: 0,
        soldLoose: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        inPieces: 0,
        inCartons: 0,
        inLoose: 0,
        saleOrdersCount: 0,
        purchaseOrdersCount: 0,
      });
    }

    // Process Sales
    for (const inv of salesInvoices) {
      for (const it of inv.items || []) {
        const pId = it.productId;
        if (!pId) continue;
        const prod = products.find(p => p.id === pId);
        const ppc = it.piecesPerCarton || (prod ? getProductEffectiveCartonSize(prod) : 1);
        const isUnpack = prod ? isProductUnpackaged(prod) : false;

        const pieces = it.totalPieces ?? ((it.cartonsCount || 0) * ppc + (it.extraPieces || 0));
        const cartons = it.cartonsCount ?? (!isUnpack && ppc > 1 ? Math.floor(pieces / ppc) : 0);
        const loose = it.extraPieces ?? (!isUnpack && ppc > 1 ? pieces % ppc : pieces);

        const rev = (it.totalPrice !== undefined && it.totalPrice > 0) ? it.totalPrice : (pieces * (it.unitSellingPrice || it.unitPrice || 0));
        const unitDiscCost = getProductDiscountedPurchasePrice(pId, it.productName, it.unitPurchasePrice || (prod?.purchasePrice || 0), invoices, products);
        const cost = pieces * unitDiscCost;
        const profit = rev - cost;

        const cur = map.get(pId) || {
          soldPieces: 0,
          soldCartons: 0,
          soldLoose: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          inPieces: 0,
          inCartons: 0,
          inLoose: 0,
          saleOrdersCount: 0,
          purchaseOrdersCount: 0,
        };

        cur.soldPieces += pieces;
        cur.soldCartons += cartons;
        cur.soldLoose += loose;
        cur.revenue += rev;
        cur.cost += cost;
        cur.profit += profit;
        cur.saleOrdersCount += 1;
        map.set(pId, cur);
      }
    }

    // Process Purchases (Inflow)
    for (const inv of purchaseInvoices) {
      for (const it of inv.items || []) {
        const pId = it.productId;
        if (!pId) continue;
        const prod = products.find(p => p.id === pId);
        const ppc = it.piecesPerCarton || (prod ? getProductEffectiveCartonSize(prod) : 1);
        const isUnpack = prod ? isProductUnpackaged(prod) : false;

        const pieces = it.totalPieces ?? ((it.cartonsCount || 0) * ppc + (it.extraPieces || 0));
        const cartons = it.cartonsCount ?? (!isUnpack && ppc > 1 ? Math.floor(pieces / ppc) : 0);
        const loose = it.extraPieces ?? (!isUnpack && ppc > 1 ? pieces % ppc : pieces);

        const cur = map.get(pId) || {
          soldPieces: 0,
          soldCartons: 0,
          soldLoose: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          inPieces: 0,
          inCartons: 0,
          inLoose: 0,
          saleOrdersCount: 0,
          purchaseOrdersCount: 0,
        };

        cur.inPieces += pieces;
        cur.inCartons += cartons;
        cur.inLoose += loose;
        cur.purchaseOrdersCount += 1;
        map.set(pId, cur);
      }
    }

    return map;
  }, [salesInvoices, purchaseInvoices, products, invoices]);

  // Overall KPI sums
  const summaryKPIs = useMemo(() => {
    let totalSoldCartons = 0;
    let totalSoldLoose = 0;
    let totalSoldPieces = 0;
    let totalInCartons = 0;
    let totalInPieces = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let activeSoldSKUs = 0;

    for (const [, st] of itemAnalyticsMap.entries()) {
      totalSoldCartons += st.soldCartons;
      totalSoldLoose += st.soldLoose;
      totalSoldPieces += st.soldPieces;
      totalInCartons += st.inCartons;
      totalInPieces += st.inPieces;
      totalRevenue += st.revenue;
      totalCost += st.cost;
      totalProfit += st.profit;
      if (st.soldPieces > 0) activeSoldSKUs += 1;
    }

    const netCartonFlow = totalInCartons - totalSoldCartons;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalSoldCartons,
      totalSoldLoose,
      totalSoldPieces,
      totalInCartons,
      totalInPieces,
      netCartonFlow,
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      activeSoldSKUs,
      salesCount: salesInvoices.length,
      purchaseCount: purchaseInvoices.length,
    };
  }, [itemAnalyticsMap, salesInvoices, purchaseInvoices]);

  // Combined product analytics records with Fast-Depletion & Smart Restock logic
  const analyzedProducts = useMemo(() => {
    let periodDays = 28;
    if (period === 'today') periodDays = 1;
    else if (period === '7days') periodDays = 7;
    else if (period === '4weeks') periodDays = 28;
    else if (period === 'month') periodDays = 30;
    else if (period === '3months') periodDays = 90;
    else if (period === '6months') periodDays = 180;
    else if (period === 'year') periodDays = 365;

    return products.map(prod => {
      const stats = itemAnalyticsMap.get(prod.id) || {
        soldPieces: 0,
        soldCartons: 0,
        soldLoose: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        inPieces: 0,
        inCartons: 0,
        inLoose: 0,
        saleOrdersCount: 0,
        purchaseOrdersCount: 0,
      };

      const isUnpack = isProductUnpackaged(prod);
      const ppc = getProductEffectiveCartonSize(prod);
      const stockPieces = Number(prod.stockPieces) || 0;
      const stockCartons = !isUnpack && ppc > 1 ? Math.floor(stockPieces / ppc) : 0;
      const stockLoose = !isUnpack && ppc > 1 ? stockPieces % ppc : stockPieces;

      // Turnover velocity status
      let velocity: 'top' | 'moving' | 'slow' | 'idle' = 'idle';
      if (stats.soldCartons >= 20 || (isUnpack && stats.soldPieces >= 100)) {
        velocity = 'top';
      } else if (stats.soldCartons >= 5 || (isUnpack && stats.soldPieces >= 20)) {
        velocity = 'moving';
      } else if (stats.soldPieces > 0) {
        velocity = 'slow';
      } else {
        velocity = 'idle';
      }

      // Burn Rate (Consumption speed)
      const dailyRunRateCartons = stats.soldCartons / Math.max(1, periodDays);
      const dailyRunRatePieces = stats.soldPieces / Math.max(1, periodDays);
      const hourlyRunRateCartons = dailyRunRateCartons / 10; // assuming 10 working hours daily
      const hoursPerCarton = stats.soldCartons > 0 
        ? Math.round(((periodDays * 10) / stats.soldCartons) * 10) / 10 
        : (isUnpack && stats.soldPieces > 0 ? Math.round(((periodDays * 10) / stats.soldPieces) * 10) / 10 : 0);

      let runwayDays = 999;
      if (dailyRunRatePieces > 0) {
        runwayDays = Math.round(stockPieces / dailyRunRatePieces);
      } else if (stockPieces === 0) {
        runwayDays = 0;
      }

      const runwayHours = Math.round(runwayDays * 10);

      // Fast Depletion & Stockout Classification
      const isZeroStock = stockPieces === 0;
      let depletionCategory: 'out_of_stock' | 'hours' | 'days' | 'week' | 'stable' | 'idle' = 'idle';

      if (stats.soldPieces > 0) {
        if (isZeroStock) {
          depletionCategory = 'out_of_stock';
        } else if (runwayDays <= 1 || runwayHours <= 12) {
          depletionCategory = 'hours';
        } else if (runwayDays <= 3) {
          depletionCategory = 'days';
        } else if (runwayDays <= 7) {
          depletionCategory = 'week';
        } else {
          depletionCategory = 'stable';
        }
      }

      const isFastDepletion = stats.soldPieces > 0 && (isZeroStock || runwayDays <= 7);
      const isRestockNeeded = stats.soldPieces > 0 && (runwayDays <= 14 || isZeroStock);

      // Depletion speed badge text
      let depletionBadgeText = '';
      if (isZeroStock && stats.soldPieces > 0) {
        depletionBadgeText = '⛔ اتمام کامل در دوره';
      } else if (runwayHours <= 10 && stats.soldPieces > 0) {
        depletionBadgeText = `⚡ اتمام ظرف ${toPersianDigits(Math.max(2, runwayHours))} ساعت کاری!`;
      } else if (runwayDays <= 3 && stats.soldPieces > 0) {
        depletionBadgeText = `🚨 اتمام ظرف ${toPersianDigits(Math.max(1, runwayDays))} روز!`;
      } else if (runwayDays <= 7 && stats.soldPieces > 0) {
        depletionBadgeText = `⏳ اتمام ظرف ۱ هفته (${toPersianDigits(runwayDays)} روز)`;
      } else if (stats.soldPieces > 0) {
        depletionBadgeText = `ذخیره کافی (${toPersianDigits(runwayDays)} روز)`;
      } else {
        depletionBadgeText = 'بدون خروج بار';
      }

      // Lost sales potential in next 7 days without stock
      const lostSalesPotential = isZeroStock && stats.soldPieces > 0
        ? Math.round(dailyRunRatePieces * (prod.sellingPrice || 0) * 7)
        : 0;

      // Recommended carton order quantity based on next 30 days demand
      const suggestedOrderCartons = isUnpack 
        ? Math.max(20, Math.ceil(dailyRunRatePieces * 30))
        : Math.max(5, Math.ceil(dailyRunRateCartons * 30));

      const margin = stats.revenue > 0 ? (stats.profit / stats.revenue) * 100 : 0;

      // Depletion Index for ranking lightning-sellers
      const depletionIndex = (stats.soldCartons * 10) / (stockCartons + 1);

      return {
        ...prod,
        isUnpack,
        ppc,
        stockPieces,
        stockCartons,
        stockLoose,
        stats,
        velocity,
        margin,
        dailyRunRateCartons,
        dailyRunRatePieces,
        hourlyRunRateCartons,
        hoursPerCarton,
        runwayDays,
        runwayHours,
        isZeroStock,
        depletionCategory,
        isFastDepletion,
        depletionBadgeText,
        lostSalesPotential,
        isRestockNeeded,
        suggestedOrderCartons,
        depletionIndex,
      };
    });
  }, [products, itemAnalyticsMap, period]);

  // List of products that depleted fast or are about to deplete within hours/days
  const fastDepletionProducts = useMemo(() => {
    return analyzedProducts
      .filter(p => p.isFastDepletion)
      .sort((a, b) => {
        // Zero stock first, then lowest runway, then highest burn rate
        if (a.isZeroStock && !b.isZeroStock) return -1;
        if (!a.isZeroStock && b.isZeroStock) return 1;
        return a.runwayDays - b.runwayDays || b.dailyRunRateCartons - a.dailyRunRateCartons;
      });
  }, [analyzedProducts]);

  // Fast depletion sub-filtered list
  const filteredFastDepletionProducts = useMemo(() => {
    return fastDepletionProducts.filter(p => {
      if (depletionSubFilter === 'all') return true;
      if (depletionSubFilter === 'out_of_stock') return p.depletionCategory === 'out_of_stock';
      if (depletionSubFilter === 'hours') return p.depletionCategory === 'hours';
      if (depletionSubFilter === 'days') return p.depletionCategory === 'days';
      if (depletionSubFilter === 'week') return p.depletionCategory === 'week';
      return true;
    });
  }, [fastDepletionProducts, depletionSubFilter]);

  // Fast Depletion metrics
  const fastDepletionMetrics = useMemo(() => {
    const outOfStockCount = fastDepletionProducts.filter(p => p.isZeroStock).length;
    const imminentHoursCount = fastDepletionProducts.filter(p => p.depletionCategory === 'hours').length;
    const imminentDaysCount = fastDepletionProducts.filter(p => p.depletionCategory === 'days').length;
    const totalLostRevenueExposure = fastDepletionProducts.reduce((sum, p) => sum + p.lostSalesPotential, 0);

    // Record holder (fastest daily carton burn rate)
    const recordHolder = [...analyzedProducts].sort((a, b) => b.dailyRunRateCartons - a.dailyRunRateCartons)[0];

    return {
      outOfStockCount,
      imminentHoursCount,
      imminentDaysCount,
      totalLostRevenueExposure,
      recordHolder,
    };
  }, [fastDepletionProducts, analyzedProducts]);

  // List of products that urgently need restock
  const restockNeededProducts = useMemo(() => {
    return analyzedProducts
      .filter(p => p.isRestockNeeded)
      .sort((a, b) => a.runwayDays - b.runwayDays || b.stats.soldCartons - a.stats.soldCartons);
  }, [analyzedProducts]);

  // Filtered products list for main items table
  const filteredProducts = useMemo(() => {
    return analyzedProducts.filter(p => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;

      if (packagingFilter === 'packaged' && p.isUnpack) return false;
      if (packagingFilter === 'unpackaged' && !p.isUnpack) return false;

      if (velocityFilter === 'top' && p.velocity !== 'top') return false;
      if (velocityFilter === 'fast_depletion' && !p.isFastDepletion) return false;
      if (velocityFilter === 'restock_needed' && !p.isRestockNeeded) return false;
      if (velocityFilter === 'moving' && p.velocity !== 'moving') return false;
      if (velocityFilter === 'slow' && p.velocity !== 'slow') return false;
      if (velocityFilter === 'idle' && p.velocity !== 'idle') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCat = (p.category || '').toLowerCase().includes(q);
        const matchesBrand = (p.brand || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCat && !matchesBrand) return false;
      }

      return true;
    });
  }, [analyzedProducts, selectedCategory, packagingFilter, velocityFilter, searchQuery]);

  // Sorted products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortField) {
        case 'sold_cartons':
          valA = a.stats.soldCartons;
          valB = b.stats.soldCartons;
          break;
        case 'sold_pieces':
          valA = a.stats.soldPieces;
          valB = b.stats.soldPieces;
          break;
        case 'revenue':
          valA = a.stats.revenue;
          valB = b.stats.revenue;
          break;
        case 'profit':
          valA = a.stats.profit;
          valB = b.stats.profit;
          break;
        case 'margin':
          valA = a.margin;
          valB = b.margin;
          break;
        case 'stock_cartons':
          valA = a.stockCartons;
          valB = b.stockCartons;
          break;
        case 'runway':
          valA = a.runwayDays;
          valB = b.runwayDays;
          break;
        case 'burn_rate':
          valA = a.dailyRunRateCartons;
          valB = b.dailyRunRateCartons;
          break;
        case 'name':
          return sortAsc ? a.name.localeCompare(b.name, 'fa') : b.name.localeCompare(a.name, 'fa');
        default:
          valA = a.stats.soldCartons;
          valB = b.stats.soldCartons;
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredProducts, sortField, sortAsc]);

  // Paginated items
  const paginatedProducts = useMemo(() => {
    if (itemsPerPage >= 9999) return sortedProducts;
    const start = (currentPage - 1) * itemsPerPage;
    return sortedProducts.slice(start, start + itemsPerPage);
  }, [sortedProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedProducts.length / (itemsPerPage >= 9999 ? 1 : itemsPerPage));

  // Sorting helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Time Trend Data Generation
  const timeTrendBuckets = useMemo(() => {
    if (period === '7days') {
      const days = [];
      const todayStr = getCurrentPersianDate();
      const todayParts = todayStr.split('/').map(s => parseInt(s.trim()) || 0);
      const todayDays = todayParts.length === 3 ? todayParts[0] * 365 + todayParts[1] * 30 + todayParts[2] : 0;

      for (let i = 6; i >= 0; i--) {
        const targetDays = todayDays - i;
        const matching = salesInvoices.filter(inv => {
          if (!inv.date) return false;
          const parts = inv.date.split('/').map(s => parseInt(s.trim()) || 0);
          if (parts.length !== 3) return false;
          const dDays = parts[0] * 365 + parts[1] * 30 + parts[2];
          return dDays === targetDays;
        });

        const cartons = matching.reduce((sum, inv) => {
          return sum + (inv.items || []).reduce((isum, it) => isum + (it.cartonsCount || 0), 0);
        }, 0);

        const rev = matching.reduce((sum, inv) => sum + (inv.finalAmount || inv.totalAmount || 0), 0);
        days.push({
          label: i === 0 ? 'امروز' : i === 1 ? 'دیروز' : `${toPersianDigits(i)} روز قبل`,
          cartons,
          revenue: rev,
          count: matching.length,
        });
      }
      return days;
    }

    if (period === '4weeks' || period === 'month') {
      const weeks = [
        { label: 'هفته اول (روزهای ۲۲ تا ۲۸)', daysMin: 22, daysMax: 28 },
        { label: 'هفته دوم (روزهای ۱۵ تا ۲۱)', daysMin: 15, daysMax: 21 },
        { label: 'هفته سوم (روزهای ۸ تا ۱۴)', daysMin: 8, daysMax: 14 },
        { label: 'هفته چهارم (۷ روز اخیر)', daysMin: 0, daysMax: 7 },
      ];

      const todayStr = getCurrentPersianDate();
      const todayParts = todayStr.split('/').map(s => parseInt(s.trim()) || 0);
      const todayDays = todayParts.length === 3 ? todayParts[0] * 365 + todayParts[1] * 30 + todayParts[2] : 0;

      return weeks.map(w => {
        const matching = salesInvoices.filter(inv => {
          if (!inv.date) return false;
          const parts = inv.date.split('/').map(s => parseInt(s.trim()) || 0);
          if (parts.length !== 3) return false;
          const dDays = parts[0] * 365 + parts[1] * 30 + parts[2];
          const diff = todayDays - dDays;
          return diff >= w.daysMin && diff <= w.daysMax;
        });

        const cartons = matching.reduce((sum, inv) => {
          return sum + (inv.items || []).reduce((isum, it) => isum + (it.cartonsCount || 0), 0);
        }, 0);

        const rev = matching.reduce((sum, inv) => sum + (inv.finalAmount || inv.totalAmount || 0), 0);
        return {
          label: w.label,
          cartons,
          revenue: rev,
          count: matching.length,
        };
      });
    }

    return [
      { label: 'بخش اول دوره', cartons: Math.round(summaryKPIs.totalSoldCartons * 0.2), revenue: Math.round(summaryKPIs.totalRevenue * 0.2), count: Math.ceil(summaryKPIs.salesCount * 0.2) },
      { label: 'بخش دوم دوره', cartons: Math.round(summaryKPIs.totalSoldCartons * 0.25), revenue: Math.round(summaryKPIs.totalRevenue * 0.25), count: Math.ceil(summaryKPIs.salesCount * 0.25) },
      { label: 'بخش سوم دوره', cartons: Math.round(summaryKPIs.totalSoldCartons * 0.3), revenue: Math.round(summaryKPIs.totalRevenue * 0.3), count: Math.ceil(summaryKPIs.salesCount * 0.3) },
      { label: 'بخش پایانی دوره', cartons: Math.round(summaryKPIs.totalSoldCartons * 0.25), revenue: Math.round(summaryKPIs.totalRevenue * 0.25), count: Math.ceil(summaryKPIs.salesCount * 0.25) },
    ];
  }, [period, salesInvoices, summaryKPIs]);

  const maxBucketCartons = useMemo(() => {
    return Math.max(1, ...timeTrendBuckets.map(b => b.cartons));
  }, [timeTrendBuckets]);

  // Category breakdown share
  const categoryStats = useMemo(() => {
    const map = new Map<string, { cartons: number; pieces: number; revenue: number; profit: number; itemCount: number }>();

    for (const p of analyzedProducts) {
      const cat = p.category || 'سایر';
      const cur = map.get(cat) || { cartons: 0, pieces: 0, revenue: 0, profit: 0, itemCount: 0 };
      cur.cartons += p.stats.soldCartons;
      cur.pieces += p.stats.soldPieces;
      cur.revenue += p.stats.revenue;
      cur.profit += p.stats.profit;
      cur.itemCount += 1;
      map.set(cat, cur);
    }

    const totalSoldCartons = summaryKPIs.totalSoldCartons || 1;
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      cartonPercent: (data.cartons / totalSoldCartons) * 100,
    })).sort((a, b) => b.cartons - a.cartons);
  }, [analyzedProducts, summaryKPIs.totalSoldCartons]);

  // Copy summary to clipboard
  const handleCopySummary = () => {
    const periodText = 
      period === 'today' ? 'امروز' :
      period === '7days' ? '۷ روز اخیر' :
      period === '4weeks' ? '۴ هفته اخیر' :
      period === 'month' ? 'ماه جاری (۳۰ روز)' :
      period === '3months' ? '۳ ماه اخیر' :
      period === '6months' ? '۶ ماه اخیر' :
      period === 'year' ? '۱ سال گذشته' :
      period === 'custom' ? `از ${toPersianDigits(customStartDate || '-')} تا ${toPersianDigits(customEndDate || '-')}` : 'کل دوره‌ها';

    const text = `📊 *گزارش آنالیز انبار و کالاها*
📅 *بازه زمانی:* ${periodText}
🏢 *سامانه بازرگانی و انبارداری:* ${settings.brandName || 'مرکزی'}

📦 *آمار کل کارتن‌ها و بارها:*
• مجموع کارتن‌های فروخته‌شده: ${toPersianDigits(summaryKPIs.totalSoldCartons)} کارتن (${toPersianDigits(summaryKPIs.totalSoldLoose)} عدد خرد)
• مجموع کارتن‌های ورودی (خرید): ${toPersianDigits(summaryKPIs.totalInCartons)} کارتن
• تراز خالص جریان انبار: ${summaryKPIs.netCartonFlow >= 0 ? `+${toPersianDigits(summaryKPIs.netCartonFlow)} کارتن (افزایش)` : `${toPersianDigits(summaryKPIs.netCartonFlow)} کارتن (کاهش)`}
• تعداد فاکتورهای فروش: ${toPersianDigits(summaryKPIs.salesCount)} سند
• تعداد فاکتورهای ورود کالا: ${toPersianDigits(summaryKPIs.purchaseCount)} سند

💰 *آمار مالی دوره:*
• مجموع درآمد حاصل از فروش: ${formatPrice(summaryKPIs.totalRevenue)}
• بهای تمام‌شده اقلام خروجی: ${formatPrice(summaryKPIs.totalCost)}
• سود ناخالص دوره: ${formatPrice(summaryKPIs.totalProfit)} (حاشیه سود: ${toPersianDigits(summaryKPIs.profitMargin.toFixed(1))}٪)

⚡ *کالاهای صاعقه‌ای و در خطر اتمام سریع:*
• اقلام تمام‌شده در دوره: ${toPersianDigits(fastDepletionMetrics.outOfStockCount)} قلم
• اقلام در خطر اتمام ظرف ساعات/روزهای آینده: ${toPersianDigits(fastDepletionMetrics.imminentHoursCount + fastDepletionMetrics.imminentDaysCount)} قلم
${fastDepletionProducts.slice(0, 3).map((p, i) => `${toPersianDigits(i + 1)}. ${p.name} -> ${p.depletionBadgeText} (موجودی: ${toPersianDigits(p.stockCartons)} کارتن)`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Copy Smart Restock list for supplier
  const handleCopyRestockList = () => {
    if (restockNeededProducts.length === 0) return;
    const text = `📦 *لیست سفارش و شارژ کارتن برای تأمین‌کننده*
📅 *تاریخ ثبت درخواست:* ${toPersianDigits(getCurrentPersianDate())}
🏢 *انبار مرکزی:* ${settings.brandName || 'بازرگانی'}

${restockNeededProducts.map((p, i) => `${toPersianDigits(i + 1)}. ${p.name} (${formatProductPackagingSpec(p)})
   تعداد سفارش پیشنهادی: ${toPersianDigits(p.suggestedOrderCartons)} کارتن
   موجودی فعلی در انبار: ${toPersianDigits(p.stockCartons)} کارتن
   فروش دوره اخیر: ${toPersianDigits(p.stats.soldCartons)} کارتن`).join('\n\n')}

لطفاً پیش‌فاکتور ارسال فرمایید. سپاس`;

    navigator.clipboard.writeText(text);
    setCopiedRestockList(true);
    setTimeout(() => setCopiedRestockList(false), 2500);
  };

  // Copy Fast Depletion Alert for sales & purchase teams
  const handleCopyDepletionAlert = () => {
    if (fastDepletionProducts.length === 0) return;
    const text = `🚨 *هشدار مدیریتی: کالاهای زود فروش‌رفته و در معرض اتمام سریع*
📅 *تاریخ گزارش:* ${toPersianDigits(getCurrentPersianDate())}
🏢 *انبار:* ${settings.brandName || 'بازرگانی مرکزی'}

⚡ *فهرست کالاهای بحرانی با سرعت تخلیه بالا:*
${fastDepletionProducts.map((p, i) => `${toPersianDigits(i + 1)}. ${p.name} (${p.category})
   وضعیت: ${p.depletionBadgeText}
   موجودی باقی‌مانده: ${toPersianDigits(p.stockCartons)} کارتن
   نرخ مصرف: ${toPersianDigits(p.dailyRunRateCartons.toFixed(1))} کارتن در روز
   نیاز به شارژ فوری: ${toPersianDigits(p.suggestedOrderCartons)} کارتن`).join('\n\n')}

⚠️ لطفاً نسبت به هماهنگی با تیم خرید و اولویت‌بندی تأمین اقدام فرمایید.`;

    navigator.clipboard.writeText(text);
    setCopiedDepletionAlert(true);
    setTimeout(() => setCopiedDepletionAlert(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-20 print:p-0 print:m-0 print:max-w-none">
      {/* 1. Executive Top Header Plaque - Fully Themed */}
      <div className={`no-print bg-white dark:bg-slate-900 rounded-2xl border ${theme.borderColor} p-4 sm:p-5 shadow-xs transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
        {/* Right Wing: Title & Return Button */}
        <div className="flex items-center gap-3">
          <button
            id="warehouse-analytics-back-btn"
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95 group shrink-0"
            title="بازگشت به فهرست مدیریت کالاها"
          >
            <ArrowRight className="w-4 h-4 stroke-[2.2] group-hover:-translate-x-0.5 transition-transform" />
            <span>مدیریت کالاها</span>
          </button>

          <div className="h-7 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`p-1.5 rounded-lg ${theme.badgeBg} ${theme.primaryText}`}>
                <BarChart3 className="w-4 h-4" />
              </span>
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                آنالیز جامع انبار و کالاها
              </h1>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${theme.badgeBg} ${theme.primaryText} border ${theme.borderColor}`}>
                هوش تجاری بارها
              </span>
              {fastDepletionMetrics.imminentHoursCount > 0 && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse flex items-center gap-1">
                  <Zap className="w-3 h-3 text-rose-500" />
                  <span>{toPersianDigits(fastDepletionMetrics.imminentHoursCount)} کالا در خطر اتمام فوری</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تحلیل کارتن‌های فروخته‌شده، سرعت اتمام کالاها، کالاهای صاعقه‌ای و هوش شارژ دوباره در دوره‌های زمانی
            </p>
          </div>
        </div>

        {/* Left Wing: Action Buttons */}
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {fastDepletionProducts.length > 0 && (
            <button
              type="button"
              onClick={handleCopyDepletionAlert}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 border bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100`}
              title="کپی هشدار اقلام زود فروش رفته و در خطر اتمام برای تیم فروش و خرید"
            >
              {copiedDepletionAlert ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Zap className="w-3.5 h-3.5 text-rose-500" />}
              <span>{copiedDepletionAlert ? 'هشدار کپی شد' : 'هشدار اتمام سریع'}</span>
            </button>
          )}

          {restockNeededProducts.length > 0 && (
            <button
              type="button"
              onClick={handleCopyRestockList}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 border ${theme.badgeBg} ${theme.primaryText} ${theme.borderColor}`}
              title="کپی متن لیست سفارش کارتن‌های مورد نیاز جهت ارسال به تأمین‌کننده"
            >
              {copiedRestockList ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ShoppingCart className="w-3.5 h-3.5" />}
              <span>{copiedRestockList ? 'لیست خرید کپی شد' : `سفارش تأمین (${toPersianDigits(restockNeededProducts.length)})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs active:scale-95"
            title="کپی متن خلاصه گزارش تحلیلی به کلیپ‌بورد"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copied ? 'کپی شد' : 'کپی خلاصه'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs active:scale-95"
            title="چاپ گزارش تحلیلی انبار"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>چاپ گزارش</span>
          </button>
        </div>
      </div>

      {/* 2. Period Filter Control Center */}
      <div className={`no-print bg-white dark:bg-slate-900 rounded-2xl border ${theme.borderColor} p-4 shadow-xs transition-colors space-y-3.5`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Period Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>دوره آنالیز:</span>
            </span>

            {[
              { id: 'today', label: 'امروز' },
              { id: '7days', label: '۷ روز اخیر' },
              { id: '4weeks', label: '۴ هفته اخیر' },
              { id: 'month', label: 'ماه جاری (۳۰ روز)' },
              { id: '3months', label: '۳ ماهه (فصل)' },
              { id: '6months', label: '۶ ماه اخیر' },
              { id: 'year', label: '۱ سال گذشته' },
              { id: 'all', label: 'کل دوره‌ها' },
              { id: 'custom', label: 'بازه دلخواه ⚙️' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id as AnalyticsPeriod)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                  period === item.id
                    ? `${theme.primary} text-white shadow-2xs font-black`
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Quick Date Display */}
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>تاریخ امروز:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{toPersianDigits(getCurrentPersianDate())}</span>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {period === 'custom' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600 dark:text-slate-300">از تاریخ (شمسی):</span>
              <input
                type="text"
                placeholder="مثلا ۱۴۰۵/۰۵/۰۱"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className={`w-32 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-1 ${theme.ring}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600 dark:text-slate-300">تا تاریخ (شمسی):</span>
              <input
                type="text"
                placeholder="مثلا ۱۴۰۵/۰۵/۳۱"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className={`w-32 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-1 ${theme.ring}`}
              />
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              فرمت استاندارد: سال/ماه/روز (مثال: ۱۴۰۵/۰۵/۱۰)
            </span>
          </motion.div>
        )}
      </div>

      {/* 3. Executive KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Sold Cartons */}
        <div className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border ${theme.borderColor} shadow-xs relative overflow-hidden group`}>
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              کل کارتن‌های فروخته‌شده
            </span>
            <span className={`p-2 rounded-xl ${theme.badgeBg} ${theme.primaryText} border ${theme.borderColor}`}>
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black font-mono ${theme.primaryText}`}>
                {toPersianDigits(summaryKPIs.totalSoldCartons)}
              </span>
              <span className="text-xs font-bold text-slate-500">کارتن کامل</span>
            </div>
            {summaryKPIs.totalSoldLoose > 0 && (
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                + {toPersianDigits(summaryKPIs.totalSoldLoose)} عدد خرد / دانه‌ای
              </p>
            )}
            <div className={`mt-2 text-[11px] ${theme.primaryText} font-bold flex items-center gap-1`}>
              <Truck className="w-3 h-3" />
              <span>در {toPersianDigits(summaryKPIs.salesCount)} محموله و فاکتور فروش</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Inflow Cartons */}
        <div className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border ${theme.borderColor} shadow-xs relative overflow-hidden`}>
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              ورود کارتن به انبار (خرید)
            </span>
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                {toPersianDigits(summaryKPIs.totalInCartons)}
              </span>
              <span className="text-xs font-bold text-slate-500">کارتن شارژ شده</span>
            </div>
            <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>در {toPersianDigits(summaryKPIs.purchaseCount)} رسید ورود انبار</span>
            </div>
          </div>
        </div>

        {/* Card 3: Lightning Depletion & Out of Stock Count */}
        <div className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border ${theme.borderColor} shadow-xs relative overflow-hidden cursor-pointer hover:border-rose-400 transition-colors`}
          onClick={() => setActiveTab('fast_depletion')}
          title="مشاهده کالاهای سریع‌فروش و اتمام‌یافته"
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              سرعت اتمام و اقلام بحرانی
            </span>
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                {toPersianDigits(fastDepletionProducts.length)}
              </span>
              <span className="text-xs font-bold text-slate-500">قلم کالا</span>
            </div>
            <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
              <span>{toPersianDigits(fastDepletionMetrics.outOfStockCount)} قلم تمام‌شده</span>
              <span>•</span>
              <span>{toPersianDigits(fastDepletionMetrics.imminentHoursCount + fastDepletionMetrics.imminentDaysCount)} در معرض اتمام</span>
            </div>
          </div>
        </div>

        {/* Card 4: Financial Profit and Sales */}
        <div className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border ${theme.borderColor} shadow-xs relative overflow-hidden`}>
          <div className="flex items-start justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              سود ناخالص و فروش دوره
            </span>
            <span className={`p-2 rounded-xl ${theme.badgeBg} ${theme.primaryText} border ${theme.borderColor}`}>
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatPrice(summaryKPIs.totalProfit)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-bold">
              <span>فروش: {formatPrice(summaryKPIs.totalRevenue)}</span>
              <span className={`${theme.primaryText} font-mono font-black`}>
                {toPersianDigits(summaryKPIs.profitMargin.toFixed(1))}٪ سود
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tab Selector Bar - Symmetrical & Themed */}
      <div className={`no-print bg-white dark:bg-slate-900 rounded-2xl border ${theme.borderColor} p-2 shadow-xs flex items-center justify-between gap-2 overflow-x-auto`}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'items'
                ? `${theme.primary} text-white shadow-2xs`
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>آنالیز جزئی اقلام و کالاها ({toPersianDigits(filteredProducts.length)})</span>
          </button>

          {/* New Tab: Fast Depletion & Stockout Velocity */}
          <button
            type="button"
            onClick={() => setActiveTab('fast_depletion')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap relative ${
              activeTab === 'fast_depletion'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>سرعت اتمام و فروش صاعقه‌ای</span>
            {fastDepletionProducts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'fast_depletion' ? 'bg-white text-rose-700' : 'bg-rose-500 text-white'
              }`}>
                {toPersianDigits(fastDepletionProducts.length)}
              </span>
            )}
          </button>

          {/* Smart Restock Recommendations Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('restock')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap relative ${
              activeTab === 'restock'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>پیشنهاد شارژ هوشمند</span>
            {restockNeededProducts.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'restock' ? 'bg-white text-amber-700' : 'bg-amber-500 text-white'
              }`}>
                {toPersianDigits(restockNeededProducts.length)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'trends'
                ? `${theme.primary} text-white shadow-2xs`
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>روند زمانی و مقایسه دوره‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'categories'
                ? `${theme.primary} text-white shadow-2xs`
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>سهم دسته‌بندی‌ها ({toPersianDigits(categoryStats.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shipments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'shipments'
                ? `${theme.primary} text-white shadow-2xs`
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>بارهای ارسالی ({toPersianDigits(salesInvoices.length)})</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-bold px-3">
          <span>کالاهای دارای گردش:</span>
          <span className="font-mono text-slate-900 dark:text-white font-black">
            {toPersianDigits(summaryKPIs.activeSoldSKUs)} از {toPersianDigits(products.length)}
          </span>
        </div>
      </div>

      {/* 5. TAB 1: Detailed Items Table */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Sub Filters for Items & Page Size Selection */}
          <div className={`no-print bg-white dark:bg-slate-900 rounded-2xl border ${theme.borderColor} p-3.5 sm:p-4 shadow-xs transition-colors flex flex-wrap items-center justify-between gap-3 text-xs`}>
            {/* Search */}
            <div className="relative min-w-[200px] sm:min-w-[260px] flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="جستجوی نام کالا یا برند..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full pl-3 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 ${theme.ring}`}
              />
            </div>

            {/* Velocity / Turnover Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 font-bold ml-1">گردش کالا:</span>
              {[
                { id: 'all', label: 'همه' },
                { id: 'top', label: '🔥 پرفروش‌ها' },
                { id: 'fast_depletion', label: '⚡ زود فروش‌رفته' },
                { id: 'restock_needed', label: '🚨 نیازمند شارژ' },
                { id: 'moving', label: '⚡ پرگردش' },
                { id: 'idle', label: '💤 راکد' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setVelocityFilter(f.id as any);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    velocityFilter === f.id
                      ? `${theme.primary} text-white shadow-2xs font-black`
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">دسته:</span>
              <select
                value={selectedCategory}
                onChange={e => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-none focus:ring-1 ${theme.ring}`}
              >
                <option value="all">همه دسته‌ها ({toPersianDigits(products.length)})</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Page Size Selector - 20, 50, 100, All */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-bold">تعداد در صفحه:</span>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {[
                  { value: 20, label: '۲۰' },
                  { value: 50, label: '۵۰' },
                  { value: 100, label: '۱۰۰' },
                  { value: 99999, label: 'همه' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setItemsPerPage(opt.value);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all cursor-pointer ${
                      itemsPerPage === opt.value
                        ? `${theme.primary} text-white font-black shadow-2xs`
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Compact Table - Highly Condensed, Cohesive & Symmetrical */}
          <div className={`bg-white dark:bg-slate-900 rounded-2xl border ${theme.borderColor} shadow-xs overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-black">
                    <th className="py-2.5 px-3 w-10 text-center font-mono">#</th>
                    
                    {/* Combined Column 1: Product, Packaging & Velocity */}
                    <th className="py-2.5 px-3 cursor-pointer select-none" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1.5">
                        <span>کالا، بسته‌بندی و وضعیت گردش</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>

                    {/* Combined Column 2: Carton Flow (Outflow & Inflow) */}
                    <th className="py-2.5 px-3 text-center cursor-pointer select-none" onClick={() => handleSort('sold_cartons')}>
                      <div className="flex items-center justify-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <span>گردش کارتن در دوره (فروش / ورود)</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>

                    {/* Combined Column 3: Stock on Hand & Runway */}
                    <th className="py-2.5 px-3 text-center cursor-pointer select-none" onClick={() => handleSort('stock_cartons')}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span>موجودی انبار و پیش‌بینی دوام</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </th>

                    {/* Combined Column 4: Financial Performance */}
                    <th className="py-2.5 px-3 text-left cursor-pointer select-none" onClick={() => handleSort('revenue')}>
                      <div className="flex items-center justify-end gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <span>عملکرد مالی (درآمد و سود ناخالص)</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>

                    {/* Combined Column 5: Action & Restock */}
                    <th className="py-2.5 px-3 text-center">پیشنهاد و شارژ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-sm font-bold">
                        کالایی با فیلترهای انتخابی در این بازه زمانی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p, idx) => {
                      const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                      return (
                        <tr 
                          key={p.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                            {toPersianDigits(rowNum)}
                          </td>

                          {/* Column 1: Merged Product Details & Badges */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-[13px]">
                                {p.name}
                              </span>
                              {p.velocity === 'top' && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-0.5">
                                  <Flame className="w-3 h-3 text-rose-500" />
                                  <span>پرفروش</span>
                                </span>
                              )}
                              {p.isFastDepletion && (
                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border flex items-center gap-0.5 ${
                                  p.isZeroStock
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                    : 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                }`}>
                                  <Zap className="w-3 h-3 text-amber-600" />
                                  <span>{p.depletionBadgeText}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                              <span className="font-bold text-slate-700 dark:text-slate-300">{p.category}</span>
                              <span>•</span>
                              <span>{formatProductPackagingSpec(p)}</span>
                              <span>•</span>
                              <span className="font-mono">مصرف: {toPersianDigits(p.dailyRunRateCartons.toFixed(1))} ک/روز</span>
                            </div>
                          </td>

                          {/* Column 2: Merged Carton Flow (Out & In) */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-black text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900/60">
                                  خروج: {toPersianDigits(p.stats.soldCartons)} کارتن
                                </span>
                                {p.stats.inCartons > 0 && (
                                  <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
                                    +{toPersianDigits(p.stats.inCartons)} ورود
                                  </span>
                                )}
                              </div>
                              {p.stats.soldLoose > 0 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  (+ {toPersianDigits(p.stats.soldLoose)} دانه خرد)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Column 3: Merged Stock on Hand & Runway */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className={`font-mono font-black text-xs ${
                                p.isZeroStock 
                                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}>
                                {p.isZeroStock ? 'ناموجود (۰)' : `${toPersianDigits(p.stockCartons)} کارتن`}
                                {p.stockPieces > 0 && p.stockLoose > 0 && ` + ${toPersianDigits(p.stockLoose)}د`}
                              </span>
                              {p.runwayDays < 999 && !p.isZeroStock && (
                                <span className={`text-[10px] font-bold ${
                                  p.runwayDays <= 2 ? 'text-rose-600 dark:text-rose-400 font-black' :
                                  p.runwayDays <= 7 ? 'text-amber-600 dark:text-amber-400 font-bold' :
                                  'text-slate-400'
                                }`}>
                                  دوام: {toPersianDigits(p.runwayDays)} روز
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Column 4: Merged Financials */}
                          <td className="py-2.5 px-3 text-left dir-ltr whitespace-nowrap">
                            <div className="font-mono font-black text-slate-900 dark:text-white text-xs">
                              {formatPrice(p.stats.revenue)}
                            </div>
                            <div className="flex items-center justify-end gap-1.5 text-[11px] font-mono mt-0.5">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                سود: {formatPrice(p.stats.profit)}
                              </span>
                              {p.stats.revenue > 0 && (
                                <span className={`px-1.5 py-0.2 rounded font-black ${theme.badgeBg} ${theme.primaryText}`}>
                                  {toPersianDigits(p.margin.toFixed(1))}٪
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Column 5: Action & Quick Restock */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {onOpenRestock ? (
                              <button
                                type="button"
                                onClick={() => onOpenRestock(p)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                  p.isFastDepletion || p.isRestockNeeded
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : `${theme.primary} ${theme.primaryHover} text-white`
                                }`}
                                title={`شارژ مجدد موجودی انبار (پیشنهاد سفارش: ${toPersianDigits(p.suggestedOrderCartons)} کارتن)`}
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>{p.isZeroStock ? 'شارژ فوری' : 'شارژ'}</span>
                                <span className="text-[10px] opacity-85 font-mono">({toPersianDigits(p.suggestedOrderCartons)}ک)</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">
                                {toPersianDigits(p.suggestedOrderCartons)} ک سفارش
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Standard Application-Aligned Pagination with Theme & Items Per Page Controls */}
            <div className="no-print p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredProducts.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(newSize) => {
                  setItemsPerPage(newSize);
                  setCurrentPage(1);
                }}
                itemsPerPageOptions={[20, 50, 100]}
                itemName="قلم کالا"
                themeColor={settings.themeColor}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: Fast Depletion & Stockout Velocity (NEW Management Intelligence Tab) */}
      {activeTab === 'fast_depletion' && (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border ${theme.borderColor} p-5 shadow-xs space-y-6`}>
          {/* Header & Copy Alert */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-rose-600" />
                <span>رصد سرعت اتمام، کالاهای صاعقه‌ای و در خطر اتمام سریع</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ردیابی کالاهایی که در چند ساعت، روز یا هفته تخلیه شده‌اند و تخمین زمان تا صفر شدن موجودی فعلی
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyDepletionAlert}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0`}
            >
              {copiedDepletionAlert ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>کپی هشدار اتمام سریع برای تیم فروش و خرید</span>
            </button>
          </div>

          {/* 4 Mini Velocity Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Box 1: Completely Out of Stock */}
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 space-y-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400">کالاهای تمام‌شده در دوره</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                  {toPersianDigits(fastDepletionMetrics.outOfStockCount)}
                </span>
                <span className="text-slate-500 font-bold">قلم کالا</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">موجودی فیزیکی در انبار = ۰</p>
            </div>

            {/* Box 2: Imminent Hours (< 24h) */}
            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 space-y-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400">خطر اتمام ظرف چند ساعت</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                  {toPersianDigits(fastDepletionMetrics.imminentHoursCount)}
                </span>
                <span className="text-slate-500 font-bold">قلم کالا</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">دوام کمتر از ۱۰ تا ۲۴ ساعت کاری</p>
            </div>

            {/* Box 3: Imminent Days (1 to 3 Days) */}
            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 space-y-1.5">
              <span className="font-bold text-slate-500 dark:text-slate-400">اتمام ظرف ۲ تا ۳ روز</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                  {toPersianDigits(fastDepletionMetrics.imminentDaysCount)}
                </span>
                <span className="text-slate-500 font-bold">قلم کالا</span>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">نیازمند ثبت سفارش خرید در ۲۴ ساعت</p>
            </div>

            {/* Box 4: Record Holder Burn Rate */}
            <div className={`p-3.5 rounded-xl border ${theme.borderColor} ${theme.badgeBg} space-y-1.5`}>
              <span className="font-bold text-slate-500 dark:text-slate-400">رکورددار سرعت تخلیه انبار</span>
              <div className="truncate">
                <span className={`text-sm font-black ${theme.primaryText}`}>
                  {fastDepletionMetrics.recordHolder?.name || '-'}
                </span>
              </div>
              <p className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                نرخ: {toPersianDigits(fastDepletionMetrics.recordHolder?.dailyRunRateCartons?.toFixed(1) || '0')} کارتن در روز
              </p>
            </div>
          </div>

          {/* Subfilter Chips for Fast Depletion */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-500 font-bold ml-1">تفکیک زمان اتمام:</span>
            {[
              { id: 'all', label: `همه موارد سریع (${toPersianDigits(fastDepletionProducts.length)})` },
              { id: 'out_of_stock', label: `⛔ ناموجود شده (${toPersianDigits(fastDepletionMetrics.outOfStockCount)})` },
              { id: 'hours', label: `⚡ ظرف چند ساعت آینده (${toPersianDigits(fastDepletionMetrics.imminentHoursCount)})` },
              { id: 'days', label: `🚨 ظرف ۲ تا ۳ روز (${toPersianDigits(fastDepletionMetrics.imminentDaysCount)})` },
              { id: 'week', label: '⏳ ظرف ۱ هفته' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDepletionSubFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  depletionSubFilter === f.id
                    ? 'bg-rose-600 text-white font-black shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Fast Depletion Ranking Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800 text-xs">
                    <th className="py-2.5 px-3 w-10 text-center font-mono">#</th>
                    <th className="py-2.5 px-3">نام کالا و بسته‌بندی</th>
                    <th className="py-2.5 px-3 text-center">سرعت تخلیه انبار (Burn Rate)</th>
                    <th className="py-2.5 px-3 text-center">موجودی فعلی</th>
                    <th className="py-2.5 px-3 text-center">وضعیت و زمان اتمام</th>
                    <th className="py-2.5 px-3 text-left">تخمین زیان هفته آتی</th>
                    <th className="py-2.5 px-3 text-center">اقدام و شارژ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredFastDepletionProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        هیچ کالایی در این وضعیت سرعت اتمام یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredFastDepletionProducts.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                          {toPersianDigits(idx + 1)}
                        </td>

                        {/* Product */}
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-[13px]">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                            {p.category} · {formatProductPackagingSpec(p)}
                          </div>
                        </td>

                        {/* Burn Rate */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-xs">
                              {toPersianDigits(p.dailyRunRateCartons.toFixed(1))} کارتن در روز
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {p.hoursPerCarton > 0 && p.hoursPerCarton <= 12
                                ? `⚡ هر ${toPersianDigits(p.hoursPerCarton)} ساعت ۱ کارتن`
                                : `(خروج ${toPersianDigits(p.stats.soldCartons)} کارتن)`}
                            </span>
                          </div>
                        </td>

                        {/* Current Stock */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-lg border ${
                            p.isZeroStock 
                              ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800' 
                              : 'text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}>
                            {p.isZeroStock ? 'صفر (ناموجود)' : `${toPersianDigits(p.stockCartons)} کارتن`}
                          </span>
                        </td>

                        {/* Depletion Countdown Status */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-flex items-center gap-1 ${
                            p.depletionCategory === 'out_of_stock'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : p.depletionCategory === 'hours'
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700 animate-pulse'
                              : p.depletionCategory === 'days'
                              ? 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                              : 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          }`}>
                            {p.depletionCategory === 'hours' ? <Timer className="w-3.5 h-3.5 text-amber-600" /> : <Clock className="w-3.5 h-3.5" />}
                            <span>{p.depletionBadgeText}</span>
                          </span>
                        </td>

                        {/* Lost Revenue Estimation */}
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-700 dark:text-slate-300 dir-ltr whitespace-nowrap">
                          {p.lostSalesPotential > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400 font-black">
                              ~{formatPrice(p.lostSalesPotential)} / هفته
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {onOpenRestock && (
                            <button
                              type="button"
                              onClick={() => onOpenRestock(p)}
                              className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1"
                              title={`شارژ فوری موجودی انبار (پیشنهاد سفارش: ${toPersianDigits(p.suggestedOrderCartons)} کارتن)`}
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>شارژ فوری</span>
                              <span className="text-[10px] opacity-85 font-mono">({toPersianDigits(p.suggestedOrderCartons)}ک)</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: Smart Restock Procurement Feed */}
      {activeTab === 'restock' && (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border ${theme.borderColor} p-5 shadow-xs space-y-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                <span>هوش تجاری تأمین و کالاهای نیازمند شارژ مجدد</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                شناسایی خودکار کالاهایی که فروش بالایی داشته‌اند ولی موجودی انبارشان رو به اتمام است
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyRestockList}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0`}
            >
              {copiedRestockList ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>کپی سفارش خرید کارتن‌ها برای تأمین‌کننده</span>
            </button>
          </div>

          {restockNeededProducts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-black text-slate-900 dark:text-white">وضعیت انبار پایدار است!</h4>
              <p className="text-xs text-slate-500">
                هیچ کالای پرفروشی در خطر اتمام موجودی قرار ندارد و همه اقلام دارای ذخیره کافی هستند.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {restockNeededProducts.map(p => (
                <div 
                  key={p.id}
                  className="p-4 rounded-xl border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {p.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {p.category} · {formatProductPackagingSpec(p)}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                      p.isZeroStock 
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {p.isZeroStock ? 'ناموجود شده ⚠️' : `دوام: ${toPersianDigits(p.runwayDays)} روز`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-white dark:bg-slate-900 rounded-lg text-center text-xs border border-amber-200/60 dark:border-amber-900/40">
                    <div>
                      <span className="text-[10px] text-slate-400 block">فروش دوره اخیر</span>
                      <b className="font-mono text-slate-900 dark:text-white font-bold">{toPersianDigits(p.stats.soldCartons)} ک</b>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">موجودی فعلی</span>
                      <b className="font-mono text-slate-900 dark:text-white font-bold">{toPersianDigits(p.stockCartons)} ک</b>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block">سفارش پیشنهادی</span>
                      <b className="font-mono text-amber-600 dark:text-amber-400 font-black">{toPersianDigits(p.suggestedOrderCartons)} کارتن</b>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">
                      سود حاصله این کالا: <b className="font-mono text-emerald-600 font-bold">{formatPrice(p.stats.profit)}</b>
                    </span>

                    {onOpenRestock && (
                      <button
                        type="button"
                        onClick={() => onOpenRestock(p)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-white ${theme.primary} ${theme.primaryHover} transition-all cursor-pointer shadow-xs active:scale-95`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>شارژ این کالا</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. TAB 4: Time Trend Breakdown */}
      {activeTab === 'trends' && (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border ${theme.borderColor} p-5 shadow-xs space-y-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>روند خروج و فروش کارتن‌ها در مقاطع زمانی</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                مقایسه حجم کارتن‌های بارگیری شده و مبالغ فروش در دوره انتخابی
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${theme.badgeBg} ${theme.primaryText} border ${theme.borderColor}`}>
              مجموع: {toPersianDigits(summaryKPIs.totalSoldCartons)} کارتن
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {timeTrendBuckets.map((bucket, bIdx) => {
              const percent = maxBucketCartons > 0 ? (bucket.cartons / maxBucketCartons) * 100 : 0;
              return (
                <div key={bIdx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">
                      {bucket.label}
                    </span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className={`font-black ${theme.primaryText}`}>
                        {toPersianDigits(bucket.cartons)} کارتن
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        {formatPrice(bucket.revenue)}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500">
                        ({toPersianDigits(bucket.count)} فاکتور)
                      </span>
                    </div>
                  </div>

                  <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(4, percent)}%` }}
                      transition={{ duration: 0.6, delay: bIdx * 0.1 }}
                      className={`h-full rounded-full ${theme.primary}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. TAB 5: Category Breakdown */}
      {activeTab === 'categories' && (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border ${theme.borderColor} p-5 shadow-xs space-y-6`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>سهم دسته‌بندی‌ها از خروج کارتن و درآمد</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تفکیک میزان فروش و درصد سهم هر دسته کالایی از ظرفیت انبار
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryStats.map((cat) => (
              <div 
                key={cat.name}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.primary}`} />
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {cat.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({toPersianDigits(cat.itemCount)} کالا)
                    </span>
                  </div>
                  <span className={`font-mono font-black text-xs ${theme.primaryText}`}>
                    {toPersianDigits(cat.cartonPercent.toFixed(1))}٪ سهم کارتن
                  </span>
                </div>

                <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${theme.primary} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(3, cat.cartonPercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-600 dark:text-slate-300 font-bold">
                    حجم فروش: <b className="font-mono text-slate-900 dark:text-white">{toPersianDigits(cat.cartons)}</b> کارتن
                  </span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    درآمد: {formatPrice(cat.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. TAB 6: Cargo & Shipments Feed */}
      {activeTab === 'shipments' && (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border ${theme.borderColor} p-5 shadow-xs space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>فهرست بارهای ارسالی و فاکتورهای خروجی انبار در دوره</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ریز محموله‌های تحویلی به خریداران به همراه حجم کارتن و تاریخ بارگیری
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {toPersianDigits(salesInvoices.length)} بار ثبت‌شده
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {salesInvoices.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm font-bold">
                هیچ باری در این بازه زمانی ارسال نشده است.
              </div>
            ) : (
              salesInvoices.map(inv => {
                const totalCartons = (inv.items || []).reduce((sum, it) => sum + (it.cartonsCount || 0), 0);
                const totalPieces = (inv.items || []).reduce((sum, it) => sum + (it.totalPieces || 0), 0);
                return (
                  <div key={inv.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs font-black">
                        #{toPersianDigits(inv.invoiceNumber)}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {inv.customerName || 'مشتری متفرقه'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          <span>{toPersianDigits(inv.date)}</span>
                          {inv.time && <span>• {toPersianDigits(inv.time)}</span>}
                          {inv.customerCity && <span>• مقصد: {inv.customerCity}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right sm:text-left">
                        <span className={`px-2.5 py-1 rounded-lg font-black ${theme.badgeBg} ${theme.primaryText} border ${theme.borderColor}`}>
                          {toPersianDigits(totalCartons)} کارتن بار
                        </span>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 text-center">
                          {toPersianDigits(totalPieces)} عدد
                        </div>
                      </div>

                      <div className="font-mono font-black text-sm text-slate-900 dark:text-white dir-ltr">
                        {formatPrice(inv.finalAmount || inv.totalAmount || 0)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 11. Smart Logistics & Velocity Footer Plaque */}
      <div className={`bg-gradient-to-r from-slate-50 to-amber-50/50 dark:from-slate-900 dark:to-amber-950/20 rounded-2xl border ${theme.borderColor} p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl ${theme.badgeBg} ${theme.primaryText} shrink-0`}>
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-black text-sm text-slate-900 dark:text-white">
              بینش هوشمند سرعت فروش و رصد اتمام موجودی
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              تعداد <b>{toPersianDigits(fastDepletionProducts.length)}</b> قلم کالا با سرعت خروج بالا در معرض اتمام سریع (ظرف چند ساعت تا چند روز) قرار دارند. با تأمین به موقع از وقفه در تحویل بار به خریداران جلوگیری فرمایید.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveTab('fast_depletion');
          }}
          className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-xs cursor-pointer transition-all shrink-0 active:scale-95 flex items-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>مشاهده کالاهای صاعقه‌ای ({toPersianDigits(fastDepletionProducts.length)})</span>
        </button>
      </div>
    </div>
  );
};
