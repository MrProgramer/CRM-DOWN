import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings, BackupSnapshot } from '../types';
import { themes } from './ThemeConfig';
import { toPersianDigits, getCurrentPersianDate, getCurrentPersianTime } from '../utils/formatters';
import { 
  getBackupSnapshots, 
  saveBackupSnapshots, 
  deleteSnapshotById, 
  formatBytes,
  downloadSnapshotAsFile
} from '../utils/backupManager';
import { 
  HardDrive, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  Calendar, 
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
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pagination } from './Pagination';

interface BackupPageProps {
  settings: StoreSettings;
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
  customersCount: number;
  paymentsCount: number;
  returnsCount?: number;
  treasuryCount?: number;
  activityLogsCount: number;
  currentFullData: any;
}

export const BackupPage: React.FC<BackupPageProps> = ({
  settings,
  onExportData,
  onImportData,
  onResetToDefault,
  onRestoreSnapshot,
  runWithSecurityCheck,
  onShowAlert,
  onShowConfirm,
  productsCount,
  invoicesCount,
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
        productsCount: currentFullData.products?.length || productsCount || 0,
        invoicesCount: currentFullData.invoices?.length || invoicesCount || 0,
        customersCount: currentFullData.customers?.length || customersCount || 0,
        paymentsCount: currentFullData.payments?.length || paymentsCount || 0,
        returnsCount: currentFullData.productReturns?.length || returnsCount || 0,
        treasuryCount: currentFullData.treasuryTransactions?.length || treasuryCount || 0,
        activityLogsCount: currentFullData.activityLogs?.length || activityLogsCount || 0,
        sizeBytes,
        note: snapshotNote.trim() || 'نسخه پشتیبان جامع دستی',
        data: currentFullData,
      };

      const existing = getBackupSnapshots();
      const updatedResult = saveBackupSnapshots([newSnapshot, ...existing], settings.backupRetentionCount || 5);
      setSnapshots(updatedResult.snapshots);
      setSnapshotNote('');
      onShowAlert('نسخه پشتیبان جامع دیتابیس با موفقیت در حافظه سیستم ذخیره گردید.', 'success', 'پشتیبان‌گیری موفق');
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
      onShowAlert('فایل پشتیبان انتخابی با موفقیت در سیستم شما ذخیره شد.', 'success', 'دانلود نسخه پشتیبان');
    } catch (err) {
      console.error('Failed to download snapshot:', err);
      onShowAlert('خطا در دریافت فایل پشتیبان.', 'error', 'خطای دانلود');
    }
  };

  const handleRestoreSnapshotClick = (snap: BackupSnapshot) => {
    onShowConfirm(
      `آیا از بازگردانی اطلاعات دیتابیس به نسخه پشتیبان مورخ ${snap.dateFormatted} (ساعت ${snap.timeFormatted}) اطمینان دارید؟\nاطلاعات فعلی سیستم با اطلاعات این نسخه جامع جایگزین خواهند شد.`,
      () => {
        onRestoreSnapshot(snap.data);
      },
      'بازگردانی دیتابیس',
      'بله، بازگردانی شود',
      'انصراف'
    );
  };

  const handleDeleteSnapshotClick = (snapId: string) => {
    const execute = () => {
      onShowConfirm(
        'آیا از حذف این نسخه پشتیبان اطمینان دارید؟',
        () => {
          const updated = deleteSnapshotById(snapId);
          setSnapshots(updated);
          onShowAlert('نسخه پشتیبان انتخابی با موفقیت حذف شد.', 'info', 'حذف پشتیبان');
        },
        'حذف نسخه پشتیبان',
        'حذف',
        'انصراف'
      );
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        'تایید پین‌کد جهت حذف نسخه پشتیبان دیتابیس',
        'برای حذف این نسخه پشتیبان از دیتابیس، پین‌کد مدیریت را وارد کنید.',
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

  return (
    <div className="space-y-6 pb-16 dir-rtl">
      {/* Top Banner Card - Executive Design */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-5 transition-all no-print">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} text-xs font-black border ${theme.borderColor} shadow-2xs`}>
              <HardDrive className="w-3.5 h-3.5" />
              <span>پشتیبان‌گیری و ایمن‌سازی اطلاعات</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>پایگاه داده یکپارچه محلی</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
              <Database className="w-5 h-5" />
            </div>
            <span>مدیریت نسخه‌های پشتیبان و پایگاه داده</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
            پشتیبان‌گیری و بازنشانی امن کالاها، فاکتورها، پرونده مشتریان، واریزی‌ها، اسناد مرجوعی، خزانه‌داری و گزارشات
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="download-full-json-backup-btn"
            type="button"
            onClick={onExportData}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs sm:text-sm shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer shrink-0`}
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>دانلود کامل فایل پشتیبان (JSON)</span>
          </button>
        </div>
      </div>

      {/* Database Statistics Grid - Flat */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">محصولات</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(productsCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">کالا در انبار</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">فاکتورها</span>
            <FileText className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(invoicesCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">سند فروش/خرید</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">مشتریان</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(customersCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">طرف‌حساب</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">واریزی‌ها</span>
            <DollarSign className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(paymentsCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">فیش تسویه</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">مرجوعی‌ها</span>
            <RotateCcw className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(returnsCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">سند برگشتی</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">خزانه‌داری</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(treasuryCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">سند نقدینگی</span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold">اعلان‌ها</span>
            <Bell className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {toPersianDigits(activityLogsCount)}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">لاگ فعالیت</span>
        </div>
      </div>

      {/* Primary Action Cards Grid - Flat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Export & Import JSON Backup */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${theme.primaryLight} ${theme.primaryText} flex items-center justify-center font-bold`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                دانلود و بازیابی فایل JSON
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                انتقال داده‌ها و ذخیره در حافظه خارجی
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-500" />
                <span>پشتیبانی کامل از تمام بخش‌ها:</span>
              </div>
              فایل JSON استخراج‌شده شامل اطلاعات محصولات، موجودی، فاکتورها، مانده حساب مشتریان، فیش‌های واریزی، کالاهای مرجوعی، تراکنش‌های صندوق و بانک، و تاریخچه کامل سیستم است.
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={onExportData}
                className={`flex-1 py-2.5 px-3.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer`}
              >
                <Download className="w-4 h-4" />
                <span>دانلود فایل پشتیبان (.json)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>بارگذاری و بازیابی از فایل</span>
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

        {/* Card 2: Quick Manual Snapshot Creation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${theme.primaryLight} ${theme.primaryText} flex items-center justify-center font-bold`}>
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                ایجاد نسخه پشتیبان سریع (اسنپ‌شات)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ذخیره فوری کل دیتابیس درون مرورگر جهت بازگردانی لحظه‌ای
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                یادداشت اختیاری برای نسخه پشتیبان:
              </label>
              <input
                type="text"
                value={snapshotNote}
                onChange={(e) => setSnapshotNote(e.target.value)}
                placeholder="مثال: پیش از تغییر قیمت‌ها و تسویه حساب..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              onClick={handleCreateManualSnapshot}
              disabled={isCreatingSnapshot}
              className={`w-full py-2.5 px-3.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
            >
              <Save className="w-4 h-4" />
              <span>ایجاد و ذخیره اسنپ‌شات پشتیبان</span>
            </button>
          </div>
        </div>
      </div>

      {/* Snapshots History Table - Flat & Clean */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              تاریخچه نسخه‌های پشتیبان دیتابیس (Snapshots)
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            نگهداری تا {toPersianDigits(settings.backupRetentionCount || 5)} نسخه اخیر
          </span>
        </div>

        {snapshots.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs space-y-2">
            <HardDrive className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-medium">هنوز هیچ اسنپ‌شاتی ذخیره نشده است.</p>
          </div>
        ) : (
          (() => {
            const totalPages = Math.ceil(snapshots.length / itemsPerPage) || 1;
            const startIndex = (currentPage - 1) * itemsPerPage;
            const paginatedSnapshots = snapshots.slice(startIndex, startIndex + itemsPerPage);

            return (
              <div className="space-y-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-4">نوع و عنوان پشتیبان</th>
                        <th className="py-3 px-3 text-center">تاریخ و زمان</th>
                        <th className="py-3 px-3 text-center">اقلام پشتیبان‌گیری شده</th>
                        <th className="py-3 px-3 text-center">حجم داده</th>
                        <th className="py-3 px-4 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {paginatedSnapshots.map((snap, idx) => (
                        <tr key={`backup-snap-${snap.id || idx}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                snap.type === 'auto' 
                                  ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                                  : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {snap.type === 'auto' ? 'خودکار' : 'دستی'}
                              </span>
                              <span>{snap.note || 'نسخه پشتیبان دیتابیس'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                            {toPersianDigits(snap.dateFormatted)} - {toPersianDigits(snap.timeFormatted)}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                {toPersianDigits(snap.productsCount)} کالا
                              </span>
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                {toPersianDigits(snap.invoicesCount)} فاکتور
                              </span>
                              <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                {toPersianDigits(snap.customersCount)} مشتری
                              </span>
                              {typeof snap.returnsCount === 'number' && (
                                <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  {toPersianDigits(snap.returnsCount)} مرجوعی
                                </span>
                              )}
                              {typeof snap.treasuryCount === 'number' && (
                                <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  {toPersianDigits(snap.treasuryCount)} نقدینگی
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500">
                            {formatBytes(snap.sizeBytes)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleDownloadSnapshotClick(snap)}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold text-[11px] hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                                title="دانلود فایل پشتیبان (.json)"
                              >
                                <Download className="w-3 h-3" />
                                <span>دانلود</span>
                              </button>
                              <button
                                onClick={() => handleRestoreSnapshotClick(snap)}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold text-[11px] hover:bg-teal-100 transition-colors flex items-center gap-1 cursor-pointer"
                                title="بازگردانی دیتابیس به این نسخه"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>بازگردانی</span>
                              </button>
                              <button
                                onClick={() => handleDeleteSnapshotClick(snap.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                title="حذف اسنپ‌شات"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={snapshots.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(val) => {
                    setItemsPerPage(val);
                    setCurrentPage(1);
                  }}
                  itemsPerPageOptions={[10, 20, 50]}
                  itemName="نسخه پشتیبان"
                  themeColor={settings.themeColor}
                />
              </div>
            );
          })()
        )}
      </div>

      {/* Dangerous Zone: Complete Database Reset - Flat */}
      <div className="bg-rose-50/50 dark:bg-rose-950/15 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <h3>بازنشانی کامل دیتابیس و حذف کلیه اطلاعات</h3>
        </div>
        <p className="text-xs text-rose-600 dark:text-rose-300/80 leading-relaxed">
          توجه: این اقدام کلیه کالاها، فاکتورها، پرونده‌های مشتریان، تراکنش‌ها، کالاهای مرجوعی، اسناد خزانه‌داری و اعلان‌ها را به صورت برگشت‌ناپذیر پاک‌سازی می‌کند.
        </p>
        <div className="pt-1">
          <button
            id="reset-system-database-btn"
            onClick={onResetToDefault}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>پاک‌سازی کامل اطلاعات سیستم</span>
          </button>
        </div>
      </div>
    </div>
  );
};
