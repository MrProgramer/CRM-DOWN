import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend
} from 'recharts';
import { Invoice, Product, StoreSettings } from '../types';
import { formatPrice, toPersianDigits } from '../utils/formatters';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart3, 
  ArrowUpRight, 
  DollarSign, 
  Boxes, 
  CreditCard,
  Sparkles,
  Layers,
  Lock
} from 'lucide-react';

import { themes } from './ThemeConfig';

interface DashboardChartsProps {
  invoices: Invoice[];
  products: Product[];
  themeHex?: string;
  settings?: StoreSettings;
  isSecretMode?: boolean;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  invoices,
  products,
  themeHex,
  settings,
  isSecretMode = false,
}) => {
  const [chartType, setChartType] = useState<'sales-profit' | 'top-products' | 'categories' | 'payment-methods'>('sales-profit');
  const activeTheme = themes[settings?.themeColor || 'teal'] || themes.teal;
  const currentHex = themeHex || activeTheme.hex;

  // 1. Prepare Sales vs Cost vs Profit Trend (Group by invoice / date)
  const salesInvoices = invoices.filter(i => i.type === 'sale');

  // Build daily/invoice trend data
  const dateMap: Record<string, { date: string; revenue: number; cost: number; profit: number; invoicesCount: number }> = {};
  
  salesInvoices.forEach(inv => {
    const d = inv.date || 'نامشخص';
    const invCost = inv.items.reduce((s, it) => {
      const prod = products.find(p => p.id === it.productId || p.name === it.productName);
      const uCost = (prod?.purchasePrice && prod.purchasePrice > 0)
        ? prod.purchasePrice
        : (it.unitPurchasePrice || 0);
      return s + (it.totalPieces * uCost);
    }, 0);
    const invRevenue = inv.finalAmount;
    const invProfit = invRevenue - invCost;

    if (!dateMap[d]) {
      dateMap[d] = {
        date: d.length > 5 ? d.substring(5) : d, // e.g. "05/14"
        revenue: 0,
        cost: 0,
        profit: 0,
        invoicesCount: 0,
      };
    }
    dateMap[d].revenue += invRevenue;
    dateMap[d].cost += invCost;
    dateMap[d].profit += invProfit;
    dateMap[d].invoicesCount += 1;
  });

  const trendData = Object.values(dateMap).slice(-10); // Last 10 records for clean spacing

  // 2. Prepare Category Share Data for Pie Chart
  const categoryMap: Record<string, number> = {};
  products.forEach(p => {
    const cat = p.category || 'عمومی';
    const val = p.stockPieces * p.sellingPrice;
    categoryMap[cat] = (categoryMap[cat] || 0) + val;
  });

  const COLORS = [currentHex, '#0284c7', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#64748b', '#6366f1'];

  const categoryPieData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value,
  })).sort((a, b) => b.value - a.value);

  // 3. Top Best Selling Products by revenue & profit
  const productSalesMap: Record<string, { name: string; revenue: number; profit: number; count: number }> = {};
  salesInvoices.forEach(inv => {
    inv.items.forEach(it => {
      const name = it.productName;
      const totalPieces = it.totalPieces || 1;
      const prod = products.find(p => p.id === it.productId || p.name === it.productName);
      const uCost = (prod?.purchasePrice && prod.purchasePrice > 0)
        ? prod.purchasePrice
        : (it.unitPurchasePrice || 0);
      const cost = totalPieces * uCost;
      const rev = it.totalPrice || 0;
      const prof = rev - cost;

      if (!productSalesMap[name]) {
        productSalesMap[name] = { name, revenue: 0, profit: 0, count: 0 };
      }
      productSalesMap[name].revenue += rev;
      productSalesMap[name].profit += prof;
      productSalesMap[name].count += totalPieces;
    });
  });

  const topProductsData = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map(p => ({
      ...p,
      shortName: p.name.length > 15 ? p.name.substring(0, 13) + '...' : p.name,
    }));

  // 4. Payment method split
  const creditSales = salesInvoices.filter(i => i.paymentStatus === 'credit' || i.paymentMethod?.includes('نسیه') || i.paymentMethod?.includes('اعتباری'));
  const cashSales = salesInvoices.filter(i => i.paymentStatus !== 'credit' && !i.paymentMethod?.includes('نسیه'));
  const totalCreditAmount = creditSales.reduce((s, i) => s + i.finalAmount, 0);
  const totalCashAmount = cashSales.reduce((s, i) => s + i.finalAmount, 0);

  const paymentData = [
    { name: 'فروش نقدی / واریزی', value: totalCashAmount, color: '#10b981' },
    { name: 'فروش اعتباری (نسیه)', value: totalCreditAmount, color: '#f59e0b' },
  ].filter(p => p.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const activeItems = isSecretMode
        ? payload.filter((entry: any) => !entry.name?.includes('سود') && !String(entry.dataKey || '').toLowerCase().includes('profit'))
        : payload;

      if (activeItems.length === 0) return null;

      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs space-y-1.5 backdrop-blur-md">
          <p className="font-black text-slate-200 border-b border-slate-700 pb-1">{label}</p>
          {activeItems.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-bold dir-ltr">
                {formatPrice(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const gridStroke = isDarkMode ? '#1e293b' : '#e2e8f0';
  const axisStroke = isDarkMode ? '#334155' : '#cbd5e1';
  const tickColor = isDarkMode ? '#64748b' : '#94a3b8';

  return (
    <div className="bg-white dark:bg-[#090d16] rounded-xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-none space-y-5 transition-colors">
      {/* Chart Header & Mode Toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            نمودارهای تحلیلی و آمار پیشرفته
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isSecretMode 
              ? 'روند گردش فروش ریالی، سهم گروه‌های کالایی و تفکیک جریان نقدینگی'
              : 'روند گردش فروش، سود ناخالص ریالی، سهم گروه‌های کالایی و تفکیک جریان نقدینگی'
            }
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setChartType('sales-profit')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              chartType === 'sales-profit'
                ? `${activeTheme.primary} ${activeTheme.primaryHover} text-white shadow-xs font-black`
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{isSecretMode ? 'روند گردش فروش' : 'روند فروش و سود'}</span>
          </button>

          <button
            onClick={() => setChartType('top-products')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              chartType === 'top-products'
                ? `${activeTheme.primary} ${activeTheme.primaryHover} text-white shadow-xs font-black`
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>کالاهای پرفروش</span>
          </button>

          <button
            onClick={() => setChartType('categories')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              chartType === 'categories'
                ? `${activeTheme.primary} ${activeTheme.primaryHover} text-white shadow-xs font-black`
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>سهم دسته‌ها</span>
          </button>

          <button
            onClick={() => setChartType('payment-methods')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              chartType === 'payment-methods'
                ? `${activeTheme.primary} ${activeTheme.primaryHover} text-white shadow-xs font-black`
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>تسویه نقدی/اعتباری</span>
          </button>
        </div>
      </div>

      {/* Chart Visual Content */}
      <div className="h-64 sm:h-72 w-full">
        {chartType === 'sales-profit' && (
          isSecretMode ? (
            <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-100/60 dark:bg-slate-950/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xs">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                  نمودار روند فروش و سود محرمانه است 🔒
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  به دلیل فعال بودن حالت محرمانه، جزئیات نمودار روند فروش و سود ناخالص ریالی مخفی گردیده است.
                </p>
              </div>
            </div>
          ) : trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentHex} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={currentHex} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: tickColor }} 
                  interval="preserveStartEnd"
                  minTickGap={20}
                  tickLine={false}
                  axisLine={{ stroke: axisStroke }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: tickColor }} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="گردش فروش" 
                  stroke={currentHex} 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
                {!isSecretMode && (
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    name="سود ناخالص" 
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              داده‌ای برای نمایش روند در این بازه زمانی موجود نیست.
            </div>
          )
        )}

        {chartType === 'top-products' && (
          topProductsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} opacity={0.5} />
                <XAxis 
                  dataKey="shortName" 
                  tick={{ fontSize: 10, fill: tickColor }} 
                  interval="preserveStartEnd"
                  minTickGap={16}
                  angle={-15}
                  textAnchor="end"
                  tickLine={false}
                  axisLine={{ stroke: axisStroke }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: tickColor }} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="حجم فروش (تومان)" fill={currentHex} radius={[8, 8, 0, 0]} />
                {!isSecretMode && (
                  <Bar dataKey="profit" name="سود حاصله (تومان)" fill="#10b981" radius={[8, 8, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>

          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              داده‌ای برای رتبه‌بندی کالاها در این بازه زمانی موجود نیست.
            </div>
          )
        )}

        {chartType === 'categories' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 h-full items-center gap-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pl-2">
              {categoryPieData.map((entry, index) => {
                const total = categoryPieData.reduce((s, c) => s + c.value, 0);
                const pct = total > 0 ? (entry.value / total) * 100 : 0;
                return (
                  <div key={`dash-pie-cat-${entry.name || index}-${index}`} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-bold text-slate-800 dark:text-slate-200">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">{formatPrice(entry.value)}</span>
                      <span className={`font-black ${activeTheme.primaryText} ${activeTheme.primaryLight} px-1.5 py-0.5 rounded text-[10px]`}>
                        {toPersianDigits(pct.toFixed(0))}٪
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {chartType === 'payment-methods' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 h-full items-center gap-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <div>
                    <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">فروش نقدی و تسویه شده</div>
                    <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300">{toPersianDigits(cashSales.length)} فاکتور</div>
                  </div>
                </div>
                <span className="font-black text-xs text-emerald-800 dark:text-emerald-300">{formatPrice(totalCashAmount)}</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div>
                    <div className="font-bold text-xs text-amber-900 dark:text-amber-200">فروش نسیه (مطالبات بازرگانی)</div>
                    <div className="text-[10px] text-amber-700/80 dark:text-amber-300">{toPersianDigits(creditSales.length)} فاکتور</div>
                  </div>
                </div>
                <span className="font-black text-xs text-amber-800 dark:text-amber-300">{formatPrice(totalCreditAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Summary Pill Bar */}
      {topProductsData.length > 0 && chartType === 'sales-profit' && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <Boxes className="w-3.5 h-3.5" style={{ color: currentHex }} />
            پرفروش‌ترین کالا: <strong className={activeTheme.primaryText}>{topProductsData[0]?.name}</strong>
          </span>
          <span className="font-medium">
            مجموع سود ۶ کالای برتر: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{isSecretMode ? '••••••' : formatPrice(topProductsData.reduce((s, p) => s + p.profit, 0))}</strong>
          </span>
        </div>
      )}
    </div>
  );
};
