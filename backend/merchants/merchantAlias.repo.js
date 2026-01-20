const { AppError } = require('../middleware/errorHandler');

async function findAlias(client, userId, alias) {
  if (!alias) return null;
  const normalized = alias.toLowerCase().trim();

  const { data, error } = await client
    .from('merchant_aliases')
    .select('*')
    .eq('user_id', userId)
    .ilike('alias', normalized)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch merchant alias');
  }

  return data;
}

module.exports = {
  findAlias,
};
