<?php

require_once __DIR__ . '/../util/Database.php';
require_once __DIR__ . '/../util/Uuid.php';
require_once __DIR__ . '/../util/Maybe.php';
require_once __DIR__ . '/Account.php';

class AccountRepository
{
    private const SELECT_BASE = <<<'SQL'
        SELECT id, name, stripe_customer_id, stripe_subscription_id,
               plan, subscription_status, current_period_end
        FROM accounts
        SQL;

    public function findById(string $id): Maybe {
        $stmt = Database::get()->prepare(self::SELECT_BASE . ' WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function findByStripeCustomerId(string $stripeCustomerId): Maybe {
        $stmt = Database::get()->prepare(self::SELECT_BASE . ' WHERE stripe_customer_id = ?');
        $stmt->execute([$stripeCustomerId]);
        $row = $stmt->fetch();

        return $row ? Maybe::some($this->hydrate($row)) : Maybe::none();
    }

    public function save(Account $account): Account {
        $id = $account->id ?? Uuid::generate();

        $stmt = Database::get()->prepare(
            'INSERT INTO accounts (id, name) VALUES (?, ?)'
        );
        $stmt->execute([$id, $account->name]);

        return new Account(id: $id, name: $account->name);
    }

    public function setStripeCustomerId(string $accountId, string $stripeCustomerId): void {
        $stmt = Database::get()->prepare(
            'UPDATE accounts SET stripe_customer_id = ? WHERE id = ?'
        );
        $stmt->execute([$stripeCustomerId, $accountId]);
    }

    public function updateSubscription(
        string $accountId,
        ?string $stripeSubscriptionId,
        string $plan,
        ?string $subscriptionStatus,
        ?string $currentPeriodEnd,
    ): void {
        $stmt = Database::get()->prepare(
            'UPDATE accounts
             SET stripe_subscription_id = ?, plan = ?, subscription_status = ?, current_period_end = ?
             WHERE id = ?'
        );
        $stmt->execute([
            $stripeSubscriptionId,
            $plan,
            $subscriptionStatus,
            $currentPeriodEnd,
            $accountId,
        ]);
    }

    private function hydrate(array $row): Account {
        return new Account(
            id: $row['id'],
            name: $row['name'],
            stripeCustomerId: $row['stripe_customer_id'] ?? null,
            stripeSubscriptionId: $row['stripe_subscription_id'] ?? null,
            plan: $row['plan'] ?? 'free',
            subscriptionStatus: $row['subscription_status'] ?? null,
            currentPeriodEnd: $row['current_period_end'] ?? null,
        );
    }
}
