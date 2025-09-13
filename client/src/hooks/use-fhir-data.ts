import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fhirClient } from "@/lib/fhir-client";
import { useToast } from "@/hooks/use-toast";
import type { Location, PractitionerRole, Schedule, Slot, SearchFilters } from "@shared/schema";

export function useFHIRData() {
  const [searchResults, setSearchResults] = useState<{
    practitioners: PractitionerRole[];
    locations: Location[];
    availableSlots: Slot[];
  } | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch locations
  const { 
    data: locations, 
    isLoading: locationsLoading,
    error: locationsError 
  } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: () => fhirClient.getLocations(),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  // Fetch practitioners
  const { 
    data: providers, 
    isLoading: providersLoading,
    error: providersError 
  } = useQuery({
    queryKey: ["/api/practitioners"],
    queryFn: () => fhirClient.getPractitioners(),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch schedules
  const { 
    data: schedules, 
    isLoading: schedulesLoading,
    error: schedulesError 
  } = useQuery({
    queryKey: ["/api/schedules"],
    queryFn: () => fhirClient.getSchedules(),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch available slots
  const { 
    data: slots, 
    isLoading: slotsLoading,
    error: slotsError 
  } = useQuery({
    queryKey: ["/api/slots", "available"],
    queryFn: () => fhirClient.getSlots({ available: true }),
    refetchInterval: 2 * 60 * 1000, // More frequent updates for slots
    staleTime: 30 * 1000, // Consider slots stale after 30 seconds
  });

  // Handle errors
  useEffect(() => {
    if (locationsError || providersError || schedulesError || slotsError) {
      const errors = [locationsError, providersError, schedulesError, slotsError]
        .filter(Boolean)
        .map(e => e?.message)
        .join(', ');
      
      toast({
        title: "Data Loading Error",
        description: `Failed to load FHIR data: ${errors}`,
        variant: "destructive",
      });
    }
  }, [locationsError, providersError, schedulesError, slotsError, toast]);

  // Search function
  const search = async (filters: SearchFilters) => {
    try {
      const results = await fhirClient.searchProviders(filters);
      setSearchResults(results);
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to search providers. Please try again.",
        variant: "destructive",
      });
      console.error("Search error:", error);
    }
  };

  // Clear search results
  const clearSearch = () => {
    setSearchResults(null);
  };

  // Get provider availability
  const getProviderAvailability = async (providerId: string, dateRange?: { start: Date; end: Date }) => {
    try {
      const params = dateRange ? {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      } : undefined;
      
      return await fhirClient.getProviderAvailability(providerId, params);
    } catch (error) {
      toast({
        title: "Availability Error",
        description: "Failed to load provider availability.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Manual refresh
  const refreshData = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api"] });
      toast({
        title: "Data Refreshed",
        description: "FHIR data has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isLoading = locationsLoading || providersLoading || schedulesLoading || slotsLoading;

  return {
    // Data
    locations,
    providers,
    schedules,
    slots,
    searchResults,
    
    // Loading states
    isLoading,
    locationsLoading,
    providersLoading,
    schedulesLoading,
    slotsLoading,
    
    // Errors
    locationsError,
    providersError,
    schedulesError,
    slotsError,
    
    // Actions
    search,
    clearSearch,
    getProviderAvailability,
    refreshData,
  };
}
