const subscriptionsRepo = require('./subscriptions.repo');
const detectionService = require('./subscriptionsDetection');
const { AppError } = require('../middleware/errorHandler');

const CADENCE_DAYS = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

function computeNextPaymentDate(lastDate, cadenceDays) {
  if (!lastDate || !cadenceDays) return null;
  const base = new Date(`${lastDate}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base.getTime() + cadenceDays * 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
}

async function createSubscription(client, userId, payload) {
  const cadenceDays = payload.cadence_days || CADENCE_DAYS[payload.cadence];
  if (!cadenceDays) {
    throw new AppError(400, 'VALIDATION_ERROR', 'cadence_days is required');
  }

  const nextPayment =
    payload.next_payment_date || computeNextPaymentDate(payload.last_transaction_date, cadenceDays);

  return subscriptionsRepo.createSubscription(client, userId, {
    ...payload,
    cadence_days: cadenceDays,
    next_payment_date: nextPayment,
    status: payload.status || 'active',
  });
}

async function listSubscriptions(client, userId) {
  return subscriptionsRepo.listSubscriptions(client, userId);
}

async function listUpcomingSubscriptions(client, userId, dateFrom, dateTo) {
  return subscriptionsRepo.listUpcomingSubscriptions(client, userId, dateFrom, dateTo);
}

async function getSubscriptionById(client, userId, subscriptionId) {
  const subscription = await subscriptionsRepo.getSubscriptionById(client, userId, subscriptionId);
  if (!subscription) {
    throw new AppError(404, 'NOT_FOUND', 'Subscription not found');
  }
  return subscription;
}

async function updateSubscription(client, userId, subscriptionId, updates) {
  let cadenceDays = updates.cadence_days;
  if (!cadenceDays && updates.cadence) {
    cadenceDays = CADENCE_DAYS[updates.cadence];
  }

  const lastDate = updates.last_transaction_date;
  const nextPayment = updates.next_payment_date || computeNextPaymentDate(lastDate, cadenceDays);

  const payload = {
    ...updates,
  };

  if (cadenceDays) payload.cadence_days = cadenceDays;
  if (nextPayment) payload.next_payment_date = nextPayment;

  const updated = await subscriptionsRepo.updateSubscription(client, userId, subscriptionId, payload);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Subscription not found');
  }
  return updated;
}

async function deleteSubscription(client, userId, subscriptionId) {
  const deleted = await subscriptionsRepo.deleteSubscription(client, userId, subscriptionId);
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Subscription not found');
  }
  return deleted;
}

async function recomputeSubscriptions(client, userId, options) {
  return detectionService.detectSubscriptionsForUser(client, userId, options);
}

module.exports = {
  createSubscription,
  listSubscriptions,
  listUpcomingSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  recomputeSubscriptions,
  computeNextPaymentDate,
};
