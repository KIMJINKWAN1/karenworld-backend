const express = require("express");
const fetch = require("node-fetch");
const admin = require("firebase-admin");
const app = express();

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

// Firebase 초기화
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const claimsRef = db.collection("claims");

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Karen World Firebase Backend is running 🛠️");
});

// ✅ 특정 지갑 주소 상태 확인 API
app.get("/api/status", async (req, res) => {
  const { address } = req.query;

  try {
    if (address) {
      // 특정 주소 상태 조회
      const doc = await claimsRef.doc(address).get();
      if (doc.exists) {
        return res.json({ claimed: true });
      } else {
        return res.json({ claimed: false });
      }
    }

    // 전체 통계 반환
    const snapshot = await claimsRef.get();
    const count = snapshot.size;
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
    console.error("❌ Status check failed:", err);
    res.status(500).json({ error: "Status check failed" });
  }
});

app.post("/api/submit", async (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Missing wallet address" });

  const { SLACK_BOT_TOKEN, SLACK_CHANNEL_ID, SLACK_API_URL } = process.env;
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return res.status(500).json({ error: "Slack configuration missing" });
  }

  try {
    const doc = await claimsRef.doc(wallet).get();
    if (doc.exists) {
      return res.status(409).json({ error: "This wallet already claimed the airdrop." });
    }

    await claimsRef.doc(wallet).set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    const slackResponse = await fetch(SLACK_API_URL || "https://slack.com/api/chat.postMessage", {
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

    res.json({ success: true, amount: CLAIM_PER_USER });
  } catch (err) {
    console.error("❌ Submit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = (req, res) => app(req, res);