import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const wallet = req.query.wallet as string;

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Missing or invalid wallet address" });
  }

  try {
    const ref = admindb.collection("airdrop").doc("claims").collection("claims").doc(wallet);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ claimed: false });
    }

    const data = doc.data();
    return res.status(200).json({ claimed: true, amount: data?.amount || 2000 });
  } catch (err) {
    console.error("❌ Error checking claim status:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}


