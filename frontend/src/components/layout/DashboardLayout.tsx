'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activePath: string;
  setActivePath: (path: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activePath, setActivePath }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getActiveTitle = () => {
    switch (activePath) {
      case 'dashboard':
        return 'TeachGuard AI 대시보드';
      case 'incident-input':
        return '교권 침해 기록지 작성';
      case 'case-matcher':
        return '유사 판례 / 사례 매칭';
      case 'ai-consultation':
        return 'AI 안심 상담소';
      case 'guidelines':
        return '공공 가이드라인 및 법령 뷰어';
      case 'settings':
        return '계정 설정';
      default:
        return '대시보드';
    }
  };

  return (
    <div className="min-h-screen bg-brand-grey/40 dark:bg-slate-950 transition-colors duration-200">
      
      {/* 1. 좌측 사이드바 */}
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        activePath={activePath} 
        setActivePath={setActivePath} 
      />

      {/* 2. 우측 랩퍼 (데스크톱 기준 사이드바 마진 72px * 4 = 288px 확보) */}
      <div className="flex flex-col lg:pl-72 transition-all duration-300">
        
        {/* 상단 헤더 */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          activeTitle={getActiveTitle()} 
        />

        {/* 3. 실제 메인 영역 */}
        <main className="flex-1 p-6 md:p-8 animate-smooth-height">
          {children}
        </main>

      </div>

    </div>
  );
};
