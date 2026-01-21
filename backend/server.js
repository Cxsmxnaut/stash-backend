require('dotenv').config();
const express = require('express');
const { signUp, signIn } = require('./auth/authService');
const { requireAuth } = require('./middleware/requireAuth');
const { router: accountsRouter } = require('./accounts/accounts.controller');
const { router: transactionsRouter } = require('./transactions/transactions.controller');
const { router: categoriesRouter } = require('./categories/categories.controller');
const { router: subscriptionsRouter } = require('./subscriptions/subscriptions.controller');
const { router: notificationsRouter } = require('./notifications/notifications.controller');
const { router: plaidRouter } = require('./plaid/plaid.controller');
const { router: plaidWebhookRouter } = require('./plaid/plaid.webhook');
const { router: plaidReportsRouter } = require('./plaid/plaidReports.controller');
const { router: analyticsRouter } = require('./analytics/analytics.controller');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { startSubscriptionJobs } = require('./jobs/subscriptionJobs');

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

app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      if (req.originalUrl === '/plaid/webhook') {
        req.rawBody = buf;
      }
    },
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/auth/signup', async (req, res) => {
  const { email, password, name } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }

  try {
    const { user, session } = await signUp(email, password, name);
    return res.status(201).json({ user, session });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Sign up failed' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const { user, session } = await signIn(email, password);
    return res.status(200).json({ user, session });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Login failed' });
  }
});

app.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.use('/accounts', requireAuth, accountsRouter);
app.use('/transactions', requireAuth, transactionsRouter);
app.use('/categories', requireAuth, categoriesRouter);
app.use('/subscriptions', requireAuth, subscriptionsRouter);
app.use('/notifications', requireAuth, notificationsRouter);
app.use('/plaid/webhook', plaidWebhookRouter);
app.use('/plaid/transactions/sync/report', requireAuth, plaidReportsRouter);
app.use('/plaid', requireAuth, plaidRouter);
app.use('/analytics', requireAuth, analyticsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

const enableJobs = process.env.ENABLE_JOBS !== 'false';
startSubscriptionJobs({ enableJobs });
