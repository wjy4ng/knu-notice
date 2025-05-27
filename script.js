// 여러 게시판 정보 배열 (예시)
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

// 각 게시판별 새 공지 개수 fetch (임시 랜덤)
async function fetchNoticeCount(board) {
  try {
    // 로컬 proxy.js 서버 URL로 변경
    const proxyUrl = `http://localhost:3001/proxy?url=${encodeURIComponent(board.url)}`;

    const res = await fetch(proxyUrl);
    const html = await res.text();
    console.log(`==== ${board.name} HTML ====`);
    console.log(html);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const dateCells = doc.querySelectorAll('tr:not(.notice) td.td-date');
    const now = new Date();
    let count = 0;

    dateCells.forEach(cell => {
      let dateStr = cell.textContent.trim();
      dateStr = dateStr.replace(/\./g, '-');
      const noticeDate = new Date(dateStr);
      if (
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

async function renderNoticeList() {
  const noticeBoardListContainer = document.querySelector('#notice-category-section .board-list');
  const gomnaruBoardListContainer = document.querySelector('#gomnaru-category-section .board-list');

  // 기존 목록 항목들을 초기화합니다.
  noticeBoardListContainer.innerHTML = '';
  gomnaruBoardListContainer.innerHTML = '';

  // 모든 카테고리에 대해 fetchNoticeCount 비동기 작업을 병렬로 시작하고 결과를 기다립니다.
  const allCategoryPromises = CATEGORIES.map(async category => {
    const fetchPromises = category.boards.map(async board => {
      const noticeCount = await fetchNoticeCount(board); // 모든 날짜 가져오기
      return { ...board, count: noticeCount }; // 계산된 개수와 모든 날짜 반환
    });
    const boardsWithDetails = await Promise.all(fetchPromises);
    return { categoryName: category.name, boardsWithCounts: boardsWithDetails };
  });

  const allCategoryData = await Promise.all(allCategoryPromises);

  // 모든 데이터를 가져왔으므로 이제 각 카테고리의 목록을 렌더링합니다.
  allCategoryData.forEach(categoryData => {
    const targetContainer = categoryData.categoryName === '공지사항' ? noticeBoardListContainer : gomnaruBoardListContainer;

    categoryData.boardsWithCounts.forEach((board, index) => {
      const item = document.createElement('a');
      item.className = 'notice-item';
      item.href = board.url;
      item.target = '_blank';
      item.dataset.count = board.count; // 필터링된 새 공지 개수를 data 속성으로 저장
      item.innerHTML = `
        <span class=\"notice-title\">${board.name}</span>
        <span class=\"notice-count\">${board.count}</span>  
      `;
      // 애니메이션 적용을 위해 opacity를 0으로 설정하고 DOM에 추가
      item.style.opacity = '0';
      targetContainer.appendChild(item);

      // 잠시 후 opacity를 1로 변경하여 애니메이션 트리거
      setTimeout(() => {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0)'; // translateY도 초기 위치로
        item.style.animation = `fadeIn 0.5s ease-out forwards`; // 애니메이션 적용
      }, 50 * index); // 각 항목마다 약간의 지연을 주어 순차적으로 나타나는 효과
    });
  });
}

// 미리보기 기능 구현
const previewArea = document.getElementById('preview-area');
let showPreviewTimer;
let hidePreviewTimer;

// 각 게시판 항목에 마우스 이벤트 리스너 추가
document.addEventListener('mouseover', async (event) => {
  const target = event.target.closest('.notice-item');
  if (!target) return; // .notice-item 요소가 아니면 무시

  const boardUrl = target.href; // 게시판 URL 가져오기
  const boardTitle = target.querySelector('.notice-title').textContent; // 게시판 제목 가져오기

  // 이미 미리보기가 표시되어 있으면 같은 항목인지 확인하고 아니면 중지
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

    // 새 공지 개수가 0이면 미리보기 표시 안 함
    if (noticeCount === 0) {
      previewArea.style.display = 'none';
      previewArea.dataset.url = ''; // URL 데이터 초기화
      return; // 함수 실행 중단
    }

    // 마우스 위치에 따라 미리보기 위치 설정 (fixed positioning 사용)
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const offsetX = 20; // 마우스 커서로부터 가로 오프셋
    const offsetY = 20; // 마우스 커서로부터 세로 오프셋

    // 미리보기 영역의 위치를 마우스 위치 기준으로 설정
    previewArea.style.left = `${mouseX + offsetX}px`;
    previewArea.style.top = `${mouseY + offsetY}px`;

    try {
      const proxyUrl = `http://localhost:3001/proxy?url=${encodeURIComponent(boardUrl)}`;
      const res = await fetch(proxyUrl);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 공지 제목을 파싱하는 셀렉터 (실제 웹 페이지 구조에 맞게 조정 필요)
      const noticeTitles = doc.querySelectorAll('td a');
      let previewContent = `<h3>${boardTitle}</h3><ul>`;
      const maxPreviews = Math.min(noticeCount, 5); // 새 공지 개수와 5 중 작은 값만큼 미리보기

      if (noticeTitles.length === 0) {
        previewContent += '<li>공지사항이 없습니다.</li>';
      } else {
        for (let i = 0; i < Math.min(noticeTitles.length, maxPreviews); i++) {
          const titleElement = noticeTitles[i];
          const title = titleElement.textContent.trim();
          // 필요하다면 링크도 포함: const link = titleElement.href;
          previewContent += `<li>${title}</li>`;
        }
      }
      previewContent += '</ul>';

      previewArea.innerHTML = previewContent;

    } catch (e) {
      previewArea.innerHTML = `<h3>${boardTitle}</h3><p>미리보기를 불러올 수 없습니다.</p>`;
      console.error('Failed to fetch preview:', e);
    }
  }, 500);
});

// 마우스가 게시판 항목 또는 미리보기 영역 밖으로 나갔을 때 미리보기 숨김
document.addEventListener('mouseout', (event) => {
  const target = event.target.closest('.notice-item');
  const relatedTarget = event.relatedTarget;
  const isLeavingToPreview = previewArea.contains(relatedTarget) || relatedTarget === previewArea;

  if (target && !isLeavingToPreview) {
    // 미리보기 표시 타이머가 있다면 취소
    clearTimeout(showPreviewTimer);
    // 미리보기 숨김 타이머 설정
    hidePreviewTimer = setTimeout(() => {
      previewArea.style.display = 'none';
      previewArea.dataset.url = ''; // URL 데이터 초기화
    }, 50); // 짧은 지연 (예: 50ms)
  }
});

previewArea.addEventListener('mouseleave', () => {
  // 미리보기 숨김 타이머 설정
  hidePreviewTimer = setTimeout(() => {
    previewArea.style.display = 'none';
    previewArea.dataset.url = ''; // URL 데이터 초기화
  }, 50); // 짧은 지연 (예: 50ms)
});

document.addEventListener('DOMContentLoaded', () => {
  renderNoticeList();
}); 