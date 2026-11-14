-- =============================================================================
-- Migración: MP por cliente, Modalidad de cobro, Penalización inasistencias y Roles
-- =============================================================================

-- 1. Ampliación de la tabla `clientes`
ALTER TABLE `clientes`
  ADD COLUMN `mp_enabled` TINYINT(1) NOT NULL DEFAULT 1 
    COMMENT '1: Habilitado para pagar con MP QR, 0: Deshabilitado' AFTER `activo`,
  ADD COLUMN `tipo_cobro` ENUM('POR_PROGRAMA', 'MES_ADELANTADO') NOT NULL DEFAULT 'POR_PROGRAMA' 
    COMMENT 'Modalidad de liquidacion' AFTER `mp_enabled`,
  ADD COLUMN `monto_mensual` DECIMAL(10,2) DEFAULT NULL 
    COMMENT 'Monto fijo pactado si es mes adelantado' AFTER `tipo_cobro`,
  ADD KEY `idx_clientes_tipo_cobro` (`tipo_cobro`),
  ADD KEY `idx_clientes_mp_enabled` (`mp_enabled`);

-- 2. Credenciales del nuevo rol Operador en la tabla config
ALTER TABLE `config`
  ADD COLUMN `operador_dni` VARCHAR(20) DEFAULT NULL,
  ADD COLUMN `operador_password` VARCHAR(255) DEFAULT NULL;

-- 3. Índice para optimizar el conteo de inasistencias mensuales en sesiones
ALTER TABLE `sesiones`
  ADD KEY `idx_sesiones_cliente_fecha_asistio` (`idcliente`, `fecha`, `asistio`);
