import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/adminAuth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies[ADMIN_COOKIE];
  const { valid, role } = verifyAdminToken(token);
  if (!valid) return res.status(401).json({ error: 'No autorizado' });
  res.status(200).json({ ok: true, role });
}
