/**
 * ────────────────────────────────────────────────────────
 * Legal Foundation Linker (법률 근거 연결 도구) 백엔드 모듈
 * ────────────────────────────────────────────────────────
 * 국가법령정보센터 기준 '교원의 지위 향상 및 교육활동 보호를 위한 특별법'
 * 주요 조항 데이터를 메모리(또는 DB)에 가지고 있으며, 
 * AI 생성 텍스트 내에서 법 조항을 감지하여 하이퍼링크 또는 특정 태그로 치환합니다.
 * ────────────────────────────────────────────────────────
 */

// 교원지위법 주요 조항 더미/캐시 데이터 (실제 서비스에서는 DB나 법제처 API 연동)
export const teacherStatusLawDatabase: Record<string, { title: string; content: string }> = {
  '15': {
    title: '교원지위법 제15조 (교육활동 침해행위에 대한 조치)',
    content: '관할청 및 학교의 장은 교육활동 침해행위로 피해를 입은 교원의 치유와 교권 회복을 위하여 심리상담, 조언, 치료를 위한 요양 등의 필요한 조치를 하여야 한다. 또한 피해 교원의 희망에 따라 근무지 변경 등의 편의를 제공할 의무가 있다.'
  },
  '16': {
    title: '교원지위법 제16조 (교육활동 침해학생에 대한 조치)',
    content: '학교교권보호위원회는 교육활동 침해학생에게 학교봉사, 사회봉사, 특별교육 이수 또는 심리치료, 출석정지, 학급교체, 전학, 퇴학처분 등의 조치를 학교의 장에게 요청할 수 있다.'
  },
  '17': {
    title: '교원지위법 제17조 (교육활동 침해행위 관련 학부모등에 대한 조치)',
    content: '관할청은 교육활동 침해행위를 한 학부모 등에게 관할청이 정하는 기관에서 특별교육을 이수하거나 심리치료를 받을 것을 명할 수 있으며, 불이행 시 과태료를 부과할 수 있다.'
  },
  '43': {
    title: '교육공무원법 제43조 (교권 존중)',
    content: '교원은 교육자로서 존경받으며 그 지위는 존중되어야 한다. 교원은 형의 선고, 징계처분 등에 의하지 아니하고는 본인의 의사에 반하여 강임, 휴직, 직위해제 또는 면직당하지 아니한다.'
  }
};

/**
 * 텍스트 내에 존재하는 '교원지위법 제N조' 등의 패턴을 찾아
 * 프론트엔드가 파싱하기 쉬운 커스텀 하이퍼링크 태그 형식으로 치환하는 후처리 함수입니다.
 */
export function injectLegalLinks(text: string): string {
  // 정규식: 교원지위법 제00조 또는 교육공무원법 제00조 매칭
  const regex = /(교원지위법|교육공무원법)\s*제(\d+)조/g;
  
  return text.replace(regex, (match, lawName, articleNum) => {
    // DB에 해당 조항 데이터가 존재하는지 확인
    if (teacherStatusLawDatabase[articleNum]) {
      // 프론트엔드에서 onClick 이벤트를 걸 수 있도록 고유 속성 부여
      // 예: [교원지위법 제15조](law-article:15)
      return `[${match}](law-article:${articleNum})`;
    }
    return match; // 매칭되는 조항이 없으면 원본 텍스트 유지
  });
}

// ==============================================================
// Express API 라우터 스켈레톤 연결 예시 (src/index.ts)
// ==============================================================
/*
import { teacherStatusLawDatabase } from './legalLinker';

// 프론트엔드 팝업창에서 법 조항 상세 내용을 조회하기 위한 엔드포인트
app.get('/api/law/:article', (req, res) => {
  const article = req.params.article;
  const lawData = teacherStatusLawDatabase[article];
  
  if (lawData) {
    return res.json(lawData);
  } else {
    return res.status(404).json({ error: '해당 법 조항을 찾을 수 없습니다.' });
  }
});
*/
