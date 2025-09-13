import { Calendar, MapPin, Phone, User, Shield, Globe, GraduationCap, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDistance, formatDateTime } from "@/lib/date-utils";
import type { PractitionerRole, Location, Slot } from "@shared/schema";
import { useState } from "react";

interface ProviderCardProps {
  provider: PractitionerRole;
  location?: Location;
  availableSlots: Slot[];
  onBookNow: (provider: PractitionerRole, slot?: Slot) => void;
}

export default function ProviderCard({ provider, location, availableSlots, onBookNow }: ProviderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  // Extract Optum enriched data
  const insuranceAccepted = Array.isArray(provider.insuranceAccepted) ? provider.insuranceAccepted : [];
  const languagesSpoken = Array.isArray(provider.languagesSpoken) ? provider.languagesSpoken : [];
  const education = Array.isArray(provider.education) ? provider.education : [];
  const boardCertifications = Array.isArray(provider.boardCertifications) ? provider.boardCertifications : [];
  const npi = provider.npi;
  const hasOptumData = provider.optumData;

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
      
      {/* Insurance and Optum Information */}
      {(insuranceAccepted.length > 0 || hasOptumData) && (
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Insurance & Details</h4>
              {npi && (
                <Badge variant="outline" className="text-xs">
                  NPI: {npi}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Insurance Accepted */}
          {insuranceAccepted.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Insurance Accepted:</p>
              <div className="flex flex-wrap gap-1">
                {insuranceAccepted.slice(0, 4).map((insurance: any, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                    {insurance.type}
                  </Badge>
                ))}
                {insuranceAccepted.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{insuranceAccepted.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Languages Spoken */}
          {languagesSpoken.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center space-x-1 mb-2">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Languages:</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {languagesSpoken.slice(0, 3).map((lang: any, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {lang.language}
                  </Badge>
                ))}
                {languagesSpoken.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{languagesSpoken.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Collapsible Additional Details */}
          {(education.length > 0 || boardCertifications.length > 0) && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto text-xs text-primary">
                  {isExpanded ? 'Hide' : 'Show'} Education & Certifications
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {/* Education */}
                {education.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <GraduationCap className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Education:</p>
                    </div>
                    <div className="space-y-1">
                      {education.slice(0, 2).map((edu: any, index: number) => (
                        <p key={index} className="text-xs text-foreground">
                          {edu.degree} {edu.institution && `- ${edu.institution}`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Board Certifications */}
                {boardCertifications.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <Award className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Board Certifications:</p>
                    </div>
                    <div className="space-y-1">
                      {boardCertifications.slice(0, 2).map((cert: any, index: number) => (
                        <p key={index} className="text-xs text-foreground">
                          {cert.certification} {cert.board && `- ${cert.board}`}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
      
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
          {hasOptumData && (
            <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 text-xs">
              Optum Verified
            </Badge>
          )}
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
