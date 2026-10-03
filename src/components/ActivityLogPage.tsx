import React, { useState, useMemo } from 'react';
import { ActivityLog, StoreSettings } from '../types';
import { AppTab } from './HeaderNav';
import { themes } from './ThemeConfig';
import { toPersianDigits, getCurrentPersianDate } from '../utils/formatters';
import { 
  Bell, 
  Search, 
  Trash2, 
  FileText, 
  Boxes, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  Sparkles, 
  Download, 
  Lock, 
  Sun, 
  Moon, 
  HardDrive, 
  Filter, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck,
  RefreshCw,
  Eye,
  CheckCircle2,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityLogPageProps {
  activityLogs: ActivityLog[];
  onClearActivityLogs: () => void;
  onTabChange: (tab: AppTab) => void;
  settings: StoreSettings;
  onShowConfirm: (
    message: string,
    onConfirmAction: () => void,
    title?: string,
    confirmText?: string,
    cancelText?: string
  ) => void;
  onShowAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
}

export const ActivityLogPage: React.FC<ActivityLogPageProps> = ({
  activityLogs,
  onClearActivityLogs,
  onTabChange,
  settings,
  onShowConfirm,
  onShowAlert,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const theme = themes[settings.themeColor] || themes.teal;

  const stats = useMemo(() => {
    const total = activityLogs.length;
    const warnings = activityLogs.filter(log => log.type === 'warning').length;
    const exports = activityLogs.filter(log => log.type === 'export').length;
    const today = activityLogs.filter(log => log.date === getCurrentPersianDate()).length;
    return { total, warnings, exports, today };
  }, [activityLogs]);

  // Filter categories with live counts
  const categories = useMemo(() => {
    return [
      { id: 'all', label: 'همه رویدادها', icon: Bell, count: activityLogs.length },
      { id: 'invoice', label: 'فاکتورها', icon: FileText, count: activityLogs.filter(l => l.type === 'invoice').length },
      { id: 'product', label: 'انبار و کالاها', icon: Boxes, count: activityLogs.filter(l => l.type === 'product').length },
      { id: 'customer', label: 'مشتریان', icon: Users, count: activityLogs.filter(l => l.type === 'customer').length },
      { id: 'payment', label: 'واریزی‌ها', icon: DollarSign, count: activityLogs.filter(l => l.type === 'payment').length },
      { id: 'export', label: 'خروجی و PDF', icon: Download, count: activityLogs.filter(l => l.type === 'export').length },
      { id: 'backup', label: 'پشتیبان‌گیری', icon: HardDrive, count: activityLogs.filter(l => l.type === 'backup').length },
      { id: 'auth', label: 'امنیت و ورود', icon: Lock, count: activityLogs.filter(l => l.type === 'auth').length },
      { id: 'theme', label: 'تغییر تم و ظاهر', icon: Sun, count: activityLogs.filter(l => l.type === 'theme').length },
      { id: 'warning', label: 'هشدارها و حذف', icon: AlertTriangle, count: activityLogs.filter(l => l.type === 'warning').length },
    ];
  }, [activityLogs]);

  // Filtered Activity Logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'warning') {
          if (log.type !== 'warning') return false;
        } else if (log.type !== selectedCategory) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchTitle = log.title.toLowerCase().includes(query);
        const matchDesc = log.description.toLowerCase().includes(query);
        const matchDate = log.date.includes(query);
        const matchTime = log.time.includes(query);
        return matchTitle || matchDesc || matchDate || matchTime;
      }

      return true;
    });
  }, [activityLogs, selectedCategory, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleConfirmClear = () => {
    onShowConfirm(
      'آیا از پاک‌سازی کامل کلیه اعلان‌ها و تاریخچه فعالیت‌های سیستم اطمینان دارید؟\nاین عملیات قابل بازگشت نیست.',
      () => {
        onClearActivityLogs();
        onShowAlert('تاریخچه کلیه فعالیت‌ها و اعلان‌های سیستم با موفقیت پاک‌سازی شد.', 'success', 'پاک‌سازی کامل');
      },
      'تأیید پاک‌سازی اعلان‌ها',
      'بله، پاک شود',
      'انصراف'
    );
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'invoice':
        return <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'product':
        return <Boxes className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'customer':
        return <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      case 'export':
        return <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
      case 'backup':
        return <HardDrive className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'auth':
        return <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case 'theme':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />;
      default:
        return <Sparkles className="w-5 h-5 text-teal-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'invoice':
        return { label: 'فاکتور فروش', bg: 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800' };
      case 'product':
        return { label: 'انبار کالا', bg: 'bg-blue-100/80 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300/80 dark:border-blue-800' };
      case 'customer':
        return { label: 'مشتریان', bg: 'bg-purple-100/80 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300/80 dark:border-purple-800' };
      case 'payment':
        return { label: 'تراکنش مالی', bg: 'bg-teal-100/80 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border-teal-300/80 dark:border-teal-800' };
      case 'export':
        return { label: 'خروجی / PDF', bg: 'bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-300/80 dark:border-indigo-800' };
      case 'backup':
        return { label: 'پشتیبان دیتابیس', bg: 'bg-amber-100/80 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-800' };
      case 'auth':
        return { label: 'امنیتی / ورود', bg: 'bg-rose-100/80 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300/80 dark:border-rose-800' };
      case 'theme':
        return { label: 'ظاهر و تم', bg: 'bg-yellow-100/80 dark:bg-yellow-950/80 text-yellow-800 dark:text-yellow-300 border-yellow-300/80 dark:border-yellow-800' };
      case 'warning':
        return { label: 'هشدار حساس', bg: 'bg-rose-100/80 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300/80 dark:border-rose-800' };
      default:
        return { label: 'سیستمی', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' };
    }
  };

  return (
    <div className="space-y-6 pb-20 dir-rtl">
      {/* Ultra-Modern Top Command Hero Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-5 transition-all no-print">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} text-xs font-black border ${theme.borderColor} shadow-2xs`}>
              <Activity className="w-3.5 h-3.5" />
              <span>مرکز پایش و مانیتورینگ زنده</span>
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-800/80 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>سیستم نظارت فعال</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <span>{toPersianDigits(activityLogs.length)} رویداد ثبت شده</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
              <Bell className="w-5 h-5" />
            </div>
            <span>گزارش زنده و تاریخچه رویدادهای سیستم</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
            ثبت لحظه‌ای کلیه اقدامات شامل صدور فاکتورها، تغییرات انبار، پرداختی‌ها، گزارشات PDF، رویدادهای امنیتی و پشتیبان‌گیری
          </p>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-2 shrink-0">
          {activityLogs.length > 0 && (
            <button
              id="clear-all-activity-logs-btn"
              type="button"
              onClick={handleConfirmClear}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 shadow-2xs"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>پاک‌سازی کامل اعلان‌ها</span>
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards Row - Rounded-3xl Style like ReturnsManager */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Logs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-blue-200/70 dark:border-blue-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">کل رویدادهای سیستم</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {toPersianDigits(stats.total)} <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">مورد</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>تاریخچه حسابرسی:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
              ثبت لاگ فعال
            </span>
          </div>
        </div>

        {/* Today's Logs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">رویدادهای امروز</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {toPersianDigits(stats.today)} <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">مورد</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>فعالیت ۲۴ ساعت گذشته:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {toPersianDigits(stats.today)} رویداد
            </span>
          </div>
        </div>

        {/* Exports & Downloads */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-indigo-200/70 dark:border-indigo-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">خروجی و PDF فاکتورها</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800">
              <Download className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {toPersianDigits(stats.exports)} <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">بار</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>تولید اسناد و چاپ:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              {toPersianDigits(stats.exports)} دانلود
            </span>
          </div>
        </div>

        {/* Warnings & Deletions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-rose-200/70 dark:border-rose-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">هشدارها و حذفیات</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-3 dir-ltr text-right">
            {toPersianDigits(stats.warnings)} <span className="text-xs text-rose-600 dark:text-rose-400 font-bold">مورد</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>عملیات‌های حساس:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
              {toPersianDigits(stats.warnings)} هشدار
            </span>
          </div>
        </div>
      </div>

      {/* Filter, Search & Category Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="جستجو بر اساس عنوان، متن رویداد، تاریخ یا زمان..."
              className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                پاک کردن
              </button>
            )}
          </div>

          <div className="text-xs font-black text-slate-500 dark:text-slate-400 px-2 shrink-0 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-500" />
            <span>نمایش {toPersianDigits(filteredLogs.length)} از {toPersianDigits(activityLogs.length)} اعلان</span>
          </div>
        </div>

        {/* Category Pills Bar with Count Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={`log-cat-${cat.id}-${idx}`}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
                  isSelected
                    ? `${theme.primary} text-white border-transparent shadow-md font-black`
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {toPersianDigits(cat.count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity Logs Timeline Feed */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden p-4 sm:p-6">
        {paginatedLogs.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <Bell className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-slate-200 text-base">
                هیچ اعلان یا رویدادی یافت نشد
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                با صدور فاکتور جدید، ثبت کالا، دریافتی جدید یا دانلود PDF، رویدادها به‌صورت آنی در این بخش قرار می‌گیرند.
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${theme.primary} text-white cursor-pointer`}
              >
                پاک‌سازی جستجو
              </button>
            )}
          </div>
        ) : (
          <div className="relative space-y-4">
            {/* Timeline Vertical Rail */}
            <div className="absolute top-4 bottom-4 right-6 sm:right-7 w-0.5 bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            {paginatedLogs.map((log, lIdx) => {
              const badge = getTypeBadge(log.type);
              const isWarning = log.type === 'warning';

              return (
                <div
                  key={`log-entry-${log.id || lIdx}-${lIdx}`}
                  className={`relative p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start gap-4 ${
                    isWarning 
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 hover:border-rose-400' 
                      : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80 hover:border-teal-500/40 hover:bg-white dark:hover:bg-slate-900'
                  }`}
                >
                  {/* Category Node Icon Box */}
                  <div className={`w-11 h-11 rounded-2xl border shrink-0 flex items-center justify-center z-10 shadow-xs ${
                    isWarning 
                      ? 'bg-rose-100 dark:bg-rose-900/60 border-rose-300 dark:border-rose-700' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}>
                    {getLogIcon(log.type)}
                  </div>

                  {/* Log Card Content */}
                  <div className="flex-1 space-y-2 min-w-0 w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`font-black text-sm truncate ${
                          isWarning ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                        }`}>
                          {log.title}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Date & Time Badges */}
                      <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                          <Clock className="w-3.5 h-3.5 text-teal-500" />
                          <span>{toPersianDigits(log.time)}</span>
                        </span>
                        <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                          <Calendar className="w-3.5 h-3.5 text-teal-500" />
                          <span>{toPersianDigits(log.date)}</span>
                        </span>
                      </div>
                    </div>

                    <p className={`text-xs leading-relaxed font-medium ${
                      isWarning ? 'text-rose-600 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {log.description}
                    </p>

                    {/* Quick Link Navigation */}
                    {log.tabTarget && (
                      <div className="pt-1 flex items-center justify-between">
                        <button
                          onClick={() => onTabChange(log.tabTarget!)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black ${theme.primaryText} ${theme.primaryLight} border ${theme.borderColor} hover:scale-102 transition-all cursor-pointer`}
                        >
                          <span>انتقال و مشاهده صفحه مربوطه</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                نمایش {toPersianDigits((currentPage - 1) * itemsPerPage + 1)} تا {toPersianDigits(Math.min(currentPage * itemsPerPage, filteredLogs.length))} از {toPersianDigits(filteredLogs.length)} رویداد
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">تعداد در صفحه:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                >
                  <option value={20}>۲۰ مورد</option>
                  <option value={50}>۵۰ مورد</option>
                  <option value={100}>۱۰۰ مورد</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="صفحه قبلی"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      return (
                        <React.Fragment key={`log-page-${page}-${idx}`}>
                          {showEllipsis && <span className="text-slate-400 px-1">...</span>}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-xl font-bold transition-all cursor-pointer ${
                              currentPage === page
                                ? `${theme.primary} text-white shadow-xs font-black`
                                : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {toPersianDigits(page)}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="صفحه بعدی"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
