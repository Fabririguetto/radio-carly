require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM sesiones LIKE 'idprograma_horario'");
    if (cols.length === 0) {
      console.log('[DB] Migrando sesiones: cambiando idhorario a idprograma_horario...');
      
      const [fks] = await conn.query(
        "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sesiones' AND COLUMN_NAME = 'idhorario' AND REFERENCED_TABLE_NAME IS NOT NULL",
        [process.env.DB_NAME]
      );
      for (const fk of fks) {
        console.log(`[DB] Eliminando constraint FK: ${fk.CONSTRAINT_NAME}`);
        await conn.query(`ALTER TABLE sesiones DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
      }

      const [indexes] = await conn.query("SHOW INDEX FROM sesiones WHERE Key_name = 'sesion_unica'");
      if (indexes.length > 0) {
        console.log('[DB] Eliminando índice sesion_unica...');
        await conn.query("ALTER TABLE sesiones DROP INDEX `sesion_unica`");
      }

      console.log('[DB] Modificando columna idhorario -> idprograma_horario...');
      await conn.query("ALTER TABLE sesiones CHANGE `idhorario` `idprograma_horario` INT NULL");

      console.log('[DB] Agregando índice UNIQUE sesion_unica (idprograma_horario, fecha)...');
      await conn.query("ALTER TABLE sesiones ADD UNIQUE KEY `sesion_unica` (`idprograma_horario`, `fecha`)");
      
      console.log('[DB] Migración de sesiones completada con éxito.');
    } else {
      console.log('[DB] idprograma_horario ya existe en la tabla sesiones.');
    }

    const [verify] = await conn.query('DESCRIBE sesiones');
    console.log('[DB] Columnas actuales en sesiones:', verify.map((c) => c.Field));
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error('[DB] Error:', err);
  process.exit(1);
});
