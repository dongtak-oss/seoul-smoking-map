// ✅ 앱에서만 인트로 보여주기
function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

document.addEventListener("DOMContentLoaded", () => {
  const intro = document.getElementById("intro-screen");

  if (isStandaloneApp() && intro) {
    intro.classList.remove("hidden");
    setTimeout(() => {
      intro.classList.add("hidden");
    }, 800); // 총 0.8초 후 제거 (애니메이션 포함)
  }

  // 기존 이벤트 리스너들 여기 아래에 쭉 이어지면 됨!
});

// ✅ script.js 전체 코드 - '근처 흡연구역 보기' 클릭 시 내 위치도 자동 표시되도록 수정 완료

console.log("✅ script.js 실행 확인");

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ script.js 실행됨");

  kakao.maps.load(() => {
    console.log("✅ kakao.maps.load 안의 initMapApp 실행됨");
    initMapApp();
  });
});

const isAdmin = location.hostname === "localhost" && location.port === "3000";

let map;
let currentInfoWindow = null;
let markers = [];
let allMarkers = [];
let userMarker = null;
let nearbyMode = false;
let activeType = null;

const iconUrls = {
  public: 'images/marker_public.png',
  building: 'images/marker_building.png',
  cafe: 'images/marker_cafe.png',
  current: 'images/marker_current_v2.png'
};

function initMapApp() {
  const container = document.getElementById('map');
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 7
  };
  map = new kakao.maps.Map(container, options);

  fetch("locations.json")
    .then(res => res.json())
    .then(locations => {
      markers.forEach(m => m.setMap(null));
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

        kakao.maps.event.addListener(marker, 'click', () => {
          showPreviewCard(location);
          document.getElementById("info-preview-card").dataset.locationData = JSON.stringify(location);
  document.getElementById("info-full-card").dataset.locationData = JSON.stringify(location);
        });

        markers.push(marker);
        allMarkers.push({ marker, data: location });
      });
    });

  document.getElementById("findMe").addEventListener("click", () => {
    getUserLocation();
  });

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

window.closeInfoWindow = function () {
  if (currentInfoWindow) currentInfoWindow.close();
};





// ✅ 기능: 절반 카드 열기
function showPreviewCard(location) {
  document.getElementById("preview-title").textContent = location.title;
  document.getElementById("preview-description").textContent = location.description || '';
  document.getElementById("preview-image").src = location.image || '';
  document.getElementById("preview-image").style.objectPosition = "center bottom";
  document.getElementById("info-preview-card").dataset.locationData = JSON.stringify(location);

  document.getElementById("info-preview-card").classList.remove("hidden");
  document.getElementById("info-full-card").classList.add("hidden");
}

// ✅ 기능: 전체 카드 열기
function showFullCard(location) {
  document.getElementById("full-title").textContent = location.title;
  document.getElementById("full-description").textContent = location.description || '';
  document.getElementById("full-image").src = location.image || '';
  document.getElementById("full-type").textContent = `흡연실 형태: ${location.type_detail || '정보 없음'}`;
  document.getElementById("suggest-edit").href = location.editLink || "#";

  document.getElementById("review-list").innerHTML = `
    <li>🔥 공간 넓고 깔끔했어요</li>
    <li>😷 환기가 약간 부족한 느낌</li>
  `;

  document.getElementById("info-full-card").classList.remove("hidden");
  document.getElementById("info-preview-card").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  // ✅ 닫기 버튼 (미리보기 닫기)
  const closeBtn = document.getElementById("close-preview");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("info-preview-card").classList.add("hidden");
    });
  }

  // ✅ 전체 보기 → 미리보기 전환
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

  // ✅ 전체 정보 보기 버튼 → 전체 카드 전환
  const viewFullBtn = document.getElementById("view-full-button");
  if (viewFullBtn) {
    viewFullBtn.addEventListener("click", () => {
      const previewCard = document.getElementById("info-preview-card");
      const locationData = previewCard.dataset.locationData;
      if (locationData) {
        const location = JSON.parse(locationData);
        showFullCard(location);
      }
    });
  }
});

