import React, { useState } from 'react';
import { StoreSettings, AppDesignMode } from '../types';
import { ThemeColor, themes, designModes } from './ThemeConfig';
import { 
  fontFamilies, 
  appFontSizes, 
  invoiceFontSizes, 
  applyTypographyToDOM 
} from './TypographyConfig';
import { toPersianDigits } from '../utils/formatters';
import { 
  Settings, 
  Palette, 
  Building2, 
  CreditCard, 
  FileCheck, 
  Save, 
  X, 
  Download, 
  Upload, 
  Trash2,
  Sparkles,
  Check,
  ShieldCheck,
  Smartphone,
  MapPin,
  FileSpreadsheet,
  Crown,
  Shapes,
  Cpu,
  Gem,
  Feather,
  Wand2,
  Type,
  Sliders,
  ZoomIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsModalProps {
  settings: StoreSettings;
  onSaveSettings: (settings: StoreSettings) => void;
  onClose: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetToDefault: () => void;
}

type SettingsTab = 'theme' | 'typography' | 'brand' | 'bank' | 'invoice';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClose,
  onExportData,
  onImportData,
  onResetToDefault,
}) => {
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentTheme = themes[formData.themeColor] || themes.teal;

  const updateTypography = (updates: Partial<StoreSettings>) => {
    const updated = { ...formData, ...updates };
    setFormData(updated);
    applyTypographyToDOM(updated);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    applyTypographyToDOM(formData);
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
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
    'gradient-sunset',
    'gradient-ocean',
    'gradient-cyber',
    'gradient-aurora',
  ];

  // Helper to format card number into 4-digit chunks
  const formatCardDisplay = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
    const matches = cleaned.match(/.{1,4}/g);
    return matches ? matches.join('  ') : val;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-xs text-slate-900 dark:text-slate-100 transition-colors"
      >
        {/* Header */}
        <div className="p-5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-xs"
              style={{ backgroundColor: currentTheme.hex + '25', borderColor: currentTheme.hex + '50', color: currentTheme.hex }}
            >
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                تنظیمات بازرگانی، شخصی‌سازی و پالت رنگی
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                تغییر سربرگ فاکتور، حساب‌های بانکی، پالت‌های رنگی و تهیه پشتیبان
              </p>
            </div>
          </div>

          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'theme'
                ? `bg-white dark:bg-slate-800 ${currentTheme.primaryText} shadow-xs border border-slate-200/80 dark:border-slate-700`
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Palette className="w-4 h-4" style={{ color: currentTheme.hex }} />
            <span>پالت‌های رنگی و تم</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'typography'
                ? `bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200/80 dark:border-slate-700`
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Type className="w-4 h-4 text-indigo-500" />
            <span>فونت‌ها و سایزبندی</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('brand')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'brand'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>سربرگ و هویت فروشگاه</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'bank'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>اطلاعات بانکی و تسویه</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'invoice'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>پاورقی، مهر و واترمارک</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'theme' && (
            <div className="space-y-6">
              {/* SECTION 1: 8 DESIGN MODES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      سبک و معماری برنامه (۸ حالت حرفه‌ای)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      کادربندی‌ها، گوشه‌ها، سایه‌ها و استایل کل برنامه را انتخاب کنید.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    فعال: {designModes[formData.designMode || 'modern']?.nameFa || 'مدرن'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'classic' as AppDesignMode, name: 'کلاسیک اداری', badge: 'دفاتری', icon: FileSpreadsheet, color: '#475569' },
                    { id: 'modern' as AppDesignMode, name: 'مدرن هوشمند', badge: 'فین‌تک', icon: Sparkles, color: '#0ea5e9' },
                    { id: 'glassmorphism' as AppDesignMode, name: 'کریستال شیشه‌ای', badge: 'شیشه‌ای', icon: Gem, color: '#8b5cf6' },
                    { id: 'luxury-gold' as AppDesignMode, name: 'لوکس ابسیدین', badge: 'شاهانه', icon: Crown, color: '#d4af37' },
                    { id: 'neobrutalism' as AppDesignMode, name: 'نئوبروتالیسم', badge: 'شارپ', icon: Shapes, color: '#f43f5e' },
                    { id: 'cyber-tech' as AppDesignMode, name: 'سایبرتک نئون', badge: 'دیجیتال', icon: Cpu, color: '#06b6d4' },
                    { id: 'minimal-nordic' as AppDesignMode, name: 'مینیمال نوردیک', badge: 'آرامش', icon: Feather, color: '#64748b' },
                    { id: 'aurora-sunset' as AppDesignMode, name: 'شفق قطبی زنده', badge: 'پویا', icon: Wand2, color: '#f59e0b' },
                  ].map((m, mIdx) => {
                    const isCur = (formData.designMode || 'modern') === m.id;
                    const MIcon = m.icon;
                    return (
                      <button
                        key={`modal-design-mode-${m.id}-${mIdx}`}
                        type="button"
                        onClick={() => {
                          const updated = { ...formData, designMode: m.id };
                          setFormData(updated);
                          onSaveSettings(updated);
                        }}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                          isCur
                            ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/40 dark:bg-sky-950/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: m.color + '20', color: m.color }}
                          >
                            <MIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {m.badge}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                          <span className="truncate">{m.name}</span>
                          {isCur && <Check className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              {/* SECTION 2: 18 NAMELESS COLOR SWATCHES (AUTO-SAVED) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Palette className="w-4 h-4" style={{ color: currentTheme.hex }} />
                      پالت‌های رنگی (انتخاب مستقیم رنگ بدون نام — ذخیره خودکار)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      با یک کلیک رنگ مورد علاقه خود را انتخاب کنید؛ بلافاصله ذخیره و اعمال می‌شود.
                    </p>
                  </div>
                  <div 
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm flex items-center justify-center text-white"
                    style={{ background: currentTheme.hex }}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>

                {/* 14 Solid Distinct Colors */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                    رنگ‌های خالص و تفکیک‌شده (۱۴ رنگ)
                  </span>
                  <div className="grid grid-cols-7 sm:grid-cols-14 gap-2">
                    {solidThemeKeys.map((key, kIdx) => {
                      const t = themes[key];
                      const isSelected = formData.themeColor === key;
                      return (
                        <motion.button
                          key={`modal-solid-theme-${key}-${kIdx}`}
                          type="button"
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            const updated = { ...formData, themeColor: key };
                            setFormData(updated);
                            onSaveSettings(updated);
                          }}
                          title={`${t.nameFa}: ${t.descFa}`}
                          className={`aspect-square rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs relative ${
                            isSelected
                              ? 'ring-3 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-slate-900 scale-105 shadow-md z-10'
                              : 'hover:shadow-sm'
                          }`}
                          style={{ backgroundColor: t.hex }}
                        >
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-white/90 text-slate-900 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* 4 Multi-Color Gradients */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    طیف‌های چندرنگی و ترکیبی (۴ گرادیان)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {gradientThemeKeys.map((key, kIdx) => {
                      const t = themes[key];
                      const isSelected = formData.themeColor === key;
                      return (
                        <motion.button
                          key={`modal-grad-theme-${key}-${kIdx}`}
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const updated = { ...formData, themeColor: key };
                            setFormData(updated);
                            onSaveSettings(updated);
                          }}
                          title={`${t.nameFa}: ${t.descFa}`}
                          className={`h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs relative overflow-hidden ${
                            isSelected
                              ? 'ring-3 ring-offset-2 ring-slate-900 dark:ring-white ring-offset-white dark:ring-offset-slate-900 shadow-md z-10'
                              : 'hover:shadow-md'
                          }`}
                          style={{ background: t.hex }}
                        >
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-white text-[10px] font-black flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              فعال
                            </span>
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Type className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    تنظیمات تخصصی قلم‌های رسمی و سایزبندی سامانه
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    فونت‌های معتبر و محبوب وب فارسی، اندازه رابط کاربری و نحوه نمایش ارقام
                  </p>
                </div>
              </div>

              {/* SECTION 1: OFFICIAL FONTS */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ۱. لیست قلم‌های رسمی و استاندارد سامانه:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.values(fontFamilies).map((font) => {
                    const isSelected = (formData.fontFamily || 'vazirmatn') === font.id;
                    return (
                      <button
                        key={`modal-font-${font.id}`}
                        type="button"
                        onClick={() => updateTypography({ fontFamily: font.id })}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 shadow-xs ring-1 ring-teal-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span 
                            className="font-black text-xs text-slate-900 dark:text-white"
                            style={{ fontFamily: font.cssFamily }}
                          >
                            {font.nameFa}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                        </div>
                        <span className="text-[10px] text-slate-400 block">{font.badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: APP FONT SCALE */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ۲. مقیاس و اندازه فونت کل برنامه:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.values(appFontSizes).map((scale) => {
                    const isSelected = (formData.fontSizeScale || 'standard') === scale.id;
                    return (
                      <button
                        key={`modal-appsize-${scale.id}`}
                        type="button"
                        onClick={() => updateTypography({ fontSizeScale: scale.id })}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 font-bold text-teal-700 dark:text-teal-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-xs font-black block">{scale.nameFa}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: INVOICE PRINT SCALE */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ۳. مقیاس و تراکم قلم چاپ فاکتور:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.values(invoiceFontSizes).map((scale) => {
                    const isSelected = (formData.invoiceFontSizeScale || 'standard') === scale.id;
                    return (
                      <button
                        key={`modal-invsize-${scale.id}`}
                        type="button"
                        onClick={() => updateTypography({ invoiceFontSizeScale: scale.id })}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 font-bold text-emerald-700 dark:text-emerald-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-xs font-black block">{scale.nameFa}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: NUMBER FORMAT */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  ۴. نحوه نمایش ارقام مالی:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateTypography({ numberFormat: 'persian' })}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      formData.numberFormat !== 'latin'
                        ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 font-bold text-teal-700 dark:text-teal-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black block">اعداد فارسی (۱۲۳)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTypography({ numberFormat: 'latin' })}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      formData.numberFormat === 'latin'
                        ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 font-bold text-teal-700 dark:text-teal-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black block">اعداد انگلیسی (123)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'brand' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">نام فروشگاه / برند تجاری</label>
                  <input
                    type="text"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    placeholder="بازرگانی"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring} font-bold`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان زیرین فاکتور</label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="فاکتور فروش کالا و خدمات"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عبارت بالای فاکتور (تسبیح / نیایش)</label>
                  <input
                    type="text"
                    value={formData.bismillah}
                    onChange={(e) => setFormData({ ...formData, bismillah: e.target.value })}
                    placeholder="هوالرزاق"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring} text-center font-bold`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تلفن تماس مدیریت / فروشگاه</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09120000000"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring} dir-ltr font-bold`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">آدرس رسمی و محل بارگیری</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="استان - شهر - شهرک صنعتی ..."
                  className={`w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring} leading-relaxed`}
                />
              </div>
            </div>
          )}

          {activeTab === 'bank' && (
            <div className="space-y-5">
              {/* Visual Card Mockup */}
              <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-950 text-white p-5 rounded-2xl border border-slate-700 shadow-xl max-w-md mx-auto relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-black tracking-wide text-slate-200">
                      {formData.bankName || 'بانک ملت'}
                    </span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    حساب تجاری
                  </span>
                </div>

                <div className="font-mono text-center text-lg sm:text-xl font-black tracking-[0.2em] my-3 dir-ltr text-amber-100">
                  {formatCardDisplay(formData.cardNumber) || '۶۱۰۴  ۳۳۷۴  ۲۰۶۷  ۲۷۲۵'}
                </div>

                <div className="flex items-center justify-between text-[11px] pt-3 border-t border-slate-700/60 mt-3 text-slate-300">
                  <div>
                    <span className="block text-[9px] text-slate-400">صاحب حساب</span>
                    <span className="font-bold">{formData.bankName?.split('-')[1]?.trim() || 'مدیریت'}</span>
                  </div>
                  <div className="text-left dir-ltr">
                    <span className="block text-[9px] text-slate-400">شماره حساب</span>
                    <span className="font-mono font-bold">{formData.accountNumber || '8349183105'}</span>
                  </div>
                </div>
              </div>

              {/* Bank Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">نام بانک و نام صاحب حساب</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="ملت - نام صاحب حساب"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring} font-bold`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شماره حساب</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="8349183105"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring} dir-ltr font-mono`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شماره ۱۶ رقمی کارت بانکی</label>
                  <input
                    type="text"
                    value={formData.cardNumber}
                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                    placeholder="6104337420672725"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring} font-black tracking-wider dir-ltr`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شماره شبا (IBAN)</label>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    placeholder="IR 470120010000008349183105"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring} font-mono font-medium dir-ltr`}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invoice' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">شرط حداقل سفارش / پیام زیر فاکتور</label>
                <input
                  type="text"
                  value={formData.minOrderNotice}
                  onChange={(e) => setFormData({ ...formData, minOrderNotice: e.target.value })}
                  placeholder="حداقل سفارش از هر برند یا محصول 10 کارتن میباشد."
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">متن واترمارک پس‌زمینه فاکتور</label>
                  <input
                    type="text"
                    value={formData.watermarkText}
                    onChange={(e) => setFormData({ ...formData, watermarkText: e.target.value })}
                    placeholder="بازرگانی"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring} font-bold`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان مهر و امضای فروشنده</label>
                  <input
                    type="text"
                    value={formData.sellerStampName}
                    onChange={(e) => setFormData({ ...formData, sellerStampName: e.target.value })}
                    placeholder="مدیریت بازرگانی"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${currentTheme.ring}`}
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">نمایش واترمارک در چاپ فاکتور</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">واترمارک کم‌رنگ لوگو/نام بازرگانی در مرکز برگه فاکتور A4</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableWatermark}
                  onChange={(e) => setFormData({ ...formData, enableWatermark: e.target.checked })}
                  style={{ accentColor: currentTheme.hex }}
                  className="w-5 h-5 rounded-md cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer transition-colors"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-extrabold shadow-md transition-all cursor-pointer ${currentTheme.primary} ${currentTheme.primaryHover} ${currentTheme.glowClass}`}
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'تنظیمات ذخیره شد!' : 'ذخیره و اعمال تغییرات'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
