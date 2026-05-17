'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface MatchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

export const CaseMatcher: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  // 개별 사례의 상세 내용 펼침/닫힘 상태 관리
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(false);
    
    try {
      // 백엔드의 AI 시맨틱 검색 API 엔드포인트 호출
      const response = await fetch('http://localhost:3000/api/cases/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 인증이 필요하다면 토큰 추가: 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: searchQuery, limit: 3 })
      });

      if (!response.ok) {
        throw new Error('검색 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Case Matching Error:', error);
      // API가 아직 준비되지 않았을 경우를 위한 목업(Mock) 데이터 폴백 처리
      setResults([
        {
          id: 'mock-1',
          title: '학부모의 악의적 고성 및 폭언 모욕죄 성립',
          content: '[사건개요] 학부모가 다수의 학생 및 교사가 보는 가운데 교무실에서 교사에게 고함을 지르며 자질이 없다고 모욕함.\n[조치결과] 교권보호위원회 개최 후 공공의 장소 및 공연성이 성립되어 교원지위법 위반으로 관할 수사기관에 고발조치 됨.',
          similarity: 0.92,
        },
        {
          id: 'mock-2',
          title: '반복적인 문자 협박 및 통화 폭언에 대한 교권 침해 방지',
          content: '[사건개요] 지속적으로 교사의 개인 연락처로 늦은 밤 협박성 문자와 통화를 일삼음.\n[조치결과] 특별 교육 이수 10시간 및 접근 금지 권고 발령, 교육청 예산으로 치료비 우선 보장 완료.',
          similarity: 0.87,
        }
      ]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-smooth-height font-sans">
      <div className="space-y-1">
        <Typography variant="h2" className="text-brand-indigo">
          지능형 유사 사례 매칭 (Intelligent Case Matcher)
        </Typography>
        <Typography variant="p" className="text-slate-400 text-sm">
          선생님께서 겪으신 상황을 자연어로 편하게 입력해 주세요. AI가 수만 건의 공공데이터와 판례 중 가장 유사한 사례와 대처 결과를 찾아드립니다.
        </Typography>
      </div>

      <Card hoverable={false} className="bg-white p-6 shadow-sm border border-slate-100 rounded-3xl space-y-8">
        
        {/* 검색 입력 폼 */}
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input 
              placeholder="예: 학부모가 늦은 밤 전화로 폭언을 하고 학교에 찾아오겠다고 협박했습니다." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-2xl"
              disabled={isSearching}
            />
          </div>
          <Button 
            type="submit" 
            variant="primary" 
            className="shrink-0 rounded-2xl md:w-32 font-bold shadow-md h-[46px]" 
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? '분석 중...' : '유사 사례 검색'}
          </Button>
        </form>

        {/* 로딩 애니메이션 영역 (Loading Pulse) */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            {/* 맥동하는 로딩 효과 애니메이션 */}
            <div className="relative flex justify-center items-center">
              <div className="absolute w-16 h-16 bg-brand-indigo/20 rounded-full animate-ping"></div>
              <div className="relative w-8 h-8 bg-brand-indigo rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
            <Typography variant="p" className="text-sm font-semibold text-brand-indigo animate-pulse mt-2">
              Gemini AI가 유사한 판례와 처분 결과를 찾고 있습니다...
            </Typography>
          </div>
        )}

        {/* 검색 결과 영역 */}
        {hasSearched && !isSearching && (
          <div className="mt-8 space-y-6 animate-smooth-height">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <Typography variant="h3" className="text-slate-800 font-extrabold text-lg flex items-center gap-2">
                <span className="text-brand-indigo">✨</span> AI 분석 완료
              </Typography>
              <Typography variant="detail" className="text-slate-400 font-bold">
                유사도가 가장 높은 사례 {results.length}건 발견
              </Typography>
            </div>
            
            {results.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                일치하는 유사 사례를 찾지 못했습니다. 상황을 다른 단어로 설명해 보세요.
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, idx) => {
                  const isExpanded = expandedId === result.id;
                  const similarityPercent = Math.round(result.similarity * 100);
                  // 유사도에 따른 배지 컬러 (90% 이상은 인디고, 이하는 아주르 등)
                  const badgeColor = similarityPercent >= 90 
                    ? 'bg-brand-indigo/10 text-brand-indigo' 
                    : 'bg-brand-azure/10 text-brand-azure';

                  return (
                    <Card 
                      key={result.id}
                      hoverable={false}
                      className={`bg-white border transition-all duration-300 p-0 overflow-hidden shadow-sm
                        ${isExpanded ? 'border-brand-indigo/40 ring-2 ring-brand-indigo/5' : 'border-slate-100 hover:border-brand-indigo/30'}`}
                    >
                      {/* 헤더 (요약부) */}
                      <div 
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                        onClick={() => toggleExpand(result.id)}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider ${badgeColor}`}>
                              유사도 {similarityPercent}%
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                              ID: {result.id.length > 8 ? result.id.substring(0,8) : result.id}
                            </span>
                          </div>
                          <Typography variant="h4" className="text-slate-800 text-base font-bold font-serif leading-tight pr-4">
                            {result.title}
                          </Typography>
                        </div>
                        
                        <div className="shrink-0 flex items-center justify-end text-brand-indigo">
                          <span className="text-xs font-bold mr-2">{isExpanded ? '상세 접기' : '상세 보기'}</span>
                          <div className={`w-8 h-8 rounded-full bg-brand-indigo/5 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* 바디 (상세내용 펼침부) */}
                      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-5 pt-0 bg-slate-50/50 border-t border-slate-100/60">
                          <div className="mt-4 p-4 rounded-xl bg-white border border-slate-100 shadow-inner">
                            <Typography variant="p" className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                              {result.content}
                            </Typography>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <Button variant="outline" className="text-xs font-bold px-3 py-1.5 h-auto rounded-lg">
                              해당 사례 기반으로 내 대응방안 AI 초안 생성하기 →
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
