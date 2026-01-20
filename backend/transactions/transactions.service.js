const transactionsRepo = require('./transactions.repo');
const accountsRepo = require('../accounts/accounts.repo');
const categoriesRepo = require('../categories/categories.repo');
const { AppError } = require('../middleware/errorHandler');

async function ensureAccount(client, userId, accountId) {
  const account = await accountsRepo.getAccountById(client, userId, accountId);
  if (!account) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found');
  }
  return account;
}

async function ensureCategory(client, userId, categoryId) {
  if (!categoryId) {
    return null;
  }

  const category = await categoriesRepo.getCategoryById(client, userId, categoryId);
  if (!category) {
    throw new AppError(404, 'NOT_FOUND', 'Category not found');
  }
  return category;
}

async function createTransaction(client, userId, payload) {
  await ensureAccount(client, userId, payload.account_id);
  if (payload.category_id) {
    await ensureCategory(client, userId, payload.category_id);
  }

  return transactionsRepo.createTransaction(client, payload);
}

async function getTransactionById(client, userId, transactionId) {
  const transaction = await transactionsRepo.getTransactionById(client, transactionId);
  if (!transaction) {
    throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
  }

  await ensureAccount(client, userId, transaction.account_id);
  return transaction;
}

async function listTransactions(client, userId, filters) {
  if (filters.account_id) {
    await ensureAccount(client, userId, filters.account_id);
  }

  if (filters.category_id) {
    await ensureCategory(client, userId, filters.category_id);
  }

  return transactionsRepo.listTransactions(client, filters);
}

async function updateTransaction(client, userId, transactionId, updates) {
  if (updates.account_id) {
    await ensureAccount(client, userId, updates.account_id);
  }

  if (updates.category_id) {
    await ensureCategory(client, userId, updates.category_id);
  }

  const updated = await transactionsRepo.updateTransaction(client, transactionId, updates);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
  }

  await ensureAccount(client, userId, updated.account_id);
  return updated;
}

async function deleteTransaction(client, userId, transactionId) {
  const transaction = await transactionsRepo.getTransactionById(client, transactionId);
  if (!transaction) {
    throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
  }

  await ensureAccount(client, userId, transaction.account_id);
  const deleted = await transactionsRepo.deleteTransaction(client, transactionId);

  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
  }

  return deleted;
}

module.exports = {
  createTransaction,
  getTransactionById,
  listTransactions,
  updateTransaction,
  deleteTransaction,
};
