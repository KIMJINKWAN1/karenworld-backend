import { adminDb } from "../firebase/admin";
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

  await adminDb.collection("airdrop/logs").add({
    wallet,
    status,
    digest: digest || null,
    error: error || null,
    timestamp,
  });

  const time = new Date(timestamp).toISOString();
  const message =
    status === "success"
      ? `🎯 *Airdrop Success*\n• 🧾 Wallet: \`${wallet}\`\n• 🔗 Tx: \`${digest}\`\n• 🕒 ${time}`
      : `❌ *Airdrop Failed*\n• 🧾 Wallet: \`${wallet}\`\n• 💥 Error: \`${error}\`\n• 🕒 ${time}`;

  await sendSlackNotification(message);
  console.log(`[${status.toUpperCase()}] ${wallet}`, digest || error);
}

