function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: 37.5665, lng: 126.9780 }, // 서울 중심
      zoom: 11,
    });
  
    fetch("locations.json")
      .then(response => response.json())
      .then(locations => {
        locations.forEach(loc => {
          const marker = new google.maps.Marker({
            position: { lat: loc.lat, lng: loc.lng },
            map: map,
            title: loc.title,
          });
  
          const contentString = `
            <div style="max-width:200px">
              <h3>${loc.title}</h3>
              ${loc.image ? `<img src="${loc.image}" alt="사진" style="width:100%; border-radius:8px;">` : ''}
              ${loc.description ? `<p>${loc.description}</p>` : ''}
            </div>
          `;
  
          const infowindow = new google.maps.InfoWindow({
            content: contentString
          });
  
          marker.addListener("click", () => {
            infowindow.open(map, marker);
          });
        });
      });
  }
  
