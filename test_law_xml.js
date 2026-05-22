async function test() {
  const apiKey = 'teachguard8132325';
  const keyword = '모욕'; 
  const searchUrl = `https://www.law.go.kr/DRF/lawSearch.do?OC=${apiKey}&target=prec&type=XML&query=${encodeURIComponent(keyword)}`;
  
  const response = await fetch(searchUrl);
  const text = await response.text();
  console.log(text.substring(0, 500));
}
test();
