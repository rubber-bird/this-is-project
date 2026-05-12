<?php

class Account
{
    public function __construct(
        public readonly ?string $id,
        public readonly string $name,
        public readonly ?string $stripeCustomerId = null,
        public readonly ?string $stripeSubscriptionId = null,
        public readonly string $plan = 'free',
        public readonly ?string $subscriptionStatus = null,
        public readonly ?string $currentPeriodEnd = null,
    ) {}

    public function toArray(): array {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'plan' => $this->plan,
            'subscription_status' => $this->subscriptionStatus,
            'current_period_end' => $this->currentPeriodEnd,
        ];
    }
}
