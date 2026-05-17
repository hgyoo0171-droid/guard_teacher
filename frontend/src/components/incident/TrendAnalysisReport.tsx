'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// 동적 임포트를 통한 Recharts 차트 컴포넌트 불러오기 (SSR 오류 방지)
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then((mod) => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then((mod) => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => mod.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import('recharts').then((mod) => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then((mod) => mod.Line), { ssr: false });

interface ChartData {
  type: string;
  count: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

export const TrendAnalysisReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  
  // 컴포넌트 마운트 시 데이터 페칭 (Mock API 대체)
  useEffect(() => {
    fetchTrendReport();
  }, []);

  const fetchTrendReport = async () => {
    setLoading(true);
    try {
      // 실제 구현 시 백엔드의 generateTrendReportFlow API 호출
      // 예: const response = await fetch('/api/reports/trend');
      
      // 테스트를 위한 지연 및 모의 데이터 로드
      setTimeout(() => {
        setChartData([
          { type: '폭언/모욕', count: 145 },
          { type: '수업방해', count: 98 },
          { type: '폭행/상해', count: 42 },
          { type: '명예훼손', count: 28 },
          { type: '성희롱', count: 15 },
        ]);

        setMonthlyData([
          { month: '1월', count: 20 },
          { month: '2월', count: 15 },
          { month: '3월', count: 50 },
          { month: '4월', count: 45 },
          { month: '5월', count: 60 },
          { month: '6월', count: 65 },
        ]);

        setAiSummary(
          `**1. 핵심 트렌드 분석**\n\n최근 6개월 데이터 분석 결과, **'폭언/모욕'이 전체 침해 사례의 약 44%를 차지하며 가장 심각한 유형**으로 나타났습니다. 또한 월별 추이를 살펴보면, 학기가 본격적으로 시작되는 3월 기점으로 사건 접수가 급증하여 5~6월(1학기 후반)에 최고조에 달하는 양상을 보입니다.\n\n**2. 주요 원인 추론**\n\n학기 초(3월)에는 학생-교사, 학부모-교사 간의 탐색 및 초기 규칙 설정 과정에서 갈등이 유발되며, 5~6월의 경우 누적된 스트레스와 학업/성적 관련 상담이 몰리면서 우발적인 폭언과 수업 방해 행위가 증가하는 것으로 분석됩니다.\n\n**3. 선제적 예방 대책 가이드**\n\n* **소통 채널 단일화:** 학부모 민원이 폭주하는 5~6월에는 개인 연락처 노출을 최소화하고, 학교 공식 앱이나 안심 번호를 통한 소통만 허용하도록 안내장을 선제적으로 발송해야 합니다.\n* **교권 침해 예방 교육 강화:** 3월 초 학생들을 대상으로 한 예방 교육뿐만 아니라, 4월 말~5월 초 학부모 대상 '학교장 서한문'을 통해 교원 존중 문화를 재차 환기시킬 필요가 있습니다.\n* **위기 교사 심리 상담 선지원:** 데이터 상 위험 시기인 5~6월에는 교내 관리자가 저경력 교사와의 멘토링이나 에듀힐링센터 상담을 우선적으로 지원하여 심리적 번아웃을 예방해야 합니다.`
        );
        
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  // AI 마크다운 요약을 간단히 렌더링하기 위한 파서
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      // 굵은 글씨(**text**) 처리
      const boldParsed = line.split(/(\*\*.*?\*\*)/).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-slate-800 dark:text-slate-200">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.startsWith('* ')) {
        return <li key={idx} className="ml-4 list-disc text-sm text-slate-600 dark:text-slate-400 mb-1">{boldParsed.slice(1)}</li>;
      }
      if (line.trim() === '') {
        return <br key={idx} />;
      }
      return <p key={idx} className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-2">{boldParsed}</p>;
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans animate-smooth-height">
      
      {/* 리포트 헤더 */}
      <div className="space-y-1">
        <Typography variant="h2" className="text-brand-indigo">
          예방 및 트렌드 분석 리포트
        </Typography>
        <Typography variant="p" className="text-slate-400 text-sm">
          데이터베이스에 누적된 전국 교권침해 익명 데이터를 실시간으로 통계 내고, Gemini Pro가 도출한 예방적 인사이트를 확인하세요.
        </Typography>
      </div>

      {loading ? (
        <Card hoverable={false} className="bg-white p-24 flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-100">
          <LoadingSpinner size="lg" className="border-t-brand-indigo" />
          <Typography variant="p" className="text-brand-indigo font-bold animate-pulse">
            AI가 수만 건의 데이터를 분석하고 리포트를 생성 중입니다...
          </Typography>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 왼쪽 영역: 차트 데이터 시각화 */}
          <div className="space-y-6">
            
            {/* 상단 차트: 침해 유형별 분포 (Bar Chart) */}
            <Card hoverable={false} className="bg-white p-6 shadow-sm border border-slate-100 rounded-3xl">
              <Typography variant="h4" className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-brand-azure rounded-full"></span>
                침해 유형별 누적 발생 건수
              </Typography>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="type" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 하단 차트: 월별 추이 (Line Chart) */}
            <Card hoverable={false} className="bg-white p-6 shadow-sm border border-slate-100 rounded-3xl">
              <Typography variant="h4" className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-rose-400 rounded-full"></span>
                월별 교권 침해 발생 추이
              </Typography>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#fb7185" strokeWidth={4} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

          </div>

          {/* 오른쪽 영역: AI 요약 분석 리포트 텍스트 */}
          <div className="h-full">
            <Card hoverable={false} className="bg-gradient-to-br from-brand-indigo/5 to-brand-azure/5 border-2 border-brand-indigo/10 p-8 rounded-3xl h-full shadow-sm flex flex-col">
              
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-brand-indigo/10">
                <div className="w-10 h-10 rounded-xl bg-brand-indigo text-white flex items-center justify-center shadow-lg shadow-brand-indigo/30">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <Typography variant="h3" className="text-brand-indigo font-black text-lg">AI 심층 분석 리포트</Typography>
                  <Typography variant="p" className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Gemini Pro Data Insights</Typography>
                </div>
              </div>

              <div className="flex-1 bg-white/60 p-6 rounded-2xl border border-white shadow-inner overflow-y-auto">
                {renderMarkdown(aiSummary)}
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button variant="primary" className="shadow-md font-bold px-6 py-2.5 rounded-xl text-sm">
                  리포트 PDF 다운로드
                </Button>
              </div>

            </Card>
          </div>

        </div>
      )}
    </div>
  );
};
