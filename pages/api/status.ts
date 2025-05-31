import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../../firebase/admin";
import { handleCors } from "../../utils/cors";

const CLAIM_PER_USER = 2_000_000_000_000;
const MAX_AIRDROP = 20_000_000_000_000_000;
const COLLECTION_PATH = "airdrop/claims/claims";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 처리
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const wallet = req.query.address as string;
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  try {
    const snapshot = await adminDb.collection(COLLECTION_PATH).get();
    const firestoreClaims = snapshot.size;

    let slackMessages: any[] = [];
    if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) {
      const slackRes = await fetch(`https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`, {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      });
      const slackData = await slackRes.json();
      if (slackData.ok) {
        slackMessages = slackData.messages ?? [];
      }
    }

    const claimed = firestoreClaims * CLAIM_PER_USER;
    const remaining = Math.max(0, MAX_AIRDROP - claimed);
    const percent = ((claimed / MAX_AIRDROP) * 100).toFixed(2);

    let alreadyClaimed = false;
    if (wallet?.startsWith("0x")) {
      const doc = await adminDb.collection(COLLECTION_PATH).doc(wallet).get();
      const normalized = wallet.toLowerCase().replace(/^0x/, "");
      const slackMatch = slackMessages.some((msg) =>
        typeof msg.text === "string" && msg.text.toLowerCase().includes(normalized)
      );
      alreadyClaimed = doc.exists || slackMatch;
    }

    return res.status(200).json({
      status: "ok",
      claimed,
      remaining,
      percent,
      total: MAX_AIRDROP,
      ...(wallet && { wallet, alreadyClaimed }),
    });
  } catch (err: any) {
    console.error("❌ /status error:", err.message);
    return res.status(500).json({ error: "Status check failed" });
  }
}

