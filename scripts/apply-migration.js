require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    const conn = await pool.getConnection();
    console.log('[DB] Conectado exitosamente');

    // 1. Columnas en config
    const [cols] = await conn.query("SHOW COLUMNS FROM config LIKE 'mp_limite_mensual'");
    if (cols.length === 0) {
      await conn.query(`
        ALTER TABLE config
          ADD COLUMN mp_limite_mensual DECIMAL(12,2) DEFAULT NULL AFTER mp_token_expires_at,
          ADD COLUMN transferencia_cbu VARCHAR(30) DEFAULT NULL AFTER mp_limite_mensual,
          ADD COLUMN transferencia_alias VARCHAR(60) DEFAULT NULL AFTER transferencia_cbu,
          ADD COLUMN transferencia_titular VARCHAR(150) DEFAULT NULL AFTER transferencia_alias,
          ADD COLUMN transferencia_banco VARCHAR(100) DEFAULT NULL AFTER transferencia_titular
      `);
      console.log('[DB] Columnas agregadas a config');
    } else {
      console.log('[DB] Columnas en config ya existen');
    }

    // 2. Columna tipo en pagos
    const [tipoCols] = await conn.query("SHOW COLUMNS FROM pagos LIKE 'tipo'");
    if (tipoCols.length === 0) {
      await conn.query(`
        ALTER TABLE pagos
          ADD COLUMN tipo ENUM('qr','manual','bonificacion','transferencia') NOT NULL DEFAULT 'qr' AFTER estado
      `);
      console.log('[DB] Columna tipo agregada a pagos');
    } else {
      await conn.query(`
        ALTER TABLE pagos
          MODIFY COLUMN tipo ENUM('qr','manual','bonificacion','transferencia') NOT NULL DEFAULT 'qr'
      `);
      console.log('[DB] Columna tipo en pagos actualizada');
    }

    const [pagoCols] = await conn.query("SHOW COLUMNS FROM pagos LIKE 'comprobante_transferencia'");
    if (pagoCols.length === 0) {
      await conn.query(`
        ALTER TABLE pagos
          ADD COLUMN comprobante_transferencia VARCHAR(255) DEFAULT NULL AFTER motivo
      `);
      console.log('[DB] Columna comprobante_transferencia agregada a pagos');
    } else {
      console.log('[DB] Columna comprobante_transferencia ya existe');
    }

    // 3. Crear tabla afip_config
    await conn.query(`
      CREATE TABLE IF NOT EXISTS afip_config (
        id_config INT AUTO_INCREMENT PRIMARY KEY,
        cuit VARCHAR(20) NOT NULL,
        punto_venta INT NOT NULL,
        tipo_comprobante INT NOT NULL DEFAULT 11,
        produccion TINYINT(1) NOT NULL DEFAULT 0,
        service_url VARCHAR(255) NOT NULL DEFAULT 'http://localhost:3001'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    console.log('[DB] Tabla afip_config verificada/creada');

    // Insertar config por defecto si está vacía
    const [afipRows] = await conn.query('SELECT id_config FROM afip_config LIMIT 1');
    if (afipRows.length === 0) {
      await conn.query(`
        INSERT INTO afip_config (cuit, punto_venta, tipo_comprobante, produccion, service_url)
        VALUES ('20000000001', 1, 11, 0, 'http://localhost:3001')
      `);
      console.log('[DB] Configuración inicial insertada en afip_config');
    }

    // 4. Crear tabla comprobantes
    await conn.query(`
      CREATE TABLE IF NOT EXISTS comprobantes (
        id_comprobante INT AUTO_INCREMENT PRIMARY KEY,
        idpago INT NOT NULL,
        idcliente INT NOT NULL,
        tipo_comprobante INT NOT NULL,
        punto_venta INT NOT NULL,
        nro_comprobante INT NULL,
        cae VARCHAR(20) NULL,
        cae_vencimiento DATE NULL,
        estado ENUM('pendiente', 'emitido', 'error') NOT NULL DEFAULT 'pendiente',
        total DECIMAL(10,2) NOT NULL,
        error_msg TEXT NULL,
        fecha_emision DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_comprobante_pago (idpago),
        KEY idx_comprobante_cliente (idcliente),
        CONSTRAINT fk_comprobantes_pago FOREIGN KEY (idpago) REFERENCES pagos (idpago),
        CONSTRAINT fk_comprobantes_cliente FOREIGN KEY (idcliente) REFERENCES clientes (idcliente)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    // 5. Migrar sesiones.idhorario a idprograma_horario si corresponde
    const [sesionesCols] = await conn.query("SHOW COLUMNS FROM sesiones LIKE 'idprograma_horario'");
    if (sesionesCols.length === 0) {
      console.log('[DB] Migrando sesiones: actualizando idhorario a idprograma_horario...');
      const [fks] = await conn.query(
        "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sesiones' AND COLUMN_NAME = 'idhorario' AND REFERENCED_TABLE_NAME IS NOT NULL",
        [process.env.DB_NAME]
      );
      for (const fk of fks) {
        await conn.query(`ALTER TABLE sesiones DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
      }
      const [indexes] = await conn.query("SHOW INDEX FROM sesiones WHERE Key_name = 'sesion_unica'");
      if (indexes.length > 0) {
        await conn.query("ALTER TABLE sesiones DROP INDEX `sesion_unica`");
      }
      await conn.query("ALTER TABLE sesiones CHANGE `idhorario` `idprograma_horario` INT NULL");
      await conn.query("ALTER TABLE sesiones ADD UNIQUE KEY `sesion_unica` (`idprograma_horario`, `fecha`)");
      console.log('[DB] Tabla sesiones actualizada a idprograma_horario');
    } else {
      console.log('[DB] Tabla sesiones ya tiene idprograma_horario');
    }

    conn.release();
    await pool.end();
    console.log('[DB] Migración completada con éxito.');
  } catch (err) {
    console.error('[DB] Error ejecutando migración:', err);
    process.exit(1);
  }
}

run();
