/**
 * Canonical Data Schemas - DeonPay Payment Processing
 *
 * Zod schemas for all canonical payment objects.
 * These schemas validate API requests/responses and generate TypeScript types.
 *
 * IMPORTANT:
 * - All amounts are in MINOR UNITS (centavos for MXN, cents for USD, etc.)
 * - Example: $10.00 MXN = 1000 minor units
 * - Currency codes follow ISO 4217 (3-letter codes)
 */

import { z } from 'zod'

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * UUID v4 format
 */
export const UUIDSchema = z.string().uuid()

/**
 * ISO 4217 currency code (3 letters)
 */
export const CurrencySchema = z.string().length(3).toUpperCase().default('MXN')

/**
 * Amount in minor units (must be positive integer)
 * Example: 1000 = $10.00 MXN
 */
export const AmountSchema = z.number().int().positive()

/**
 * Generic metadata object (key-value pairs)
 */
export const MetadataSchema = z.record(z.string(), z.any()).default({})

/**
 * ISO 8601 timestamp string
 */
export const TimestampSchema = z.string().datetime()

// ============================================================================
// CUSTOMER SCHEMA
// ============================================================================

export const CustomerSchema = z.object({
  id: UUIDSchema,
  merchant_id: UUIDSchema,
  email: z.string().email().nullable().optional(),
  name: z.string().max(255).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  metadata: MetadataSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
})

export const CreateCustomerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  metadata: MetadataSchema.optional(),
})

export const UpdateCustomerSchema = CreateCustomerSchema.partial()

// ============================================================================
// PAYMENT METHOD SCHEMA (Canonical)
// ============================================================================

/**
 * Canonical payment method representation
 * Abstracts away provider-specific details
 */
export const PaymentMethodSchema = z.object({
  brand: z.enum(['visa', 'mastercard', 'amex', 'discover', 'unknown']),
  last4: z.string().length(4),
  exp_month: z.number().int().min(1).max(12),
  exp_year: z.number().int().min(2024),
  token_ref: z.string().optional(), // Provider's token reference
  fingerprint: z.string().optional(), // Card fingerprint for fraud detection
})

// ============================================================================
// ACQUIRER ROUTING SCHEMA
// ============================================================================

/**
 * Multi-acquirer routing information
 */
export const AcquirerRoutingSchema = z.object({
  selected: z.string(), // e.g., "stripe", "conekta"
  candidates: z.array(z.string()), // e.g., ["stripe", "conekta", "openpay"]
  routing_strategy: z.enum([
    'cost_optimization',
    'approval_rate',
    'manual',
    'fallback',
  ]),
  routing_metadata: z.record(z.string(), z.any()).optional(),
})

// ============================================================================
// PAYMENT INTENT SCHEMA
// ============================================================================

export const PaymentIntentStatusSchema = z.enum([
  'requires_payment_method',
  'requires_action',
  'processing',
  'succeeded',
  'canceled',
  'failed',
])

export const CaptureMethodSchema = z.enum(['automatic', 'manual'])
export const ConfirmationMethodSchema = z.enum(['automatic', 'manual'])

export const PaymentIntentSchema = z.object({
  id: UUIDSchema,
  merchant_id: UUIDSchema,
  customer_id: UUIDSchema.nullable().optional(),
  amount: AmountSchema,
  currency: CurrencySchema,
  capture_method: CaptureMethodSchema,
  confirmation_method: ConfirmationMethodSchema,
  status: PaymentIntentStatusSchema,
  payment_method: PaymentMethodSchema.nullable().optional(),
  acquirer_routing: AcquirerRoutingSchema.nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  metadata: MetadataSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
})

export const CreatePaymentIntentSchema = z.object({
  amount: AmountSchema,
  currency: CurrencySchema.optional(),
  customer_id: UUIDSchema.optional(),
  capture_method: CaptureMethodSchema.optional().default('automatic'),
  confirmation_method: ConfirmationMethodSchema.optional().default('automatic'),
  payment_method: PaymentMethodSchema.optional(),
  description: z.string().max(500).optional(),
  metadata: MetadataSchema.optional(),
})

export const UpdatePaymentIntentSchema = z.object({
  amount: AmountSchema.optional(),
  customer_id: UUIDSchema.optional(),
  payment_method: PaymentMethodSchema.optional(),
  description: z.string().max(500).optional(),
  metadata: MetadataSchema.optional(),
})

export const ConfirmPaymentIntentSchema = z.object({
  payment_method: PaymentMethodSchema,
})

export const CapturePaymentIntentSchema = z.object({
  amount_to_capture: AmountSchema.optional(), // If not provided, capture full amount
})

// ============================================================================
// CHARGE SCHEMA
// ============================================================================

export const ChargeStatusSchema = z.enum([
  'authorized',
  'captured',
  'partially_refunded',
  'refunded',
  'voided',
  'failed',
])

/**
 * Processor response from acquirer
 */
export const ProcessorResponseSchema = z.object({
  code: z.string(), // e.g., "00" for approved
  message: z.string(), // e.g., "Approved"
  avs_result: z.string().nullable().optional(), // Address verification
  cvc_check: z.enum(['pass', 'fail', 'unavailable', 'unchecked']).nullable().optional(),
  raw_response: z.record(z.string(), z.any()).optional(),
})

export const ChargeSchema = z.object({
  id: UUIDSchema,
  merchant_id: UUIDSchema,
  payment_intent_id: UUIDSchema,
  amount_authorized: AmountSchema,
  amount_captured: z.number().int().nonnegative(),
  amount_refunded: z.number().int().nonnegative(),
  currency: CurrencySchema,
  status: ChargeStatusSchema,
  processor_response: ProcessorResponseSchema.nullable().optional(),
  acquirer_name: z.string().nullable().optional(),
  acquirer_reference: z.string().nullable().optional(),
  authorization_code: z.string().nullable().optional(),
  network: z.string().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  metadata: MetadataSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
})

// ============================================================================
// REFUND SCHEMA
// ============================================================================

export const RefundStatusSchema = z.enum(['pending', 'succeeded', 'failed'])

export const RefundSchema = z.object({
  id: UUIDSchema,
  merchant_id: UUIDSchema,
  charge_id: UUIDSchema,
  amount: AmountSchema,
  currency: CurrencySchema,
  reason: z.string().max(500).nullable().optional(),
  status: RefundStatusSchema,
  acquirer_reference: z.string().nullable().optional(),
  metadata: MetadataSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
})

export const CreateRefundSchema = z.object({
  charge_id: UUIDSchema,
  amount: AmountSchema.optional(), // If not provided, refund full amount
  reason: z.string().max(500).optional(),
  metadata: MetadataSchema.optional(),
})

// ============================================================================
// BALANCE TRANSACTION SCHEMA
// ============================================================================

export const BalanceTransactionTypeSchema = z.enum([
  'charge',
  'refund',
  'fee',
  'adjustment',
  'payout',
])

export const BalanceTransactionSchema = z.object({
  id: UUIDSchema,
  merchant_id: UUIDSchema,
  type: BalanceTransactionTypeSchema,
  source_id: UUIDSchema.nullable().optional(),
  source_type: z.string().nullable().optional(),
  amount: z.number().int(), // Can be negative for debits
  fee: z.number().int().nonnegative(),
  net: z.number().int(), // amount - fee
  currency: CurrencySchema,
  description: z.string().max(500).nullable().optional(),
  metadata: MetadataSchema,
  created_at: TimestampSchema,
})

// ============================================================================
// WEBHOOK DELIVERY SCHEMA
// ============================================================================

export const WebhookDeliverySchema = z.object({
  id: UUIDSchema,
  merchant_id: UUIDSchema,
  event_type: z.string(),
  event_id: UUIDSchema.nullable().optional(),
  endpoint_url: z.string().url(),
  payload: z.record(z.string(), z.any()),
  attempt: z.number().int().positive(),
  max_attempts: z.number().int().positive().default(3),
  status_code: z.number().int().nullable().optional(),
  response_body: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  next_retry_at: TimestampSchema.nullable().optional(),
  delivered: z.boolean(),
  delivered_at: TimestampSchema.nullable().optional(),
  created_at: TimestampSchema,
})

// ============================================================================
// LIST/PAGINATION SCHEMAS
// ============================================================================

export const PaginationParamsSchema = z.object({
  limit: z.number().int().positive().max(100).default(10),
  starting_after: UUIDSchema.optional(), // Cursor for pagination
  ending_before: UUIDSchema.optional(), // Cursor for reverse pagination
})

export const ListResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    object: z.literal('list'),
    data: z.array(itemSchema),
    has_more: z.boolean(),
    url: z.string(),
  })

// ============================================================================
// ERROR SCHEMA
// ============================================================================

export const ErrorSchema = z.object({
  error: z.object({
    type: z.enum([
      'invalid_request_error',
      'api_error',
      'authentication_error',
      'rate_limit_error',
      'validation_error',
    ]),
    message: z.string(),
    code: z.string().optional(),
    param: z.string().optional(),
  }),
})

// ============================================================================
// EXPORTED TYPES
// ============================================================================

// Customer types
export type Customer = z.infer<typeof CustomerSchema>
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>

// Payment Intent types
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>
export type CreatePaymentIntent = z.infer<typeof CreatePaymentIntentSchema>
export type UpdatePaymentIntent = z.infer<typeof UpdatePaymentIntentSchema>
export type ConfirmPaymentIntent = z.infer<typeof ConfirmPaymentIntentSchema>
export type CapturePaymentIntent = z.infer<typeof CapturePaymentIntentSchema>
export type PaymentIntentStatus = z.infer<typeof PaymentIntentStatusSchema>

// Payment Method types
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>
export type AcquirerRouting = z.infer<typeof AcquirerRoutingSchema>

// Charge types
export type Charge = z.infer<typeof ChargeSchema>
export type ChargeStatus = z.infer<typeof ChargeStatusSchema>
export type ProcessorResponse = z.infer<typeof ProcessorResponseSchema>

// Refund types
export type Refund = z.infer<typeof RefundSchema>
export type CreateRefund = z.infer<typeof CreateRefundSchema>
export type RefundStatus = z.infer<typeof RefundStatusSchema>

// Balance Transaction types
export type BalanceTransaction = z.infer<typeof BalanceTransactionSchema>
export type BalanceTransactionType = z.infer<typeof BalanceTransactionTypeSchema>

// Webhook Delivery types
export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>

// Pagination types
export type PaginationParams = z.infer<typeof PaginationParamsSchema>

// Error types
export type ErrorResponse = z.infer<typeof ErrorSchema>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert amount from major units (dollars/pesos) to minor units (cents/centavos)
 * @param amount Amount in major units (e.g., 10.50)
 * @returns Amount in minor units (e.g., 1050)
 */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Convert amount from minor units (cents/centavos) to major units (dollars/pesos)
 * @param amount Amount in minor units (e.g., 1050)
 * @returns Amount in major units (e.g., 10.50)
 */
export function toMajorUnits(amount: number): number {
  return amount / 100
}

/**
 * Format amount for display
 * @param amount Amount in minor units
 * @param currency Currency code (ISO 4217)
 * @param locale Locale for formatting (default: 'es-MX')
 * @returns Formatted string (e.g., "$10.50 MXN")
 */
export function formatAmount(
  amount: number,
  currency: string = 'MXN',
  locale: string = 'es-MX'
): string {
  const majorUnits = toMajorUnits(amount)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(majorUnits)
}
