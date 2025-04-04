function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 37.5665, lng: 126.9780 },
      zoom: 11,
    });
  
    let currentInfoWindow = null;
  
    // 사용자의 현재 위치 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
  
          // 사용자 위치 마커 추가
          new google.maps.Marker({
            position: userLocation,
            map: map,
            title: "현재 위치",
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            },
          });
  
          map.setCenter(userLocation);
          map.setZoom(14); // 근처 보기 좋게 확대
  
          // 위치 가져온 후 마커 표시
          loadMarkers(map, userLocation);
        },
        () => {
          console.error("위치 정보를 가져올 수 없습니다.");
          loadMarkers(map); // 현재 위치 없이 마커만 표시
        }
      );
    } else {
      console.error("이 브라우저는 위치 정보를 지원하지 않습니다.");
      loadMarkers(map); // 현재 위치 없이 마커만 표시
    }
  }
  
  function loadMarkers(map, userLocation = null) {
    fetch("locations.json")
      .then((response) => response.json())
      .then((locations) => {
        let currentInfoWindow = null;
  
        locations.forEach((loc) => {
          const marker = new google.maps.Marker({
            position: { lat: loc.lat, lng: loc.lng },
            map: map,
            title: loc.title,
          });
  
          const contentString = `
            <div style="max-width:200px">
              <h3>${loc.title}</h3>
              ${loc.image ? `<img src="${loc.image}" alt="사진" style="width:100%; border-radius:8px;">` : ""}
              ${loc.description ? `<p>${loc.description}</p>` : ""}
            </div>
          `;
  
          const infowindow = new google.maps.InfoWindow({
            content: contentString,
          });
  
          marker.addListener("click", () => {
            if (currentInfoWindow) {
              currentInfoWindow.close();
            }
            infowindow.open(map, marker);
            currentInfoWindow = infowindow;
          });
  
          // 사용자 위치가 있으면 근처 흡연구역 강조
          if (userLocation) {
            const distance = getDistance(userLocation, { lat: loc.lat, lng: loc.lng });
            if (distance < 1000) { // 1km 이내
              marker.setIcon("http://maps.google.com/mapfiles/ms/icons/green-dot.png");
            }
          }
        });
      });
  }
  
  // 두 위치 사이 거리 계산 (미터)
  function getDistance(loc1, loc2) {
    const R = 6371e3; // 지구 반지름 (m)
    const φ1 = (loc1.lat * Math.PI) / 180;
    const φ2 = (loc2.lat * Math.PI) / 180;
    const Δφ = ((loc2.lat - loc1.lat) * Math.PI) / 180;
    const Δλ = ((loc2.lng - loc1.lng) * Math.PI) / 180;
  
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
    return R * c; // 거리 (m)
  }
  
  
  
