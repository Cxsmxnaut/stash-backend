const { AppError } = require('../middleware/errorHandler');

async function createTransaction(client, payload) {
  const { data, error } = await client
    .from('transactions')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to create transaction');
  }

  return data;
}

async function upsertTransactionByPlaidId(client, payload) {
  const { data, error } = await client
    .from('transactions')
    .upsert(payload, { onConflict: 'plaid_transaction_id' })
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to upsert transaction');
  }

  return data;
}

async function deleteTransactionByPlaidId(client, plaidTransactionId) {
  const { data, error } = await client
    .from('transactions')
    .delete()
    .eq('plaid_transaction_id', plaidTransactionId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to delete transaction');
  }

  return data;
}

async function getTransactionById(client, transactionId) {
  const { data, error } = await client
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch transaction');
  }

  return data;
}

async function listTransactions(client, filters) {
  let query = client
    .from('transactions')
    .select('*', { count: 'exact' });

  if (filters.account_id) {
    query = query.eq('account_id', filters.account_id);
  }

  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters.date_from) {
    query = query.gte('date', filters.date_from);
  }

  if (filters.date_to) {
    query = query.lte('date', filters.date_to);
  }

  if (filters.amount_min != null) {
    query = query.gte('amount', filters.amount_min);
  }

  if (filters.amount_max != null) {
    query = query.lte('amount', filters.amount_max);
  }

  query = query.order(filters.sort_by, { ascending: filters.sort_dir === 'asc' });
  query = query.range(filters.offset, filters.offset + filters.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch transactions');
  }

  return { data, count };
}

async function updateTransaction(client, transactionId, updates) {
  const { data, error } = await client
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to update transaction');
  }

  return data;
}

async function deleteTransaction(client, transactionId) {
  const { data, error } = await client
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to delete transaction');
  }

  return data;
}

module.exports = {
  createTransaction,
  upsertTransactionByPlaidId,
  deleteTransactionByPlaidId,
  getTransactionById,
  listTransactions,
  updateTransaction,
  deleteTransaction,
};
