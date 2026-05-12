-- 010_add_billing_to_accounts (down)

ALTER TABLE accounts
DROP INDEX uq_accounts_stripe_customer,
DROP COLUMN current_period_end,
DROP COLUMN subscription_status,
DROP COLUMN plan,
DROP COLUMN stripe_subscription_id,
DROP COLUMN stripe_customer_id;
