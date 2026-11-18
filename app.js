/**
 * 나이스 급식 알리미 (NEIS School Meals & Allergy Highlight App)
 * 
 * - NEIS API KEY: 542d16543cef47afa8cab5704a845e12
 * - 교육부 19종 표준 알레르기 유발 물질 실시간 필터 및 강렬한 빨간색 강조
 */

// ========================================================
// 1. 상수 및 설정 정의
// ========================================================
const CONFIG = {
  API_KEY: '542d16543cef47afa8cab5704a845e12',
  BASE_URL: 'https://open.neis.go.kr/hub',
  DEFAULT_SCHOOL: {
    officeCode: 'B10',
    schoolCode: '7010057',
    schoolName: '서울고등학교',
    officeName: '서울특별시교육청',
    schoolType: '고등학교',
    address: '서울특별시 서초구 효령로 218'
  },
  STORAGE_KEYS: {
    SAVED_SCHOOL: 'neis_meal_school',
    SAVED_ALLERGIES: 'neis_meal_allergies',
    RECENT_SCHOOLS: 'neis_meal_recent_schools'
  }
};

// 나이스 교육부 표준 19종 알레르기 유발물질 정의
const ALLERGEN_LIST = [
  { code: 1, name: '난류(달걀)', shortName: '난류', icon: '🥚', keywords: ['달걀', '계란', '난류', '메추리알'] },
  { code: 2, name: '우유', shortName: '우유', icon: '🥛', keywords: ['우유', '치즈', '버터', '유제품', '생크림', '연유'] },
  { code: 3, name: '메밀', shortName: '메밀', icon: '🍜', keywords: ['메밀', '모밀'] },
  { code: 4, name: '땅콩', shortName: '땅콩', icon: '🥜', keywords: ['땅콩', '피넛'] },
  { code: 5, name: '대두(콩)', shortName: '대두', icon: '🫘', keywords: ['대두', '콩', '두부', '된장', '간장', '유부'] },
  { code: 6, name: '밀(밀가루)', shortName: '밀', icon: '🌾', keywords: ['밀', '밀가루', '소면', '국수', '스파게티', '파스타', '빵', '만두', '튀김'] },
  { code: 7, name: '고등어', shortName: '고등어', icon: '🐟', keywords: ['고등어'] },
  { code: 8, name: '게', shortName: '게', icon: '🦀', keywords: ['게', '꽃게', '크랩'] },
  { code: 9, name: '새우', shortName: '새우', icon: '🦐', keywords: ['새우', '칵테일새우', '건새우'] },
  { code: 10, name: '돼지고기', shortName: '돼지고기', icon: '🥩', keywords: ['돼지고기', '돈육', '삼겹살', '제육', '돼지', '햄', '베이컨', '소시지'] },
  { code: 11, name: '복숭아', shortName: '복숭아', icon: '🍑', keywords: ['복숭아'] },
  { code: 12, name: '토마토', shortName: '토마토', icon: '🍅', keywords: ['토마토', '케첩'] },
  { code: 13, name: '아황산류', shortName: '아황산류', icon: '🍷', keywords: ['아황산', '건포도', '건과일'] },
  { code: 14, name: '호두', shortName: '호두', icon: '🌰', keywords: ['호두', '월넛'] },
  { code: 15, name: '닭고기', shortName: '닭고기', icon: '🍗', keywords: ['닭고기', '닭', '치킨', '계육', '닭가슴살', '닭다리'] },
  { code: 16, name: '쇠고기(소고기)', shortName: '쇠고기', icon: '🥩', keywords: ['쇠고기', '소고기', '우육', '한우', '불고기'] },
  { code: 17, name: '오징어', shortName: '오징어', icon: '🦑', keywords: ['오징어', '한치'] },
  { code: 18, name: '조개류(굴/전복/홍합)', shortName: '조개류', icon: '🦪', keywords: ['조개', '굴', '전복', '홍합', '바지락', '꼬막', '재첩', '가리비'] },
  { code: 19, name: '잣', shortName: '잣', icon: '🌲', keywords: ['잣'] }
];

// 자주 발생하는 주요 6대 알레르기 코드 (계란, 우유, 밀, 대두, 땅콩, 호두)
const COMMON_ALLERGIES = [1, 2, 4, 5, 6, 14];

// ========================================================
// 2. 애플리케이션 상태 (State)
// ========================================================
const state = {
  currentSchool: null,
  currentDate: new Date(), // 기본 오늘
  selectedAllergies: new Set(), // Set of codes (numbers 1~19)
  currentMealTypeFilter: 'ALL', // 'ALL', '1' (조식), '2' (중식), '3' (석식)
  currentView: 'daily', // 'daily' or 'weekly'
  dailyMealsData: [],
  weeklyMealsData: {},
  recentSchools: [],
  isOfflineFallback: false
};

// ========================================================
// 3. 헬퍼 유틸리티 함수
// ========================================================
// 날짜를 YYYY-MM-DD 문자열로 변환
function formatDateToISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 날짜를 YYYYMMDD (나이스 API 파라미터 규격)로 변환
function formatDateToYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// 날짜를 한국어 요일 포함 문자열로 포맷 (예: 2026년 11월 18일 (수))
function formatDateToKorean(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dayName = days[date.getDay()];
  return `${y}년 ${m}월 ${d}일 (${dayName})`;
}

// 해당 주의 월요일과 금요일 계산
function getWeekRange(date) {
  const curr = new Date(date);
  const day = curr.getDay(); // 0(일) ~ 6(토)
  
  // 월요일 계산 (일요일이면 6일 전, 월요일이면 0, 화~토는 day - 1)
  const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diffToMonday));
  
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return { monday, friday };
}

// HTML 특수문자 및 태그 제거
function sanitizeHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

// ========================================================
// 4. 나이스 메뉴 파싱 & 알레르기 분석 로직
// ========================================================
/**
 * 나이스 API 요리명 문자열에서 개별 요리명과 알레르기 번호 추출
 * 예: "쇠고기미역국 (5.6.16.)<br/>매콤돼지갈비찜 (5.6.10.)<br/>계란말이 (1.5.)"
 */
function parseMealDishes(ddishHtml) {
  if (!ddishHtml) return [];

  // <br/>, <br>, \n 단위로 요리 분리
  const rawLines = ddishHtml.split(/<br\s*[\/]?>|\n/gi);
  const dishes = [];

  for (let rawLine of rawLines) {
    let line = sanitizeHtml(rawLine).trim();
    if (!line) continue;

    // 특수문자 정리 (일부 학교의 * # @ 기호 등)
    line = line.replace(/[*#@]/g, '').trim();

    // 알레르기 번호 패턴 추출: (1.5.6.) 또는 [1.5.6] 또는 ( 1 . 5 . ) 등
    let allergenCodes = [];
    let cleanDishName = line;

    const match = line.match(/[\(\[]([0-9.\s,]+)[\)\]]/);
    if (match) {
      const codeString = match[1];
      // 숫자들 추출
      const numbers = codeString.match(/\b\d+\b/g) || [];
      allergenCodes = numbers
        .map(n => parseInt(n, 10))
        .filter(n => n >= 1 && n <= 19);

      // 요리명에서 알레르기 괄호 제거
      cleanDishName = line.replace(/[\(\[][0-9.\s,]+[\)\]]/g, '').trim();
    }

    dishes.push({
      originalText: line,
      name: cleanDishName,
      allergenCodes: [...new Set(allergenCodes)]
    });
  }

  return dishes;
}

/**
 * 개별 요리가 사용자가 선택한 알레르기 성분을 포함하는지 판별
 * @returns {Object} { hasAlert: boolean, matchedAllergens: Array, matchedKeywords: Array }
 */
function checkDishAllergens(dish, selectedAllergySet) {
  if (!selectedAllergySet || selectedAllergySet.size === 0) {
    return { hasAlert: false, matchedAllergens: [] };
  }

  const matched = [];

  // 1. 공식 알레르기 번호 매칭 (1차 우선 검증)
  for (const code of dish.allergenCodes) {
    if (selectedAllergySet.has(code)) {
      const allergen = ALLERGEN_LIST.find(a => a.code === code);
      if (allergen && !matched.some(m => m.code === code)) {
        matched.push(allergen);
      }
    }
  }

  // 2. 키워드 보조 검증 (학교에서 알레르기 번호를 누락했거나 텍스트로만 기재된 경우 대비)
  for (const code of selectedAllergySet) {
    const allergen = ALLERGEN_LIST.find(a => a.code === code);
    if (!allergen) continue;

    // 이미 번호로 매칭되었으면 패스
    if (matched.some(m => m.code === code)) continue;

    // 키워드 검사 (예: 요리명에 "계란", "우유", "두부" 등이 포함되었는지 확인)
    const hasKeyword = allergen.keywords.some(kw => dish.name.includes(kw));
    if (hasKeyword) {
      matched.push({
        ...allergen,
        byKeyword: true
      });
    }
  }

  return {
    hasAlert: matched.length > 0,
    matchedAllergens: matched
  };
}

// ========================================================
// 5. 나이스(NEIS) 오픈 API 통신
// ========================================================

/**
 * 학교 검색 API 호출
 */
async function searchSchoolsFromNeis(schoolName) {
  const url = `${CONFIG.BASE_URL}/schoolInfo?KEY=${CONFIG.API_KEY}&Type=json&pIndex=1&pSize=20&SCHUL_NM=${encodeURIComponent(schoolName)}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();

    if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
      return [];
    }

    if (data.schoolInfo && data.schoolInfo[1] && data.schoolInfo[1].row) {
      return data.schoolInfo[1].row.map(item => ({
        officeCode: item.ATPT_OFCDC_SC_CODE,
        officeName: item.ATPT_OFCDC_SC_NM,
        schoolCode: item.SD_SCHUL_CODE,
        schoolName: item.SCHUL_NM,
        schoolType: item.SCHUL_KND_SC_NM,
        address: item.ORG_RDNMA || item.ORG_RDNDA || '주소 정보 없음'
      }));
    }

    return [];
  } catch (error) {
    console.warn('학교 검색 API 실패 또는 네트워크 오류:', error);
    // 오프라인 / 샌드박스 환경 대비 로컬 샘플 검색 지원
    return getSampleSchoolList(schoolName);
  }
}

/**
 * 급식 식단 정보 API 호출 (일간/범위)
 */
async function fetchMealDietFromNeis(school, fromYmd, toYmd) {
  let url = `${CONFIG.BASE_URL}/mealServiceDietInfo?KEY=${CONFIG.API_KEY}&Type=json&pIndex=1&pSize=100&ATPT_OFCDC_SC_CODE=${school.officeCode}&SD_SCHUL_CODE=${school.schoolCode}`;
  
  if (fromYmd === toYmd) {
    url += `&MLSV_YMD=${fromYmd}`;
  } else {
    url += `&MLSV_FROM_YMD=${fromYmd}&MLSV_TO_YMD=${toYmd}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const data = await res.json();

    if (data.mealServiceDietInfo && data.mealServiceDietInfo[1] && data.mealServiceDietInfo[1].row) {
      return data.mealServiceDietInfo[1].row;
    }

    // 데이터가 없는 경우 (주말, 공휴일, 방학 등)
    return [];
  } catch (error) {
    console.warn('급식 API 호출 실패 또는 오프라인 환경:', error);
    state.isOfflineFallback = true;
    return getSampleMealData(fromYmd, toYmd);
  }
}

// ========================================================
// 6. UI 렌더링 함수들
// ========================================================

/**
 * 19종 알레르기 체크박스 그리드 생성
 */
function renderAllergyCheckboxes() {
  const container = document.getElementById('allergyCheckboxGrid');
  if (!container) return;

  container.innerHTML = ALLERGEN_LIST.map(item => {
    const isChecked = state.selectedAllergies.has(item.code);
    return `
      <label class="allergy-item ${isChecked ? 'checked' : ''}" data-code="${item.code}">
        <input type="checkbox" value="${item.code}" ${isChecked ? 'checked' : ''}>
        <span class="allergy-icon">${item.icon}</span>
        <div class="allergy-label">
          <span class="allergy-name">${item.name}</span>
          <span class="allergy-num">${item.code}번 성분</span>
        </div>
      </label>
    `;
  }).join('');

  updateAllergyCounter();
}

/**
 * 알레르기 카운터 및 뱃지 업데이트
 */
function updateAllergyCounter() {
  const countEl = document.getElementById('selectedAllergyCount');
  const count = state.selectedAllergies.size;
  if (countEl) {
    countEl.textContent = count;
    if (count > 0) {
      countEl.classList.add('has-selected');
    } else {
      countEl.classList.remove('has-selected');
    }
  }

  // localStorage 저장
  localStorage.setItem(CONFIG.STORAGE_KEYS.SAVED_ALLERGIES, JSON.stringify([...state.selectedAllergies]));

  // 식단 카드 실시간 재렌더링 (체크 즉시 빨간색 강조 적용)
  if (state.currentView === 'daily') {
    renderDailyMeals();
  } else {
    renderWeeklyMeals();
  }
}

/**
 * 학교 정보 상단 뱃지 갱신
 */
function updateSchoolHeaderBadge() {
  const school = state.currentSchool;
  if (!school) return;

  const nameEl = document.getElementById('badgeSchoolName');
  const officeEl = document.getElementById('badgeOfficeName');

  if (nameEl) nameEl.textContent = `${school.schoolName} (${school.schoolType || '학교'})`;
  if (officeEl) officeEl.textContent = `${school.officeName || '교육청'} · ${school.address || ''}`;
}

/**
 * 날짜 컨트롤러 텍스트 갱신
 */
function updateDateDisplay() {
  const displayEl = document.getElementById('currentDateDisplay');
  const inputEl = document.getElementById('mealDateInput');

  if (displayEl) {
    displayEl.textContent = formatDateToKorean(state.currentDate);
  }
  if (inputEl) {
    inputEl.value = formatDateToISO(state.currentDate);
  }
}

/**
 * 일간 식단 목록 렌더링 (핵심: 빨간색 강력 강조)
 */
function renderDailyMeals() {
  const container = document.getElementById('mealCardsContainer');
  const alertBanner = document.getElementById('allergyAlertBanner');
  if (!container) return;

  const meals = state.dailyMealsData;

  // 필터 적용 (조식/중식/석식)
  let filteredMeals = meals;
  if (state.currentMealTypeFilter !== 'ALL') {
    filteredMeals = meals.filter(m => m.MMEAL_SC_CODE === state.currentMealTypeFilter);
  }

  // 식단 정보가 없는 경우
  if (!filteredMeals || filteredMeals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="icon">🍱</span>
        <h3>등록된 급식 식단이 없습니다</h3>
        <p>${formatDateToKorean(state.currentDate)}은(는) 주말, 방학 또는 급식 미실시일 수 있습니다.</p>
        <p style="margin-top: 10px;">
          <button type="button" class="btn-pill" id="btnLoadSampleMeal">💡 샘플 식단으로 알레르기 강조 기능 체험해보기</button>
        </p>
      </div>
    `;

    document.getElementById('btnLoadSampleMeal')?.addEventListener('click', () => {
      loadSampleDietForDemo();
    });

    if (alertBanner) alertBanner.classList.add('hidden');
    return;
  }

  // 전체 식단에서 알레르기 검출 내역 집계
  const allDetectedAllergens = new Set();
  let totalDangerItems = 0;

  // 카드 HTML 생성
  const cardsHtml = filteredMeals.map(meal => {
    const mealCode = meal.MMEAL_SC_CODE; // 1: 조식, 2: 중식, 3: 석식
    const mealName = meal.MMEAL_SC_NM || (mealCode === '1' ? '조식' : mealCode === '2' ? '중식' : '석식');
    const calories = meal.CAL_INFO || '칼로리 정보 없음';
    const dishes = parseMealDishes(meal.DDISH_NM);

    let mealHasDanger = false;
    let mealDangerCount = 0;

    // 각 요리별 알레르기 매칭 및 강조 처리
    const dishesHtml = dishes.map(dish => {
      const allergyCheck = checkDishAllergens(dish, state.selectedAllergies);

      if (allergyCheck.hasAlert) {
        mealHasDanger = true;
        mealDangerCount++;
        totalDangerItems++;
        allergyCheck.matchedAllergens.forEach(a => allDetectedAllergens.add(a.name));

        // ★★★ 핵심 요구사항: 빨간색 강력 강조 (Bold Dark Red, Alert Glowing Border, Warning Tag) ★★★
        const allergenBadges = allergyCheck.matchedAllergens
          .map(a => `${a.icon} ${a.name}(${a.code})`)
          .join(', ');

        return `
          <li class="dish-item allergy-danger" title="선택한 알레르기 성분 검출: ${allergenBadges}">
            <div class="dish-name-wrap">
              <span class="dish-status-icon" aria-hidden="true">🚨</span>
              <div>
                <span class="dish-name">${dish.name}</span>
                <span class="dish-allergy-raw">(${dish.allergenCodes.join('.')})</span>
              </div>
            </div>
            <div class="allergy-warning-badge">
              <span class="alert-icon">⚠️</span>
              <span>알레르기 주의: ${allergenBadges}</span>
            </div>
          </li>
        `;
      } else {
        // 일반 메뉴 항목 (안전)
        const codeDisplay = dish.allergenCodes.length > 0 ? `(${dish.allergenCodes.join('.')})` : '';
        return `
          <li class="dish-item">
            <div class="dish-name-wrap">
              <span class="dish-status-icon" aria-hidden="true">🥢</span>
              <div>
                <span class="dish-name">${dish.name}</span>
                <span class="dish-allergy-raw">${codeDisplay}</span>
              </div>
            </div>
          </li>
        `;
      }
    }).join('');

    return `
      <article class="meal-card ${mealHasDanger ? 'has-allergy-alert' : ''}" data-meal-code="${mealCode}">
        <header class="meal-card-header">
          <div class="meal-type-title">
            <span>${mealCode === '1' ? '🌅' : mealCode === '2' ? '☀️' : '🌙'}</span>
            <h3>${mealName}</h3>
            ${mealHasDanger ? `<span class="badge-allergen-tag">위험 메뉴 ${mealDangerCount}개 감지</span>` : ''}
          </div>
          <span class="meal-calorie-badge">🔥 ${calories}</span>
        </header>
        
        <div class="meal-card-body">
          <ul class="dish-list">
            ${dishesHtml}
          </ul>
        </div>

        <footer class="meal-card-footer">
          <button type="button" class="btn-detail" onclick="openDetailModal('${mealCode}')">📊 영양 & 원산지 정보</button>
          <button type="button" class="btn-copy-meal" onclick="copyMealText('${mealName}', '${escape(meal.DDISH_NM)}')">📋 식단 복사</button>
        </footer>
      </article>
    `;
  }).join('');

  container.innerHTML = cardsHtml;

  // 상단 알레르기 요약 배너 표시
  if (alertBanner) {
    if (state.selectedAllergies.size > 0) {
      alertBanner.classList.remove('hidden');
      if (totalDangerItems > 0) {
        alertBanner.className = 'allergy-alert-banner danger';
        alertBanner.innerHTML = `
          <span class="banner-icon">🚨</span>
          <div class="banner-content">
            <strong>주의: 선택하신 알레르기 성분이 포함된 메뉴가 ${totalDangerItems}개 있습니다!</strong>
            <p>식단 목록에서 빨간색 테두리와 강조 태그로 표시된 메뉴를 확인하시고 섭취에 주의하세요.</p>
            <div class="banner-tags">
              ${[...allDetectedAllergens].map(name => `<span class="badge-allergen-tag">⚠️ ${name}</span>`).join('')}
            </div>
          </div>
        `;
      } else {
        alertBanner.className = 'allergy-alert-banner safe';
        alertBanner.innerHTML = `
          <span class="banner-icon">✅</span>
          <div class="banner-content">
            <strong>안심 식단: 선택하신 알레르기 성분이 검출되지 않았습니다.</strong>
            <p>오늘 제공되는 식단에는 체크하신 알레르기 유발 식품(${state.selectedAllergies.size}개 항목)이 포함되어 있지 않습니다.</p>
          </div>
        `;
      }
    } else {
      alertBanner.classList.add('hidden');
    }
  }
}

/**
 * 주간 식단 렌더링 (월~금 점심 모아보기)
 */
function renderWeeklyMeals() {
  const container = document.getElementById('weeklyCardsGrid');
  const rangeText = document.getElementById('weeklyRangeText');
  if (!container) return;

  const { monday, friday } = getWeekRange(state.currentDate);
  if (rangeText) {
    rangeText.textContent = `이번 주 식단 (${formatDateToISO(monday)} ~ ${formatDateToISO(friday)})`;
  }

  const days = ['월', '화', '수', '목', '금'];
  const todayYmd = formatDateToYMD(new Date());

  let cardsHtml = '';

  for (let i = 0; i < 5; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const ymd = formatDateToYMD(dayDate);
    const isToday = (ymd === todayYmd);

    // 해당 날짜의 점심(중식) 식단 조회
    const dayMeals = state.weeklyMealsData[ymd] || [];
    const lunch = dayMeals.find(m => m.MMEAL_SC_CODE === '2') || dayMeals[0];

    let dishesContent = '<div class="text-muted" style="padding: 20px 0; text-align: center;">급식 정보 없음</div>';

    if (lunch) {
      const dishes = parseMealDishes(lunch.DDISH_NM);
      dishesContent = dishes.map(dish => {
        const check = checkDishAllergens(dish, state.selectedAllergies);
        if (check.hasAlert) {
          return `
            <div class="weekly-dish-item allergy-danger" title="알레르기 위험: ${check.matchedAllergens.map(a => a.name).join(', ')}">
              🚨 ${dish.name}
            </div>
          `;
        }
        return `
          <div class="weekly-dish-item">
            ${dish.name}
          </div>
        `;
      }).join('');
    }

    cardsHtml += `
      <div class="weekly-day-card ${isToday ? 'today' : ''}">
        <div class="weekly-day-header">
          <div class="weekly-day-name">${days[i]}요일 ${isToday ? '(오늘)' : ''}</div>
          <div class="weekly-day-date">${dayDate.getMonth() + 1}월 ${dayDate.getDate()}일</div>
        </div>
        <div class="weekly-day-body">
          ${dishesContent}
        </div>
      </div>
    `;
  }

  container.innerHTML = cardsHtml;
}

// ========================================================
// 7. 데이터 로드 및 조작
// ========================================================

/**
 * 일간 데이터 새로고침
 */
async function loadDailyMeals() {
  const container = document.getElementById('mealCardsContainer');
  if (container) {
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p><strong>${state.currentSchool.schoolName}</strong>의 급식 식단을 불러오는 중입니다...</p>
      </div>
    `;
  }

  const ymd = formatDateToYMD(state.currentDate);
  const meals = await fetchMealDietFromNeis(state.currentSchool, ymd, ymd);
  state.dailyMealsData = meals;
  renderDailyMeals();
}

/**
 * 주간 데이터 새로고침
 */
async function loadWeeklyMeals() {
  const container = document.getElementById('weeklyCardsGrid');
  if (container) {
    container.innerHTML = `
      <div class="loading-state" style="grid-column: 1 / -1;">
        <div class="spinner"></div>
        <p>주간 급식 식단표를 불러오는 중입니다...</p>
      </div>
    `;
  }

  const { monday, friday } = getWeekRange(state.currentDate);
  const fromYmd = formatDateToYMD(monday);
  const toYmd = formatDateToYMD(friday);

  const meals = await fetchMealDietFromNeis(state.currentSchool, fromYmd, toYmd);
  
  // 날짜별 그룹핑
  const grouped = {};
  for (const meal of meals) {
    const ymd = meal.MLSV_YMD;
    if (!grouped[ymd]) grouped[ymd] = [];
    grouped[ymd].push(meal);
  }
  state.weeklyMealsData = grouped;

  renderWeeklyMeals();
}

/**
 * 날짜 변경 핸들러
 */
function changeDate(deltaDays) {
  const newDate = new Date(state.currentDate);
  newDate.setDate(newDate.getDate() + deltaDays);
  state.currentDate = newDate;

  updateDateDisplay();
  if (state.currentView === 'daily') {
    loadDailyMeals();
  } else {
    loadWeeklyMeals();
  }
}

/**
 * 학교 변경
 */
function setSchool(school) {
  state.currentSchool = school;
  localStorage.setItem(CONFIG.STORAGE_KEYS.SAVED_SCHOOL, JSON.stringify(school));
  
  // 최근 학교 목록에 추가
  addToRecentSchools(school);

  updateSchoolHeaderBadge();
  closeSearchModal();

  if (state.currentView === 'daily') {
    loadDailyMeals();
  } else {
    loadWeeklyMeals();
  }
}

function addToRecentSchools(school) {
  let recents = state.recentSchools.filter(s => s.schoolCode !== school.schoolCode);
  recents.unshift(school);
  if (recents.length > 5) recents = recents.slice(0, 5);
  state.recentSchools = recents;
  localStorage.setItem(CONFIG.STORAGE_KEYS.RECENT_SCHOOLS, JSON.stringify(recents));
  renderRecentSchools();
}

function renderRecentSchools() {
  const container = document.getElementById('recentSchoolsList');
  if (!container) return;

  if (state.recentSchools.length === 0) {
    container.innerHTML = '<span style="font-size:0.8rem; color:#94a3b8;">최근 기록 없음</span>';
    return;
  }

  container.innerHTML = state.recentSchools.map(s => `
    <button type="button" class="recent-school-pill" data-code="${s.schoolCode}">
      ${s.schoolName}
    </button>
  `).join('');

  container.querySelectorAll('.recent-school-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = state.recentSchools.find(s => s.schoolCode === btn.dataset.code);
      if (target) setSchool(target);
    });
  });
}

// ========================================================
// 8. 모달 관리 (학교 검색 / 영양 상세)
// ========================================================
function openSearchModal() {
  const modal = document.getElementById('searchModal');
  const input = document.getElementById('schoolSearchInput');
  modal.classList.remove('hidden');
  renderRecentSchools();
  if (input) {
    input.value = '';
    setTimeout(() => input.focus(), 100);
  }
}

function closeSearchModal() {
  document.getElementById('searchModal')?.classList.add('hidden');
}

function openDetailModal(mealCode) {
  const meal = state.dailyMealsData.find(m => m.MMEAL_SC_CODE === mealCode);
  if (!meal) return;

  const modal = document.getElementById('detailModal');
  const titleEl = document.getElementById('detailModalTitle');
  const nutrientBox = document.getElementById('modalNutrientInfo');
  const originBox = document.getElementById('modalOriginInfo');

  if (titleEl) titleEl.textContent = `${meal.MMEAL_SC_NM || '급식'} 상세 정보 (${state.currentSchool.schoolName})`;
  if (nutrientBox) nutrientBox.innerHTML = meal.NTR_INFO || '영양성분 정보가 등록되어 있지 않습니다.';
  if (originBox) originBox.innerHTML = meal.ORPLC_INFO || '원산지 정보가 등록되어 있지 않습니다.';

  modal.classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detailModal')?.classList.add('hidden');
}

// 클립보드 복사
window.copyMealText = function(mealName, encodedDdish) {
  const raw = unescape(encodedDdish);
  const dishes = parseMealDishes(raw).map(d => `- ${d.originalText}`).join('\n');
  const text = `[${formatDateToKorean(state.currentDate)} ${state.currentSchool.schoolName} ${mealName}]\n${dishes}`;

  navigator.clipboard.writeText(text).then(() => {
    alert('식단 정보가 클립보드에 복사되었습니다!');
  }).catch(() => {
    alert(text);
  });
};

window.openDetailModal = openDetailModal;

// ========================================================
// 9. 샘플 데이터 (오프라인 / 주말 / 시연용)
// ========================================================
function getSampleMealData(fromYmd, toYmd) {
  const sampleMeals = [
    {
      MMEAL_SC_CODE: '2',
      MMEAL_SC_NM: '중식',
      MLSV_YMD: fromYmd,
      CAL_INFO: '768.2 Kcal',
      DDISH_NM: '친환경찰흑미밥<br/>쇠고기미역국 (5.6.16.)<br/>수제돈육떡갈비 (1.2.5.6.10.13.15.16.)<br/>매콤해물파전 (1.5.6.9.17.)<br/>배추김치 (9.)<br/>친환경샤인머스켓<br/>유기농우유 (2.)',
      ORPLC_INFO: '쌀: 국내산<br/>쇠고기(한우): 국내산<br/>돼지고기: 국내산<br/>오징어: 국내산<br/>김치: 국내산',
      NTR_INFO: '탄수화물(g) : 102.5<br/>단백질(g) : 41.2<br/>지방(g) : 21.0<br/>비타민A(R.E) : 220.4<br/>칼슘(mg) : 340.5'
    },
    {
      MMEAL_SC_CODE: '1',
      MMEAL_SC_NM: '조식',
      MLSV_YMD: fromYmd,
      CAL_INFO: '540.0 Kcal',
      DDISH_NM: '치즈에그토스트 (1.2.5.6.)<br/>양송이크림스프 (2.5.6.)<br/>케이준치킨샐러드 (1.5.6.15.)<br/>감귤주스 (13.)',
      ORPLC_INFO: '식빵: 국내산<br/>닭고기: 국내산',
      NTR_INFO: '탄수화물(g) : 74.0<br/>단백질(g) : 22.5<br/>지방(g) : 15.2'
    }
  ];

  return sampleMeals;
}

function loadSampleDietForDemo() {
  state.dailyMealsData = getSampleMealData(formatDateToYMD(state.currentDate), formatDateToYMD(state.currentDate));
  renderDailyMeals();
}

function getSampleSchoolList(keyword) {
  const samples = [
    { officeCode: 'B10', officeName: '서울특별시교육청', schoolCode: '7010057', schoolName: '서울고등학교', schoolType: '고등학교', address: '서울특별시 서초구 효령로 218' },
    { officeCode: 'B10', officeName: '서울특별시교육청', schoolCode: '7010084', schoolName: '경기고등학교', schoolType: '고등학교', address: '서울특별시 강남구 영동대로 643' },
    { officeCode: 'B10', officeName: '서울특별시교육청', schoolCode: '7021053', schoolName: '대치초등학교', schoolType: '초등학교', address: '서울특별시 강남구 개포로 110길 50' },
    { officeCode: 'B10', officeName: '서울특별시교육청', schoolCode: '7041076', schoolName: '역삼중학교', schoolType: '중학교', address: '서울특별시 강남구 도곡로 43길 23' },
    { officeCode: 'J10', officeName: '경기도교육청', schoolCode: '7530053', schoolName: '수원고등학교', schoolType: '고등학교', address: '경기도 수원시 팔달구 효원로 28' }
  ];

  if (!keyword) return samples;
  return samples.filter(s => s.schoolName.includes(keyword));
}

// ========================================================
// 10. 이벤트 리스너 등록 & 초기화
// ========================================================
function initEventListeners() {
  // 1. 알레르기 체크박스 토글 (이벤트 위임)
  const allergyGrid = document.getElementById('allergyCheckboxGrid');
  if (allergyGrid) {
    allergyGrid.addEventListener('change', (e) => {
      const checkbox = e.target.closest('input[type="checkbox"]');
      if (!checkbox) return;

      const code = parseInt(checkbox.value, 10);
      const parentLabel = checkbox.closest('.allergy-item');

      if (checkbox.checked) {
        state.selectedAllergies.add(code);
        parentLabel?.classList.add('checked');
      } else {
        state.selectedAllergies.delete(code);
        parentLabel?.classList.remove('checked');
      }

      updateAllergyCounter();
    });
  }

  // 2. 알레르기 퀵 버튼들
  // 주요 6대 알레르기 선택
  document.getElementById('btnSelectCommonAllergies')?.addEventListener('click', () => {
    state.selectedAllergies.clear();
    COMMON_ALLERGIES.forEach(c => state.selectedAllergies.add(c));
    renderAllergyCheckboxes();
  });

  // 전체 선택
  document.getElementById('btnSelectAllAllergies')?.addEventListener('click', () => {
    ALLERGEN_LIST.forEach(item => state.selectedAllergies.add(item.code));
    renderAllergyCheckboxes();
  });

  // 전체 해제
  document.getElementById('btnClearAllergies')?.addEventListener('click', () => {
    state.selectedAllergies.clear();
    renderAllergyCheckboxes();
  });

  // 3. 날짜 이동 버튼들
  document.getElementById('btnPrevDay')?.addEventListener('click', () => changeDate(-1));
  document.getElementById('btnNextDay')?.addEventListener('click', () => changeDate(1));
  document.getElementById('btnToday')?.addEventListener('click', () => {
    state.currentDate = new Date();
    updateDateDisplay();
    if (state.currentView === 'daily') loadDailyMeals();
    else loadWeeklyMeals();
  });

  // 날짜 직접 선택
  document.getElementById('mealDateInput')?.addEventListener('change', (e) => {
    if (e.target.value) {
      state.currentDate = new Date(e.target.value);
      updateDateDisplay();
      if (state.currentView === 'daily') loadDailyMeals();
      else loadWeeklyMeals();
    }
  });

  // 4. 뷰 모드 전환 (일간 / 주간)
  const viewDailyBtn = document.getElementById('viewDailyBtn');
  const viewWeeklyBtn = document.getElementById('viewWeeklyBtn');
  const dailyContainer = document.getElementById('dailyViewContainer');
  const weeklyContainer = document.getElementById('weeklyViewContainer');

  viewDailyBtn?.addEventListener('click', () => {
    state.currentView = 'daily';
    viewDailyBtn.classList.add('active');
    viewWeeklyBtn.classList.remove('active');
    dailyContainer.classList.remove('hidden');
    weeklyContainer.classList.add('hidden');
    loadDailyMeals();
  });

  viewWeeklyBtn?.addEventListener('click', () => {
    state.currentView = 'weekly';
    viewWeeklyBtn.classList.add('active');
    viewDailyBtn.classList.remove('active');
    dailyContainer.classList.add('hidden');
    weeklyContainer.classList.remove('hidden');
    loadWeeklyMeals();
  });

  // 5. 식사 구분 칩 필터 (전체/조식/중식/석식)
  const filterBar = document.getElementById('mealTypeFilterBar');
  filterBar?.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    state.currentMealTypeFilter = chip.dataset.mealType;
    renderDailyMeals();
  });

  // 6. 학교 검색 모달 열기/닫기
  document.getElementById('btnOpenSearch')?.addEventListener('click', openSearchModal);
  document.getElementById('currentSchoolBadge')?.addEventListener('click', openSearchModal);
  document.getElementById('btnCloseSearchModal')?.addEventListener('click', closeSearchModal);
  document.getElementById('searchModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'searchModal') closeSearchModal();
  });

  // 7. 학교 검색 제출
  const searchForm = document.getElementById('schoolSearchForm');
  searchForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('schoolSearchInput')?.value.trim();
    if (!query) return;

    const resultsList = document.getElementById('searchResultsList');
    resultsList.innerHTML = `
      <div class="search-placeholder">
        <div class="spinner"></div>
        <p><strong>'${query}'</strong> 검색 중...</p>
      </div>
    `;

    const schools = await searchSchoolsFromNeis(query);

    if (schools.length === 0) {
      resultsList.innerHTML = `
        <div class="search-placeholder">
          <span class="icon">🤔</span>
          <p>검색 결과가 없습니다.<br>학교명을 정확하게 다시 입력해주세요.</p>
        </div>
      `;
      return;
    }

    resultsList.innerHTML = schools.map(s => `
      <div class="search-result-item" data-code="${s.schoolCode}">
        <div>
          <div class="result-school-name">
            ${s.schoolName}
            <span class="result-school-type">${s.schoolType}</span>
          </div>
          <div class="result-school-meta">
            ${s.officeName} · ${s.address}
          </div>
        </div>
        <button type="button" class="btn-pill">선택</button>
      </div>
    `).join('');

    resultsList.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const code = item.dataset.code;
        const target = schools.find(s => s.schoolCode === code);
        if (target) setSchool(target);
      });
    });
  });

  // 8. 상세 모달 닫기
  document.getElementById('btnCloseDetailModal')?.addEventListener('click', closeDetailModal);
  document.getElementById('detailModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') closeDetailModal();
  });

  // ESC 키로 모달 닫기
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearchModal();
      closeDetailModal();
    }
  });
}

// ========================================================
// 11. 초기 구동 (App Bootstrap)
// ========================================================
function initApp() {
  // 1. 저장된 학교 로드 또는 기본 학교(서울고) 설정
  const savedSchoolStr = localStorage.getItem(CONFIG.STORAGE_KEYS.SAVED_SCHOOL);
  if (savedSchoolStr) {
    try {
      state.currentSchool = JSON.parse(savedSchoolStr);
    } catch (e) {
      state.currentSchool = CONFIG.DEFAULT_SCHOOL;
    }
  } else {
    state.currentSchool = CONFIG.DEFAULT_SCHOOL;
  }

  // 2. 저장된 알레르기 불러오기 (기본값: 난류(1), 우유(2), 대두(5), 밀(6) 예시로 미리 체크해두면 사용자가 바로 알레르기 강조 효과를 확인할 수 있음!)
  const savedAllergiesStr = localStorage.getItem(CONFIG.STORAGE_KEYS.SAVED_ALLERGIES);
  if (savedAllergiesStr) {
    try {
      const arr = JSON.parse(savedAllergiesStr);
      state.selectedAllergies = new Set(arr);
    } catch (e) {
      state.selectedAllergies = new Set([1, 2]); // 기본 난류, 우유
    }
  } else {
    // 최초 방문 시 가장 흔한 난류(달걀 1) 및 우유(2) 기본 체크
    state.selectedAllergies = new Set([1, 2]);
  }

  // 3. 최근 학교 목록 불러오기
  const recentStr = localStorage.getItem(CONFIG.STORAGE_KEYS.RECENT_SCHOOLS);
  if (recentStr) {
    try {
      state.recentSchools = JSON.parse(recentStr);
    } catch (e) {
      state.recentSchools = [];
    }
  }

  // 4. UI 초기 렌더링
  updateSchoolHeaderBadge();
  updateDateDisplay();
  renderAllergyCheckboxes();
  initEventListeners();

  // 5. 초기 식단 데이터 요청
  loadDailyMeals();
}

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', initApp);
