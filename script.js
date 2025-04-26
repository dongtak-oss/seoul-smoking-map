// ✅ 길찾기 기능용 전역 변수 (기존 기능과 완전히 분리)
let isRouteMode = false;         // 길찾기 모드 여부
let settingStartPoint = false;   // 출발지 선택 모드 여부
let settingEndPoint = false;     // 목적지 선택 모드 여부
let startPoint = null;           // 출발지 좌표
let endPoint = null;             // 목적지 좌표
let startMarker = null;          // 출발지 마커 객체
let currentPolyline = null;      // 그려진 선(경로)





// ✅ 앱에서만 인트로 보여주기
function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true; // iOS 지원
}

document.addEventListener("DOMContentLoaded", () => {
  const intro = document.getElementById("intro-screen");

  // ✅ 세션 스토리지에 인트로 표시 여부 확인
  const hasSeenIntro = sessionStorage.getItem("hasSeenIntro");

  // ✅ PWA로 실행 중이고, 인트로가 아직 안 보인 경우에만 표시
  if (isStandaloneApp() && intro && !hasSeenIntro) {
    intro.classList.remove("hidden"); // 인트로 표시
    
    setTimeout(() => {
      intro.classList.add("hidden"); // 2초 후 인트로 숨김
      sessionStorage.setItem("hasSeenIntro", "true"); // ✅ 이 줄이 중요! 다시 안 뜨게
    }, 2000);
  }
});

// ✅ script.js 시작점 - kakao map 초기화
console.log("✅ script.js 실행 확인");

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ script.js 실행됨");

  kakao.maps.load(() => {
    console.log("✅ kakao.maps.load 안의 initMapApp 실행됨");
    initMapApp(); // 지도 및 마커 초기화
  });
});

// ✅ 관리자 여부 확인 - localhost:3000 환경에서만 true
const isAdmin = location.hostname === "localhost" && location.port === "3000";

let map;
let currentInfoWindow = null; // 현재 열려있는 카카오맵 정보창
let markers = []; // 현재 표시 중인 마커
let allMarkers = []; // 모든 마커 정보 (marker 객체 + location 데이터)
let userMarker = null; // 내 위치 마커
let nearbyMode = false; // 근처 보기 모드 여부
let activeType = null; // 현재 활성화된 필터 타입

// ✅ 마커 타입별 이미지 경로
const iconUrls = {
  public: 'images/marker_public.png',
  building: 'images/marker_building.png',
  cafe: 'images/marker_cafe.png',
  current: 'images/marker_current_v2.png'
};

function initMapApp() {
  const container = document.getElementById('map');
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울 중심
    level: 7
  };
  map = new kakao.maps.Map(container, options);


// ✅ 지도 클릭해서 출발지 설정
kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
  if (isRouteMode && settingStartPoint) {
    const latlng = mouseEvent.latLng;
    startPoint = latlng;

    // ✅ 기존 출발지 마커가 있으면 제거
    if (startMarker) {
      startMarker.setMap(null);
    }

    // ✅ 새 출발지 마커 생성
    startMarker = new kakao.maps.Marker({
      position: latlng,
      map: map
    });

    // 출발지 텍스트 갱신
    document.getElementById('start-point-text').textContent = '출발지: 지도에서 선택 완료';

    settingStartPoint = false; // 출발지 설정 완료
    alert('출발지가 설정되었습니다! 이제 목적지를 설정하세요.');
  }
});





// ✅ 위치 데이터 가져오기 및 마커 생성
fetch("locations.json")
  .then(res => res.json())
  .then(locations => {
    markers.forEach(m => m.setMap(null)); // 기존 마커 제거
    markers = [];
    allMarkers = [];

    locations.forEach(location => {
      const position = new kakao.maps.LatLng(location.lat, location.lng);
      const markerImage = new kakao.maps.MarkerImage(
        iconUrls[location.type] || iconUrls.public,
        new kakao.maps.Size(32, 32)
      );

      const marker = new kakao.maps.Marker({
        map,
        position,
        title: location.title,
        image: markerImage,
        draggable: isAdmin
      });

      // ✅ 마커 클릭 이벤트 (길찾기 모드 + 평소 모드 분기)
      kakao.maps.event.addListener(marker, 'click', () => {
        if (isRouteMode && settingEndPoint) {
          // 길찾기 모드 + 목적지 설정
          endPoint = marker.getPosition();
          document.getElementById('end-point-text').textContent = '목적지: ' + (location.title || '선택 완료');
          settingEndPoint = false;
          drawRoute(); // (이건 아직 아래에서 추가할 예정)
        } else {
          // 평소 모드: 정보창 카드 열기
          showPreviewCard(location);
          document.getElementById("info-preview-card").dataset.locationData = JSON.stringify(location);
          document.getElementById("info-full-card").dataset.locationData = JSON.stringify(location);
        }
      });

      markers.push(marker);
      allMarkers.push({ marker, location }); // marker와 location 저장
    });

    // ✅ 관리자 모드일 경우 드래그 저장 기능 추가
    if (isAdmin) {
      allMarkers.forEach(({ marker, location }) => {
        kakao.maps.event.addListener(marker, "dragend", function () {
          const newPos = marker.getPosition();
          fetch("/update-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: location.title,
              lat: newPos.getLat(),
              lng: newPos.getLng()
            })
          })
            .then(res => res.json())
            .then(data => {
              console.log("📍 저장됨:", data.message);
            })
            .catch(err => {
              console.error("❌ 저장 오류:", err);
            });
        });
      });
    }
  })
  .catch(err => {
    console.error("❌ locations.json 불러오기 실패:", err);
  });


  

  // ✅ 내 위치 버튼 이벤트
  document.getElementById("findMe").addEventListener("click", () => {
    getUserLocation();
  });

  // ✅ 근처 보기 버튼 이벤트
  document.getElementById("findNearby").addEventListener("click", () => {
    getUserLocation().then(({ lat, lng }) => {
      let nearbyCount = 0;

      allMarkers.forEach(({ marker, data }) => {
        const distance = haversine(lat, lng, data.lat, data.lng);
        const isNearby = distance <= 1;

        if (isNearby) nearbyCount++;
        marker.setMap(nearbyMode ? map : (isNearby ? map : null));
      });

      if (!nearbyMode && nearbyCount === 0) {
        alert("근처에 흡연구역이 없습니다.");
      }

      nearbyMode = !nearbyMode;

      // ✅ 전체 보기로 전환 시 지도 중심을 초기 위치로
    if (!nearbyMode) {
      map.setCenter(new kakao.maps.LatLng(37.5665, 126.9780)); // 예시: 서울 시청
      map.setLevel(7);
    }

      const btn = document.getElementById("findNearby");
      const icon = btn.querySelector("img");
      const text = btn.querySelector("span");

      if (nearbyMode) {
        icon.src = "images/icon_nearby.png";
        icon.alt = "전체 아이콘";
        text.textContent = "전체";
      } else {
        icon.src = "images/icon_nearby.png";
        icon.alt = "근처 아이콘";
        text.textContent = "근처";
      }

      btn.classList.toggle("active", nearbyMode);
    }).catch(() => {
      console.error("❌ 위치 정보를 가져오는 데 실패했습니다.");
    });
  });

  // ✅ 필터바 (카페, 공공, 빌딩) 클릭 이벤트
  ["filter-cafe-top", "filter-public-top", "filter-building-top"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        const type = id.split("-")[1];
        if (currentInfoWindow) currentInfoWindow.close();
        if (activeType === type) {
          activeType = null;
          allMarkers.forEach(({ marker }) => marker.setMap(map));
        } else {
          activeType = type;
          allMarkers.forEach(({ marker, data }) => {
            marker.setMap(data.type === type ? map : null);
          });
        }
      });
    }
  });
}

// ✅ 현재 위치 요청 및 마커 표시
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
      return reject();
    }

    navigator.geolocation.getCurrentPosition(pos => {
      const userLoc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      map.setCenter(userLoc);
      map.setLevel(4);

      const markerImage = new kakao.maps.MarkerImage(
        iconUrls.current,
        new kakao.maps.Size(32, 32)
      );

      if (userMarker) userMarker.setMap(null);

      userMarker = new kakao.maps.Marker({
        position: userLoc,
        map,
        title: "내 위치",
        image: markerImage
      });

      resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }, reject);
  });
}

// ✅ 거리 계산 함수 (하버사인 공식)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deg2rad(deg) {
  return deg * Math.PI / 180;
}

// ✅ 기존 카카오맵 정보창 닫기용 글로벌 함수
window.closeInfoWindow = function () {
  if (currentInfoWindow) currentInfoWindow.close();
};

// ✅ 카드형 정보 미리보기 표시
function showPreviewCard(location) {
  document.getElementById("preview-title").textContent = location.title;
  document.getElementById("preview-description").textContent = location.description || '';
  // ✅ images 배열의 첫 번째 이미지를 사용
  document.getElementById("preview-image").src =
    location.images && location.images.length > 0 ? location.images[0] : '';

  document.getElementById("preview-image").style.objectPosition = "center bottom";
  document.getElementById("info-preview-card").dataset.locationData = JSON.stringify(location);

  document.getElementById("info-preview-card").classList.remove("hidden");
  document.getElementById("info-full-card").classList.add("hidden");
}

// ✅ 카드형 전체 정보창 표시
function showFullCard(location) {
  document.getElementById("full-title").textContent = location.title;
  document.getElementById("full-description").textContent = location.description || '';
  // ✅ 이미지 슬라이더 적용
initCarousel(location.images);
document.getElementById("full-type").textContent = location.form || '정보 없음';

  document.getElementById("review-list").innerHTML = `
    <li>🔥 공간 넓고 깔끔했어요</li>
    <li>😷 환기가 약간 부족한 느낌</li>
  `;

  document.getElementById("info-full-card").classList.remove("hidden");
  document.getElementById("info-preview-card").classList.add("hidden");
}


// ✅ 카드 전환 관련 이벤트 연결 (DOM 로드 후)
document.addEventListener("DOMContentLoaded", () => {
  // 닫기 버튼
  const closeBtn = document.getElementById("close-preview");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("info-preview-card").classList.add("hidden");
    });
  }

  // 전체 보기 → 미리보기
  const backButton = document.getElementById("back-to-preview");
  if (backButton) {
    backButton.addEventListener("click", () => {
      const fullCard = document.getElementById("info-full-card");
      const locationData = fullCard.dataset.locationData;
      if (locationData) {
        const location = JSON.parse(locationData);
        showPreviewCard(location);
      }
    });
  }

  // 미리보기 → 전체 보기
  const viewFullBtn = document.getElementById("view-full-button");
  if (viewFullBtn) {
    viewFullBtn.addEventListener("click", () => {
      const previewCard = document.getElementById("info-preview-card");
      const locationData = previewCard.dataset.locationData;
      if (locationData) {
        const location = JSON.parse(locationData);
        showFullCard(location);
      }

      // ✅ 리뷰 접고/펼치기 버튼 토글은 여기에 들어가도 되지만...
      // 더 좋은 위치는 아래와 같아 👇
    });
  }

  // ✅ 💡 리뷰 접기/펼치기 기능은 viewFullBtn이 아닌 전역으로 둬야 재사용도 쉬움!
  const toggleBtn = document.getElementById("toggle-reviews");
  const reviewSection = document.getElementById("review-section");

  if (toggleBtn && reviewSection) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = reviewSection.classList.contains("hidden");
      if (isHidden) {
        reviewSection.classList.remove("hidden");
        toggleBtn.textContent = "리뷰 접기 ⬆";
      } else {
        reviewSection.classList.add("hidden");
        toggleBtn.textContent = "리뷰 보기 ⬇";
      }
    });
  }

  document.getElementById('route-button').addEventListener('click', startRouteMode);
document.getElementById('close-route-card').addEventListener('click', closeRouteMode);

const selectStartButton = document.getElementById('select-start');
if (selectStartButton) {
  selectStartButton.addEventListener('click', () => {
    if (!isRouteMode) return; // 길찾기 모드가 아닐 때는 무시
    settingStartPoint = true; // 출발지 선택 모드 ON
    settingEndPoint = false;  // 목적지 선택 모드는 OFF

    // ✅ 출발지 선택 방법 안내
    const useCurrentLocation = confirm('현재 내 위치를 출발지로 설정할까요?\n취소하면 지도에서 직접 선택할 수 있습니다.');
    
    if (useCurrentLocation) {
      // 1️⃣ 현재 내 위치로 설정
      navigator.geolocation.getCurrentPosition(function(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        startPoint = new kakao.maps.LatLng(lat, lng);

        // 출발지 텍스트 업데이트
        document.getElementById('start-point-text').textContent = '출발지: 내 위치';
        settingStartPoint = false; // 출발지 설정 완료
      }, function(error) {
        alert('현재 위치를 가져올 수 없습니다.');
      });
    } else {
      // 2️⃣ 지도 클릭으로 출발지 설정
      alert('지도를 클릭해서 출발지를 설정하세요.');
    }
  });
}

const selectEndButton = document.getElementById('select-end');
if (selectEndButton) {
  selectEndButton.addEventListener('click', () => {
    if (!isRouteMode) return; // 길찾기 모드가 아닐 때는 무시
    settingEndPoint = true;   // 목적지 선택 모드 ON
    settingStartPoint = false; // 출발지 모드는 끔

    alert('목적지로 설정할 흡연구역 마커를 클릭하세요!');
  });
}

});




// ✅ 현재 슬라이드 위치를 기억하는 변수
let currentSlide = 0;

// ✅ 슬라이더 초기화 함수 - 이미지 배열을 받아서 DOM에 이미지 생성
function initCarousel(images) {
  const container = document.getElementById("carousel-images");
  container.innerHTML = ""; // 이전 이미지 제거

  images.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    container.appendChild(img);
  });

  currentSlide = 0;
  updateCarousel();
}

// ✅ 슬라이더 위치 이동 함수 - currentSlide 값을 기반으로 transform 적용
function updateCarousel() {
  const container = document.getElementById("carousel-images");
  const total = container.children.length; // ✅ 총 슬라이드 수 계산
  container.style.transform = `translateX(-${currentSlide * 100}%)`;
   // ✅ 버튼 표시 제어
   document.getElementById("carousel-prev").style.display = currentSlide === 0 ? "none" : "block";
   document.getElementById("carousel-next").style.display = currentSlide === total - 1 ? "none" : "block";
}

document.getElementById("carousel-prev").addEventListener("click", () => {
  const total = document.getElementById("carousel-images").children.length;
  currentSlide = (currentSlide - 1 + total) % total;
  updateCarousel();
});

document.getElementById("carousel-next").addEventListener("click", () => {
  const total = document.getElementById("carousel-images").children.length;
  currentSlide = (currentSlide + 1) % total;
  updateCarousel();
});




// ✅ 길찾기 모드 시작
function startRouteMode() {
  isRouteMode = true;               // 길찾기 모드 켬
  settingStartPoint = false;         // 출발지 선택 모드 끔
  settingEndPoint = false;           // 목적지 선택 모드 끔
  startPoint = null;
  endPoint = null;

  // 기존 선이 있다면 제거
  if (currentPolyline) {
    currentPolyline.setMap(null);
    currentPolyline = null;
  }

  // 카드 안 텍스트 초기화
  document.getElementById('start-point-text').textContent = '출발지: 미설정';
  document.getElementById('end-point-text').textContent = '목적지: 미설정';
  document.getElementById('distance-text').textContent = '거리: -';

  // 길찾기 카드 보이기
  document.getElementById('route-card').classList.remove('hidden');
}

// ✅ 길찾기 모드 종료
function closeRouteMode() {
  isRouteMode = false;               // 길찾기 모드 끔
  settingStartPoint = false;
  settingEndPoint = false;
  startPoint = null;
  endPoint = null;

  // 경로 선이 그려져 있다면 제거
  if (currentPolyline) {
    currentPolyline.setMap(null);
    currentPolyline = null;
  }

  // 길찾기 카드 숨기기
  document.getElementById('route-card').classList.add('hidden');
}







// ✅ 출발지-목적지 연결하는 선 그리기 함수
function drawRoute() {
  if (!startPoint || !endPoint) {
    console.error("출발지나 목적지가 설정되지 않았습니다.");
    return;
  }

  // ✅ 기존 선이 있으면 먼저 삭제
  if (currentPolyline) {
    currentPolyline.setMap(null);
  }

  // ✅ 새로운 선(polyline) 생성
  currentPolyline = new kakao.maps.Polyline({
    map: map,
    path: [startPoint, endPoint],
    strokeWeight: 5,         // 선 두께
    strokeColor: '#007bff',  // 선 색깔 (파란색)
    strokeOpacity: 0.8,      // 선 투명도
    strokeStyle: 'solid'     // 선 스타일
  });

  // ✅ 거리 계산
  const distance = getDistance(startPoint, endPoint); // 단위: km (소수점 2자리)

  // ✅ 거리 텍스트 표시
  document.getElementById('distance-text').textContent = `거리: ${distance} km`;
}

// ✅ 두 좌표 간 거리(km)를 구하는 함수 (하버사인 공식)
function getDistance(start, end) {
  const R = 6371; // 지구 반지름 (km)
  const dLat = deg2rad(end.getLat() - start.getLat());
  const dLng = deg2rad(end.getLng() - start.getLng());
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(start.getLat())) * Math.cos(deg2rad(end.getLat())) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2); // 소수점 2자리로 표시
}

// ✅ 도(degree)를 라디안(radian)으로 변환하는 함수
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function drawRoute() {
  if (!startPoint || !endPoint) {
    console.error("출발지나 목적지가 설정되지 않았습니다.");
    return;
  }

  // ✅ 기존 선이 있으면 제거
  if (currentPolyline) {
    currentPolyline.setMap(null);
  }

  // ✅ 새 선 그리기
  currentPolyline = new kakao.maps.Polyline({
    map: map,
    path: [startPoint, endPoint],
    strokeWeight: 5,
    strokeColor: '#007bff',
    strokeOpacity: 0.8,
    strokeStyle: 'solid'
  });

  // ✅ 거리 계산
  const distance = getDistance(startPoint, endPoint);
  document.getElementById('distance-text').textContent = `거리: ${distance} km`;

  // ✅ 출발지-목적지를 포함하는 bounds 만들기
  const bounds = new kakao.maps.LatLngBounds();
  bounds.extend(startPoint);
  bounds.extend(endPoint);
  map.setBounds(bounds); // ✅ 지도 화면 자동 조정
}
