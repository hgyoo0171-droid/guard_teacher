import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

// Genkit 설정 초기화
configureGenkit({
  plugins: [
    // Gemini API 키를 환경 변수(GEMINI_API_KEY)로부터 읽어와 활성화합니다.
    googleAI()
  ],
  logLevel: 'debug',
});
