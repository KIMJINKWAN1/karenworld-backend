const express = require("express");
const fetch = require("node-fetch");
const admin = require("firebase-admin");
const app = express();

const CLAIM_PER_USER = 2_000_000_000_000;
const MAX_AIRDROP = 10_000_000_000_000;

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
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("✅ Firebase initialized");
  }
} catch (err) {
  console.error("❌ Firebase init failed:", err);
}

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
  res.send("✅ Karen World Backend running");
});

app.get("/api/status", async (req, res) => {
  const { address } = req.query;
  try {
    if (address) {
      const doc = await claimsRef.doc(address).get();
      return res.json({ claimed: doc.exists });
    }

    const snapshot = await claimsRef.get();
    const claimed = snapshot.size * CLAIM_PER_USER;
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
    return res.status(500).json({ error: "Status failed" });
  }
});

const submitHandler = require("./submit");

app.post("/api/submit", submitHandler);

module.exports = (req, res) => app(req, res);