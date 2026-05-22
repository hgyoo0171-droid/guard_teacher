const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://teachguard-backend-84878824642.asia-northeast3.run.app/api/cases/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer TeachGuardSecureToken_KimTeacher2026'
    },
    body: JSON.stringify({ query: '학부모가 늦은 밤까지 계속 문자를 보내며 민원을 보내는 행위', limit: 3 })
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

test();
