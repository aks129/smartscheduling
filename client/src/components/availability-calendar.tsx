import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate, getWeekDays, getMonthName } from "@/lib/date-utils";
import type { Slot } from "@shared/schema";

interface AvailabilityCalendarProps {
  slots: Slot[];
  onSlotSelect?: (slot: Slot) => void;
}

export default function AvailabilityCalendar({ slots, onSlotSelect }: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Get calendar days for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const calendarDays: Date[] = [];
  const currentCalendarDate = new Date(startDate);
  
  for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
    calendarDays.push(new Date(currentCalendarDate));
    currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
  }

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    const dateKey = formatDate(new Date(slot.start));
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  const getDateAvailability = (date: Date) => {
    const dateKey = formatDate(date);
    const dateSlots = slotsByDate[dateKey] || [];
    const availableSlots = dateSlots.filter(slot => slot.status === 'free');
    
    if (availableSlots.length === 0) return 'unavailable';
    if (availableSlots.length < 3) return 'limited';
    return 'available';
  };

  const handleDateClick = (date: Date) => {
    const dateKey = formatDate(date);
    const dateSlots = slotsByDate[dateKey] || [];
    const availableSlots = dateSlots.filter(slot => slot.status === 'free');
    
    if (availableSlots.length > 0 && onSlotSelect) {
      // Select the first available slot for this date
      onSlotSelect(availableSlots[0]);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-sm" data-testid="availability-calendar">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground" data-testid="text-calendar-title">
          Quick Availability
        </h3>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigateMonth('prev')}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground" data-testid="text-current-month">
            {getMonthName(currentDate)} {currentDate.getFullYear()}
          </span>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigateMonth('next')}
            data-testid="button-next-month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {getWeekDays().map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground text-center p-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = date.getMonth() === month;
          const isToday = date.getTime() === today.getTime();
          const isPast = date < today;
          const availability = getDateAvailability(date);
          const dateKey = formatDate(date);
          const slotsCount = slotsByDate[dateKey]?.filter(slot => slot.status === 'free').length || 0;

          return (
            <button
              key={index}
              className={cn(
                "p-2 text-sm rounded relative transition-colors",
                !isCurrentMonth && "text-muted-foreground/50",
                isCurrentMonth && !isPast && "hover:bg-muted",
                isToday && "bg-primary text-primary-foreground font-medium",
                !isToday && availability === 'available' && isCurrentMonth && !isPast && "available-slot font-medium",
                !isToday && availability === 'limited' && isCurrentMonth && !isPast && "limited-slot",
                availability === 'unavailable' && isCurrentMonth && !isPast && "unavailable-slot",
                isPast && "text-muted-foreground cursor-not-allowed"
              )}
              disabled={isPast || availability === 'unavailable'}
              onClick={() => !isPast && availability !== 'unavailable' && handleDateClick(date)}
              data-testid={`button-date-${formatDate(date)}`}
            >
              {date.getDate()}
              {slotsCount > 0 && availability !== 'unavailable' && !isPast && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" data-testid={`indicator-slots-${formatDate(date)}`}></div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 available-slot rounded"></div>
            <span className="text-muted-foreground">Available (3+)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 limited-slot rounded"></div>
            <span className="text-muted-foreground">Limited (1-2)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 unavailable-slot rounded"></div>
            <span className="text-muted-foreground">Full</span>
          </div>
        </div>
      </div>
    </div>
  );
}
