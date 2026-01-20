const { AppError } = require('../middleware/errorHandler');

async function createSubscription(client, userId, payload) {
  const { data, error } = await client
    .from('subscriptions')
    .insert({
      user_id: userId,
      merchant: payload.merchant,
      amount: payload.amount,
      currency: payload.currency,
      cadence: payload.cadence,
      cadence_days: payload.cadence_days,
      last_transaction_date: payload.last_transaction_date,
      next_payment_date: payload.next_payment_date,
      status: payload.status,
    })
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to create subscription');
  }

  return data;
}

async function upsertSubscription(client, payload) {
  const { data, error } = await client
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id,merchant,amount,cadence' })
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to upsert subscription');
  }

  return data;
}

async function getSubscriptionByKey(client, userId, merchant, amount, cadence) {
  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('merchant', merchant)
    .eq('amount', amount)
    .eq('cadence', cadence)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch subscription');
  }

  return data;
}

async function listSubscriptions(client, userId) {
  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('next_payment_date', { ascending: true });

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch subscriptions');
  }

  return data;
}

async function listUpcomingSubscriptions(client, userId, dateFrom, dateTo) {
  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('next_payment_date', dateFrom)
    .lte('next_payment_date', dateTo)
    .order('next_payment_date', { ascending: true });

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch upcoming subscriptions');
  }

  return data;
}

async function getSubscriptionById(client, userId, subscriptionId) {
  const { data, error } = await client
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch subscription');
  }

  return data;
}

async function updateSubscription(client, userId, subscriptionId, updates) {
  const { data, error } = await client
    .from('subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to update subscription');
  }

  return data;
}

async function deleteSubscription(client, userId, subscriptionId) {
  const { data, error } = await client
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to delete subscription');
  }

  return data;
}

module.exports = {
  createSubscription,
  upsertSubscription,
  getSubscriptionByKey,
  listSubscriptions,
  listUpcomingSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
};
