import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  HelpCircle, 
  X,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { StoreSettings, ThemeColor } from '../types';
import { themes } from './ThemeConfig';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmModalOptions {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose?: () => void;
}

// Backward-compatibility interface
export interface NotificationModalOptions {
  isOpen: boolean;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onClose?: () => void;
  duration?: number;
}

// ----------------------------------------------------
// 1. ULTRA-MODERN FLOATING TOAST CARD (Proportional Auto-Dismiss & Theme-Aligned)
// ----------------------------------------------------
interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  settings?: StoreSettings;
  themeColor?: ThemeColor;
}

export const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss, settings, themeColor }) => {
  const [isPaused, setIsPaused] = useState(false);

  const activeThemeKey = themeColor || settings?.themeColor || 'teal';
  const appTheme = themes[activeThemeKey] || themes.teal;

  // Proportional dynamic timing:
  // Short message (<30 chars) -> ~2500ms
  // Medium message (30-60 chars) -> ~3000ms
  // Long message (>60 chars) -> ~3600ms
  // Errors & Warnings get slightly more time to read comfortably
  const calculatedDuration = toast.duration || (
    toast.type === 'error' ? 3600 :
    toast.type === 'warning' ? 3400 :
    toast.message.length > 50 ? 3200 :
    2800
  );

  useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, calculatedDuration);
    return () => clearTimeout(timer);
  }, [toast.id, calculatedDuration, isPaused, onDismiss]);

  const getTheme = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5" style={{ color: appTheme.hex }} />,
          border: 'border-slate-200/90 dark:border-slate-800/90',
          badgeBg: appTheme.badgeBg,
          badgeText: appTheme.badgeText,
          pillBg: 'text-white font-black',
          pillStyle: { backgroundColor: appTheme.hex },
          pillLabel: 'موفق',
          progressBg: appTheme.primary,
          glow: appTheme.glowClass,
          dotHex: appTheme.hex,
          defaultTitle: 'عملیات موفق',
          accentBorder: appTheme.borderColor,
          customHex: appTheme.hex,
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
          border: 'border-rose-500/35 dark:border-rose-500/30',
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          badgeText: 'text-rose-700 dark:text-rose-300',
          pillBg: 'bg-rose-600 text-white',
          pillLabel: 'خطا',
          progressBg: 'bg-rose-600 dark:bg-rose-500',
          glow: 'shadow-[0_12px_36px_-6px_rgba(244,63,94,0.28)]',
          dotHex: '#e11d48',
          defaultTitle: 'خطا در عملیات',
          accentBorder: 'border-rose-500/35 dark:border-rose-500/30',
          customHex: '#e11d48',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          border: 'border-amber-500/35 dark:border-amber-500/30',
          badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          badgeText: 'text-amber-700 dark:text-amber-300',
          pillBg: 'bg-amber-500 text-slate-950 font-black',
          pillLabel: 'هشدار',
          progressBg: 'bg-amber-500',
          glow: 'shadow-[0_12px_36px_-6px_rgba(245,158,11,0.28)]',
          dotHex: '#f59e0b',
          defaultTitle: 'هشدار سامانه',
          accentBorder: 'border-amber-500/35 dark:border-amber-500/30',
          customHex: '#f59e0b',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5" style={{ color: appTheme.hex }} />,
          border: 'border-slate-200/90 dark:border-slate-800/90',
          badgeBg: appTheme.badgeBg,
          badgeText: appTheme.badgeText,
          pillBg: 'text-white font-black',
          pillStyle: { backgroundColor: appTheme.hex },
          pillLabel: 'اطلاعیه',
          progressBg: appTheme.primary,
          glow: appTheme.glowClass,
          dotHex: appTheme.hex,
          defaultTitle: 'اطلاعیه سیستم',
          accentBorder: appTheme.borderColor,
          customHex: appTheme.hex,
        };
    }
  };

  const theme = getTheme();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -30, scale: 0.92, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -20, scale: 0.94, filter: 'blur(3px)', transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={() => onDismiss(toast.id)}
      className={`pointer-events-auto group relative w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border ${theme.border} ${theme.glow} overflow-hidden cursor-pointer select-none transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xl`}
    >
      {/* Top Gradient Sheen line matching Theme Accent */}
      <div 
        className="absolute inset-x-0 top-0 h-[2.5px] opacity-85" 
        style={{ backgroundColor: theme.customHex }} 
      />

      <div className="p-3.5 sm:p-4 flex items-center gap-3">
        {/* Animated Icon Avatar with pulsing indicator */}
        <div className="relative shrink-0">
          <div className={`p-2.5 rounded-2xl border shadow-inner ${theme.badgeBg} ${theme.accentBorder} flex items-center justify-center transition-transform group-hover:scale-105`}>
            {theme.icon}
          </div>
          <span 
            className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" 
            style={{ backgroundColor: theme.dotHex }}
          />
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 pr-0.5">
          <div className="flex items-center gap-2 mb-0.5">
            <h5 className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-white leading-tight truncate">
              {toast.title || theme.defaultTitle}
            </h5>
            <span 
              className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight text-white ${theme.pillBg} shadow-xs`}
              style={theme.pillStyle}
            >
              {theme.pillLabel}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug break-words line-clamp-2">
            {toast.message}
          </p>
        </div>

        {/* Close Button with gentle hover effect */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(toast.id);
          }}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          title="بستن سریع اعلان"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dynamic Linear Auto-Dismiss Progress Bar with smooth transition */}
      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800/90 overflow-hidden">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: isPaused ? undefined : '0%' }}
          transition={{ duration: calculatedDuration / 1000, ease: 'linear' }}
          className={`h-full ${theme.progressBg}`}
        />
      </div>
    </motion.div>
  );
};

// ----------------------------------------------------
// 2. FLOATING TOAST CONTAINER (Positioned Top-Center, Non-blocking)
// ----------------------------------------------------
interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  settings?: StoreSettings;
  themeColor?: ThemeColor;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss, settings, themeColor }) => {
  return (
    <aside 
      aria-label="سامانه اعلان‌های هوشمند" 
      className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[999999] w-full max-w-sm sm:max-w-md px-3 sm:px-4 pointer-events-none flex flex-col items-center gap-2.5 dir-rtl"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard 
            key={toast.id} 
            toast={toast} 
            onDismiss={onDismiss} 
            settings={settings}
            themeColor={themeColor}
          />
        ))}
      </AnimatePresence>
    </aside>
  );
};

// ----------------------------------------------------
// 3. CONFIRMATION MODAL DIALOG (Only for Explicit Confirmations)
// ----------------------------------------------------
interface ConfirmModalProps {
  options: ConfirmModalOptions | null;
  onClose: () => void;
  onConfirm?: () => void;
  settings?: StoreSettings;
  themeColor?: ThemeColor;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  options,
  onClose,
  onConfirm,
  settings,
  themeColor,
}) => {
  if (!options || !options.isOpen) return null;

  const activeThemeKey = themeColor || settings?.themeColor || 'teal';
  const appTheme = themes[activeThemeKey] || themes.teal;

  const {
    title = 'تأیید انجام عملیات',
    message,
    confirmText = 'تأیید',
    cancelText = 'انصراف',
  } = options;

  const handleConfirmAction = () => {
    if (onConfirm) onConfirm();
    if (options.onConfirm) options.onConfirm();
    onClose();
  };

  const handleCloseAction = () => {
    if (options.onClose) options.onClose();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs dir-rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div 
            className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-24 rounded-full blur-3xl pointer-events-none opacity-20" 
            style={{ backgroundColor: appTheme.hex }}
          />

          {/* Header Bar */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              <div 
                className={`p-2.5 rounded-2xl border shadow-xs ${appTheme.badgeBg} ${appTheme.borderColor}`}
              >
                <HelpCircle className="w-6 h-6" style={{ color: appTheme.hex }} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h3>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3" style={{ color: appTheme.hex }} />
                  <span>سامانه مدیریت بازرگانی و انبارداری</span>
                </span>
              </div>
            </div>

            <button
              onClick={handleCloseAction}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="relative z-10 px-6 py-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="relative z-10 flex items-center justify-end gap-2.5 px-6 pb-6 pt-2">
            <button
              type="button"
              onClick={handleCloseAction}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={handleConfirmAction}
              className={`px-6 py-2.5 rounded-xl font-black text-xs text-white shadow-md active:scale-95 transition-all cursor-pointer ${appTheme.primary} ${appTheme.primaryHover} ${appTheme.glowClass}`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ----------------------------------------------------
// 4. BACKWARD-COMPATIBLE CUSTOM NOTIFICATION MODAL
// ----------------------------------------------------
interface CustomNotificationModalProps {
  options: NotificationModalOptions | null;
  onClose: () => void;
  onConfirm?: () => void;
  settings?: StoreSettings;
  themeColor?: ThemeColor;
}

export const CustomNotificationModal: React.FC<CustomNotificationModalProps> = ({
  options,
  onClose,
  onConfirm,
  settings,
  themeColor,
}) => {
  if (!options || !options.isOpen) return null;

  if (options.type === 'confirm') {
    return (
      <ConfirmModal
        options={{
          isOpen: true,
          title: options.title,
          message: options.message,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          onConfirm: options.onConfirm || onConfirm,
          onClose: options.onClose || onClose,
        }}
        onClose={onClose}
        onConfirm={onConfirm}
        settings={settings}
        themeColor={themeColor}
      />
    );
  }

  // Render as floating toast!
  return (
    <div className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-[999999] w-full max-w-sm sm:max-w-md px-3 sm:px-4 pointer-events-none flex flex-col items-center dir-rtl">
      <AnimatePresence>
        <ToastCard
          toast={{
            id: 'modal-toast',
            type: options.type || 'info',
            title: options.title,
            message: options.message,
            duration: options.duration,
          }}
          onDismiss={onClose}
          settings={settings}
          themeColor={themeColor}
        />
      </AnimatePresence>
    </div>
  );
};

