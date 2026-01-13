# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a FHIR-compliant healthcare appointment scheduling platform that enables patients to search for healthcare providers and book appointments. The application synchronizes with FHIR data sources to provide real-time availability and supports SMART scheduling deep-linking for appointment booking.

## Development Commands

### Running the Application

```bash
# Development mode (starts both backend and frontend with hot reload)
npm run dev

# Production build
npm run build

# Production start (requires build first)
npm start

# Type checking
npm run check
```

### Database Operations

```bash
# Push schema changes to database
npm run db:push
```

Note: This project uses Neon Database (PostgreSQL). The `DATABASE_URL` environment variable must be set for database operations to work.

## Architecture

### Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components (home, not-found)
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility libraries (fhir-client, date-utils)
│   │   └── App.tsx      # App root with routing
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API routes and FHIR sync logic
│   ├── storage.ts       # Storage abstraction layer (IStorage interface, MemStorage implementation)
│   └── vite.ts          # Vite integration for dev/prod
├── shared/              # Shared code between client and server
│   └── schema.ts        # Drizzle ORM schema and Zod validation schemas
```

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Wouter for routing (lightweight alternative to React Router)
- TanStack Query for server state management
- Shadcn/ui components (Radix UI primitives + Tailwind)
- Vite for build tooling

**Backend:**
- Express with TypeScript (ES modules)
- Drizzle ORM with Neon Database (PostgreSQL)
- node-cron for scheduled FHIR data synchronization

**Key Libraries:**
- `axios` for HTTP requests
- `zod` for runtime validation
- `date-fns` for date manipulation

### Module Aliases

The project uses TypeScript path aliases configured in both `tsconfig.json` and `vite.config.ts`:

- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### FHIR Data Architecture

The application maintains four core FHIR resource types in the database:

1. **Location** - Healthcare facility locations with address and contact info
2. **PractitionerRole** - Healthcare providers with specialties, locations, and enhanced Optum data
3. **Schedule** - Provider schedules defining when they're available
4. **Slot** - Individual appointment time slots with status (free/busy)

#### Data Synchronization Flow

1. **FHIR Bulk Data Import**: The `syncFHIRData()` function in [server/routes.ts](server/routes.ts) fetches NDJSON bulk data from `https://zocdoc-smartscheduling.netlify.app/$bulk-publish`
2. **Resource Processing**: Each resource type (Location, PractitionerRole, Schedule, Slot) is parsed and bulk upserted into storage
3. **Optum Enrichment**: After initial sync, `enrichWithOptumData()` calls the Optum FHIR API (`https://public.fhir.flex.optum.com/R4/Practitioner`) to enrich practitioner data with:
   - NPI (National Provider Identifier)
   - Insurance accepted
   - Languages spoken
   - Education and board certifications
   - Hospital affiliations
4. **Scheduled Updates**: node-cron runs the sync periodically to keep data current

#### Storage Layer

The storage layer is abstracted through the `IStorage` interface in [server/storage.ts](server/storage.ts), which defines:
- CRUD operations for all FHIR resources
- Bulk upsert operations for efficient sync
- Search operations with filtering
- Provider enrichment methods

**Current Implementation**: `MemStorage` provides an in-memory implementation using ES6 Maps. This is suitable for development and demonstration but data is lost on server restart.

**Production Consideration**: To persist data across restarts, a PostgreSQL implementation of `IStorage` should be created using Drizzle ORM. The schema is already defined in [shared/schema.ts](shared/schema.ts).

### API Architecture

All API endpoints are defined in [server/routes.ts](server/routes.ts). Key endpoints:

- `GET /api/locations` - Get all locations
- `GET /api/practitioners` - Get all practitioner roles
- `GET /api/schedules` - Get all schedules
- `GET /api/slots` - Get slots with optional filtering (start, end, available)
- `GET /api/availability/:practitionerId` - Get availability for a specific provider
- `POST /api/search` - Search providers with filters (specialty, location, date range, etc.)
- `GET /api/booking/:slotId` - Get booking information and SMART scheduling link
- `POST /api/sync` - Manually trigger FHIR data sync
- `GET /api/health` - Health check

### Frontend Data Flow

1. **API Client**: [client/src/lib/fhir-client.ts](client/src/lib/fhir-client.ts) provides a `FHIRClient` class that wraps all API calls
2. **React Hooks**: [client/src/hooks/use-fhir-data.ts](client/src/hooks/use-fhir-data.ts) provides custom hooks using TanStack Query:
   - `useLocations()` - Fetch and cache locations
   - `usePractitioners()` - Fetch and cache practitioners
   - `useSchedules()` - Fetch and cache schedules
   - `useSlots()` - Fetch and cache slots
   - `useProviderSearch()` - Search with filters
3. **Components**: React components use these hooks to access data with automatic caching, refetching, and loading states

### SMART Scheduling Integration

The application implements SMART scheduling deep-linking:
- Booking links are extracted from FHIR Slot extensions
- When a user selects a slot, they're redirected to the provider's external booking system
- The booking URL is typically embedded in the slot's extension field following SMART scheduling spec

## Database Schema

The database schema is defined in [shared/schema.ts](shared/schema.ts) using Drizzle ORM:

- All tables use FHIR resource IDs as primary keys (`id: varchar`)
- JSONB columns store complex FHIR data structures (addresses, telecoms, extensions, etc.)
- `updatedAt` timestamp tracks last modification
- Zod schemas provide runtime validation for inserts

**Important**: The schema includes Optum-specific enrichment fields on `practitioner_roles`:
- `npi`, `insurance_accepted`, `languages_spoken`
- `education`, `board_certifications`, `hospital_affiliations`
- `optum_data` (additional metadata)

## Key Components

### Backend

- **[server/index.ts](server/index.ts)**: Express server setup with request logging and error handling middleware
- **[server/routes.ts](server/routes.ts)**: All API routes, FHIR sync logic, and Optum enrichment
- **[server/storage.ts](server/storage.ts)**: Storage abstraction and in-memory implementation
- **[server/vite.ts](server/vite.ts)**: Vite integration for serving the frontend in dev and production

### Frontend

- **[client/src/App.tsx](client/src/App.tsx)**: App root with Wouter routing setup
- **[client/src/pages/home.tsx](client/src/pages/home.tsx)**: Main search and provider browsing interface
- **[client/src/components/provider-card.tsx](client/src/components/provider-card.tsx)**: Provider display with insurance and Optum data
- **[client/src/components/booking-modal.tsx](client/src/components/booking-modal.tsx)**: Booking flow modal
- **[client/src/components/location-map.tsx](client/src/components/location-map.tsx)**: Google Maps integration
- **[client/src/components/availability-calendar.tsx](client/src/components/availability-calendar.tsx)**: Calendar for slot selection
- **[client/src/components/search-filters.tsx](client/src/components/search-filters.tsx)**: Search filter UI

### Shared

- **[shared/schema.ts](shared/schema.ts)**: Single source of truth for data structures, shared between client and server

## Development Notes

### Working with the Database

- The project is configured to use Neon Database (serverless PostgreSQL)
- **NEW**: Full PostgreSQL implementation (`DbStorage`) available in [server/storage.ts](server/storage.ts:390-769)
- Set `USE_DB_STORAGE=true` in environment to enable PostgreSQL storage
- Default is `MemStorage` (in-memory) for development - data lost on restart
- Use `npm run db:push` to sync schema changes to the database

### FHIR Data Sync (Connectathon 41 Enhanced)

- **Multi-Publisher Support**: Syncs from multiple `$bulk-publish` endpoints
- Configure sources via `BULK_PUBLISH_SOURCES` environment variable (comma-separated)
- Default: Zocdoc SMART scheduling demo endpoint
- **Example with 4 sources**:
  ```
  BULK_PUBLISH_SOURCES=https://zocdoc-smartscheduling-api.netlify.app,https://smart-scheduling-defacto.s3.us-east-2.amazonaws.com/public,https://www.rendeva.org/api/datasets/smart-aligned,https://raw.githubusercontent.com/culby/smart-scheduling-links/master/examples
  ```
- FHIR sync runs automatically on server startup
- Manual sync can be triggered via `POST /api/sync`
- Optum enrichment attempts to match practitioners by NPI and adds insurance/qualification data
- **NEW**: Tracks data provenance with `publisherUrl` field on all resources

### Environment Variables

The following environment variables are used:
- `DATABASE_URL` - PostgreSQL connection string (required for database operations)
- `USE_DB_STORAGE` - Set to `true` to enable PostgreSQL, `false` for in-memory (default: `false`)
- `BULK_PUBLISH_SOURCES` - Comma-separated list of `$bulk-publish` endpoints for multi-publisher aggregation
- `PORT` - Server port (defaults to 5000)
- `NODE_ENV` - Set to "production" for production builds

See [.env.example](.env.example) for configuration examples.

### UI Components

The project uses shadcn/ui components located in [client/src/components/ui/](client/src/components/ui/). These are pre-built, customizable components based on Radix UI and styled with Tailwind.

To add new shadcn/ui components, refer to the shadcn/ui documentation and the [components.json](components.json) configuration.

### Error Handling

- Backend errors are caught by the error middleware in [server/index.ts](server/index.ts:42-48)
- Frontend errors are displayed using the toast system (shadcn/ui Toaster)
- Runtime errors in development show an overlay (Replit plugin)

## Testing the Application

Since there are no automated tests configured, manually test by:

1. Starting the dev server: `npm run dev`
2. Verifying FHIR sync completes in server logs
3. Testing the search functionality on the home page
4. Testing provider card interactions and booking flow
5. Checking that insurance and Optum data displays correctly

## Common Patterns

### Adding a New API Endpoint

1. Add the route handler in [server/routes.ts](server/routes.ts) inside the `registerRoutes()` function
2. Add the corresponding method to `IStorage` interface in [server/storage.ts](server/storage.ts)
3. Implement the method in `MemStorage` class
4. Add a client method to `FHIRClient` in [client/src/lib/fhir-client.ts](client/src/lib/fhir-client.ts)
5. Create a custom hook in [client/src/hooks/use-fhir-data.ts](client/src/hooks/use-fhir-data.ts) using TanStack Query

### Adding a New FHIR Resource Type

1. Define the Drizzle table schema in [shared/schema.ts](shared/schema.ts)
2. Create Zod insert schema and TypeScript types
3. Add CRUD methods to `IStorage` interface
4. Implement in `MemStorage`
5. Add sync logic in `syncFHIRData()` function in [server/routes.ts](server/routes.ts)
6. Run `npm run db:push` to update database schema

### Styling Components

- Use Tailwind utility classes for styling
- For complex components, compose shadcn/ui primitives
- Use CSS variables defined in [client/src/index.css](client/src/index.css) for theming
- Prefer using existing design tokens over hardcoded values

## Connectathon 41 Implementation

This application is configured to participate in the **HL7 FHIR Connectathon 41 Patient Scheduling track** in both **Client** and **Slot Directory** roles.

### Implemented Features

#### Enhanced Search Filters
- **Date Range**: Complete with `dateFrom` and `dateTo` fields
- **Appointment Type**: Routine, Follow-up, New Patient, Urgent
- **Languages**: Multi-select filter (English, Spanish, French, Chinese, Arabic)
- **Insurance**: Multi-select filter (Medicare, Medicaid, BCBS, Aetna, UnitedHealthcare, Cigna)
- **Specialty, Location**: Existing filters enhanced
- All filters functional in [client/src/components/search-filters.tsx](client/src/components/search-filters.tsx)

#### SMART Scheduling Links Extensions
- **Appointment Type Parsing**: Extracts `appointment-type` extension from Slot resources
- **Virtual Service Detection**: Identifies telehealth/virtual appointments via `virtual-service-base` extension
- Extension helpers in [server/routes.ts](server/routes.ts:18-44)

#### Multi-Publisher Aggregation (Slot Directory Role)
- Consumes from multiple `$bulk-publish` endpoints simultaneously
- Tracks data provenance with `publisherUrl` on all resources
- Robust error handling - continues if individual sources fail
- See `syncFHIRDataFromSource()` in [server/routes.ts](server/routes.ts:56-146)

#### Slot Directory Endpoints
- **`GET /fhir/$bulk-publish`**: Returns manifest with FHIR bulk data URLs
- **`GET /fhir/data/locations.ndjson`**: Location resources in NDJSON format
- **`GET /fhir/data/practitioners.ndjson`**: PractitionerRole resources in NDJSON format
- **`GET /fhir/data/schedules.ndjson`**: Schedule resources in NDJSON format
- **`GET /fhir/data/slots.ndjson`**: Slot resources in NDJSON format
- All endpoints at [server/routes.ts](server/routes.ts:557-654)

### Connectathon Test Scenarios

**Scenario 1-2: Bulk Publish** (Slot Directory role)
- Access `http://localhost:5000/fhir/$bulk-publish` to get manifest
- Download NDJSON files from URLs in manifest
- Verify FHIR-compliant resource format

**Scenario 3: Basic Slot Discovery** (Client role)
- Query `/api/slots` or `/api/search` endpoints
- Verify complete slot metadata (start, end, actor, location, appointmentType, isVirtual)

**Scenario 4: Complex Slot Filtering** (Client role)
- Use search filters UI to filter by:
  - Specialty (e.g., "Dermatology")
  - Date range (next 30 days)
  - Location (city/zip)
  - Language (e.g., "Spanish")
  - Insurance (e.g., "Medicare")
  - Appointment type (e.g., "Routine")
- Verify accurate filtered results

**Scenario 5: Appointment Booking Flow** (Client role)
- Display availability calendar
- Select specific slot
- Retrieve booking URL via `/api/booking/:slotId`
- Verify SMART deep-link opens correctly

### Database Schema Enhancements

New fields added for Connectathon compliance in [shared/schema.ts](shared/schema.ts):

**Slot Table**:
- `appointmentType` (text) - Parsed from FHIR extension
- `isVirtual` (boolean) - Virtual service indicator
- `publisherUrl` (text) - Source publisher for multi-source tracking

**All Resource Tables**:
- `publisherUrl` (text) - Tracks which `$bulk-publish` endpoint provided the data

**Search Filters**:
- `languages` (array) - Filter by languages spoken
- `insurance` (array) - Filter by insurance accepted
- `appointmentType` (string) - Filter by appointment type

### Testing Multi-Publisher Setup

1. Create `.env` file with multiple sources:
   ```bash
   BULK_PUBLISH_SOURCES=https://zocdoc-smartscheduling-api.netlify.app,https://smart-scheduling-defacto.s3.us-east-2.amazonaws.com/public,https://www.rendeva.org/api/datasets/smart-aligned
   ```

2. Start server: `npm run dev`

3. Watch console logs for sync from each source:
   ```
   Configured sources: 3
     1. https://zocdoc-smartscheduling-api.netlify.app
     2. https://smart-scheduling-defacto.s3.us-east-2.amazonaws.com/public
     3. https://www.rendeva.org/api/datasets/smart-aligned
   ```

4. Verify aggregated data:
   - Check `/api/practitioners` for mixed data from all sources
   - Verify `publisherUrl` field populated on resources

### Deploying for Connectathon

1. Set up PostgreSQL database (Neon or other)
2. Configure environment:
   ```bash
   DATABASE_URL=postgresql://...
   USE_DB_STORAGE=true
   BULK_PUBLISH_SOURCES=https://endpoint1,https://endpoint2,https://endpoint3
   ```
3. Push schema: `npm run db:push`
4. Build: `npm run build`
5. Start: `npm start`
6. Submit endpoints:
   - **Client**: `https://yourdomain.com` (UI)
   - **Slot Directory**: `https://yourdomain.com/fhir/$bulk-publish`
