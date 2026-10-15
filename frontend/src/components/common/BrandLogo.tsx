import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  variant?: 'default' | 'dark' | 'compact' | 'iconOnly';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTagline?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'default',
  size = 'md',
  className,
  showTagline = false,
}) => {
  const isDark = variant === 'dark';
  const isIconOnly = variant === 'iconOnly';

  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={cn('flex items-center gap-2.5 select-none shrink-0 group', className)}>
      {/* ── Official SOLVO App Emblem ── */}
      <div
        className={cn(
          'relative rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-md shadow-blue-500/20 overflow-hidden bg-slate-900 border border-slate-700/50',
          iconSizes[size]
        )}
      >
        <img
          src="/solvo-logo.jpg"
          alt="SOLVO"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      {/* ── Brand Name Typography ── */}
      {!isIconOnly && (
        <div className="flex flex-col leading-tight">
          <div className={cn('font-black tracking-tight flex items-baseline', textSizes[size])}>
            <span className={isDark ? 'text-white' : 'text-slate-900'}>SOL</span>
            <span className="text-blue-500 drop-shadow-xs">VO</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 ml-1 mb-0.5 animate-pulse" />
          </div>

          {showTagline && (
            <span
              className={cn(
                'text-[9px] font-extrabold uppercase tracking-widest',
                isDark ? 'text-slate-400' : 'text-slate-500'
              )}
            >
              Instant Home Services & Repairs
            </span>
          )}
        </div>
      )}
    </div>
  );
};
