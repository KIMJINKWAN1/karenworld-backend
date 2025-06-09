import type { NextApiRequest, NextApiResponse } from "next";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromB64 } from "@mysten/bcs";
import { sendSlackNotification } from "@/utils/slack";

const client = new SuiClient({ url: getFullnodeUrl(process.env.SUI_NETWORK || "mainnet") });

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Missing wallet address" });
  }

  try {
    const privateKeyBase64 = process.env.PRIVATE_KEY!;
    const keypair = Ed25519Keypair.fromSecretKey(fromB64(privateKeyBase64));
    const packageId = process.env.SUI_FAUCET_TOKEN!;
    const distributor = process.env.AIRDROP_WALLET_ADDRESS!;
    const tokenType = process.env.KAREN_COIN_TYPE!;
    const amount = process.env.AIRDROP_AMOUNT || "2000";

    // 트랜잭션 구성
    const tx = await client.newTransactionBlock();
    tx.setGasBudget(100000000);
    tx.moveCall({
      target: `${packageId}::airdrop::send_to`,
      arguments: [
        tx.object(distributor),
        tx.pure(wallet),
        tx.pure(tokenType),
        tx.pure(amount),
      ],
    });

    const result = await client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: keypair,
    });

    await sendSlackNotification(`✅ *Airdrop Success*\n• Wallet: \`${wallet}\`\n• Digest: \`${result.digest}\``);

    return res.status(200).json({
      success: true,
      digest: result.digest,
      amount,
    });

  } catch (err: any) {
    console.error("❌ Airdrop error:", err.message || err);
    await sendSlackNotification(`❌ *Airdrop Failed*\n• Wallet: \`${wallet}\`\n• Error: \`${err.message || err}\``);
    return res.status(500).json({ error: "Airdrop execution failed" });
  }
};

export default handler;












