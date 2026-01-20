const express = require('express');
const plaidReportsService = require('./plaidReports.service');
const { asyncHandler } = require('../middleware/asyncHandler');
const { assertString } = require('../utils/validation');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const itemId = assertString('item_id', req.query.item_id, { required: true });
    const reports = await plaidReportsService.listReports(req.supabase, req.user.id, itemId);
    return res.json({ data: reports });
  })
);

module.exports = { router };
