async function test() {
  const res = await fetch('https://teachguard-backend-84878824642.asia-northeast3.run.app/api/cases/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer TeachGuardSecureToken_KimTeacher2026'
    },
    body: JSON.stringify({ query: '학부모가 욕설' })
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
}

test();
