const { AppError } = require('../middleware/errorHandler');

async function createCategory(client, userId, payload) {
  const { data, error } = await client
    .from('categories')
    .insert({
      user_id: userId,
      name: payload.name,
      color: payload.color,
      is_default: payload.is_default,
    })
    .select('*')
    .single();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to create category');
  }

  return data;
}

async function listCategories(client, userId) {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch categories');
  }

  return data;
}

async function getCategoryById(client, userId, categoryId) {
  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to fetch category');
  }

  return data;
}

async function updateCategory(client, userId, categoryId, updates) {
  const { data, error } = await client
    .from('categories')
    .update(updates)
    .eq('id', categoryId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to update category');
  }

  return data;
}

async function deleteCategory(client, userId, categoryId) {
  const { data, error } = await client
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'DB_ERROR', 'Failed to delete category');
  }

  return data;
}

module.exports = {
  createCategory,
  listCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
