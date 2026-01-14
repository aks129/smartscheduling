# Touchstone Integration for Connectathon 41

**AEGIS Touchstone** provides a testing and monitoring platform for HL7 FHIR Connectathon participants. By routing requests through the Touchstone proxy, all message exchanges are tracked and quantified, allowing AEGIS to monitor Connectathon participation and validate implementations.

---

## Overview

### What is Touchstone?

Touchstone is AEGIS's cloud-based FHIR testing platform that:
- **Tracks message exchanges** during Connectathon testing
- **Quantifies participation** by counting requests/responses
- **Validates FHIR compliance** in real-time
- **Provides test reports** for certification
- **Records interactions** for audit and debugging

### Why Use the Touchstone Proxy?

For **HL7 FHIR Connectathon 41**, using the Touchstone proxy URL instead of direct data source URLs enables:

1. ✅ **Automatic message tracking** - All FHIR requests logged
2. ✅ **Participation quantification** - Connectathon activity counted
3. ✅ **Compliance validation** - Real-time FHIR validation
4. ✅ **Test verification** - Proof of Connectathon testing
5. ✅ **Debugging support** - Message history available for troubleshooting

---

## Touchstone Proxy Configuration

### Proxy URL Format

**IMPORTANT**: Verify the exact Touchstone proxy URL with AEGIS before Connectathon testing. The format may vary based on your registration.

Example format:
```
https://touchstone.aegis.net:53955/api/datasets/{dataset-id}/$bulk-publish
```

**Alternative format** (if above doesn't work):
```
https://touchstone.aegis.net:{port}/fhir/{your-identifier}/$bulk-publish
```

### Available Datasets

| Dataset ID | Description | Example Proxy URL |
|-----------|-------------|-------------------|
| `smart-aligned` | SMART Scheduling test data | `https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish` |

**Note**: Contact AEGIS Touchstone support to obtain your specific proxy URL for Connectathon 41.

---

## Configuration

### Environment Setup

Update your `.env` file to use the Touchstone proxy:

```bash
# Touchstone proxy for Connectathon 41 message tracking
BULK_PUBLISH_SOURCES=https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish

# Optional: Add additional sources
# BULK_PUBLISH_SOURCES=https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish,https://zocdoc-smartscheduling-api.netlify.app
```

### For Vercel Deployment

Set the environment variable in Vercel dashboard:

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add/update `BULK_PUBLISH_SOURCES`:
   ```
   https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish
   ```
4. Redeploy the application

---

## Testing with Touchstone

### 1. Verify Proxy Connectivity

Test the Touchstone proxy endpoint:

```bash
curl -s https://touchstone.aegis.net:53955/api/datasets/smart-aligned/\$bulk-publish | jq .
```

Expected response structure:
```json
{
  "transactionTime": "2025-12-21T00:00:00Z",
  "request": "...",
  "output": [
    {
      "type": "Location",
      "url": "https://patient-scheduling-app.vercel.app/api/datasets/smart-aligned/Location.ndjson"
    },
    ...
  ]
}
```

### 2. Configure Application

Update environment and restart:

```bash
# Set environment variable
export BULK_PUBLISH_SOURCES=https://touchstone.aegis.net:53955/api/datasets/smart-aligned/\$bulk-publish

# For Vercel (set in dashboard or use CLI)
vercel env add BULK_PUBLISH_SOURCES
```

### 3. Trigger Data Sync

Sync data through Touchstone proxy:

```bash
curl -X POST https://smartscheduling.vercel.app/api/sync
```

This will:
1. Request manifest from Touchstone proxy
2. Download NDJSON files through proxy
3. Parse and store FHIR resources
4. **All requests logged by Touchstone** ✅

### 4. Verify Data Source

Check that data came through Touchstone:

```bash
# Check publisherUrl field
curl -s https://smartscheduling.vercel.app/api/practitioners | jq '.[0].publisherUrl'
```

Expected output:
```
"https://touchstone.aegis.net:53955/api/datasets/smart-aligned"
```

---

## Message Tracking

### What Gets Tracked

When using the Touchstone proxy, AEGIS tracks:

1. **Manifest Requests**
   - GET `/$bulk-publish`
   - Response time, status code, payload size

2. **NDJSON File Downloads**
   - GET `/Location.ndjson`
   - GET `/PractitionerRole.ndjson`
   - GET `/Schedule.ndjson`
   - GET `/Slot.ndjson`

3. **Resource Counts**
   - Number of resources fetched
   - Types of resources accessed
   - Timestamp of each request

4. **Client Identification**
   - IP address
   - User-Agent header
   - Request origin

### View Your Test Results

Access Touchstone test reports at:
```
https://touchstone.aegis.net
```

Login with your Connectathon credentials to view:
- Message exchange logs
- Compliance validation results
- Test scenario completion status
- Performance metrics

---

## Multi-Source Configuration

### Combining Touchstone with Other Sources

You can aggregate data from multiple sources, including Touchstone:

```bash
BULK_PUBLISH_SOURCES=https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish,https://zocdoc-smartscheduling-api.netlify.app,https://smart-scheduling-defacto.s3.us-east-2.amazonaws.com/public
```

**Benefits:**
- ✅ Touchstone tracks your test activity
- ✅ Additional sources provide more data variety
- ✅ Demonstrates multi-publisher aggregation capability
- ✅ All sources tagged with `publisherUrl` for provenance

**Example provenance tracking:**
```bash
curl -s https://smartscheduling.vercel.app/api/practitioners | jq -r '.[].publisherUrl' | sort | uniq
```

Output:
```
https://touchstone.aegis.net:53955/api/datasets/smart-aligned
https://zocdoc-smartscheduling-api.netlify.app
https://smart-scheduling-defacto.s3.us-east-2.amazonaws.com/public
```

---

## Connectathon Scenarios

### Scenario 1: Bulk Publish Manifest (Slot Directory Role)

**Using Touchstone:**
1. Configure proxy URL in environment
2. Trigger sync: `POST /api/sync`
3. Access manifest: `GET /fhir/$bulk-publish`
4. ✅ Touchstone logs all requests

**Validation:**
- Manifest structure correct
- NDJSON files accessible
- Resources FHIR-compliant
- **Logged in Touchstone** ✅

### Scenario 3: Basic Slot Discovery (Client Role)

**Using Touchstone:**
1. Sync data through Touchstone proxy
2. Search for providers via UI
3. Filter by specialty, location, dates
4. View available slots
5. ✅ All data sourced from Touchstone

**Validation:**
- Slot resources valid
- Schedule references resolve
- Booking extensions present
- **Data from Touchstone** ✅

### Scenario 4: Complex Filtering (Client Role)

**Using Touchstone:**
1. Use search filters in UI:
   - Specialty: "Dermatology"
   - Location: "Boston"
   - Insurance: "Medicare"
   - Languages: "Spanish"
2. Backend queries Touchstone data
3. ✅ Demonstrates client capabilities

**Validation:**
- Filters work correctly
- Results accurate
- Data from Touchstone proxy
- **Usage tracked** ✅

---

## Troubleshooting

### Issue: Connection Timeout

**Symptom:**
```
Error: ETIMEDOUT connecting to touchstone.aegis.net:53955
```

**Solutions:**
1. Check firewall allows HTTPS on port 53955
2. Verify network connectivity
3. Try direct connection:
   ```bash
   curl -v https://touchstone.aegis.net:53955/api/datasets/smart-aligned/\$bulk-publish
   ```
4. Contact AEGIS support if persistent

### Issue: SSL Certificate Error

**Symptom:**
```
Error: self signed certificate in certificate chain
```

**Solution:**
This is expected for Touchstone proxy. The server code already handles this correctly.

### Issue: Data Not Syncing

**Symptom:**
- Sync completes but no data
- `publisherUrl` doesn't show Touchstone

**Solutions:**
1. Verify environment variable set:
   ```bash
   echo $BULK_PUBLISH_SOURCES
   ```
2. Check server logs for sync errors
3. Manually test proxy URL:
   ```bash
   curl -s https://touchstone.aegis.net:53955/api/datasets/smart-aligned/\$bulk-publish
   ```
4. Restart server after changing environment

### Issue: Wrong publisherUrl

**Symptom:**
- `publisherUrl` shows different source
- Data not from Touchstone

**Solution:**
Clear existing data and re-sync:
```bash
# Restart server (clears in-memory storage)
# Then trigger sync
curl -X POST https://smartscheduling.vercel.app/api/sync
```

---

## Validation Checklist

Before submitting Connectathon results:

- [ ] Touchstone proxy URL configured in `BULK_PUBLISH_SOURCES`
- [ ] Data synced successfully through Touchstone
- [ ] `publisherUrl` field shows Touchstone URL
- [ ] Can access Touchstone test reports
- [ ] Message exchanges logged in Touchstone
- [ ] All test scenarios completed
- [ ] FHIR validation passed in Touchstone
- [ ] Test report generated

---

## Best Practices

### For Connectathon Testing

1. **Use Touchstone proxy exclusively** during official testing
   ```bash
   BULK_PUBLISH_SOURCES=https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish
   ```

2. **Keep proxy URL first** if using multiple sources
   ```bash
   BULK_PUBLISH_SOURCES=https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish,https://other-source.com
   ```

3. **Sync regularly** to generate activity
   ```bash
   # Schedule periodic syncs
   */30 * * * * curl -X POST https://smartscheduling.vercel.app/api/sync
   ```

4. **Monitor Touchstone dashboard** for real-time results

### For Development/Testing

1. **Use direct sources** for faster development
   ```bash
   BULK_PUBLISH_SOURCES=https://zocdoc-smartscheduling-api.netlify.app
   ```

2. **Switch to Touchstone** before Connectathon
3. **Test with Touchstone** at least 24 hours before event
4. **Verify tracking** by checking Touchstone dashboard

---

## Implementation Details

### How It Works

1. **Environment Variable Processing**
   ```typescript
   // server/routes.ts
   const sources = process.env.BULK_PUBLISH_SOURCES?.split(',') || [defaultSource];
   ```

2. **Sync Through Proxy**
   ```typescript
   // For each source in BULK_PUBLISH_SOURCES
   await syncFHIRDataFromSource(source, storage);
   // Touchstone logs this request
   ```

3. **Provenance Tracking**
   ```typescript
   // Each resource tagged with publisherUrl
   resource.publisherUrl = "https://touchstone.aegis.net:53955/api/datasets/smart-aligned";
   ```

4. **Data Retrieval**
   - All NDJSON URLs come from Touchstone manifest
   - Downloads go through Touchstone
   - Every request logged

---

## Support and Resources

### AEGIS Touchstone

- **Website**: https://touchstone.aegis.net
- **Documentation**: https://touchstone.aegis.net/touchstone/userguide/
- **Support**: support@aegis.net

### Connectathon 41

- **Track**: Patient Scheduling
- **Implementation Guide**: SMART Scheduling Links IG
- **Confluence**: https://confluence.hl7.org/display/FHIR/2025-01+Patient+Scheduling

### Our Documentation

- **Testing Guide**: [RENDEVA_TESTING.md](RENDEVA_TESTING.md)
- **Test Results**: [CONFORMANCE_TEST_RESULTS.md](CONFORMANCE_TEST_RESULTS.md)
- **Architecture**: [../CLAUDE.md](../CLAUDE.md)

---

## Example: Complete Touchstone Setup

### Step-by-Step

1. **Update Environment**
   ```bash
   # .env file
   BULK_PUBLISH_SOURCES=https://touchstone.aegis.net:53955/api/datasets/smart-aligned/$bulk-publish
   ```

2. **Deploy to Vercel**
   ```bash
   vercel env add BULK_PUBLISH_SOURCES production
   # Enter the Touchstone URL when prompted
   vercel --prod
   ```

3. **Trigger Initial Sync**
   ```bash
   curl -X POST https://smartscheduling.vercel.app/api/sync
   ```

4. **Verify Data Source**
   ```bash
   curl -s https://smartscheduling.vercel.app/api/practitioners | jq '.[0].publisherUrl'
   # Should output: "https://touchstone.aegis.net:53955/api/datasets/smart-aligned"
   ```

5. **Test UI**
   - Visit: https://smartscheduling.vercel.app
   - Search for providers
   - Filter by specialty, location
   - View slots and booking links

6. **Check Touchstone**
   - Login to https://touchstone.aegis.net
   - View test results
   - Verify message exchanges logged
   - Download test report

7. **Submit to Connectathon**
   - Provide Touchstone test report
   - Submit endpoint URLs
   - Document test scenarios completed

---

## Conclusion

Using the **AEGIS Touchstone proxy** for Connectathon 41 ensures:

✅ **All testing activity is tracked**
✅ **FHIR compliance validated in real-time**
✅ **Participation quantified and documented**
✅ **Test results available for certification**
✅ **Full audit trail of message exchanges**

Configure your application with the Touchstone proxy URL to maximize Connectathon success and receive comprehensive test validation.

**Ready for Connectathon 41!** 🎉
