export async function sendSlackNotification(message: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;
  const url = process.env.SLACK_API_URL || 'https://slack.com/api/chat.postMessage';

  if (!token || !channel) {
    console.error('❌ SLACK_BOT_TOKEN 또는 SLACK_CHANNEL_ID 누락됨');
    return;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel,
        text: message,
        mrkdwn: true,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('❌ Slack 응답 오류:', data);
    } else {
      console.log('✅ Slack 알림 전송 완료');
    }
  } catch (err) {
    console.error('❌ Slack 전송 중 오류:', err);
  }
}




