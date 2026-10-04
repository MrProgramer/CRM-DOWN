import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface SortableTableHeaderProps<T extends string> {
  field: T;
  currentField: T | null | undefined;
  currentDirection: 'asc' | 'desc';
  onSort: (field: T) => void;
  children: React.ReactNode;
  className?: string;
  align?: 'right' | 'center' | 'left';
  title?: string;
}

export function SortableTableHeader<T extends string>({
  field,
  currentField,
  currentDirection,
  onSort,
  children,
  className = '',
  align = 'right',
  title
}: SortableTableHeaderProps<T>) {
  const isActive = currentField === field;

  const getAriaSort = () => {
    if (!isActive) return 'none';
    return currentDirection === 'asc' ? 'ascending' : 'descending';
  };

  const defaultTitle = isActive
    ? currentDirection === 'desc'
      ? 'مرتب‌سازی فعلی: نزولی (کلیک برای صعودی)'
      : 'مرتب‌سازی فعلی: صعودی (کلیک برای نزولی)'
    : 'کلیک برای مرتب‌سازی این ستون';

  const alignClass = 
    align === 'center' ? 'justify-center text-center' :
    align === 'left' ? 'justify-end text-left flex-row-reverse' :
    'justify-start text-right flex-row';

  const thAlignClass =
    align === 'center' ? 'text-center' :
    align === 'left' ? 'text-left' :
    'text-right';

  return (
    <th
      scope="col"
      aria-sort={getAriaSort()}
      title={title || defaultTitle}
      onClick={() => onSort(field)}
      className={`p-3 sm:p-3.5 select-none cursor-pointer group transition-all duration-150 text-xs sm:text-[13px] ${thAlignClass} ${
        isActive 
          ? 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-900 dark:text-white font-black' 
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white font-bold'
      } ${className}`}
    >
      <div className={`flex items-center gap-1.5 ${alignClass}`}>
        <span className="truncate">{children}</span>
        
        <span className={`inline-flex items-center justify-center w-4.5 h-4.5 rounded-md transition-all shrink-0 ${
          isActive 
            ? 'bg-slate-200/90 dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black' 
            : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 opacity-60 group-hover:opacity-100'
        }`}>
          {isActive ? (
            currentDirection === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 stroke-[1.8]" />
          )}
        </span>
      </div>
    </th>
  );
}

