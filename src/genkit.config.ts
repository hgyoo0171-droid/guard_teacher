import dotenv from 'dotenv';
dotenv.config();

import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

// Genkit 설정 초기화
configureGenkit({
  plugins: [
    // Gemini API 키를 환경 변수로부터 읽어와 활성화합니다.
    googleAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY })
  ],
  logLevel: 'debug',
});
