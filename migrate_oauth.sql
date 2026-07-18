ALTER TABLE `config`
  ADD COLUMN `mp_refresh_token`    varchar(500) DEFAULT NULL,
  ADD COLUMN `mp_token_expires_at` datetime     DEFAULT NULL;
