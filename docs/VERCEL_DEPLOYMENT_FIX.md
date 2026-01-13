# Vercel Deployment Fix

## Problem
The Vercel deployment was showing compiled JavaScript code instead of serving the React application properly. When visiting https://smartscheduling.vercel.app, users saw raw JavaScript output starting with:

```javascript
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
...
```

## Root Cause
The issue was caused by incorrect Vercel configuration:

1. **Incorrect routing**: Routes were pointing to `/dist/public/$1` which didn't exist
2. **Missing filesystem handler**: Static files weren't being served correctly
3. **Improper serverless function setup**: The `api/index.js` file wasn't properly exporting the Express app
4. **Missing Vercel-specific build**: The main `server/index.ts` was designed for standalone deployment, not serverless

## Solution

### 1. Created Dedicated Vercel Entry Point
Created `server/vercel.ts` - a serverless-optimized version of the Express app:

```typescript
// server/vercel.ts
import express from "express";
import { registerRoutes } from "./routes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

let serverReady = false;

async function initializeServer() {
  if (!serverReady) {
    await registerRoutes(app);
    serverReady = true;
  }
}

initializeServer();

export default app;
```

### 2. Updated Build Script
Modified `package.json` to build both entry points:

```json
{
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && esbuild server/vercel.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
  }
}
```

This creates:
- `dist/public/` - Frontend assets (React app)
- `dist/index.js` - Standalone server (for local/traditional hosting)
- `dist/vercel.js` - Serverless function (for Vercel)

### 3. Fixed vercel.json Configuration

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/public"
      }
    },
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/fhir/(.*)",
      "dest": "/api/index.js"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "functions": {
    "api/index.js": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

Key changes:
- Added `@vercel/node` build for `api/index.js`
- Added `"handle": "filesystem"` to serve static files
- Changed catch-all route from `/dist/public/$1` to `/$1`
- Removed `/dist/public` prefix from static file paths

### 4. Simplified api/index.js

```javascript
// api/index.js
// Vercel serverless function handler
// Re-export the Express app built for Vercel
export { default } from "../dist/vercel.js";
```

## How It Works Now

1. **Frontend Requests** (e.g., `/`, `/index.html`, `/assets/*`):
   - Hit the "filesystem" handler first
   - Served from `dist/public/` directory
   - React app loads and runs in browser

2. **API Requests** (`/api/*`, `/fhir/*`):
   - Routed to `api/index.js` serverless function
   - Loads `dist/vercel.js` (the Express app)
   - Processes request and returns JSON

3. **Build Process**:
   - `vite build` → Creates React app in `dist/public/`
   - `esbuild server/index.ts` → Creates standalone server in `dist/index.js`
   - `esbuild server/vercel.ts` → Creates serverless function in `dist/vercel.js`

## Verification Steps

After deployment, verify:

1. **Homepage loads correctly**:
   ```bash
   curl https://smartscheduling.vercel.app
   ```
   Should return HTML (not JavaScript)

2. **API endpoints work**:
   ```bash
   curl https://smartscheduling.vercel.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

3. **FHIR endpoints work**:
   ```bash
   curl https://smartscheduling.vercel.app/fhir/\$bulk-publish
   ```
   Should return JSON manifest

4. **Static assets load**:
   - Check that CSS/JS files in `/assets/` load correctly
   - No 404 errors in browser console

## Common Issues & Solutions

### Issue: "Cannot find module '../dist/vercel.js'"
**Solution**: Run `npm run build` locally to ensure `dist/vercel.js` is created

### Issue: API routes return 404
**Solution**: Check that `api/index.js` exists and exports default function

### Issue: Static files return 404
**Solution**: Verify `"handle": "filesystem"` is in routes array before catch-all route

### Issue: CORS errors
**Solution**: CORS headers are set in `server/vercel.ts` - ensure it's being used

## Related Files
- [vercel.json](../vercel.json) - Vercel configuration
- [server/vercel.ts](../server/vercel.ts) - Serverless entry point
- [api/index.js](../api/index.js) - Serverless function wrapper
- [package.json](../package.json) - Build scripts
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - General deployment guide

## Git Commit
This fix was committed as: `72ef42d - Fix Vercel deployment configuration`
