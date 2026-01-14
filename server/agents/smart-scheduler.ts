import { storage } from "../storage";
import type { SearchFilters, PractitionerRole, Location, Slot, Schedule } from "@shared/schema";

// Agent state types
export type AgentState = 'IDLE' | 'SEARCHING' | 'RESULTS_READY' | 'SLOT_SELECTED' | 'BOOKING_INFO_READY';

export interface AgentContext {
  contextId: string;
  state: AgentState;
  lastSearchFilters?: SearchFilters;
  lastSearchResults?: {
    practitioners: PractitionerRole[];
    locations: Location[];
    availableSlots: Slot[];
  };
  selectedProviderId?: string;
  selectedSlotId?: string;
  bookingInfo?: {
    slotId: string;
    bookingLink?: string;
    bookingPhone?: string;
  };
}

export interface SearchRequest {
  specialty?: string;
  location?: string;
  insurance?: string[];
  languages?: string[];
  dateFrom?: string;
  dateTo?: string;
  availableOnly?: boolean;
  appointmentType?: string;
}

export interface AvailabilityRequest {
  providerId: string;
  startDate?: string;
  endDate?: string;
}

export interface BookingRequest {
  slotId: string;
}

export class SmartSchedulerAgent {
  private agentId: string;
  private name: string;
  private contexts: Map<string, AgentContext>;

  constructor(agentId: string = "smart-scheduler") {
    this.agentId = agentId;
    this.name = "SMART Scheduling Agent";
    this.contexts = new Map();
  }

  // Create or get context
  getOrCreateContext(contextId: string): AgentContext {
    if (!this.contexts.has(contextId)) {
      this.contexts.set(contextId, {
        contextId,
        state: 'IDLE',
      });
    }
    return this.contexts.get(contextId)!;
  }

  // Search for healthcare providers
  async searchProviders(request: SearchRequest, contextId?: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      practitioners: PractitionerRole[];
      locations: Location[];
      availableSlots: Slot[];
      totalProviders: number;
      totalSlots: number;
    };
  }> {
    try {
      // Get all data first
      let practitioners = await storage.getAllPractitionerRoles();
      let locations = await storage.getAllLocations();
      let slots = await storage.getAllSlots();
      const allSchedules = await storage.getAllSchedules();

      // Build schedule-to-practitioner mapping
      // Schedule.actor contains references like [{ reference: "PractitionerRole/xxx" }, { reference: "Location/xxx" }]
      const scheduleToPractitioners = new Map<string, Set<string>>();
      const practitionerToSchedules = new Map<string, Set<string>>();

      for (const schedule of allSchedules) {
        const scheduleId = schedule.id;
        const practitionerIds = new Set<string>();

        if (Array.isArray(schedule.actor)) {
          for (const actorRef of schedule.actor as any[]) {
            if (actorRef?.reference && typeof actorRef.reference === 'string') {
              const ref = actorRef.reference;
              if (ref.startsWith('PractitionerRole/')) {
                const practitionerId = ref.replace('PractitionerRole/', '');
                practitionerIds.add(practitionerId);

                // Build reverse mapping
                if (!practitionerToSchedules.has(practitionerId)) {
                  practitionerToSchedules.set(practitionerId, new Set());
                }
                practitionerToSchedules.get(practitionerId)!.add(scheduleId);
              }
            }
          }
        }

        scheduleToPractitioners.set(scheduleId, practitionerIds);
      }

      // Track if any filters were applied
      let filtersApplied = false;

      // Filter by specialty (flexible matching)
      if (request.specialty) {
        filtersApplied = true;
        const specLower = request.specialty.toLowerCase();
        practitioners = practitioners.filter(p => {
          // Check specialty array
          if (Array.isArray(p.specialty)) {
            return p.specialty.some((spec: any) => {
              if (Array.isArray(spec.coding)) {
                return spec.coding.some((coding: any) =>
                  coding.display?.toLowerCase().includes(specLower) ||
                  coding.code?.toLowerCase().includes(specLower)
                );
              }
              return spec.text?.toLowerCase().includes(specLower);
            });
          }
          // Also check practitioner display name for specialty hints
          if (p.practitioner && typeof p.practitioner === 'object' && 'display' in p.practitioner) {
            return (p.practitioner.display as string)?.toLowerCase().includes(specLower);
          }
          return false;
        });
      }

      // Filter by location (match city, state, zip, or name)
      if (request.location) {
        filtersApplied = true;
        const locLower = request.location.toLowerCase();
        const matchingLocationIds = new Set<string>();

        // Find matching locations
        locations = locations.filter(l => {
          const address = l.address as any;
          const matches = l.name?.toLowerCase().includes(locLower) ||
            (address?.city?.toLowerCase().includes(locLower)) ||
            (address?.state?.toLowerCase().includes(locLower)) ||
            (address?.postalCode?.includes(request.location!)) ||
            (address?.line && Array.isArray(address.line) &&
              address.line.some((line: string) => line.toLowerCase().includes(locLower)));

          if (matches) {
            matchingLocationIds.add(l.id);
          }
          return matches;
        });

        // Filter practitioners by matching locations (only if we found matching locations)
        if (matchingLocationIds.size > 0) {
          practitioners = practitioners.filter(p => {
            if (Array.isArray(p.location)) {
              return p.location.some((locRef: any) => {
                const refId = locRef.reference?.replace('Location/', '');
                return matchingLocationIds.has(refId);
              });
            }
            return true; // Keep if no location reference (don't filter out)
          });
        }
      }

      // Filter by insurance
      if (request.insurance && request.insurance.length > 0) {
        filtersApplied = true;
        practitioners = practitioners.filter(p => {
          if (!p.insuranceAccepted || !Array.isArray(p.insuranceAccepted)) {
            return false;
          }
          return request.insurance!.some(ins =>
            (p.insuranceAccepted as any[]).some((accepted: any) =>
              accepted.type?.toLowerCase().includes(ins.toLowerCase()) ||
              accepted.name?.toLowerCase().includes(ins.toLowerCase())
            )
          );
        });
      }

      // Filter by languages
      if (request.languages && request.languages.length > 0) {
        filtersApplied = true;
        practitioners = practitioners.filter(p => {
          if (!p.languagesSpoken || !Array.isArray(p.languagesSpoken)) {
            return false;
          }
          return request.languages!.some(lang =>
            (p.languagesSpoken as any[]).some((spoken: any) =>
              spoken.language?.toLowerCase().includes(lang.toLowerCase()) ||
              spoken.code?.toLowerCase().includes(lang.toLowerCase())
            )
          );
        });
      }

      // Filter slots by availability status (default to showing all slots unless specified)
      if (request.availableOnly === true) {
        slots = slots.filter(slot => slot.status === 'free');
      }

      // Filter slots by date range
      if (request.dateFrom || request.dateTo) {
        const startDate = request.dateFrom ? new Date(request.dateFrom) : new Date();
        const endDate = request.dateTo ? new Date(request.dateTo) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        slots = slots.filter(slot => slot.start >= startDate && slot.start <= endDate);
      }

      // Filter slots by appointment type
      if (request.appointmentType) {
        slots = slots.filter(slot =>
          slot.appointmentType?.toLowerCase() === request.appointmentType!.toLowerCase()
        );
      }

      // CRITICAL: Filter slots to only include those belonging to filtered practitioners
      // Slot → Schedule (via slot.schedule.reference) → PractitionerRole (via schedule.actor)
      const filteredPractitionerIds = new Set(practitioners.map(p => p.id));

      // Get schedule IDs that belong to filtered practitioners
      const relevantScheduleIds = new Set<string>();
      practitionerToSchedules.forEach((scheduleIds, practitionerId) => {
        if (filteredPractitionerIds.has(practitionerId)) {
          scheduleIds.forEach(scheduleId => {
            relevantScheduleIds.add(scheduleId);
          });
        }
      });

      // Filter slots to only those belonging to relevant schedules
      if (filtersApplied && relevantScheduleIds.size > 0) {
        slots = slots.filter(slot => {
          if (slot.schedule && typeof slot.schedule === 'object' && 'reference' in slot.schedule) {
            const scheduleRef = (slot.schedule as any).reference as string;
            const scheduleId = scheduleRef.replace('Schedule/', '');
            return relevantScheduleIds.has(scheduleId);
          }
          return false;
        });
      } else if (filtersApplied && filteredPractitionerIds.size > 0 && relevantScheduleIds.size === 0) {
        // If we have practitioners but no schedules found, return empty slots
        // (This means the practitioners don't have any schedules/availability)
        slots = [];
      }

      // Build filters for context storage
      const filters: SearchFilters = {
        specialty: request.specialty,
        location: request.location,
        insurance: request.insurance,
        languages: request.languages,
        dateFrom: request.dateFrom,
        dateTo: request.dateTo,
        availableOnly: request.availableOnly ?? false,
        appointmentType: request.appointmentType,
      };

      const results = { practitioners, locations, availableSlots: slots };

      // Update context if provided
      if (contextId) {
        const context = this.getOrCreateContext(contextId);
        context.state = 'RESULTS_READY';
        context.lastSearchFilters = filters;
        context.lastSearchResults = results;
      }

      // Build descriptive message
      let message = `Found ${practitioners.length} providers and ${slots.length} slots`;
      if (!filtersApplied) {
        message = `Showing all ${practitioners.length} providers and ${slots.length} slots. Try filtering by specialty (e.g., "dermatology") or location.`;
      }

      return {
        success: true,
        message,
        data: {
          ...results,
          totalProviders: practitioners.length,
          totalSlots: slots.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Get availability for a specific provider
  async getAvailability(request: AvailabilityRequest, contextId?: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      providerId: string;
      slots: Slot[];
      totalSlots: number;
      availableSlots: number;
    };
  }> {
    try {
      const startDate = request.startDate ? new Date(request.startDate) : new Date();
      const endDate = request.endDate
        ? new Date(request.endDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

      const allSlots = await storage.getSlotsByDateRange(startDate, endDate);
      const allSchedules = await storage.getAllSchedules();

      // Build a set of schedule IDs that belong to this provider
      // Schedule.actor contains references like [{ reference: "PractitionerRole/xxx" }]
      const providerScheduleIds = new Set<string>();
      for (const schedule of allSchedules) {
        if (Array.isArray(schedule.actor)) {
          for (const actorRef of schedule.actor as any[]) {
            if (actorRef?.reference === `PractitionerRole/${request.providerId}`) {
              providerScheduleIds.add(schedule.id);
              break;
            }
          }
        }
      }

      // Filter slots by provider's schedules
      // Slot.schedule.reference = "Schedule/xxx"
      const providerSlots = allSlots.filter(slot => {
        if (slot.schedule && typeof slot.schedule === 'object' && 'reference' in slot.schedule) {
          const scheduleRef = (slot.schedule as any).reference as string;
          const scheduleId = scheduleRef.replace('Schedule/', '');
          return providerScheduleIds.has(scheduleId);
        }
        return false;
      });

      // Update context if provided
      if (contextId) {
        const context = this.getOrCreateContext(contextId);
        context.selectedProviderId = request.providerId;
        context.state = 'RESULTS_READY';
      }

      const availableSlots = providerSlots.filter(slot => slot.status === 'free');

      return {
        success: true,
        message: `Found ${availableSlots.length} available slots for provider ${request.providerId}`,
        data: {
          providerId: request.providerId,
          slots: providerSlots,
          totalSlots: providerSlots.length,
          availableSlots: availableSlots.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Get booking information for a slot
  async getBookingInfo(request: BookingRequest, contextId?: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      slotId: string;
      bookingLink?: string;
      bookingPhone?: string;
      slot: Slot;
      instructions: string;
    };
  }> {
    try {
      const slot = await storage.getSlot(request.slotId);

      if (!slot) {
        return {
          success: false,
          message: `Slot ${request.slotId} not found`,
        };
      }

      // Extract booking information from FHIR extensions
      let bookingLink: string | undefined;
      let bookingPhone: string | undefined;

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

      // Update context if provided
      if (contextId) {
        const context = this.getOrCreateContext(contextId);
        context.selectedSlotId = request.slotId;
        context.bookingInfo = { slotId: request.slotId, bookingLink, bookingPhone };
        context.state = 'BOOKING_INFO_READY';
      }

      const instructions = bookingLink
        ? `To book this appointment, visit: ${bookingLink}`
        : bookingPhone
          ? `To book this appointment, call: ${bookingPhone}`
          : 'Contact the provider directly to book this appointment.';

      return {
        success: true,
        message: 'Booking information retrieved successfully',
        data: {
          slotId: request.slotId,
          bookingLink,
          bookingPhone,
          slot,
          instructions,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get booking info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Get all providers
  async getAllProviders(): Promise<{
    success: boolean;
    message: string;
    data?: PractitionerRole[];
  }> {
    try {
      const practitioners = await storage.getAllPractitionerRoles();
      return {
        success: true,
        message: `Found ${practitioners.length} providers`,
        data: practitioners,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get providers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Get all locations
  async getAllLocations(): Promise<{
    success: boolean;
    message: string;
    data?: Location[];
  }> {
    try {
      const locations = await storage.getAllLocations();
      return {
        success: true,
        message: `Found ${locations.length} locations`,
        data: locations,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get locations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Get all slots with optional filters
  async getAllSlots(filters?: { start?: string; end?: string; availableOnly?: boolean }): Promise<{
    success: boolean;
    message: string;
    data?: Slot[];
  }> {
    try {
      let slots: Slot[];

      if (filters?.start && filters?.end) {
        slots = await storage.getSlotsByDateRange(new Date(filters.start), new Date(filters.end));
      } else if (filters?.availableOnly) {
        slots = await storage.getAvailableSlots();
      } else {
        slots = await storage.getAllSlots();
      }

      if (filters?.availableOnly) {
        slots = slots.filter(slot => slot.status === 'free');
      }

      return {
        success: true,
        message: `Found ${slots.length} slots`,
        data: slots,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get slots: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // Get agent capabilities
  getCapabilities(): {
    name: string;
    agentId: string;
    version: string;
    protocols: string[];
    skills: string[];
  } {
    return {
      name: this.name,
      agentId: this.agentId,
      version: "1.0.0",
      protocols: ["a2a", "rest", "mcp"],
      skills: [
        "search_providers",
        "get_availability",
        "get_booking",
        "get_providers",
        "get_locations",
        "get_slots",
      ],
    };
  }

  // Get agent status
  getStatus(contextId?: string): {
    agentId: string;
    status: string;
    context?: AgentContext;
  } {
    return {
      agentId: this.agentId,
      status: "active",
      context: contextId ? this.contexts.get(contextId) : undefined,
    };
  }
}

// Singleton instance
let _defaultAgent: SmartSchedulerAgent | null = null;

export function getSmartSchedulerAgent(): SmartSchedulerAgent {
  if (!_defaultAgent) {
    _defaultAgent = new SmartSchedulerAgent();
  }
  return _defaultAgent;
}
