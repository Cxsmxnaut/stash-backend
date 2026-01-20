const { AppError } = require('../middleware/errorHandler');

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUUID(name, value, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) {
      throw new AppError(400, 'VALIDATION_ERROR', `${name} is required`);
    }
    return null;
  }

  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${name} must be a valid UUID`);
  }

  return value;
}

function assertString(name, value, { required = false, maxLength } = {}) {
  if (value == null || value === '') {
    if (required) {
      throw new AppError(400, 'VALIDATION_ERROR', `${name} is required`);
    }
    return null;
  }

  if (typeof value !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', `${name} must be a string`);
  }

  if (maxLength && value.length > maxLength) {
    throw new AppError(400, 'VALIDATION_ERROR', `${name} is too long`);
  }

  return value;
}

function assertDate(name, value, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) {
      throw new AppError(400, 'VALIDATION_ERROR', `${name} is required`);
    }
    return null;
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${name} must be YYYY-MM-DD`);
  }

  return value;
}

function assertTimestamp(name, value, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) {
      throw new AppError(400, 'VALIDATION_ERROR', `${name} is required`);
    }
    return null;
  }

  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new AppError(400, 'VALIDATION_ERROR', `${name} must be an ISO timestamp`);
  }

  return value;
}

function parseNumber(name, value, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) {
      throw new AppError(400, 'VALIDATION_ERROR', `${name} is required`);
    }
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${name} must be a number`);
  }

  return parsed;
}

function parseBoolean(name, value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new AppError(400, 'VALIDATION_ERROR', `${name} must be a boolean`);
}

function parsePagination(query) {
  const limitRaw = query.limit;
  const offsetRaw = query.offset;

  let limit = parseNumber('limit', limitRaw || 50, { required: true });
  let offset = parseNumber('offset', offsetRaw || 0, { required: true });

  limit = Math.min(Math.max(1, limit), 200);
  offset = Math.max(0, offset);

  return { limit, offset };
}

function assertEnum(name, value, allowed, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) {
      throw new AppError(400, 'VALIDATION_ERROR', `${name} is required`);
    }
    return null;
  }

  if (!allowed.includes(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${name} must be one of: ${allowed.join(', ')}`);
  }

  return value;
}

module.exports = {
  assertUUID,
  assertString,
  assertDate,
  assertTimestamp,
  assertEnum,
  parseNumber,
  parseBoolean,
  parsePagination,
};
