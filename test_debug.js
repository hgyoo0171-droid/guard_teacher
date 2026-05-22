require('./src/genkit.config');
const { generate } = require('@genkit-ai/ai');
const { gemini15Flash } = require('@genkit-ai/googleai');
require('dotenv').config();

async function debug() {
  const query = '학부모가 늦은 밤까지 계속 문자를 보내며 민원을 보내는 행위';
  const apiKey = process.env.LAW_API_KEY;
  
  console.log('Generating keyword...');
  const keywordResponse = await generate({
    model: gemini15Flash,
    prompt: `다음은 교권 침해를 당한 교사가 자신의 상황을 설명한 글입니다. 이 상황을 바탕으로 대한민국의 법제처 판례 검색 엔진에서 검색할 가장 핵심적인 '법률 키워드' 딱 1개 또는 2개를 추출해주세요.
(예: 모욕, 폭행, 명예훼손, 업무방해, 아동학대 등)
반드시 키워드 단어만 띄어쓰기로 구분해서 답변하고 다른 말은 절대 하지 마세요.
상황: "${query}"`,
  });
  
  const extractedKeyword = keywordResponse.text().trim().split(' ')[0] || '교권침해';
  console.log(`Keyword: ${extractedKeyword}`);

  const searchUrl = `https://www.law.go.kr/DRF/lawSearch.do?OC=${apiKey}&target=prec&type=JSON&query=${encodeURIComponent(extractedKeyword)}`;
  console.log('Fetching:', searchUrl);
  
  const response = await fetch(searchUrl);
  const text = await response.text();
  console.log('Law API Response:', text.substring(0, 300));
  
  const data = JSON.parse(text);
  console.log('Parsed:', Object.keys(data));
}

debug().catch(console.error);
