<?php

require_once __DIR__ . '/../util/Result.php';
require_once __DIR__ . '/../util/Stripe.php';
require_once __DIR__ . '/../data/UserRepository.php';
require_once __DIR__ . '/../data/AccountRepository.php';
require_once __DIR__ . '/../data/Role.php';

class BillingService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly AccountRepository $accounts,
        private readonly Stripe $stripe,
        private readonly string $pricePro,
        private readonly string $successUrl,
        private readonly string $cancelUrl,
        private readonly string $portalReturnUrl,
    ) {}

    public function getBilling(?string $userId): Result {
        $authResult = $this->requireOwner($userId);
        if ($authResult->failed()) {
            return $authResult;
        }
        $account = $authResult->value()['account'];

        return Result::ok(200, $this->publicAccount($account));
    }

    public function createCheckout(?string $userId): Result {
        if (!$this->stripe->isConfigured()) {
            return Result::fail(503, 'unavailable', ['message' => 'Billing is not configured']);
        }
        if ($this->pricePro === '') {
            return Result::fail(503, 'unavailable', ['message' => 'Pro price is not configured']);
        }

        $authResult = $this->requireOwner($userId);
        if ($authResult->failed()) {
            return $authResult;
        }
        $user = $authResult->value()['user'];
        $account = $authResult->value()['account'];

        if ($account->plan === 'pro' && in_array($account->subscriptionStatus, ['active', 'trialing'], true)) {
            return Result::fail(400, 'validation', ['message' => 'Already on Pro plan']);
        }

        $customerId = $account->stripeCustomerId;
        if (!$customerId) {
            $customer = $this->stripe->createCustomer(
                email: $user->email,
                name: $account->name,
                accountId: $account->id,
            );
            $customerId = (string) ($customer['id'] ?? '');
            if ($customerId === '') {
                return Result::fail(502, 'upstream', ['message' => 'Stripe did not return a customer id']);
            }
            $this->accounts->setStripeCustomerId($account->id, $customerId);
        }

        $session = $this->stripe->createCheckoutSession(
            customerId: $customerId,
            priceId: $this->pricePro,
            successUrl: $this->successUrl,
            cancelUrl: $this->cancelUrl,
            accountId: $account->id,
        );

        return Result::ok(200, ['url' => $session['url'] ?? null]);
    }

    public function createPortal(?string $userId): Result {
        if (!$this->stripe->isConfigured()) {
            return Result::fail(503, 'unavailable', ['message' => 'Billing is not configured']);
        }

        $authResult = $this->requireOwner($userId);
        if ($authResult->failed()) {
            return $authResult;
        }
        $account = $authResult->value()['account'];

        if (!$account->stripeCustomerId) {
            return Result::fail(400, 'validation', ['message' => 'No billing customer yet']);
        }

        $session = $this->stripe->createBillingPortalSession(
            customerId: $account->stripeCustomerId,
            returnUrl: $this->portalReturnUrl,
        );

        return Result::ok(200, ['url' => $session['url'] ?? null]);
    }

    public function handleWebhook(string $payload, string $signatureHeader): Result {
        if (!$this->stripe->verifyWebhookSignature($payload, $signatureHeader)) {
            return Result::fail(400, 'validation', ['message' => 'Invalid Stripe signature']);
        }

        $event = json_decode($payload, true) ?? [];
        $type = $event['type'] ?? '';
        $object = $event['data']['object'] ?? [];

        switch ($type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                $this->applySubscriptionChange($object);
                break;

            case 'checkout.session.completed':
                $subscriptionId = $object['subscription'] ?? null;
                if (is_string($subscriptionId) && $subscriptionId !== '') {
                    $subscription = $this->stripe->retrieveSubscription($subscriptionId);
                    $this->applySubscriptionChange($subscription);
                }
                break;

            default:
                // ignore unrelated events
                break;
        }

        return Result::ok(200, ['received' => true]);
    }

    /** @param array<string, mixed> $subscription */
    private function applySubscriptionChange(array $subscription): void {
        $customerId = $subscription['customer'] ?? null;
        if (!is_string($customerId) || $customerId === '') {
            return;
        }
        $accountMaybe = $this->accounts->findByStripeCustomerId($customerId);
        if (!$accountMaybe->hasValue()) {
            return;
        }
        $account = $accountMaybe->value();

        $status = $subscription['status'] ?? null;
        $subscriptionId = $subscription['id'] ?? null;
        $isActive = in_array($status, ['active', 'trialing'], true);

        $periodEndTs = $subscription['current_period_end'] ?? null;
        $periodEnd = is_int($periodEndTs)
            ? gmdate('Y-m-d H:i:s', $periodEndTs)
            : null;

        $plan = $isActive ? 'pro' : 'free';
        $keepSubscriptionId = $isActive ? $subscriptionId : null;

        $this->accounts->updateSubscription(
            accountId: $account->id,
            stripeSubscriptionId: is_string($keepSubscriptionId) ? $keepSubscriptionId : null,
            plan: $plan,
            subscriptionStatus: is_string($status) ? $status : null,
            currentPeriodEnd: $periodEnd,
        );
    }

    /** @return Result value: ['user' => User, 'account' => Account] */
    private function requireOwner(?string $userId): Result {
        if (!$userId) {
            return Result::fail(401, 'unauthorized', ['message' => 'Not authenticated']);
        }
        $userMaybe = $this->users->findById($userId);
        if (!$userMaybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'User not found']);
        }
        $user = $userMaybe->value();
        if ($user->role !== Role::Owner) {
            return Result::fail(403, 'forbidden', ['message' => 'Only the account owner can manage billing']);
        }
        $accountMaybe = $this->accounts->findById($user->accountId);
        if (!$accountMaybe->hasValue()) {
            return Result::fail(404, 'not_found', ['message' => 'Account not found']);
        }

        return Result::ok(200, ['user' => $user, 'account' => $accountMaybe->value()]);
    }

    private function publicAccount(Account $account): array {
        return [
            'plan' => $account->plan,
            'subscription_status' => $account->subscriptionStatus,
            'current_period_end' => $account->currentPeriodEnd,
            'has_customer' => $account->stripeCustomerId !== null,
        ];
    }
}
