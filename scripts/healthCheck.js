const { supabase } = require('../backend/index.js');

async function healthCheck() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      supabase: 'unknown',
      plaid: 'unknown'
    }
  };

  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .single();
    
    if (error) {
      health.services.supabase = 'error';
      health.status = 'error';
    } else {
      health.services.supabase = 'connected';
      health.services.database = 'connected';
    }
  } catch (error) {
    health.services.supabase = 'error';
    health.services.database = 'error';
    health.status = 'error';
  }

  // Test Plaid configuration
  const plaidConfigured = !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
  health.services.plaid = plaidConfigured ? 'configured' : 'not_configured';

  // Test background jobs
  const jobsEnabled = process.env.ENABLE_JOBS === 'true';
  health.services.jobs = jobsEnabled ? 'enabled' : 'disabled';

  return health;
}

module.exports = { healthCheck };
