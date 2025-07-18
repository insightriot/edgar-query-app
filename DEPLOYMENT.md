# Cloud Database and Redis Setup Guide

## 🗄️ Neon PostgreSQL Setup

### 1. Create Neon Database

1. Go to your [Neon Console](https://neon.tech/)
2. Create a new project named `edgar-query-db`
3. Select region closest to your users (e.g., `us-east-1`)
4. Copy the connection string from the dashboard

### 2. Get Connection String

Your Neon connection string will look like:
```
postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## 🔴 Upstash Redis Setup

### 1. Create Upstash Database

1. Go to your [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database named `edgar-cache`
3. Choose region closest to your Neon database
4. Copy the REST URL and REST Token

### 2. Get Redis Credentials

You'll need these from the database details page:
- **REST URL**: `https://us1-example.upstash.io`
- **REST Token**: `AX...` (long token string)

## ⚙️ Environment Variables Configuration

### For Local Development

Create `.env.local` file in the root directory:

```bash
# Database Configuration (Neon)
DATABASE_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require

# Redis Configuration (Upstash)
UPSTASH_REDIS_REST_URL=https://us1-example.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...your_token_here

# Setup Secret (for database initialization)
SETUP_SECRET=your_random_secret_here

# SEC EDGAR Configuration
SEC_API_USER_AGENT=YourCompany/1.0 (contact@yourcompany.com)
```

### For Vercel Deployment

Add these environment variables in your Vercel dashboard:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | Your Neon connection string | Production, Preview, Development |
| `UPSTASH_REDIS_REST_URL` | Your Upstash REST URL | Production, Preview, Development |
| `UPSTASH_REDIS_REST_TOKEN` | Your Upstash REST Token | Production, Preview, Development |
| `SETUP_SECRET` | Random secret for DB setup | Production, Preview, Development |
| `SEC_API_USER_AGENT` | Your contact info | Production, Preview, Development |

## 🚀 Database Initialization

### 1. Install Dependencies

```bash
npm install
```

### 2. Test Connections

Test your database and Redis connections:

```bash
# This will test both connections
curl https://your-app.vercel.app/api/db-test
```

### 3. Initialize Database Schema

Run this once to set up your database tables:

```bash
curl -X POST https://your-app.vercel.app/api/setup-db \
  -H "Authorization: Bearer your_setup_secret_here"
```

## 📊 Verification

### Test the Setup

1. **Health Check**: Visit `https://your-app.vercel.app/api/health`
2. **Database Test**: Visit `https://your-app.vercel.app/api/db-test`
3. **Query Test**: 
   ```bash
   curl -X POST https://your-app.vercel.app/api/queries \
     -H "Content-Type: application/json" \
     -d '{"query":"Tell me about Apple Inc"}'
   ```

### Expected Responses

**Health Check**: Should show database and Redis status
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

**Query Test**: Should return enhanced processing
```json
{
  "success": true,
  "data": {
    "intent": "company_info",
    "entities": ["Apple"],
    "results": {
      "type": "company_profile",
      "message": "..."
    }
  }
}
```

## 🔧 Configuration Notes

### Neon Settings
- **Auto-suspend**: Enable to save costs
- **Connection pooling**: Enable for better performance
- **Backup**: Automatic backups are enabled by default

### Upstash Settings
- **TTL**: We set automatic TTL for rate limiting
- **Max memory**: Choose based on your caching needs
- **Eviction policy**: Use `allkeys-lru` for cache

### Security
- Never commit `.env.local` to git
- Rotate your `SETUP_SECRET` after initial setup
- Use Vercel's encrypted environment variables

## 📈 Next Steps

After setup:
1. Add sample data using data seeding scripts
2. Test all API endpoints
3. Deploy to production
4. Monitor logs and performance
5. Set up error alerting

## 🆘 Troubleshooting

### Common Issues

**Connection timeouts**: 
- Check your connection strings
- Verify network access from Vercel

**SSL errors**:
- Ensure `?sslmode=require` is in your DATABASE_URL

**Rate limiting errors**:
- Check your Upstash Redis is properly configured
- Verify Redis credentials

**Database not found**:
- Run the `/api/setup-db` endpoint first
- Check your DATABASE_URL format