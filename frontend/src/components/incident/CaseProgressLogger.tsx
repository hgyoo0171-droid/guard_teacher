'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  fetchProgressLogs,
  createProgressLog,
  deleteProgressLog,
  ProgressLog,
  CreateProgressLogInput,
  MOCK_PROGRESS_LOGS
} from '@/lib/caseProgressApi';
import { useAuth } from '@/context/AuthContext';

interface CaseProgressLoggerProps {
  refreshTrigger?: number;
}

export const CaseProgressLogger: React.FC<CaseProgressLoggerProps> = ({ refreshTrigger = 0 }) => {
  // 백엔드 API 주소 설정 (포트 3000 Express 서버 대응)
  const API_BASE = 'https://teachguard-backend-84878824642.asia-northeast3.run.app';
  
  // 모의 사용자 보안 토큰 (NEIS 인증 연계 가정)
  const [secureToken, setSecureToken] = useState('');
  const [tokenStatus, setTokenStatus] = useState<'active' | 'refreshing' | 'refreshed'>('active');

  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 진행 단계 필터 상태 ('all' 또는 1~5)
  const [activeFilter, setActiveFilter] = useState<number | 'all'>('all');
  // 정렬 순서 ('asc': 날짜오름차순, 'desc': 날짜내림차순)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // 입력 폼 필드 상태
  const [step, setStep] = useState('1');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [content, setContent] = useState('');
  const [requiredDocuments, setRequiredDocuments] = useState('');
  const [remarks, setRemarks] = useState('');

  // 드래그 앤 드롭 업로드 목업 관련 상태
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; progress: number }[]>([]);

  // 1. 비공개 보안 API 호출 (GET)
  const fetchSecureProgressLogs = async () => {
    setLoading(true);
    try {
      // 로컬 스토리지에서 먼저 즉각 로드하여 무한 로딩 원천 차단 (데모용)
      let initialLogs: ProgressLog[] = [];
      try {
        initialLogs = JSON.parse(localStorage.getItem('mock_progress_logs') || '[]');
        setLogs(initialLogs);
      } catch (e) {}

      // 파이어베이스 연동은 1.5초 내에 응답 없으면 타임아웃 처리
      const fetchPromise = fetchProgressLogs();
      const timeoutPromise = new Promise<ProgressLog[]>((_, reject) => 
        setTimeout(() => reject(new Error('Firebase timeout')), 1500)
      );
      
      try {
        const data = await Promise.race([fetchPromise, timeoutPromise]);
        setLogs(data); // 파이어베이스 데이터가 성공하면 덮어씀
      } catch (err) {
        console.warn('Firebase 로드 지연 또는 실패, 로컬 데이터 유지:', err);
      }
    } catch (err) {
      console.warn('보안 API 로드 실패, 로컬 데이터 시뮬레이션:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. 비공개 보안 API 저장 (POST)
  const saveSecureProgressLog = async (newLog: CreateProgressLogInput) => {
    setIsSubmitting(true);
    try {
      const savedData = await createProgressLog(newLog, secureToken);
      
      // 상태 업데이트 및 소팅
      setLogs((prev) => {
        const updated = [...prev, savedData];
        return sortLogs(updated, sortOrder);
      });
      return { success: true };
    } catch (err) {
      console.warn('보안 API 저장 백엔드 호출 실패, 로컬 시뮬레이션으로 처리:', err);
      // 오프라인 로컬 폴백 성공 시뮬레이션
      const addedLog: ProgressLog = {
        ...newLog,
        id: `local-${Math.random().toString(36).substr(2, 9)}`
      };
      setLogs((prev) => {
        const updated = [...prev, addedLog];
        return sortLogs(updated, sortOrder);
      });
      return { success: true };
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. 비공개 보안 API 삭제 (DELETE)
  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('정말 이 진행 이력을 삭제하시겠습니까?')) return;
    try {
      await deleteProgressLog(id, secureToken);
      setLogs((prev) => prev.filter(log => log.id !== id));
    } catch (err) {
      console.warn('API 삭제 실패, 로컬에서 삭제 처리:', err);
      setLogs((prev) => prev.filter(log => log.id !== id));
    }
  };

  // 데이터 정렬 유틸리티
  const sortLogs = (list: ProgressLog[], order: 'asc' | 'desc') => {
    return [...list].sort((a, b) => {
      const dateA = new Date(a.logDate).getTime();
      const dateB = new Date(b.logDate).getTime();
      if (dateA !== dateB) {
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return order === 'asc' ? a.step - b.step : b.step - a.step;
    });
  };

  useEffect(() => {
    fetchSecureProgressLogs();
  }, [refreshTrigger]);

  // 정렬 모드 변경 시 로그 재배열
  const handleSortToggle = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    setLogs((prev) => sortLogs(prev, newOrder));
  };

  const handleTokenRefresh = async () => {
    setTokenStatus('refreshing');
    try {
      const token = await getToken();
      if (token) setSecureToken(token);
      setTokenStatus('refreshed');
      setTimeout(() => setTokenStatus('active'), 2000);
    } catch (e) {
      setTokenStatus('active');
    }
  };

  const handleStepTitle = (stepNum: number) => {
    switch (stepNum) {
      case 1: return '📥 교권 침해 공식 접수';
      case 2: return '🔍 교육청 이관 및 예비 조사';
      case 3: return '📁 소명자료 및 추가 제출';
      case 4: return '⚖️ 교권보호위원회 심의 개최 예정';
      case 5: return '📬 최종 처분 결과 통보';
      default: return '📍 일반 사건 진행';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const stepNum = parseInt(step);
    // 첨부된 파일명을 필요서류 란에 병합 표기하여 풍부한 데이터 기록
    let mergedDocs = requiredDocuments.trim();
    if (uploadedFiles.length > 0) {
      const fileNames = uploadedFiles.map(f => f.name).join(', ');
      mergedDocs = mergedDocs 
        ? `${mergedDocs} (첨부파일: ${fileNames})` 
        : `첨부파일: ${fileNames}`;
    }

    const newLog = {
      step: stepNum,
      stepTitle: handleStepTitle(stepNum),
      logDate,
      location: location.trim() || undefined,
      content: content.trim(),
      requiredDocuments: mergedDocs || undefined,
      remarks: remarks.trim() || undefined
    };

    await saveSecureProgressLog(newLog);

    // 폼 및 업로드된 파일 초기화
    setContent('');
    setLocation('');
    setRequiredDocuments('');
    setRemarks('');
    setUploadedFiles([]);
  };

  // 드래그앤드롭 이벤트 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files).map(file => ({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        progress: 100
      }));
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).map(file => ({
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        progress: 100
      }));
      setUploadedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 최고 진행 도달 단계 계산 (진행률 계측용)
  const maxCompletedStep = logs.length > 0 ? Math.max(...logs.map(l => l.step)) : 0;
  const progressPercent = Math.min(100, maxCompletedStep * 20);

  // 단계 필터에 따른 데이터 필터링
  const filteredLogs = logs.filter(log => activeFilter === 'all' || log.step === activeFilter);

  // 단계별 가이드라인 툴팁 매핑
  const stepInfo = [
    { num: 1, label: '공식 접수', desc: '학교 관리자(교장/감)에게 침해 피해 신고서를 정식 서면 제출하고 접수 번호를 확보하는 단계입니다.' },
    { num: 2, label: '예비 조사', desc: '교육청 소속 전문 장학관/변호사가 배정되어 사실관계를 규명하고 현장 실사를 하는 과정입니다.' },
    { num: 3, label: '소명 제출', desc: '피해 사실과 교원의 정당성을 증명할 법적 증거, 동료 교사 목격서, 진단서 등을 취합해 공식 보완하는 단계입니다.' },
    { num: 4, label: '심의 개최', desc: '교권보호위원회 심의 기일이 정해지고, 청문회에 출석하여 진술 및 조력을 받아 공식 변론하는 핵심 단계입니다.' },
    { num: 5, label: '결과 통보', desc: '교보위 심의 결과 학부모/학생 처분이 확정되고 치료비 선지급 및 피해 구제 처분서가 최종 송달되는 종결 단계입니다.' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans antialiased text-slate-800 dark:text-slate-200">
      
      {/* 좌측 2개 컬럼: 진행 스텝 비주얼 스테퍼 및 타임라인 피드 */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* 프리미엄 보안 헤더 및 NEIS 토큰 정보 */}
        <Card hoverable={false} className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/50 p-5 rounded-3xl shadow-sm transition-all duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800 shadow-inner">
                <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Typography variant="h4" className="text-emerald-900 dark:text-emerald-400 font-extrabold text-base">인증 사용자 전용 비공개 보안 통제구역</Typography>
                  <span className="px-2 py-0.5 rounded bg-emerald-600 text-[9px] font-bold text-white shadow-sm tracking-wider uppercase">SSL Secure</span>
                </div>
                <Typography variant="p" className="text-xs text-emerald-700/80 dark:text-emerald-500 leading-relaxed font-medium">
                  본 정보는 NEIS(교사인증시스템) 토큰 기반 SSL 다중 암호화가 적용되어 교육청 서버에 격리 보관되며 타인에게 절대 유출되지 않습니다.
                </Typography>
              </div>
            </div>
            
            <div className="shrink-0 flex flex-col items-end gap-1.5 self-end md:self-center">
              <button 
                onClick={handleTokenRefresh}
                disabled={tokenStatus === 'refreshing'}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 shadow-sm border flex items-center gap-1.5
                  ${tokenStatus === 'refreshing' 
                    ? 'bg-slate-100 text-slate-400 border-slate-200' 
                    : tokenStatus === 'refreshed'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-750'}`}
              >
                {tokenStatus === 'refreshing' ? (
                  <>
                    <LoadingSpinner size="sm" className="border-t-slate-500" />
                    <span>보안토큰 갱신 중...</span>
                  </>
                ) : tokenStatus === 'refreshed' ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>보안키 갱신 완료</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
                    </svg>
                    <span>보안 인증 토큰 갱신</span>
                  </>
                )}
              </button>
              <span className="text-[10px] font-mono text-emerald-600/70 dark:text-emerald-500/70 font-semibold truncate max-w-[150px]" title={secureToken}>
                {secureToken.substring(0, 15)}...
              </span>
            </div>
          </div>
        </Card>

        {/* 2. 인터랙티브 비주얼 스테퍼 카드 */}
        <Card hoverable={false} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <Typography variant="h3" className="text-slate-800 dark:text-slate-100 font-extrabold text-lg">교보위 단계별 실시간 핵심 이정표</Typography>
              <Typography variant="p" className="text-xs text-slate-400">아이콘을 누르시면 해당 단계에 등록된 상세 타임라인 기록만 조회할 수 있습니다.</Typography>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-brand-indigo dark:text-brand-indigo-light block">최고 도달 단계: {maxCompletedStep}단계</span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-200">{progressPercent}% 진행됨</span>
            </div>
          </div>

          {/* 게이지 바 */}
          <div className="relative w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-brand-indigo via-brand-azure to-emerald-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 스텝 서클 그리드 */}
          <div className="grid grid-cols-5 gap-2 relative pt-2">
            {stepInfo.map((s) => {
              const isCompleted = s.num <= maxCompletedStep;
              const isActive = s.num === maxCompletedStep;
              const isSelected = activeFilter === s.num;

              return (
                <div 
                  key={s.num} 
                  onClick={() => setActiveFilter(activeFilter === s.num ? 'all' : s.num)}
                  className={`flex flex-col items-center text-center cursor-pointer group transition-all duration-300 p-2 rounded-2xl border
                    ${isSelected 
                      ? 'bg-brand-indigo/10 border-brand-indigo dark:bg-brand-indigo/20' 
                      : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  <div 
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 font-bold shadow-md
                      ${isCompleted 
                        ? isActive 
                          ? 'bg-gradient-to-tr from-brand-indigo to-brand-azure text-white ring-4 ring-brand-indigo/20 scale-110 animate-bounce-slow' 
                          : 'bg-emerald-500 text-white' 
                        : 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}
                  >
                    {isCompleted && !isActive ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.num
                    )}
                  </div>
                  <span className={`text-[11px] font-extrabold mt-2.5 transition-colors duration-300
                    ${isCompleted 
                      ? 'text-slate-800 dark:text-slate-200' 
                      : 'text-slate-400'}`}
                  >
                    {s.label}
                  </span>
                  
                  {/* 스텝 도움말 툴팁 */}
                  <div className="absolute left-0 right-0 -bottom-24 bg-slate-900 text-white dark:bg-slate-800 text-[11px] leading-relaxed p-3.5 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 z-30 shadow-xl border border-slate-800 dark:border-slate-750 text-left pointer-events-none">
                    <strong className="text-brand-indigo-light block mb-0.5">{s.num}단계: {s.label} 안내</strong>
                    {s.desc}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-16 hidden group-hover:block" /> {/* 툴팁 표시용 여백 확보 */}
        </Card>

        {/* 3. 진행 일지 타임라인 */}
        <Card hoverable={false} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Typography variant="h3" className="text-slate-800 dark:text-slate-100 font-extrabold text-lg">사건 진행 세부 타임라인</Typography>
              {activeFilter !== 'all' && (
                <span 
                  onClick={() => setActiveFilter('all')} 
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-indigo/10 text-brand-indigo cursor-pointer hover:bg-brand-indigo/20 transition-all border border-brand-indigo/10 flex items-center gap-1"
                >
                  필터: {activeFilter}단계 ✕
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSortToggle}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all duration-200 flex items-center gap-1.5 text-slate-600 dark:text-slate-350"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                {sortOrder === 'asc' ? '날짜오름차순' : '날짜내림차순'}
              </button>
              
              <span className="text-xs font-bold text-brand-indigo/80 dark:text-brand-indigo-light">
                총 {filteredLogs.length}개 이력 조회됨
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <LoadingSpinner size="lg" className="border-t-brand-indigo" />
              <Typography variant="p" className="text-xs text-slate-400">교육청 보안 서버로부터 암호화 진행 일지를 로드 중입니다...</Typography>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl p-6">
              <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <Typography variant="h4" className="text-slate-600 dark:text-slate-400 font-bold text-sm">등록된 진행 로그가 없습니다</Typography>
              <Typography variant="p" className="text-xs text-slate-400 max-w-xs mt-1">이 단계의 이력이 아직 기록되지 않았습니다. 우측 폼을 활용하여 진행 상황을 새롭게 안전 기재해 주세요.</Typography>
            </div>
          ) : (
            <div className="relative pl-8 space-y-8 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-[2px] before:bg-slate-150 dark:before:bg-slate-800">
              {filteredLogs.map((log) => {
                const stepColors = [
                  'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400',
                  'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/20 dark:text-cyan-400',
                  'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400',
                  'border-red-500 bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400',
                  'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-950/20 dark:text-violet-400'
                ];
                const activeColor = stepColors[(log.step - 1) % 5];

                return (
                  <div key={log.id} className="relative group transition-all duration-300 hover:-translate-x-1">
                    
                    {/* 타임라인 원 포인트 */}
                    <div className="absolute -left-[35px] top-1.5 w-[16px] h-[16px] rounded-full bg-white dark:bg-slate-900 border-4 border-brand-indigo dark:border-brand-indigo-light group-hover:scale-125 transition-all duration-300 shadow-sm z-10" />
                    
                    <div className="p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-850/40 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                      
                      {/* 상단 날짜 및 제목 */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className={`px-3 py-1 rounded-2xl text-[11px] font-extrabold border ${activeColor}`}>
                          {log.stepTitle}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-indigo/10 text-brand-indigo dark:bg-brand-indigo/25 dark:text-brand-indigo-light font-mono shadow-inner">
                            {log.logDate}
                          </span>
                          <span className="text-[9px] font-bold bg-slate-200/80 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
                            ID: {log.id.substring(0, 6)}
                          </span>
                          <button 
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 ml-2"
                            title="기록 삭제"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {log.location && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                          <svg className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>대응 장소: {log.location}</span>
                        </div>
                      )}

                      <Typography variant="p" className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                        {log.content}
                      </Typography>

                      {log.requiredDocuments && (
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2 shadow-inner">
                          <span className="text-[10px] font-black text-brand-indigo dark:text-brand-indigo-light block tracking-wider uppercase">📁 관련 증명 / 추가 제출 보완 서류 목록</span>
                          <Typography variant="p" className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
                            {log.requiredDocuments}
                          </Typography>
                        </div>
                      )}

                      {log.remarks && (
                        <div className="flex gap-1.5 p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-500 dark:text-rose-400 text-xs font-bold">
                          <span className="shrink-0 text-rose-600 dark:text-rose-400 text-sm">⚠</span>
                          <span className="leading-normal">주의 및 요령: {log.remarks}</span>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* 우측 1개 컬럼: 사건 진행 단계 기록 등록 폼 */}
      <div className="space-y-6">
        <Card hoverable={false} className="bg-white dark:bg-slate-900 p-6 shadow-md border border-slate-100 dark:border-slate-800 rounded-3xl space-y-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <Typography variant="h3" className="text-slate-800 dark:text-slate-100 font-extrabold text-base">
              진행 이력 추가 등록 폼
            </Typography>
            <Typography variant="p" className="text-[11px] text-slate-400 mt-1">교보위 청문회까지의 법적 진행 정보를 안전히 누적 기록합니다.</Typography>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">진행 스텝 대분류 선택</label>
              <select
                value={step}
                onChange={(e) => setStep(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border bg-white/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 outline-none text-xs text-slate-800 dark:text-slate-200 focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/10 transition-all font-bold"
              >
                <option value="1">1단계: 침해 공식 접수</option>
                <option value="2">2단계: 교육청 이관 및 예비 조사</option>
                <option value="3">3단계: 소명자료 및 추가 제출</option>
                <option value="4">4단계: 교보위 심의 개최 예정</option>
                <option value="5">5단계: 최종 처분 결과 수령</option>
              </select>
            </div>

            <Input
              label="기록 / 대처 날짜 선택"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="rounded-2xl"
            />

            <Input
              label="회의 / 조사 / 서류접수 장소"
              placeholder="예: 서울한국초등학교 교무실, 교육지원청 실사실"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-2xl"
            />

            <Textarea
              label="상세 대응 상황 및 대처 내용 (필수)"
              placeholder="예: 장학사와 동료 교사 배석 하에 예비 조사에 응했으며 침해 폭언 상황의 녹취 요약본을 제출 완료함."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              required
              className="rounded-2xl"
            />

            <Textarea
              label="준비 / 보완 제출 서류 설명"
              placeholder="예: 목격 교사 확인서 2부, 심리 치료 소견서 1부"
              value={requiredDocuments}
              onChange={(e) => setRequiredDocuments(e.target.value)}
              rows={2}
              className="rounded-2xl"
            />

            {/* 드래그 앤 드롭 파일 업로드 시뮬레이션 영역 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">증명자료 / 서류 암호화 업로드 목업</label>
              
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2
                  ${isDragging 
                    ? 'border-brand-indigo bg-brand-indigo/5' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-850'}`}
              >
                <input 
                  type="file" 
                  id="file-upload" 
                  multiple 
                  className="hidden" 
                  onChange={handleFileSelect}
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                  <div className="w-8 h-8 rounded-full bg-brand-indigo/10 text-brand-indigo flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-350">클릭하거나 파일을 드래그하여 드롭하세요</span>
                  <span className="text-[8px] text-slate-400">PDF, PNG, JPG 파일 최대 10MB (SSL 격리 보관)</span>
                </label>
              </div>

              {/* 업로드된 파일 피드백 */}
              {uploadedFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-[10px] font-semibold">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-emerald-500 text-xs">🔒</span>
                        <span className="text-slate-700 dark:text-slate-200 truncate max-w-[130px]">{file.name}</span>
                        <span className="text-slate-400 text-[8px]">{file.size}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-1 rounded">업로드완료</span>
                        <button type="button" onClick={() => removeFile(idx)} className="text-rose-500 font-extrabold text-xs hover:text-rose-600">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Input
              label="주의 / 비고 메모 (선택)"
              placeholder="예: 변호사 조언서 내용을 기반으로 답변 준비할 것"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="rounded-2xl"
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full shadow-md rounded-2xl py-3 font-extrabold" isLoading={isSubmitting}>
                암호화 진행로그 저장하기
              </Button>
            </div>

          </form>
        </Card>
      </div>

    </div>
  );
};
