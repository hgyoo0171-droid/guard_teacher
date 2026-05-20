'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer
} from 'recharts';
import { Button } from '@/components/ui/Button';

interface TrendData {
  chartData: { type: string; count: number }[];
  monthlyData: { month: string; count: number }[];
  aiSummary: string;
}

export function TrendReport() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('최근 6개월');

  useEffect(() => {
    fetchTrendReport();
  }, [period]);

  const fetchTrendReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`https://teachguard-backend-84878824642.asia-northeast3.run.app/api/trend-report?period=${encodeURIComponent(period)}`, {
        headers: {
          'Authorization': 'Bearer TeachGuardSecureToken_KimTeacher2026'
        }
      });

      if (!response.ok) {
        throw new Error('리포트를 불러오는데 실패했습니다.');
      }

      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6 text-center">
        <div className="rounded-xl bg-red-50 p-6 text-red-600 dark:bg-red-900/30 dark:text-red-400">
          <p className="font-semibold">{error}</p>
          <Button onClick={fetchTrendReport} className="mt-4" variant="outline">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">예방 및 트렌드 분석 리포트</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            익명화된 교권침해 데이터를 분석하여 최신 동향과 예방 가이드를 제공합니다.
          </p>
        </div>
        <select 
          value={period} 
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <option value="최근 3개월">최근 3개월</option>
          <option value="최근 6개월">최근 6개월</option>
          <option value="올해">올해</option>
        </select>
      </div>

      {loading ? (
        <div className="flex h-[500px] items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-500">AI가 데이터를 분석하고 인사이트를 도출하는 중입니다...</p>
          </div>
        </div>
      ) : data ? (
        <div className="grid gap-8 md:grid-cols-2">
          {/* Charts Section */}
          <div className="space-y-8">
            {/* Bar Chart - Types */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-6 text-lg font-bold text-gray-900 dark:text-white">침해 유형별 발생 건수</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="type" tick={{fontSize: 12}} />
                    <YAxis />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Line Chart - Monthly */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-6 text-lg font-bold text-gray-900 dark:text-white">월별 발생 추이 ({period})</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{fontSize: 12}} />
                    <YAxis />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Summary Section */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center space-x-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">✨</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Genkit AI 분석 인사이트</h3>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 dark:prose-invert dark:text-gray-300">
              {data.aiSummary.split('\n').map((line, idx) => (
                <p key={idx} className="my-2">{line}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
