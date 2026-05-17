import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = "", onClick, hoverable = true }) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-6 transition-all duration-300 border border-slate-100 dark:border-slate-700/50
        bg-white dark:bg-slate-800/80 shadow-md
        ${hoverable ? 'hover:shadow-lg hover:border-slate-200/80 dark:hover:border-slate-600/80 hover:scale-[1.01]' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}`}
    >
      {children}
    </div>
  );
};
