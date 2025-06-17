// 미리보기 기능 변수 선언
const previewArea = document.getElementById('preview-area');
let showPreviewTimer;
let hidePreviewTimer;

// 초기 렌더링 및 날짜 입력 필드 설정
document.addEventListener('DOMContentLoaded', async () => {
  const noticeDateInput = document.getElementById('notice-date-input');
  const today = new Date();

  try {
    const response = await fetch('/api/categories');
    window.CATEGORIES = await response.json(); // 전역 변수로 저장하거나 필요한 스코프에 할당
  } catch (error) {
    console.error('Error fetching categories:', error);
    // 카테고리 로딩 실패 시 사용자에게 알리거나 대체 로직 수행
    return;
  }

  // 오늘 날짜를 YYYY-MM-DD 형식으로 포맷
  const todayFormatted = formatDate(today);
  
  // 날짜 필터
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 4); // 최대 5일까지
  const pastDateFormatted = formatDate(pastDate);

  noticeDateInput.value = todayFormatted; // 기본값은 오늘 날짜
  noticeDateInput.max = todayFormatted; // 최대 선택 가능 날짜를 오늘로 설정
  noticeDateInput.min = pastDateFormatted; // 최소 선택 가능 날짜를 4일 전으로 설정

  renderNoticeList(todayFormatted); // 페이지 로드 시 기본값으로 오늘 공지사항 렌더링

  noticeDateInput.addEventListener('change', (event) => {
    renderNoticeList(event.target.value); // 선택된 날짜로 공지사항 렌더링
  });
});

// 마우스가 게시판 목록으로 들어왔을 때
document.addEventListener('mouseover', async (event) => {
  const target = event.target.closest('.notice-item');
  if (!target) return; // 게시판 목록에 마우스 없으면 종료

  const boardUrl = target.href; // 게시판 URL 가져오기
  const boardTitle = target.querySelector('.notice-title').textContent; // 게시판 제목 가져오기

  // 미리보기 창이 이미 열려있고 같은 URL이라면 로딩x
  if (previewArea.style.display !== 'none' && previewArea.dataset.url === boardUrl) {
    return;
  }

  // 기존 미리보기 숨김 타이머가 있다면 취소
  clearTimeout(hidePreviewTimer);

  // 미리보기 표시 타이머 설정 (마우스를 바로바로 움직이면 미리보기 로직이 꼬이는 문제 해결)
  showPreviewTimer = setTimeout(async () => {
    // 미리보기 띄우기
    previewArea.innerHTML = `<h3>${boardTitle}</h3><p>로딩 중...</p>`;
    previewArea.style.display = 'flex';
    previewArea.style.position = 'absolute';
    previewArea.dataset.url = boardUrl; // 현재 미리보기 중인 URL 저장
    const noticeCount = parseInt(target.dataset.count, 10); // 새 공지 개수 가져오기

    // 새 공지 없으면 미리보기 표시x
    if (noticeCount === 0) {
      previewArea.style.display = 'none';
      previewArea.dataset.url = ''; // URL 데이터 초기화
      return;
    }

    // 마우스 위치에 따라 미리보기 위치 설정
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const offsetX = 20;
    const offsetY = 20;
    previewArea.style.left = `${mouseX + offsetX}px`;
    previewArea.style.top = `${mouseY + offsetY}px`;

    // 미리보기 창 구현
    try {
      const selectedDateInput = document.getElementById('notice-date-input');
      const selectedDateString = selectedDateInput.value; // 선택된 날짜 문자열 가져오기

      let filterDate = new Date(); // 기본값은 오늘
      if (selectedDateString) {
        filterDate = new Date(selectedDateString);
        filterDate.setHours(0, 0, 0, 0);
      }

      // 웹 크롤링 및 필터링 함수 호출
      const filteredNotices = await crawlAndFilterNotices(boardUrl, filterDate);

      let previewContent = `<h3>${boardTitle}</h3><ul>`;

      // 미리보기에 새 공지 제목 삽입
      if (filteredNotices.length !== 0) {
        // 최대 5개의 공지만 표시
        filteredNotices.slice(0, 5).forEach(notice => {
          previewContent += `<li>${notice.title}</li>`;
        });
      }
      previewContent += `</ul>`;
      previewArea.innerHTML = previewContent;

    } catch (e) {
      console.error('미리보기 내용을 가져오는 중 오류 발생:', e);
      previewArea.innerHTML = `<h3>${boardTitle}</h3><p>미리보기를 로딩할 수 없습니다.</p>`;
    }
  }, 200); // 0.2초 후 미리보기 표시
});

// 마우스가 게시판 목록 밖으로 이동했을 때
document.addEventListener('mouseout', (event) => {
  const target = event.target.closest('.notice-item');
  if (!target) return; // 게시판 목록 창 근처가 아닌 경우 종료

  clearTimeout(showPreviewTimer); // 미리보기 표시 타이머 취소

  // 미리보기 숨김 타이머 설정
  hidePreviewTimer = setTimeout(() => {
    previewArea.style.display = 'none';
    previewArea.dataset.url = '';
  }, 200);
});

// 날짜 YYYY-MM-DD 형식으로 포맷
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 한자리일 경우 두자리로 표시
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 게시판 URL과 필터 날짜에 따라 공지를 크롤링하고 필터링
async function crawlAndFilterNotices(boardUrl, filterDate) {
  console.log('crawlAndFilterNotices called for boardUrl:', boardUrl, 'filterDate:', filterDate);
  const filteredNotices = [];
  const filterDateFormatted = formatDate(filterDate); // YYYY-MM-DD 형식으로 변환

  try {
    console.log('Attempting to fetch from /api/notices with URL:', `/api/notices?date=${filterDateFormatted}`);
    const response = await fetch(`/api/notices?date=${filterDateFormatted}`);
    const data = await response.json();
    console.log('Received data from /api/notices:', data);

    // boardUrl과 일치하는 공지사항만 필터링
    // proxy.js에서 가져온 데이터는 이미 해당 날짜로 필터링되어 있으므로, boardUrl만 필터링합니다.
    for (const notice of data) {
      // boardUrl이 notice.url의 시작 부분과 일치하는지 확인 (전체 URL이 아니라 게시판 URL로만 비교)
      if (notice.url.startsWith(boardUrl)) {
        filteredNotices.push({ title: notice.title, url: notice.url });
      }
    }

  } catch (e) {
    console.error("Error fetching cached notices:", e);
  }
  return filteredNotices;
}

// 선택한 날짜의 공지 갯수 카운팅하는 함수
async function fetchNoticeCount(board, targetDateStr = null) {
  console.log('fetchNoticeCount called for board:', board.name, 'url:', board.url, 'targetDateStr:', targetDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let filterDate = today; // 기본값은 오늘
  if (targetDateStr) { // 날짜 선택 시
    filterDate = new Date(targetDateStr);
    filterDate.setHours(0, 0, 0, 0);
  }

  const notices = await crawlAndFilterNotices(board.url, filterDate);
  console.log('Notices count for', board.name, ':', notices.length);
  return notices.length; // 개수 반환
}

// 여러 게시판의 공지사항 개수를 가져와서 웹 페이지에 동적으로 렌더링하는 함수
async function renderNoticeList(dateString = null) {
  console.log('renderNoticeList called with dateString:', dateString);
  // 공지사항과 곰나루광장의 게시판 목록 요소 찾기
  const noticeBoardListContainer = document.querySelector('#notice-category-section .board-list');
  const gomnaruBoardListContainer = document.querySelector('#gomnaru-category-section .board-list');

  // 로딩 메시지 표시
  noticeBoardListContainer.innerHTML = '<p>로딩 중...</p>';
  gomnaruBoardListContainer.innerHTML = '<p>로딩 중...</p>';
 
  // 모든 게시판 요청을 병렬 처리하고 모두 완료할 때까지 기다림.
  const allCategoryPromises = window.CATEGORIES.map(async category => { // category: 공지사항, 곰나루 광장
    const fetchPromises = category.boards.map(async board => { // board: 학생소식, 행정소식 등
      console.log('Calling fetchNoticeCount for board:', board.name, 'url:', board.url);
      const noticeCount = await fetchNoticeCount(board, dateString); // noticeCount: 각 게시판 공지 갯수
      return { ...board, count: noticeCount }; // 원래 board 객체에 count 속성 추가해서 반환
    });
    const boardsWithDetails = await Promise.all(fetchPromises); 
    return { categoryName: category.name, boardsWithCounts: boardsWithDetails }; // 게시판 이름, 새공지 개수 반환
  });

  const allCategoryData = await Promise.all(allCategoryPromises); // 공지사항과 곰나루광장의 fetch 작업이 모두 끝나면 결과를 저장

  // 각 카테고리의 목록을 렌더링
  allCategoryData.forEach(categoryData => {
    const targetContainer = categoryData.categoryName === '공지사항' ? noticeBoardListContainer : gomnaruBoardListContainer;
    targetContainer.innerHTML = '';

    categoryData.boardsWithCounts.forEach((board, index) => {
      const item = document.createElement('a'); // <a> 생성
      item.className = 'notice-item';
      item.href = board.url; 
      item.target = '_blank';
      item.dataset.count = board.count; // 새 공지 개수를 data 속성으로 저장
      item.innerHTML = `
        <span class="notice-title">${board.name}</span>
        <span class="notice-count">${board.count}</span>  
      `;
      // 오늘 올라온 공지가 없는 경우 따로 CSS 처리하기 위함
      if (board.count === 0) {
        item.classList.add('inactive-notice-item');
      }
      item.style.opacity = '0'; // 애니메이션을 위해 초기에 보이지 않도록 설정
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