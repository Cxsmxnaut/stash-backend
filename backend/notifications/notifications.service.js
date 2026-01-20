const notificationsRepo = require('./notifications.repo');
const { AppError } = require('../middleware/errorHandler');

async function listNotifications(client, userId, filters) {
  return notificationsRepo.listNotifications(client, userId, filters);
}

async function getNotificationById(client, userId, notificationId) {
  const notification = await notificationsRepo.getNotificationById(client, userId, notificationId);
  if (!notification) {
    throw new AppError(404, 'NOT_FOUND', 'Notification not found');
  }
  return notification;
}

async function updateNotification(client, userId, notificationId, updates) {
  const updated = await notificationsRepo.updateNotification(client, userId, notificationId, updates);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Notification not found');
  }
  return updated;
}

async function deleteNotification(client, userId, notificationId) {
  const deleted = await notificationsRepo.deleteNotification(client, userId, notificationId);
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Notification not found');
  }
  return deleted;
}

module.exports = {
  listNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification,
};
