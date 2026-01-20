const plaidReportsRepo = require('./plaidReports.repo');
const { AppError } = require('../middleware/errorHandler');

async function listReports(client, userId, itemId) {
  if (!itemId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'item_id is required');
  }

  return plaidReportsRepo.listReports(client, userId, itemId);
}

module.exports = {
  listReports,
};
