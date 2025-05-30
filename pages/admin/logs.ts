import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "@/firebase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const snapshot = await adminDb
    .collection("airdrop/logs")
    .orderBy("timestamp", "desc")
    .limit(100)
    .get();

  const logs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  res.status(200).json({ logs });
}
