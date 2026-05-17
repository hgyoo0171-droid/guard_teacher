import React from 'react';

interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'lead' | 'detail';
  children: React.ReactNode;
  className?: string;
}

export const Typography: React.FC<TypographyProps> = ({ variant, children, className = "" }) => {
  const baseClass = "transition-colors duration-200";
  
  switch (variant) {
    case 'h1':
      return <h1 className={`text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-100 font-serif ${baseClass} ${className}`}>{children}</h1>;
    case 'h2':
      return <h2 className={`text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-serif ${baseClass} ${className}`}>{children}</h2>;
    case 'h3':
      return <h3 className={`text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-200 font-serif ${baseClass} ${className}`}>{children}</h3>;
    case 'h4':
      return <h4 className={`text-lg md:text-xl font-bold text-slate-800 dark:text-slate-200 font-serif ${baseClass} ${className}`}>{children}</h4>;
    case 'h5':
      return <h5 className={`text-md md:text-lg font-semibold text-slate-800 dark:text-slate-300 font-serif ${baseClass} ${className}`}>{children}</h5>;
    case 'h6':
      return <h6 className={`text-sm md:text-md font-semibold text-slate-700 dark:text-slate-300 font-serif ${baseClass} ${className}`}>{children}</h6>;
    case 'lead':
      return <p className={`text-lg text-slate-600 dark:text-slate-300 font-sans leading-relaxed ${baseClass} ${className}`}>{children}</p>;
    case 'detail':
      return <span className={`text-xs text-slate-400 dark:text-slate-500 font-sans ${baseClass} ${className}`}>{children}</span>;
    case 'p':
    default:
      return <p className={`text-base text-slate-600 dark:text-slate-300 font-sans leading-relaxed ${baseClass} ${className}`}>{children}</p>;
  }
};
