const now = () => new Date();
function RemakeData(d) {
    let n = {
        adult: d.live.adult,
        categoryType: d.categoryType,
        liveCategory: d.liveCategory,
        liveCategoryValue: d.liveCategoryValue,
        channel: d.channel,
        concurrentUserCount: d.live.concurrentUserCount,
        liveTitle: d.live.liveTitle,
        openDate: d.live.openDate,
        tags: d.live.tags,
        defaultThumbnailImageUrl: d.live.defaultThumbnailImageUrl,
        liveImageUrl: d.live.liveImageUrl,
        liveId: d.live.liveId
    };
    return n;
}
let isSaved = false;
let els;
let disReverse = false;
let adult = 'baby';
let tagSearchSw = false;
let mintime = 0;
let maxtime = Infinity;
let minview = 0;
let maxview = Infinity;
let intag = '';
let extag = '';
let intag_list = [];
let extag_list = [];
let pressTimer;
let isLongPress = false;
let pressStartTime = now().getTime();
let searchInput = "";
let dis1 = []; // 카테고리 자료 원본 박물관
let dis1_Type_ = {
    GAME: [],
    ETC: [],
    ENTERTAINMENT: [],
    SPORTS: []
};
let selected_cateId = []; // 선택된 카테고리 id
const color = {
    cate: {
        selected: 'rgb(33, 150, 243)',
        none: 'rgba(54, 54, 54, 1)'
    }
};
let dis1_filter = []; // 보고싶은 거만 보기
let live_list = []; // 생방송 자료 원본 박물관
let live_list_content = []; // 콘텐트에서 처리한 자료 원본 박물관
let live_list_fin = []; // 최종 보여줄 라이브
let scroll_offset = 0;
let scroll_offset_limit = 0;
let scroll_load = false;
let surfer_run = 'ready';
let do_time = now();
let last_time = now();
let search_pct = 0;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// 초기 실행
document.addEventListener('DOMContentLoaded', async () => {
    // dom 요소 불러오기
    DomUpdate();
    // 저장된 쿠키 불러오기. 없음말고
    if (getCookie('isSaved') === 'true') {
        isSaved = true;
        disReverse = getCookie('disReverse') === "true";
        if (isValueElement(els.adult)) {
            adult = getCookie('adult');
            els.adult.value = adult;
        }
        const selected_cateId_string = getCookie('selected_cateId_string');
        if (selected_cateId_string) {
            selected_cateId = selected_cateId_string.split(',,');
            if (selected_cateId.length > 1) {
                selected_cateId.pop();
            }
        }
        if (isValueElement(els.intag))
            els.intag.value = getCookie('intag');
        if (isValueElement(els.extag))
            els.extag.value = getCookie('extag');
        if ('checked' in els.tagSearchSw) {
            tagSearchSw = getCookie('tagSearchSw') === "true";
            els.tagSearchSw.checked = tagSearchSw;
        }
    }
    //초기 실행시 surf 작동
    do_time = now();
    inputScan();
    if (searchInput === '') {
        if (tagSearchSw && intag_list.length > 0) {
            miniSearch('tags', true);
        }
        else {
            surfer_run = 'BACKGROUND';
            sendToBackground({ action: 'stop' });
            sendToBackground({
                action: "surf",
                data: {
                    last_time: last_time.getTime(),
                    selected_cateId
                }
            });
        }
    }
    else {
        miniSearch(searchInput);
    }
    // 메인버튼 리스너
    els.searchActionButton?.addEventListener('click', () => {
        last_time = do_time;
        do_time = now();
        if ((Number(do_time) - Number(last_time)) < 100)
            return;
        inputScan();
        if (els.searchInput && isValueElement(els.searchInput)) {
            searchInput = els.searchInput.value.trim();
            if (searchInput === '') {
                if (tagSearchSw && intag_list.length > 0) {
                    miniSearch('tags', true);
                }
                else {
                    surfer_run = 'BACKGROUND';
                    sendToBackground({ action: 'stop' });
                    sendToBackground({
                        action: "surf",
                        data: {
                            last_time: last_time.getTime(),
                            selected_cateId
                        }
                    });
                }
            }
            else {
                miniSearch(searchInput);
            }
        }
    });
    // 카테고리 정렬 버튼 리스너
    if (els.viewBtn) {
        els.viewBtn.addEventListener('click', () => {
            disReverse = !disReverse;
            setCookie('disReverse', String(disReverse));
            inputScan();
            RenderStreams();
            // if (els.dis1 && 'value' in els.dis1){
            //   els.dis1.value = renderDis1(dis1);
            // }
        });
    }
    els.tagSearchSw.addEventListener('change', function (event) {
        if (event.target && 'checked' in event.target) {
            tagSearchSw = event.target.checked === true;
            setCookie('tagSearchSw', String(tagSearchSw));
            inputScan();
        }
    });
    els.adult.addEventListener('change', function (event) {
        if (isValueElement(this)) {
            if (this.value === 'baby' || this.value === 'adult' || this.value === 'only')
                adult = this.value;
            setCookie('adult', adult);
            inputScan();
        }
    });
    // background로부터 수신 받기
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message.action)
            return;
        if (message.action === "SendDataDis1") {
            dis1 = message.data.dis1;
            for (const c of dis1) {
                if (c.categoryType === 'GAME') {
                    dis1_Type_.GAME.push(c.categoryId);
                }
                if (c.categoryType === 'ETC') {
                    dis1_Type_.ETC.push(c.categoryId);
                }
                if (c.categoryType === 'ENTERTAINMENT') {
                    dis1_Type_.ENTERTAINMENT.push(c.categoryId);
                }
                if (c.categoryType === 'SPORTS') {
                    dis1_Type_.SPORTS.push(c.categoryId);
                }
            }
            RenderCateCheckbox(dis1);
        }
        if (message.action === "SendDataLive_list") {
            if (surfer_run === 'BACKGROUND' && last_time.getTime() === message.data.runtimecode) {
                live_list = message.data.live_list;
                inputScan();
                RenderStreams();
                els.ProgressBar.style.width = '100%';
            }
        }
        if (message.action === 'pct') {
            if (surfer_run === 'BACKGROUND' && last_time.getTime() === message.data.runtimecode) {
                search_pct = message.data.pct;
                els.ProgressBar.style.width = String(search_pct) + '%';
            }
        }
        return true; // 비동기 응답을 위해 true 반환
    });
    window.addEventListener('scroll', async function () {
        if (isScrolledToBottom() && scroll_offset < scroll_offset_limit && !scroll_load) {
            scroll_load = true;
            await RenderStreams(120, scroll_offset + 1);
            scroll_offset++;
            scroll_load = false;
        }
    });
    if (els.CateCheckboxContainer) {
        // 마우스가 textarea 위에 올라갔을 때 (mouseover 또는 mouseenter)
        els.CateCheckboxContainer.addEventListener('mouseenter', () => {
            // 스크롤 이벤트를 가로채고 상위 요소로 전파되는 것을 막음
            els.CateCheckboxContainer.addEventListener('wheel', preventPageScroll, { passive: false });
        });
        // 마우스가 textarea 밖으로 나갔을 때 (mouseleave 또는 mouseout)
        els.CateCheckboxContainer.addEventListener('mouseleave', () => {
            // 스크롤 이벤트 리스너 제거 (불필요한 동작 방지)
            els.CateCheckboxContainer.removeEventListener('wheel', preventPageScroll);
        });
    }
});
// ==========================================================================================
// 스크롤 제어
function preventPageScroll(e) {
    const isScrollable = (element) => element.scrollHeight > element.clientHeight;
    const isAtTop = (element) => element.scrollTop === 0;
    const isAtBottom = (element) => element.scrollHeight - element.clientHeight - element.scrollTop <= 1; // 1px 오차 허용
    const target = e.currentTarget;
    if (isScrollable(target)) {
        if (e.deltaY < 0 && isAtTop(target)) {
            e.preventDefault();
        }
        else if (e.deltaY > 0 && isAtBottom(target)) {
            e.preventDefault();
        }
    }
    else {
        e.preventDefault();
    }
    e.stopPropagation();
}
// 바닥 감지함수
function isScrolledToBottom(offset = 100) {
    return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - offset;
}
// ================ 쿠키 함수 ================
// 쿠키 저장 함수
function setCookie(name, value, expireDays = 7) {
    const date = now();
    date.setTime(date.getTime() + (expireDays * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}
// 쿠키 가져오기 함수
function getCookie(name) {
    const cookieName = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(cookieName) === 0) {
            return cookie.substring(cookieName.length, cookie.length);
        }
    }
    return "";
}
// 쿠키 삭제 함수
function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}
// ts 타입가드 런타임 함수
function isValueElement(element) {
    return element && typeof element === 'object' && 'value' in element;
}
// 키워드 검색
async function searchKeyword(keyword) {
    surfer_run = 'CONTENT';
    let offset = 0;
    let rows = [];
    while (true) {
        const url = `https://api.chzzk.naver.com/service/v1/search/lives?keyword=${encodeURIComponent(keyword)}&offset=${String(offset)}&size=50`;
        const data = await fetch(url, new AbortController);
        const data_j = await data.json();
        const data_c = data_j.content;
        if (data_c.size === 0)
            break;
        const data_d = data_c.data;
        rows = rows.concat(data_d);
        if (data_d.length < 50) {
            break;
        }
        offset += 50;
    }
    let new_rows = rows.map((row) => RemakeData(row));
    return new_rows;
}
// 태그 검색
async function searchTag(tag) {
    surfer_run = 'CONTENT';
    let next = '';
    let rows = [];
    while (true) {
        const url = `https://api.chzzk.naver.com/service/v1/tag/lives?${next}size=50&sortType=POPULAR&tags=${tag}`;
        const data = await fetch(url, new AbortController);
        const data_j = await data.json();
        const data_c = data_j.content;
        if (data_c.size === 0)
            break;
        rows = rows.concat(data_c.data);
        if (data_c.data.length < 50) {
            break;
        }
        const data_n = data_c.page.next;
        next = `concurrentUserCount=${String(data_n.concurrentUserCount)}&liveId=${String(data_n.liveId)}&`;
    }
    return rows;
}
// 입력값 스캔 및 쿠키저장
function inputScan() {
    isSaved = true;
    els = DomUpdate();
    setCookie('isSaved', 'true');
    if (isValueElement(els.intag)) {
        intag = els.intag.value;
        setCookie('intag', intag);
        intag_list = filtertolistMaker2(intag);
    }
    if (isValueElement(els.extag)) {
        extag = els.extag.value;
        setCookie('extag', extag);
        extag_list = filtertolistMaker2(extag);
    }
    if (isValueElement(els.mintime)) {
        mintime = inputtime(els.mintime.value, 0);
    }
    if (isValueElement(els.maxtime)) {
        maxtime = inputtime(els.maxtime.value, Infinity);
    }
    if (isValueElement(els.minview)) {
        minview = parseInt(els.minview.value) | 0;
    }
    if (isValueElement(els.maxview)) {
        maxview = parseInt(els.maxview.value) || Infinity;
    }
}
const regex0 = /^-?\d+$/;
const regex1 = /^\d+\.\d*$/;
const regexh0 = /^([01]?[0-9]|2[0-3])시(간)?$/;
const regexh1 = /^(\d+):$/;
const regexm0 = /^\d+분$/;
const regexhm0 = /^(\d+)(시간|시)((\d+)분)?$/;
const regexhm1 = /^(\d+):(\d+)?$/;
// 시간 입력값을 ms로 바꾸는 함수
function inputtime(time, temp = 0) {
    const t = removeSpaces(time);
    // 숫자만 있는지 체크하는 대신 패턴 매칭부터 시도
    if (regexh0.test(t)) {
        const match = t.match(regexh0);
        return Number(match?.[1] || 0) * 60 * 60 * 1000;
    }
    if (regexhm0.test(t)) {
        const mat = t.match(regexhm0);
        return (Number(mat?.[1] || 0) * 60 + Number(mat?.[4] || 0)) * 60 * 1000;
    }
    if (regexhm1.test(t)) {
        const mat = t.match(regexhm1);
        return (Number(mat?.[1] || 0) * 60 + Number(mat?.[2] || 0)) * 60 * 1000;
    }
    if (regexm0.test(t)) {
        const match = t.match(/^(\d+)분$/);
        return Number(match?.[1] || 0) * 60 * 1000;
    }
    if (regex0.test(t)) {
        return Number(t) * 60 * 1000;
    }
    if (regex1.test(t)) {
        return Number(t) * 60 * 60 * 1000;
    }
    // 숫자로만 구성된 경우
    if (!isNaN(Number(t)) && t.trim() !== '') {
        return Number(t) * 60 * 1000;
    }
    return temp;
}
function removeSpaces(str) {
    return str.replace(/\s+/g, '');
}
// 필터 적용해서 최종 렌더하는 함수
async function RenderStreams(n = 120, offset = 0) {
    const live_list_filter_sliced = live_list_filterMaker().slice(offset * n, (offset + 1) * n);
    last_time = do_time;
    do_time = now();
    const streams = document.createDocumentFragment();
    if (offset === 0) {
        els.Surfer.innerHTML = '';
        scroll_offset = 0;
    }
    for (const live of live_list_filter_sliced) {
        const li = document.createElement('li');
        li.className = 'stream' + live.liveId;
        // const box_background = document.createElement('div');
        // box_background.className = 'box_background';
        // box
        const box = document.createElement('div');
        box.className = 'box';
        box.dataset.action = 'navigate';
        box.dataset.url = `https://chzzk.naver.com/live/${live.channel.channelId}`;
        box.addEventListener('click', function () {
            chrome.tabs.create({
                url: this.dataset.url || '',
                active: true
            });
        });
        const img = document.createElement('img');
        img.className = 'img';
        img.src = live.defaultThumbnailImageUrl || live.liveImageUrl.replace("{type}", "480");
        img.alt = `${live.channel.channelName}님의 방송: ${live.liveTitle}`;
        img.dataset.load = '0';
        img.onerror = async function () {
            const load_n = Number(this.dataset.load) + 1;
            if (load_n > 20)
                this.onerror = null;
            await sleep(2000);
            img.src = live.defaultThumbnailImageUrl || live.liveImageUrl.replace("{type}", "480");
            this.dataset.load = String(load_n);
        };
        const view = document.createElement('div');
        view.className = 'view';
        view.textContent = String(live.concurrentUserCount) + '명';
        const time = document.createElement('div');
        time.className = 'time';
        time.textContent = msToHHMMSS(do_time.getTime() - new Date(live.openDate).getTime());
        box.append(img, view, time);
        // box
        // info
        const info = document.createElement('info');
        info.className = 'info';
        const img2 = document.createElement('img');
        img2.className = 'img2';
        img2.src = live.channel.channelImageUrl || 'https://ssl.pstatic.net/cmstatic/nng/img/img_anonymous_square_gray_opacity2x.png';
        img2.alt = `${live.channel.channelName}님의 치지직 프로필사진`;
        img2.dataset.action = 'navigate';
        img2.dataset.url = `https://chzzk.naver.com/${live.channel.channelId}`;
        img2.addEventListener('click', function () {
            chrome.tabs.create({
                url: this.dataset.url || '',
                active: true
            });
        });
        const nick = document.createElement('div');
        nick.className = 'nick';
        nick.textContent = live.channel.channelName;
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = live.liveTitle.replace(/\n/g, '').trim();
        const tags = document.createElement('div');
        tags.className = 'tags';
        for (const t of live.tags) {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = t;
            tag.addEventListener('mousedown', function (e) {
                pressStartTime = now().getTime();
                tag.classList.add('changing');
                pressTimer = setTimeout(function () {
                    isLongPress = true;
                    if (isValueElement(els.extag)) {
                        const intag_list_temp = els.extag.value.split(',').map(t => t.replace(/\s/g, ''));
                        if (!(intag_list_temp.includes(t))) {
                            els.extag.value = t + ', ' + els.extag.value;
                        }
                    }
                }, 500);
            });
            // 마우스 버튼을 떼면 타이머 취소 및 짧은 클릭 확인
            tag.addEventListener('mouseup', function (e) {
                clearTimeout(pressTimer);
                tag.classList.remove('changing');
                const pressDuration = now().getTime() - pressStartTime;
                if (pressDuration < 2000 && !isLongPress) {
                    if (isValueElement(els.intag)) {
                        const intag_list_temp = els.intag.value.split(',').map(t => t.replace(/\s/g, ''));
                        if (!(intag_list_temp.includes(t))) {
                            els.intag.value = t + ', ' + els.intag.value;
                        }
                    }
                }
                isLongPress = false;
            });
            tags.append(tag);
        }
        info.append(img2, nick, title, tags);
        // info
        li.append(box, info); // 필요하면 box_background 추가하셈
        streams.appendChild(li);
    }
    els.Surfer.appendChild(streams);
}
function msToHHMMSS(ms) {
    let totalSeconds = Math.floor(ms * 0.001);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    let hours_ = hours.toString().padStart(2, '0');
    let minutes_ = minutes.toString().padStart(2, '0');
    let seconds_ = seconds.toString().padStart(2, '0');
    return `${hours_}:${minutes_}:${seconds_}`;
}
function sendToBackground(message) {
    chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
            return;
        }
    });
}
function live_list_filterMaker(q = "") {
    let live_list_up = [];
    if (surfer_run === 'BACKGROUND') {
        live_list_up = live_list;
    }
    if (surfer_run === 'CONTENT') {
        live_list_up = live_list_content;
    }
    dis1_filter = [];
    let cate_fixed_live_list = [];
    // 카테고리 검색 필터
    if (selected_cateId.length > 0) {
        for (const c of selected_cateId) {
            for (const l of live_list_up) {
                if (l.liveCategory === c) {
                    cate_fixed_live_list.push(l);
                }
            }
        }
    }
    else {
        cate_fixed_live_list = live_list_up;
    }
    // 태그 검색 필터
    let tag_fixed_live_list = [];
    if (tagSearchSw) {
        for (const l of cate_fixed_live_list) {
            let tagIn_e = null;
            for (const lt of l.tags) {
                for (const t of intag_list) {
                    if (lt === t) {
                        tagIn_e = l;
                    }
                }
            }
            for (const lt of l.tags) {
                for (const t of extag_list) {
                    if (lt === t) {
                        tagIn_e = null;
                    }
                }
            }
            if (tagIn_e) {
                tag_fixed_live_list.push(l);
            }
        }
    }
    else {
        tag_fixed_live_list = cate_fixed_live_list;
    }
    // 19 검색 필터
    let adult_fixed_live_list = [];
    if (adult === 'baby' || adult === 'only') {
        const adult_filter = adult === 'only';
        for (const l of tag_fixed_live_list) {
            if (l.adult === adult_filter) {
                adult_fixed_live_list.push(l);
            }
        }
    }
    else {
        adult_fixed_live_list = tag_fixed_live_list;
    }
    // 방송시간 필터
    let time_fixed_live_list = [];
    if (mintime === 0 && maxtime === Infinity) {
        time_fixed_live_list = adult_fixed_live_list;
    }
    else {
        for (const l of adult_fixed_live_list) {
            const lt = do_time.getTime() - new Date(l.openDate).getTime();
            if (lt > mintime && lt < maxtime) {
                time_fixed_live_list.push(l);
            }
        }
    }
    let view_fixed_live_list = [];
    if (minview === 0 && maxview === Infinity) {
        view_fixed_live_list = time_fixed_live_list;
    }
    else {
        for (const l of time_fixed_live_list) {
            const lv = l.concurrentUserCount;
            if (lv >= minview && lv <= maxview) {
                view_fixed_live_list.push(l);
            }
        }
    }
    let sort_fixed_live_list = [];
    if (disReverse) {
        sort_fixed_live_list = [...view_fixed_live_list].sort((a, b) => a.concurrentUserCount - b.concurrentUserCount);
    }
    else {
        sort_fixed_live_list = [...view_fixed_live_list].sort((a, b) => b.concurrentUserCount - a.concurrentUserCount);
    }
    if (sort_fixed_live_list.length > 0) {
        scroll_offset_limit = Math.trunc(sort_fixed_live_list.length / 120);
    }
    return sort_fixed_live_list;
}
async function miniSearch(query, tag = false) {
    dis1 = await searchCates(); // content에서 카테고리 서치
    for (const c of dis1) {
        if (c.categoryType === 'GAME') {
            dis1_Type_.GAME.push(c.categoryId);
        }
        if (c.categoryType === 'ETC') {
            dis1_Type_.ETC.push(c.categoryId);
        }
        if (c.categoryType === 'ENTERTAINMENT') {
            dis1_Type_.ENTERTAINMENT.push(c.categoryId);
        }
        if (c.categoryType === 'SPORTS') {
            dis1_Type_.SPORTS.push(c.categoryId);
        }
    }
    RenderCateCheckbox(dis1);
    if (tag) {
        live_list_content = [];
        for (const t of intag_list) {
            const add_list_tags = await searchTag(t);
            for (const l of add_list_tags) {
                let cross_live = false;
                for (const ll of live_list_content) {
                    if (l.liveId === ll.liveId) {
                        cross_live = true;
                    }
                }
                if (!cross_live) {
                    live_list_content.push(l);
                }
            }
        }
    }
    else {
        live_list_content = await searchKeyword(query);
    }
    RenderStreams();
}
// 카테고리 정보 불러오기
async function searchCates() {
    let next = '';
    let rows = [];
    while (true) {
        const url = `https://api.chzzk.naver.com/service/v1/categories/live?${next}size=50`;
        const data = await fetch(url, new AbortController);
        const data_j = await data.json();
        const data_c = data_j.content;
        if (data_c.size === 0)
            break;
        rows = rows.concat(data_c.data);
        const data_n = data_c.page.next;
        if (data_c.data.length < 50)
            break;
        if (data_n) {
            next = `categoryId=${data_n.categoryId}&concurrentUserCount=${data_n.concurrentUserCount}&openLiveCount=${data_n.openLiveCount}&`;
        }
    }
    return rows;
}
function DomUpdate() {
    els = {
        searchActionButton: document.getElementById('searchActionButton'),
        viewBtn: document.getElementById('viewBtn'),
        searchInput: document.getElementById('searchInput'),
        intag: document.getElementById('intag'),
        extag: document.getElementById('extag'),
        mintime: document.getElementById('mintime'),
        maxtime: document.getElementById('maxtime'),
        minview: document.getElementById('minview'),
        maxview: document.getElementById('maxview'),
        adult: document.getElementById('adult'),
        tagSearchSw: document.getElementById('tagSearchSw'),
        ProgressBar: document.getElementById('ProgressBar'),
        Surfer: document.getElementById('Surfer'),
        CateCheckboxContainer: document.getElementById('CateCheckboxContainer'),
    };
    return els;
}
// 태그 입력값 array로 변환
function filtertolistMaker2(i) {
    let r = [];
    const arr = i.split(',');
    for (const a of arr) {
        const b = a.trim();
        if (b) {
            r.push(b);
        }
    }
    r = [...new Set(r)];
    return r;
}
function RenderCateCheckbox(dis1) {
    const CateCheckboxs = document.createDocumentFragment();
    els.CateCheckboxContainer.innerHTML = '';
    const viewdata = { 전체: 0, 게임: 0, 기타: 0, 엔터테이먼트: 0, 스포츠: 0 };
    for (const c of dis1) {
        if (c.categoryType === 'GAME') {
            viewdata.게임 += c.openLiveCount;
        }
        if (c.categoryType === 'ETC') {
            viewdata.기타 += c.openLiveCount;
        }
        if (c.categoryType === 'ENTERTAINMENT') {
            viewdata.엔터테이먼트 += c.openLiveCount;
        }
        if (c.categoryType === 'SPORTS') {
            viewdata.스포츠 += c.openLiveCount;
        }
    }
    viewdata.전체 = viewdata.게임 + viewdata.기타 + viewdata.엔터테이먼트 + viewdata.스포츠;
    const CatetypeK = ['전체', '게임', '기타', '엔터테이먼트', '스포츠'];
    const Catetype = [
        {
            k: CatetypeK[0],
            view: viewdata.전체,
            id: 'ALL'
        },
        {
            k: CatetypeK[1],
            view: viewdata.게임,
            id: 'GAME'
        },
        {
            k: CatetypeK[2],
            view: viewdata.기타,
            id: 'ETC'
        },
        {
            k: CatetypeK[3],
            view: viewdata.엔터테이먼트,
            id: 'ENTERTAINMENT'
        },
        {
            k: CatetypeK[4],
            view: viewdata.스포츠,
            id: 'SPORTS'
        },
    ];
    for (const c of Catetype) {
        const li = document.createElement('li');
        li.className = 'CategoryCheck';
        const btn = document.createElement('button');
        btn.id = 'CategoryBtn-' + c.k;
        btn.className = 'category-button';
        btn.style.backgroundColor = (selected_cateId.indexOf(c.id) > -1) ? color.cate.selected : color.cate.none;
        btn.textContent = `${c.k} [${c.view}]`;
        btn.addEventListener('click', function () {
            if (c.id === 'ALL') {
                if (this.style.backgroundColor === color.cate.selected) {
                    this.style.backgroundColor = color.cate.none;
                    selected_cateId = [];
                }
                else {
                    this.style.backgroundColor = color.cate.selected;
                    selected_cateId = ['ALL', 'GAME', 'ETC', 'ENTERTAINMENT', 'SPORTS'];
                    for (const cc of dis1) {
                        selected_cateId.push(cc.categoryId);
                    }
                }
            }
            else if (this.style.backgroundColor === color.cate.selected) {
                this.style.backgroundColor = color.cate.none;
                const type_ex_a = ['GAME', 'ETC', 'ENTERTAINMENT', 'SPORTS'];
                for (const type_ex of type_ex_a) {
                    if (c.id === type_ex) {
                        for (const cc of dis1_Type_[type_ex]) {
                            const cci = selected_cateId.indexOf(cc);
                            if (cci > -1) {
                                selected_cateId.splice(cci, 1);
                            }
                        }
                        const type_i = selected_cateId.indexOf(type_ex);
                        if (type_i > -1) {
                            selected_cateId.splice(type_i, 1);
                        }
                    }
                }
            }
            else {
                this.style.backgroundColor = color.cate.selected;
                const type_ex_a = ['GAME', 'ETC', 'ENTERTAINMENT', 'SPORTS'];
                for (const type_ex of type_ex_a) {
                    if (c.id === type_ex) {
                        selected_cateId.push(type_ex);
                        selected_cateId = selected_cateId.concat(dis1_Type_[type_ex]);
                    }
                }
                selected_cateId = [...new Set(selected_cateId)];
            }
            try {
                selected_cateId_CookieSave();
            }
            catch { }
            return RenderCateCheckbox(dis1);
        });
        li.append(btn);
        CateCheckboxs.appendChild(li);
    }
    for (const c of dis1) {
        const li = document.createElement('li');
        li.className = 'CategoryCheck';
        const btn = document.createElement('button');
        btn.id = 'CategoryBtn-' + c.categoryId;
        btn.className = 'category-button';
        btn.style.backgroundColor = (selected_cateId.indexOf(c.categoryId) > -1) ? color.cate.selected : color.cate.none;
        btn.textContent = `${c.categoryValue} [${c.openLiveCount}]`;
        btn.addEventListener('click', function () {
            if (this.style.backgroundColor === color.cate.selected) {
                this.style.backgroundColor = color.cate.none;
                const delete_index = selected_cateId.indexOf(c.categoryId);
                if (delete_index > -1) {
                    selected_cateId.splice(delete_index, 1);
                }
            }
            else {
                this.style.backgroundColor = color.cate.selected;
                selected_cateId.push(c.categoryId);
                selected_cateId = [...selected_cateId];
            }
            selected_cateId_CookieSave();
        });
        li.append(btn);
        CateCheckboxs.appendChild(li);
    }
    els.CateCheckboxContainer.appendChild(CateCheckboxs);
}
function selected_cateId_CookieSave() {
    let id_s = '';
    for (const ci of selected_cateId) {
        id_s += ci + ',,';
    }
    setCookie('selected_cateId_string', id_s);
}
export {};
