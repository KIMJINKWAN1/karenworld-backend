import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end(); // preflight 처리
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { address } = req.query;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Missing or invalid address" });
  }

  try {
    const doc = await admindb.doc(`airdrop/claims/claims/${address}`).get();

    if (!doc.exists) {
      return res.status(404).json({ status: "not_found", address });
    }

    const data = doc.data();
    return res.status(200).json({ status: "found", ...data });
  } catch (err: any) {
    console.error("❌ Error fetching claim:", err.message || err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

