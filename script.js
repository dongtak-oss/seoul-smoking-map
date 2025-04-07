let map;
let currentInfoWindow = null;
let markers = [];
let nearbyMode = false;
let allMarkers = [];

// ✅ 관리자 여부 설정
const isAdmin = true;

// 타입별 마커 색상 (Google Maps 아이콘 사용)
const iconUrls = {
  public: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  building: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  cafe: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
  current: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
};

document.addEventListener("DOMContentLoaded", initMapApp);

function initMapApp() {
  const container = document.getElementById('map');
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 7
  };
  map = new kakao.maps.Map(container, options);

  // 마커 불러오기
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
          position: position,
          map: map,
          title: location.title,
          image: markerImage,
          draggable: isAdmin // ✅ 관리자만 드래그 가능
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

        // ✅ 드래그 끝났을 때 좌표 출력 (관리자일 경우)
        if (isAdmin) {
          kakao.maps.event.addListener(marker, 'dragend', function () {
            const newPos = marker.getPosition();
            console.log(`🧭 '${location.title}' 위치 수정됨`);
            console.log(`lat: ${newPos.getLat()}, lng: ${newPos.getLng()}`);
            alert(`'${location.title}'의 위치가 수정되었습니다:\nlat: ${newPos.getLat()}, lng: ${newPos.getLng()}`);
          });
        }

        markers.push(marker);
        allMarkers.push({ marker, data: location });
      });
    })
    .catch(err => console.error("마커 데이터를 불러오는 중 오류 발생:", err));

  // 내 위치 찾기 버튼
  document.getElementById("findMe").addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const userLoc = new kakao.maps.LatLng(lat, lng);

        map.setCenter(userLoc);
        map.setLevel(4);

        const markerImage = new kakao.maps.MarkerImage(
          iconUrls.current,
          new kakao.maps.Size(32, 32)
        );

        new kakao.maps.Marker({
          position: userLoc,
          map: map,
          title: "내 위치",
          image: markerImage
        });
      }, () => alert("위치 정보를 가져올 수 없습니다."));
    } else {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
  });

  // 내 근처 흡연구역 보기 버튼
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
    }, () => alert("위치 정보를 가져올 수 없습니다."));
  });
}

// 거리 계산
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// 정보창 닫기 함수
window.closeInfoWindow = function () {
  if (currentInfoWindow) currentInfoWindow.close();
};
















