import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Invoice, StoreSettings, Customer, CustomerPayment, ActivityLog, ProductReturn, AppDesignMode } from './types';
import { initialProducts, initialInvoices, initialStoreSettings, initialCustomers } from './data/initialData';
import { HeaderNav, AppTab } from './components/HeaderNav';
import { DashboardOverview } from './components/DashboardOverview';
import { InvoiceView } from './components/InvoiceView';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoiceList } from './components/InvoiceList';
import { InventoryManager } from './components/InventoryManager';
import { CustomerManager } from './components/CustomerManager';
import { ProfitLossPage } from './components/ProfitLossPage';
import { ActivityLogPage } from './components/ActivityLogPage';
import { BackupPage } from './components/BackupPage';
import { ProfitAnalysisModal } from './components/ProfitAnalysisModal';
import { SettingsModal } from './components/SettingsModal';
import { SettingsPage } from './components/SettingsPage';
import { LoginScreen } from './components/LoginScreen';
import { SecurityAuthModal } from './components/SecurityAuthModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ToastContainer, ConfirmModal, ToastItem, ConfirmModalOptions } from './components/CustomNotificationModal';
import { themes, designModes } from './components/ThemeConfig';
import { applyTypographyToDOM } from './components/TypographyConfig';
import { ReturnsManager } from './components/ReturnsManager';
import { LiquidityManager, TreasuryTransaction } from './components/LiquidityManager';
import { calculateRealTimeLiquidity } from './utils/liquidityCalculations';
import { motion, AnimatePresence } from 'motion/react';
import { 
  toPersianDigits, 
  formatPrice, 
  getCurrentPersianDate, 
  getCurrentPersianTime,
  formatStockBreakdown,
  formatProductPackagingSpec
} from './utils/formatters';
import { checkAndRunAutoBackup, createSafetyPreDeleteSnapshot, createOnChangeSnapshot, TOTAL_BACKUP_LIMIT } from './utils/backupManager';
import { syncInvoiceWithReturns, syncAllInvoicesWithReturns } from './utils/invoiceSync';

const STORAGE_KEYS = {
  PRODUCTS: 'bazargani_products_v5',
  INVOICES: 'bazargani_invoices_v6',
  SETTINGS: 'bazargani_settings_v4',
  SECRET_MODE: 'bazargani_secret_mode_v3',
  CUSTOMERS: 'bazargani_customers_v6',
  PAYMENTS: 'bazargani_payments_v2',
  RETURNS: 'bazargani_returns_v2',
  TREASURY: 'bazargani_treasury_v1',
  ACTIVITY_LOGS: 'bazargani_activity_logs_v1',
  SIDEBAR_COLLAPSED: 'bazargani_sidebar_collapsed_v1',
};

export default function App() {
  // Load initial states from LocalStorage or defaults with automated brand migration and fallbacks
  const [products, setProducts] = useState<Product[]>(() => {
    const productKeys = [
      STORAGE_KEYS.PRODUCTS,
      'dastaval_products_v4',
      'bazargani_products_v2',
      'bazargani_products_v1'
    ];
    for (const key of productKeys) {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {
          console.error(`Failed to parse products from key ${key}`, e);
        }
      }
    }
    return initialProducts;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const keys = [
      STORAGE_KEYS.INVOICES,
      'dastaval_invoices_v5',
      'bazargani_invoices_v2',
      'bazargani_invoices_v1'
    ];
    for (const key of keys) {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.map(inv => ({
              ...inv,
              customerName: inv.customerName === 'عرفان مرادیان (مدیریت انبار)' ? 'مدیریت انبار' : (inv.customerName || ''),
              customerPhone: inv.customerPhone === '09999123001' ? '09120000000' : (inv.customerPhone || ''),
              customerCity: inv.customerCity === 'شبستر' ? 'مرکزی' : (inv.customerCity || ''),
              customerAddress: inv.customerAddress?.includes('شبستر') ? 'دفتر مرکزی انبار و لجستیک' : (inv.customerAddress || ''),
              items: (inv.items || []).map(item => ({
                ...item,
                cartonsCount: Number(item.cartonsCount) || 0,
                extraPieces: Number(item.extraPieces) || 0,
                piecesPerCarton: Number(item.piecesPerCarton) || 1,
                totalPieces: Number(item.totalPieces) || 0,
                unitPurchasePrice: Number(item.unitPurchasePrice) || 0,
                unitSellingPrice: Number(item.unitSellingPrice) || 0,
                totalPrice: Number(item.totalPrice) || 0,
                totalPurchaseCost: Number(item.totalPurchaseCost) || 0,
                profitAmount: Number(item.profitAmount) || 0,
                profitPercentage: Number(item.profitPercentage) || 0,
              })),
              subtotal: Number(inv.subtotal) || 0,
              discount: Number(inv.discount) || 0,
              tax: Number(inv.tax) || 0,
              finalAmount: Number(inv.finalAmount) || 0,
            }));
          }
        } catch (e) {
          console.error(`Failed to parse invoices from key ${key}`, e);
        }
      }
    }
    return initialInvoices;
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS) || localStorage.getItem('dastaval_settings_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          phone: parsed.phone === '09999123001' ? '09120000000' : parsed.phone,
          brandName: parsed.brandName?.replace(/دست اول\s*-?\s*/g, '').trim() || 'بازرگانی',
          bankName: (parsed.bankName?.includes('مرادیان') || parsed.bankName?.includes('پرتوی')) ? 'بانک ملت' : parsed.bankName,
          sellerStampName: parsed.sellerStampName?.includes('مرادیان') ? 'مدیریت بازرگانی' : parsed.sellerStampName,
          watermarkText: 'بازرگانی',
          minOrderNotice: parsed.minOrderNotice === 'حداقل سفارش از هر برند یا محصول 10 کارتن میباشد.' ? '' : (parsed.minOrderNotice || ''),
          address: parsed.address?.includes('شبستر') ? 'دفتر مرکزی بازرگانی و انبار' : parsed.address,
        };
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    return initialStoreSettings;
  });

  // Apply typography, font family, number font, and font scale to the application
  useEffect(() => {
    applyTypographyToDOM(settings);
  }, [
    settings.fontFamily, 
    settings.numberFontFamily, 
    settings.headerFontFamily, 
    settings.fontSizeScale, 
    settings.invoiceFontSizeScale
  ]);

  const [isSecretMode, setIsSecretMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SECRET_MODE) || localStorage.getItem('dastaval_secret_mode_v2');
    return saved !== null ? saved === 'true' : false;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (saved !== null) {
      try {
        const parsed: any[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(c => {
            const { payments: _, ...cleanCust } = c;
            return {
              ...cleanCust,
              name: cleanCust.name === 'عرفان مرادیان (مدیریت انبار)' ? 'مدیریت انبار' : cleanCust.name,
              company: (cleanCust.company === 'بازرگانی مرادیان' || cleanCust.company === 'پخش مویرگی شبستر') ? 'دفتر مرکزی بازرگانی' : cleanCust.company,
              phone: cleanCust.phone === '09999123001' ? '09120000000' : cleanCust.phone,
              city: cleanCust.city === 'شبستر' ? 'مرکزی' : cleanCust.city,
              address: cleanCust.address?.includes('شبستر') ? 'دفتر مرکزی انبار و لجستیک' : cleanCust.address,
              notes: cleanCust.notes?.replace('شبستر', '') || cleanCust.notes,
            };
          });
        }
      } catch (e) {
        console.error('Failed to parse customers', e);
      }
    }
    return initialCustomers;
  });

  const [payments, setPayments] = useState<CustomerPayment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((p: any) => ({
            ...p,
            amount: Number(p.amount) || 0
          }));
        }
      } catch (e) {
        console.error('Failed to parse payments', e);
      }
    }

    return [
      {
        id: 'pay-1',
        customerId: 'cust-2',
        customerName: 'صابر کریمی',
        amount: 2500000,
        date: '1405/05/20',
        time: '11:30',
        paymentMethod: 'card',
        referenceNumber: '6104-3374-9812',
        description: 'واریزی کارت به کارت بابت تسویه حساب',
        createdAt: Date.now() - 86400000 * 5,
      }
    ];
  });

  // Sidebar Collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Activity Logs state (Notifications)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse activity logs', e);
      }
    }
    return [
      {
        id: 'log-1',
        title: 'سامانه آماده به کار',
        description: 'اتوماسیون بازرگانی با موفقیت راه‌اندازی گردید.',
        timestamp: Date.now() - 3600000,
        date: getCurrentPersianDate(),
        time: getCurrentPersianTime(),
        type: 'system',
      },
      {
        id: 'log-2',
        title: 'ورود کالا به انبار',
        description: 'ثبت ورودی ۱ کارتن لواشک شلاقی چیچک (۱۵۰ عددی - ۶ برگی)',
        timestamp: Date.now() - 1800000,
        date: getCurrentPersianDate(),
        time: getCurrentPersianTime(),
        type: 'product',
        tabTarget: 'inventory',
      },
      {
        id: 'log-3',
        title: 'صدور فاکتور فروش #1040',
        description: 'فاکتور جدید برای صابر کریمی صادر گردید.',
        timestamp: Date.now() - 900000,
        date: getCurrentPersianDate(),
        time: getCurrentPersianTime(),
        type: 'invoice',
        tabTarget: 'invoices',
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(activityLogs));
  }, [activityLogs]);

  // Returns state
  const [productReturns, setProductReturns] = useState<ProductReturn[]>(() => {
    const returnKeys = [
      STORAGE_KEYS.RETURNS,
      'bazargani_product_returns_v2',
      'bazargani_returns_v1'
    ];
    for (const key of returnKeys) {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Failed to parse returns state', e);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(productReturns));
  }, [productReturns]);

  // TreasuryTransactions state
  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TREASURY);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Auto-sanitize: ensure any purchase / inward restock invoice transaction is NEVER 'deposit' or 'inject'
          return parsed.map((t: TreasuryTransaction) => {
            const isPurchaseCategory = t.category?.includes('خرید کالا') || t.description?.includes('فاکتور خرید') || t.description?.includes('ورود به انبار');
            if (isPurchaseCategory && (t.type === 'deposit' || t.impactOnLiquidity === 'inject')) {
              return {
                ...t,
                type: 'expense' as const,
                impactOnLiquidity: 'deduct' as const,
              };
            }
            return t;
          });
        }
      } catch (e) {
        console.error('Failed to parse treasuryTransactions state', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(treasuryTransactions));
  }, [treasuryTransactions]);

  // Synchronize invoice items and totals whenever returns change
  useEffect(() => {
    if (productReturns && invoices.length > 0) {
      setInvoices(prevInvoices => syncAllInvoicesWithReturns(prevInvoices, productReturns));
    }
  }, [productReturns]);

  // Floating Animated Toast Notifications (non-blocking, single consolidated notification)
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Confirmation Modal state (only for critical actions requiring confirm/cancel)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalOptions | null>(null);

  const showAlert = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    title?: string,
    duration?: number
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = {
      id,
      type,
      title,
      message,
      duration,
    };
    // Keep only one single consolidated notification to prevent multiple stacked boxes
    setToasts([newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showConfirm = (
    message: string,
    onConfirmAction: () => void,
    title?: string,
    confirmText: string = 'تأیید',
    cancelText: string = 'انصراف'
  ) => {
    setConfirmModal({
      isOpen: true,
      title: title || 'تأیید عملیات',
      message,
      confirmText,
      cancelText,
      onConfirm: onConfirmAction,
    });
  };

  const handleAddReturn = (newRet: Omit<ProductReturn, 'id' | 'createdAt'>, updateStock: boolean) => {
    const rId = `ret-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const returnObj: ProductReturn = {
      ...newRet,
      id: rId,
      createdAt: Date.now(),
    };

    setProductReturns(prev => [returnObj, ...prev]);

    // Touch matched invoice if invoiceId or invoiceNumber is provided
    if (newRet.invoiceId || newRet.invoiceNumber) {
      setInvoices(prevInvoices => prevInvoices.map(inv => {
        if (inv.id === newRet.invoiceId || inv.invoiceNumber === newRet.invoiceNumber) {
          return {
            ...inv,
            updatedAt: Date.now(),
          };
        }
        return inv;
      }));
    }

    // Update Product Stock if checked
    if (updateStock) {
      setProducts(prevProducts => {
        return prevProducts.map(p => {
          if (p.id === newRet.productId) {
            const delta = newRet.type === 'to_supplier' ? -newRet.totalPieces : newRet.totalPieces;
            return {
              ...p,
              stockPieces: Math.max(0, p.stockPieces + delta),
            };
          }
          return p;
        });
      });
    }

    addActivityLog(
      'ثبت سند مرجوعی کالا',
      `کالای «${newRet.productName}» به ارزش ${formatPrice(newRet.totalAmount)} مرجوع شد (${newRet.type === 'to_supplier' ? 'به شرکت' : 'از مشتری'}).`,
      'return',
      'returns'
    );
    showAlert(`سند مرجوعی کالای «${newRet.productName}» با موفقیت ثبت شد.`, 'success', 'ثبت مرجوعی کالا');
  };

  const handleDeleteReturn = (returnId: string) => {
    const retItem = productReturns.find(r => r.id === returnId);
    if (!retItem) return;

    if (retItem.invoiceId || retItem.invoiceNumber) {
      setInvoices(prevInvoices => prevInvoices.map(inv => {
        if (inv.id === retItem.invoiceId || inv.invoiceNumber === retItem.invoiceNumber) {
          return {
            ...inv,
            updatedAt: Date.now(),
          };
        }
        return inv;
      }));
    }

    // REVERSE stock update
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        if (p.id === retItem.productId) {
          const delta = retItem.type === 'to_supplier' ? retItem.totalPieces : -retItem.totalPieces;
          return {
            ...p,
            stockPieces: Math.max(0, p.stockPieces + delta),
          };
        }
        return p;
      });
    });

    setProductReturns(prev => prev.filter(r => r.id !== returnId));

    addActivityLog(
      'حذف سند مرجوعی کالا',
      `سند مرجوعی کالا با شناسه ${toPersianDigits(returnId.slice(-4).toUpperCase())} از سیستم حذف گردید.`,
      'return',
      'returns'
    );
    showAlert('سند مرجوعی با موفقیت از سیستم حذف گردید.', 'info', 'حذف مرجوعی');
  };

  const handleUpdateReturn = (
    returnId: string,
    updatedFields: Omit<ProductReturn, 'id' | 'createdAt' | 'isRefunded' | 'refundMethod'>,
    updateStock: boolean
  ) => {
    const oldReturn = productReturns.find(r => r.id === returnId);
    if (!oldReturn) return;

    if (updatedFields.invoiceId || updatedFields.invoiceNumber || oldReturn.invoiceId || oldReturn.invoiceNumber) {
      setInvoices(prevInvoices => prevInvoices.map(inv => {
        if (
          inv.id === updatedFields.invoiceId || 
          inv.invoiceNumber === updatedFields.invoiceNumber ||
          inv.id === oldReturn.invoiceId ||
          inv.invoiceNumber === oldReturn.invoiceNumber
        ) {
          return {
            ...inv,
            updatedAt: Date.now(),
          };
        }
        return inv;
      }));
    }

    // Reverse old stock impact
    setProducts(prevProducts => {
      return prevProducts.map(p => {
        let currentStock = p.stockPieces;
        if (p.id === oldReturn.productId) {
          const oldDelta = oldReturn.type === 'to_supplier' ? oldReturn.totalPieces : -oldReturn.totalPieces;
          currentStock = Math.max(0, currentStock - oldDelta);
        }
        if (p.id === updatedFields.productId && updateStock) {
          const newDelta = updatedFields.type === 'to_supplier' ? -updatedFields.totalPieces : updatedFields.totalPieces;
          currentStock = Math.max(0, currentStock + newDelta);
        }
        return p.id === oldReturn.productId || (p.id === updatedFields.productId && updateStock)
          ? { ...p, stockPieces: currentStock }
          : p;
      });
    });

    setProductReturns(prev => prev.map(r => {
      if (r.id === returnId) {
        return {
          ...r,
          ...updatedFields,
        };
      }
      return r;
    }));

    addActivityLog(
      'ویرایش سند مرجوعی کالا',
      `سند مرجوعی کالای «${updatedFields.productName}» با موفقیت ویرایش شد.`,
      'return',
      'returns'
    );
    showAlert(`سند مرجوعی کالای «${updatedFields.productName}» با موفقیت ویرایش شد.`, 'success', 'ویرایش مرجوعی');
  };

  const handleApproveRefund = (returnId: string, refundMethod: 'cash' | 'bank') => {
    setProductReturns(prev => prev.map(r => {
      if (r.id === returnId) {
        return {
          ...r,
          isRefunded: true,
          refundMethod,
        };
      }
      return r;
    }));

    // Find return to write activity log
    const ret = productReturns.find(r => r.id === returnId);
    if (ret) {
      addActivityLog(
        'تایید برگشت مبلغ مرجوعی',
        `برگشت مبلغ مرجوعی «${ret.productName}» به ارزش ${formatPrice(ret.totalAmount)} از طریق ${refundMethod === 'cash' ? 'صندوق نقدی' : 'حساب بانکی'} تایید و اعمال شد.`,
        'payment',
        'returns'
      );
      showAlert(`تایید برگشت وجه مرجوعی «${ret.productName}» با موفقیت ثبت شد.`, 'success', 'تسویه مرجوعی');
    }
  };

  const handleAddTreasuryTransaction = (tx: Omit<TreasuryTransaction, 'id' | 'createdAt'>) => {
    const newTx: TreasuryTransaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };

    setTreasuryTransactions(prev => [newTx, ...prev]);

    addActivityLog(
      tx.type === 'expense' ? 'ثبت هزینه انبار' : tx.type === 'transfer' ? 'انتقال حساب خزانه‌داری' : 'افزایش موجودی صندوق',
      `تراکنش ${tx.type === 'expense' ? 'هزینه' : tx.type === 'transfer' ? 'انتقال' : 'آورده صندوق'} به مبلغ ${formatPrice(tx.amount)} با موفقیت ثبت شد.`,
      'payment',
      'liquidity'
    );
    showAlert(`تراکنش ${tx.type === 'expense' ? 'هزینه' : tx.type === 'transfer' ? 'انتقال حساب' : 'آورده صندوق'} به مبلغ ${formatPrice(tx.amount)} در صندوق ثبت شد.`, 'success', 'تراکنش خزانه‌داری');
  };

  const handleUpdateTreasuryTransaction = (updatedTx: TreasuryTransaction) => {
    setTreasuryTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
    addActivityLog(
      'ویرایش تراکنش صندوق / خزانه‌داری',
      `تراکنش ${updatedTx.type === 'expense' ? 'هزینه' : updatedTx.type === 'transfer' ? 'انتقال' : 'آورده صندوق'} به مبلغ ${formatPrice(updatedTx.amount)} با موفقیت ویرایش گردید.`,
      'payment',
      'liquidity'
    );
    showAlert('تراکنش خزانه‌داری با موفقیت ویرایش و ذخیره شد.', 'success', 'ویرایش تراکنش');
  };

  const handleDeleteTreasuryTransaction = (txId: string) => {
    const rawId = txId.replace(/^tx-/, '');
    const cleanId = txId.startsWith('tx-') ? txId : `tx-${txId}`;
    setTreasuryTransactions(prev => {
      const filtered = prev.filter(t => t.id !== txId && t.id !== rawId && t.id !== cleanId);
      try {
        localStorage.setItem('bazargani_treasury_v1', JSON.stringify(filtered));
      } catch (e) {
        console.error('Error saving treasury to localStorage', e);
      }
      return filtered;
    });
    addActivityLog(
      'حذف تراکنش صندوق انبار',
      `یک تراکنش خزانه‌داری با موفقیت از سیستم حذف گردید.`,
      'payment',
      'liquidity'
    );
    showAlert('تراکنش مالی با موفقیت از صندوق حذف گردید.', 'info', 'حذف تراکنش');
  };

  const addActivityLog = (
    title: string,
    description: string,
    type: 'invoice' | 'product' | 'customer' | 'payment' | 'system' | 'warning' | 'export' | 'backup' | 'auth' | 'theme' | 'return',
    tabTarget?: AppTab
  ) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      description,
      timestamp: Date.now(),
      date: getCurrentPersianDate(),
      time: getCurrentPersianTime(),
      type,
      tabTarget,
    };
    setActivityLogs(prev => [newLog, ...prev].slice(0, 500));
  };

  const handleClearActivityLogs = () => {
    setActivityLogs([]);
    showAlert('کلیه سوابق فعالیت‌های سامانه با موفقیت پاک‌سازی شد.', 'info', 'پاک‌سازی سوابق');
  };

  // Replace default browser window.alert globally with HTML notification modal
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      showAlert(String(msg || ''), 'info', 'اطلاعیه سیستم');
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  // Dark / Light Theme state (Default: Night Mode = true)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('bazargani_dark_mode') || localStorage.getItem('dastaval_dark_mode');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('bazargani_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const theme = themes[settings.themeColor] || themes.teal;
    document.documentElement.setAttribute('data-theme', settings.themeColor);
    document.documentElement.style.setProperty('--primary-color', theme.hex);
  }, [settings.themeColor]);

  // Synchronize global [data-design-mode] attribute with active design mode
  useEffect(() => {
    const mode = settings.designMode || 'modern';
    document.documentElement.setAttribute('data-design-mode', mode);
  }, [settings.designMode]);

  const handleDesignModeChange = (newMode: AppDesignMode) => {
    const updatedSettings: StoreSettings = {
      ...settings,
      designMode: newMode,
    };
    setSettings(updatedSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
    const modeConfig = designModes[newMode];
    addActivityLog(
      'تغییر سبک طراحی برنامه',
      `سبک طراحی سامانه به «${modeConfig?.nameFa || newMode}» تغییر یافت.`,
      'theme'
    );
    showAlert(
      `سبک طراحی سامانه با موفقیت به «${modeConfig?.nameFa || newMode}» تغییر یافت.`,
      'success',
      'تغییر سبک برنامه'
    );
  };

  // Automated Smart Backup Check on Startup & State Changes
  useEffect(() => {
    if (products.length > 0 || invoices.length > 0) {
      const res = checkAndRunAutoBackup(
        products,
        invoices,
        customers,
        payments,
        settings,
        productReturns,
        treasuryTransactions,
        activityLogs,
        (updatedSettings) => {
          setSettings(updatedSettings);
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
        }
      );
      if (res.created) {
        console.log(`Smart auto backup created. ${res.prunedCount} old backups pruned.`);
      }
    }
  }, [products, invoices, customers, payments, productReturns, treasuryTransactions]);

  // Dedicated Intelligent On-Change Backup Watcher:
  // Automatically creates a snapshot in the 5 dedicated live-change slots whenever any data is added/edited/drafted
  const prevDataFingerprintRef = useRef<string | null>(null);
  const changeBackupTimerRef = useRef<any>(null);
  const isDataMountedRef = useRef<boolean>(false);

  useEffect(() => {
    if (products.length === 0 && invoices.length === 0 && customers.length === 0) {
      return;
    }

    const currentFingerprint = JSON.stringify({
      prodLen: products.length,
      prodDigest: products.map(p => 
        `${p.id}:${p.name}:${p.stockPieces}:${p.piecesPerCarton}:${p.packsPerCarton || 0}:${p.piecesPerPack || 0}:${p.leavesPerPiece || 0}:${p.unitTitle || ''}:${p.isUnpackaged ? 1 : 0}:${p.isCartonUnknown ? 1 : 0}:${p.sellingPrice}:${p.purchasePrice}`
      ).join(';'),
      prodPackagingDigest: products.map(p =>
        `${p.id}:${p.name}:${p.piecesPerCarton}:${p.packsPerCarton || 0}:${p.piecesPerPack || 0}:${p.leavesPerPiece || 0}:${p.unitTitle || ''}:${p.isUnpackaged ? 1 : 0}:${p.isCartonUnknown ? 1 : 0}`
      ).join(';'),
      invLen: invoices.length,
      invDigest: invoices.map(i => `${i.id}:${i.isDraft ? 'D' : 'F'}:${i.finalAmount}:${i.items?.length || 0}:${i.updatedAt || ''}`).join(';'),
      custLen: customers.length,
      custDigest: customers.map(c => `${c.id}:${c.balance || 0}`).join(';'),
      payLen: payments.length,
      payDigest: payments.map(p => `${p.id}:${p.amount}`).join(';'),
      retLen: productReturns.length,
      retDigest: productReturns.map(r => `${r.id}:${r.totalAmount}`).join(';'),
      treLen: treasuryTransactions.length,
      treDigest: treasuryTransactions.map(t => `${t.id}:${t.amount}`).join(';'),
    });

    if (!isDataMountedRef.current) {
      isDataMountedRef.current = true;
      prevDataFingerprintRef.current = currentFingerprint;
      return;
    }

    if (prevDataFingerprintRef.current && prevDataFingerprintRef.current !== currentFingerprint) {
      let changeNote = 'پشتیبان هوشمند پس از اعمال تغییرات در سیستم';
      try {
        const prev = JSON.parse(prevDataFingerprintRef.current);
        const curr = JSON.parse(currentFingerprint);
        const currDraftCount = invoices.filter(i => i.isDraft).length;
        const prevDraftCount = (prev.invDigest.match(/:D:/g) || []).length;

        // Check if packaging was modified
        if (prev.prodPackagingDigest && prev.prodPackagingDigest !== curr.prodPackagingDigest) {
          const prevPackMap = new Map<string, string>();
          (prev.prodPackagingDigest.split(';') || []).forEach((item: string) => {
            const parts = item.split(':');
            if (parts[0]) prevPackMap.set(parts[0], parts.slice(2).join(':'));
          });

          const changedProd = products.find(p => {
            const prevPack = prevPackMap.get(p.id);
            const currPack = `${p.piecesPerCarton}:${p.packsPerCarton || 0}:${p.piecesPerPack || 0}:${p.leavesPerPiece || 0}:${p.unitTitle || ''}:${p.isUnpackaged ? 1 : 0}:${p.isCartonUnknown ? 1 : 0}`;
            return prevPack && prevPack !== currPack;
          });

          if (changedProd) {
            const packSpec = changedProd.isUnpackaged 
              ? 'کالای فله / بدون بسته‌بندی' 
              : `هر کارتن: ${toPersianDigits(changedProd.piecesPerCarton)} عدد${changedProd.packsPerCarton ? ` (${toPersianDigits(changedProd.packsPerCarton)} بسته)` : ''}`;
            changeNote = `تغییر بسته‌بندی کالای «${changedProd.name}» (${packSpec})`;
          } else {
            changeNote = 'تغییر مشخصات بسته‌بندی و کارتن‌بندی کالاها';
          }
        } else if (currDraftCount > prevDraftCount) {
          changeNote = `ثبت پیش‌نویس جدید فاکتور (تعداد پیش‌نویس‌ها: ${toPersianDigits(currDraftCount)})`;
        } else if (currDraftCount < prevDraftCount) {
          changeNote = `نهایی‌سازی یا تغییر وضعیت پیش‌نویس فاکتور`;
        } else if (invoices.length !== prev.invLen) {
          changeNote = `ثبت یا حذف فاکتور (تعداد فاکتورها: ${toPersianDigits(invoices.length)})`;
        } else if (invoices.length > 0 && prev.invDigest !== curr.invDigest) {
          changeNote = `ویرایش فاکتور یا پیش‌نویس (${toPersianDigits(invoices.length)} فاکتور)`;
        } else if (products.length !== prev.prodLen || prev.prodDigest !== curr.prodDigest) {
          changeNote = `بروزرسانی انبار و مشخصات کالا (${toPersianDigits(products.length)} کالا)`;
        } else if (customers.length !== prev.custLen || prev.custDigest !== curr.custDigest) {
          changeNote = `تغییر در اطلاعات یا مانده طرف‌حساب‌ها`;
        } else if (payments.length !== prev.payLen) {
          changeNote = `ثبت یا ویرایش فیش واریزی`;
        } else if (productReturns.length !== prev.retLen) {
          changeNote = `ثبت یا تغییر سند مرجوعی کالا`;
        } else if (treasuryTransactions.length !== prev.treLen) {
          changeNote = `تراکنش جدید در صندوق و خزانه‌داری`;
        }
      } catch {
        changeNote = 'پشتیبان هوشمند پس از اعمال تغییرات در سیستم';
      }

      if (changeBackupTimerRef.current) {
        clearTimeout(changeBackupTimerRef.current);
      }

      changeBackupTimerRef.current = setTimeout(() => {
        try {
          createOnChangeSnapshot(
            products,
            invoices,
            customers,
            payments,
            settings,
            changeNote,
            productReturns,
            treasuryTransactions,
            activityLogs
          );
        } catch (e) {
          console.error('Auto change backup error:', e);
        }
      }, 800);

      prevDataFingerprintRef.current = currentFingerprint;
    }
  }, [products, invoices, customers, payments, productReturns, treasuryTransactions]);

  // Real-time Liquidity Balances (Cash Box, Bank, Total)
  const liveLiquidity = useMemo(() => {
    return calculateRealTimeLiquidity(payments, treasuryTransactions, productReturns, customers);
  }, [payments, treasuryTransactions, productReturns, customers]);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = sessionStorage.getItem('bazargani_is_logged_in');
    return saved === 'true';
  });

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      addActivityLog(
        next ? 'تغییر تم به حالت شب (تاریک)' : 'تغییر تم به حالت روز (روشن)',
        `تم دیداری نرم‌افزار به حالت ${next ? 'تاریک (Night Mode)' : 'روشن (Day Mode)'} تغییر یافت.`,
        'theme'
      );
      return next;
    });
  };

  const handleLoginSuccess = () => {
    sessionStorage.setItem('bazargani_is_logged_in', 'true');
    setIsAuthenticated(true);
    addActivityLog(
      'ورود موفقیت‌آمیز به پنل مدیریت',
      'احراز هویت مدیر ارشد سامانه با پین امنیتی یا اثر انگشت تایید گردید.',
      'auth'
    );
  };

  const handleLockApp = () => {
    sessionStorage.removeItem('bazargani_is_logged_in');
    setIsAuthenticated(false);
    addActivityLog(
      'قفل دستی پنل مدیریت',
      'مدیر ارشد سامانه پنل مدیریت را قفل کرد.',
      'auth'
    );
  };

  // UI state
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [invoicesInitialFilter, setInvoicesInitialFilter] = useState<'all' | 'sale' | 'purchase' | 'drafts'>('all');
  const [activeViewingInvoice, setActiveViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceOriginTab, setInvoiceOriginTab] = useState<AppTab>('invoices');

  // Auto-scroll to top when tab or viewing/editing invoice changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentTab, activeViewingInvoice, editingInvoice]);

  const [profitAnalysisInvoice, setProfitAnalysisInvoice] = useState<Invoice | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Master Security Guard State: true = Security Mode (PIN required for actions), false = Admin Mode (unlocked, no PIN required)
  const [isSecurityLocked, setIsSecurityLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('security_mode_locked');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [pendingProtectedAction, setPendingProtectedAction] = useState<(() => void) | null>(null);

  // Persist security mode preference across refreshes and restarts
  useEffect(() => {
    try {
      localStorage.setItem('security_mode_locked', JSON.stringify(isSecurityLocked));
    } catch (e) {
      console.error('Failed to persist security mode', e);
    }
  }, [isSecurityLocked]);

  // Security Auth Action Prompt state (for edit/delete/access)
  const [securityModalAction, setSecurityModalAction] = useState<{
    isOpen: boolean;
    type: 'edit' | 'delete' | 'access';
    title: string;
    subtitle: string;
    targetData?: any;
  }>({
    isOpen: false,
    type: 'access',
    title: '',
    subtitle: '',
  });

  // Helper function to enforce security PIN check when Security Guard mode is active
  const runWithSecurityCheck = (
    actionTitle: string,
    actionSubtitle: string,
    actionType: 'edit' | 'delete' | 'access',
    onApproved: () => void
  ) => {
    if (!isSecurityLocked) {
      // Unlocked Admin Mode -> Execute action directly without PIN!
      onApproved();
    } else {
      // Security Guard Mode is active -> Intercept & Prompt for PIN
      setPendingProtectedAction(() => () => onApproved());
      setSecurityModalAction({
        isOpen: true,
        type: actionType,
        title: actionTitle,
        subtitle: actionSubtitle,
      });
    }
  };

  const handleToggleSecurityMode = () => {
    if (isSecurityLocked) {
      // Currently in Security Mode (locked) -> Require PIN/Biometrics to switch to Admin Mode
      setPendingProtectedAction(() => () => {
        setIsSecurityLocked(false);
      });
      setSecurityModalAction({
        isOpen: true,
        type: 'access',
        title: 'فعال‌سازی حالت مدیریت (ادمین)',
        subtitle: 'برای ورود به حالت ادمین و دسترسی آزاد، لطفاً پین‌کد مدیریت را وارد کنید.',
      });
    } else {
      // Currently in Admin Mode (unlocked) -> Require PIN/Biometrics to switch back to Security Mode
      setPendingProtectedAction(() => () => {
        setIsSecurityLocked(true);
      });
      setSecurityModalAction({
        isOpen: true,
        type: 'access',
        title: 'فعال‌سازی حالت امنیتی (قفل)',
        subtitle: 'برای قفل مجدد نرم‌افزار و فعال‌سازی حالت امنیتی، لطفاً پین‌کد مدیریت را وارد کنید.',
      });
    }
  };

  // Keyboard shortcut for Cmd/Ctrl+K global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global numeric input scroll disable
  useEffect(() => {
    // Disable wheel event scroll changing value on number inputs
    const handleWheel = (e: WheelEvent) => {
      const activeEl = document.activeElement as HTMLInputElement;
      if (activeEl && activeEl.tagName === 'INPUT' && activeEl.type === 'number') {
        e.preventDefault();
        activeEl.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SECRET_MODE, String(isSecretMode));
  }, [isSecretMode]);

  useEffect(() => {
    const sanitizedCustomers = customers.map(c => {
      const { payments: _, ...cleanCust } = c as any;
      return cleanCust;
    });
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(sanitizedCustomers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  // Toggle Secret mode
  const handleToggleSecretMode = () => {
    setIsSecretMode(prev => {
      const nextMode = !prev;
      if (nextMode && currentTab === 'profit-loss') {
        setCurrentTab('dashboard');
      }
      return nextMode;
    });
  };

  // Customer handlers
  const handleAddCustomer = (newCustomer: Customer) => {
    const { payments: _, ...cleanCust } = newCustomer as any;
    setCustomers([cleanCust, ...customers]);
    addActivityLog(
      'ثبت مشتری جدید',
      `مشتری «${newCustomer.name}» در سیستم ثبت شد.`,
      'customer',
      'customers'
    );
    showAlert(`مشتری «${newCustomer.name}» با موفقیت در سیستم ثبت گردید.`, 'success', 'ثبت مشتری');
  };

  const handleUpdateCustomer = (updatedCust: Customer) => {
    const oldCust = customers.find(c => c.id === updatedCust.id);
    const oldName = oldCust?.name?.trim().toLowerCase();
    const { payments: _, ...cleanCust } = updatedCust as any;

    // 1. Update Customers list & storage
    const updatedCustomers = customers.map(c => c.id === updatedCust.id ? cleanCust : c);
    setCustomers(updatedCustomers);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));

    // 2. Relational Cascade update for all Invoices
    const updatedInvoices = invoices.map(inv => {
      const isMatchById = (inv as any).customerId && (inv as any).customerId === updatedCust.id;
      const isMatchByName = !(inv as any).customerId && oldName && inv.customerName?.trim().toLowerCase() === oldName;
      if (isMatchById || isMatchByName) {
        return {
          ...inv,
          customerId: updatedCust.id,
          customerName: updatedCust.name,
          customerPhone: updatedCust.phone || inv.customerPhone,
          customerCity: updatedCust.city || inv.customerCity,
          customerAddress: updatedCust.address !== undefined ? updatedCust.address : inv.customerAddress,
          customerType: updatedCust.customerType || inv.customerType,
        };
      }
      return inv;
    });
    setInvoices(updatedInvoices);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updatedInvoices));

    // 3. Relational Cascade update for all Payments
    const updatedPayments = payments.map(p => {
      const isMatchById = p.customerId && p.customerId === updatedCust.id;
      const isMatchByName = !p.customerId && oldName && p.customerName?.trim().toLowerCase() === oldName;
      if (isMatchById || isMatchByName) {
        return {
          ...p,
          customerId: updatedCust.id,
          customerName: updatedCust.name,
        };
      }
      return p;
    });
    setPayments(updatedPayments);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));

    // 4. Relational Cascade update for all Product Returns
    const updatedReturns = productReturns.map(r => {
      const isMatchById = r.customerId && r.customerId === updatedCust.id;
      const isMatchByName = !r.customerId && oldName && r.customerName?.trim().toLowerCase() === oldName;
      if (isMatchById || isMatchByName) {
        return {
          ...r,
          customerId: updatedCust.id,
          customerName: updatedCust.name,
        };
      }
      return r;
    });
    setProductReturns(updatedReturns);
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(updatedReturns));

    // 5. Update activeViewingInvoice if it belongs to this customer
    if (activeViewingInvoice) {
      const isMatchById = (activeViewingInvoice as any).customerId && (activeViewingInvoice as any).customerId === updatedCust.id;
      const isMatchByName = !(activeViewingInvoice as any).customerId && oldName && activeViewingInvoice.customerName?.trim().toLowerCase() === oldName;
      if (isMatchById || isMatchByName) {
        setActiveViewingInvoice({
          ...activeViewingInvoice,
          customerId: updatedCust.id,
          customerName: updatedCust.name,
          customerPhone: updatedCust.phone || activeViewingInvoice.customerPhone,
          customerCity: updatedCust.city || activeViewingInvoice.customerCity,
          customerAddress: updatedCust.address !== undefined ? updatedCust.address : activeViewingInvoice.customerAddress,
          customerType: updatedCust.customerType || activeViewingInvoice.customerType,
        });
      }
    }

    // 6. Update editingInvoice if it belongs to this customer
    if (editingInvoice) {
      const isMatchById = (editingInvoice as any).customerId && (editingInvoice as any).customerId === updatedCust.id;
      const isMatchByName = !(editingInvoice as any).customerId && oldName && editingInvoice.customerName?.trim().toLowerCase() === oldName;
      if (isMatchById || isMatchByName) {
        setEditingInvoice({
          ...editingInvoice,
          customerId: updatedCust.id,
          customerName: updatedCust.name,
          customerPhone: updatedCust.phone || editingInvoice.customerPhone,
          customerCity: updatedCust.city || editingInvoice.customerCity,
          customerAddress: updatedCust.address !== undefined ? updatedCust.address : editingInvoice.customerAddress,
          customerType: updatedCust.customerType || editingInvoice.customerType,
        });
      }
    }

    addActivityLog(
      'به‌روزرسانی یکپارچه و رابطه‌ای مشخصات مشتری',
      `مشخصات مشتری «${updatedCust.name}» اصلاح و کلیه فاکتورها، واریزی‌ها و مرجوعی‌های متصل به صورت خودکار و یکپارچه در کل سامانه به‌روزرسانی شدند.`,
      'customer',
      'customers'
    );
    showAlert(`مشخصات مشتری «${updatedCust.name}» و کلیه اسناد وابسته در سراسر برنامه به‌صورت رابطه‌ای همگام‌سازی و ذخیره شد.`, 'success', 'ویرایش یکپارچه مشتری');
  };

  const handleDeleteCustomer = (customerId: string) => {
    const target = customers.find(c => c.id === customerId);
    const targetName = target?.name?.trim();

    // 0. Create automatic safety pre-delete snapshot before removing customer
    try {
      createSafetyPreDeleteSnapshot(
        products,
        invoices,
        customers,
        payments,
        settings,
        `حذف پرونده طرف‌حساب «${targetName || customerId}»`,
        productReturns,
        treasuryTransactions,
        activityLogs
      );
    } catch (e) {
      console.warn('Could not create safety snapshot before customer deletion', e);
    }

    // 1. Remove customer from state & storage
    const updatedCustomers = customers.filter(c => c.id !== customerId);
    setCustomers(updatedCustomers);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));

    // 2. Cascade delete all customer payments & debts
    const updatedPayments = payments.filter(p => {
      if (p.customerId === customerId) return false;
      if (targetName && p.customerName?.trim().toLowerCase() === targetName.toLowerCase()) return false;
      return true;
    });
    setPayments(updatedPayments);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));

    // 3. Cascade delete/clean customer sales invoices
    const updatedInvoices = invoices.filter(i => {
      if ((i as any).customerId === customerId) return false;
      if (targetName && i.customerName?.trim().toLowerCase() === targetName.toLowerCase()) return false;
      return true;
    });
    setInvoices(updatedInvoices);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updatedInvoices));

    // 4. Cascade delete product returns associated with this customer
    const updatedReturns = productReturns.filter(r => {
      if (r.customerId === customerId) return false;
      if (targetName && r.customerName?.trim().toLowerCase() === targetName.toLowerCase()) return false;
      return true;
    });
    setProductReturns(updatedReturns);
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(updatedReturns));

    addActivityLog(
      'حذف کامل پرونده مشتری و کلیه رکوردهای وابسته',
      `پرونده مشتری «${targetName || customerId}» به همراه کلیه واریزی‌ها، فاکتورها و اسناد مرجوعی وابسته به صورت یکپارچه و دائمی حذف گردید. (یک نسخه پشتیبان اضطراری به صورت خودکار ثبت شد).`,
      'customer',
      'customers'
    );
    showAlert(`پرونده مشتری «${targetName || customerId}» به همراه کلیه اسناد وابسته حذف گردید. (نسخه پشتیبان اضطراری ایجاد شد).`, 'info', 'حذف پرونده مشتری');
  };

  // Reconcile and heal Treasury Transactions against Invoices
  // Guarantees purchase/inward invoices are ALWAYS recorded as expenses and deduct from liquidity, never deposits
  useEffect(() => {
    setTreasuryTransactions(prev => {
      let changed = false;
      const invMap = new Map<string, Invoice>();
      invoices.forEach(i => invMap.set(i.id, i));
      const invNumMap = new Map<string, Invoice>();
      invoices.forEach(i => invNumMap.set(i.invoiceNumber, i));

      const healed = prev.filter(t => {
        let matchingInvoice: Invoice | undefined;
        let isExpItem = false;
        if (t.id.includes('-exp-')) {
          isExpItem = true;
        }

        if (t.referenceCode?.startsWith('INV-')) {
          const rawId = t.referenceCode.replace('INV-', '');
          matchingInvoice = invMap.get(rawId) || invNumMap.get(rawId);
        } else if (t.id.startsWith('treasury-inv-')) {
          const rawId = t.id.replace('treasury-inv-', '').split('-exp-')[0];
          matchingInvoice = invMap.get(rawId) || invNumMap.get(rawId);
        }

        if (matchingInvoice) {
          if (matchingInvoice.isDraft) {
            // Remove any treasury transactions for draft invoices
            changed = true;
            return false;
          }

          const isCredit = matchingInvoice.paymentStatus === 'credit' || 
                           matchingInvoice.paymentMethod?.includes('نسیه') || 
                           matchingInvoice.paymentMethod?.includes('غیر');

          if (!isExpItem && isCredit) {
            // Remove main purchase/sale expense transaction for credit invoices
            changed = true;
            return false;
          }

          if (isExpItem) {
            // Check if expense has direct cash/bank sourceAccount
            const expList = matchingInvoice.expenses || [];
            const hasDirectCashOrBank = expList.some(e => 
              (e.sourceAccount === 'cash' || e.sourceAccount === 'bank') && 
              (Number(e.amount) || 0) > 0
            );
            if (!hasDirectCashOrBank) {
              changed = true;
              return false;
            }
          }
        }
        return true;
      });

      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(healed));
        } catch (e) {
          console.error('Failed to persist healed treasury transactions', e);
        }
        return healed;
      }
      return prev;
    });
  }, [invoices]);

  // Auto-heal purchase invoices with freight/expenses:
  // Guarantees freight and incurred expenses are ADDED to invoice acquisition cost (subtotal - discount + tax + freight) across all views
  useEffect(() => {
    let invoicesChanged = false;
    const updatedInvoices = invoices.map(inv => {
      if (inv.type === 'purchase') {
        const hasExpenses = (inv.expenses && inv.expenses.length > 0) || (inv.expensesTotalDeduction && inv.expensesTotalDeduction > 0) || (inv.expensesTotalAddition && inv.expensesTotalAddition > 0);
        if (hasExpenses) {
          let expensesChanged = false;
          let expList = inv.expenses ? [...inv.expenses] : [];
          if (expList.length === 0 && (inv.expensesTotalDeduction || inv.expensesTotalAddition)) {
            const expAmt = (inv.expensesTotalDeduction || 0) + (inv.expensesTotalAddition || 0);
            expList = [{
              id: `exp-${Date.now()}`,
              title: 'کرایه باربری و حمل',
              amount: expAmt,
              type: 'freight',
              action: 'add',
              sourceAccount: 'supplier_balance'
            }];
            expensesChanged = true;
          }

          const fixedExpenses = expList.map(e => {
            if (e.action === 'deduct') {
              expensesChanged = true;
              return { ...e, action: 'add' as const };
            }
            return e;
          });

          const totalExpenses = fixedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

          const itemsSum = (inv.items || []).reduce((sum, it) => {
            if (it.totalPrice && it.totalPrice > 0) return sum + it.totalPrice;
            const uPrice = (it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0) 
              ? it.unitPurchasePrice 
              : (it.unitPrice || it.unitSellingPrice || 0);
            return sum + (it.totalPieces * uPrice);
          }, 0);

          let baseSubtotal = itemsSum > 0 ? itemsSum : (inv.subtotal > 0 ? inv.subtotal : (inv.finalAmount || 0));
          if (itemsSum === 0 && inv.expensesTotalDeduction && inv.subtotal === inv.finalAmount) {
            baseSubtotal = inv.finalAmount + inv.expensesTotalDeduction;
          }

          const correctFinalAmount = Math.max(0, baseSubtotal - (inv.discount || 0) + (inv.tax || 0)) + totalExpenses;

          if (
            expensesChanged || 
            inv.finalAmount !== correctFinalAmount || 
            inv.subtotal !== baseSubtotal ||
            inv.expensesTotalAddition !== totalExpenses || 
            inv.expensesTotalDeduction !== undefined
          ) {
            invoicesChanged = true;
            return {
              ...inv,
              subtotal: baseSubtotal,
              expenses: fixedExpenses,
              expensesTotalDeduction: undefined,
              expensesTotalAddition: totalExpenses > 0 ? totalExpenses : undefined,
              finalAmount: correctFinalAmount,
              paidAmount: inv.paymentStatus === 'cash' ? correctFinalAmount : (inv.paymentStatus === 'credit' ? 0 : inv.paidAmount),
              remainingAmount: inv.paymentStatus === 'cash' ? 0 : (inv.paymentStatus === 'credit' ? correctFinalAmount : Math.max(0, correctFinalAmount - (inv.paidAmount || 0)))
            };
          }
        }
      }
      return inv;
    });

    if (invoicesChanged) {
      setInvoices(updatedInvoices);
      try {
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updatedInvoices));
      } catch (e) {
        console.error('Failed to persist auto-healed purchase invoices', e);
      }
    }
  }, [invoices]);

  // Relational Integrity Sanitizer (Ensures no dangling/orphaned payments or records remain from previously deleted customers)
  useEffect(() => {
    if (customers && customers.length > 0) {
      const validCustomerIds = new Set(customers.map(c => c.id));
      const validCustomerNames = new Set(customers.map(c => c.name?.trim().toLowerCase()).filter(Boolean));

      setPayments(prev => {
        const cleaned = prev.filter(p => {
          const idValid = p.customerId && validCustomerIds.has(p.customerId);
          const nameValid = p.customerName && validCustomerNames.has(p.customerName?.trim().toLowerCase());
          return idValid || nameValid;
        });
        if (cleaned.length !== prev.length) {
          localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(cleaned));
          return cleaned;
        }
        return prev;
      });

      setProductReturns(prev => {
        const cleaned = prev.filter(r => {
          if (r.type === 'to_supplier') return true;
          const idValid = r.customerId && validCustomerIds.has(r.customerId);
          const nameValid = r.customerName && validCustomerNames.has(r.customerName?.trim().toLowerCase());
          return idValid || nameValid;
        });
        if (cleaned.length !== prev.length) {
          localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(cleaned));
          return cleaned;
        }
        return prev;
      });
    }
  }, [customers]);

  const handleAddPayment = (newPayment: CustomerPayment) => {
    setPayments([newPayment, ...payments]);
    const methodMap: Record<string, string> = {
      card: 'کارت به کارت',
      cash: 'نقدی',
      cheque: 'چک بانکی',
      transfer: 'حواله پایا/ساتنا',
    };
    const methodStr = methodMap[newPayment.paymentMethod] || newPayment.paymentMethod || 'واریز بانکی';
    const refStr = newPayment.referenceNumber ? ` [کد پیگیری: ${toPersianDigits(newPayment.referenceNumber)}]` : '';
    const descStr = newPayment.description ? ` (بابت: ${newPayment.description})` : '';

    const isDebt = newPayment.amount < 0;
    const absAmt = Math.abs(newPayment.amount);

    addActivityLog(
      isDebt ? 'ثبت بدهی دستی در حساب مشتری' : 'ثبت واریزی در ریز حساب مشتری',
      isDebt 
        ? `مبلغ ${formatPrice(absAmt)} به عنوان بدهی جدید برای مشتری «${newPayment.customerName}» در ریز حساب وی ثبت گردید.${descStr}${refStr}`
        : `مبلغ ${formatPrice(absAmt)} به صورت ${methodStr} برای تسویه حساب مشتری «${newPayment.customerName}» در ریز حساب وی ثبت گردید.${descStr}${refStr}`,
      isDebt ? 'invoice' : 'payment',
      'customers'
    );
    showAlert(
      isDebt 
        ? `بدهی جدید به مبلغ ${formatPrice(absAmt)} برای «${newPayment.customerName}» ثبت شد.`
        : `سند واریزی به مبلغ ${formatPrice(absAmt)} برای «${newPayment.customerName}» ثبت شد.`,
      'success',
      isDebt ? 'ثبت بدهی' : 'ثبت واریزی'
    );
  };

  const handleUpdatePayment = (updatedPayment: CustomerPayment) => {
    const updatedList = payments.map(p => p.id === updatedPayment.id ? updatedPayment : p);
    setPayments(updatedList);
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Error saving updated payments to localStorage', e);
    }
    addActivityLog(
      'ویرایش واریزی مشتری',
      `اطلاعات واریزی به مبلغ ${formatPrice(updatedPayment.amount)} مربوط به مشتری «${updatedPayment.customerName}» در ریز حساب ویرایش گردید.`,
      'payment',
      'customers'
    );
    showAlert(`سند مالی مشتری «${updatedPayment.customerName}» با موفقیت ویرایش شد.`, 'success', 'ویرایش سند مالی');
  };

  const handleDeletePayment = (paymentId: string) => {
    const rawId = paymentId.replace(/^pay-/, '');
    const cleanId = paymentId.startsWith('pay-') ? paymentId : `pay-${paymentId}`;
    let targetPayment: CustomerPayment | undefined = payments.find(p => p.id === paymentId || p.id === rawId || p.id === cleanId);

    // 1. Delete from payments state and persist to localStorage
    const filtered = payments.filter(p => p.id !== paymentId && p.id !== rawId && p.id !== cleanId);
    setPayments(filtered);
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error saving payments to localStorage', e);
    }

    // 2. Also scrub any nested payments from customer objects in state and localStorage
    setCustomers(prevCusts => {
      const scrubbed = prevCusts.map(c => {
        if ((c as any).payments && Array.isArray((c as any).payments)) {
          const nextP = (c as any).payments.filter((p: any) => p.id !== paymentId && p.id !== rawId && p.id !== cleanId);
          return { ...c, payments: nextP };
        }
        return c;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(scrubbed));
      } catch (e) {
        console.error('Error saving cleaned customers to localStorage', e);
      }
      return scrubbed;
    });

    if (targetPayment) {
      addActivityLog(
        'حذف تراکنش از ریز حساب',
        `تراکنش مالی به مبلغ ${formatPrice(targetPayment.amount)} از ریز حساب مشتری «${targetPayment.customerName}» حذف گردید.`,
        'payment',
        'customers'
      );
    }
    showAlert('سند مالی انتخاب‌شده با موفقیت از ریز حساب حذف گردید.', 'info', 'حذف سند مالی');
  };

  const handleFullCustomerSettlement = (
    customer: Customer,
    settlementDetails: {
      settlementAmount: number;
      paymentMethod: 'card' | 'bank_transfer' | 'cash' | 'check';
      accountType: 'bank' | 'cash';
      date: string;
      time: string;
      referenceNumber?: string;
      description?: string;
      settleOpenInvoices?: boolean;
      settleOpenReturns?: boolean;
    }
  ) => {
    const isDebtor = settlementDetails.settlementAmount > 0;
    const absAmt = Math.abs(settlementDetails.settlementAmount);

    // 1. Create a definitive CustomerPayment record (which automatically syncs into Liquidity and Customer Ledger)
    const newPayment: CustomerPayment = {
      id: `pay-settle-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customerId: customer.id,
      customerName: customer.name,
      amount: settlementDetails.settlementAmount,
      date: settlementDetails.date || getCurrentPersianDate(),
      time: settlementDetails.time || getCurrentPersianTime(),
      paymentMethod: settlementDetails.paymentMethod,
      referenceNumber: settlementDetails.referenceNumber || '',
      description: settlementDetails.description || (isDebtor ? 'تسویه کامل مانده بدهی مشتری (بی‌حساب)' : 'تسویه و پرداخت بستانکاری مشتری'),
      createdAt: Date.now(),
    };

    setPayments(prev => [newPayment, ...prev]);

    // 2. Settle open credit invoices for this customer if requested
    if (settlementDetails.settleOpenInvoices) {
      setInvoices(prev => prev.map(inv => {
        const match = (inv as any).customerId === customer.id || 
          (inv.customerName && customer.name && inv.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase());
        if (match && (inv.paymentStatus === 'credit' || inv.paymentStatus === 'partial')) {
          return {
            ...inv,
            paymentStatus: 'cash',
            paidAmount: inv.finalAmount,
            remainingAmount: 0,
            paymentMethod: inv.paymentMethod ? `${inv.paymentMethod} (تسویه شد)` : 'تسویه کامل نسیه',
            updatedAt: Date.now(),
          };
        }
        return inv;
      }));
    }

    // 3. Settle open returns for this customer if requested
    if (settlementDetails.settleOpenReturns) {
      setProductReturns(prev => prev.map(ret => {
        const match = ret.customerId === customer.id || 
          (ret.customerName && customer.name && ret.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase());
        if (match && !ret.isRefunded) {
          return {
            ...ret,
            isRefunded: true,
            refundMethod: 'account',
          };
        }
        return ret;
      }));
    }

    const methodMap: Record<string, string> = {
      card: 'کارت به کارت',
      bank_transfer: 'واریز بانکی / حواله',
      cash: 'صندوق نقدی',
      check: 'چک صیادی',
    };
    const methodStr = methodMap[settlementDetails.paymentMethod] || 'حساب بانکی';

    addActivityLog(
      isDebtor ? 'تسویه کامل مانده بدهی مشتری و افزایش نقدینگی' : 'تسویه کامل بستانکاری مشتری',
      isDebtor 
        ? `مانده بدهی مشتری «${customer.name}» به مبلغ ${formatPrice(absAmt)} به صورت کامل تسویه گردید و از طریق ${methodStr} به نقدینگی و دارایی‌ها اضافه شد.`
        : `مانده بستانکاری مشتری «${customer.name}» به مبلغ ${formatPrice(absAmt)} تسویه و از طریق ${methodStr} پرداخت گردید.`,
      'payment',
      'customers'
    );
    showAlert(`تسویه کامل حساب «${customer.name}» با موفقیت انجام شد و وضعیت حساب بی‌حساب گردید.`, 'success', 'تسویه کامل حساب');
  };

  // Handle saving new or updated invoice with Inventory Stock Synchronization!
  const handleSaveInvoice = (savedInvoice: Invoice, newProductsToCreate?: Product[]) => {
    const existingIndex = invoices.findIndex(i => i.id === savedInvoice.id);

    // If brand-new products were defined during this invoice session, merge them in only upon final save
    let baseProducts = [...products];
    if (newProductsToCreate && newProductsToCreate.length > 0) {
      newProductsToCreate.forEach(np => {
        if (!baseProducts.some(p => p.id === np.id)) {
          baseProducts.push(np);
        }
      });
    }

    // Compute stock changes using net deltas per product to prevent intermediate clamping errors
    const productDeltaMap = new Map<string, number>();

    if (existingIndex >= 0) {
      const oldInvoice = invoices[existingIndex];
      // Revert old invoice items ONLY if old invoice was NOT a draft
      if (!oldInvoice.isDraft) {
        oldInvoice.items.forEach(oldItem => {
          const currentDelta = productDeltaMap.get(oldItem.productId) || 0;
          // Reverting old invoice: if sale, stock was subtracted so add it back (+). If purchase, stock was added so subtract it (-).
          const revertDelta = oldInvoice.type === 'sale' ? oldItem.totalPieces : -oldItem.totalPieces;
          productDeltaMap.set(oldItem.productId, currentDelta + revertDelta);
        });
      }
    }

    // Apply new invoice items ONLY if saved invoice is NOT a draft
    if (!savedInvoice.isDraft) {
      savedInvoice.items.forEach(newItem => {
        const currentDelta = productDeltaMap.get(newItem.productId) || 0;
        // Applying new invoice: if sale, subtract from stock (-). If purchase, add to stock (+).
        const applyDelta = savedInvoice.type === 'sale' ? -newItem.totalPieces : newItem.totalPieces;
        productDeltaMap.set(newItem.productId, currentDelta + applyDelta);
      });
    }

    let updatedProducts = baseProducts.map(p => {
      let updatedP = p;
      const delta = productDeltaMap.get(p.id);
      if (delta !== undefined && delta !== 0) {
        updatedP = {
          ...updatedP,
          stockPieces: Math.max(0, updatedP.stockPieces + delta),
        };
      }
      // Sync packaging specs, unit title, name, category, and pricing from invoice items into product catalog
      const itemInInv = savedInvoice.items.find(it => it.productId === p.id || (p.name && it.productName && it.productName.trim().toLowerCase() === p.name.trim().toLowerCase()));
      if (itemInInv) {
        const itemPacks = Number(itemInInv.packsCount) > 0 ? Number(itemInInv.packsCount) : updatedP.packsPerCarton;
        const itemPpp = Number(itemInInv.piecesPerPack) > 0 ? Number(itemInInv.piecesPerPack) : updatedP.piecesPerPack;
        const itemPpc = Number(itemInInv.piecesPerCarton) > 0 ? Number(itemInInv.piecesPerCarton) : updatedP.piecesPerCarton;

        updatedP = {
          ...updatedP,
          name: itemInInv.productName?.trim() || updatedP.name,
          category: (itemInInv as any).category || updatedP.category,
          packsPerCarton: itemPacks || updatedP.packsPerCarton,
          piecesPerPack: itemPpp || updatedP.piecesPerPack,
          piecesPerCarton: itemPpc || updatedP.piecesPerCarton,
          unitTitle: itemInInv.unitTitle || updatedP.unitTitle,
          purchasePrice: (savedInvoice.type === 'purchase' && itemInInv.unitPurchasePrice > 0) ? itemInInv.unitPurchasePrice : updatedP.purchasePrice,
          sellingPrice: (itemInInv.unitSellingPrice && itemInInv.unitSellingPrice > 0) ? itemInInv.unitSellingPrice : updatedP.sellingPrice,
          updatedAt: Date.now()
        };
      }
      return updatedP;
    });

    // Ensure any newly defined item in the invoice also gets registered in master product catalog
    savedInvoice.items.forEach(it => {
      const exists = updatedProducts.some(p => p.id === it.productId || (p.name && it.productName && p.name.trim().toLowerCase() === it.productName.trim().toLowerCase()));
      if (!exists && it.productName) {
        const itemPacks = Number(it.packsCount) > 0 ? Number(it.packsCount) : 1;
        const itemPpp = Number(it.piecesPerPack) > 0 ? Number(it.piecesPerPack) : 1;
        const itemPpc = Number(it.piecesPerCarton) > 0 ? Number(it.piecesPerCarton) : (itemPacks * itemPpp);
        const newProd: Product = {
          id: it.productId || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: it.productName.trim(),
          category: (it as any).category || 'متفرقه',
          purchasePrice: it.unitPurchasePrice || 0,
          sellingPrice: it.unitSellingPrice || 0,
          stockPieces: savedInvoice.type === 'purchase' ? (it.totalPieces || 0) : 0,
          piecesPerCarton: itemPpc,
          packsPerCarton: itemPacks,
          piecesPerPack: itemPpp,
          unitTitle: it.unitTitle || 'عدد',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        updatedProducts.unshift(newProd);
      }
    });

    setProducts(updatedProducts);

    let nextInvoices: Invoice[];
    if (existingIndex >= 0) {
      nextInvoices = [...invoices];
      nextInvoices[existingIndex] = savedInvoice;
    } else {
      nextInvoices = [savedInvoice, ...invoices];
    }
    setInvoices(nextInvoices);
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(nextInvoices));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    } catch (e) {
      console.error('Failed to immediately persist invoice/products', e);
    }

    // Atomic Treasury Transaction synchronization for real-time accurate Liquidity
    const invId = savedInvoice.id;
    const invNum = savedInvoice.invoiceNumber;
    const invoiceRefCode = `INV-${invId}`;

    // Cleanly purge ANY previous treasury transactions tied to this invoice across all identifiers
    let nextTreasury = treasuryTransactions.filter(t => {
      if (t.referenceCode === invoiceRefCode) return false;
      if (invNum && t.referenceCode === `INV-${invNum}`) return false;
      if (t.id === `treasury-inv-${invId}`) return false;
      if (t.id.startsWith(`treasury-inv-exp-${invId}`)) return false;
      if (invNum && t.id === `treasury-inv-${invNum}`) return false;
      if (invNum && t.id.startsWith(`treasury-inv-exp-${invNum}`)) return false;
      if (t.id.endsWith(invId) || t.id.includes(`inv-${invId}`)) return false;
      return true;
    });

    if (!savedInvoice.isDraft) {
      const isCreditInvoice = savedInvoice.paymentStatus === 'credit' || 
                              savedInvoice.paymentMethod?.includes('نسیه') || 
                              savedInvoice.paymentMethod?.includes('غیر');

      const paidAmt = isCreditInvoice
        ? 0
        : (savedInvoice.paymentStatus === 'cash'
            ? (savedInvoice.paidAmount !== undefined && savedInvoice.paidAmount > 0 ? savedInvoice.paidAmount : savedInvoice.finalAmount)
            : (savedInvoice.paidAmount || 0));

      if (paidAmt > 0) {
        const sourceAccount = savedInvoice.paymentAccount || 'bank';

        if (savedInvoice.type === 'purchase') {
          // Expenses paid directly from liquidity (cash/bank) are recorded separately via expTreasury below.
          // Subtract direct liquidity expenses from main invoice payment to ensure exact matching and zero double-deduction:
          const directExpensesFromLiquidity = (savedInvoice.expenses || [])
            .filter(e => (e.sourceAccount === 'cash' || e.sourceAccount === 'bank') && (Number(e.amount) || 0) > 0)
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

          const effectivePurchasePaidAmt = Math.max(0, paidAmt - directExpensesFromLiquidity);

          if (effectivePurchasePaidAmt > 0) {
            const purchaseExpense: TreasuryTransaction = {
              id: `treasury-inv-${savedInvoice.id}`,
              type: 'expense',
              category: 'خرید کالا (ورود به انبار)',
              amount: effectivePurchasePaidAmt,
              source: sourceAccount,
              date: savedInvoice.date || getCurrentPersianDate(),
              time: savedInvoice.time || getCurrentPersianTime(),
              description: `فاکتور خرید #${toPersianDigits(savedInvoice.invoiceNumber)} - تامین‌کننده ${savedInvoice.customerName || 'تامین‌کننده'}`,
              referenceCode: invoiceRefCode,
              impactOnLiquidity: 'deduct',
              createdAt: Date.now(),
            };
            nextTreasury = [purchaseExpense, ...nextTreasury];
          }
        } else {
          // Direct cash/card receipt from sales: adds to liquidity (deposit)
          const saleInflow: TreasuryTransaction = {
            id: `treasury-inv-${savedInvoice.id}`,
            type: 'deposit',
            category: 'فروش نقدی کالا',
            amount: paidAmt,
            source: sourceAccount,
            date: savedInvoice.date || getCurrentPersianDate(),
            time: savedInvoice.time || getCurrentPersianTime(),
            description: `دریافتی نقدی فاکتور فروش #${toPersianDigits(savedInvoice.invoiceNumber)} - خریدار ${savedInvoice.customerName || 'مشتری متفرقه'}`,
            referenceCode: invoiceRefCode,
            impactOnLiquidity: 'inject',
            createdAt: Date.now(),
          };
          nextTreasury = [saleInflow, ...nextTreasury];
        }
      }

      // Record any freight or operational expenses ONLY if explicitly paid from cash / bank
      if (savedInvoice.expenses && savedInvoice.expenses.length > 0) {
        savedInvoice.expenses.forEach((exp, idx) => {
          const expAmount = Number(exp.amount) || 0;
          const expSource = exp.sourceAccount;
          // STRICT CHECK: Only deduct liquidity if sourceAccount is explicitly 'cash' or 'bank'
          if (expAmount > 0 && (expSource === 'cash' || expSource === 'bank')) {
            const expTreasury: TreasuryTransaction = {
              id: `treasury-inv-exp-${savedInvoice.id}-${exp.id || idx}`,
              type: 'expense',
              category: exp.title || 'کرایه بار و هزینه فاکتور',
              amount: expAmount,
              source: expSource,
              date: savedInvoice.date || getCurrentPersianDate(),
              time: savedInvoice.time || getCurrentPersianTime(),
              description: `هزینه/کرایه (${exp.title || 'کرایه بار'}) فاکتور #${toPersianDigits(savedInvoice.invoiceNumber)} - ${savedInvoice.customerName || ''}`,
              referenceCode: invoiceRefCode,
              impactOnLiquidity: 'deduct',
              createdAt: Date.now() + idx + 1,
            };
            nextTreasury = [expTreasury, ...nextTreasury];
          }
        });
      }
    }
    setTreasuryTransactions(nextTreasury);
    try {
      localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(nextTreasury));
    } catch (e) {
      console.error('Failed to persist treasury transactions on invoice save', e);
    }

    // 🔄 Sync and Settle Offset Product Returns (تهاتر مرجوعی‌ها با فاکتور)
    if (!savedInvoice.isDraft) {
      const currentOffsetIds = new Set(savedInvoice.offsetReturnIds || []);
      setProductReturns(prevReturns => prevReturns.map(ret => {
        // If this return was previously settled by this invoice but unselected during edit:
        if (ret.settlementInvoiceId === savedInvoice.id && !currentOffsetIds.has(ret.id)) {
          return {
            ...ret,
            isRefunded: false,
            refundMethod: undefined,
            settlementInvoiceId: undefined,
            settlementInvoiceNumber: undefined,
            settlementDate: undefined,
          };
        }
        // If marked to be offset by this invoice:
        if (currentOffsetIds.has(ret.id)) {
          return {
            ...ret,
            isRefunded: true,
            refundMethod: 'invoice_offset',
            settlementInvoiceId: savedInvoice.id,
            settlementInvoiceNumber: savedInvoice.invoiceNumber,
            settlementDate: savedInvoice.date || getCurrentPersianDate(),
          };
        }
        return ret;
      }));

      if (savedInvoice.offsetReturnsTotal && savedInvoice.offsetReturnsTotal > 0) {
        addActivityLog(
          `تهاتر مرجوعی در فاکتور #${toPersianDigits(savedInvoice.invoiceNumber)}`,
          `مبلغ ${formatPrice(savedInvoice.offsetReturnsTotal)} بابت مرجوعی‌های تسویه نشده با فاکتور شماره ${toPersianDigits(savedInvoice.invoiceNumber)} تهاتر گردید (دریافت جنس به‌جای مرجوعی).`,
          'return',
          'returns'
        );
      }
    }

    setProducts(updatedProducts);
    setActiveViewingInvoice(savedInvoice);
    setEditingInvoice(null);
    setCurrentTab('view-invoice');

    // Trigger Activity Log Notification
    if (savedInvoice.isDraft) {
      addActivityLog(
        `ثبت پیش‌نویس فاکتور #${toPersianDigits(savedInvoice.invoiceNumber)}`,
        `پیش‌نویس فاکتور برای ${savedInvoice.customerName} ذخیره شد (موجودی انبار دست‌نخورده باقی ماند).`,
        'invoice',
        'invoices'
      );
      showAlert(`پیش‌نویس فاکتور #${toPersianDigits(savedInvoice.invoiceNumber)} با موفقیت ذخیره شد.`, 'success', 'ذخیره پیش‌نویس');
    } else if (savedInvoice.type === 'purchase') {
      const itemsList = savedInvoice.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const ppc = prod?.piecesPerCarton || item.piecesPerCarton || 1;
        return `«${item.productName}» (${formatStockBreakdown(item.totalPieces, ppc)})`;
      }).join('، ');

      addActivityLog(
        `شارژ انبار (فاکتور خرید #${toPersianDigits(savedInvoice.invoiceNumber)})`,
        `اقلام فاکتور خرید از تامین‌کننده «${savedInvoice.customerName}» در انبار شارژ شدند: ${itemsList}`,
        'product',
        'inventory'
      );
      showAlert(`فاکتور خرید #${toPersianDigits(savedInvoice.invoiceNumber)} ثبت گردید و نقدینگی و انبار به‌روزرسانی شد.`, 'success', 'ثبت فاکتور خرید');
    } else {
      const itemsList = savedInvoice.items.map(item => {
        const prod = products.find(p => p.id === item.productId);
        const ppc = prod?.piecesPerCarton || item.piecesPerCarton || 1;
        return `«${item.productName}» (${formatStockBreakdown(item.totalPieces, ppc)})`;
      }).join('، ');

      addActivityLog(
        `صدور فاکتور فروش #${toPersianDigits(savedInvoice.invoiceNumber)}`,
        `فاکتور فروش برای مشتری «${savedInvoice.customerName}» صادر شد. اقلام کسر شده: ${itemsList}`,
        'invoice',
        'invoices'
      );
      showAlert(`فاکتور فروش #${toPersianDigits(savedInvoice.invoiceNumber)} با موفقیت ثبت و نقدینگی به‌روزرسانی شد.`, 'success', 'صدور فاکتور فروش');

      // Check if any product's stock dropped to 0 after this sale!
      savedInvoice.items.forEach(item => {
        const updatedProd = updatedProducts.find(p => p.id === item.productId);
        const oldProd = products.find(p => p.id === item.productId);
        if (updatedProd && updatedProd.stockPieces === 0 && (oldProd && oldProd.stockPieces > 0)) {
          addActivityLog(
            'هشدار اتمام موجودی کالا',
            `موجودی کالای «${updatedProd.name}» پس از صدور فاکتور فروش #${toPersianDigits(savedInvoice.invoiceNumber)} به اتمام رسید (صفر شد). لطفاً جهت شارژ انبار اقدام فرمایید.`,
            'warning',
            'inventory'
          );
        }
      });
    }
  };

  // Handle Delete Invoice (restores stock if not draft) with optional biometric/password check
  const executeDeleteInvoice = (invoiceId: string) => {
    const targetInvoice = invoices.find(i => i.id === invoiceId);
    if (!targetInvoice) return;

    // Create automatic safety pre-delete snapshot before removing invoice
    try {
      createSafetyPreDeleteSnapshot(
        products,
        invoices,
        customers,
        payments,
        settings,
        `حذف فاکتور #${toPersianDigits(targetInvoice.invoiceNumber)} (${targetInvoice.type === 'purchase' ? 'خرید/ورود' : 'فروش'})`,
        productReturns,
        treasuryTransactions,
        activityLogs
      );
    } catch (e) {
      console.warn('Could not create safety snapshot before invoice deletion', e);
    }

    // Restore stock ONLY if the invoice was NOT a draft
    if (!targetInvoice.isDraft) {
      const updatedProducts = [...products];
      targetInvoice.items.forEach(item => {
        const prodIndex = updatedProducts.findIndex(p => p.id === item.productId);
        if (prodIndex >= 0) {
          const delta = targetInvoice.type === 'sale' ? item.totalPieces : -item.totalPieces;
          updatedProducts[prodIndex] = {
            ...updatedProducts[prodIndex],
            stockPieces: Math.max(0, updatedProducts[prodIndex].stockPieces + delta),
          };
        }
      });
      setProducts(updatedProducts);
    }

    // Clean up associated treasury transactions to maintain exact liquidity balance
    const invoiceRefCode = `INV-${targetInvoice.id}`;
    setTreasuryTransactions(prev => prev.filter(t => t.referenceCode !== invoiceRefCode));

    // Revert any product returns that were settled by this invoice
    setProductReturns(prevReturns => prevReturns.map(ret => {
      if (ret.settlementInvoiceId === invoiceId) {
        return {
          ...ret,
          isRefunded: false,
          refundMethod: undefined,
          settlementInvoiceId: undefined,
          settlementInvoiceNumber: undefined,
          settlementDate: undefined,
        };
      }
      return ret;
    }));

    const remainingInvoices = invoices.filter(i => i.id !== invoiceId);
    setInvoices(remainingInvoices);
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(remainingInvoices));
    } catch (e) {
      console.error('Failed to immediately persist deleted invoice', e);
    }

    if (activeViewingInvoice?.id === invoiceId) {
      if (remainingInvoices.length > 0) {
        setActiveViewingInvoice(remainingInvoices[0]);
      } else {
        setCurrentTab('invoices');
      }
    }

    addActivityLog(
      `حذف فاکتور #${toPersianDigits(targetInvoice.invoiceNumber)}`,
      `فاکتور مربوط به ${targetInvoice.customerName} از سیستم حذف شد و موجودی انبار اصلاح گردید.`,
      'invoice',
      'invoices'
    );
    showAlert(`فاکتور شماره #${toPersianDigits(targetInvoice.invoiceNumber)} با موفقیت از سیستم حذف شد.`, 'info', 'حذف فاکتور');
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    runWithSecurityCheck(
      `تایید پین‌کد جهت حذف فاکتور ${inv ? `#${toPersianDigits(inv.invoiceNumber)}` : ''}`,
      'برای حذف نهایی فاکتور و اصلاح خودکار موجودی انبار، پین‌کد مدیریت را وارد کنید.',
      'delete',
      () => executeDeleteInvoice(invoiceId)
    );
  };

  // Product actions
  const handleAddProduct = (newProd: Product) => {
    const prodWithTimestamp: Product = {
      ...newProd,
      createdAt: newProd.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    setProducts(prevProducts => {
      const existsIdx = prevProducts.findIndex(p => 
        p.id === prodWithTimestamp.id || 
        (p.name && prodWithTimestamp.name && p.name.trim().toLowerCase() === prodWithTimestamp.name.trim().toLowerCase())
      );
      let nextList: Product[];
      if (existsIdx >= 0) {
        nextList = [...prevProducts];
        nextList[existsIdx] = { ...nextList[existsIdx], ...prodWithTimestamp, id: prevProducts[existsIdx].id };
      } else {
        nextList = [prodWithTimestamp, ...prevProducts];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextList));
      } catch (e) {
        console.error('Failed to save products to localStorage', e);
      }
      return nextList;
    });

    const stockDesc = formatStockBreakdown(newProd.stockPieces, newProd.piecesPerCarton);
    const packaging = formatProductPackagingSpec(newProd);
    const pkgDesc = packaging ? ` (${packaging})` : '';

    addActivityLog(
      'افزودن کالای جدید به انبار',
      `کالای «${newProd.name}» با موجودی اولیه ${stockDesc}${pkgDesc} به انبار اضافه گردید.`,
      'product',
      'inventory'
    );
    showAlert(`کالای «${newProd.name}» با موفقیت به انبار افزوده شد.`, 'success', 'افزودن کالا');

    if (newProd.stockPieces === 0) {
      addActivityLog(
        'هشدار اتمام موجودی کالا',
        `کالای جدید «${newProd.name}» با موجودی صفر ثبت شد و نیازمند سفارش و شارژ انبار است.`,
        'warning',
        'inventory'
      );
    }
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    let matchedPrev: Product | undefined;
    setProducts(prevProducts => {
      matchedPrev = prevProducts.find(p => p.id === updatedProd.id) ||
        (updatedProd.name ? prevProducts.find(p => p.name && p.name.trim().toLowerCase() === updatedProd.name.trim().toLowerCase()) : undefined);

      let nextList: Product[];
      const existsById = prevProducts.some(p => p.id === updatedProd.id);
      if (existsById) {
        nextList = prevProducts.map(p => p.id === updatedProd.id ? { ...p, ...updatedProd } : p);
      } else if (matchedPrev) {
        // Matched by name
        nextList = prevProducts.map(p => p.id === matchedPrev!.id ? { ...p, ...updatedProd, id: p.id } : p);
      } else {
        // Product was newly added or not present in catalog yet, add it
        nextList = [updatedProd, ...prevProducts];
      }

      try {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextList));
      } catch (e) {
        console.error('Failed to save products to localStorage', e);
      }
      return nextList;
    });

    // Synchronize linked invoice items across invoices and draft records
    const prevName = matchedPrev?.name?.trim().toLowerCase();
    const updatedName = updatedProd.name.trim().toLowerCase();
    setInvoices(prevInvoices => {
      let anyInvoiceChanged = false;
      const syncedInvoices = prevInvoices.map(inv => {
        let hasChange = false;
        const syncedItems = inv.items.map(it => {
          const isMatch = (updatedProd.id && it.productId === updatedProd.id) || 
            (matchedPrev?.id && it.productId === matchedPrev.id) ||
            (prevName && it.productName && it.productName.trim().toLowerCase() === prevName) ||
            (updatedName && it.productName && it.productName.trim().toLowerCase() === updatedName);

          if (isMatch) {
            hasChange = true;
            const ppc = updatedProd.piecesPerCarton || 1;
            const packs = updatedProd.packsPerCarton || 0;
            const ppp = updatedProd.piecesPerPack || 0;
            const cartons = ppc > 1 ? Math.floor(it.totalPieces / ppc) : (it.cartonsCount || 0);
            const extra = ppc > 1 ? (it.totalPieces % ppc) : (it.extraPieces || 0);
            return {
              ...it,
              productId: updatedProd.id,
              productName: updatedProd.name,
              category: updatedProd.category || (it as any).category,
              unitTitle: updatedProd.unitTitle || it.unitTitle,
              piecesPerCarton: ppc,
              packsCount: packs > 0 ? (cartons * packs) : (it.packsCount || 0),
              piecesPerPack: ppp > 0 ? ppp : (it.piecesPerPack || 0),
              cartonsCount: cartons,
              extraPieces: extra,
            };
          }
          return it;
        });

        if (hasChange) {
          anyInvoiceChanged = true;
          return { ...inv, items: syncedItems };
        }
        return inv;
      });

      if (anyInvoiceChanged) {
        try {
          localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(syncedInvoices));
        } catch (e) {
          console.error('Failed to sync invoices to localStorage', e);
        }
      }

      return anyInvoiceChanged ? syncedInvoices : prevInvoices;
    });

    if (matchedPrev) {
      const prevStock = matchedPrev.stockPieces;
      const newStock = updatedProd.stockPieces;

      if (newStock > prevStock) {
        // Product charged / restocked
        const addedPieces = newStock - prevStock;
        const addedText = formatStockBreakdown(addedPieces, updatedProd.piecesPerCarton);
        const totalText = formatStockBreakdown(newStock, updatedProd.piecesPerCarton);

        addActivityLog(
          'شارژ موجودی کالا',
          `تعداد ${addedText} به موجودی کالای «${updatedProd.name}» اضافه گردید. (موجودی کل جدید: ${totalText})`,
          'product',
          'inventory'
        );
      } else if (prevStock > 0 && newStock === 0) {
        // Stock reached zero
        addActivityLog(
          'هشدار اتمام موجودی کالا',
          `موجودی کالای «${updatedProd.name}» به اتمام رسید (صفر شد). جهت شارژ انبار و خرید اقدام فرمایید.`,
          'warning',
          'inventory'
        );
      } else if (newStock < prevStock) {
        // Stock decreased manually
        const reducedPieces = prevStock - newStock;
        const reducedText = formatStockBreakdown(reducedPieces, updatedProd.piecesPerCarton);
        const totalText = formatStockBreakdown(newStock, updatedProd.piecesPerCarton);

        addActivityLog(
          'کاهش موجودی کالا',
          `تعداد ${reducedText} از موجودی کالای «${updatedProd.name}» کسر شد. (موجودی باقیمانده: ${totalText})`,
          'product',
          'inventory'
        );
      } else {
        const isPackagingChanged = matchedPrev && (
          matchedPrev.piecesPerCarton !== updatedProd.piecesPerCarton ||
          matchedPrev.packsPerCarton !== updatedProd.packsPerCarton ||
          matchedPrev.piecesPerPack !== updatedProd.piecesPerPack ||
          matchedPrev.leavesPerPiece !== updatedProd.leavesPerPiece ||
          matchedPrev.unitTitle !== updatedProd.unitTitle ||
          matchedPrev.isUnpackaged !== updatedProd.isUnpackaged ||
          matchedPrev.isCartonUnknown !== updatedProd.isCartonUnknown
        );

        if (isPackagingChanged) {
          addActivityLog(
            'تغییر بسته‌بندی کالا و ثبت پشتیبان',
            `مشخصات بسته‌بندی و تعداد در کارتن کالای «${updatedProd.name}» ویرایش و در نسخه پشتیبان دیتابیس ثبت گردید.`,
            'product',
            'inventory'
          );
        } else {
          // Specification or price updated
          addActivityLog(
            'بروزرسانی مشخصات کالا',
            `مشخصات و قیمت‌های کالای «${updatedProd.name}» ویرایش و ذخیره شد.`,
            'product',
            'inventory'
          );
        }
      }
    } else {
      addActivityLog(
        'بروزرسانی کالا',
        `مشخصات کالای «${updatedProd.name}» در انبار بروزرسانی شد.`,
        'product',
        'inventory'
      );
    }
    const isPackagingChanged = matchedPrev && (
      matchedPrev.piecesPerCarton !== updatedProd.piecesPerCarton ||
      matchedPrev.packsPerCarton !== updatedProd.packsPerCarton ||
      matchedPrev.piecesPerPack !== updatedProd.piecesPerPack ||
      matchedPrev.leavesPerPiece !== updatedProd.leavesPerPiece ||
      matchedPrev.unitTitle !== updatedProd.unitTitle ||
      matchedPrev.isUnpackaged !== updatedProd.isUnpackaged ||
      matchedPrev.isCartonUnknown !== updatedProd.isCartonUnknown
    );
    const alertMsg = isPackagingChanged
      ? `بسته‌بندی کالای «${updatedProd.name}» به‌روزرسانی و در نسخه پشتیبان دیتابیس ذخیره شد.`
      : `مشخصات و موجودی کالای «${updatedProd.name}» با موفقیت به‌روزرسانی شد.`;
    showAlert(alertMsg, 'success', isPackagingChanged ? 'تغییر بسته‌بندی کالا' : 'ویرایش کالا');
  };

  const handleRestockProduct = (
    updatedProd: Product,
    piecesAdded: number,
    totalCost: number,
    paymentAccount: 'bank' | 'cash' | 'none'
  ) => {
    handleUpdateProduct(updatedProd);

    if (paymentAccount !== 'none' && totalCost > 0) {
      const newTransaction: TreasuryTransaction = {
        id: `treasury-restock-${Date.now()}`,
        type: 'expense',
        category: 'خرید کالا (ورود به انبار)',
        amount: totalCost,
        source: paymentAccount,
        date: getCurrentPersianDate(),
        time: getCurrentPersianTime(),
        description: `شارژ سریع کالای «${updatedProd.name}» (${toPersianDigits(piecesAdded)} عدد با فی خرید ${formatPrice(updatedProd.purchasePrice)})`,
        referenceCode: `RESTOCK-${updatedProd.id}-${Date.now()}`,
        impactOnLiquidity: 'deduct',
        createdAt: Date.now(),
      };
      setTreasuryTransactions(prev => [newTransaction, ...prev]);

      addActivityLog(
        'کسر هزینه ورود کالا از نقدینگی',
        `مبلغ ${formatPrice(totalCost)} بابت شارژ کالای «${updatedProd.name}» از ${paymentAccount === 'bank' ? 'حساب بانکی' : 'صندوق نقدی'} کسر گردید.`,
        'payment',
        'liquidity'
      );
      showAlert(`شارژ انبار ثبت و مبلغ ${formatPrice(totalCost)} از ${paymentAccount === 'bank' ? 'حساب بانکی' : 'صندوق'} کسر گردید.`, 'success', 'ثبت شارژ و به‌روزرسانی نقدینگی');
    }
  };

  const handleDeleteProduct = (productId: string) => {
    const target = products.find(p => p.id === productId);
    setProducts(products.filter(p => p.id !== productId));
    if (target) {
      addActivityLog(
        'حذف کالا از انبار',
        `کالای «${target.name}» از لیست انبار حذف گردید.`,
        'product',
        'inventory'
      );
      showAlert(`کالای «${target.name}» با موفقیت از انبار حذف گردید.`, 'info', 'حذف کالا');
    }
  };

  // View / Edit triggers with origin awareness for logical back navigation
  const handleViewInvoice = (inv: Invoice, customOrigin?: AppTab) => {
    const origin = customOrigin || (currentTab !== 'view-invoice' && currentTab !== 'new-invoice' ? currentTab : invoiceOriginTab);
    setInvoiceOriginTab(origin);
    setActiveViewingInvoice(inv);
    setCurrentTab('view-invoice');
  };

  const executeEditInvoice = (inv: Invoice, customOrigin?: AppTab) => {
    const origin = customOrigin || (currentTab !== 'new-invoice' ? currentTab : invoiceOriginTab);
    setInvoiceOriginTab(origin);
    setEditingInvoice(inv);
    setCurrentTab('new-invoice');
  };

  const handleStartEditInvoice = (inv: Invoice, customOrigin?: AppTab) => {
    const origin = customOrigin || (currentTab !== 'new-invoice' ? currentTab : invoiceOriginTab);
    runWithSecurityCheck(
      `تایید پین‌کد جهت ویرایش فاکتور #${toPersianDigits(inv.invoiceNumber)}`,
      'برای ویرایش فاکتور و بازنگری اقلام و مبالغ، پین‌کد مدیریت را وارد کنید.',
      'edit',
      () => executeEditInvoice(inv, origin)
    );
  };

  const handleStartNewInvoice = (type: 'sale' | 'purchase' = 'sale', customOrigin?: AppTab) => {
    const origin = customOrigin || (currentTab !== 'new-invoice' ? currentTab : invoiceOriginTab);
    setInvoiceOriginTab(origin);
    setActiveViewingInvoice(null);
    setEditingInvoice({
      id: '',
      type,
      invoiceNumber: String(Math.floor(1000 + Math.random() * 9000)),
      date: getCurrentPersianDate(),
      time: getCurrentPersianTime(),
      customerName: '',
      customerPhone: '',
      customerCity: '',
      customerAddress: '',
      items: [],
      subtotal: 0,
      totalAmount: 0,
      discount: 0,
      tax: 0,
      finalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0,
      paymentMethod: 'نقدی (تسویه شده کامل)',
      paymentStatus: 'cash',
      paymentAccount: 'bank',
      isDraft: false,
      salesType: type === 'purchase' ? 'خرید کالا (ورود به انبار)' : 'نقدی عادی (تا ۱۰۰ میلیون تومان)',
      createdAt: Date.now()
    } as any);
    setCurrentTab('new-invoice');
  };

  const handleInvoiceViewBack = () => {
    setActiveViewingInvoice(null);
    if (invoiceOriginTab === 'customers') {
      setCurrentTab('customers');
    } else if (invoiceOriginTab === 'dashboard') {
      setCurrentTab('dashboard');
    } else if (invoiceOriginTab === 'profit-loss') {
      setCurrentTab('profit-loss');
    } else if (invoiceOriginTab === 'inventory') {
      setCurrentTab('inventory');
    } else {
      setCurrentTab('invoices');
    }
  };

  const handleInvoiceEditorCancel = () => {
    setEditingInvoice(null);
    if (invoiceOriginTab === 'view-invoice' && activeViewingInvoice) {
      setCurrentTab('view-invoice');
    } else if (invoiceOriginTab === 'customers') {
      setCurrentTab('customers');
    } else if (invoiceOriginTab === 'dashboard') {
      setCurrentTab('dashboard');
    } else if (invoiceOriginTab === 'profit-loss') {
      setCurrentTab('profit-loss');
    } else if (invoiceOriginTab === 'inventory') {
      setCurrentTab('inventory');
    } else {
      setCurrentTab('invoices');
    }
  };

  // Backup export / import
  const handleExportData = () => {
    const currentPaymentsList = payments || [];
    const customersWithPayments = (customers || []).map(c => ({
      ...c,
      payments: currentPaymentsList.filter(p => p.customerId === c.id)
    }));

    const draftInvoices = (invoices || []).filter(i => i.isDraft === true);
    
    // Read custom categories
    let inventoryCategories: string[] = [];
    try {
      const savedCats = localStorage.getItem('bazargani_inventory_categories');
      if (savedCats) inventoryCategories = JSON.parse(savedCats);
    } catch {
      inventoryCategories = [];
    }

    let expenseCategories: string[] = [];
    try {
      const savedExpCats = localStorage.getItem('app_expense_categories');
      if (savedExpCats) expenseCategories = JSON.parse(savedExpCats);
    } catch {
      expenseCategories = [];
    }

    const exportBundle = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      summary: {
        productsCount: products.length,
        invoicesCount: invoices.length,
        draftsCount: draftInvoices.length,
        customersCount: customers.length,
        paymentsCount: currentPaymentsList.length,
        returnsCount: productReturns.length,
        treasuryCount: treasuryTransactions.length,
        activityLogsCount: activityLogs.length,
        categoriesCount: inventoryCategories.length + expenseCategories.length,
      },
      products,
      invoices,
      draftInvoices,
      drafts: draftInvoices,
      customers: customersWithPayments,
      payments: currentPaymentsList,
      customerPayments: currentPaymentsList, // Extra key for max compatibility
      paymentsList: currentPaymentsList,
      productReturns: productReturns || [],
      returns: productReturns || [],
      treasuryTransactions: treasuryTransactions || [],
      treasury: treasuryTransactions || [],
      liquidity: treasuryTransactions || [],
      activityLogs: activityLogs || [],
      categories: inventoryCategories,
      customCategories: inventoryCategories,
      expenseCategories: expenseCategories,
      settings,
    };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = getCurrentPersianDate().replace(/\//g, '-');
    a.download = `bazargani-backup-${dateStr}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    addActivityLog(
      'استخراج فایل پشتیبان دیتابیس',
      `یک نسخه جامع از کل داده‌های سیستم شامل محصولات، فاکتورها، پیش‌نویس‌ها، دسته‌بندی‌ها، حساب مشتریان، ${toPersianDigits(productReturns.length)} سند مرجوعی، ${toPersianDigits(treasuryTransactions.length)} تراکنش نقدینگی و خزانه‌داری در قالب یک فایل JSON استخراج گردید.`,
      'backup'
    );
    showAlert('فایل پشتیبان کامل سیستم با موفقیت تولید و دانلود شد.', 'success', 'پشتیبان‌گیری');
  };

  const handleImportFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const rawParsed = JSON.parse(evt.target?.result as string);
        if (!rawParsed) {
          showAlert('فایل انتخاب‌شده خالی یا معتبر نمی‌باشد.', 'error', 'خطا در بارگذاری');
          return;
        }

        // Support direct export bundles, snapshot objects, or nested data structures
        const bundle = (rawParsed.data && typeof rawParsed.data === 'object' && !Array.isArray(rawParsed.data))
          ? rawParsed.data
          : rawParsed;

        if (
          bundle.products ||
          bundle.invoices ||
          bundle.draftInvoices ||
          bundle.drafts ||
          bundle.customers ||
          bundle.settings ||
          bundle.payments ||
          bundle.customerPayments ||
          bundle.paymentsList ||
          bundle.productReturns ||
          bundle.returns ||
          bundle.treasuryTransactions ||
          bundle.treasury ||
          bundle.liquidity ||
          bundle.categories ||
          bundle.customCategories
        ) {
          if (Array.isArray(bundle.products)) {
            setProducts(bundle.products);
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(bundle.products));
          }

          let allInvoices: Invoice[] = [];
          if (Array.isArray(bundle.invoices)) {
            allInvoices = [...bundle.invoices];
          }

          // If separate drafts array exists in legacy/custom backups, merge them
          const extraDrafts = Array.isArray(bundle.draftInvoices) ? bundle.draftInvoices : (Array.isArray(bundle.drafts) ? bundle.drafts : []);
          extraDrafts.forEach((d: Invoice) => {
            if (d && d.id && !allInvoices.some(inv => inv.id === d.id)) {
              allInvoices.push({ ...d, isDraft: true });
            }
          });

          if (allInvoices.length > 0 || Array.isArray(bundle.invoices)) {
            setInvoices(allInvoices);
            localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(allInvoices));
          }

          if (bundle.settings) {
            setSettings(bundle.settings);
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(bundle.settings));
          }

          if (Array.isArray(bundle.customers)) {
            setCustomers(bundle.customers);
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(bundle.customers));
          }

          // Extract payments with fallbacks (top-level keys or embedded inside customers)
          let importedPayments: CustomerPayment[] = [];
          const rawPayments = bundle.payments || bundle.customerPayments || bundle.paymentsList || bundle.customer_payments;
          if (Array.isArray(rawPayments)) {
            importedPayments = rawPayments.map((p: any) => ({
              ...p,
              amount: Number(p.amount) || 0
            }));
          }

          if (Array.isArray(bundle.customers)) {
            bundle.customers.forEach((cust: any) => {
              if (Array.isArray(cust.payments)) {
                cust.payments.forEach((p: any) => {
                  if (p && p.id && !importedPayments.some(existing => existing.id === p.id)) {
                    importedPayments.push({
                      ...p,
                      amount: Number(p.amount) || 0
                    });
                  }
                });
              }
            });
          }

          setPayments(importedPayments);
          localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(importedPayments));

          // Extract and restore product returns
          const rawReturns = bundle.productReturns || bundle.returns;
          let importedReturns: ProductReturn[] = [];
          if (Array.isArray(rawReturns)) {
            importedReturns = rawReturns;
            setProductReturns(importedReturns);
            localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(importedReturns));
          }

          // Extract and restore treasury / liquidity transactions
          const rawTreasury = bundle.treasuryTransactions || bundle.treasury || bundle.liquidity;
          let importedTreasury: TreasuryTransaction[] = [];
          if (Array.isArray(rawTreasury)) {
            importedTreasury = rawTreasury;
            setTreasuryTransactions(importedTreasury);
            localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(importedTreasury));
          }

          // Extract and restore categories
          const rawCats = bundle.categories || bundle.customCategories;
          if (Array.isArray(rawCats)) {
            localStorage.setItem('bazargani_inventory_categories', JSON.stringify(rawCats));
          }
          if (Array.isArray(bundle.expenseCategories)) {
            localStorage.setItem('app_expense_categories', JSON.stringify(bundle.expenseCategories));
          }

          if (Array.isArray(bundle.activityLogs)) {
            setActivityLogs(bundle.activityLogs);
            localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(bundle.activityLogs));
          }

          addActivityLog(
            'بازیابی موفقیت‌آمیز دیتابیس جامع',
            `کلیه داده‌ها شامل کالاها، فاکتورها، پیش‌نویس‌ها، دسته‌بندی‌ها، حساب مشتریان، ${toPersianDigits(importedPayments.length)} واریزی، ${toPersianDigits(importedReturns.length)} مرجوعی، ${toPersianDigits(importedTreasury.length)} سند نقدینگی و اعلان‌ها با موفقیت بازیابی شدند.`,
            'backup'
          );
          showAlert(
            `پشتیبان جامع سیستم (شامل کالاها، فاکتورها، پیش‌نویس‌ها، حساب‌ها، ${toPersianDigits(importedReturns.length)} مرجوعی و ${toPersianDigits(importedTreasury.length)} تراکنش نقدینگی) با موفقیت بازیابی شد.`,
            'success',
            'بازیابی موفقیت‌آمیز داده‌ها'
          );
          setIsSettingsOpen(false);
          setCurrentTab('dashboard');
        } else {
          showAlert('فرمت فایل پشتیبان معتبر نمی‌باشد.', 'error', 'خطای ساختار پشتیبان');
        }
      } catch (err) {
        console.error('Failed to parse backup JSON:', err);
        showAlert('خطا در خواندن فایل JSON. لطفاً از صحت فایل مطمئن شوید.', 'error', 'خطای بارگذاری فایل');
      }
    };
    reader.readAsText(file);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportFile(file);
    }
    e.target.value = '';
  };

  const handleResetToDefault = () => {
    showConfirm(
      'آیا از حذف کامل کلیه داده‌های سیستم (انبار، فاکتورها، مشتریان، واریزی‌ها، مرجوعی و نقدینگی) اطمینان دارید؟\nاین عملیات غیرقابل بازگشت است و تمام اطلاعات موجود را به طور کامل پاک می‌کند.',
      () => {
        setProducts([]);
        setInvoices([]);
        setCustomers([]);
        setPayments([]);
        setProductReturns([]);
        setTreasuryTransactions([]);
        setActiveViewingInvoice(null);
        localStorage.clear();
        showAlert('کلیه داده‌ها و اطلاعات سیستم با موفقیت به‌طور کامل حذف گردیدند.', 'success', 'پاک‌سازی کامل');
        setIsSettingsOpen(false);
      },
      'بازنشانی کامل سیستم',
      'تأیید و حذف داده‌ها',
      'انصراف'
    );
  };

  const handleRestoreSnapshot = (rawSnapshot: any) => {
    if (!rawSnapshot) return;
    const snapshotData = (rawSnapshot.data && typeof rawSnapshot.data === 'object' && !Array.isArray(rawSnapshot.data))
      ? rawSnapshot.data
      : rawSnapshot;

    // Take an instant safety pre-restore snapshot of current live data before replacing
    if (products.length > 0 || invoices.length > 0) {
      try {
        createSafetyPreDeleteSnapshot(
          products,
          invoices,
          customers,
          payments,
          settings,
          'بازگردانی اطلاعات به نسخه پشتیبان',
          productReturns,
          treasuryTransactions,
          activityLogs
        );
      } catch (err) {
        console.error('Safety snapshot failed:', err);
      }
    }

    if (Array.isArray(snapshotData.products)) {
      setProducts(snapshotData.products);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(snapshotData.products));
    }
    let allInvoices: Invoice[] = [];
    if (Array.isArray(snapshotData.invoices)) {
      allInvoices = [...snapshotData.invoices];
    }

    // Merge drafts if provided separately
    const extraDrafts = Array.isArray(snapshotData.draftInvoices) ? snapshotData.draftInvoices : (Array.isArray(snapshotData.drafts) ? snapshotData.drafts : []);
    extraDrafts.forEach((d: Invoice) => {
      if (d && d.id && !allInvoices.some(inv => inv.id === d.id)) {
        allInvoices.push({ ...d, isDraft: true });
      }
    });

    if (allInvoices.length > 0 || Array.isArray(snapshotData.invoices)) {
      setInvoices(allInvoices);
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(allInvoices));
    }
    if (Array.isArray(snapshotData.customers)) {
      setCustomers(snapshotData.customers);
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(snapshotData.customers));
    }

    let importedPayments: CustomerPayment[] = [];
    const rawPayments = snapshotData.payments || snapshotData.customerPayments || snapshotData.paymentsList || snapshotData.customer_payments;
    if (Array.isArray(rawPayments)) {
      importedPayments = rawPayments.map((p: any) => ({
        ...p,
        amount: Number(p.amount) || 0
      }));
    }

    if (Array.isArray(snapshotData.customers)) {
      snapshotData.customers.forEach((cust: any) => {
        if (Array.isArray(cust.payments)) {
          cust.payments.forEach((p: any) => {
            if (p && p.id && !importedPayments.some((existing: any) => existing.id === p.id)) {
              importedPayments.push({
                ...p,
                amount: Number(p.amount) || 0
              });
            }
          });
        }
      });
    }

    setPayments(importedPayments);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(importedPayments));

    // Restore product returns
    const rawReturns = snapshotData.productReturns || snapshotData.returns;
    let importedReturnsCount = 0;
    if (Array.isArray(rawReturns)) {
      setProductReturns(rawReturns);
      localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(rawReturns));
      importedReturnsCount = rawReturns.length;
    }

    // Restore treasury transactions
    const rawTreasury = snapshotData.treasuryTransactions || snapshotData.treasury || snapshotData.liquidity;
    let importedTreasuryCount = 0;
    if (Array.isArray(rawTreasury)) {
      setTreasuryTransactions(rawTreasury);
      localStorage.setItem(STORAGE_KEYS.TREASURY, JSON.stringify(rawTreasury));
      importedTreasuryCount = rawTreasury.length;
    }

    // Restore categories
    const rawCats = snapshotData.categories || snapshotData.customCategories;
    if (Array.isArray(rawCats)) {
      localStorage.setItem('bazargani_inventory_categories', JSON.stringify(rawCats));
    }
    if (Array.isArray(snapshotData.expenseCategories)) {
      localStorage.setItem('app_expense_categories', JSON.stringify(snapshotData.expenseCategories));
    }

    if (Array.isArray(snapshotData.activityLogs)) {
      setActivityLogs(snapshotData.activityLogs);
      localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(snapshotData.activityLogs));
    }
    if (snapshotData.settings) {
      setSettings(snapshotData.settings);
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(snapshotData.settings));
    }

    addActivityLog(
      'بازیابی موفقیت‌آمیز دیتابیس',
      `داده‌ها، ${toPersianDigits(importedPayments.length)} واریزی، ${toPersianDigits(importedReturnsCount)} مرجوعی و ${toPersianDigits(importedTreasuryCount)} تراکنش نقدینگی از روی نسخه پشتیبان بازیابی شدند.`,
      'system'
    );
    showAlert(
      `دیتابیس جامع سیستم با موفقیت به نسخه پشتیبان انتخابی بازگردانی شد.`,
      'success',
      'بازیابی موفقیت‌آمیز'
    );
  };

  const activeTheme = themes[settings.themeColor] || themes.teal;

  if (!isAuthenticated) {
    return (
      <div data-design-mode={settings.designMode || 'modern'}>
        <LoginScreen
          settings={settings}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  return (
    <div 
      data-design-mode={settings.designMode || 'modern'}
      className="min-h-screen bg-[#f8fafc] dark:bg-[#090d16] text-black dark:text-slate-100 flex flex-col font-sans transition-colors"
    >
      {/* Top Header & RTL Sidebar Navigation System */}
      <HeaderNav
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'new-invoice') {
            setEditingInvoice(null);
          }
          setCurrentTab(tab);
        }}
        settings={settings}
        isSecretMode={isSecretMode}
        onToggleSecretMode={handleToggleSecretMode}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
        onOpenSettings={() => setCurrentTab('business-settings')}
        onLockApp={handleLockApp}
        invoicesCount={invoices.length}
        productsCount={products.length}
        customersCount={customers.length}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
        activityLogs={activityLogs}
        onClearActivityLogs={() => {
          runWithSecurityCheck(
            'تایید پین‌کد جهت پاک‌سازی سوابق فعالیت‌ها',
            'برای حذف کلیه سوابق فعالیت‌ها، پین‌کد مدیریت را وارد کنید.',
            'delete',
            () => handleClearActivityLogs()
          );
        }}
        isSecurityLocked={isSecurityLocked}
        onToggleSecurityMode={handleToggleSecurityMode}
        onDesignModeChange={handleDesignModeChange}
      />

      {/* Main View Area with RTL Sidebar Container */}
      <div className={`flex-1 ${isSidebarCollapsed ? 'lg:pr-20' : 'lg:pr-64'} w-full min-w-0 overflow-x-hidden transition-all duration-300`}>
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto min-w-0">
          <AnimatePresence mode="wait">
          {currentTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <DashboardOverview
                invoices={invoices}
                products={products}
                customers={customers}
                payments={payments}
                productReturns={productReturns}
                treasuryTransactions={treasuryTransactions}
                settings={settings}
                activityLogs={activityLogs}
                isSecretMode={isSecretMode}
                onToggleSecretMode={handleToggleSecretMode}
                onNavigateToTab={(tab, filter) => {
                  if (tab === 'new-invoice') {
                    setEditingInvoice(null);
                  }
                  if (tab === 'invoices' && filter) {
                    setInvoicesInitialFilter(filter as 'all' | 'sale' | 'purchase' | 'drafts');
                  }
                  setCurrentTab(tab);
                }}
                onViewInvoice={handleViewInvoice}
                onNewInvoice={handleStartNewInvoice}
              />
            </motion.div>
          )}

          {currentTab === 'view-invoice' && activeViewingInvoice && (
            <motion.div
              key="view-invoice"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <InvoiceView
                invoice={activeViewingInvoice}
                settings={settings}
                isSecretMode={isSecretMode}
                isDarkMode={isDarkMode}
                onToggleSecretMode={handleToggleSecretMode}
                onEdit={handleStartEditInvoice}
                onBack={handleInvoiceViewBack}
                onOpenProfitAnalysis={(inv) => setProfitAnalysisInvoice(inv)}
                products={products}
                productReturns={productReturns}
                customers={customers}
                payments={payments}
                invoices={invoices}
                onShowAlert={showAlert}
                onExportPDF={(inv) => {
                  addActivityLog(
                    'استخراج نسخه PDF فاکتور',
                    `نسخه چاپی PDF فاکتور شماره «${toPersianDigits(inv.invoiceNumber)}» (متعلق به ${inv.customerName || 'مشتری متفرقه'}) با موفقیت دانلود و استخراج گردید.`,
                    'export',
                    'invoices'
                  );
                }}
                onExportImage={(inv) => {
                  addActivityLog(
                    'استخراج نسخه تصویری فاکتور (عکس)',
                    `فایل تصویری JPG/PNG فاکتور شماره «${toPersianDigits(inv.invoiceNumber)}» (متعلق به ${inv.customerName || 'مشتری متفرقه'}) با موفقیت دانلود و استخراج گردید.`,
                    'export',
                    'invoices'
                  );
                }}
              />
            </motion.div>
          )}

          {currentTab === 'invoices' && (
            <motion.div
              key="invoices-list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <InvoiceList
                invoices={invoices}
                products={products}
                settings={settings}
                isSecretMode={isSecretMode}
                productReturns={productReturns}
                initialFilter={invoicesInitialFilter}
                onFilterChange={setInvoicesInitialFilter}
                onViewInvoice={handleViewInvoice}
                onEditInvoice={handleStartEditInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onNewInvoice={handleStartNewInvoice}
                onOpenProfitAnalysis={(inv) => setProfitAnalysisInvoice(inv)}
              />
            </motion.div>
          )}

          {currentTab === 'new-invoice' && (
            <motion.div
              key="new-invoice"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <InvoiceEditor
                key={editingInvoice?.id ? `edit-${editingInvoice.id}-${editingInvoice.type}` : `new-${editingInvoice?.type || 'sale'}`}
                initialInvoice={editingInvoice}
                products={products}
                customers={customers}
                settings={settings}
                isSecretMode={isSecretMode}
                onToggleSecretMode={handleToggleSecretMode}
                onSave={handleSaveInvoice}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onShowAlert={showAlert}
                liquidityBalances={liveLiquidity}
                invoices={invoices}
                payments={payments}
                productReturns={productReturns}
                onCancel={handleInvoiceEditorCancel}
              />
            </motion.div>
          )}

          {currentTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <InventoryManager
                products={products}
                settings={settings}
                isSecretMode={isSecretMode}
                onToggleSecretMode={handleToggleSecretMode}
                runWithSecurityCheck={runWithSecurityCheck}
                onAddProduct={handleAddProduct}
                onRestockProduct={handleRestockProduct}
                onShowAlert={showAlert}
                onUpdateProduct={(prod) => {
                  runWithSecurityCheck(
                    `تایید پین‌کد جهت ویرایش کالای «${prod.name}»`,
                    'برای ذخیره تغییرات، ویرایش موجودی یا مشخصات کالا، پین‌کد مدیریت را وارد کنید.',
                    'edit',
                    () => handleUpdateProduct(prod)
                  );
                }}
                onDeleteProduct={(prodId) => {
                  const target = products.find(p => p.id === prodId);
                  runWithSecurityCheck(
                    `تایید پین‌کد جهت حذف کالای «${target?.name || ''}»`,
                    'برای حذف دائمی این کالا از انبار، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleDeleteProduct(prodId)
                  );
                }}
              />
            </motion.div>
          )}

          {currentTab === 'customers' && (
            <motion.div
              key="customers"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <CustomerManager
                customers={customers}
                invoices={invoices}
                payments={payments}
                settings={settings}
                isDarkMode={isDarkMode}
                productReturns={productReturns}
                runWithSecurityCheck={runWithSecurityCheck}
                onAddCustomer={handleAddCustomer}
                onShowAlert={showAlert}
                onUpdateCustomer={(cust) => {
                  runWithSecurityCheck(
                    `تایید پین‌کد جهت ویرایش حساب مشتری «${cust.name}»`,
                    'برای ثبت تغییرات مشخصات یا مانده حساب مشتری، پین‌کد مدیریت را وارد کنید.',
                    'edit',
                    () => handleUpdateCustomer(cust)
                  );
                }}
                onDeleteCustomer={(custId) => {
                  const target = customers.find(c => c.id === custId);
                  runWithSecurityCheck(
                    `تایید پین‌کد جهت حذف حساب مشتری «${target?.name || ''}»`,
                    'برای حذف حساب این مشتری و سوابق مالی مربوطه، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleDeleteCustomer(custId)
                  );
                }}
                onAddPayment={handleAddPayment}
                onUpdatePayment={(payment) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت ویرایش سند پرداخت مشتری',
                    'برای اعمال تغییرات روی سند پرداخت، پین‌کد مدیریت را وارد کنید.',
                    'edit',
                    () => handleUpdatePayment(payment)
                  );
                }}
                onDeletePayment={(payId) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت حذف سند دریافتی / پرداختی مشتری',
                    'برای حذف این تراکنش از حساب مشتری، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleDeletePayment(payId)
                  );
                }}
                onFullCustomerSettlement={(cust, details) => {
                  runWithSecurityCheck(
                    `تایید پین‌کد جهت تسویه کامل حساب مشتری «${cust.name}»`,
                    'برای ثبت تسویه کامل مانده حساب و بستن پرونده بدهی مشتری، پین‌کد مدیریت را وارد کنید.',
                    'edit',
                    () => handleFullCustomerSettlement(cust, details)
                  );
                }}
                onViewInvoice={handleViewInvoice}
                onEditInvoice={handleStartEditInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onNewInvoiceForCustomer={(cust) => {
                  setInvoiceOriginTab('customers');
                  setActiveViewingInvoice(null);
                  setEditingInvoice({
                    id: `inv-${Date.now()}`,
                    invoiceNumber: String(Math.floor(1000 + Math.random() * 9000)),
                    date: '',
                    time: '',
                    type: 'sale',
                    customerName: cust.name,
                    customerPhone: cust.phone,
                    customerCity: cust.city,
                    customerAddress: cust.address,
                    salesType: 'نقدی عادی (تا ۱۰۰ میلیون تومان)',
                    paymentMethod: 'نقدی (تسویه شده)',
                    previousBalance: cust.initialBalance > 0 ? `${cust.initialBalance.toLocaleString()} بدهکار` : cust.initialBalance < 0 ? `${Math.abs(cust.initialBalance).toLocaleString()} بستانکار` : 'بی‌حساب (۰)',
                    finalCustomerBalance: 'تسویه شده / بی‌حساب',
                    items: [],
                    subtotal: 0,
                    discount: 0,
                    tax: 0,
                    finalAmount: 0,
                    createdAt: Date.now(),
                  });
                  setCurrentTab('new-invoice');
                }}
              />
            </motion.div>
          )}

          {currentTab === 'returns' && (
            <motion.div
              key="returns"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <ReturnsManager
                returns={productReturns}
                products={products}
                customers={customers}
                invoices={invoices}
                settings={settings}
                runWithSecurityCheck={runWithSecurityCheck}
                onAddReturn={handleAddReturn}
                onDeleteReturn={(retId) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت حذف سند مرجوعی کالا',
                    'برای حذف سند مرجوعی و اصلاح مجدد موجودی انبار، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleDeleteReturn(retId)
                  );
                }}
                onUpdateReturn={(retId, fields, updateStock) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت ویرایش سند مرجوعی کالا',
                    'برای ثبت ویرایش‌های سند مرجوعی، پین‌کد مدیریت را وارد کنید.',
                    'edit',
                    () => handleUpdateReturn(retId, fields, updateStock)
                  );
                }}
                onApproveRefund={(retId, method) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت تسویه مالی مرجوعی کالا',
                    'برای ثبت پرداخت وجه مرجوعی و تسویه مالی، پین‌کد مدیریت را وارد کنید.',
                    'edit',
                    () => handleApproveRefund(retId, method)
                  );
                }}
              />
            </motion.div>
          )}

          {currentTab === 'liquidity' && (
            <motion.div
              key="liquidity"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <LiquidityManager
                payments={payments}
                customers={customers}
                settings={settings}
                treasuryTransactions={treasuryTransactions}
                productReturns={productReturns}
                invoices={invoices}
                products={products}
                onAddTreasuryTransaction={(tx) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت ثبت تراکنش جدید در صندوق / بانک',
                    'برای ثبت برداشت، هزینه یا واریزی جدید در نقدینگی انبار، پین‌کد مدیریت را وارد کنید.',
                    'edit',
                    () => handleAddTreasuryTransaction(tx)
                  );
                }}
                onUpdateTreasuryTransaction={(tx) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت ویرایش تراکنش خزانه‌داری / صندوق',
                    'برای ویرایش و اصلاح اطلاعات تراکنش صندوق و نقدینگی، پین‌کد مدیریت را وارد کنید.',
                    'edit',
                    () => handleUpdateTreasuryTransaction(tx)
                  );
                }}
                onDeleteTreasuryTransaction={(txId) => {
                  handleDeleteTreasuryTransaction(txId);
                }}
                onDeletePayment={(paymentId) => {
                  handleDeletePayment(paymentId);
                }}
              />
            </motion.div>
          )}

          {currentTab === 'profit-loss' && (
            <motion.div
              key="profit-loss"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <ProfitLossPage
                invoices={invoices}
                products={products}
                settings={settings}
                isSecretMode={isSecretMode}
                onToggleSecretMode={handleToggleSecretMode}
                onViewInvoice={handleViewInvoice}
              />
            </motion.div>
          )}

          {currentTab === 'activity-logs' && (
            <motion.div
              key="activity-logs"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <ActivityLogPage
                activityLogs={activityLogs}
                onClearActivityLogs={() => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت پاک‌سازی سوابق فعالیت‌ها',
                    'برای حذف کلیه سوابق فعالیت‌ها، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleClearActivityLogs()
                  );
                }}
                onTabChange={(tab) => setCurrentTab(tab)}
                settings={settings}
                onShowConfirm={showConfirm}
                onShowAlert={showAlert}
              />
            </motion.div>
          )}

          {currentTab === 'backup' && (
            <motion.div
              key="backup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <BackupPage
                settings={settings}
                onUpdateSettings={(newSettings) => {
                  setSettings(newSettings);
                  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
                }}
                runWithSecurityCheck={runWithSecurityCheck}
                onExportData={handleExportData}
                onImportData={(file) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت فراخوانی و بازیابی فایل پشتیبان',
                    'برای جایگزینی اطلاعات سیستم با فایل پشتیبان، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleImportFile(file)
                  );
                }}
                onResetToDefault={() => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت بازنشانی و پاک‌سازی کامل دیتابیس',
                    'برای حذف کلیه داده‌های سیستم، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleResetToDefault()
                  );
                }}
                onRestoreSnapshot={(data) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت بازگردانی اطلاعات به نسخه پشتیبان',
                    'برای بازگردانی اطلاعات سیستم به این نسخه، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleRestoreSnapshot(data)
                  );
                }}
                onShowAlert={showAlert}
                onShowConfirm={showConfirm}
                productsCount={products.length}
                invoicesCount={invoices.length}
                draftsCount={invoices.filter(i => i.isDraft).length}
                customersCount={customers.length}
                paymentsCount={payments.length}
                returnsCount={productReturns.length}
                treasuryCount={treasuryTransactions.length}
                activityLogsCount={activityLogs.length}
                currentFullData={{
                  products,
                  invoices,
                  customers,
                  payments,
                  productReturns,
                  returns: productReturns,
                  treasuryTransactions,
                  treasury: treasuryTransactions,
                  liquidity: treasuryTransactions,
                  activityLogs,
                  settings
                }}
              />
            </motion.div>
          )}

          {(currentTab === 'business-settings' || currentTab === 'system-settings') && (
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <SettingsPage
                mode={currentTab === 'business-settings' ? 'business' : 'system'}
                settings={settings}
                runWithSecurityCheck={runWithSecurityCheck}
                products={products}
                invoices={invoices}
                customers={customers}
                payments={payments}
                onSaveSettings={(newSettings) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت ذخیره‌سازی تنظیمات سیستم',
                    'برای ذخیره‌سازی و اعمال تغییرات در تنظیمات برنامه، پین‌کد مدیریت را وارد کنید.',
                    'edit',
                    () => {
                      setSettings(newSettings);
                      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
                    }
                  );
                }}
                onExportData={handleExportData}
                onImportData={(fileOrEvent: any) => {
                  const file = fileOrEvent?.target ? fileOrEvent.target.files?.[0] : fileOrEvent;
                  if (!file) return;
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت فراخوانی فایل پشتیبان',
                    'برای جایگزینی داده‌های سیستم با فایل پشتیبان، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleImportFile(file)
                  );
                }}
                onResetToDefault={() => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت پاک‌سازی و بازنشانی کامل سیستم',
                    'برای حذف کلیه داده‌های دیتابیس، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleResetToDefault()
                  );
                }}
                onRestoreSnapshot={(data) => {
                  runWithSecurityCheck(
                    'تایید پین‌کد جهت بازگردانی دیتابیس به نسخه پشتیبان',
                    'برای بازگردانی اطلاعات سیستم به این نسخه پشتیبان، پین‌کد مدیریت را وارد کنید.',
                    'delete',
                    () => handleRestoreSnapshot(data)
                  );
                }}
                onShowAlert={showAlert}
                onShowConfirm={showConfirm}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </div>

      {/* Security Auth Modal for Edit / Delete / Admin Access */}
      <SecurityAuthModal
        isOpen={securityModalAction.isOpen}
        onClose={() => {
          setPendingProtectedAction(null);
          setSecurityModalAction(prev => ({ ...prev, isOpen: false }));
        }}
        onSuccess={() => {
          const actionToRun = pendingProtectedAction;
          setPendingProtectedAction(null);
          setSecurityModalAction(prev => ({ ...prev, isOpen: false }));
          if (actionToRun) {
            actionToRun();
          } else if (securityModalAction.type === 'edit' && securityModalAction.targetData) {
            executeEditInvoice(securityModalAction.targetData);
          } else if (securityModalAction.type === 'delete' && securityModalAction.targetData) {
            executeDeleteInvoice(securityModalAction.targetData);
          }
        }}
        title={securityModalAction.title}
        subtitle={securityModalAction.subtitle}
        settings={settings}
        actionType={securityModalAction.type}
      />

      {/* Global Search Overlay Modal */}
      {isGlobalSearchOpen && (
        <GlobalSearchModal
          invoices={invoices}
          products={products}
          customers={customers}
          settings={settings}
          isDarkMode={isDarkMode}
          onClose={() => setIsGlobalSearchOpen(false)}
          onNavigateTab={(tab) => setCurrentTab(tab)}
          onViewInvoice={handleViewInvoice}
        />
      )}

      {/* Profit & Loss Analysis Modal */}
      <AnimatePresence>
        {profitAnalysisInvoice && (
          <ProfitAnalysisModal
            invoice={profitAnalysisInvoice}
            settings={settings}
            onClose={() => setProfitAnalysisInvoice(null)}
          />
        )}
      </AnimatePresence>

      {/* Settings Modal (kept as quick fallback if needed) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <SettingsModal
            settings={settings}
            onSaveSettings={(newSettings) => {
              setSettings(newSettings);
              localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
            }}
            onClose={() => setIsSettingsOpen(false)}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetToDefault={handleResetToDefault}
          />
        )}
      </AnimatePresence>
      {/* Floating Animated Toast Notifications (Non-blocking, auto-hides after 2s, themed to selected palette) */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} settings={settings} />

      {/* Confirmation Modal (Only for explicit confirm/cancel dialogs) */}
      <ConfirmModal
        options={confirmModal}
        onClose={() => setConfirmModal(null)}
        settings={settings}
      />
    </div>
  );
}
