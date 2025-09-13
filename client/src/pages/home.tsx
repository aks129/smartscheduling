import { useState } from "react";
import { Bell, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchFilters from "@/components/search-filters";
import ProviderCard from "@/components/provider-card";
import LocationMap from "@/components/location-map";
import AvailabilityCalendar from "@/components/availability-calendar";
import BookingModal from "@/components/booking-modal";
import LoadingIndicator from "@/components/loading-indicator";
import { useFHIRData } from "@/hooks/use-fhir-data";
import type { PractitionerRole, Location, Slot, SearchFilters as SearchFiltersType } from "@shared/schema";

export default function Home() {
  const [selectedProvider, setSelectedProvider] = useState<PractitionerRole | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType>({
    availableOnly: false,
  });

  const { 
    providers, 
    locations, 
    slots, 
    searchResults, 
    isLoading, 
    search 
  } = useFHIRData();

  const handleSearch = (filters: SearchFiltersType) => {
    setSearchFilters(filters);
    search(filters);
  };

  const handleBookNow = (provider: PractitionerRole, slot?: Slot) => {
    setSelectedProvider(provider);
    setSelectedSlot(slot || null);
    setIsBookingModalOpen(true);
  };

  const handleSlotSelect = (slot: Slot) => {
    setSelectedSlot(slot);
    if (selectedProvider) {
      setIsBookingModalOpen(true);
    }
  };

  const displayProviders = searchResults?.practitioners || providers || [];
  const displayLocations = searchResults?.locations || locations || [];
  const availableSlots = searchResults?.availableSlots || slots?.filter(slot => slot.status === 'free') || [];

  const totalSlots = slots?.length || 0;
  const availableSlotsCount = availableSlots.length;
  const sameDaySlots = availableSlots.filter(slot => {
    const today = new Date();
    const slotDate = new Date(slot.start);
    return slotDate.toDateString() === today.toDateString();
  }).length;

  // Calculate average wait time
  const avgWaitDays = availableSlots.length > 0 ? 
    Math.round(
      availableSlots.reduce((acc, slot) => {
        const days = Math.ceil((new Date(slot.start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        return acc + Math.max(0, days);
      }, 0) / availableSlots.length * 10
    ) / 10 : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LoadingIndicator isLoading={isLoading} />
      
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground" data-testid="app-title">
                  SMART Scheduling
                </h1>
                <p className="text-xs text-muted-foreground">
                  Healthcare Appointment Booking
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters Section */}
        <SearchFilters onSearch={handleSearch} />

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Provider List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground" data-testid="text-providers-title">
                Available Providers
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground" data-testid="text-provider-count">
                  Showing {displayProviders.length} providers
                </span>
              </div>
            </div>

            {/* Provider Cards */}
            <div className="space-y-4" data-testid="list-providers">
              {displayProviders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      <span>Loading providers...</span>
                    </div>
                  ) : (
                    <div>
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p data-testid="text-no-providers">No providers found matching your criteria.</p>
                      <p className="text-sm mt-2">Try adjusting your search filters.</p>
                    </div>
                  )}
                </div>
              ) : (
                displayProviders.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    location={displayLocations.find(loc => 
                      Array.isArray(provider.location) && 
                      provider.location.some((locRef: any) => 
                        locRef.reference === `Location/${loc.id}`
                      )
                    )}
                    availableSlots={availableSlots.filter(slot => 
                      slot.schedule && typeof slot.schedule === 'object' &&
                      'reference' in slot.schedule &&
                      typeof slot.schedule.reference === 'string' &&
                      slot.schedule.reference.includes(provider.id)
                    )}
                    onBookNow={handleBookNow}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Column: Map and Calendar */}
          <div className="space-y-6">
            {/* Google Maps Integration */}
            <LocationMap 
              locations={displayLocations} 
              selectedProvider={selectedProvider}
            />

            {/* Quick Availability Calendar */}
            <AvailabilityCalendar 
              slots={availableSlots}
              onSlotSelect={handleSlotSelect}
            />

            {/* Quick Stats */}
            <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4" data-testid="text-stats-title">
                Today's Availability
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Slots</span>
                  <span className="text-sm font-semibold text-foreground" data-testid="text-total-slots">
                    {totalSlots}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Available</span>
                  <span className="text-sm font-semibold text-accent" data-testid="text-available-slots">
                    {availableSlotsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Same Day</span>
                  <span className="text-sm font-semibold text-secondary" data-testid="text-same-day-slots">
                    {sameDaySlots}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Wait Time</span>
                  <span className="text-sm font-semibold text-foreground" data-testid="text-avg-wait-time">
                    {avgWaitDays} days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        provider={selectedProvider}
        slot={selectedSlot}
        location={selectedProvider ? displayLocations.find(loc => 
          Array.isArray(selectedProvider.location) && 
          selectedProvider.location.some((locRef: any) => 
            locRef.reference === `Location/${loc.id}`
          )
        ) : undefined}
      />
    </div>
  );
}
