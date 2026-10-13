-- The warehouse invariant: at most one ACTIVE duck per (color, size, price).
--
-- MySQL has no partial unique index, so `active_key` stands in for one. It is
-- 1 for an active duck and NULL for a deleted one. A unique index treats NULLs
-- as distinct, so any number of deleted ducks may share a color, size and
-- price, but only one active duck can. Because the database enforces this,
-- the rule holds no matter how many requests arrive at the same time.
--
-- Price is DECIMAL, not DOUBLE: merging needs exact equality on price, and
-- the store has to be right to the cent.

CREATE TABLE ducks (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  color      ENUM('Red', 'Green', 'Yellow', 'Black') NOT NULL,
  size       ENUM('XLarge', 'Large', 'Medium', 'Small', 'XSmall') NOT NULL,
  price      DECIMAL(10, 2) NOT NULL,
  quantity   INT UNSIGNED NOT NULL,
  deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Incremented on every write; lets an edit detect that it is stale.
  version    INT UNSIGNED NOT NULL DEFAULT 1,
  active_key TINYINT GENERATED ALWAYS AS (IF(deleted, NULL, 1)) VIRTUAL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_ducks_active_identity (color, size, price, active_key),
  CONSTRAINT chk_ducks_price_positive CHECK (price > 0)
) ENGINE = InnoDB;
