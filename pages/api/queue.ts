import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";

const COLLECTION_PATH = "airdrop/queue";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const collection = admindb.collection(COLLECTION_PATH);

    if (req.method === "GET") {
      const snapshot = await collection.get();
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return res.status(200).json({ items });
    }

    if (req.method === "POST") {
      const { wallet, amount } = req.body;

      if (!wallet || typeof amount !== "number") {
        return res.status(400).json({ error: "wallet and amount required" });
      }

      await collection.doc(wallet).set({
        wallet,
        amount,
        status: "queued",
        createdAt: Date.now(),
      });

      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      const { wallet } = req.body;
      if (!wallet) {
        return res.status(400).json({ error: "wallet required" });
      }

      await collection.doc(wallet).delete();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[/api/queue] Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
