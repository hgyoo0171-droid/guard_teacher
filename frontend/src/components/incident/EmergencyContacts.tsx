'use client';

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const EmergencyContacts: React.FC = () => {
  const [address, setAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [contacts, setContacts] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsSearching(true);
    try {
      const region = address.split(' ').slice(0, 2).join(' '); // 시/구 추출
      const response = await fetch(`https://teachguard-backend-84878824642.asia-northeast3.run.app/api/emergency-contacts?region=${encodeURIComponent(region)}&category=police&searchQuery=${encodeURIComponent(address)}`, {
        headers: { 'Authorization': 'Bearer TeachGuardSecureToken_KimTeacher2026' }
      });
      const data = await response.json();
      setContacts(data.results || []);
    } catch (err) {
      console.error(err);
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
          placeholder="학교 주소 입력 (예: 서울 강남구 테헤란로)" 
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="flex-1 rounded-xl border-red-200 focus:ring-red-500"
        />
        <Button type="submit" className="rounded-xl bg-red-600 hover:bg-red-700 text-white" disabled={isSearching}>
          위치 조회
        </Button>
      </form>

      {isSearching && (
        <div className="text-center py-4 text-red-500 animate-pulse text-sm font-bold">
          공공데이터포털(DATA.GO.KR)에서 관할 관서를 실시간으로 찾고 있습니다...
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
