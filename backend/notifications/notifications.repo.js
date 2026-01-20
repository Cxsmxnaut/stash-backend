const { AppError } = require('../middleware/errorHandler');

async function createNotification(client, userId, payload) {
  const { data, error } = await client
    .from('notifications')
    .insert({
      user_id: userId,
      subscription_id: payload.subscription_id,
      type: payload.type,
      content: payload.content,
      status: payload.status,
      scheduled_at: payload.scheduled_at,
    })
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to create notification');
  }

  return data;
}

async function listNotifications(client, userId, filters) {
  let query = client
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.scheduled_from) {
    query = query.gte('scheduled_at', filters.scheduled_from);
  }

  if (filters.scheduled_to) {
    query = query.lte('scheduled_at', filters.scheduled_to);
  }

  query = query.order('scheduled_at', { ascending: true });
  query = query.range(filters.offset, filters.offset + filters.limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch notifications');
  }

  return { data, count };
}

async function getNotificationById(client, userId, notificationId) {
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch notification');
  }

  return data;
}

async function updateNotification(client, userId, notificationId, updates) {
  const { data, error } = await client
    .from('notifications')
    .update(updates)
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to update notification');
  }

  return data;
}

async function deleteNotification(client, userId, notificationId) {
  const { data, error } = await client
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to delete notification');
  }

  return data;
}

module.exports = {
  createNotification,
  listNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification,
};
