import React, { useState, useEffect, useRef } from 'react';
import { StoreSettings } from '../types';
import { themes } from './ThemeConfig';
import { 
  Fingerprint, 
  KeyRound, 
  ShieldCheck, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Edit3,
  Trash2,
  RefreshCw,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPersianDigits, toEnglishDigits } from '../utils/formatters';
import { authenticateWithWebAuthn } from '../utils/webauthn';

interface SecurityAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
  settings: StoreSettings;
  actionType?: 'edit' | 'delete' | 'access';
  targetName?: string;
}

export const SecurityAuthModal: React.FC<SecurityAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
  settings,
  actionType = 'access',
  targetName,
}) => {
  const currentTheme = themes[settings.themeColor] || themes.teal;
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [activeMode, setActiveMode] = useState<'pin' | 'biometric'>('pin');
  const inputRef = useRef<HTMLInputElement>(null);

  const adminPassword = settings.adminPin || '1234';

  const defaultTitle = 
    title || 
    (actionType === 'delete' 
      ? 'تایید پین‌کد برای حذف' 
      : actionType === 'edit' 
      ? 'تایید پین‌کد برای ویرایش' 
      : 'تایید هویت امنیتی مدیریت');

  const defaultSubtitle = 
    subtitle || 
    (targetName 
      ? `برای انجام این عملیات روی «${targetName}»، لطفاً پین‌کد مدیریت را وارد کنید.`
      : 'برای تایید و انجام این عملیات حساس، لطفاً پین‌کد مدیریت را وارد کنید.');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setIsScanning(false);
      setScanSuccess(false);
      // Default to pin mode for quick entry
      setActiveMode('pin');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Biometric Fingerprint Scan via WebAuthn
  const handleFingerprintScan = async () => {
    if (isScanning || scanSuccess) return;
    setIsScanning(true);
    setErrorMsg('');

    try {
      const res = await authenticateWithWebAuthn(
        settings.brandName || 'سامانه بازرگانی',
        'مدیر ارشد بازرگانی'
      );

      if (res.success) {
        setIsScanning(false);
        setScanSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 300);
      } else {
        setIsScanning(false);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setErrorMsg('تایید اثر انگشت ناموفق بود. لطفاً از پین‌کد مدیریت استفاده کنید.');
        }
      }
    } catch (err: any) {
      setIsScanning(false);
      setErrorMsg('خطا در فراخوانی حسگر اثر انگشت دستگاه.');
    }
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = toEnglishDigits(pin.trim());
    const cleanExpected = toEnglishDigits(adminPassword.trim());

    if (cleanPin && cleanPin === cleanExpected) {
      setScanSuccess(true);
      setErrorMsg('');
      setTimeout(() => {
        onSuccess();
      }, 300);
    } else {
      setErrorMsg('پین‌کد / رمز عبور وارد شده نادرست است.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden text-right"
      >
        {/* Ambient Top Glow */}
        <div 
          className="absolute -top-20 -left-20 w-44 h-44 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: actionType === 'delete' ? '#ef4444' : currentTheme.hex }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3 mb-5">
          <div 
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs shrink-0 ${
              actionType === 'delete' 
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-600' 
                : actionType === 'edit'
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-600'
                : ''
            }`}
            style={{ 
              backgroundColor: actionType === 'access' ? currentTheme.hex + '15' : undefined, 
              borderColor: actionType === 'access' ? currentTheme.hex + '40' : undefined,
              color: actionType === 'access' ? currentTheme.hex : undefined 
            }}
          >
            {actionType === 'delete' ? (
              <Trash2 className="w-6 h-6 text-rose-600" />
            ) : actionType === 'edit' ? (
              <Edit3 className="w-6 h-6 text-amber-600" />
            ) : (
              <ShieldCheck className="w-6 h-6" style={{ color: currentTheme.hex }} />
            )}
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              {defaultTitle}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {defaultSubtitle}
            </p>
          </div>
        </div>

        {/* Mode Selector if Biometrics is enabled */}
        {settings.enableBiometrics !== false && (
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => { setActiveMode('pin'); setErrorMsg(''); setTimeout(() => inputRef.current?.focus(), 50); }}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === 'pin'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" style={{ color: activeMode === 'pin' ? currentTheme.hex : undefined }} />
              <span>پین‌کد مدیریت</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveMode('biometric'); setErrorMsg(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === 'biometric'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Fingerprint className="w-4 h-4" style={{ color: activeMode === 'biometric' ? currentTheme.hex : undefined }} />
              <span>اثر انگشت</span>
            </button>
          </div>
        )}

        {/* PIN Mode */}
        {activeMode === 'pin' && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                پین‌کد یا رمز عبور مدیریت
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="password"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setErrorMsg(''); }}
                  placeholder="وارد کردن پین‌کد..."
                  autoFocus
                  className={`w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border ${
                    errorMsg ? 'border-rose-400 dark:border-rose-800' : 'border-slate-200 dark:border-slate-800'
                  } ${currentTheme.ring} text-slate-900 dark:text-white placeholder-slate-400 text-base font-black text-center tracking-widest focus:outline-none transition-all shadow-inner`}
                />
                <KeyRound className="w-5 h-5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Quick Numpad Helper for Touch Screens */}
            <div className="grid grid-cols-3 gap-2 py-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit, idx) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    const next = pin + digit;
                    setPin(next);
                    setErrorMsg('');
                  }}
                  className={`py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 font-mono font-bold text-sm transition-all active:scale-95 cursor-pointer ${
                    digit === '0' ? 'col-span-3' : ''
                  }`}
                >
                  {toPersianDigits(digit)}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={!pin || scanSuccess}
                className={`flex-1 py-3 rounded-2xl text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  actionType === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : actionType === 'edit'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : `${currentTheme.primary} ${currentTheme.primaryHover}`
                }`}
              >
                {scanSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 animate-bounce" />
                    <span>تایید شد!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>تایید پین و اجرا</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Biometric Mode */}
        {activeMode === 'biometric' && (
          <div className="flex flex-col items-center justify-center py-4 space-y-5 text-center">
            <div className="relative flex items-center justify-center">
              {isScanning && (
                <>
                  <div 
                    className="absolute w-28 h-28 rounded-full animate-ping opacity-25"
                    style={{ backgroundColor: currentTheme.hex }}
                  />
                  <div 
                    className="absolute w-24 h-24 rounded-full animate-pulse opacity-40"
                    style={{ backgroundColor: currentTheme.hex }}
                  />
                </>
              )}

              <button
                type="button"
                onClick={handleFingerprintScan}
                disabled={isScanning || scanSuccess}
                className={`relative z-10 w-24 h-24 rounded-xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer select-none ${
                  scanSuccess
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30'
                    : isScanning
                    ? 'border-transparent text-white shadow-xl scale-105'
                    : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:scale-105 shadow-md'
                }`}
                style={{
                  backgroundColor: isScanning ? currentTheme.hex : undefined,
                  borderColor: isScanning ? currentTheme.hex : undefined,
                }}
              >
                {scanSuccess ? (
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                ) : (
                  <Fingerprint className={`w-12 h-12 transition-transform ${isScanning ? 'animate-pulse scale-110 text-white' : ''}`} style={{ color: !isScanning ? currentTheme.hex : undefined }} />
                )}
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                {scanSuccess 
                  ? '✓ اثر انگشت تایید گردید' 
                  : isScanning 
                  ? 'در حال اسکن اثر انگشت...' 
                  : 'روی سنسور کلیک کرده یا انگشت خود را قرار دهید'}
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs font-bold text-rose-500">{errorMsg}</p>
            )}

            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleFingerprintScan}
                disabled={isScanning || scanSuccess}
                className={`flex-1 py-3 rounded-2xl ${currentTheme.primary} ${currentTheme.primaryHover} text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2`}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>اسکن...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>تایید اثر انگشت</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

