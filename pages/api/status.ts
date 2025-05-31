import { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../firebase/admin";
import fetch from "node-fetch"; // 👈 중요: node 환경에서는 직접 임포트 필요

const CLAIM_PER_USER = 2_000_000_000_000; // 2,000 KAREN (RAW)
const MAX_AIRDROP = 20_000_000_000_000_000; // 20,000,000 KAREN (RAW)
const COLLECTION_PATH = "airdrop/claims/claims";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 처리
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  try {
    // ✅ Firestore 수령 기록 조회
    const snapshot = await adminDb.collection(COLLECTION_PATH).get();
    const firestoreClaims = snapshot.size;

    // 🔄 Slack 메시지 조회
    let slackClaims = 0;
    let messages: any[] = [];
    if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) {
      const slackRes = await fetch(`https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`, {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
      });
      const slackData = await slackRes.json();
      if (slackData.ok) {
        messages = slackData.messages || [];
        slackClaims = messages.length;
      }
    }

    // ✅ 총 수령 수량 계산
    const claimed = firestoreClaims * CLAIM_PER_USER;
    const remaining = Math.max(0, MAX_AIRDROP - claimed);
    const percent = ((claimed / MAX_AIRDROP) * 100).toFixed(2);

    // ✅ 지갑 주소로 수령 여부 판단
    const wallet = req.query.address as string;
    let alreadyClaimed = false;

    if (wallet && wallet.startsWith("0x")) {
      const doc = await adminDb.collection(COLLECTION_PATH).doc(wallet).get();

      // Slack 메시지에서 지갑 주소 포함 여부 확인 (대소문자 구분 제거)
      const normalized = wallet.toLowerCase();
      const withoutPrefix = normalized.replace(/^0x/, "");

      const slackMatch = messages.some((msg) =>
        typeof msg.text === "string" &&
        (msg.text.toLowerCase().includes(normalized) || msg.text.toLowerCase().includes(withoutPrefix))
      );

      alreadyClaimed = doc.exists || slackMatch;
    }

    return res.status(200).json({
      status: "ok",
      total: MAX_AIRDROP,
      claimed,
      remaining,
      percent,
      ...(wallet && { wallet, alreadyClaimed }),
    });

  } catch (err: any) {
    console.error("❌ Error in /status:", err);
    return res.status(500).json({ error: "Failed to fetch airdrop status" });
  }
}
