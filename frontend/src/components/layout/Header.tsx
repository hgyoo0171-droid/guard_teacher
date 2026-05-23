'use client';

import React from 'react';
import { Typography } from '../ui/Typography';

interface HeaderProps {
  onMenuClick: () => void;
  activeTitle: string;
}

import { useAuth } from '@/context/AuthContext';

export const Header: React.FC<HeaderProps> = ({ onMenuClick, activeTitle }) => {
  const { user } = useAuth();
  
  // 이름 추출 로직 (표시 이름 또는 이메일 앞부분)
  const displayName = user?.displayName || user?.email?.split('@')[0] || '익명 교사';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between w-full h-20 px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
      
      {/* 좌측: 모바일 메뉴 및 타이틀 */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 lg:hidden focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Typography variant="h3" className="text-slate-800 dark:text-slate-100 text-lg md:text-xl font-bold font-serif">{activeTitle}</Typography>
      </div>

      {/* 우측: 알림 및 프로필 */}
      <div className="flex items-center gap-4 font-sans">
        
        {/* 알림 벨 버튼 */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200">
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute w-2 h-2 rounded-full bg-brand-azure top-2.5 right-2.5 animate-ping" />
        </button>

        <hr className="w-[1px] h-6 border-l border-slate-200 dark:border-slate-800" />

        {/* 선생님 간략 프로필 */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{displayName} 선생님</span>
            <span className="text-xs text-slate-400">대한민국 교원</span>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-indigo to-brand-azure text-white font-black text-sm shadow-md">
            {initial}
          </div>
        </div>

      </div>

    </header>
  );
};
