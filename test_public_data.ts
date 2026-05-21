import dotenv from 'dotenv';
dotenv.config();

import { runFlow } from '@genkit-ai/flow';
import { searchSchoolInfoFlow } from './src/neisApi';
import { getEmergencyContactsFlow } from './src/emergencyDirectoryApi';

async function test() {
  console.log('--- Testing NEIS API ---');
  try {
    const schoolRes = await runFlow(searchSchoolInfoFlow, { schoolName: '서울초등학교' });
    console.log('School Info:', schoolRes);
  } catch (e) {
    console.error('NEIS Error:', e);
  }

  console.log('\n--- Testing Data.go.kr API ---');
  try {
    const contacts = await runFlow(getEmergencyContactsFlow, { region: '서울' });
    console.log(`Contacts found: ${contacts.length}`);
    console.log('First contact:', contacts[0]);
  } catch (e) {
    console.error('Data.go.kr Error:', e);
  }
}

test();
