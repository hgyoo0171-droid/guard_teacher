'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '@/context/AuthContext';

export const EmergencyContacts: React.FC = () => {
  const { getToken } = useAuth();
  const [address, setAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [contacts, setContacts] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setErrorMsg('');

    setIsSearching(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('로그인이 필요합니다.');

      let searchRegion = address;
      
      // 학교 이름으로 입력한 경우 (예: 해밀중학교) -> NEIS API를 통해 주소 자동 변환 시도
      if (address.endsWith('학교') && !address.includes(' ')) {
        try {
          const schoolRes = await fetch(`https://teachguard-backend-84878824642.asia-northeast3.run.app/api/school-info?schoolName=${encodeURIComponent(address)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const schoolData = await schoolRes.json();
          if (schoolRes.ok && Array.isArray(schoolData) && schoolData.length > 0 && schoolData[0].address) {
            // 도로명 주소 가져오기 (예: 세종특별자치시 해밀2로 6)
            searchRegion = schoolData[0].address;
          }
        } catch (e) {
          console.error('학교 주소 자동 변환 실패', e);
        }
      }

      const region = searchRegion.split(' ').filter(Boolean)[0]; // 시/도만 정확히 추출 (예: 세종특별자치시)
      const response = await fetch(`https://teachguard-backend-84878824642.asia-northeast3.run.app/api/emergency-contacts?region=${encodeURIComponent(region)}&category=police`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '긴급 지원망 정보를 가져오는데 실패했습니다.');
      }
      
      setContacts(Array.isArray(data) ? data : (data.results || []));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card hoverable={false} className="bg-red-50 p-6 shadow-sm border border-red-100 rounded-3xl space-y-6">
      <div className="space-y-1">
        <Typography variant="h3" className="text-red-800 flex items-center gap-2">
          <span className="text-red-500">🚨</span> 긴급 지원망 (SOS)
        </Typography>
        <Typography variant="p" className="text-red-600/80 text-sm">
          현재 계신 학교 주소를 입력하면 공공데이터 기반으로 가장 가까운 관할 지구대 및 지원센터를 즉시 연결해 드립니다.
        </Typography>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input 
          placeholder="도로명 주소 또는 학교 이름 입력 (예: 서울 강남구, 해밀중학교)" 
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="flex-1 rounded-xl border-red-200 focus:ring-red-500"
        />
        <Button type="submit" className="rounded-xl bg-red-600 hover:bg-red-700 text-white whitespace-nowrap shrink-0" disabled={isSearching}>
          위치 조회
        </Button>
      </form>

      {isSearching && (
        <div className="text-center py-4 text-red-500 animate-pulse text-sm font-bold">
          공공데이터포털(DATA.GO.KR)에서 관할 관서를 실시간으로 찾고 있습니다...
        </div>
      )}

      {errorMsg && (
        <div className="text-center py-4 text-red-600 text-sm font-bold bg-red-100 rounded-xl border border-red-200">
          오류: {errorMsg}
        </div>
      )}

      {contacts && contacts.length > 0 && (
        <div className="space-y-3 mt-4">
          {contacts.map((contact: any, index: number) => (
            <div key={index} className="bg-white p-4 rounded-xl border border-red-100 flex justify-between items-center shadow-sm">
              <div>
                <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  {contact.name.includes('경찰') || contact.name.includes('지구대') || contact.name.includes('파출소') ? '🚓' : '🏥'} 
                  {contact.name}
                </div>
                <div className="text-sm text-slate-500 mt-1">{contact.address}</div>
              </div>
              <a 
                href={`tel:${contact.phone}`}
                className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-4 py-2 rounded-lg flex flex-col items-center justify-center transition-colors"
              >
                <span className="text-xs">직통 통화</span>
                <span className="text-lg tracking-wide">{contact.phone}</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
