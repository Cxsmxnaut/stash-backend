require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

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

// Real authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authorization token required' });
  }

  try {
    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Invalid token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    auth: 'real-supabase'
  });
});

// Auth endpoints
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    // Real authentication with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Handle specific authentication errors
      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({ error: 'Invalid email or password. Please check your credentials and try again.' });
      } else if (error.message.includes('Email not confirmed')) {
        return res.status(400).json({ error: 'Please confirm your email address before logging in.' });
      } else {
        return res.status(400).json({ error: error.message });
      }
    }

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email
      },
      session: { 
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body || {};
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }

  try {
    // Real signup with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) {
      // Handle specific signup errors
      if (error.message.includes('User already registered')) {
        return res.status(400).json({ error: 'An account with this email already exists. Please try logging in instead.' });
      } else if (error.message.includes('Password should be at least')) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      } else if (error.message.includes('Invalid email')) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      } else {
        return res.status(400).json({ error: error.message });
      }
    }

    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || name
      },
      session: { 
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/auth/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.user_metadata?.name || req.user.email
    }
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
const enableJobs = process.env.ENABLE_JOBS !== 'false';
startSubscriptionJobs({ enableJobs });
