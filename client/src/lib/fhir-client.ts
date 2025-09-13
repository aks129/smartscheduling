import axios from "axios";
import type { Location, PractitionerRole, Schedule, Slot } from "@shared/schema";

const API_BASE_URL = "/api";

export class FHIRClient {
  private baseURL: string;

  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Location operations
  async getLocations(): Promise<Location[]> {
    const response = await axios.get(`${this.baseURL}/locations`);
    return response.data;
  }

  // PractitionerRole operations
  async getPractitioners(): Promise<PractitionerRole[]> {
    const response = await axios.get(`${this.baseURL}/practitioners`);
    return response.data;
  }

  // Schedule operations
  async getSchedules(): Promise<Schedule[]> {
    const response = await axios.get(`${this.baseURL}/schedules`);
    return response.data;
  }

  // Slot operations
  async getSlots(params?: {
    start?: string;
    end?: string;
    available?: boolean;
  }): Promise<Slot[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.start) searchParams.append('start', params.start);
    if (params?.end) searchParams.append('end', params.end);
    if (params?.available) searchParams.append('available', 'true');

    const response = await axios.get(`${this.baseURL}/slots?${searchParams.toString()}`);
    return response.data;
  }

  // Provider availability
  async getProviderAvailability(providerId: string, params?: {
    start?: string;
    end?: string;
  }): Promise<Slot[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.start) searchParams.append('start', params.start);
    if (params?.end) searchParams.append('end', params.end);

    const response = await axios.get(`${this.baseURL}/availability/${providerId}?${searchParams.toString()}`);
    return response.data;
  }

  // Search providers
  async searchProviders(filters: {
    searchQuery?: string;
    specialty?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    availableOnly?: boolean;
  }): Promise<{
    practitioners: PractitionerRole[];
    locations: Location[];
    availableSlots: Slot[];
  }> {
    const response = await axios.post(`${this.baseURL}/search`, filters);
    return response.data;
  }

  // Get booking information
  async getBookingInfo(slotId: string): Promise<{
    slotId: string;
    bookingLink?: string;
    bookingPhone?: string;
    slot: Slot;
  }> {
    const response = await axios.get(`${this.baseURL}/booking/${slotId}`);
    return response.data;
  }

  // Trigger FHIR data sync
  async syncFHIRData(): Promise<void> {
    await axios.post(`${this.baseURL}/sync`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await axios.get(`${this.baseURL}/health`);
    return response.data;
  }
}

export const fhirClient = new FHIRClient();
