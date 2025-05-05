const express = require("express");
const app = express();

app.use(express.json());

// ✅ 루트 경로 추가
app.get("/", (req, res) => {
  res.send("Karen World Backend is running 🛠️");
});

// 기존 status 경로
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", remaining: 19960000 });
});

// ✅ Vercel에서 인식할 수 있도록 export
module.exports = (req, res) => app(req, res);