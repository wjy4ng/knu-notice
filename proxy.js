const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, '/'))); // 정적 파일을 제공하는 경로 설정 ex: index.html 요청 시 해당 HTML 파일 반환됨

app.get('/proxy', async (req, res) => { // /proxy 경로에 GET 요청이 오면 비동기 실행
  const url = req.query.url;
  if (!url) {
    res.set('Access-Control-Allow-Origin', '*'); // CORS 문제를 피하기 위해 모든 도메인에서 접근 가능하게 응답 헤더 설정
    return res.status(400).send('url query required'); // HTTP 400(Bad Request)
  }
  try {
    const response = await fetch(url, { // 외부 사이트로 요청을 보냄
      headers: { // 서버 차단을 방지하기 위해 실제 브라우저처럼 헤더를 설정
        'User-Agent': // window 10, 64비트, 웹브라우저 엔진, 웹브라우저 버전 124, Safari 엔진 기반
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        // HTML 문서 요청, XHTML도 가능, XML은 0.9 우선순위, 그 외 0.8 우선순위
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const text = await response.text();
    res.set('Access-Control-Allow-Origin', '*'); // client가 이 server에 접근 가능하도록 CORS 헤더 설정
    res.send(text);
  } catch (e) {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).send('fetch error: ' + e.message);
  }
});

app.listen(3001, () => console.log('Proxy server running on 3001')); // 3001번 포트에서 실행