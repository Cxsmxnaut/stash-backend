const { plaidClient } = require('../config/plaidClient');
const { supabaseAdmin } = require('../config/supabaseAdmin');
const plaidRepo = require('./plaid.repo');
const plaidReportsRepo = require('./plaidReports.repo');
const accountsRepo = require('../accounts/accounts.repo');
const transactionsRepo = require('../transactions/transactions.repo');
const merchantAliasRepo = require('../merchants/merchantAlias.repo');
const detectionService = require('../subscriptions/subscriptionsDetection');
const { generateUpcomingNotificationsForUser } = require('../jobs/subscriptionJobs');
const { AppError } = require('../middleware/errorHandler');

const DEFAULT_PRODUCTS = ['transactions'];
const DEFAULT_COUNTRY_CODES = ['US'];

function normalizeText(value) {
  if (!value) return null;
  return value.toLowerCase().trim();
}

function computeAccountType(account) {
  if (!account) return null;
  const subtype = account.subtype ? `:${account.subtype}` : '';
  return `${account.type}${subtype}`;
}

function mapTransactionFlags(transaction) {
  const name = normalizeText(transaction.name || transaction.merchant_name || '');
  const category = normalizeText(transaction.personal_finance_category?.primary || '');

  const isTransfer =
    category.includes('transfer') ||
    name.includes('transfer') ||
    name.includes('xfer') ||
    name.includes('internal');

  const isRefund =
    transaction.amount < 0 ||
    name.includes('refund') ||
    name.includes('reversal') ||
    name.includes('chargeback');

  return { isTransfer, isRefund };
}

async function resolveMerchant(client, userId, merchantName) {
  if (!merchantName) return null;
  const alias = await merchantAliasRepo.findAlias(client, userId, merchantName);
  return alias ? alias.merchant : merchantName;
}

async function createLinkToken(userId) {
  const webhook = process.env.PLAID_WEBHOOK_URL;
  const response = await plaidClient.linkTokenCreate({
    user: {
      client_user_id: userId,
    },
    client_name: 'Personal Finance App',
    products: DEFAULT_PRODUCTS,
    country_codes: DEFAULT_COUNTRY_CODES,
    language: 'en',
    webhook: webhook || undefined,
  });

  return response.data;
}

async function exchangePublicToken(userClient, userId, publicToken) {
  if (!supabaseAdmin) {
    throw new AppError(500, 'CONFIG_ERROR', 'SUPABASE_SERVICE_ROLE_KEY is required');
  }

  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const accessToken = exchangeResponse.data.access_token;
  const itemId = exchangeResponse.data.item_id;

  const itemResponse = await plaidClient.itemGet({ access_token: accessToken });
  const institutionId = itemResponse.data.item.institution_id;

  let institutionName = null;
  if (institutionId) {
    try {
      const institutionResponse = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: DEFAULT_COUNTRY_CODES,
      });
      institutionName = institutionResponse.data.institution?.name || null;
    } catch (error) {
      institutionName = null;
    }
  }

  await plaidRepo.upsertPlaidItem(userClient, userId, {
    item_id: itemId,
    institution_name: institutionName,
  });

  await plaidRepo.upsertItemToken(supabaseAdmin, itemId, accessToken);

  const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
  const accounts = accountsResponse.data.accounts || [];

  const upsertedAccounts = [];
  const now = new Date().toISOString();

  for (const account of accounts) {
    const record = await accountsRepo.upsertAccountFromPlaid(userClient, userId, {
      bank_name: institutionName || account.name,
      account_name: account.name,
      account_type: computeAccountType(account),
      balance: account.balances?.current ?? null,
      last_synced: now,
      plaid_item_id: itemId,
      plaid_account_id: account.account_id,
    });
    upsertedAccounts.push(record);
  }

  return { item_id: itemId, institution_name: institutionName, accounts: upsertedAccounts };
}

async function refreshAccounts(userClient, userId) {
  if (!supabaseAdmin) {
    throw new AppError(500, 'CONFIG_ERROR', 'SUPABASE_SERVICE_ROLE_KEY is required');
  }

  const items = await plaidRepo.listPlaidItemsByUser(userClient, userId);
  const results = [];

  for (const item of items) {
    const accessToken = await plaidRepo.getItemToken(supabaseAdmin, item.item_id);
    if (!accessToken) continue;

    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const accounts = accountsResponse.data.accounts || [];

    for (const account of accounts) {
      const record = await accountsRepo.upsertAccountFromPlaid(userClient, userId, {
        bank_name: item.institution_name || account.name,
        account_name: account.name,
        account_type: computeAccountType(account),
        balance: account.balances?.current ?? null,
        last_synced: new Date().toISOString(),
        plaid_item_id: item.item_id,
        plaid_account_id: account.account_id,
      });
      results.push(record);
    }
  }

  return results;
}

async function syncTransactionsForItem({ client, userId, itemId }) {
  if (!supabaseAdmin) {
    throw new AppError(500, 'CONFIG_ERROR', 'SUPABASE_SERVICE_ROLE_KEY is required');
  }

  const item = await plaidRepo.getPlaidItemById(client, userId, itemId);
  if (!item) {
    throw new AppError(404, 'NOT_FOUND', 'Plaid item not found');
  }

  const accessToken = await plaidRepo.getItemToken(supabaseAdmin, itemId);
  if (!accessToken) {
    throw new AppError(404, 'NOT_FOUND', 'Plaid access token not found');
  }

  const report = await plaidReportsRepo.createReport(client, {
    user_id: userId,
    item_id: itemId,
    started_at: new Date().toISOString(),
    cursor: item.cursor || null,
    status: 'running',
  });

  const accounts = await accountsRepo.listAccountsByPlaidItem(client, userId, itemId);
  const accountMap = new Map(accounts.map((acc) => [acc.plaid_account_id, acc.id]));

  let cursor = item.cursor || null;
  let hasMore = true;
  const added = [];
  const modified = [];
  const removed = [];

  try {
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 500,
      });

      added.push(...(response.data.added || []));
      modified.push(...(response.data.modified || []));
      removed.push(...(response.data.removed || []));
      cursor = response.data.next_cursor;
      hasMore = response.data.has_more;
    }

    const upsertPayloads = [];
    const targets = [...added, ...modified];

    for (const tx of targets) {
      const accountId = accountMap.get(tx.account_id);
      if (!accountId) continue;

      const merchantRaw = tx.merchant_name || tx.name || null;
      const merchant = await resolveMerchant(client, userId, merchantRaw);
      const flags = mapTransactionFlags(tx);

      upsertPayloads.push({
        account_id: accountId,
        date: tx.date,
        merchant: merchant || merchantRaw,
        merchant_name: merchantRaw,
        amount: tx.amount,
        currency: tx.iso_currency_code,
        plaid_transaction_id: tx.transaction_id,
        pending: tx.pending || false,
        payment_channel: tx.payment_channel || null,
        category_primary: tx.personal_finance_category?.primary || null,
        category_detailed: tx.personal_finance_category?.detailed || null,
        is_transfer: flags.isTransfer,
        is_refund: flags.isRefund,
        notes: null,
      });
    }

    for (const payload of upsertPayloads) {
      await transactionsRepo.upsertTransactionByPlaidId(client, payload);
    }

    for (const removedTx of removed) {
      await transactionsRepo.deleteTransactionByPlaidId(client, removedTx.transaction_id);
    }

    await plaidRepo.updatePlaidItem(client, userId, itemId, {
      cursor,
      last_synced: new Date().toISOString(),
    });

    const detectionResult = await detectionService.detectSubscriptionsForUser(client, userId, {
      lookbackDays: 365,
      minOccurrences: 3,
    });

    if (supabaseAdmin) {
      await generateUpcomingNotificationsForUser(userId);
    }

    await plaidReportsRepo.updateReport(client, report.id, {
      finished_at: new Date().toISOString(),
      cursor,
      added_count: added.length,
      modified_count: modified.length,
      removed_count: removed.length,
      status: 'success',
    });

    return {
      added: added.length,
      modified: modified.length,
      removed: removed.length,
      detected: detectionResult.detected,
    };
  } catch (error) {
    await plaidReportsRepo.updateReport(client, report.id, {
      finished_at: new Date().toISOString(),
      cursor,
      added_count: added.length,
      modified_count: modified.length,
      removed_count: removed.length,
      error: error.message || 'Sync failed',
      status: 'error',
    });
    throw error;
  }
}

async function syncTransactionsForUser(userClient, userId) {
  const items = await plaidRepo.listPlaidItemsByUser(userClient, userId);
  const results = [];

  for (const item of items) {
    const result = await syncTransactionsForItem({
      client: userClient,
      userId,
      itemId: item.item_id,
    });
    results.push({ item_id: item.item_id, ...result });
  }

  return results;
}

async function handleWebhook(payload) {
  if (!supabaseAdmin) {
    throw new AppError(500, 'CONFIG_ERROR', 'SUPABASE_SERVICE_ROLE_KEY is required');
  }

  const { webhook_type, webhook_code, item_id } = payload || {};

  if (webhook_type === 'TRANSACTIONS' && webhook_code === 'SYNC_UPDATES_AVAILABLE') {
    const item = await plaidRepo.getPlaidItemByItemIdAdmin(supabaseAdmin, item_id);
    if (!item) {
      return { status: 'ignored' };
    }

    const result = await syncTransactionsForItem({
      client: supabaseAdmin,
      userId: item.user_id,
      itemId: item_id,
    });

    return { status: 'synced', result };
  }

  return { status: 'ignored' };
}

module.exports = {
  createLinkToken,
  exchangePublicToken,
  refreshAccounts,
  syncTransactionsForUser,
  syncTransactionsForItem,
  handleWebhook,
};
