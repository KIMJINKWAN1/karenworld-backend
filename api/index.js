const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json());

// ✅ 루트 경로
app.get("/", (req, res) => {
  res.send("Karen World Backend is running 🛠️");
});

// ✅ 상태 확인
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", remaining: 19960000 });
});

// ✅ 에어드롭 제출 처리
app.post("/api/submit", async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "Missing address" });

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `📥 Airdrop submitted: ${address}` }),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Slack send error:", err);
    return res.status(500).json({ error: "Slack failed" });
  }
});

// ✅ Vercel 호환 익스프레스 핸들러
module.exports = (req, res) => app(req, res);