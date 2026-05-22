# How to run the project

## Prerequisites

- Docker (for MySQL)
- PHP 8.3
- Node 18 and npm
- Stripe CLI (only for billing) — `brew install stripe/stripe-cli/stripe`

## 1. Database

```sh
cd backend
docker compose up -d mysql
```

MySQL is on `127.0.0.1:3307`, db `cqrs_demo`, user `root` / `secret`.

## 2. Backend

```sh
cd backend
cp env.example.json env.json   # first run only
php script/migrate.php up
php -S localhost:9003 router.php
```

Backend is on `http://localhost:9003`.

## 3. Frontend

```sh
cd client
npm install
npm run dev
```

Frontend is on `http://localhost:5173`. `/api/*` is proxied to the backend.

## 4. Stripe (optional — needed only for `/billing`)

### 4.1 Stripe Dashboard (test mode)

1. **Products → Add product** → "Pro", recurring price. Copy the price's **API ID** (`price_…`).
2. **Settings → Billing → Customer portal** → toggle on.
3. **Developers → API keys** → copy the **secret key** (`sk_test_…`).

### 4.2 Webhook forwarder

```sh
stripe login
stripe listen --forward-to localhost:9003/webhooks/stripe
```

Note the printed signing secret (`whsec_…`).

If command is successful, the logs of forwareded requests would appear.

### 4.3 Fill `backend/env.json`

```json
"stripe": {
  "secret_key": "sk_test_…",
  "webhook_secret": "whsec_…",
  "price_pro": "price_…",
  "success_url": "http://localhost:5173/billing?session=success",
  "cancel_url": "http://localhost:5173/billing?session=cancel",
  "portal_return_url": "http://localhost:5173/billing"
}
```

Restart the PHP server.

### 4.4 Test

Sign in as an **owner** → avatar menu → **Billing** → **Upgrade to Pro** → use test card `4242 4242 4242 4242`, any future expiry, any CVC.
