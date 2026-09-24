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
    align === 'left' ? 'justify-start text-left' :
    'justify-start text-right';

  return (
    <th
      scope="col"
      aria-sort={getAriaSort()}
      title={title || defaultTitle}
      onClick={() => onSort(field)}
      className={`p-3.5 select-none cursor-pointer group transition-all duration-150 ${
        isActive 
          ? 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-900 dark:text-white font-black' 
          : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
      } ${className}`}
    >
      <div className={`flex items-center gap-1.5 ${alignClass}`}>
        <span className="truncate">{children}</span>
        
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md transition-all shrink-0 ${
          isActive 
            ? 'bg-slate-200/80 dark:bg-slate-700/80 text-teal-600 dark:text-teal-400 shadow-2xs' 
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
