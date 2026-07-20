CREATE DATABASE IF NOT EXISTS `radio` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `radio`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `pagos`;
DROP TABLE IF EXISTS `sesiones`;
DROP TABLE IF EXISTS `horarios`;
DROP TABLE IF EXISTS `ctacte`;
DROP TABLE IF EXISTS `config`;
DROP TABLE IF EXISTS `clientes`;
SET FOREIGN_KEY_CHECKS = 1;

-- clientes
CREATE TABLE `clientes` (
  `idcliente` int NOT NULL AUTO_INCREMENT,
  `dni`       varchar(20) NOT NULL,
  `nombre`    varchar(100) NOT NULL,
  PRIMARY KEY (`idcliente`),
  UNIQUE KEY `dni` (`dni`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `clientes` (`idcliente`, `dni`, `nombre`) VALUES
  (1, '44810049', 'Fabricio Riguetto'),
  (2, '30123456', 'Ana García'),
  (3, '25678901', 'Luis Martínez'),
  (4, '37456789', 'María López'),
  (5, '20987654', 'Carlos Pérez');

-- ctacte
-- balance = egreso - ingreso (deuda actual del cliente)
CREATE TABLE `ctacte` (
  `idctacte`  int NOT NULL AUTO_INCREMENT,
  `idcliente` int NOT NULL,
  `ingreso`   decimal(10,2) NOT NULL DEFAULT '0.00',
  `egreso`    decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance`   decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`idctacte`),
  UNIQUE KEY `idcliente` (`idcliente`),
  CONSTRAINT `ctacte_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `ctacte` (`idcliente`, `ingreso`, `egreso`, `balance`) VALUES
  (1, 1500.00, 4500.00, 3000.00),
  (2, 0.00,    1500.00, 1500.00),
  (3, 3000.00, 3000.00, 0.00),
  (4, 0.00,    0.00,    0.00),
  (5, 1000.00, 4000.00, 3000.00);

-- config
-- La fila id=1 se crea automáticamente la primera vez que el admin guarda precios o datos del negocio
CREATE TABLE `config` (
  `id`                  int NOT NULL AUTO_INCREMENT,
  `precio_hora`         decimal(10,2) NOT NULL DEFAULT '5000.00',
  `precio_reserva`      decimal(10,2) NOT NULL DEFAULT '2000.00',
  `deuda_maxima`        decimal(10,2) NOT NULL DEFAULT '0.00',
  `nombre_negocio`      varchar(100)  DEFAULT NULL,
  `mp_access_token`     varchar(250)  DEFAULT NULL,
  `mp_collector_id`     varchar(50)   DEFAULT NULL,
  `mp_pos_external_id`  varchar(50)   DEFAULT NULL,
  `mp_webhook_secret`   varchar(250)  DEFAULT NULL,
  `mp_refresh_token`    varchar(500)  DEFAULT NULL,
  `mp_token_expires_at` datetime      DEFAULT NULL,
  `direccion`           varchar(200)  DEFAULT NULL,
  `ciudad`              varchar(100)  DEFAULT NULL,
  `provincia`           varchar(100)  DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Sin datos iniciales: la fila se crea sola al guardar precios o datos del negocio desde el panel

-- horarios
-- dia_semana: 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado, 7=domingo
CREATE TABLE `horarios` (
  `idhorario`   int NOT NULL AUTO_INCREMENT,
  `idcliente`   int NOT NULL,
  `dia_semana`  tinyint NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin`    time NOT NULL,
  PRIMARY KEY (`idhorario`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `horarios_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Fabricio: todos los días 19:00-20:00
INSERT INTO `horarios` (`idcliente`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
  (1, 1, '19:00:00', '20:00:00'),
  (1, 2, '19:00:00', '20:00:00'),
  (1, 3, '19:00:00', '20:00:00'),
  (1, 4, '19:00:00', '20:00:00'),
  (1, 5, '19:00:00', '20:00:00'),
  (1, 6, '19:00:00', '20:00:00'),
  (1, 7, '19:00:00', '20:00:00');
-- Ana: todos los días 18:00-19:00
INSERT INTO `horarios` (`idcliente`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
  (2, 1, '18:00:00', '19:00:00'),
  (2, 2, '18:00:00', '19:00:00'),
  (2, 3, '18:00:00', '19:00:00'),
  (2, 4, '18:00:00', '19:00:00'),
  (2, 5, '18:00:00', '19:00:00'),
  (2, 6, '18:00:00', '19:00:00'),
  (2, 7, '18:00:00', '19:00:00');
-- Luis: todos los días 10:00-11:00
INSERT INTO `horarios` (`idcliente`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
  (3, 1, '10:00:00', '11:00:00'),
  (3, 2, '10:00:00', '11:00:00'),
  (3, 3, '10:00:00', '11:00:00'),
  (3, 4, '10:00:00', '11:00:00'),
  (3, 5, '10:00:00', '11:00:00'),
  (3, 6, '10:00:00', '11:00:00'),
  (3, 7, '10:00:00', '11:00:00');
-- María: todos los días 15:00-16:00
INSERT INTO `horarios` (`idcliente`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
  (4, 1, '15:00:00', '16:00:00'),
  (4, 2, '15:00:00', '16:00:00'),
  (4, 3, '15:00:00', '16:00:00'),
  (4, 4, '15:00:00', '16:00:00'),
  (4, 5, '15:00:00', '16:00:00'),
  (4, 6, '15:00:00', '16:00:00'),
  (4, 7, '15:00:00', '16:00:00');
-- Carlos: todos los días 20:00-21:00
INSERT INTO `horarios` (`idcliente`, `dia_semana`, `hora_inicio`, `hora_fin`) VALUES
  (5, 1, '20:00:00', '21:00:00'),
  (5, 2, '20:00:00', '21:00:00'),
  (5, 3, '20:00:00', '21:00:00'),
  (5, 4, '20:00:00', '21:00:00'),
  (5, 5, '20:00:00', '21:00:00'),
  (5, 6, '20:00:00', '21:00:00'),
  (5, 7, '20:00:00', '21:00:00');

-- sesiones
CREATE TABLE `sesiones` (
  `idsesion`  int NOT NULL AUTO_INCREMENT,
  `idcliente` int NOT NULL,
  `idhorario` int NOT NULL,
  `fecha`     date NOT NULL,
  `asistio`   tinyint(1) DEFAULT NULL,
  `monto`     decimal(10,2) NOT NULL,
  PRIMARY KEY (`idsesion`),
  UNIQUE KEY `sesion_unica` (`idhorario`, `fecha`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `sesiones_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`),
  CONSTRAINT `sesiones_ibfk_2` FOREIGN KEY (`idhorario`) REFERENCES `horarios` (`idhorario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- pagos
CREATE TABLE `pagos` (
  `idpago`        int NOT NULL AUTO_INCREMENT,
  `idcliente`     int NOT NULL,
  `monto`         decimal(10,2) NOT NULL,
  `mp_order_id`   varchar(255) DEFAULT NULL,
  `mp_payment_id` varchar(255) DEFAULT NULL,
  `estado`        enum('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  `fecha`         datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idpago`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
