'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '@/context/AuthContext';

interface SchoolIntegrationProps {
  onSchoolSelect?: (school: any) => void;
}

export const SchoolIntegration: React.FC<SchoolIntegrationProps> = ({ onSchoolSelect }) => {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedSchool, setSavedSchool] = useState<any>(null);

  const handleSearch = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const token = await getToken();
    if (!token) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`https://teachguard-backend-84878824642.asia-northeast3.run.app/api/school-info?schoolName=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '학교 검색에 실패했습니다.');
      }
      
      // 백엔드가 배열을 반환하는지, { schools: [] } 형태인지 방어적으로 처리
      const schoolList = Array.isArray(data) ? data : (data.schools || []);
      
      // 학교명(schoolName)과 주소(address), 교육청(officeOfEducation) 포맷 보정
      const formattedSchools = schoolList.map((s: any) => ({
        id: s.id || s.schoolName,
        name: s.name || s.schoolName,
        address: s.address || s.schoolAddress || '',
        office: s.office || s.officeOfEducation || ''
      }));
      
      setSchools(formattedSchools);
    } catch (err: any) {
      console.error(err);
      alert(err.message || '검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = (school: any) => {
    setSavedSchool(school);
    if (onSchoolSelect) {
      onSchoolSelect(school);
    }
    // 향후 로컬스토리지나 서버에 저장
  };

  return (
    <Card hoverable={false} className="bg-white p-6 shadow-sm border border-slate-100 rounded-3xl space-y-6">
      <div className="space-y-1">
        <Typography variant="h3" className="text-slate-800 flex items-center gap-2">
          <span className="text-brand-indigo">🏫</span> 내 소속 학교 연동 (NEIS 공공데이터)
        </Typography>
        <Typography variant="p" className="text-slate-400 text-sm">
          학교를 연동하면 관할 교육청 맞춤형 매뉴얼과 긴급 지원망(SOS)을 제공받을 수 있습니다.
        </Typography>
      </div>

      {savedSchool ? (
        <div className="bg-brand-indigo/5 p-4 rounded-xl border border-brand-indigo/20 flex justify-between items-center">
          <div>
            <div className="font-bold text-brand-indigo">{savedSchool.name}</div>
            <div className="text-sm text-slate-600">{savedSchool.address} | {savedSchool.office}</div>
          </div>
          <Button variant="outline" onClick={() => setSavedSchool(null)} className="text-xs">변경</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="학교명을 입력하세요 (예: 서울초)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch(e);
                }
              }}
              className="flex-1 rounded-xl"
            />
            <Button type="button" onClick={handleSearch} variant="primary" disabled={isSearching} className="rounded-xl">
              검색
            </Button>
          </div>

          {schools.length > 0 && (
            <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
              {schools.map(school => (
                <div key={school.id} className="p-3 border border-slate-100 rounded-lg flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">{school.name}</div>
                    <div className="text-xs text-slate-500">{school.address}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleSave(school)}>선택</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
