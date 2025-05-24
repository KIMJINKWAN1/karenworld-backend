export async function sendSlackNotification(message: string) {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    console.warn("❗ Slack environment variables are missing. Unable to send message.");
    return;
  }

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: message,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      console.error("❌ Failed to send Slack message:", data.error);
    }
  } catch (err) {
    console.error("❌ Exception occurred during Slack request:", err);
  }
}