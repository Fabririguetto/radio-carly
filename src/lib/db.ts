import mysql from "mysql2/promise";

const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

const pool = dbUrl
  ? mysql.createPool({
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    })
  : mysql.createPool({
      host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
      port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
      user: process.env.DB_USER || process.env.MYSQLUSER || "root",
      password: process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? "",
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || "radio",
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    });

export default pool;
