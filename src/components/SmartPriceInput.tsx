import React, { useState, useEffect, useRef } from 'react';
import { 
  toPersianDigits, 
  toEnglishDigits, 
  numberToPersianWords, 
  formatAmountScale, 
  formatAmountBreakdown,
  parseSmartAmount 
} from '../utils/formatters';
import { themes, ThemeColor } from './ThemeConfig';

interface SmartPriceInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  themeColor?: string;
  unitLabel?: string;
  showWords?: boolean;
  showScale?: boolean;
  showShortcuts?: boolean;
  min?: number;
  max?: number;
}

export const SmartPriceInput: React.FC<SmartPriceInputProps> = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  id,
  disabled = false,
  autoFocus = false,
  themeColor = 'teal',
  unitLabel = 'تومان',
  showWords = true,
  showScale = true,
  min = 0,
  max,
}) => {
  const theme = themes[(themeColor as ThemeColor)] || themes.teal;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Format integer to 3-digit comma separated string
  const formatValue = (num: number): string => {
    if (!num || num === 0) return '';
    return toPersianDigits(num.toLocaleString('en-US'));
  };

  const [displayValue, setDisplayValue] = useState<string>(formatValue(value));

  // Sync internal display when parent value changes
  useEffect(() => {
    setDisplayValue(formatValue(value));
  }, [value]);

  // Handle user typing
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Replace slash or comma used as decimal with dot
    let englishStr = toEnglishDigits(raw).replace(/[\/،]/g, '.');

    // If empty
    if (!englishStr.trim()) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Check for smart suffixes while typing (m, b, k, میلیون, میلیارد, هزار)
    if (/[mbkمبهـ]/i.test(englishStr) || englishStr.includes('میلیون') || englishStr.includes('میلیارد') || englishStr.includes('هزار')) {
      const parsedSmart = parseSmartAmount(englishStr);
      if (parsedSmart > 0) {
        let finalVal = Math.max(min, parsedSmart);
        if (max !== undefined) finalVal = Math.min(max, finalVal);
        setDisplayValue(toPersianDigits(englishStr));
        onChange(finalVal);
        return;
      }
    }

    // Handle decimal dot typing: e.g. "5.8" -> 5,800 or "0.5" -> 500
    if (englishStr.includes('.')) {
      const cleanDecimal = englishStr.replace(/[^\d.]/g, '');
      setDisplayValue(toPersianDigits(cleanDecimal));
      const parts = cleanDecimal.split('.');
      if (parts.length === 2 && parts[1].length > 0) {
        const floatVal = parseFloat(cleanDecimal);
        if (!isNaN(floatVal)) {
          if (floatVal > 0 && floatVal < 1000) {
            // E.g. 5.8 => 5800, 5.85 => 5850
            const calculated = Math.round(floatVal * 1000);
            onChange(calculated);
          } else {
            onChange(Math.round(floatVal));
          }
        }
      }
      return;
    }

    // Standard numbers: strip non-digits
    const cleanStr = englishStr.replace(/[^\d]/g, '');
    if (cleanStr === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    const numVal = parseInt(cleanStr, 10);
    if (!isNaN(numVal)) {
      let finalVal = Math.max(min, numVal);
      if (max !== undefined) finalVal = Math.min(max, finalVal);
      setDisplayValue(toPersianDigits(finalVal.toLocaleString('en-US')));
      onChange(finalVal);
    }
  };

  // On blur, format clearly with 3-digit commas
  const handleBlur = () => {
    setIsFocused(false);
    const raw = displayValue.replace(/[\/،]/g, '.');
    const englishStr = toEnglishDigits(raw).replace(/,/g, '');
    if (!englishStr) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // If user entered a decimal shorthand on blur e.g. "5.8"
    if (englishStr.includes('.')) {
      const floatVal = parseFloat(englishStr);
      if (!isNaN(floatVal)) {
        const calculated = floatVal > 0 && floatVal < 1000 ? Math.round(floatVal * 1000) : Math.round(floatVal);
        let finalVal = Math.max(min, calculated);
        if (max !== undefined) finalVal = Math.min(max, finalVal);
        onChange(finalVal);
        setDisplayValue(formatValue(finalVal));
        return;
      }
    }

    const parsed = parseSmartAmount(englishStr);
    let finalVal = Math.max(min, parsed);
    if (max !== undefined) finalVal = Math.min(max, finalVal);
    
    onChange(finalVal);
    setDisplayValue(formatValue(finalVal));
  };

  const scaleText = value > 0 ? formatAmountScale(value) : '';
  const breakdownText = value > 0 ? formatAmountBreakdown(value) : '';
  const persianWords = value > 0 ? numberToPersianWords(value) : '';

  return (
    <div className="space-y-1 w-full min-w-0">
      {/* Clean Input container */}
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder || '۰'}
          dir="ltr"
          className={`w-full pl-3 pr-11 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black text-sm text-left focus:outline-none focus:ring-2 ${theme.ring} shadow-2xs transition-all ${className}`}
        />

        {/* Unit Label on right */}
        {unitLabel && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 dark:text-slate-500 pointer-events-none select-none">
            {unitLabel}
          </span>
        )}
      </div>

      {/* Live Numeric & Persian words displayed cleanly under the input */}
      {value > 0 && (showScale || showWords) && (
        <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200/70 dark:border-slate-800/70 text-xs space-y-0.5 min-w-0">
          {/* Numeric Scale */}
          {showScale && (
            <div className="flex items-center justify-between gap-1 font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
              <span>{toPersianDigits(value.toLocaleString())} تومان</span>
              {scaleText && (
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-sans font-bold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                  {scaleText}
                </span>
              )}
            </div>
          )}

          {/* Persian Words */}
          {showWords && persianWords && (
            <div className="text-[10.5px] leading-tight text-slate-600 dark:text-slate-400 font-medium truncate pt-0.5" title={persianWords}>
              به حروف: <span className={`font-bold ${theme.primaryText}`}>{persianWords} تومان</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
