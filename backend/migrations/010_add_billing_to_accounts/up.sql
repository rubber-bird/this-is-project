-- 010_add_billing_to_accounts (up)

ALTER TABLE accounts
ADD COLUMN stripe_customer_id VARCHAR(255) NULL,
ADD COLUMN stripe_subscription_id VARCHAR(255) NULL,
ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'free',
ADD COLUMN subscription_status VARCHAR(30) NULL,
ADD COLUMN current_period_end TIMESTAMP NULL,
ADD UNIQUE KEY uq_accounts_stripe_customer (stripe_customer_id);
