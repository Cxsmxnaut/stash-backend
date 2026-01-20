const express = require('express');
const subscriptionsService = require('./subscriptions.service');
const { asyncHandler } = require('../middleware/asyncHandler');
const {
  assertString,
  assertUUID,
  parseNumber,
  assertEnum,
  assertDate,
} = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

const CADENCES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];
const STATUSES = ['active', 'paused', 'canceled', 'inactive'];

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      merchant,
      amount,
      currency,
      cadence,
      cadence_days,
      last_transaction_date,
      next_payment_date,
      status,
    } = req.body || {};

    const payload = {
      merchant: assertString('merchant', merchant, { required: true, maxLength: 200 }),
      amount: parseNumber('amount', amount, { required: true }),
      currency: assertString('currency', currency, { maxLength: 10 }),
      cadence: assertEnum('cadence', cadence, CADENCES, { required: true }),
      cadence_days: cadence_days ? parseNumber('cadence_days', cadence_days) : null,
      last_transaction_date: assertDate('last_transaction_date', last_transaction_date),
      next_payment_date: assertDate('next_payment_date', next_payment_date),
      status: assertEnum('status', status, STATUSES) || 'active',
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === null) delete payload[key];
    });

    const subscription = await subscriptionsService.createSubscription(
      req.supabase,
      req.user.id,
      payload
    );

    return res.status(201).json({ data: subscription });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const subscriptions = await subscriptionsService.listSubscriptions(req.supabase, req.user.id);
    return res.json({ data: subscriptions });
  })
);

router.get(
  '/upcoming',
  asyncHandler(async (req, res) => {
    const days = parseNumber('days', req.query.days || 30, { required: true });
    const from = new Date();
    const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);

    const dateFrom = from.toISOString().slice(0, 10);
    const dateTo = to.toISOString().slice(0, 10);

    const upcoming = await subscriptionsService.listUpcomingSubscriptions(
      req.supabase,
      req.user.id,
      dateFrom,
      dateTo
    );

    return res.json({
      data: upcoming,
      meta: {
        from: dateFrom,
        to: dateTo,
      },
    });
  })
);

router.post(
  '/recompute',
  asyncHandler(async (req, res) => {
    const { lookback_days, min_occurrences } = req.body || {};

    const options = {
      lookbackDays: lookback_days ? parseNumber('lookback_days', lookback_days) : undefined,
      minOccurrences: min_occurrences ? parseNumber('min_occurrences', min_occurrences) : undefined,
    };

    const result = await subscriptionsService.recomputeSubscriptions(
      req.supabase,
      req.user.id,
      options
    );

    return res.json({ data: result });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const subscriptionId = assertUUID('id', req.params.id, { required: true });
    const subscription = await subscriptionsService.getSubscriptionById(
      req.supabase,
      req.user.id,
      subscriptionId
    );
    return res.json({ data: subscription });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const subscriptionId = assertUUID('id', req.params.id, { required: true });
    const {
      merchant,
      amount,
      currency,
      cadence,
      cadence_days,
      last_transaction_date,
      next_payment_date,
      status,
    } = req.body || {};

    if (
      !merchant &&
      amount == null &&
      !currency &&
      !cadence &&
      cadence_days == null &&
      !last_transaction_date &&
      !next_payment_date &&
      !status
    ) {
      throw new AppError(400, 'VALIDATION_ERROR', 'No fields provided for update');
    }

    const updates = {
      merchant: assertString('merchant', merchant, { maxLength: 200 }),
      amount: parseNumber('amount', amount),
      currency: assertString('currency', currency, { maxLength: 10 }),
      cadence: cadence ? assertEnum('cadence', cadence, CADENCES) : null,
      cadence_days: cadence_days ? parseNumber('cadence_days', cadence_days) : null,
      last_transaction_date: assertDate('last_transaction_date', last_transaction_date),
      next_payment_date: assertDate('next_payment_date', next_payment_date),
      status: status ? assertEnum('status', status, STATUSES) : null,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === null) delete updates[key];
    });

    const subscription = await subscriptionsService.updateSubscription(
      req.supabase,
      req.user.id,
      subscriptionId,
      updates
    );

    return res.json({ data: subscription });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const subscriptionId = assertUUID('id', req.params.id, { required: true });
    const deleted = await subscriptionsService.deleteSubscription(
      req.supabase,
      req.user.id,
      subscriptionId
    );
    return res.json({ data: deleted });
  })
);

module.exports = { router };
