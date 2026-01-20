const { createClient } = require('@supabase/supabase-js');
const { getUserFromToken } = require('../auth/authService');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    const user = await getUserFromToken(token);

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          details: null,
        },
      });
    }

    req.user = user;
    req.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
      },
    });
    return next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
        details: null,
      },
    });
  }
}

module.exports = { requireAuth };
