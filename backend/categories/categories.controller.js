const express = require('express');
const categoriesService = require('./categories.service');
const { asyncHandler } = require('../middleware/asyncHandler');
const { assertString, parseBoolean, assertUUID } = require('../utils/validation');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, color, is_default } = req.body || {};

    const payload = {
      name: assertString('name', name, { required: true, maxLength: 80 }),
      color: assertString('color', color, { maxLength: 32 }),
      is_default: parseBoolean('is_default', is_default) ?? false,
    };

    const category = await categoriesService.createCategory(req.supabase, req.user.id, payload);
    return res.status(201).json({ data: category });
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const categories = await categoriesService.listCategories(req.supabase, req.user.id);
    return res.json({ data: categories });
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const categoryId = assertUUID('id', req.params.id, { required: true });
    const { name, color, is_default } = req.body || {};

    if (!name && !color && is_default == null) {
      throw new AppError(400, 'VALIDATION_ERROR', 'No fields provided for update');
    }

    const updates = {
      name: assertString('name', name, { maxLength: 80 }),
      color: assertString('color', color, { maxLength: 32 }),
      is_default: parseBoolean('is_default', is_default),
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === null) {
        delete updates[key];
      }
    });

    const category = await categoriesService.updateCategory(req.supabase, req.user.id, categoryId, updates);
    return res.json({ data: category });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const categoryId = assertUUID('id', req.params.id, { required: true });
    const deleted = await categoriesService.deleteCategory(req.supabase, req.user.id, categoryId);
    return res.json({ data: deleted });
  })
);

module.exports = { router };
