ALTER TABLE `config`
  ADD COLUMN IF NOT EXISTS `mp_refresh_token`    varchar(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `mp_token_expires_at` datetime     DEFAULT NULL;
