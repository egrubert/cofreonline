-- MySQL dump 10.13  Distrib 8.0.42, for Linux (x86_64)
--
-- Host: localhost    Database: cofreonline
-- ------------------------------------------------------
-- Server version	8.0.42-0ubuntu0.20.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `aprovadores_regras`
--

DROP TABLE IF EXISTS `aprovadores_regras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aprovadores_regras` (
  `id` int NOT NULL AUTO_INCREMENT,
  `regra_id` int NOT NULL,
  `cpf_aprovador` varchar(14) NOT NULL,
  `aprovado` tinyint(1) DEFAULT '0',
  `data_aprovacao` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `regra_id` (`regra_id`),
  CONSTRAINT `aprovadores_regras_ibfk_1` FOREIGN KEY (`regra_id`) REFERENCES `regras_liberacao` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aprovadores_regras`
--

LOCK TABLES `aprovadores_regras` WRITE;
/*!40000 ALTER TABLE `aprovadores_regras` DISABLE KEYS */;
/*!40000 ALTER TABLE `aprovadores_regras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `compartilhamentos`
--

DROP TABLE IF EXISTS `compartilhamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compartilhamentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `documento_id` int NOT NULL,
  `cpf_destinatario` varchar(14) NOT NULL,
  `data_compartilhamento` datetime DEFAULT CURRENT_TIMESTAMP,
  `pode_visualizar` tinyint(1) DEFAULT '0',
  `pode_baixar` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `documento_id` (`documento_id`),
  CONSTRAINT `compartilhamentos_ibfk_1` FOREIGN KEY (`documento_id`) REFERENCES `documentos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `compartilhamentos`
--

LOCK TABLES `compartilhamentos` WRITE;
/*!40000 ALTER TABLE `compartilhamentos` DISABLE KEYS */;
INSERT INTO `compartilhamentos` VALUES (1,1,'00923282025','2025-06-14 17:50:10',1,0),(2,5,'847.680.140-89','2025-06-29 16:55:53',1,0),(3,5,'251.040.910-74','2025-06-29 16:56:13',1,1),(4,6,'251.040.910-74','2025-07-11 18:31:39',1,1),(5,2,'864.041.590-07','2025-07-11 18:39:02',1,1),(6,3,'864.041.590-07','2025-07-11 18:44:53',1,1);
/*!40000 ALTER TABLE `compartilhamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documentos`
--

DROP TABLE IF EXISTS `documentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documentos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `caminho_arquivo` varchar(512) NOT NULL,
  `tamanho` bigint NOT NULL,
  `tipo` varchar(100) NOT NULL,
  `usuario_id` int NOT NULL,
  `data_upload` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `documentos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documentos`
--

LOCK TABLES `documentos` WRITE;
/*!40000 ALTER TABLE `documentos` DISABLE KEYS */;
INSERT INTO `documentos` VALUES (1,'ubuntublue01.jpg','/uploads/1749934183044-30496673.jpg',53732,'image/jpeg',2,'2025-06-14 17:49:43'),(2,'c1.jpg','/uploads/1751226403411-227640654.jpg',60597,'image/jpeg',5,'2025-06-29 16:46:43'),(3,'c2.webp','/uploads/1751226413907-861096629.webp',56540,'image/webp',5,'2025-06-29 16:46:53'),(4,'c3.png','/uploads/1751226433443-596782386.png',30410,'image/png',5,'2025-06-29 16:47:13'),(5,'CAB.avif','/uploads/1751226653077-363634956.avif',6259,'image/avif',5,'2025-06-29 16:50:53'),(6,'A1.webp','/uploads/1752269455275-996097478.webp',110652,'image/webp',3,'2025-07-11 18:30:55');
/*!40000 ALTER TABLE `documentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `regras_liberacao`
--

DROP TABLE IF EXISTS `regras_liberacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `regras_liberacao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `documento_id` int NOT NULL,
  `tipo_regra` enum('TODOS','ALGUNS','DATA') NOT NULL,
  `data_liberacao` datetime DEFAULT NULL,
  `status` enum('PENDENTE','LIBERADO') DEFAULT 'PENDENTE',
  PRIMARY KEY (`id`),
  KEY `documento_id` (`documento_id`),
  CONSTRAINT `regras_liberacao_ibfk_1` FOREIGN KEY (`documento_id`) REFERENCES `documentos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `regras_liberacao`
--

LOCK TABLES `regras_liberacao` WRITE;
/*!40000 ALTER TABLE `regras_liberacao` DISABLE KEYS */;
INSERT INTO `regras_liberacao` VALUES (1,2,'TODOS',NULL,'LIBERADO'),(2,6,'DATA','2025-07-11 18:31:00','LIBERADO'),(3,2,'ALGUNS',NULL,'LIBERADO'),(4,3,'DATA','2025-07-10 18:45:00','LIBERADO');
/*!40000 ALTER TABLE `regras_liberacao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `cpf` varchar(14) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `cpf` (`cpf`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'edson grubert dos santos','edinho.grubert@gmail.com','00923282025','$2b$12$HXSGD148E6wp5f.QBeWX6OPuAyu3ZCKDPQlGuiisd5b9v2MqvOCEm','2025-06-07 15:14:55'),(2,'Willian grubert dos santos','willian.grubert@gmail.com','10844646083','$2b$12$HXSGD148E6wp5f.QBeWX6OPuAyu3ZCKDPQlGuiisd5b9v2MqvOCEm','2025-06-10 21:14:58'),(3,'aa','aa@aa.br','251.040.910-74','$2b$12$HXSGD148E6wp5f.QBeWX6OPuAyu3ZCKDPQlGuiisd5b9v2MqvOCEm','2025-06-29 19:38:20'),(4,'bb','bb@bb.br','847.680.140-89','$2b$12$HXSGD148E6wp5f.QBeWX6OPuAyu3ZCKDPQlGuiisd5b9v2MqvOCEm','2025-06-29 19:40:08'),(5,'cc','cc@cc.br','343.199.140-82','$2b$12$HXSGD148E6wp5f.QBeWX6OPuAyu3ZCKDPQlGuiisd5b9v2MqvOCEm','2025-06-29 19:40:51'),(6,'dd','dd@dd.com.br','024.378.550-09','$2b$12$HXSGD148E6wp5f.QBeWX6OPuAyu3ZCKDPQlGuiisd5b9v2MqvOCEm','2025-07-11 20:29:57'),(7,'ee','ee@ee.com.br','389.472.920-10','$2b$12$HXSGD148E6wp5f.QBeWX6OPuAyu3ZCKDPQlGuiisd5b9v2MqvOCEm','2025-07-11 20:41:34'),(8,'ff','ff@ff.com.br','929.400.750-26','$2b$12$HXSGD148E6wp5f.QBeWX6OPuAyu3ZCKDPQlGuiisd5b9v2MqvOCEm','2025-07-11 21:07:25'),(9,'gg','gg@gg.com.br','864.041.590-07','$2b$12$HXSGD148E6wp5f.QBeWX6OPuAyu3ZCKDPQlGuiisd5b9v2MqvOCEm','2025-07-11 21:21:52');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-11 18:53:52
