const express = require('express');
const accountsService = require('./accounts.service');
const { asyncHandler } = require('../middleware/asyncHandler');
const {
  assertString,
  parseNumber,
  assertTimestamp,
  assertUUID,
} = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { bank_name, account_type, balance, last_synced } = req.body || {};

    const payload = {
      bank_name: assertString('bank_name', bank_name, { required: true, maxLength: 200 }),
      account_type: assertString('account_type', account_type, { required: true, maxLength: 100 }),
      balance: parseNumber('balance', balance),
      last_synced: assertTimestamp('last_synced', last_synced),
    };

    const account = await accountsService.createAccount(req.supabase, req.user.id, payload);
    return res.status(201).json({ data: account });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const accounts = await accountsService.listAccounts(req.supabase, req.user.id);
    return res.json({ data: accounts });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const accountId = assertUUID('id', req.params.id, { required: true });
    const account = await accountsService.getAccountById(req.supabase, req.user.id, accountId);
    return res.json({ data: account });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const accountId = assertUUID('id', req.params.id, { required: true });
    const { bank_name, account_type, balance, last_synced } = req.body || {};

    if (!bank_name && !account_type && balance == null && !last_synced) {
      throw new AppError(400, 'VALIDATION_ERROR', 'No fields provided for update');
    }

    const updates = {
      bank_name: assertString('bank_name', bank_name, { maxLength: 200 }),
      account_type: assertString('account_type', account_type, { maxLength: 100 }),
      balance: parseNumber('balance', balance),
      last_synced: assertTimestamp('last_synced', last_synced),
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === null) {
        delete updates[key];
      }
    });

    const account = await accountsService.updateAccount(req.supabase, req.user.id, accountId, updates);
    return res.json({ data: account });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const accountId = assertUUID('id', req.params.id, { required: true });
    const deleted = await accountsService.deleteAccount(req.supabase, req.user.id, accountId);
    return res.json({ data: deleted });
  })
);

module.exports = { router };
