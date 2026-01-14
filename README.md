# SMART Healthcare Scheduling Platform

A FHIR-compliant healthcare appointment scheduling application implementing the **SMART Scheduling Links Implementation Guide**. Built for **HL7 FHIR Connectathon 41 Patient Scheduling Track**.

## Features

### Core Functionality
- 🔍 **Advanced Provider Search** - Search by specialty, location, insurance, language
- 📅 **Smart Date Filtering** - Find appointments within specific date ranges
- 🗺️ **Interactive Map View** - Visual location-based provider discovery
- 📱 **SMART Deep Links** - Direct booking integration with provider systems
- 🌐 **Multi-Publisher Aggregation** - Consume slots from multiple FHIR endpoints

### Connectathon 41 Compliance
- ✅ **Client Role** - Discovers and displays appointment slots
- ✅ **Slot Directory Role** - Aggregates and republishes FHIR data
- ✅ **SMART Extensions** - Parses appointment-type and virtual-service extensions
- ✅ **Bulk Data API** - Exposes `/fhir/$bulk-publish` endpoint
- ✅ **Multi-Source Sync** - Aggregates from 3+ publisher endpoints

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (optional, defaults to in-memory storage)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd smartscheduling

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

### Environment Configuration

Create a `.env` file with the following variables:

```bash
# Database (optional - defaults to in-memory)
DATABASE_URL=postgresql://user:password@host:5432/dbname
USE_DB_STORAGE=false  # Set to 'true' to enable PostgreSQL

# Multi-Publisher Configuration (Connectathon 41)
# IMPORTANT: Use Touchstone proxy for Connectathon to track message exchanges
BULK_PUBLISH_SOURCES=https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish,https://zocdoc-smartscheduling-api.netlify.app

# Alternative sources (for development/testing)
# BULK_PUBLISH_SOURCES=https://smart-scheduling-defacto.s3.us-east-2.amazonaws.com/public,https://www.rendeva.org/api/datasets/smart-aligned

# Server
PORT=5000
NODE_ENV=development
```

**Note**: For HL7 FHIR Connectathon 41, use the Touchstone proxy URL to enable message tracking. See [docs/TOUCHSTONE_INTEGRATION.md](docs/TOUCHSTONE_INTEGRATION.md) for details.

## Project Structure

```
smartscheduling/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   │   ├── ui/        # shadcn/ui components
│   │   │   ├── search-filters.tsx
│   │   │   ├── provider-card.tsx
│   │   │   └── ...
│   │   ├── lib/           # Client utilities
│   │   │   └── fhir-client.ts
│   │   ├── hooks/         # React hooks
│   │   └── pages/         # Page components
├── server/                 # Express backend
│   ├── routes.ts          # API endpoints & FHIR sync
│   ├── storage.ts         # Data persistence layer
│   └── db.ts              # PostgreSQL connection
├── shared/                 # Shared types
│   └── schema.ts          # FHIR resource schemas
└── docs/
    └── CONNECTATHON_GUIDE.md
```

## API Endpoints

### Client Endpoints
- `GET /api/practitioners` - List all practitioners
- `GET /api/locations` - List all locations
- `GET /api/schedules` - List all schedules
- `GET /api/slots` - List available slots
- `POST /api/search` - Search providers with filters
- `GET /api/availability/:providerId` - Get provider availability
- `GET /api/booking/:slotId` - Get booking information
- `POST /api/sync` - Trigger FHIR data sync

### Slot Directory Endpoints (Connectathon 41)
- `GET /fhir/$bulk-publish` - FHIR bulk data manifest
- `GET /fhir/data/locations.ndjson` - Location resources (NDJSON)
- `GET /fhir/data/practitioners.ndjson` - PractitionerRole resources (NDJSON)
- `GET /fhir/data/schedules.ndjson` - Schedule resources (NDJSON)
- `GET /fhir/data/slots.ndjson` - Slot resources (NDJSON)

## Search Filters

The application supports comprehensive filtering:

- **Search Query** - Provider name or condition
- **Specialty** - Medical specialty (Dermatology, Gynecology, etc.)
- **Location** - City or ZIP code
- **Date Range** - From/To dates
- **Appointment Type** - Routine, Follow-up, New Patient, Urgent
- **Languages** - English, Spanish, French, Chinese, Arabic
- **Insurance** - Medicare, Medicaid, BCBS, Aetna, UnitedHealthcare, Cigna

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Production
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:push          # Sync schema to PostgreSQL

# Type Checking
npm run check            # Run TypeScript type checking
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- TanStack Query for data fetching
- shadcn/ui + Radix UI components
- Tailwind CSS for styling
- Wouter for routing
- Leaflet for maps

**Backend:**
- Express.js
- Drizzle ORM with Neon PostgreSQL
- Axios for FHIR data fetching
- node-cron for scheduled sync

**FHIR Standards:**
- SMART Scheduling Links IG
- FHIR R4 resources (Location, PractitionerRole, Schedule, Slot)
- Bulk Data API (NDJSON export)

## Connectathon 41 Participation

This application is ready for **HL7 FHIR Connectathon 41** in both roles:

### As a Client
1. Navigate to the application UI
2. Use search filters to find providers
3. View available appointment slots
4. Click "Book Now" to access SMART deep-links

### As a Slot Directory
1. Access the bulk publish manifest: `GET /fhir/$bulk-publish`
2. Download NDJSON files from the URLs in the manifest
3. Verify FHIR-compliant resource format

See [CONNECTATHON_GUIDE.md](docs/CONNECTATHON_GUIDE.md) for detailed testing scenarios.

## Multi-Publisher Setup

To aggregate from multiple FHIR endpoints:

1. Add comma-separated URLs to `BULK_PUBLISH_SOURCES` in `.env`
2. Restart the server
3. Check console logs for sync status from each source
4. All resources will be tagged with `publisherUrl` for provenance tracking

Example:
```bash
BULK_PUBLISH_SOURCES=https://publisher1.com/$bulk-publish,https://publisher2.com/$bulk-publish,https://publisher3.com/$bulk-publish
```

## Database Options

### In-Memory Storage (Default)
- No setup required
- Fast for development
- Data resets on server restart
- Set `USE_DB_STORAGE=false` or leave unset

### PostgreSQL Storage
- Persistent data
- Required for production
- Set `USE_DB_STORAGE=true`
- Provide `DATABASE_URL`
- Run `npm run db:push` to initialize

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables:
   ```
   DATABASE_URL=<your-neon-db-url>
   USE_DB_STORAGE=true
   BULK_PUBLISH_SOURCES=<comma-separated-urls>
   ```
4. Deploy

### Database Setup (Neon)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string to `DATABASE_URL`
4. Run `npm run db:push` to create tables

## Testing

### Test FHIR Sync
```bash
# Start server
npm run dev

# Check console for sync logs
# Should see: "✓ Synced X resources from <source>"

# Verify data via API
curl http://localhost:5000/api/practitioners
```

### Test Search Filters
1. Open `http://localhost:5000`
2. Enter search criteria (specialty, location, dates)
3. Click "More Filters" for advanced options
4. Click "Search" to see filtered results

### Test Bulk Publish Endpoint
```bash
# Get manifest
curl http://localhost:5000/fhir/\$bulk-publish

# Download NDJSON file (use URL from manifest)
curl http://localhost:5000/fhir/data/slots.ndjson
```

## Troubleshooting

### FHIR Sync Fails
- Check `BULK_PUBLISH_SOURCES` URLs are accessible
- Verify endpoints return valid FHIR bulk data manifest
- Check console logs for specific error messages

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure database is running and accessible
- Check firewall rules for database host
- Try `USE_DB_STORAGE=false` to test with in-memory storage

### No Slots Appearing
- Ensure FHIR sync completed successfully
- Check date range filters aren't too restrictive
- Verify source endpoints have slot data available

## Contributing

See [CLAUDE.md](CLAUDE.md) for detailed architecture documentation and development guidelines.

## License

MIT

## Support

For Connectathon 41 questions, see [CONNECTATHON_GUIDE.md](docs/CONNECTATHON_GUIDE.md)

For general questions, open an issue on GitHub.
