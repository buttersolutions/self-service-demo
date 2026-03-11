"use client";

import { useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import type { PlaceSummary } from "@/lib/types";

interface LocationAutocompleteProps {
  onPlaceSelected: (place: PlaceSummary) => void;
}

export function LocationAutocomplete({
  onPlaceSelected,
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handlePlaceChanged = useCallback(() => {
    const ac = autocompleteRef.current;
    if (!ac) return;

    const place = ac.getPlace();
    if (!place.place_id || !place.geometry?.location) return;

    onPlaceSelected({
      placeId: place.place_id,
      displayName: place.name ?? "",
      formattedAddress: place.formatted_address ?? "",
      websiteUri: place.website,
      location: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
    });
  }, [onPlaceSelected]);

  useEffect(() => {
    if (autocompleteRef.current) return;

    function init() {
      if (!window.google?.maps?.places || !inputRef.current) return false;

      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        types: ["establishment"],
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "website",
          "geometry.location",
        ],
      });

      ac.addListener("place_changed", handlePlaceChanged);
      autocompleteRef.current = ac;
      return true;
    }

    if (init()) return;

    // Poll until Google Maps SDK is loaded
    const interval = setInterval(() => {
      if (init()) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [handlePlaceChanged]);

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder="Search for your business..."
      className="w-full"
    />
  );
}
