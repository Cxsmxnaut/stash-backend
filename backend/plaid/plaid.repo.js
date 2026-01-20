const { AppError } = require('../middleware/errorHandler');

async function upsertPlaidItem(client, userId, payload) {
  const { data, error } = await client
    .from('plaid_items')
    .upsert(
      {
        user_id: userId,
        item_id: payload.item_id,
        institution_name: payload.institution_name,
        status: payload.status || 'active',
        cursor: payload.cursor || null,
        last_synced: payload.last_synced || null,
      },
      { onConflict: 'item_id' }
    )
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to upsert Plaid item');
  }

  return data;
}

async function updatePlaidItem(client, userId, itemId, updates) {
  const { data, error } = await client
    .from('plaid_items')
    .update(updates)
    .eq('item_id', itemId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to update Plaid item');
  }

  return data;
}

async function getPlaidItemById(client, userId, itemId) {
  const { data, error } = await client
    .from('plaid_items')
    .select('*')
    .eq('item_id', itemId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch Plaid item');
  }

  return data;
}

async function getPlaidItemByItemIdAdmin(adminClient, itemId) {
  const { data, error } = await adminClient
    .from('plaid_items')
    .select('*')
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch Plaid item');
  }

  return data;
}

async function listPlaidItemsByUser(client, userId) {
  const { data, error } = await client
    .from('plaid_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch Plaid items');
  }

  return data;
}

async function upsertItemToken(adminClient, itemId, accessToken) {
  const { data, error } = await adminClient
    .from('plaid_item_tokens')
    .upsert(
      {
        item_id: itemId,
        access_token: accessToken,
      },
      { onConflict: 'item_id' }
    )
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to store Plaid access token');
  }

  return data;
}

async function getItemToken(adminClient, itemId) {
  const { data, error } = await adminClient
    .from('plaid_item_tokens')
    .select('access_token')
    .eq('item_id', itemId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch Plaid access token');
  }

  return data ? data.access_token : null;
}

module.exports = {
  upsertPlaidItem,
  updatePlaidItem,
  getPlaidItemById,
  getPlaidItemByItemIdAdmin,
  listPlaidItemsByUser,
  upsertItemToken,
  getItemToken,
};
