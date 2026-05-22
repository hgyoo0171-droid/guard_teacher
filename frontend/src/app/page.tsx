'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { IncidentForm, IncidentFormValues } from '@/components/incident/IncidentForm';
import { CaseProgressLogger } from '@/components/incident/CaseProgressLogger';
import { CaseMatcher } from '@/components/incident/CaseMatcher';
import { EmergencyContacts } from '@/components/incident/EmergencyContacts';
import { SchoolIntegration } from '@/components/incident/SchoolIntegration';
import { TrendAnalysisReport } from '@/components/incident/TrendAnalysisReport';
import { Typography } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Home() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  
  // 메인 액티브 탭 상태 관리
  const [activePath, setActivePath] = useState('dashboard');
  
  // 폼 테스트 관련 상태
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<IncidentFormValues | null>(null);
  
  // 2. 판례 매칭 키워드 검색 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [matchDone, setMatchDone] = useState(false);

  // 3. AI 상담 모의 채팅 로그
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([
    { role: 'ai', text: '안녕하세요! 선생님의 권리와 마음을 치유하는 TeachGuard AI입니다. 현재 처하신 곤란한 교권 침해 상황에 대해 편하게 말씀해 주시면, 행동 지침과 법적 조력을 안내해 드립니다.' }
  ]);

  // 4. 학교 검색 및 사용자 지역 상태 (공공데이터 연동)
  const [userRegion, setUserRegion] = useState('전체');
  const [schoolSearchInput, setSchoolSearchInput] = useState('');
  const [searchingSchool, setSearchingSchool] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({ office: '서울특별시 교육청', name: '서울한국초등학교' });

  const handleSchoolSearch = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!schoolSearchInput) return;
    
    const token = await getToken();
    if (!token) return alert('로그인이 필요합니다.');

    setSearchingSchool(true);
    try {
      const response = await fetch(`https://teachguard-backend-84878824642.asia-northeast3.run.app/api/school-info?schoolName=${encodeURIComponent(schoolSearchInput)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const firstHit = data[0];
          setSchoolInfo({ office: firstHit.officeOfEducation, name: firstHit.schoolName });
          // 시도 이름 추출 (예: '서울특별시교육청' -> '서울')
          const regionPrefix = firstHit.officeOfEducation.substring(0, 2);
          setUserRegion(regionPrefix);
          alert(`${firstHit.schoolName} 정보를 나이스(NEIS)에서 성공적으로 가져왔습니다!`);
        } else {
          alert('나이스(NEIS) 서버에서 일치하는 학교를 찾을 수 없습니다.');
        }
      }
    } catch (error) {
      console.error('School search error', error);
      alert('학교 검색 중 오류가 발생했습니다.');
    } finally {
      setSearchingSchool(false);
    }
  };

  // 기록 제출 성공 핸들러
  const handleFormSuccess = (data: IncidentFormValues) => {
    setSubmittedData(data);
    setFormSubmitted(true);
  };

  // 판례 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setTimeout(() => {
      setSearching(false);
      setMatchDone(true);
    }, 1500);
  };

  // 챗봇 대화 핸들러
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatLog((prev) => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');

    setTimeout(() => {
      setChatLog((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `선생님께서 서술해 주신 "${userMessage.substring(0, 15)}..." 상황은 교원지위법 및 형법상 '모욕죄' 또는 '공무집행방해죄'에 해당할 소지가 큽니다. 즉각적인 1단계 행동 조치로 통화 및 메세지 등 모든 대화 내역을 고화질 캡처 및 녹음 보관하시고, 학교장에게 서면 피해 보고서를 제출하여 교권보호위원회 소집을 정식 청구하십시오. 저희 AI 대처 솔루션이 문건 초안 작성을 전면 지원해 드립니다.`
        }
      ]);
    }, 1000);
  };

  // 가해자 타입 한글 매핑
  const mapPerpetrator = (type: string) => {
    switch (type) {
      case 'STUDENT': return '👤 학생 (Student)';
      case 'PARENT': return '👪 학부모 (Parent)';
      case 'COLLEAGUE': return '💼 동료 교사 (Colleague)';
      case 'ADMINISTRATOR': return '🏫 학교 관리자 (Administrator)';
      case 'THIRD_PARTY': return '👤 제3자 (Third Party)';
      default: return type;
    }
  };

  // 장소 타입 한글 매핑
  const mapLocation = (type: string) => {
    switch (type) {
      case 'CLASSROOM': return '🏫 교실';
      case 'STAFF_ROOM': return '☕ 교무실 / 행정실';
      case 'CORRIDOR': return '👣 복도 / 계단';
      case 'PLAYGROUND': return '🏃 운동장 / 강당';
      case 'ONLINE': return '📱 온라인 / SNS';
      case 'PHONE': return '📞 전화 통화';
      case 'OTHER': return '📍 기타 장소';
      default: return type;
    }
  };

  // ============================================
  // 1. 종합 대시보드 뷰
  // ============================================
  const renderDashboard = () => {
    const displayName = user?.displayName || user?.email?.split('@')[0] || '익명 교사';

    return (
    <div className="space-y-8">
      {/* 웰컴 배너 */}
      <div className="relative overflow-hidden rounded-3xl p-8 bg-gradient-to-r from-brand-indigo via-brand-indigo/90 to-brand-azure text-white shadow-xl shadow-brand-indigo/15 animate-smooth-height">
        <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-6 translate-x-6">
          <svg className="w-80 h-80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
          </svg>
        </div>
        <div className="max-w-xl space-y-4">
          <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-white/10">
            Teacher Care & Legal Support
          </span>
          <Typography variant="h1" className="text-white text-3xl md:text-4xl font-extrabold tracking-tight">
            {displayName} 선생님, 오늘도 고생 많으셨습니다.
          </Typography>
          <Typography variant="lead" className="text-slate-100 text-sm md:text-base leading-relaxed">
            안심하고 교육활동에 전념하실 수 있도록 TeachGuard AI가 실시간으로 법적 대처 방안과 심리 안전가이드를 단단히 지지해 드립니다.
          </Typography>
        </div>
      </div>

      {/* 통계 요약 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverable className="flex flex-col justify-between p-6 h-36 bg-white border-l-4 border-l-brand-indigo animate-smooth-height">
          <div>
            <Typography variant="detail" className="font-bold text-slate-400">나의 안심 교권 지수</Typography>
            <Typography variant="h2" className="mt-1 text-slate-800 font-serif">98%</Typography>
          </div>
          <Typography variant="detail" className="text-emerald-500 font-semibold flex items-center gap-1">
            ▲ 정상 보호 상태
          </Typography>
        </Card>
        
        <Card hoverable className="flex flex-col justify-between p-6 h-36 bg-white border-l-4 border-l-brand-azure animate-smooth-height">
          <div>
            <Typography variant="detail" className="font-bold text-slate-400">기록된 침해 기록</Typography>
            <Typography variant="h2" className="mt-1 text-slate-800 font-serif">
              {formSubmitted ? '1 건' : '0 건'}
            </Typography>
          </div>
          <Typography variant="detail" className="text-brand-indigo font-semibold">보관함에 안심 암호화 됨</Typography>
        </Card>

        <Card hoverable className="flex flex-col justify-between p-6 h-36 bg-white border-l-4 border-l-emerald-500 animate-smooth-height">
          <div>
            <Typography variant="detail" className="font-bold text-slate-400">AI 판례 RAG 검색 매칭</Typography>
            <Typography variant="h2" className="mt-1 text-slate-800 font-serif">16 건</Typography>
          </div>
          <Typography variant="detail" className="text-slate-500">이번 주 교원지위법 갱신 완료</Typography>
        </Card>
      </div>

      {/* 예방 수칙 및 안내 F-패턴 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 침해 대처 매뉴얼 피드 */}
        <Card hoverable={false} className="lg:col-span-2 space-y-4 bg-white">
          <Typography variant="h3" className="text-slate-800">교권 침해 발생 시 즉각 3단계 행동 수칙</Typography>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-indigo/10 text-brand-indigo font-black text-sm shrink-0">1</div>
              <div>
                <Typography variant="h5">상황의 서면/녹음 증거 즉각 채집</Typography>
                <Typography variant="p" className="text-sm text-slate-500 mt-1">전화 통화 녹음 고지, 모욕적인 문자메세지 및 SNS 캡처본을 안전하게 로컬 및 백업 드라이브에 다중 보관합니다.</Typography>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-indigo/10 text-brand-indigo font-black text-sm shrink-0">2</div>
              <div>
                <Typography variant="h5">피해 현장 격리 및 교장/관리자 보고</Typography>
                <Typography variant="p" className="text-sm text-slate-500 mt-1">학부모 또는 학생과의 즉각적인 분리를 요청하고, 구두 및 서면으로 소속 학교 교무실 관리자에게 보고서를 제출합니다.</Typography>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-indigo/10 text-brand-indigo font-black text-sm shrink-0">3</div>
              <div>
                <Typography variant="h5">AI 안심 도구 및 교원센터 상담 연계</Typography>
                <Typography variant="p" className="text-sm text-slate-500 mt-1">TeachGuard AI가 추천해 주는 맞춤형 대응 문건 양식을 통해 교권보호위원회(교보위) 소집 신청서를 신속히 다듬으십시오.</Typography>
              </div>
            </div>
          </div>
        </Card>

        {/* 법률 정보 카드 뉴스 */}
        <Card className="bg-brand-indigo text-white flex flex-col justify-between p-6">
          <div className="space-y-3">
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full bg-white/20">금주의 법령 팁</span>
            <Typography variant="h3" className="text-white text-lg">교원지위법 제15조란?</Typography>
            <Typography variant="p" className="text-slate-100 text-sm leading-relaxed">
              관할 교육청은 교권침해 피해 교사에게 치료비 및 심리상담 요령을 우선 지원해야 하며, 침해한 학부모에게는 특별 교육 이수 또는 과태료가 부과될 수 있습니다.
            </Typography>
          </div>
          <Typography variant="detail" className="text-brand-grey-light font-bold mt-4 cursor-pointer">자세히 알아보기 →</Typography>
        </Card>
        
      </div>
    </div>
    );
  };

  // ============================================
  // 2. 침해 기록지 작성 뷰 (Zod 폼 컴포넌트 이식)
  // ============================================
  const renderIncidentInput = () => (
    <div className="max-w-3xl mx-auto space-y-6 animate-smooth-height">
      <div className="space-y-1">
        <Typography variant="h2" className="text-brand-indigo">교권 침해 기록지 작성</Typography>
        <Typography variant="p" className="text-slate-400 text-sm">
          사건의 시간, 가해자 대분류, 구체적 장소, 다중 침해 종류를 Zod 유효성 검사 기반으로 정밀하게 기록하고 암호화합니다.
        </Typography>
      </div>

      {formSubmitted && submittedData ? (
        <Card hoverable={false} className="bg-white dark:bg-slate-900 p-8 space-y-6 border border-emerald-100 dark:border-emerald-950 font-sans shadow-lg animate-smooth-height">
          
          {/* 상단 축하 배너 */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-3 shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <Typography variant="h3" className="text-slate-800 dark:text-slate-100">암호화 제출 완료!</Typography>
            <Typography variant="p" className="text-sm text-slate-500 max-w-sm mt-1">
              선생님의 교권 침해 기록서가 데이터베이스에 Zod 유효성 통과 및 안전 보관되었습니다.
            </Typography>
          </div>

          {/* 구조화 데이터 카드 덱 피드백 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">교사 정보 및 발생 시각</span>
              <Typography variant="h5" className="mt-1 text-slate-800 dark:text-slate-200">
                {submittedData.teacherName} 선생님
              </Typography>
              <Typography variant="p" className="text-xs text-slate-500 mt-1">
                일시: {submittedData.incidentDate} {submittedData.incidentTime}
              </Typography>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">가해자 분류 정보</span>
              <Typography variant="h5" className="mt-1 text-slate-800 dark:text-slate-200">
                {mapPerpetrator(submittedData.perpetratorType)}
              </Typography>
              <Typography variant="p" className="text-xs text-slate-500 mt-1">
                상세: {submittedData.perpetratorDetail}
              </Typography>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">사건 발생 장소</span>
              <Typography variant="h5" className="mt-1 text-slate-800 dark:text-slate-200">
                {mapLocation(submittedData.locationType)}
              </Typography>
              <Typography variant="p" className="text-xs text-slate-500 mt-1">
                구체적 장소: {submittedData.locationDetail}
              </Typography>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">체크된 침해 성격 (다중선택)</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {submittedData.natures.map((nat, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-indigo/10 text-brand-indigo">
                    #{nat}
                  </span>
                ))}
              </div>
            </div>

          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850 space-y-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">진술 경위 요약</span>
            <Typography variant="p" className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-sans font-medium">
              {submittedData.description}
            </Typography>
          </div>

          {submittedData.evidenceMemo && (
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-850 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">기재된 확보 증거 목록</span>
              <Typography variant="p" className="text-xs text-slate-600 dark:text-slate-350 font-sans">
                {submittedData.evidenceMemo}
              </Typography>
            </div>
          )}

          {/* 하단 제어 버턴 */}
          <div className="flex gap-3 justify-center pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setFormSubmitted(false)}>
              새 침해 서류 양식 작성
            </Button>
            <Button variant="primary" onClick={() => { setActivePath('ai-consultation'); setFormSubmitted(false); }}>
              이 건으로 AI 안심 상담 연계하기
            </Button>
          </div>

        </Card>
      ) : (
        <IncidentForm onSuccess={handleFormSuccess} />
      )}
    </div>
  );

  // ============================================
  // 3. 유사 판례 매칭 뷰 (별도 컴포넌트로 분리됨)
  // ============================================

  // ============================================
  // 4. AI 안심 상담소 뷰
  // ============================================
  const renderAiConsultation = () => (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="space-y-1">
        <Typography variant="h2" className="text-brand-indigo">AI 안심 상담소</Typography>
        <Typography variant="p" className="text-slate-400 text-sm">전문 법률 지식 and 심리 위로 프로세스가 결합된 실시간 인공지능 지원 대화 서비스입니다.</Typography>
      </div>

      <Card hoverable={false} className="bg-white flex flex-col h-[550px] p-0 overflow-hidden border border-slate-100">
        
        {/* 채팅 로그 출력 영역 */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-slate-50/50">
          {chatLog.map((chat, idx) => (
            <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md
                ${chat.role === 'user' 
                  ? 'bg-brand-indigo text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}
              >
                {chat.text}
              </div>
            </div>
          ))}
        </div>

        {/* 채팅 입력 폼 영역 */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex gap-3">
          <div className="flex-1">
            <Input 
              placeholder="상황에 해당하는 궁금증이나 질문을 작성해 주세요... (예: 증거 수집은 어떻게 하나요?)" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" className="px-6 rounded-xl">
            전송
          </Button>
        </form>

      </Card>
    </div>
  );

  // ============================================
  // 5. 공공 법령 뷰어 뷰
  // ============================================
  const renderGuidelines = () => (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      <div className="space-y-1">
        <Typography variant="h2" className="text-brand-indigo">공공 가이드라인 및 법령 뷰어</Typography>
        <Typography variant="p" className="text-slate-400 text-sm">대한민국 교원의 지위와 권익을 수호하는 핵심 법령 자료실입니다.</Typography>
      </div>

      <Card hoverable={false} className="bg-white space-y-4">
        
        {/* 법률 아이템 1 */}
        <div className="p-4 rounded-xl hover:bg-slate-50 transition-all duration-200">
          <Typography variant="h4" className="text-slate-800 text-base">교원지위법 제15조 (교육활동 침해행위에 대한 조치)</Typography>
          <Typography variant="p" className="text-slate-500 text-sm mt-1">
            학교의 장은 교육활동 침해행위로 피해를 입은 교원의 치유와 교권 회복을 위하여 필요한 조치를 하여야 하며, 피해 교원의 희망에 따라 근무지 변경 등의 편의를 제공할 의무가 있습니다.
          </Typography>
        </div>

        <hr className="border-slate-100" />

        {/* 법률 아이템 2 */}
        <div className="p-4 rounded-xl hover:bg-slate-50 transition-all duration-200">
          <Typography variant="h4" className="text-slate-800 text-base">교육공무원법 제43조 (교권 존중)</Typography>
          <Typography variant="p" className="text-slate-500 text-sm mt-1">
            교원은 교육자로서 존경받으며 그 지위는 존중되어야 합니다. 교원은 형의 선고, 징계처분 또는 이 법이 정하는 사유에 의하지 아니하고는 그 의사에 반하여 강임·휴직·직위해제 또는 면직을 당하지 아니합니다.
          </Typography>
        </div>

        <hr className="border-slate-100" />

        {/* 법률 아이템 3 */}
        <div className="p-4 rounded-xl hover:bg-slate-50 transition-all duration-200">
          <Typography variant="h4" className="text-slate-800 text-base">전국 에듀힐링 센터 및 상담 처 정보</Typography>
          <Typography variant="p" className="text-slate-500 text-sm mt-1">
            - 서울특별시교육청 교원치유지원센터: 02-399-9096<br />
            - 경기도교육청 에듀힐링센터: 031-249-0585<br />
            - 대전광역시교육청 에듀힐링센터: 042-616-8000
          </Typography>
        </div>

      </Card>
    </div>
  );

  // ============================================
  // 6. 계정 설정 뷰
  // ============================================
  const renderSettings = () => {
    const displayName = user?.displayName || user?.email?.split('@')[0] || '익명 교사';
    
    return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-1">
        <Typography variant="h2" className="text-brand-indigo">계정 및 소속 학교 설정</Typography>
        <Typography variant="p" className="text-slate-400 text-sm">교권 보호 서비스 연계를 위한 기본 정보를 수정합니다.</Typography>
      </div>

      <Card hoverable={false} className="bg-white p-8">
        <form onSubmit={(e) => { e.preventDefault(); alert('소속 정보가 성공적으로 반영되었습니다.'); }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="교사명" defaultValue={displayName} />
            <Input label="이메일" defaultValue={user?.email || ''} readOnly />
          </div>
          
          
          <SchoolIntegration />


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="담당 직급" defaultValue="5학년 2반 담임" />
            <Input label="인증 상태" defaultValue="NEIS 교사 인증 완료" readOnly className="text-emerald-600 font-bold" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="outline"
              onClick={async () => {
                await signOut(auth);
                router.push('/login');
              }}
            >
              로그아웃
            </Button>
            <Button type="submit" variant="primary">설정 저장</Button>
          </div>
        </form>
      </Card>
    </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="border-t-brand-indigo" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // 상태값에 기반한 메인 탭 렌더링 선택자
  const renderActiveContent = () => {
    switch (activePath) {
      case 'dashboard':
        return renderDashboard();
      case 'incident-input':
        return renderIncidentInput();
      case 'case-progress':
        return <CaseProgressLogger />;
      case 'case-matcher':
        return <CaseMatcher />;
      case 'emergency-directory':
        return <EmergencyContacts />;
      case 'trend-report':
        return <TrendAnalysisReport />;
      case 'ai-consultation':
        return renderAiConsultation();
      case 'guidelines':
        return renderGuidelines();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  return (
    <DashboardLayout activePath={activePath} setActivePath={setActivePath}>
      {renderActiveContent()}
    </DashboardLayout>
  );
}
