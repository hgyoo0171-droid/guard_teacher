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
        return '홈 (종합 대시보드)';
      case 'incident-log':
        return '📁 나의 사건 수첩';
      case 'ai-consultation':
        return '💬 AI 안심 상담소';
      case 'settings':
        return '⚙️ 설정 및 매뉴얼';
      case 'trend':
        return '📊 예방 및 트렌드 분석 리포트';
      default:
        return '홈 (종합 대시보드)';
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
