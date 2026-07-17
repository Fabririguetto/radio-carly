import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { dni, password } = req.body;

  if (dni !== process.env.MASTER_DNI) {
    return res.status(401).json({ error: "DNI no autorizado" });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  res.status(200).json({ ok: true });
}
