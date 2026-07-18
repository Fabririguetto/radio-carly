CREATE DATABASE IF NOT EXISTS `radio` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `radio`;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- -------------------------------------------
-- DROP en orden correcto (dependientes primero)
-- -------------------------------------------
DROP TABLE IF EXISTS `pagos`;
DROP TABLE IF EXISTS `sesiones`;
DROP TABLE IF EXISTS `horarios`;
DROP TABLE IF EXISTS `ctacte`;
DROP TABLE IF EXISTS `config`;
DROP TABLE IF EXISTS `clientes`;

-- -------------------------------------------
-- clientes
-- -------------------------------------------
CREATE TABLE `clientes` (
  `idcliente` int NOT NULL AUTO_INCREMENT,
  `dni`       varchar(20) NOT NULL,
  `nombre`    varchar(100) NOT NULL,
  PRIMARY KEY (`idcliente`),
  UNIQUE KEY `dni` (`dni`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `clientes` VALUES (1,'44810049','Fabri'),(2,'24844933','Elisabet');

-- -------------------------------------------
-- ctacte  (1 fila por cliente — resumen corriente)
-- ingreso  = pagos recibidos del cliente
-- egreso   = sesiones cobradas al cliente
-- balance  = egreso - ingreso  (deuda actual)
-- -------------------------------------------
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

INSERT INTO `ctacte` (`idcliente`, `ingreso`, `egreso`, `balance`) VALUES (1, 0.00, 0.00, 0.00),(2, 0.00, 0.00, 0.00);

-- -------------------------------------------
-- config  (precios configurables por el admin)
-- -------------------------------------------
CREATE TABLE `config` (
  `id`                  int NOT NULL AUTO_INCREMENT,
  `precio_hora`         decimal(10,2) NOT NULL DEFAULT '5000.00',
  `precio_reserva`      decimal(10,2) NOT NULL DEFAULT '2000.00',
  `nombre_negocio`      varchar(100) DEFAULT NULL,
  `mp_access_token`     varchar(250) DEFAULT NULL,
  `mp_collector_id`     varchar(50)  DEFAULT NULL,
  `mp_pos_external_id`  varchar(50)  DEFAULT NULL,
  `mp_webhook_secret`   varchar(250) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `config` (`precio_hora`, `precio_reserva`) VALUES (5000.00, 2000.00);

-- -------------------------------------------
-- horarios  (horarios fijos semanales por cliente)
-- dia_semana: 1=lunes ... 7=domingo
-- -------------------------------------------
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

-- -------------------------------------------
-- sesiones  (cada vez que toca el horario de un cliente)
-- asistio: NULL=no registrada, 1=asistió, 0=no asistió (se cobra reserva)
-- -------------------------------------------
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

-- -------------------------------------------
-- pagos  (cada pago realizado via Mercado Pago)
-- -------------------------------------------
CREATE TABLE `pagos` (
  `idpago`          int NOT NULL AUTO_INCREMENT,
  `idcliente`       int NOT NULL,
  `monto`           decimal(10,2) NOT NULL,
  `mp_order_id`     varchar(255) DEFAULT NULL,
  `mp_payment_id`   varchar(255) DEFAULT NULL,
  `estado`          enum('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  `fecha`           datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idpago`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
