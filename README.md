# DeonPay API Worker

Cloudflare Worker implementing the DeonPay Payment API with multi-acquirer support.

## Features

- **Multi-Acquirer Support**: Route payments across Stripe, Conekta, OpenPay, etc.
- **Canonical Data Model**: Provider-agnostic payment representation
- **Type-Safe**: Full TypeScript with Zod validation
- **RESTful API**: Standard HTTP methods and response codes
- **Merchant Isolation**: RLS-enforced data separation
- **Webhook Delivery**: Automatic event notifications with retry logic

## Prerequisites

- Node.js 18+
- Cloudflare account
- Supabase database with canonical schema applied

## Setup

### 1. Install Dependencies

```bash
cd api-worker
npm install
```

### 2. Configure Wrangler

Create `wrangler.toml`:

```toml
name = "deonpay-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "development"

[[d1_databases]]
binding = "DB"
database_name = "deonpay"
database_id = "your-d1-database-id"

[env.production]
name = "deonpay-api-production"
vars = { ENVIRONMENT = "production" }
```

### 3. Set Secrets

```bash
# Supabase credentials
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY

# Acquirer API keys
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put CONEKTA_API_KEY
wrangler secret put OPENPAY_API_KEY
```

### 4. Apply Database Migrations

See `/infra/migrations/020_canonical_data_schema.sql`

```bash
# From root of deonpay-master
cd infra/migrations
psql -h <your-supabase-host> -U postgres -d postgres -f 020_canonical_data_schema.sql
```

### 5. Verify Schema

```bash
cd infra/scripts
psql -h <your-supabase-host> -U postgres -d postgres -f verify_canonical_schema.sql
```

All checks should show `✓ PASS`.

## Development

### Run Locally

```bash
npm run dev
```

API available at `http://localhost:8787`

### Type Check

```bash
npm run typecheck
```

### Test

```bash
npm test
```

## Deployment

### Deploy to Cloudflare

```bash
npm run deploy
```

### Environment Variables

Required secrets:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anon/public key
- `STRIPE_SECRET_KEY`: Stripe secret key
- `CONEKTA_API_KEY`: Conekta API key
- `OPENPAY_API_KEY`: OpenPay API key

## API Endpoints

### Payment Intents

```
POST   /api/v1/payment_intents       - Create payment intent
GET    /api/v1/payment_intents/:id   - Get payment intent
PATCH  /api/v1/payment_intents/:id   - Update payment intent
POST   /api/v1/payment_intents/:id/confirm - Confirm payment
POST   /api/v1/payment_intents/:id/capture - Capture payment
POST   /api/v1/payment_intents/:id/cancel  - Cancel payment
GET    /api/v1/payment_intents       - List payment intents
```

### Customers

```
POST   /api/v1/customers       - Create customer
GET    /api/v1/customers/:id   - Get customer
PATCH  /api/v1/customers/:id   - Update customer
DELETE /api/v1/customers/:id   - Delete customer
GET    /api/v1/customers       - List customers
```

### Refunds

```
POST   /api/v1/refunds       - Create refund
GET    /api/v1/refunds/:id   - Get refund
GET    /api/v1/refunds       - List refunds
```

### Balance

```
GET    /api/v1/balance/transactions       - List balance transactions
GET    /api/v1/balance/transactions/:id   - Get balance transaction
```

## Authentication

All API requests require authentication via API key:

```http
Authorization: Bearer pk_test_abc123...
```

API keys are managed in the Dashboard and stored in the `api_keys` table.

## Example Usage

### Create Payment Intent

```bash
curl -X POST https://api.deonpay.mx/v1/payment_intents \
  -H "Authorization: Bearer pk_test_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10050,
    "currency": "MXN",
    "capture_method": "automatic"
  }'
```

**Response:**
```json
{
  "id": "pi_abc123",
  "status": "requires_payment_method",
  "amount": 10050,
  "currency": "MXN",
  "created_at": "2025-11-09T12:00:00Z"
}
```

### Confirm Payment

```bash
curl -X POST https://api.deonpay.mx/v1/payment_intents/pi_abc123/confirm \
  -H "Authorization: Bearer pk_test_abc123" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": {
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2025,
      "token_ref": "tok_stripe_xyz"
    }
  }'
```

**Response:**
```json
{
  "id": "pi_abc123",
  "status": "succeeded",
  "amount": 10050,
  "currency": "MXN",
  "payment_method": {
    "brand": "visa",
    "last4": "4242"
  },
  "acquirer_routing": {
    "selected": "stripe",
    "routing_strategy": "cost_optimization"
  }
}
```

### Create Refund

```bash
curl -X POST https://api.deonpay.mx/v1/refunds \
  -H "Authorization: Bearer sk_live_xyz789" \
  -H "Content-Type: application/json" \
  -d '{
    "charge_id": "ch_xyz789",
    "amount": 5000,
    "reason": "Customer requested refund"
  }'
```

## Schemas

All request/response schemas are defined in `/src/schemas/canonical.ts` using Zod.

Import and use:

```typescript
import {
  CreatePaymentIntentSchema,
  PaymentIntent,
  toMinorUnits
} from './schemas/canonical'

// Validate input
const input = CreatePaymentIntentSchema.parse(req.body)

// Use typed data
const amount = toMinorUnits(100.50) // 10050 centavos
```

## Error Handling

All errors follow standard format:

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Amount must be positive",
    "code": "invalid_amount",
    "param": "amount"
  }
}
```

Error types:
- `invalid_request_error`: Bad request parameters
- `authentication_error`: Invalid/missing API key
- `rate_limit_error`: Too many requests
- `api_error`: Server error
- `validation_error`: Schema validation failed

## Monitoring

### Logs

View Cloudflare Worker logs:

```bash
wrangler tail
```

### Metrics

- Payment success rate
- Acquirer routing decisions
- Webhook delivery status
- Balance transaction history

All available in Hub dashboard at `hub.deonpay.mx`

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────┐
│  Cloudflare Worker  │
│  (Hono + Zod)       │
└──────┬──────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────────┐
│  Supabase   │   │   Acquirers     │
│  (Postgres) │   │ Stripe/Conekta  │
└─────────────┘   └─────────────────┘
```

## Next Steps

1. Implement acquirer adapters
2. Add routing logic
3. Build webhook delivery system
4. Add rate limiting
5. Implement idempotency keys

## Documentation

- [Canonical Schema MVP](../docs/canonical-schema-mvp.md)
- [Ecosystem Documentation](../DEONPAY_ECOSYSTEM_DOCUMENTATION.md)

## Support

For issues or questions, review:
- `/infra/migrations/` - Database migrations
- `/docs/canonical-schema-mvp.md` - Schema documentation
- Supabase dashboard for RLS/data issues
