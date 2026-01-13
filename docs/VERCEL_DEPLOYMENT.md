# Vercel Deployment Guide

## Quick Start

1. **Push to GitHub** ✅ (Already done)
2. **Import to Vercel**
3. **Configure Environment Variables**
4. **Deploy**

## Step-by-Step Instructions

### 1. Import Project to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository: `aks129/smartscheduling`
4. Click "Import"

### 2. Configure Build Settings

Vercel should auto-detect the settings, but verify:

**Framework Preset**: Vite
**Build Command**: `npm run build`
**Output Directory**: `dist`
**Install Command**: `npm install`

### 3. Configure Environment Variables

Click "Environment Variables" and add the following:

#### Required for Production

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host.neon.tech/database?sslmode=require
USE_DB_STORAGE=true

# Multi-Publisher Configuration
BULK_PUBLISH_SOURCES=https://zocdoc-smartscheduling-api.netlify.app,https://smart-scheduling-defacto.s3.us-east-2.amazonaws.com/public,https://www.rendeva.org/api/datasets/smart-aligned,https://raw.githubusercontent.com/culby/smart-scheduling-links/master/examples

# Server Configuration
NODE_ENV=production
PORT=5000
```

#### Optional (if using different sources)

```bash
# Add your own $bulk-publish endpoints
BULK_PUBLISH_SOURCES=https://your-source-1.com/$bulk-publish,https://your-source-2.com/$bulk-publish
```

### 4. Set Up Neon Database

1. Go to [neon.tech](https://neon.tech)
2. Sign up / Log in
3. Click "New Project"
4. Project name: `smartscheduling`
5. Region: Choose closest to your users
6. Click "Create Project"
7. Copy the connection string
8. Paste into Vercel `DATABASE_URL` environment variable

**Important**: Make sure to use the connection string with `?sslmode=require` at the end

### 5. Initialize Database Schema

After first deployment:

```bash
# Clone your repo locally if not already
git clone https://github.com/aks129/smartscheduling.git
cd smartscheduling

# Install dependencies
npm install

# Create .env file with your DATABASE_URL
echo "DATABASE_URL=your-neon-connection-string" > .env
echo "USE_DB_STORAGE=true" >> .env

# Push schema to database
npm run db:push
```

You should see output like:
```
✓ Pushing schema to database
✓ Schema pushed successfully
```

### 6. Deploy

1. Click "Deploy" in Vercel
2. Wait for build to complete (2-3 minutes)
3. Once deployed, click on the deployment URL

### 7. Verify Deployment

#### Test Basic Functionality

1. **Homepage loads**: Visit `https://your-app.vercel.app`
2. **FHIR sync runs**: Check Vercel logs for sync messages
3. **Search works**: Try searching for providers
4. **Filters work**: Apply various filters

#### Test API Endpoints

```bash
# Replace YOUR_URL with your Vercel deployment URL

# Health check
curl https://YOUR_URL.vercel.app/api/health

# Get practitioners
curl https://YOUR_URL.vercel.app/api/practitioners

# Get slots
curl https://YOUR_URL.vercel.app/api/slots

# Test bulk publish (Connectathon)
curl https://YOUR_URL.vercel.app/fhir/\$bulk-publish

# Download NDJSON
curl https://YOUR_URL.vercel.app/fhir/data/slots.ndjson
```

#### Test Search with Filters

```bash
curl -X POST https://YOUR_URL.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "specialty": "dermatology",
    "location": "Boston",
    "dateFrom": "2024-01-15",
    "dateTo": "2024-02-15",
    "languages": ["spanish"],
    "insurance": ["medicare"]
  }'
```

### 8. Monitor Logs

1. Go to Vercel dashboard
2. Click on your project
3. Click "Deployments"
4. Click on the latest deployment
5. Click "Functions" tab to see logs

Look for:
- ✅ "Starting FHIR data sync from multiple sources..."
- ✅ "Configured sources: 4"
- ✅ "✓ Synced X resources from <source>"
- ✅ "FHIR data sync completed: X succeeded, Y failed"

### 9. Submit to Connectathon

Once verified, submit these URLs to Connectathon organizers:

**Client Role**:
- UI URL: `https://your-app.vercel.app`
- API Base: `https://your-app.vercel.app/api`

**Slot Directory Role**:
- Bulk Publish: `https://your-app.vercel.app/fhir/$bulk-publish`

## Troubleshooting

### Build Fails

**Error**: "Cannot find module 'X'"
**Solution**: Verify all dependencies in package.json, run `npm install` locally

**Error**: "TypeScript errors"
**Solution**: Run `npm run check` locally to see errors

### Database Connection Fails

**Error**: "DATABASE_URL is not set"
**Solution**: Add DATABASE_URL to Vercel environment variables

**Error**: "SSL connection required"
**Solution**: Add `?sslmode=require` to end of DATABASE_URL

**Error**: "relation 'locations' does not exist"
**Solution**: Run `npm run db:push` to create tables

### FHIR Sync Issues

**Error**: "Failed to sync from <source>"
**Solution**:
- Verify source URLs are accessible
- Check if sources return valid bulk publish manifests
- Some sources may be temporarily down - app continues with others

**No data appearing**:
- Check Vercel function logs for sync errors
- Verify database connection is working
- Try triggering manual sync: `POST /api/sync`

### CORS Errors

**Error**: "Access-Control-Allow-Origin"
**Solution**: CORS is configured for all origins. Check if request includes credentials.

### Performance Issues

**Slow initial load**:
- First request may cold start serverless functions (1-2 seconds)
- Subsequent requests are faster
- Consider upgrading Vercel plan for better performance

**Large dataset issues**:
- If syncing many sources with lots of data, increase function timeout
- Consider pagination for API responses
- Use database storage (not in-memory) for large datasets

## Advanced Configuration

### Custom Domain

1. Go to Vercel project settings
2. Click "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions
5. Update Connectathon submission with new domain

### Function Configuration

Create `vercel.json` in project root for custom settings:

```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

### Environment-Specific Variables

Add different variables for Production vs Preview:

1. Vercel dashboard → Project Settings → Environment Variables
2. Toggle "Production" / "Preview" / "Development"
3. Set different DATABASE_URL for preview deployments

### Monitoring & Alerts

1. Enable Vercel Analytics:
   - Project Settings → Analytics → Enable
2. Set up uptime monitoring (external service like UptimeRobot)
3. Monitor function logs regularly

## Checklist Before Going Live

- [ ] Environment variables configured in Vercel
- [ ] Database schema pushed to Neon
- [ ] Homepage loads successfully
- [ ] FHIR sync completes (check logs)
- [ ] Search filters work
- [ ] Provider cards display correctly
- [ ] Map shows locations
- [ ] Booking flow works
- [ ] API endpoints respond correctly
- [ ] Bulk publish manifest returns valid JSON
- [ ] NDJSON files download successfully
- [ ] Mobile responsive design tested
- [ ] Error messages are user-friendly
- [ ] Console has no critical errors
- [ ] Connectathon submission URLs ready

## Maintenance

### Update Dependencies

```bash
npm update
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

Vercel will automatically redeploy.

### Database Migrations

When schema changes:

```bash
# Update shared/schema.ts
# Then push changes
npm run db:push
```

### Monitor Costs

- Neon: Free tier includes 0.5 GB storage, ~3GB compute
- Vercel: Free tier includes 100GB bandwidth
- Monitor usage in dashboards

## Support

- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- GitHub Issues: https://github.com/aks129/smartscheduling/issues
