const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

const filePath = path.join(__dirname, "locations.json");



// ✅ 정적 파일 제공 (public 폴더)
app.use(express.static(path.join(__dirname, "public")));

app.use(cors());
app.use(express.json());

// ✅ index.html 렌더링 - 안전한 경로 지정
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html")); // ✅ 수정 포인트!
});

// ✅ 위치 목록 가져오기 API
app.get("/locations", (req, res) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("📁 위치 데이터 읽기 실패:", err);
      return res.status(500).json({ message: "위치 데이터를 읽을 수 없습니다." });
    }

    try {
      const locations = JSON.parse(data);
      res.json(locations);
    } catch (parseErr) {
      console.error("🧾 위치 데이터 파싱 실패:", parseErr);
      res.status(500).json({ message: "위치 데이터 파싱 실패" });
    }
  });
});

// ✅ 위치 업데이트 API
app.post("/update-location", (req, res) => {
  const { title, lat, lng } = req.body;

  if (!title || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "❌ 잘못된 요청입니다." });
  }

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

    locations[index].lat = lat;
    locations[index].lng = lng;

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













