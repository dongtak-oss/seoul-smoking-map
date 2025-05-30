// ✅ 앱에서만 인트로 보여주기
function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true; // iOS 지원
}

document.addEventListener("DOMContentLoaded", () => {
  const intro = document.getElementById("intro-screen");
  const hasSeenIntro = sessionStorage.getItem("hasSeenIntro");

  if (isStandaloneApp() && intro && !hasSeenIntro) {
    intro.classList.remove("hidden");
    setTimeout(() => {
      intro.classList.add("hidden");
      sessionStorage.setItem("hasSeenIntro", "true");
    }, 2000);
  }
});


function showConfirmModal(callback) {
  const modal = document.getElementById("confirm-modal");
  const yesBtn = document.getElementById("confirm-yes");
  const noBtn = document.getElementById("confirm-no");

  if (!modal || !yesBtn || !noBtn) {
    console.error("❌ 모달 요소가 존재하지 않습니다.");
    return;
  }

  modal.classList.remove("hidden");

  const cleanUp = () => {
    modal.classList.add("hidden");
    yesBtn.onclick = null;
    noBtn.onclick = null;
  };

  yesBtn.onclick = () => {
    cleanUp();
    callback(true);
  };

  noBtn.onclick = () => {
    cleanUp();
    callback(false);
  };
}  

function showLocationConfirmModal(callback) {
  const modal = document.getElementById("location-confirm-modal");
  const yesBtn = document.getElementById("location-confirm-yes");
  const noBtn = document.getElementById("location-confirm-no");

  if (!modal || !yesBtn || !noBtn) {
    console.error("❌ 위치 수정 모달 요소가 없습니다.");
    return;
  }

  modal.classList.remove("hidden");

  const cleanUp = () => {
    modal.classList.add("hidden");
    yesBtn.onclick = null;
    noBtn.onclick = null;
  };

  yesBtn.onclick = () => {
    cleanUp();
    callback(true);
  };

  noBtn.onclick = () => {
    cleanUp();
    callback(false);
  };
}



// ✅ script.js 시작점 - kakao map 초기화
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
let reviewData = {}; // ✅ 리뷰 데이터를 담는 전역 변수
let isReporting = false;
let reportMarker = null;
let isEditingLocation = false;


const iconUrls = {
  public: 'images/marker_public.png',
  building: 'images/marker_building.png',
  cafe: 'images/marker_cafe.png',
  current: 'images/marker_current_v2.png'
};

function hidePreviewCard() {
  const previewCard = document.getElementById("info-preview-card");
  const fullCard = document.getElementById("info-full-card");
  if (previewCard) previewCard.classList.add("hidden");
  if (fullCard) fullCard.classList.add("hidden");
}

function initMapApp() {
  const container = document.getElementById('map');
  const options = {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 7
  };
  map = new kakao.maps.Map(container, options);

 kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
  const lat = mouseEvent.latLng.getLat();
  const lng = mouseEvent.latLng.getLng();

  // ✅ 1. 위치 수정 요청 모드일 때 (isEditingLocation)
if (isEditingLocation) {
  if (reportMarker) reportMarker.setMap(null);

  reportMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(lat, lng),
    map: map
  });

  // ✅ 마커 클릭 시에도 confirm 메시지
  kakao.maps.event.addListener(reportMarker, 'click', () => {
  showLocationConfirmModal((confirmed) => {
    if (confirmed) {
      isEditingLocation = false;

      if (reportMarker) {
        reportMarker.setMap(null);
        reportMarker = null;
      }

      allMarkers.forEach(({ marker }) => marker.setMap(map));

      const cancelBtn = document.getElementById("cancel-edit-button");
      if (cancelBtn) cancelBtn.classList.add("hidden");

      const formURL = `https://docs.google.com/forms/d/e/1FAIpQLSfNb8DGeHtuLI1RTn3WuYbBnvyi_uDH4jyWOPkBHvzGJ5GY-A/viewform?usp=pp_url&entry.2071247198=${lat}&entry.424300870=${lng}`;
      window.open(formURL, "_blank");
    } else {
      console.log("❎ 위치 수정 요청 취소됨 (마커 클릭)");
    }
  });
});


  // ✅ 지도 클릭 직후에도 confirm 메시지
  setTimeout(() => {
  showLocationConfirmModal((confirmed) => {
    if (confirmed) {
      isEditingLocation = false;

      if (reportMarker) {
        reportMarker.setMap(null);
        reportMarker = null;
      }

      allMarkers.forEach(({ marker }) => marker.setMap(map));

      const cancelBtn = document.getElementById("cancel-edit-button");
      if (cancelBtn) cancelBtn.classList.add("hidden");

      const formURL = `https://docs.google.com/forms/d/e/1FAIpQLSfNb8DGeHtuLI1RTn3WuYbBnvyi_uDH4jyWOPkBHvzGJ5GY-A/viewform?usp=pp_url&entry.2071247198=${lat}&entry.424300870=${lng}`;
      window.open(formURL, "_blank");
    } else {
      console.log("❎ 위치 수정 요청 취소됨 (지도 클릭)");
    }
  });
}, 300);


  return; // ✅ 아래 일반 제보 처리와 겹치지 않도록
}


   // ✅ 2. 일반 제보 모드일 때
  if (!isReporting) return;

  if (reportMarker) {
    reportMarker.setMap(null);
  }

  // ✅ 마커 생성
  reportMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(lat, lng),
    map: map
  });

  // ✅ 마커 클릭 시에도 confirm 메시지 뜨도록
  kakao.maps.event.addListener(reportMarker, 'click', () => {
  showConfirmModal((confirmed) => {
    if (confirmed) {
      isReporting = false;
      const text = document.querySelector("#report-button span");
      if (text) text.textContent = "제보";
      if (reportMarker) {
        reportMarker.setMap(null);
        reportMarker = null;
      }
      allMarkers.forEach(({ marker }) => marker.setMap(map));

      const formURL = `https://docs.google.com/forms/d/e/1FAIpQLSc3_-JBMHCq4XA2Js7EXyc524-mQT-at3za3r33kaoYb0QMiw/viewform?entry.87466096=${lat}&entry.1277009563=${lng}`;
      window.open(formURL, "_blank");
    } else {
      console.log("❎ 제보 취소됨 (마커 클릭)");
    }
  });
});


  // ✅ 지도 클릭 직후에도 confirm
  setTimeout(() => {
  showConfirmModal((confirmed) => {
    if (confirmed) {
      isReporting = false;
      const text = document.querySelector("#report-button span");
      if (text) text.textContent = "제보";
      if (reportMarker) {
        reportMarker.setMap(null);
        reportMarker = null;
      }
      allMarkers.forEach(({ marker }) => marker.setMap(map));

      const formURL = `https://docs.google.com/forms/d/e/1FAIpQLSc3_-JBMHCq4XA2Js7EXyc524-mQT-at3za3r33kaoYb0QMiw/viewform?entry.87466096=${lat}&entry.1277009563=${lng}`;
      window.open(formURL, "_blank");
    } else {
      console.log("❎ 제보 취소됨 (지도 클릭)");
    }
  });
}, 300);

});






  // ✅ 리뷰 데이터 가져오기
fetch("review.json")
.then(res => res.json())
.then(data => {
  reviewData = data;
  console.log("✅ 리뷰 데이터 불러오기 성공", reviewData);
})
.catch(err => {
  console.error("❌ 리뷰 데이터 불러오기 실패", err);
});


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
              .then(data => console.log("📍 저장됨:", data.message))
              .catch(err => console.error("❌ 저장 오류:", err));
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

          const encodedTitle = encodeURIComponent(location.title);
          const encodedAddress = encodeURIComponent(location.address);
          const encodedId = encodeURIComponent(location.id);

         const formURL = `https://docs.google.com/forms/d/e/1FAIpQLScRA9YMa1AcckQ9RvhfuRyWzG9WW77iTZm1qJhqc0HdObb5Dg/viewform?entry.1819958639=${encodedTitle}&entry.844881344=${encodedAddress}&entry.443612047=${encodedId}`;
          document.getElementById("review-button").href = formURL;
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

      if (!nearbyMode) {
        map.setLevel(7);
      }

      const btn = document.getElementById("findNearby");
      const icon = btn.querySelector("img");
      const text = btn.querySelector("span");

      if (nearbyMode) {
        icon.src = "images/icon_all_v2.png";
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
        hidePreviewCard();
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
  const a = Math.sin(dLat / 2) ** 2 +
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

function showPreviewCard(location) {
  document.getElementById("preview-title").textContent = location.title;
  document.getElementById("preview-description").textContent = location.description || '';
  document.getElementById("preview-image").src =
    location.images && location.images.length > 0 ? location.images[0] : '';
  document.getElementById("preview-image").style.objectPosition = "center bottom";
  document.getElementById("info-preview-card").dataset.locationData = JSON.stringify(location);
  document.getElementById("info-preview-card").classList.remove("hidden");
  document.getElementById("info-full-card").classList.add("hidden");
}

function showFullCard(location) {
   // ✅ 리뷰 상태 초기화 (존재할 때만)
const toggleBtn = document.getElementById("toggle-reviews"); // ✅ ID 수정
const reviewSection = document.getElementById("review-section");

if (toggleBtn && reviewSection) {
  toggleBtn.textContent = "리뷰 보기 ⬇"; // ✅ 버튼 초기 텍스트도 정확히 설정
  reviewSection.classList.add("hidden");
}

  document.getElementById("full-title").textContent = location.title;
  document.getElementById("full-description").textContent = location.description || '';
  initCarousel(location.images);
  document.getElementById("full-type").textContent = location.form || '정보 없음';

  const reviews = reviewData[location.id] || {};
const positive = reviews.positive?.length
  ? reviews.positive.map(r => `<li class="review positive">[긍정적] ${r}</li>`).join('')
  : '<li>아직 긍정적인 리뷰가 없습니다.</li>';

const negative = reviews.negative?.length
  ? reviews.negative.map(r => `<li class="review negative">[부정적] ${r}</li>`).join('')
  : '<li>아직 부정적인 리뷰가 없습니다.</li>';

document.getElementById("review-list").innerHTML = positive + negative;


  const encodedTitle = encodeURIComponent(location.title);
  const encodedAddress = encodeURIComponent(location.address);
  const encodedId = encodeURIComponent(location.id);

const formURL = `https://docs.google.com/forms/d/e/1FAIpQLScRA9YMa1AcckQ9RvhfuRyWzG9WW77iTZm1qJhqc0HdObb5Dg/viewform?entry.1819958639=${encodedTitle}&entry.844881344=${encodedAddress}&entry.443612047=${encodedId}`;

  document.getElementById("review-button").href = formURL;

  document.getElementById("info-full-card").dataset.locationId = location.id;


  document.getElementById("info-full-card").classList.remove("hidden");
  document.getElementById("info-preview-card").classList.add("hidden");

  // ✅ 정보 수정 팝업 관련
  const editBtn = document.getElementById("edit-info-button");
  const popup = document.getElementById("edit-options-popup");
  const backdrop = document.getElementById("popup-backdrop"); // ✅ 이 줄을 추가!
  const closeEditPopupBtn = document.getElementById("close-edit-popup");
  const infoEditBtn = document.getElementById("request-info-edit");
  const locationEditBtn = document.getElementById("request-location-edit");

  if (editBtn && popup && closeEditPopupBtn && infoEditBtn && locationEditBtn) {
    // ✅ 이전 이벤트 제거 후 새로 등록
    editBtn.onclick = () => {
      popup.classList.remove("hidden");
      backdrop.classList.remove("hidden"); // ✅ 추가
    };

    closeEditPopupBtn.onclick = () => {
      popup.classList.add("hidden");
       backdrop.classList.add("hidden"); // ✅ 추가
    };

    infoEditBtn.onclick = () => {
      window.open(
        'https://docs.google.com/forms/d/e/1FAIpQLSfsRIn5BGRF-UIuXi8Ya_my2jj3KS1ZZNynb_Uts9czxs7YZA/viewform?usp=preview',
    '_blank'
      );
      popup.classList.add("hidden");
      backdrop.classList.add("hidden"); // ✅ 추가
    };

    locationEditBtn.onclick = () => {
      popup.classList.add("hidden");
      backdrop.classList.add("hidden"); // ✅ 추가

      document.getElementById("cancel-edit-button").classList.remove("hidden");


      // ✅ 정보창 닫기
  document.getElementById("info-full-card").classList.add("hidden");

  // ✅ 현재 보고 있는 흡연구역의 ID 추출
  const targetId = document.getElementById("info-full-card").dataset.locationId;

  // ✅ 해당 마커만 남기고 나머지 숨김
  allMarkers.forEach(({ marker, data }) => {
    if (data.id === targetId) {
      marker.setMap(map); // 현재 마커는 유지
    } else {
      marker.setMap(null); // 나머지는 숨김
    }
  });

  // ✅ 해당 마커 위치로 중심 이동 및 줌인
  const targetLatLng = new kakao.maps.LatLng(location.lat, location.lng);
  map.setCenter(targetLatLng);
  map.setLevel(2); // 숫자가 작을수록 확대됨

  // ✅ 위치 수정 모드로 전환
  isEditingLocation = true;
      
  // ✅ 다음 단계로 위치 수정 모드 전환 플래그 설정 필요
      alert("위치 수정 요청 모드로 전환되었습니다. 지도에서 수정할 위치를 클릭하세요.");
    };
    // ✅ 배경 클릭 시에도 닫히도록
  backdrop.onclick = () => {
    popup.classList.add("hidden");
    backdrop.classList.add("hidden");
  };
  }
}

document.addEventListener("DOMContentLoaded", () => {

  // ✅ 위치 수정 모드 종료 버튼
const cancelEditBtn = document.getElementById("cancel-edit-button");

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    // 플래그 초기화
    isEditingLocation = false;

    // 마커 제거
    if (reportMarker) {
      reportMarker.setMap(null);
      reportMarker = null;
    }

    // 전체 마커 복원
    allMarkers.forEach(({ marker }) => marker.setMap(map));

    // 버튼 숨기기
    cancelEditBtn.classList.add("hidden");

    // 정보창 다시 표시
    const locationId = document.getElementById("info-full-card").dataset.locationId;
    const locationData = allMarkers.find(({ data }) => data.id === locationId)?.data;

    if (locationData) {
      showFullCard(locationData); // ✅ 이전 정보창 복원
    }
  });
}


  const closePreviewBtn = document.getElementById("close-preview");
  if (closePreviewBtn) {
    closePreviewBtn.addEventListener("click", () => {
      document.getElementById("info-preview-card").classList.add("hidden");
    });
  }

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

  const toggleBtn = document.getElementById("toggle-reviews");
  const reviewSection = document.getElementById("review-section");

  if (toggleBtn && reviewSection) {
    toggleBtn.addEventListener("click", () => {
      const isHidden = reviewSection.classList.contains("hidden");
      if (isHidden) {
        reviewSection.classList.remove("hidden");
        toggleBtn.textContent = "리뷰 접기 ⬆";
      } else {
        reviewSection.classList.add("hidden");
        toggleBtn.textContent = "리뷰 보기 ⬇";
      }
    });
  }

  // ✅ 제보 버튼 기능 추가
const reportBtn = document.getElementById("report-button");

if (reportBtn) {
  reportBtn.addEventListener("click", () => {
    isReporting = !isReporting;

    const icon = reportBtn.querySelector("img");  // ✅ 아이콘 요소
    const text = reportBtn.querySelector("span");

    if (isReporting) {
      hidePreviewCard();
      markers.forEach(marker => marker.setMap(null));
      alert("제보할 위치를 지도에서 클릭해주세요.");

      // ✅ 텍스트 + 아이콘 변경
      text.textContent = "취소";
      icon.src = "images/icon_cancel.png";
      icon.alt = "제보 취소";
    } else {
      allMarkers.forEach(({ marker }) => marker.setMap(map));
      if (reportMarker) {
        reportMarker.setMap(null);
        reportMarker = null;
      }

      // ✅ 원래대로 복귀
      text.textContent = "제보";
      icon.src = "images/icon_report.png";
      icon.alt = "제보하기";
    }
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    // ✅ 전체 지도 초기화
    isReporting = false;
    activeType = null;
    nearbyMode = false;

    // ✅ 지도 위치/줌 초기화
    map.setCenter(new kakao.maps.LatLng(37.5665, 126.9780)); // 원하는 기본 중심 좌표
    map.setLevel(7); // 원하는 초기 줌 레벨

    // ✅ 제보 마커 제거
    if (reportMarker) {
      reportMarker.setMap(null);
      reportMarker = null;
    }

    // ✅ 전체 마커 복원
    allMarkers.forEach(({ marker }) => marker.setMap(map));

    // ✅ 제보 버튼 상태 복원
    const reportBtn = document.getElementById("report-button");
    const icon = reportBtn.querySelector("img");
    const text = reportBtn.querySelector("span");

    if (text) text.textContent = "제보";
    if (icon) {
      icon.src = "images/icon_report.png";
      icon.alt = "제보하기";
    }

     // ✅ ✅ ✅ 여기 추가: X 버튼 숨기기
    const cancelEditBtn = document.getElementById("cancel-edit-button");
    if (cancelEditBtn) cancelEditBtn.classList.add("hidden");

    console.log("✅ 연지도 상태 완전 초기화 완료 (폼에서 복귀)");
  }
});






  // ✅ ⬇︎ 이 아래에 검색창 기능 삽입!
  const searchInput = document.getElementById("search-input");

  if (searchInput) {
    // ✅ [추가] 모바일 클로즈업 방지
    searchInput.addEventListener("focus", (e) => {
      setTimeout(() => {
        e.target.scrollIntoView({
          block: "nearest",
          behavior: "smooth"
        });
      }, 50);
    });
    
    searchInput.addEventListener("input", function (e) {
      const keyword = e.target.value.trim().toLowerCase();

      allMarkers.forEach(({ marker, data }) => {
        const { title, address, description } = data;
        const text = `${title} ${address} ${description}`.toLowerCase();

        if (text.includes(keyword)) {
          marker.setMap(map);
        } else {
          marker.setMap(null);
        }
      });
    });
  }
});

let currentSlide = 0;

function initCarousel(images) {
  const container = document.getElementById("carousel-images");
  container.innerHTML = "";
  images.forEach((src) => {
    const img = document.createElement("img");
    img.src = src;
    container.appendChild(img);
  });

  currentSlide = 0;
  updateCarousel();
}

function updateCarousel() {
  const container = document.getElementById("carousel-images");
  const total = container.children.length;
  container.style.transform = `translateX(-${currentSlide * 100}%)`;
  document.getElementById("carousel-prev").style.display = currentSlide === 0 ? "none" : "block";
  document.getElementById("carousel-next").style.display = currentSlide === total - 1 ? "none" : "block";
}

document.getElementById("carousel-prev").addEventListener("click", () => {
  const total = document.getElementById("carousel-images").children.length;
  currentSlide = (currentSlide - 1 + total) % total;
  updateCarousel();
});

document.getElementById("carousel-next").addEventListener("click", () => {
  const total = document.getElementById("carousel-images").children.length;
  currentSlide = (currentSlide + 1) % total;
  updateCarousel();
});


