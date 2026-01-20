const { supabaseAdmin } = require('../config/supabaseAdmin');
const detectionService = require('../subscriptions/subscriptionsDetection');
const notificationsRepo = require('../notifications/notifications.repo');

const DEFAULT_LOOKBACK_DAYS = 365;
const DEFAULT_MIN_OCCURRENCES = 3;
const DEFAULT_RECOMPUTE_INTERVAL_MIN = 360;
const DEFAULT_NOTIFICATION_INTERVAL_MIN = 60;
const DEFAULT_UPCOMING_WINDOW_DAYS = 7;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

async function listUsers() {
  const { data, error } = await supabaseAdmin.from('users').select('id');
  if (error) {
    throw new Error('Failed to list users for subscription jobs');
  }
  return data || [];
}

async function generateUpcomingNotificationsForUser(userId, windowDays = DEFAULT_UPCOMING_WINDOW_DAYS) {
  const from = new Date();
  const to = new Date(from.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const { data: subscriptions, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('next_payment_date', isoDate(from))
    .lte('next_payment_date', isoDate(to));

  if (error) {
    throw new Error('Failed to fetch upcoming subscriptions');
  }

  for (const subscription of subscriptions || []) {
    if (!subscription.next_payment_date) continue;

    const exists = await hasExistingNotification(
      subscription.id,
      subscription.next_payment_date
    );
    if (exists) continue;

    const content = `${subscription.merchant} is due on ${subscription.next_payment_date}`;

    await notificationsRepo.createNotification(supabaseAdmin, subscription.user_id, {
      subscription_id: subscription.id,
      type: 'subscription_upcoming',
      content,
      status: 'pending',
      scheduled_at: `${subscription.next_payment_date}T00:00:00Z`,
    });
  }
}

async function recomputeAllSubscriptions() {
  const users = await listUsers();
  for (const user of users) {
    await detectionService.detectSubscriptionsForUser(supabaseAdmin, user.id, {
      lookbackDays: DEFAULT_LOOKBACK_DAYS,
      minOccurrences: DEFAULT_MIN_OCCURRENCES,
    });
  }
}

async function hasExistingNotification(subscriptionId, scheduledAt) {
  const start = new Date(`${scheduledAt}T00:00:00Z`).toISOString();
  const end = new Date(`${scheduledAt}T23:59:59Z`).toISOString();

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('type', 'subscription_upcoming')
    .gte('scheduled_at', start)
    .lte('scheduled_at', end)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to check notifications');
  }

  return !!data;
}

async function generateUpcomingNotifications() {
  const from = new Date();
  const to = new Date(from.getTime() + DEFAULT_UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const { data: subscriptions, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .gte('next_payment_date', isoDate(from))
    .lte('next_payment_date', isoDate(to));

  if (error) {
    throw new Error('Failed to fetch upcoming subscriptions');
  }

  for (const subscription of subscriptions || []) {
    if (!subscription.next_payment_date) continue;

    const exists = await hasExistingNotification(
      subscription.id,
      subscription.next_payment_date
    );
    if (exists) continue;

    const content = `${subscription.merchant} is due on ${subscription.next_payment_date}`;

    await notificationsRepo.createNotification(supabaseAdmin, subscription.user_id, {
      subscription_id: subscription.id,
      type: 'subscription_upcoming',
      content,
      status: 'pending',
      scheduled_at: `${subscription.next_payment_date}T00:00:00Z`,
    });
  }
}

function startSubscriptionJobs({ enableJobs = true } = {}) {
  if (!enableJobs) return;

  if (!supabaseAdmin) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set. Subscription jobs are disabled.');
    return;
  }

  const recomputeIntervalMs = DEFAULT_RECOMPUTE_INTERVAL_MIN * 60 * 1000;
  const notificationIntervalMs = DEFAULT_NOTIFICATION_INTERVAL_MIN * 60 * 1000;

  recomputeAllSubscriptions().catch((err) => {
    console.error('Initial subscription recompute failed:', err.message || err);
  });

  generateUpcomingNotifications().catch((err) => {
    console.error('Initial notification generation failed:', err.message || err);
  });

  setInterval(() => {
    recomputeAllSubscriptions().catch((err) => {
      console.error('Subscription recompute failed:', err.message || err);
    });
  }, recomputeIntervalMs);

  setInterval(() => {
    generateUpcomingNotifications().catch((err) => {
      console.error('Notification generation failed:', err.message || err);
    });
  }, notificationIntervalMs);
}

module.exports = {
  startSubscriptionJobs,
  generateUpcomingNotificationsForUser,
};
