export default async function handler(req, res) {
  try {
    const CLAIM_PER_USER = 2000;
    const MAX_AIRDROP = 20_000_000;

    const userCount = await getClaimedCount(); // 슬랙 메시지 수
    const remaining = MAX_AIRDROP - CLAIM_PER_USER * userCount;

    res.status(200).json({ status: "ok", remaining });
  } catch (e) {
    console.error("Failed to fetch airdrop status", e);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getClaimedCount() {
  const response = await fetch(
    `https://slack.com/api/conversations.history?channel=${process.env.SLACK_CHANNEL_ID}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    }
  );

  const data = await response.json();
  if (!data.ok) throw new Error("Slack API failed");

  return data.messages.length;
}