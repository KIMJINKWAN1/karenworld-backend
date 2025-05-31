import type { NextApiRequest, NextApiResponse } from "next";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromB64 } from "@mysten/bcs";
import { Transaction } from "@mysten/sui/transactions";

import {
  checkRecipientClaimStatus,
  markClaimed,
} from "@/firebase/admin";
import { sendSlackNotification } from "@/utils/slack";

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const COIN_OBJECT_ID = process.env.KAREN_COIN_OBJECT_ID!;
const AIRDROP_AMOUNT = BigInt(process.env.AIRDROP_AMOUNT || "2000");
const NETWORK = process.env.SUI_NETWORK || "testnet";

const sui = new SuiClient({ url: getFullnodeUrl(NETWORK) });
const fullSecret = fromB64(PRIVATE_KEY);
const secretKey = fullSecret.slice(1);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "Missing wallet address" });

  try {
    const alreadyClaimed = await checkRecipientClaimStatus(wallet);
    if (alreadyClaimed) {
      return res.status(200).json({ success: false, message: "Already claimed" });
    }

    const owned = await sui.getOwnedObjects({
      owner: keypair.getPublicKey().toSuiAddress(),
      options: { showType: true, showContent: true },
    });

    const gas = owned.data.find(
      (obj) => obj.data?.type === "0x2::coin::Coin<0x2::sui::SUI>"
    );

    if (!gas || !gas.data) throw new Error("No SUI gas coin found");

    const tx = new Transaction();
    tx.setSender(keypair.getPublicKey().toSuiAddress());
    tx.setGasPayment([
      {
        objectId: gas.data.objectId,
        version: gas.data.version.toString(),
        digest: gas.data.digest,
      },
    ]);
    tx.setGasBudget(10_000_000);

    const [coinToSend] = tx.splitCoins(
      tx.object(COIN_OBJECT_ID),
      [tx.pure(AIRDROP_AMOUNT)]
    );

    tx.transferObjects([coinToSend], wallet);

    const result = await sui.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: { showEffects: true },
    });

    const status = result.effects?.status?.status;
    if (status !== "success") throw new Error("Transaction failed");

    await markClaimed(wallet, result.digest, Number(AIRDROP_AMOUNT));
    await sendSlackNotification(`🔁 재전송 성공: ${wallet} (${AIRDROP_AMOUNT} KAREN)`);

    return res.status(200).json({ success: true, digest: result.digest });
  } catch (error: any) {
    await sendSlackNotification(`🚨 재전송 실패: ${wallet}\n에러: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
}
