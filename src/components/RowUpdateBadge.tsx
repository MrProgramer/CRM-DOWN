import React from 'react';
import { Check } from 'lucide-react';

interface RowUpdateBadgeProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const RowUpdateBadge: React.FC<RowUpdateBadgeProps> = ({
  label = 'تغییرات ذخیره شد',
  className = '',
  size = 'sm'
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black shadow-md badge-updated-pop border border-emerald-400/50 whitespace-nowrap select-none ${
        size === 'sm' ? 'text-[10px] sm:text-[11px]' : 'text-xs'
      } ${className}`}
      title={label}
    >
      <span className="relative flex items-center justify-center w-3.5 h-3.5 rounded-full bg-white text-emerald-700 shrink-0">
        <Check className="w-2.5 h-2.5 stroke-[3.5] animate-draw-check" />
      </span>
      <span className="tracking-tight">{label}</span>
    </span>
  );
};

export const RowUpdateIcon: React.FC<{ className?: string; title?: string }> = ({
  className = '',
  title = 'تغییرات ذخیره شد'
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white shadow-md badge-updated-pop border border-white/40 shrink-0 ${className}`}
      title={title}
    >
      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
      <Check className="w-3.5 h-3.5 stroke-[3.5] relative z-10" />
    </div>
  );
};
