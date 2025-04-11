const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ✅ 정적 파일 서빙 (script.js, style.css 등)
app.use(express.static(__dirname));

// ✅ index.html 제공
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ locations.json 제공
app.get("/locations", (req, res) => {
  fs.readFile(path.join(__dirname, "locations.json"), "utf8", (err, data) => {
    if (err) return res.status(500).json({ message: "읽기 오류" });
    try {
      res.json(JSON.parse(data));
    } catch (e) {
      res.status(500).json({ message: "JSON 파싱 오류" });
    }
  });
});

// ✅ 위치 저장
app.post("/update-location", (req, res) => {
  const { title, lat, lng } = req.body;
  const filePath = path.join(__dirname, "locations.json");

  if (!title || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ message: "잘못된 요청" });
  }

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ message: "파일 읽기 실패" });

    let locations;
    try {
      locations = JSON.parse(data);
    } catch {
      return res.status(500).json({ message: "파싱 오류" });
    }

    const index = locations.findIndex(loc => loc.title === title);
    if (index === -1) return res.status(404).json({ message: "해당 위치 없음" });

    locations[index].lat = lat;
    locations[index].lng = lng;

    fs.writeFile(filePath, JSON.stringify(locations, null, 2), "utf8", err => {
      if (err) return res.status(500).json({ message: "저장 실패" });
      res.json({ message: "저장 성공" });
    });
  });
});

// ✅ 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});


