import React, { useState } from 'react';
import { StoreSettings } from '../types';
import { themes } from './ThemeConfig';
import { 
  Fingerprint, 
  KeyRound, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Shield,
  Package,
  Boxes,
  FileText,
  TrendingUp,
  Truck,
  Sparkles,
  ShoppingBag,
  Tag,
  Award,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { toEnglishDigits } from '../utils/formatters';
import { authenticateWithWebAuthn } from '../utils/webauthn';

interface LoginScreenProps {
  settings: StoreSettings;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  isDarkMode = true,
  onToggleDarkMode,
  onLoginSuccess,
}) => {
  const currentTheme = themes[settings.themeColor] || themes.teal;
  const enableBiometrics = settings.enableBiometrics !== false;
  const [authMode, setAuthMode] = useState<'biometric' | 'pin'>(enableBiometrics ? 'biometric' : 'pin');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const adminPassword = settings.adminPin || '1234';

  const handleFingerprintLogin = async () => {
    if (isScanning || scanSuccess) return;
    setIsScanning(true);
    setErrorMessage('');

    try {
      const res = await authenticateWithWebAuthn(
        settings.brandName || 'سامانه بازرگانی',
        'مدیر ارشد بازرگانی'
      );

      if (res.success) {
        setIsScanning(false);
        setScanSuccess(true);
        setTimeout(() => {
          onLoginSuccess();
        }, 600);
      } else {
        setIsScanning(false);
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          setErrorMessage('تایید اثر انگشت انجام نشد. لطفاً مجدداً تلاش کرده یا با پین‌کد وارد شوید.');
        }
      }
    } catch (err: any) {
      setIsScanning(false);
      setErrorMessage('خطا در ارتباط با حسگر اثر انگشت لپ‌تاپ/دستگاه.');
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = toEnglishDigits(pin);
    const cleanExpected = toEnglishDigits(adminPassword);

    if (cleanPin && cleanPin === cleanExpected) {
      setScanSuccess(true);
      setErrorMessage('');
      setTimeout(() => {
        onLoginSuccess();
      }, 500);
    } else {
      setErrorMessage('رمز عبور / پین‌کد وارد شده نادرست است.');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none transition-colors duration-300">
      {/* Dynamic Wholesale & Trade Business Background Animation Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* Animated Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] transition-opacity"
          style={{
            backgroundImage: `radial-gradient(${currentTheme.hex} 1.5px, transparent 1.5px), radial-gradient(${currentTheme.hex} 1.5px, transparent 1.5px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />

        {/* Ambient Pulsing Aura Lights */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1], 
            opacity: [0.18, 0.32, 0.18] 
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full blur-[150px]"
          style={{ backgroundColor: currentTheme.hex }}
        />

        <motion.div 
          animate={{ 
            scale: [1, 1.25, 1], 
            opacity: [0.12, 0.22, 0.12] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-16 -right-16 w-[520px] h-[520px] rounded-full blur-[140px] bg-blue-600/40 dark:bg-blue-600/30"
        />

        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1], 
            opacity: [0.08, 0.18, 0.08] 
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute -top-16 -left-16 w-[480px] h-[480px] rounded-full blur-[130px] bg-amber-500/30 dark:bg-amber-500/20"
        />

        {/* Floating Wholesale & Commerce Badges */}
        {/* Top Right Card */}
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 1.5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden lg:flex absolute top-12 right-12 items-center gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/90 dark:border-slate-800/80 shadow-2xl shadow-slate-200/50 dark:shadow-black/50"
        >
          <div className="p-2.5 rounded-xl text-white shadow-md flex items-center justify-center" style={{ backgroundColor: currentTheme.hex }}>
            <Boxes className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-slate-900 dark:text-white">مدیریت انبار و کارتن‌ها</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">پایش لحظه‌ای موجودی و بسته‌ها</div>
          </div>
        </motion.div>

        {/* Top Left Card */}
        <motion.div
          animate={{ y: [0, -18, 0], rotate: [0, -2, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="hidden lg:flex absolute top-16 left-12 items-center gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/90 dark:border-slate-800/80 shadow-2xl shadow-slate-200/50 dark:shadow-black/50"
        >
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-slate-900 dark:text-white">صدور هوشمند فاکتور رسمی</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">محاسبه دقیق کارتنی، بسته‌ای و عددی</div>
          </div>
        </motion.div>

        {/* Bottom Left Card */}
        <motion.div
          animate={{ y: [0, 16, 0], rotate: [0, 1.5, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="hidden lg:flex absolute bottom-14 left-16 items-center gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/90 dark:border-slate-800/80 shadow-2xl shadow-slate-200/50 dark:shadow-black/50"
        >
          <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-md flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-slate-900 dark:text-white">حالت محرمانه سود تجاری</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">حفاظت از سود ناخالص پیش مشتری</div>
          </div>
        </motion.div>

        {/* Bottom Right Card */}
        <motion.div
          animate={{ y: [0, 14, 0], rotate: [0, -1.5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="hidden lg:flex absolute bottom-16 right-16 items-center gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/90 dark:border-slate-800/80 shadow-2xl shadow-slate-200/50 dark:shadow-black/50"
        >
          <div className="p-2.5 rounded-xl bg-blue-500 text-white shadow-md flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div className="text-right">
            <div className="text-xs font-black text-slate-900 dark:text-white">شبکه پخش و باربری</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">توزیع مویرگی به تمام استان‌ها</div>
          </div>
        </motion.div>

        {/* Floating Animated Business Particles & Icons */}
        {[
          { Icon: Package, top: '18%', left: '26%', size: 'w-6 h-6', delay: 0, duration: 5, color: 'text-amber-500' },
          { Icon: Sparkles, top: '78%', left: '32%', size: 'w-5 h-5', delay: 1, duration: 6, color: 'text-emerald-400' },
          { Icon: ShoppingBag, top: '22%', right: '25%', size: 'w-6 h-6', delay: 2, duration: 7, color: 'text-blue-500' },
          { Icon: Tag, top: '82%', right: '28%', size: 'w-5 h-5', delay: 1.5, duration: 5.5, color: 'text-purple-400' },
          { Icon: Award, top: '68%', left: '10%', size: 'w-6 h-6', delay: 3, duration: 8, color: 'text-rose-400' },
          { Icon: BarChart3, top: '42%', right: '10%', size: 'w-7 h-7', delay: 0.5, duration: 6.5, color: 'text-cyan-400' }
        ].map((item, index) => {
          const IconComp = item.Icon;
          return (
            <motion.div
              key={index}
              style={{ top: item.top, left: item.left, right: item.right }}
              animate={{
                y: [0, -22, 0],
                opacity: [0.35, 0.75, 0.35],
                scale: [0.95, 1.15, 0.95],
              }}
              transition={{
                duration: item.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: item.delay,
              }}
              className={`absolute p-2.5 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-white/60 dark:border-slate-800/60 shadow-lg ${item.color}`}
            >
              <IconComp className={item.size} />
            </motion.div>
          );
        })}
      </div>

      {/* Day / Night Mode Quick Switcher Top Bar */}
      {onToggleDarkMode && (
        <div className="absolute top-5 left-5 z-20">
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="p-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-md hover:scale-105 transition-all flex items-center gap-2 text-xs font-bold cursor-pointer"
            title={isDarkMode ? 'تغییر به حالت روز (روشن)' : 'تغییر به حالت شب (تاریک)'}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">حالت روز</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">حالت شب</span>
              </>
            )}
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 w-full max-w-md bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-300/60 dark:shadow-black/60 text-right space-y-6 transition-colors"
      >
        {/* Brand Logo & Header */}
        <div className="text-center space-y-3">
          <div 
            className="w-16 h-16 mx-auto rounded-3xl flex items-center justify-center border shadow-xl shadow-slate-200/80 dark:shadow-black/40 transition-transform hover:scale-105"
            style={{ 
              backgroundColor: currentTheme.hex + (isDarkMode ? '20' : '15'), 
              borderColor: currentTheme.hex + (isDarkMode ? '50' : '30'),
              color: currentTheme.hex 
            }}
          >
            <Building2 className="w-8 h-8" style={{ color: currentTheme.hex }} />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
              <span>{settings.brandName || 'سامانه جامع بازرگانی'}</span>
              <span 
                className="text-[10px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-xs"
                style={{ backgroundColor: currentTheme.hex }}
              >
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              ورود امن به پنل مدیریت، صدور فاکتور و کنترل هوشمند انبار
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        {enableBiometrics && (
          <div className="flex items-center p-1.5 bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200/90 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => { setAuthMode('biometric'); setErrorMessage(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'biometric'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700/80'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Fingerprint className="w-4 h-4" style={{ color: authMode === 'biometric' ? currentTheme.hex : undefined }} />
              <span>اثر انگشت بیومتریک</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('pin'); setErrorMessage(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'pin'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700/80'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" style={{ color: authMode === 'pin' ? currentTheme.hex : undefined }} />
              <span>رمز عبور / پین‌کد</span>
            </button>
          </div>
        )}

        {/* Biometric Touch Scanner */}
        {authMode === 'biometric' && enableBiometrics && (
          <div className="py-4 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="relative flex items-center justify-center">
              {/* Radar pulse rings */}
              {isScanning && (
                <>
                  <div 
                    className="absolute w-36 h-36 rounded-full animate-ping opacity-25"
                    style={{ backgroundColor: currentTheme.hex }}
                  />
                  <div 
                    className="absolute w-28 h-28 rounded-full animate-pulse opacity-40"
                    style={{ backgroundColor: currentTheme.hex }}
                  />
                </>
              )}

              <button
                type="button"
                onClick={handleFingerprintLogin}
                disabled={isScanning || scanSuccess}
                className={`relative z-10 w-28 h-28 rounded-3xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer select-none group shadow-2xl ${
                  scanSuccess
                    ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/40'
                    : isScanning
                    ? 'border-transparent text-white scale-105 shadow-xl'
                    : 'bg-slate-50 dark:bg-slate-950/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600 hover:scale-105'
                }`}
                style={{
                  backgroundColor: isScanning ? currentTheme.hex : undefined,
                  borderColor: isScanning ? currentTheme.hex : undefined,
                }}
              >
                {scanSuccess ? (
                  <CheckCircle2 className="w-12 h-12 animate-bounce" />
                ) : (
                  <Fingerprint 
                    className={`w-14 h-14 transition-transform ${isScanning ? 'animate-pulse scale-110 text-white' : 'group-hover:scale-110'}`} 
                    style={{ color: !isScanning ? currentTheme.hex : undefined }} 
                  />
                )}
              </button>
            </div>

            <div className="space-y-1">
              <div className="font-black text-sm text-slate-900 dark:text-white">
                {scanSuccess ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    احراز هویت موفقیت‌آمیز بود
                  </span>
                ) : isScanning ? (
                  <span className="text-cyan-600 dark:text-cyan-300 flex items-center justify-center gap-1.5 font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    در حال خواندن و تایید اثر انگشت...
                  </span>
                ) : (
                  'انگشت خود را روی سنسور قرار دهید'
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                سنسور بیومتریک با تایید هویت امن و آنی
              </p>
            </div>

            <button
              type="button"
              onClick={handleFingerprintLogin}
              disabled={isScanning || scanSuccess}
              className={`w-full py-3.5 rounded-2xl text-white font-black text-xs shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${currentTheme.primary} ${currentTheme.primaryHover}`}
            >
              <Fingerprint className="w-4 h-4" />
              <span>لمس سنسور و ورود به برنامه</span>
            </button>
          </div>
        )}

        {/* PIN Code Screen */}
        {(authMode === 'pin' || !enableBiometrics) && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                رمز عبور / پین‌کد ورود به سامانه
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="پین‌کد یا رمز عبور را وارد نمایید..."
                  autoFocus
                  className={`w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-bold text-center tracking-widest focus:outline-none transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            <button
              type="submit"
              className={`w-full py-3.5 rounded-2xl text-white font-black text-xs shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${currentTheme.primary} ${currentTheme.primaryHover}`}
            >
              <Unlock className="w-4 h-4" />
              <span>تایید و ورود به سیستم</span>
            </button>
          </form>
        )}

        {/* Security Badge Footer (No Demo bypass) */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
          <span className="text-[11px] flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>حفاظت امنیتی با رمزنگاری اختصاصی</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
};

