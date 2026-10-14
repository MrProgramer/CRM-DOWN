import React, { useState } from 'react';
import { StoreSettings, ActivityLog, AppDesignMode } from '../types';
import { themes, designModes, getDesignModeConfig, ThemeColor } from './ThemeConfig';
import { SecurityAuthModal } from './SecurityAuthModal';
import { 
  FileText, 
  Boxes, 
  PlusCircle, 
  Settings, 
  Eye, 
  EyeOff, 
  Sparkles, 
  LayoutDashboard, 
  Store, 
  Users, 
  ShieldCheck, 
  Search, 
  ChevronLeft, 
  X, 
  Menu, 
  Clock, 
  Calendar, 
  Command, 
  PieChart, 
  Sun, 
  Moon, 
  Bell, 
  ChevronDown, 
  UserCheck, 
  TrendingUp,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
  DollarSign,
  AlertTriangle,
  HardDrive,
  RotateCcw,
  Wallet,
  Loader2,
  CheckCircle2,
  Palette,
  Check,
  Crown,
  Shapes,
  Cpu,
  FileSpreadsheet,
  Gem,
  Feather,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toPersianDigits, getCurrentPersianDate, getCurrentPersianTime } from '../utils/formatters';

export type AppTab = 'dashboard' | 'invoices' | 'new-invoice' | 'inventory' | 'customers' | 'profit-loss' | 'activity-logs' | 'backup' | 'view-invoice' | 'business-settings' | 'system-settings' | 'returns' | 'liquidity';

interface HeaderNavProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  settings: StoreSettings;
  isSecretMode: boolean;
  onToggleSecretMode: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSettings?: () => void;
  onLockApp?: () => void;
  invoicesCount: number;
  productsCount: number;
  customersCount?: number;
  onOpenGlobalSearch?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  activityLogs?: ActivityLog[];
  onClearActivityLogs?: () => void;
  isSecurityLocked?: boolean;
  onToggleSecurityMode?: () => void;
  onDesignModeChange?: (mode: AppDesignMode) => void;
  onThemeColorChange?: (color: ThemeColor) => void;
  onQuickUpdateSettings?: (updates: Partial<StoreSettings>) => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentTab,
  onTabChange,
  settings,
  isSecretMode,
  onToggleSecretMode,
  isDarkMode,
  onToggleDarkMode,
  onOpenSettings,
  onLockApp,
  invoicesCount,
  productsCount,
  customersCount = 0,
  onOpenGlobalSearch,
  isSidebarCollapsed = false,
  onToggleSidebar,
  activityLogs = [],
  onClearActivityLogs,
  isSecurityLocked = true,
  onToggleSecurityMode,
  onDesignModeChange,
  onThemeColorChange,
  onQuickUpdateSettings,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDesignModeMenuOpen, setIsDesignModeMenuOpen] = useState(false);
  const [isThemeColorMenuOpen, setIsThemeColorMenuOpen] = useState(false);
  const [isSecretAuthModalOpen, setIsSecretAuthModalOpen] = useState(false);
  const theme = themes[settings.themeColor] || themes.teal;

  const handleAdminModeToggle = () => {
    if (onToggleSecurityMode) {
      onToggleSecurityMode();
    }
  };

  const handleSecretModeToggleClick = () => {
    if (isSecretMode) {
      if (!isSecurityLocked) {
        // Unlocked Manager Mode -> reveal prices & profit directly without asking for PIN
        onToggleSecretMode();
      } else {
        // Security Guard Mode active -> require admin PIN/biometrics
        setIsSecretAuthModalOpen(true);
      }
    } else {
      // Currently revealed -> instant switch to secret mode for privacy
      onToggleSecretMode();
    }
  };

  const navSections = [
    {
      id: 'core',
      title: 'پیشخوان و معاملات',
      items: [
        {
          id: 'dashboard' as AppTab,
          label: 'پیشخوان اصلی',
          subtitle: 'نمای کلی کسب‌وکار و آمارها',
          icon: LayoutDashboard,
          count: null,
          hideInSecretMode: false,
        },
        {
          id: 'invoices' as AppTab,
          label: 'بایگانی فاکتورها',
          subtitle: 'اسناد فروش، خرید و پیش‌نویس‌ها',
          icon: FileText,
          count: invoicesCount,
          hideInSecretMode: false,
        },
      ],
    },
    {
      id: 'inventory',
      title: 'انبارداری و کالاها',
      items: [
        {
          id: 'inventory' as AppTab,
          label: 'مدیریت انبار',
          subtitle: 'موجودی کالاها، بسته‌بندی و قیمت',
          icon: Boxes,
          count: productsCount,
          hideInSecretMode: false,
        },
        {
          id: 'returns' as AppTab,
          label: 'کالاهای مرجوعی',
          subtitle: 'برگشت از خرید و فروش کالا',
          icon: RotateCcw,
          count: null,
          hideInSecretMode: false,
        },
      ],
    },
    {
      id: 'finance',
      title: 'مالی و طرف‌حساب‌ها',
      items: [
        {
          id: 'customers' as AppTab,
          label: 'دفتر حساب مشتریان',
          subtitle: 'طرف‌حساب‌ها، مانده و واریزی‌ها',
          icon: Users,
          count: customersCount > 0 ? customersCount : null,
          hideInSecretMode: false,
        },
        {
          id: 'liquidity' as AppTab,
          label: 'نقدینگی و خزانه‌داری',
          subtitle: 'صندوق، بانک و تراکنش‌ها',
          icon: Wallet,
          count: null,
          hideInSecretMode: false,
        },
        {
          id: 'profit-loss' as AppTab,
          label: 'تحلیل سود و زیان',
          subtitle: 'حاشیه سود و تحلیل مالی',
          icon: TrendingUp,
          count: null,
          hideInSecretMode: true,
        },
      ],
    },
    {
      id: 'system',
      title: 'ابزارها و تنظیمات',
      items: [
        {
          id: 'activity-logs' as AppTab,
          label: 'گزارش رویدادها',
          subtitle: 'تاریخچه فعالیت‌های سیستم',
          icon: Bell,
          count: activityLogs.length > 0 ? activityLogs.length : null,
          hideInSecretMode: false,
        },
        {
          id: 'backup' as AppTab,
          label: 'پشتیبان‌گیری',
          subtitle: 'خروجی داده‌ها و بازیابی دیتابیس',
          icon: HardDrive,
          count: null,
          hideInSecretMode: false,
        },
        {
          id: 'business-settings' as AppTab,
          label: 'مشخصات و سربرگ',
          subtitle: 'لوگو، مهر و اطلاعات بانکی',
          icon: Store,
          count: null,
          hideInSecretMode: false,
        },
        {
          id: 'system-settings' as AppTab,
          label: 'تنظیمات سامانه',
          subtitle: 'پالت‌های رنگی، امنیت و بکاپ',
          icon: Settings,
          count: null,
          hideInSecretMode: false,
        },
      ],
    },
  ];

  // Flat list for searches and shortcuts
  const allNavItems = navSections.flatMap(section => section.items);
  const visibleNavItems = allNavItems.filter(item => !(item.hideInSecretMode && isSecretMode));

  return (
    <>
      {/* ALWAYS OPEN RIGHT SIDEBAR NAVIGATION (RTL Desktop) */}
      <aside className={`hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} fixed top-0 right-0 bottom-0 bg-white dark:bg-[#090d16] border-l border-slate-200/90 dark:border-slate-800/90 z-40 p-3.5 justify-between no-print transition-all duration-200 select-none`}>
        <div className="space-y-4">
          {/* Brand & Logo Header & Sidebar Collapse Toggle Button */}
          <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-2.5' : 'justify-between'} px-1 pt-1`}>
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <div 
                  className={`w-9 h-9 rounded-lg ${theme.primary} text-white flex items-center justify-center font-black text-sm shrink-0 cursor-pointer overflow-hidden shadow-xs`}
                >
                  {settings.appLogo ? (
                    settings.appLogo.startsWith('data:image') ? (
                      <img src={settings.appLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-lg select-none">{settings.appLogo}</span>
                    )
                  ) : (
                    <span>{(settings.brandName || 'ب')[0]}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-900 dark:text-white text-sm font-black tracking-tight truncate whitespace-nowrap">
                      {settings.brandName || 'سامانه بازرگانی'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium truncate whitespace-nowrap">
                      نرم‌افزار حسابداری و بازرگانی
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className={`w-9 h-9 rounded-lg ${theme.primary} text-white flex items-center justify-center font-black text-sm shrink-0 cursor-pointer overflow-hidden shadow-xs`}
                title={settings.brandName || 'سامانه بازرگانی'}
              >
                {settings.appLogo ? (
                  settings.appLogo.startsWith('data:image') ? (
                    <img src={settings.appLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-lg select-none">{settings.appLogo}</span>
                  )
                ) : (
                  <span>{(settings.brandName || 'ب')[0]}</span>
                )}
              </div>
            )}

            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title={isSidebarCollapsed ? 'گسترش منو' : 'جمع کردن منو'}
              >
                {isSidebarCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Quick Primary Action: New Invoice CTA Button */}
          <div className="pt-0.5">
            {isSidebarCollapsed ? (
              <div className="relative group flex justify-center">
                <button
                  id="sidebar-new-invoice-btn"
                  onClick={() => onTabChange('new-invoice')}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-bold transition-all cursor-pointer select-none shadow-sm hover:scale-105 active:scale-95`}
                >
                  <PlusCircle className="w-5 h-5 shrink-0" />
                </button>
                {/* Floating RTL Tooltip */}
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center px-3 py-1.5 rounded-xl bg-slate-950/95 dark:bg-slate-800 text-white text-xs font-bold shadow-xl border border-slate-700/80 pointer-events-none z-50 whitespace-nowrap backdrop-blur-md">
                  <span>صدور فاکتور جدید</span>
                  <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-slate-950/95 dark:bg-slate-800 rotate-45 border-r border-t border-slate-700/80" />
                </div>
              </div>
            ) : (
              <button
                id="sidebar-new-invoice-btn"
                onClick={() => onTabChange('new-invoice')}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg ${theme.primary} ${theme.primaryHover} text-white font-bold text-xs transition-colors cursor-pointer select-none shadow-xs`}
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span className="truncate whitespace-nowrap tracking-tight font-black">صدور فاکتور جدید</span>
              </button>
            )}
          </div>

          {/* Categorized Professional Navigation Menu */}
          <nav className="space-y-2 overflow-y-auto max-h-[calc(100vh-170px)] pr-0.5 pl-0.5 custom-sidebar-scroll">
            {navSections.map((section, sIdx) => {
              const visibleItems = section.items.filter(it => !(it.hideInSecretMode && isSecretMode));
              if (visibleItems.length === 0) return null;

              return (
                <div key={`nav-sec-${section.id}-${sIdx}`} className="space-y-1">
                  {!isSidebarCollapsed ? (
                    <div className="px-2 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 select-none">
                        {section.title}
                      </span>
                    </div>
                  ) : (
                    <div className="w-8 h-px bg-slate-200/80 dark:border-slate-800 mx-auto my-1.5" />
                  )}

                  <div className="space-y-1">
                    {visibleItems.map((item, iIdx) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;

                      if (isSidebarCollapsed) {
                        return (
                          <div key={`sidebar-tab-col-${item.id}-${iIdx}`} className="relative group flex justify-center py-0.5">
                            <button
                              id={`sidebar-tab-${item.id}`}
                              onClick={() => onTabChange(item.id)}
                              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
                                isActive
                                  ? `${theme.primaryLight} ${theme.primaryText} ring-1.5 ${theme.borderColor} shadow-xs font-black`
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
                              }`}
                            >
                              <Icon className={`w-5 h-5 shrink-0 transition-colors ${
                                isActive ? (theme.activeIcon || 'text-current') : 'text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white'
                              }`} />

                              {/* Active indicator dot */}
                              {isActive && (
                                <span 
                                  className="w-1.5 h-1.5 rounded-full absolute -right-1 top-1/2 -translate-y-1/2 ring-2 ring-white dark:ring-[#090d16]" 
                                  style={{ backgroundColor: theme.hex }}
                                />
                              )}

                              {/* Badge notification counter */}
                              {item.count !== null && item.count > 0 && (
                                <span className={`absolute -top-1 -left-1 px-1 min-w-[16px] h-4 rounded-full ${theme.primary} text-white text-[9px] font-mono font-black flex items-center justify-center ring-2 ring-white dark:ring-[#090d16] shadow-xs`}>
                                  {item.count > 99 ? '۹۹+' : toPersianDigits(item.count)}
                                </span>
                              )}
                            </button>

                            {/* Floating RTL Tooltip on Hover */}
                            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/95 dark:bg-slate-800 text-white text-xs font-bold shadow-xl border border-slate-700/80 pointer-events-none z-50 whitespace-nowrap backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
                              <span>{item.label}</span>
                              {item.count !== null && (
                                <span className={`px-1.5 py-0.2 rounded-md ${theme.badgeBg} ${theme.badgeText} text-[10px] font-mono font-black`}>
                                  {toPersianDigits(item.count)}
                                </span>
                              )}
                              <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-slate-950/95 dark:bg-slate-800 rotate-45 border-r border-t border-slate-700/80" />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={`sidebar-tab-${item.id}-${iIdx}`}
                          id={`sidebar-tab-${item.id}`}
                          onClick={() => onTabChange(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 text-xs font-bold transition-all cursor-pointer text-right group relative ${
                            isActive
                              ? `${theme.activeTab} rounded-r-none rounded-l-xl font-black shadow-xs`
                              : 'text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive ? (theme.activeIcon || 'text-slate-900 dark:text-white') : 'text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white'
                            }`} />
                            <span className="truncate whitespace-nowrap tracking-tight font-bold text-xs">{item.label}</span>
                          </div>

                          {item.count !== null && (
                            <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg ${
                              isActive
                                ? `${theme.badgeBg} ${theme.badgeText}`
                                : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                            }`}>
                              {toPersianDigits(item.count)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions & Manager Profile Card */}
        <div className="space-y-2 pt-2 border-t border-slate-200/90 dark:border-slate-800">
          {/* User Profile Footer Card */}
          {isSidebarCollapsed ? (
            <div className="relative group flex justify-center py-1">
              <div 
                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-xs shrink-0 cursor-pointer shadow-2xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="مدیریت بازرگانی"
              >
                م
              </div>
              {/* Floating profile popover */}
              <div className="absolute right-full mr-3 bottom-0 hidden group-hover:flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/95 dark:bg-slate-800 text-white text-xs font-bold shadow-xl border border-slate-700/80 pointer-events-auto z-50 whitespace-nowrap backdrop-blur-md min-w-[150px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-xs">مدیریت بازرگانی</span>
                  {onLockApp && (
                    <button
                      onClick={onLockApp}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="قفل فوری صفحه"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">
                  {isSecurityLocked ? 'قفل امنیتی فعال' : 'دسترسی مدیریت آزاد'}
                </span>
                <div className="absolute bottom-3 -right-1 w-2 h-2 bg-slate-950/95 dark:bg-slate-800 rotate-45 border-r border-t border-slate-700/80" />
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-7 h-7 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0"
                  title="مدیریت بازرگانی"
                >
                  م
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate whitespace-nowrap">مدیریت بازرگانی</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate whitespace-nowrap">
                    {isSecurityLocked ? 'قفل امنیتی فعال' : 'دسترسی مدیریت'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onLockApp && (
                  <button
                    onClick={onLockApp}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="قفل فوری صفحه و سامانه"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* TOP HEADER COMMAND BAR (Inside Main Container Header) */}
      <header className={`sticky top-0 z-30 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-64'} w-full bg-white dark:bg-[#090d16] border-b border-slate-200/90 dark:border-slate-800/90 text-slate-900 dark:text-white transition-all duration-200 no-print`}>
        <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 max-w-7xl mx-auto">
          
          {/* Mobile Menu Toggle, Brand Logo (if exists) & Page Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>

            {/* Custom App Logo in Top Bar */}
            {settings.appLogo && (
              <div className="hidden sm:flex w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                {settings.appLogo.startsWith('data:image') ? (
                  <img src={settings.appLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xl select-none">{settings.appLogo}</span>
                )}
              </div>
            )}

            <div>
              <h1 className="font-display text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>
                  {currentTab === 'dashboard' && 'داشبورد بازرگانی و گزارشات'}
                  {currentTab === 'invoices' && 'بایگانی فاکتورها'}
                  {currentTab === 'new-invoice' && 'صدور فاکتور جدید'}
                  {currentTab === 'inventory' && 'انبار مرکزی کالاها'}
                  {currentTab === 'customers' && 'دفتر حساب مشتریان'}
                  {currentTab === 'profit-loss' && 'تحلیل مالی و سود و زیان'}
                  {currentTab === 'liquidity' && 'مدیریت نقدینگی و خزانه‌داری'}
                  {currentTab === 'activity-logs' && 'اعلان‌ها و رویدادهای زنده'}
                  {currentTab === 'backup' && 'پشتیبان‌گیری و دیتابیس'}
                  {currentTab === 'view-invoice' && 'پیش‌نمایش سند فروش'}
                  {currentTab === 'business-settings' && 'تنظیمات کسب‌وکار و لوگو'}
                  {currentTab === 'system-settings' && 'تنظیمات سیستمی و رنگ‌ها'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse hidden md:inline-block shadow-xs" />
              </h1>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-400 font-bold">
                <span className="text-slate-600 dark:text-slate-300">{toPersianDigits(getCurrentPersianDate())}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">ساعت {toPersianDigits(getCurrentPersianTime())}</span>
              </div>
            </div>
          </div>

          {/* Quick Global Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-sm">
            <button
              onClick={onOpenGlobalSearch}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all text-xs cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 font-medium">
                  جستجو در فاکتور، کالا، مشتری...
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[9px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-400 dark:text-slate-400">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            </button>
          </div>

          {/* Unified Professional Status & Quick Action Center */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* Quick Search on Mobile */}
            <button
              onClick={onOpenGlobalSearch}
              className="md:hidden p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-750 transition-colors cursor-pointer"
              title="جستجوی سریع"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Appearance & Quick Actions Cluster */}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 gap-0.5">
              
              {/* Quick Font Scaling Buttons (A- / A+) */}
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-md border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    const cur = settings.customFontScalePercent || 100;
                    const next = Math.max(80, cur - 5);
                    onQuickUpdateSettings?.({ customFontScalePercent: next });
                  }}
                  className="px-1.5 py-1 text-[10px] font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="کوچک‌تر کردن متن‌های برنامه (A-)"
                >
                  A-
                </button>
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
                <button
                  type="button"
                  onClick={() => {
                    const cur = settings.customFontScalePercent || 100;
                    const next = Math.min(145, cur + 5);
                    onQuickUpdateSettings?.({ customFontScalePercent: next });
                  }}
                  className="px-1.5 py-1 text-[11px] font-black text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="بزرگ‌تر کردن متن‌های برنامه (A+)"
                >
                  A+
                </button>
              </div>

              <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

              {/* Dark/Light Mode Switcher */}
              <button
                onClick={onToggleDarkMode}
                className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title={isDarkMode ? 'تم روز (روشن)' : 'تم شب (تاریک)'}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />}
              </button>

              <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

              {/* Theme Color Quick Swatch Switcher */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsThemeColorMenuOpen(!isThemeColorMenuOpen);
                    setIsDesignModeMenuOpen(false);
                  }}
                  className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer relative flex items-center justify-center"
                  title={`پالت رنگی سامانه: ${theme.nameFa}`}
                >
                  <span 
                    className="w-3.5 h-3.5 rounded-full border border-black/20 dark:border-white/30 shrink-0 shadow-2xs" 
                    style={{ 
                      background: theme.isGradient 
                        ? `linear-gradient(135deg, ${theme.hex}, ${theme.secondaryHex || theme.hex})` 
                        : theme.hex 
                    }}
                  />
                </button>

                <AnimatePresence>
                  {isThemeColorMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsThemeColorMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 sm:left-0 right-auto mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden text-right"
                      >
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-3.5 h-3.5 rounded-full shadow-2xs" 
                              style={{ 
                                background: theme.isGradient 
                                  ? `linear-gradient(135deg, ${theme.hex}, ${theme.secondaryHex || theme.hex})` 
                                  : theme.hex 
                              }} 
                            />
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              پالت‌های رنگی و گرادیان‌های سازمانی
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            ۲۴ تم انتخابی
                          </span>
                        </div>

                        <div className="p-2 max-h-96 overflow-y-auto space-y-3">
                          {/* 1. Gradient Rich Themes */}
                          <div>
                            <div className="px-1 mb-1.5 text-[10.5px] font-black text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>پالت‌های ویژه گرادیان لوکس (۱۰ مورد)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: 'gradient-sunset' as ThemeColor, name: 'شفق خورشیدی', hex1: '#f59e0b', hex2: '#e11d48' },
                                { id: 'gradient-ocean' as ThemeColor, name: 'اقیانوس نئون', hex1: '#06b6d4', hex2: '#4f46e5' },
                                { id: 'gradient-cyber' as ThemeColor, name: 'سایبرپانک', hex1: '#d946ef', hex2: '#06b6d4' },
                                { id: 'gradient-aurora' as ThemeColor, name: 'شفق قطبی', hex1: '#10b981', hex2: '#2563eb' },
                                { id: 'gradient-royal' as ThemeColor, name: 'رویال VIP', hex1: '#7c3aed', hex2: '#c026d3' },
                                { id: 'gradient-emerald-gold' as ThemeColor, name: 'زمرد و طلا', hex1: '#059669', hex2: '#d97706' },
                                { id: 'gradient-titanium' as ThemeColor, name: 'کربن پلاتین', hex1: '#0f172a', hex2: '#52525b' },
                                { id: 'gradient-crimson-dusk' as ThemeColor, name: 'یاقوت آتشین', hex1: '#e11d48', hex2: '#ea580c' },
                                { id: 'gradient-midnight-cyan' as ThemeColor, name: 'سرمه‌ای فیروزه', hex1: '#1e3a8a', hex2: '#06b6d4' },
                                { id: 'gradient-nordic-frost' as ThemeColor, name: 'یخ نوردیک', hex1: '#2563eb', hex2: '#64748b' },
                              ].map((g, gIdx) => {
                                const isCur = settings.themeColor === g.id;
                                return (
                                  <button
                                    key={`quick-grad-${g.id}-${gIdx}`}
                                    type="button"
                                    onClick={() => {
                                      onThemeColorChange?.(g.id);
                                      setIsThemeColorMenuOpen(false);
                                    }}
                                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      isCur
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-300 dark:ring-slate-700'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span 
                                      className="w-4 h-4 rounded-full shrink-0 shadow-2xs border border-black/10 dark:border-white/20" 
                                      style={{ background: `linear-gradient(135deg, ${g.hex1}, ${g.hex2})` }} 
                                    />
                                    <span className="truncate">{g.name}</span>
                                    {isCur && <Check className="w-3.5 h-3.5 mr-auto stroke-[2.5]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Solid Commercial Themes */}
                          <div>
                            <div className="px-1 mb-1.5 text-[10.5px] font-black text-slate-500 dark:text-slate-400">
                              <span>رنگ‌های استاندارد و تک‌رنگ (۱۴ مورد)</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: 'teal' as ThemeColor, name: 'کله‌غازی سازمانی', hex: '#0d9488' },
                                { id: 'blue' as ThemeColor, name: 'آبی کبالت بانکی', hex: '#2563eb' },
                                { id: 'emerald' as ThemeColor, name: 'سبز زمردی بازار', hex: '#059669' },
                                { id: 'indigo' as ThemeColor, name: 'نیلی تکنولوژی', hex: '#4f46e5' },
                                { id: 'cyan' as ThemeColor, name: 'فیروزه‌ای مدرن', hex: '#06b6d4' },
                                { id: 'amber' as ThemeColor, name: 'کهربایی زرین', hex: '#d97706' },
                                { id: 'rose' as ThemeColor, name: 'رز سرخ تجاری', hex: '#e11d48' },
                                { id: 'ruby' as ThemeColor, name: 'یاقوتی عمیق', hex: '#991b1b' },
                                { id: 'violet' as ThemeColor, name: 'بنفش رویال', hex: '#7c3aed' },
                                { id: 'navy' as ThemeColor, name: 'سرمه‌ای اقیانوسی', hex: '#1e3a8a' },
                                { id: 'orange' as ThemeColor, name: 'نارنجی پویا', hex: '#ea580c' },
                                { id: 'lime' as ThemeColor, name: 'سبز لیمویی', hex: '#65a30d' },
                                { id: 'fuchsia' as ThemeColor, name: 'سرخابی نوین', hex: '#c026d3' },
                                { id: 'black' as ThemeColor, name: 'کربن و تیتانیوم', hex: '#0f172a' },
                              ].map((c, cIdx) => {
                                const isCur = settings.themeColor === c.id;
                                return (
                                  <button
                                    key={`quick-color-${c.id}-${cIdx}`}
                                    type="button"
                                    onClick={() => {
                                      onThemeColorChange?.(c.id);
                                      setIsThemeColorMenuOpen(false);
                                    }}
                                    className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      isCur
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-1 ring-slate-300 dark:ring-slate-700'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <span 
                                      className="w-4 h-4 rounded-full shrink-0 shadow-2xs border border-black/10 dark:border-white/20" 
                                      style={{ backgroundColor: c.hex }} 
                                    />
                                    <span className="truncate">{c.name}</span>
                                    {isCur && <Check className="w-3.5 h-3.5 mr-auto stroke-[2.5]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

              {/* Design Mode Quick Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsDesignModeMenuOpen(!isDesignModeMenuOpen);
                    setIsThemeColorMenuOpen(false);
                  }}
                  className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer relative"
                  title={`سبک و معماری برنامه: ${designModes[settings.designMode || 'modern']?.nameFa || 'مدرن'}`}
                >
                  <Palette className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                </button>

              <AnimatePresence>
                {isDesignModeMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDesignModeMenuOpen(false)} />
                      <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 sm:left-0 right-auto mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden text-right"
                    >
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            سبک بصری سامانه
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          انتخاب سبک
                        </span>
                      </div>

                      <div className="p-1.5 max-h-80 overflow-y-auto space-y-0.5">
                        {[
                          { id: 'classic' as AppDesignMode, name: 'کلاسیک اداری و دفتری سنتی', icon: FileSpreadsheet, badge: 'سنتی و دفتری', color: '#475569' },
                          { id: 'modern' as AppDesignMode, name: 'فلت مدرن تجاری (سوئیس و فین‌تک)', icon: Sparkles, badge: 'تخت و خلوت', color: '#0ea5e9' },
                          { id: 'glassmorphism' as AppDesignMode, name: 'گلس‌مورفیک شیشه‌ای کریستال', icon: Gem, badge: 'شیشه‌ای لوکس', color: '#8b5cf6' },
                          { id: 'luxury-gold' as AppDesignMode, name: 'لوکس ابسیدین و زرین شاهانه', icon: Crown, badge: 'VIP شاهانه', color: '#d4af37' },
                          { id: 'neobrutalism' as AppDesignMode, name: 'نئوبروتالیسم نرم گرافیکی', icon: Shapes, badge: 'شارپ و زنده', color: '#f43f5e' },
                          { id: 'cyber-tech' as AppDesignMode, name: 'سایبرتک نئون و ترمینال', icon: Cpu, badge: 'اتاق فرمان', color: '#06b6d4' },
                          { id: 'minimal-nordic' as AppDesignMode, name: 'مینیمال نوردیک اسکاندیناوی', icon: Feather, badge: 'خلوت و آرامش‌بخش', color: '#64748b' },
                          { id: 'aurora-sunset' as AppDesignMode, name: 'گرادیان شفق قطبی زنده', icon: Wand2, badge: 'پویا و رنگین‌کمانی', color: '#f59e0b' },
                        ].map((m, mIdx) => {
                          const isCur = (settings.designMode || 'modern') === m.id;
                          const MIcon = m.icon;
                          return (
                            <button
                              key={`hdr-design-mode-${m.id}-${mIdx}`}
                              type="button"
                              onClick={() => {
                                if (onDesignModeChange) {
                                  onDesignModeChange(m.id);
                                }
                                setIsDesignModeMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-right transition-colors cursor-pointer ${
                                isCur
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-bold'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div 
                                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                  <MIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-xs truncate">
                                    {m.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {m.badge}
                                  </span>
                                </div>
                              </div>
                              {isCur ? (
                                <Check className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0 stroke-[2.5]" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-1.5 sm:p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer relative"
                title="اعلا‌ن‌ها و رویدادهای اخیر"
              >
                <Bell className="w-4 h-4" />
                {activityLogs.length > 0 && (
                  <span className={`min-w-[16px] h-4 px-1 rounded-full ${theme.primary} text-white text-[9px] font-bold flex items-center justify-center absolute -top-1 -right-1 ring-2 ring-white dark:ring-slate-900`}>
                    {toPersianDigits(activityLogs.length)}
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    {/* Backdrop listener */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />

                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 sm:left-0 right-auto mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden text-right"
                    >
                      {/* Dropdown Header */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                            <Bell className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            اعلان‌ها و رویدادهای اخیر
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {toPersianDigits(activityLogs.length)}
                          </span>
                        </div>

                        {activityLogs.length > 0 && onClearActivityLogs && (
                          <button
                            onClick={onClearActivityLogs}
                            className="text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>پاک‌سازی</span>
                          </button>
                        )}
                      </div>

                      {/* Dropdown Activity List */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
                        {activityLogs.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                            <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                            <p className="font-medium">هیچ اعلانی ثبت نشده است.</p>
                          </div>
                        ) : (
                          activityLogs.map((log, lIdx) => {
                            const getLogIcon = (type: string) => {
                              switch (type) {
                                case 'invoice': return <FileText className="w-4 h-4 text-emerald-500" />;
                                case 'product': return <Boxes className="w-4 h-4 text-blue-500" />;
                                case 'customer': return <Users className="w-4 h-4 text-purple-500" />;
                                case 'payment': return <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
                                case 'warning': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
                                default: return <Sparkles className="w-4 h-4 text-teal-500" />;
                              }
                            };

                            const isWarning = log.type === 'warning';

                            return (
                              <div
                                key={`hdr-notif-log-${log.id || lIdx}-${lIdx}`}
                                onClick={() => {
                                  if (log.tabTarget) {
                                    onTabChange(log.tabTarget);
                                    setIsNotificationsOpen(false);
                                  }
                                }}
                                className={`p-2.5 rounded-lg transition-colors flex items-start gap-2.5 ${
                                  isWarning 
                                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-100/70 dark:hover:bg-rose-900/40' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                } ${log.tabTarget ? 'cursor-pointer' : ''}`}
                              >
                                <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                                  isWarning 
                                    ? 'bg-rose-100 dark:bg-rose-900/60' 
                                    : 'bg-slate-100 dark:bg-slate-800'
                                }`}>
                                  {getLogIcon(log.type)}
                                </div>
                                <div className="flex-1 space-y-0.5 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`font-bold text-xs truncate ${
                                      isWarning ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                                    }`}>
                                      {log.title}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                      {toPersianDigits(log.time)}
                                    </span>
                                  </div>
                                  <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                                    isWarning ? 'text-rose-600 dark:text-rose-300 font-medium' : 'text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {log.description}
                                  </p>
                                  <span className="text-[9px] text-slate-400 font-medium block pt-0.5">
                                    {toPersianDigits(log.date)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Dropdown Footer Link */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 text-center">
                        <button
                          onClick={() => {
                            onTabChange('activity-logs');
                            setIsNotificationsOpen(false);
                          }}
                          className="w-full py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>مشاهده همه اعلان‌ها و گزارش کامل فعالیت‌ها</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* CLUSTER 2: Privacy & Security Center (حالت محرمانه، وضعیت امنیتی، قفل فوری) */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 gap-0.5">
            
            {/* Secret Mode Toggle Button */}
            <button
              onClick={handleSecretModeToggleClick}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer select-none ${
                isSecretMode 
                  ? `${theme.primary} text-white shadow-xs` 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
              }`}
              title={isSecretMode ? 'حالت محرمانه فعال (سود و قیمت‌های انبار مخفی هستند)' : 'حالت عادی (قیمت‌ها نمایان هستند)'}
            >
              {isSecretMode ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline text-[11px]">محرمانه</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline text-[11px]">عادی</span>
                </>
              )}
            </button>

            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Master Security Guard / Manager Mode Toggle Button */}
            {onToggleSecurityMode && (
              <button
                onClick={handleAdminModeToggle}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer select-none ${
                  isSecurityLocked
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                    : `${theme.primary} ${theme.primaryHover} text-white shadow-xs`
                }`}
                title={
                  isSecurityLocked
                    ? 'حالت امنیتی فعال (جهت ورود به حالت مدیریت و دسترسی آزاد نیاز به تایید پین‌کد است)'
                    : 'حالت مدیر فعال (برای فعال‌سازی مجدد قفل امنیتی کلیک کنید)'
                }
              >
                {isSecurityLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-white shrink-0" />
                    <span className="hidden sm:inline font-bold text-[11px]">امنیت</span>
                    <span className="px-1 py-0.2 rounded bg-black/20 text-white text-[9px] font-bold">
                      قفل
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-white shrink-0" />
                    <span className="hidden sm:inline font-bold text-[11px]">مدیر</span>
                    <span className="px-1 py-0.2 rounded bg-black/20 text-white text-[9px] font-bold">
                      آزاد
                    </span>
                  </>
                )}
              </button>
            )}

            {/* Instant Screen Lock Button */}
            {onLockApp && (
              <button
                onClick={onLockApp}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="قفل فوری صفحه و سامانه"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (RTL Slide-in from RIGHT) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop click listener with fade transition */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer" 
              onClick={() => setIsMobileMenuOpen(false)} 
            />

            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 sm:w-80 bg-white dark:bg-slate-900 h-full p-4 border-l border-slate-200 dark:border-slate-800 space-y-4 overflow-y-auto shadow-2xl z-10 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${theme.primary} text-white flex items-center justify-center font-black text-xs shadow-xs`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-display font-black text-slate-900 dark:text-white text-sm">منوی بازرگانی</div>
                      <div className="text-[10px] text-slate-400 font-bold">{settings.brandName || 'سامانه مدیریت'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={onToggleDarkMode}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      title="تغییر تم"
                    >
                      {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                    </button>
                    
                    <button 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile New Invoice Quick CTA Button */}
                <button
                  onClick={() => {
                    onTabChange('new-invoice');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs shadow-xs cursor-pointer transition-all active:scale-98`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>صدور فاکتور جدید</span>
                </button>

                {/* Categorized Navigation Sections */}
                <div className="space-y-3.5">
                  {navSections.map((section, sIdx) => {
                    const visibleItems = section.items.filter(it => !(it.hideInSecretMode && isSecretMode));
                    if (visibleItems.length === 0) return null;

                    return (
                      <div key={`mob-sec-${section.id}-${sIdx}`} className="space-y-1">
                        <div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {section.title}
                        </div>
                        <div className="space-y-1">
                          {visibleItems.map((item, iIdx) => {
                            const Icon = item.icon;
                            const isActive = currentTab === item.id;

                            return (
                              <button
                                key={`mob-item-${item.id}-${iIdx}`}
                                onClick={() => {
                                  onTabChange(item.id);
                                  setIsMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all text-right cursor-pointer ${
                                  isActive
                                    ? `${theme.primary} text-white shadow-xs font-black`
                                    : 'text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <Icon className="w-4 h-4" />
                                  <span>{item.label}</span>
                                </div>
                                {item.count !== null && (
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {toPersianDigits(item.count)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Security Mode Toggle Button at Bottom */}
              {onToggleSecurityMode && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 mt-2">
                  <button
                    onClick={() => {
                      handleAdminModeToggle();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isSecurityLocked
                        ? `bg-slate-900 dark:bg-slate-800 text-white border border-slate-700`
                        : `${theme.primary} text-white shadow-md`
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isSecurityLocked ? (
                        <Lock className="w-4 h-4 text-amber-400" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-white" />
                      )}
                      <span>{isSecurityLocked ? 'حالت امنیتی (فعال)' : 'حالت مدیر (آزاد)'}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 dark:bg-white/10 font-bold">تغییر</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Security Auth Modal for Secret Mode Protection */}
      <SecurityAuthModal
        isOpen={isSecretAuthModalOpen}
        onClose={() => setIsSecretAuthModalOpen(false)}
        onSuccess={() => {
          onToggleSecretMode();
          setIsSecretAuthModalOpen(false);
        }}
        title="تایید هویت جهت خروج از حالت محرمانه"
        subtitle="جهت نمایش سود مالی، گزارشات محرمانه و قیمت‌های خرید انبار، پین امنیتی یا اثر انگشت خود را تأیید کنید."
        settings={settings}
        actionType="access"
      />
    </>
  );
};

