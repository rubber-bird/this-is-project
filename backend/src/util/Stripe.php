<?php

class Stripe
{
    public function __construct(
        private readonly string $secretKey,
        private readonly string $webhookSecret = '',
    ) {}

    public function isConfigured(): bool {
        return $this->secretKey !== '';
    }

    /** @param array<string, mixed> $params */
    public function createCustomer(string $email, string $name, string $accountId): array {
        return $this->request('POST', '/v1/customers', [
            'email' => $email,
            'name' => $name,
            'metadata' => ['account_id' => $accountId],
        ]);
    }

    public function createCheckoutSession(
        string $customerId,
        string $priceId,
        string $successUrl,
        string $cancelUrl,
        string $accountId,
    ): array {
        return $this->request('POST', '/v1/checkout/sessions', [
            'mode' => 'subscription',
            'customer' => $customerId,
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'allow_promotion_codes' => 'true',
            'client_reference_id' => $accountId,
            'line_items' => [
                ['price' => $priceId, 'quantity' => 1],
            ],
        ]);
    }

    public function createBillingPortalSession(string $customerId, string $returnUrl): array {
        return $this->request('POST', '/v1/billing_portal/sessions', [
            'customer' => $customerId,
            'return_url' => $returnUrl,
        ]);
    }

    public function retrieveSubscription(string $subscriptionId): array {
        return $this->request('GET', '/v1/subscriptions/' . urlencode($subscriptionId));
    }

    public function verifyWebhookSignature(string $payload, string $sigHeader, int $toleranceSeconds = 300): bool {
        if ($this->webhookSecret === '' || $sigHeader === '') {
            return false;
        }

        $parts = [];
        foreach (explode(',', $sigHeader) as $segment) {
            $pair = explode('=', trim($segment), 2);
            if (count($pair) === 2) {
                $parts[$pair[0]][] = $pair[1];
            }
        }

        $timestamp = (int) ($parts['t'][0] ?? 0);
        $signatures = $parts['v1'] ?? [];
        if ($timestamp <= 0 || $signatures === []) {
            return false;
        }
        if (abs(time() - $timestamp) > $toleranceSeconds) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $this->webhookSecret);
        foreach ($signatures as $sig) {
            if (hash_equals($expected, $sig)) {
                return true;
            }
        }

        return false;
    }

    /** @param array<string, mixed> $params */
    private function request(string $method, string $path, array $params = []): array {
        $url = 'https://api.stripe.com' . $path;
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $this->secretKey,
            'Content-Type: application/x-www-form-urlencoded',
        ]);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        if ($method !== 'GET' && $params !== []) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $this->buildBody($params));
        }
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);

        if ($response === false) {
            throw new RuntimeException('Stripe request failed: ' . $err);
        }

        $decoded = json_decode((string) $response, true) ?? [];
        if ($status >= 400) {
            $message = $decoded['error']['message'] ?? ('Stripe error (' . $status . ')');
            throw new RuntimeException($message);
        }

        return $decoded;
    }

    /** @param array<string, mixed> $params */
    private function buildBody(array $params): string {
        return http_build_query($this->flatten($params), '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * Flattens nested arrays into Stripe's bracket notation:
     *   ['metadata' => ['x' => 'y']] => ['metadata[x]' => 'y']
     *   ['line_items' => [['price' => 'p']]] => ['line_items[0][price]' => 'p']
     *
     * @param array<string, mixed> $params
     * @return array<string, scalar>
     */
    private function flatten(array $params, string $prefix = ''): array {
        $flat = [];
        foreach ($params as $key => $value) {
            $compoundKey = $prefix === '' ? (string) $key : $prefix . '[' . $key . ']';
            if (is_array($value)) {
                $flat = array_merge($flat, $this->flatten($value, $compoundKey));
            } else {
                $flat[$compoundKey] = $value;
            }
        }

        return $flat;
    }
}
