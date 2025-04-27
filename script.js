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

// ✅ ✨ 여기! (hidePreviewCard 함수 추가)
function hidePreviewCard() {
  const previewCard = document.getElementById("info-preview-card");
  const fullCard = document.getElementById("info-full-card");

  if (previewCard) previewCard.classList.add("hidden");
  if (fullCard) fullCard.classList.add("hidden");
}

function initMapApp() {
  const container = document.getElementById('map');
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울 중심
    level: 7
  };
  map = new kakao.maps.Map(container, options);

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

        // ✅ 관리자 모드일 경우 드래그 후 저장
        if (isAdmin) {
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
        }

        // ✅ 정보창 내용 구성 (기본 InfoWindow용)
        const infoContent = `
          <div style="max-width:200px; position:relative;">
            <div style="text-align:right;">
              <button onclick="closeInfoWindow()" style="border:none; background:none; font-size:16px; cursor:pointer;">✖</button>
            </div>
            <h3>${location.title}</h3>
            ${location.image ? `<img src="${location.image}" style="width:100%; border-radius:8px;" />` : ''}
            ${location.description ? `<p>${location.description}</p>` : ''}
          </div>
        `;

        const infoWindow = new kakao.maps.InfoWindow({ content: infoContent });

        // ✅ 마커 클릭 시 카드 정보창 표시
        kakao.maps.event.addListener(marker, 'click', () => {
          showPreviewCard(location); // 절반 카드
          document.getElementById("info-preview-card").dataset.locationData = JSON.stringify(location);
          document.getElementById("info-full-card").dataset.locationData = JSON.stringify(location);
        });

        markers.push(marker);
        allMarkers.push({ marker, data: location });
      });
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
        hidePreviewCard(); // ✅ 요기! 카드형 정보창 닫기 추가
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
