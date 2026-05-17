'use client';

import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { Typography } from './Typography';

interface LegalTextRendererProps {
  content: string;
}

interface LawData {
  title: string;
  content: string;
}

/**
 * ────────────────────────────────────────────────────────
 * LegalTextRenderer 컴포넌트
 * ────────────────────────────────────────────────────────
 * 백엔드(Legal Foundation Linker)에서 생성된 커스텀 마크다운 
 * 하이퍼링크 패턴 [텍스트](law-article:조항번호) 을 파싱하여, 
 * 클릭 시 법률 상세 조항 팝업을 띄워주는 프론트엔드 UI 컴포넌트입니다.
 * ────────────────────────────────────────────────────────
 */
export const LegalTextRenderer: React.FC<LegalTextRendererProps> = ({ content }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState<LawData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 법 조항 클릭 핸들러
  const handleLawClick = async (articleNum: string) => {
    setIsModalOpen(true);
    setIsLoading(true);
    setSelectedLaw(null);

    try {
      // 실제 구현 시 백엔드 API (예: GET /api/law/:article) 호출
      // 테스트를 위해 모의 응답 딜레이 추가
      const response = await fetch(`http://localhost:3000/api/law/${articleNum}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedLaw(data);
      } else {
        // 백엔드가 꺼져있을 경우를 대비한 모의 데이터 폴백
        setTimeout(() => {
          setSelectedLaw({
            title: `교원지위법 제${articleNum}조 (교육활동 침해행위에 대한 조치)`,
            content: '관할청 및 학교의 장은 교육활동 침해행위로 피해를 입은 교원의 치유와 교권 회복을 위하여 심리상담, 조언, 치료를 위한 요양 등의 필요한 조치를 하여야 한다. 또한 피해 교원의 희망에 따라 근무지 변경 등의 편의를 제공할 의무가 있다.'
          });
          setIsLoading(false);
        }, 500);
        return;
      }
    } catch (err) {
      console.error('Law DB Fetch Error:', err);
      // 오프라인 폴백
      setTimeout(() => {
        setSelectedLaw({
          title: `교원지위법 제${articleNum}조 (참조)`,
          content: '법령 서버와 통신할 수 없습니다. 국가법령정보센터에서 교원지위법을 확인해 주세요.'
        });
        setIsLoading(false);
      }, 500);
    }
    setIsLoading(false);
  };

  // 텍스트 파싱 로직 (커스텀 태그 파싱)
  // 정규식: \[([^\]]+)\]\(law-article:(\d+)\) -> [표시텍스트](law-article:조항번호)
  const renderParsedContent = () => {
    const parts = content.split(/(\[[^\]]+\]\(law-article:\d+\))/g);

    return parts.map((part, index) => {
      const match = part.match(/\[([^\]]+)\]\(law-article:(\d+)\)/);
      if (match) {
        const linkText = match[1];
        const articleNum = match[2];
        return (
          <span 
            key={index}
            onClick={() => handleLawClick(articleNum)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-brand-indigo/10 text-brand-indigo font-bold cursor-pointer hover:bg-brand-indigo hover:text-white transition-all shadow-sm border border-brand-indigo/20"
            title="클릭하여 법 조항 상세보기"
          >
            ⚖️ {linkText}
          </span>
        );
      }

      // 일반 텍스트 내의 줄바꿈 처리
      return (
        <span key={index}>
          {part.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i !== part.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      );
    });
  };

  return (
    <>
      <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
        {renderParsedContent()}
      </div>

      {/* 법률 상세 정보 팝업 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg">
            <Card hoverable={false} className="bg-white dark:bg-slate-900 shadow-2xl border-2 border-brand-indigo/30 p-0 overflow-hidden animate-smooth-height rounded-2xl">
              
              <div className="p-4 bg-brand-indigo text-white flex items-center justify-between">
                <Typography variant="h4" className="text-white font-bold flex items-center gap-2">
                  <span>⚖️</span> 법률 근거 확인 (국가법령정보센터)
                </Typography>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 min-h-[150px]">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-3">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-indigo rounded-full animate-spin"></div>
                    <Typography variant="p" className="text-xs text-slate-500 animate-pulse">
                      법제처 DB에서 법 조항 전문을 불러오는 중...
                    </Typography>
                  </div>
                ) : selectedLaw ? (
                  <div className="space-y-4">
                    <Typography variant="h3" className="text-slate-800 dark:text-slate-100 font-extrabold text-lg leading-tight">
                      {selectedLaw.title}
                    </Typography>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <Typography variant="p" className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-justify break-keep">
                        {selectedLaw.content}
                      </Typography>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-rose-500 font-bold py-6">
                    데이터를 불러올 수 없습니다.
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <a 
                  href="https://www.law.go.kr" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-bold text-brand-indigo hover:underline flex items-center gap-1"
                >
                  국가법령정보센터로 이동 ↗
                </a>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};
