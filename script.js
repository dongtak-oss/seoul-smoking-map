let map;
let currentInfoWindow = null;
let markers = [];
let nearbyMode = false;
let allMarkers = [];
let activeType = null;
let userMarker = null; // ✅ 내 위치 마커 저장용

const isAdmin = true;

const iconUrls = {
  public: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  building: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  cafe: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
  current: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
};

document.addEventListener("DOMContentLoaded", () => {
  kakao.maps.load(initMapApp);

  // 🔸 상단 필터 클릭 이벤트 처리
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
});

function initMapApp() {
  const container = document.getElementById('map');
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 7
  };
  map = new kakao.maps.Map(container, options);

  fetch("locations.json")
    .then(response => response.json())
    .then(locations => {
      locations.forEach(location => {
        const position = new kakao.maps.LatLng(location.lat, location.lng);

        const markerImage = new kakao.maps.MarkerImage(
          iconUrls[location.type] || iconUrls.public,
          new kakao.maps.Size(32, 32)
        );

        const marker = new kakao.maps.Marker({
          position,
          map,
          title: location.title,
          image: markerImage,
          draggable: isAdmin
        });

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

        if (isAdmin) {
          kakao.maps.event.addListener(marker, 'dragend', () => {
            const newPos = marker.getPosition();
            fetch("http://localhost:3000/update-location", {
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
                alert(`✅ 위치가 저장되었습니다:\n${data.message}`);
              })
              .catch(err => {
                alert("❌ 위치 저장 중 오류 발생: " + err.message);
              });
          });
        }

        markers.push(marker);
        allMarkers.push({ marker, data: location });
      });
    })
    .catch(err => console.error("마커 데이터를 불러오는 중 오류:", err));

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

        // ✅ 기존 마커 제거 후 새 마커 표시
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

      allMarkers.forEach(({ marker, data }) => {
        const distance = haversine(lat, lng, data.lat, data.lng);
        marker.setMap(nearbyMode ? map : (distance <= 1 ? map : null));
      });

      nearbyMode = !nearbyMode;
      const btn = document.getElementById("findNearby");
      btn.textContent = nearbyMode ? "전체 흡연구역 보기" : "내 근처 흡연구역 보기";
      btn.classList.toggle("active", nearbyMode);
    });
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





















