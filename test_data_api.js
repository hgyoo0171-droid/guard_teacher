async function test() {
  const apiKey = 'a0fa1ac436567af0d0c013fda34629dba7096151df8327d3f2ad3ae45d744b3b';
  // decoding the api key for standard use in data.go.kr
  const url = `http://api.data.go.kr/openapi/tn_pubr_public_techer_curesprt_cntr_api?serviceKey=${apiKey}&type=json&pageNo=1&numOfRows=10`;
  
  const res = await fetch(url);
  const text = await res.text();
  console.log(text.substring(0, 500));
}

test();
