import React, { useState, useEffect } from 'react';
import { Customer, CustomerType, Invoice, CustomerPayment, StoreSettings, ProductReturn } from '../types';
import { themes, getThemeBadges } from './ThemeConfig';
import { Pagination } from './Pagination';
import { SortableTableHeader } from './SortableTableHeader';
import { RowUpdateBadge, RowUpdateIcon } from './RowUpdateBadge';
import { 
  formatPrice, 
  toPersianDigits, 
  getCurrentPersianDate, 
  getCurrentPersianTime,
  numberToPersianWords,
  getNetReturnAmount,
  CUSTOMER_TYPE_OPTIONS,
  getCustomerTypeInfo
} from '../utils/formatters';
import {
  getCustomerSalesInvoices,
  getCustomerPurchaseInvoices,
  getCustomerCreditSalesTotal,
  getCustomerPayments,
  getCustomerDepositsTotal as getCustomerDepositsTotalCalc,
  getCustomerManualDebtsTotal as getCustomerManualDebtsTotalCalc,
  getCustomerReturnsFromTotal as getCustomerReturnsFromTotalCalc,
  getCustomerAllReturnsFromTotal as getCustomerAllReturnsFromTotalCalc,
  getCustomerSettledReturnsFromTotal as getCustomerSettledReturnsFromTotalCalc,
  getCustomerReturnsToSupplierTotal as getCustomerReturnsToSupplierTotalCalc,
  calculateCustomerLiveBalance,
  getCustomerFinanceDetails
} from '../utils/customerBalanceCalculations';
import { downloadInvoiceAsImage, copyInvoiceImageToClipboard } from '../utils/exportInvoice';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  MapPin, 
  Building, 
  CreditCard, 
  FileText, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  ShieldCheck,
  Wallet,
  Printer,
  Calendar,
  Clock,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Check,
  CheckCheck,
  History,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronLeft,
  Camera,
  Download,
  Upload,
  Copy,
  Share2,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  RefreshCw,
  Table,
  LayoutGrid,
  Eye,
  RotateCcw,
  Scale,
  Receipt,
  ArrowUpDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Store,
  Truck,
  Repeat,
  Briefcase,
  User,
  Tag,
  MessageCircle,
  Send,
  FileSpreadsheet,
  Package,
  BarChart3,
  Info,
  CalendarDays,
  Filter,
  ExternalLink,
  Save,
  Percent,
  AlertCircle,
  ShoppingBag,
  BadgePercent,
  SlidersHorizontal,
  Smartphone,
  ListOrdered,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomValidationMessage } from './CustomValidationMessage';
import { SmartPriceInput } from './SmartPriceInput';
import { CustomerStatementView } from './CustomerStatementView';

interface CustomerManagerProps {
  customers: Customer[];
  invoices: Invoice[];
  payments: CustomerPayment[];
  settings: StoreSettings;
  isDarkMode?: boolean;
  productReturns?: ProductReturn[];
  runWithSecurityCheck?: (
    title: string,
    subtitle: string,
    actionType?: 'edit' | 'delete',
    onSuccess?: () => void
  ) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onAddPayment: (payment: CustomerPayment) => void;
  onUpdatePayment: (payment: CustomerPayment) => void;
  onDeletePayment: (paymentId: string) => void;
  onFullCustomerSettlement?: (
    customer: Customer,
    details: {
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
  ) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onNewInvoiceForCustomer: (customer: Customer) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
  onShowAlert?: (message: string, type?: 'success' | 'error' | 'warning' | 'info', title?: string) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  customers,
  invoices,
  payments,
  settings,
  isDarkMode = true,
  productReturns = [],
  runWithSecurityCheck,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddPayment,
  onUpdatePayment,
  onDeletePayment,
  onFullCustomerSettlement,
  onViewInvoice,
  onNewInvoiceForCustomer,
  onEditInvoice,
  onDeleteInvoice,
  onShowAlert,
}) => {
  const theme = themes[settings.themeColor] || themes.teal;
  const badges = getThemeBadges(settings.themeColor);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debtor' | 'settled' | 'creditor'>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  
  // Modals & Dedicated View state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<Customer | null>(null);

  // Track recently updated customer & payment for smooth highlight and animated badge without scrolling away
  const [highlightedCustId, setHighlightedCustId] = useState<string | null>(null);
  const [highlightedPaymentId, setHighlightedPaymentId] = useState<string | null>(null);
  const lastCustomerScrollYRef = React.useRef<number>(0);

  const triggerCustomerSuccessHighlight = (custId: string) => {
    if (!custId) return;
    setHighlightedCustId(custId);
    setTimeout(() => {
      const el = document.getElementById(`cust-row-${custId}`) || document.getElementById(`cust-card-${custId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 120);
    setTimeout(() => {
      setHighlightedCustId(prev => (prev === custId ? null : prev));
    }, 4500);
  };

  const triggerPaymentSuccessHighlight = (paymentId: string) => {
    if (!paymentId) return;
    setHighlightedPaymentId(paymentId);
    setTimeout(() => {
      const el = document.getElementById(`ledger-row-${paymentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 120);
    setTimeout(() => {
      setHighlightedPaymentId(prev => (prev === paymentId ? null : prev));
    }, 4500);
  };

  // Auto-scroll to top ONLY when opening a whole customer statement card
  useEffect(() => {
    if (selectedCustomerForStatement) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedCustomerForStatement]);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<CustomerPayment | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<CustomerPayment | null>(null);
  const [targetCustomerForPayment, setTargetCustomerForPayment] = useState<Customer | null>(null);

  // Shot / Image Card Modal state
  const [isShotModalOpen, setIsShotModalOpen] = useState(false);
  const [shotCustomer, setShotCustomer] = useState<Customer | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [isExportingShot, setIsExportingShot] = useState(false);
  const [isCopyingShotImage, setIsCopyingShotImage] = useState(false);
  const [shotThemeMode, setShotThemeMode] = useState<'day' | 'night'>('night');
  const [shotInvoiceLimit, setShotInvoiceLimit] = useState<number>(0);
  const [shotFilterType, setShotFilterType] = useState<'all' | 'invoices' | 'payments'>('all');
  const [shotRecentRowsLimit, setShotRecentRowsLimit] = useState<number>(5);
  const [shotLatestInvItemsLimit, setShotLatestInvItemsLimit] = useState<number>(3); // 3, 5, 0 (all), -1 (hidden)
  const [shotShowSummaryCards, setShotShowSummaryCards] = useState<boolean>(true);
  const [shotShowLatestInvoice, setShotShowLatestInvoice] = useState<boolean>(true);
  const [shotShowAccountSummary, setShotShowAccountSummary] = useState<boolean>(true);
  const [shotShowCustomerContact, setShotShowCustomerContact] = useState<boolean>(true);
  const [shotShowBankInfo, setShotShowBankInfo] = useState<boolean>(true);

  // View Mode & Customer List Pagination State
  const [customerViewMode, setCustomerViewMode] = useState<'table' | 'cards'>('cards');
  type CustomerSortField = 'index' | 'name' | 'phone' | 'balance' | 'type';
  const [custSortField, setCustSortField] = useState<CustomerSortField>('index');
  const [custSortDirection, setCustSortDirection] = useState<'desc' | 'asc'>('desc');
  const customerSortOrder = custSortDirection;
  const setCustomerSortOrder = (fnOrVal: any) => {
    if (typeof fnOrVal === 'function') {
      setCustSortDirection(prev => fnOrVal(prev));
    } else {
      setCustSortDirection(fnOrVal);
    }
  };

  const handleCustomerSort = (field: CustomerSortField) => {
    if (custSortField === field) {
      setCustSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setCustSortField(field);
      setCustSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [customerItemsPerPage, setCustomerItemsPerPage] = useState(20);

  // Statement Ledger Pagination, Sub-Tabs & Advanced Filters
  const [statementTab, setStatementTab] = useState<'ledger' | 'invoices' | 'payments' | 'returns' | 'purchased_items' | 'profile_details'>('ledger');
  const [statementCurrentPage, setStatementCurrentPage] = useState(1);
  const [statementItemsPerPage, setStatementItemsPerPage] = useState(20);
  const [statementSearchTerm, setStatementSearchTerm] = useState('');
  const [statementFilterType, setStatementFilterType] = useState<'all' | 'credit_sales' | 'payments' | 'returns'>('all');
  const [statementDateFilter, setStatementDateFilter] = useState<'all' | 'today' | 'this_month' | 'last_3_months' | 'this_year'>('all');
  const [viewingLedgerDoc, setViewingLedgerDoc] = useState<any | null>(null);

  // Customer Statement Sub-Tab Search & Filter States
  const [statementInvoiceSearch, setStatementInvoiceSearch] = useState('');
  const [statementInvoiceStatusFilter, setStatementInvoiceStatusFilter] = useState<'all' | 'cash' | 'credit' | 'partial'>('all');
  const [statementPaymentSearch, setStatementPaymentSearch] = useState('');
  const [statementPaymentMethodFilter, setStatementPaymentMethodFilter] = useState<'all' | 'card' | 'bank_transfer' | 'cash' | 'check'>('all');
  const [purchasedItemsSort, setPurchasedItemsSort] = useState<'total_spent' | 'count' | 'name'>('total_spent');
  const [purchasedItemsSearch, setPurchasedItemsSearch] = useState('');

  // Inline Customer Notes & Profile Quick Actions
  const [isInlineNotesEditing, setIsInlineNotesEditing] = useState(false);
  const [inlineNotesValue, setInlineNotesValue] = useState('');

  // Debt Reminder & WhatsApp / SMS Sharing Modal State
  const [isDebtReminderModalOpen, setIsDebtReminderModalOpen] = useState(false);
  const [reminderTemplateType, setReminderTemplateType] = useState<'formal' | 'friendly' | 'brief' | 'card_info'>('formal');
  const [reminderCopied, setReminderCopied] = useState(false);

  // Dedicated Balance & Debt Adjustment Modal state
  const [isBalanceAdjModalOpen, setIsBalanceAdjModalOpen] = useState(false);
  const [targetCustomerForBalanceAdj, setTargetCustomerForBalanceAdj] = useState<Customer | null>(null);
  const [balanceAdjType, setBalanceAdjType] = useState<'credit' | 'payout' | 'debt' | 'initial_balance'>('credit');
  const [balanceAdjAmount, setBalanceAdjAmount] = useState<number | ''>('');
  const [balanceAdjDate, setBalanceAdjDate] = useState(getCurrentPersianDate());
  const [balanceAdjTime, setBalanceAdjTime] = useState(getCurrentPersianTime());
  const [balanceAdjMethod, setBalanceAdjMethod] = useState<'card' | 'bank_transfer' | 'cash' | 'check'>('card');
  const [balanceAdjRef, setBalanceAdjRef] = useState('');
  const [balanceAdjNotes, setBalanceAdjNotes] = useState('');

  const handleOpenBalanceAdjModal = (cust?: Customer, defaultType: 'credit' | 'payout' | 'debt' | 'initial_balance' = 'credit') => {
    const selectedCust = cust || (selectedCustomerForStatement ? customers.find(c => c.id === selectedCustomerForStatement.id) || selectedCustomerForStatement : customers[0] || null);
    if (!selectedCust) {
      onShowAlert?.('ابتدا باید حداقل یک مشتری در سیستم ثبت نمایید.', 'warning', 'عدم وجود مشتری');
      return;
    }
    const execute = () => {
      setTargetCustomerForBalanceAdj(selectedCust);
      setBalanceAdjType(defaultType);
      setBalanceAdjAmount(defaultType === 'initial_balance' ? Math.abs(selectedCust.initialBalance || 0) : '');
      setBalanceAdjDate(getCurrentPersianDate());
      setBalanceAdjTime(getCurrentPersianTime());
      setBalanceAdjMethod('card');
      setBalanceAdjRef('');
      setBalanceAdjNotes('');
      setIsBalanceAdjModalOpen(true);
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        `تایید پین‌کد جهت مدیریت حساب و بستانکاری «${selectedCust.name}»`,
        'برای ثبت تغییرات بستانکاری، بدهی یا ویرایش مانده اولیه، پین‌کد مدیریت را وارد کنید.',
        'edit',
        execute
      );
    } else {
      execute();
    }
  };

  const handleSubmitBalanceAdj = (e: React.FormEvent) => {
    e.preventDefault();
    const currentCust = targetCustomerForBalanceAdj || (selectedCustomerForStatement ? customers.find(c => c.id === selectedCustomerForStatement.id) || selectedCustomerForStatement : null);
    if (!currentCust) return;

    const amt = Number(balanceAdjAmount);
    if (balanceAdjType !== 'initial_balance' && (!amt || amt <= 0)) {
      onShowAlert?.('لطفاً مبلغ معتبری را به تومان وارد کنید.', 'warning', 'مبلغ نامعتبر');
      return;
    }

    if (balanceAdjType === 'initial_balance') {
      const updatedCust: Customer = {
        ...currentCust,
        initialBalance: amt,
      };
      onUpdateCustomer(updatedCust);
      setIsBalanceAdjModalOpen(false);
      return;
    }

    if (balanceAdjType === 'credit') {
      const newPay: CustomerPayment = {
        id: `pay-${Date.now()}`,
        customerId: currentCust.id,
        customerName: currentCust.name,
        amount: amt,
        date: balanceAdjDate || getCurrentPersianDate(),
        time: balanceAdjTime || getCurrentPersianTime(),
        paymentMethod: balanceAdjMethod,
        referenceNumber: balanceAdjRef.trim(),
        description: balanceAdjNotes.trim() || 'ثبت بستانکاری و واریزی مشتری',
        createdAt: Date.now(),
      };
      onAddPayment(newPay);
    } else if (balanceAdjType === 'payout') {
      const newPay: CustomerPayment = {
        id: `pay-${Date.now()}`,
        customerId: currentCust.id,
        customerName: currentCust.name,
        amount: -amt,
        date: balanceAdjDate || getCurrentPersianDate(),
        time: balanceAdjTime || getCurrentPersianTime(),
        paymentMethod: balanceAdjMethod,
        referenceNumber: balanceAdjRef.trim(),
        description: balanceAdjNotes.trim() || 'عودت وجه و پرداخت بستانکاری به مشتری',
        createdAt: Date.now(),
      };
      onAddPayment(newPay);
    } else if (balanceAdjType === 'debt') {
      const newPay: CustomerPayment = {
        id: `pay-${Date.now()}`,
        customerId: currentCust.id,
        customerName: currentCust.name,
        amount: -amt,
        date: balanceAdjDate || getCurrentPersianDate(),
        time: balanceAdjTime || getCurrentPersianTime(),
        paymentMethod: balanceAdjMethod,
        referenceNumber: balanceAdjRef.trim(),
        description: balanceAdjNotes.trim() || 'ثبت بدهی جدید / نسیه دستی',
        createdAt: Date.now(),
      };
      onAddPayment(newPay);
    }

    setIsBalanceAdjModalOpen(false);
  };

  // Dedicated 1-Click Full Customer Settlement Modal state
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [targetCustomerForSettlement, setTargetCustomerForSettlement] = useState<Customer | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<'card' | 'bank_transfer' | 'cash' | 'check'>('bank_transfer');
  const [settlementAccountType, setSettlementAccountType] = useState<'bank' | 'cash'>('bank');
  const [settlementRef, setSettlementRef] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [settlementDate, setSettlementDate] = useState(getCurrentPersianDate());
  const [settlementTime, setSettlementTime] = useState(getCurrentPersianTime());
  const [settleOpenInvoicesChecked, setSettleOpenInvoicesChecked] = useState(true);
  const [settleOpenReturnsChecked, setSettleOpenReturnsChecked] = useState(true);

  const handleOpenSettlementModal = (cust?: Customer) => {
    const selectedCust = cust || (selectedCustomerForStatement ? customers.find(c => c.id === selectedCustomerForStatement.id) || selectedCustomerForStatement : customers[0] || null);
    if (!selectedCust) {
      onShowAlert?.('ابتدا باید حداقل یک مشتری در سیستم ثبت نمایید.', 'warning', 'عدم وجود مشتری');
      return;
    }

    const finDetails = getCustomerFinanceDetails(selectedCust, invoices, payments, productReturns);
    const isDebtor = finDetails.liveBalance > 0;
    const isCreditor = finDetails.liveBalance < 0;

    setTargetCustomerForSettlement(selectedCust);
    setSettlementMethod('bank_transfer');
    setSettlementAccountType('bank');
    setSettlementRef('');
    setSettlementDate(getCurrentPersianDate());
    setSettlementTime(getCurrentPersianTime());
    setSettleOpenInvoicesChecked(true);
    setSettleOpenReturnsChecked(true);

    if (isDebtor) {
      setSettlementNotes(`تسویه کامل مانده بدهی مشتری «${selectedCust.name}» (بی‌حساب شدن پرونده)`);
    } else if (isCreditor) {
      setSettlementNotes(`تسویه کامل و پرداخت مانده بستانکاری مشتری «${selectedCust.name}»`);
    } else {
      setSettlementNotes(`تأیید بی‌حساب بودن و تسویه کامل مشتری «${selectedCust.name}»`);
    }

    setIsSettlementModalOpen(true);
  };

  const handleSubmitSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    const currentCust = targetCustomerForSettlement || (selectedCustomerForStatement ? customers.find(c => c.id === selectedCustomerForStatement.id) || selectedCustomerForStatement : null);
    if (!currentCust) return;

    const finDetails = getCustomerFinanceDetails(currentCust, invoices, payments, productReturns);
    const liveBal = finDetails.liveBalance;

    if (liveBal === 0) {
      onShowAlert?.('حساب این مشتری در حال حاضر کاملاً تسویه و بی‌حساب است و هیچ مانده بدهی یا بستانکاری ندارد.', 'info', 'حساب بی‌حساب');
      setIsSettlementModalOpen(false);
      return;
    }

    const execute = () => {
      if (onFullCustomerSettlement) {
        onFullCustomerSettlement(currentCust, {
          settlementAmount: liveBal,
          paymentMethod: settlementMethod,
          accountType: settlementAccountType,
          date: settlementDate || getCurrentPersianDate(),
          time: settlementTime || getCurrentPersianTime(),
          referenceNumber: settlementRef.trim(),
          description: settlementNotes.trim() || (liveBal > 0 ? 'تسویه کامل مانده بدهی مشتری' : 'تسویه بستانکاری مشتری'),
          settleOpenInvoices: settleOpenInvoicesChecked,
          settleOpenReturns: settleOpenReturnsChecked,
        });
      } else {
        onAddPayment({
          id: `pay-settle-${Date.now()}`,
          customerId: currentCust.id,
          customerName: currentCust.name,
          amount: liveBal,
          date: settlementDate || getCurrentPersianDate(),
          time: settlementTime || getCurrentPersianTime(),
          paymentMethod: settlementMethod,
          referenceNumber: settlementRef.trim(),
          description: settlementNotes.trim() || (liveBal > 0 ? 'تسویه کامل مانده بدهی مشتری (بی‌حساب)' : 'تسویه بستانکاری مشتری'),
          createdAt: Date.now(),
        });
        onShowAlert?.(`تسویه حساب مشتری «${currentCust.name}» با موفقیت اعمال گردید.`, 'success', 'تسویه حساب');
      }
      setIsSettlementModalOpen(false);
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        `تایید پین‌کد جهت تسویه کامل حساب «${currentCust.name}»`,
        `برای ثبت تسویه به مبلغ ${formatPrice(Math.abs(liveBal))} و به‌روزرسانی نقدینگی، پین‌کد مدیریت را وارد کنید.`,
        'edit',
        execute
      );
    } else {
      execute();
    }
  };

  const renderCustomerTypeIcon = (iconName: string, className = "w-3.5 h-3.5") => {
    switch (iconName) {
      case 'Store': return <Store className={className} />;
      case 'Truck': return <Truck className={className} />;
      case 'Repeat': return <Repeat className={className} />;
      case 'Briefcase': return <Briefcase className={className} />;
      case 'User':
      default: return <User className={className} />;
    }
  };

  React.useEffect(() => {
    setCustomerCurrentPage(1);
  }, [searchTerm, filterType, customerTypeFilter]);

  React.useEffect(() => {
    setShotThemeMode(isDarkMode ? 'night' : 'day');
  }, [isDarkMode, isShotModalOpen]);

  // Customer Form State
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    company: '',
    customerType: 'regular',
    phone: '',
    city: '',
    address: '',
    nationalCode: '',
    initialBalance: 0,
    creditLimit: 0,
    notes: '',
  });

  // Payment Deposit Form State
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState(getCurrentPersianDate());
  const [paymentTime, setPaymentTime] = useState(getCurrentPersianTime());
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'cash' | 'check'>('card');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [selectedPaymentCustId, setSelectedPaymentCustId] = useState<string>('');

  // Helpers to calculate customer finances
  const getCustomerInvoices = (customer: Customer) => {
    return getCustomerSalesInvoices(customer, invoices);
  };

  const getCustomerCreditInvoicesTotal = (customer: Customer) => {
    return getCustomerCreditSalesTotal(customer, invoices);
  };

  const getCustomerPaymentsList = (customer: Customer) => {
    return getCustomerPayments(customer, payments);
  };

  const getCustomerManualDebtsTotal = (customer: Customer) => {
    return getCustomerManualDebtsTotalCalc(customer, payments);
  };

  const getCustomerDepositsTotal = (customer: Customer) => {
    return getCustomerDepositsTotalCalc(customer, payments);
  };

  const getCustomerReturnsFromTotal = (customer: Customer) => {
    return getCustomerReturnsFromTotalCalc(customer, productReturns);
  };

  const getCustomerAllReturnsTotal = (customer: Customer) => {
    return getCustomerAllReturnsFromTotalCalc(customer, productReturns);
  };

  const getCustomerSettledReturnsTotal = (customer: Customer) => {
    return getCustomerSettledReturnsFromTotalCalc(customer, productReturns);
  };

  const getCustomerReturnsToSupplierTotal = (customer: Customer) => {
    return getCustomerReturnsToSupplierTotalCalc(customer, productReturns);
  };

  const getCustomerPaymentsTotal = (customer: Customer) => {
    return getCustomerDepositsTotalCalc(customer, payments);
  };

  // Live Current Balance
  const getCustomerLiveBalance = (customer: Customer) => {
    return calculateCustomerLiveBalance(customer, invoices, payments, productReturns);
  };

  const [customerFormErrors, setCustomerFormErrors] = useState<{ [key: string]: string }>({});
  const [paymentFormErrors, setPaymentFormErrors] = useState<{ [key: string]: string }>({});

  const resetCustomerForm = () => {
    setCustomerFormErrors({});
    setFormData({
      name: '',
      company: '',
      customerType: 'regular',
      phone: '',
      city: '',
      address: '',
      nationalCode: '',
      initialBalance: 0,
      creditLimit: 0,
      notes: '',
    });
    setEditingCustomer(null);
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetCustomerForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    const execute = () => {
      lastCustomerScrollYRef.current = window.scrollY;
      setCustomerFormErrors({});
      setEditingCustomer(c);
      setFormData({ ...c });
      setIsFormOpen(true);
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        `تایید پین‌کد جهت ویرایش حساب مشتری «${c.name}»`,
        'برای ورود به بخش ویرایش مشخصات و مانده اولیه مشتری، پین‌کد مدیریت را وارد کنید.',
        'edit',
        execute
      );
    } else {
      execute();
    }
  };

  const handleSubmitCustomerForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    if (!formData.name?.trim()) {
      errors.name = 'ورود نام و نام خانوادگی مشتری الزامی است';
    }
    if (!formData.phone?.trim()) {
      errors.phone = 'ورود شماره تماس همراه الزامی است';
    }

    if (Object.keys(errors).length > 0) {
      setCustomerFormErrors(errors);
      return;
    }

    setCustomerFormErrors({});

    if (editingCustomer) {
      const custId = editingCustomer.id;
      onUpdateCustomer({
        ...editingCustomer,
        ...(formData as Customer),
        customerType: (formData.customerType || 'regular') as CustomerType,
        initialBalance: Number(formData.initialBalance || 0),
        creditLimit: Number(formData.creditLimit || 0),
      });
      triggerCustomerSuccessHighlight(custId);
    } else {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name: formData.name.trim(),
        company: formData.company?.trim() || '',
        customerType: (formData.customerType || 'regular') as CustomerType,
        phone: formData.phone.trim(),
        city: formData.city?.trim() || 'نامشخص',
        address: formData.address?.trim() || '',
        nationalCode: formData.nationalCode?.trim() || '',
        initialBalance: Number(formData.initialBalance || 0),
        creditLimit: Number(formData.creditLimit || 0),
        notes: formData.notes?.trim() || '',
        createdAt: Date.now(),
      };
      onAddCustomer(newCustomer);
      triggerCustomerSuccessHighlight(newCustomer.id);
    }

    resetCustomerForm();
  };

  // Handle Register/Edit Payment Modal Open
  const handleOpenPaymentModal = (customer?: Customer) => {
    setEditingPayment(null);
    setPaymentFormErrors({});
    if (customer) {
      setTargetCustomerForPayment(customer);
      setSelectedPaymentCustId(customer.id);
    } else if (customers.length > 0) {
      setTargetCustomerForPayment(customers[0]);
      setSelectedPaymentCustId(customers[0].id);
    }
    setPaymentAmount('');
    setPaymentDate(getCurrentPersianDate());
    setPaymentTime(getCurrentPersianTime());
    setPaymentMethod('card');
    setPaymentRef('');
    setPaymentDescription('');
    setIsPaymentModalOpen(true);
  };

  const handleOpenShotModal = (customer: Customer) => {
    setShotCustomer(customer);
    setCopiedText(false);
    setShotInvoiceLimit(0);
    setIsShotModalOpen(true);
  };

  const handleOpenEditPayment = (payment: CustomerPayment) => {
    const execute = () => {
      setEditingPayment(payment);
      setPaymentFormErrors({});
      setSelectedPaymentCustId(payment.customerId);
      const cust = customers.find(c => c.id === payment.customerId);
      if (cust) setTargetCustomerForPayment(cust);
      setPaymentAmount(Math.abs(payment.amount));
      setPaymentDate(payment.date);
      setPaymentTime(payment.time || getCurrentPersianTime());
      setPaymentMethod(payment.paymentMethod || 'card');
      setPaymentRef(payment.referenceNumber || '');
      setPaymentDescription(payment.description || '');
      setIsPaymentModalOpen(true);
    };

    if (runWithSecurityCheck) {
      runWithSecurityCheck(
        'تایید پین‌کد جهت ویرایش سند دریافتی/پرداختی',
        'برای ورود به بخش ویرایش این سند مالی، پین‌کد مدیریت را وارد کنید.',
        'edit',
        execute
      );
    } else {
      execute();
    }
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [key: string]: string } = {};

    const cust = customers.find((c) => c.id === selectedPaymentCustId) || targetCustomerForPayment;
    if (!cust) {
      errors.customer = 'انتخاب طرف حساب الزامی است';
    }
    const amountNum = Number(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      errors.amount = 'ورود مبلغ معتبر به تومان الزامی است';
    }

    if (Object.keys(errors).length > 0) {
      setPaymentFormErrors(errors);
      return;
    }

    setPaymentFormErrors({});

    if (editingPayment) {
      const isNegative = editingPayment.amount < 0;
      const finalAmt = isNegative ? -Math.abs(amountNum) : Math.abs(amountNum);

      const updatedPayment: CustomerPayment = {
        ...editingPayment,
        customerId: cust.id,
        customerName: cust.name,
        amount: finalAmt,
        date: paymentDate || getCurrentPersianDate(),
        time: paymentTime || getCurrentPersianTime(),
        paymentMethod,
        referenceNumber: paymentRef.trim(),
        description: paymentDescription.trim() || 'ویرایش سند مالی مشتری',
      };
      onUpdatePayment(updatedPayment);
      triggerPaymentSuccessHighlight(updatedPayment.id);
    } else {
      const newPayment: CustomerPayment = {
        id: `pay-${Date.now()}`,
        customerId: cust.id,
        customerName: cust.name,
        amount: amountNum,
        date: paymentDate || getCurrentPersianDate(),
        time: paymentTime || getCurrentPersianTime(),
        paymentMethod,
        referenceNumber: paymentRef.trim(),
        description: paymentDescription.trim() || 'ثبت واریزی و دریافتی از مشتری',
        createdAt: Date.now(),
      };
      onAddPayment(newPayment);
    }
    setIsPaymentModalOpen(false);
    setEditingPayment(null);
  };

  // Filtered Customer List
  const filteredCustomers = customers.filter((c) => {
    const liveBal = getCustomerLiveBalance(c);
    const typeInfo = getCustomerTypeInfo(c.customerType);
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.phone.includes(searchTerm) ||
      c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      typeInfo.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      typeInfo.shortLabel.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Filter by financial balance status
    if (filterType === 'debtor' && liveBal <= 0) return false;
    if (filterType === 'creditor' && liveBal >= 0) return false;
    if (filterType === 'settled' && liveBal !== 0) return false;

    // Filter by Customer Type (طرف حساب)
    if (customerTypeFilter !== 'all') {
      const cType = c.customerType || 'regular';
      if (cType !== customerTypeFilter) return false;
    }

    return true;
  });

  // Sorted Customer List
  const sortedCustomers = React.useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let cmp = 0;
      if (custSortField === 'name') {
        cmp = a.name.localeCompare(b.name, 'fa');
      } else if (custSortField === 'phone') {
        cmp = (a.phone || '').localeCompare(b.phone || '');
      } else if (custSortField === 'balance') {
        cmp = getCustomerLiveBalance(a) - getCustomerLiveBalance(b);
      } else if (custSortField === 'type') {
        cmp = (a.customerType || '').localeCompare(b.customerType || '');
      } else {
        // index / timestamp
        const getTimestamp = (item: Customer) => {
          if (item.createdAt && typeof item.createdAt === 'number') return item.createdAt;
          if (typeof item.id === 'string' && item.id.startsWith('cust-')) {
            const num = Number(item.id.replace('cust-', ''));
            if (!isNaN(num) && num > 1000) return num;
          }
          return 0;
        };
        const ta = getTimestamp(a);
        const tb = getTimestamp(b);
        cmp = ta - tb;
      }
      return custSortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredCustomers, custSortField, custSortDirection]);

  // Aggregate Stats
  const totalDebtorsCount = customers.filter((c) => getCustomerLiveBalance(c) > 0).length;
  const totalDebtorAmount = customers.reduce((sum, c) => {
    const bal = getCustomerLiveBalance(c);
    return sum + (bal > 0 ? bal : 0);
  }, 0);

  const totalCreditorAmount = customers.reduce((sum, c) => {
    const bal = getCustomerLiveBalance(c);
    return sum + (bal < 0 ? Math.abs(bal) : 0);
  }, 0);

  const totalPaymentsReceived = payments
    .filter((p) => (Number(p.amount) || 0) > 0)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const handlePrintStatement = () => {
    window.print();
  };

  // =========================================================================
  // DEDICATED FULL-PAGE VIEW: CUSTOMER STATEMENT & LEDGER (ریز حساب ها)
  // =========================================================================
  const renderStatementView = () => {
    if (!selectedCustomerForStatement) return null;
    const currentCustomer = customers.find(c => c.id === selectedCustomerForStatement.id) || selectedCustomerForStatement;

    return (
      <CustomerStatementView
        customer={currentCustomer}
        customers={customers}
        invoices={invoices}
        payments={payments}
        productReturns={productReturns}
        settings={settings}
        isDarkMode={isDarkMode}
        theme={theme}
        highlightedPaymentId={highlightedPaymentId}
        onBack={() => setSelectedCustomerForStatement(null)}
        onNewInvoice={onNewInvoiceForCustomer}
        onOpenPaymentModal={handleOpenPaymentModal}
        onOpenSettlementModal={handleOpenSettlementModal}
        onOpenBalanceAdjModal={handleOpenBalanceAdjModal}
        onOpenShotModal={handleOpenShotModal}
        onViewInvoice={onViewInvoice}
        onEditInvoice={onEditInvoice}
        onDeleteInvoice={onDeleteInvoice}
        onEditPayment={handleOpenEditPayment}
        onDeletePayment={setPaymentToDelete}
        onViewDoc={setViewingLedgerDoc}
        onEditCustomer={handleOpenEdit}
        onUpdateCustomer={onUpdateCustomer}
        onShowAlert={onShowAlert}
        renderCustomerTypeIcon={renderCustomerTypeIcon}
      />
    );
  };

  // Shot Customer Calculations
  const targetShotCustomer = shotCustomer || selectedCustomerForStatement || (customers.length > 0 ? customers[0] : null);
  const targetShotInvoices = targetShotCustomer ? getCustomerInvoices(targetShotCustomer) : [];
  const targetShotSalesInvoices = targetShotCustomer ? getCustomerSalesInvoices(targetShotCustomer, invoices) : [];
  const targetShotPurchaseInvoices = targetShotCustomer ? getCustomerPurchaseInvoices(targetShotCustomer, invoices) : [];
  const targetShotPayments = targetShotCustomer ? getCustomerPaymentsList(targetShotCustomer) : [];
  const targetShotLiveBal = targetShotCustomer ? getCustomerLiveBalance(targetShotCustomer) : 0;
  const targetShotTotalCreditSales = targetShotCustomer ? getCustomerCreditInvoicesTotal(targetShotCustomer) : 0;
  const targetShotTotalPaid = targetShotCustomer ? getCustomerPaymentsTotal(targetShotCustomer) : 0;

  const targetShotTotalSalesInvoices = targetShotSalesInvoices.reduce((sum, inv) => sum + (inv.finalAmount || 0), 0);
  const targetShotTotalPurchaseInvoices = targetShotPurchaseInvoices.reduce((sum, inv) => sum + (inv.finalAmount || 0), 0);

  // Invoices sorted newest first & limited according to user preference
  const sortedShotInvoices = [...targetShotInvoices].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const activeShotInvoices = shotInvoiceLimit > 0 ? sortedShotInvoices.slice(0, shotInvoiceLimit) : sortedShotInvoices;
  const targetShotLatestInvoice = sortedShotInvoices.length > 0 ? sortedShotInvoices[0] : null;
  const latestInvItems = targetShotLatestInvoice?.items || [];
  const latestInvTotalCartons = latestInvItems.reduce((sum, it) => sum + (it.cartonsCount || 0), 0);
  const latestInvTotalExtraPieces = latestInvItems.reduce((sum, it) => sum + (it.extraPieces || 0), 0);
  const latestInvTotalPieces = latestInvItems.reduce((sum, it) => sum + (it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0))), 0);
  const latestInvItemsToShow = shotLatestInvItemsLimit > 0 
    ? latestInvItems.slice(0, shotLatestInvItemsLimit)
    : (shotLatestInvItemsLimit === 0 ? latestInvItems : []);
  const remainingLatestItemsCount = Math.max(0, latestInvItems.length - latestInvItemsToShow.length);
  
  const getInvoiceEffectiveAmount = (inv: Invoice): number => {
    if (!inv || !inv.items || inv.items.length === 0) return inv?.finalAmount || 0;
    const computedSub = inv.items.reduce((s, it) => {
      const uPrice = (it.unitSellingPrice !== undefined && it.unitSellingPrice > 0)
        ? it.unitSellingPrice
        : (it.totalPieces > 0 && it.totalPrice > 0 ? Math.round(it.totalPrice / it.totalPieces) : (it.unitPrice || 0));
      return s + (uPrice > 0 ? uPrice * it.totalPieces : (it.totalPrice || 0));
    }, 0);
    return Math.max(0, computedSub - (inv.discount || 0) + (inv.tax || 0) - (inv.offsetReturnsTotal || 0));
  };

  const targetShotTotalInvoicesAmount = activeShotInvoices.reduce((sum, inv) => sum + getInvoiceEffectiveAmount(inv), 0);

  // Payments sorted newest first
  const sortedShotPayments = [...targetShotPayments].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  type ShotRow = { 
    id: string; 
    date: string; 
    code: string; 
    description: string; 
    debit: number; 
    credit: number; 
    amount: number;
    type: 'invoice' | 'payment' | 'return';
    timestamp: number;
    invoice?: Invoice;
    payment?: CustomerPayment;
    methodText?: string;
    isSettled?: boolean;
    paidAmount?: number;
    remainingAmount?: number;
    isPurchase?: boolean;
    referenceNumber?: string;
  };
  
  const allShotRows: ShotRow[] = [];
  if (targetShotCustomer) {
    // 1. Invoices (Strictly scoped to activeShotInvoices based on selected limit)
    activeShotInvoices.forEach((inv) => {
      const effAmount = getInvoiceEffectiveAmount(inv);
      const isCredit = inv.paymentStatus === 'credit' || inv.paymentMethod?.includes('نسیه') || inv.paymentMethod?.includes('غیر');
      const isPartial = inv.paymentStatus === 'partial' || (inv.paidAmount !== undefined && inv.paidAmount > 0 && inv.paidAmount < effAmount);
      const isSettledInv = inv.paymentStatus === 'cash' || (inv.paymentMethod?.includes('نقدی') && !inv.paymentMethod?.includes('نسیه') && !inv.paymentMethod?.includes('غیر'));
      const paidAmt = isSettledInv ? effAmount : ((inv as any).paidAmount || 0);
      const remAmt = Math.max(0, effAmount - paidAmt);
      const isFullyPaid = remAmt <= 0 || isSettledInv;
      const isPurchase = inv.type === 'purchase';

      if (isPartial) {
        const paid = inv.paidAmount || 0;
        const unpaid = (inv.remainingAmount !== undefined && inv.finalAmount === effAmount) ? inv.remainingAmount : Math.max(0, effAmount - paid);
        allShotRows.push({
          id: inv.id,
          date: inv.date,
          code: `فاکتور #${toPersianDigits(inv.invoiceNumber)}`,
          description: `${isPurchase ? 'خرید' : 'فروش'} ${toPersianDigits(inv.items.length)} قلم (${formatPrice(paid)} نقد + ${formatPrice(unpaid)} نسیه)`,
          debit: isPurchase ? 0 : unpaid,
          credit: isPurchase ? effAmount : 0,
          amount: effAmount,
          type: 'invoice',
          timestamp: inv.createdAt || Date.now(),
          invoice: inv,
          paidAmount: paidAmt,
          remainingAmount: remAmt,
          isSettled: isFullyPaid,
          isPurchase: isPurchase,
        });
      } else {
        allShotRows.push({
          id: inv.id,
          date: inv.date,
          code: `فاکتور #${toPersianDigits(inv.invoiceNumber)}`,
          description: `${isPurchase ? 'خرید' : 'فروش'} ${toPersianDigits(inv.items.length)} قلم کالا (${inv.paymentMethod || (isCredit ? 'نسیه' : 'نقدی')})`,
          debit: isPurchase ? 0 : (isCredit ? effAmount : 0),
          credit: isPurchase ? effAmount : 0,
          amount: effAmount,
          type: 'invoice',
          timestamp: inv.createdAt || Date.now(),
          invoice: inv,
          paidAmount: paidAmt,
          remainingAmount: remAmt,
          isSettled: isFullyPaid,
          isPurchase: isPurchase,
        });
      }
    });

    // 2. Payments
    targetShotPayments.forEach((pay) => {
      const amt = Number(pay.amount) || 0;
      const isDeposit = amt >= 0;
      const methodText = pay.paymentMethod === 'card' ? 'کارت به کارت' : pay.paymentMethod === 'bank_transfer' ? 'واریز بانکی' : pay.paymentMethod === 'cash' ? 'نقدی' : 'چک';
      allShotRows.push({
        id: pay.id,
        date: pay.date,
        code: pay.referenceNumber ? `سند: ${toPersianDigits(pay.referenceNumber)}` : (isDeposit ? 'سند واریز دریافتی' : 'سند ثبت بدهی'),
        description: `${pay.description || (isDeposit ? 'واریز وجه طرف‌حساب' : 'ثبت بدهی جدید')} (${methodText})`,
        debit: isDeposit ? 0 : Math.abs(amt),
        credit: isDeposit ? amt : 0,
        amount: Math.abs(amt),
        type: 'payment',
        timestamp: pay.createdAt || Date.now(),
        payment: pay,
        methodText: methodText,
        isSettled: true,
        referenceNumber: pay.referenceNumber,
      });
    });

    // 3. Returns
    const targetShotReturns = (productReturns || []).filter(r => r.customerId === targetShotCustomer.id);
    targetShotReturns.forEach((ret) => {
      const isToSupplier = ret.type === 'to_supplier';
      const isSettled = !!ret.isRefunded;
      const methodLabel = ret.refundMethod === 'cash' ? 'صندوق نقدی' : 'حساب بانکی';
      const netVal = getNetReturnAmount(ret);

      allShotRows.push({
        id: `shot-ret-${ret.id}`,
        date: ret.date,
        code: `مرجوعی #${toPersianDigits(ret.id.slice(-4).toUpperCase())}`,
        description: `مرجوعی «${ret.productName}» (${toPersianDigits(ret.cartonsCount)} کارتن) - ${ret.reason}`,
        debit: isToSupplier ? netVal : 0,
        credit: !isToSupplier ? netVal : 0,
        amount: netVal,
        type: 'return',
        timestamp: ret.createdAt || Date.now(),
      });

      if (isSettled) {
        allShotRows.push({
          id: `shot-ref-${ret.id}`,
          date: ret.date,
          code: `تسویه #${toPersianDigits(ret.id.slice(-4).toUpperCase())}`,
          description: `تسویه نقدی وجه مرجوعی (${methodLabel}) بابت «${ret.productName}»`,
          debit: !isToSupplier ? netVal : 0,
          credit: isToSupplier ? netVal : 0,
          amount: netVal,
          type: 'return',
          timestamp: (ret.createdAt || Date.now()) + 1,
        });
      }
    });

    // Sort newest first
    allShotRows.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Filtered rows for Shot Card based on user selection
  const filteredShotRows = allShotRows.filter((r) => {
    if (shotFilterType === 'invoices') return r.type === 'invoice';
    if (shotFilterType === 'payments') return r.type === 'payment';
    return true; // 'all'
  });

  // Display limited rows for shot card micro table
  const displayedShotRows = shotRecentRowsLimit > 0 ? filteredShotRows.slice(0, shotRecentRowsLimit) : filteredShotRows;

  // =========================================================================
  // MAIN RETURN STATEMENT
  // =========================================================================
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 px-2 sm:px-4">
      
      {selectedCustomerForStatement ? (
        renderStatementView()
      ) : (
        <>
      {/* 1. Modern Adaptive Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-5 transition-colors no-print">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl ${theme.badgeBg} ${theme.badgeText} text-xs font-black border ${theme.borderColor} shadow-2xs`}>
              <Users className="w-3.5 h-3.5" />
              <span>دفتر حساب‌داری و طرف‌های حساب</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{toPersianDigits(customers.length)} پرونده معاملاتی فعال</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
              <Users className="w-5 h-5" />
            </div>
            <span>مدیریت مشتریان و حساب‌های دفتری</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-medium">
            ثبت پرونده مشتریان، کنترل خریدهای اعتباری و نسیه، ثبت واریزی‌ها و صدور صورت‌حساب رسمی با ریزتراکنش‌های تاریخ‌دار
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 max-w-full">
          <button
            type="button"
            onClick={() => handleOpenSettlementModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
            title="تسویه حساب کامل مشتری با یک کلیک و ثبت در نقدینگی"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>تسویه حساب</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenBalanceAdjModal(undefined, 'credit')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-800 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
            title="ثبت بستانکاری، پیش‌دریافت و تعدیل حساب مشتری"
          >
            <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>ثبت بستانکاری</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenPaymentModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-800 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-2xs"
            title="ثبت واریز وجه و تسویه حساب طرف‌حساب"
          >
            <Banknote className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>ثبت واریزی</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs sm:text-sm shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer`}
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span>افزودن مشتری جدید</span>
          </button>
        </div>
      </div>

      {/* 2. Cohesive Rounded-3xl Stats - Styled like ReturnsManager */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
        
        {/* Stat 1: کل مشتریان */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-blue-200/70 dark:border-blue-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">تعداد کل طرف‌حساب‌ها</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {toPersianDigits(customers.length)} <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">طرف‌حساب</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>پرونده‌های معاملاتی فعال:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
              {toPersianDigits(customers.length)} پرونده
            </span>
          </div>
        </div>

        {/* Stat 2: مطالبات (بدهکاران) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-rose-200/70 dark:border-rose-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">کل مطالبات بازرگانی (نسیه)</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-3 dir-ltr text-right">
            {formatPrice(totalDebtorAmount)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>طلب از خریداران:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
              {toPersianDigits(totalDebtorsCount)} مشتری بدهکار
            </span>
          </div>
        </div>

        {/* Stat 3: مجموع دریافتی‌ها */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">مجموع واریزی‌های ثبت‌شده</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-3 dir-ltr text-right">
            {formatPrice(totalPaymentsReceived)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>کل تسویه‌ها و پرداختی‌ها:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {toPersianDigits(payments.filter((p) => (Number(p.amount) || 0) > 0).length)} تراکنش
            </span>
          </div>
        </div>

        {/* Stat 4: بستانکاران */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-amber-200/70 dark:border-amber-900/40 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">پیش‌پرداخت (بستانکاران)</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-3 dir-ltr text-right">
            {formatPrice(totalCreditorAmount)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>مانده بستانکار مشتریان:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
              {toPersianDigits(customers.filter(c => getCustomerLiveBalance(c) < 0).length)} طرف‌حساب
            </span>
          </div>
        </div>

      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3.5 transition-colors no-print">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3.5">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-black dark:text-white placeholder-slate-500 rounded-2xl text-xs font-bold focus:outline-none ${theme.ring} shadow-2xs`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            {/* Balance Status Filter Chips */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
              <button
                onClick={() => { setFilterType('all'); setCustomerCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  filterType === 'all'
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                همه ({toPersianDigits(customers.length)})
              </button>
              
              <button
                onClick={() => { setFilterType('debtor'); setCustomerCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  filterType === 'debtor'
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                بدهکاران ({toPersianDigits(totalDebtorsCount)})
              </button>

              <button
                onClick={() => { setFilterType('settled'); setCustomerCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  filterType === 'settled'
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                تسویه شده
              </button>

              <button
                onClick={() => { setFilterType('creditor'); setCustomerCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  filterType === 'creditor'
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                بستانکاران
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setCustomerViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  customerViewMode === 'table'
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white'
                }`}
                title="نمای جدول جامع حسابداری"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">جدول حسابداری</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomerViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  customerViewMode === 'cards'
                    ? `${theme.primary} text-white shadow-xs`
                    : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white'
                }`}
                title="نمای کارت‌های مدرن"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">کارت‌ها</span>
              </button>
            </div>

            {/* Sort Order Toggle */}
            <button
              type="button"
              onClick={() => setCustomerSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer shrink-0"
              title={customerSortOrder === 'desc' ? 'مرتب‌سازی: جدیدترین در ابتدا (کلیک برای صعودی/قدیمی‌ترین)' : 'مرتب‌سازی: قدیمی‌ترین در ابتدا (کلیک برای نزولی/جدیدترین)'}
            >
              {customerSortOrder === 'desc' ? (
                <ArrowDownWideNarrow className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              ) : (
                <ArrowUpNarrowWide className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              )}
              <span className="hidden sm:inline">{customerSortOrder === 'desc' ? 'جدیدترین اول' : 'قدیمی‌ترین اول'}</span>
            </button>
          </div>
        </div>

        {/* Customer Type Filter Row (دسته بندی طرف‌حساب / نقش) */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-0.5">
          <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />
            <span>نوع طرف‌حساب:</span>
          </span>
          <button
            type="button"
            onClick={() => { setCustomerTypeFilter('all'); setCustomerCurrentPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              customerTypeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            همه نقش‌ها ({toPersianDigits(customers.length)})
          </button>
          {CUSTOMER_TYPE_OPTIONS.map((opt) => {
            const count = customers.filter(c => (c.customerType || 'regular') === opt.value).length;
            const isSelected = customerTypeFilter === opt.value;
            return (
              <button
                key={`cust-type-filter-${opt.value}`}
                type="button"
                onClick={() => { setCustomerTypeFilter(opt.value); setCustomerCurrentPage(1); }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? `${opt.badgeClass} ring-2 ring-offset-1 ring-current shadow-2xs`
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {renderCustomerTypeIcon(opt.iconName, 'w-3 h-3')}
                <span>{opt.shortLabel}</span>
                <span className="text-[10px] opacity-75 font-mono">({toPersianDigits(count)})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Customer Cards Grid */}
      {sortedCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-12 text-center border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 no-print">
          <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-950 text-slate-400 mx-auto flex items-center justify-center border border-slate-200 dark:border-slate-800">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 dark:text-white text-base">مشتری با این مشخصات یافت نشد</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            عبارت جستجو را تغییر دهید یا با دکمه بالا مشتری جدید ثبت کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            const customerTotalPages = Math.ceil(sortedCustomers.length / customerItemsPerPage);
            const customerStartIndex = (customerCurrentPage - 1) * customerItemsPerPage;
            const paginatedCustomers = sortedCustomers.slice(customerStartIndex, customerStartIndex + customerItemsPerPage);

            return (
              <>
                {customerViewMode === 'cards' ? (
                  /* CARDS VIEW */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 no-print">
                    {paginatedCustomers.map((cust, cIdx) => {
                      const liveBal = getCustomerLiveBalance(cust);
                      const totalCreditSales = getCustomerCreditInvoicesTotal(cust);
                      const manualDebts = getCustomerManualDebtsTotal(cust);
                      const deposits = getCustomerDepositsTotal(cust);
                      const allReturnsFromCust = getCustomerAllReturnsTotal(cust);
                      const settledReturnsFromCust = getCustomerSettledReturnsTotal(cust);
                      const isManager = cust.name.includes('مدیریت انبار') || cust.id === 'cust-1';

                      return (
                        <div
                          id={`cust-card-${cust.id}`}
                          key={`cust-card-${cust.id || cIdx}-${cIdx}`}
                          onClick={() => setSelectedCustomerForStatement(cust)}
                          className={`rounded-2xl p-5 border transition-all flex flex-col justify-between group cursor-pointer ${
                            highlightedCustId === cust.id
                              ? 'row-updated-highlight bg-emerald-500/15 dark:bg-emerald-500/20 ring-2 ring-emerald-500 shadow-md'
                              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs'
                          }`}
                        >
                          <div className="space-y-3.5">
                            {/* Top Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-black text-black dark:text-white text-base truncate">
                                    {cust.name}
                                  </h4>
                                  {highlightedCustId === cust.id && (
                                    <RowUpdateBadge label="اطلاعات مشتری بروز شد" />
                                  )}
                                  {(() => {
                                    const typeInfo = getCustomerTypeInfo(cust.customerType);
                                    return (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${typeInfo.badgeClass}`}>
                                        {renderCustomerTypeIcon(typeInfo.iconName, "w-3 h-3")}
                                        <span>{typeInfo.shortLabel}</span>
                                      </span>
                                    );
                                  })()}
                                  {isManager && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-black text-[10px] rounded-md shrink-0 border border-amber-300 dark:border-amber-800">
                                      مدیریت
                                    </span>
                                  )}
                                </div>
                                {cust.company && (
                                  <div className="flex items-center gap-1 text-xs text-black dark:text-slate-200 font-bold truncate">
                                    <Building className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                                    <span className="truncate">{cust.company}</span>
                                  </div>
                                )}
                              </div>

                              {/* Status Badge */}
                              <div className="shrink-0 text-left">
                                {liveBal > 0 ? (
                                  <span className={`inline-block px-3 py-1 ${badges.debit} rounded-xl text-[11px] font-black shadow-2xs`}>
                                    بدهکار: {formatPrice(liveBal)}
                                  </span>
                                ) : liveBal < 0 ? (
                                  <span className={`inline-block px-3 py-1 ${badges.credit} rounded-xl text-[11px] font-black shadow-2xs`}>
                                    بستانکار: {formatPrice(Math.abs(liveBal))}
                                  </span>
                                ) : (
                                  <span className={`inline-block px-3 py-1 ${badges.settled} rounded-xl text-[11px] font-black shadow-2xs`}>
                                    تسویه کامل
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Phone and City */}
                            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-black text-black dark:text-white">
                                  <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  <span className="font-mono dir-ltr">{toPersianDigits(cust.phone)}</span>
                                </div>
                                <div className="flex items-center gap-1 text-black dark:text-slate-300 font-bold">
                                  <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                  <span>{cust.city}</span>
                                </div>
                              </div>
                              {cust.address && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate pt-1 border-t border-slate-200/50 dark:border-slate-800 font-medium">
                                  {cust.address}
                                </p>
                              )}
                            </div>

                            {/* Summary Micro Values */}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
                                <span className="block text-slate-600 dark:text-slate-400 text-[10px] mb-0.5 font-bold">خرید نسیه:</span>
                                <b className="font-black text-black dark:text-white dir-ltr text-right block">{formatPrice(totalCreditSales)}</b>
                              </div>
                              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800">
                                <span className="block text-slate-600 dark:text-slate-400 text-[10px] mb-0.5 font-bold">مجموع دریافتی:</span>
                                <b className={`font-black ${theme.primaryText} dir-ltr text-right block`}>{formatPrice(deposits)}</b>
                              </div>
                              {allReturnsFromCust > 0 && (
                                <div className="p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 col-span-2 flex items-center justify-between text-[11px]">
                                  <span className="text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">گردش مرجوعی:</span>
                                  <span className="font-black text-indigo-800 dark:text-indigo-200 dir-ltr text-right">
                                    {formatPrice(allReturnsFromCust)}
                                    {settledReturnsFromCust > 0 && (
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mr-1">
                                        (تسویه نقدی)
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Card Action Buttons */}
                          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <div className="grid grid-cols-4 gap-1">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(cust); }}
                                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[11px] border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                                title="ثبت واریز وجه"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>واریزی</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleOpenBalanceAdjModal(cust, 'credit'); }}
                                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer"
                                title="ثبت بستانکاری و پیش‌دریافت"
                              >
                                <TrendingUp className="w-3.5 h-3.5" />
                                <span>بستانکاری</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleOpenSettlementModal(cust); }}
                                className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-xs transition-all cursor-pointer"
                                title="تسویه کامل حساب این مشتری با یک کلیک"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>تسویه</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSelectedCustomerForStatement(cust); }}
                                className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-[11px] shadow-xs transition-all cursor-pointer`}
                                title="ریز گردش حساب"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>کاردکس</span>
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 text-slate-400">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleOpenShotModal(cust); }}
                                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                  title="شات حساب تلگرام"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleOpenEdit(cust); }}
                                  className={`p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:${theme.primaryText} hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer`}
                                  title="ویرایش مشخصات مشتری"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setCustomerToDelete(cust); }}
                                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                                  title="حذف پرونده مشتری"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onNewInvoiceForCustomer(cust); }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-black dark:text-slate-200 font-black text-xs transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>فاکتور جدید</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* TABLE VIEW */
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden no-print">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-[13px] border-b border-slate-200/80 dark:border-slate-800 select-none">
                          <tr>
                            <SortableTableHeader
                              field="index"
                              currentField={custSortField}
                              currentDirection={custSortDirection}
                              onSort={handleCustomerSort}
                              align="center"
                              className="w-14"
                            >
                              #
                            </SortableTableHeader>

                            <SortableTableHeader
                              field="name"
                              currentField={custSortField}
                              currentDirection={custSortDirection}
                              onSort={handleCustomerSort}
                              align="right"
                            >
                              طرف‌حساب
                            </SortableTableHeader>

                            <SortableTableHeader
                              field="type"
                              currentField={custSortField}
                              currentDirection={custSortDirection}
                              onSort={handleCustomerSort}
                              align="center"
                            >
                              نوع حساب
                            </SortableTableHeader>

                            <SortableTableHeader
                              field="phone"
                              currentField={custSortField}
                              currentDirection={custSortDirection}
                              onSort={handleCustomerSort}
                              align="right"
                            >
                              تلفن / شهر
                            </SortableTableHeader>

                            <th className="p-3.5 text-left font-black">مانده اول دوره</th>
                            <th className="p-3.5 text-left font-black">خرید نسیه</th>
                            <th className="p-3.5 text-left font-black">بدهی دستی</th>
                            <th className="p-3.5 text-left font-black">کل دریافتی</th>
                            <th className="p-3.5 text-left font-black">گردش مرجوعی</th>

                            <SortableTableHeader
                              field="balance"
                              currentField={custSortField}
                              currentDirection={custSortDirection}
                              onSort={handleCustomerSort}
                              align="left"
                            >
                              مانده خالص
                            </SortableTableHeader>

                            <th className="p-3.5 text-center font-black">وضعیت</th>
                            <th className="p-3.5 text-center font-black">عملیات حسابداری</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {paginatedCustomers.map((cust, idx) => {
                            const liveBal = getCustomerLiveBalance(cust);
                            const totalCreditSales = getCustomerCreditInvoicesTotal(cust);
                            const manualDebts = getCustomerManualDebtsTotal(cust);
                            const deposits = getCustomerDepositsTotal(cust);
                            const allReturnsFromCust = getCustomerAllReturnsTotal(cust);
                            const settledReturnsFromCust = getCustomerSettledReturnsTotal(cust);
                            const isManager = cust.name.includes('مدیریت انبار') || cust.id === 'cust-1';
                            const absoluteIndex = customerStartIndex + idx + 1;
                            const typeInfo = getCustomerTypeInfo(cust.customerType);

                            return (
                              <tr 
                                id={`cust-row-${cust.id}`}
                                key={`cust-tbl-row-${cust.id || idx}-${idx}`} 
                                onClick={() => setSelectedCustomerForStatement(cust)}
                                className={`transition-all duration-500 cursor-pointer group ${
                                  highlightedCustId === cust.id
                                    ? 'row-updated-highlight bg-emerald-500/15 dark:bg-emerald-500/20 ring-2 ring-emerald-500 shadow-md'
                                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                <td className="p-3.5 text-center text-slate-400 font-mono">
                                  {highlightedCustId === cust.id ? (
                                    <RowUpdateIcon title="اطلاعات مشتری با موفقیت بروز شد" className="mx-auto" />
                                  ) : (
                                    toPersianDigits(absoluteIndex)
                                  )}
                                </td>
                                <td className="p-3.5 font-black text-slate-900 dark:text-white">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>{cust.name}</span>
                                    {highlightedCustId === cust.id && (
                                      <RowUpdateBadge label="مشتری بروز شد" />
                                    )}
                                    {isManager && (
                                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[9px] rounded">
                                        مدیریت
                                      </span>
                                    )}
                                  </div>
                                  {cust.company && (
                                    <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                                      {cust.company}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 text-center whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border ${typeInfo.badgeClass} whitespace-nowrap shrink-0`}>
                                    {renderCustomerTypeIcon(typeInfo.iconName, "w-3 h-3 shrink-0")}
                                    <span>{typeInfo.shortLabel}</span>
                                  </span>
                                </td>
                                <td className="p-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  <div className="font-mono dir-ltr text-right font-bold text-xs">{toPersianDigits(cust.phone)}</div>
                                  <div className="text-[11px] text-slate-400 font-medium">{cust.city}</div>
                                </td>
                                <td className="p-3.5 text-left dir-ltr font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {formatPrice(cust.initialBalance || 0)}
                                </td>
                                <td className="p-3.5 text-left dir-ltr font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                  {totalCreditSales > 0 ? formatPrice(totalCreditSales) : '-'}
                                </td>
                                <td className="p-3.5 text-left dir-ltr font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                                  {manualDebts > 0 ? formatPrice(manualDebts) : '-'}
                                </td>
                                <td className={`p-3.5 text-left dir-ltr font-bold ${theme.primaryText} whitespace-nowrap`}>
                                  {deposits > 0 ? formatPrice(deposits) : '-'}
                                </td>
                                <td className="p-3.5 text-left dir-ltr font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                  {allReturnsFromCust > 0 ? (
                                    <div>
                                      <span>{formatPrice(allReturnsFromCust)}</span>
                                      {settledReturnsFromCust > 0 && (
                                        <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                                          ({formatPrice(settledReturnsFromCust)} تسویه)
                                        </span>
                                      )}
                                    </div>
                                  ) : '-'}
                                </td>
                                <td className="p-3.5 text-left dir-ltr font-black text-sm whitespace-nowrap">
                                  <span className={liveBal > 0 ? 'text-rose-600 dark:text-rose-400' : liveBal < 0 ? theme.primaryText : 'text-slate-700 dark:text-slate-300'}>
                                    {formatPrice(liveBal)}
                                  </span>
                                </td>
                                <td className="p-3.5 text-center whitespace-nowrap">
                                  {liveBal > 0 ? (
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl ${badges.debit} text-[10px] font-bold whitespace-nowrap shrink-0`}>
                                      بدهکار
                                    </span>
                                  ) : liveBal < 0 ? (
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl ${badges.credit} text-[10px] font-bold whitespace-nowrap shrink-0`}>
                                      بستانکار
                                    </span>
                                  ) : (
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl ${badges.settled} text-[10px] font-bold whitespace-nowrap shrink-0`}>
                                      تسویه
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCustomerForStatement(cust)}
                                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${theme.primary} text-white hover:opacity-95 text-[11px] font-black transition-all cursor-pointer shadow-xs whitespace-nowrap`}
                                      title="مشاهده کاردکس و ریز حساب‌ها"
                                    >
                                      <Eye className="w-3.5 h-3.5 shrink-0" />
                                      <span>ریزحساب</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSettlementModal(cust)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition-all shadow-xs cursor-pointer whitespace-nowrap"
                                      title="تسویه حساب کامل مشتری با یک کلیک"
                                    >
                                      <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                                      <span>تسویه</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPaymentModal(cust)}
                                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                                      title="ثبت واریز وجه"
                                    >
                                      + واریزی
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenBalanceAdjModal(cust, 'debt')}
                                      className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-slate-200/80 dark:border-slate-700 text-[11px] font-bold transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                                      title="ثبت بدهی جدید"
                                    >
                                      - بدهی
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onNewInvoiceForCustomer(cust)}
                                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                                      title="فاکتور جدید برای این طرف‌حساب"
                                    >
                                      <Plus className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenShotModal(cust)}
                                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                                      title="شات وضعیت حساب جهت ارسال به مشتری"
                                    >
                                      <Camera className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(cust)}
                                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                                      title="ویرایش مشخصات مشتری"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCustomerToDelete(cust)}
                                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                                      title="حذف پرونده مشتری"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Customer List Pagination Bar */}
                <Pagination
                  currentPage={customerCurrentPage}
                  totalPages={customerTotalPages}
                  totalItems={sortedCustomers.length}
                  itemsPerPage={customerItemsPerPage}
                  onPageChange={setCustomerCurrentPage}
                  onItemsPerPageChange={(val) => {
                    setCustomerItemsPerPage(val);
                    setCustomerCurrentPage(1);
                  }}
                  itemsPerPageOptions={[10, 20, 50, 100]}
                  itemName="مشتری"
                  themeColor={settings.themeColor}
                />
              </>
            );
          })()}
        </div>
      )}
      </>
      )}

      {/* MODAL 1: Payment Registration Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {editingPayment ? 'ویرایش سند واریزی و دریافتی' : 'ثبت دریافتی و واریزی مشتری'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {editingPayment ? 'ویرایش مشخصات، مبلغ و شماره پیگیری سند مالی' : 'وصول وجه نقد، کارت‌به‌کارت یا چک برای کسر از بدهی'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setEditingPayment(null);
                  }}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form noValidate onSubmit={handleSubmitPayment} className="p-6 space-y-4">
                {/* Select Customer */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    انتخاب طرف حساب واریز کننده <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedPaymentCustId}
                    onChange={(e) => {
                      setSelectedPaymentCustId(e.target.value);
                      if (paymentFormErrors.customer) setPaymentFormErrors({ ...paymentFormErrors, customer: '' });
                      const found = customers.find(c => c.id === e.target.value);
                      if (found) setTargetCustomerForPayment(found);
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      paymentFormErrors.customer ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {customers.map((c, cIdx) => {
                      const bal = getCustomerLiveBalance(c);
                      const balStr = bal > 0 ? `(بدهکار: ${formatPrice(bal)})` : bal < 0 ? `(بستانکار: ${formatPrice(Math.abs(bal))})` : '(تسویه شده)';
                      return (
                        <option key={`pay-cust-opt-${c.id || cIdx}-${cIdx}`} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ''} - {c.city} {balStr}
                        </option>
                      );
                    })}
                  </select>
                  <CustomValidationMessage message={paymentFormErrors.customer} />
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    مبلغ واریزی (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <SmartPriceInput
                    value={Number(paymentAmount) || 0}
                    onChange={(val) => {
                      setPaymentAmount(val || '');
                      if (paymentFormErrors.amount) setPaymentFormErrors({ ...paymentFormErrors, amount: '' });
                    }}
                    themeColor="emerald"
                  />
                  <CustomValidationMessage message={paymentFormErrors.amount} />
                </div>

                {/* Payment Method Radio */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    روش واریز
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'card'
                          ? 'bg-emerald-600 text-white font-black shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>کارت به کارت</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank_transfer')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'bank_transfer'
                          ? 'bg-emerald-600 text-white font-black shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span>حواله پایا / ساتنا</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'cash'
                          ? 'bg-emerald-600 text-white font-black shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>وجه نقد</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('check')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        paymentMethod === 'check'
                          ? 'bg-emerald-600 text-white font-black shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>چک صیادی</span>
                    </button>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      تاریخ پرداخت (شمسی)
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      ساعت پرداخت
                    </label>
                    <input
                      type="text"
                      value={paymentTime}
                      onChange={(e) => setPaymentTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold text-center"
                    />
                  </div>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    شماره پیگیری / فیش واریز
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-mono dir-ltr text-right"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    شرح و بابت
                  </label>
                  <input
                    type="text"
                    value={paymentDescription}
                    onChange={(e) => setPaymentDescription(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 rounded-xl ${theme.primary} ${theme.primaryHover} text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5`}
                  >
                    <Check className="w-4 h-4" />
                    <span>تایید و ثبت دریافتی</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Balance & Debt Adjustment Modal */}
      <AnimatePresence>
        {isBalanceAdjModalOpen && (targetCustomerForBalanceAdj || selectedCustomerForStatement) && (() => {
          const currentAdjCustomer = targetCustomerForBalanceAdj || (selectedCustomerForStatement ? customers.find(c => c.id === selectedCustomerForStatement.id) || selectedCustomerForStatement : null);
          if (!currentAdjCustomer) return null;
          return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      مدیریت و تعدیل بستانکاری، بدهی و مانده اولیه
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      طرف حساب: <span className="font-bold text-slate-700 dark:text-slate-300">{currentAdjCustomer.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBalanceAdjModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitBalanceAdj} className="p-6 space-y-4">
                {/* Customer Select dropdown if opened from outside statement */}
                {!selectedCustomerForStatement && customers.length > 1 && (
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      انتخاب طرف‌حساب
                    </label>
                    <select
                      value={currentAdjCustomer.id}
                      onChange={(e) => {
                        const found = customers.find(c => c.id === e.target.value);
                        if (found) setTargetCustomerForBalanceAdj(found);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      {customers.map((c, cIdx) => (
                        <option key={`adj-cust-opt-${c.id || cIdx}-${cIdx}`} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ''} - تلفن: {toPersianDigits(c.phone)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {/* Operation Type Radio */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                    نوع عملیات و تعدیل حساب
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setBalanceAdjType('credit')}
                      className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all border ${
                        balanceAdjType === 'credit'
                          ? 'bg-emerald-600 text-white font-black border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 text-emerald-300" />
                      <span className="text-center">ثبت بستانکاری (+)</span>
                      <span className="text-[9px] opacity-80 font-normal">واریز / کاهش بدهی</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBalanceAdjType('payout')}
                      className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all border ${
                        balanceAdjType === 'payout'
                          ? 'bg-rose-600 text-white font-black border-rose-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4 text-rose-300" />
                      <span className="text-center">عودت وجه (-)</span>
                      <span className="text-[9px] opacity-80 font-normal">تسویه بستانکاری</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBalanceAdjType('debt')}
                      className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all border ${
                        balanceAdjType === 'debt'
                          ? 'bg-amber-600 text-white font-black border-amber-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <TrendingDown className="w-4 h-4 text-amber-300" />
                      <span className="text-center">ثبت بدهی (-)</span>
                      <span className="text-[9px] opacity-80 font-normal">نسیه / افزایش بدهی</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBalanceAdjType('initial_balance')}
                      className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all border ${
                        balanceAdjType === 'initial_balance'
                          ? 'bg-purple-600 text-white font-black border-purple-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <Edit3 className="w-4 h-4 text-purple-300" />
                      <span className="text-center">مانده اولیه</span>
                      <span className="text-[9px] opacity-80 font-normal">اصلاح حساب قبلی</span>
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    {balanceAdjType === 'initial_balance' ? 'مانده اولیه جدید (تومان)' : balanceAdjType === 'credit' ? 'مبلغ بستانکاری / واریزی (تومان)' : 'مبلغ بدهی / نسیه جدید (تومان)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={balanceAdjAmount}
                    onChange={(e) => setBalanceAdjAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-4 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 dir-ltr text-right"
                  />
                  {balanceAdjAmount && Number(balanceAdjAmount) > 0 && (
                    <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                      <span>مبلغ به حروف:</span>
                      <span className="font-black">{numberToPersianWords(Number(balanceAdjAmount))}</span>
                    </div>
                  )}
                </div>

                {balanceAdjType !== 'initial_balance' && (
                  <>
                    {/* Payment Method Radio */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                        روش تسویه / سند
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setBalanceAdjMethod('card')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            balanceAdjMethod === 'card'
                              ? 'bg-teal-600 text-white font-black shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>کارت به کارت</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBalanceAdjMethod('bank_transfer')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            balanceAdjMethod === 'bank_transfer'
                              ? 'bg-teal-600 text-white font-black shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Building className="w-4 h-4" />
                          <span>حواله بانکی</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBalanceAdjMethod('cash')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            balanceAdjMethod === 'cash'
                              ? 'bg-teal-600 text-white font-black shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Banknote className="w-4 h-4" />
                          <span>نقدی</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBalanceAdjMethod('check')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            balanceAdjMethod === 'check'
                              ? 'bg-teal-600 text-white font-black shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>چک صیادی</span>
                        </button>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                          تاریخ (شمسی)
                        </label>
                        <input
                          type="text"
                          required
                          value={balanceAdjDate}
                          onChange={(e) => setBalanceAdjDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                          ساعت
                        </label>
                        <input
                          type="text"
                          value={balanceAdjTime}
                          onChange={(e) => setBalanceAdjTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold text-center"
                        />
                      </div>
                    </div>

                    {/* Reference Number */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                        شماره پیگیری / سند
                      </label>
                      <input
                        type="text"
                        value={balanceAdjRef}
                        onChange={(e) => setBalanceAdjRef(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-mono dir-ltr text-right"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                        توضیحات و بابت تعدیل
                      </label>
                      <input
                        type="text"
                        value={balanceAdjNotes}
                        onChange={(e) => setBalanceAdjNotes(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                      />
                    </div>
                  </>
                )}

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsBalanceAdjModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>تایید و ثبت عملیات</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL 2: Add / Edit Customer Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`}>
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {editingCustomer ? 'ویرایش مشخصات مشتری' : 'ثبت پرونده مشتری جدید'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={resetCustomerForm}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form noValidate onSubmit={handleSubmitCustomerForm} className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* انتخاب نوع طرف‌حساب / نقش مشتری */}
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      <span>نوع طرف‌حساب و نقش در سیستم <span className="text-rose-500">*</span></span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-bold">تعیین رفتار مالی و مراوده تجاری</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {CUSTOMER_TYPE_OPTIONS.map((opt) => {
                      const isSelected = (formData.customerType || 'regular') === opt.value;
                      return (
                        <button
                          key={`cust-form-type-${opt.value}`}
                          type="button"
                          onClick={() => setFormData({ ...formData, customerType: opt.value as CustomerType })}
                          className={`p-2.5 rounded-xl text-right transition-all cursor-pointer border flex items-start gap-2.5 ${
                            isSelected
                              ? `${opt.badgeClass} ring-2 ring-offset-1 ring-current shadow-xs`
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-black/10 dark:bg-white/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            {renderCustomerTypeIcon(opt.iconName, "w-4 h-4")}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-xs">{opt.label}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{opt.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      نام و نام خانوادگی <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (customerFormErrors.name) setCustomerFormErrors({ ...customerFormErrors, name: '' });
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 ${
                        customerFormErrors.name ? 'border-rose-500 ring-2 ring-rose-500/20' : `border-slate-200 dark:border-slate-800 ${theme.ring}`
                      }`}
                    />
                    <CustomValidationMessage message={customerFormErrors.name} />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      نام شرکت / فروشگاه
                    </label>
                    <input
                      type="text"
                      value={formData.company || ''}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 ${theme.ring}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      شماره تماس همراه <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (customerFormErrors.phone) setCustomerFormErrors({ ...customerFormErrors, phone: '' });
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border text-slate-900 dark:text-white text-xs font-bold dir-ltr text-right focus:outline-none focus:ring-2 ${
                        customerFormErrors.phone ? 'border-rose-500 ring-2 ring-rose-500/20' : `border-slate-200 dark:border-slate-800 ${theme.ring}`
                      }`}
                    />
                    <CustomValidationMessage message={customerFormErrors.phone} />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      شهر / منطقه
                    </label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 ${theme.ring}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      کد ملی / شناسه اقتصادی
                    </label>
                    <input
                      type="text"
                      value={formData.nationalCode || ''}
                      onChange={(e) => setFormData({ ...formData, nationalCode: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold dir-ltr text-right focus:outline-none focus:ring-2 ${theme.ring}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                      مانده حساب اولیه (تومان)
                    </label>
                    <input
                      type="number"
                      value={formData.initialBalance || ''}
                      onChange={(e) => setFormData({ ...formData, initialBalance: Number(e.target.value) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold dir-ltr text-right focus:outline-none focus:ring-2 ${theme.ring}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    نشانی تحویل بار و محل کار
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 ${theme.ring}`}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={resetCustomerForm}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 rounded-xl ${theme.primary} ${theme.primaryHover} text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5`}
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingCustomer ? 'ذخیره تغییرات' : 'ثبت نهایی مشتری'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Delete Customer Confirmation Modal */}
      <AnimatePresence>
        {customerToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-100 dark:border-rose-900">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white text-base">
                  حذف پرونده {customerToDelete.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  آیا از حذف این مشتری اطمینان دارید؟ تمام سوابق مالی این مشتری حذف خواهد شد.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setCustomerToDelete(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  onClick={() => {
                    onDeleteCustomer(customerToDelete.id);
                    setCustomerToDelete(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  حذف پرونده
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Delete Payment Confirmation Modal */}
      <AnimatePresence>
        {paymentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-100 dark:border-rose-900">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-900 dark:text-white text-base">
                  حذف سند دریافتی
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  آیا از حذف سند دریافتی به مبلغ <span className="font-black text-slate-800 dark:text-slate-200">{formatPrice(paymentToDelete.amount)}</span> به تاریخ <span className="font-black text-slate-800 dark:text-slate-200">{toPersianDigits(paymentToDelete.date)}</span> اطمینان دارید؟ این مبلغ مجدداً به بدهی مشتری اضافه خواهد شد.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPaymentToDelete(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  onClick={() => {
                    onDeletePayment(paymentToDelete.id);
                    setPaymentToDelete(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  حذف سند
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: Customer Account Shot Card Modal (کارت تصویری وضعیت حساب - منطبق دقیق بر طرح) */}
      <AnimatePresence>
        {isShotModalOpen && targetShotCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md no-print overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 my-auto"
            >
              {/* Modal Header Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl text-white shadow-xs ${theme.primary}`}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <span>کارت تصویری وضعیت حساب</span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {targetShotCustomer.name}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      خلاصه گرافیکی حساب، مبالغ محاسباتی و گردش‌های انتخابی طرف‌حساب
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShotModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1">
                
                {/* Advanced Controls Toolbar */}
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/60 text-xs">
                  
                  {/* 1. Item Filter Selector: All / Invoices Only / Payments Only */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                        نحوه نمایش اقلام در لیست:
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {shotFilterType === 'all' ? 'همه (فاکتورها + واریزی‌ها)' : shotFilterType === 'invoices' ? 'فقط فاکتورها' : 'فقط واریزی‌ها و دریافت‌ها'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setShotFilterType('all')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none ${
                          shotFilterType === 'all'
                            ? `${theme.primary} text-white shadow-xs`
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>همه (فاکتور + واریزی)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShotFilterType('invoices')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none ${
                          shotFilterType === 'invoices'
                            ? `${theme.primary} text-white shadow-xs`
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>فقط فاکتورها</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShotFilterType('payments')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none ${
                          shotFilterType === 'payments'
                            ? `${theme.primary} text-white shadow-xs`
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>فقط واریزی‌ها</span>
                      </button>
                    </div>
                  </div>

                  {/* 2. Display Limits (Rows count in table, Items count in latest invoice & Invoices calculation limit) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                    {/* 2A. Table rows limit */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <ListOrdered className="w-3.5 h-3.5 text-slate-400" />
                          ردیف‌های جدول گردش‌ها:
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {shotRecentRowsLimit > 0 ? `${toPersianDigits(shotRecentRowsLimit)} ردیف` : 'همه'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[3, 5, 10, 15].map((num) => (
                          <button
                            key={`shot-rows-${num}`}
                            type="button"
                            onClick={() => setShotRecentRowsLimit(num)}
                            className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none ${
                              shotRecentRowsLimit === num
                                ? `${theme.primary} text-white shadow-xs`
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            {toPersianDigits(num)}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShotRecentRowsLimit(0)}
                          className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none ${
                            shotRecentRowsLimit === 0
                              ? `${theme.primary} text-white shadow-xs`
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          همه
                        </button>
                      </div>
                    </div>

                    {/* 2B. Latest invoice items count limit */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          اقلام آخرین فاکتور:
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {shotLatestInvItemsLimit === 3 ? '۳ قلم' : shotLatestInvItemsLimit === 5 ? '۵ قلم' : shotLatestInvItemsLimit === 0 ? 'همه' : 'مخفی'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { val: 3, label: '۳ قلم' },
                          { val: 5, label: '۵ قلم' },
                          { val: 0, label: 'همه اقلام' },
                          { val: -1, label: 'عدم نمایش' },
                        ].map((opt) => (
                          <button
                            key={`shot-items-limit-${opt.val}`}
                            type="button"
                            onClick={() => setShotLatestInvItemsLimit(opt.val)}
                            className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none ${
                              shotLatestInvItemsLimit === opt.val
                                ? `${theme.primary} text-white shadow-xs`
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2C. Invoices calculation limit */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                          فاکتورهای محاسباتی:
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {shotInvoiceLimit > 0 ? `${toPersianDigits(shotInvoiceLimit)} فاکتور` : 'همه'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { val: 0, label: 'همه' },
                          { val: 3, label: '۳ فاکتور' },
                          { val: 5, label: '۵ فاکتور' },
                          { val: 10, label: '۱۰ فاکتور' },
                        ].map((opt) => (
                          <button
                            key={`shot-inv-limit-${opt.val}`}
                            type="button"
                            onClick={() => setShotInvoiceLimit(opt.val)}
                            className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none ${
                              shotInvoiceLimit === opt.val
                                ? `${theme.primary} text-white shadow-xs`
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. Customization Checkboxes */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={shotShowSummaryCards}
                        onChange={(e) => setShotShowSummaryCards(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                      />
                      <span>کارت‌های مالی ۳گانه (بدهی/واریزی/مانده)</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={shotShowLatestInvoice}
                        onChange={(e) => setShotShowLatestInvoice(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                      />
                      <span>جزئیات آخرین فاکتور (کارتن‌ها و اقلام)</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={shotShowAccountSummary}
                        onChange={(e) => setShotShowAccountSummary(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                      />
                      <span>کادر جامع خلاصه حساب</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={shotShowBankInfo}
                        onChange={(e) => setShotShowBankInfo(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                      />
                      <span>شماره کارت فروشگاه</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={shotShowCustomerContact}
                        onChange={(e) => setShotShowCustomerContact(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-0 cursor-pointer accent-indigo-600"
                      />
                      <span>اطلاعات تماس</span>
                    </label>
                  </div>

                  {/* 4. Theme Mode Selector Pill (حالت روز / حالت شب) */}
                  <div className="flex items-center justify-between p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setShotThemeMode('day')}
                      className={`flex-1 py-1 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none ${
                        shotThemeMode === 'day'
                          ? 'bg-slate-100 text-slate-900 shadow-xs border border-slate-200'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>قالب روز (روشن)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShotThemeMode('night')}
                      className={`flex-1 py-1 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none ${
                        shotThemeMode === 'night'
                          ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>قالب شب (تاریک بدون حاشیه سفید)</span>
                    </button>
                  </div>
                </div>

                {/* Printable / Capturable Shot Card Container (کاملاً متقارن، فلت، تراز دقیق دوطرفه، پشتیبانی کامل شب و بدون تومان تکراری) */}
                <div 
                  id="customer-statement-shot-card"
                  className={`p-6 rounded-2xl border space-y-4 w-full mx-auto relative overflow-hidden transition-all duration-200 ${
                    shotThemeMode === 'day'
                      ? 'bg-white text-slate-900 border-slate-200 shadow-sm'
                      : 'dark bg-slate-950 text-slate-100 border-slate-800 shadow-md'
                  }`}
                  style={{ direction: 'rtl', boxSizing: 'border-box' }}
                >
                  {/* 1. TOP HEADER (هدر لوگو برنامه و صورت‌حساب مشتری با تقارن کامل) */}
                  <div className={`flex items-center justify-between border-b pb-3.5 relative z-10 ${
                    shotThemeMode === 'day' ? 'border-slate-100' : 'border-slate-800'
                  }`}>
                    {/* Header Right (RTL): صورت‌حساب مشتری */}
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        shotThemeMode === 'day' 
                          ? `${theme.primaryLight} ${theme.primaryText} border ${theme.borderColor}`
                          : `bg-slate-900 ${theme.primaryText} border border-slate-800`
                      } shadow-none shrink-0`}>
                        <FileText className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="text-right">
                        <h3 className={`font-black text-xl sm:text-2xl tracking-tight leading-none ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                          صورت‌حساب مشتری
                        </h3>
                        <p className="text-xs font-medium mt-1 text-slate-400">
                          مشاهده و مدیریت حساب مشتریان
                        </p>
                      </div>
                    </div>

                    {/* Header Left (RTL): برند بازرگانی و لوگوی واقعی برنامه */}
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <h4 className={`font-black text-xl sm:text-2xl tracking-tight leading-none ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                          {settings.brandName || 'بازرگانی'}
                        </h4>
                        <p className="text-xs font-medium text-left mt-1 text-slate-400">
                          {settings.subtitle || 'فروش کالا و خدمات'}
                        </p>
                      </div>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${theme.primary} text-white shadow-xs overflow-hidden shrink-0`}>
                        {settings.appLogo ? (
                          settings.appLogo.startsWith('data:image') ? (
                            <img src={settings.appLogo} alt="Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-xl select-none font-black">{settings.appLogo}</span>
                          )
                        ) : (
                          <Store className="w-5 h-5 text-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. SUB-HEADER PILLS (فیلتر فاکتورها، نوع نمایش و تاریخ) */}
                  <div className="flex items-center justify-between relative z-10 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border ${
                        shotThemeMode === 'day'
                          ? `${theme.primaryLight} ${theme.primaryText} ${theme.borderColor}`
                          : `bg-slate-900 ${theme.primaryText} border-slate-800`
                      }`}>
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>
                          {shotFilterType === 'payments' 
                            ? `${toPersianDigits(displayedShotRows.length)} سند واریزی`
                            : shotFilterType === 'invoices'
                            ? (shotInvoiceLimit > 0 ? `${toPersianDigits(activeShotInvoices.length)} فاکتور آخر` : `${toPersianDigits(activeShotInvoices.length)} فاکتور`)
                            : `${toPersianDigits(displayedShotRows.length)} گردش حساب`}
                        </span>
                      </div>

                      {shotFilterType !== 'all' && (
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-md border ${
                          shotThemeMode === 'day'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}>
                          {shotFilterType === 'invoices' ? 'نمایش فاکتورها' : 'نمایش واریزی‌ها'}
                        </span>
                      )}
                    </div>

                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold border ${
                      shotThemeMode === 'day'
                        ? 'bg-slate-50 text-slate-700 border-slate-200'
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}>
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      <span>تا تاریخ {toPersianDigits(getCurrentPersianDate())}</span>
                    </div>
                  </div>

                  {/* 3. CUSTOMER PROFILE & 3 FINANCIAL METRIC CARDS ROW */}
                  <div className={`grid grid-cols-12 gap-3.5 items-stretch p-3.5 rounded-xl border relative z-10 ${
                    shotThemeMode === 'day'
                      ? 'bg-slate-50/70 border-slate-200/90'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}>
                    {/* Right: Customer Profile Card */}
                    <div className={`${shotShowSummaryCards ? 'col-span-12 lg:col-span-5' : 'col-span-12'} flex items-center gap-3 p-3 rounded-xl border ${
                      shotThemeMode === 'day'
                        ? 'bg-white border-slate-200/90 text-slate-900'
                        : 'bg-slate-900 border-slate-800 text-slate-100'
                    }`}>
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-white text-lg shadow-none shrink-0 ${theme.primary}`}>
                        <User className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            shotThemeMode === 'day'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                          }`}>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>طرف‌حساب فعال</span>
                          </span>
                        </div>
                        <h4 className={`font-black text-base sm:text-lg leading-tight truncate ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                          {targetShotCustomer.name}
                        </h4>
                        {shotShowCustomerContact && (
                          <div className={`flex items-center gap-2 text-xs font-bold flex-wrap ${shotThemeMode === 'day' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {targetShotCustomer.phone && (
                              <span className="inline-flex items-center gap-1 font-mono dir-ltr">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{toPersianDigits(targetShotCustomer.phone)}</span>
                              </span>
                            )}
                            {targetShotCustomer.phone && targetShotCustomer.city && <span>•</span>}
                            {targetShotCustomer.city && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{targetShotCustomer.city}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Left: 3 Metric Cards */}
                    {shotShowSummaryCards && (
                      <div className={`col-span-12 lg:col-span-7 grid grid-cols-3 gap-2 p-2.5 rounded-xl border ${
                        shotThemeMode === 'day'
                          ? 'bg-white border-slate-200/90'
                          : 'bg-slate-900 border-slate-800'
                      }`}>
                        {/* 1. مجموع بدهی */}
                        <div className="space-y-1 text-right px-1.5 py-0.5">
                          <div className="flex items-center gap-1.5 justify-start">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              shotThemeMode === 'day' ? 'bg-rose-100 text-rose-600' : 'bg-rose-950/70 text-rose-400'
                            }`}>
                              <Receipt className="w-3 h-3" />
                            </div>
                            <span className={`text-[10px] font-bold whitespace-nowrap ${shotThemeMode === 'day' ? 'text-slate-500' : 'text-slate-400'}`}>مجموع بدهی</span>
                          </div>
                          <div className="text-sm sm:text-base font-black font-mono dir-ltr text-right text-rose-600 dark:text-rose-400 leading-tight">
                            {formatPrice(targetShotTotalInvoicesAmount, false)}
                          </div>
                          <div className={`text-[9px] font-bold text-left ${shotThemeMode === 'day' ? 'text-slate-400' : 'text-slate-500'}`}>تومان</div>
                        </div>

                        {/* 2. مجموع پرداخت‌ها */}
                        <div className={`space-y-1 text-right border-r border-l px-2 py-0.5 ${
                          shotThemeMode === 'day' ? 'border-slate-100' : 'border-slate-800'
                        }`}>
                          <div className="flex items-center gap-1.5 justify-start">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              shotThemeMode === 'day' ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-950/70 text-emerald-400'
                            }`}>
                              <CreditCard className="w-3 h-3" />
                            </div>
                            <span className={`text-[10px] font-bold whitespace-nowrap ${shotThemeMode === 'day' ? 'text-slate-500' : 'text-slate-400'}`}>مجموع واریزی‌ها</span>
                          </div>
                          <div className="text-sm sm:text-base font-black font-mono dir-ltr text-right text-emerald-600 dark:text-emerald-400 leading-tight">
                            {formatPrice(targetShotTotalPaid, false)}
                          </div>
                          <div className={`text-[9px] font-bold text-left ${shotThemeMode === 'day' ? 'text-slate-400' : 'text-slate-500'}`}>تومان</div>
                        </div>

                        {/* 3. مانده حساب */}
                        <div className="space-y-1 text-right px-1.5 py-0.5">
                          <div className="flex items-center gap-1.5 justify-start">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                              shotThemeMode === 'day' ? `${theme.primaryLight} ${theme.primaryText}` : 'bg-slate-800 text-sky-400'
                            }`}>
                              <Scale className="w-3 h-3" />
                            </div>
                            <span className={`text-[10px] font-bold whitespace-nowrap ${shotThemeMode === 'day' ? 'text-slate-500' : 'text-slate-400'}`}>مانده حساب</span>
                          </div>
                          <div className={`text-sm sm:text-base font-black font-mono dir-ltr text-right leading-tight ${
                            targetShotLiveBal > 0 
                              ? 'text-rose-600 dark:text-rose-400' 
                              : targetShotLiveBal < 0 
                              ? (shotThemeMode === 'day' ? theme.primaryText : 'text-sky-400')
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {targetShotLiveBal > 0 
                              ? `+${formatPrice(targetShotLiveBal, false)}` 
                              : targetShotLiveBal < 0 
                              ? `-${formatPrice(Math.abs(targetShotLiveBal), false)}` 
                              : '۰'}
                          </div>
                          <div className={`text-[9px] font-bold text-left ${shotThemeMode === 'day' ? 'text-slate-400' : 'text-slate-500'}`}>تومان</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. TABLE: تاریخچه گردش‌ها، فاکتورها و واریزی‌ها (منطبق ۱۰۰٪ بر فیلتر انتخابی) */}
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${shotThemeMode === 'day' ? theme.primaryText : 'text-sky-400'}`} />
                        <h4 className={`font-black text-sm ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                          {shotFilterType === 'payments' 
                            ? 'گردش واریزی‌ها و دریافت‌های مالی' 
                            : shotFilterType === 'invoices' 
                            ? 'تاریخچه فاکتورهای صادره' 
                            : 'تاریخچه فاکتورها و واریزی‌ها'}
                        </h4>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                        shotThemeMode === 'day' 
                          ? `${theme.primaryLight} ${theme.primaryText} ${theme.borderColor}`
                          : 'bg-slate-900 text-sky-400 border-slate-800'
                      }`}>
                        {shotFilterType === 'payments'
                          ? `${toPersianDigits(displayedShotRows.length)} سند واریزی`
                          : shotFilterType === 'invoices'
                          ? `${toPersianDigits(displayedShotRows.length)} فاکتور`
                          : `${toPersianDigits(displayedShotRows.length)} مورد در لیست`}
                      </span>
                    </div>

                    <div className={`rounded-xl border overflow-hidden ${
                      shotThemeMode === 'day'
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-800 bg-slate-900'
                    }`}>
                      <table className="w-full text-right text-xs border-collapse table-fixed">
                        <thead>
                          <tr className={`border-b font-black text-[11px] sm:text-xs ${
                            shotThemeMode === 'day'
                              ? 'bg-slate-50 text-slate-700 border-slate-200'
                              : 'bg-slate-950 text-slate-200 border-slate-800'
                          }`}>
                            <th style={{ width: '6%' }} className="py-2.5 px-1 text-center">#</th>
                            <th style={{ width: '13%' }} className="py-2.5 px-1 text-center">نوع سند</th>
                            <th style={{ width: '27%' }} className="py-2.5 px-2 text-center">عنوان، تاریخ و سند</th>
                            <th style={{ width: '22%' }} className="py-2.5 px-2 text-center">مبلغ سند</th>
                            <th style={{ width: '20%' }} className="py-2.5 px-2 text-center">پرداخت و مانده</th>
                            <th style={{ width: '12%' }} className="py-2.5 px-1 text-center">وضعیت</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y font-bold ${
                          shotThemeMode === 'day' ? 'divide-slate-100' : 'divide-slate-800/80'
                        }`}>
                          {displayedShotRows.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                                {shotFilterType === 'invoices' 
                                  ? 'فاکتوری برای این مشتری ثبت نشده است.' 
                                  : shotFilterType === 'payments' 
                                  ? 'سند واریزی یا پرداختی برای این طرف‌حساب ثبت نشده است.' 
                                  : 'گردش حسابی برای این مشتری ثبت نشده است.'}
                              </td>
                            </tr>
                          ) : (
                            displayedShotRows.map((row, idx) => {
                              if (row.type === 'invoice') {
                                const inv = row.invoice;
                                const isPurchase = row.isPurchase || inv?.type === 'purchase';
                                const effAmount = row.amount;
                                const paidAmt = row.paidAmount || 0;
                                const remAmt = row.remainingAmount || 0;
                                const isFullyPaid = row.isSettled || remAmt <= 0;

                                return (
                                  <tr key={`shot-row-${row.id || idx}-${idx}`} className={`transition-colors ${
                                    shotThemeMode === 'day' ? 'hover:bg-slate-50/70' : 'hover:bg-slate-800/50'
                                  }`}>
                                    <td className={`py-2.5 px-1 text-center font-mono text-[11px] ${
                                      shotThemeMode === 'day' ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                      {toPersianDigits(idx + 1)}
                                    </td>
                                    <td className="py-2.5 px-1 text-center">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                                        isPurchase
                                          ? (shotThemeMode === 'day' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-950/70 text-purple-300 border-purple-800')
                                          : (shotThemeMode === 'day' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-950/70 text-indigo-300 border-indigo-800')
                                      }`}>
                                        {isPurchase ? 'فاکتور خرید' : 'فاکتور فروش'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                      <div className="flex flex-col items-center justify-center leading-tight">
                                        <span className={`font-mono text-xs font-bold ${
                                          shotThemeMode === 'day' ? 'text-slate-800' : 'text-slate-200'
                                        }`}>
                                          {inv?.invoiceNumber ? `فاکتور #${toPersianDigits(inv.invoiceNumber)}` : row.code}
                                        </span>
                                        <span className={`font-mono text-[11px] ${
                                          shotThemeMode === 'day' ? 'text-slate-500' : 'text-slate-400'
                                        }`}>
                                          {toPersianDigits(row.date)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                      <div className="flex flex-col items-center justify-center leading-tight">
                                        <span className={`font-mono font-black text-xs sm:text-sm dir-ltr ${
                                          shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'
                                        }`}>
                                          {formatPrice(effAmount, false)}
                                        </span>
                                        <span className={`text-[10px] font-bold ${
                                          shotThemeMode === 'day' ? 'text-slate-400' : 'text-slate-500'
                                        }`}>
                                          تومان
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                      <div className="flex flex-col items-center justify-center text-[11px] leading-tight space-y-0.5">
                                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 dir-ltr">
                                          پرداخت: {paidAmt > 0 ? formatPrice(paidAmt, false) : '۰'}
                                        </span>
                                        {remAmt > 0 ? (
                                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400 dir-ltr">
                                            مانده: {formatPrice(remAmt, false)}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            تسویه کامل
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-1 text-center">
                                      {isFullyPaid ? (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black mx-auto whitespace-nowrap ${
                                          shotThemeMode === 'day'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                                        }`}>
                                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                          <span>تسویه شده</span>
                                        </span>
                                      ) : (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black mx-auto whitespace-nowrap ${
                                          shotThemeMode === 'day'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-amber-950/70 text-amber-300 border-amber-800'
                                        }`}>
                                          <Clock className="w-3 h-3 text-amber-500" />
                                          <span>باقی مانده</span>
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              }

                              if (row.type === 'payment') {
                                return (
                                  <tr key={`shot-row-${row.id || idx}-${idx}`} className={`transition-colors ${
                                    shotThemeMode === 'day' ? 'hover:bg-slate-50/70' : 'hover:bg-slate-800/50'
                                  }`}>
                                    <td className={`py-2.5 px-1 text-center font-mono text-[11px] ${
                                      shotThemeMode === 'day' ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                      {toPersianDigits(idx + 1)}
                                    </td>
                                    <td className="py-2.5 px-1 text-center">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                                        shotThemeMode === 'day' 
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                          : 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                                      }`}>
                                        واریزی
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                      <div className="flex flex-col items-center justify-center leading-tight">
                                        <span className={`text-xs font-bold ${
                                          shotThemeMode === 'day' ? 'text-slate-800' : 'text-slate-200'
                                        }`}>
                                          {row.methodText ? `واریز (${row.methodText})` : 'سند واریز دریافتی'}
                                        </span>
                                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400 mt-0.5">
                                          <span>{toPersianDigits(row.date)}</span>
                                          {row.referenceNumber && (
                                            <span>· کد: {toPersianDigits(row.referenceNumber)}</span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                      <div className="flex flex-col items-center justify-center leading-tight">
                                        <span className="font-mono font-black text-xs sm:text-sm dir-ltr text-emerald-600 dark:text-emerald-400">
                                          +{formatPrice(row.amount, false)}
                                        </span>
                                        <span className={`text-[10px] font-bold ${
                                          shotThemeMode === 'day' ? 'text-slate-400' : 'text-slate-500'
                                        }`}>
                                          تومان
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-center">
                                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                        سند قطعی دریافتی
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-1 text-center">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black mx-auto whitespace-nowrap ${
                                        shotThemeMode === 'day'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                                      }`}>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        <span>ثبت واریز</span>
                                      </span>
                                    </td>
                                  </tr>
                                );
                              }

                              // Return row
                              return (
                                <tr key={`shot-row-${row.id || idx}-${idx}`} className={`transition-colors ${
                                  shotThemeMode === 'day' ? 'hover:bg-slate-50/70' : 'hover:bg-slate-800/50'
                                }`}>
                                  <td className={`py-2.5 px-1 text-center font-mono text-[11px] ${
                                    shotThemeMode === 'day' ? 'text-slate-400' : 'text-slate-500'
                                  }`}>
                                    {toPersianDigits(idx + 1)}
                                  </td>
                                  <td className="py-2.5 px-1 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                                      shotThemeMode === 'day' 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                        : 'bg-rose-950/70 text-rose-300 border-rose-800'
                                    }`}>
                                      مرجوعی
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                      <span className={`text-xs font-bold ${
                                        shotThemeMode === 'day' ? 'text-slate-800' : 'text-slate-200'
                                      }`}>
                                        {row.code}
                                      </span>
                                      <span className="font-mono text-[11px] text-slate-400">
                                        {toPersianDigits(row.date)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                      <span className="font-mono font-black text-xs sm:text-sm dir-ltr text-rose-600 dark:text-rose-400">
                                        -{formatPrice(row.amount, false)}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400">
                                        تومان
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    <span className="text-[11px] font-bold text-slate-500">
                                      کسر از حساب بدهی
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-1 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black mx-auto whitespace-nowrap ${
                                      shotThemeMode === 'day'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-rose-950/70 text-rose-300 border-rose-800'
                                    }`}>
                                      <CheckCircle2 className="w-3 h-3 text-rose-500" />
                                      <span>مرجوعی</span>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 5. BOTTOM 2-COLUMN SECTION (جزئیات آخرین فاکتور در راست + خلاصه حساب در چپ) */}
                  {(shotShowLatestInvoice || shotShowAccountSummary) && (
                    <div className={`grid ${shotShowLatestInvoice && shotShowAccountSummary ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-3.5 relative z-10`}>
                      
                      {/* Right Box: جزئیات آخرین فاکتور (شامل تعداد کارتن‌ها، اقلام و چند محصول از فاکتور) */}
                      {shotShowLatestInvoice && (
                        <div className={`p-3.5 rounded-xl border space-y-3 ${
                          shotThemeMode === 'day'
                            ? 'bg-slate-50/70 border-slate-200/90 text-slate-900'
                            : 'bg-slate-900/80 border-slate-800 text-slate-100'
                        }`}>
                          <div className={`flex items-center justify-between pb-2 border-b ${
                            shotThemeMode === 'day' ? 'border-slate-200/70' : 'border-slate-800'
                          }`}>
                            <div className="flex items-center gap-2">
                              <FileText className={`w-4 h-4 ${shotThemeMode === 'day' ? theme.primaryText : 'text-sky-400'}`} />
                              <h4 className={`font-black text-sm ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                                جزئیات آخرین فاکتور
                              </h4>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                              shotThemeMode === 'day'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            }`}>
                              {targetShotLatestInvoice?.type === 'purchase' ? 'فاکتور خرید' : 'فاکتور فروش'}
                            </span>
                          </div>

                          {/* Invoice Meta */}
                          {targetShotLatestInvoice ? (
                            <>
                              <div className={`flex items-center justify-between text-xs font-bold ${
                                shotThemeMode === 'day' ? 'text-slate-600' : 'text-slate-400'
                              }`}>
                                <span>شماره فاکتور: <strong className={`font-mono ${shotThemeMode === 'day' ? 'text-slate-800' : 'text-slate-200'}`}>{toPersianDigits(targetShotLatestInvoice.invoiceNumber)}</strong></span>
                                <span>تاریخ: <strong className={`font-mono ${shotThemeMode === 'day' ? 'text-slate-800' : 'text-slate-200'}`}>{toPersianDigits(targetShotLatestInvoice.date)}</strong></span>
                              </div>

                              {/* Highlight Card: Total Cartons & Items in Invoice */}
                              <div className={`p-2.5 rounded-lg text-xs font-bold border flex items-center justify-between ${
                                shotThemeMode === 'day' 
                                  ? 'bg-white text-slate-800 border-slate-200' 
                                  : 'bg-slate-950/90 text-slate-200 border-slate-800'
                              }`}>
                                <div className="flex items-center gap-1.5">
                                  <Package className="w-4 h-4 text-indigo-500 shrink-0" />
                                  <span>
                                    کل فاکتور: <strong>{toPersianDigits(latestInvItems.length)} قلم کالا</strong>
                                    {' '}
                                    ({toPersianDigits(latestInvTotalCartons)} کارتن {latestInvTotalExtraPieces > 0 ? `و ${toPersianDigits(latestInvTotalExtraPieces)} عدد` : ''})
                                  </span>
                                </div>
                                <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px] shrink-0">
                                  مجموعاً {toPersianDigits(latestInvTotalPieces)} عدد
                                </span>
                              </div>

                              {/* Items Display Scope Indicator */}
                              {shotLatestInvItemsLimit !== -1 && (
                                <div className="space-y-1.5 pt-0.5">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 px-0.5">
                                    <span>
                                      {latestInvItemsToShow.length < latestInvItems.length
                                        ? `${toPersianDigits(latestInvItemsToShow.length)} قلم از فاکتور نمایش داده شده است (${toPersianDigits(remainingLatestItemsCount)} قلم دیگر در فاکتور ثبت است):`
                                        : `نمایش تمامی ${toPersianDigits(latestInvItems.length)} قلم کالای فاکتور:`}
                                    </span>
                                  </div>

                                  {/* Items Rows */}
                                  <div className="space-y-1 text-xs">
                                    {latestInvItemsToShow.map((it, itIdx) => {
                                      const totalPieces = it.totalPieces || ((it.cartonsCount || 0) * (it.piecesPerCarton || 1) + (it.extraPieces || 0));
                                      const rowTotal = it.totalPrice || (totalPieces * (it.unitSellingPrice || it.unitPrice || 0));
                                      return (
                                        <div key={`shot-latest-item-${itIdx}`} className={`flex items-center justify-between font-bold py-1.5 px-2 rounded-lg border ${
                                          shotThemeMode === 'day' ? 'bg-white border-slate-100 text-slate-800' : 'bg-slate-950/60 border-slate-800/80 text-slate-200'
                                        }`}>
                                          <div className="flex items-center gap-1.5 truncate max-w-[55%]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                            <span className="truncate">{it.productName}</span>
                                          </div>
                                          <div className="flex items-center gap-2 font-mono text-[11px]">
                                            <span className="text-slate-500">
                                              {it.cartonsCount > 0 ? `${toPersianDigits(it.cartonsCount)} ک` : ''}
                                              {it.cartonsCount > 0 && it.extraPieces > 0 ? ' + ' : ''}
                                              {it.extraPieces > 0 ? `${toPersianDigits(it.extraPieces)} د` : ''}
                                              {' '}({toPersianDigits(totalPieces)} عدد)
                                            </span>
                                            <span className="dir-ltr text-left font-black text-slate-900 dark:text-white">
                                              {formatPrice(rowTotal, false)}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {shotLatestInvItemsLimit === -1 && (
                                <div className="text-center py-2 text-slate-400 text-xs font-medium">
                                  نمایش اقلام فاکتور در تنظیمات مخفی شده است (فاکتور شامل {toPersianDigits(latestInvItems.length)} قلم است).
                                </div>
                              )}

                              {/* Subtotal */}
                              <div className={`flex items-center justify-between pt-1.5 border-t ${
                                shotThemeMode === 'day' ? 'border-slate-200/80' : 'border-slate-800'
                              }`}>
                                <span className={`font-black text-sm ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>مبلغ کل فاکتور</span>
                                <span className={`font-black text-sm font-mono dir-ltr ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                                  {formatPrice(targetShotLatestInvoice.finalAmount || 0, false)} تومان
                                </span>
                              </div>

                              {/* Payment Banner */}
                              {(() => {
                                const eff = getInvoiceEffectiveAmount(targetShotLatestInvoice);
                                const isSet = targetShotLatestInvoice.paymentStatus === 'cash' || (targetShotLatestInvoice.paymentMethod?.includes('نقدی') && !targetShotLatestInvoice.paymentMethod?.includes('نسیه') && !targetShotLatestInvoice.paymentMethod?.includes('غیر'));
                                const paid = isSet ? eff : ((targetShotLatestInvoice as any).paidAmount || 0);
                                const rem = Math.max(0, eff - paid);
                                const fullyPaid = rem <= 0 || isSet;
                                
                                if (fullyPaid) {
                                  return (
                                    <div className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border ${
                                      shotThemeMode === 'day'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                    }`}>
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                      <span>پرداخت کامل · فاکتور تسویه شد</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className={`p-2 rounded-lg text-xs font-bold flex items-center justify-between px-3 border ${
                                    shotThemeMode === 'day'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-amber-950/80 text-amber-300 border-amber-800'
                                  }`}>
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="w-4 h-4 text-amber-500" />
                                      <span>مانده پرداخت فاکتور:</span>
                                    </div>
                                    <span className="font-mono font-black dir-ltr">
                                      {formatPrice(rem, false)} تومان
                                    </span>
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            <div className="py-6 text-center text-xs text-slate-400 font-medium">
                              فاکتوری برای این مشتری یافت نشد.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Left Box: خلاصه حساب (۵۰٪ عرض) */}
                      {shotShowAccountSummary && (
                        <div className={`p-3.5 rounded-xl border space-y-3 ${
                          shotThemeMode === 'day'
                            ? 'bg-slate-50/70 border-slate-200/90 text-slate-900'
                            : 'bg-slate-900/80 border-slate-800 text-slate-100'
                        }`}>
                          <div className={`flex items-center justify-between pb-2 border-b ${
                            shotThemeMode === 'day' ? 'border-slate-200/70' : 'border-slate-800'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Wallet className={`w-4 h-4 ${shotThemeMode === 'day' ? theme.primaryText : 'text-sky-400'}`} />
                              <h4 className={`font-black text-sm ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                                خلاصه حساب جامع
                              </h4>
                            </div>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                              shotThemeMode === 'day' ? `${theme.primaryLight} ${theme.primaryText}` : 'bg-slate-800 text-sky-400'
                            }`}>
                              <ShoppingBag className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Summary Rows */}
                          <div className="space-y-1.5 text-xs">
                            <div className={`flex items-center justify-between py-1 border-b ${
                              shotThemeMode === 'day' ? 'border-slate-100 text-slate-700' : 'border-slate-800/80 text-slate-300'
                            }`}>
                              <div className="flex items-center gap-1.5 font-bold">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  shotThemeMode === 'day' ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-950/70 text-emerald-400'
                                }`}>
                                  <Receipt className="w-3 h-3" />
                                </div>
                                <span>مجموع فاکتورهای فروش</span>
                              </div>
                              <span className={`font-black font-mono dir-ltr ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                                {formatPrice(targetShotTotalSalesInvoices, false)} تومان
                              </span>
                            </div>

                            <div className={`flex items-center justify-between py-1 border-b ${
                              shotThemeMode === 'day' ? 'border-slate-100 text-slate-700' : 'border-slate-800/80 text-slate-300'
                            }`}>
                              <div className="flex items-center gap-1.5 font-bold">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  shotThemeMode === 'day' ? 'bg-purple-100 text-purple-600' : 'bg-purple-950/70 text-purple-400'
                                }`}>
                                  <ShoppingBag className="w-3 h-3" />
                                </div>
                                <span>مجموع فاکتورهای خرید</span>
                              </div>
                              <span className={`font-black font-mono dir-ltr ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                                {formatPrice(targetShotTotalPurchaseInvoices, false)} تومان
                              </span>
                            </div>

                            <div className={`flex items-center justify-between py-1 border-b ${
                              shotThemeMode === 'day' ? 'border-slate-100 text-slate-700' : 'border-slate-800/80 text-slate-300'
                            }`}>
                              <div className="flex items-center gap-1.5 font-bold">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  shotThemeMode === 'day' ? `${theme.primaryLight} ${theme.primaryText}` : 'bg-slate-800 text-sky-400'
                                }`}>
                                  <CreditCard className="w-3 h-3" />
                                </div>
                                <span>مجموع واریزی‌ها و دریافت‌ها</span>
                              </div>
                              <span className={`font-black font-mono dir-ltr ${shotThemeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                                {formatPrice(targetShotTotalPaid, false)} تومان
                              </span>
                            </div>

                            {/* Highlight Card: مانده حساب مشتری */}
                            <div className={`p-2 rounded-lg border flex items-center justify-between mt-1 ${
                              shotThemeMode === 'day'
                                ? 'bg-white border-slate-200/90 text-slate-800'
                                : 'bg-slate-950 border-slate-800 text-slate-100'
                            }`}>
                              <div className="flex items-center gap-1.5 font-black">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  shotThemeMode === 'day' ? `${theme.primaryLight} ${theme.primaryText}` : 'bg-slate-800 text-sky-400'
                                }`}>
                                  <Scale className="w-3 h-3" />
                                </div>
                                <span>مانده نهایی حساب</span>
                              </div>
                              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-black font-mono dir-ltr border ${
                                targetShotLiveBal > 0 
                                  ? (shotThemeMode === 'day' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-rose-950/70 text-rose-300 border-rose-900')
                                  : targetShotLiveBal < 0 
                                  ? (shotThemeMode === 'day' ? `${theme.primaryLight} ${theme.primaryText} ${theme.borderColor}` : 'bg-slate-900 text-sky-300 border-slate-800')
                                  : (shotThemeMode === 'day' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-emerald-950/70 text-emerald-300 border-emerald-800')
                              }`}>
                                <Receipt className="w-3 h-3" />
                                <span>
                                  {targetShotLiveBal > 0 
                                    ? `+${formatPrice(targetShotLiveBal, false)}` 
                                    : targetShotLiveBal < 0 
                                    ? `-${formatPrice(Math.abs(targetShotLiveBal), false)}` 
                                    : '۰'} تومان
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6. STORE BANK ACCOUNT INFO (در صورت فعال بودن در تنظیمات) */}
                  {shotShowBankInfo && (settings.cardNumber || settings.bankName || settings.shabaNumber) && (
                    <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-2.5 relative z-10 ${
                      shotThemeMode === 'day' 
                        ? 'bg-slate-50/90 border-slate-200/90 text-slate-900' 
                        : 'bg-slate-900/80 border-slate-800 text-slate-100'
                    }`}>
                      <div className="flex items-center gap-2.5 text-right w-full sm:w-auto">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          shotThemeMode === 'day' ? `${theme.primaryLight} ${theme.primaryText}` : 'bg-slate-800 text-sky-400'
                        }`}>
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black flex items-center gap-2 flex-wrap">
                            <span>شماره کارت واریز:</span>
                            {settings.bankName && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {settings.bankName}
                              </span>
                            )}
                            {settings.accountOwner && (
                              <span className="text-[11px] text-slate-500 font-medium">({settings.accountOwner})</span>
                            )}
                          </div>
                          {settings.shabaNumber && (
                            <div className="text-[10.5px] font-mono text-slate-400 mt-0.5 dir-ltr text-right">
                              IR{toPersianDigits(settings.shabaNumber)}
                            </div>
                          )}
                        </div>
                      </div>
                      {settings.cardNumber && (
                        <div className="flex items-center gap-2 font-mono font-black text-xs sm:text-sm dir-ltr tracking-wider px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shrink-0">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>{toPersianDigits(settings.cardNumber.replace(/\s+/g, '').replace(/(\d{4})/g, '$1 ').trim())}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 7. CLEAN FOOTER (پاورقی تشکر و تاریخ با تراز دقیق دوطرفه) */}
                  <div className={`pt-3 border-t flex items-center justify-between text-xs font-bold relative z-10 ${
                    shotThemeMode === 'day' ? 'border-slate-100 text-slate-400' : 'border-slate-800 text-slate-400'
                  }`}>
                    <div className={`flex items-center gap-1.5 ${shotThemeMode === 'day' ? 'text-slate-600' : 'text-slate-300'}`}>
                      <Sparkles className={`w-4 h-4 ${shotThemeMode === 'day' ? theme.primaryText : 'text-sky-400'}`} />
                      <span>با تشکر از اعتماد و همکاری شما</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      <span>تاریخ صدور گزارش: {toPersianDigits(getCurrentPersianDate())}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Section */}
                <div className="space-y-2.5 pt-1">
                  {/* Action 1 & 2: Quick Side-by-Side Copy Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Copy Image Button */}
                    <button
                      type="button"
                      disabled={isCopyingShotImage || isExportingShot}
                      onClick={async () => {
                        setIsCopyingShotImage(true);
                        const shotTextSummary = `📋 *صورت‌حساب مالی طرف‌حساب*
👤 *نام مشتری:* ${targetShotCustomer.name} ${targetShotCustomer.company ? `(${targetShotCustomer.company})` : ''}
📅 *تاریخ گزارش:* ${toPersianDigits(getCurrentPersianDate())}

🔴 *مانده بدهکاری فعلی:* ${targetShotLiveBal > 0 ? formatPrice(targetShotLiveBal) : '۰ (تسویه‌شده)'}
💳 *مجموع واریزی‌ها:* ${formatPrice(targetShotTotalPaid)}
🧾 *مبلغ ${shotInvoiceLimit > 0 ? `${toPersianDigits(activeShotInvoices.length)} فاکتور اخیر` : 'کل فاکتورها'}:* ${formatPrice(targetShotTotalInvoicesAmount)}${targetShotLatestInvoice && latestInvItems.length > 0 ? `\n📦 *آخرین فاکتور (#${toPersianDigits(targetShotLatestInvoice.invoiceNumber)}):* ${toPersianDigits(latestInvItems.length)} قلم کالا (${toPersianDigits(latestInvTotalCartons)} کارتن) به مبلغ ${formatPrice(targetShotLatestInvoice.finalAmount || 0)}` : ''}

با تشکر از اعتماد شما 🙏`;

                        await copyInvoiceImageToClipboard(
                          'customer-statement-shot-card',
                          () => {
                            onShowAlert?.(
                              '✅ عکس شات وضعیت حساب در کلیپ‌بورد کپی شد! در محیط تلگرام یا ایتا کلید Paste (Ctrl+V) را بزنید.',
                              'success',
                              'کپی عکس صورت‌حساب'
                            );
                          },
                          (errMsg) => {
                            onShowAlert?.(errMsg, 'info', 'کپی اسکرین‌شات');
                          },
                          shotTextSummary
                        );
                        setIsCopyingShotImage(false);
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                      title="کپی مستقیم عکس در حافظه جهت ارسال با Ctrl+V در تلگرام"
                    >
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>{isCopyingShotImage ? 'در حال تصویربرداری...' : '۱. کپی عکس صورت‌حساب (Ctrl+V)'}</span>
                    </button>

                    {/* Copy Caption Text Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const shotTextSummary = `📋 *صورت‌حساب مالی طرف‌حساب*
👤 *نام مشتری:* ${targetShotCustomer.name} ${targetShotCustomer.company ? `(${targetShotCustomer.company})` : ''}
📅 *تاریخ گزارش:* ${toPersianDigits(getCurrentPersianDate())}

🔴 *مانده بدهکاری فعلی:* ${targetShotLiveBal > 0 ? formatPrice(targetShotLiveBal) : '۰ (تسویه‌شده)'}
💳 *مجموع واریزی‌ها:* ${formatPrice(targetShotTotalPaid)}
🧾 *مبلغ ${shotInvoiceLimit > 0 ? `${toPersianDigits(activeShotInvoices.length)} فاکتور اخیر` : 'کل فاکتورها'}:* ${formatPrice(targetShotTotalInvoicesAmount)}${targetShotLatestInvoice && latestInvItems.length > 0 ? `\n📦 *آخرین فاکتور (#${toPersianDigits(targetShotLatestInvoice.invoiceNumber)}):* ${toPersianDigits(latestInvItems.length)} قلم کالا (${toPersianDigits(latestInvTotalCartons)} کارتن) به مبلغ ${formatPrice(targetShotLatestInvoice.finalAmount || 0)}` : ''}

با تشکر از حسن اعتماد شما 🙏`;

                        navigator.clipboard.writeText(shotTextSummary);
                        setCopiedText(true);
                        setTimeout(() => setCopiedText(false), 2500);
                        onShowAlert?.(
                          'متن کامل کپشن در کلیپ‌بورد کپی شد! اکنون می‌توانید در کادر چت تلگرام Paste کنید.',
                          'success',
                          'کپی متن کپشن'
                        );
                      }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                      title="کپی متن خلاصه جهت الصاق در کادر کپشن تلگرام"
                    >
                      {copiedText ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-emerald-600 dark:text-emerald-400">متن کپشن کپی شد!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>۲. کپی متن کپشن (برای تلگرام)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Secondary 3 Actions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Download Image PNG */}
                    <button
                      type="button"
                      disabled={isExportingShot || isCopyingShotImage}
                      onClick={async () => {
                        setIsExportingShot(true);
                        await downloadInvoiceAsImage('customer-statement-shot-card', `صورت‌حساب_${targetShotCustomer.name}`);
                        setIsExportingShot(false);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-white font-black text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 ${theme.primary}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isExportingShot ? 'در حال ساخت...' : 'دانلود عکس PNG'}</span>
                    </button>

                    {/* Direct Telegram Link Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const shotTextSummary = `📋 *صورت‌حساب مالی طرف‌حساب*
👤 *نام مشتری:* ${targetShotCustomer.name} ${targetShotCustomer.company ? `(${targetShotCustomer.company})` : ''}
📅 *تاریخ:* ${toPersianDigits(getCurrentPersianDate())}
🔴 *مانده بدهکاری:* ${targetShotLiveBal > 0 ? formatPrice(targetShotLiveBal) : '۰ (تسویه)'}
💳 *واریزی‌ها:* ${formatPrice(targetShotTotalPaid)}`;
                        const tgUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(shotTextSummary)}`;
                        window.open(tgUrl, '_blank');
                      }}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>ارسال به تلگرام</span>
                    </button>

                    {/* Native Share */}
                    <button
                      type="button"
                      onClick={() => {
                        const textSummary = `📋 صورت‌حساب ${targetShotCustomer.name}
مانده بدهکاری: ${targetShotLiveBal > 0 ? formatPrice(targetShotLiveBal) : 'تسویه'}
مجموع واریزی: ${formatPrice(targetShotTotalPaid)}
مبلغ ${shotInvoiceLimit > 0 ? `${toPersianDigits(activeShotInvoices.length)} فاکتور` : 'کل فاکتورها'}: ${formatPrice(targetShotTotalInvoicesAmount)}
تاریخ: ${toPersianDigits(getCurrentPersianDate())}`;
                        if (navigator.share) {
                          navigator.share({
                            title: `صورت‌حساب ${targetShotCustomer.name}`,
                            text: textSummary,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(textSummary);
                          setCopiedText(true);
                          setTimeout(() => setCopiedText(false), 2500);
                        }
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs shadow-xs transition-all cursor-pointer`}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>اشتراک‌گذاری</span>
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: View Statement Document (Receipt / Transaction Details) */}
      <AnimatePresence>
        {viewingLedgerDoc && (() => {
          const doc = viewingLedgerDoc;
          const raw = doc.rawObj || {};
          const isCredit = doc.credit > 0;
          const amt = isCredit ? doc.credit : doc.debit;
          const custName = selectedCustomerForStatement?.name || raw.customerName || 'مشتری';
          const custPhone = selectedCustomerForStatement?.phone || '';
          const custCompany = selectedCustomerForStatement?.company || '';
          const refNum = raw.referenceNumber || raw.invoiceNumber || '';
          const itemsList: any[] = raw.items || [];

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 text-right max-h-[90vh] flex flex-col overflow-hidden"
                dir="rtl"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      doc.type === 'payment'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : doc.type === 'manual_debt'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    }`}>
                      {doc.type === 'payment' ? (
                        <Banknote className="w-5 h-5" />
                      ) : doc.type === 'manual_debt' ? (
                        <TrendingDown className="w-5 h-5" />
                      ) : (
                        <RotateCcw className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-base">
                        {doc.type === 'payment'
                          ? 'جزئیات سند واریزی و بستانکاری'
                          : doc.type === 'manual_debt'
                          ? 'جزئیات سند ثبت بدهی'
                          : doc.type === 'return_to_supplier'
                          ? 'جزئیات مرجوعی کالا به شرکت'
                          : doc.type === 'return_from_customer'
                          ? 'جزئیات مرجوعی کالا از مشتری'
                          : 'جزئیات تراکنش مالی'}
                      </h3>
                      <p className="text-xs text-slate-400 font-bold">
                        کد سند: <span className="font-mono text-slate-700 dark:text-slate-300">{toPersianDigits(doc.code)}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingLedgerDoc(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content Body */}
                <div className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
                  {/* Customer Info Card */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">طرف حساب:</span>
                      <span className="font-black text-slate-900 dark:text-white text-sm">
                        {custName} {custCompany ? `(${custCompany})` : ''}
                      </span>
                    </div>
                    {custPhone && (
                      <div className="text-left dir-ltr">
                        <span className="text-[11px] text-slate-400 block font-medium">شماره تماس:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {toPersianDigits(custPhone)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-0.5">
                      <span className="text-slate-400 text-[11px] block">تاریخ و زمان ثبت:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {toPersianDigits(doc.date)} {doc.time ? ` - ${toPersianDigits(doc.time)}` : ''}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-0.5">
                      <span className="text-slate-400 text-[11px] block">روش پرداخت / نوع:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {doc.methodText || (isCredit ? 'تسویه / بستانکاری' : 'بدهکاری')}
                      </span>
                    </div>
                  </div>

                  {/* Amount Card */}
                  <div className={`p-3.5 rounded-2xl border space-y-1 ${
                    isCredit
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/60'
                      : 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300 font-bold">
                        {isCredit ? 'مبلغ واریزی / بستانکاری:' : 'مبلغ بدهکار / نسیه:'}
                      </span>
                      <span className={`font-black text-base dir-ltr ${
                        isCredit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                      }`}>
                        {formatPrice(amt)}
                      </span>
                    </div>
                    {amt > 0 && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        مبلغ به حروف: <span className="font-bold text-slate-800 dark:text-slate-200">{numberToPersianWords(amt)}</span>
                      </p>
                    )}
                  </div>

                  {/* Reference & Running Balance */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {refNum && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-0.5">
                        <span className="text-slate-400 text-[11px] block">شماره پیگیری / فیش:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {toPersianDigits(refNum)}
                        </span>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-0.5">
                      <span className="text-slate-400 text-[11px] block">مانده حساب پس از این تراکنش:</span>
                      <span className="font-black text-slate-900 dark:text-white dir-ltr">
                        {formatPrice(doc.runningBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Items List Table if present */}
                  {itemsList.length > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="font-black text-slate-800 dark:text-slate-200 block text-[11px]">
                        اقلام ثبت شده در این سند ({toPersianDigits(itemsList.length)} کالا):
                      </span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-[11px]">
                          <thead className="bg-slate-200/50 dark:bg-slate-800/50 font-black text-slate-600 dark:text-slate-300">
                            <tr>
                              <th className="p-1.5">کالا</th>
                              <th className="p-1.5 text-center">تعداد</th>
                              <th className="p-1.5 text-left">قیمت کل</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40">
                            {itemsList.map((it: any, i: number) => (
                              <tr key={`ledger-item-${it.id || it.productId || i}-${i}`}>
                                <td className="p-1.5 font-bold text-slate-900 dark:text-white">{it.productName}</td>
                                <td className="p-1.5 text-center font-bold">{toPersianDigits(it.totalPieces)}</td>
                                <td className="p-1.5 text-left dir-ltr font-bold text-slate-800 dark:text-slate-200">
                                  {formatPrice(it.totalPrice || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Description Box */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1">
                    <span className="text-slate-400 block font-bold text-[11px]">توضیحات و بابت:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 leading-relaxed block">
                      {doc.description || raw.description || 'بدون توضیحات تکمیلی'}
                    </span>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  {(doc.type === 'payment' || doc.type === 'manual_debt') && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewingLedgerDoc(null);
                        handleOpenEditPayment(raw);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-bold text-xs shadow-xs transition-all cursor-pointer`}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>ویرایش این سند</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingLedgerDoc(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
                  >
                    بستن
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL 7: 1-Click Full Customer Settlement Modal (تسویه کامل حساب مشتری با یک کلیک) */}
      <AnimatePresence>
        {isSettlementModalOpen && targetCustomerForSettlement && (() => {
          const fin = getCustomerFinanceDetails(targetCustomerForSettlement, invoices, payments, productReturns);
          const liveBal = fin.liveBalance;
          const isDebtor = liveBal > 0;
          const isCreditor = liveBal < 0;
          const isSettled = liveBal === 0;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md no-print overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 my-auto"
              >
                {/* Modal Header Bar */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl ${theme.primary} text-white shadow-xs`}>
                      <CheckCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                        <span>تسویه کامل حساب مشتری (یک کلیک)</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        صفر شدن پرونده، کسر پرداختی‌ها و مرجوعی‌ها، و به‌روزرسانی نقدینگی صندوق/بانک
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettlementModalOpen(false)}
                    className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmitSettlement} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                  
                  {/* Customer Selector / Info Header */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                        طرف حساب انتخابی:
                      </label>
                      <span className="text-[11px] text-slate-400 font-bold">
                        تلفن: {toPersianDigits(targetCustomerForSettlement.phone)}
                      </span>
                    </div>

                    <select
                      value={targetCustomerForSettlement.id}
                      onChange={(e) => {
                        const nextCust = customers.find(c => c.id === e.target.value);
                        if (nextCust) handleOpenSettlementModal(nextCust);
                      }}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {customers.map((c, cIdx) => {
                        const bal = getCustomerFinanceDetails(c, invoices, payments, productReturns).liveBalance;
                        const label = bal > 0 ? `بدهکار: ${formatPrice(bal)}` : bal < 0 ? `بستانکار: ${formatPrice(Math.abs(bal))}` : 'تسویه شده';
                        return (
                          <option key={`settle-opt-${c.id || cIdx}-${cIdx}`} value={c.id}>
                            {c.name} {c.company ? `(${c.company})` : ''} - [{label}]
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Financial Breakdown Card (بدهکاری کل، پرداختی‌ها، مرجوعی، مانده نهایی) */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60 text-xs">
                      <span className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-emerald-600" />
                        <span>خلاصه وضعیت مالی و گردش حساب</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        isDebtor
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : isCreditor
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {isDebtor ? 'حساب بدهکار' : isCreditor ? 'حساب بستانکار' : 'بی‌حساب'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>بدهکاری کل ناخالص (فاکتورها + مانده اول + نسیه):</span>
                        <span className="font-black text-slate-900 dark:text-white dir-ltr">
                          {formatPrice(fin.grossDebts)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                        <span>مجموع واریزی‌ها و دریافتی‌های قبلی (-):</span>
                        <span className="font-black dir-ltr">
                          {formatPrice(fin.grossCredits)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-400">
                        <span>کسر بابت مرجوعی کالا (-):</span>
                        <span className="font-black dir-ltr">
                          {formatPrice(fin.allReturnsTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Final Settlement Amount Highlight */}
                    <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isDebtor
                        ? `${theme.primaryLight} ${theme.borderColor} ${theme.primaryText}`
                        : isCreditor
                        ? `${theme.badgeBg} ${theme.borderColor} ${theme.badgeText}`
                        : 'bg-slate-200/50 dark:bg-slate-800/50 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}>
                      <div>
                        <span className="text-[11px] font-bold block opacity-80">
                          {isDebtor ? 'مبلغ واریزی جهت تسویه کامل بدهی:' : isCreditor ? 'مبلغ عودت بستانکاری به مشتری:' : 'وضعیت مانده حساب:'}
                        </span>
                        <div className="text-xl font-black dir-ltr text-right">
                          {formatPrice(Math.abs(liveBal))}
                        </div>
                      </div>

                      <div className="text-left">
                        <span className="text-xs font-bold opacity-90">
                          {isDebtor ? 'دریافت از مشتری و افزایش نقدینگی' : isCreditor ? 'پرداخت به مشتری و کسر از نقدینگی' : 'حساب بدون بدهی'}
                        </span>
                      </div>
                    </div>

                    {liveBal !== 0 && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        مبلغ تسویه به حروف: <span className="font-black text-slate-900 dark:text-slate-200">{numberToPersianWords(Math.abs(liveBal))}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Method & Destination Selection */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                        روش پرداخت و تسویه
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setSettlementMethod('bank_transfer')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            settlementMethod === 'bank_transfer'
                              ? `${theme.primary} text-white font-black shadow-xs`
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Building className="w-4 h-4" />
                          <span>حواله بانکی</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSettlementMethod('card')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            settlementMethod === 'card'
                              ? `${theme.primary} text-white font-black shadow-xs`
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>کارت به کارت</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSettlementMethod('cash');
                            setSettlementAccountType('cash');
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            settlementMethod === 'cash'
                              ? `${theme.primary} text-white font-black shadow-xs`
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Banknote className="w-4 h-4" />
                          <span>نقدی / صندوق</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSettlementMethod('check')}
                          className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            settlementMethod === 'check'
                              ? `${theme.primary} text-white font-black shadow-xs`
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>چک صیادی</span>
                        </button>
                      </div>
                    </div>

                    {/* Account Destination (بانک / صندوق) */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                        حساب مقصد جهت افزایش نقدینگی
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSettlementAccountType('bank')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            settlementAccountType === 'bank'
                              ? `${theme.primary} text-white font-black shadow-xs`
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Building className="w-4 h-4" />
                          <span>حساب بانکی (موجودی بانک)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSettlementAccountType('cash')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            settlementAccountType === 'cash'
                              ? `${theme.primary} text-white font-black shadow-xs`
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          <Wallet className="w-4 h-4" />
                          <span>صندوق نقدی (موجودی صندوق)</span>
                        </button>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                          تاریخ تسویه (شمسی)
                        </label>
                        <input
                          type="text"
                          required
                          value={settlementDate}
                          onChange={(e) => setSettlementDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold text-center"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                          ساعت ثبت
                        </label>
                        <input
                          type="text"
                          value={settlementTime}
                          onChange={(e) => setSettlementTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold text-center"
                        />
                      </div>
                    </div>

                    {/* Reference Number */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                        شماره پیگیری / فیش واریز
                      </label>
                      <input
                        type="text"
                        value={settlementRef}
                        onChange={(e) => setSettlementRef(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-mono dir-ltr text-right"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                        شرح و بابت تسویه حساب
                      </label>
                      <input
                        type="text"
                        value={settlementNotes}
                        onChange={(e) => setSettlementNotes(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                      />
                    </div>

                    {/* Automation Checkboxes */}
                    <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={settleOpenInvoicesChecked}
                          onChange={(e) => setSettleOpenInvoicesChecked(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>تسویه خودکار وضعیت فاکتورهای نسیه باز این مشتری</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={settleOpenReturnsChecked}
                          onChange={(e) => setSettleOpenReturnsChecked(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <span>تسویه قطعی مرجوعی‌های کالا و لحاظ شدن در پرونده</span>
                      </label>
                    </div>

                  </div>

                  {/* Footer Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsSettlementModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={isSettled}
                      className={`px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-2 transition-all ${
                        isSettled
                          ? 'bg-slate-400 cursor-not-allowed opacity-60'
                          : `${theme.primary} ${theme.primaryHover} shadow-md`
                      }`}
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>{isSettled ? 'حساب هم‌اکنون تسویه است' : '⚡ تأیید و اعمال تسویه کامل حساب'}</span>
                    </button>
                  </div>
                </form>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
};
