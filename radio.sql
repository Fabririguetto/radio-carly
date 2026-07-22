CREATE DATABASE  IF NOT EXISTS `radio` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `radio`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: radio
-- ------------------------------------------------------
-- Server version	8.0.43

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

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `idcliente` int NOT NULL AUTO_INCREMENT,
  `dni` varchar(20) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`idcliente`),
  UNIQUE KEY `dni` (`dni`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `config`
--

DROP TABLE IF EXISTS `config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `precio_hora` decimal(10,2) NOT NULL DEFAULT '5000.00',
  `precio_reserva` decimal(10,2) NOT NULL DEFAULT '2000.00',
  `deuda_maxima` decimal(10,2) NOT NULL DEFAULT '0.00',
  `nombre_negocio` varchar(100) DEFAULT NULL,
  `mp_access_token` varchar(250) DEFAULT NULL,
  `mp_collector_id` varchar(50) DEFAULT NULL,
  `mp_pos_external_id` varchar(50) DEFAULT NULL,
  `mp_webhook_secret` varchar(250) DEFAULT NULL,
  `mp_refresh_token` varchar(500) DEFAULT NULL,
  `mp_token_expires_at` datetime DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `provincia` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ctacte`
--

DROP TABLE IF EXISTS `ctacte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ctacte` (
  `idctacte` int NOT NULL AUTO_INCREMENT,
  `idcliente` int NOT NULL,
  `ingreso` decimal(10,2) NOT NULL DEFAULT '0.00',
  `egreso` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`idctacte`),
  UNIQUE KEY `idcliente` (`idcliente`),
  CONSTRAINT `ctacte_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `estudios`
--

DROP TABLE IF EXISTS `estudios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estudios` (
  `idestudio` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`idestudio`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `horarios`
--

DROP TABLE IF EXISTS `horarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `horarios` (
  `idhorario` int NOT NULL AUTO_INCREMENT,
  `idcliente` int NOT NULL,
  `idestudio` int DEFAULT NULL,
  `dia_semana` tinyint NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`idhorario`),
  KEY `idcliente` (`idcliente`),
  KEY `idestudio` (`idestudio`),
  CONSTRAINT `horarios_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`),
  CONSTRAINT `horarios_ibfk_2` FOREIGN KEY (`idestudio`) REFERENCES `estudios` (`idestudio`)
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pagos`
--

DROP TABLE IF EXISTS `pagos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagos` (
  `idpago` int NOT NULL AUTO_INCREMENT,
  `idcliente` int NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `mp_order_id` varchar(255) DEFAULT NULL,
  `mp_payment_id` varchar(255) DEFAULT NULL,
  `estado` enum('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  `tipo` enum('qr','manual','bonificacion') NOT NULL DEFAULT 'qr',
  `motivo` varchar(200) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idpago`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sesiones`
--

DROP TABLE IF EXISTS `sesiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sesiones` (
  `idsesion` int NOT NULL AUTO_INCREMENT,
  `idcliente` int NOT NULL,
  `idhorario` int NOT NULL,
  `fecha` date NOT NULL,
  `asistio` tinyint(1) DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  PRIMARY KEY (`idsesion`),
  UNIQUE KEY `sesion_unica` (`idhorario`,`fecha`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `sesiones_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`),
  CONSTRAINT `sesiones_ibfk_2` FOREIGN KEY (`idhorario`) REFERENCES `horarios` (`idhorario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

--
-- Table structure for table `precios_historial`
--

DROP TABLE IF EXISTS `precios_historial`;
CREATE TABLE `precios_historial` (
  `idhistorial` int NOT NULL AUTO_INCREMENT,
  `idcliente` int NOT NULL,
  `precio_hora` decimal(10,2) NOT NULL,
  `precio_reserva` decimal(10,2) NOT NULL,
  `fecha_desde` date NOT NULL,
  `fecha_hasta` date DEFAULT NULL,
  PRIMARY KEY (`idhistorial`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `precios_historial_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `notificaciones`
--

DROP TABLE IF EXISTS `notificaciones`;
CREATE TABLE `notificaciones` (
  `idnotificacion` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(200) NOT NULL,
  `texto` text NOT NULL,
  `tipo` enum('general','aumento_cuota') NOT NULL DEFAULT 'general',
  `precio_nuevo` decimal(10,2) DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_expiracion` date NOT NULL,
  `para_todos` tinyint(1) NOT NULL DEFAULT '0',
  `creada_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idnotificacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `notificaciones_clientes`
--

DROP TABLE IF EXISTS `notificaciones_clientes`;
CREATE TABLE `notificaciones_clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `idnotificacion` int NOT NULL,
  `idcliente` int NOT NULL,
  `aceptada` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_aceptacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notif_cliente` (`idnotificacion`,`idcliente`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `nc_ibfk_1` FOREIGN KEY (`idnotificacion`) REFERENCES `notificaciones` (`idnotificacion`) ON DELETE CASCADE,
  CONSTRAINT `nc_ibfk_2` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `programas`
--

DROP TABLE IF EXISTS `programas`;
CREATE TABLE `programas` (
  `idprograma` int NOT NULL AUTO_INCREMENT,
  `idcliente` int NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `dni_responsable` varchar(20) DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`idprograma`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `programas_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Table structure for table `programas_horarios`
--

DROP TABLE IF EXISTS `programas_horarios`;
CREATE TABLE `programas_horarios` (
  `idprograma_horario` int NOT NULL AUTO_INCREMENT,
  `idprograma` int NOT NULL,
  `idestudio` int NOT NULL,
  `dia_semana` tinyint NOT NULL COMMENT '0=Dom,1=Lun,...,6=Sab',
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`idprograma_horario`),
  KEY `idprograma` (`idprograma`),
  KEY `idestudio` (`idestudio`),
  CONSTRAINT `ph_ibfk_1` FOREIGN KEY (`idprograma`) REFERENCES `programas` (`idprograma`) ON DELETE CASCADE,
  CONSTRAINT `ph_ibfk_2` FOREIGN KEY (`idestudio`) REFERENCES `estudios` (`idestudio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dump completed on 2026-07-21
