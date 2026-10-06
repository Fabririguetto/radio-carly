import type { NextApiRequest, NextApiResponse } from "next";
import { checkArcaHealth } from "@/lib/arca";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const urlOverride = typeof req.query.url === "string" ? req.query.url : undefined;
  const result = await checkArcaHealth(urlOverride);

  if (result.ok) {
    return res.status(200).json(result);
  } else {
    return res.status(502).json(result);
  }
}
