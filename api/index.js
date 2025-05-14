const express = require("express");
const fetch = require("node-fetch");
const app = express();

// ✅ CORS configuration
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Or specify your frontend URL
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// ✅ Root endpoint
app.get("/", (req, res) => {
  res.send("Karen World Backend is running 🛠️");
});

// ✅ Airdrop status API
app.get("/api/status", async (req, res) => {
  const CLAIM_PER_USER = 2000;
  const MAX_AIRDROP = 20000000;

  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return res.status(500).json({ error: "Slack configuration missing" });
  }

  try {
    const slackResponse = await fetch(
      `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
      }
    );
    const data = await slackResponse.json();
    if (!data.ok) throw new Error(data.error || "Slack API error");

    const count = data.messages?.length || 0;
    const claimed = count * CLAIM_PER_USER;
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

// ✅ Airdrop submit API
app.post("/api/submit", async (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Missing wallet address" });

  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
  const slackUrl = process.env.SLACK_API_URL || "https://slack.com/api/chat.postMessage";

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return res.status(500).json({ error: "Slack configuration missing" });
  }

  try {
    const slackResponse = await fetch(slackUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: `🎉 New Airdrop Claim!\n\nWallet: ${wallet}\nAmount: 2000 $KAREN`,
      }),
    });

    const result = await slackResponse.json();
    if (!result.ok) {
      console.error("❌ Slack message error:", result.error);
      return res.status(500).json({ error: "Slack message failed" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Slack send error:", err);
    res.status(500).json({ error: "Slack failed" });
  }
});

// ✅ Export for Vercel compatibility
module.exports = (req, res) => app(req, res);