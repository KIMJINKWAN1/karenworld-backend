const express = require("express");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const app = express();

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;
const CLAIM_FILE = path.join(__dirname, "claimed.json");

// ✅ Ensure claimed.json exists
if (!fs.existsSync(CLAIM_FILE)) fs.writeFileSync(CLAIM_FILE, JSON.stringify([]));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Karen World Backend is running 🛠️");
});

// ✅ Status API
app.get("/api/status", (req, res) => {
  try {
    const claimedList = JSON.parse(fs.readFileSync(CLAIM_FILE, "utf-8"));
    const count = claimedList.length;
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
    console.error("❌ Status read error:", err);
    res.status(500).json({ error: "Status check failed" });
  }
});

// ✅ Submit API
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
    const claimedList = JSON.parse(fs.readFileSync(CLAIM_FILE, "utf-8"));
    if (claimedList.includes(wallet)) {
      return res.status(409).json({ error: "This wallet already claimed the airdrop." });
    }

    // ✅ Send to Slack
    const slackResponse = await fetch(slackUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: `🎉 New Airdrop Claim!\n\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
      }),
    });

    const result = await slackResponse.json();
    if (!result.ok) {
      console.error("❌ Slack error:", result.error);
      return res.status(500).json({ error: "Slack message failed" });
    }

    // ✅ Save wallet to file
    claimedList.push(wallet);
    fs.writeFileSync(CLAIM_FILE, JSON.stringify(claimedList, null, 2));

    res.json({ success: true, amount: CLAIM_PER_USER });
  } catch (err) {
    console.error("❌ Submit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Export for Vercel compatibility
module.exports = (req, res) => app(req, res);