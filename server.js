const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors"); // ✅ 모듈 방식으로 CORS 사용

const app = express();
const PORT = 3000;

app.use(cors()); // ✅ 모든 출처 허용
app.use(express.json()); // ✅ JSON 요청 바디 파싱

// ✅ 마커 위치 업데이트 API
app.post("/update-location", (req, res) => {
  const { title, lat, lng } = req.body;

  if (!title || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "❌ 잘못된 요청입니다." });
  }

  const filePath = path.join(__dirname, "locations.json");

  // ✅ locations.json 읽기
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("📁 파일 읽기 실패:", err);
      return res.status(500).json({ message: "파일 읽기 실패" });
    }

    let locations;
    try {
      locations = JSON.parse(data);
    } catch (parseErr) {
      console.error("🧾 JSON 파싱 오류:", parseErr);
      return res.status(500).json({ message: "JSON 파싱 오류" });
    }

    const index = locations.findIndex(loc => loc.title === title);

    if (index === -1) {
      return res.status(404).json({ message: "해당 위치를 찾을 수 없습니다." });
    }

    // ✅ 위치 정보 수정
    locations[index].lat = lat;
    locations[index].lng = lng;

    // ✅ 다시 저장
    fs.writeFile(filePath, JSON.stringify(locations, null, 2), "utf8", err => {
      if (err) {
        console.error("📄 파일 쓰기 실패:", err);
        return res.status(500).json({ message: "위치 저장 실패" });
      }

      console.log(`✅ 위치 저장됨: ${title} → (${lat}, ${lng})`);
      res.json({ message: "위치 저장 성공" });
    });
  });
});

// ✅ 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});








