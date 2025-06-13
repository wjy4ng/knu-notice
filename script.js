/*

공지사항(학생소식, 행정소식, 행사안내, 채용소식)
곰나루광장(열린광장, 신문방송사, 스터디/모임, 분실물센터, 사고팔고, 자취하숙, 아르바이트)

*/
const CATEGORIES = [
  {
    name: '공지사항',
    boards: [
      {
        name: '학생소식',
        url: 'https://www.kongju.ac.kr/KNU/16909/subview.do',
      },
      {
        name: '행정소식',
        url: 'https://www.kongju.ac.kr/KNU/16910/subview.do',
      },
      {
        name: '행사안내',
        url: 'https://www.kongju.ac.kr/KNU/16911/subview.do',
      },
      {
        name: '채용소식',
        url: 'https://www.kongju.ac.kr/KNU/16917/subview.do',
      },
    ],
  },
  {
    name: '곰나루광장',
    boards: [
      {
        name: '열린광장',
        url: 'https://www.kongju.ac.kr/KNU/16921/subview.do',
      },
      {
        name: '신문방송사',
        url: 'https://www.kongju.ac.kr/KNU/16922/subview.do',
      },
      {
        name: '스터디/모임',
        url: 'https://www.kongju.ac.kr/KNU/16923/subview.do',
      },
      {
        name: '분실물센터',
        url: 'https://www.kongju.ac.kr/KNU/16924/subview.do',
      },
      {
        name: '사고팔고',
        url: 'https://www.kongju.ac.kr/KNU/16925/subview.do',
      },
      {
        name: '자취하숙',
        url: 'https://www.kongju.ac.kr/KNU/16926/subview.do',
      },
      {
        name: '아르바이트',
        url: 'https://www.kongju.ac.kr/KNU/16927/subview.do',
      },
    ],
  },
];

// 날짜를 YYYY-MM-DD 형식으로 포맷하는 헬퍼 함수
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/*
공통 크롤링 및 필터링 로직
주어진 게시판 URL과 필터 날짜에 따라 공지를 크롤링하고 필터링
*/
async function crawlAndFilterNotices(boardUrl, filterDate) {
  const filteredNotices = [];
  let page = 1;

  while (true) {
    try {
      const pageUrl = page === 1 ? boardUrl : `${boardUrl}?page=${page}`;
      const proxyUrl = `/proxy?url=${encodeURIComponent(pageUrl)}`;
      const res = await fetch(proxyUrl);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const noticeRows = doc.querySelectorAll('tr:not(.notice)');

      if (noticeRows.length === 0) {
        break; // 더 이상 공지가 없으면 중단
      }

      let stopCrawling = false;

      for (const row of noticeRows) {
        const dateCell = row.querySelector('.td-date');
        const titleElement = row.querySelector('td a');

        if (!dateCell || !titleElement) continue;

        let dateStr = dateCell.textContent.trim();
        dateStr = dateStr.replace(/\./g, '-');
        const noticeDate = new Date(dateStr);
        noticeDate.setHours(0, 0, 0, 0);

        // Stop condition: 공지 날짜가 지정된 날짜보다 이전이면 중단
        if (noticeDate < filterDate) {
          stopCrawling = true;
          break; // 현재 페이지 처리 중단
        }

        // 날짜 일치 여부 비교
        if (noticeDate.getFullYear() === filterDate.getFullYear() &&
            noticeDate.getMonth() === filterDate.getMonth() &&
            noticeDate.getDate() === filterDate.getDate()) {
          filteredNotices.push({ title: titleElement.textContent.trim(), url: titleElement.href });
        }
      }

      if (stopCrawling) {
        break; // 전체 루프 중단
      }

      page++; // 다음 페이지로 이동

    } catch (e) {
      console.error(`Error crawling page ${page} for ${boardUrl}:`, e);
      break; // 에러 발생 시 중단
    }
  }
  return filteredNotices;
}

/*

각 게시판 별 공지를 fetch하여 가져오는 함수
1. 학교 홈페이지 공지사항 url을 웹 크롤링
2. html 문자열을 파싱하여 문서로 전환
3. html 문서에서 날짜를 추출
4. 날짜 형식 포맷 후, 오늘 올라온 공지 갯수 카운팅

*/
async function fetchNoticeCount(board, targetDateStr = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 오늘 날짜의 시간을 0으로 설정

  let filterDate = today; // 기본값은 오늘
  if (targetDateStr) {
    filterDate = new Date(targetDateStr);
    filterDate.setHours(0, 0, 0, 0);
  }

  const notices = await crawlAndFilterNotices(board.url, filterDate);
  return notices.length; // 개수 반환
}

/*

여러 게시판의 공지사항 개수를 가져와서 웹 페이지에 동적으로 렌더링하는 함수
1. 공지사항와 곰나루광장의 새 공지 갯수를 입력
2. 각 카테고리에 렌더링
3. 띄울 때 애니메이션 적용

*/
async function renderNoticeList(dateString = null) {
  // 공지사항과 곰나루광장의 게시판 목록 요소 찾기
  const noticeBoardListContainer = document.querySelector('#notice-category-section .board-list');
  const gomnaruBoardListContainer = document.querySelector('#gomnaru-category-section .board-list');

  // 기존 목록 항목들을 초기화
  noticeBoardListContainer.innerHTML = '';
  gomnaruBoardListContainer.innerHTML = '';

  // 모든 게시판 요청을 병렬 처리하고 모두 완료할 때까지 기다림.
  const allCategoryPromises = CATEGORIES.map(async category => { // ex: 공지사항, 곰나루 광장
    const fetchPromises = category.boards.map(async board => { // ex: 학생소식, 행정소식, 행사안내, 채용소식
      const noticeCount = await fetchNoticeCount(board, dateString); // 각 게시판의 공지 카운트. dateString 전달
      return { ...board, count: noticeCount }; // 원래 board 객체에 count 속성 추가해서 반환
    });
    const boardsWithDetails = await Promise.all(fetchPromises); 
    return { categoryName: category.name, boardsWithCounts: boardsWithDetails }; // 게시판 이름, 새공지 개수 반환
  });

  const allCategoryData = await Promise.all(allCategoryPromises); // 공지사항과 곰나루광장의 fetch 작업이 모두 끝나면 결과를 저장

  // 각 카테고리의 목록을 렌더링
  allCategoryData.forEach(categoryData => {
    const targetContainer = categoryData.categoryName === '공지사항' ? noticeBoardListContainer : gomnaruBoardListContainer;

    categoryData.boardsWithCounts.forEach((board, index) => {
      const item = document.createElement('a'); // <a> 생성
      item.className = 'notice-item';
      item.href = board.url; 
      item.target = '_blank';
      item.dataset.count = board.count; // 새 공지 개수를 data 속성으로 저장
      item.innerHTML = `
        <span class=\"notice-title\">${board.name}</span>
        <span class=\"notice-count\">${board.count}</span>  
      `;
      item.style.opacity = '0'; // 초기에는 보이지 않도록 설정 (애니메이션 적용)
      targetContainer.appendChild(item); // DOM 컨테이너에 추가

      // fadeIn 애니메이션 실행
      setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)';
        item.style.animation = `fadeIn 0.5s ease-out forwards`;
      }, 50 * index); // 항목마다 순차적 등장
    });
  });
}

/*

미리보기 기능 구현
1. 마우스 이벤트 리스너 추가
2. 게시판에 가만히 냅두면 미리보기 띄우기
3. 영역을 벗어나면 미리보기 숨기기

*/
const previewArea = document.getElementById('preview-area');
let showPreviewTimer;
let hidePreviewTimer;

// 각 게시판 항목에 마우스 이벤트 리스너 추가
document.addEventListener('mouseover', async (event) => {
  const target = event.target.closest('.notice-item');
  if (!target) return; // .notice-item가 아니면 종료

  const boardUrl = target.href; // 게시판 URL 가져오기
  const boardTitle = target.querySelector('.notice-title').textContent; // 게시판 제목 가져오기

  // 미리보기 창이 이미 열려있고, 같은 URL이라면 로딩하지 않고 종료
  if (previewArea.style.display !== 'none' && previewArea.dataset.url === boardUrl) {
    return;
  }

  // 기존 미리보기 숨김 타이머가 있다면 취소
  clearTimeout(hidePreviewTimer);

  // 미리보기 표시 타이머 설정
  showPreviewTimer = setTimeout(async () => {
    // 새로운 미리보기 내용 로딩
    previewArea.innerHTML = `<h3>${boardTitle}</h3><p>로딩 중...</p>`;
    previewArea.style.display = 'flex'; // 미리보기 영역 표시
    previewArea.style.position = 'absolute'; // 위치 조정을 위해 absolute 설정
    previewArea.dataset.url = boardUrl; // 현재 미리보기 중인 URL 저장
    const noticeCount = parseInt(target.dataset.count, 10); // 데이터 속성에서 새 공지 개수 가져오기

    // 새 공지 개수가 0이면 미리보기 표시 X
    if (noticeCount === 0) {
      previewArea.style.display = 'none';
      previewArea.dataset.url = ''; // URL 데이터 초기화
      return;
    }

    // 마우스 위치에 따라 미리보기 위치 설정
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const offsetX = 20; // 마우스 커서로부터 가로 오프셋
    const offsetY = 20; // 마우스 커서로부터 세로 오프셋

    // 미리보기 영역의 위치를 마우스 위치 기준으로 설정
    previewArea.style.left = `${mouseX + offsetX}px`;
    previewArea.style.top = `${mouseY + offsetY}px`;

    try {
      const selectedDateInput = document.getElementById('notice-date-input');
      const selectedDateString = selectedDateInput.value; // 선택된 날짜 문자열 가져오기

      let filterDate = new Date(); // 기본값은 오늘
      if (selectedDateString) {
        filterDate = new Date(selectedDateString);
        filterDate.setHours(0, 0, 0, 0);
      }

      // 공통 크롤링 및 필터링 함수 호출
      const filteredNotices = await crawlAndFilterNotices(boardUrl, filterDate);

      let previewContent = `<h3>${boardTitle}</h3><ul>`;

      if (filteredNotices.length === 0) {
        previewContent += `<li>해당하는 공지가 없습니다.</li>`;
      } else {
        // 최대 5개의 공지만 표시
        filteredNotices.slice(0, 5).forEach(notice => {
          previewContent += `<li><a href=\"${notice.url}\" target=\"_blank\">${notice.title}</a></li>`;
        });
      }
      previewContent += `</ul>`;
      previewArea.innerHTML = previewContent;

    } catch (e) {
      console.error('미리보기 내용을 가져오는 중 오류 발생:', e);
      previewArea.innerHTML = `<h3>${boardTitle}</h3><p>미리보기를 로딩할 수 없습니다.</p>`;
    }
  }, 500); // 0.5초 지연 후 미리보기 표시
});

document.addEventListener('mouseout', (event) => {
  const target = event.target.closest('.notice-item');
  if (!target) return; // .notice-item가 아니면 종료

  clearTimeout(showPreviewTimer); // 미리보기 표시 타이머 취소

  // 미리보기 숨김 타이머 설정
  hidePreviewTimer = setTimeout(() => {
    previewArea.style.display = 'none';
    previewArea.dataset.url = ''; // URL 데이터 초기화
  }, 200); // 0.2초 지연 후 미리보기 숨김
});

// 초기 렌더링 및 날짜 입력 필드 설정
document.addEventListener('DOMContentLoaded', () => {
  const noticeDateInput = document.getElementById('notice-date-input');
  const today = new Date();

  // 오늘 날짜를 YYYY-MM-DD 형식으로 포맷
  const todayFormatted = formatDate(today);
  
  // 7일 전 날짜 계산
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoFormatted = formatDate(sevenDaysAgo);

  noticeDateInput.value = todayFormatted; // 기본값은 오늘 날짜
  noticeDateInput.max = todayFormatted; // 최대 선택 가능 날짜를 오늘로 설정
  noticeDateInput.min = sevenDaysAgoFormatted; // 최소 선택 가능 날짜를 7일 전으로 설정

  renderNoticeList(todayFormatted); // 페이지 로드 시 기본값으로 오늘 공지사항 렌더링

  noticeDateInput.addEventListener('change', (event) => {
    renderNoticeList(event.target.value); // 선택된 날짜로 공지사항 렌더링
  });
});