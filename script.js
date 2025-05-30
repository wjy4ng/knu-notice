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

/*

각 게시판 별 공지를 fetch하여 가져오는 함수
1. 학교 홈페이지 공지사항 url을 웹 크롤링
2. html 문자열을 파싱하여 문서로 전환
3. html 문서에서 날짜를 추출
4. 날짜 형식 포맷 후, 오늘 올라온 공지 갯수 카운팅

*/
async function fetchNoticeCount(board) {
  try {
    const proxyUrl = `/proxy?url=${encodeURIComponent(board.url)}`; // url을 인코딩하여 파라미터로 변환시켜 백엔드 /proxy에 외부 url을 담음.
    const res = await fetch(proxyUrl); // 외부사이트인 proxyUrl로 요청을 보냄
    const html = await res.text(); // 응답을 html 문자열로 받아옴
    
    console.log(`==== ${board.name} HTML ====`); // 디버깅
    // console.log(html);

    const parser = new DOMParser(); // html 문자열을 파싱하기 위한 객체 생성
    const doc = parser.parseFromString(html, 'text/html'); // html 문자열을 HTML 문서로 변환
    const dateCells = doc.querySelectorAll('tr:not(.notice) td.td-date'); // 공지사항 고정 게시글의 class인 notice를 제외한 일반글의 날짜셀을 모두 선택
    const now = new Date();
    let count = 0;

    dateCells.forEach(cell => { // 선택된 날짜셀들을 하나씩 반복
      let dateStr = cell.textContent.trim(); // 날짜 추출 ex: "2025.05.30"
      dateStr = dateStr.replace(/\./g, '-'); // 날짜의 모든 .을 -로 변환 ex: "2025-05-30"
      const noticeDate = new Date(dateStr); // 날짜 문자열을 Date 객체로 변환
      if ( // 오늘 올라온 공지 갯수 카운트
        noticeDate.getFullYear() === now.getFullYear() &&
        noticeDate.getMonth() === now.getMonth() &&
        noticeDate.getDate() === now.getDate()
      ) {
        count++;
      }
    });

    return count; // 개수 반환
  } catch (e) {
    return 0; // 에러 발생 시 0 반환
  }
}

/*

여러 게시판의 공지사항 개수를 가져와서 웹 페이지에 동적으로 렌더링하는 함수
1. 공지사항와 곰나루광장의 새 공지 갯수를 입력
2. 각 카테고리에 렌더링
3. 띄울 때 애니메이션 적용

*/
async function renderNoticeList() {
  // 공지사항과 곰나루광장의 게시판 목록 요소 찾기
  const noticeBoardListContainer = document.querySelector('#notice-category-section .board-list');
  const gomnaruBoardListContainer = document.querySelector('#gomnaru-category-section .board-list');

  // 기존 목록 항목들을 초기화
  noticeBoardListContainer.innerHTML = '';
  gomnaruBoardListContainer.innerHTML = '';

  // 모든 게시판 요청을 병렬 처리하고 모두 완료할 때까지 기다림.
  const allCategoryPromises = CATEGORIES.map(async category => { // ex: 공지사항, 곰나루 광장
    const fetchPromises = category.boards.map(async board => { // ex: 학생소식, 행정소식, 행사안내, 채용소식
      const noticeCount = await fetchNoticeCount(board); // 각 게시판의 당일 공지 카운트
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
      const proxyUrl = `/proxy?url=${encodeURIComponent(boardUrl)}`;
      const res = await fetch(proxyUrl);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 공지 목록을 파싱하고 오늘 날짜 공지만 필터링
      const noticeRows = doc.querySelectorAll('tr:not(.notice)'); // 고정 공지 제외
      const today = new Date();
      today.setHours(0, 0, 0, 0); // 날짜만 비교하기 위해 시간을 초기화 

      const todayNotices = []; // 오늘 날짜 공지 미리보기 목록

      noticeRows.forEach(row => {
        const dateCell = row.querySelector('.td-date'); // 공지 날짜 추출
        const titleElement = row.querySelector('td a'); // 제목 링크 추출

        if (dateCell && titleElement) {
          let dateStr = dateCell.textContent.trim();
          // 날짜 형식을 yyyy-mm-dd로 변환
          dateStr = dateStr.replace(/\./g, '-');
          const noticeDate = new Date(dateStr);

          // 날짜만 비교
          if (noticeDate.getFullYear() === today.getFullYear() &&
              noticeDate.getMonth() === today.getMonth() &&
              noticeDate.getDate() === today.getDate()) {
            todayNotices.push({ title: titleElement.textContent.trim(), url: titleElement.href });
          }
        }
      });

      let previewContent = `<h3>${boardTitle}</h3><ul>`;
      const maxPreviews = 5; // 미리보기 최대 5개만 표시

      // 미리보기 갯수가 5개보다 많으면 5개만 표시
      for (let i = 0; i < Math.min(todayNotices.length, maxPreviews); i++) {
        const notice = todayNotices[i];
        previewContent += `<li>${notice.title}</li>`;
      }
      previewContent += '</ul>';
      previewArea.innerHTML = previewContent;
    } catch (e) {
      previewArea.innerHTML = `<h3>${boardTitle}</h3><p>미리보기를 불러올 수 없습니다.</p>`;
      console.error('Failed to fetch preview:', e);
    }
  }, 500); // 미리보기가 0.5초 뒤에 나오도록 표시 (오류 방지)
});

// 마우스가 게시판 영역 밖으로 나갔을 때 미리보기 숨김
document.addEventListener('mouseout', (event) => {
  const target = event.target.closest('.notice-item');
  const relatedTarget = event.relatedTarget; // 마우스가 향하고 있는 새로운 요소
  const isLeavingToPreview = previewArea.contains(relatedTarget) || relatedTarget === previewArea; // 마우스가 영역에 있으면 True, 벗어나면 False

  if (target && !isLeavingToPreview) { // 마우스가 영역 밖으로 이동했을 때
    clearTimeout(showPreviewTimer); // 띄우려고 대기 중인 타이머가 있다면 초기화
    // 미리보기 숨김 타이머 설정
    hidePreviewTimer = setTimeout(() => {
      previewArea.style.display = 'none';
      previewArea.dataset.url = ''; // URL 데이터 초기화
    }, 50); // 0.05초
  }
});

// 마우스가 영역 밖으로 나가면
previewArea.addEventListener('mouseleave', () => {
  // 미리보기 숨김 타이머 설정
  hidePreviewTimer = setTimeout(() => {
    previewArea.style.display = 'none';
    previewArea.dataset.url = ''; // URL 데이터 초기화
  }, 50); // 0.05초
});

// 문서의 모든 요소가 load 되었을 때, 즉 DOM이 완성되었을 때
document.addEventListener('DOMContentLoaded', () => {
  renderNoticeList(); // 화면에 공지사항 표시
});