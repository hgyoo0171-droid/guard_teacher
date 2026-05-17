import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, rows = 4, ...props }, ref) => {
    const textareaId = id || React.useId();
    return (
      <div className="flex flex-col w-full gap-1.5 font-sans">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full px-4 py-3 rounded-xl border bg-white/50 backdrop-blur-sm transition-all duration-200 outline-none resize-y
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
Textarea.displayName = 'Textarea';
