import './src/genkit.config';
import dotenv from 'dotenv';
dotenv.config();

import { runFlow } from '@genkit-ai/flow';
import { semanticSearchFlow } from './src/caseMatcher';

async function test() {
  try {
    const result = await runFlow(semanticSearchFlow, { 
      query: "학부모가 교무실에 찾아와 욕설을 하고 행패를 부렸습니다. 어떤 처벌이 가능할까요?",
      limit: 2 
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
