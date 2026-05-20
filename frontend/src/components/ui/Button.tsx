import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyle = "flex items-center justify-center px-6 py-3 rounded-full font-bold text-sm tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-brand-indigo hover:bg-brand-indigo-dark text-white shadow-lg shadow-brand-indigo/25 focus:ring-brand-indigo",
    secondary: "bg-brand-azure hover:bg-brand-azure-dark text-white shadow-lg shadow-brand-azure/20 focus:ring-brand-azure",
    outline: "border-2 border-brand-indigo text-brand-indigo hover:bg-brand-indigo hover:text-white dark:border-brand-indigo-light dark:text-brand-indigo-light focus:ring-brand-indigo",
    destructive: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 focus:ring-red-600"
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" className="mr-2 border-current" />}
      <span className="font-sans">{children}</span>
    </button>
  );
};
