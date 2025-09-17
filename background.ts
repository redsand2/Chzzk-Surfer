export {};
interface MessageRequest {
  action: string;
  data: any;
}

interface MessageResponse {
  result: string;
  data?: any;
}

let run = false;
let selected_cateId : string[] = [];

let dis1 : CategoriesDataType[] = []; // 카테고리 자료 원본 박물관
let dis1_filter : CategoriesDataType[] = []; // 보고싶은 카테고리 자료만 추출
let live_list : CateSearchDataType[] = []; // 생방송 자료 원본 박물관
let live_list_filter : CateSearchDataType[] = []; // 최종

const now = () => new Date();
let do_time = now();
let last_time = 0;
let search_pct = 0;

// surfer와 통신
chrome.runtime.onMessage.addListener((message: MessageRequest, sender, sendResponse) => {
    if (message.action === 'stop') {
        run = false;
        sendResponse({status: 'received'});
    }
    if (message.action === 'surf') {
      ({ 
        last_time,
        selected_cateId
      } = message.data);
      console.log(last_time);
      sendResponse({status: 'received'});
      setTimeout(() => {
        FullSearch(last_time);
      }, 0);
    }
    return false;
});

// surfer 함수
type CategoryTypeType = 'ETC' | 'GAME' | 'SPORTS' | 'ENTERTAINMENT' // 카테고리 대분류
type CategoriesDataType = {
  categoryType : CategoryTypeType
  categoryValue : string
  categoryId : string
  concurrentUserCount : number
  openLiveCount : number
}
type CateSearchDataType = {
  adult: boolean
  categoryType: CategoryTypeType
  liveCategory: string
  liveCategoryValue: string
  channel: {
    channelId: string
    channelImageUrl: string
    channelName: string
  }
  concurrentUserCount: number
  liveTitle: string
  openDate: string // yyyy-mm-dd hh:mm:ss
  tags: string[]
  defaultThumbnailImageUrl: null | string
  liveImageUrl: string
  liveId: string // 식별용
};

// 특정 카테고리로 검색
async function searchCate(cateT:string, cate : string, t : number) {
  let run = true;
  let next = '';
  let rows : CateSearchDataType[] = [];
  while(t === last_time) {
    const url = `https://api.chzzk.naver.com/service/v2/categories/${cateT}/${cate}/lives${next}`;
    const data = await fetch(url, new AbortController);
    const data_j = await data.json();
    const data_c = data_j.content;
    if (data_c.size === 0) break;
    rows = rows.concat(data_c.data);
    if (data_c.data.length < 20) break;
    const data_n = data_c.page.next;

    next = `?concurrentUserCount=${String(data_n.concurrentUserCount)}&liveId=${String(data_n.liveId)}`
  }
  return rows;
}

// 카테고리 정보 불러오기
async function searchCates() {
  run = true;
  let next = '';
  let rows : CategoriesDataType[] = [];
  while(run) {
    const url =`https://api.chzzk.naver.com/service/v1/categories/live?${next}size=50`;
    const data = await fetch(url, new AbortController);
    const data_j = await data.json();
    const data_c = data_j.content;
    if (data_c.size === 0) break;
    rows = rows.concat(data_c.data);
    const data_n = data_c.page.next;
    if (data_c.data.length < 50) break;
    if (data_n) {
      next = `categoryId=${data_n.categoryId}&concurrentUserCount=${data_n.concurrentUserCount}&openLiveCount=${data_n.openLiveCount}&`;
    }
  }
  return rows;
}

async function FullSearch(t : number) {
    dis1 = await searchCates(); // 카테고리 정보 최신화
    sendRuntimeMessage('SendDataDis1', { dis1 }); // dom에 표시하기 위해 전송
    let data : CateSearchDataType[] = [];
    search_pct = 0;
    if (selected_cateId.length > 0) {
      let i = 0;
      for (const c of dis1) {
        if (selected_cateId.includes(c.categoryId)) {
          i++;
          data = data.concat(await searchCate(c.categoryType, c.categoryId, t));
          search_pct = Math.floor((i / selected_cateId.length) * 100);
          sendRuntimeMessage('pct', {pct: search_pct, runtimecode: last_time});
        }
      }
    } else {
      let i = 0;
      for (const c of dis1) {
        i++;
        data = data.concat(await searchCate(c.categoryType, c.categoryId, t));
        search_pct = Math.floor((i / dis1.length) * 100);
        sendRuntimeMessage('pct', {pct: search_pct, runtimecode: last_time});
      }
    }
    live_list = data;
    sendRuntimeMessage('SendDataLive_list', { live_list, runtimecode: last_time});
}

// background.ts에서 메시지 보내기
function sendRuntimeMessage(action : string, message : any) {
  chrome.runtime.sendMessage({ action, data: message }, (response) => {
    if (chrome.runtime.lastError) {
      return;
    }
  });
}