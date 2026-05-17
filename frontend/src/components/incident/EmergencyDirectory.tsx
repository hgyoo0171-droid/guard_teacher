'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Typography } from '../ui/Typography';
import { Input } from '../ui/Input';

interface EmergencyContact {
  id: string;
  region: string;
  category: string;
  name: string;
  phone: string;
  description?: string;
}

const REGIONS = ['전체', '서울', '경기', '인천', '부산', '대구', '대전', '광주', '전국'];
const CATEGORIES = ['전체', '교원치유센터', '교육청', '심리상담소', '법률지원', '기타'];

export const EmergencyDirectory: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeRegion, setActiveRegion] = useState('전체');
  const [activeCategory, setActiveCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      // 실제 연동 시 백엔드 API (예: GET /api/emergency-contacts) 호출
      // 테스트를 위해 setTimeout으로 모의 딜레이 적용 후 목업 데이터 로드
      setTimeout(() => {
        setContacts([
          { id: '1', region: '서울', category: '교원치유센터', name: '서울특별시교육청 교원치유지원센터', phone: '02-399-9096', description: '심리상담 및 법률 자문 핫라인' },
          { id: '2', region: '서울', category: '법률지원', name: '서울지방변호사회 교권보호지원단', phone: '02-3476-8080', description: '교권침해 관련 무료 초기 법률상담' },
          { id: '3', region: '경기', category: '에듀힐링센터', name: '경기도교육청 교권보호지원센터', phone: '031-249-0585', description: '긴급 위기 개입 및 학부모 갈등 중재' },
          { id: '4', region: '전국', category: '법률지원', name: '한국교직원공제회 무료법률상담', phone: '1577-3400', description: '회원 대상 형사/민사 소송 지원 및 상담' },
          { id: '5', region: '대전', category: '에듀힐링센터', name: '대전광역시교육청 에듀힐링센터', phone: '042-616-8000', description: '교직원 심리치유 및 에듀-코칭' },
        ]);
        setLoading(false);
      }, 600);
    } catch (error) {
      console.error('Failed to load contacts', error);
      setLoading(false);
    }
  };

  // 필터링 로직
  const filteredContacts = contacts.filter(contact => {
    const matchRegion = activeRegion === '전체' || contact.region === activeRegion;
    const matchCategory = activeCategory === '전체' || contact.category === activeCategory;
    const matchSearch = contact.name.includes(searchQuery) || (contact.description || '').includes(searchQuery);
    return matchRegion && matchCategory && matchSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-sans animate-smooth-height">
      
      {/* 헤더 섹션 */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-rose-500 via-rose-500/90 to-orange-400 text-white shadow-xl shadow-rose-500/20">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-6 translate-x-6">
          <svg className="w-80 h-80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
          </svg>
        </div>
        <div className="max-w-xl space-y-4 relative z-10">
          <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-white/20 backdrop-blur-md">
            Emergency Support & Hotline
          </span>
          <Typography variant="h1" className="text-white text-3xl md:text-4xl font-extrabold tracking-tight">
            긴급 지원 네트워크
          </Typography>
          <Typography variant="lead" className="text-rose-50 text-sm md:text-base leading-relaxed">
            혼자 견디지 마세요. 지역별 교육청, 에듀힐링센터 및 무료 법률 구조 공단의 긴급 연락망을 즉시 확인하실 수 있습니다.
          </Typography>
        </div>
      </div>

      {/* 필터 및 검색 컨트롤 */}
      <Card hoverable={false} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex flex-col md:flex-row gap-4 justify-between items-center z-20">
        
        {/* 지역 필터 칩(Chips) */}
        <div className="flex flex-wrap gap-2 flex-1">
          {REGIONS.map(region => (
            <button
              key={region}
              onClick={() => setActiveRegion(region)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border
                ${activeRegion === region 
                  ? 'bg-brand-indigo text-white border-brand-indigo shadow-md scale-105' 
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}`}
            >
              {region}
            </button>
          ))}
        </div>

        {/* 텍스트 검색창 */}
        <div className="w-full md:w-64 shrink-0">
          <Input 
            placeholder="기관명 또는 키워드 검색..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-2xl"
          />
        </div>
      </Card>

      {/* 연락처 리스트 렌더링 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
          <Typography variant="p" className="text-sm font-semibold text-slate-400 animate-pulse mt-2">
            전국 긴급 연락망 데이터를 불러오는 중...
          </Typography>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContacts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              선택한 조건에 맞는 연락처가 없습니다. 필터를 변경해 보세요.
            </div>
          ) : (
            filteredContacts.map(contact => (
              <Card key={contact.id} hoverable={true} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-0 overflow-hidden flex flex-col h-full group">
                
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
                      {contact.region} · {contact.category}
                    </span>
                    {/* 통화 아이콘 버튼 (모바일에서 즉시 전화걸기 연결) */}
                    <a href={`tel:${contact.phone.replace(/-/g, '')}`} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center shadow-sm border border-slate-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </a>
                  </div>
                  
                  <div>
                    <Typography variant="h3" className="text-slate-800 dark:text-slate-100 font-bold text-lg leading-tight group-hover:text-brand-indigo transition-colors">
                      {contact.name}
                    </Typography>
                    <Typography variant="p" className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {contact.description}
                    </Typography>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800/80">
                  <Typography variant="p" className="text-lg font-black text-slate-700 dark:text-slate-200 font-mono tracking-tight text-center">
                    {contact.phone}
                  </Typography>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};
