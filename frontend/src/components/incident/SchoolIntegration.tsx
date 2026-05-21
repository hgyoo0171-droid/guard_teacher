'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const SchoolIntegration: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedSchool, setSavedSchool] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://teachguard-backend-84878824642.asia-northeast3.run.app/api/school-info?schoolName=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': 'Bearer TeachGuardSecureToken_KimTeacher2026' }
      });
      const data = await response.json();
      setSchools(data.schools || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = (school: any) => {
    setSavedSchool(school);
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
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input 
              placeholder="학교명을 입력하세요 (예: 서울초)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-xl"
            />
            <Button type="submit" variant="primary" disabled={isSearching} className="rounded-xl">
              검색
            </Button>
          </form>

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
