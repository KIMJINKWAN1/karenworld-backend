import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import fetch from "node-fetch";
import admin from "firebase-admin";

const app = express();

// ✅ Constants
const CLAIM_PER_USER = 2_000_000_000_000n; // 2,000 KAREN (RAW)
const MAX_AIRDROP = 20_000_000_000_000_000n; // 20,000,000 KAREN (RAW)

// ✅ Firebase Init
try {
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
  };

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount as admin.ServiceAccount) });
    console.log("✅ Firebase initialized");
  }
} catch (err) {
  console.error("❌ Firebase init failed:", err);
}

const db = admin.firestore();
const claimsRef = db.collection("claims");

// ✅ Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// ✅ Default Route
app.get("/", (req, res) => {
  res.send("✅ Karen World Backend running");
});

// ✅ /api/status
app.get("/api/status", async (req, res) => {
  const { address } = req.query;
  try {
    if (address && typeof address === "string") {
      const doc = await claimsRef.doc(address).get();
      return res.json({ claimed: doc.exists });
    }

    const snapshot = await claimsRef.get();
    const claimedAmount = CLAIM_PER_USER * BigInt(snapshot.size);
    const remainingAmount = MAX_AIRDROP - claimedAmount;
    const percent = ((Number(claimedAmount) / Number(MAX_AIRDROP)) * 100).toFixed(2);

    return res.json({
      status: "ok",
      claimed: claimedAmount.toString(),
      remaining: remainingAmount.toString(),
      total: MAX_AIRDROP.toString(),
      percent,
      userCount: snapshot.size,
    });
  } catch (err) {
    console.error("❌ Status error:", err);
    return res.status(500).json({ error: "Status failed" });
  }
});

// ✅ /api/submit
const submitHandler = require("./submit");
app.post("/api/submit", submitHandler);

// ✅ Export for Vercel
module.exports = (req: VercelRequest, res: VercelResponse) => app(req, res);
