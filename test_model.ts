import dotenv from 'dotenv';
dotenv.config();

import './src/genkit.config';
import { generate } from '@genkit-ai/ai';

async function test() {
  try {
    const res = await generate({
      model: 'googleai/gemini-1.5-flash',
      prompt: 'hello'
    });
    console.log(res.text());
  } catch (e) {
    console.error(e);
  }
}
test();
