function initMap() {
    // 🔹 1. 지도 기본 설정
    var map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 37.5665, lng: 126.9780 }, // 기본 중심: 서울
        zoom: 14
    });

    // 🔹 2. JSON 파일에서 흡연구역 데이터 불러오기
    fetch("locations.json")
        .then(response => response.json())
        .then(locations => {
            locations.forEach(function(location) {
                new google.maps.Marker({
                    position: location,
                    map: map,
                    title: location.title
                });
            });
        })
        .catch(error => console.error("데이터를 불러오는 중 오류 발생:", error));

    // 🔹 3. 내 위치 가져오기 (GPS)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // 🔹 4. 내 위치 마커 추가
            var userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                title: "내 위치",
                icon: {
                    url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" // 파란색 마커
                }
            });

            // 🔹 5. 내 위치로 지도 이동
            map.setCenter(userLocation);
        }, function () {
            alert("위치 정보를 가져올 수 없습니다.");
        });
    } else {
        alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
}
