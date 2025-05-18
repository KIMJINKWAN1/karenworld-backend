const express = require("express");
const fetch = require("node-fetch");
const admin = require("firebase-admin");
const app = express();

// 에어드롭 설정
const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

// Firebase 초기화 (with try-catch for debugging)
try {
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
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase initialized");
  }
} catch (err) {
  console.error("❌ Firebase initialization failed:", err);
}

const db = admin.firestore();
const claimsRef = db.collection("claims");

// ✅ CORS 설정
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://karen-world-clean.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});
app.use(express.json());

// ✅ 기본 라우트
app.get("/", (req, res) => {
  res.send("🛠️ Karen World Backend is live");
});

// ✅ 상태 API - 전체 or 단일 지갑
app.get("/api/status", async (req, res) => {
  const { address } = req.query;

  try {
    if (address) {
      const doc = await claimsRef.doc(address).get();
      return res.json({ claimed: doc.exists });
    }

    const snapshot = await claimsRef.get();
    const count = snapshot.size;
    const claimed = count * CLAIM_PER_USER;
    const remaining = MAX_AIRDROP - claimed;

    return res.json({
      status: "ok",
      claimed,
      remaining,
      total: MAX_AIRDROP,
      percent: ((claimed / MAX_AIRDROP) * 100).toFixed(2),
    });
  } catch (err) {
    console.error("❌ Status error:", err);
    return res.status(500).json({ error: "Status check failed" });
  }
});

// ✅ 에어드롭 제출 API
app.post("/api/submit", async (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Missing wallet address" });

  const { SLACK_BOT_TOKEN, SLACK_CHANNEL_ID } = process.env;

  try {
    const existing = await claimsRef.doc(wallet).get();
    if (existing.exists) {
      return res.status(409).json({ error: "This wallet already claimed the airdrop." });
    }

    await claimsRef.doc(wallet).set({ timestamp: new Date() });

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: `🎉 New Airdrop Claim!\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
      }),
    });

    const result = await slackRes.json();
    if (!result.ok) console.error("❌ Slack error:", result.error);

    return res.json({ success: true, amount: CLAIM_PER_USER });
  } catch (err) {
    console.error("❌ Submit error:", err);
    return res.status(500).json({ error: "Airdrop submission failed" });
  }
});

// ✅ Vercel 서버리스 함수 export
module.exports = (req, res) => app(req, res);