const express = require("express");
const app = express();

app.use(express.json());

app.get("/api/status", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/submit", (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "No wallet provided" });

  // 처리 로직 (슬랙 연동 등)
  res.status(200).json({ success: true });
});

module.exports = app;