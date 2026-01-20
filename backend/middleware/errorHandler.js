class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
      },
    });
  }

  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      details: null,
    },
  });
}

function notFoundHandler(req, res) {
  return res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      details: null,
    },
  });
}

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
};
