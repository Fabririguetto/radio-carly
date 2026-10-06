-- Migración: Límite mensual de Mercado Pago, datos de Transferencia y tablas de Facturación ARCA

-- 1. Agregar columnas a tabla config para límite de facturación MP y datos bancarios
ALTER TABLE `config`
  ADD COLUMN `mp_limite_mensual` DECIMAL(12,2) DEFAULT NULL AFTER `mp_token_expires_at`,
  ADD COLUMN `transferencia_cbu` VARCHAR(30) DEFAULT NULL AFTER `mp_limite_mensual`,
  ADD COLUMN `transferencia_alias` VARCHAR(60) DEFAULT NULL AFTER `transferencia_cbu`,
  ADD COLUMN `transferencia_titular` VARCHAR(150) DEFAULT NULL AFTER `transferencia_alias`,
  ADD COLUMN `transferencia_banco` VARCHAR(100) DEFAULT NULL AFTER `transferencia_titular`;

-- 2. Modificar enum de tipo en pagos y agregar comprobante_transferencia
ALTER TABLE `pagos`
  MODIFY COLUMN `tipo` ENUM('qr','manual','bonificacion','transferencia') NOT NULL DEFAULT 'qr',
  ADD COLUMN `comprobante_transferencia` VARCHAR(255) DEFAULT NULL AFTER `motivo`;

-- 3. Crear tabla de configuración para ARCA / AFIP
CREATE TABLE IF NOT EXISTS `afip_config` (
  `id_config` INT AUTO_INCREMENT PRIMARY KEY,
  `cuit` VARCHAR(20) NOT NULL,
  `punto_venta` INT NOT NULL,
  `tipo_comprobante` INT NOT NULL DEFAULT 11,
  `produccion` TINYINT(1) NOT NULL DEFAULT 0,
  `service_url` VARCHAR(255) NOT NULL DEFAULT 'http://localhost:3001'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Crear tabla de comprobantes emitidos
CREATE TABLE IF NOT EXISTS `comprobantes` (
  `id_comprobante` INT AUTO_INCREMENT PRIMARY KEY,
  `idpago` INT NOT NULL,
  `idcliente` INT NOT NULL,
  `tipo_comprobante` INT NOT NULL,
  `punto_venta` INT NOT NULL,
  `nro_comprobante` INT NULL,
  `cae` VARCHAR(20) NULL,
  `cae_vencimiento` DATE NULL,
  `estado` ENUM('pendiente', 'emitido', 'error') NOT NULL DEFAULT 'pendiente',
  `total` DECIMAL(10,2) NOT NULL,
  `error_msg` TEXT NULL,
  `fecha_emision` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_comprobante_pago` (`idpago`),
  KEY `idx_comprobante_cliente` (`idcliente`),
  CONSTRAINT `fk_comprobantes_pago` FOREIGN KEY (`idpago`) REFERENCES `pagos` (`idpago`),
  CONSTRAINT `fk_comprobantes_cliente` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
