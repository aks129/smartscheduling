import { Calendar, MapPin, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistance, formatDateTime } from "@/lib/date-utils";
import type { PractitionerRole, Location, Slot } from "@shared/schema";

interface ProviderCardProps {
  provider: PractitionerRole;
  location?: Location;
  availableSlots: Slot[];
  onBookNow: (provider: PractitionerRole, slot?: Slot) => void;
}

export default function ProviderCard({ provider, location, availableSlots, onBookNow }: ProviderCardProps) {
  // Extract provider information
  const practitionerName = provider.practitioner && typeof provider.practitioner === 'object' && 'display' in provider.practitioner 
    ? provider.practitioner.display as string 
    : 'Unknown Provider';

  const specialty = Array.isArray(provider.specialty) && provider.specialty.length > 0 && provider.specialty[0].coding 
    ? provider.specialty[0].coding[0]?.display || 'General Practice'
    : 'General Practice';

  const phone = Array.isArray(provider.telecom) && provider.telecom.length > 0
    ? provider.telecom.find((t: any) => t.system === 'phone')?.value || '000-000-0000'
    : '000-000-0000';

  const locationName = location?.name || 'Unknown Location';

  // Find next available slot
  const nextSlot = availableSlots
    .filter(slot => slot.status === 'free' && new Date(slot.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

  const isToday = nextSlot && new Date(nextSlot.start).toDateString() === new Date().toDateString();
  const isSameDay = isToday;

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm provider-card" data-testid={`card-provider-${provider.id}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground" data-testid={`text-provider-name-${provider.id}`}>
              {practitionerName}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-provider-specialty-${provider.id}`}>
              {specialty}
            </p>
            <div className="flex items-center mt-2 space-x-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-1" />
                <span data-testid={`text-provider-location-${provider.id}`}>{locationName}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="w-4 h-4 mr-1" />
                <span data-testid={`text-provider-phone-${provider.id}`}>{phone}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          {nextSlot ? (
            <>
              <div className="flex items-center text-sm text-accent font-medium mb-1">
                <Calendar className="w-4 h-4 mr-1" />
                Next Available
              </div>
              <p className="text-sm font-semibold text-foreground" data-testid={`text-next-available-${provider.id}`}>
                {formatDateTime(nextSlot.start)}
              </p>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              No available slots
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-accent/10 text-accent">
            In-Network
          </Badge>
          {isSameDay && (
            <Badge variant="secondary" className="bg-secondary/10 text-secondary">
              Same Day
            </Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            {availableSlots.length} slots
          </Badge>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            data-testid={`button-view-profile-${provider.id}`}
          >
            View Profile
          </Button>
          <Button 
            size="sm"
            onClick={() => onBookNow(provider, nextSlot)}
            disabled={!nextSlot}
            data-testid={`button-book-now-${provider.id}`}
          >
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
}
