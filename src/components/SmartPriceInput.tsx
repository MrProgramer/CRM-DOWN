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
import { Sparkles, ChevronUp, ChevronDown, Plus, Minus, Wand2 } from 'lucide-react';

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
  showShortcuts = true,
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

  // Adjust amount by delta (e.g. +1000, -1000)
  const adjustValue = (delta: number) => {
    if (disabled) return;
    const current = value || 0;
    let nextVal = current + delta;
    if (nextVal < min) nextVal = min;
    if (max !== undefined && nextVal > max) nextVal = max;
    onChange(nextVal);
    setDisplayValue(formatValue(nextVal));
  };

  // Keyboard navigation for step changes (ArrowUp / ArrowDown)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    const step = e.shiftKey ? 10000 : 1000;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      adjustValue(step);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      adjustValue(-step);
    }
  };

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

    // If user entered a small single or double digit (e.g. 5 or 8 or 12) without thousands
    const numVal = parseInt(englishStr, 10);
    if (!isNaN(numVal) && numVal > 0 && numVal <= 50) {
      // Keep as parsed or handled
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

  // Generate smart assistant suggestions
  const getSmartSuggestions = (): { label: string; val: number }[] => {
    const suggestions: { label: string; val: number }[] = [];
    if (!value || value === 0) {
      // Suggest starter prices
      return [
        { label: '۵,۰۰۰', val: 5000 },
        { label: '۵,۸۰۰', val: 5800 },
        { label: '۸,۰۰۰', val: 8000 },
        { label: '۱۰,۰۰۰', val: 10000 },
        { label: '۱۵,۰۰۰', val: 15000 },
      ];
    }

    // If small value (e.g., 8 was entered directly)
    if (value > 0 && value <= 50) {
      suggestions.push({ label: `${toPersianDigits(value * 1000)} (هزار)`, val: value * 1000 });
      suggestions.push({ label: '۱۰,۰۰۰', val: 10000 });
      suggestions.push({ label: '۵,۸۰۰', val: 5800 });
      return suggestions;
    }

    // Quick jumps
    if (value === 3800) {
      suggestions.push({ label: '۵,۸۰۰ ت', val: 5800 });
    }

    // Round up to nearest 1,000 if has extra
    if (value % 1000 !== 0) {
      const nextThousand = Math.ceil(value / 1000) * 1000;
      suggestions.push({ label: `گرد کردن (${toPersianDigits(nextThousand.toLocaleString())})`, val: nextThousand });
    }

    // Round up to nearest 5,000 / 10,000
    const nextFiveThousand = Math.ceil((value + 1) / 5000) * 5000;
    if (nextFiveThousand !== value) {
      suggestions.push({ label: `${toPersianDigits(nextFiveThousand.toLocaleString())} ت`, val: nextFiveThousand });
    }

    return suggestions.slice(0, 3);
  };

  const smartSuggestions = getSmartSuggestions();

  return (
    <div className="space-y-1.5 w-full">
      {/* Input container with integrated steppers */}
      <div className="relative flex items-center group">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          disabled={disabled}
          autoFocus={autoFocus}
          dir="ltr"
          className={`w-full pl-16 pr-14 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black text-sm text-left focus:outline-none focus:ring-2 ${theme.ring} shadow-2xs transition-all ${className}`}
        />

        {/* Stepper buttons (+1,000 / -1,000) */}
        {!disabled && (
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => adjustValue(-1000)}
              title="کاهش ۱٬۰۰۰ تومان (کلید فلش پایین)"
              className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Minus className="w-3 h-3 stroke-[2.5]" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => adjustValue(1000)}
              title="افزایش ۱٬۰۰۰ تومان (کلید فلش بالا)"
              className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Unit Label */}
        {unitLabel && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-slate-500 pointer-events-none">
            {unitLabel}
          </span>
        )}
      </div>

      {/* Smart Quick Steppers & Suggestions Bar */}
      {showShortcuts && !disabled && (
        <div className="flex items-center justify-between gap-1 flex-wrap text-[11px]">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => adjustValue(1000)}
              className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              +۱,۰۰۰
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => adjustValue(5000)}
              className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              +۵,۰۰۰
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => adjustValue(10000)}
              className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-400 font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              +۱۰,۰۰۰
            </button>
          </div>

          {/* Contextual intelligent suggestions */}
          {smartSuggestions.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <Wand2 className="w-2.5 h-2.5 text-amber-500" />
                <span>پیشنهاد:</span>
              </span>
              {smartSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  tabIndex={-1}
                  onClick={() => {
                    onChange(sug.val);
                    setDisplayValue(formatValue(sug.val));
                  }}
                  className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-black border border-amber-200 dark:border-amber-800/60 transition-colors cursor-pointer"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live Scale calculation & Persian words bar */}
      {value > 0 && (showScale || showWords) && (
        <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1 text-xs">
          {/* 1. Scale Calculation (هزار / میلیون / میلیارد) */}
          {showScale && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>مقیاس:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-black text-xs border border-amber-500/20">
                  {scaleText}
                </span>
                {breakdownText && breakdownText !== scaleText && (
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    ({breakdownText})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 2. Full Persian words */}
          {showWords && (
            <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">به حروف:</span>
              <span className={`font-extrabold ${theme.primaryText} text-left text-[11px] leading-relaxed`}>
                {persianWords}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
