import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  ChevronsRight, 
  ChevronsLeft,
  ArrowLeft
} from 'lucide-react';
import { toPersianDigits } from '../utils/formatters';
import { themes, ThemeColor } from './ThemeConfig';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  itemName?: string;
  themeColor?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
  itemName = 'مورد',
  themeColor = 'teal',
  className = '',
}) => {
  const [jumpPage, setJumpPage] = useState('');
  const theme = themes[(themeColor as ThemeColor)] || themes.teal;

  if (totalItems === 0) return null;

  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 1; // Number of pages before and after current

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > delta + 2) {
        pages.push('ellipsis-start');
      }

      const start = Math.max(2, currentPage - delta);
      const end = Math.min(totalPages - 1, currentPage + delta);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - (delta + 1)) {
        pages.push('ellipsis-end');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageChange = (page: number) => {
    onPageChange(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      handlePageChange(pageNum);
      setJumpPage('');
    }
  };

  return (
    <div 
      className={`flex flex-col lg:flex-row items-center justify-between gap-3.5 p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-950/70 border-t border-slate-200/80 dark:border-slate-800 text-xs transition-colors dir-rtl select-none ${className}`}
    >
      {/* Items range info and page size selector */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 w-full lg:w-auto">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-bold">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>
            نمایش <span className="font-black text-slate-900 dark:text-white">{toPersianDigits(startItem)}</span> تا{' '}
            <span className="font-black text-slate-900 dark:text-white">{toPersianDigits(endItem)}</span> از{' '}
            <span className="font-black text-slate-900 dark:text-white">{toPersianDigits(totalItems)}</span> {itemName}
          </span>
        </div>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">نمایش در صفحه:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                onItemsPerPageChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-transparent text-slate-800 dark:text-slate-200 font-black text-xs focus:outline-none cursor-pointer"
            >
              {itemsPerPageOptions.map((opt, optIdx) => (
                <option key={`page-opt-${opt}-${optIdx}`} value={opt} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {toPersianDigits(opt)} {itemName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons & Page Numbers */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 w-full lg:w-auto">
        {/* First Page (ChevronsRight in RTL) */}
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          title="صفحه اول"
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>

        {/* Previous Page (ChevronRight in RTL) */}
        <button
          type="button"
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          title="صفحه قبلی"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 font-bold transition-all cursor-pointer shadow-2xs"
        >
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">قبلی</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-7 h-7 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-xs"
                >
                  •••
                </span>
              );
            }

            const isActive = currentPage === p;
            return (
              <button
                key={`page-${p}-${idx}`}
                type="button"
                onClick={() => handlePageChange(p)}
                className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                  isActive
                    ? `${theme.primary} text-white font-black scale-105 shadow-sm border border-transparent dark:border-transparent`
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {toPersianDigits(p)}
              </button>
            );
          })}
        </div>

        {/* Next Page (ChevronLeft in RTL) */}
        <button
          type="button"
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          title="صفحه بعدی"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 font-bold transition-all cursor-pointer shadow-2xs"
        >
          <span className="hidden sm:inline text-xs">بعدی</span>
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Last Page (ChevronsLeft in RTL) */}
        <button
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          title="صفحه آخر"
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Quick Jump (if more than 4 pages) */}
        {totalPages > 4 && (
          <form onSubmit={handleJumpSubmit} className="hidden xl:flex items-center gap-1 mr-1">
            <span className="text-slate-400 text-[11px] font-medium">پرش:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              placeholder={toPersianDigits(currentPage)}
              className="w-11 py-1 px-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-center text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={!jumpPage}
              className="p-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="انتقال به صفحه"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
