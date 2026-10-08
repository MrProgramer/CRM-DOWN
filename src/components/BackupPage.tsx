import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StoreSettings, BackupSnapshot } from '../types';
import { themes } from './ThemeConfig';
import { toPersianDigits, getCurrentPersianDate, getCurrentPersianTime, formatPrice } from '../utils/formatters';
import { 
  getBackupSnapshots, 
  saveBackupSnapshots, 
  deleteSnapshotById, 
  formatBytes,
  downloadSnapshotAsFile,
  getBackupStorageStats,
  MAX_CHANGE_SNAPSHOTS,
  MAX_SCHEDULED_SNAPSHOTS,
  TOTAL_BACKUP_LIMIT
} from '../utils/backupManager';
import { 
  HardDrive, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Boxes, 
  Users, 
  DollarSign, 
  Bell, 
  CheckCircle2, 
  Database, 
  Save, 
  Sparkles,
  Info, 
  RotateCcw, 
  Wallet,
  Eye,
  Search,
  SlidersHorizontal,
  Zap,
  Check,
  X,
  Layers,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pagination } from './Pagination';

interface BackupPageProps {
  settings: StoreSettings;
  onUpdateSettings?: (newSettings: StoreSettings) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetToDefault: () => void;
  onRestoreSnapshot: (snapshotData: any) => void;
  runWithSecurityCheck?: (
    title: string,
    subtitle: string,
    actionType?: 'edit' | 'delete',
    onSuccess?: () => void
  ) => void;
  onShowAlert: (message: string, type: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
  onShowConfirm: (
    message: string,
    onConfirmAction: () => void,
    title?: string,
    confirmText?: string,
    cancelText?: string
  ) => void;
  productsCount: number;
  invoicesCount: number;
  draftsCount?: number;
  customersCount: number;
  paymentsCount: number;
  returnsCount?: number;
  treasuryCount?: number;
  activityLogsCount: number;
  currentFullData: any;
}

export const BackupPage: React.FC<BackupPageProps> = ({
  settings,
  onUpdateSettings,
  onExportData,
  onImportData,
  onResetToDefault,
  onRestoreSnapshot,
  runWithSecurityCheck,
  onShowAlert,
  onShowConfirm,
  productsCount,
  invoicesCount,
  draftsCount,
  customersCount,
  paymentsCount,
  returnsCount = 0,
  treasuryCount = 0,
  activityLogsCount,
  currentFullData,
}) => {
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [snapshotNote, setSnapshotNote] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'change' | 'scheduled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewSnapshot, setPreviewSnapshot] = useState<BackupSnapshot | null>(null);
  const [showAutoSettings, setShowAutoSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = themes[settings.themeColor] || themes.teal;

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = () => {
    const list = getBackupSnapshots();
    setSnapshots(list);
  };

  // Storage and quota stats
  const stats = useMemo(() => {
    const totalCount = snapshots.length;
    const totalSizeBytes = snapshots.reduce((acc, s) => acc + (s.sizeBytes || 0), 0);
    const changeCount = snapshots.filter((s) => s.type === 'change').length;
    const scheduledAndManualCount = snapshots.filter((s) => s.type === 'auto' || s.type === 'manual').length;
    const autoCount = snapshots.filter((s) => s.type === 'auto').length;
    const manualCount = snapshots.filter((s) => s.type === 'manual').length;

    return {
      totalCount,
      totalLimit: TOTAL_BACKUP_LIMIT,
      totalSizeBytes,
      formattedSize: formatBytes(totalSizeBytes),
      changeCount,
      maxChangeSlots: MAX_CHANGE_SNAPSHOTS,
      scheduledAndManualCount,
      maxScheduledSlots: MAX_SCHEDULED_SNAPSHOTS,
      autoCount,
      manualCount,
      totalPercent: Math.min(100, Math.round((totalCount / TOTAL_BACKUP_LIMIT) * 100)),
      changePercent: Math.min(100, Math.round((changeCount / MAX_CHANGE_SNAPSHOTS) * 100)),
      scheduledPercent: Math.min(100, Math.round((scheduledAndManualCount / MAX_SCHEDULED_SNAPSHOTS) * 100)),
    };
  }, [snapshots]);

  // Derived filtered snapshots
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((snap) => {
      // Filter by type
      if (filterType === 'change' && snap.type !== 'change') return false;
      if (filterType === 'scheduled' && snap.type === 'change') return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const noteMatch = (snap.note || '').toLowerCase().includes(query);
        const actionMatch = (snap.changeAction || '').toLowerCase().includes(query);
        const dateMatch = (snap.dateFormatted || '').includes(query);
        const timeMatch = (snap.timeFormatted || '').includes(query);
        if (!noteMatch && !actionMatch && !dateMatch && !timeMatch) {
          return false;
        }
      }

      return true;
    });
  }, [snapshots, filterType, searchQuery]);

  const handleCreateManualSnapshot = () => {
    try {
      setIsCreatingSnapshot(true);
      const dataStr = JSON.stringify(currentFullData);
      const sizeBytes = new Blob([dataStr]).size;

      const newSnapshot: BackupSnapshot = {
        id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
        dateFormatted: getCurrentPersianDate(),
        timeFormatted: getCurrentPersianTime(),
        type: 'manual',
        changeAction: snapshotNote.trim() || 'پشتیبان دستی مدیریت',
        productsCount: currentFullData.products?.length || productsCount || 0,
        invoicesCount: currentFullData.invoices?.length || invoicesCount || 0,
        draftsCount: (currentFullData.invoices || []).filter((i: any) => i.isDraft).length || draftsCount || 0,
        customersCount: currentFullData.customers?.length || customersCount || 0,
        paymentsCount: currentFullData.payments?.length || paymentsCount || 0,
        returnsCount: currentFullData.productReturns?.length || returnsCount || 0,
        treasuryCount: currentFullData.treasuryTransactions?.length || treasuryCount || 0,
        activityLogsCount: currentFullData.activityLogs?.length || activityLogsCount || 0,
        sizeBytes,
        note: snapshotNote.trim() || 'نسخه پشتیبان دستی مدیریت',
        data: currentFullData,
      };

      const existing = getBackupSnapshots();
      const updatedResult = saveBackupSnapshots([newSnapshot, ...existing], TOTAL_BACKUP_LIMIT);
      setSnapshots(updatedResult.snapshots);
      setSnapshotNote('');
      onShowAlert('نسخه پشتیبان دستی دیتابیس با موفقیت در مخزن ذخیره گردید.', 'success', 'پشتیبان‌گیری موفق');
    } catch (err) {
      console.error('Failed to create snapshot:', err);
      onShowAlert('خطا در ذخیره‌سازی نسخه پشتیبان. لطفاً از فضای ذخیره‌سازی اطمینان حاصل کنید.', 'error', 'خطای پشتیبان‌گیری');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleDownloadSnapshotClick = (snap: BackupSnapshot) => {
    try {
      downloadSnapshotAsFile(snap);
      onShowAlert('فایل پشتیبان انتخابی با موفقیت در حافظه سیستم ذخیره شد.', 'success', 'دانلود نسخه پشتیبان');
    } catch (err) {
      console.error('Failed to download snapshot:', err);
      onShowAlert('خطا در دریافت فایل پشتیبان.', 'error', 'خطای دانلود');
    }
  };

  const handleRestoreSnapshotClick = (snap: BackupSnapshot) => {
    const execute = () => {
      onShowConfirm(
        `آیا از بازگردانی اطلاعات دیتابیس به نسخه مورخ ${toPersianDigits(snap.dateFormatted)} (ساعت ${toPersianDigits(snap.timeFormatted)}) اطمینان دارید؟\n` +
        `اطلاعات فعلی سیستم با این نسخه پشتیبان جایگزین خواهند شد. جهت حفظ امنیت، یک نسخه محافظتی از اطلاعات فعلی به صورت خودکار ذخیره می‌گردد.`,
        () => {
          if (previewSnapshot) setPreviewSnapshot(null);
          onRestoreSnapshot(snap.data || snap);
        },
        'تأیید بازگردانی دیتابیس',
        'بله، بازگردانی شود',
        'انصراف'
      );
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        'تایید پین‌کد جهت بازگردانی دیتابیس',
        'برای بازگردانی اطلاعات سیستم به این نسخه پشتیبان، پین‌کد مدیریت را وارد نمایید.',
        'delete',
        execute
      );
    } else {
      execute();
    }
  };

  const handleDeleteSnapshotClick = (snapId: string) => {
    const execute = () => {
      onShowConfirm(
        'آیا از حذف این نسخه پشتیبان اطمینان دارید؟ اسلات مربوطه در مخزن آزاد خواهد شد.',
        () => {
          const updated = deleteSnapshotById(snapId);
          setSnapshots(updated);
          if (previewSnapshot?.id === snapId) setPreviewSnapshot(null);
          onShowAlert('نسخه پشتیبان انتخابی حذف شد و اسلات مربوطه آزاد گردید.', 'info', 'حذف پشتیبان');
        },
        'حذف نسخه پشتیبان',
        'حذف اسنپ‌شات',
        'انصراف'
      );
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        'تایید پین‌کد جهت حذف نسخه پشتیبان',
        'برای حذف این نسخه پشتیبان از مخزن، پین‌کد مدیریت را وارد کنید.',
        'delete',
        execute
      );
    } else {
      execute();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleUpdateAutoBackupInterval = (intervalHours: number) => {
    if (!onUpdateSettings) return;
    const updated: StoreSettings = {
      ...settings,
      enableAutoBackup: true,
      autoBackupIntervalHours: intervalHours,
      backupRetentionCount: TOTAL_BACKUP_LIMIT,
    };
    onUpdateSettings(updated);
    onShowAlert(`دوره پشتیبان‌گیری خودکار به هر ${toPersianDigits(intervalHours)} ساعت تنظیم گردید.`, 'success', 'تنظیمات پشتیبان');
  };

  const handleToggleAutoBackup = (enabled: boolean) => {
    if (!onUpdateSettings) return;
    const updated: StoreSettings = {
      ...settings,
      enableAutoBackup: enabled,
      backupRetentionCount: TOTAL_BACKUP_LIMIT,
    };
    onUpdateSettings(updated);
    onShowAlert(
      enabled ? 'پشتیبان‌گیری زمان‌بندی شده خودکار فعال شد.' : 'پشتیبان‌گیری زمان‌بندی شده خودکار غیرفعال گردید.',
      enabled ? 'success' : 'info',
      'پشتیبان خودکار'
    );
  };

  const effectiveDraftsCount = typeof draftsCount === 'number' 
    ? draftsCount 
    : (currentFullData?.invoices || []).filter((i: any) => i.isDraft).length;

  return (
    <div className="space-y-6 pb-20 dir-rtl text-slate-800 dark:text-slate-100">
      {/* Top Banner Card - Executive Control Room */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all no-print">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} text-xs font-black border ${theme.borderColor} shadow-2xs`}>
              <HardDrive className="w-3.5 h-3.5" />
              <span>سیستم هوشمند پشتیبان‌گیری دوگانه</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800">
              <Zap className="w-3 h-3 text-purple-500" />
              <span>۵ اسلات تغییرات لحظه‌ای</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
              <Clock className="w-3 h-3 text-blue-500" />
              <span>۱۰ اسلات دوره‌ای و دستی</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor} shadow-xs`}>
              <Database className="w-6 h-6" />
            </div>
            <span>مدیریت و پشتیبان‌گیری هوشمند دیتابیس (۱۵ نسخه)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
            پشتیبان‌گیری خودکار پس از هر بار ثبت، ویرایش، تغییر داده یا پیش‌نویس فاکتور، همراه با نسخه‌های دوره‌ای و استخراج کامل فایل استاندارد JSON
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowAutoSettings(!showAutoSettings)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl ${showAutoSettings ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'} font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer`}
            title="تنظیمات فاصله پشتیبان‌گیری زمان‌بندی شده"
          >
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span>تنظیمات دوره خودکار</span>
          </button>

          <button
            id="download-full-json-backup-btn"
            type="button"
            onClick={onExportData}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs sm:text-sm shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer shrink-0`}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>دانلود کامل فایل پشتیبان (JSON)</span>
          </button>
        </div>
      </div>

      {/* Auto-Backup Settings Expansion Drawer */}
      <AnimatePresence>
        {showAutoSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-900 dark:to-blue-950/20 rounded-2xl p-5 border border-blue-200/80 dark:border-blue-900/50 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      تنظیمات پشتیبان‌گیری خودکار زمان‌بندی شده
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      پشتیبان‌گیری مستقل در پس‌زمینه بدون ایجاد وقفه در عملکرد سیستم
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.enableAutoBackup !== false}
                      onChange={(e) => handleToggleAutoBackup(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      پشتیبان‌گیری دوره‌ای فعال باشد
                    </span>
                  </label>
                  <button
                    onClick={() => setShowAutoSettings(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-2">
                  فاصله زمانی تکرار:
                </span>
                {[1, 6, 12, 24].map((hours) => {
                  const isCurrent = (settings.autoBackupIntervalHours || 24) === hours;
                  return (
                    <button
                      key={`interval-${hours}`}
                      type="button"
                      onClick={() => handleUpdateAutoBackupInterval(hours)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrent 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {hours === 1 ? 'هر ۱ ساعت' : `هر ${toPersianDigits(hours)} ساعت`}
                    </button>
                  );
                })}
                {settings.lastBackupDateFormatted && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-auto flex items-center gap-1 font-mono">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>آخرین اجرا: {toPersianDigits(settings.lastBackupDateFormatted)}</span>
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart 15-Slot Quota Gauge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Smart Capacity */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-teal-500" />
              <span>مخزن هوشمند ۱۵ اسلاتی</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[11px] font-black font-mono">
              {toPersianDigits(stats.totalCount)} / {toPersianDigits(stats.totalLimit)} اسلات
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {toPersianDigits(stats.totalCount)}
            </span>
            <span className="text-xs text-slate-500 font-bold">نسخه فعال در مرورگر</span>
            <span className="mr-auto text-xs font-bold text-slate-400 font-mono">
              حجم: {stats.formattedSize}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-l from-teal-500 to-blue-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.totalPercent}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-medium">
            <span>چرخش هوشمند FIFO</span>
            <span>{toPersianDigits(stats.totalPercent)}٪ تکمیل</span>
          </div>
        </div>

        {/* Card 2: 5 Change-Triggered Slots */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-purple-200/70 dark:border-purple-900/40 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-500" />
              <span>اسلات‌های اختصاصی پس از تغییرات</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-[11px] font-black font-mono">
              {toPersianDigits(stats.changeCount)} / {toPersianDigits(stats.maxChangeSlots)} اسلات
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black text-purple-950 dark:text-purple-200 font-mono">
              {toPersianDigits(stats.changeCount)}
            </span>
            <span className="text-xs text-purple-700/80 dark:text-purple-400 font-bold">نسخه تغییر زنده</span>
            <span className="mr-auto text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>پایش خودکار فعال</span>
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-purple-50 dark:bg-purple-950/40 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.changePercent}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            پشتیبان‌گیری اتوماتیک پس از هر ثبت کالا، فاکتور، پیش‌نویس، واریزی یا ویرایش
          </p>
        </div>

        {/* Card 3: 10 Scheduled & Manual Slots */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-blue-200/70 dark:border-blue-900/40 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>اسلات‌های دوره‌ای و دستی</span>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 text-[11px] font-black font-mono">
              {toPersianDigits(stats.scheduledAndManualCount)} / {toPersianDigits(stats.maxScheduledSlots)} اسلات
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black text-blue-950 dark:text-blue-200 font-mono">
              {toPersianDigits(stats.scheduledAndManualCount)}
            </span>
            <span className="text-xs text-blue-700/80 dark:text-blue-400 font-bold">نسخه دوره‌ای و دستی</span>
            <span className="mr-auto text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
              {toPersianDigits(stats.manualCount)} دستی | {toPersianDigits(stats.autoCount)} دوره‌ای
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-blue-50 dark:bg-blue-950/40 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.scheduledPercent}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
            پشتیبان‌های دوره‌ای زمان‌بندی شده و نسخه‌های دستی ایجاد شده توسط مدیر
          </p>
        </div>
      </div>

      {/* Current Live Database State Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">کالاها</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            {toPersianDigits(productsCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">موجودی انبار</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">فاکتورها</span>
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            {toPersianDigits(invoicesCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">فروش و خرید</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">پیش‌نویس‌ها</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
            {toPersianDigits(effectiveDraftsCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">فاکتور در حال تکمیل</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">مشتریان</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            {toPersianDigits(customersCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">طرف‌حساب تجاری</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">واریزی‌ها</span>
            <DollarSign className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            {toPersianDigits(paymentsCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">فیش تسویه</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">مرجوعی‌ها</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            {toPersianDigits(returnsCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">سند برگشتی</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">خزانه‌داری</span>
            <Wallet className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">
            {toPersianDigits(treasuryCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">تراکنش صندوق/بانک</span>
        </div>
      </div>

      {/* Main Operations Grid: Fast Snapshot Creation & JSON Migration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Fast Manual Snapshot Creation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${theme.primaryLight} ${theme.primaryText} flex items-center justify-center font-bold`}>
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                ایجاد نسخه پشتیبان دستی سریع (Snapshot)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ذخیره در ۱۰ اسلات دوره‌ای و دستی جهت بایگانی و بازگردانی فوری
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عنوان یا یادداشت نسخه پشتیبان (اختیاری):
              </label>
              <input
                type="text"
                value={snapshotNote}
                onChange={(e) => setSnapshotNote(e.target.value)}
                placeholder="مثال: قبل از ثبت فاکتورهای جدید و تسویه هفتگی..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              onClick={handleCreateManualSnapshot}
              disabled={isCreatingSnapshot}
              className={`w-full py-2.5 px-4 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs`}
            >
              <Save className="w-4 h-4" />
              <span>ثبت و ذخیره فوری اسنپ‌شات دستی</span>
            </button>
          </div>
        </div>

        {/* Card 2: JSON Backup Migration (Export / Import) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${theme.primaryLight} ${theme.primaryText} flex items-center justify-center font-bold`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                انتقال و بایگانی با فایل استاندارد JSON
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ذخیره روی فلش یا سیستم دیگر جهت امنیت مضاعف
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-teal-500" />
              <span>پوشش صددرصدی کلیه ماژول‌ها:</span>
            </div>
            فایل JSON شامل تمام فاکتورها، پیش‌نویس‌ها، محصولات، مانده‌حساب‌ها، واریزی‌ها، مرجوعی‌ها، خزانه‌داری، تنخواه و لاگ‌هاست.
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={onExportData}
              className={`flex-1 py-2.5 px-3.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs`}
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل JSON</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>بارگذاری از فایل JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Snapshots History Table - Clean, Categorized & Filterable */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {/* Table Header and Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                فهرست نسخه‌های پشتیبان دیتابیس (Snapshots)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تفکیک هوشمند نسخه‌ها با امکان پیش‌نمایش، دانلود تک‌فایل، بازگردانی امن و حذف
            </p>
          </div>

          {/* Filter Tabs and Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => { setFilterType('all'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                همه ({toPersianDigits(snapshots.length)})
              </button>
              <button
                type="button"
                onClick={() => { setFilterType('change'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  filterType === 'change'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-purple-600 dark:text-purple-400 hover:text-purple-800'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>تغییرات ({toPersianDigits(stats.changeCount)}/۵)</span>
              </button>
              <button
                type="button"
                onClick={() => { setFilterType('scheduled'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  filterType === 'scheduled'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-blue-600 dark:text-blue-400 hover:text-blue-800'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>دوره‌ای/دستی ({toPersianDigits(stats.scheduledAndManualCount)}/۱۰)</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="جستجو در پشتیبان‌ها..."
                className="w-44 sm:w-56 pr-8 pl-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredSnapshots.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-xs space-y-2">
            <HardDrive className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 stroke-[1.5]" />
            <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">
              هیچ نسخه پشتیبانی با این مشخصات یافت نشد
            </p>
            <p className="text-slate-400 max-w-sm mx-auto">
              با ایجاد اولین تغییر در سیستم یا ثبت پشتیبان دستی، نسخه‌های پشتیبان در این جدول قرار می‌گیرند.
            </p>
          </div>
        ) : (
          (() => {
            const totalPages = Math.ceil(filteredSnapshots.length / itemsPerPage) || 1;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedSnapshots = filteredSnapshots.slice(startIndex, startIndex + itemsPerPage);

            return (
              <div className="space-y-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-4">نوع و عنوان پشتیبان</th>
                        <th className="py-3 px-3 text-center">تاریخ و ساعت</th>
                        <th className="py-3 px-3 text-center">اقلام ذخیره شده در نسخه</th>
                        <th className="py-3 px-3 text-center">حجم داده</th>
                        <th className="py-3 px-4 text-center">عملیات مدیریت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {paginatedSnapshots.map((snap, idx) => {
                        const isChange = snap.type === 'change';
                        const isAuto = snap.type === 'auto';
                        const isManual = snap.type === 'manual';

                        return (
                          <tr 
                            key={`backup-snap-${snap.id || idx}-${idx}`} 
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              <div className="flex items-center gap-2.5">
                                {isChange && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                    <Zap className="w-3 h-3 text-purple-500" />
                                    <span>پس از تغییرات</span>
                                  </span>
                                )}
                                {isAuto && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                    <Clock className="w-3 h-3 text-blue-500" />
                                    <span>دوره‌ای خودکار</span>
                                  </span>
                                )}
                                {isManual && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                    <Save className="w-3 h-3 text-emerald-500" />
                                    <span>دستی مدیریت</span>
                                  </span>
                                )}
                                <div className="space-y-0.5">
                                  <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                    {snap.note || snap.changeAction || 'نسخه پشتیبان دیتابیس'}
                                  </div>
                                  {snap.changeAction && snap.changeAction !== snap.note && (
                                    <div className="text-[10px] text-slate-400 font-medium line-clamp-1">
                                      محرک: {snap.changeAction}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              <span className="text-slate-800 dark:text-slate-200 font-bold">{toPersianDigits(snap.dateFormatted)}</span>
                              <span className="text-slate-400 mx-1">-</span>
                              <span>{toPersianDigits(snap.timeFormatted)}</span>
                            </td>

                            <td className="py-3.5 px-3 text-center text-slate-700 dark:text-slate-300">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                  {toPersianDigits(snap.productsCount)} کالا
                                </span>
                                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-medium border border-emerald-200/50 dark:border-emerald-800/50">
                                  {toPersianDigits(snap.invoicesCount)} فاکتور
                                </span>
                                {typeof snap.draftsCount === 'number' && snap.draftsCount > 0 && (
                                  <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-200/50 dark:border-amber-800/50">
                                    {toPersianDigits(snap.draftsCount)} پیش‌نویس
                                  </span>
                                )}
                                <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  {toPersianDigits(snap.customersCount)} مشتری
                                </span>
                                {typeof snap.returnsCount === 'number' && snap.returnsCount > 0 && (
                                  <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                    {toPersianDigits(snap.returnsCount)} مرجوعی
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-3 text-center font-mono text-slate-500 font-bold whitespace-nowrap">
                              {formatBytes(snap.sizeBytes)}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewSnapshot(snap)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                                  title="مشاهده جزئیات و پیش‌نمایش محتوا"
                                >
                                  <Eye className="w-3 h-3 text-slate-500" />
                                  <span>پیش‌نمایش</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadSnapshotClick(snap)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-[11px] hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="دانلود فایل پشتیبان (.json)"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>دانلود</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRestoreSnapshotClick(snap)}
                                  className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold text-[11px] hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="بازگردانی دیتابیس به این نسخه"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>بازگردانی</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteSnapshotClick(snap.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                  title="حذف اسنپ‌شات و آزادسازی اسلات"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredSnapshots.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(val) => {
                    setItemsPerPage(val);
                    setCurrentPage(1);
                  }}
                  itemsPerPageOptions={[10, 15, 25]}
                  itemName="نسخه پشتیبان"
                  themeColor={settings.themeColor}
                />
              </div>
            );
          })()
        )}
      </div>

      {/* Snapshot Content Preview Modal */}
      <AnimatePresence>
        {previewSnapshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${
                    previewSnapshot.type === 'change' 
                      ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300' 
                      : (previewSnapshot.type === 'manual' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60')
                  }`}>
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-base">
                      پیش‌نمایش محتوای نسخه پشتیبان
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {previewSnapshot.note || 'نسخه جامع اطلاعات سیستم'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPreviewSnapshot(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Meta Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-slate-400 font-bold block text-[11px]">نوع نسخه:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {previewSnapshot.type === 'change' ? '⚡ پس از تغییرات' : (previewSnapshot.type === 'manual' ? '🟢 دستی مدیریت' : '⏰ دوره‌ای خودکار')}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-slate-400 font-bold block text-[11px]">تاریخ و ساعت:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(previewSnapshot.dateFormatted)} - {toPersianDigits(previewSnapshot.timeFormatted)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-slate-400 font-bold block text-[11px]">حجم اسنپ‌شات:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {formatBytes(previewSnapshot.sizeBytes)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-slate-400 font-bold block text-[11px]">فاکتورها و پیش‌نویس:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {toPersianDigits(previewSnapshot.invoicesCount)} ({toPersianDigits(previewSnapshot.draftsCount || 0)} پیش‌نویس)
                    </span>
                  </div>
                </div>

                {/* Items Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    خلاصه محتویات دیتابیس در زمان ایجاد نسخه:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500">کالاهای انبار:</span>
                      <span className="font-black text-slate-900 dark:text-white font-mono">
                        {toPersianDigits(previewSnapshot.productsCount)} قلم
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500">طرف‌حساب‌ها (مشتریان):</span>
                      <span className="font-black text-slate-900 dark:text-white font-mono">
                        {toPersianDigits(previewSnapshot.customersCount)} پرونده
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500">واریزی‌ها و تسویه‌ها:</span>
                      <span className="font-black text-slate-900 dark:text-white font-mono">
                        {toPersianDigits(previewSnapshot.paymentsCount)} فیش
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500">اسناد مرجوعی کالا:</span>
                      <span className="font-black text-slate-900 dark:text-white font-mono">
                        {toPersianDigits(previewSnapshot.returnsCount || 0)} سند
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500">تراکنش‌های خزانه‌داری:</span>
                      <span className="font-black text-slate-900 dark:text-white font-mono">
                        {toPersianDigits(previewSnapshot.treasuryCount || 0)} مورد
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                      <span className="text-slate-500">لاگ‌ها و رویدادها:</span>
                      <span className="font-black text-slate-900 dark:text-white font-mono">
                        {toPersianDigits(previewSnapshot.activityLogsCount || 0)} ردیف
                      </span>
                    </div>
                  </div>
                </div>

                {/* Products & Packaging Specs Preview */}
                {Array.isArray(previewSnapshot.data?.products) && previewSnapshot.data.products.length > 0 && (
                  <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-blue-500" />
                        <span>نمونه مشخصات بسته‌بندی و کارتن کالاها در این نسخه:</span>
                      </span>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono">
                        {toPersianDigits(previewSnapshot.data.products.length)} کالا
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {previewSnapshot.data.products.slice(0, 5).map((p: any, pIdx: number) => {
                        const packSpec = p.isUnpackaged 
                          ? 'کالای فله / بدون بسته‌بندی' 
                          : `هر کارتن: ${toPersianDigits(p.piecesPerCarton || 1)} ${p.unitTitle || 'عدد'}${p.packsPerCarton ? ` (${toPersianDigits(p.packsPerCarton)} بسته ${toPersianDigits(p.piecesPerPack || '')} تایی)` : ''}`;
                        return (
                          <div 
                            key={`preview-prod-${p.id || pIdx}`}
                            className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-blue-900/30 text-xs gap-2"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                              {p.coverPrice && Number(p.coverPrice) > 0 && (
                                <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                                  روی جلد: {formatPrice(p.coverPrice, false)} تومان
                                </span>
                              )}
                              <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300 font-mono bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                                {packSpec}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {previewSnapshot.data.products.length > 5 && (
                        <div className="text-[10px] text-center text-slate-400 font-medium pt-0.5">
                          و {toPersianDigits(previewSnapshot.data.products.length - 5)} کالای دیگر با جزئیات کامل بسته‌بندی و موجودی...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Safety Information Alert */}
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">محافظت خودکار قبل از بازگردانی:</span>
                    با تأیید بازگردانی، اطلاعات فعلی شما ابتدا در یک اسلات محافظتی ذخیره خواهد شد تا در صورت تمایل بتوانید دوباره به حالت پیشین بازگردید.
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewSnapshot(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  بستن پیش‌نمایش
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadSnapshotClick(previewSnapshot)}
                    className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود فایل (.json)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRestoreSnapshotClick(previewSnapshot)}
                    className={`px-4 py-2 rounded-xl ${theme.primary} ${theme.primaryHover} text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>بازگردانی سیستم به این نسخه</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dangerous Zone: Complete Database Reset */}
      <div className="bg-rose-50/50 dark:bg-rose-950/15 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <h3>بازنشانی کامل دیتابیس و حذف کلیه اطلاعات</h3>
        </div>
        <p className="text-xs text-rose-600 dark:text-rose-300/80 leading-relaxed">
          توجه: این اقدام کلیه کالاها، فاکتورها، پیش‌نویس‌ها، پرونده‌های مشتریان، تراکنش‌ها، کالاهای مرجوعی، اسناد خزانه‌داری و اعلان‌ها را به صورت برگشت‌ناپذیر پاک‌سازی می‌کند.
        </p>
        <div className="pt-1">
          <button
            id="reset-system-database-btn"
            onClick={onResetToDefault}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>پاک‌سازی کامل اطلاعات سیستم</span>
          </button>
        </div>
      </div>
    </div>
  );
};
