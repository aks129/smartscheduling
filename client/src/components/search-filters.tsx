import { useState } from "react";
import { Search, MapPin, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SearchFilters } from "@shared/schema";

interface SearchFiltersProps {
  onSearch: (filters: SearchFilters) => void;
}

const SPECIALTIES = [
  { value: "dermatology", label: "Dermatology" },
  { value: "gynecology", label: "Gynecology" },
  { value: "family-practice", label: "Family Practice" },
  { value: "internal-medicine", label: "Internal Medicine" },
  { value: "general-practice", label: "General Medical Practice" },
];

export default function SearchFilters({ onSearch }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    searchQuery: "",
    specialty: "",
    location: "",
    dateFrom: "",
    dateTo: "",
    availableOnly: false,
  });

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6 shadow-sm" data-testid="search-filters">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="search-query" className="block text-sm font-medium text-foreground mb-2">
            Search Providers
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="search-query"
              type="text"
              placeholder="Provider name or condition..."
              className="pl-10"
              value={filters.searchQuery}
              onChange={(e) => handleFilterChange("searchQuery", e.target.value)}
              data-testid="input-search-query"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="specialty" className="block text-sm font-medium text-foreground mb-2">
            Specialty
          </Label>
          <Select value={filters.specialty} onValueChange={(value) => handleFilterChange("specialty", value)}>
            <SelectTrigger data-testid="select-specialty">
              <SelectValue placeholder="All Specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specialties</SelectItem>
              {SPECIALTIES.map((specialty) => (
                <SelectItem key={specialty.value} value={specialty.value}>
                  {specialty.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="location" className="block text-sm font-medium text-foreground mb-2">
            Location
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="location"
              type="text"
              placeholder="City or ZIP code..."
              className="pl-10"
              value={filters.location}
              onChange={(e) => handleFilterChange("location", e.target.value)}
              data-testid="input-location"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="date-from" className="block text-sm font-medium text-foreground mb-2">
            Date From
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              id="date-from"
              type="date"
              className="pl-10"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              data-testid="input-date-from"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-primary" data-testid="button-more-filters">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
        <Button onClick={handleSearch} data-testid="button-search">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>
    </div>
  );
}
