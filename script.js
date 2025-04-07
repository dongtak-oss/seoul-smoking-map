let map;
let currentInfoWindow = null;
let markers = [];
let allMarkers = [];
let nearbyMode = false;
const isAdmin = true;

const iconUrls = {
  public: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
  building: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  cafe: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
  current: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
};

document.addEventListener("DOMContentLoaded", () => {
  kakao.maps.load(initMapApp);
});

function initMapApp() {
  const container = document.getElementById('map');
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 7
  };
  map = new kakao.maps.Map(container, options);

  fetch("./locations.json")
    .then(res => res.json())
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
              <button onclick="closeInfoWindow()" style="border:none;background:none;font-size:16px;cursor:pointer;">✖</button>
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
            const pos = marker.getPosition();
            console.log(`[관리자] '${location.title}' 위치 수정됨`);
            console.log(`lat: ${pos.getLat()}, lng: ${pos.getLng()}`);
            alert(`'${location.title}' 위치가 수정되었습니다:\nlat: ${pos.getLat()}, lng: ${pos.getLng()}`);
          });
        }

        markers.push(marker);
        allMarkers.push({ marker, data: location });
      });
    })
    .catch(err => console.error("흡연구역 데이터 로딩 실패:", err));

  document.getElementById("findMe").addEventListener("click", () => {
    if (!navigator.geolocation) return alert("위치 정보 지원 안 함");

    navigator.geolocation.getCurrentPosition(pos => {
      const userLoc = new kakao.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      map.setCenter(userLoc);
      map.setLevel(4);

      const markerImage = new kakao.maps.MarkerImage(
        iconUrls.current, new kakao.maps.Size(32, 32)
      );

      new kakao.maps.Marker({
        position: userLoc,
        map: map,
        title: "내 위치",
        image: markerImage
      });
    }, () => alert("위치 정보를 가져올 수 없습니다."));
  });

  document.getElementById("findNearby").addEventListener("click", () => {
    if (!navigator.geolocation) return alert("위치 정보 지원 안 함");

    navigator.geolocation.getCurrentPosition(pos => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      allMarkers.forEach(({ marker, data }) => {
        const dist = haversine(userLat, userLng, data.lat, data.lng);
        marker.setMap(nearbyMode ? map : (dist <= 1 ? map : null));
      });

      nearbyMode = !nearbyMode;
      const btn = document.getElementById("findNearby");
      btn.classList.toggle("active", nearbyMode);
      btn.textContent = nearbyMode ? "전체 흡연구역 보기" : "내 근처 흡연구역 보기";
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
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

window.closeInfoWindow = () => {
  if (currentInfoWindow) currentInfoWindow.close();
};















