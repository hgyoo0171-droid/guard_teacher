import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className="flex flex-col w-full gap-1.5 font-sans">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-4 py-3 rounded-xl border bg-white/50 backdrop-blur-sm transition-all duration-200 outline-none
            text-slate-800 dark:text-slate-100 placeholder-slate-400
            border-slate-200 dark:border-slate-700
            focus:border-brand-azure focus:ring-2 focus:ring-brand-azure/20
            disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-medium text-red-500 transition-opacity duration-200">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
