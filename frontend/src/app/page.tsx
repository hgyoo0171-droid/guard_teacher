'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { IncidentForm, IncidentFormValues } from '@/components/incident/IncidentForm';
import { CaseProgressLogger } from '@/components/incident/CaseProgressLogger';
import { CaseMatcher } from '@/components/incident/CaseMatcher';
import { EmergencyContacts } from '@/components/incident/EmergencyContacts';
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
  
  // 사건 수첩 서브 탭 상태 제거, 대신 갱신 트리거 추가
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 폼 테스트 관련 상태
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<IncidentFormValues | null>(null);
  
  // 2. 판례 매칭 키워드 검색 상태
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [matchDone, setMatchDone] = useState(false);

  // 3. AI 상담 모의 채팅 로그
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<any[]>([
    { role: 'ai', text: '안녕하세요! 선생님, 어떤 교권 침해 상황을 겪으셨나요? 상황을 말씀해 주시면 관련 판례와 대응 방안을 안내해 드립니다.' }
  ]);
  const [isAiTyping, setIsAiTyping] = useState(false);




  // 기록 제출 성공 핸들러
  const handleFormSuccess = (data: IncidentFormValues) => {
    setSubmittedData(data);
    setFormSubmitted(true);
    setRefreshTrigger(prev => prev + 1); // 타임라인 즉시 새로고침
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

  // 챗봇 대화 핸들러 (실제 API 연동)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatLog((prev) => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setIsAiTyping(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('로그인이 필요합니다.');

      // 백엔드의 AI 시맨틱 검색 API 엔드포인트 호출
      const response = await fetch('https://teachguard-backend-84878824642.asia-northeast3.run.app/api/cases/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: userMessage, limit: 2 })
      });

      if (!response.ok) {
        throw new Error('API 검색 실패');
      }

      const data = await response.json();
      
      setChatLog((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `많이 놀라셨겠습니다 선생님. 해당 상황은 모욕죄 및 교원지위법 위반 소지가 있습니다. 우선 관련된 유사 판례를 아래에 찾아보았습니다. 판례를 참고하시고, '나의 사건 수첩'에 꼭 상황을 먼저 기록해 두세요.`
        },
        {
          role: 'cases',
          cases: data.results || []
        }
      ]);

    } catch (error) {
      console.error('Case Matching Error:', error);
      // 에러 시 폴백
      setChatLog((prev) => [
        ...prev,
        {
          role: 'ai',
          text: '죄송합니다 선생님, 현재 AI 판례 검색 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
        }
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // 가해자 타입 한글 매핑
  const mapPerpetrator = (type: string | undefined) => {
    switch (type) {
      case 'STUDENT': return '👤 학생 (Student)';
      case 'PARENT': return '👪 학부모 (Parent)';
      case 'COLLEAGUE': return '💼 동료 교사 (Colleague)';
      case 'ADMINISTRATOR': return '🏫 학교 관리자 (Administrator)';
      case 'THIRD_PARTY': return '👤 제3자 (Third Party)';
      default: return type || '미입력';
    }
  };

  // 장소 타입 한글 매핑
  const mapLocation = (type: string | undefined) => {
    switch (type) {
      case 'CLASSROOM': return '🏫 교실';
      case 'STAFF_ROOM': return '☕ 교무실 / 행정실';
      case 'CORRIDOR': return '👣 복도 / 계단';
      case 'PLAYGROUND': return '🏃 운동장 / 강당';
      case 'ONLINE': return '📱 온라인 / SNS';
      case 'PHONE': return '📞 전화 통화';
      case 'OTHER': return '📍 기타 장소';
      default: return type || '미입력';
    }
  };

  // ============================================
  // 1. 종합 대시보드 뷰
  // ============================================
  const renderDashboard = () => {
    const displayName = user?.displayName || user?.email?.split('@')[0] || '익명 교사';

    return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 웰컴 배너 - 텍스트 단순화 */}
      <div className="rounded-3xl p-8 bg-brand-indigo text-white shadow-lg flex flex-col items-center text-center space-y-3">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-white text-3xl font-extrabold leading-normal pb-1">
          {displayName} 선생님, 안심하세요.
        </h1>
        <p className="text-slate-100 text-lg leading-relaxed">
          지금 당장 필요하신 기능을 선택해 주세요.
        </p>
      </div>

      {/* 퀵 액션 거대 버튼 2개 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 사건 수첩 가기 */}
        <button 
          onClick={() => setActivePath('incident-log')}
          className="group flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-md border-2 border-slate-100 hover:border-brand-indigo hover:shadow-xl transition-all duration-300 text-center"
        >
          <div className="w-24 h-24 bg-brand-indigo/10 rounded-full flex items-center justify-center text-brand-indigo group-hover:scale-110 transition-transform duration-300 mb-6">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <Typography variant="h2" className="text-slate-800 text-2xl font-black mb-2 group-hover:text-brand-indigo">나의 사건 수첩 작성</Typography>
          <Typography variant="p" className="text-slate-500 text-base">침해 사실을 기록하고 진행 상황을 추적합니다.</Typography>
        </button>

        {/* AI 상담 가기 */}
        <button 
          onClick={() => setActivePath('ai-consultation')}
          className="group flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-md border-2 border-slate-100 hover:border-brand-azure hover:shadow-xl transition-all duration-300 text-center"
        >
          <div className="w-24 h-24 bg-brand-azure/10 rounded-full flex items-center justify-center text-brand-azure group-hover:scale-110 transition-transform duration-300 mb-6">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 4.418 9 8z" />
            </svg>
          </div>
          <Typography variant="h2" className="text-slate-800 text-2xl font-black mb-2 group-hover:text-brand-azure">AI 챗봇 상담 및 판례</Typography>
          <Typography variant="p" className="text-slate-500 text-base">AI에게 위로를 받고 관련된 판례를 확인합니다.</Typography>
        </button>

      </div>
    </div>
    );
  };

  // ============================================
  // 2. 침해 기록지 작성 뷰
  // ============================================
  const renderIncidentInput = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-smooth-height">
      <div className="space-y-1 text-center mb-8">
        <Typography variant="h1" className="text-brand-indigo font-extrabold text-3xl">나의 사건 수첩</Typography>
        <Typography variant="p" className="text-slate-500 text-lg">
          사건을 기록하고 암호화하여 안전하게 보관합니다.
        </Typography>
      </div>

      {formSubmitted && submittedData ? (
        <Card hoverable={false} className="bg-white dark:bg-slate-900 p-8 space-y-6 border border-emerald-100 dark:border-emerald-950 font-sans shadow-lg animate-smooth-height">
          
          {/* 상단 축하 배너 */}
          <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-3 shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <Typography variant="h3" className="text-slate-800 dark:text-slate-100 text-2xl">안전하게 보관되었습니다!</Typography>
            <Typography variant="p" className="text-base text-slate-500 max-w-sm mt-1">
              선생님의 기록이 데이터베이스에 암호화되어 저장되었습니다.
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
                {(submittedData.natures || []).map((nat, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-brand-indigo/10 text-brand-indigo">
                    #{nat}
                  </span>
                ))}
                {(!submittedData.natures || submittedData.natures.length === 0) && (
                  <span className="text-xs text-slate-500">선택 안함</span>
                )}
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
  // 4. AI 안심 상담소 뷰 (채팅 + 판례 통합)
  // ============================================
  const renderAiConsultation = () => (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="space-y-1 text-center mb-8">
        <Typography variant="h1" className="text-brand-indigo font-extrabold text-3xl">AI 안심 상담소</Typography>
        <Typography variant="p" className="text-slate-500 text-lg">상황을 말씀해주시면 AI가 대처법과 유사 판례를 즉시 찾아드립니다.</Typography>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col h-[650px] overflow-hidden">
        
        {/* 채팅 로그 출력 영역 */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50/50">
          {chatLog.map((chat, idx) => (
            <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {chat.role === 'cases' ? (
                <div className="w-full max-w-[85%] space-y-3 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-brand-indigo text-xl">⚖️</span>
                    <span className="font-bold text-slate-700">AI가 찾은 유사 판례</span>
                  </div>
                  {chat.cases.map((c: any, i: number) => (
                    <Card key={i} hoverable={false} className="bg-white border-l-4 border-l-brand-indigo p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <Typography variant="h4" className="font-bold text-slate-800">{c.title}</Typography>
                        <span className="px-2 py-1 bg-brand-indigo/10 text-brand-indigo rounded-lg text-xs font-black">유사도 {c.similarity}%</span>
                      </div>
                      <Typography variant="p" className="text-sm text-slate-600 whitespace-pre-wrap">{c.content}</Typography>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className={`max-w-[80%] rounded-3xl px-5 py-4 text-base font-medium leading-relaxed shadow-sm
                  ${chat.role === 'user' 
                    ? 'bg-brand-indigo text-white rounded-br-sm' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'}`}
                >
                  {chat.text}
                </div>
              )}

            </div>
          ))}
          {isAiTyping && (
             <div className="flex justify-start">
               <div className="bg-white border border-slate-200 rounded-3xl rounded-bl-sm px-5 py-4 flex items-center gap-2">
                 <div className="w-2 h-2 bg-brand-indigo/50 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-brand-indigo/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                 <div className="w-2 h-2 bg-brand-indigo/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                 <span className="text-slate-400 text-sm ml-2 font-bold">판례를 검색하고 있습니다...</span>
               </div>
             </div>
          )}
        </div>

        {/* 채팅 입력 폼 영역 */}
        <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-100 bg-white flex gap-3">
          <Input 
            placeholder="겪으신 상황을 대화하듯 편하게 입력해주세요." 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="rounded-2xl text-lg py-6 shadow-inner bg-slate-50"
            disabled={isAiTyping}
          />
          <Button type="submit" variant="primary" className="px-8 rounded-2xl text-lg font-bold shadow-md" disabled={isAiTyping}>
            보내기
          </Button>
        </form>

      </div>
    </div>
  );

  // ============================================
  // 5. 공공 법령 뷰어 뷰
  // ============================================
  const renderGuidelines = () => (
    <div className="max-w-3xl mx-auto space-y-6 font-sans pt-8">
      <div className="space-y-1 text-center mb-8">
        <Typography variant="h1" className="text-brand-indigo font-extrabold text-3xl">공공 가이드라인 및 법령 뷰어</Typography>
        <Typography variant="p" className="text-slate-500 text-lg">대한민국 교원의 지위와 권익을 수호하는 핵심 법령 자료실입니다.</Typography>
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
      case 'incident-log':
        return (
          <div className="space-y-16 max-w-7xl mx-auto animate-in fade-in duration-300">
            <div className="text-center space-y-2 mb-4">
              <Typography variant="h2" className="text-brand-indigo font-bold text-3xl">나의 사건 수첩 & 진행 상황 추적</Typography>
              <Typography variant="p" className="text-slate-500 text-lg">초기 사건을 기록하고, 이후 진행되는 모든 법적/행정적 절차를 한눈에 관리하세요.</Typography>
            </div>
            
            {/* 상단: 초기 접수 폼 */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-6 ml-2">
                 <span className="bg-brand-indigo text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">STEP 1</span>
                 <Typography variant="h3" className="text-2xl font-bold text-slate-800 dark:text-slate-200">초기 침해 사건 기록</Typography>
              </div>
              {renderIncidentInput()}
            </div>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* 하단: 사건 진행 상황 타임라인 */}
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-6 ml-2">
                 <span className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">STEP 2</span>
                 <Typography variant="h3" className="text-2xl font-bold text-slate-800 dark:text-slate-200">사건 진행 타임라인 및 추가 이력 등록</Typography>
              </div>
              <CaseProgressLogger refreshTrigger={refreshTrigger} />
            </div>
          </div>
        );
      case 'ai-consultation':
        return (
          <div className="space-y-12">
            {renderAiConsultation()}
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-12">
            {renderGuidelines()}
            <hr className="border-slate-200 dark:border-slate-800" />
            <EmergencyContacts />
          </div>
        );
      case 'trend':
        return (
          <div className="space-y-12">
            <TrendAnalysisReport />
          </div>
        );
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
