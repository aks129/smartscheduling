import { storage } from "../storage";
import type { SearchFilters, PractitionerRole, Location, Slot } from "@shared/schema";

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
      const filters: SearchFilters = {
        specialty: request.specialty,
        location: request.location,
        insurance: request.insurance,
        languages: request.languages,
        dateFrom: request.dateFrom,
        dateTo: request.dateTo,
        availableOnly: request.availableOnly ?? true,
        appointmentType: request.appointmentType,
      };

      const results = await storage.searchProviders(filters);

      // Update context if provided
      if (contextId) {
        const context = this.getOrCreateContext(contextId);
        context.state = 'RESULTS_READY';
        context.lastSearchFilters = filters;
        context.lastSearchResults = results;
      }

      return {
        success: true,
        message: `Found ${results.practitioners.length} providers and ${results.availableSlots.length} available slots`,
        data: {
          ...results,
          totalProviders: results.practitioners.length,
          totalSlots: results.availableSlots.length,
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

      // Filter slots by provider's schedule
      const providerSlots = allSlots.filter(slot => {
        if (slot.schedule && typeof slot.schedule === 'object' && 'reference' in slot.schedule) {
          const reference = slot.schedule.reference as string;
          return reference.includes(request.providerId);
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
