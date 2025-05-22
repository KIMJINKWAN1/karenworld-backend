export const sendSlackNotification = async (message: string) => {
  const slackToken = process.env.SLACK_BOT_TOKEN!;
  const slackChannel = process.env.SLACK_CHANNEL_ID!;

  if (!slackToken || !slackChannel) {
    console.warn("Slack 토큰 또는 채널 ID가 설정되지 않았습니다.");
    return;
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${slackToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: slackChannel,
        text: message,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error("Slack 전송 실패:", data.error);
    }
  } catch (err) {
    console.error("Slack API 오류:", err);
  }
};