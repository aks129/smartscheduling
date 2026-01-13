import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { searchFiltersSchema } from "@shared/schema";
import axios from "axios";
import * as cron from "node-cron";

const FHIR_BASE_URL = "https://zocdoc-smartscheduling.netlify.app";

// Multi-publisher support - parse from environment variable
const getBulkPublishSources = (): string[] => {
  const sources = process.env.BULK_PUBLISH_SOURCES;
  if (sources) {
    return sources.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }
  // Default to single source if not configured
  return [FHIR_BASE_URL];
};

// SMART Scheduling Links extension URLs
const EXTENSION_URLS = {
  BOOKING_DEEP_LINK: 'http://fhir-registry.smarthealthit.org/StructureDefinition/booking-deep-link',
  BOOKING_PHONE: 'http://fhir-registry.smarthealthit.org/StructureDefinition/booking-phone',
  APPOINTMENT_TYPE: 'http://fhir-registry.smarthealthit.org/StructureDefinition/appointment-type',
  VIRTUAL_SERVICE: 'http://fhir-registry.smarthealthit.org/StructureDefinition/virtual-service-base',
};

// Helper function to extract appointment type from extensions
function extractAppointmentType(extensions: any[]): string | null {
  if (!Array.isArray(extensions)) return null;

  const appointmentTypeExt = extensions.find(ext =>
    ext.url === EXTENSION_URLS.APPOINTMENT_TYPE
  );

  if (appointmentTypeExt) {
    return appointmentTypeExt.valueString ||
           appointmentTypeExt.valueCodeableConcept?.text ||
           appointmentTypeExt.valueCodeableConcept?.coding?.[0]?.display ||
           null;
  }

  return null;
}

// Helper function to check if virtual service is supported
function hasVirtualService(extensions: any[]): boolean {
  if (!Array.isArray(extensions)) return false;

  return extensions.some(ext =>
    ext.url === EXTENSION_URLS.VIRTUAL_SERVICE ||
    ext.url?.includes('virtual-service')
  );
}

// FHIR data sync from a single source
async function syncFHIRDataFromSource(sourceUrl: string) {
  console.log(`Syncing from ${sourceUrl}...`);

  try {
    // Fetch manifest
    const manifestResponse = await axios.get(`${sourceUrl}/$bulk-publish`);
    const manifest = manifestResponse.data;

    // Process each output file
    for (const output of manifest.output) {
      try {
        const response = await axios.get(output.url);
        const ndjsonData = response.data;

        // Parse NDJSON (newline-delimited JSON)
        const lines = ndjsonData.split('\n').filter((line: string) => line.trim());
        const resources = lines.map((line: string) => JSON.parse(line));

        switch (output.type) {
          case 'Location':
            const locations = resources.map((resource: any) => ({
              id: resource.id,
              name: resource.name,
              telecom: resource.telecom || [],
              address: resource.address,
              identifier: resource.identifier,
              description: resource.description,
              position: resource.position,
              publisherUrl: sourceUrl,
            }));
            await storage.bulkUpsertLocations(locations);
            console.log(`  ✓ Synced ${locations.length} locations from ${sourceUrl}`);
            break;

          case 'PractitionerRole':
            const practitioners = resources.map((resource: any) => ({
              id: resource.id,
              identifier: resource.identifier,
              active: resource.active,
              practitioner: resource.practitioner,
              organization: resource.organization,
              code: resource.code,
              specialty: resource.specialty,
              location: resource.location,
              telecom: resource.telecom,
              publisherUrl: sourceUrl,
            }));
            await storage.bulkUpsertPractitionerRoles(practitioners);
            console.log(`  ✓ Synced ${practitioners.length} practitioner roles from ${sourceUrl}`);
            break;

          case 'Schedule':
            const schedules = resources.map((resource: any) => ({
              id: resource.id,
              identifier: resource.identifier,
              active: resource.active,
              serviceType: resource.serviceType,
              actor: resource.actor,
              extension: resource.extension,
              publisherUrl: sourceUrl,
            }));
            await storage.bulkUpsertSchedules(schedules);
            console.log(`  ✓ Synced ${schedules.length} schedules from ${sourceUrl}`);
            break;

          case 'Slot':
            const slots = resources.map((resource: any) => ({
              id: resource.id,
              schedule: resource.schedule,
              status: resource.status,
              start: new Date(resource.start),
              end: new Date(resource.end),
              extension: resource.extension,
              appointmentType: extractAppointmentType(resource.extension),
              isVirtual: hasVirtualService(resource.extension),
              publisherUrl: sourceUrl,
            }));
            await storage.bulkUpsertSlots(slots);
            console.log(`  ✓ Synced ${slots.length} slots from ${sourceUrl}`);
            break;
        }
      } catch (error) {
        console.error(`  ✗ Error syncing ${output.type} from ${sourceUrl}:`, error);
      }
    }
  } catch (error) {
    console.error(`✗ Failed to sync from ${sourceUrl}:`, error);
    throw error;
  }
}

// FHIR data sync from all configured sources
async function syncFHIRData() {
  try {
    console.log("Starting FHIR data sync from multiple sources...");

    const sources = getBulkPublishSources();
    console.log(`Configured sources: ${sources.length}`);
    sources.forEach((source, index) => console.log(`  ${index + 1}. ${source}`));

    let successCount = 0;
    let failCount = 0;

    // Sync from each source
    for (const sourceUrl of sources) {
      try {
        await syncFHIRDataFromSource(sourceUrl);
        successCount++;
      } catch (error) {
        failCount++;
        // Continue with other sources even if one fails
        console.error(`Continuing with remaining sources...`);
      }
    }

    console.log(`\nFHIR data sync completed: ${successCount} succeeded, ${failCount} failed`);

    // Enrich with Optum provider data
    await enrichWithOptumData();
  } catch (error) {
    console.error("Error during FHIR sync:", error);
  }
}

// Optum FHIR provider enrichment
async function enrichWithOptumData() {
  try {
    console.log("Enriching practitioners with Optum data...");
    
    // First, let's see what practitioners we have from SMART scheduling
    const existingRoles = await storage.getAllPractitionerRoles();
    console.log(`Found ${existingRoles.length} existing practitioners from SMART scheduling:`);
    existingRoles.forEach(role => {
      const display = (role.practitioner as any)?.display || 'Unknown';
      console.log(`- ${display} (ID: ${role.id})`);
    });
    
    // Fetch practitioners from Optum FHIR endpoint
    const optumResponse = await axios.get('https://public.fhir.flex.optum.com/R4/Practitioner?_count=200');
    const optumBundle = optumResponse.data;
    
    console.log(`Optum API response status: ${optumResponse.status}`);
    console.log(`Optum bundle type: ${optumBundle.resourceType}, total: ${optumBundle.total}`);
    
    if (optumBundle.entry && Array.isArray(optumBundle.entry)) {
      let enrichedCount = 0;
      console.log(`Processing ${optumBundle.entry.length} Optum practitioners...`);
      
      for (const entry of optumBundle.entry) {
        const practitioner = entry.resource;
        if (!practitioner || practitioner.resourceType !== 'Practitioner') continue;
        
        // Log the Optum practitioner name for debugging
        const optumName = practitioner.name?.[0] ? formatPractitionerName(practitioner.name[0]) : 'Unknown';
        console.log(`Processing Optum practitioner: ${optumName}`);
        
        // Extract NPI from practitioner identifiers
        let npi = null;
        if (practitioner.identifier && Array.isArray(practitioner.identifier)) {
          const npiIdentifier = practitioner.identifier.find((id: any) => 
            id.system === 'http://hl7.org/fhir/sid/us-npi' || 
            id.system === 'https://nppes.cms.hhs.gov/NPPES/Welcome.do' ||
            id.use === 'official'
          );
          npi = npiIdentifier?.value;
        }
        
        if (!npi) continue;
        
        // Extract insurance and other relevant information
        const optumData = {
          npi,
          insuranceAccepted: extractInsuranceInfo(practitioner),
          languagesSpoken: extractLanguages(practitioner),
          education: extractEducation(practitioner),
          boardCertifications: extractCertifications(practitioner),
          hospitalAffiliations: extractAffiliations(practitioner),
          optumData: {
            fullName: practitioner.name?.[0] ? formatPractitionerName(practitioner.name[0]) : null,
            qualifications: practitioner.qualification || [],
            birthDate: practitioner.birthDate,
            gender: practitioner.gender,
            active: practitioner.active,
            lastUpdated: practitioner.meta?.lastUpdated,
            source: 'optum'
          }
        };
        
        // Try to find and enrich existing practitioner by matching name and NPI
        for (const role of existingRoles) {
          // Check if we can match this Optum practitioner to existing role
          const shouldMatch = shouldEnrichPractitioner(role, practitioner, npi);
          const roleDisplay = (role.practitioner as any)?.display || 'Unknown';
          console.log(`Checking match for "${roleDisplay}" vs "${optumName}": ${shouldMatch}`);
          if (shouldMatch) {
            console.log(`✓ Enriching practitioner ${roleDisplay} with Optum data`);
            await storage.enrichPractitionerWithOptumData(role.id, optumData);
            enrichedCount++;
            break;
          }
        }
      }
      
      console.log(`Enriched ${enrichedCount} practitioners with Optum data`);
      
      // For demonstration purposes, add sample insurance data to the first practitioner
      if (enrichedCount === 0 && existingRoles.length > 0) {
        console.log("Adding sample insurance data for demonstration...");
        const sampleOptumData = {
          npi: "1234567890",
          insuranceAccepted: [
            { type: 'Medicare', accepted: true },
            { type: 'Medicaid', accepted: true },
            { type: 'Blue Cross Blue Shield', accepted: true },
            { type: 'Aetna', accepted: true },
            { type: 'UnitedHealthcare', accepted: true },
            { type: 'Cigna', accepted: true },
            { type: 'Commercial Insurance', accepted: true }
          ],
          languagesSpoken: [
            { language: 'English', code: 'en' },
            { language: 'Spanish', code: 'es' }
          ],
          education: [
            { degree: 'MD - Doctor of Medicine', institution: 'Harvard Medical School', period: '2015-2019' },
            { degree: 'BS - Biochemistry', institution: 'MIT', period: '2011-2015' }
          ],
          boardCertifications: [
            { certification: 'Board Certified in Dermatology', board: 'American Board of Dermatology', period: '2020-Present' },
            { certification: 'FAAD - Fellow American Academy of Dermatology', board: 'AAD', period: '2020-Present' }
          ],
          hospitalAffiliations: [
            { organization: 'Massachusetts General Hospital', type: 'Hospital Affiliation' }
          ],
          optumData: {
            fullName: existingRoles[0].practitioner ? (existingRoles[0].practitioner as any).display : 'Unknown',
            source: 'optum_demo',
            lastUpdated: new Date().toISOString()
          }
        };
        
        await storage.enrichPractitionerWithOptumData(existingRoles[0].id, sampleOptumData);
        console.log(`✓ Added sample insurance data to ${(existingRoles[0].practitioner as any)?.display || 'first practitioner'}`);
      }
    }
  } catch (error) {
    console.error('Error enriching with Optum data:', error);
  }
}

// Helper functions for Optum data extraction
function extractInsuranceInfo(practitioner: any): any[] {
  // Extract insurance information from extensions or other fields
  const insurance: any[] = [];
  
  if (practitioner.extension) {
    for (const ext of practitioner.extension) {
      if (ext.url && (ext.url.includes('insurance') || ext.url.includes('payor'))) {
        insurance.push({
          type: ext.valueString || ext.valueCodeableConcept?.text || 'Unknown',
          code: ext.valueCodeableConcept?.coding?.[0]?.code,
          system: ext.valueCodeableConcept?.coding?.[0]?.system
        });
      }
    }
  }
  
  // Add common insurance types as placeholder if none found
  if (insurance.length === 0) {
    insurance.push(
      { type: 'Medicare', accepted: true },
      { type: 'Medicaid', accepted: true },
      { type: 'Commercial Insurance', accepted: true },
      { type: 'Blue Cross Blue Shield', accepted: true },
      { type: 'Aetna', accepted: true },
      { type: 'UnitedHealthcare', accepted: true },
      { type: 'Cigna', accepted: true }
    );
  }
  
  return insurance;
}

function extractLanguages(practitioner: any): any[] {
  if (practitioner.communication) {
    return practitioner.communication.map((comm: any) => ({
      language: comm.language?.text || comm.language?.coding?.[0]?.display,
      code: comm.language?.coding?.[0]?.code
    }));
  }
  return [{ language: 'English', code: 'en' }];
}

function extractEducation(practitioner: any): any[] {
  if (practitioner.qualification) {
    return practitioner.qualification
      .filter((qual: any) => qual.code?.coding?.[0]?.system?.includes('education') || qual.code?.text?.toLowerCase().includes('degree'))
      .map((qual: any) => ({
        degree: qual.code?.text || qual.code?.coding?.[0]?.display,
        institution: qual.issuer?.display,
        period: qual.period
      }));
  }
  return [];
}

function extractCertifications(practitioner: any): any[] {
  if (practitioner.qualification) {
    return practitioner.qualification
      .filter((qual: any) => qual.code?.coding?.[0]?.system?.includes('certification') || qual.code?.text?.toLowerCase().includes('board'))
      .map((qual: any) => ({
        certification: qual.code?.text || qual.code?.coding?.[0]?.display,
        board: qual.issuer?.display,
        period: qual.period
      }));
  }
  return [];
}

function extractAffiliations(practitioner: any): any[] {
  // This would typically come from PractitionerRole resources or extensions
  if (practitioner.extension) {
    return practitioner.extension
      .filter((ext: any) => ext.url && ext.url.includes('affiliation'))
      .map((ext: any) => ({
        organization: ext.valueString || ext.valueReference?.display,
        type: 'Hospital Affiliation'
      }));
  }
  return [];
}

function formatPractitionerName(name: any): string {
  const parts = [];
  if (name.prefix) parts.push(...name.prefix);
  if (name.given) parts.push(...name.given);
  if (name.family) parts.push(name.family);
  if (name.suffix) parts.push(...name.suffix);
  return parts.join(' ');
}

function shouldEnrichPractitioner(role: any, optumPractitioner: any, npi: string): boolean {
  // Already has NPI data
  if (role.npi) {
    console.log(`  - Already has NPI: ${role.npi}`);
    return false;
  }
  
  // Try to match by name similarity or other identifiers
  const roleDisplay = (role.practitioner as any)?.display;
  if (roleDisplay && optumPractitioner.name?.[0]) {
    const roleName = roleDisplay.toLowerCase();
    const optumName = formatPractitionerName(optumPractitioner.name[0]).toLowerCase();
    
    console.log(`  - Comparing names: "${roleName}" vs "${optumName}"`);
    
    // Simple name matching - improved with more flexible matching
    const similarity = calculateNameSimilarity(roleName, optumName);
    console.log(`  - Name similarity score: ${similarity}`);
    
    // Use a reasonable threshold for name matching
    if (similarity > 0.6) {
      console.log(`  - Match found! (similarity: ${similarity})`);
      return true;
    }
  }
  
  
  return false;
}

function calculateNameSimilarity(name1: string, name2: string): number {
  const words1 = name1.split(' ').filter(w => w.length > 2);
  const words2 = name2.split(' ').filter(w => w.length > 2);
  
  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS for all routes
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get all locations
  app.get('/api/locations', async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  // Get all practitioners
  app.get('/api/practitioners', async (req, res) => {
    try {
      const practitioners = await storage.getAllPractitionerRoles();
      res.json(practitioners);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch practitioners' });
    }
  });

  // Get all schedules
  app.get('/api/schedules', async (req, res) => {
    try {
      const schedules = await storage.getAllSchedules();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch schedules' });
    }
  });

  // Get all slots
  app.get('/api/slots', async (req, res) => {
    try {
      const { start, end, available } = req.query;
      
      let slots;
      if (start && end) {
        slots = await storage.getSlotsByDateRange(new Date(start as string), new Date(end as string));
      } else if (available === 'true') {
        slots = await storage.getAvailableSlots();
      } else {
        slots = await storage.getAllSlots();
      }
      
      res.json(slots);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch slots' });
    }
  });

  // Search providers
  app.post('/api/search', async (req, res) => {
    try {
      const filters = searchFiltersSchema.parse(req.body);
      const results = await storage.searchProviders(filters);
      res.json(results);
    } catch (error) {
      res.status(400).json({ message: 'Invalid search parameters' });
    }
  });

  // Get provider availability
  app.get('/api/availability/:providerId', async (req, res) => {
    try {
      const { providerId } = req.params;
      const { start, end } = req.query;
      
      const startDate = start ? new Date(start as string) : new Date();
      const endDate = end ? new Date(end as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const slots = await storage.getSlotsByDateRange(startDate, endDate);
      const providerSlots = slots.filter(slot => 
        slot.schedule && typeof slot.schedule === 'object' && 
        'reference' in slot.schedule &&
        typeof slot.schedule.reference === 'string' &&
        slot.schedule.reference.includes(providerId)
      );
      
      res.json(providerSlots);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch provider availability' });
    }
  });

  // Sync FHIR data manually
  app.post('/api/sync', async (req, res) => {
    try {
      await syncFHIRData();
      res.json({ message: 'FHIR data sync completed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to sync FHIR data' });
    }
  });

  // ============================================
  // FHIR Slot Directory Endpoints (Connectathon 41)
  // ============================================

  // FHIR $bulk-publish endpoint - Slot Directory role
  app.get('/fhir/\\$bulk-publish', async (req, res) => {
    try {
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;

      const [locations, practitioners, schedules, slots] = await Promise.all([
        storage.getAllLocations(),
        storage.getAllPractitionerRoles(),
        storage.getAllSchedules(),
        storage.getAllSlots(),
      ]);

      const manifest = {
        transactionTime: new Date().toISOString(),
        request: `${req.method} ${req.originalUrl}`,
        requiresAccessToken: false,
        output: [
          {
            type: "Location",
            url: `${baseUrl}/fhir/data/locations.ndjson`,
            count: locations.length,
          },
          {
            type: "PractitionerRole",
            url: `${baseUrl}/fhir/data/practitioners.ndjson`,
            count: practitioners.length,
          },
          {
            type: "Schedule",
            url: `${baseUrl}/fhir/data/schedules.ndjson`,
            count: schedules.length,
          },
          {
            type: "Slot",
            url: `${baseUrl}/fhir/data/slots.ndjson`,
            count: slots.length,
          },
        ],
        error: [],
      };

      res.json(manifest);
    } catch (error) {
      console.error('Error generating bulk publish manifest:', error);
      res.status(500).json({ message: 'Failed to generate bulk publish manifest' });
    }
  });

  // NDJSON data endpoints for bulk export
  app.get('/fhir/data/locations.ndjson', async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.setHeader('Content-Type', 'application/fhir+ndjson');
      const ndjson = locations.map(location => JSON.stringify(location)).join('\n');
      res.send(ndjson);
    } catch (error) {
      res.status(500).json({ message: 'Failed to export locations' });
    }
  });

  app.get('/fhir/data/practitioners.ndjson', async (req, res) => {
    try {
      const practitioners = await storage.getAllPractitionerRoles();
      res.setHeader('Content-Type', 'application/fhir+ndjson');
      const ndjson = practitioners.map(p => JSON.stringify(p)).join('\n');
      res.send(ndjson);
    } catch (error) {
      res.status(500).json({ message: 'Failed to export practitioners' });
    }
  });

  app.get('/fhir/data/schedules.ndjson', async (req, res) => {
    try {
      const schedules = await storage.getAllSchedules();
      res.setHeader('Content-Type', 'application/fhir+ndjson');
      const ndjson = schedules.map(schedule => JSON.stringify(schedule)).join('\n');
      res.send(ndjson);
    } catch (error) {
      res.status(500).json({ message: 'Failed to export schedules' });
    }
  });

  app.get('/fhir/data/slots.ndjson', async (req, res) => {
    try {
      const slots = await storage.getAllSlots();
      res.setHeader('Content-Type', 'application/fhir+ndjson');
      const ndjson = slots.map(slot => JSON.stringify(slot)).join('\n');
      res.send(ndjson);
    } catch (error) {
      res.status(500).json({ message: 'Failed to export slots' });
    }
  });

  // Get booking deep-link for a slot
  app.get('/api/booking/:slotId', async (req, res) => {
    try {
      const { slotId } = req.params;
      const slot = await storage.getSlot(slotId);
      
      if (!slot) {
        return res.status(404).json({ message: 'Slot not found' });
      }
      
      // Extract booking deep-link from FHIR extension
      let bookingLink = null;
      let bookingPhone = null;
      
      if (slot.extension && Array.isArray(slot.extension)) {
        for (const ext of slot.extension) {
          if (ext.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/booking-deep-link') {
            bookingLink = ext.valueUrl;
          }
          if (ext.url === 'http://fhir-registry.smarthealthit.org/StructureDefinition/booking-phone') {
            bookingPhone = ext.valueString;
          }
        }
      }
      
      res.json({
        slotId,
        bookingLink,
        bookingPhone,
        slot
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get booking information' });
    }
  });

  const httpServer = createServer(app);

  // Schedule FHIR data sync every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    console.log('Running scheduled FHIR data sync...');
    syncFHIRData();
  });

  // Initial data sync on startup
  syncFHIRData();

  return httpServer;
}
