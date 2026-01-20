const { supabase } = require('./config/supabaseClient');
const { signUp, signIn, getUserFromToken } = require('./auth/authService');
const { requireAuth } = require('./middleware/requireAuth');

module.exports = {
  supabase,
  auth: {
    signUp,
    signIn,
    getUserFromToken,
  },
  middleware: {
    requireAuth,
  },
};
