import React, { useState } from 'react';
import { Product, Invoice, Customer, CustomerPayment, StoreSettings, AppDesignMode, AppFontSizeScale } from '../types';
import { ThemeColor, themes, designModes } from './ThemeConfig';
import { 
  fontFamilies, 
  appFontSizes, 
  invoiceFontSizes, 
  applyTypographyToDOM 
} from './TypographyConfig';
import { toPersianDigits, formatPrice } from '../utils/formatters';
import { 
  Settings, 
  Palette, 
  Building2, 
  CreditCard, 
  FileCheck, 
  Save, 
  RotateCcw,
  Sparkles, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  MapPin, 
  Lock, 
  Fingerprint, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Clock, 
  Trash2, 
  Upload, 
  Image as ImageIcon,
  Stamp,
  FileText,
  Sliders,
  Shield,
  Layers,
  Phone,
  Copy,
  Info,
  Crown,
  Shapes,
  Cpu,
  FileSpreadsheet,
  Gem,
  Feather,
  Wand2,
  Type,
  CaseSensitive,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsPageProps {
  settings: StoreSettings;
  products?: Product[];
  invoices?: Invoice[];
  customers?: Customer[];
  payments?: CustomerPayment[];
  onSaveSettings: (settings: StoreSettings) => void;
  onExportData?: () => void;
  onImportData?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetToDefault?: () => void;
  onRestoreSnapshot?: (snapshotData: any) => void;
  runWithSecurityCheck?: (
    title: string,
    subtitle: string,
    actionType?: 'edit' | 'delete',
    onSuccess?: () => void
  ) => void;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
  onShowConfirm?: (message: string, onConfirm: () => void, title?: string, confirmText?: string) => void;
  mode?: 'business' | 'system';
}

type SettingsTab = 'theme' | 'typography' | 'security' | 'brand' | 'invoice' | 'bank';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSaveSettings,
  onResetToDefault,
  runWithSecurityCheck,
  onShowAlert,
  onShowConfirm,
  mode = 'business',
}) => {
  const [formData, setFormData] = useState<StoreSettings>({ 
    ...settings,
    adminPin: settings.adminPin || '1234',
    enableBiometrics: settings.enableBiometrics !== false,
    requireAuthForInvoiceActions: settings.requireAuthForInvoiceActions !== false,
    requirePinForEdit: settings.requirePinForEdit !== false,
    requirePinForDelete: settings.requirePinForDelete !== false,
    hideConfidentialPrices: settings.hideConfidentialPrices !== false,
    showStamp: settings.showStamp !== false,
    stampText: settings.stampText || 'مهر رسمی بازرگانی - ثبت و تایید شد',
    stampColor: settings.stampColor || 'blue',
    stampShape: settings.stampShape || 'circle',
    watermarkOpacity: settings.watermarkOpacity !== undefined ? settings.watermarkOpacity : 0.08,
    watermarkFontSize: settings.watermarkFontSize || 48,
    enableWatermark: settings.enableWatermark !== false,
    watermarkText: settings.watermarkText || settings.brandName || 'بازرگانی رسمی',
    showSignatureArea: settings.showSignatureArea !== false,
    fontFamily: settings.fontFamily || 'vazirmatn',
    numberFormat: settings.numberFormat || 'persian',
    fontSizeScale: settings.fontSizeScale || 'standard',
    customFontScalePercent: settings.customFontScalePercent || 100,
    invoiceFontSizeScale: settings.invoiceFontSizeScale || 'standard',
  });

  const [activeTab, setActiveTab] = useState<SettingsTab>(mode === 'system' ? 'theme' : 'brand');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  const currentTheme = themes[formData.themeColor] || themes.black;

  const updateTypography = (updates: Partial<StoreSettings>) => {
    const updated = { ...formData, ...updates };
    setFormData(updated);
    applyTypographyToDOM(updated);
    onSaveSettings(updated);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    applyTypographyToDOM(formData);
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2400);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        onShowAlert?.('حجم فایل انتخابی نباید بیشتر از ۲ مگابایت باشد.', 'warning', 'حجم غیرمجاز تصویر');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const updated = { ...formData, appLogo: base64 };
        setFormData(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const solidThemeKeys: ThemeColor[] = [
    'black',
    'navy',
    'blue',
    'indigo',
    'cyan',
    'teal',
    'emerald',
    'lime',
    'amber',
    'orange',
    'rose',
    'ruby',
    'violet',
    'fuchsia',
  ];

  const gradientThemeKeys: ThemeColor[] = [
    'gradient-royal',
    'vip-royal-obsidian',
    'vip-royal-sapphire',
    'vip-royal-emerald',
    'vip-royal-amethyst',
    'vip-royal-ruby',
    'vip-royal-gold',
    'vip-royal-titanium',
    'gradient-emerald-gold',
    'gradient-titanium',
    'gradient-crimson-dusk',
    'gradient-midnight-cyan',
    'gradient-nordic-frost',
    'gradient-sunset',
    'gradient-ocean',
    'gradient-cyber',
    'gradient-aurora',
  ];

  const allThemeKeys: ThemeColor[] = [...solidThemeKeys, ...gradientThemeKeys];

  const copyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedBankField(field);
    setTimeout(() => setCopiedBankField(null), 1800);
  };

  const formatCardNumberSpaced = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    const matches = cleaned.match(/.{1,4}/g);
    return matches ? matches.join('  ') : val;
  };

  return (
    <div className="w-full space-y-6 pb-20 no-print transition-colors text-right font-sans">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs"
            style={{ 
              backgroundColor: currentTheme.hex + '15', 
              borderColor: currentTheme.hex + '40',
              color: currentTheme.hex 
            }}
          >
            <Settings className="w-6 h-6" style={{ color: currentTheme.hex }} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {mode === 'business' ? 'تنظیمات کسب‌وکار و سربرگ تجاری' : 'تنظیمات سیستمی، امنیتی و پالت رنگی'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'business' 
                ? 'مدیریت آیکون و برند، اطلاعات سربرگ فاکتور، مشخصات بانکی و سفارشی‌سازی چاپ و مهر' 
                : 'انتخاب از میان ۸ پالت رنگی مدرن و پیکربندی پین‌کد ورود و سطوح امنیتی سامانه'}
            </p>
          </div>
        </div>

        <button
          onClick={() => handleSave()}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl ${currentTheme.primary} ${currentTheme.primaryHover} text-white font-black text-xs shadow-md transition-all cursor-pointer`}
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>ذخیره شد!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>ذخیره تغییرات</span>
            </>
          )}
        </button>
      </div>

      {/* Success Notification Alert */}
      <AnimatePresence>
        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-4 rounded-2xl ${currentTheme.badgeBg} border ${currentTheme.borderColor} ${currentTheme.badgeText} text-xs font-black flex items-center justify-between shadow-sm`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: currentTheme.hex }} />
              <span>تنظیمات با موفقیت ذخیره و در سرتاسر سامانه اعمال گردیدند.</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: currentTheme.hex }}>همگام‌سازی بلادرنگ</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Tabs Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm space-y-1.5">
            {mode === 'system' && (
              <>
                <button
                  onClick={() => setActiveTab('theme')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'theme'
                      ? `${currentTheme.primaryLight} ${currentTheme.primaryText} font-black border ${currentTheme.borderColor} shadow-xs`
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Palette className="w-4 h-4" style={{ color: activeTab === 'theme' ? currentTheme.hex : undefined }} />
                  <div className="flex flex-col text-right">
                    <span>سبک طراحی و پالت رنگی</span>
                    <span className="text-[10px] text-slate-400 font-normal">۸ حالت طراحی و پالت‌های رنگی</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('typography')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'typography'
                      ? `${currentTheme.primaryLight} ${currentTheme.primaryText} font-black border ${currentTheme.borderColor} shadow-xs`
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Type className="w-4 h-4" style={{ color: activeTab === 'typography' ? currentTheme.hex : undefined }} />
                  <div className="flex flex-col text-right">
                    <span>تایپوگرافی و سایز فونت</span>
                    <span className="text-[10px] text-slate-400 font-normal">۶ فونت، تفکیک ارقام و سایزبندی</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'security'
                      ? `${currentTheme.primaryLight} ${currentTheme.primaryText} font-black border ${currentTheme.borderColor} shadow-xs`
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" style={{ color: activeTab === 'security' ? currentTheme.hex : undefined }} />
                  <div className="flex flex-col text-right">
                    <span>امنیت، اثر انگشت و پین‌کد</span>
                    <span className="text-[10px] text-slate-400 font-normal">سطوح دسترسی و محافظت</span>
                  </div>
                </button>
              </>
            )}

            {mode === 'business' && (
              <>
                <button
                  onClick={() => setActiveTab('brand')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'brand'
                      ? `${currentTheme.primaryLight} ${currentTheme.primaryText} font-black border ${currentTheme.borderColor} shadow-xs`
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Building2 className="w-4 h-4" style={{ color: activeTab === 'brand' ? currentTheme.hex : undefined }} />
                  <div className="flex flex-col text-right">
                    <span>مشخصات کسب‌وکار و لوگو</span>
                    <span className="text-[10px] text-slate-400 font-normal">سربرگ، آیکون و هویت برند</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('typography')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'typography'
                      ? `${currentTheme.primaryLight} ${currentTheme.primaryText} font-black border ${currentTheme.borderColor} shadow-xs`
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Type className="w-4 h-4" style={{ color: activeTab === 'typography' ? currentTheme.hex : undefined }} />
                  <div className="flex flex-col text-right">
                    <span>فونت و اندازه قلم فاکتور</span>
                    <span className="text-[10px] text-slate-400 font-normal">فونت متن، ارقام و سایز چاپ</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('invoice')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'invoice'
                      ? `${currentTheme.primaryLight} ${currentTheme.primaryText} font-black border ${currentTheme.borderColor} shadow-xs`
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <FileCheck className="w-4 h-4" style={{ color: activeTab === 'invoice' ? currentTheme.hex : undefined }} />
                  <div className="flex flex-col text-right">
                    <span>تنظیمات چاپ، واترمارک و مهر</span>
                    <span className="text-[10px] text-slate-400 font-normal">امضا، مهر رسمی و پس‌زمینه</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('bank')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'bank'
                      ? `${currentTheme.primaryLight} ${currentTheme.primaryText} font-black border ${currentTheme.borderColor} shadow-xs`
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <CreditCard className="w-4 h-4" style={{ color: activeTab === 'bank' ? currentTheme.hex : undefined }} />
                  <div className="flex flex-col text-right">
                    <span>حساب‌ها و کارت‌های واریز</span>
                    <span className="text-[10px] text-slate-400 font-normal">کارت بانکی، شبا و حساب</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-9">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm">
            
            {/* 1. THEME & DESIGN SYSTEMS TAB */}
            {activeTab === 'theme' && (
              <div className="space-y-10">
                {/* SECTION 1: 8 DESIGN MODES & ARCHITECTURAL STYLES */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        انتخاب سبک و معماری طراحی برنامه (۸ حالت حرفه‌ای و متمایز)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        سبک ظاهری، کادربندی‌ها، زاویه گوشه‌ها، سایه‌ها، عمق دیداری و فضای کلی برنامه را با یک کلیک تغییر دهید.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      حالت فعال: {designModes[formData.designMode || 'modern']?.nameFa || 'مدرن هوشمند'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        id: 'classic' as AppDesignMode,
                        nameFa: '۱. کلاسیک اداری و دفتری سنتی',
                        subtitleFa: 'سبک دفاتر حسابداری و فاکتورهای رسمی',
                        descFa: 'لبه‌های تیز، کادربندی‌های مشخص، حداکثر تراکم اطلاعات و خوانایی سنتی بدون افکت‌های مات‌کننده.',
                        badge: 'سنتی و دفتری',
                        icon: FileSpreadsheet,
                        previewBg: 'bg-slate-100 dark:bg-slate-800 border-slate-400',
                        accent: '#475569',
                      },
                      {
                        id: 'modern' as AppDesignMode,
                        nameFa: '۲. مدرن هوشمند و فین‌تک',
                        subtitleFa: 'نسل جدید سیستم‌های ابری پیشرفته',
                        descFa: 'گوشه‌های ارگونومیک (rounded-2xl)، سایه‌روشن‌های لایه‌ای نرم، بالانس بصری عالی و راحتی چشم.',
                        badge: 'پیش‌فرض و استاندارد',
                        icon: Sparkles,
                        previewBg: 'bg-gradient-to-br from-sky-50 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-sky-300 dark:border-sky-700',
                        accent: '#0ea5e9',
                      },
                      {
                        id: 'glassmorphism' as AppDesignMode,
                        nameFa: '۳. گلس‌مورفیک کریستال شیشه‌ای',
                        subtitleFa: 'افکت شیشه کریستالی مات و لایه‌های ژرف',
                        descFa: 'شفافیت مات شیشه‌ای فوق مدرن با بازتاب نور بلورین، حاشیه‌های کریستالی روشن و حس معلق بودن.',
                        badge: 'شیشه‌ای لوکس',
                        icon: Gem,
                        previewBg: 'bg-gradient-to-br from-purple-100/60 to-indigo-100/60 dark:from-purple-950/60 dark:to-slate-900/80 border-purple-300 dark:border-purple-600',
                        accent: '#8b5cf6',
                      },
                      {
                        id: 'luxury-gold' as AppDesignMode,
                        nameFa: '۴. لوکس ابسیدین و زرین شاهانه',
                        subtitleFa: 'خزانه‌داری VIP، سنگ گرانیت و طلای کهربایی',
                        descFa: 'ترکیب اعجاب‌انگیز سطوح عمیق ابسیدین و گرانیت با تریم‌های ورق طلای مات و نوارهای متالیک.',
                        badge: 'VIP و اعیانی',
                        icon: Crown,
                        previewBg: 'bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border-amber-500/50 text-amber-200',
                        accent: '#d4af37',
                      },
                      {
                        id: 'neobrutalism' as AppDesignMode,
                        nameFa: '۵. نئوبروتالیسم نرم گرافیکی',
                        subtitleFa: 'کادرهای ضخیم مشکی و سایه‌های تخت فلت',
                        descFa: 'هویت بصری جسورانه، کادرهای ۲ پیکسلی مشخص، سایه‌های تخت پرکنتراست و حس فیزیکی کلیکی.',
                        badge: 'شارپ و زنده',
                        icon: Shapes,
                        previewBg: 'bg-amber-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-200 shadow-[3px_3px_0px_0px_#0f172a] dark:shadow-[3px_3px_0px_0px_#f1f5f9]',
                        accent: '#f43f5e',
                      },
                      {
                        id: 'cyber-tech' as AppDesignMode,
                        nameFa: '۶. سایبرتک نئون و دیجیتال',
                        subtitleFa: 'کابین مدیریت دیجیتال و هاله نورانی های‌تک',
                        descFa: 'سطوح تیره، خطوط باریک فیروزه‌ای و سیان نئون، حسگرهای نوری فعال و اتمسفر مانیتورینگ بلادرنگ.',
                        badge: 'اتاق فرمان دیجیتال',
                        icon: Cpu,
                        previewBg: 'bg-gradient-to-br from-cyan-950/40 to-slate-950 border-cyan-500/50 text-cyan-300',
                        accent: '#06b6d4',
                      },
                      {
                        id: 'minimal-nordic' as AppDesignMode,
                        nameFa: '۷. مینیمال نوردیک اسکاندیناوی',
                        subtitleFa: 'سادگی خالص، خطوط باریک و آرامش دیداری',
                        descFa: 'بدون سایه‌های سنگین، کادرهای باریک و سبک، بیشترین فضای تنفس دیداری و فونت‌های شارپ آرامش‌بخش.',
                        badge: 'خلوت و آرامش‌بخش',
                        icon: Feather,
                        previewBg: 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700',
                        accent: '#64748b',
                      },
                      {
                        id: 'aurora-sunset' as AppDesignMode,
                        nameFa: '۸. گرادیان شفق قطبی زنده',
                        subtitleFa: 'مش گرادیان‌های شناور و شفق‌های آسمانی',
                        descFa: 'هاله‌های داینامیک رنگین‌کمانی و غروب طلایی در پس‌زمینه، مرزهای لطیف گرمابخش و انرژی‌بخش.',
                        badge: 'پویا و رنگین‌کمانی',
                        icon: Wand2,
                        previewBg: 'bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 border-rose-400 dark:border-rose-600',
                        accent: '#f59e0b',
                      },
                    ].map((modeItem, mIdx) => {
                      const isSelected = (formData.designMode || 'modern') === modeItem.id;
                      const IconComp = modeItem.icon;

                      return (
                        <div
                          key={`page-mode-${modeItem.id}-${mIdx}`}
                          onClick={() => {
                            const updated = { ...formData, designMode: modeItem.id };
                            setFormData(updated);
                            onSaveSettings(updated);
                            if (onShowAlert) {
                              onShowAlert(`سبک طراحی برنامه به «${modeItem.nameFa}» تغییر یافت.`, 'success', 'تغییر سبک برنامه');
                            }
                          }}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative group ${
                            isSelected
                              ? 'border-sky-500 ring-4 ring-sky-500/20 shadow-lg bg-sky-50/40 dark:bg-sky-950/20'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950'
                          }`}
                        >
                          <div>
                            {/* Card Top: Icon, Badge & Radio Check */}
                            <div className="flex items-center justify-between gap-1.5 mb-2.5">
                              <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-7 h-7 rounded-xl flex items-center justify-center shadow-xs"
                                  style={{ backgroundColor: modeItem.accent + '25', color: modeItem.accent }}
                                >
                                  <IconComp className="w-3.5 h-3.5" />
                                </div>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  {modeItem.badge}
                                </span>
                              </div>

                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-sky-500 border-sky-500 text-white' : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>

                            <h4 className="font-black text-xs text-slate-900 dark:text-white leading-tight">
                              {modeItem.nameFa}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                              {modeItem.subtitleFa}
                            </p>

                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed mt-2 line-clamp-2">
                              {modeItem.descFa}
                            </p>
                          </div>

                          {/* Mini Live Preview Box */}
                          <div className={`mt-3 p-2 rounded-xl border text-[9px] ${modeItem.previewBg}`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold">پیش‌نمایش:</span>
                              <div className="h-4 px-1.5 rounded flex items-center justify-center font-bold text-[8px] bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                                تایید
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                {/* SECTION 2: 18 SLEEK NAMELESS COLOR SWATCHES & MULTI-COLOR GRADIENTS (AUTO-SAVED) */}
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Palette className="w-5 h-5" style={{ color: currentTheme.hex }} />
                        پالت رنگی سامانه (انتخاب مستقیم رنگ بدون نام — ذخیره خودکار)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        رنگ دلخواه خود را مستقیماً با کلیک انتخاب کنید؛ بلافاصله در تمام دکمه‌ها، سربرگ‌ها، جدول‌ها و کارت‌ها اعمال و ذخیره می‌شود.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[11px] text-slate-400 font-bold">رنگ فعال:</span>
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 shadow-md flex items-center justify-center text-white"
                        style={{ background: currentTheme.hex }}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>
                  </div>

                  {/* 1. SOLID DISTINCT COLORS (14 DISTINCT COLORS) */}
                  <div className="bg-slate-50/80 dark:bg-slate-950/60 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                        طیف رنگ‌های خالص و تفکیک‌شده (۱۴ رنگ)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        برای انتخاب کلیک کنید (ذخیره آنی)
                      </span>
                    </div>

                    <div className="grid grid-cols-7 sm:grid-cols-14 gap-2.5 sm:gap-3">
                      {solidThemeKeys.map((key, kIdx) => {
                        const th = themes[key];
                        const isSelected = formData.themeColor === key;

                        return (
                          <motion.button
                            key={`page-solid-${key}-${kIdx}`}
                            type="button"
                            whileHover={{ scale: 1.15, y: -2 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => {
                              const updated = { ...formData, themeColor: key };
                              setFormData(updated);
                              onSaveSettings(updated);
                              if (onShowAlert) {
                                onShowAlert(`پالت رنگی سامانه به «${th.nameFa}» به‌روزرسانی شد.`, 'success', 'ذخیره خودکار رنگ');
                              }
                            }}
                            title={`${th.nameFa}: ${th.descFa}`}
                            className={`group relative aspect-square rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                              isSelected
                                ? 'ring-4 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-slate-900 scale-105 shadow-lg z-10'
                                : 'hover:shadow-md hover:ring-2 hover:ring-slate-400/50'
                            }`}
                            style={{
                              backgroundColor: th.hex,
                            }}
                          >
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-5 h-5 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-xs"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                              </motion.div>
                            )}
                            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10 dark:ring-white/15 pointer-events-none" />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. SPECIAL GRADIENT THEME PALETTES (10 RICH PALETTES) */}
                  <div className="bg-slate-50/80 dark:bg-slate-950/60 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        پالت‌های ویژه و گرادیان ترکیبی (۱۰ تم لوکس تجاری)
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        گرادیان‌های مدرن فین‌تک
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {gradientThemeKeys.map((key, kIdx) => {
                        const th = themes[key];
                        const isSelected = formData.themeColor === key;

                        return (
                          <motion.button
                            key={`page-grad-${key}-${kIdx}`}
                            type="button"
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              const updated = { ...formData, themeColor: key };
                              setFormData(updated);
                              onSaveSettings(updated);
                              if (onShowAlert) {
                                onShowAlert(`پالت رنگی به «${th.nameFa}» به‌روزرسانی شد.`, 'success', 'ذخیره خودکار رنگ');
                              }
                            }}
                            title={`${th.nameFa}: ${th.descFa}`}
                            className={`group relative h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden shadow-sm p-2 text-white ${
                              isSelected
                                ? 'ring-4 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-slate-900 shadow-xl z-10'
                                : 'hover:shadow-lg hover:ring-2 hover:ring-slate-400/40'
                            }`}
                            style={{
                              background: `linear-gradient(135deg, ${th.hex}, ${th.secondaryHex || th.hex})`,
                            }}
                          >
                            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/20 pointer-events-none" />
                            
                            {isSelected ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-2.5 py-1 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white text-[11px] font-black flex items-center gap-1 shadow-md z-10 backdrop-blur-xs"
                              >
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>فعال</span>
                              </motion.div>
                            ) : (
                              <div className="flex flex-col items-center gap-0.5 z-10 text-center">
                                <span className="text-[11px] font-black drop-shadow-xs truncate max-w-full px-1">{th.nameFa.split(' ')[0]}</span>
                                <div className="w-2.5 h-2.5 rounded-full bg-white/50 group-hover:bg-white/80 transition-all shadow-2xs" />
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. TYPOGRAPHY, FONTS & SIZES TAB */}
            {activeTab === 'typography' && (
              <div className="space-y-10">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Type className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      مرکز تخصصی تایپوگرافی، فونت‌های رسمی و سایزبندی سامانه
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      انتخاب از بین پرمخاطب‌ترین و استانداردترین قلم‌های رسمی وب فارسی به همراه سایزبندی متناسب و ارگونومیک
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateTypography({
                          fontFamily: 'vazirmatn',
                          fontSizeScale: 'standard',
                          customFontScalePercent: 100,
                          invoiceFontSizeScale: 'standard',
                          numberFormat: 'persian'
                        });
                        if (onShowAlert) {
                          onShowAlert('قلم و سایزبندی به حالت استاندارد رسمی بازنشانی شد.', 'info', 'تنظیمات اولیه');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                      title="بازگشت به مقادیر پیش‌فرض استاندارد"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>پیش‌فرض استاندارد</span>
                    </button>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>اعمال آنی و سراسری</span>
                    </div>
                  </div>
                </div>

                {/* Status Badges Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block mb-1">فونت فعال سامانه:</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate block" style={{ fontFamily: fontFamilies[formData.fontFamily || 'vazirmatn']?.cssFamily }}>
                      {fontFamilies[formData.fontFamily || 'vazirmatn']?.nameFa}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block mb-1">مقیاس فونت برنامه:</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      {appFontSizes[formData.fontSizeScale || 'standard']?.nameFa} ({formData.customFontScalePercent || appFontSizes[formData.fontSizeScale || 'standard']?.percentage}٪)
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block mb-1">تراکم چاپ فاکتور:</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      {invoiceFontSizes[formData.invoiceFontSizeScale || 'standard']?.nameFa}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <span className="text-[10px] text-slate-400 block mb-1">فرمت ارقام و اعداد:</span>
                    <span className="text-xs font-black text-slate-900 dark:text-white block">
                      {formData.numberFormat === 'latin' ? 'اعداد لاتین (123)' : 'اعداد فارسی (۱۲۳)'}
                    </span>
                  </div>
                </div>

                {/* LIVE INTERACTIVE PREVIEW CARD */}
                <div className="p-5 sm:p-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        پیش‌نمایش زنده و واقعی با قلم «{fontFamilies[formData.fontFamily || 'vazirmatn']?.nameFa}»
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      طراحی هماهنگ تیترها، جداول حسابداری، اعداد و نمادهای مالی
                    </span>
                  </div>

                  {/* Real Document Preview Card */}
                  <div 
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-all"
                    style={{
                      fontFamily: fontFamilies[formData.fontFamily || 'vazirmatn']?.cssFamily,
                    }}
                  >
                    {/* Header Row */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            {formData.brandName || 'بازرگانی مرکزی رضایی'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${currentTheme.badgeBg} ${currentTheme.badgeText}`}>
                            فاکتور رسمی فروش
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                          توزیع و پخش سراسری کالا • انبار مرکزی شماره ۱
                        </span>
                      </div>

                      <div className="text-left text-xs space-y-1">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-slate-400 text-[11px]">شماره سند:</span>
                          <span className="font-black text-slate-900 dark:text-white">
                            {formData.numberFormat === 'latin' ? 'INV-1048' : toPersianDigits('۱۰۴۸')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end text-slate-500 text-[11px]">
                          <span>تاریخ صدور:</span>
                          <span className="font-bold">
                            {formData.numberFormat === 'latin' ? '1405/06/15' : toPersianDigits('۱۴۰۵/۰۶/۱۵')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sample Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11.5px] bg-slate-50/70 dark:bg-slate-800/40">
                            <th className="text-right py-2.5 px-3 font-bold">شرح کالا</th>
                            <th className="text-center py-2.5 px-3 font-bold">تعداد کارتن و دانه</th>
                            <th className="text-center py-2.5 px-3 font-bold">قیمت واحد</th>
                            <th className="text-left py-2.5 px-3 font-bold">مبلغ کل (تومان)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          <tr>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                              شکلات کپل شیری صادراتی (طعم فندق)
                            </td>
                            <td className="text-center py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                              {formData.numberFormat === 'latin' ? '12 Cartons + 20 Units' : toPersianDigits('۱۲ کارتن و ۲۰ دانه')}
                            </td>
                            <td className="text-center py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400">
                              {formData.numberFormat === 'latin' ? '925,000' : toPersianDigits(formatPrice(925000))}
                            </td>
                            <td className="text-left py-2.5 px-3 font-black text-slate-900 dark:text-white">
                              {formData.numberFormat === 'latin' ? '18,500,000' : toPersianDigits(formatPrice(18500000))}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                              بیسکویت کرمدار پرتقالی کارتن ۴۸ تایی
                            </td>
                            <td className="text-center py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                              {formData.numberFormat === 'latin' ? '25 Cartons' : toPersianDigits('۲۵ کارتن')}
                            </td>
                            <td className="text-center py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400">
                              {formData.numberFormat === 'latin' ? '1,248,000' : toPersianDigits(formatPrice(1248000))}
                            </td>
                            <td className="text-left py-2.5 px-3 font-black text-slate-900 dark:text-white">
                              {formData.numberFormat === 'latin' ? '31,200,000' : toPersianDigits(formatPrice(31200000))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Total Row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          جمع نهایی فاکتور:
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          تسویه شده نقدی
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                          {formData.numberFormat === 'latin' ? '49,700,000' : toPersianDigits(formatPrice(49700000))}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">تومان</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 1: OFFICIAL POPULAR PERSIAN FONTS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Type className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        ۱. لیست فونت‌های رسمی، استاندارد و پرمخاطب وب فارسی
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        برترین قلم‌های استاندارد، اداری و تجاری مناسب سامانه‌های بازرگانی، حسابداری و فاکتور
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {Object.keys(fontFamilies).length} فونت برگزیده
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {Object.values(fontFamilies).map((font) => {
                      const isSelected = (formData.fontFamily || 'vazirmatn') === font.id;

                      return (
                        <div
                          key={font.id}
                          onClick={() => {
                            updateTypography({ fontFamily: font.id });
                            if (onShowAlert) {
                              onShowAlert(`فونت سامانه به «${font.nameFa}» تنظیم شد.`, 'success', 'تغییر قلم');
                            }
                          }}
                          className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                isSelected 
                                  ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}>
                                {font.badge}
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>

                            <h5 
                              className="font-black text-sm text-slate-900 dark:text-white"
                              style={{ fontFamily: font.cssFamily }}
                            >
                              {font.nameFa}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-medium block dir-ltr text-right mb-2">
                              {font.nameEn} • {font.creator}
                            </span>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed min-h-[38px]">
                              {font.description}
                            </p>
                          </div>

                          {/* Font Features & Live Preview Line */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {font.features.map((feat, idx) => (
                                <span key={idx} className="text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                  {feat}
                                </span>
                              ))}
                            </div>
                            <div 
                              className="text-xs font-black text-slate-800 dark:text-slate-200 truncate"
                              style={{ fontFamily: font.cssFamily }}
                            >
                              {font.previewText}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                {/* SECTION 2 & 3: APP FONT SIZE SCALE & INVOICE PRINT SCALE */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* APP FONT SCALE */}
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                          <ZoomIn className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          ۲. سایزبندی و مقیاس نمایشی سامانه (اندازه فونت برنامه)
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          تنظیم ابعاد متن منوها، فرم‌ها، جداول و داشبورد متناسب با رزولوشن نمایشگر شما
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.values(appFontSizes).map((scale) => {
                        const isSelected = (formData.fontSizeScale || 'standard') === scale.id;

                        return (
                          <button
                            key={scale.id}
                            type="button"
                            onClick={() => {
                              updateTypography({ 
                                fontSizeScale: scale.id,
                                customFontScalePercent: scale.percentage
                              });
                            }}
                            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-100 font-bold shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black">{scale.nameFa}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              {scale.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Precision Fine-Tuning Slider */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          تنظیم دقیق درصدی اسلایدر:
                        </span>
                        <span className="font-black text-teal-600 dark:text-teal-400 dir-ltr">
                          {formData.customFontScalePercent || appFontSizes[formData.fontSizeScale || 'standard']?.percentage || 100} %
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="80"
                        max="145"
                        step="1"
                        value={formData.customFontScalePercent || appFontSizes[formData.fontSizeScale || 'standard']?.percentage || 100}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          let matchedScale: AppFontSizeScale = 'standard';
                          if (val <= 90) matchedScale = 'compact';
                          else if (val <= 106) matchedScale = 'standard';
                          else if (val <= 118) matchedScale = 'comfortable';
                          else if (val <= 132) matchedScale = 'large';
                          else matchedScale = 'extra-large';

                          updateTypography({
                            customFontScalePercent: val,
                            fontSizeScale: matchedScale
                          });
                        }}
                        className="w-full accent-teal-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* INVOICE PRINT SCALE */}
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ۳. مقیاس و تراکم قلم چاپ فاکتور (تعداد اقلام در یک برگ A4)
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        تنظیم فشردگی ردیف‌ها و فونت در خروجی چاپی و PDF برای جلوگیری از دو صفحه‌ای شدن فاکتور
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {Object.values(invoiceFontSizes).map((scale) => {
                        const isSelected = (formData.invoiceFontSizeScale || 'standard') === scale.id;

                        return (
                          <button
                            key={scale.id}
                            type="button"
                            onClick={() => {
                              updateTypography({ invoiceFontSizeScale: scale.id });
                            }}
                            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold shadow-xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black">{scale.nameFa}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              {scale.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200 dark:border-slate-800" />

                {/* SECTION 4: NUMBER FORMAT (PERSIAN OR LATIN DIGITS) */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      ۴. تنظیم فرمت نمایش ارقام و مبالغ (فارسی / انگلیسی)
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      انتخاب نمایش ارقام به صورت فارسی استاندارد (۱۲۳) یا انگلیسی بین‌المللی (123)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl">
                    <button
                      type="button"
                      onClick={() => updateTypography({ numberFormat: 'persian' })}
                      className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                        formData.numberFormat !== 'latin'
                          ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-slate-900 dark:text-white">ارقام فارسی استاندارد (پیش‌فرض)</span>
                        {formData.numberFormat !== 'latin' && <Check className="w-3.5 h-3.5 text-teal-600" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2">مناسب سیستم‌های مالی داخل ایران و تطابق کامل با نگارش فارسی</p>
                      <div className="text-sm font-black text-teal-700 dark:text-teal-300">
                        {toPersianDigits('۱۲,۴۵۰,۰۰۰ تومان (۲۵ کارتن)')}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateTypography({ numberFormat: 'latin' })}
                      className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                        formData.numberFormat === 'latin'
                          ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-slate-900 dark:text-white">ارقام لاتین / انگلیسی</span>
                        {formData.numberFormat === 'latin' && <Check className="w-3.5 h-3.5 text-teal-600" />}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2">مناسب فاکتورهای بین‌المللی و کار با داده‌های لاتین</p>
                      <div className="text-sm font-black text-teal-700 dark:text-teal-300 dir-ltr text-right">
                        12,450,000 Tomans (25 Cartons)
                      </div>
                    </button>
                  </div>
                </div>

                {/* Save Confirmation Button inside typography */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-400">
                    تمام تغییرات قلم و سایزبندی به صورت فوری و سراسری در تمامی پنجره‌ها و فاکتورها ذخیره و اعمال می‌شود.
                  </span>
                  <button
                    type="button"
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl ${currentTheme.primaryBg} text-white font-black text-xs shadow-md hover:shadow-lg transition-all cursor-pointer`}
                  >
                    <Save className="w-4 h-4" />
                    <span>ذخیره نهایی تنظیمات قلم و سایز</span>
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" style={{ color: currentTheme.hex }} />
                    تنظیمات امنیتی، پین‌کد ورود و بیومتریک مدیریت
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    پیکربندی پین‌کد مدیریت جهت محافظت از سود و بهای تمام‌شده، ویرایش و حذف اسناد، و ورود به سامانه
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Master PIN Card */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">پین‌کد مدیریت (رمز عبور اصلی)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showPin ? 'مخفی کردن' : 'نمایش'}</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={formData.adminPin}
                        onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                        maxLength={8}
                        className={`w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-center text-lg font-black tracking-widest ${currentTheme.ring} focus:outline-none`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      رمز پیش‌فرض سیستم: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">1234</span> (امکان تغییر به رمز عددی ۴ تا ۸ رقمی)
                    </p>
                  </div>

                  {/* Biometrics Card */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Fingerprint className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-black text-slate-900 dark:text-white">ورود سریع بیومتریک (Touch ID / Face ID)</span>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        امکان ورود سریع و بدون تایپ پین با استفاده از حسگر اثر انگشت یا اسکن چهره دستگاه
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">وضعیت حسگر اثر انگشت</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.enableBiometrics !== false}
                          onChange={(e) => setFormData({ ...formData, enableBiometrics: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Security Action Controls */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span>سیاست‌های درخواست احراز هویت در سامانه</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">درخواست پین برای ویرایش اسناد</div>
                        <div className="text-[10px] text-slate-400">فاکتورها، مشتریان و کالاها</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.requirePinForEdit !== false}
                          onChange={(e) => setFormData({ ...formData, requirePinForEdit: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">درخواست پین برای حذف اطلاعات</div>
                        <div className="text-[10px] text-slate-400">حذف فاکتور، کالا یا سوابق</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.requirePinForDelete !== false}
                          onChange={(e) => setFormData({ ...formData, requirePinForDelete: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between sm:col-span-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">حالت محرمانه پیش‌فرض برای قیمت خرید و سود</div>
                        <div className="text-[10px] text-slate-400">پنهان‌سازی مبالغ حساس در مقابل مشتریان هنگام باز شدن سامانه</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.hideConfidentialPrices !== false}
                          onChange={(e) => setFormData({ ...formData, hideConfidentialPrices: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. BRAND & HEADER TAB */}
            {activeTab === 'brand' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5" style={{ color: currentTheme.hex }} />
                    مشخصات بازرگانی، آیکون و سربرگ رسمی فاکتور
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    این اطلاعات در بالای پیش‌نمایش فاکتور، اسناد و فایل‌های چاپی درج می‌شود.
                  </p>
                </div>

                {/* Live Invoice Header Preview */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      پیش‌نمایش زنده سربرگ فاکتور رسمی
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                      نمایش خروجی
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <div className="text-center font-bold text-slate-400 text-xs">
                      {formData.bismillah || 'بسمه‌تعالی'}
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                          {formData.appLogo ? (
                            formData.appLogo.startsWith('data:image') ? (
                              <img src={formData.appLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{formData.appLogo}</span>
                            )
                          ) : (
                            <Sparkles className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-base font-black text-slate-900 dark:text-white">
                            {formData.brandName || 'نام مجموعه یا بازرگانی شما'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                            {formData.subtitle || 'فاکتور فروش کالا و خدمات'}
                          </div>
                        </div>
                      </div>

                      <div className="text-left text-xs space-y-1 font-mono">
                        <div className="text-slate-700 dark:text-slate-300 font-bold">شماره: ۱۰۳۹</div>
                        <div className="text-slate-400 text-[11px]">تاریخ: ۱۴۰۵/۰۶/۰۴</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>تلفن: {formData.phone || '۰۹۱۲۰۰۰۰۰۰۰'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-xs">{formData.address || 'نشانی دفتر مرکزی و انبار'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      نام شخص یا شرکت بازرگانی
                    </label>
                    <input
                      type="text"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      placeholder="مثال: بازرگانی مرکزی"
                      className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold focus:outline-none`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      عنوان سند / زیرعنوان فاکتور
                    </label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="مثال: فاکتور فروش کالا و خدمات"
                      className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold focus:outline-none`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      ذکر بالای سربرگ (بسم‌الله / هوالرزاق)
                    </label>
                    <input
                      type="text"
                      value={formData.bismillah}
                      onChange={(e) => setFormData({ ...formData, bismillah: e.target.value })}
                      placeholder="مثال: بسمه‌تعالی یا هوالرزاق"
                      className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold focus:outline-none`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      تلفن تماس مدیریت و فروش
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="مثال: 09120000000"
                      className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold focus:outline-none dir-ltr text-right`}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      نشانی کامل دفتر بازرگانی یا انبار
                    </label>
                    <textarea
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="آدرس دقیق دفتر یا انبار"
                      className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold focus:outline-none`}
                    />
                  </div>

                  {/* Logo / Icon Uploader */}
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">لوگو و آیکون اختصاصی بازرگانی</span>
                      </div>
                      {formData.appLogo && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, appLogo: '' })}
                          className="text-[11px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف آیکون</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-400 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-xs">
                        <Upload className="w-4 h-4 text-emerald-500" />
                        <span>بارگذاری تصویر لوگو (PNG / JPG)</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>

                      {/* Quick Emoji / Icon pickers */}
                      <div className="flex items-center gap-1.5">
                        {['✨', '🏢', '📦', '🌟', '💎', '🚀'].map((ico, iIdx) => (
                          <button
                            key={`page-ico-${ico}-${iIdx}`}
                            type="button"
                            onClick={() => setFormData({ ...formData, appLogo: ico })}
                            className={`w-9 h-9 rounded-xl border text-sm flex items-center justify-center transition-all cursor-pointer ${
                              formData.appLogo === ico 
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 shadow-xs' 
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            {ico}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. INVOICE, WATERMARK & STAMP TAB */}
            {activeTab === 'invoice' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5" style={{ color: currentTheme.hex }} />
                    تنظیمات پیشرفته چاپ فاکتور، واترمارک و مهر رسمی
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    شخصی‌سازی ظاهر فاکتورهای چاپی، واترمارک محو در پس‌زمینه، مهر رسمی و بخش امضای طرفین
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Watermark Configuration */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">واترمارک محو در پس‌زمینه چاپ</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.enableWatermark !== false}
                          onChange={(e) => setFormData({ ...formData, enableWatermark: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        متن واترمارک
                      </label>
                      <input
                        type="text"
                        value={formData.watermarkText}
                        onChange={(e) => setFormData({ ...formData, watermarkText: e.target.value })}
                        placeholder="مثال: بازرگانی رسمی"
                        className={`w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold focus:outline-none`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span>میزان شفافیت (Opacity)</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400">
                          {Math.round((formData.watermarkOpacity || 0.08) * 100)}٪
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.02"
                        max="0.30"
                        step="0.01"
                        value={formData.watermarkOpacity || 0.08}
                        onChange={(e) => setFormData({ ...formData, watermarkOpacity: parseFloat(e.target.value) })}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Watermark Live Mini Preview */}
                    <div className="relative h-20 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden select-none">
                      <span 
                        className="font-black font-display text-slate-900 dark:text-white transform -rotate-12 pointer-events-none"
                        style={{ 
                          opacity: formData.watermarkOpacity || 0.08,
                          fontSize: '28px'
                        }}
                      >
                        {formData.watermarkText || 'بازرگانی'}
                      </span>
                      <span className="absolute bottom-1.5 right-2 text-[9px] text-slate-400">پیش‌نمایش پس‌زمینه</span>
                    </div>
                  </div>

                  {/* Official Stamp Configuration */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Stamp className="w-4 h-4 text-rose-500" />
                        <span className="text-xs font-black text-slate-900 dark:text-white">مهر رسمی بازرگانی در چاپ</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.showStamp !== false}
                          onChange={(e) => setFormData({ ...formData, showStamp: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        متن داخل مهر
                      </label>
                      <input
                        type="text"
                        value={formData.stampText}
                        onChange={(e) => setFormData({ ...formData, stampText: e.target.value })}
                        placeholder="مثال: مهر رسمی بازرگانی - ثبت شد"
                        className={`w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold focus:outline-none`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">رنگ مهر</label>
                        <select
                          value={formData.stampColor || 'blue'}
                          onChange={(e) => setFormData({ ...formData, stampColor: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <option value="blue">سرمه‌ای اداری</option>
                          <option value="red">قرمز رسمی</option>
                          <option value="emerald">سبز تایید</option>
                          <option value="amber">طلایی کهربایی</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">قالب شکل مهر</label>
                        <select
                          value={formData.stampShape || 'circle'}
                          onChange={(e) => setFormData({ ...formData, stampShape: e.target.value as any })}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <option value="circle">دایره‌ای</option>
                          <option value="oval">بیضی‌شکل</option>
                          <option value="rect">مستطیل دور خط‌چین</option>
                        </select>
                      </div>
                    </div>

                    {/* Stamp Live Simulation Graphic */}
                    <div className="h-20 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                      <div className={`p-2 border-2 border-dashed rounded-xl transform -rotate-6 text-center select-none ${
                        formData.stampColor === 'red' ? 'border-rose-600 text-rose-600' :
                        formData.stampColor === 'emerald' ? 'border-emerald-600 text-emerald-600' :
                        formData.stampColor === 'amber' ? 'border-amber-600 text-amber-600' :
                        'border-blue-700 text-blue-700'
                      }`}>
                        <div className="text-[10px] font-black">{formData.stampText || 'مهر رسمی'}</div>
                        <div className="text-[8px] opacity-80">تایید و ثبت رایانه‌ای</div>
                      </div>
                    </div>
                  </div>

                  {/* Order Notice & Footer Terms */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      متن پاورقی و شرایط تسویه فاکتور (قوانین مرجوعی / مهلت پرداخت)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.minOrderNotice}
                      onChange={(e) => setFormData({ ...formData, minOrderNotice: e.target.value })}
                      placeholder="مثال: تسویه فاکتور ظرف مدت ۷ روز کاری - اجناس مرجوعی فقط تا ۴۸ ساعت پذیرفته می‌شود."
                      className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold focus:outline-none`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. BANK ACCOUNTS & CARDS TAB */}
            {activeTab === 'bank' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-5 h-5" style={{ color: currentTheme.hex }} />
                    حساب‌های بانکی و اطلاعات واریز وجه
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    این اطلاعات در پایین فاکتورهای رسمی جهت واریز وجه و تسویه توسط مشتریان نمایش داده می‌شود.
                  </p>
                </div>

                {/* Realistic Iranian Bank Card Visualizer */}
                <div className="p-6 rounded-xl bg-gradient-to-tr from-slate-900 via-slate-900 to-slate-950 text-white shadow-xl border border-slate-800 space-y-4 max-w-lg mx-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 text-xs font-black">
                        💳
                      </div>
                      <div>
                        <div className="text-xs font-black">{formData.bankName || 'بانک تجارت / سامان'}</div>
                        <div className="text-[10px] text-slate-400">کارت بازرگانی شتاب</div>
                      </div>
                    </div>
                    {/* EMV Chip Graphic */}
                    <div className="w-9 h-7 rounded-md bg-amber-300/80 border border-amber-400/90 flex flex-col justify-center px-1 space-y-0.5 opacity-90">
                      <div className="h-0.5 bg-amber-600/60 rounded" />
                      <div className="h-0.5 bg-amber-600/60 rounded" />
                    </div>
                  </div>

                  <div className="text-center font-mono text-base sm:text-lg tracking-widest font-black text-amber-300 dir-ltr py-2">
                    {formatCardNumberSpaced(formData.cardNumber) || '۶۲۷۳  ۵۳**  ****  ۹۱۲۰'}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                    <div>
                      <div className="text-[9px] text-slate-400">صاحب حساب:</div>
                      <div className="font-bold text-slate-200">{formData.sellerStampName || formData.brandName || 'مدیریت بازرگانی'}</div>
                    </div>
                    <div className="text-left font-mono">
                      <div className="text-[9px] text-slate-400">شماره شبا:</div>
                      <div className="text-[11px] text-slate-300 font-bold">{formData.iban ? `IR${formData.iban.replace(/\D/g, '')}` : 'IR-- ---- ----'}</div>
                    </div>
                  </div>
                </div>

                {/* Bank Account Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      نام بانک
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      placeholder="مثال: بانک تجارت - شعبه مرکزی"
                      className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold focus:outline-none`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      نام صاحب حساب / فروشنده
                    </label>
                    <input
                      type="text"
                      value={formData.sellerStampName}
                      onChange={(e) => setFormData({ ...formData, sellerStampName: e.target.value })}
                      placeholder="مثال: عرفان مرادیان"
                      className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold focus:outline-none`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      شماره کارت ۱۶ رقمی
                    </label>
                    <input
                      type="text"
                      value={formData.cardNumber}
                      onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                      placeholder="۶۲۷۳-۵۳۰۰-۰۰۰۰-۰۰۰۰"
                      maxLength={20}
                      className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold font-mono focus:outline-none dir-ltr text-center`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      شماره شبا (IBAN)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-mono text-slate-400 font-bold text-xs">IR</span>
                      <input
                        type="text"
                        value={formData.iban.replace(/^IR/i, '')}
                        onChange={(e) => setFormData({ ...formData, iban: 'IR' + e.target.value.replace(/\D/g, '') })}
                        placeholder="۰۰۰-۰۰۰۰-۰۰۰۰-۰۰۰۰-۰۰۰۰"
                        maxLength={26}
                        className={`w-full px-4 py-2.5 pl-9 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold font-mono focus:outline-none dir-ltr`}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      شماره حساب دفتری / تنخواه
                    </label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      placeholder="مثال: ۴۸۲۹۱۰۲۹۳۸"
                      className={`w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ${currentTheme.ring} text-slate-900 dark:text-white text-xs font-bold font-mono focus:outline-none dir-ltr text-right`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Form Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSave()}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl ${currentTheme.primary} ${currentTheme.primaryHover} text-white font-black text-xs shadow-md transition-all cursor-pointer`}
              >
                <Save className="w-4 h-4" />
                <span>ذخیره‌سازی تنظیمات</span>
              </button>

              {onResetToDefault && (
                <button
                  type="button"
                  onClick={() => {
                    const confirmAction = () => {
                      if (onResetToDefault) onResetToDefault();
                    };
                    if (runWithSecurityCheck) {
                      runWithSecurityCheck(
                        'تایید پین‌کد جهت بازنشانی پیش‌فرض‌ها',
                        'برای بازگردانی تنظیمات به مقادیر اولیه کارخانه، پین‌کد مدیریت را وارد کنید.',
                        'delete',
                        confirmAction
                      );
                    } else if (window.confirm('آیا از بازنشانی تنظیمات به مقادیر اولیه اطمینان دارید؟')) {
                      confirmAction();
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازنشانی به تنظیمات کارخانه</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
