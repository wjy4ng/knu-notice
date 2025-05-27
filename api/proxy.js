const express = require('express');
const { JSDOM } = require('jsdom');
// const fetch = require('node-fetch'); // Node.js 18 이상은 내장 fetch 사용
const app = express();

app.get('/proxy', async (req, res) => {
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
    const html = await response.text();
    
    // 서버에서 HTML 파싱 및 데이터 추출
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const dateCells = doc.querySelectorAll('tr:not(.notice) td.td-date');
    const now = new Date();
    let count = 0;

    dateCells.forEach(cell => {
      let dateStr = cell.textContent.trim();
      dateStr = dateStr.replace(/\./g, '-');
      // 한국 시간대를 고려하여 날짜를 정확히 파싱할 필요가 있을 수 있습니다.
      // 여기서는 간단히 YYYY-MM-DD 형식으로 변환하여 Date 객체 생성
      const parts = dateStr.split('-');
      // Date 생성자에 YYYY, MM-1, DD 순서로 인자 전달
      const noticeDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

      // UTC 기준으로 비교하거나 한국 시간대로 조정해야 할 수 있습니다.
      // 간단한 비교를 위해 Date 객체의 날짜 부분만 비교
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const noticeDay = new Date(noticeDate.getFullYear(), noticeDate.getMonth(), noticeDate.getDate());
      
      if (noticeDay.getTime() === today.getTime()) {
        count++;
      }
    });
    
    // 필요한 데이터를 JSON으로 응답
    res.set('Access-Control-Allow-Origin', '*');
    res.json({ count: count });

  } catch (e) {
    console.error('Fetch or parsing error:', e);
    res.set('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'Failed to fetch or parse data', message: e.message });
  }
});

module.exports = app;