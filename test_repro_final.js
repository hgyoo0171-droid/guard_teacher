async function test() {
  try {
    const res = await fetch('https://teachguard-backend-84878824642.asia-northeast3.run.app/api/cases/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer TeachGuardSecureToken_KimTeacher2026'
      },
      body: JSON.stringify({ query: '학부모가 수업 중에 난입해서 욕설을 했습니다. 어떻게 대처해야 하나요?', limit: 3 })
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
  } catch(e) {
    console.error(e);
  }
}
test();
