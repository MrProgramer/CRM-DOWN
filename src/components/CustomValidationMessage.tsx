import React from 'react';
import { AlertCircle } from 'lucide-react';

interface CustomValidationMessageProps {
  message?: string;
  className?: string;
}

export const CustomValidationMessage: React.FC<CustomValidationMessageProps> = ({
  message = 'تکمیل این فیلد الزامی است',
  className = '',
}) => {
  if (!message) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200/90 dark:border-rose-800 text-[11px] font-extrabold shadow-2xs animate-fadeIn ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
