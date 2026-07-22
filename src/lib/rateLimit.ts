// Requires this table in MySQL:
// CREATE TABLE IF NOT EXISTS rate_limits (
//   `key` VARCHAR(255) NOT NULL PRIMARY KEY,
//   count INT NOT NULL DEFAULT 1,
//   reset_at DATETIME(3) NOT NULL
// );
import pool from "./db";

export async function rateLimit(key: string, limit = 10, windowMs = 60_000): Promise<boolean> {
  try {
    const resetAt = new Date(Date.now() + windowMs);
    await pool.query(
      `INSERT INTO rate_limits (\`key\`, count, reset_at)
       VALUES (?, 1, ?)
       ON DUPLICATE KEY UPDATE
         count    = IF(reset_at < NOW(3), 1, count + 1),
         reset_at = IF(reset_at < NOW(3), ?, reset_at)`,
      [key, resetAt, resetAt],
    );
    const [rows] = await pool.query(
      "SELECT count FROM rate_limits WHERE `key` = ?",
      [key],
    );
    const entry = (rows as any[])[0];
    return !entry || entry.count <= limit;
  } catch {
    return true; // fail open: no bloquear si la DB está caída
  }
}
