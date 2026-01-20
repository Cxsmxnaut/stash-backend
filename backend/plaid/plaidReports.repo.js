const { AppError } = require('../middleware/errorHandler');

async function createReport(client, payload) {
  const { data, error } = await client
    .from('plaid_sync_reports')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to create sync report');
  }

  return data;
}

async function updateReport(client, reportId, updates) {
  const { data, error } = await client
    .from('plaid_sync_reports')
    .update(updates)
    .eq('id', reportId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to update sync report');
  }

  return data;
}

async function listReports(client, userId, itemId) {
  const { data, error } = await client
    .from('plaid_sync_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .order('started_at', { ascending: false });

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch sync reports');
  }

  return data;
}

module.exports = {
  createReport,
  updateReport,
  listReports,
};
