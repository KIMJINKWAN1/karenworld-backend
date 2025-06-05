import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const snapshot = await admindb
      .collection("airdrop/logs")
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();

    const logs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ logs });
  } catch (error: any) {
    console.error("❌ Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch airdrop logs." });
  }
}