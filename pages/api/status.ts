import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";
import fetch from "node-fetch";

// ✅ .env 설정값 가져오기
const COLLECTION_PATH = process.env.AIRDROP_COLLECTION_PATH || "airdrop/claims/claims";
const CLAIM_PER_USER = BigInt(process.env.AIRDROP_AMOUNT || "2000");
const MAX_AIRDROP = BigInt(process.env.MAX_AIRDROP_TOTAL || "200000000");
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { wallet } = req.body;

  try {
    // ✅ Firestore에서 수령자 수 조회
    const snapshot = await admindb.collection(COLLECTION_PATH).get();
    const firestoreClaims = snapshot.size;

    // ✅ Slack 메시지 조회 (중복 제출 체크용)
    let slackMessages: any[] = [];
    if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) {
      const slackRes = await fetch(
        `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=1000`,
        {
          headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
        }
      );
      const slackData = await slackRes.json();
      if (slackData.ok) slackMessages = slackData.messages ?? [];
    }

    // ✅ 전송 수량 및 진행률 계산
    const totalSupply = MAX_AIRDROP;
    const sentAmount = CLAIM_PER_USER * BigInt(firestoreClaims);
    const remainingAmount = totalSupply > sentAmount ? totalSupply - sentAmount : 0n;
    const percentage = ((Number(sentAmount) / Number(totalSupply)) * 100).toFixed(2);

    // ✅ 특정 주소의 수령 여부 확인
    let alreadyClaimed = false;
    if (wallet?.startsWith("0x")) {
      const doc = await admindb.collection(COLLECTION_PATH).doc(wallet).get();
      const normalized = wallet.toLowerCase().replace(/^0x/, "");
      const slackMatch = slackMessages.some(
        (msg) => typeof msg.text === "string" && msg.text.toLowerCase().includes(normalized)
      );
      alreadyClaimed = doc.exists || slackMatch;
    }

    // ✅ 응답 반환
    return res.status(200).json({
      status: "ok",
      wallet: wallet || null,
      alreadyClaimed,
      total: totalSupply.toString(),
      claimed: sentAmount.toString(),
      remaining: remainingAmount.toString(),
      percent: percentage,
      userCount: firestoreClaims,
    });
  } catch (err: any) {
    console.error("❌ /status error:", err.message);
    return res.status(500).json({ error: "Status check failed" });
  }
}
