const { AppError } = require('../middleware/errorHandler');

async function createAccount(client, userId, payload) {
  const { data, error } = await client
    .from('accounts')
    .insert({
      user_id: userId,
      bank_name: payload.bank_name,
      account_type: payload.account_type,
      balance: payload.balance,
      last_synced: payload.last_synced,
    })
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to create account');
  }

  return data;
}

async function listAccounts(client, userId) {
  const { data, error } = await client
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('bank_name', { ascending: true });

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch accounts');
  }

  return data;
}

async function listAccountsByPlaidItem(client, userId, plaidItemId) {
  const { data, error } = await client
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('plaid_item_id', plaidItemId);

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch accounts');
  }

  return data;
}

async function upsertAccountFromPlaid(client, userId, payload) {
  const { data, error } = await client
    .from('accounts')
    .upsert(
      {
        user_id: userId,
        bank_name: payload.bank_name,
        account_name: payload.account_name,
        account_type: payload.account_type,
        balance: payload.balance,
        last_synced: payload.last_synced,
        plaid_item_id: payload.plaid_item_id,
        plaid_account_id: payload.plaid_account_id,
      },
      { onConflict: 'plaid_account_id' }
    )
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to upsert account');
  }

  return data;
}

async function getAccountById(client, userId, accountId) {
  const { data, error } = await client
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch account');
  }

  return data;
}

async function updateAccount(client, userId, accountId, updates) {
  const { data, error } = await client
    .from('accounts')
    .update(updates)
    .eq('id', accountId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to update account');
  }

  return data;
}

async function deleteAccount(client, userId, accountId) {
  const { data, error } = await client
    .from('accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to delete account');
  }

  return data;
}

module.exports = {
  createAccount,
  listAccounts,
  listAccountsByPlaidItem,
  upsertAccountFromPlaid,
  getAccountById,
  updateAccount,
  deleteAccount,
};
