import { toPng, toJpeg, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

let cachedFontEmbedCSS: string | null = null;
let isFetchingFonts = false;

// Pre-fetch and inline Vazirmatn & Lalezar fonts as base64 Data URLs so html-to-image embeds vector glyphs with zero CORS errors
export async function getFontEmbedCSS(): Promise<string> {
  if (cachedFontEmbedCSS !== null) {
    return cachedFontEmbedCSS;
  }

  if (isFetchingFonts) {
    // Wait briefly if already fetching
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (cachedFontEmbedCSS !== null) return cachedFontEmbedCSS;
    }
  }

  isFetchingFonts = true;

  try {
    const response = await fetch(
      'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&family=Lalezar&display=swap',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }
    );

    if (!response.ok) throw new Error(`Font CSS fetch status ${response.status}`);
    let cssText = await response.text();

    // Inline all font files as base64 Data URIs
    const fontUrlRegex = /url\((https:\/\/[^)]+)\)/g;
    const matches = Array.from(cssText.matchAll(fontUrlRegex));

    await Promise.all(
      matches.map(async (match) => {
        const fontUrl = match[1].replace(/['"]/g, '');
        try {
          const fontRes = await fetch(fontUrl);
          if (!fontRes.ok) return;
          const blob = await fontRes.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          cssText = cssText.replace(match[0], `url("${base64}")`);
        } catch (e) {
          console.warn('Could not inline font url:', fontUrl, e);
        }
      })
    );

    cachedFontEmbedCSS = cssText;
    isFetchingFonts = false;
    return cssText;
  } catch (err) {
    console.warn('Font embedding fallback engaged:', err);
    cachedFontEmbedCSS = '';
    isFetchingFonts = false;
    return '';
  }
}

// Start pre-fetching font CSS immediately in background
getFontEmbedCSS();

// Helper to normalize element dimensions for A4 paper rendering
function normalizeElementForCapture(element: HTMLElement): { restoreStyles: () => void; preparePromise: Promise<void> } {
  const originalWidth = element.style.width;
  const originalMinWidth = element.style.minWidth;
  const originalMaxWidth = element.style.maxWidth;
  const originalPadding = element.style.padding;
  const originalBg = element.style.backgroundColor;
  const originalColor = element.style.color;
  const originalFontFamily = element.style.fontFamily;
  const originalBoxSizing = element.style.boxSizing;
  const originalMinHeight = element.style.minHeight;

  // Force Light (Day) Mode during image/PDF capture
  const isDarkMode = document.documentElement.classList.contains('dark');
  if (isDarkMode) {
    document.documentElement.classList.remove('dark');
  }

  const isInvoicePaper = element.id === 'invoice-paper' || element.classList.contains('invoice-paper-container');

  const activeFontFamily = typeof window !== 'undefined'
    ? (getComputedStyle(document.documentElement).getPropertyValue('--app-font-family') || "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")
    : "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  if (isInvoicePaper) {
    // Standard Desktop A4 Paper Width (794px = 210mm at 96dpi)
    element.style.width = '794px';
    element.style.minWidth = '794px';
    element.style.maxWidth = '794px';
    element.style.minHeight = 'auto'; // Let it compress to actual contents to fit in a single page
    element.style.padding = '36px 44px';
    element.style.backgroundColor = '#ffffff';
    element.style.color = '#0f172a';
    element.style.boxSizing = 'border-box';
    element.style.fontFamily = activeFontFamily;
  } else {
    element.style.backgroundColor = '#ffffff';
    element.style.color = '#0f172a';
    element.style.fontFamily = activeFontFamily;
  }

  // Allow DOM to repaint in light mode
  const preparePromise = new Promise<void>((resolve) => setTimeout(resolve, 60));

  const restoreStyles = () => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
    element.style.width = originalWidth;
    element.style.minWidth = originalMinWidth;
    element.style.maxWidth = originalMaxWidth;
    element.style.padding = originalPadding;
    element.style.backgroundColor = originalBg;
    element.style.color = originalColor;
    element.style.fontFamily = originalFontFamily;
    element.style.boxSizing = originalBoxSizing;
    element.style.minHeight = originalMinHeight;
  };

  return { restoreStyles, preparePromise };
}

// Utility to render DOM elements or Invoice paper to standard PNG image download
export async function downloadInvoiceAsImage(
  elementId: string, 
  fileName: string,
  onError?: (msg: string) => void
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    if (onError) onError('المان مورد نظر جهت صدور تصویر یافت نشد.');
    console.warn('Target element not found:', elementId);
    return false;
  }

  const { restoreStyles, preparePromise } = normalizeElementForCapture(element);
  await preparePromise;

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const fontEmbedCSS = await getFontEmbedCSS();

    // Generate high-resolution PNG using html-to-image
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 3, // Ultra-sharp resolution
      cacheBust: true,
      backgroundColor: '#ffffff',
      fontEmbedCSS: fontEmbedCSS || undefined,
      preferredFontFormat: 'woff2',
      filter: (node: HTMLElement) => {
        if (node.classList && (
          node.classList.contains('no-print') || 
          node.classList.contains('hide-on-export') || 
          node.classList.contains('confidential-price-data') || 
          node.classList.contains('item-profit-badge')
        )) {
          return false;
        }
        return true;
      },
    });

    restoreStyles();

    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (e) {
    restoreStyles();
    console.error('Image export failed:', e);
    if (onError) onError('خطا در ایجاد تصویر. لطفاً از گزینه چاپ مستقیم یا ذخیره PDF استفاده فرمایید.');
    return false;
  }
}

// Utility to render DOM elements or Invoice paper directly to PDF download with exact A4 slicing
export async function downloadInvoiceAsPDF(
  elementId: string, 
  fileName: string,
  onError?: (msg: string) => void
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    if (onError) onError('المان مورد نظر جهت صدور فایل PDF یافت نشد.');
    console.warn('Target element for PDF not found:', elementId);
    return false;
  }

  const { restoreStyles, preparePromise } = normalizeElementForCapture(element);
  await preparePromise;

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const fontEmbedCSS = await getFontEmbedCSS();

    // Render DOM element to Canvas
    const canvas = await toCanvas(element, {
      pixelRatio: 2.5,
      cacheBust: true,
      backgroundColor: '#ffffff',
      fontEmbedCSS: fontEmbedCSS || undefined,
      preferredFontFormat: 'woff2',
      filter: (node: HTMLElement) => {
        if (node.classList && (
          node.classList.contains('no-print') || 
          node.classList.contains('hide-on-export') || 
          node.classList.contains('confidential-price-data') || 
          node.classList.contains('item-profit-badge')
        )) {
          return false;
        }
        return true;
      },
    });

    restoreStyles();

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Standard A4 dimensions in mm: 210 x 297
    const pdfWidth = 210;
    const pdfHeight = 297;
    // Calculate page height in canvas pixels based on A4 ratio (297 / 210 = 1.41428)
    const pagePixelHeight = Math.floor(canvas.width * (pdfHeight / pdfWidth));

    if (canvas.height <= pagePixelHeight) {
      // Single Page PDF
      const imgHeightMm = (canvas.height * pdfWidth) / canvas.width;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, imgHeightMm, undefined, 'FAST');
    } else {
      // Multi-Page PDF Canvas Slicing (No overlapping or layout cutting)
      const totalPages = Math.ceil(canvas.height / pagePixelHeight);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) pdf.addPage();

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = pagePixelHeight;
        const ctx = pageCanvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          const sliceHeight = Math.min(pagePixelHeight, canvas.height - i * pagePixelHeight);
          ctx.drawImage(
            canvas,
            0,
            i * pagePixelHeight,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
        }

        const pageDataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(pageDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
    }

    pdf.save(`${fileName}.pdf`);
    return true;
  } catch (e) {
    restoreStyles();
    console.error('PDF export failed:', e);
    // Fallback to window print if canvas export fails
    window.print();
    return true;
  }
}

// Utility to capture screenshot and copy image directly to clipboard for pasting in Telegram/WhatsApp (with text caption included)
export async function copyInvoiceImageToClipboard(
  elementId: string,
  onSuccess?: () => void,
  onError?: (msg: string) => void,
  textSummary?: string
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    if (onError) onError('المان مورد نظر جهت تهیه تصویر یافت نشد.');
    return false;
  }

  const { restoreStyles, preparePromise } = normalizeElementForCapture(element);
  await preparePromise;

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const fontEmbedCSS = await getFontEmbedCSS();

    // Render Canvas
    const canvas = await toCanvas(element, {
      pixelRatio: 2.5,
      cacheBust: true,
      backgroundColor: '#ffffff',
      fontEmbedCSS: fontEmbedCSS || undefined,
      preferredFontFormat: 'woff2',
      filter: (node: HTMLElement) => {
        if (node.classList && (
          node.classList.contains('no-print') || 
          node.classList.contains('hide-on-export') || 
          node.classList.contains('confidential-price-data') || 
          node.classList.contains('item-profit-badge')
        )) {
          return false;
        }
        return true;
      },
    });

    restoreStyles();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
    });

    if (!blob) {
      throw new Error('Canvas toBlob conversion failed');
    }

    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      let written = false;

      // First attempt: Multi-MIME write (Image + Plain Text caption for Telegram / WhatsApp)
      if (textSummary && textSummary.trim()) {
        try {
          const textBlob = new Blob([textSummary.trim()], { type: 'text/plain' });
          const item = new ClipboardItem({
            'image/png': blob,
            'text/plain': textBlob,
          });
          await navigator.clipboard.write([item]);
          written = true;
        } catch (multiErr) {
          console.warn('Multi-MIME clipboard write encountered browser limitation, falling back to image-only:', multiErr);
        }
      }

      // Fallback: Image-only clipboard item
      if (!written) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
      }

      if (onSuccess) onSuccess();
      return true;
    } else {
      throw new Error('مرورگر شما از کپی مستقیم تصویر در کلیپ‌بورد پشتیبانی نمی‌کند.');
    }
  } catch (err: any) {
    restoreStyles();
    console.error('Clipboard image copy failed:', err);
    if (onError) {
      onError(err?.message || 'خطا در کپی تصویر در حافظه. در حال دانلود فایل...');
    }
    // Fallback: download the image
    await downloadInvoiceAsImage(elementId, 'Factor-Screenshot');
    return false;
  }
}



