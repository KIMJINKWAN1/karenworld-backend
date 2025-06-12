const SLACK_API_URL = process.env.SLACK_API_URL || "https://slack.com/api/chat.postMessage";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

export async function sendSlackNotification(message: string) {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    console.warn("⚠️ Slack credentials missing. Notification skipped.");
    return;
  }

  const response = await fetch(SLACK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL_ID,
      text: message,
    }),
  });

  const result = await response.json();
  if (!result.ok) {
    console.error("❌ Slack API Error:", result);
  } else {
    console.log("✅ Slack notified:", message);
  }
}




