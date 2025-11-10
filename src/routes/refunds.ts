/**
 * Refunds Routes
 * Handles refund creation and retrieval
 */

import { Hono } from 'hono'
import { CreateRefundSchema } from '../schemas/canonical'

const app = new Hono()

// Create refund
app.post('/', async (c) => {
  try {
    const merchantId = c.get('merchantId')
    const supabase = c.get('supabase')
    const body = await c.req.json()

    const validatedData = CreateRefundSchema.parse(body)

    // Get the charge to refund
    const { data: charge } = await supabase
      .from('charges')
      .select('*')
      .eq('id', validatedData.charge_id)
      .eq('merchant_id', merchantId)
      .single()

    if (!charge) {
      return c.json({ error: { type: 'invalid_request_error', message: 'Charge not found' } }, 404)
    }

    // Determine refund amount (full or partial)
    const refundAmount = validatedData.amount || (charge.amount_captured - charge.amount_refunded)

    // Check if refund amount is valid
    if (refundAmount > (charge.amount_captured - charge.amount_refunded)) {
      return c.json({
        error: {
          type: 'invalid_request_error',
          message: 'Refund amount exceeds available balance',
          code: 'invalid_amount',
        }
      }, 400)
    }

    // Create refund
    const { data: refund, error } = await supabase
      .from('refunds')
      .insert({
        merchant_id: merchantId,
        charge_id: validatedData.charge_id,
        amount: refundAmount,
        currency: charge.currency,
        reason: validatedData.reason,
        status: 'succeeded', // TODO: In real implementation, call acquirer API
        metadata: validatedData.metadata,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Update charge amounts
    const newRefundedAmount = charge.amount_refunded + refundAmount
    const newStatus = newRefundedAmount === charge.amount_captured ? 'refunded' : 'partially_refunded'

    await supabase
      .from('charges')
      .update({
        amount_refunded: newRefundedAmount,
        status: newStatus,
      })
      .eq('id', charge.id)

    return c.json(refund, 201)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: { type: 'validation_error', message: 'Invalid parameters', details: error.errors } }, 400)
    }
    return c.json({ error: { type: 'api_error', message: error.message } }, 500)
  }
})

// Get refund
app.get('/:id', async (c) => {
  try {
    const merchantId = c.get('merchantId')
    const supabase = c.get('supabase')
    const id = c.req.param('id')

    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('id', id)
      .eq('merchant_id', merchantId)
      .single()

    if (error || !data) {
      return c.json({ error: { type: 'invalid_request_error', message: 'Refund not found' } }, 404)
    }

    return c.json(data)
  } catch (error: any) {
    return c.json({ error: { type: 'api_error', message: error.message } }, 500)
  }
})

// List refunds
app.get('/', async (c) => {
  try {
    const merchantId = c.get('merchantId')
    const supabase = c.get('supabase')
    const limit = parseInt(c.req.query('limit') || '10')
    const offset = parseInt(c.req.query('offset') || '0')

    const { data, error, count } = await supabase
      .from('refunds')
      .select('*', { count: 'exact' })
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(error.message)

    return c.json({ object: 'list', data: data || [], has_more: (count || 0) > offset + limit, total_count: count || 0 })
  } catch (error: any) {
    return c.json({ error: { type: 'api_error', message: error.message } }, 500)
  }
})

export { app as refundsRouter }
