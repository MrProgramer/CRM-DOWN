import React, { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { formatPrice, toPersianDigits } from '../utils/formatters';

interface PricePeekButtonProps {
  purchasePrice?: number; // قیمت خرید واحد یا جمع
  sellingPrice?: number; // قیمت فروش برای محاسبه سود
  quantity?: number; // تعداد برای محاسبه کل
  isSecretMode: boolean; // آیا حالت محرمانه فعال است
  size?: 'sm' | 'md' | 'xs';
  label?: string; // برچسب اختصاصی
  title?: string;
  onToggle?: () => void;
  profit?: number;
  marginPercent?: number;
  className?: string;
}

export const PricePeekButton: React.FC<PricePeekButtonProps> = ({
  purchasePrice = 0,
  sellingPrice,
  quantity = 1,
  isSecretMode,
  size = 'xs',
  label,
  title,
  onToggle,
  profit: customProfit,
  marginPercent: customMargin,
  className = '',
}) => {
  const [isPeeking, setIsPeeking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleStartPeek = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setIsPeeking(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    // Auto-hide after 3 seconds as a safety fallback for touch devices
    timerRef.current = setTimeout(() => {
      setIsPeeking(false);
    }, 3000);
  };

  const handleEndPeek = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setIsPeeking(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const totalCost = purchasePrice * quantity;
  const totalRevenue = (sellingPrice || 0) * quantity;
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // If secret mode is off, it's always revealed
  if (!isSecretMode) {
    return null;
  }

  return (
    <div className={`relative inline-flex items-center no-print ${className}`}>
      <button
        type="button"
        onMouseDown={handleStartPeek}
        onMouseUp={handleEndPeek}
        onMouseLeave={handleEndPeek}
        onTouchStart={handleStartPeek}
        onTouchEnd={handleEndPeek}
        onTouchCancel={handleEndPeek}
        onClick={(e) => {
          e.stopPropagation();
          // Toggle temporary peek with 2.5s timer
          if (isPeeking) {
            handleEndPeek(e);
          } else {
            handleStartPeek(e);
          }
        }}
        title="نگه دارید یا کلیک کنید: مشاهده لحظه‌ای قیمت خرید (با رها کردن مخفی می‌شود)"
        className={`select-none flex items-center gap-1.5 rounded-lg font-bold transition-all cursor-pointer ${
          isPeeking
            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 scale-105 shadow-sm'
            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-700'
        } ${
          size === 'xs'
            ? 'px-2 py-0.5 text-xs'
            : size === 'sm'
            ? 'px-2.5 py-1 text-xs'
            : 'px-3 py-1.5 text-xs'
        }`}
      >
        {isPeeking ? (
          <>
            <Unlock className="w-3.5 h-3.5 shrink-0" />
            <span className="font-black text-xs">خرید: {formatPrice(totalCost)}</span>
          </>
        ) : (
          <>
            <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs">{label || 'خرید؟'}</span>
          </>
        )}
      </button>

      {/* Floating Peek Popover Tooltip when holding */}
      {isPeeking && (
        <div 
          className="absolute z-50 bottom-full mb-2 right-0 whitespace-nowrap bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl p-3 shadow-xl border border-slate-200/90 dark:border-slate-700 text-xs animate-in fade-in zoom-in-95 pointer-events-none select-none"
          style={{ minWidth: '200px' }}
        >
          <div className="space-y-1.5 text-right font-semibold">
            <div className="flex items-center justify-between font-black border-b border-slate-100 dark:border-slate-800 pb-1.5 text-slate-900 dark:text-white">
              <span>خرید واحد هر عدد:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{formatPrice(purchasePrice)}</span>
            </div>
            {sellingPrice !== undefined && sellingPrice > 0 && (
              <>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold text-xs">
                  <span>سود در فروش هر عدد:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{formatPrice(sellingPrice - purchasePrice)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold text-xs">
                  <span>درصد سود تک فروشی:</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{toPersianDigits(margin.toFixed(1))}٪</span>
                </div>
              </>
            )}
            {quantity > 1 && (
              <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>خرید کل این ردیف ({toPersianDigits(quantity)} عدد):</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{formatPrice(totalCost)}</span>
                </div>
                {sellingPrice !== undefined && sellingPrice > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>سود کل این ردیف:</span>
                    <span className="font-bold font-mono">{formatPrice(profit)}</span>
                  </div>
                )}
              </div>
            )}
            <div className="text-[10px] text-slate-400 text-center pt-1 border-t border-slate-100 dark:border-slate-800">
              🔒 با رها کردن مخفی می‌شود
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
