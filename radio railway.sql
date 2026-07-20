CREATE DATABASE  IF NOT EXISTS `railway` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `railway`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: tokaido.proxy.rlwy.net    Database: railway
-- ------------------------------------------------------
-- Server version	9.4.0

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
  PRIMARY KEY (`idcliente`),
  UNIQUE KEY `dni` (`dni`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes`
--

LOCK TABLES `clientes` WRITE;
/*!40000 ALTER TABLE `clientes` DISABLE KEYS */;
INSERT INTO `clientes` VALUES (3,'44810049','Fabricio Riguetto');
/*!40000 ALTER TABLE `clientes` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `config`
--

LOCK TABLES `config` WRITE;
/*!40000 ALTER TABLE `config` DISABLE KEYS */;
INSERT INTO `config` VALUES (1,1500.00,100.00,'Wox001','APP_USR-4445532423872027-071815-ec34a88316b567f2196db28da21385a8-292346935','292346935','CAJA292346935',NULL,'TG-6a5bcf49dff17e0001a6fe12-292346935','2027-01-14 19:08:57','Pellegrini 1195','Rosario','Santa Fe');
/*!40000 ALTER TABLE `config` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ctacte`
--

LOCK TABLES `ctacte` WRITE;
/*!40000 ALTER TABLE `ctacte` DISABLE KEYS */;
INSERT INTO `ctacte` VALUES (1,3,1645.00,6500.00,4855.00);
/*!40000 ALTER TABLE `ctacte` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `horarios`
--

DROP TABLE IF EXISTS `horarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `horarios` (
  `idhorario` int NOT NULL AUTO_INCREMENT,
  `idcliente` int NOT NULL,
  `dia_semana` tinyint NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`idhorario`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `horarios_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `horarios`
--

LOCK TABLES `horarios` WRITE;
/*!40000 ALTER TABLE `horarios` DISABLE KEYS */;
INSERT INTO `horarios` VALUES (3,3,6,'00:00:00','01:00:00');
/*!40000 ALTER TABLE `horarios` ENABLE KEYS */;
UNLOCK TABLES;

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
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idpago`),
  KEY `idcliente` (`idcliente`),
  CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`idcliente`) REFERENCES `clientes` (`idcliente`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagos`
--

LOCK TABLES `pagos` WRITE;
/*!40000 ALTER TABLE `pagos` DISABLE KEYS */;
INSERT INTO `pagos` VALUES (1,3,1000.00,'2459618843-31b0ed48-dae3-4285-85ac-4b45e4b0f2c3',NULL,'pendiente','2026-07-18 00:35:12'),(2,3,1000.00,'2459618843-200ce06d-83f3-4791-983e-db7d107bed10',NULL,'pendiente','2026-07-18 00:50:17'),(3,3,100.00,'2459618843-c9012865-5875-4f4d-ab83-d79a1c35af73',NULL,'pendiente','2026-07-18 00:52:42'),(4,3,100.00,'2459618843-c563b0ac-e5c7-4983-9c84-be7392069d97',NULL,'pendiente','2026-07-18 02:50:04'),(5,3,1000.00,'2459618843-0f853a5d-c11c-4ba9-9fc7-f84ac00dfb23',NULL,'pendiente','2026-07-18 03:25:22'),(6,3,1500.00,'2459618843-2692c696-8024-4698-a661-4c798283e1cc',NULL,'pendiente','2026-07-18 03:29:47'),(7,3,8000.00,'2459618843-fbcf49e2-b28c-4a04-9a13-b9d371c89d1c',NULL,'pendiente','2026-07-18 03:33:55'),(8,3,100.00,'2459618843-4b56effe-456f-4971-85a4-6eaa4b1f1382',NULL,'pendiente','2026-07-18 03:42:51'),(9,3,100.00,'2459618843-07f96c30-360a-4239-996a-503b38524c76',NULL,'pendiente','2026-07-18 03:44:28'),(10,3,100.00,'2459618843-a96793b3-77b0-4294-96b3-a01d9db0b93a',NULL,'pendiente','2026-07-18 04:02:57'),(11,3,100.00,'2459618843-d881866d-5b07-4d21-bbf4-e2d6650cc311',NULL,'pendiente','2026-07-18 04:05:56'),(12,3,100.00,'2459618843-90c30a2a-c449-4d56-bd2a-3279ae7f7bcc',NULL,'pendiente','2026-07-18 04:06:21'),(13,3,100.00,'2459618843-0e75f5d7-8652-4496-aad0-9b1dadbb36d8','168499831365','aprobado','2026-07-18 04:15:36'),(14,3,100.00,'2459618843-6266d323-a1d3-44b3-b65a-3d341e54514a',NULL,'pendiente','2026-07-18 04:17:53'),(15,3,100.00,'2459618843-b19bc517-c6c5-450e-b771-86efee48acce',NULL,'pendiente','2026-07-18 04:20:49'),(16,3,100.00,'2459618843-a648d657-8321-4f65-8bb9-a31c6dc9ab10',NULL,'pendiente','2026-07-18 04:22:15'),(17,3,100.00,'2459618843-9641948f-392c-4684-a12d-68b4f2a7fdb7',NULL,'pendiente','2026-07-18 04:26:30'),(18,3,15.00,'ORD01KXTMCS0KMG3RA7RCPYZ69E4Q',NULL,'pendiente','2026-07-18 12:49:35'),(19,3,100.00,'ORDTST01KXTMPRDSHWAFMKPMYG7DW5NQ',NULL,'pendiente','2026-07-18 12:55:03'),(20,3,100.00,'ORDTST01KXTMSATSKR2W56HKTC6P1Y1T',NULL,'pendiente','2026-07-18 12:56:27'),(21,3,100.00,'ORDTST01KXTN2RRB02PF4GBCETGBAJ9E',NULL,'pendiente','2026-07-18 13:01:36'),(22,3,100.00,'ORDTST01KXTNAYFJH98WPVW0DX0WAG4B',NULL,'pendiente','2026-07-18 13:06:04'),(23,3,100.00,'ORDTST01KXTNEQMPC7FV2SENJ2ZAB861','PAY01KXTNEQNEBG8ND1SFWYNVCKBT','aprobado','2026-07-18 13:08:08'),(24,3,100.00,'ORDTST01KXTP26BH0EQVQDBAYQ24X09E','PAY01KXTP26C90TYNC850VDMZ87DN','aprobado','2026-07-18 13:18:46'),(25,3,100.00,'ORDTST01KXTP4YMEF1DNAQFZ8WGATAA9',NULL,'pendiente','2026-07-18 13:20:16'),(26,3,100.00,'ORDTST01KXTP7VTWPXZ1V1EDA1JN80TE','PAY01KXTP7VVHB7FF136PZNMX8G90','aprobado','2026-07-18 13:21:52'),(27,3,100.00,'ORDTST01KXTPVS2ENAVM507FTB4CYNKP','PAY01KXTPVS2ZSRTD76AQ95J206RS','aprobado','2026-07-18 13:32:44'),(28,3,1000.00,'ORDTST01KXTQ200FWD7DKZ1XTE108FVD','PAY01KXTQ20186PRZ845WWMPDQDX6','aprobado','2026-07-18 13:36:08'),(29,3,100.00,'ORDTST01KXTQ3X6D11F15X7ZFHY617KT',NULL,'pendiente','2026-07-18 13:37:11'),(30,3,100.00,'ORDTST01KXTQ4X54TFPR2PG4ZDW185WH',NULL,'pendiente','2026-07-18 13:37:43'),(31,3,100.00,'ORDTST01KXTQE9RFEAB96T9QY07P94SD','PAY01KXTQE9S07ZYZ29F5A47MX958','aprobado','2026-07-18 13:42:51'),(32,3,15.00,'ORD01KXTQS9N899H3KCZQA45JRXSM','PAY01KXTQS9NJASG3G5RBRRAW14JZ','aprobado','2026-07-18 13:48:51'),(33,3,15.00,'ORD01KXTQW2ZQSKEG4S6FDNT0CXRS','PAY01KXTQW30068VCT6NFK7JHJQQ0','aprobado','2026-07-18 13:50:23'),(34,3,15.00,'ORD01KXV88YFKR2H4DQEPS31E4QWG','PAY01KXV88YFYFQ92AN9FAJYRSHKG','aprobado','2026-07-18 18:37:01');
/*!40000 ALTER TABLE `pagos` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sesiones`
--

LOCK TABLES `sesiones` WRITE;
/*!40000 ALTER TABLE `sesiones` DISABLE KEYS */;
INSERT INTO `sesiones` VALUES (1,3,3,'2026-07-18',1,1500.00);
/*!40000 ALTER TABLE `sesiones` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-18 19:17:52
