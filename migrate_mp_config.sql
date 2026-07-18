-- Migración: agregar columnas de Mercado Pago a la tabla config
ALTER TABLE `config`
  ADD COLUMN IF NOT EXISTS `nombre_negocio`     varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `mp_access_token`    varchar(250) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `mp_collector_id`    varchar(50)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `mp_pos_external_id` varchar(50)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `mp_webhook_secret`  varchar(250) DEFAULT NULL;
