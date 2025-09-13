import { useEffect, useRef, useState } from "react";
import { Expand, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Location, PractitionerRole } from "@shared/schema";

interface LocationMapProps {
  locations: Location[];
  selectedProvider?: PractitionerRole | null;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function LocationMap({ locations, selectedProvider }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      // Default to Boston, MA
      const defaultCenter = { lat: 42.3601, lng: -71.0589 };
      
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: defaultCenter,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      setIsMapLoaded(true);
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      // Set up callback for when Google Maps loads
      window.initMap = initializeMap;
      
      // Load Google Maps API if not already loaded
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&callback=initMap&libraries=places`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  }, []);

  useEffect(() => {
    if (!isMapLoaded || !mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for each location
    const bounds = new window.google.maps.LatLngBounds();
    
    locations.forEach((location) => {
      // Try to geocode the address if no position is provided
      const address = location.address && typeof location.address === 'object' 
        ? `${(location.address as any).line?.join(', ')}, ${(location.address as any).city}, ${(location.address as any).state} ${(location.address as any).postalCode}`
        : location.name;

      if (location.position && typeof location.position === 'object' && 'latitude' in location.position && 'longitude' in location.position) {
        // Use provided coordinates
        const position = {
          lat: location.position.latitude as number,
          lng: location.position.longitude as number
        };
        
        createMarker(location, position);
        bounds.extend(position);
      } else {
        // Geocode the address
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address }, (results: any, status: any) => {
          if (status === 'OK' && results[0]) {
            const position = results[0].geometry.location;
            createMarker(location, position);
            bounds.extend(position);
            
            // Fit map to show all markers
            if (markersRef.current.length === locations.length) {
              mapInstanceRef.current.fitBounds(bounds);
            }
          }
        });
      }
    });

    function createMarker(location: Location, position: any) {
      const marker = new window.google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: location.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#1d4ed8', // primary color
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      });

      // Create info window
      const phone = Array.isArray(location.telecom) 
        ? location.telecom.find((t: any) => t.system === 'phone')?.value || 'N/A'
        : 'N/A';
      
      const address = location.address && typeof location.address === 'object'
        ? `${(location.address as any).line?.join('<br>')}<br>${(location.address as any).city}, ${(location.address as any).state} ${(location.address as any).postalCode}`
        : 'Address not available';

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold text-base mb-2">${location.name}</h3>
            <div class="text-sm text-gray-600 mb-1">
              <strong>Address:</strong><br>
              ${address}
            </div>
            <div class="text-sm text-gray-600 mb-2">
              <strong>Phone:</strong> ${phone}
            </div>
            ${location.description ? `<div class="text-sm text-gray-600">${location.description}</div>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    }

    // Fit map to show all markers if we have coordinates
    if (locations.some(loc => loc.position)) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [locations, isMapLoaded]);

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-sm" data-testid="location-map">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground" data-testid="text-map-title">
          Provider Locations
        </h3>
        <Button variant="ghost" size="sm" className="text-primary" data-testid="button-fullscreen">
          <Expand className="w-4 h-4 mr-1" />
          Fullscreen
        </Button>
      </div>
      
      <div 
        ref={mapRef}
        className="h-64 bg-muted rounded-lg relative overflow-hidden"
        data-testid="map-container"
      >
        {!isMapLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            <div className="text-center z-10">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Loading Interactive Map...</p>
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mx-auto mt-2"></div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3 flex items-center text-xs text-muted-foreground">
        <MapPin className="w-3 h-3 mr-1" />
        Click markers to view provider details
      </div>
    </div>
  );
}
