export interface Product {
  id: string;
  name: string;
  code?: string;
  category: string;
  purchasePrice: number; // قیمت خرید به تومان
  sellingPrice: number; // قیمت فروش به تومان
  piecesPerCarton: number; // تعداد در کارتن (مثلاً ۴۸۰ یا ۸۰۰ یا ۱۵۰)
  packsPerCarton?: number; // تعداد بسته در کارتن (اختیاری مثلاً ۲۰ بسته)
  piecesPerPack?: number; // تعداد در هر بسته (مثلاً ۲۴ عدد)
  leavesPerPiece?: number; // تعداد برگی/دانه ای (مثلا ۶ برگی)
  stockPieces: number; // موجودی انبار بر حسب تعداد دانه/عدد کل
  unitTitle: string; // پیش‌فرض: 'عدد'
  barcode?: string;
  minOrderCartons?: number; // حداقل سفارش به کارتن
  notes?: string;
  isUnpackaged?: boolean; // کالای بدون بسته‌بندی یا کارتن نامشخص
  isCartonUnknown?: boolean; // تعداد کارتن نامشخص
  createdAt?: number;
  updatedAt?: number;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  category?: string;
  unitTitle: string;
  cartonsCount: number; // تعداد کارتن
  packsCount?: number; // تعداد بسته
  piecesPerPack?: number; // تعداد در هر بسته
  extraPieces: number; // تعداد دانه اضافه
  piecesPerCarton: number;
  totalPieces: number; // جمع کل دانه = (cartonsCount * piecesPerCarton) + extraPieces
  unitPurchasePrice: number; // قیمت خرید واحد (تومان)
  unitSellingPrice: number; // قیمت فروش واحد (تومان)
  unitPrice?: number;
  totalPrice: number; // مبلغ کل = totalPieces * unitSellingPrice
  totalPurchaseCost: number; // بهای تمام شده = totalPieces * unitPurchasePrice
  profitAmount: number; // سود = totalPrice - totalPurchaseCost
  profitPercentage: number; // درصد سود
  customDescription?: string;
  isUnpackaged?: boolean; // بدون بسته‌بندی
  isCartonUnknown?: boolean; // تعداد کارتن نامشخص
  originalCartonsCount?: number;
  originalExtraPieces?: number;
  originalTotalPieces?: number;
  originalTotalPrice?: number;
}

export type InvoiceType = 'sale' | 'purchase';
export type PaymentStatus = 'cash' | 'credit' | 'partial';
export type CustomerType = 
  | 'regular'      // مشتری ساده / خریدار خرد و عادی
  | 'distributor'  // فروشنده و عامل پخش / بنکدار
  | 'supplier'     // تامین‌کننده و شرکت مواد غذایی (ازش جنس می‌خریم)
  | 'both'         // دوطرفه (هم خریدار و هم تامین‌کننده)
  | 'partner';     // همکار تجاری / ویزیتور و واسطه

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number; // مبلغ واریزی به تومان
  date: string; // تاریخ شمسی مثلاً "1405/06/04"
  time?: string; // زمان مثلاً "14:20"
  paymentMethod: 'card' | 'bank_transfer' | 'cash' | 'check'; // کارت به کارت، واریز بانکی، نقدی، چک
  type?: 'payment' | 'payout';
  referenceNumber?: string; // شماره پیگیری / شماره چک / فیش
  description?: string; // بابت / توضیحات
  createdAt: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // مثلاً "1039"
  date: string; // مثلاً "1405/05/14"
  time: string; // مثلاً "13:48"
  timestamp?: number;
  type: InvoiceType; // فروش یا خرید (ورود به انبار)
  paymentStatus?: PaymentStatus; // 'cash' (نقدی - تسویه شده)، 'credit' (غیر نقدی - نسیه)، 'partial' (پرداخت بخشی / بیعانه)
  paidAmount?: number; // مبلغ پرداخت‌شده نقدی / پیش‌پرداخت در این فاکتور (تومان)
  remainingAmount?: number; // مانده پرداخت‌نشده / بدهی این فاکتور (تومان)
  paymentAccount?: 'cash' | 'bank'; // حساب مالی تسویه (صندوق نقد یا حساب بانکی)
  paymentMethodDetails?: string; // مثلاً 'کارتخوان فروشگاه'، 'کارت به کارت'، 'نقدی'، 'واریز به حساب'
  isDraft?: boolean; // آیا فاکتور پیش‌نویس است؟ (در حالت پیش‌نویس از موجودی انبار کسر/اضافه نمیشود)
  customerId?: string; // شناسه یکتای طرف حساب جهت ارتباط رابطه‌ای
  customerName: string; // مثلاً "آقای رضایی"
  customerPhone: string; // مثلاً "09184052345"
  customerCity: string; // مثلاً "کرمانشاه"
  customerAddress?: string;
  customerType?: CustomerType; // نوع طرف حساب (مشتری ساده، پخش، تامین‌کننده، و غیره)
  salesType: string; // مثلاً "نقدی عادی (تا ۱۰۰ میلیون تومان)"
  paymentMethod: string; // مثلاً "نقدی (تسویه شده)" یا "غیر نقدی (نسیه)" یا "پرداخت بخشی (بیعانه)"
  previousBalance: string; // مثلاً "بی‌حساب" یا عدد
  finalCustomerBalance: string; // مثلاً "تسویه شده / بی‌حساب"
  items: InvoiceItem[];
  subtotal: number; // جمع خالص فاکتور
  discount: number; // تخفیف
  hasDiscount?: boolean; // فعال/غیرفعال بودن تخفیف روی فاکتور
  discountPercent?: number; // درصد تخفیف اعمال شده (مثلا ۸٪)
  tax: number; // مالیات
  finalAmount: number; // مبلغ نهایی این فاکتور
  totalAmount?: number;
  offsetReturnIds?: string[]; // شناسه‌های مرجوعی‌های کسر و تهاتر شده از این فاکتور (دریافت جنس به‌جای مرجوعی)
  offsetReturnsTotal?: number; // کل مبلغ کسر شده بابت تهاتر با مرجوعی‌ها (تومان)
  expenses?: InvoiceExpense[]; // هزینه‌ها، کرایه بار، ضایعات و ضررهای متصل به فاکتور
  expensesTotalDeduction?: number; // جمع مبالغ کسر شده از فاکتور (تومان)
  expensesTotalAddition?: number; // جمع مبالغ افزوده شده به فاکتور (تومان)
  notes?: string;
  createdAt: number;
}

export type InvoiceExpenseType = 
  | 'freight'      // کرایه بار و حمل و نقل
  | 'loss_waste'   // کالای فاسد، ضایعات و تاریخ مصرف گذشته (دورریز)
  | 'handling'     // کارگری، تخلیه بار و انبارداری
  | 'damage'       // خسارت، شکستگی و کسری بار
  | 'other';       // سایر هزینه‌ها و ضررهای فاکتور

export type InvoiceExpenseAction = 
  | 'deduct'       // کسر از مبلغ نهایی فاکتور
  | 'add'          // اضافه به مبلغ نهایی فاکتور
  | 'record_only'; // فقط قید در سند و گزارش نقدینگی (بدون تغییر مبلغ فاکتور)

export interface InvoiceExpense {
  id: string;
  title: string; // عنوان / شرح هزینه یا ضرر
  amount: number; // مبلغ به تومان
  type: InvoiceExpenseType; // نوع
  action: InvoiceExpenseAction; // کسر، اضافه، یا قید بدون تغییر
  sourceAccount?: 'cash' | 'bank' | 'none'; // محل پرداخت: صندوق نقدی، بانک/کارتخوان، یا بدون خروج وجه مستقیم
  notes?: string; // توضیحات تکمیلی
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  customerType?: CustomerType; // نوع طرف حساب (مشتری ساده، پخش، تامین‌کننده، و غیره)
  phone: string;
  city: string;
  address?: string;
  nationalCode?: string;
  initialBalance: number; // مانده حساب اولیه (تومان) - مثبت: بدهکار، صفر: تسویه، منفی: بستانکار
  creditLimit?: number; // سقف اعتبار خرید
  notes?: string;
  createdAt: number;
  payments?: CustomerPayment[];
}

export interface TreasuryTransaction {
  id: string;
  type: 'expense' | 'transfer' | 'deposit'; // هزینه انبار، انتقال بین حساب، افزایش سرمایه صندوق
  source: 'cash' | 'bank' | 'personal'; // صندوق نقدی، حساب بانکی، یا جیب شخصی مالک (بدون کسر از دخل)
  destination?: 'bank' | 'cash'; // حساب بانکی یا صندوق نقدی (مخصوص انتقال)
  amount: number;
  date: string;
  time: string;
  description: string;
  category: string; // اجاره، قبوض، ترخیص، حقوق، تنخواه، سایر
  createdAt: number;
  impactOnLiquidity?: 'deduct' | 'none' | 'inject'; // نحوه اثر: کسر از صندوق/بانک، بدون کسر (جیب شخصی)، یا افزایش موجودی
}

export type BackupSnapshotType = 'change' | 'auto' | 'manual';

export interface BackupSnapshot {
  id: string;
  createdAt: number;
  dateFormatted: string;
  timeFormatted: string;
  type: BackupSnapshotType;
  changeAction?: string;
  productsCount: number;
  invoicesCount: number;
  draftsCount?: number;
  customersCount: number;
  paymentsCount: number;
  returnsCount?: number;
  treasuryCount?: number;
  activityLogsCount?: number;
  categoriesCount?: number;
  sizeBytes: number;
  note?: string;
  data: {
    version: string;
    exportedAt: string;
    summary?: {
      productsCount: number;
      invoicesCount: number;
      draftsCount?: number;
      salesCount?: number;
      purchasesCount?: number;
      customersCount: number;
      paymentsCount: number;
      returnsCount?: number;
      treasuryCount?: number;
      activityLogsCount?: number;
      categoriesCount?: number;
    };
    products: Product[];
    invoices: Invoice[];
    draftInvoices?: Invoice[];
    drafts?: Invoice[];
    customers: Customer[];
    payments?: CustomerPayment[];
    customerPayments?: CustomerPayment[];
    paymentsList?: CustomerPayment[];
    productReturns?: ProductReturn[];
    returns?: ProductReturn[];
    treasuryTransactions?: TreasuryTransaction[];
    treasury?: TreasuryTransaction[];
    liquidity?: TreasuryTransaction[];
    activityLogs?: ActivityLog[];
    categories?: string[];
    customCategories?: string[];
    expenseCategories?: string[];
    settings: StoreSettings;
  };
}

export type ThemeColor = 
  | 'black' 
  | 'teal' 
  | 'blue' 
  | 'emerald' 
  | 'amber' 
  | 'violet' 
  | 'rose' 
  | 'orange'
  | 'cyan'
  | 'indigo'
  | 'fuchsia'
  | 'lime'
  | 'navy'
  | 'ruby'
  | 'gradient-sunset'
  | 'gradient-ocean'
  | 'gradient-cyber'
  | 'gradient-aurora'
  | 'gradient-royal'
  | 'gradient-emerald-gold'
  | 'gradient-titanium'
  | 'gradient-crimson-dusk'
  | 'gradient-midnight-cyan'
  | 'gradient-nordic-frost'
  | 'vip-royal-obsidian'
  | 'vip-royal-sapphire'
  | 'vip-royal-emerald'
  | 'vip-royal-amethyst'
  | 'vip-royal-ruby'
  | 'vip-royal-gold'
  | 'vip-royal-titanium';

export type AppDesignMode = 
  | 'classic'        // ۱. حالت کلاسیک اداری و دفتری سنتی (بدون انحنا، حداکثر تراکم اطلاعات، کادرهای فیزیکی حسابداری)
  | 'modern'         // ۲. حالت مدرن هوشمند و فین‌تک (پیش‌فرض استاندارد ارگونومیک)
  | 'glassmorphism'  // ۳. حالت گلس‌مورفیک شیشه‌ای کریستال (مات، بازتاب نور، لایه‌های معلق)
  | 'luxury-gold'    // ۴. حالت لوکس ابسیدین و طلایی شاهانه (VIP، سنگ گرانیت، نوار طلای مات)
  | 'neobrutalism'   // ۵. حالت نئوبروتالیسم نرم گرافیکی (کادرهای ضخیم مشخص، سایه‌های فلت پرکنتراست)
  | 'cyber-tech'     // ۶. حالت سایبرتک نئون و اتاق فرمان دیجیتال (سیان های‌تک، ماتریس دیجیتال)
  | 'minimal-nordic' // ۷. حالت مینیمال نوردیک اسکاندیناوی (خلوت، خطوط بسیار ظریف، آرامش دیداری و تمرکز بر داده‌ها)
  | 'aurora-sunset'; // ۸. حالت گرادیان شفق قطبی و پویای زنده (هاله‌های رنگین‌کمانی گرم و لایه‌های پرانرژی)

// نوع فونت‌های رسمی، معتبر و پرمخاطب مناسب نرم‌افزارهای تجاری و حسابداری
export type AppFontFamily = 
  | 'vazirmatn'   // وزیرمتن (پیش‌فرض استاندارد، مدرن و خوانا)
  | 'shabnam'     // شبنم (فوق‌العاده محبوب، نرم و چشم‌نواز)
  | 'sahel'       // ساحل (رسمی، فاخر و باوقار اداری)
  | 'samim'       // صمیم (هندسی، تمیز و مدرن با خوانایی عالی اعداد)
  | 'parastoo'    // پرستو (کلاسیک، رسمی، اسنادی و سناتوری)
  | 'dana'        // دانا / وب‌سنس مدرن (پرمخاطب فین‌تک، استارتاپ و سامانه‌های بانکی)
  | 'cairo'       // کایرو اداری و شرکتی (هندسی، شارپ و تکنولوژیک)
  | 'tahoma';     // تاهوما (کلاسیک و نوستالژیک حسابداری ویندوز)

export type AppNumberFormat = 'persian' | 'latin';

// برای حفظ سازگاری backward compatibility با داده‌های ذخیره‌شده
export type AppNumberFontFamily = string;
export type AppHeaderFontFamily = string;

// مقیاس سایزبندی دقیق و مهندسی‌شده برنامه
export type AppFontSizeScale = 
  | 'compact'      // فشرده حسابداری (۸۸٪ - تراکم بالای اطلاعات)
  | 'standard'     // استاندارد رسمی (۱۰۰٪ - متعادل و ارگونومیک)
  | 'comfortable'  // راحت و خوانا (۱۱۲٪ - کاهش خستگی چشم)
  | 'large'        // درشت و باز (۱۲۵٪ - مانیتورهای بزرگ)
  | 'extra-large'; // خیلی درشت (۱۴۰٪ - حداکثر وضوح)

// مقیاس و تراکم فونت فاکتور
export type AppInvoiceFontSizeScale =
  | 'ultra-compact' // فوق متراکم (۸۵٪ - چاپ فاکتورهای طولانی در یک برگ)
  | 'compact'       // متراکم و اقتصادی (۹۲٪)
  | 'standard'      // استاندارد فاکتور (۱۰۰٪)
  | 'large';        // درشت و برجسته (۱۱۰٪)

export interface StoreSettings {
  brandName: string;
  storeNameFa?: string;
  subtitle: string;
  bismillah: string;
  phone: string;
  address: string;
  bankName: string;
  accountNumber: string;
  cardNumber: string;
  iban: string;
  bankAccounts?: { id: string; bankName: string; accountNumber: string; cardNumber: string; iban: string; isDefault?: boolean; holderName?: string; }[];
  minOrderNotice: string;
  sellerStampName: string;
  themeColor: ThemeColor;
  designMode?: AppDesignMode; // سبک طراحی و معماری بصری برنامه (۸ حالت حرفه‌ای)
  fontFamily?: AppFontFamily; // فونت رسمی متن برنامه و فاکتور
  numberFormat?: AppNumberFormat; // نمایش ارقام فارسی یا لاتین
  numberFontFamily?: AppNumberFontFamily; // فونت اختصاصی ارقام، مبالغ و جداول (اختیاری جهت سازگاری)
  headerFontFamily?: AppHeaderFontFamily; // فونت تیتر و عناوین فاکتور (اختیاری جهت سازگاری)
  fontSizeScale?: AppFontSizeScale; // سایز فونت کل برنامه
  customFontScalePercent?: number; // درصد سفارشی مقیاس فونت برنامه (مثلا ۱۰۰)
  invoiceFontSizeScale?: AppInvoiceFontSizeScale; // سایز و تراکم فونت فاکتور
  enableWatermark: boolean;
  watermarkText: string;
  showSignatureArea: boolean;
  showStamp?: boolean;
  stampText?: string;
  stampColor?: 'blue' | 'red' | 'emerald' | 'amber';
  stampShape?: 'circle' | 'oval' | 'rect';
  watermarkOpacity?: number;
  watermarkFontSize?: number;
  adminPin?: string; // رمز عبور مدیریت / پین لاگین
  enableBiometrics?: boolean; // فعال بودن حسگر اثر انگشت
  requireAuthForInvoiceActions?: boolean; // نیاز به احراز هویت برای ویرایش و حذف
  requirePinForEdit?: boolean; // درخواست پین امنیتی برای ویرایش
  requirePinForDelete?: boolean; // درخواست پین امنیتی برای حذف
  hideConfidentialPrices?: boolean; // مدیریت و پنهان‌سازی قیمت محرمانه (قیمت خرید/ سود)
  enableAutoBackup?: boolean; // فعال بودن پشتیبان‌گیری خودکار دیتابیس
  autoBackupIntervalHours?: number; // فاصله پشتیبان‌گیری خودکار (بر حسب ساعت - ۲۴، ۱۲، ۶)
  backupRetentionCount?: number; // تعداد نسخه‌های پشتیبان نگهداری شده (مثلاً ۵ نسخه، ۳ نسخه)
  lastAutoBackupTimestamp?: number; // تاریخ و زمان آخرین پشتیبان‌گیری
  lastBackupDateFormatted?: string; // متن تاریخ و زمان آخرین پشتیبان‌گیری
  appLogo?: string; // آیکون یا لوگوی سفارشی بارگذاری شده کاربر (Base64)
}

export interface ActivityLog {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  timestamp: number;
  type: 'invoice' | 'product' | 'customer' | 'payment' | 'system' | 'warning' | 'export' | 'backup' | 'auth' | 'theme' | 'return';
  tabTarget?: 'dashboard' | 'invoices' | 'new-invoice' | 'inventory' | 'customers' | 'profit-loss' | 'activity-logs' | 'backup' | 'view-invoice' | 'business-settings' | 'system-settings' | 'returns' | 'liquidity';
}

export interface ProductReturn {
  id: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  invoiceId?: string; // شناسه فاکتوری که مرجوعی از آن انجام شده
  invoiceNumber?: string; // شماره فاکتوری که مرجوعی از آن انجام شده
  type: 'to_supplier' | 'from_customer'; // برگشت به شرکت (مرجوع به شرکت) یا برگشت از فروش (مرجوع از مشتری)
  cartonsCount: number;
  extraPieces: number;
  totalPieces: number;
  unitPrice: number;
  totalAmount: number; // مبلغ ناخالص مرجوعی کالا
  extraCosts?: number; // هزینه اضافی / باربری / خسارت کسر شده از مرجوعی (تومان)
  extraCostsReason?: string; // بابت / علت هزینه اضافی مرجوعی
  netAmount?: number; // مبلغ خالص مرجوعی قابل تسویه = totalAmount - extraCosts
  date: string;
  time: string;
  reason: string;
  notes?: string;
  createdAt: number;
  isRefunded?: boolean;
  refundMethod?: 'cash' | 'bank' | 'account' | 'invoice_offset';
  settlementInvoiceId?: string; // شناسه فاکتوری که این مرجوعی با آن تهاتر و تسویه شد
  settlementInvoiceNumber?: string; // شماره فاکتوری که این مرجوعی با آن تهاتر شد (دریافت جنس)
  settlementDate?: string; // تاریخ تسویه تهاتری
}

export interface TreasuryTransaction {
  id: string;
  type: 'expense' | 'transfer' | 'deposit';
  source: 'cash' | 'bank' | 'personal';
  destination?: 'bank' | 'cash';
  amount: number;
  date: string;
  time: string;
  description: string;
  category: string;
  referenceCode?: string;
  receiptNumber?: string;
  impactOnLiquidity?: 'none' | 'inject' | 'deduct';
  createdAt: number;
}

