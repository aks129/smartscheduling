import { type Location, type InsertLocation, type PractitionerRole, type InsertPractitionerRole, type Schedule, type InsertSchedule, type Slot, type InsertSlot, type SearchFilters } from "@shared/schema";

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
      telecom: insertRole.telecom || null
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
        position: insertLocation.position || null
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
        telecom: insertRole.telecom || null
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
        extension: insertSchedule.extension || null
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
        extension: insertSlot.extension || null
      };
      this.slots.set(slot.id, slot);
      slots.push(slot);
    }
    return slots;
  }
}

export const storage = new MemStorage();
