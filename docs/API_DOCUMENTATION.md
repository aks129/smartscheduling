# API Documentation Guide

This guide covers the interactive API documentation and admin dashboard features of the SMART Scheduling application.

## Swagger UI Documentation

### Accessing Swagger UI

**Production**: https://smartscheduling.vercel.app/api-docs
**Local Development**: http://localhost:5000/api-docs

The Swagger UI provides:
- 📖 Complete API reference with all endpoints
- 🧪 Interactive "Try it out" functionality
- 📋 Request/response examples
- 🔍 Schema definitions for all FHIR resources
- 🏷️ Organized by functional categories

### Features

#### 1. Interactive Testing
- Click "Try it out" on any endpoint
- Fill in parameters
- Execute requests directly from the browser
- View real responses from the server

#### 2. API Categories

**Health**
- `GET /api/health` - Server health check

**FHIR Resources**
- `GET /api/locations` - List all locations
- `GET /api/practitioners` - List all practitioner roles
- `GET /api/schedules` - List all schedules
- `GET /api/slots` - List all slots (supports filtering)

**Search & Discovery**
- `POST /api/search` - Advanced search with filters
  - Filter by specialty, location, date range
  - Filter by languages spoken, insurance accepted
  - Filter by appointment type
- `GET /api/availability/:providerId` - Get provider availability

**Booking**
- `GET /api/booking/:slotId` - Get booking information
  - Returns SMART scheduling deep-link
  - Returns phone booking number if available

**Bulk Publish (Slot Directory Role)**
- `GET /fhir/$bulk-publish` - Bulk publish manifest
- `GET /fhir/data/locations.ndjson` - Location NDJSON export
- `GET /fhir/data/practitioners.ndjson` - PractitionerRole NDJSON export
- `GET /fhir/data/schedules.ndjson` - Schedule NDJSON export
- `GET /fhir/data/slots.ndjson` - Slot NDJSON export

**Admin**
- `POST /api/sync` - Trigger manual FHIR data sync

### Schemas

All FHIR R4 resource schemas are documented:

- **Location**: Healthcare facility locations with geocoding
- **PractitionerRole**: Provider information with specialties, insurance, languages
- **Schedule**: Provider schedules linking to slots
- **Slot**: Individual appointment slots with status and extensions
- **SearchFilters**: Search parameter object
- **BulkPublishManifest**: $bulk-publish response format

## Admin Dashboard

### Accessing the Dashboard

**Production**: https://smartscheduling.vercel.app/admin
**Local Development**: http://localhost:5000/admin

Click the **Settings icon** (⚙️) in the top right of the main app to access the dashboard.

### Features

#### 1. Server Status Monitoring
- Real-time health check status
- Green checkmark for healthy server
- Red X for server errors
- Last checked timestamp
- Auto-refreshes every 30 seconds

#### 2. Data Statistics

Visual cards showing:
- **Locations**: Total number of healthcare facilities
- **Practitioners**: Total number of providers
- **Total Slots**: All appointment slots in the system
- **Available Slots**: Free slots ready for booking
  - Shows percentage of total slots
  - Highlighted in accent color

#### 3. Quick Actions

**Sync Data**
- Manually trigger FHIR data synchronization
- Pulls from all configured `$bulk-publish` sources
- Shows sync progress and status messages
- Refreshes statistics after completion

**API Documentation**
- Quick link to Swagger UI
- Opens in new tab

**Bulk Publish**
- Quick link to bulk publish manifest
- View aggregated data sources

#### 4. API Reference

Quick reference showing:
- Endpoint path
- HTTP method
- Brief description
- Direct link to full documentation

## Example Workflows

### Testing the Search API

1. Go to https://smartscheduling.vercel.app/api-docs
2. Find `POST /api/search` under "Search & Discovery"
3. Click "Try it out"
4. Enter search criteria:
```json
{
  "specialty": "dermatology",
  "location": "Boston",
  "dateFrom": "2024-01-15",
  "dateTo": "2024-02-15",
  "languages": ["english", "spanish"],
  "insurance": ["medicare"],
  "availableOnly": true
}
```
5. Click "Execute"
6. View the filtered results

### Manually Syncing Data

1. Go to https://smartscheduling.vercel.app/admin
2. Click the "Sync Now" button in the "Sync Data" card
3. Watch the progress message
4. Statistics will refresh automatically when complete

### Exploring FHIR Resources

1. Go to Swagger UI
2. Find the "FHIR Resources" section
3. Try `GET /api/practitioners`
4. Click "Try it out" → "Execute"
5. Browse the full practitioner data with:
   - NPI numbers
   - Specialties
   - Insurance accepted
   - Languages spoken
   - Education and certifications

## OpenAPI Specification

### Downloading the Spec

**JSON Format**: https://smartscheduling.vercel.app/api-docs.json

Use this URL to:
- Import into Postman
- Generate client SDKs with OpenAPI Generator
- Integrate with API testing tools
- Document in external tools

### Using with Postman

1. Open Postman
2. Click "Import"
3. Paste the URL: `https://smartscheduling.vercel.app/api-docs.json`
4. Click "Import"
5. All endpoints will be available in a collection

## Development

### Adding New Endpoints

To document a new endpoint in Swagger:

1. Add JSDoc comment above the route in `server/routes.ts`:

```typescript
/**
 * @swagger
 * /api/my-endpoint:
 *   get:
 *     summary: Brief description
 *     description: Detailed description
 *     tags: [Category]
 *     parameters:
 *       - in: query
 *         name: param1
 *         schema:
 *           type: string
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MySchema'
 */
app.get('/api/my-endpoint', async (req, res) => {
  // Implementation
});
```

2. Add schema to `server/swagger.ts` if needed
3. Rebuild and restart server
4. Schema appears in Swagger UI automatically

### Customizing Swagger UI

Edit `server/swagger.ts` to:
- Add new tags
- Define new schemas
- Update server URLs
- Modify contact information
- Add authentication schemes

### Extending Admin Dashboard

Add new features in `client/src/pages/admin.tsx`:
- Real-time WebSocket monitoring
- Performance metrics
- Error logs viewer
- Database health checks
- Cache statistics

## Troubleshooting

### Swagger UI Not Loading

1. Check server is running: `GET /api/health`
2. Verify Swagger spec loads: `GET /api-docs.json`
3. Check browser console for errors
4. Ensure `swagger-ui-express` is installed

### Admin Dashboard Shows Wrong Data

1. Click "Sync Now" to refresh from publishers
2. Check browser network tab for API errors
3. Verify API endpoints return data:
   - `/api/locations`
   - `/api/practitioners`
   - `/api/slots`

### "Try it out" Returns CORS Error

- CORS is configured for all origins (`*`)
- Check if request includes credentials
- Verify server has CORS middleware enabled

## Security Considerations

**Current Configuration**: Open API (no authentication)

This is suitable for:
- Connectathon 41 participation
- Development environments
- Public demo applications

**For Production Deployment**:

Consider adding:
1. API key authentication
2. Rate limiting
3. Request logging
4. IP allowlisting for admin dashboard
5. OAuth 2.0 for sensitive operations

Update Swagger UI to include authentication:

```typescript
components: {
  securitySchemes: {
    ApiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key'
    }
  }
},
security: [{
  ApiKeyAuth: []
}]
```

## Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/docs/open-source-tools/swagger-ui/)
- [FHIR R4 Specification](https://www.hl7.org/fhir/R4/)
- [SMART Scheduling Links IG](https://build.fhir.org/ig/HL7/smart-scheduling-links/)

## Related Documentation

- [README.md](../README.md) - Main project documentation
- [CONNECTATHON_GUIDE.md](./CONNECTATHON_GUIDE.md) - Connectathon participation
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Deployment guide
- [CLAUDE.md](../CLAUDE.md) - Developer guide
