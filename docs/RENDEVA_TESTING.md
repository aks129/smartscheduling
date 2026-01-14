# Rendeva Conformance Testing Guide

This document provides instructions for testing the SMART Healthcare Scheduling Platform against the [Rendeva conformance checker](https://www.rendeva.org/conformance).

## Overview

Rendeva provides automated conformance testing for FHIR SMART Scheduling Links Implementation Guide compliance. The platform tests both **Client** and **Slot Directory** roles.

## Our Endpoints

### Production (Vercel Deployment)
- **Bulk Publish Manifest**: `https://smartscheduling.vercel.app/fhir/$bulk-publish`
- **NDJSON Exports**:
  - Locations: `https://smartscheduling.vercel.app/fhir/data/locations.ndjson`
  - PractitionerRoles: `https://smartscheduling.vercel.app/fhir/data/practitioners.ndjson`
  - Schedules: `https://smartscheduling.vercel.app/fhir/data/schedules.ndjson`
  - Slots: `https://smartscheduling.vercel.app/fhir/data/slots.ndjson`

### Local Development
- **Bulk Publish Manifest**: `http://localhost:5000/fhir/$bulk-publish`
- **NDJSON Exports**: Replace `https://smartscheduling.vercel.app` with `http://localhost:5000`

## Pre-Test Checklist

Before running conformance tests, ensure:

1. **Data is Synced**: Trigger a manual sync to populate FHIR resources
   ```bash
   curl -X POST https://smartscheduling.vercel.app/api/sync
   ```

2. **Verify Manifest**: Check that the bulk-publish manifest returns data
   ```bash
   curl https://smartscheduling.vercel.app/fhir/\$bulk-publish
   ```

   Expected output should show non-zero counts:
   ```json
   {
     "output": [
       {
         "type": "Location",
         "url": "https://smartscheduling.vercel.app/fhir/data/locations.ndjson",
         "count": 20
       },
       {
         "type": "Slot",
         "url": "https://smartscheduling.vercel.app/fhir/data/slots.ndjson",
         "count": 11563,
         "extension": {
           "state": ["MA"]
         }
       }
     ]
   }
   ```

3. **Verify NDJSON Format**: Check that resources have `resourceType` field
   ```bash
   curl -s https://smartscheduling.vercel.app/fhir/data/slots.ndjson | head -n 1 | jq .resourceType
   ```

   Expected: `"Slot"`

## Running Conformance Tests

### Scenario 1: Bulk Publish Manifest Validation

This scenario validates the FHIR bulk-publish manifest and NDJSON output format.

**Steps:**

1. Go to [Rendeva Conformance](https://www.rendeva.org/conformance)

2. In the **Manifest URL** field, enter:
   ```
   https://smartscheduling.vercel.app/fhir/$bulk-publish
   ```

3. Click **"Run Scenario 1"**

4. The test will validate:
   - ✅ Manifest retrieval (200 OK)
   - ✅ ETag header presence
   - ✅ Conditional requests (If-None-Match)
   - ✅ Manifest structure (output array, type, url, count fields)
   - ✅ NDJSON file accessibility
   - ✅ NDJSON formatting (one resource per line)
   - ✅ FHIR resource validation (resourceType, id, valid references)

**Expected Results:**
- All 8 steps should pass with ✅ status
- No validation errors in the Solara FHIR validator step

### Scenario 3: Basic Slot Discovery

This scenario validates slot resource structure and referential integrity.

**Steps:**

1. Go to [Rendeva Conformance](https://www.rendeva.org/conformance)

2. In the **Manifest URL** field, enter:
   ```
   https://smartscheduling.vercel.app/fhir/$bulk-publish
   ```

3. Click **"Run Scenario 3"**

4. The test will validate:
   - ✅ Slot resources have required fields (id, schedule, status, start, end)
   - ✅ Optional booking extensions are present
   - ✅ Start/end times are ISO 8601 formatted
   - ✅ Status values are valid FHIR codes
   - ✅ Schedule references exist and are valid
   - ✅ Referential integrity between Slot and Schedule

**Expected Results:**
- All validation steps should pass
- Schedule references should resolve correctly

## Testing Against Rendeva's Dataset

You can also test our **Client** role by consuming Rendeva's test dataset.

### Important: Use Touchstone Proxy for Connectathon

For **HL7 FHIR Connectathon 41**, use the AEGIS Touchstone proxy to track all message exchanges:

```bash
# In .env file - Touchstone proxy URL
BULK_PUBLISH_SOURCES=https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish
```

**Why use Touchstone?**
- ✅ Tracks all message exchanges for Connectathon quantification
- ✅ Validates FHIR compliance in real-time
- ✅ Provides test reports and certification
- ✅ Records interactions for audit trail

See [TOUCHSTONE_INTEGRATION.md](TOUCHSTONE_INTEGRATION.md) for complete setup guide.

### Configure Multi-Publisher Sync

Add multiple sources including Touchstone:

```bash
# In .env file
BULK_PUBLISH_SOURCES=https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish,https://zocdoc-smartscheduling-api.netlify.app
```

### Sync Rendeva Data

```bash
# Restart server to pick up new source
npm run dev

# Or trigger manual sync on Vercel
curl -X POST https://smartscheduling.vercel.app/api/sync
```

### Verify Mixed Data

```bash
# Check that resources have different publisherUrl values
curl -s https://smartscheduling.vercel.app/api/practitioners | jq '.[].publisherUrl' | sort | uniq
```

Expected output:
```
"https://zocdoc-smartscheduling-api.netlify.app"
"https://www.rendeva.org/api/datasets/smart-aligned"
```

## Common Issues and Fixes

### Issue: Zero counts in manifest

**Symptom**: Bulk-publish manifest shows `count: 0` for all resources

**Fix**: Trigger FHIR sync
```bash
curl -X POST https://smartscheduling.vercel.app/api/sync
```

### Issue: HTTP instead of HTTPS in URLs

**Symptom**: Manifest URLs start with `http://` instead of `https://`

**Fix**: Already fixed in commit `24fb8eb` - uses `x-forwarded-proto` header

### Issue: Missing resourceType in NDJSON

**Symptom**: Rendeva validator fails with "resourceType field required"

**Fix**: Already fixed in commit `24fb8eb` - `cleanFHIRResource()` adds resourceType

### Issue: Non-FHIR fields in resources

**Symptom**: Resources contain `updatedAt`, `publisherUrl`, etc.

**Fix**: Already fixed in commit `24fb8eb` - these fields are stripped during NDJSON export

### Issue: State extension missing

**Symptom**: Slot output entry doesn't have `extension.state` array

**Fix**: State extension only appears when location data contains state information. Ensure sync has completed and locations have address.state populated.

## Manual Testing Commands

### Test Manifest Structure
```bash
curl -s https://smartscheduling.vercel.app/fhir/\$bulk-publish | jq .
```

### Test NDJSON Format (Location)
```bash
curl -s https://smartscheduling.vercel.app/fhir/data/locations.ndjson | head -n 1 | jq .
```

### Test NDJSON Format (Slot)
```bash
curl -s https://smartscheduling.vercel.app/fhir/data/slots.ndjson | head -n 1 | jq .
```

### Validate Schedule References
```bash
# Get all schedule references from slots
curl -s https://smartscheduling.vercel.app/fhir/data/slots.ndjson | jq -r '.schedule.reference' | sort | uniq | head -n 5

# Get all schedule IDs
curl -s https://smartscheduling.vercel.app/fhir/data/schedules.ndjson | jq -r '.id' | sort | head -n 5
```

### Count Resources
```bash
# Count slots
curl -s https://smartscheduling.vercel.app/fhir/data/slots.ndjson | wc -l

# Count locations
curl -s https://smartscheduling.vercel.app/fhir/data/locations.ndjson | wc -l
```

## Implementation Details

### FHIR Resource Cleaning

The server implements `cleanFHIRResource()` function in [server/routes.ts:674-681](../server/routes.ts) that:
1. Removes non-FHIR fields (updatedAt, publisherUrl, appointmentType, isVirtual)
2. Adds the `resourceType` field at the beginning
3. Preserves all standard FHIR fields (id, schedule, status, start, end, extension)

### HTTPS URL Generation

The bulk-publish endpoint uses `x-forwarded-proto` header to detect HTTPS in Vercel:
```typescript
const protocol = req.get('x-forwarded-proto') || req.protocol;
const host = req.get('host');
const baseUrl = `${protocol}://${host}`;
```

### State Extension

The state extension is dynamically generated by extracting unique state values from location addresses:
```typescript
const states = new Set<string>();
locations.forEach(location => {
  if (location.address?.state) {
    states.add(location.address.state);
  }
});

// Add to Slot output entry
{
  type: "Slot",
  url: `${baseUrl}/fhir/data/slots.ndjson`,
  count: slots.length,
  ...(states.size > 0 && {
    extension: { state: Array.from(states).sort() }
  })
}
```

## Next Steps

After passing Rendeva conformance:

1. **Test Client UI**: Use our UI to search and book appointments from Rendeva's dataset
2. **Submit to Connectathon**: Register endpoints with HL7 FHIR Connectathon 41
3. **Cross-Publisher Testing**: Test aggregation from 3+ publishers simultaneously
4. **Performance Testing**: Validate bulk data export performance with large datasets

## Support

For issues or questions:
- Check [CLAUDE.md](../CLAUDE.md) for architecture details
- Review [CONNECTATHON_GUIDE.md](./CONNECTATHON_GUIDE.md) for integration guide
- Open an issue on GitHub

## References

- [Rendeva Conformance Checker](https://www.rendeva.org/conformance)
- [Rendeva Dataset API](https://www.rendeva.org/api/datasets)
- [SMART Scheduling Links IG](http://hl7.org/fhir/uv/smart-scheduling-links/)
- [FHIR Bulk Data IG](http://hl7.org/fhir/uv/bulkdata/)
- [HL7 FHIR Connectathon 41](https://confluence.hl7.org/display/FHIR/2025-01+Patient+Scheduling)
