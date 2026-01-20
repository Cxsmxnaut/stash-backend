const { AppError } = require('../middleware/errorHandler');

async function fetchTransactionsForUser(client, userId, filters) {
  let query = client
    .from('transactions')
    .select('amount, date, merchant, category_id, is_transfer, is_refund, pending')
    .gte('date', filters.date_from)
    .lte('date', filters.date_to);

  query = query.eq('pending', false);
  query = query.eq('is_transfer', false);
  query = query.eq('is_refund', false);

  const { data, error } = await query;

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch transactions for analytics');
  }

  return data || [];
}

async function fetchCategories(client, userId) {
  const { data, error } = await client
    .from('categories')
    .select('id, name')
    .eq('user_id', userId);

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch categories');
  }

  return data || [];
}

module.exports = {
  fetchTransactionsForUser,
  fetchCategories,
};
