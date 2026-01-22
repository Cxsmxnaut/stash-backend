require('dotenv').config();
const express = require('express');

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '1mb' }));

// Mock authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authorization token required' });
  }

  // Mock token validation - accept any token that starts with 'mock-token'
  if (token.startsWith('mock-token')) {
    req.user = { id: '1', email: 'test@example.com', name: 'Test User' };
    next();
  } else {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth endpoints
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  // TODO: Replace with actual authentication logic
  res.json({
    user: { id: '1', email, name: 'Test User' },
    session: { access_token: 'mock-token-' + Date.now() }
  });
});

app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body || {};
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }

  // TODO: Replace with actual signup logic
  res.status(201).json({
    user: { id: '1', email, name },
    session: { access_token: 'mock-token-' + Date.now() }
  });
});

app.get('/auth/me', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// Data endpoints
app.get('/accounts', authenticateToken, (req, res) => {
  res.json({
    data: [
      {
        id: '1',
        user_id: '1',
        bank_name: 'Chase Bank',
        account_name: 'Checking Account',
        account_type: 'checking',
        balance: 5432.10,
        last_synced: new Date().toISOString(),
        plaid_item_id: 'mock-plaid-id'
      }
    ]
  });
});

app.get('/transactions', authenticateToken, (req, res) => {
  const mockTransactions = [
    {
      id: '1',
      account_id: '1',
      date: '2024-01-15',
      merchant: 'Starbucks',
      amount: 5.50,
      currency: 'USD',
      category_primary: 'food',
      pending: false,
      is_transfer: false,
      is_refund: false,
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      account_id: '1',
      date: '2024-01-14',
      merchant: 'Amazon',
      amount: 89.99,
      currency: 'USD',
      category_primary: 'shopping',
      pending: false,
      is_transfer: false,
      is_refund: false,
      created_at: new Date().toISOString()
    }
  ];

  res.json({
    data: mockTransactions,
    meta: { 
      total: mockTransactions.length, 
      limit: 50, 
      offset: 0 
    }
  });
});

app.get('/analytics/overview', authenticateToken, (req, res) => {
  res.json({
    data: {
      total_balance: 5432.10,
      total_spent: 1250.75,
      categories: [
        { name: 'Food', amount: 450.25, percentage: 36, color: '#10B981' },
        { name: 'Transport', amount: 300.50, percentage: 24, color: '#3B82F6' },
        { name: 'Shopping', amount: 500.00, percentage: 40, color: '#8B5CF6' }
      ]
    }
  });
});

app.get('/subscriptions', authenticateToken, (req, res) => {
  res.json({
    data: [
      {
        id: '1',
        user_id: '1',
        merchant: 'Netflix',
        amount: 15.99,
        currency: 'USD',
        cadence: 'monthly',
        cadence_days: 30,
        status: 'active',
        next_payment_date: '2024-02-01',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        user_id: '1',
        merchant: 'Spotify',
        amount: 9.99,
        currency: 'USD',
        cadence: 'monthly',
        cadence_days: 30,
        status: 'active',
        next_payment_date: '2024-02-05',
        created_at: new Date().toISOString()
      }
    ]
  });
});

// Additional endpoints for frontend
app.get('/categories', authenticateToken, (req, res) => {
  res.json({
    data: [
      { id: '1', user_id: '1', name: 'Food', color: '#10B981', is_default: true },
      { id: '2', user_id: '1', name: 'Transport', color: '#3B82F6', is_default: true },
      { id: '3', user_id: '1', name: 'Shopping', color: '#8B5CF6', is_default: true }
    ]
  });
});

app.get('/notifications', authenticateToken, (req, res) => {
  res.json({
    data: []
  });
});

// Additional endpoints needed by frontend
app.get('/analytics/trends', authenticateToken, (req, res) => {
  const { interval = 'daily', days = 7 } = req.query;
  const mockTrends = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    mockTrends.push({
      date: date.toISOString().split('T')[0],
      amount: Math.random() * 100 + 50
    });
  }
  
  res.json({ data: mockTrends });
});

app.get('/subscriptions/upcoming', authenticateToken, (req, res) => {
  const { days = 30 } = req.query;
  const mockUpcoming = [
    {
      id: '1',
      merchant: 'Netflix',
      amount: 15.99,
      currency: 'USD',
      next_payment_date: '2024-02-01',
      days_until_payment: 5
    },
    {
      id: '2',
      merchant: 'Spotify',
      amount: 9.99,
      currency: 'USD',
      next_payment_date: '2024-02-05',
      days_until_payment: 9
    }
  ];
  
  res.json({ data: mockUpcoming });
});

// Plaid endpoints
app.post('/plaid/create_link_token', authenticateToken, (req, res) => {
  res.json({
    data: { link_token: 'mock-link-token-' + Date.now() }
  });
});

app.post('/plaid/exchange_public_token', authenticateToken, (req, res) => {
  res.json({ success: true });
});

// Subscription management endpoints
app.put('/subscriptions/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  res.json({ success: true });
});

app.delete('/subscriptions/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  res.json({ success: true });
});

app.post('/subscriptions/recompute', authenticateToken, (req, res) => {
  res.json({ success: true });
});

// Catch all handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
