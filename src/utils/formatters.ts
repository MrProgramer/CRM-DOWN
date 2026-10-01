/**
 * Utilities for Persian numbers, currency, and carton formatting
 */

// Convert Latin digits to Persian digits
export function toPersianDigits(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '';
  const str = String(n);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[+w]);
}

// Convert Persian/Arabic digits to Latin/English digits
export function toEnglishDigits(str: number | string | undefined | null): string {
  if (str === undefined || str === null) return '';
  const s = String(str);
  const persianMap: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  return s.replace(/[۰-۹٠-٩]/g, (char) => persianMap[char] || char).trim();
}

// Format currency with Persian commas
export function formatPrice(amount: number | undefined | null, includeUnit: boolean = true): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '۰' + (includeUnit ? ' تومان' : '');
  const formatted = Math.round(amount).toLocaleString('en-US');
  const persian = toPersianDigits(formatted);
  return includeUnit ? `${persian} تومان` : persian;
}

// Format raw number with commas
export function formatNumber(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '۰';
  return toPersianDigits(Math.round(amount).toLocaleString('en-US'));
}

// Generate the exact carton/piece description string seen in invoices
// e.g. "5 کارتن" or "2 کارتن و 12 عدد" or "80 عدد (1 کارتن)"
export function formatCartonText(totalPieces: number, piecesPerCarton: number, isCartonUnknown?: boolean): string {
  if (isCartonUnknown) {
    return 'نامشخص (بدون کارتن)';
  }
  if (!piecesPerCarton || piecesPerCarton <= 1) {
    return `${toPersianDigits(totalPieces)} عدد`;
  }
  const cartons = Math.floor(totalPieces / piecesPerCarton);
  const remainder = totalPieces % piecesPerCarton;

  if (cartons > 0 && remainder > 0) {
    return `${toPersianDigits(cartons)} کارتن و ${toPersianDigits(remainder)} عدد`;
  } else if (cartons > 0) {
    return `${toPersianDigits(cartons)} کارتن`;
  } else {
    return `${toPersianDigits(remainder)} عدد`;
  }
}

// Persian date generator or helper
export function getCurrentPersianDate(): string {
  try {
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(today);
    const year = parts.find(p => p.type === 'year')?.value || '1405';
    const month = parts.find(p => p.type === 'month')?.value || '05';
    const day = parts.find(p => p.type === 'day')?.value || '14';
    return `${year}/${month}/${day}`;
  } catch {
    return '1405/05/14';
  }
}

/**
 * Returns a list of Persian date strings for the past N days from reference date or today
 */
export function getRecentPersianDates(daysCount: number = 7, refDateStr?: string): string[] {
  const dates: string[] = [];
  const ref = refDateStr ? parsePersianDateToDate(refDateStr) : new Date();
  
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(ref.getTime() - i * 86400000);
    try {
      const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = formatter.formatToParts(d);
      const year = parts.find(p => p.type === 'year')?.value || '1405';
      const month = parts.find(p => p.type === 'month')?.value || '05';
      const day = parts.find(p => p.type === 'day')?.value || '14';
      dates.push(`${year}/${month}/${day}`);
    } catch {
      dates.push('1405/05/14');
    }
  }
  return dates;
}

/**
 * Helper to rough estimate date proximity
 */
function parsePersianDateToDate(pDate: string): Date {
  const parts = pDate.split('/').map(Number);
  if (parts.length === 3) {
    // Rough offset from Persian year 1405 (~2026 AD)
    const gYear = parts[0] + 621;
    return new Date(gYear, parts[1] - 1, parts[2]);
  }
  return new Date();
}

export type TimePeriodFilter = 'today' | 'week' | 'month' | '3months' | '6months' | '1year' | 'all';

export const TIME_PERIOD_STORAGE_KEY = 'bazargani_selected_time_period';

/**
 * Retrieve persisted time period filter from localStorage or return default
 */
export function getSavedTimePeriod(defaultPeriod: TimePeriodFilter = 'month'): TimePeriodFilter {
  try {
    const saved = localStorage.getItem(TIME_PERIOD_STORAGE_KEY) as TimePeriodFilter;
    if (saved && ['today', 'week', 'month', '3months', '6months', '1year', 'all'].includes(saved)) {
      return saved;
    }
  } catch {
    // ignore
  }
  return defaultPeriod;
}

/**
 * Persist time period filter to localStorage and dispatch event for cross-component sync
 */
export function saveTimePeriod(period: TimePeriodFilter): void {
  try {
    localStorage.setItem(TIME_PERIOD_STORAGE_KEY, period);
    window.dispatchEvent(new CustomEvent('bazargani_time_period_changed', { detail: period }));
  } catch {
    // ignore
  }
}

/**
 * Helper to convert Persian date string YYYY/MM/DD to estimated timestamp for relative comparison
 */
export function parsePersianDateToTimestamp(pDate: string): number {
  if (!pDate) return 0;
  const parts = pDate.split('/').map(s => parseInt(s.trim().replace(/[^\d]/g, '')) || 0);
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    // Persian calendar day calculation
    const daysInMonths = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    let totalDays = y * 365.24 + d;
    for (let i = 1; i < m && i <= 12; i++) {
      totalDays += daysInMonths[i];
    }
    return totalDays * 86400000;
  }
  return 0;
}

/**
 * Check if a Persian date is within today, week (7 days), month (30 days), 3 months (90 days), 6 months (180 days), 1 year (365 days)
 */
export function isDateInPeriod(dateStr: string | undefined | null, period: TimePeriodFilter): boolean {
  if (!dateStr || period === 'all') return true;
  const todayStr = getCurrentPersianDate();
  
  if (period === 'today') {
    return dateStr === todayStr;
  }
  
  const todayParts = todayStr.split('/').map(s => parseInt(s.trim()) || 0);
  const dateParts = dateStr.split('/').map(s => parseInt(s.trim()) || 0);

  if (todayParts.length !== 3 || dateParts.length !== 3) return true;

  const todayDays = todayParts[0] * 365 + todayParts[1] * 30 + todayParts[2];
  const itemDays = dateParts[0] * 365 + dateParts[1] * 30 + dateParts[2];
  const diffDays = todayDays - itemDays;

  // We allow items up to today and slightly ahead (e.g. diff >= -1)
  if (diffDays < -2) return false;

  if (period === 'week') {
    return diffDays <= 7;
  }
  if (period === 'month') {
    return diffDays <= 30;
  }
  if (period === '3months') {
    return diffDays <= 90;
  }
  if (period === '6months') {
    return diffDays <= 180;
  }
  if (period === '1year') {
    return diffDays <= 365;
  }

  return true;
}

export function getCurrentPersianTime(): string {
  try {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return toPersianDigits(`${hours}:${minutes}`);
  } catch {
    return '۱۳:۴۸';
  }
}

// Convert numbers to Persian text (e.g. 1000 -> یک هزار تومان)
const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const thousands = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

export function numberToPersianWords(num: number, includeCurrency: boolean = true): string {
  if (num === 0 || isNaN(num)) return includeCurrency ? 'صفر تومان' : 'صفر';
  if (num < 0) return 'منفی ' + numberToPersianWords(Math.abs(num), includeCurrency);

  function processGroup(n: number): string {
    const parts: string[] = [];
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) parts.push(hundreds[h]);
    if (t === 1) {
      parts.push(teens[o]);
    } else {
      if (t > 1) parts.push(tens[t]);
      if (o > 0) parts.push(ones[o]);
    }
    return parts.join(' و ');
  }

  const groups: string[] = [];
  let groupIndex = 0;
  let remaining = Math.floor(num);

  while (remaining > 0) {
    const group = remaining % 1000;
    if (group > 0) {
      const groupWords = processGroup(group);
      const suffix = thousands[groupIndex];
      groups.unshift(suffix ? `${groupWords} ${suffix}` : groupWords);
    }
    remaining = Math.floor(remaining / 1000);
    groupIndex++;
  }

  const words = groups.join(' و ');
  return includeCurrency ? `${words} تومان` : words;
}

/**
 * Calculates human-readable magnitude scale (هزار / میلیون / میلیارد)
 * e.g. 
 *  - 2,500,000,000 -> "۲٫۵ میلیارد تومان"
 *  - 14,800,000 -> "۱۴٫۸ میلیون تومان"
 *  - 450,000 -> "۴۵۰ هزار تومان"
 */
export function formatAmountScale(num: number | undefined | null): string {
  if (!num || isNaN(num) || num === 0) return '۰ تومان';
  const abs = Math.abs(num);
  const sign = num < 0 ? 'منفی ' : '';

  if (abs >= 1_000_000_000) {
    const billions = abs / 1_000_000_000;
    const formatted = (Math.round(billions * 100) / 100).toString().replace('.', '٫');
    return `${sign}${toPersianDigits(formatted)} میلیارد تومان`;
  }

  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    const formatted = (Math.round(millions * 100) / 100).toString().replace('.', '٫');
    return `${sign}${toPersianDigits(formatted)} میلیون تومان`;
  }

  if (abs >= 1_000) {
    const thousands = abs / 1_000;
    const formatted = (Math.round(thousands * 10) / 10).toString().replace('.', '٫');
    return `${sign}${toPersianDigits(formatted)} هزار تومان`;
  }

  return `${sign}${toPersianDigits(abs.toLocaleString('en-US'))} تومان`;
}

/**
 * Calculates detailed breakdown into components:
 * e.g. 1,250,500,000 -> "۱ میلیارد و ۲۵۰ میلیون و ۵۰۰ هزار تومان"
 */
export function formatAmountBreakdown(num: number | undefined | null): string {
  if (!num || isNaN(num) || num === 0) return '۰ تومان';
  const abs = Math.abs(num);
  const sign = num < 0 ? 'منفی ' : '';

  const billions = Math.floor(abs / 1_000_000_000);
  const remainderAfterBillions = abs % 1_000_000_000;
  const millions = Math.floor(remainderAfterBillions / 1_000_000);
  const remainderAfterMillions = remainderAfterBillions % 1_000_000;
  const thousands = Math.floor(remainderAfterMillions / 1_000);
  const remainder = remainderAfterMillions % 1_000;

  const parts: string[] = [];
  if (billions > 0) parts.push(`${toPersianDigits(billions.toLocaleString('en-US'))} میلیارد`);
  if (millions > 0) parts.push(`${toPersianDigits(millions.toLocaleString('en-US'))} میلیون`);
  if (thousands > 0) parts.push(`${toPersianDigits(thousands.toLocaleString('en-US'))} هزار`);
  if (remainder > 0 && parts.length === 0) parts.push(`${toPersianDigits(remainder.toLocaleString('en-US'))}`);

  if (parts.length === 0) return '۰ تومان';
  return `${sign}${parts.join(' و ')} تومان`;
}

/**
 * Smart parsing of amount inputs with support for shorthand (m, b, k, میلیون, میلیارد, هزار)
 */
export function parseSmartAmount(input: string | number | undefined | null): number {
  if (input === undefined || input === null) return 0;
  if (typeof input === 'number') return isNaN(input) ? 0 : input;

  const raw = toEnglishDigits(input).trim().toLowerCase();
  if (!raw) return 0;

  // Check for billion shortcuts: "2.5b", "2.5 میلیارد", "2.5ب"
  if (raw.includes('b') || raw.includes('میلیارد') || raw.includes('میلیارد') || raw.endsWith('ب')) {
    const numPart = parseFloat(raw.replace(/[^\d.]/g, ''));
    if (!isNaN(numPart)) return Math.round(numPart * 1_000_000_000);
  }

  // Check for million shortcuts: "12.5m", "12.5 میلیون", "12.5م"
  if (raw.includes('m') || raw.includes('میلیون') || raw.endsWith('م')) {
    const numPart = parseFloat(raw.replace(/[^\d.]/g, ''));
    if (!isNaN(numPart)) return Math.round(numPart * 1_000_000);
  }

  // Check for thousand shortcuts: "450k", "450 هزار", "450هـ", "450ه"
  if (raw.includes('k') || raw.includes('هزار') || raw.endsWith('هـ') || raw.endsWith('ه')) {
    const numPart = parseFloat(raw.replace(/[^\d.]/g, ''));
    if (!isNaN(numPart)) return Math.round(numPart * 1_000);
  }

  // Clean numeric string
  const cleanStr = raw.replace(/[^\d.]/g, '');
  if (!cleanStr) return 0;

  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

/**
 * Format exact packaging specification for warehouse items and invoices
 * Handles:
 * - "هر کارتن ۱۸۰ عددی (۹ برگی)" for leavesPerPiece with 1-piece packs or direct count
 * - "هر کارتن ۴ بسته ۲۰۰ عددی (۸۰۰ عددی)" for pack breakdowns
 * - "هر کارتن ۴۸۰ عددی (۲۰ بسته ۲۴ عددی)"
 * - "هر کارتن ۱۸۰ عددی" when piecesPerPack is 1
 */
// Check if a product is unpackaged (بدون بسته‌بندی کارتن یا تعداد کارتن نامشخص)
export function isProductUnpackaged(prod?: {
  piecesPerCarton?: number;
  packsPerCarton?: number;
  piecesPerPack?: number;
  unitTitle?: string;
  isUnpackaged?: boolean;
  isCartonUnknown?: boolean;
} | null): boolean {
  if (!prod) return false;
  if (prod.isUnpackaged || prod.isCartonUnknown) return true;
  const ppc = prod.piecesPerCarton || 1;
  const packs = prod.packsPerCarton || 1;
  const ppp = prod.piecesPerPack || 1;
  return (ppc <= 1 && packs <= 1 && ppp <= 1) || prod.unitTitle === 'کیلوگرم' || prod.unitTitle === 'متر' || prod.unitTitle === 'گرم';
}

/**
 * Normalizes Persian and Arabic text for robust search and keyword matching.
 * Handles tashkeel, zwnj, Arabic kaf/yeh/heh/waw/alif.
 */
export function normalizePersianText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '') // remove tashkeel/harakat
    .replace(/[\u200C\u200B]/g, ' ') // replace zwnj with space
    .replace(/[يی]/g, 'ی')
    .replace(/[كک]/g, 'ک')
    .replace(/[ةه]/g, 'ه')
    .replace(/[ؤ]/g, 'و')
    .replace(/[إأآا]/g, 'ا')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Smart Category Auto-Detection Engine
 * Scans the entered product name against available categories and wholesale food keywords.
 * Returns the best matching category name or null if no confident match.
 */
export function detectCategoryFromName(
  productName: string,
  availableCategories: string[]
): string | null {
  if (!productName || !productName.trim() || !availableCategories || availableCategories.length === 0) {
    return null;
  }

  const cleanName = normalizePersianText(productName);
  if (!cleanName) return null;

  // Filter out meta categories
  const validCategories = availableCategories.filter(
    cat => cat && cat !== 'all' && cat !== 'همه دسته‌ها' && cat !== 'دسته‌بندی نشده' && cat.trim().length > 0
  );

  // 1. Direct Category Name Substring Match (sorted longest to shortest)
  const sortedCategories = [...validCategories].sort((a, b) => b.length - a.length);

  for (const cat of sortedCategories) {
    const cleanCat = normalizePersianText(cat);
    if (!cleanCat) continue;

    // Direct substring in product name
    if (cleanName.includes(cleanCat)) {
      return cat;
    }

    // Direct word match for multi-word categories (e.g. "کیک و بیسکویت" or "چیپس و پفک")
    const words = cleanCat.split(/\s+/).filter(w => w.length > 2 && w !== 'های' && w !== 'جات');
    for (const w of words) {
      if (cleanName.includes(w)) {
        return cat;
      }
    }
  }

  // 2. Comprehensive Domain Keyword Dictionary (Common Wholesale Confectionery / Snacks)
  const KEYWORD_MAP: Array<{ keywords: string[]; targetKeywords: string[] }> = [
    {
      keywords: ['لواشک', 'شلاقی', 'پذیرایی', 'سسی', 'ورقه ای', 'متری', 'ترش', 'ترشک', 'الوچه', 'آلوچه', 'قیسی', 'تمبر'],
      targetKeywords: ['لواشک', 'ترشک', 'لواشک و ترشک', 'آلوچه', 'تنقلات ترش']
    },
    {
      keywords: ['آبنبات', 'ابنبات', 'اب نبات', 'تافی', 'چوبی', 'پستانکی', 'سکه ای', 'آبنبات چوبی', 'پستونکی'],
      targetKeywords: ['آبنبات', 'ابنبات', 'تافی', 'آبنبات و تافی']
    },
    {
      keywords: ['شکلات', 'کاکائو', 'کاکایو', 'دراژه', 'اسمارتیز', 'نوتلا', 'باراکا', 'شونیز', 'فرمند', 'مروارید'],
      targetKeywords: ['شکلات', 'اسمارتیز و شکلات', 'کاکائو', 'دراژه']
    },
    {
      keywords: ['پاستیل', 'پاستیلی', 'ببتو', 'ژله', 'ژله ای', 'مارشمالو', 'مارشملو'],
      targetKeywords: ['پاستیل', 'ژله و پاستیل']
    },
    {
      keywords: ['آدامس', 'ادامس', 'اوربیت', 'ریلکس', 'خرسی', 'بادکنکی', 'نعنایی', 'شیک'],
      targetKeywords: ['آدامس', 'ادامس', 'آدامس و دراژه']
    },
    {
      keywords: ['بیسکویت', 'بیسکوئیت', 'ویفر', 'کیک', 'کلوچه', 'کروسان', 'تی تاب', 'تیتاب', 'ساقه طلایی', 'هایبای', 'های بای', 'مینی های'],
      targetKeywords: ['کیک و بیسکویت', 'بیسکویت', 'ویفر', 'کیک', 'کلوچه']
    },
    {
      keywords: ['چیپس', 'پفک', 'کرانچی', 'پاپ کورن', 'پاپکورن', 'اسنک', 'پفک هندی', 'چی توز', 'مزمز', 'چاکلز'],
      targetKeywords: ['چیپس و پفک', 'چیپس', 'پفک', 'تنقلات']
    },
    {
      keywords: ['آبمیوه', 'ابمیوه', 'رانی', 'نوشابه', 'انرژی زا', 'دلستر', 'هایپ', 'ایس تی', 'شربت', 'نوشیدنی'],
      targetKeywords: ['نوشیدنی', 'آبمیوه', 'نوشیدنی و آبمیوه']
    },
    {
      keywords: ['تخمه', 'پسته', 'بادام', 'فندق', 'گردو', 'آجیل', 'اجیل', 'تخمه کدو', 'تخمه ژاپنی'],
      targetKeywords: ['آجیل و خشکبار', 'خشکبار', 'آجیل']
    },
    {
      keywords: ['تخم مرغ شانسی', 'شانسی', 'اسباب بازی', 'جایزه دار'],
      targetKeywords: ['شانسی', 'تخم مرغ شانسی', 'سرگرمی']
    }
  ];

  for (const mapping of KEYWORD_MAP) {
    const matchesProductName = mapping.keywords.some(kw => {
      const cleanKw = normalizePersianText(kw);
      return cleanName.includes(cleanKw);
    });

    if (matchesProductName) {
      for (const targetKw of mapping.targetKeywords) {
        const cleanTarget = normalizePersianText(targetKw);
        const matchedCategory = validCategories.find(c => {
          const cleanC = normalizePersianText(c);
          return cleanC.includes(cleanTarget) || cleanTarget.includes(cleanC);
        });
        if (matchedCategory) {
          return matchedCategory;
        }
      }
    }
  }

  return null;
}

// Get effective pieces per carton for calculations
export function getProductEffectiveCartonSize(prod?: {
  piecesPerCarton?: number;
  packsPerCarton?: number;
  piecesPerPack?: number;
  unitTitle?: string;
} | null): number {
  if (!prod || isProductUnpackaged(prod)) return 1;
  const explicit = prod.piecesPerCarton || 0;
  if (explicit > 1) return explicit;
  const packs = prod.packsPerCarton || 0;
  const ppp = prod.piecesPerPack || 0;
  if (packs > 1 && ppp > 1) return packs * ppp;
  return explicit > 0 ? explicit : 1;
}

export function formatProductPackagingSpec(prod?: {
  piecesPerCarton?: number;
  packsPerCarton?: number;
  packsCount?: number;
  cartonsCount?: number;
  piecesPerPack?: number;
  leavesPerPiece?: number;
  unitTitle?: string;
  isUnpackaged?: boolean;
  isCartonUnknown?: boolean;
} | null): string {
  if (!prod) return 'نامشخص';

  if (isProductUnpackaged(prod)) {
    return 'نامشخص';
  }

  // Accurately determine packs per carton
  let packsPerCarton = prod.packsPerCarton || 0;
  if (!packsPerCarton && prod.packsCount && prod.cartonsCount && prod.cartonsCount > 0) {
    packsPerCarton = Math.round(prod.packsCount / prod.cartonsCount);
  } else if (!packsPerCarton && prod.packsCount && !prod.cartonsCount) {
    packsPerCarton = prod.packsCount;
  }

  const piecesPerPack = prod.piecesPerPack || 0;
  const leavesPerPiece = prod.leavesPerPiece || 0;
  const explicitPpc = prod.piecesPerCarton || 0;

  // Case 1: Multi-pack structure (e.g. ۴ بسته ۲۰۰ عددی (کارتن ۸۰۰ عددی) یا ۲۰ بسته ۲۴ عددی (کارتن ۴۸۰ عددی))
  if (packsPerCarton > 1 && piecesPerPack > 1) {
    const totalInCarton = (packsPerCarton * piecesPerPack) > 0 
      ? (packsPerCarton * piecesPerPack) 
      : (explicitPpc > 0 ? explicitPpc : 0);
    const leavesText = leavesPerPiece > 0 ? ` - ${toPersianDigits(leavesPerPiece)} برگی` : '';
    return `${toPersianDigits(packsPerCarton)} بسته ${toPersianDigits(piecesPerPack)} عددی (کارتن ${toPersianDigits(totalInCarton)} عددی${leavesText})`;
  }

  // Case 2: Has leaves specification (e.g. کارتن ۱۵۰ عددی (۶ برگی))
  if (leavesPerPiece > 0) {
    if (explicitPpc > 1) {
      return `کارتن ${toPersianDigits(explicitPpc)} عددی (${toPersianDigits(leavesPerPiece)} برگی)`;
    }
    return `${toPersianDigits(leavesPerPiece)} برگی`;
  }

  // Case 3: Direct carton (e.g. کارتن ۱۸۰ عددی یا کارتن ۱۰۰۰ عددی)
  if (explicitPpc > 1) {
    return `کارتن ${toPersianDigits(explicitPpc)} عددی`;
  }

  return 'نامشخص';
}

/**
 * Format stock count in terms of cartons and pieces
 * e.g. "۵ کارتن (۷۵۰ عدد)", "۲ کارتن و ۵ عدد (۳۰۵ عدد)", or "۵۰ عدد"
 */
export function formatStockBreakdown(pieces: number, piecesPerCarton?: number): string {
  if (!pieces || pieces <= 0) return '۰ عدد';
  const ppc = piecesPerCarton || 0;
  if (ppc <= 0) {
    return `${toPersianDigits(pieces)} عدد`;
  }
  const cartons = Math.floor(pieces / ppc);
  const remainingPieces = pieces % ppc;

  if (cartons > 0 && remainingPieces === 0) {
    return `${toPersianDigits(cartons)} کارتن (${toPersianDigits(pieces)} عدد)`;
  }
  if (cartons > 0 && remainingPieces > 0) {
    return `${toPersianDigits(cartons)} کارتن و ${toPersianDigits(remainingPieces)} عدد (${toPersianDigits(pieces)} عدد)`;
  }
  return `${toPersianDigits(pieces)} عدد`;
}

/**
 * Calculates net return amount considering extra costs (e.g. freight, penalty)
 */
export function getNetReturnAmount(ret: { totalAmount: number; extraCosts?: number; netAmount?: number }): number {
  if (!ret) return 0;
  if (ret.netAmount !== undefined && ret.netAmount !== null) {
    return Math.max(0, ret.netAmount);
  }
  const gross = ret.totalAmount || 0;
  const extra = ret.extraCosts || 0;
  return Math.max(0, gross - extra);
}

export interface CustomerTypeOption {
  id: 'regular' | 'distributor' | 'supplier' | 'both' | 'partner';
  value: 'regular' | 'distributor' | 'supplier' | 'both' | 'partner';
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  bgLight: string;
  borderClass: string;
  textColor: string;
  iconName: 'User' | 'Store' | 'Truck' | 'Repeat' | 'Briefcase';
}

export const CUSTOMER_TYPE_OPTIONS: CustomerTypeOption[] = [
  {
    id: 'regular',
    value: 'regular',
    label: 'مشتری ساده (خریدار خرد و مصرف‌کننده)',
    shortLabel: 'مشتری ساده',
    description: 'خریداران عادی، مصرف‌کنندگان خانگی و خریدهای خرد',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/20',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    iconName: 'User'
  },
  {
    id: 'distributor',
    value: 'distributor',
    label: 'فروشنده و عامل پخش (بنکدار و عمده‌فروش)',
    shortLabel: 'فروشنده و عامل پخش',
    description: 'مغازه‌داران، سوپرمارکت‌ها، بنکداران و عاملین فروش و توزیع',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40',
    bgLight: 'bg-blue-50 dark:bg-blue-950/20',
    borderClass: 'border-blue-300 dark:border-blue-700',
    textColor: 'text-blue-700 dark:text-blue-300',
    iconName: 'Store'
  },
  {
    id: 'supplier',
    value: 'supplier',
    label: 'تامین‌کننده مواد غذایی (ازش جنس می‌خریم)',
    shortLabel: 'تامین‌کننده مواد غذایی',
    description: 'کارخانجات، شرکت‌های تولیدی و واردکنندگان که مواد اولیه و کالا از آنها تامین می‌شود',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40',
    bgLight: 'bg-purple-50 dark:bg-purple-950/20',
    borderClass: 'border-purple-300 dark:border-purple-700',
    textColor: 'text-purple-700 dark:text-purple-300',
    iconName: 'Truck'
  },
  {
    id: 'both',
    value: 'both',
    label: 'دوطرفه (هم خریدار و هم تامین‌کننده مواد غذایی)',
    shortLabel: 'خریدار و تامین‌کننده',
    description: 'همکاران تجاری که هم از آنها کالا می‌خریم و هم به آنها کالا می‌فروشیم',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40',
    bgLight: 'bg-amber-50 dark:bg-amber-950/20',
    borderClass: 'border-amber-300 dark:border-amber-700',
    textColor: 'text-amber-700 dark:text-amber-300',
    iconName: 'Repeat'
  },
  {
    id: 'partner',
    value: 'partner',
    label: 'همکار تجاری / ویزیتور و واسطه فروش',
    shortLabel: 'همکار / ویزیتور',
    description: 'واسطه‌های فروش، بازاریابان و شرکای استراتژیک بازرگانی',
    badgeClass: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-800/40',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/20',
    borderClass: 'border-cyan-300 dark:border-cyan-700',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    iconName: 'Briefcase'
  }
];

export function getCustomerTypeInfo(type?: string): CustomerTypeOption {
  const found = CUSTOMER_TYPE_OPTIONS.find(t => t.id === type || t.value === type);
  return found || CUSTOMER_TYPE_OPTIONS[0];
}



