async function test() {
  const apiKey = 'teachguard8132325';
  const keyword = '민원행위'; // likely 0 results
  const searchUrl = `https://www.law.go.kr/DRF/lawSearch.do?OC=${apiKey}&target=prec&type=JSON&query=${encodeURIComponent(keyword)}`;
  
  const response = await fetch(searchUrl);
  const text = await response.text();
  console.log(text);
}
test();
