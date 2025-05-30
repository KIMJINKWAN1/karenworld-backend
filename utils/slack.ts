export async function sendSlackNotification(message: string) {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    console.warn("❗ Slack 환경변수가 없습니다. 알림 전송 생략됨.");
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
      console.error("❌ Slack 메시지 전송 실패:", data.error);
    } else {
      console.log("✅ Slack 메시지 전송 성공:", message);
    }
  } catch (err) {
    console.error("❌ Slack 요청 중 오류 발생:", err);
  }
}
