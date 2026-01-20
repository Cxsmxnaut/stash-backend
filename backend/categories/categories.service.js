const categoriesRepo = require('./categories.repo');
const { AppError } = require('../middleware/errorHandler');

async function createCategory(client, userId, payload) {
  return categoriesRepo.createCategory(client, userId, payload);
}

async function listCategories(client, userId) {
  return categoriesRepo.listCategories(client, userId);
}

async function getCategoryById(client, userId, categoryId) {
  const category = await categoriesRepo.getCategoryById(client, userId, categoryId);
  if (!category) {
    throw new AppError(404, 'NOT_FOUND', 'Category not found');
  }
  return category;
}

async function updateCategory(client, userId, categoryId, updates) {
  const updated = await categoriesRepo.updateCategory(client, userId, categoryId, updates);
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Category not found');
  }
  return updated;
}

async function deleteCategory(client, userId, categoryId) {
  const deleted = await categoriesRepo.deleteCategory(client, userId, categoryId);
  if (!deleted) {
    throw new AppError(404, 'NOT_FOUND', 'Category not found');
  }
  return deleted;
}

module.exports = {
  createCategory,
  listCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
