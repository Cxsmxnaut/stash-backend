const express = require('express');
const transactionsService = require('./transactions.service');
const { asyncHandler } = require('../middleware/asyncHandler');
const {
  assertUUID,
  assertString,
  assertDate,
  parseNumber,
  parsePagination,
} = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

const ALLOWED_SORT_FIELDS = new Set(['date', 'amount', 'created_at']);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      account_id,
      date,
      merchant,
      amount,
      currency,
      category_id,
      notes,
      is_duplicate,
    } = req.body || {};

    const payload = {
      account_id: assertUUID('account_id', account_id, { required: true }),
      date: assertDate('date', date, { required: true }),
      merchant: assertString('merchant', merchant, { maxLength: 200 }),
      amount: parseNumber('amount', amount, { required: true }),
      currency: assertString('currency', currency, { maxLength: 10 }),
      category_id: assertUUID('category_id', category_id),
      notes: assertString('notes', notes, { maxLength: 500 }),
      is_duplicate: typeof is_duplicate === 'boolean' ? is_duplicate : false,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === null) {
        delete payload[key];
      }
    });

    const transaction = await transactionsService.createTransaction(req.supabase, req.user.id, payload);
    return res.status(201).json({ data: transaction });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req.query);

    const accountId = req.query.account_id;
    const categoryId = req.query.category_id;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;
    const amountMin = req.query.amount_min;
    const amountMax = req.query.amount_max;

    const sortBy = req.query.sort_by || 'date';
    const sortDir = (req.query.sort_dir || 'desc').toLowerCase();

    if (!ALLOWED_SORT_FIELDS.has(sortBy)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'sort_by is invalid');
    }

    if (!['asc', 'desc'].includes(sortDir)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'sort_dir is invalid');
    }

    const filters = {
      limit,
      offset,
      account_id: assertUUID('account_id', accountId),
      category_id: assertUUID('category_id', categoryId),
      date_from: assertDate('date_from', dateFrom),
      date_to: assertDate('date_to', dateTo),
      amount_min: parseNumber('amount_min', amountMin),
      amount_max: parseNumber('amount_max', amountMax),
      sort_by: sortBy,
      sort_dir: sortDir,
    };

    const { data, count } = await transactionsService.listTransactions(req.supabase, req.user.id, filters);

    return res.json({
      data,
      meta: {
        limit,
        offset,
        total: count || 0,
      },
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const transactionId = assertUUID('id', req.params.id, { required: true });
    const transaction = await transactionsService.getTransactionById(req.supabase, req.user.id, transactionId);
    return res.json({ data: transaction });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const transactionId = assertUUID('id', req.params.id, { required: true });
    const {
      account_id,
      date,
      merchant,
      amount,
      currency,
      category_id,
      notes,
      is_duplicate,
    } = req.body || {};

    if (
      !account_id &&
      !date &&
      !merchant &&
      amount == null &&
      !currency &&
      !category_id &&
      !notes &&
      is_duplicate == null
    ) {
      throw new AppError(400, 'VALIDATION_ERROR', 'No fields provided for update');
    }

    const updates = {
      account_id: assertUUID('account_id', account_id),
      date: assertDate('date', date),
      merchant: assertString('merchant', merchant, { maxLength: 200 }),
      amount: parseNumber('amount', amount),
      currency: assertString('currency', currency, { maxLength: 10 }),
      category_id: assertUUID('category_id', category_id),
      notes: assertString('notes', notes, { maxLength: 500 }),
      is_duplicate: typeof is_duplicate === 'boolean' ? is_duplicate : null,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === null) {
        delete updates[key];
      }
    });

    const transaction = await transactionsService.updateTransaction(
      req.supabase,
      req.user.id,
      transactionId,
      updates
    );

    return res.json({ data: transaction });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const transactionId = assertUUID('id', req.params.id, { required: true });
    const deleted = await transactionsService.deleteTransaction(req.supabase, req.user.id, transactionId);
    return res.json({ data: deleted });
  })
);

module.exports = { router };
