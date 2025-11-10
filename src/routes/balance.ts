/**
 * Balance Routes
 * Handles balance transactions retrieval
 */

import { Hono } from 'hono'

const app = new Hono()

// Get balance transaction
app.get('/transactions/:id', async (c) => {
  try {
    const merchantId = c.get('merchantId')
    const supabase = c.get('supabase')
    const id = c.req.param('id')

    const { data, error } = await supabase
      .from('balance_transactions')
      .select('*')
      .eq('id', id)
      .eq('merchant_id', merchantId)
      .single()

    if (error || !data) {
      return c.json({ error: { type: 'invalid_request_error', message: 'Balance transaction not found' } }, 404)
    }

    return c.json(data)
  } catch (error: any) {
    return c.json({ error: { type: 'api_error', message: error.message } }, 500)
  }
})

// List balance transactions
app.get('/transactions', async (c) => {
  try {
    const merchantId = c.get('merchantId')
    const supabase = c.get('supabase')
    const limit = parseInt(c.req.query('limit') || '10')
    const offset = parseInt(c.req.query('offset') || '0')
    const type = c.req.query('type') // Optional filter by type

    let query = supabase
      .from('balance_transactions')
      .select('*', { count: 'exact' })
      .eq('merchant_id', merchantId)

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw new Error(error.message)

    return c.json({
      object: 'list',
      data: data || [],
      has_more: (count || 0) > offset + limit,
      total_count: count || 0,
    })
  } catch (error: any) {
    return c.json({ error: { type: 'api_error', message: error.message } }, 500)
  }
})

// Get current balance summary
app.get('/summary', async (c) => {
  try {
    const merchantId = c.get('merchantId')
    const supabase = c.get('supabase')

    // Get balance by currency
    const { data, error } = await supabase
      .from('balance_transactions')
      .select('currency, net')
      .eq('merchant_id', merchantId)

    if (error) throw new Error(error.message)

    // Aggregate by currency
    const balances: Record<string, number> = {}
    data?.forEach((tx: any) => {
      if (!balances[tx.currency]) {
        balances[tx.currency] = 0
      }
      balances[tx.currency] += tx.net
    })

    // Convert to array format
    const available = Object.entries(balances).map(([currency, amount]) => ({
      currency,
      amount,
    }))

    return c.json({
      object: 'balance',
      available,
      pending: [], // TODO: Implement pending balance logic
    })
  } catch (error: any) {
    return c.json({ error: { type: 'api_error', message: error.message } }, 500)
  }
})

export { app as balanceRouter }
