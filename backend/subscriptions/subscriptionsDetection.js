const subscriptionsRepo = require('./subscriptions.repo');
const accountsRepo = require('../accounts/accounts.repo');
const { AppError } = require('../middleware/errorHandler');

const DEFAULT_LOOKBACK_DAYS = 365;
const DEFAULT_MIN_OCCURRENCES = 3;
const INACTIVE_MULTIPLIER = 3;
const DECAY_MULTIPLIER = 2;

const CADENCE_WINDOWS = [
  { cadence: 'weekly', min: 5, max: 9, days: 7 },
  { cadence: 'biweekly', min: 12, max: 18, days: 14 },
  { cadence: 'monthly', min: 25, max: 35, days: 30 },
  { cadence: 'quarterly', min: 80, max: 100, days: 90 },
  { cadence: 'yearly', min: 330, max: 400, days: 365 },
];

function normalizeMerchant(merchant) {
  if (!merchant) return null;
  return merchant.toLowerCase().replace(/\s+/g, ' ').trim();
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function stddev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function computeCadence(diffDays) {
  for (const window of CADENCE_WINDOWS) {
    if (diffDays >= window.min && diffDays <= window.max) {
      return window;
    }
  }
  return null;
}

function computeNextPaymentDate(lastDate, cadenceDays) {
  const base = new Date(`${lastDate}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base.getTime() + cadenceDays * 24 * 60 * 60 * 1000);
  return next.toISOString().slice(0, 10);
}

function daysBetween(dateA, dateB) {
  const a = new Date(`${dateA}T00:00:00Z`);
  const b = new Date(`${dateB}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function clusterByAmount(transactions) {
  const clusters = [];
  for (const tx of transactions) {
    const amount = Math.abs(Number(tx.amount));
    const rounded = round2(amount);
    let target = null;

    for (const cluster of clusters) {
      const tolerance = Math.max(1, cluster.amount * 0.02);
      if (Math.abs(cluster.amount - rounded) <= tolerance) {
        target = cluster;
        break;
      }
    }

    if (!target) {
      target = { amount: rounded, transactions: [] };
      clusters.push(target);
    }

    target.transactions.push({
      ...tx,
      _amount_abs: rounded,
    });
  }

  return clusters;
}

async function fetchTransactions(client, userId, lookbackDays) {
  const accounts = await accountsRepo.listAccounts(client, userId);
  if (!accounts.length) return [];

  const accountIds = accounts.map((a) => a.id);
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await client
    .from('transactions')
    .select('id, account_id, date, merchant, amount, currency')
    .in('account_id', accountIds)
    .gte('date', since)
    .order('date', { ascending: true });

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch transactions for detection');
  }

  return data || [];
}

async function detectSubscriptionsForUser(client, userId, options = {}) {
  const lookbackDays = options.lookbackDays || DEFAULT_LOOKBACK_DAYS;
  const minOccurrences = options.minOccurrences || DEFAULT_MIN_OCCURRENCES;

  const transactions = await fetchTransactions(client, userId, lookbackDays);
  if (!transactions.length) {
    return { detected: 0, upserted: 0, candidates: [] };
  }

  const grouped = new Map();

  for (const tx of transactions) {
    const merchantKey = normalizeMerchant(tx.merchant);
    if (!merchantKey) continue;
    const currencyKey = tx.currency || 'unknown';
    const key = `${merchantKey}::${currencyKey}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(tx);
  }

  let detected = 0;
  let upserted = 0;
  const candidates = [];

  for (const [key, group] of grouped.entries()) {
    const clusters = clusterByAmount(group);

    for (const cluster of clusters) {
      if (cluster.transactions.length < minOccurrences) continue;

      const ordered = [...cluster.transactions].sort((a, b) => a.date.localeCompare(b.date));
      const diffs = [];
      for (let i = 1; i < ordered.length; i += 1) {
        const prev = new Date(`${ordered[i - 1].date}T00:00:00Z`);
        const next = new Date(`${ordered[i].date}T00:00:00Z`);
        const diffDays = Math.round((next - prev) / (24 * 60 * 60 * 1000));
        if (diffDays > 0) diffs.push(diffDays);
      }

      const cadenceMedian = median(diffs);
      if (!cadenceMedian) continue;

      const cadenceInfo = computeCadence(cadenceMedian);
      if (!cadenceInfo) continue;

      const last = ordered[ordered.length - 1];
      const amountAvg = round2(
        ordered.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0) / ordered.length
      );

      const variance = stddev(diffs);
      const cadenceScore = Math.max(0, 1 - variance / cadenceInfo.days);
      const occurrenceScore = Math.min(1, ordered.length / 8);
      const confidence = Math.min(1, 0.4 + cadenceScore * 0.4 + occurrenceScore * 0.2);

      const existing = await subscriptionsRepo.getSubscriptionByKey(
        client,
        userId,
        last.merchant || key.split('::')[0],
        amountAvg,
        cadenceInfo.cadence
      );

      const payload = {
        user_id: userId,
        merchant: last.merchant || key.split('::')[0],
        amount: amountAvg,
        currency: last.currency,
        cadence: cadenceInfo.cadence,
        cadence_days: cadenceInfo.days,
        last_transaction_date: last.date,
        next_payment_date: computeNextPaymentDate(last.date, cadenceInfo.days),
        status: 'active',
        confidence,
        first_detected_at: existing?.first_detected_at || new Date().toISOString(),
        last_seen_at: `${last.date}T00:00:00Z`,
      };

      candidates.push(payload);
      detected += 1;
      await subscriptionsRepo.upsertSubscription(client, payload);
      upserted += 1;
    }
  }

  const { data: existing, error: listError } = await client
    .from('subscriptions')
    .select('id, cadence_days, last_seen_at, confidence, status')
    .eq('user_id', userId);

  if (listError) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch subscriptions for decay');
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const sub of existing || []) {
    if (!sub.last_seen_at) continue;
    const lastSeenDate = sub.last_seen_at.slice(0, 10);
    const daysSince = daysBetween(lastSeenDate, today);
    if (daysSince == null) continue;

    const cadenceDays = sub.cadence_days || 30;
    const decayThreshold = cadenceDays * DECAY_MULTIPLIER;
    const inactiveThreshold = cadenceDays * INACTIVE_MULTIPLIER;

    let nextConfidence = sub.confidence;
    let nextStatus = sub.status || 'active';

    if (daysSince > decayThreshold) {
      const decaySteps = Math.floor((daysSince - decayThreshold) / cadenceDays) + 1;
      nextConfidence = Math.max(0, sub.confidence - decaySteps * 0.1);
    }

    if (daysSince > inactiveThreshold) {
      nextStatus = 'inactive';
    }

    if (nextConfidence !== sub.confidence || nextStatus !== sub.status) {
      await client
        .from('subscriptions')
        .update({ confidence: nextConfidence, status: nextStatus })
        .eq('id', sub.id)
        .eq('user_id', userId);
    }
  }

  return { detected, upserted, candidates };
}

module.exports = {
  detectSubscriptionsForUser,
};
