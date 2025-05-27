const express = require('express');
const path = require('path'); // path 모듈 불러오기
// const fetch = require('node-fetch'); // Node.js 18 이상은 내장 fetch 사용
const app = express();

// 정적 파일을 제공하는 미들웨어 설정
app.use(express.static(path.join(__dirname, '/')));

app.get('/', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    res.set('Access-Control-Allow-Origin', '*');
    return res.status(400).send('url query required');
  }
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const text = await response.text();
    res.set('Access-Control-Allow-Origin', '*');
    res.send(text);
  } catch (e) {
    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).send('fetch error: ' + e.message);
  }
});

app.listen(3001, () => console.log('Proxy server running on 3001'));