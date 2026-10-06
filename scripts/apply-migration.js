require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
  const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
  const user = process.env.DB_USER || process.env.MYSQLUSER || 'root';
  const password = process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? '';
  const database = process.env.DB_NAME || process.env.MYSQLDATABASE || 'radio';

  console.log(`[DB] Conectando a ${host}:${port}/${database} con usuario ${user}...`);

  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    const conn = await pool.getConnection();
    console.log('[DB] Conectado exitosamente');

    // 1. Tabla estudios
    await conn.query(`
      CREATE TABLE IF NOT EXISTS estudios (
        idestudio INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 2. Tabla programas
    await conn.query(`
      CREATE TABLE IF NOT EXISTS programas (
        idprograma INT AUTO_INCREMENT PRIMARY KEY,
        idcliente INT NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        descripcion TEXT DEFAULT NULL,
        dni_responsable VARCHAR(20) DEFAULT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE DEFAULT NULL,
        activo TINYINT(1) NOT NULL DEFAULT 1,
        KEY idcliente (idcliente),
        CONSTRAINT fk_programas_cliente FOREIGN KEY (idcliente) REFERENCES clientes (idcliente)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Chequear columna dni_responsable en programas por si la tabla ya existía sin ella
    const [dniCols] = await conn.query("SHOW COLUMNS FROM programas LIKE 'dni_responsable'");
    if (dniCols.length === 0) {
      await conn.query("ALTER TABLE programas ADD COLUMN dni_responsable VARCHAR(20) DEFAULT NULL AFTER descripcion");
      console.log('[DB] Columna dni_responsable agregada a programas');
    }

    // 3. Tabla programas_horarios
    await conn.query(`
      CREATE TABLE IF NOT EXISTS programas_horarios (
        idprograma_horario INT AUTO_INCREMENT PRIMARY KEY,
        idprograma INT NOT NULL,
        idestudio INT NOT NULL,
        dia_semana TINYINT NOT NULL COMMENT '0=Dom,1=Lun,...,6=Sab',
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        KEY idprograma (idprograma),
        KEY idestudio (idestudio),
        CONSTRAINT fk_ph_programa FOREIGN KEY (idprograma) REFERENCES programas (idprograma) ON DELETE CASCADE,
        CONSTRAINT fk_ph_estudio FOREIGN KEY (idestudio) REFERENCES estudios (idestudio)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 4. Tabla notificaciones y notificaciones_clientes
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        idnotificacion INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL,
        texto TEXT NOT NULL,
        tipo ENUM('general','aumento_cuota') NOT NULL DEFAULT 'general',
        precio_nuevo DECIMAL(10,2) DEFAULT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_expiracion DATE NOT NULL,
        para_todos TINYINT(1) NOT NULL DEFAULT 0,
        creada_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notificaciones_clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        idnotificacion INT NOT NULL,
        idcliente INT NOT NULL,
        aceptada TINYINT(1) NOT NULL DEFAULT 0,
        fecha_aceptacion DATETIME DEFAULT NULL,
        UNIQUE KEY notif_cliente (idnotificacion, idcliente),
        KEY idcliente (idcliente),
        CONSTRAINT fk_nc_notif FOREIGN KEY (idnotificacion) REFERENCES notificaciones (idnotificacion) ON DELETE CASCADE,
        CONSTRAINT fk_nc_cliente FOREIGN KEY (idcliente) REFERENCES clientes (idcliente)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 5. Tabla rate_limits
    await conn.query(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        ip VARCHAR(45) NOT NULL,
        ruta VARCHAR(100) NOT NULL,
        intentos INT NOT NULL DEFAULT 1,
        ultimo_intento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        bloqueado_hasta DATETIME DEFAULT NULL,
        PRIMARY KEY (ip, ruta)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // 6. Migrar sesiones.idhorario a idprograma_horario si corresponde
    const [sesionesCols] = await conn.query("SHOW COLUMNS FROM sesiones LIKE 'idprograma_horario'");
    if (sesionesCols.length === 0) {
      console.log('[DB] Migrando sesiones: actualizando idhorario a idprograma_horario...');
      const [fks] = await conn.query(
        "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sesiones' AND COLUMN_NAME = 'idhorario' AND REFERENCED_TABLE_NAME IS NOT NULL",
        [database]
      );
      for (const fk of fks) {
        try {
          await conn.query(`ALTER TABLE sesiones DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
        } catch (e) {
          console.warn('[DB] Advertencia al dropear FK:', e.message);
        }
      }
      const [indexes] = await conn.query("SHOW INDEX FROM sesiones WHERE Key_name = 'sesion_unica'");
      if (indexes.length > 0) {
        try {
          await conn.query("ALTER TABLE sesiones DROP INDEX `sesion_unica`");
        } catch (e) {
          console.warn('[DB] Advertencia al dropear índice:', e.message);
        }
      }
      await conn.query("ALTER TABLE sesiones CHANGE `idhorario` `idprograma_horario` INT NULL");
      await conn.query("ALTER TABLE sesiones ADD UNIQUE KEY `sesion_unica` (`idprograma_horario`, `fecha`)");
      console.log('[DB] Tabla sesiones actualizada a idprograma_horario');
    } else {
      console.log('[DB] Tabla sesiones ya tiene idprograma_horario');
    }

    // 7. Columnas en config
    const [cols] = await conn.query("SHOW COLUMNS FROM config LIKE 'mp_limite_mensual'");
    if (cols.length === 0) {
      await conn.query(`
        ALTER TABLE config
          ADD COLUMN mp_limite_mensual DECIMAL(12,2) DEFAULT NULL,
          ADD COLUMN transferencia_cbu VARCHAR(30) DEFAULT NULL,
          ADD COLUMN transferencia_alias VARCHAR(60) DEFAULT NULL,
          ADD COLUMN transferencia_titular VARCHAR(150) DEFAULT NULL,
          ADD COLUMN transferencia_banco VARCHAR(100) DEFAULT NULL
      `);
      console.log('[DB] Columnas agregadas a config');
    } else {
      console.log('[DB] Columnas en config ya existen');
    }

    // 8. Columna tipo y comprobante_transferencia en pagos
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

    const [motivoCols] = await conn.query("SHOW COLUMNS FROM pagos LIKE 'motivo'");
    if (motivoCols.length === 0) {
      await conn.query("ALTER TABLE pagos ADD COLUMN motivo VARCHAR(200) DEFAULT NULL");
      console.log('[DB] Columna motivo agregada a pagos');
    }

    const [pagoCols] = await conn.query("SHOW COLUMNS FROM pagos LIKE 'comprobante_transferencia'");
    if (pagoCols.length === 0) {
      await conn.query("ALTER TABLE pagos ADD COLUMN comprobante_transferencia VARCHAR(255) DEFAULT NULL");
      console.log('[DB] Columna comprobante_transferencia agregada a pagos');
    } else {
      console.log('[DB] Columna comprobante_transferencia ya existe');
    }

    // 9. Crear tabla afip_config
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

    const [afipRows] = await conn.query('SELECT id_config FROM afip_config LIMIT 1');
    if (afipRows.length === 0) {
      await conn.query(`
        INSERT INTO afip_config (cuit, punto_venta, tipo_comprobante, produccion, service_url)
        VALUES ('20000000001', 1, 11, 0, 'http://localhost:3001')
      `);
      console.log('[DB] Configuración inicial insertada en afip_config');
    }

    // 10. Crear tabla comprobantes
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
    console.log('[DB] Tabla comprobantes verificada/creada');

    conn.release();
    await pool.end();
    console.log('[DB] Todas las migraciones completadas con éxito.');
  } catch (err) {
    console.error('[DB] Error ejecutando migración:', err);
    // No salimos con error fatal en caso de warning para permitir iniciar el servidor
    process.exit(1);
  }
}

run();
