# Personal Finance Backend (Step 1)

## What you have
- Supabase client configured via environment variables
- Auth helpers for signup, login, and token verification
- Database schema with RLS policies
- Minimal Express server with auth endpoints
- Smoke tests for connectivity and auth

## Setup
1) Install dependencies
```
npm install
```

2) Add environment variables
- Create `/.env` (same level as `backend/`) and add:
```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=your_anon_key
PORT=3000
```

3) Apply schema
- Run `backend/db/schema.sql` in the Supabase SQL editor.

4) Verify Supabase connectivity
```
npm run verify:supabase
```

## Run the server
```
npm start
```

### Auth endpoints
- `POST /auth/signup` `{ email, password, name }`
- `POST /auth/login` `{ email, password }`
- `GET /auth/me` with `Authorization: Bearer <JWT>`

### Core data endpoints (Step 2)
- Accounts: `POST /accounts`, `GET /accounts`, `GET /accounts/:id`, `PATCH /accounts/:id`, `DELETE /accounts/:id`
- Categories: `POST /categories`, `GET /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`
- Transactions: `POST /transactions`, `GET /transactions`, `GET /transactions/:id`, `PATCH /transactions/:id`, `DELETE /transactions/:id`

Transactions filters:
`GET /transactions?limit=50&offset=0&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&account_id=...&category_id=...&amount_min=...&amount_max=...&sort_by=date|amount|created_at&sort_dir=asc|desc`

### Subscriptions + notifications (Step 3)
- Subscriptions: `POST /subscriptions`, `GET /subscriptions`, `GET /subscriptions/:id`, `PATCH /subscriptions/:id`, `DELETE /subscriptions/:id`
- Detect subs: `POST /subscriptions/recompute`
- Upcoming payments: `GET /subscriptions/upcoming?days=30`
- Notifications: `GET /notifications`, `PATCH /notifications/:id`, `DELETE /notifications/:id`

Background jobs:
- Set `SUPABASE_SERVICE_ROLE_KEY` for detection + notification jobs.
- Set `ENABLE_JOBS=false` to disable jobs in dev.

### Plaid integration (Step 4)
Environment:
- `PLAID_ENV` (`sandbox`, `development`, `production`)
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_WEBHOOK_URL` (optional)

Endpoints (auth required):
- `POST /plaid/link-token`
- `POST /plaid/exchange` `{ public_token }`
- `GET /plaid/accounts`
- `POST /plaid/transactions/sync`

Webhook (no auth):
- `POST /plaid/webhook`

Sync reports:
- `GET /plaid/transactions/sync/report?item_id=...`

Analytics (read-only, auth required):
- `GET /analytics/overview`
- `GET /analytics/trends?interval=daily|weekly&days=30`

Webhook verification:
- Set `PLAID_WEBHOOK_SECRET` to validate webhook signatures.

## Optional auth smoke test
```
npm run smoke:auth
```

Notes:
- If email confirmation is enabled in Supabase, sign-up may not return a session. Disable confirmation for dev or use a service role for trusted server flows later.
