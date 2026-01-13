import { type Location, type InsertLocation, type PractitionerRole, type InsertPractitionerRole, type Schedule, type InsertSchedule, type Slot, type InsertSlot, type SearchFilters } from "@shared/schema";
import { db } from "./db";
import { locations, practitionerRoles, schedules, slots } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // Location operations
  getLocation(id: string): Promise<Location | undefined>;
  getAllLocations(): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: string): Promise<boolean>;

  // PractitionerRole operations
  getPractitionerRole(id: string): Promise<PractitionerRole | undefined>;
  getAllPractitionerRoles(): Promise<PractitionerRole[]>;
  createPractitionerRole(role: InsertPractitionerRole): Promise<PractitionerRole>;
  updatePractitionerRole(id: string, role: Partial<InsertPractitionerRole>): Promise<PractitionerRole | undefined>;
  deletePractitionerRole(id: string): Promise<boolean>;

  // Schedule operations
  getSchedule(id: string): Promise<Schedule | undefined>;
  getAllSchedules(): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: string): Promise<boolean>;

  // Slot operations
  getSlot(id: string): Promise<Slot | undefined>;
  getAllSlots(): Promise<Slot[]>;
  getSlotsByDateRange(startDate: Date, endDate: Date): Promise<Slot[]>;
  getAvailableSlots(startDate?: Date, endDate?: Date): Promise<Slot[]>;
  createSlot(slot: InsertSlot): Promise<Slot>;
  updateSlot(id: string, slot: Partial<InsertSlot>): Promise<Slot | undefined>;
  deleteSlot(id: string): Promise<boolean>;

  // Search operations
  searchProviders(filters: SearchFilters): Promise<{
    practitioners: PractitionerRole[];
    locations: Location[];
    availableSlots: Slot[];
  }>;

  // Bulk operations for FHIR sync
  bulkUpsertLocations(locations: InsertLocation[]): Promise<Location[]>;
  bulkUpsertPractitionerRoles(roles: InsertPractitionerRole[]): Promise<PractitionerRole[]>;
  bulkUpsertSchedules(schedules: InsertSchedule[]): Promise<Schedule[]>;
  bulkUpsertSlots(slots: InsertSlot[]): Promise<Slot[]>;
}

export class MemStorage implements IStorage {
  private locations: Map<string, Location>;
  private practitionerRoles: Map<string, PractitionerRole>;
  private schedules: Map<string, Schedule>;
  private slots: Map<string, Slot>;

  constructor() {
    this.locations = new Map();
    this.practitionerRoles = new Map();
    this.schedules = new Map();
    this.slots = new Map();
  }

  // Location operations
  async getLocation(id: string): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const location: Location = { 
      ...insertLocation, 
      updatedAt: new Date(),
      description: insertLocation.description || null,
      identifier: insertLocation.identifier || null,
      position: insertLocation.position || null
    };
    this.locations.set(location.id, location);
    return location;
  }

  async updateLocation(id: string, updates: Partial<InsertLocation>): Promise<Location | undefined> {
    const existing = this.locations.get(id);
    if (!existing) return undefined;
    const updated: Location = { ...existing, ...updates, updatedAt: new Date() };
    this.locations.set(id, updated);
    return updated;
  }

  async deleteLocation(id: string): Promise<boolean> {
    return this.locations.delete(id);
  }

  // PractitionerRole operations
  async getPractitionerRole(id: string): Promise<PractitionerRole | undefined> {
    return this.practitionerRoles.get(id);
  }

  async getAllPractitionerRoles(): Promise<PractitionerRole[]> {
    return Array.from(this.practitionerRoles.values());
  }

  async createPractitionerRole(insertRole: InsertPractitionerRole): Promise<PractitionerRole> {
    const role: PractitionerRole = { 
      ...insertRole, 
      updatedAt: new Date(),
      identifier: insertRole.identifier || null,
      active: insertRole.active ?? true,
      organization: insertRole.organization || null,
      telecom: insertRole.telecom || null,
      npi: insertRole.npi || null,
      insuranceAccepted: insertRole.insuranceAccepted || null,
      optumData: insertRole.optumData || null,
      languagesSpoken: insertRole.languagesSpoken || null,
      education: insertRole.education || null,
      boardCertifications: insertRole.boardCertifications || null,
      hospitalAffiliations: insertRole.hospitalAffiliations || null
    };
    this.practitionerRoles.set(role.id, role);
    return role;
  }

  async updatePractitionerRole(id: string, updates: Partial<InsertPractitionerRole>): Promise<PractitionerRole | undefined> {
    const existing = this.practitionerRoles.get(id);
    if (!existing) return undefined;
    const updated: PractitionerRole = { ...existing, ...updates, updatedAt: new Date() };
    this.practitionerRoles.set(id, updated);
    return updated;
  }

  async deletePractitionerRole(id: string): Promise<boolean> {
    return this.practitionerRoles.delete(id);
  }

  // Schedule operations
  async getSchedule(id: string): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  async getAllSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values());
  }

  async createSchedule(insertSchedule: InsertSchedule): Promise<Schedule> {
    const schedule: Schedule = { 
      ...insertSchedule, 
      updatedAt: new Date(),
      identifier: insertSchedule.identifier || null,
      active: insertSchedule.active ?? true,
      extension: insertSchedule.extension || null
    };
    this.schedules.set(schedule.id, schedule);
    return schedule;
  }

  async updateSchedule(id: string, updates: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const existing = this.schedules.get(id);
    if (!existing) return undefined;
    const updated: Schedule = { ...existing, ...updates, updatedAt: new Date() };
    this.schedules.set(id, updated);
    return updated;
  }

  async deleteSchedule(id: string): Promise<boolean> {
    return this.schedules.delete(id);
  }

  // Slot operations
  async getSlot(id: string): Promise<Slot | undefined> {
    return this.slots.get(id);
  }

  async getAllSlots(): Promise<Slot[]> {
    return Array.from(this.slots.values());
  }

  async getSlotsByDateRange(startDate: Date, endDate: Date): Promise<Slot[]> {
    return Array.from(this.slots.values()).filter(slot => 
      slot.start >= startDate && slot.start <= endDate
    );
  }

  async getAvailableSlots(startDate?: Date, endDate?: Date): Promise<Slot[]> {
    let slots = Array.from(this.slots.values()).filter(slot => slot.status === 'free');
    
    if (startDate) {
      slots = slots.filter(slot => slot.start >= startDate);
    }
    
    if (endDate) {
      slots = slots.filter(slot => slot.start <= endDate);
    }
    
    return slots;
  }

  async createSlot(insertSlot: InsertSlot): Promise<Slot> {
    const slot: Slot = { 
      ...insertSlot, 
      updatedAt: new Date(),
      extension: insertSlot.extension || null
    };
    this.slots.set(slot.id, slot);
    return slot;
  }

  async updateSlot(id: string, updates: Partial<InsertSlot>): Promise<Slot | undefined> {
    const existing = this.slots.get(id);
    if (!existing) return undefined;
    const updated: Slot = { ...existing, ...updates, updatedAt: new Date() };
    this.slots.set(id, updated);
    return updated;
  }

  async deleteSlot(id: string): Promise<boolean> {
    return this.slots.delete(id);
  }

  // Search operations
  async searchProviders(filters: SearchFilters): Promise<{
    practitioners: PractitionerRole[];
    locations: Location[];
    availableSlots: Slot[];
  }> {
    let practitioners = Array.from(this.practitionerRoles.values());
    let locations = Array.from(this.locations.values());
    let availableSlots = Array.from(this.slots.values());

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      practitioners = practitioners.filter(p => 
        p.practitioner && typeof p.practitioner === 'object' && 
        'display' in p.practitioner && 
        typeof p.practitioner.display === 'string' && 
        p.practitioner.display.toLowerCase().includes(query)
      );
      locations = locations.filter(l => 
        l.name.toLowerCase().includes(query)
      );
    }

    if (filters.specialty) {
      practitioners = practitioners.filter(p => 
        Array.isArray(p.specialty) && 
        p.specialty.some((spec: any) => 
          Array.isArray(spec.coding) && 
          spec.coding.some((coding: any) => 
            coding.display?.toLowerCase().includes(filters.specialty!.toLowerCase()) ||
            coding.code === filters.specialty
          )
        )
      );
    }

    if (filters.location) {
      const locationQuery = filters.location.toLowerCase();
      locations = locations.filter(l => {
        const address = l.address as any;
        return l.name.toLowerCase().includes(locationQuery) ||
          (address && typeof address === 'object' && 
           ('city' in address && typeof address.city === 'string' && 
            address.city.toLowerCase().includes(locationQuery)) ||
           ('state' in address && typeof address.state === 'string' && 
            address.state.toLowerCase().includes(locationQuery)));
      });
    }

    // NEW: Filter by languages
    if (filters.languages && filters.languages.length > 0) {
      practitioners = practitioners.filter(p =>
        p.languagesSpoken &&
        Array.isArray(p.languagesSpoken) &&
        filters.languages!.some(lang =>
          (p.languagesSpoken as any[]).some((spoken: any) =>
            spoken.language?.toLowerCase().includes(lang.toLowerCase()) ||
            spoken.code?.toLowerCase() === lang.toLowerCase()
          )
        )
      );
    }

    // NEW: Filter by insurance
    if (filters.insurance && filters.insurance.length > 0) {
      practitioners = practitioners.filter(p =>
        p.insuranceAccepted &&
        Array.isArray(p.insuranceAccepted) &&
        filters.insurance!.some(ins =>
          (p.insuranceAccepted as any[]).some((accepted: any) =>
            accepted.type?.toLowerCase().includes(ins.toLowerCase()) ||
            accepted.accepted === true
          )
        )
      );
    }

    // NEW: Filter by appointment type
    if (filters.appointmentType) {
      availableSlots = availableSlots.filter(slot =>
        slot.appointmentType?.toLowerCase() === filters.appointmentType!.toLowerCase()
      );
    }

    if (filters.availableOnly) {
      availableSlots = availableSlots.filter(slot => slot.status === 'free');
    }

    if (filters.dateFrom || filters.dateTo) {
      const startDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date();
      const endDate = filters.dateTo ? new Date(filters.dateTo) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      availableSlots = availableSlots.filter(slot =>
        slot.start >= startDate && slot.start <= endDate
      );
    }

    return { practitioners, locations, availableSlots };
  }

  // Bulk operations for FHIR sync
  async bulkUpsertLocations(insertLocations: InsertLocation[]): Promise<Location[]> {
    const locations: Location[] = [];
    for (const insertLocation of insertLocations) {
      const location: Location = {
        ...insertLocation,
        updatedAt: new Date(),
        description: insertLocation.description || null,
        identifier: insertLocation.identifier || null,
        position: insertLocation.position || null,
        publisherUrl: insertLocation.publisherUrl || null
      };
      this.locations.set(location.id, location);
      locations.push(location);
    }
    return locations;
  }

  async bulkUpsertPractitionerRoles(insertRoles: InsertPractitionerRole[]): Promise<PractitionerRole[]> {
    const roles: PractitionerRole[] = [];
    for (const insertRole of insertRoles) {
      const role: PractitionerRole = {
        ...insertRole,
        updatedAt: new Date(),
        identifier: insertRole.identifier || null,
        active: insertRole.active ?? true,
        organization: insertRole.organization || null,
        telecom: insertRole.telecom || null,
        npi: insertRole.npi || null,
        insuranceAccepted: insertRole.insuranceAccepted || null,
        optumData: insertRole.optumData || null,
        languagesSpoken: insertRole.languagesSpoken || null,
        education: insertRole.education || null,
        boardCertifications: insertRole.boardCertifications || null,
        hospitalAffiliations: insertRole.hospitalAffiliations || null,
        publisherUrl: insertRole.publisherUrl || null
      };
      this.practitionerRoles.set(role.id, role);
      roles.push(role);
    }
    return roles;
  }

  async bulkUpsertSchedules(insertSchedules: InsertSchedule[]): Promise<Schedule[]> {
    const schedules: Schedule[] = [];
    for (const insertSchedule of insertSchedules) {
      const schedule: Schedule = {
        ...insertSchedule,
        updatedAt: new Date(),
        identifier: insertSchedule.identifier || null,
        active: insertSchedule.active ?? true,
        extension: insertSchedule.extension || null,
        publisherUrl: insertSchedule.publisherUrl || null
      };
      this.schedules.set(schedule.id, schedule);
      schedules.push(schedule);
    }
    return schedules;
  }

  async bulkUpsertSlots(insertSlots: InsertSlot[]): Promise<Slot[]> {
    const slots: Slot[] = [];
    for (const insertSlot of insertSlots) {
      const slot: Slot = {
        ...insertSlot,
        updatedAt: new Date(),
        extension: insertSlot.extension || null,
        appointmentType: insertSlot.appointmentType || null,
        isVirtual: insertSlot.isVirtual || null,
        publisherUrl: insertSlot.publisherUrl || null
      };
      this.slots.set(slot.id, slot);
      slots.push(slot);
    }
    return slots;
  }

  // Optum provider enrichment
  async enrichPractitionerWithOptumData(practitionerId: string, optumData: {
    npi?: string;
    insuranceAccepted?: any;
    optumData?: any;
    languagesSpoken?: any;
    education?: any;
    boardCertifications?: any;
    hospitalAffiliations?: any;
  }): Promise<PractitionerRole | undefined> {
    const existing = this.practitionerRoles.get(practitionerId);
    if (!existing) return undefined;

    const enriched: PractitionerRole = {
      ...existing,
      npi: optumData.npi || existing.npi,
      insuranceAccepted: optumData.insuranceAccepted || existing.insuranceAccepted,
      optumData: optumData.optumData || existing.optumData,
      languagesSpoken: optumData.languagesSpoken || existing.languagesSpoken,
      education: optumData.education || existing.education,
      boardCertifications: optumData.boardCertifications || existing.boardCertifications,
      hospitalAffiliations: optumData.hospitalAffiliations || existing.hospitalAffiliations,
      updatedAt: new Date(),
    };

    this.practitionerRoles.set(practitionerId, enriched);
    return enriched;
  }

  async findPractitionerByNPI(npi: string): Promise<PractitionerRole | undefined> {
    return Array.from(this.practitionerRoles.values()).find(role => role.npi === npi);
  }
}

// PostgreSQL implementation using Drizzle ORM
export class DbStorage implements IStorage {
  // Location operations
  async getLocation(id: string): Promise<Location | undefined> {
    const result = await db().select().from(locations).where(eq(locations.id, id)).limit(1);
    return result[0];
  }

  async getAllLocations(): Promise<Location[]> {
    return db().select().from(locations);
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const result = await db().insert(locations).values(location).returning();
    return result[0];
  }

  async updateLocation(id: string, updates: Partial<InsertLocation>): Promise<Location | undefined> {
    const result = await db()
      .update(locations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return result[0];
  }

  async deleteLocation(id: string): Promise<boolean> {
    const result = await db().delete(locations).where(eq(locations.id, id)).returning();
    return result.length > 0;
  }

  // PractitionerRole operations
  async getPractitionerRole(id: string): Promise<PractitionerRole | undefined> {
    const result = await db().select().from(practitionerRoles).where(eq(practitionerRoles.id, id)).limit(1);
    return result[0];
  }

  async getAllPractitionerRoles(): Promise<PractitionerRole[]> {
    return db().select().from(practitionerRoles);
  }

  async createPractitionerRole(role: InsertPractitionerRole): Promise<PractitionerRole> {
    const result = await db().insert(practitionerRoles).values(role).returning();
    return result[0];
  }

  async updatePractitionerRole(id: string, updates: Partial<InsertPractitionerRole>): Promise<PractitionerRole | undefined> {
    const result = await db()
      .update(practitionerRoles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(practitionerRoles.id, id))
      .returning();
    return result[0];
  }

  async deletePractitionerRole(id: string): Promise<boolean> {
    const result = await db().delete(practitionerRoles).where(eq(practitionerRoles.id, id)).returning();
    return result.length > 0;
  }

  // Schedule operations
  async getSchedule(id: string): Promise<Schedule | undefined> {
    const result = await db().select().from(schedules).where(eq(schedules.id, id)).limit(1);
    return result[0];
  }

  async getAllSchedules(): Promise<Schedule[]> {
    return db().select().from(schedules);
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const result = await db().insert(schedules).values(schedule).returning();
    return result[0];
  }

  async updateSchedule(id: string, updates: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const result = await db()
      .update(schedules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schedules.id, id))
      .returning();
    return result[0];
  }

  async deleteSchedule(id: string): Promise<boolean> {
    const result = await db().delete(schedules).where(eq(schedules.id, id)).returning();
    return result.length > 0;
  }

  // Slot operations
  async getSlot(id: string): Promise<Slot | undefined> {
    const result = await db().select().from(slots).where(eq(slots.id, id)).limit(1);
    return result[0];
  }

  async getAllSlots(): Promise<Slot[]> {
    return db().select().from(slots);
  }

  async getSlotsByDateRange(startDate: Date, endDate: Date): Promise<Slot[]> {
    return db()
      .select()
      .from(slots)
      .where(and(gte(slots.start, startDate), lte(slots.start, endDate)));
  }

  async getAvailableSlots(startDate?: Date, endDate?: Date): Promise<Slot[]> {
    const conditions = [eq(slots.status, 'free')];

    if (startDate) {
      conditions.push(gte(slots.start, startDate));
    }

    if (endDate) {
      conditions.push(lte(slots.start, endDate));
    }

    return db().select().from(slots).where(and(...conditions));
  }

  async createSlot(slot: InsertSlot): Promise<Slot> {
    const result = await db().insert(slots).values(slot).returning();
    return result[0];
  }

  async updateSlot(id: string, updates: Partial<InsertSlot>): Promise<Slot | undefined> {
    const result = await db()
      .update(slots)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(slots.id, id))
      .returning();
    return result[0];
  }

  async deleteSlot(id: string): Promise<boolean> {
    const result = await db().delete(slots).where(eq(slots.id, id)).returning();
    return result.length > 0;
  }

  // Search operations with enhanced filtering
  async searchProviders(filters: SearchFilters): Promise<{
    practitioners: PractitionerRole[];
    locations: Location[];
    availableSlots: Slot[];
  }> {
    // Get all data and filter in memory (for now)
    // TODO: Optimize with SQL queries for better performance
    let practitioners = await this.getAllPractitionerRoles();
    let locationResults = await this.getAllLocations();
    let availableSlots = await this.getAllSlots();

    // Filter practitioners by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      practitioners = practitioners.filter(p =>
        p.practitioner && typeof p.practitioner === 'object' &&
        'display' in p.practitioner &&
        typeof p.practitioner.display === 'string' &&
        p.practitioner.display.toLowerCase().includes(query)
      );
      locationResults = locationResults.filter(l =>
        l.name.toLowerCase().includes(query)
      );
    }

    // Filter by specialty
    if (filters.specialty) {
      practitioners = practitioners.filter(p =>
        Array.isArray(p.specialty) &&
        p.specialty.some((spec: any) =>
          Array.isArray(spec.coding) &&
          spec.coding.some((coding: any) =>
            coding.display?.toLowerCase().includes(filters.specialty!.toLowerCase()) ||
            coding.code === filters.specialty
          )
        )
      );
    }

    // Filter by location
    if (filters.location) {
      const locationQuery = filters.location.toLowerCase();
      locationResults = locationResults.filter(l => {
        const address = l.address as any;
        return l.name.toLowerCase().includes(locationQuery) ||
          (address && typeof address === 'object' &&
           ('city' in address && typeof address.city === 'string' &&
            address.city.toLowerCase().includes(locationQuery)) ||
           ('state' in address && typeof address.state === 'string' &&
            address.state.toLowerCase().includes(locationQuery)));
      });
    }

    // NEW: Filter by languages
    if (filters.languages && filters.languages.length > 0) {
      practitioners = practitioners.filter(p =>
        p.languagesSpoken &&
        Array.isArray(p.languagesSpoken) &&
        filters.languages!.some(lang =>
          (p.languagesSpoken as any[]).some((spoken: any) =>
            spoken.language?.toLowerCase().includes(lang.toLowerCase()) ||
            spoken.code?.toLowerCase() === lang.toLowerCase()
          )
        )
      );
    }

    // NEW: Filter by insurance
    if (filters.insurance && filters.insurance.length > 0) {
      practitioners = practitioners.filter(p =>
        p.insuranceAccepted &&
        Array.isArray(p.insuranceAccepted) &&
        filters.insurance!.some(ins =>
          (p.insuranceAccepted as any[]).some((accepted: any) =>
            accepted.type?.toLowerCase().includes(ins.toLowerCase()) ||
            accepted.accepted === true
          )
        )
      );
    }

    // NEW: Filter by appointment type
    if (filters.appointmentType) {
      availableSlots = availableSlots.filter(slot =>
        slot.appointmentType?.toLowerCase() === filters.appointmentType!.toLowerCase()
      );
    }

    // Filter slots by availability
    if (filters.availableOnly) {
      availableSlots = availableSlots.filter(slot => slot.status === 'free');
    }

    // Filter slots by date range
    if (filters.dateFrom || filters.dateTo) {
      const startDate = filters.dateFrom ? new Date(filters.dateFrom) : new Date();
      const endDate = filters.dateTo ? new Date(filters.dateTo) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      availableSlots = availableSlots.filter(slot =>
        slot.start >= startDate && slot.start <= endDate
      );
    }

    return { practitioners, locations: locationResults, availableSlots };
  }

  // Bulk operations for FHIR sync
  async bulkUpsertLocations(insertLocations: InsertLocation[]): Promise<Location[]> {
    if (insertLocations.length === 0) return [];

    const result = await db()
      .insert(locations)
      .values(insertLocations)
      .onConflictDoUpdate({
        target: locations.id,
        set: {
          name: sql`excluded.name`,
          telecom: sql`excluded.telecom`,
          address: sql`excluded.address`,
          identifier: sql`excluded.identifier`,
          description: sql`excluded.description`,
          position: sql`excluded.position`,
          publisherUrl: sql`excluded.publisher_url`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();

    return result;
  }

  async bulkUpsertPractitionerRoles(insertRoles: InsertPractitionerRole[]): Promise<PractitionerRole[]> {
    if (insertRoles.length === 0) return [];

    const result = await db()
      .insert(practitionerRoles)
      .values(insertRoles)
      .onConflictDoUpdate({
        target: practitionerRoles.id,
        set: {
          identifier: sql`excluded.identifier`,
          active: sql`excluded.active`,
          practitioner: sql`excluded.practitioner`,
          organization: sql`excluded.organization`,
          code: sql`excluded.code`,
          specialty: sql`excluded.specialty`,
          location: sql`excluded.location`,
          telecom: sql`excluded.telecom`,
          npi: sql`excluded.npi`,
          insuranceAccepted: sql`excluded.insurance_accepted`,
          optumData: sql`excluded.optum_data`,
          languagesSpoken: sql`excluded.languages_spoken`,
          education: sql`excluded.education`,
          boardCertifications: sql`excluded.board_certifications`,
          hospitalAffiliations: sql`excluded.hospital_affiliations`,
          publisherUrl: sql`excluded.publisher_url`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();

    return result;
  }

  async bulkUpsertSchedules(insertSchedules: InsertSchedule[]): Promise<Schedule[]> {
    if (insertSchedules.length === 0) return [];

    const result = await db()
      .insert(schedules)
      .values(insertSchedules)
      .onConflictDoUpdate({
        target: schedules.id,
        set: {
          identifier: sql`excluded.identifier`,
          active: sql`excluded.active`,
          serviceType: sql`excluded.service_type`,
          actor: sql`excluded.actor`,
          extension: sql`excluded.extension`,
          publisherUrl: sql`excluded.publisher_url`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();

    return result;
  }

  async bulkUpsertSlots(insertSlots: InsertSlot[]): Promise<Slot[]> {
    if (insertSlots.length === 0) return [];

    const result = await db()
      .insert(slots)
      .values(insertSlots)
      .onConflictDoUpdate({
        target: slots.id,
        set: {
          schedule: sql`excluded.schedule`,
          status: sql`excluded.status`,
          start: sql`excluded.start`,
          end: sql`excluded.end`,
          extension: sql`excluded.extension`,
          appointmentType: sql`excluded.appointment_type`,
          isVirtual: sql`excluded.is_virtual`,
          publisherUrl: sql`excluded.publisher_url`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning();

    return result;
  }

  // Optum provider enrichment
  async enrichPractitionerWithOptumData(practitionerId: string, optumData: {
    npi?: string;
    insuranceAccepted?: any;
    optumData?: any;
    languagesSpoken?: any;
    education?: any;
    boardCertifications?: any;
    hospitalAffiliations?: any;
  }): Promise<PractitionerRole | undefined> {
    const existing = await this.getPractitionerRole(practitionerId);
    if (!existing) return undefined;

    return this.updatePractitionerRole(practitionerId, {
      npi: optumData.npi || existing.npi,
      insuranceAccepted: optumData.insuranceAccepted || existing.insuranceAccepted,
      optumData: optumData.optumData || existing.optumData,
      languagesSpoken: optumData.languagesSpoken || existing.languagesSpoken,
      education: optumData.education || existing.education,
      boardCertifications: optumData.boardCertifications || existing.boardCertifications,
      hospitalAffiliations: optumData.hospitalAffiliations || existing.hospitalAffiliations,
    });
  }

  async findPractitionerByNPI(npi: string): Promise<PractitionerRole | undefined> {
    const result = await db().select().from(practitionerRoles).where(eq(practitionerRoles.npi, npi)).limit(1);
    return result[0];
  }
}

// Export storage instance based on environment variable
export const storage = process.env.USE_DB_STORAGE === 'true'
  ? new DbStorage()
  : new MemStorage();
