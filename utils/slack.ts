import fetch from "node-fetch";

export async function sendSlackNotification(message: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;

  if (!token || !channel) {
    console.warn("❌ Slack bot token or channel ID not found.");
    return;
  }

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      channel,
      text: message,
    }),
  });
}

