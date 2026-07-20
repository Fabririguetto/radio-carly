import type { NextApiRequest, NextApiResponse } from 'next';

// El middleware en src/middleware.ts ya valida la cookie antes de llegar aquí.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ ok: true });
}
