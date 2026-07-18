ALTER TABLE `config`
  ADD COLUMN `direccion` varchar(200) DEFAULT NULL,
  ADD COLUMN `ciudad`    varchar(100) DEFAULT NULL,
  ADD COLUMN `provincia` varchar(100) DEFAULT NULL;
