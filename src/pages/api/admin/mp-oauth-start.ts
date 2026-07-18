import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { nombre_negocio, direccion, ciudad, provincia } = req.body as {
    nombre_negocio?: string;
    direccion?: string;
    ciudad?: string;
    provincia?: string;
  };

  if (!nombre_negocio?.trim() || !direccion?.trim() || !ciudad?.trim() || !provincia?.trim()) {
    return res.status(400).json({ error: "Completá todos los campos antes de conectar." });
  }

  await pool.query(
    "UPDATE config SET nombre_negocio = ?, direccion = ?, ciudad = ?, provincia = ? WHERE id = 1",
    [nombre_negocio.trim(), direccion.trim(), ciudad.trim(), provincia.trim()]
  );

  const clientId = process.env.MP_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/mp-oauth-callback`;
  const authUrl =
    `https://auth.mercadopago.com/authorization?client_id=${clientId}` +
    `&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return res.json({ url: authUrl });
}
