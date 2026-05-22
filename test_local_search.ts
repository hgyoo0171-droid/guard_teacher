import dotenv from 'dotenv';
dotenv.config();

import './src/genkit.config';
import { runFlow } from '@genkit-ai/flow';
import { semanticSearchFlow } from './src/caseMatcher';

async function test() {
  try {
    const result = await runFlow(semanticSearchFlow, { 
      query: "학부모가 늦은 밤까지 계속 문자를 보내며 민원을 보내는 행위", 
      limit: 3 
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
