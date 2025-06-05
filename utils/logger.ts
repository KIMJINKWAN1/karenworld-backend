import { admindb } from "../firebase/admin";
import { sendSlackNotification } from "./slack";

export async function logAirdropEvent({
  wallet,
  status,
  digest,
  error,
}: {
  wallet: string;
  status: "success" | "error";
  digest?: string;
  error?: string;
}) {
  const timestamp = Date.now();

  // Firestore 저장
  await admindb.collection("airdrop/logs").add({
    wallet,
    status,
    digest: digest || null,
    error: error || null,
    timestamp,
  });

  // Slack 메시지 구성
  const time = new Date(timestamp).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const explorerLink = digest
    ? `<https://suiexplorer.io/txblock/${digest}?network=testnet|🔗 View on Explorer>`
    : "";

  const trimmedError = error ? error.slice(0, 200) : "";

  const message =
    status === "success"
      ? `🎉 *AIRDROP SUCCESS*\n\n🧾 *Wallet:* \`${wallet}\`\n${explorerLink}\n🕒 *Time:* ${time}`
      : `💥 *AIRDROP FAILED*\n\n🧾 *Wallet:* \`${wallet}\`\n⚠️ *Error:* \`${trimmedError}\`\n🕒 *Time:* ${time}`;

  await sendSlackNotification(message);
  console.log(`[${status.toUpperCase()}] ${wallet}`, digest || trimmedError);
}


