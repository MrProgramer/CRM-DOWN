import React, { useState } from 'react';
import { StoreSettings, ActivityLog, AppDesignMode } from '../types';
import { themes, designModes, getDesignModeConfig } from './ThemeConfig';
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
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDesignModeMenuOpen, setIsDesignModeMenuOpen] = useState(false);
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
      <aside className={`hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} fixed top-0 right-0 bottom-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-40 p-3 justify-between no-print transition-all duration-300 select-none shadow-xl dark:shadow-slate-950/60`}>
        <div className="space-y-3">
          {/* Brand & Logo Header & Sidebar Collapse Toggle Button */}
          <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-2.5' : 'justify-between'} px-1 pt-1`}>
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-2.5 min-w-0">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-9 h-9 rounded-xl ${theme.primary} text-white flex items-center justify-center shadow-xs shrink-0 cursor-pointer overflow-hidden`}
                >
                  {settings.appLogo ? (
                    settings.appLogo.startsWith('data:image') ? (
                      <img src={settings.appLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xl select-none">{settings.appLogo}</span>
                    )
                  ) : (
                    <Sparkles className="w-4 h-4 text-white" />
                  )}
                </motion.div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-slate-900 dark:text-white text-base font-black tracking-tight truncate whitespace-nowrap">
                      {settings.brandName || 'سامانه بازرگانی'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-slate-400 font-bold truncate whitespace-nowrap">
                      مدیریت بازرگانی هوشمند
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-9 h-9 rounded-xl ${theme.primary} text-white flex items-center justify-center shadow-xs shrink-0 cursor-pointer overflow-hidden`}
                title={settings.brandName || 'سامانه بازرگانی'}
              >
                {settings.appLogo ? (
                  settings.appLogo.startsWith('data:image') ? (
                    <img src={settings.appLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xl select-none">{settings.appLogo}</span>
                  )
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
              </motion.div>
            )}

            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer shrink-0 border border-slate-200/50 dark:border-slate-700/50"
                title={isSidebarCollapsed ? 'گسترش منو' : 'جمع کردن منو'}
              >
                {isSidebarCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Quick Primary Action: New Invoice CTA Button */}
          <div className="pt-0.5">
            <motion.button
              id="sidebar-new-invoice-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onTabChange('new-invoice')}
              title={isSidebarCollapsed ? 'صدور فاکتور جدید' : undefined}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-center gap-2 py-2 px-3'
              } rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs shadow-xs transition-all cursor-pointer select-none group border border-white/20`}
            >
              <PlusCircle className="w-4 h-4 shrink-0 transition-transform group-hover:rotate-90 duration-300" />
              {!isSidebarCollapsed && (
                <span className="truncate whitespace-nowrap tracking-tight font-black">صدور فاکتور جدید</span>
              )}
            </motion.button>
          </div>

          {/* Categorized Professional Navigation Menu */}
          <nav className="space-y-3.5 overflow-y-auto max-h-[calc(100vh-210px)] pr-0.5 pl-0.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {navSections.map((section, sIdx) => {
              const visibleItems = section.items.filter(it => !(it.hideInSecretMode && isSecretMode));
              if (visibleItems.length === 0) return null;

              return (
                <div key={`nav-sec-${section.id}-${sIdx}`} className="space-y-1">
                  {!isSidebarCollapsed ? (
                    <div className="px-2 py-1 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
                        {section.title}
                      </span>
                      <span className="w-8 h-px bg-slate-200/80 dark:bg-slate-800"></span>
                    </div>
                  ) : (
                    <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 mx-auto my-1" />
                  )}

                  <div className="space-y-0.5">
                    {visibleItems.map((item, iIdx) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;

                      return (
                        <button
                          key={`sidebar-tab-${item.id}-${iIdx}`}
                          id={`sidebar-tab-${item.id}`}
                          onClick={() => onTabChange(item.id)}
                          title={isSidebarCollapsed ? `${item.label} (${item.subtitle})` : undefined}
                          className={`w-full flex items-center ${
                            isSidebarCollapsed ? 'justify-center py-2 px-1.5' : 'justify-between px-2.5 py-2'
                          } rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer text-right group relative ${
                            isActive
                              ? `${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor} shadow-xs font-black`
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-slate-800/80 border border-transparent'
                          }`}
                        >
                          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'} min-w-0`}>
                            <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                              isActive ? theme.activeIcon : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                            }`} />
                            {!isSidebarCollapsed && (
                              <span className="truncate whitespace-nowrap tracking-tight">{item.label}</span>
                            )}
                          </div>

                          {!isSidebarCollapsed && item.count !== null && (
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-black shrink-0 ${
                              isActive ? `${theme.badgeBg} ${theme.badgeText}` : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {toPersianDigits(item.count)}
                            </span>
                          )}

                          {isSidebarCollapsed && item.count !== null && (
                            <span className={`w-2 h-2 rounded-full absolute top-2 right-2 ${theme.primary}`} />
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
        <div className="space-y-2 pt-2.5 border-t border-slate-200/80 dark:border-slate-800">
          {/* User Profile Footer Card */}
          <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <div 
                className={`w-7 h-7 rounded-lg ${theme.primary} text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0`}
                title={isSidebarCollapsed ? 'مدیریت بازرگانی' : undefined}
              >
                م
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate whitespace-nowrap">مدیریت بازرگانی</span>
                  <span className="text-[10px] text-slate-400 font-bold truncate whitespace-nowrap">
                    {isSecurityLocked ? 'قفل امنیتی فعال' : 'دسترسی مدیر ارشد'}
                  </span>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-1 shrink-0">
                {onLockApp && (
                  <button
                    onClick={onLockApp}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="قفل فوری صفحه و سامانه"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                )}
                <UserCheck className={`w-3.5 h-3.5 ${theme.primaryText} shrink-0`} />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* TOP HEADER COMMAND BAR (Inside Main Container Header) */}
      <header className={`sticky top-0 z-30 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-64'} w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white transition-all duration-300 no-print shadow-xs`}>
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4 max-w-7xl mx-auto">
          
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
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onOpenGlobalSearch}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all text-xs cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-2">
                <Search className={`w-3.5 h-3.5 text-slate-400 group-hover:${theme.primaryText} transition-colors`} />
                <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 font-medium">
                  جستجوی سریع در فاکتور، کالا، مشتری...
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[9px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md text-slate-500 dark:text-slate-400 shadow-2xs">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            </motion.button>
          </div>

          {/* Unified Professional Status & Quick Action Center */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Quick Search on Mobile */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onOpenGlobalSearch}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-750 transition-all cursor-pointer shadow-2xs"
              title="جستجوی سریع"
            >
              <Search className="w-4 h-4" />
            </motion.button>

            {/* CLUSTER 1: Appearance & Notification Center (تم، سبک طراحی ۸‌گانه، اعلان‌ها) */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs gap-0.5 sm:gap-1">
              
              {/* Dark/Light Mode Switcher */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleDarkMode}
                className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                title={isDarkMode ? 'تم روز (روشن)' : 'تم شب (تاریک)'}
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
              </motion.button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

              {/* Design Mode Quick Switcher Dropdown (8 Professional Styles - Pure Icon Only, Placed Right Before Notifications) */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsDesignModeMenuOpen(!isDesignModeMenuOpen)}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer relative"
                  title={`سبک و معماری برنامه: ${designModes[settings.designMode || 'modern']?.nameFa || 'مدرن'} (۸ سبک حرفه‌ای)`}
                >
                  <Palette className="w-4 h-4 text-sky-500" />
                </motion.button>

              <AnimatePresence>
                {isDesignModeMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDesignModeMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 sm:left-0 right-auto mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden text-right"
                    >
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-sky-500" />
                          <span className="font-black text-xs text-slate-900 dark:text-white">
                            سبک و معماری برنامه (۸ حالت)
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">
                          سوئیچ سریع
                        </span>
                      </div>

                      <div className="p-2 max-h-80 overflow-y-auto space-y-1">
                        {[
                          { id: 'classic' as AppDesignMode, name: 'کلاسیک اداری و دفتری سنتی', icon: FileSpreadsheet, badge: 'سنتی و دفتری', color: '#475569' },
                          { id: 'modern' as AppDesignMode, name: 'مدرن هوشمند و فین‌تک', icon: Sparkles, badge: 'پیش‌فرض و روان', color: '#0ea5e9' },
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
                              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition-all cursor-pointer ${
                                isCur
                                  ? 'bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-200'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div 
                                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: m.color + '20', color: m.color }}
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
                                <Check className="w-4 h-4 text-sky-500 shrink-0 stroke-[3]" />
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
                className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer relative"
                title="اعلا‌ن‌ها و رویدادهای اخیر"
              >
                <Bell className="w-4 h-4" />
                {activityLogs.length > 0 && (
                  <span className={`min-w-[16px] h-4 px-1 rounded-full ${theme.primary} text-white text-[9px] font-black flex items-center justify-center absolute -top-1 -right-1 ring-2 ring-white dark:ring-slate-900 shadow-xs`}>
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
                      className="absolute left-0 sm:left-0 right-auto mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 z-50 overflow-hidden text-right"
                    >
                      {/* Dropdown Header */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-xl ${theme.primaryLight} ${theme.primaryText} flex items-center justify-center font-bold`}>
                            <Bell className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-black text-slate-900 dark:text-white text-xs">
                            اعلان‌ها و رویدادهای اخیر
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${theme.badgeBg} ${theme.badgeText}`}>
                            {toPersianDigits(activityLogs.length)}
                          </span>
                        </div>

                        {activityLogs.length > 0 && onClearActivityLogs && (
                          <button
                            onClick={onClearActivityLogs}
                            className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
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
                                case 'warning': return <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />;
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
                                className={`p-3 rounded-2xl transition-colors flex items-start gap-3 ${
                                  isWarning 
                                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-100/70 dark:hover:bg-rose-900/40' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                } ${log.tabTarget ? 'cursor-pointer' : ''}`}
                              >
                                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                  isWarning 
                                    ? 'bg-rose-100 dark:bg-rose-900/60' 
                                    : 'bg-slate-100 dark:bg-slate-800'
                                }`}>
                                  {getLogIcon(log.type)}
                                </div>
                                <div className="flex-1 space-y-0.5 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`font-black text-xs truncate ${
                                      isWarning ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                                    }`}>
                                      {log.title}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                      {toPersianDigits(log.time)}
                                    </span>
                                  </div>
                                  <p className={`text-[11px] line-clamp-2 leading-relaxed ${
                                    isWarning ? 'text-rose-600 dark:text-rose-300 font-bold' : 'text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {log.description}
                                  </p>
                                  <span className="text-[9px] text-slate-400 font-bold block pt-1">
                                    {toPersianDigits(log.date)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Dropdown Footer Link */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-slate-800 text-center">
                        <button
                          onClick={() => {
                            onTabChange('activity-logs');
                            setIsNotificationsOpen(false);
                          }}
                          className={`w-full py-2 rounded-xl text-xs font-black ${theme.primaryText} hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer flex items-center justify-center gap-1.5`}
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
          <div className="flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs gap-1">
            
            {/* Secret Mode Toggle Button (Reflects active theme palette when activated) */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleSecretModeToggleClick}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none ${
                isSecretMode 
                  ? `${theme.primary} ${theme.primaryHover} text-white shadow-xs border ${theme.borderColor}` 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700'
              }`}
              title={isSecretMode ? 'حالت محرمانه فعال (سود و قیمت‌های انبار مخفی هستند)' : 'حالت عادی (قیمت‌ها نمایان هستند)'}
            >
              {isSecretMode ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 shrink-0 text-white animate-pulse" />
                  <span className="hidden xl:inline text-[11px] font-black">محرمانه</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline text-[11px] font-black">عادی</span>
                </>
              )}
            </motion.button>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Master Security Guard / Manager Mode Toggle Button */}
            {onToggleSecurityMode && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleAdminModeToggle}
                className={`relative group overflow-hidden flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-sans font-black text-xs transition-all cursor-pointer select-none ${
                  isSecurityLocked
                    ? 'bg-slate-900 dark:bg-slate-950 text-white hover:bg-slate-800'
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
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline font-sans font-black text-[11px]">امنیت</span>
                    <span className="px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black">
                      قفل
                    </span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    <ShieldCheck className="w-3.5 h-3.5 text-white shrink-0" />
                    <span className="hidden sm:inline font-sans font-black text-[11px]">مدیر</span>
                    <span className="px-1 py-0.2 rounded bg-white/25 text-white text-[9px] font-black">
                      آزاد
                    </span>
                  </>
                )}
              </motion.button>
            )}

            {/* Instant Screen Lock Button */}
            {onLockApp && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLockApp}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                title="قفل فوری صفحه و سامانه"
              >
                <Lock className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation (RTL Slide-in from RIGHT) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-950/70 backdrop-blur-md">
          {/* Backdrop click listener */}
          <div className="absolute inset-0" onClick={() => setIsMobileMenuOpen(false)} />

          <div className="fixed top-0 right-0 bottom-0 w-72 sm:w-80 bg-white dark:bg-slate-900 h-full p-4 border-l border-slate-200 dark:border-slate-800 space-y-4 overflow-y-auto shadow-2xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl ${theme.primary} text-white flex items-center justify-center font-black text-xs shadow-xs`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="font-display font-black text-slate-900 dark:text-white text-sm">منوی بازرگانی</div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onToggleDarkMode}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  title="تغییر تم"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                </button>
                
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
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
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs shadow-xs cursor-pointer transition-all`}
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
                                : 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50'
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

              {/* Mobile Security Mode Toggle Button */}
              {onToggleSecurityMode && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <button
                    onClick={() => {
                      handleAdminModeToggle();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-sans font-black transition-all cursor-pointer ${
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
            </div>
          </div>
        </div>
      )}

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

