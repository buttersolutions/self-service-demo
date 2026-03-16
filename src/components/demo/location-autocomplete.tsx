"use client";

import { useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PlaceSummary } from "@/lib/types";

interface LocationAutocompleteProps {
  onPlaceSelected: (place: PlaceSummary) => void;
  placeholder?: string;
  autocompleteTypes?: string[];
  className?: string;
}

function extractCountryCode(
  place: google.maps.places.PlaceResult
): string | undefined {
  const country = place.address_components?.find((c) =>
    c.types.includes("country")
  );
  return country?.short_name?.toLowerCase();
}

export function LocationAutocomplete({
  onPlaceSelected,
  placeholder = "Search for your business...",
  autocompleteTypes = ["establishment"],
  className,
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
      types: place.types,
      countryCode: extractCountryCode(place),
      location: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      },
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onPlaceSelected]);

  useEffect(() => {
    if (autocompleteRef.current) return;

    function init() {
      if (!window.google?.maps?.places || !inputRef.current) return false;

      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        types: autocompleteTypes,
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "website",
          "geometry.location",
          "types",
          "address_components",
        ],
      });

      ac.addListener("place_changed", handlePlaceChanged);
      autocompleteRef.current = ac;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const bias = new google.maps.Circle({
              center: { lat: latitude, lng: longitude },
              radius: 50000,
            });
            ac.setBounds(bias.getBounds()!);
          },
          () => {}
        );
      }

      return true;
    }

    if (init()) return;

    const interval = setInterval(() => {
      if (init()) clearInterval(interval);
    }, 200);

    return () => clearInterval(interval);
  }, [handlePlaceChanged, autocompleteTypes]);

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      className={cn("w-full", className)}
    />
  );
}
