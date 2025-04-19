console.log("✅ script.js 실행 확인");

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ script.js 실행됨");

  kakao.maps.load(() => {
    console.log("✅ kakao.maps.load 안의 initMapApp 실행됨");
    initMapApp();
  });
});

// ✅ 관리자 여부 자동 판단 (localhost일 경우만 true)
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
  current: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
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
      // ✅ 기존 마커 모두 제거
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
          draggable: isAdmin // ✅ 관리자일 경우에만 드래그 가능
        });

        // ✅ 드래그 후 서버로 위치 업데이트
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
          if (currentInfoWindow) currentInfoWindow.close();
          infoWindow.open(map, marker);
          currentInfoWindow = infoWindow;
        });

        markers.push(marker);
        allMarkers.push({ marker, data: location });
      });
    });

  document.getElementById("findMe").addEventListener("click", () => {
    if (navigator.geolocation) {
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
      });
    } else {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
  });

  document.getElementById("findNearby").addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

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
  icon.src = "images/icon_nearby.png"; // 전체 보기용 아이콘 경로
  icon.alt = "전체 아이콘";
  text.textContent = "전체";
} else {
  icon.src = "images/icon_nearby.png"; // 근처 보기용 아이콘 경로
  icon.alt = "근처 아이콘";
  text.textContent = "근처";
}

      btn.classList.toggle("active", nearbyMode);
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
