import type { NextApiRequest, NextApiResponse } from "next";
import { spawn } from "child_process";
import path from "path";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const scriptPath = path.join(process.cwd(), "scripts", "auto-airdrop.ts");

  try {
    const child = spawn("npx", ["tsx", scriptPath, wallet]);

    let output = "";
    let error = "";

    child.stdout.on("data", (data) => (output += data.toString()));
    child.stderr.on("data", (data) => (error += data.toString()));

    child.on("close", (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim());
          return res.status(200).json(result);
        } catch (e) {
          return res.status(500).json({ error: "Invalid JSON from script" });
        }
      } else {
        console.error("❌ Script error:", error);
        return res.status(500).json({ error: "Airdrop script failed", details: error });
      }
    });
  } catch (e: any) {
    return res.status(500).json({ error: "Internal Server Error", message: e.message });
  }
}









