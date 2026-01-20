const accountsRepo = require('./accounts.repo');
const { AppError } = require('../middleware/errorHandler');

async function createAccount(client, userId, payload) {
  return accountsRepo.createAccount(client, userId, payload);
}

async function listAccounts(client, userId) {
  return accountsRepo.listAccounts(client, userId);
}

async function getAccountById(client, userId, accountId) {
  const account = await accountsRepo.getAccountById(client, userId, accountId);
  if (!account) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found');
  }
  return account;
}

async function updateAccount(client, userId, accountId, updates) {
  const updated = await accountsRepo.updateAccount(client, userId, accountId, updates);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found');
  }
  return updated;
}

async function deleteAccount(client, userId, accountId) {
  const deleted = await accountsRepo.deleteAccount(client, userId, accountId);
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Account not found');
  }
  return deleted;
}

module.exports = {
  createAccount,
  listAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
};
