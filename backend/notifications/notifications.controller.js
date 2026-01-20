const express = require('express');
const notificationsService = require('./notifications.service');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parsePagination, assertEnum, assertTimestamp, assertUUID } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

const STATUSES = ['pending', 'sent', 'read', 'dismissed'];

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { limit, offset } = parsePagination(req.query);
    const status = req.query.status;
    const scheduledFrom = req.query.scheduled_from;
    const scheduledTo = req.query.scheduled_to;

    const filters = {
      limit,
      offset,
      status: status ? assertEnum('status', status, STATUSES) : null,
      scheduled_from: assertTimestamp('scheduled_from', scheduledFrom),
      scheduled_to: assertTimestamp('scheduled_to', scheduledTo),
    };

    const { data, count } = await notificationsService.listNotifications(
      req.supabase,
      req.user.id,
      filters
    );

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

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const notificationId = assertUUID('id', req.params.id, { required: true });
    const { status } = req.body || {};

    if (!status) {
      throw new AppError(400, 'VALIDATION_ERROR', 'status is required');
    }

    const updates = {
      status: assertEnum('status', status, STATUSES, { required: true }),
    };

    const notification = await notificationsService.updateNotification(
      req.supabase,
      req.user.id,
      notificationId,
      updates
    );

    return res.json({ data: notification });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const notificationId = assertUUID('id', req.params.id, { required: true });
    const deleted = await notificationsService.deleteNotification(
      req.supabase,
      req.user.id,
      notificationId
    );
    return res.json({ data: deleted });
  })
);

module.exports = { router };
