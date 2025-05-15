import type { VercelRequest, VercelResponse } from "@vercel/node";
import fetch from "node-fetch";

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Missing wallet address" });
  }

  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return res.status(500).json({ error: "Slack configuration missing" });
  }

  // 중복 수령 방지: 슬랙 메시지 내 지갑 주소 확인
  try {
    const historyRes = await fetch(
      `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
      }
    );

    const historyData = await historyRes.json();

    if (!historyData.ok) {
      console.error("❌ Slack fetch failed:", historyData.error);
      return res.status(500).json({ error: "Failed to check claim history" });
    }

    const alreadyClaimed = historyData.messages.some((msg: any) =>
      msg.text?.includes(wallet)
    );

    if (alreadyClaimed) {
      return res.status(400).json({ error: "Wallet has already claimed" });
    }
  } catch (error) {
    console.error("❌ Slack history error:", error);
    return res.status(500).json({ error: "Slack check failed" });
  }

  // 슬랙 메시지 전송
  try {
    const sendRes = await fetch("https://slack.com/api/chat.postMessage", {
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

    const result = await sendRes.json();
    if (!result.ok) {
      console.error("❌ Slack send error:", result.error);
      return res.status(500).json({ error: "Slack message failed" });
    }

    return res.status(200).json({ message: "Airdrop claimed", amount: CLAIM_PER_USER });
  } catch (error) {
    console.error("❌ Slack send error:", error);
    return res.status(500).json({ error: "Slack failed" });
  }
}