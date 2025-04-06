let map;
let currentInfoWindow = null;

function initMap() {
  const seoul = { lat: 37.5665, lng: 126.9780 };
  map = new google.maps.Map(document.getElementById("map"), {
    center: seoul,
    zoom: 12,
  });

  const iconUrls = {
    public: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
    cafe: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
    building: "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
  };

  // 흡연구역 마커 불러오기
  fetch("locations.json")
    .then(response => response.json())
    .then(locations => {
      locations.forEach(location => {
        const marker = new google.maps.Marker({
          position: { lat: location.lat, lng: location.lng },
          map: map,
          title: location.title,
          icon: iconUrls[location.type] || iconUrls.public
        });

        const contentString = `
          <div style="max-width:200px">
            <h3>${location.title}</h3>
            ${location.image ? `<img src="${location.image}" alt="사진" style="width:100%; border-radius:8px;">` : ''}
            ${location.description ? `<p>${location.description}</p>` : ''}
          </div>
        `;

        const infoWindow = new google.maps.InfoWindow({
          content: contentString
        });

        marker.addListener("click", () => {
          if (currentInfoWindow) currentInfoWindow.close();
          infoWindow.open(map, marker);
          currentInfoWindow = infoWindow;
        });
      });
    })
    .catch(error => console.error("흡연구역 데이터를 불러오는 중 오류 발생:", error));

  // 내 위치 찾기 버튼 기능
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
            icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          });
        },
        () => {
          alert("위치 정보를 가져올 수 없습니다.");
        }
      );
    } else {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
  });
}


