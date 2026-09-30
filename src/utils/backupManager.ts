import { Product, Invoice, Customer, CustomerPayment, ActivityLog, StoreSettings, BackupSnapshot, BackupSnapshotType, ProductReturn, TreasuryTransaction } from '../types';
import { getCurrentPersianDate, getCurrentPersianTime, toPersianDigits } from './formatters';

const BACKUP_STORAGE_KEY = 'bazargani_smart_backup_snapshots_v1';

export const MAX_CHANGE_SNAPSHOTS = 5;      // ۵ اسلات اختصاصی برای پشتیبان‌گیری پس از هر تغییر
export const MAX_SCHEDULED_SNAPSHOTS = 10;  // ۱۰ اسلات برای پشتیبان‌گیری‌های دوره‌ای و دستی
export const TOTAL_BACKUP_LIMIT = 15;       // مجموع ظرفیت مخزن پشتیبان هوشمند (۱۵ نسخه)

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
 * Save snapshots array to LocalStorage with smart 15-slot dual-pool partitioning:
 * - Exactly up to 5 slots reserved for live change snapshots (type === 'change')
 * - Exactly up to 10 slots reserved for periodic auto & manual snapshots (type === 'auto' || type === 'manual')
 * - Total max 15 snapshots.
 */
export function saveBackupSnapshots(
  snapshots: BackupSnapshot[],
  retentionCount: number = TOTAL_BACKUP_LIMIT
): { snapshots: BackupSnapshot[]; prunedCount: number } {
  try {
    // Sort descending (newest first)
    const sorted = [...snapshots].sort((a, b) => b.createdAt - a.createdAt);

    const changePool: BackupSnapshot[] = [];
    const scheduledPool: BackupSnapshot[] = [];

    // Deduplicate identical IDs if any
    const seenIds = new Set<string>();

    for (const snap of sorted) {
      if (!snap || !snap.id || seenIds.has(snap.id)) continue;
      seenIds.add(snap.id);

      if (snap.type === 'change') {
        if (changePool.length < MAX_CHANGE_SNAPSHOTS) {
          changePool.push(snap);
        }
      } else {
        if (scheduledPool.length < MAX_SCHEDULED_SNAPSHOTS) {
          scheduledPool.push(snap);
        }
      }
    }

    // Combine both pools and sort newest first
    const kept = [...changePool, ...scheduledPool].sort((a, b) => b.createdAt - a.createdAt);
    const prunedCount = Math.max(0, sorted.length - kept.length);

    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(kept));
    } catch (quotaErr) {
      console.warn('LocalStorage quota limit reached, trimming oldest snapshots:', quotaErr);
      // Emergency trim: keep up to 3 change snapshots and 5 manual/scheduled
      const emergencyKept = [
        ...changePool.slice(0, 3),
        ...scheduledPool.slice(0, 5)
      ].sort((a, b) => b.createdAt - a.createdAt);
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(emergencyKept));
      return { snapshots: emergencyKept, prunedCount: prunedCount + (kept.length - emergencyKept.length) };
    }

    return { snapshots: kept, prunedCount };
  } catch (err) {
    console.error('Failed to save backup snapshots:', err);
    return { snapshots, prunedCount: 0 };
  }
}

/**
 * Creates an instant emergency safety snapshot before any destructive delete/reset action
 */
export function createSafetyPreDeleteSnapshot(
  products: Product[],
  invoices: Invoice[],
  customers: Customer[],
  payments: CustomerPayment[],
  settings: StoreSettings,
  targetDescription: string,
  returns?: ProductReturn[],
  treasuryTransactions?: TreasuryTransaction[],
  activityLogs?: ActivityLog[]
): BackupSnapshot {
  const snapshot = createSnapshotObject(
    products,
    invoices,
    customers,
    payments,
    settings,
    'change',
    `نسخه محافظتی خودکار قبل از ${targetDescription}`,
    activityLogs,
    returns,
    treasuryTransactions
  );
  snapshot.changeAction = `محافظت امنیتی قبل از ${targetDescription}`;

  const existing = getBackupSnapshots();
  saveBackupSnapshots([snapshot, ...existing], TOTAL_BACKUP_LIMIT);
  return snapshot;
}

/**
 * Creates an automatic snapshot immediately after any data modification (change, add, edit, draft, etc.)
 * Strictly saved into the dedicated 5-slot change pool.
 */
export function createOnChangeSnapshot(
  products: Product[],
  invoices: Invoice[],
  customers: Customer[],
  payments: CustomerPayment[],
  settings: StoreSettings,
  changeDescription: string,
  returns?: ProductReturn[],
  treasuryTransactions?: TreasuryTransaction[],
  activityLogs?: ActivityLog[],
  customCategories?: string[],
  customExpenseCategories?: string[]
): BackupSnapshot {
  const snapshot = createSnapshotObject(
    products,
    invoices,
    customers,
    payments,
    settings,
    'change',
    changeDescription,
    activityLogs,
    returns,
    treasuryTransactions,
    customCategories,
    customExpenseCategories
  );
  snapshot.changeAction = changeDescription;

  const existing = getBackupSnapshots();
  saveBackupSnapshots([snapshot, ...existing], TOTAL_BACKUP_LIMIT);
  return snapshot;
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
  type: BackupSnapshotType = 'auto',
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

  let defaultNote = 'پشتیبان‌گیری زمان‌بندی شده خودکار';
  if (type === 'change') {
    defaultNote = 'پشتیبان هوشمند پس از تغییرات سیستم';
  } else if (type === 'manual') {
    defaultNote = 'پشتیبان‌گیری دستی مدیریت';
  }

  return {
    id: `backup-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: timestamp,
    dateFormatted,
    timeFormatted,
    type,
    changeAction: note || defaultNote,
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
    note: note || defaultNote,
    data: dataPayload,
  };
}

/**
 * Perform a manual instant backup (allocated into the 10-slot scheduled/manual pool)
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
  const result = saveBackupSnapshots([snapshot, ...existing], TOTAL_BACKUP_LIMIT);

  return {
    snapshot,
    snapshots: result.snapshots,
    prunedCount: result.prunedCount,
  };
}

/**
 * Check if auto backup is due and execute it seamlessly if needed (allocated into the 10-slot scheduled/manual pool)
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

    const saveResult = saveBackupSnapshots([newSnapshot, ...existingSnapshots], TOTAL_BACKUP_LIMIT);

    const updatedSettings: StoreSettings = {
      ...settings,
      lastAutoBackupTimestamp: now,
      lastBackupDateFormatted: `${newSnapshot.dateFormatted} - ساعت ${newSnapshot.timeFormatted}`,
      backupRetentionCount: TOTAL_BACKUP_LIMIT,
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
  const typeTag = snapshot.type === 'change' ? 'change' : (snapshot.type === 'auto' ? 'scheduled' : 'manual');
  a.download = `bazargani-backup-${safeDate}-${safeTime}-${typeTag}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Get total storage statistics for backup management with 15-slot dual-pool breakdown
 */
export function getBackupStorageStats(): {
  totalCount: number;
  totalLimit: number;
  totalSizeBytes: number;
  formattedSize: string;
  changeCount: number;
  maxChangeSlots: number;
  autoCount: number;
  manualCount: number;
  scheduledAndManualCount: number;
  maxScheduledSlots: number;
  lastBackupDateFormatted?: string;
  lastBackupTimeFormatted?: string;
  oldestBackupDateFormatted?: string;
  lastBackupType?: BackupSnapshotType;
  lastBackupNote?: string;
} {
  const snapshots = getBackupSnapshots();
  const totalCount = snapshots.length;
  const totalSizeBytes = snapshots.reduce((acc, s) => acc + (s.sizeBytes || 0), 0);
  const changeCount = snapshots.filter((s) => s.type === 'change').length;
  const autoCount = snapshots.filter((s) => s.type === 'auto').length;
  const manualCount = snapshots.filter((s) => s.type === 'manual').length;
  const scheduledAndManualCount = autoCount + manualCount;

  const newest = snapshots[0];
  const oldest = snapshots[snapshots.length - 1];

  return {
    totalCount,
    totalLimit: TOTAL_BACKUP_LIMIT,
    totalSizeBytes,
    formattedSize: formatBytes(totalSizeBytes),
    changeCount,
    maxChangeSlots: MAX_CHANGE_SNAPSHOTS,
    autoCount,
    manualCount,
    scheduledAndManualCount,
    maxScheduledSlots: MAX_SCHEDULED_SNAPSHOTS,
    lastBackupDateFormatted: newest ? `${newest.dateFormatted} - ساعت ${newest.timeFormatted}` : undefined,
    lastBackupTimeFormatted: newest?.timeFormatted,
    oldestBackupDateFormatted: oldest ? `${oldest.dateFormatted} - ساعت ${oldest.timeFormatted}` : undefined,
    lastBackupType: newest?.type,
    lastBackupNote: newest?.note,
  };
}
