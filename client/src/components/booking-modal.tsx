import { useState } from "react";
import { Calendar, X, User, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";
import type { PractitionerRole, Location, Slot } from "@shared/schema";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: PractitionerRole | null;
  slot: Slot | null;
  location?: Location;
}

export default function BookingModal({ isOpen, onClose, provider, slot, location }: BookingModalProps) {
  const [appointmentType, setAppointmentType] = useState("");
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const { toast } = useToast();

  const handleBookAppointment = async () => {
    if (!slot || !provider) return;

    setIsBooking(true);
    try {
      // Get booking information for the slot
      const response = await apiRequest('GET', `/api/booking/${slot.id}`);
      const bookingData = await response.json();
      
      if (bookingData.bookingLink) {
        // Open the SMART scheduling deep-link
        window.open(bookingData.bookingLink, '_blank');
        
        toast({
          title: "Redirecting to Booking",
          description: "Opening provider's booking system to complete your appointment.",
        });
        
        onClose();
      } else if (bookingData.bookingPhone) {
        // Show phone number for booking
        toast({
          title: "Call to Book",
          description: `Please call ${bookingData.bookingPhone} to book this appointment.`,
          duration: 10000,
        });
      } else {
        throw new Error("No booking method available");
      }
    } catch (error) {
      toast({
        title: "Booking Error",
        description: "Unable to initiate booking. Please try again or contact the provider directly.",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (!provider) return null;

  const practitionerName = provider.practitioner && typeof provider.practitioner === 'object' && 'display' in provider.practitioner 
    ? provider.practitioner.display as string 
    : 'Unknown Provider';

  const specialty = Array.isArray(provider.specialty) && provider.specialty.length > 0 && provider.specialty[0].coding 
    ? provider.specialty[0].coding[0]?.display || 'General Practice'
    : 'General Practice';

  const locationName = location?.name || 'Unknown Location';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="booking-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span data-testid="text-booking-title">Book Appointment</span>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-modal">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Complete your appointment booking with the selected provider.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Provider Information */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-foreground" data-testid="text-selected-provider-name">
                  {practitionerName}
                </h4>
                <p className="text-sm text-muted-foreground" data-testid="text-selected-provider-specialty">
                  {specialty}
                </p>
                <p className="text-xs text-muted-foreground" data-testid="text-selected-provider-location">
                  {locationName}
                </p>
              </div>
            </div>
          </div>
          
          {/* Selected Time */}
          {slot && (
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">
                Selected Time
              </Label>
              <div className="p-3 bg-accent/10 border border-accent/20 rounded-md">
                <div className="flex items-center text-accent">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="font-medium" data-testid="text-selected-slot-time">
                    {formatDateTime(slot.start)}
                  </span>
                </div>
                <div className="mt-1 flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {slot.status === 'free' ? 'Available' : 'Selected'}
                  </Badge>
                  {new Date(slot.start).toDateString() === new Date().toDateString() && (
                    <Badge variant="secondary" className="text-xs bg-secondary/10 text-secondary">
                      Same Day
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Appointment Type */}
          <div>
            <Label htmlFor="appointment-type" className="block text-sm font-medium text-foreground mb-2">
              Appointment Type
            </Label>
            <Select value={appointmentType} onValueChange={setAppointmentType}>
              <SelectTrigger data-testid="select-appointment-type">
                <SelectValue placeholder="Select appointment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine Consultation</SelectItem>
                <SelectItem value="followup">Follow-up Visit</SelectItem>
                <SelectItem value="new-patient">New Patient Exam</SelectItem>
                <SelectItem value="urgent">Urgent Care</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Reason for Visit */}
          <div>
            <Label htmlFor="reason" className="block text-sm font-medium text-foreground mb-2">
              Reason for Visit
            </Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Brief description of your concern..."
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              className="resize-none"
              data-testid="textarea-reason-for-visit"
            />
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-booking">
            Cancel
          </Button>
          <Button 
            onClick={handleBookAppointment}
            disabled={isBooking || !slot}
            className="flex-1"
            data-testid="button-confirm-booking"
          >
            {isBooking ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"></div>
                Booking...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Book Appointment
              </>
            )}
          </Button>
        </div>
        
        {/* Booking Information */}
        <div className="text-xs text-muted-foreground text-center mt-2">
          You will be redirected to the provider's booking system to complete your appointment.
        </div>
      </DialogContent>
    </Dialog>
  );
}
