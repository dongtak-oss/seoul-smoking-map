let map;
let currentInfoWindow = null;
let markers = [];
let nearbyMode = false;
let allMarkers = [];

const iconColors = {
  public: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
  building: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png",
  cafe: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
  current: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
};

function initMap() {
  const seoul = { lat: 37.5665, lng: 126.9780 };
  map = new google.maps.Map(document.getElementById("map"), {
    center: seoul,
    zoom: 12,
  });

  fetch("locations.json")
    .then(response => response.json())
    .then(locations => {
      locations.forEach(location => {
        const marker = new google.maps.Marker({
          position: { lat: location.lat, lng: location.lng },
          map: map,
          title: location.title,
          icon: iconColors[location.type] || iconColors.public
        });

        const contentString = `
          <div style="max-width:200px">
            <h3>${location.title}</h3>
            ${location.image ? `<img src="${location.image}" alt="사진" style="width:100%; border-radius:8px;">` : ''}
            ${location.description ? `<p>${location.description}</p>` : ''}
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({ content: contentString });

        marker.addListener("click", () => {
          if (currentInfoWindow) currentInfoWindow.close();
          infoWindow.open(map, marker);
          currentInfoWindow = infoWindow;
        });

        markers.push(marker);
        allMarkers.push({ marker, data: location });
      });
    })
    .catch(error => console.error("흡연구역 데이터를 불러오는 중 오류 발생:", error));

  document.getElementById("findMe").addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          map.setCenter(userLocation);
          map.setZoom(15);

          new google.maps.Marker({
            position: userLocation,
            map: map,
            title: "내 위치",
            icon: iconColors.current
          });
        },
        () => alert("위치 정보를 가져올 수 없습니다.")
      );
    } else {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
  });

  document.getElementById("findNearby").addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        allMarkers.forEach(({ marker, data }) => {
          const distance = haversine(userLat, userLng, data.lat, data.lng);
          if (nearbyMode) {
            marker.setMap(map);
          } else {
            marker.setMap(distance <= 1 ? map : null);
          }
        });

        nearbyMode = !nearbyMode;
        const btn = document.getElementById("findNearby");
        btn.style.backgroundColor = nearbyMode ? "#dc3545" : "#28a745";
        btn.textContent = nearbyMode ? "전체 흡연구역 보기" : "내 근처 흡연구역 보기";
      },
      () => alert("위치 정보를 가져올 수 없습니다.")
    );
  });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}


