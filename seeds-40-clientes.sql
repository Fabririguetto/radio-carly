-- seeds-40-clientes.sql
-- 40 clientes de ejemplo para desarrollo / testing.
-- Ejecutar después de importar radio.sql (el schema ya tiene que existir).
-- ATENCIÓN: limpia clientes, ctacte, horarios, sesiones y pagos.

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notificaciones_clientes;
TRUNCATE TABLE notificaciones;
TRUNCATE TABLE programas_horarios;
TRUNCATE TABLE programas;
TRUNCATE TABLE precios_historial;
TRUNCATE TABLE pagos;
TRUNCATE TABLE sesiones;
TRUNCATE TABLE horarios;
TRUNCATE TABLE ctacte;
TRUNCATE TABLE clientes;
TRUNCATE TABLE estudios;
SET FOREIGN_KEY_CHECKS = 1;

-- ─── ESTUDIOS ─────────────────────────────────────────────────────────────────
INSERT INTO estudios (idestudio, nombre) VALUES (1, 'Estudio A'), (2, 'Estudio B');

-- ─── CLIENTES ────────────────────────────────────────────────────────────────

INSERT INTO clientes (idcliente, dni, nombre) VALUES
  ( 1, '35420183', 'Martín Fernández'),
  ( 2, '40127634', 'Valentina Suárez'),
  ( 3, '28934512', 'Nicolás Rodríguez'),
  ( 4, '43815209', 'Camila López'),
  ( 5, '32167845', 'Santiago Gómez'),
  ( 6, '38293746', 'Florencia Díaz'),
  ( 7, '25641028', 'Facundo Torres'),
  ( 8, '45092817', 'Lucía Martínez'),
  ( 9, '31758294', 'Emiliano Ruiz'),
  (10, '42381057', 'Sofía García'),
  (11, '27845631', 'Matías Morales'),
  (12, '39204568', 'Natalia Álvarez'),
  (13, '33612790', 'Sebastián Castro'),
  (14, '44726183', 'Gabriela Romero'),
  (15, '29387415', 'Tomás Jiménez'),
  (16, '37541026', 'Verónica Herrera'),
  (17, '26198374', 'Ezequiel Vargas'),
  (18, '41835092', 'Paula Medina'),
  (19, '30492871', 'Ignacio Ríos'),
  (20, '43107285', 'Romina Gutiérrez'),
  (21, '34856219', 'Rodrigo Soto'),
  (22, '39671840', 'Silvana Núñez'),
  (23, '28413095', 'Leandro Aguilar'),
  (24, '46203918', 'Mónica Espinoza'),
  (25, '31094726', 'Federico González'),
  (26, '38756421', 'Carolina Delgado'),
  (27, '25309184', 'Pablo Ponce'),
  (28, '44518372', 'Claudia Ibáñez'),
  (29, '29760538', 'Maximiliano Bravo'),
  (30, '42069153', 'Adriana Cabrera'),
  (31, '36215087', 'Damián Reyes'),
  (32, '40832719', 'Daniela Fuentes'),
  (33, '27594831', 'Gustavo Paredes'),
  (34, '45381274', 'Jimena Vega'),
  (35, '32847106', 'Patricio Mendoza'),
  (36, '41068253', 'Micaela Acosta'),
  (37, '38142697', 'Agustín Flores'),
  (38, '43957018', 'Valeria Domínguez'),
  (39, '24813092', 'Ramón Ortega'),
  (40, '47382015', 'Fernanda Montes');

ALTER TABLE clientes AUTO_INCREMENT = 41;

-- ─── CUENTA CORRIENTE ────────────────────────────────────────────────────────
-- balance = egreso - ingreso (deuda actual del cliente)

INSERT INTO ctacte (idcliente, ingreso, egreso, balance) VALUES
  ( 1, 20000.00, 25000.00,  5000.00),
  ( 2, 40000.00, 40000.00,     0.00),  -- al día
  ( 3, 10000.00, 22000.00, 12000.00),
  ( 4, 35000.00, 35000.00,     0.00),  -- al día
  ( 5,  5000.00, 20000.00, 15000.00),
  ( 6, 45000.00, 45000.00,     0.00),  -- al día
  ( 7, 15000.00, 18000.00,  3000.00),
  ( 8,  0.00,    10000.00, 10000.00),
  ( 9, 25000.00, 25000.00,     0.00),  -- al día
  (10,  8000.00, 16000.00,  8000.00),
  (11, 40000.00, 40000.00,     0.00),  -- al día
  (12, 12000.00, 30000.00, 18000.00),
  (13, 20000.00, 22000.00,  2000.00),
  (14, 50000.00, 50000.00,     0.00),  -- al día
  (15,  0.00,    35000.00, 35000.00),
  (16, 18000.00, 20000.00,  2000.00),
  (17, 30000.00, 35000.00,  5000.00),
  (18, 15000.00, 15000.00,     0.00),  -- al día
  (19,  5000.00, 20000.00, 15000.00),
  (20, 22000.00, 28000.00,  6000.00),
  (21, 10000.00, 10000.00,     0.00),  -- al día
  (22,  0.00,    12000.00, 12000.00),
  (23, 35000.00, 40000.00,  5000.00),
  (24, 20000.00, 20000.00,     0.00),  -- al día
  (25,  8000.00, 25000.00, 17000.00),
  (26, 30000.00, 33000.00,  3000.00),
  (27, 45000.00, 45000.00,     0.00),  -- al día
  (28,  0.00,     8000.00,  8000.00),
  (29, 15000.00, 40000.00, 25000.00),
  (30, 28000.00, 30000.00,  2000.00),
  (31, 10000.00, 10000.00,     0.00),  -- al día
  (32,  5000.00, 18000.00, 13000.00),
  (33, 20000.00, 24000.00,  4000.00),
  (34, 35000.00, 35000.00,     0.00),  -- al día
  (35,  0.00,    30000.00, 30000.00),
  (36, 22000.00, 27000.00,  5000.00),
  (37, 15000.00, 15000.00,     0.00),  -- al día
  (38,  8000.00, 20000.00, 12000.00),
  (39, 40000.00, 40000.00,     0.00),  -- al día
  (40,  0.00,    16000.00, 16000.00);

ALTER TABLE ctacte AUTO_INCREMENT = 41;

-- ─── HORARIOS ────────────────────────────────────────────────────────────────
-- dia_semana: 1=Lun 2=Mar 3=Mie 4=Jue 5=Vie 6=Sab 7=Dom
--
-- Grilla sin solapamientos (una celda = un cliente):
--
--         Lun  Mar  Mie  Jue  Vie  Sab  Dom
-- 08:00:   1    2    3    4    5    6    7
-- 10:00:   8    9   10   11   12   13   14
-- 12:00:  15   16   17   18   19   20   21
-- 14:00:  22   23   24   25   26   27   28
-- 16:00:  29   30   31   32   33   34   35
-- 18:00:  36   37   38   39   40   --   --
--
-- Segundo día (franja 20:00-21:00, completamente libre):
--         Lun  Mar  Mie  Jue  Vie  Sab  Dom
-- 20:00:   8   16   23   11   26    1   33

-- idestudio: 1=Estudio A, 2=Estudio B
-- Franjas pares → Estudio B, franjas impares → Estudio A, segundo día → Estudio A
INSERT INTO horarios (idcliente, idestudio, dia_semana, hora_inicio, hora_fin) VALUES
-- Franja 08:00 → Estudio A
  ( 1, 1, 1, '08:00:00', '09:00:00'),
  ( 2, 1, 2, '08:00:00', '09:00:00'),
  ( 3, 1, 3, '08:00:00', '09:00:00'),
  ( 4, 1, 4, '08:00:00', '09:00:00'),
  ( 5, 1, 5, '08:00:00', '09:00:00'),
  ( 6, 1, 6, '08:00:00', '09:00:00'),
  ( 7, 1, 7, '08:00:00', '09:00:00'),
-- Franja 10:00 → Estudio B
  ( 8, 2, 1, '10:00:00', '11:00:00'),
  ( 9, 2, 2, '10:00:00', '11:00:00'),
  (10, 2, 3, '10:00:00', '11:00:00'),
  (11, 2, 4, '10:00:00', '11:00:00'),
  (12, 2, 5, '10:00:00', '11:00:00'),
  (13, 2, 6, '10:00:00', '11:00:00'),
  (14, 2, 7, '10:00:00', '11:00:00'),
-- Franja 12:00 → Estudio A
  (15, 1, 1, '12:00:00', '13:00:00'),
  (16, 1, 2, '12:00:00', '13:00:00'),
  (17, 1, 3, '12:00:00', '13:00:00'),
  (18, 1, 4, '12:00:00', '13:00:00'),
  (19, 1, 5, '12:00:00', '13:00:00'),
  (20, 1, 6, '12:00:00', '13:00:00'),
  (21, 1, 7, '12:00:00', '13:00:00'),
-- Franja 14:00 → Estudio B
  (22, 2, 1, '14:00:00', '15:00:00'),
  (23, 2, 2, '14:00:00', '15:00:00'),
  (24, 2, 3, '14:00:00', '15:00:00'),
  (25, 2, 4, '14:00:00', '15:00:00'),
  (26, 2, 5, '14:00:00', '15:00:00'),
  (27, 2, 6, '14:00:00', '15:00:00'),
  (28, 2, 7, '14:00:00', '15:00:00'),
-- Franja 16:00 → Estudio A
  (29, 1, 1, '16:00:00', '17:00:00'),
  (30, 1, 2, '16:00:00', '17:00:00'),
  (31, 1, 3, '16:00:00', '17:00:00'),
  (32, 1, 4, '16:00:00', '17:00:00'),
  (33, 1, 5, '16:00:00', '17:00:00'),
  (34, 1, 6, '16:00:00', '17:00:00'),
  (35, 1, 7, '16:00:00', '17:00:00'),
-- Franja 18:00 → Estudio B (solo Lun–Vie)
  (36, 2, 1, '18:00:00', '19:00:00'),
  (37, 2, 2, '18:00:00', '19:00:00'),
  (38, 2, 3, '18:00:00', '19:00:00'),
  (39, 2, 4, '18:00:00', '19:00:00'),
  (40, 2, 5, '18:00:00', '19:00:00'),
-- Segundo día en franja 20:00 → Estudio A (libre en todos los días)
  ( 8, 1, 2, '20:00:00', '21:00:00'),  -- Lucía: Lun+Mar
  (16, 1, 4, '20:00:00', '21:00:00'),  -- Verónica: Mar+Jue
  (23, 1, 3, '20:00:00', '21:00:00'),  -- Leandro: Mar+Mie
  (11, 1, 1, '20:00:00', '21:00:00'),  -- Matías: Jue+Lun
  (26, 1, 6, '20:00:00', '21:00:00'),  -- Carolina: Vie+Sab
  ( 1, 1, 7, '20:00:00', '21:00:00'),  -- Martín: Lun+Dom
  (33, 1, 2, '20:00:00', '21:00:00');  -- Gustavo: Vie+Mar

ALTER TABLE horarios AUTO_INCREMENT = 48;

-- ─── SESIONES (última semana) ─────────────────────────────────────────────────
-- Semana del 13 al 22 de julio 2026
-- dia_semana en horarios: 1=Lun,2=Mar,3=Mie,4=Jue,5=Vie,6=Sab,7=Dom
-- idhorario: 1-7 franja 08:00 (Lun-Dom), 8-14 franja 10:00, 15-21 franja 12:00,
--            22-28 franja 14:00, 29-35 franja 16:00, 36-40 franja 18:00, 41-47 franja 20:00

INSERT INTO sesiones (idcliente, idhorario, fecha, asistio, monto) VALUES
-- Lun 13/07
  ( 1,  1, '2026-07-13', 1, 5000.00),
  ( 8,  8, '2026-07-13', 1, 5000.00),
  (15, 15, '2026-07-13', 0, 5000.00),
  (22, 22, '2026-07-13', 1, 5000.00),
  (11, 47, '2026-07-13', 1, 5000.00),
-- Mar 14/07
  ( 2,  2, '2026-07-14', 1, 5000.00),
  ( 9,  9, '2026-07-14', 1, 5000.00),
  (16, 16, '2026-07-14', 1, 5000.00),
  ( 8, 41, '2026-07-14', 0, 5000.00),
  (33, 46, '2026-07-14', 1, 5000.00),
-- Mie 15/07
  ( 3,  3, '2026-07-15', 1, 5000.00),
  (10, 10, '2026-07-15', 1, 5000.00),
  (17, 17, '2026-07-15', 1, 5000.00),
  (23, 42, '2026-07-15', 1, 5000.00),
-- Jue 16/07
  ( 4,  4, '2026-07-16', 1, 5000.00),
  (11, 11, '2026-07-16', 0, 5000.00),
  (18, 18, '2026-07-16', 1, 5000.00),
  (16, 43, '2026-07-16', 1, 5000.00),
-- Vie 17/07
  ( 5,  5, '2026-07-17', 1, 5000.00),
  (12, 12, '2026-07-17', 1, 5000.00),
  (19, 19, '2026-07-17', 0, 5000.00),
  (26, 44, '2026-07-17', 1, 5000.00),
-- Sab 18/07
  ( 6,  6, '2026-07-18', 1, 5000.00),
  (13, 13, '2026-07-18', 1, 5000.00),
-- Dom 19/07
  ( 7,  7, '2026-07-19', 0, 5000.00),
  (14, 14, '2026-07-19', 1, 5000.00),
  ( 1, 45, '2026-07-19', 1, 5000.00),
-- Lun 20/07
  ( 1,  1, '2026-07-20', 1, 5000.00),
  ( 8,  8, '2026-07-20', 1, 5000.00),
  (22, 22, '2026-07-20', 1, 5000.00),
  (11, 47, '2026-07-20', 1, 5000.00),
-- Mar 21/07
  ( 2,  2, '2026-07-21', 1, 5000.00),
  ( 9,  9, '2026-07-21', 1, 5000.00),
  ( 8, 41, '2026-07-21', 1, 5000.00),
-- Mie 22/07 (hoy)
  ( 3,  3, '2026-07-22', 1, 5000.00),
  (10, 10, '2026-07-22', NULL, 5000.00),
  (17, 17, '2026-07-22', NULL, 5000.00),
  (23, 42, '2026-07-22', NULL, 5000.00);

-- ─── PAGOS ────────────────────────────────────────────────────────────────────

INSERT INTO pagos (idcliente, monto, estado, tipo, motivo, fecha) VALUES
  ( 2, 40000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-18 10:15:00'),
  ( 4, 35000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-17 09:30:00'),
  ( 6, 45000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-16 11:00:00'),
  ( 9, 25000.00, 'aprobado', 'manual', 'Pago parcial junio',     '2026-07-10 14:20:00'),
  (11, 40000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-15 10:00:00'),
  (14, 50000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-14 08:45:00'),
  (18, 15000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-13 16:00:00'),
  (21, 10000.00, 'aprobado', 'manual', 'Efectivo - julio',       '2026-07-20 09:00:00'),
  (24, 20000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-11 17:30:00'),
  (27, 45000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-09 12:00:00'),
  (31, 10000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-22 09:45:00'),
  (34, 35000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-21 10:30:00'),
  (37, 15000.00, 'aprobado', 'manual', 'Efectivo - julio',       '2026-07-22 08:00:00'),
  (39, 40000.00, 'aprobado', 'manual', 'Pago mensual julio',     '2026-07-19 11:15:00'),
  ( 1,  5000.00, 'aprobado', 'manual', 'Pago parcial',           '2026-07-22 10:00:00');

-- ─── CONFIG ───────────────────────────────────────────────────────────────────
INSERT INTO config (id, nombre_negocio, precio_hora, precio_reserva)
VALUES (1, 'Radio Carly', 5000.00, 3000.00)
ON DUPLICATE KEY UPDATE
  nombre_negocio = IF(nombre_negocio IS NULL OR nombre_negocio = '', VALUES(nombre_negocio), nombre_negocio),
  precio_hora    = IF(precio_hora    IS NULL,                         VALUES(precio_hora),    precio_hora),
  precio_reserva = IF(precio_reserva IS NULL,                         VALUES(precio_reserva), precio_reserva);

-- ─── PROGRAMAS ────────────────────────────────────────────────────────────────
-- dia_semana en programas_horarios: convención JS getDay() → 0=Dom,1=Lun,2=Mar,3=Mie,4=Jue,5=Vie,6=Sab

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE programas_horarios;
TRUNCATE TABLE programas;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO programas (idprograma, idcliente, nombre, descripcion, fecha_inicio, fecha_fin, activo) VALUES
  (1,  1, 'Mañana con Martín',     'Magazine matutino de actualidad',          '2026-01-01', NULL,         1),
  (2,  5, 'Tarde Deportiva',       'Análisis y resultados del fútbol local',   '2026-01-01', NULL,         1),
  (3, 10, 'Noticiero del Mediodía','Noticias locales y nacionales',            '2026-02-01', NULL,         1),
  (4, 15, 'Rock en Vivo',          'El mejor rock nacional e internacional',   '2026-03-01', NULL,         1),
  (5, 20, 'Noche Romántica',       'Baladas y música romántica en vivo',       '2026-01-15', NULL,         1),
  (6, 25, 'El Show de la Tarde',   'Humor, entretenimiento y música',          '2026-04-01', NULL,         1),
  (7, 30, 'Fin de Semana Total',   'Especiales de fin de semana',              '2026-05-01', NULL,         1),
  (8,  3, 'El Despertador',        'Programa de madrugada y madrugadores',     '2026-06-01', '2026-12-31', 1);

ALTER TABLE programas AUTO_INCREMENT = 9;

INSERT INTO programas_horarios (idprograma, idestudio, dia_semana, hora_inicio, hora_fin) VALUES
-- Mañana con Martín: lun,mie,vie 08:00-10:00 Estudio A
  (1, 1, 1, '08:00:00', '10:00:00'),
  (1, 1, 3, '08:00:00', '10:00:00'),
  (1, 1, 5, '08:00:00', '10:00:00'),
-- Tarde Deportiva: vie 16:00-18:00 Estudio B
  (2, 2, 5, '16:00:00', '18:00:00'),
-- Noticiero del Mediodía: lun-vie 12:00-13:00 Estudio A
  (3, 1, 1, '12:00:00', '13:00:00'),
  (3, 1, 2, '12:00:00', '13:00:00'),
  (3, 1, 3, '12:00:00', '13:00:00'),
  (3, 1, 4, '12:00:00', '13:00:00'),
  (3, 1, 5, '12:00:00', '13:00:00'),
-- Rock en Vivo: sab 20:00-22:00 Estudio B
  (4, 2, 6, '20:00:00', '22:00:00'),
-- Noche Romántica: mar+jue 21:00-23:00 Estudio A
  (5, 1, 2, '21:00:00', '23:00:00'),
  (5, 1, 4, '21:00:00', '23:00:00'),
-- El Show de la Tarde: lun-vie 15:00-16:00 Estudio B
  (6, 2, 1, '15:00:00', '16:00:00'),
  (6, 2, 2, '15:00:00', '16:00:00'),
  (6, 2, 3, '15:00:00', '16:00:00'),
  (6, 2, 4, '15:00:00', '16:00:00'),
  (6, 2, 5, '15:00:00', '16:00:00'),
-- Fin de Semana Total: sab+dom 10:00-13:00 Estudio A
  (7, 1, 6, '10:00:00', '13:00:00'),
  (7, 1, 0, '10:00:00', '13:00:00'),
-- El Despertador: lun-vie 07:00-08:00 Estudio A
  (8, 1, 1, '07:00:00', '08:00:00'),
  (8, 1, 2, '07:00:00', '08:00:00'),
  (8, 1, 3, '07:00:00', '08:00:00'),
  (8, 1, 4, '07:00:00', '08:00:00'),
  (8, 1, 5, '07:00:00', '08:00:00');

-- ─── PRECIOS HISTORIAL ────────────────────────────────────────────────────────

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE precios_historial;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO precios_historial (idcliente, precio_hora, precio_reserva, fecha_desde, fecha_hasta) VALUES
  ( 1, 4000.00, 2500.00, '2026-01-01', '2026-03-31'),
  ( 1, 5000.00, 3000.00, '2026-04-01', NULL),
  ( 5, 4500.00, 2800.00, '2026-01-01', '2026-05-31'),
  ( 5, 5500.00, 3500.00, '2026-06-01', NULL),
  (10, 5000.00, 3000.00, '2026-01-01', NULL),
  (15, 3500.00, 2000.00, '2025-06-01', '2025-12-31'),
  (15, 5000.00, 3000.00, '2026-01-01', NULL),
  (20, 5000.00, 3000.00, '2026-03-01', NULL),
  (25, 4000.00, 2500.00, '2026-01-01', '2026-04-30'),
  (25, 5000.00, 3000.00, '2026-05-01', NULL);

-- ─── NOTIFICACIONES ──────────────────────────────────────────────────────────

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE notificaciones_clientes;
TRUNCATE TABLE notificaciones;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO notificaciones (idnotificacion, titulo, texto, tipo, precio_nuevo, fecha_inicio, fecha_expiracion, para_todos) VALUES
  (1, 'Actualización de precios agosto',
   'A partir del 1° de agosto se actualiza el precio del servicio. Agradecemos tu confianza.',
   'aumento_cuota', 6000.00, '2026-07-22', '2026-08-15', 1),
  (2, 'Mantenimiento técnico',
   'El jueves 25 de julio realizaremos mantenimiento entre las 08:00 y las 10:00 hs.',
   'general', NULL, '2026-07-22', '2026-07-26', 0);

INSERT INTO notificaciones_clientes (idnotificacion, idcliente, aceptada) VALUES
  (1,  1, 0), (1,  2, 0), (1,  3, 0), (1,  4, 0), (1,  5, 0),
  (1,  6, 0), (1,  7, 0), (1,  8, 0), (1,  9, 0), (1, 10, 0),
  (1, 11, 0), (1, 12, 0), (1, 13, 0), (1, 14, 0), (1, 15, 0),
  (1, 16, 0), (1, 17, 0), (1, 18, 0), (1, 19, 0), (1, 20, 0),
  (1, 21, 0), (1, 22, 0), (1, 23, 0), (1, 24, 0), (1, 25, 0),
  (1, 26, 0), (1, 27, 0), (1, 28, 0), (1, 29, 0), (1, 30, 0),
  (1, 31, 0), (1, 32, 0), (1, 33, 0), (1, 34, 0), (1, 35, 0),
  (1, 36, 0), (1, 37, 0), (1, 38, 0), (1, 39, 0), (1, 40, 0),
  (2,  5, 0), (2, 10, 0), (2, 15, 0), (2, 20, 0), (2, 25, 0);
