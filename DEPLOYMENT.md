# Backend Deployment Guide

## Environment Variables Setup

### Required Environment Variables
Create a `.env` file in the backend root directory:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Plaid Configuration
PLAID_ENV=sandbox
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_WEBHOOK_URL=https://your-backend-domain.com/plaid/webhook

# Server Configuration
PORT=3000
NODE_ENV=production

# Optional: Test Account (for development)
TEST_EMAIL=test@example.com
TEST_PASSWORD=password123
TEST_NAME=Test User
```

### Getting Required Credentials

#### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get:
   - Project URL
   - anon key
   - service_role key
3. Run the database schema:
   ```bash
   npm run verify:supabase
   ```

#### 2. Plaid Setup
1. Create an account at [plaid.com](https://dashboard.plaid.com)
2. Create a new sandbox integration
3. Get your client ID and secret
4. Configure webhook URL: `https://your-backend-domain.com/plaid/webhook`

## Production Deployment Options

### Option 1: Render (Recommended)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables in Render dashboard
4. Deploy automatically on push to main branch

### Option 2: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Set environment variables in Vercel dashboard

### Option 3: DigitalOcean
1. Create a droplet (Ubuntu 22.04)
2. Install Node.js and PM2
3. Clone repository and install dependencies
4. Use PM2 to run the service

## Pre-Deployment Checklist

### Database Verification
```bash
# Test database connection
npm run verify:supabase

# Test authentication flow
npm run smoke:auth
```

### Health Check Endpoints
- `GET /health` - Server status
- `GET /auth/me` - Authentication test
- `GET /api/health` - Database connection test

## Post-Deployment Verification

### 1. API Endpoint Testing
```bash
# Test all endpoints
curl -X POST https://your-domain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

curl -X GET https://your-domain.com/api/accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

curl -X GET https://your-domain.com/api/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Webhook Testing
```bash
# Test Plaid webhook endpoint
curl -X POST https://your-domain.com/plaid/webhook \
  -H "Content-Type: application/json" \
  -d '{"webhook_type":"TRANSACTIONS"}'
```

### 3. Background Jobs
```bash
# Test background jobs
curl -X POST https://your-domain.com/api/subscriptions/recompute \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Monitoring and Logging

### Recommended Monitoring Tools
- **Render**: Built-in metrics and logs
- **Sentry**: Error tracking
- **LogRocket**: User session recording
- **Uptime Robot**: Service monitoring

### Log Configuration
```javascript
// In production, add structured logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});
```

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use different keys for development and production
- Rotate keys regularly

### 2. CORS Configuration
```javascript
// In server.js, add CORS for production
const cors = require('cors');
app.use(cors({
  origin: ['https://your-frontend-domain.com'],
  credentials: true
}));
```

### 3. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

## Troubleshooting

### Common Issues
1. **Database Connection**: Verify Supabase URL and keys
2. **Plaid Integration**: Check webhook URL accessibility
3. **JWT Tokens**: Verify token expiration and refresh
4. **CORS Errors**: Ensure frontend domain is whitelisted
5. **Background Jobs**: Check ENABLE_JOBS environment variable

### Debug Mode
```bash
# Run with debug logging
DEBUG=* npm start
```

## Scaling Considerations

### Database
- Supabase handles scaling automatically
- Monitor connection pool usage
- Consider read replicas for high traffic

### Application Server
- Use multiple instances behind a load balancer
- Implement horizontal scaling
- Monitor memory and CPU usage

### File Storage
- Use cloud storage for file uploads
- Implement CDN for static assets
- Cache frequently accessed data
