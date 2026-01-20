const express = require('express');
const plaidService = require('./plaid.service');
const { asyncHandler } = require('../middleware/asyncHandler');
const { assertString } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.post(
  '/link-token',
  asyncHandler(async (req, res) => {
    const data = await plaidService.createLinkToken(req.user.id);
    return res.status(201).json({ data });
  })
);

router.post(
  '/exchange',
  asyncHandler(async (req, res) => {
    const { public_token } = req.body || {};

    const token = assertString('public_token', public_token, { required: true });
    const result = await plaidService.exchangePublicToken(req.supabase, req.user.id, token);

    return res.status(201).json({ data: result });
  })
);

router.get(
  '/accounts',
  asyncHandler(async (req, res) => {
    const accounts = await plaidService.refreshAccounts(req.supabase, req.user.id);
    return res.json({ data: accounts });
  })
);

router.post(
  '/transactions/sync',
  asyncHandler(async (req, res) => {
    const results = await plaidService.syncTransactionsForUser(req.supabase, req.user.id);
    return res.json({ data: results });
  })
);

module.exports = { router };
