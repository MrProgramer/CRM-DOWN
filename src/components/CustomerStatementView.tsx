import React, { useState } from 'react';
import { Customer, Invoice, CustomerPayment, StoreSettings, ProductReturn } from '../types';
import { Pagination } from './Pagination';
import { RowUpdateBadge, RowUpdateIcon } from './RowUpdateBadge';
import { 
  formatPrice, 
  toPersianDigits, 
  getCurrentPersianDate, 
  getCurrentPersianTime,
  numberToPersianWords,
  getNetReturnAmount,
  getCustomerTypeInfo
} from '../utils/formatters';
import {
  getCustomerSalesInvoices,
  getCustomerPurchaseInvoices,
  getCustomerCreditSalesTotal,
  getCustomerCreditPurchasesTotal,
  getCustomerPayments,
  calculateCustomerLiveBalance
} from '../utils/customerBalanceCalculations';
import { 
  ArrowRight,
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Printer, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Camera, 
  CheckCircle2, 
  Eye, 
  RotateCcw, 
  Banknote, 
  CheckCheck, 
  History, 
  Search, 
  FileText, 
  Phone, 
  MapPin, 
  Building,
  Building2,
  Calendar,
  CreditCard,
  MessageCircle,
  Send,
  FileSpreadsheet,
  Package,
  CalendarDays,
  ExternalLink,
  Save,
  AlertCircle,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Copy,
  Check,
  Tag,
  ShieldCheck,
  Percent,
  Wallet,
  ArrowUpDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerStatementViewProps {
  customer: Customer;
  customers: Customer[];
  invoices: Invoice[];
  payments: CustomerPayment[];
  productReturns?: ProductReturn[];
  settings: StoreSettings;
  isDarkMode?: boolean;
  theme: any;
  onBack: () => void;
  onNewInvoice: (customer: Customer) => void;
  onOpenPaymentModal: (customer: Customer) => void;
  onOpenSettlementModal: (customer: Customer) => void;
  onOpenBalanceAdjModal: (customer: Customer, type?: 'credit' | 'payout' | 'debt' | 'initial_balance') => void;
  onOpenShotModal: (customer: Customer) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onEditInvoice?: (invoice: Invoice) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
  onEditPayment: (payment: CustomerPayment) => void;
  onDeletePayment: (payment: CustomerPayment) => void;
  onViewDoc: (doc: any) => void;
  onEditCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onShowAlert?: (message: string, type?: 'success' | 'warning' | 'error' | 'info', title?: string) => void;
  renderCustomerTypeIcon: (iconName: string, className?: string) => React.ReactNode;
  highlightedPaymentId?: string | null;
}

export const CustomerStatementView: React.FC<CustomerStatementViewProps> = ({
  customer,
  customers,
  invoices,
  payments,
  productReturns = [],
  settings,
  isDarkMode = false,
  theme,
  highlightedPaymentId = null,
  onBack,
  onNewInvoice,
  onOpenPaymentModal,
  onOpenSettlementModal,
  onOpenBalanceAdjModal,
  onOpenShotModal,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onEditPayment,
  onDeletePayment,
  onViewDoc,
  onEditCustomer,
  onUpdateCustomer,
  onShowAlert,
  renderCustomerTypeIcon
}) => {
  const currentCustomer = customers.find(c => c.id === customer.id) || customer;

  // Tabs: ledger (دفتر معین), invoices (فاکتورها), payments (واریزی‌ها), returns (مرجوعی‌ها), purchased_items (سبد خرید و اقلام), profile_details (پرونده و سقف اعتبار)
  const [activeTab, setActiveTab] = useState<'ledger' | 'invoices' | 'payments' | 'returns' | 'purchased_items' | 'profile_details'>('ledger');
  
  // Ledger Filters & Pagination
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilterType, setLedgerFilterType] = useState<'all' | 'credit_sales' | 'payments' | 'returns'>('all');
  const [ledgerDateFilter, setLedgerDateFilter] = useState<'all' | 'today' | 'this_month' | 'last_3_months' | 'this_year'>('all');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerItemsPerPage, setLedgerItemsPerPage] = useState(20);

  // Table Sort Orders across tabs (Default: Newest First - descending)
  const [ledgerSortOrder, setLedgerSortOrder] = useState<'desc' | 'asc'>('desc');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'desc' | 'asc'>('desc');
  const [paymentSortOrder, setPaymentSortOrder] = useState<'desc' | 'asc'>('desc');
  const [returnSortOrder, setReturnSortOrder] = useState<'desc' | 'asc'>('desc');

  // Invoices Tab Filters & Pagination
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'cash' | 'credit' | 'partial'>('all');
  const [invoicePage, setInvoicePage] = useState(1);

  // Payments Tab Filters
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'card' | 'bank_transfer' | 'cash' | 'check'>('all');
  const [paymentPage, setPaymentPage] = useState(1);

  // Purchased Items Filter & Sort
  const [purchasedSearch, setPurchasedSearch] = useState('');
  const [purchasedSort, setPurchasedSort] = useState<'total_spent' | 'total_cartons' | 'name' | 'last_date'>('total_spent');

  // Inline Customer Notes State
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(currentCustomer.notes || '');

  // Debt Reminder SMS/WhatsApp Modal
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderType, setReminderType] = useState<'formal' | 'friendly' | 'brief' | 'card_info'>('formal');
  const [reminderCopied, setReminderCopied] = useState(false);

  // Core Financial Data Calculations
  const custInvoices = getCustomerSalesInvoices(currentCustomer, invoices);
  const custPurchaseInvoices = getCustomerPurchaseInvoices(currentCustomer, invoices);
  const custPayments = getCustomerPayments(currentCustomer, payments);
  const liveBal = calculateCustomerLiveBalance(currentCustomer, invoices, payments, productReturns);
  
  const totalCreditInvoices = getCustomerCreditSalesTotal(currentCustomer, invoices);
  const totalCreditPurchases = getCustomerCreditPurchasesTotal(currentCustomer, invoices);
  const manualDebtsTotal = custPayments.filter(p => (Number(p.amount) || 0) < 0).reduce((sum, p) => sum + Math.abs(Number(p.amount) || 0), 0);
  const totalCreditSalesAndDebts = totalCreditInvoices + manualDebtsTotal;
  const totalPaidDeposits = custPayments.filter(p => (Number(p.amount) || 0) > 0).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalGrossInvoices = custInvoices.reduce((sum, inv) => sum + (inv.finalAmount || 0), 0);

  const custReturns = productReturns.filter(r => 
    r.customerId === currentCustomer.id || 
    (r.customerName && currentCustomer.name && r.customerName.trim().toLowerCase() === currentCustomer.name.trim().toLowerCase())
  );
  const totalCustReturnsValue = custReturns.reduce((sum, r) => sum + getNetReturnAmount(r), 0);
  const settledCustReturnsValue = custReturns.filter(r => r.isRefunded).reduce((sum, r) => sum + getNetReturnAmount(r), 0);

  const isDebtor = liveBal > 0;
  const isCreditor = liveBal < 0;
  const isSettled = liveBal === 0;

  // Credit Limit Calculations
  const creditLimit = currentCustomer.creditLimit || 0;
  const creditUsagePercent = creditLimit > 0 ? Math.min(100, Math.round((Math.max(0, liveBal) / creditLimit) * 100)) : 0;
  const remainingCredit = creditLimit > 0 ? Math.max(0, creditLimit - Math.max(0, liveBal)) : 0;
  const isCreditExceeded = creditLimit > 0 && liveBal > creditLimit;

  // Build Ledger Rows
  type LedgerRow = {
    id: string;
    date: string;
    time: string;
    type: 'invoice_credit' | 'invoice_cash' | 'payment' | 'manual_debt' | 'return_to_supplier' | 'return_from_customer';
    title: string;
    subtitle?: string;
    code: string;
    methodText?: string;
    debit: number;
    credit: number;
    rawObj: any;
    timestamp: number;
  };

  const rows: LedgerRow[] = [];

  // 1. Sales Invoices
  custInvoices.forEach((inv) => {
    const isCredit = inv.paymentStatus === 'credit' || inv.paymentMethod?.includes('نسیه') || inv.paymentMethod?.includes('غیر');
    const computedSubtotal = (inv.items && inv.items.length > 0)
      ? inv.items.reduce((s, it) => {
          const uPrice = (it.unitSellingPrice !== undefined && it.unitSellingPrice > 0)
            ? it.unitSellingPrice
            : (it.totalPieces > 0 ? Math.round((it.totalPrice || 0) / it.totalPieces) : 0);
          return s + (uPrice > 0 ? uPrice * it.totalPieces : (it.totalPrice || 0));
        }, 0)
      : (inv.subtotal || 0);

    const returnOffset = Number(inv.offsetReturnsTotal) || 0;
    const expenseDeductions = Number(inv.expensesTotalDeduction) || (inv.expenses || []).filter(e => e.action === 'deduct').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const expenseAdditions = Number(inv.expensesTotalAddition) || (inv.expenses || []).filter(e => e.action === 'add').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const discount = Number(inv.discount) || 0;
    const tax = Number(inv.tax) || 0;

    const computedFinal = Math.max(0, computedSubtotal - discount + tax - returnOffset - expenseDeductions + expenseAdditions);
    const effectiveFinal = (computedFinal > 0) ? computedFinal : (Number(inv.finalAmount) || 0);

    const isPartial = inv.paymentStatus === 'partial' || (inv.paidAmount !== undefined && inv.paidAmount > 0 && inv.paidAmount < effectiveFinal);

    const deductionNote = (returnOffset > 0 || expenseDeductions > 0)
      ? ` (کسر ${formatPrice(returnOffset + expenseDeductions)} بابت مرجوعی/کرایه)`
      : '';

    if (isPartial) {
      const paid = inv.paidAmount || 0;
      const unpaid = (inv.remainingAmount !== undefined && inv.finalAmount === effectiveFinal)
        ? inv.remainingAmount
        : Math.max(0, effectiveFinal - paid);
      rows.push({
        id: inv.id,
        date: inv.date,
        time: inv.time || '12:00',
        type: 'invoice_credit',
        title: `فاکتور با پرداخت بخشی #${toPersianDigits(inv.invoiceNumber)}`,
        subtitle: `${toPersianDigits(inv.items.length)} قلم کالا (${formatPrice(paid)} نقد + ${formatPrice(unpaid)} مانده نسیه)${deductionNote}`,
        code: inv.invoiceNumber,
        methodText: inv.paymentMethod || 'پرداخت بخشی (نقد و نسیه)',
        debit: unpaid,
        credit: 0,
        rawObj: inv,
        timestamp: inv.createdAt || Date.now(),
      });
    } else {
      rows.push({
        id: inv.id,
        date: inv.date,
        time: inv.time || '12:00',
        type: isCredit ? 'invoice_credit' : 'invoice_cash',
        title: isCredit ? `فاکتور نسیه #${toPersianDigits(inv.invoiceNumber)}` : `فاکتور نقدی #${toPersianDigits(inv.invoiceNumber)}`,
        subtitle: `${toPersianDigits(inv.items.length)} قلم کالا (${inv.paymentMethod || (isCredit ? 'نسیه' : 'نقدی')})${deductionNote}`,
        code: inv.invoiceNumber,
        methodText: inv.paymentMethod,
        debit: isCredit ? effectiveFinal : 0,
        credit: 0,
        rawObj: inv,
        timestamp: inv.createdAt || Date.now(),
      });
    }
  });

  // 2. Purchase / Inward Invoices (From Supplier / Partner)
  custPurchaseInvoices.forEach((inv) => {
    const isCredit = inv.paymentStatus === 'credit' || inv.paymentMethod?.includes('نسیه') || inv.paymentMethod?.includes('غیر');
    const computedSubtotal = (inv.items && inv.items.length > 0)
      ? inv.items.reduce((s, it) => {
          const uPrice = (it.unitPurchasePrice !== undefined && it.unitPurchasePrice > 0)
            ? it.unitPurchasePrice
            : (it.unitSellingPrice || 0);
          return s + (uPrice > 0 ? uPrice * it.totalPieces : (it.totalPrice || 0));
        }, 0)
      : (inv.subtotal || 0);

    const returnOffset = Number(inv.offsetReturnsTotal) || 0;
    const expenseDeductions = Number(inv.expensesTotalDeduction) || (inv.expenses || []).filter(e => e.action === 'deduct').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const expenseAdditions = Number(inv.expensesTotalAddition) || (inv.expenses || []).filter(e => e.action === 'add').reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const discount = Number(inv.discount) || 0;
    const tax = Number(inv.tax) || 0;

    const computedFinal = Math.max(0, computedSubtotal - discount + tax - returnOffset - expenseDeductions + expenseAdditions);
    const effectiveFinal = (computedFinal > 0) ? computedFinal : (Number(inv.finalAmount) || 0);

    const isPartial = inv.paymentStatus === 'partial' || (inv.paidAmount !== undefined && inv.paidAmount > 0 && inv.paidAmount < effectiveFinal);

    const deductionNote = (returnOffset > 0 || expenseDeductions > 0)
      ? ` (کسر ${formatPrice(returnOffset + expenseDeductions)} بابت مرجوعی/کرایه)`
      : '';

    if (isPartial) {
      const paid = inv.paidAmount || 0;
      const unpaid = (inv.remainingAmount !== undefined && inv.finalAmount === effectiveFinal)
        ? inv.remainingAmount
        : Math.max(0, effectiveFinal - paid);
      rows.push({
        id: `purch-${inv.id}`,
        date: inv.date,
        time: inv.time || '12:00',
        type: 'invoice_credit',
        title: `فاکتور خرید با پرداخت بخشی #${toPersianDigits(inv.invoiceNumber)}`,
        subtitle: `${toPersianDigits(inv.items.length)} قلم کالا (${formatPrice(paid)} نقد + ${formatPrice(unpaid)} بستانکاری مانده)${deductionNote}`,
        code: inv.invoiceNumber,
        methodText: inv.paymentMethod || 'پرداخت بخشی (نقد و نسیه)',
        debit: 0,
        credit: unpaid,
        rawObj: inv,
        timestamp: inv.createdAt || Date.now(),
      });
    } else {
      rows.push({
        id: `purch-${inv.id}`,
        date: inv.date,
        time: inv.time || '12:00',
        type: isCredit ? 'invoice_credit' : 'invoice_cash',
        title: isCredit ? `فاکتور خرید نسیه #${toPersianDigits(inv.invoiceNumber)}` : `فاکتور خرید نقدی #${toPersianDigits(inv.invoiceNumber)}`,
        subtitle: `${toPersianDigits(inv.items.length)} قلم کالا (${inv.paymentMethod || (isCredit ? 'نسیه' : 'نقدی')})${deductionNote}`,
        code: inv.invoiceNumber,
        methodText: inv.paymentMethod,
        debit: 0,
        credit: isCredit ? effectiveFinal : 0,
        rawObj: inv,
        timestamp: inv.createdAt || Date.now(),
      });
    }
  });

  custPayments.forEach((pay) => {
    const methodText = pay.paymentMethod === 'card' ? 'کارت به کارت' : pay.paymentMethod === 'bank_transfer' ? 'واریز بانکی' : pay.paymentMethod === 'cash' ? 'نقدی' : 'چک صیادی';
    const amt = Number(pay.amount) || 0;
    const isDeposit = amt >= 0;
    rows.push({
      id: pay.id,
      date: pay.date,
      time: pay.time || '12:00',
      type: isDeposit ? 'payment' : 'manual_debt',
      title: isDeposit ? `واریزی مشتری (${methodText})` : 'ثبت بدهی دستی',
      subtitle: pay.description ? pay.description : (isDeposit ? (pay.referenceNumber ? `کد پیگیری: ${toPersianDigits(pay.referenceNumber)}` : 'تسویه حساب') : 'افزایش بدهی دفتری'),
      code: pay.referenceNumber || '',
      methodText,
      debit: isDeposit ? 0 : Math.abs(amt),
      credit: isDeposit ? amt : 0,
      rawObj: pay,
      timestamp: pay.createdAt || Date.now(),
    });
  });

  custReturns.forEach((ret) => {
    const isToSupplier = ret.type === 'to_supplier';
    const netVal = getNetReturnAmount(ret);
    const extraText = ret.extraCosts && ret.extraCosts > 0 
      ? ` (کسر ${formatPrice(ret.extraCosts)} کسر/باربری = خالص ${formatPrice(netVal)})` 
      : '';
    const isSettledReturn = !!ret.isRefunded;
    const methodLabel = ret.refundMethod === 'cash' ? 'صندوق نقدی' : 'حساب بانکی';

    rows.push({
      id: `ret-${ret.id}`,
      date: ret.date,
      time: ret.time || '12:00',
      type: isToSupplier ? 'return_to_supplier' : 'return_from_customer',
      title: isToSupplier 
        ? (isSettledReturn ? `مرجوع به شرکت (تسویه نقدی ${methodLabel})` : 'مرجوعی کالا به شرکت') 
        : (isSettledReturn ? `مرجوعی مشتری (تسویه نقدی ${methodLabel})` : 'مرجوعی کالا از مشتری'),
      subtitle: `«${ret.productName}» (${toPersianDigits(ret.cartonsCount)} کارتن${ret.extraPieces ? ` و ${toPersianDigits(ret.extraPieces)} دانه` : ''})${extraText} - علت: ${ret.reason}${isSettledReturn ? ` [تسویه و استرداد نقدی وجه به مبلغ ${formatPrice(netVal)} از طریق ${methodLabel}]` : ' [کسر از مانده بدهی مشتری]' }`,
      code: ret.id.slice(-4).toUpperCase(),
      debit: isToSupplier ? netVal : 0,
      credit: !isToSupplier ? netVal : 0,
      rawObj: ret,
      timestamp: ret.createdAt || Date.now(),
    });

    if (isSettledReturn) {
      rows.push({
        id: `ref-payout-${ret.id}`,
        date: ret.date,
        time: ret.time || '12:00',
        type: isToSupplier ? 'payment' : 'manual_debt',
        title: isToSupplier
          ? `دریافت وجه تسویه مرجوعی از شرکت (${methodLabel})`
          : `تسویه و پرداخت وجه مرجوعی به مشتری (${methodLabel})`,
        subtitle: isToSupplier
          ? `استرداد نقدی مبلغ ${formatPrice(netVal)} بابت مرجوعی «${ret.productName}» به حساب`
          : `پرداخت نقدی مبلغ ${formatPrice(netVal)} بابت استرداد وجه کالای مرجوعی «${ret.productName}» از طریق ${methodLabel}`,
        code: `PAY-${ret.id.slice(-4).toUpperCase()}`,
        debit: !isToSupplier ? netVal : 0,
        credit: isToSupplier ? netVal : 0,
        rawObj: ret,
        timestamp: (ret.createdAt || Date.now()) + 1,
      });
    }
  });

  rows.sort((a, b) => a.timestamp - b.timestamp);
  let runningBal = currentCustomer.initialBalance || 0;
  const computedRows = rows.map((r) => {
    runningBal = runningBal + r.debit - r.credit;
    return { ...r, runningBalance: runningBal };
  });

  // Filter Ledger Rows
  const filteredLedgerRows = computedRows.filter((r) => {
    // Date filter
    const curDate = getCurrentPersianDate();
    if (ledgerDateFilter === 'today' && r.date !== curDate) return false;
    if (ledgerDateFilter === 'this_month' && r.date.slice(0, 7) !== curDate.slice(0, 7)) return false;
    if (ledgerDateFilter === 'this_year' && r.date.slice(0, 4) !== curDate.slice(0, 4)) return false;

    // Type filter
    if (ledgerFilterType === 'credit_sales' && !(r.type === 'invoice_credit' || r.type === 'manual_debt')) return false;
    if (ledgerFilterType === 'payments' && r.type !== 'payment') return false;
    if (ledgerFilterType === 'returns' && !r.type.startsWith('return')) return false;

    // Search term
    const term = ledgerSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      r.title.toLowerCase().includes(term) ||
      (r.subtitle && r.subtitle.toLowerCase().includes(term)) ||
      r.code.toLowerCase().includes(term) ||
      r.date.includes(term) ||
      toPersianDigits(r.date).includes(term) ||
      r.debit.toString().includes(term) ||
      r.credit.toString().includes(term)
    );
  });

  // Sort Ledger Rows (Default: Newest first - descending)
  const sortedLedgerRows = React.useMemo(() => {
    return [...filteredLedgerRows].sort((a, b) => {
      return ledgerSortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });
  }, [filteredLedgerRows, ledgerSortOrder]);

  const ledgerTotalPages = Math.ceil(sortedLedgerRows.length / ledgerItemsPerPage) || 1;
  const ledgerStartIndex = (ledgerPage - 1) * ledgerItemsPerPage;
  const paginatedLedgerRows = sortedLedgerRows.slice(ledgerStartIndex, ledgerStartIndex + ledgerItemsPerPage);

  // Summary of filtered ledger rows
  const filteredDebitsTotal = filteredLedgerRows.reduce((sum, r) => sum + (r.debit || 0), 0);
  const filteredCreditsTotal = filteredLedgerRows.reduce((sum, r) => sum + (r.credit || 0), 0);

  // Purchased Items Aggregation
  type PurchasedItemSummary = {
    name: string;
    totalCartons: number;
    totalPieces: number;
    totalSpend: number;
    invoicesCount: number;
    lastDate: string;
    avgUnitPrice: number;
  };
  const purchasedMap: { [name: string]: PurchasedItemSummary } = {};
  custInvoices.forEach(inv => {
    inv.items.forEach(it => {
      const k = it.productName.trim();
      const itemUnitPrice = it.unitSellingPrice && it.unitSellingPrice > 0
        ? it.unitSellingPrice
        : (it.totalPieces > 0 ? Math.round(it.totalPrice / it.totalPieces) : 0);
      const lineSpend = (itemUnitPrice > 0 && it.totalPieces > 0)
        ? (itemUnitPrice * it.totalPieces)
        : (it.totalPrice || 0);

      if (!purchasedMap[k]) {
        purchasedMap[k] = {
          name: k,
          totalCartons: 0,
          totalPieces: 0,
          totalSpend: 0,
          invoicesCount: 0,
          lastDate: inv.date,
          avgUnitPrice: itemUnitPrice,
        };
      }
      purchasedMap[k].totalCartons += it.cartonsCount || 0;
      purchasedMap[k].totalPieces += it.totalPieces || 0;
      purchasedMap[k].totalSpend += lineSpend;
      purchasedMap[k].invoicesCount += 1;
      if (inv.date >= purchasedMap[k].lastDate) {
        purchasedMap[k].lastDate = inv.date;
        if (itemUnitPrice > 0) {
          purchasedMap[k].avgUnitPrice = itemUnitPrice;
        }
      }
    });
  });
  let purchasedList = Object.values(purchasedMap);
  if (purchasedSearch.trim()) {
    const pTerm = purchasedSearch.trim().toLowerCase();
    purchasedList = purchasedList.filter(p => p.name.toLowerCase().includes(pTerm));
  }
  purchasedList.sort((a, b) => {
    if (purchasedSort === 'total_spent') return b.totalSpend - a.totalSpend;
    if (purchasedSort === 'total_cartons') return b.totalCartons - a.totalCartons;
    if (purchasedSort === 'last_date') return b.lastDate.localeCompare(a.lastDate);
    return a.name.localeCompare(b.name, 'fa');
  });

  // Filter & Sort Invoices Tab (Default: Newest First)
  const filteredInvoices = custInvoices.filter(inv => {
    if (invoiceStatusFilter === 'cash' && inv.paymentStatus !== 'cash') return false;
    if (invoiceStatusFilter === 'credit' && inv.paymentStatus !== 'credit') return false;
    if (invoiceStatusFilter === 'partial' && inv.paymentStatus !== 'partial') return false;
    if (invoiceSearch.trim()) {
      const term = invoiceSearch.trim().toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(term) ||
        inv.date.includes(term) ||
        toPersianDigits(inv.invoiceNumber).includes(term) ||
        inv.items.some(it => it.productName.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const sortedInvoices = React.useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      const ta = a.createdAt || (a.date ? new Date(a.date.replace(/\//g, '-')).getTime() || 0 : 0);
      const tb = b.createdAt || (b.date ? new Date(b.date.replace(/\//g, '-')).getTime() || 0 : 0);
      return invoiceSortOrder === 'desc' ? tb - ta : ta - tb;
    });
  }, [filteredInvoices, invoiceSortOrder]);

  // Filter & Sort Payments Tab (Default: Newest First)
  const filteredPayments = custPayments.filter(p => {
    if (paymentMethodFilter !== 'all' && p.paymentMethod !== paymentMethodFilter) return false;
    if (paymentSearch.trim()) {
      const term = paymentSearch.trim().toLowerCase();
      return (
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        p.date.includes(term) ||
        p.amount.toString().includes(term)
      );
    }
    return true;
  });

  const sortedPayments = React.useMemo(() => {
    return [...filteredPayments].sort((a, b) => {
      const ta = a.createdAt || 0;
      const tb = b.createdAt || 0;
      return paymentSortOrder === 'desc' ? tb - ta : ta - tb;
    });
  }, [filteredPayments, paymentSortOrder]);

  // Sort Returns Tab (Default: Newest First)
  const sortedCustReturns = React.useMemo(() => {
    return [...custReturns].sort((a, b) => {
      const ta = a.createdAt || 0;
      const tb = b.createdAt || 0;
      return returnSortOrder === 'desc' ? tb - ta : ta - tb;
    });
  }, [custReturns, returnSortOrder]);

  // Export to Excel CSV (UTF-8 BOM)
  const handleExportExcel = () => {
    const headers = ['ردیف', 'تاریخ', 'زمان', 'نوع سند', 'عنوان و شرح تراکنش', 'کد پیگیری / فاکتور', 'بدهکار (+)', 'بستانکار (-)', 'مانده حساب'];
    const csvRows = [
      `\uFEFFصورت‌حساب گردش مالی و ریز حساب مشتری: ${currentCustomer.name} ${currentCustomer.company ? `(${currentCustomer.company})` : ''}`,
      `تلفن: ${currentCustomer.phone} | شهر: ${currentCustomer.city || '-'} | تاریخ صدور: ${getCurrentPersianDate()} | مانده نهایی: ${formatPrice(liveBal)}`,
      '',
      headers.join(','),
    ];

    computedRows.forEach((r, idx) => {
      const rowData = [
        idx + 1,
        `"${r.date}"`,
        `"${r.time || ''}"`,
        `"${r.type === 'invoice_credit' ? 'فاکتور نسیه' : r.type === 'invoice_cash' ? 'فاکتور نقدی' : r.type === 'manual_debt' ? 'ثبت بدهی' : r.type === 'payment' ? 'واریزی/تسویه' : 'مرجوعی'}"`,
        `"${(r.title + ' - ' + (r.subtitle || '')).replace(/"/g, '""')}"`,
        `"${r.code || ''}"`,
        r.debit || 0,
        r.credit || 0,
        r.runningBalance || 0,
      ];
      csvRows.push(rowData.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `گردش_حساب_${currentCustomer.name.replace(/\s+/g, '_')}_${getCurrentPersianDate().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowAlert?.('فایل اکسل صورت‌حساب مشتری با موفقیت دانلود شد.', 'success', 'خروجی اکسل');
  };

  // Inline Notes Save
  const handleSaveNotes = () => {
    onUpdateCustomer({
      ...currentCustomer,
      notes: notesVal
    });
    setIsEditingNotes(false);
    onShowAlert?.('یادداشت پرونده مشتری ذخیره شد.', 'success', 'ذخیره پرونده');
  };

  // Generate Debt Reminder SMS / WhatsApp Text
  const getReminderText = () => {
    const storeName = settings.brandName || 'فروشگاه ما';
    const storePhone = settings.phone || '';
    const absBal = Math.abs(liveBal);
    const balFormatted = formatPrice(absBal);
    const balWords = numberToPersianWords(absBal);
    const cardInfo = settings.bankAccounts && settings.bankAccounts.length > 0
      ? `\nشماره کارت جهت واریز:\n💳 ${settings.bankAccounts[0].bankName || 'بانک'}: ${settings.bankAccounts[0].cardNumber || ''}\nبه نام: ${settings.bankAccounts[0].holderName || storeName}`
      : '';

    if (reminderType === 'formal') {
      return `جناب آقای/سرکار خانم ${currentCustomer.name} گرامی،\nبا سلام و احترام؛\nبه استحضار می‌رساند مانده بدهی حساب جاری شما نزد «${storeName}» تا تاریخ ${toPersianDigits(getCurrentPersianDate())} مبلغ ${toPersianDigits(balFormatted)} تومان (${balWords} تومان) می‌باشد.\nخواهشمند است نسبت به تعیین تکلیف و تسویه حساب اقدام فرمایید.${cardInfo}\nبا تشکر و سپاس فراوان\n${storeName} • تلفن تماس: ${toPersianDigits(storePhone)}`;
    }
    if (reminderType === 'friendly') {
      return `سلام ${currentCustomer.name} عزیز،\nامیدواریم حالتون عالی باشه.\nجهت یادآوری و هماهنگی دوره‌ای، مانده حساب جاری شما نزد «${storeName}» مبلغ ${toPersianDigits(balFormatted)} تومان است.\nممنون می‌شیم در اولین فرصت نسبت به تسویه حساب اقدام بفرمایید.${cardInfo}\nبا آرزوی بهترین‌ها برای شما\n${storeName}`;
    }
    if (reminderType === 'brief') {
      return `مشتری گرامی ${currentCustomer.name}، مانده حساب شما نزد «${storeName}»: ${toPersianDigits(balFormatted)} تومان. جهت تسویه با شماره ${toPersianDigits(storePhone)} تماس بگیرید.`;
    }
    // card_info
    return `اطلاعات تسویه حساب طرف‌حساب ${currentCustomer.name}:\nمبلغ مانده: ${toPersianDigits(balFormatted)} تومان\n${cardInfo || `شماره تماس جهت هماهنگی: ${toPersianDigits(storePhone)}`}\n${storeName}`;
  };

  const handleCopyReminder = () => {
    navigator.clipboard.writeText(getReminderText());
    setReminderCopied(true);
    setTimeout(() => setReminderCopied(false), 2500);
    onShowAlert?.('متن یادآوری با موفقیت در حافظه کپی شد.', 'success', 'کپی شد');
  };

  const handleSendWhatsApp = () => {
    let cleanPhone = currentCustomer.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '98' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('98')) {
      cleanPhone = '98' + cleanPhone;
    }
    const textEncoded = encodeURIComponent(getReminderText());
    window.open(`https://wa.me/${cleanPhone}?text=${textEncoded}`, '_blank');
  };

  const handleSendSMS = () => {
    const textEncoded = encodeURIComponent(getReminderText());
    window.open(`sms:${currentCustomer.phone}?body=${textEncoded}`, '_self');
  };

  const typeInfo = getCustomerTypeInfo(currentCustomer.customerType);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-24 px-2 sm:px-4">
      
      {/* 1. TOP EXECUTIVE COMMAND HEADER & BALANCED TOOLBAR - Ultra-Modern & Organized */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4 transition-all no-print">
        
        {/* Tier 1: Customer Identity Plaque & Primary Action Hub */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          
          {/* Right Wing: Back Button, Divider & Customer Identity */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-black transition-all cursor-pointer border border-slate-300/80 dark:border-slate-700 shadow-2xs group shrink-0 active:scale-95"
              title="بازگشت به دفتر حساب و فهرست مشتریان"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.5] group-hover:-translate-x-0.5 transition-transform" />
              <span>دفتر حساب‌ها</span>
            </button>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-3">
              {/* Monogram / Avatar Plaque with Status Dot */}
              <div className={`relative w-11 h-11 rounded-2xl ${theme.badgeBg} ${theme.primaryText} border ${theme.borderColor} shadow-2xs flex items-center justify-center font-black text-base shrink-0`}>
                <span>{currentCustomer.name.trim().charAt(0) || 'م'}</span>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-black ${
                  isDebtor 
                    ? 'bg-amber-500 text-white' 
                    : isCreditor 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-emerald-500 text-white'
                }`}>
                  {isDebtor ? '!' : isCreditor ? '★' : '✓'}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {currentCustomer.name}
                  </h1>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black border ${typeInfo.badgeClass}`}>
                    {renderCustomerTypeIcon(typeInfo.iconName, "w-3.5 h-3.5")}
                    <span>{typeInfo.label}</span>
                  </span>

                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                    isDebtor 
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' 
                      : isCreditor 
                      ? `${theme.badgeBg} ${theme.badgeText} border ${theme.borderColor}` 
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  }`}>
                    {isDebtor ? 'حساب بدهکار' : isCreditor ? 'حساب بستانکار' : 'تسویه کامل'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium flex-wrap">
                  <a 
                    href={`tel:${currentCustomer.phone}`}
                    className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors font-mono font-bold"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{toPersianDigits(currentCustomer.phone)}</span>
                  </a>
                  {currentCustomer.city && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>شهر: <strong className="text-slate-700 dark:text-slate-300 font-bold">{currentCustomer.city}</strong></span>
                      </span>
                    </>
                  )}
                  {currentCustomer.company && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-bold">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{currentCustomer.company}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Left Wing: Edit Profile & Primary CTA New Invoice */}
          <div className="flex items-center gap-2.5 justify-end shrink-0 self-end lg:self-center">
            <button
              type="button"
              onClick={() => onEditCustomer(currentCustomer)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="ویرایش مشخصات، نشانی و سقف اعتبار مشتری"
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>ویرایش پرونده</span>
            </button>

            <button
              type="button"
              onClick={() => onNewInvoice(currentCustomer)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl ${theme.primary} ${theme.primaryHover} text-white text-xs sm:text-sm font-black shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer shrink-0`}
              title="صدور مستقیم فاکتور فروش جدید برای این مشتری"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>صدور فاکتور جدید</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Docked, Symmetrical Command Toolbar (Financial Hub on Right, Output & Communication on Left) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs pt-0.5">
          
          {/* Right Group: Financial Operations Hub */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 pl-1 hidden lg:inline">
              عملیات مالی:
            </span>

            <button
              type="button"
              onClick={() => onOpenPaymentModal(currentCustomer)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200/90 dark:border-blue-800/80 font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="ثبت دریافتی و واریز وجه توسط مشتری"
            >
              <Banknote className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>ثبت واریزی وجه</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenBalanceAdjModal(currentCustomer, 'credit')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 border border-teal-200/90 dark:border-teal-800/80 font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="تعدیل حساب، ثبت پیش‌دریافت یا بستانکاری"
            >
              <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>ثبت بستانکاری</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenSettlementModal(currentCustomer)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200/90 dark:border-emerald-800/80 font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="تسویه کامل مانده حساب این مشتری با یک کلیک"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>تسویه کامل مانده</span>
            </button>
          </div>

          {/* Left Group: Communication, Output & Export Tools */}
          <div className="flex items-center gap-2 justify-end flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 pl-1 hidden lg:inline">
              ارتباط و خروجی:
            </span>

            {isDebtor && (
              <button
                type="button"
                onClick={() => setIsReminderModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800/80 font-bold transition-all cursor-pointer shadow-2xs active:scale-95 animate-pulse"
                title="ارسال پیامک یا پیام واتساپ یادآوری بدهی و شماره کارت"
              >
                <MessageCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>یادآوری بدهی</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenShotModal(currentCustomer)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200/90 dark:border-purple-800/80 font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="ایجاد عکس و شات تصویری گرافیکی صورت‌حساب جهت ارسال در تلگرام و ایتا"
            >
              <Camera className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>شات تلگرام</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="خروجی فایل اکسل از ریز گردش حساب"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>اکسل</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="چاپ رسمی یا ذخیره PDF صورت‌حساب"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
              <span>چاپ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Print Header (Visible only when printing) */}
      <div className="hidden print:block p-6 bg-white border-b border-slate-300 text-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">{settings.brandName}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{settings.subtitle}</p>
          </div>
          <div className="text-left text-xs space-y-0.5">
            <div className="font-black text-sm">صورت‌حساب رسمی گردش مالی و بدهی مشتری</div>
            <div className="text-slate-500">تاریخ صدور گزارش: {toPersianDigits(getCurrentPersianDate())}</div>
          </div>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl text-xs grid grid-cols-3 gap-3 border border-slate-200">
          <div><strong>طرف حساب:</strong> {currentCustomer.name}</div>
          {currentCustomer.company && <div><strong>فروشگاه/ارگان:</strong> {currentCustomer.company}</div>}
          <div><strong>شهر:</strong> {currentCustomer.city || '-'}</div>
          <div><strong>تلفن تماس:</strong> {currentCustomer.phone}</div>
          <div className="col-span-2"><strong>نشانی تحویل:</strong> {currentCustomer.address || '-'}</div>
        </div>
      </div>

      {/* 2. EXECUTIVE CUSTOMER DETAILS & CREDIT GAUGE BANNER */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs relative overflow-hidden transition-all">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Left Customer Info & Avatar */}
          <div className="flex items-start sm:items-center gap-4.5 flex-1 min-w-0">
            <div className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl ${theme.primaryLight} ${theme.primaryText} flex items-center justify-center font-black text-2xl border-2 ${theme.borderColor} shrink-0 shadow-xs relative`}>
              {currentCustomer.name.trim().charAt(0) || 'م'}
              <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center ${
                isDebtor ? 'bg-amber-500 text-white' : isCreditor ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {isDebtor ? '!' : isCreditor ? '★' : '✓'}
              </span>
            </div>

            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                  {currentCustomer.name}
                </h3>

                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black border ${typeInfo.badgeClass}`}>
                  {renderCustomerTypeIcon(typeInfo.iconName, "w-3.5 h-3.5")}
                  <span>{typeInfo.label}</span>
                </span>

                {currentCustomer.company && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
                    {currentCustomer.company}
                  </span>
                )}

                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                  isDebtor 
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' 
                    : isCreditor 
                    ? `${theme.badgeBg} ${theme.badgeText} border ${theme.borderColor}` 
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                }`}>
                  {isDebtor ? 'حساب بدهکار' : isCreditor ? 'حساب بستانکار' : 'حساب کاملاً تسویه'}
                </span>
              </div>

              {/* Contact & Meta Details Pills */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <a 
                  href={`tel:${currentCustomer.phone}`}
                  className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono font-bold"
                  title="تماس مستقیم"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{toPersianDigits(currentCustomer.phone)}</span>
                </a>
                
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentCustomer.city ? `شهر ${currentCustomer.city}` : 'شهر نامشخص'}</span>
                  {currentCustomer.address && <span className="text-slate-400">({currentCustomer.address})</span>}
                </span>

                {currentCustomer.nationalCode && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-mono text-slate-500 dark:text-slate-400">
                      <Tag className="w-3.5 h-3.5 text-slate-400" />
                      <span>کد ملی/اقتصادی: {toPersianDigits(currentCustomer.nationalCode)}</span>
                    </span>
                  </>
                )}

                {currentCustomer.createdAt && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>عضویت: {toPersianDigits(new Date(currentCustomer.createdAt).toLocaleDateString('fa-IR'))}</span>
                    </span>
                  </>
                )}
              </div>

              {/* Credit Limit Progress Gauge if configured */}
              {creditLimit > 0 && (
                <div className="pt-2 max-w-md space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>سقف اعتبار مالی: {formatPrice(creditLimit)}</span>
                    </span>
                    <span className={isCreditExceeded ? 'text-rose-600 font-black' : 'text-slate-600 dark:text-slate-300'}>
                      {toPersianDigits(creditUsagePercent)}٪ مصرف شده {isCreditExceeded && '(عبور از سقف!)'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isCreditExceeded 
                          ? 'bg-rose-600' 
                          : creditUsagePercent > 80 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, creditUsagePercent)}%` }}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Live Balance Card */}
          <div className={`w-full lg:w-80 p-4.5 rounded-2xl border flex flex-col justify-between gap-3 shrink-0 ${
            isDebtor 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200' 
              : isCreditor 
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
          }`}>
            <div className="text-right w-full">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">مانده حساب نهایی (قطعی):</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs ${
                  isDebtor 
                    ? 'bg-amber-500 text-white' 
                    : isCreditor 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-emerald-500 text-white'
                }`}>
                  {isDebtor ? 'طلب از مشتری' : isCreditor ? 'بستانکاری طرف حساب' : 'کاملاً بی‌حساب'}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight dir-ltr text-right">
                {formatPrice(Math.abs(liveBal))}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {numberToPersianWords(Math.abs(liveBal))}
              </div>
            </div>

            {liveBal !== 0 && (
              <button
                onClick={() => onOpenSettlementModal(currentCustomer)}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl ${theme.primary} ${theme.primaryHover} text-white font-black text-xs shadow-xs transition-all cursor-pointer`}
                title="تسویه فوری کل مانده حساب با یک کلیک"
              >
                <CheckCheck className="w-4 h-4" />
                <span>⚡ تسویه فوری کل مانده</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 3. FOUR EXECUTIVE FINANCIAL ANALYTICS STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: خریدهای نسیه و بدهی‌های کل */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">بدهکاری کل ناخالص (+)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 font-bold">افزایش بدهی</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white dir-ltr text-right">
            {formatPrice(totalCreditSalesAndDebts)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>کل سفارشات: {formatPrice(totalGrossInvoices)}</span>
            <span>{toPersianDigits(custInvoices.length)} فاکتور</span>
          </div>
        </div>

        {/* Card 2: کل واریزی‌ها و دریافت‌ها */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">مجموع واریزی‌ها (-)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 font-bold">
              {toPersianDigits(custPayments.filter(p => (Number(p.amount) || 0) > 0).length)} سند
            </span>
          </div>
          <div className={`text-xl font-black ${theme.primaryText} dir-ltr text-right`}>
            {formatPrice(totalPaidDeposits)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>دریافت نقدی و بانکی</span>
            <button 
              onClick={() => onOpenPaymentModal(currentCustomer)}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              + ثبت واریز
            </button>
          </div>
        </div>

        {/* Card 3: گردش کل مرجوعی‌ها */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">مرجوعی کالا (-)</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 font-bold">
              {toPersianDigits(custReturns.length)} قلم
            </span>
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 dir-ltr text-right">
            {formatPrice(totalCustReturnsValue)}
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 truncate">
            {settledCustReturnsValue > 0 ? `${formatPrice(settledCustReturnsValue)} تسویه نقدی` : 'کسر شده از مانده بدهی'}
          </div>
        </div>

        {/* Card 4: مانده حساب نهایی */}
        <div className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border shadow-xs space-y-2 ${
          isDebtor 
            ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10' 
            : isCreditor 
            ? `${theme.borderColor} ${theme.primaryLight}` 
            : 'border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">تراز حساب جاری</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${
              isDebtor 
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' 
                : isCreditor 
                ? `${theme.badgeBg} ${theme.badgeText}` 
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
            }`}>
              {isDebtor ? 'مانده بدهکار' : isCreditor ? 'مانده بستانکار' : 'تسویه کامل'}
            </span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white dir-ltr text-right">
            {formatPrice(Math.abs(liveBal))}
          </div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 truncate">
            {isDebtor ? 'طلب قطعی از مشتری' : isCreditor ? 'پیش‌پرداخت طرف حساب' : 'حساب بدون بدهی'}
          </div>
        </div>

      </div>

      {/* 4. MULTI-TAB NAVIGATION BAR WITH BADGE COUNTERS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-wrap items-center gap-1.5 no-print">
        
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'ledger'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>دفتر معین و ریز حساب‌ها</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${activeTab === 'ledger' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            {toPersianDigits(computedRows.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>فاکتورها و خریدها</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${activeTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            {toPersianDigits(custInvoices.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'payments'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Banknote className="w-4 h-4" />
          <span>واریزی‌ها و اسناد دریافت</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${activeTab === 'payments' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            {toPersianDigits(custPayments.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'returns'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>کالاهای مرجوعی</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${activeTab === 'returns' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            {toPersianDigits(custReturns.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('purchased_items')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'purchased_items'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>سبد اقلام و تحلیل خرید</span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${activeTab === 'purchased_items' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            {toPersianDigits(purchasedList.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('profile_details')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'profile_details'
              ? `${theme.primary} text-white shadow-xs`
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>پرونده، سقف اعتبار و یادداشت</span>
        </button>

      </div>

      {/* 5. TAB 1: STATEMENT & LEDGER TABLE (دفتر معین) */}
      {activeTab === 'ledger' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          
          {/* Header Controls: Structured & Uncluttered Command Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-200/90 dark:border-slate-800 space-y-4 no-print bg-slate-50/50 dark:bg-slate-900/40">
            {/* Row 1: Section Title & Identity + Document Type Segment Tabs */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
              <div className="flex items-start sm:items-center gap-3">
                <div className={`p-2.5 rounded-xl ${theme.badgeBg} ${theme.primaryText} border ${theme.borderColor} shadow-2xs shrink-0 mt-0.5 sm:mt-0`}>
                  <History className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                      ریز گردش حساب به تفکیک تراکنش‌ها
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700 font-mono">
                      {toPersianDigits(computedRows.length)} سند ثبتی
                    </span>
                    {filteredLedgerRows.length !== computedRows.length && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-mono">
                        {toPersianDigits(filteredLedgerRows.length)} مورد مطابق فیلتر
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    ثبت خودکار گردش فاکتورهای نقدی و نسیه، واریزی‌ها، مرجوعی‌ها و تراز لحظه‌ای
                  </p>
                </div>
              </div>

              {/* Document Type Segmented Controller */}
              <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs self-stretch xl:self-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => { setLedgerFilterType('all'); setLedgerPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    ledgerFilterType === 'all'
                      ? `${theme.primary} text-white shadow-xs`
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  همه اسناد
                </button>
                <button
                  type="button"
                  onClick={() => { setLedgerFilterType('credit_sales'); setLedgerPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    ledgerFilterType === 'credit_sales'
                      ? 'bg-amber-500 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  فاکتور نسیه و بدهی
                </button>
                <button
                  type="button"
                  onClick={() => { setLedgerFilterType('payments'); setLedgerPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    ledgerFilterType === 'payments'
                      ? 'bg-blue-600 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                  }`}
                >
                  واریزی و تسویه‌ها
                </button>
                <button
                  type="button"
                  onClick={() => { setLedgerFilterType('returns'); setLedgerPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    ledgerFilterType === 'returns'
                      ? 'bg-rose-600 text-white shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  کالای مرجوعی
                </button>
              </div>
            </div>

            {/* Row 2: Search Input & Time Period & Sort Order - Clean Grid Layout */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
              
              {/* Search Bar - Modern, Full Focus */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو در شرح سند، شماره فاکتور یا کد رهگیری..."
                  value={ledgerSearch}
                  onChange={(e) => {
                    setLedgerSearch(e.target.value);
                    setLedgerPage(1);
                  }}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all shadow-2xs"
                />
                {ledgerSearch && (
                  <button
                    type="button"
                    onClick={() => { setLedgerSearch(''); setLedgerPage(1); }}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    title="پاک‌کردن جستجو"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Controls Group: Time Period Filter Capsule + Sort Direction Toggle */}
              <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
                {/* Time Period Filter Capsule */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs text-xs">
                  <span className="text-slate-400 px-2 flex items-center gap-1.5 text-[11px] font-bold">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>دوره:</span>
                  </span>
                  {[
                    { id: 'all', label: 'همه زمان‌ها' },
                    { id: 'today', label: 'امروز' },
                    { id: 'this_month', label: 'این ماه' },
                    { id: 'this_year', label: 'امسال' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setLedgerDateFilter(item.id as any); setLedgerPage(1); }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        ledgerDateFilter === item.id
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Sort Toggle Button */}
                <button
                  type="button"
                  onClick={() => setLedgerSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  title="تغییر ترتیب چینش تاریخ (جدیدترین / قدیمی‌ترین)"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>{ledgerSortOrder === 'desc' ? 'جدیدترین اول' : 'قدیمی‌ترین اول'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs sm:text-[13px] select-none">
                <tr>
                  <th className="p-3.5 w-12 text-center font-black">#</th>
                  <th 
                    className="p-3.5 w-36 cursor-pointer select-none hover:text-black dark:hover:text-white"
                    onClick={() => setLedgerSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title="تغییر جهت مرتب‌سازی تاریخ (جدیدترین / قدیمی‌ترین)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>تاریخ و زمان</span>
                      {ledgerSortOrder === 'desc' ? (
                        <ArrowDownWideNarrow className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      ) : (
                        <ArrowUpNarrowWide className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      )}
                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {ledgerSortOrder === 'desc' ? 'جدیدترین' : 'قدیمی‌ترین'}
                      </span>
                    </div>
                  </th>
                  <th className="p-3.5 font-black text-right">عنوان و نوع سند</th>
                  <th className="p-3.5 text-left w-36 font-black">بدهکار (+) نسیه</th>
                  <th className="p-3.5 text-left w-36 font-black">واریزی و تسویه (-)</th>
                  <th className="p-3.5 text-left w-36 font-black">مانده در گردش</th>
                  <th className="p-3.5 text-center w-28 no-print font-black">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {computedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      هنوز تراکنش یا فاکتوری برای این طرف‌حساب ثبت نشده است.
                    </td>
                  </tr>
                ) : filteredLedgerRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      موردی مطابق با فیلترهای انتخابی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  paginatedLedgerRows.map((r, idx) => {
                    const absoluteIndex = ledgerStartIndex + idx + 1;
                    const isUpdatedRow = Boolean(highlightedPaymentId && (r.id === highlightedPaymentId || r.rawObj?.id === highlightedPaymentId));

                    return (
                      <tr 
                        id={`ledger-row-${r.id}`}
                        key={`stmt-row-${r.type}-${r.id}-${idx}`} 
                        className={`transition-all duration-500 ${
                          isUpdatedRow
                            ? 'row-updated-highlight bg-emerald-500/15 dark:bg-emerald-500/20 ring-2 ring-emerald-500 shadow-md'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors'
                        }`}
                      >
                        <td className="p-3.5 text-center text-slate-400 font-mono">
                          {isUpdatedRow ? (
                            <RowUpdateIcon title="سند مالی با موفقیت بروزرسانی شد" className="mx-auto" />
                          ) : (
                            toPersianDigits(absoluteIndex)
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                          {toPersianDigits(r.date)} {r.time ? ` - ${toPersianDigits(r.time)}` : ''}
                        </td>
                        <td className="p-3.5 max-w-[260px] sm:max-w-xs">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isUpdatedRow && (
                                <RowUpdateBadge label="سند مالی اصلاح شد" />
                              )}
                              {r.type === 'invoice_credit' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/40 text-[10px] font-black shrink-0 whitespace-nowrap">
                                  <FileText className="w-3 h-3 text-amber-600" />
                                  فاکتور نسیه
                                </span>
                              ) : r.type === 'invoice_cash' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-black shrink-0 whitespace-nowrap">
                                  <Banknote className="w-3 h-3 text-slate-500" />
                                  فاکتور نقدی
                                </span>
                              ) : r.type === 'manual_debt' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 text-[10px] font-black shrink-0 whitespace-nowrap">
                                  <TrendingDown className="w-3 h-3 text-rose-600" />
                                  ثبت بدهی
                                </span>
                              ) : r.type === 'payment' ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${theme.primaryLight} ${theme.primaryText} border ${theme.subtleBorder} text-[10px] font-black shrink-0 whitespace-nowrap`}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  {r.credit > 0 ? 'واریزی' : 'پرداخت'}
                                </span>
                              ) : r.type === 'return_to_supplier' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 text-[10px] font-black shrink-0 whitespace-nowrap">
                                  <RotateCcw className="w-3 h-3" />
                                  مرجوع شرکت
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/40 text-[10px] font-black shrink-0 whitespace-nowrap">
                                  <RotateCcw className="w-3 h-3" />
                                  مرجوع مشتری
                                </span>
                              )}

                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-[200px]" title={r.title}>
                                {r.title}
                              </span>
                            </div>

                            {r.subtitle && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[240px]" title={r.subtitle}>
                                {r.subtitle}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-left dir-ltr font-black text-amber-700 dark:text-amber-400">
                          {r.debit > 0 ? formatPrice(r.debit) : '-'}
                        </td>
                        <td className={`p-3.5 text-left dir-ltr font-black ${theme.primaryText}`}>
                          {r.credit > 0 ? formatPrice(r.credit) : '-'}
                        </td>
                        <td className="p-3.5 text-left dir-ltr font-black text-slate-900 dark:text-white">
                          {formatPrice(r.runningBalance)}
                        </td>
                        <td className="p-3.5 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                if (r.type.startsWith('invoice')) {
                                  onViewInvoice(r.rawObj);
                                } else {
                                  onViewDoc(r);
                                }
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                              title="مشاهده جزئیات سند"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>مشاهده</span>
                            </button>

                            <button
                              onClick={() => {
                                if (r.type.startsWith('invoice')) {
                                  onEditInvoice?.(r.rawObj);
                                } else if (r.type === 'payment' || r.type === 'manual_debt') {
                                  onEditPayment(r.rawObj);
                                } else {
                                  onViewDoc(r);
                                }
                              }}
                              className={`p-1.5 rounded-lg text-slate-400 hover:${theme.primaryText} hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700`}
                              title="ویرایش سند"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (r.type.startsWith('invoice')) {
                                  onDeleteInvoice?.(r.rawObj.id);
                                } else if (r.type === 'payment' || r.type === 'manual_debt') {
                                  onDeletePayment(r.rawObj);
                                } else {
                                  onViewDoc(r);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-800/40"
                              title="حذف سند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              
              {/* Table Footer with Sums */}
              {filteredLedgerRows.length > 0 && (
                <tfoot className="bg-slate-50/90 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800 text-xs font-black text-slate-900 dark:text-white">
                  <tr>
                    <td colSpan={3} className="p-3.5 text-left text-slate-500 font-bold">
                      جمع اقلام فیلتر شده ({toPersianDigits(filteredLedgerRows.length)} مورد):
                    </td>
                    <td className="p-3.5 text-left dir-ltr text-amber-700 dark:text-amber-400 font-black">
                      {formatPrice(filteredDebitsTotal)}
                    </td>
                    <td className={`p-3.5 text-left dir-ltr font-black ${theme.primaryText}`}>
                      {formatPrice(filteredCreditsTotal)}
                    </td>
                    <td className="p-3.5 text-left dir-ltr font-black">
                      {formatPrice(liveBal)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Statement Pagination Bar */}
          <Pagination
            currentPage={ledgerPage}
            totalPages={ledgerTotalPages}
            totalItems={sortedLedgerRows.length}
            itemsPerPage={ledgerItemsPerPage}
            onPageChange={setLedgerPage}
            onItemsPerPageChange={(val) => {
              setLedgerItemsPerPage(val);
              setLedgerPage(1);
            }}
            itemsPerPageOptions={[10, 20, 50, 100]}
            itemName="تراکنش"
            themeColor={settings.themeColor}
          />
        </div>
      )}

      {/* 6. TAB 2: INVOICES TAB (فاکتورها) */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          
          {/* Top Bar for Invoices */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                فهرست کامل فاکتورهای صادره برای این مشتری
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجو در فاکتورها..."
                  value={invoiceSearch}
                  onChange={(e) => {
                    setInvoiceSearch(e.target.value);
                    setInvoicePage(1);
                  }}
                  className="w-full pl-3 pr-8 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setInvoiceStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    invoiceStatusFilter === 'all' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  همه
                </button>
                <button
                  onClick={() => setInvoiceStatusFilter('credit')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    invoiceStatusFilter === 'credit' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  نسیه
                </button>
                <button
                  onClick={() => setInvoiceStatusFilter('cash')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    invoiceStatusFilter === 'cash' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  نقدی
                </button>
              </div>

              {/* Invoices Sort Toggle */}
              <button
                type="button"
                onClick={() => setInvoiceSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
                title={invoiceSortOrder === 'desc' ? 'مرتب‌سازی: جدیدترین در ابتدا (کلیک برای صعودی/قدیمی‌ترین)' : 'مرتب‌سازی: قدیمی‌ترین در ابتدا (کلیک برای نزولی/جدیدترین)'}
              >
                {invoiceSortOrder === 'desc' ? (
                  <ArrowDownWideNarrow className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                ) : (
                  <ArrowUpNarrowWide className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                )}
                <span>{invoiceSortOrder === 'desc' ? 'جدیدترین اول' : 'قدیمی‌ترین اول'}</span>
              </button>

              <button
                onClick={() => onNewInvoice(currentCustomer)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${theme.primary} text-white text-xs font-black shadow-xs`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ فاکتور جدید</span>
              </button>
            </div>
          </div>

          {/* Invoices List / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedInvoices.length === 0 ? (
              <div className="col-span-full bg-white dark:bg-slate-900 rounded-xl p-12 text-center text-slate-400 border border-slate-200 dark:border-slate-800 font-bold">
                فاکتوری برای این مشتری ثبت نشده است.
              </div>
            ) : (
              sortedInvoices.map((inv, idx) => {
                const isCredit = inv.paymentStatus === 'credit' || inv.paymentMethod?.includes('نسیه');
                const isPartial = inv.paymentStatus === 'partial';

                return (
                  <div
                    key={`stmt-inv-${inv.id || idx}-${idx}`}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4.5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                            #{toPersianDigits(inv.invoiceNumber)}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            isCredit 
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/40' 
                              : isPartial 
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/40'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/40'
                          }`}>
                            {isCredit ? 'نسیه' : isPartial ? 'پرداخت بخشی' : 'نقدی کامل'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {toPersianDigits(inv.date)}
                        </span>
                      </div>

                      {/* Items Preview */}
                      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 py-1 border-t border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[11px]">
                          <span>تعداد اقلام:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{toPersianDigits(inv.items.length)} قلم کالا</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {inv.items.map(it => it.productName).join(' ، ')}
                        </div>
                      </div>

                      {/* Financial Amount */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-500 font-medium">مبلغ نهایی فاکتور:</span>
                        <span className="text-base font-black text-slate-900 dark:text-white dir-ltr">
                          {formatPrice(inv.finalAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => onViewInvoice(inv)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>مشاهده</span>
                      </button>

                      {onEditInvoice && (
                        <button
                          onClick={() => onEditInvoice(inv)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                          title="ویرایش فاکتور"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onDeleteInvoice && (
                        <button
                          onClick={() => onDeleteInvoice(inv.id)}
                          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                          title="حذف فاکتور"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* 7. TAB 3: PAYMENTS TAB (اسناد واریز) */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                ریز اسناد واریزی و دریافتی از این طرف‌حساب
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              {/* Payments Sort Toggle */}
              <button
                type="button"
                onClick={() => setPaymentSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
                title={paymentSortOrder === 'desc' ? 'مرتب‌سازی: جدیدترین در ابتدا (کلیک برای صعودی/قدیمی‌ترین)' : 'مرتب‌سازی: قدیمی‌ترین در ابتدا (کلیک برای نزولی/جدیدترین)'}
              >
                {paymentSortOrder === 'desc' ? (
                  <ArrowDownWideNarrow className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                ) : (
                  <ArrowUpNarrowWide className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                )}
                <span>{paymentSortOrder === 'desc' ? 'جدیدترین اول' : 'قدیمی‌ترین اول'}</span>
              </button>

              <button
                onClick={() => onOpenPaymentModal(currentCustomer)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ ثبت واریزی جدید</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold">
                <tr>
                  <th className="p-3.5 w-12 text-center">#</th>
                  <th 
                    className="p-3.5 w-36 cursor-pointer select-none hover:text-black dark:hover:text-white"
                    onClick={() => setPaymentSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title="تغییر جهت مرتب‌سازی تاریخ (جدیدترین / قدیمی‌ترین)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>تاریخ و زمان</span>
                      {paymentSortOrder === 'desc' ? (
                        <ArrowDownWideNarrow className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      ) : (
                        <ArrowUpNarrowWide className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      )}
                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {paymentSortOrder === 'desc' ? 'جدیدترین' : 'قدیمی‌ترین'}
                      </span>
                    </div>
                  </th>
                  <th className="p-3.5">روش پرداخت</th>
                  <th className="p-3.5">شماره پیگیری / فیش</th>
                  <th className="p-3.5">توضیحات و بابت</th>
                  <th className="p-3.5 text-left w-36">مبلغ پرداختی</th>
                  <th className="p-3.5 text-center w-24 no-print">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {sortedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      سند واریزی یا پرداختی برای این مشتری ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  sortedPayments.map((p, idx) => {
                    const methodLabel = p.paymentMethod === 'card' ? 'کارت به کارت' : p.paymentMethod === 'bank_transfer' ? 'واریز بانکی' : p.paymentMethod === 'cash' ? 'نقدی' : 'چک صیادی';
                    const amt = Number(p.amount) || 0;

                    const isUpdatedPayment = Boolean(highlightedPaymentId && highlightedPaymentId === p.id);

                    return (
                      <tr 
                        id={`payment-row-${p.id}`}
                        key={`stmt-pay-${p.id || idx}-${idx}`} 
                        className={`transition-all duration-500 ${
                          isUpdatedPayment
                            ? 'row-updated-highlight bg-emerald-500/15 dark:bg-emerald-500/20 ring-2 ring-emerald-500 shadow-md'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors'
                        }`}
                      >
                        <td className="p-3.5 text-center text-slate-400 font-mono">
                          {isUpdatedPayment ? (
                            <RowUpdateIcon title="سند پرداخت با موفقیت ویرایش شد" className="mx-auto" />
                          ) : (
                            toPersianDigits(idx + 1)
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">
                          {toPersianDigits(p.date)} {p.time ? `- ${toPersianDigits(p.time)}` : ''}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                              <CreditCard className="w-3 h-3 text-slate-400" />
                              <span>{methodLabel}</span>
                            </span>
                            {isUpdatedPayment && (
                              <RowUpdateBadge label="سند ویرایش شد" />
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                          {p.referenceNumber ? toPersianDigits(p.referenceNumber) : '-'}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {p.description || 'تسویه حساب دفتری'}
                        </td>
                        <td className={`p-3.5 text-left dir-ltr font-black text-sm ${amt >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                          {formatPrice(Math.abs(amt))}
                        </td>
                        <td className="p-3.5 text-center no-print">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onEditPayment(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="ویرایش سند واریز"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeletePayment(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="حذف سند"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 8. TAB 4: RETURNS TAB (مرجوعی‌ها) */}
      {activeTab === 'returns' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-indigo-600" />
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                ریز کالاهای مرجوعی طرف‌حساب
              </h3>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-500 font-bold">
                مجموع ارزش مرجوعی‌ها: {formatPrice(totalCustReturnsValue)}
              </span>
              {/* Returns Sort Toggle */}
              <button
                type="button"
                onClick={() => setReturnSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
                title={returnSortOrder === 'desc' ? 'مرتب‌سازی: جدیدترین در ابتدا (کلیک برای صعودی/قدیمی‌ترین)' : 'مرتب‌سازی: قدیمی‌ترین در ابتدا (کلیک برای نزولی/جدیدترین)'}
              >
                {returnSortOrder === 'desc' ? (
                  <ArrowDownWideNarrow className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                ) : (
                  <ArrowUpNarrowWide className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                )}
                <span>{returnSortOrder === 'desc' ? 'جدیدترین اول' : 'قدیمی‌ترین اول'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold">
                <tr>
                  <th className="p-3.5 w-12 text-center">#</th>
                  <th 
                    className="p-3.5 w-36 cursor-pointer select-none hover:text-black dark:hover:text-white"
                    onClick={() => setReturnSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    title="تغییر جهت مرتب‌سازی تاریخ (جدیدترین / قدیمی‌ترین)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>تاریخ</span>
                      {returnSortOrder === 'desc' ? (
                        <ArrowDownWideNarrow className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      ) : (
                        <ArrowUpNarrowWide className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      )}
                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {returnSortOrder === 'desc' ? 'جدیدترین' : 'قدیمی‌ترین'}
                      </span>
                    </div>
                  </th>
                  <th className="p-3.5">نام کالای مرجوعی</th>
                  <th className="p-3.5">تعداد / کارتن</th>
                  <th className="p-3.5">علت مرجوعی</th>
                  <th className="p-3.5">وضعیت تسویه</th>
                  <th className="p-3.5 text-left w-36">ارزش ریالی مرجوعی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {sortedCustReturns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                      کالای مرجوعی برای این مشتری ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  sortedCustReturns.map((ret, idx) => {
                    const netVal = getNetReturnAmount(ret);
                    const isSettledRet = !!ret.isRefunded;

                    return (
                      <tr key={`stmt-ret-${ret.id || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="p-3.5 text-center text-slate-400 font-mono">{toPersianDigits(idx + 1)}</td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-medium">
                          {toPersianDigits(ret.date)}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {ret.productName}
                        </td>
                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                          {toPersianDigits(ret.cartonsCount)} کارتن
                          {ret.extraPieces ? ` و ${toPersianDigits(ret.extraPieces)} دانه` : ''}
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {ret.reason || 'نامشخص'}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                            isSettledRet 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200' 
                              : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200'
                          }`}>
                            {isSettledRet ? 'تسویه نقدی وجه' : 'کسر از مانده حساب'}
                          </span>
                        </td>
                        <td className="p-3.5 text-left dir-ltr font-black text-indigo-600 dark:text-indigo-400">
                          {formatPrice(netVal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 9. TAB 5: PURCHASED ITEMS ANALYTICS (سبد خرید و اقلام) */}
      {activeTab === 'purchased_items' && (
        <div className="space-y-4">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                تحلیل جامع اقلام و محصولات خریداری شده توسط طرف‌حساب
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="جستجوی نام کالا..."
                  value={purchasedSearch}
                  onChange={(e) => setPurchasedSearch(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setPurchasedSort('total_spent')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    purchasedSort === 'total_spent' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  بیشترین مبلغ
                </button>
                <button
                  onClick={() => setPurchasedSort('total_cartons')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    purchasedSort === 'total_cartons' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  بیشترین تعداد
                </button>
                <button
                  onClick={() => setPurchasedSort('last_date')}
                  className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    purchasedSort === 'last_date' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  آخرین خرید
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-extrabold">
                  <tr>
                    <th className="p-3.5 w-12 text-center">#</th>
                    <th className="p-3.5">نام کالا / محصول</th>
                    <th className="p-3.5 text-center">تعداد فاکتورها</th>
                    <th className="p-3.5 text-center">مجموع کارتن‌های خریداری شده</th>
                    <th className="p-3.5 text-center">کل دانه‌ها / واحدها</th>
                    <th className="p-3.5 text-center">نرخ واحد فروش (فاکتور)</th>
                    <th className="p-3.5 text-center">آخرین تاریخ خرید</th>
                    <th className="p-3.5 text-left w-40">مجموع هزینه پرداخت شده</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {purchasedList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                        هنوز خریدی برای این مشتری ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    purchasedList.map((item, idx) => (
                      <tr key={`stmt-purchased-${item.name || idx}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="p-3.5 text-center text-slate-400 font-mono">{toPersianDigits(idx + 1)}</td>
                        <td className="p-3.5 font-black text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-600 dark:text-slate-400">
                          {toPersianDigits(item.invoicesCount)} بار
                        </td>
                        <td className="p-3.5 text-center font-black text-slate-900 dark:text-white">
                          {toPersianDigits(item.totalCartons)} کارتن
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-600 dark:text-slate-400 font-mono">
                          {toPersianDigits(item.totalPieces)} دانه
                        </td>
                        <td className="p-3.5 text-center font-bold text-emerald-700 dark:text-emerald-400 font-mono dir-ltr">
                          {item.avgUnitPrice > 0 ? formatPrice(item.avgUnitPrice) : '-'}
                        </td>
                        <td className="p-3.5 text-center font-medium text-slate-500">
                          {toPersianDigits(item.lastDate)}
                        </td>
                        <td className="p-3.5 text-left dir-ltr font-black text-emerald-700 dark:text-emerald-400 text-sm">
                          {formatPrice(item.totalSpend)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 10. TAB 6: PROFILE, CREDIT & NOTES TAB */}
      {activeTab === 'profile_details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Column 1: Identity & Full Meta Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" />
                <span>مشخصات هویتی و ثبتی</span>
              </h3>
              <button
                onClick={() => onEditCustomer(currentCustomer)}
                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ویرایش پرونده</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-bold">نام و نام خانوادگی:</span>
                <span className="font-black text-slate-900 dark:text-white">{currentCustomer.name}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-bold">نوع طرف‌حساب:</span>
                <span className={`px-2 py-0.5 rounded-md font-bold border text-[11px] ${typeInfo.badgeClass}`}>
                  {typeInfo.label}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-bold">نام فروشگاه / ارگان:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentCustomer.company || '-'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-bold">شماره تماس مستقیم:</span>
                <a href={`tel:${currentCustomer.phone}`} className="font-mono font-bold text-emerald-600 hover:underline">
                  {toPersianDigits(currentCustomer.phone)}
                </a>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-bold">کد ملی / شناسه اقتصادی:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {currentCustomer.nationalCode ? toPersianDigits(currentCustomer.nationalCode) : '-'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-bold">شهر محل سکونت/فعالیت:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentCustomer.city || '-'}</span>
              </div>

              <div className="py-1.5 border-b border-slate-100 dark:border-slate-800/60 space-y-1">
                <span className="text-slate-400 font-bold block">نشانی پستی و تحویل کالا:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed block">
                  {currentCustomer.address || 'ثبت نشده است'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Credit & Financial Limits */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>سقف اعتبار مالی و ریسک اعتباری</span>
              </h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-bold">سقف مجاز نسیه:</span>
                  <span className="font-black text-slate-900 dark:text-white dir-ltr">
                    {creditLimit > 0 ? formatPrice(creditLimit) : 'نامحدود / تعریف نشده'}
                  </span>
                </div>

                {creditLimit > 0 && (
                  <>
                    <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          isCreditExceeded ? 'bg-rose-600' : creditUsagePercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, creditUsagePercent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>مصرف شده: {toPersianDigits(creditUsagePercent)}٪</span>
                      <span>مانده اعتبار مجاز: {formatPrice(remainingCredit)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">مانده حساب اول دوره:</span>
                  <span className="font-black text-slate-900 dark:text-white dir-ltr">
                    {formatPrice(currentCustomer.initialBalance || 0)}
                  </span>
                </div>
                <button
                  onClick={() => onOpenBalanceAdjModal(currentCustomer, 'initial_balance')}
                  className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] hover:underline cursor-pointer block"
                >
                  ویرایش مانده اول دوره
                </button>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onOpenBalanceAdjModal(currentCustomer, 'debt')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-200 text-xs font-bold border border-amber-200/80 dark:border-amber-800/40 transition-all cursor-pointer"
                >
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                  <span>ثبت بدهی دفتری مستقیم برای مشتری</span>
                </button>

                <button
                  onClick={() => onOpenBalanceAdjModal(currentCustomer, 'credit')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-900 dark:text-emerald-200 text-xs font-bold border border-emerald-200/80 dark:border-emerald-800/40 transition-all cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>ثبت بستانکاری / پیش‌پرداخت مستقیم</span>
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Customer Notes & Memo */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>یادداشت‌های اختصاصی پرونده مشتری</span>
                </h3>
              </div>

              <div className="space-y-2">
                <textarea
                  rows={6}
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  placeholder="هرگونه یادداشت ویژه، ساعت ترجیحی تحویل بار، تذکرات تسویه یا توافقات شفاهی را اینجا یادداشت کنید..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleSaveNotes}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره تغییرات یادداشت پرونده</span>
            </button>
          </div>

        </div>
      )}

      {/* 11. DEBT REMINDER MODAL (SMS / WHATSAPP TEMPLATES & 1-CLICK SEND) */}
      <AnimatePresence>
        {isReminderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md no-print overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      ارسال پیامک و یادآوری تسویه حساب
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      طرف‌حساب: {currentCustomer.name} ({toPersianDigits(currentCustomer.phone)})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsReminderModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Template Selectors */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">انتخاب لحن و قالب متن:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setReminderType('formal')}
                    className={`p-2.5 rounded-xl text-xs font-bold text-right border transition-all cursor-pointer ${
                      reminderType === 'formal'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🏛️ اداری و رسمی
                  </button>

                  <button
                    onClick={() => setReminderType('friendly')}
                    className={`p-2.5 rounded-xl text-xs font-bold text-right border transition-all cursor-pointer ${
                      reminderType === 'friendly'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🤝 دوستانه و صمیمی
                  </button>

                  <button
                    onClick={() => setReminderType('brief')}
                    className={`p-2.5 rounded-xl text-xs font-bold text-right border transition-all cursor-pointer ${
                      reminderType === 'brief'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    📱 خلاصه و کوتاه (پیامک)
                  </button>

                  <button
                    onClick={() => setReminderType('card_info')}
                    className={`p-2.5 rounded-xl text-xs font-bold text-right border transition-all cursor-pointer ${
                      reminderType === 'card_info'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    💳 کارت و واریز
                  </button>
                </div>
              </div>

              {/* Text Preview Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">پیش‌نمایش متن ارسالی:</label>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {getReminderText()}
                </div>
              </div>

              {/* Actions: Copy, WhatsApp, SMS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleCopyReminder}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black transition-all cursor-pointer"
                >
                  {reminderCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  <span>{reminderCopied ? 'کپی شد!' : 'کپی متن'}</span>
                </button>

                <button
                  onClick={handleSendWhatsApp}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>ارسال واتساپ</span>
                </button>

                <button
                  onClick={handleSendSMS}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>ارسال پیامک</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
