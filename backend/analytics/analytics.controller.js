const express = require('express');
const analyticsService = require('./analytics.service');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseNumber } = require('../utils/validation');

const router = express.Router();

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const data = await analyticsService.getOverview(req.supabase, req.user.id);
    return res.json({ data });
  })
);

router.get(
  '/trends',
  asyncHandler(async (req, res) => {
    const interval = req.query.interval;
    const days = req.query.days ? parseNumber('days', req.query.days) : 30;

    const data = await analyticsService.getTrends(req.supabase, req.user.id, {
      interval,
      days,
    });

    return res.json({ data });
  })
);

module.exports = { router };
