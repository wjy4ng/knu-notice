const express = require('express');
const path = require('path');
const app = express();

const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const cheerio = require('cheerio'); // Add cheerio for HTML parsing
const https = require('https'); // Use native https module

const agent = new https.Agent({  
  rejectUnauthorized: false
});

const CATEGORIES = require('./categories.js'); // Import CATEGORIES from categories.js

// 데이터베이스 연결
const db = new sqlite3.Database('./notices.db', (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      boardName TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      date TEXT NOT NULL,
      crawledAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// root directory 설정
app.use(express.static(path.join(__dirname, '/')));

// 새로운 API 엔드포인트: 캐시된 공지사항 데이터를 제공
app.get('/api/notices', (req, res) => {
  const { date } = req.query; // script.js에서 요청할 날짜를 쿼리 파라미터로 받음
  if (!date) {
    return res.status(400).send('date query required');
  }

  // 데이터베이스에서 해당 날짜의 공지사항을 조회
  db.all(`SELECT * FROM notices WHERE date = ?`, [date], (err, rows) => {
    if (err) {
      res.set('Access-Control-Allow-Origin', '*');
      return res.status(500).send('Database query error: ' + err.message);
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.json(rows); // 조회된 데이터를 JSON 형태로 반환
  });
});

// 새로운 API 엔드포인트: CATEGORIES 데이터 제공
app.get('/api/categories', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.json(CATEGORIES);
});

// 웹 크롤링 및 데이터베이스 저장 함수
async function crawlAndSaveNotices() {
  console.log('Crawling and saving notices...');
  const today = new Date();
  const todayFormatted = formatDate(today);

  for (const category of CATEGORIES) {
    for (const board of category.boards) {
      let page = 1;
      while (true) {
        try {
          const pageUrl = page === 1 ? board.url : `${board.url}?page=${page}`;

          const html = await new Promise((resolve, reject) => {
            https.get(pageUrl, (res) => {
              console.log(`Status Code for ${pageUrl}: ${res.statusCode}`);
              console.log('Response Headers:', res.headers);

              let data = '';
              res.on('data', (chunk) => {
                data += chunk;
              });
              res.on('end', () => {
                resolve(data);
              });
            }).on('error', (err) => {
              reject(err);
            });
          });

          // const $ = cheerio.load(html); // Temporarily comment out cheerio loading

          // const noticeRows = $('tr:not(.notice)'); // Temporarily comment out

          // if (noticeRows.length === 0) { // Temporarily comment out
          //   break;
          // }

          // let stopCrawling = false; // Temporarily comment out

          // for (const el of noticeRows) { // Temporarily comment out
          //   const dateCell = $(el).find('.td-date');
          //   const titleElement = $(el).find('td a');

          //   if (!dateCell.length || !titleElement.length) continue;

          //   let dateStr = dateCell.text().trim();
          //   dateStr = dateStr.replace(/\./g, '-');
          //   const noticeDate = new Date(dateStr);
          //   noticeDate.setHours(0, 0, 0, 0);

          //   // 오늘 날짜 이전의 공지는 저장하지 않음 (선택적으로 변경 가능)
          //   if (noticeDate < today.setHours(0,0,0,0)) {
          //     stopCrawling = true;
          //     break;
          //   }

          //   if (noticeDate.getFullYear() === today.getFullYear() &&
          //       noticeDate.getMonth() === today.getMonth() &&
          //       noticeDate.getDate() === today.getDate()) {

          //     const title = titleElement.text().trim();
          //     const url = titleElement.attr('href');

          //     // 데이터베이스에 저장
          //     db.run(`INSERT INTO notices (category, boardName, title, url, date) VALUES (?, ?, ?, ?, ?)`, // Temporarily comment out
          //       [category.name, board.name, title, url, dateStr],
          //       function(err) {
          //         if (err) {
          //           // 이미 존재하는 데이터일 경우 오류 발생 가능 (Unique 제약조건 추가 시)
          //           if (err.message.includes('SQLITE_CONSTRAINT: UNIQUE')) {
          //             // console.log('Duplicate entry, skipping:', title);
          //           } else {
          //             console.error('Error inserting data:', err.message);
          //           }
          //         }
          //       }
          //     );
          //   }
          // }

          // if (stopCrawling) { // Temporarily comment out
          //   break;
          // }

          page++;

        } catch (e) {
          console.error(`Error crawling ${board.url}:`, e.message);
          break;
        }
      }
    }
  }
  console.log('Crawling and saving notices completed.');
}

// 매 시간마다 웹 크롤링 및 데이터베이스 저장 작업 예약
// 0분 0초에 실행 (매 시간 정각)
cron.schedule('0 * * * *', () => {
  crawlAndSaveNotices();
});

// 서버 시작 시 한 번 실행
crawlAndSaveNotices();

// 날짜 포맷 함수 (script.js에서 가져옴)
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 3001번 포트에서 실행
app.listen(3001, () => console.log('Proxy server running on 3001'));