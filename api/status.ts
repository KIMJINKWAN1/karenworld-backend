import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

const claimedWallets = new Set<string>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.body;

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  if (claimedWallets.has(wallet)) {
    return res.status(400).json({ error: "Already claimed" });
  }

  claimedWallets.add(wallet);

  try {
    await fetch(process.env.SLACK_WEBHOOK!, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: `🎉 New Airdrop Claim!\n\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
  }),
});

    return res.status(200).json({ message: "Airdrop claimed", amount: CLAIM_PER_USER });
  } catch (error) {
    console.error("❌ Slack Webhook error:", error);
    return res.status(500).json({ error: "Failed to send Slack message" });
  }
}