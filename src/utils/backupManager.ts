import { Product, Invoice, Customer, CustomerPayment, ActivityLog, StoreSettings, BackupSnapshot, ProductReturn, TreasuryTransaction } from '../types';
import { getCurrentPersianDate, getCurrentPersianTime, toPersianDigits } from './formatters';

const BACKUP_STORAGE_KEY = 'bazargani_smart_backup_snapshots_v1';

/**
 * Format bytes to readable KB / MB
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '۰ بایت';
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${toPersianDigits((bytes / 1024).toFixed(1))} کیلوبایت`;
  return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(2))} مگابایت`;
}

/**
 * Retrieve all saved backup snapshots from LocalStorage (sorted newest first)
 */
export function getBackupSnapshots(): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed: BackupSnapshot[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error('Failed to load backup snapshots from storage:', err);
    return [];
  }
}

/**
 * Save snapshots array to LocalStorage with automatic retention pruning (clean up old files)
 */
export function saveBackupSnapshots(
  snapshots: BackupSnapshot[],
  retentionCount: number = 5
): { snapshots: BackupSnapshot[]; prunedCount: number } {
  try {
    // Sort descending (newest first)
    const sorted = [...snapshots].sort((a, b) => b.createdAt - a.createdAt);

    // Prune excess backups if count exceeds retention limit
    const kept = sorted.slice(0, Math.max(1, retentionCount));
    const prunedCount = Math.max(0, sorted.length - kept.length);

    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(kept));
    return { snapshots: kept, prunedCount };
  } catch (err) {
    console.error('Failed to save backup snapshots:', err);
    return { snapshots, prunedCount: 0 };
  }
}

/**
 * Create a snapshot object from current app state
 */
export function createSnapshotObject(
  products: Product[],
  invoices: Invoice[],
  customers: Customer[],
  payments: CustomerPayment[],
  settings: StoreSettings,
  type: 'auto' | 'manual' = 'auto',
  note?: string,
  activityLogs?: ActivityLog[],
  returns?: ProductReturn[],
  treasuryTransactions?: TreasuryTransaction[],
  customCategories?: string[],
  customExpenseCategories?: string[]
): BackupSnapshot {
  const timestamp = Date.now();
  const dateFormatted = getCurrentPersianDate();
  const timeFormatted = getCurrentPersianTime();

  const currentPayments = payments || [];
  const currentReturns = returns || [];
  const currentTreasury = treasuryTransactions || [];
  const currentInvoices = invoices || [];
  const currentProducts = products || [];
  const currentCustomers = customers || [];
  
  // Explicitly identify drafts and finalized invoices
  const draftInvoices = currentInvoices.filter(i => i.isDraft === true);
  const salesInvoices = currentInvoices.filter(i => !i.isDraft && i.type === 'sale');
  const purchaseInvoices = currentInvoices.filter(i => !i.isDraft && i.type === 'purchase');

  // Load custom categories if not explicitly passed
  let invCats: string[] = customCategories || [];
  if (invCats.length === 0) {
    try {
      const saved = localStorage.getItem('bazargani_inventory_categories');
      if (saved) invCats = JSON.parse(saved);
    } catch {
      invCats = [];
    }
  }

  let expCats: string[] = customExpenseCategories || [];
  if (expCats.length === 0) {
    try {
      const saved = localStorage.getItem('app_expense_categories');
      if (saved) expCats = JSON.parse(saved);
    } catch {
      expCats = [];
    }
  }

  const customersWithPayments = currentCustomers.map(c => ({
    ...c,
    payments: currentPayments.filter(p => p.customerId === c.id)
  }));

  const dataPayload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    summary: {
      productsCount: currentProducts.length,
      invoicesCount: currentInvoices.length,
      draftsCount: draftInvoices.length,
      salesCount: salesInvoices.length,
      purchasesCount: purchaseInvoices.length,
      customersCount: currentCustomers.length,
      paymentsCount: currentPayments.length,
      returnsCount: currentReturns.length,
      treasuryCount: currentTreasury.length,
      activityLogsCount: (activityLogs || []).length,
      categoriesCount: invCats.length + expCats.length,
    },
    products: currentProducts,
    invoices: currentInvoices,
    draftInvoices: draftInvoices,
    drafts: draftInvoices,
    customers: customersWithPayments,
    payments: currentPayments,
    customerPayments: currentPayments,
    paymentsList: currentPayments,
    productReturns: currentReturns,
    returns: currentReturns,
    treasuryTransactions: currentTreasury,
    treasury: currentTreasury,
    liquidity: currentTreasury,
    activityLogs: activityLogs || [],
    categories: invCats,
    customCategories: invCats,
    expenseCategories: expCats,
    settings,
  };

  const jsonString = JSON.stringify(dataPayload);
  const sizeBytes = new Blob([jsonString]).size;

  return {
    id: `backup-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: timestamp,
    dateFormatted,
    timeFormatted,
    type,
    productsCount: currentProducts.length,
    invoicesCount: currentInvoices.length,
    draftsCount: draftInvoices.length,
    customersCount: currentCustomers.length,
    paymentsCount: currentPayments.length,
    returnsCount: currentReturns.length,
    treasuryCount: currentTreasury.length,
    activityLogsCount: (activityLogs || []).length,
    categoriesCount: invCats.length + expCats.length,
    sizeBytes,
    note: note || (type === 'auto' ? 'پشتیبان‌گیری زمان‌بندی شده خودکار' : 'پشتیبان‌گیری دستی مدیریت'),
    data: dataPayload,
  };
}

/**
 * Perform a manual instant backup
 */
export function performManualBackup(
  products: Product[],
  invoices: Invoice[],
  customers: Customer[],
  payments: CustomerPayment[],
  settings: StoreSettings,
  note?: string,
  activityLogs?: ActivityLog[],
  returns?: ProductReturn[],
  treasuryTransactions?: TreasuryTransaction[],
  customCategories?: string[],
  customExpenseCategories?: string[]
): { snapshot: BackupSnapshot; snapshots: BackupSnapshot[]; prunedCount: number } {
  const snapshot = createSnapshotObject(
    products,
    invoices,
    customers,
    payments,
    settings,
    'manual',
    note || 'پشتیبان‌گیری دستی مدیریت',
    activityLogs,
    returns,
    treasuryTransactions,
    customCategories,
    customExpenseCategories
  );

  const existing = getBackupSnapshots();
  const retentionCount = settings.backupRetentionCount || 5;
  const result = saveBackupSnapshots([snapshot, ...existing], retentionCount);

  return {
    snapshot,
    snapshots: result.snapshots,
    prunedCount: result.prunedCount,
  };
}

/**
 * Check if auto backup is due and execute it seamlessly if needed
 */
export function checkAndRunAutoBackup(
  products: Product[],
  invoices: Invoice[],
  customers: Customer[],
  payments: CustomerPayment[],
  settings: StoreSettings,
  returns?: ProductReturn[],
  treasuryTransactions?: TreasuryTransaction[],
  activityLogs?: ActivityLog[],
  onUpdateSettings?: (updatedSettings: StoreSettings) => void
): { created: boolean; snapshot?: BackupSnapshot; prunedCount: number } {
  // If auto backup is explicitly disabled, skip
  if (settings.enableAutoBackup === false) {
    return { created: false, prunedCount: 0 };
  }

  const intervalHours = settings.autoBackupIntervalHours || 24;
  const intervalMs = intervalHours * 3600 * 1000;
  const now = Date.now();
  const lastTime = settings.lastAutoBackupTimestamp || 0;

  const existingSnapshots = getBackupSnapshots();

  // Create auto backup if elapsed time > interval OR if no backups exist yet
  if (now - lastTime >= intervalMs || existingSnapshots.length === 0) {
    const newSnapshot = createSnapshotObject(
      products,
      invoices,
      customers,
      payments,
      settings,
      'auto',
      `پشتیبان‌گیری خودکار دوره ${toPersianDigits(intervalHours)} ساعته`,
      activityLogs,
      returns,
      treasuryTransactions
    );

    const retentionCount = settings.backupRetentionCount || 5;
    const saveResult = saveBackupSnapshots([newSnapshot, ...existingSnapshots], retentionCount);

    const updatedSettings: StoreSettings = {
      ...settings,
      lastAutoBackupTimestamp: now,
      lastBackupDateFormatted: `${newSnapshot.dateFormatted} - ساعت ${newSnapshot.timeFormatted}`,
    };

    if (onUpdateSettings) {
      onUpdateSettings(updatedSettings);
    }

    return {
      created: true,
      snapshot: newSnapshot,
      prunedCount: saveResult.prunedCount,
    };
  }

  return { created: false, prunedCount: 0 };
}

/**
 * Delete a single snapshot by ID
 */
export function deleteSnapshotById(snapshotId: string): BackupSnapshot[] {
  const existing = getBackupSnapshots();
  const filtered = existing.filter((s) => s.id !== snapshotId);
  localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

/**
 * Clear all snapshots
 */
export function clearAllSnapshots(): void {
  localStorage.removeItem(BACKUP_STORAGE_KEY);
}

/**
 * Download a snapshot directly as a JSON file
 */
export function downloadSnapshotAsFile(snapshot: BackupSnapshot): void {
  const dataToExport = snapshot.data || snapshot;
  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeDate = (snapshot.dateFormatted || getCurrentPersianDate()).replace(/\//g, '-');
  const safeTime = (snapshot.timeFormatted || getCurrentPersianTime()).replace(':', '');
  a.download = `bazargani-backup-${safeDate}-${safeTime}-${snapshot.type || 'export'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Get total storage statistics for backup management
 */
export function getBackupStorageStats(): {
  totalCount: number;
  totalSizeBytes: number;
  formattedSize: string;
  autoCount: number;
  manualCount: number;
  lastBackupDateFormatted?: string;
  oldestBackupDateFormatted?: string;
} {
  const snapshots = getBackupSnapshots();
  const totalCount = snapshots.length;
  const totalSizeBytes = snapshots.reduce((acc, s) => acc + (s.sizeBytes || 0), 0);
  const autoCount = snapshots.filter((s) => s.type === 'auto').length;
  const manualCount = snapshots.filter((s) => s.type === 'manual').length;

  const newest = snapshots[0];
  const oldest = snapshots[snapshots.length - 1];

  return {
    totalCount,
    totalSizeBytes,
    formattedSize: formatBytes(totalSizeBytes),
    autoCount,
    manualCount,
    lastBackupDateFormatted: newest ? `${newest.dateFormatted} - ساعت ${newest.timeFormatted}` : undefined,
    oldestBackupDateFormatted: oldest ? `${oldest.dateFormatted} - ساعت ${oldest.timeFormatted}` : undefined,
  };
}
