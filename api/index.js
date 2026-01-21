// Minimal serverless function for testing
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Simple routing
  if (req.url === '/health' || req.url === '/health/') {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Serverless function is working!'
    });
  }

  if (req.url === '/auth/login' && req.method === 'POST') {
    return res.status(200).json({
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      session: { access_token: 'mock-token' }
    });
  }

  if (req.url === '/accounts' && req.method === 'GET') {
    return res.status(200).json({
      data: [
        {
          id: '1',
          bank_name: 'Chase Bank',
          account_name: 'Checking Account',
          balance: 5432.10
        }
      ]
    });
  }

  // Default response
  res.status(404).json({ error: 'Not found' });
};