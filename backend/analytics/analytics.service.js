const analyticsRepo = require('./analytics.repo');
const { AppError } = require('../middleware/errorHandler');

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function getMonthRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start, end };
}

function getDateRange(days) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start, end };
}

function bucketKey(dateStr, interval) {
  if (interval === 'weekly') {
    const date = new Date(`${dateStr}T00:00:00Z`);
    const day = date.getUTCDay();
    const diff = (day + 6) % 7;
    const monday = new Date(date.getTime() - diff * 24 * 60 * 60 * 1000);
    return monday.toISOString().slice(0, 10);
  }
  return dateStr;
}

async function getOverview(client, userId) {
  const { start, end } = getMonthRange();
  const transactions = await analyticsRepo.fetchTransactionsForUser(client, userId, {
    date_from: toDateString(start),
    date_to: toDateString(end),
  });

  const categories = await analyticsRepo.fetchCategories(client, userId);
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  let totalSpend = 0;
  const byCategory = new Map();
  const byMerchant = new Map();

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount)) continue;
    if (amount <= 0) continue;

    totalSpend += amount;

    const categoryName = categoryMap.get(tx.category_id) || 'Uncategorized';
    byCategory.set(categoryName, (byCategory.get(categoryName) || 0) + amount);

    const merchant = tx.merchant || 'Unknown';
    byMerchant.set(merchant, (byMerchant.get(merchant) || 0) + amount);
  }

  const spendByCategory = Array.from(byCategory.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const topMerchants = Array.from(byMerchant.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    total_spend: Number(totalSpend.toFixed(2)),
    spend_by_category: spendByCategory,
    top_merchants: topMerchants,
    period: {
      from: toDateString(start),
      to: toDateString(end),
    },
  };
}

async function getTrends(client, userId, options) {
  const interval = options.interval || 'daily';
  if (!['daily', 'weekly'].includes(interval)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'interval must be daily or weekly');
  }

  const days = options.days || 30;
  const { start, end } = getDateRange(days);

  const transactions = await analyticsRepo.fetchTransactionsForUser(client, userId, {
    date_from: toDateString(start),
    date_to: toDateString(end),
  });

  const buckets = new Map();

  for (const tx of transactions) {
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const key = bucketKey(tx.date, interval);
    buckets.set(key, (buckets.get(key) || 0) + amount);
  }

  const series = Array.from(buckets.entries())
    .map(([date, total]) => ({ date, total: Number(total.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    interval,
    series,
    period: {
      from: toDateString(start),
      to: toDateString(end),
    },
  };
}

module.exports = {
  getOverview,
  getTrends,
};
