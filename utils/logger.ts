import { getFirestore } from "firebase-admin/firestore";
import { admindb } from "@/firebase/admin";
import { sendSlackNotification } from "@/utils/slack";

export const logger = {
  log: (...args: any[]) => {
    console.log("[LOG]", ...args);
  },
  error: (...args: any[]) => {
    console.error("[ERROR]", ...args);
  },
};

export async function logAirdropResult({
  wallet,
  status,
  digest,
  error,
  timestamp,
}: {
  wallet: string;
  status: "success" | "error";
  digest?: string;
  error?: string;
  timestamp: number;
}) {
  const db = admindb;

  await db.collection("airdrop/logs").add({
    wallet,
    status,
    digest: digest ?? null,
    error: error ?? null,
    timestamp,
  });

  const time = new Date(timestamp).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });

  const explorerLink = digest
    ? `<https://suiexplorer.io/txblock/${digest}?network=testnet|🔗 View on Explorer>`
    : "";

  const trimmedError = error ? String(error).slice(0, 200) : "";

  const message =
    status === "success"
      ? `🎉 *AIRDROP SUCCESS*\n\n🧾 *Wallet:* \`${wallet}\`\n${explorerLink}\n🕒 *Time:* ${time}`
      : `💥 *AIRDROP FAILED*\n\n🧾 *Wallet:* \`${wallet}\`\n⚠️ *Error:* \`${trimmedError}\`\n🕒 *Time:* ${time}`;

  try {
    await sendSlackNotification(message);
  } catch (e) {
    logger.error("Slack 전송 실패:", e);
  }

  console.log(`[${status.toUpperCase()}] ${wallet}`, digest ?? trimmedError);
}



