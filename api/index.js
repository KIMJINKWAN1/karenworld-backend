const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json());

// ✅ 루트 경로
app.get("/", (req, res) => {
  res.send("Karen World Backend is running 🛠️");
});

// ✅ 상태 확인
app.get("/api/status", async (req, res) => {
  const CLAIM_PER_USER = 2000;
  const MAX_AIRDROP = 20000000;

  try {
    const slackResponse = await fetch(
      `https://slack.com/api/conversations.history?channel=${process.env.SLACK_CHANNEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SLACK_TOKEN}`,
        },
      }
    );

    const data = await slackResponse.json();
    const claimedCount = data.messages?.length || 0;
    const claimed = claimedCount * CLAIM_PER_USER;
    const remaining = MAX_AIRDROP - claimed;

    res.json({
      status: "ok",
      claimed,
      remaining,
      total: MAX_AIRDROP,
      percent: ((claimed / MAX_AIRDROP) * 100).toFixed(2),
    });
  } catch (err) {
    console.error("❌ Failed to fetch Slack messages:", err);
    res.status(500).json({ error: "Slack fetch failed" });
  }
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

// ✅ CORS 설정
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // 또는 특정 origin 지정
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());

app.get("/api/status", (req, res) => {
  res.json({ status: "ok", claimed: 0, remaining: 20000000, total: 20000000, percent: "0.00" });
});

app.post("/api/submit", (req, res) => {
  res.json({ message: "Airdrop claimed", amount: 2000 });
});

// ✅ Vercel 호환 익스프레스 핸들러
module.exports = (req, res) => app(req, res);