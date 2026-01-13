# HL7 FHIR Connectathon 41 - Patient Scheduling Track Guide

## Overview

This guide is for **Connectathon 41 participants** testing SMART Scheduling Links implementation. Our application supports both **Client** and **Slot Directory** roles.

## Deployment Information

### Production Endpoints

**Web Application (Client Role)**
- URL: `https://your-deployment-url.vercel.app`
- Description: Interactive UI for searching and booking appointment slots

**Slot Directory (Server Role)**
- Manifest: `https://your-deployment-url.vercel.app/fhir/$bulk-publish`
- Description: FHIR bulk data endpoint aggregating slots from multiple sources

### Source Data

Our Slot Directory aggregates from multiple `$bulk-publish` endpoints:
1. Zocdoc SMART Scheduling Demo
2. Defacto SMART Scheduling (S3-hosted)
3. Rendeva SMART Aligned Dataset
4. SMART Reference Implementation

All aggregated data includes `publisherUrl` field for provenance tracking.

## Test Scenarios

### Scenario 1: Basic Bulk Publish Consumption

**Objective**: Verify bulk data publication format

**Steps**:
1. Access manifest: `GET https://your-url/fhir/$bulk-publish`
2. Verify manifest structure:
   ```json
   {
     "transactionTime": "2024-01-13T...",
     "request": "GET /fhir/$bulk-publish",
     "requiresAccessToken": false,
     "output": [
       {
         "type": "Location",
         "url": "https://your-url/fhir/data/locations.ndjson",
         "count": 123
       },
       // ... more resource types
     ],
     "error": []
   }
   ```
3. Download each NDJSON file from URLs in manifest
4. Verify NDJSON format (one JSON object per line)

**Expected Results**:
- ✅ Manifest returns valid JSON
- ✅ All output URLs are accessible
- ✅ NDJSON files contain valid FHIR resources
- ✅ Resources include required fields (id, resourceType)

### Scenario 2: Cross-Server File Hosting

**Objective**: Verify files are accessible from different hosts

**Steps**:
1. Access manifest from your client application
2. Parse output URLs
3. Fetch NDJSON files from a different host/client
4. Verify CORS headers allow cross-origin requests

**Expected Results**:
- ✅ Files accessible without authentication
- ✅ CORS headers present
- ✅ Content-Type: `application/fhir+ndjson`

### Scenario 3: Basic Slot Discovery

**Objective**: Retrieve and display appointment slots

**Client UI Steps**:
1. Navigate to application homepage
2. Click "Search" without filters
3. Observe all available slots displayed

**API Steps**:
```bash
# Get all slots
curl https://your-url/api/slots

# Expected response: Array of Slot resources
[
  {
    "id": "slot-123",
    "schedule": {...},
    "status": "free",
    "start": "2024-01-15T09:00:00Z",
    "end": "2024-01-15T09:30:00Z",
    "appointmentType": "routine",
    "isVirtual": false,
    "publisherUrl": "https://..."
  }
]
```

**Expected Results**:
- ✅ Slots contain required metadata (id, status, start, end)
- ✅ Schedule references are populated
- ✅ Actor information is available
- ✅ Location data is linked
- ✅ Extensions are parsed (appointmentType, isVirtual)

### Scenario 4: Complex Slot Filtering

**Objective**: Filter slots by multiple criteria

**Client UI Steps**:
1. Navigate to homepage
2. Apply filters:
   - **Specialty**: Select "Dermatology"
   - **Location**: Enter "Boston" or "02115"
   - **Date From**: Select tomorrow's date
   - **Date To**: Select date 30 days from now
   - Click "More Filters"
   - **Appointment Type**: Select "Routine"
   - **Languages**: Click "Spanish"
   - **Insurance**: Click "Medicare"
3. Click "Search"
4. Verify results match all filter criteria

**API Steps**:
```bash
curl -X POST https://your-url/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "specialty": "dermatology",
    "location": "Boston",
    "dateFrom": "2024-01-15",
    "dateTo": "2024-02-15",
    "appointmentType": "routine",
    "languages": ["spanish"],
    "insurance": ["medicare"]
  }'
```

**Expected Results**:
- ✅ Only slots matching specialty are returned
- ✅ Only providers in specified location
- ✅ Only slots within date range
- ✅ Only providers accepting Medicare
- ✅ Only providers speaking Spanish
- ✅ Only routine appointment types

### Scenario 5: Appointment Booking Flow

**Objective**: Complete end-to-end booking process

**Steps**:
1. Search for providers with available slots
2. Click on a provider card to expand
3. View available time slots
4. Click "Book Now" on a specific slot
5. Booking modal opens with:
   - Slot details (date, time, provider, location)
   - Booking deep-link button (if extension present)
   - Phone number (if extension present)
6. Click booking link
7. Verify redirect to provider's scheduling system

**API Steps**:
```bash
# Get booking information for a slot
curl https://your-url/api/booking/slot-123

# Expected response
{
  "slotId": "slot-123",
  "bookingLink": "https://provider.com/schedule?slot=123&token=xyz",
  "bookingPhone": "+1-555-123-4567",
  "slot": {
    "id": "slot-123",
    "start": "2024-01-15T09:00:00Z",
    "end": "2024-01-15T09:30:00Z",
    ...
  }
}
```

**Expected Results**:
- ✅ Slot details displayed accurately
- ✅ Booking deep-link parsed from `booking-deep-link` extension
- ✅ Phone number parsed from `booking-phone` extension
- ✅ Link redirects to provider system
- ✅ Graceful handling if extensions missing

## API Reference

### Client Endpoints

#### Search Providers
```
POST /api/search
Content-Type: application/json

Body:
{
  "searchQuery": "string",      // Provider name or condition
  "specialty": "string",         // Medical specialty
  "location": "string",          // City or ZIP code
  "dateFrom": "YYYY-MM-DD",     // Start date
  "dateTo": "YYYY-MM-DD",       // End date
  "availableOnly": boolean,      // Only show available slots
  "languages": ["string"],       // Languages spoken
  "insurance": ["string"],       // Insurance accepted
  "appointmentType": "string"    // Appointment type
}

Response: 200 OK
{
  "practitioners": [...],
  "locations": [...],
  "availableSlots": [...]
}
```

#### Get Booking Information
```
GET /api/booking/:slotId

Response: 200 OK
{
  "slotId": "string",
  "bookingLink": "string",     // SMART deep-link (optional)
  "bookingPhone": "string",    // Booking phone (optional)
  "slot": {...}                // Full Slot resource
}
```

#### List Resources
```
GET /api/practitioners
GET /api/locations
GET /api/schedules
GET /api/slots?start=YYYY-MM-DD&end=YYYY-MM-DD&available=true
GET /api/availability/:providerId?start=YYYY-MM-DD&end=YYYY-MM-DD
```

#### Trigger Sync
```
POST /api/sync

Response: 200 OK
{ "message": "Sync completed" }
```

### Slot Directory Endpoints

#### Bulk Publish Manifest
```
GET /fhir/$bulk-publish

Response: 200 OK
{
  "transactionTime": "string",
  "request": "string",
  "requiresAccessToken": false,
  "output": [
    {
      "type": "Location|PractitionerRole|Schedule|Slot",
      "url": "string",
      "count": number
    }
  ],
  "error": []
}
```

#### NDJSON Data Files
```
GET /fhir/data/locations.ndjson
GET /fhir/data/practitioners.ndjson
GET /fhir/data/schedules.ndjson
GET /fhir/data/slots.ndjson

Response: 200 OK
Content-Type: application/fhir+ndjson

{"resourceType":"Location","id":"1",...}
{"resourceType":"Location","id":"2",...}
...
```

## SMART Extensions Supported

Our implementation parses the following SMART Scheduling Links extensions:

### Booking Deep Link
```json
{
  "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/booking-deep-link",
  "valueUrl": "https://provider.com/schedule?slot=123"
}
```

### Booking Phone
```json
{
  "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/booking-phone",
  "valueString": "+1-555-123-4567"
}
```

### Appointment Type
```json
{
  "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/appointment-type",
  "valueCodeableConcept": {
    "coding": [{
      "code": "ROUTINE",
      "display": "Routine"
    }]
  }
}
```

### Virtual Service
```json
{
  "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/virtual-service-base",
  "valueBoolean": true
}
```

## Data Schema

### Enhanced Slot Resource

Our Slot resources include standard FHIR fields plus parsed extensions:

```typescript
{
  id: string;
  schedule: {
    reference: string;
    display?: string;
  };
  status: "free" | "busy" | "busy-unavailable" | "busy-tentative";
  start: Date;
  end: Date;
  extension?: Array<{
    url: string;
    valueUrl?: string;
    valueString?: string;
    valueCodeableConcept?: object;
    valueBoolean?: boolean;
  }>;

  // Parsed from extensions
  appointmentType?: string;     // From appointment-type extension
  isVirtual?: boolean;          // From virtual-service extension
  publisherUrl?: string;        // Data provenance tracking
}
```

### PractitionerRole Enhancements

We enrich PractitionerRole resources with Optum provider data:

```typescript
{
  // Standard FHIR fields
  id: string;
  practitioner: { reference: string; display: string };
  specialty: Array<CodeableConcept>;
  location: Array<{ reference: string }>;

  // Optum enrichment
  npi?: string;                     // National Provider Identifier
  insuranceAccepted?: Array<{       // Insurance plans accepted
    type: string;
    accepted: boolean;
  }>;
  languagesSpoken?: Array<{         // Languages spoken
    language: string;
    code: string;
  }>;
  education?: Array<{               // Educational background
    school: string;
    degree: string;
  }>;
  boardCertifications?: Array<string>;
  hospitalAffiliations?: Array<string>;
  publisherUrl?: string;            // Source URL
}
```

## Multi-Publisher Architecture

### Data Provenance

All resources include a `publisherUrl` field indicating their source:

```json
{
  "resourceType": "Slot",
  "id": "slot-123",
  "publisherUrl": "https://zocdoc-smartscheduling-api.netlify.app",
  ...
}
```

This allows:
- Tracking which publisher provided each resource
- Debugging data quality issues
- Implementing publisher-specific business logic
- Deduplication strategies based on source

### Sync Process

1. On startup, server reads `BULK_PUBLISH_SOURCES` from environment
2. For each source URL:
   - Fetch `$bulk-publish` manifest
   - Download NDJSON files for each resource type
   - Parse resources and add `publisherUrl`
   - Upsert to database (by resource ID)
3. If a source fails, continue with remaining sources
4. Log sync summary (successes/failures)

### Error Handling

- Individual resource parsing errors are logged but don't stop sync
- Failed source URLs are logged and skipped
- Partial data from successful sources is retained
- Console logs show detailed sync progress

## Testing Checklist

Use this checklist when testing with other Connectathon participants:

### As a Slot Directory (Server)
- [ ] `/fhir/$bulk-publish` returns valid manifest
- [ ] All NDJSON URLs in manifest are accessible
- [ ] NDJSON files contain valid FHIR resources
- [ ] Resources have proper resourceType and id
- [ ] Files use correct Content-Type header
- [ ] No authentication required for access
- [ ] CORS headers allow cross-origin requests

### As a Client (Consumer)
- [ ] Can fetch and parse `$bulk-publish` manifest from other participants
- [ ] Can download and parse NDJSON files
- [ ] Search filters work correctly
- [ ] Date range filtering is accurate
- [ ] Specialty filtering matches coded values
- [ ] Language filtering works (if source data includes languages)
- [ ] Insurance filtering works (if source data includes insurance)
- [ ] Booking deep-links are clickable and functional
- [ ] Phone numbers are displayed when available
- [ ] Virtual visit indicator shows when applicable

### UI/UX
- [ ] Provider cards display complete information
- [ ] Map shows provider locations accurately
- [ ] Calendar view shows availability
- [ ] Filters update results in real-time
- [ ] Mobile-responsive design works
- [ ] Loading states are shown during data fetch
- [ ] Error messages are clear and helpful

## Common Issues & Solutions

### Issue: No data appearing after sync

**Possible Causes**:
- Source URLs unreachable
- Invalid FHIR data format
- Database connection issues

**Solutions**:
1. Check console logs for sync errors
2. Test source URLs manually: `curl <source-url>/$bulk-publish`
3. Verify `DATABASE_URL` if using PostgreSQL
4. Try in-memory storage: `USE_DB_STORAGE=false`

### Issue: Filters not working

**Possible Causes**:
- Source data missing required fields
- Filter values don't match data format

**Solutions**:
1. Check source data structure
2. Verify filter values are lowercase
3. Look for coded values vs display strings
4. Check console for filtering errors

### Issue: Booking links not working

**Possible Causes**:
- Extensions missing from source data
- Extension URLs don't match expected format

**Solutions**:
1. Inspect slot extensions in raw data
2. Verify extension URL format
3. Check if source implements booking extensions
4. Fall back to phone number if no deep-link

## Support

For questions during Connectathon:
- Email: [your-email]
- Slack: [connectathon-channel]
- GitHub Issues: [repository-url]/issues

## Resources

- [SMART Scheduling Links IG](http://build.fhir.org/ig/HL7/smart-scheduling-links/)
- [FHIR Bulk Data Export](https://hl7.org/fhir/uv/bulkdata/)
- [Connectathon 41 Track Info](https://confluence.hl7.org/display/FHIR/2024-01+Patient+Scheduling)
