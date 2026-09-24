import { 
  AppFontFamily, 
  AppNumberFormat, 
  AppFontSizeScale, 
  AppInvoiceFontSizeScale,
  StoreSettings 
} from '../types';

export interface FontFamilyOption {
  id: AppFontFamily;
  nameFa: string;
  nameEn: string;
  creator: string;
  description: string;
  cssFamily: string;
  category: 'standard' | 'modern' | 'official' | 'fintech' | 'classic';
  previewText: string;
  badge: string;
  features: string[];
}

export interface FontSizeOption {
  id: AppFontSizeScale;
  nameFa: string;
  percentage: number;
  scaleValue: string; // e.g. '1'
  basePx: number;
  description: string;
  badge: string;
}

export interface InvoiceFontSizeOption {
  id: AppInvoiceFontSizeScale;
  nameFa: string;
  percentage: number;
  scaleValue: string; // e.g. '1'
  description: string;
  badge: string;
}

/**
 * پرمخاطب‌ترین، رسمی‌ترین و زیباترین قلم‌های وب و نرم‌افزارهای تجاری-مالی ایران
 */
export const fontFamilies: Record<AppFontFamily, FontFamilyOption> = {
  vazirmatn: {
    id: 'vazirmatn',
    nameFa: 'وزیرمتن (استاندارد ملی)',
    nameEn: 'Vazirmatn',
    creator: 'صابر راستی‌کردار',
    description: 'محبوب‌ترین و استانداردترین فونت وب فارسی، ارگونومی بی‌نظیر، تعادل عالی در اعداد و متون اداری',
    cssFamily: "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    category: 'standard',
    previewText: 'فاکتور رسمی فروش کالا و مدیریت هوشمند انبار بازرگانی',
    badge: 'پیش‌فرض رسمی',
    features: ['ارقام استاندارد فارسی', 'خوانایی عالی در مانیتور', '۹ وزن مختلف']
  },
  shabnam: {
    id: 'shabnam',
    nameFa: 'شبنم (نرم و چشم‌نواز)',
    nameEn: 'Shabnam',
    creator: 'صابر راستی‌کردار',
    description: 'فونت فوق‌العاده صمیمی با لبه‌های ملایم، آرامش‌بخش برای چشم در کار طولانی و بسیار محبوب در نرم‌افزارهای مالی',
    cssFamily: "'Shabnam', 'Vazirmatn', -apple-system, sans-serif",
    category: 'modern',
    previewText: 'صدور سریع پیش‌فاکتور، فاکتور فروش و ثبت تسویه حساب',
    badge: 'محبوب‌ترین فونت',
    features: ['طراحی نرم و دوست‌داشتنی', 'کاهش خستگی چشم', 'ارقام هماهنگ فارسی']
  },
  sahel: {
    id: 'sahel',
    nameFa: 'ساحل (رسمی و استوار)',
    nameEn: 'Sahel',
    creator: 'صابر راستی‌کردار',
    description: 'قلم رسمی با وقار و ساختار هندسی استوار؛ انتخابی بی‌نظیر برای سربرگ‌های رسمی و اسناد حسابداری تجاری',
    cssFamily: "'Sahel', 'Vazirmatn', -apple-system, sans-serif",
    category: 'official',
    previewText: 'تراز حسابداری، گزارش تحلیلی گردش نقدینگی و سود بازرگانی',
    badge: 'رسمی و حقوقی',
    features: ['حس وقار و اسناد دولتی', 'کنتراست بالای کلمات', 'عالی برای پرینت']
  },
  samim: {
    id: 'samim',
    nameFa: 'صمیم (مدرن و جمع‌وجور)',
    nameEn: 'Samim',
    creator: 'صابر راستی‌کردار',
    description: 'قلم فشرده با گوشه‌های گرد و تراکم بهینه؛ ایده‌آل برای نمایش فشرده ستون‌های جدول و ردیف‌های طولانی فاکتور',
    cssFamily: "'Samim', 'Vazirmatn', -apple-system, sans-serif",
    category: 'modern',
    previewText: 'ثبت سفارش کالا، کنترل کارتن و دانه در انبار مرکزی',
    badge: 'تراکم و ارگونومی',
    features: ['تراکم عالی داده‌ها', 'جدول‌بندی شفاف', 'تناسب بالا با ارقام']
  },
  parastoo: {
    id: 'parastoo',
    nameFa: 'پرستو (کلاسیک و اسنادی)',
    nameEn: 'Parastoo',
    creator: 'صابر راستی‌کردار',
    description: 'قلم دارای کاراکتر سناتوری و اصیل؛ مناسب شرکت‌های باسابقه، دفاتر تجاری و قراردادهای بازرگانی',
    cssFamily: "'Parastoo', 'Vazirmatn', -apple-system, sans-serif",
    category: 'classic',
    previewText: 'صورت وضعیت بستانکاران و بدهکاران تجاری بازرگانی',
    badge: 'اصیل و سناتوری',
    features: ['جلوه فاخر قراردادها', 'تناسب متن‌های طولانی', 'چاپ باکیفیت']
  },
  dana: {
    id: 'dana',
    nameFa: 'دانا (فین‌تک و وب‌سنس)',
    nameEn: 'Dana / WebSans',
    creator: 'طراحی مدرن رابط کاربری',
    description: 'سبک مدرن و جسورانه مورد استفاده در پیشروترین بانک‌ها، استارتاپ‌ها و سامانه‌های فین‌تک ایران',
    cssFamily: "'Dana', 'IRANSans', 'Vazirmatn', -apple-system, sans-serif",
    category: 'fintech',
    previewText: 'داشبورد مدیریتی شاخص‌های مالی، فروش و سود ناخالص',
    badge: 'فین‌تک و مدرن',
    features: ['طراحی تکنولوژیک', 'جلوه بسیار مدرن', 'خوانایی عالی در جداول']
  },
  cairo: {
    id: 'cairo',
    nameFa: 'کایرو (هندسی شرکتی)',
    nameEn: 'Cairo Corporate',
    creator: 'محمد صفدرپور (Google)',
    description: 'طراحی هندسی، کریستالی و بین‌المللی؛ زاویه‌های دقیق و شارپ با جلوه فوق‌العاده مدرن شرکتی',
    cssFamily: "'Cairo', 'Vazirmatn', -apple-system, sans-serif",
    category: 'modern',
    previewText: 'سامانه یکپارچه انبارداری، خزانه‌داری و صدور اسناد',
    badge: 'هندسی و شارپ',
    features: ['هندسی و تکنولوژیک', 'تفکیک عالی حروف', 'بسیار پرطرفدار']
  },
  tahoma: {
    id: 'tahoma',
    nameFa: 'تاهوما (استاندارد حسابداری ویندوز)',
    nameEn: 'Tahoma System',
    creator: 'مایکروسافت (ویندوز)',
    description: 'فونت نوستالژیک و کریستالی آشنا برای حسابداران، مورد استفاده در تمام سیستم‌های سنتی ایران (هلو، راه‌کاران، سپیدار)',
    cssFamily: "'Tahoma', 'Segoe UI', Arial, sans-serif",
    category: 'classic',
    previewText: 'سند مالی بدهکار / بستانکار و گردش عملیات حسابداری',
    badge: 'نوستالژیک حسابداری',
    features: ['فونت سیستم‌های حسابداری', 'حداکثر وضوح پیکسلی', 'سرعت بارگذاری آنی']
  }
};

/**
 * مقیاس‌های مهندسی‌شده اندازه فونت کل برنامه
 */
export const appFontSizes: Record<AppFontSizeScale, FontSizeOption> = {
  compact: {
    id: 'compact',
    nameFa: 'فشرده و متراکم (۸۸٪)',
    percentage: 88,
    scaleValue: '0.88',
    basePx: 12.3,
    description: 'تراکم بالای اطلاعات در صفحه؛ عالی برای حسابداران حرفه‌ای، نمایشگرهای کوچک لپ‌تاپ و جداول پرتعداد',
    badge: 'بیشترین اطلاعات در صفحه'
  },
  standard: {
    id: 'standard',
    nameFa: 'استاندارد رسمی (۱۰۰٪)',
    percentage: 100,
    scaleValue: '1',
    basePx: 14,
    description: 'اندازه رسمی، مهندسی‌شده و متناسب برای اکثر نمایشگرها با تعادل ارگونومیک کامل',
    badge: 'پیش‌فرض متعادل'
  },
  comfortable: {
    id: 'comfortable',
    nameFa: 'راحت و خوانا (۱۱۰٪)',
    percentage: 110,
    scaleValue: '1.10',
    basePx: 15.4,
    description: 'کاهش چشمگیر خستگی چشم در ساعات کاری طولانی؛ خواندن سریع‌تر مبالغ و متون',
    badge: 'ارگونومیک و ضد خستگی'
  },
  large: {
    id: 'large',
    nameFa: 'درشت و باز (۱۲۰٪)',
    percentage: 120,
    scaleValue: '1.20',
    basePx: 16.8,
    description: 'مناسب مانیتورهای با رزولوشن بسیار بالا (4K/2K)، کار با فاصله از مانیتور و سهولت در مشاهده',
    badge: 'وضوح حداکثری'
  }
};

/**
 * مقیاس و تراکم قلم چاپ فاکتور
 */
export const invoiceFontSizes: Record<AppInvoiceFontSizeScale, InvoiceFontSizeOption> = {
  'ultra-compact': {
    id: 'ultra-compact',
    nameFa: 'فوق متراکم تک‌برگی (۸۵٪)',
    percentage: 85,
    scaleValue: '0.85',
    description: 'چاپ فاکتورهای طولانی با بیش از ۱۵ قلم کالا در یک برگه بدون تقسیم شدن صفحه',
    badge: 'بیش از ۱۵ قلم در یک برگ'
  },
  compact: {
    id: 'compact',
    nameFa: 'متراکم و اقتصادی (۹۲٪)',
    percentage: 92,
    scaleValue: '0.92',
    description: 'بهینه‌سازی فضای ردیف‌ها و صرفه‌جویی در کاغذ؛ متناسب با فاکتورهای ۱۰ تا ۱۵ قلم',
    badge: '۱۰ تا ۱۵ قلم'
  },
  standard: {
    id: 'standard',
    nameFa: 'استاندارد رسمی (۱۰۰٪)',
    percentage: 100,
    scaleValue: '1',
    description: 'اندازه رسمی فاکتور بازرگانی؛ ایده‌آل‌ترین حالت نمایش برای فاکتورهای ۵ الی ۱۰ قلم',
    badge: 'رسمی و متعادل'
  },
  large: {
    id: 'large',
    nameFa: 'درشت و برجسته (۱۱۰٪)',
    percentage: 110,
    scaleValue: '1.10',
    description: 'فاکتورهای تک‌صفحه‌ای کم‌ردیف VIP با جلوه برجسته، خوانایی بسیار بالا و شکیل',
    badge: 'فاکتورهای VIP'
  }
};

/**
 * اعمال تایپوگرافی و مقیاس‌ها روی Root سند HTML
 */
export function applyTypographyToDOM(settings: StoreSettings): void {
  const root = document.documentElement;
  
  const chosenFontKey = (settings.fontFamily && fontFamilies[settings.fontFamily]) 
    ? settings.fontFamily 
    : 'vazirmatn';
  const chosenFont = fontFamilies[chosenFontKey] || fontFamilies.vazirmatn;

  // App Font Scale
  let scaleValue = '1';
  if (settings.customFontScalePercent && settings.customFontScalePercent >= 80 && settings.customFontScalePercent <= 130) {
    scaleValue = (settings.customFontScalePercent / 100).toFixed(2);
  } else if (settings.fontSizeScale && appFontSizes[settings.fontSizeScale]) {
    scaleValue = appFontSizes[settings.fontSizeScale].scaleValue;
  }

  // Invoice Font Scale
  const invoiceScaleKey = (settings.invoiceFontSizeScale && invoiceFontSizes[settings.invoiceFontSizeScale])
    ? settings.invoiceFontSizeScale
    : 'standard';
  const chosenInvoiceSize = invoiceFontSizes[invoiceScaleKey] || invoiceFontSizes.standard;

  // Set CSS Custom Properties
  root.style.setProperty('--app-font-family', chosenFont.cssFamily);
  root.style.setProperty('--app-header-font', chosenFont.cssFamily);
  root.style.setProperty('--app-number-font', chosenFont.cssFamily);
  root.style.setProperty('--app-font-scale', scaleValue);
  root.style.setProperty('--invoice-font-scale', chosenInvoiceSize.scaleValue);

  // Set data attributes for easy targeting in CSS
  root.setAttribute('data-app-font', chosenFont.id);
  root.setAttribute('data-font-size-scale', settings.fontSizeScale || 'standard');
  root.setAttribute('data-invoice-scale', chosenInvoiceSize.id);
  root.setAttribute('data-number-format', settings.numberFormat || 'persian');
}
