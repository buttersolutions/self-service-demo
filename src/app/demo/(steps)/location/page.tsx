"use client";

import { useRouter } from "next/navigation";
import { useDemoFlow } from "@/lib/demo-flow-context";
import { LocationAutocomplete } from "@/components/demo/location-autocomplete";
import { PlaceCard } from "@/components/demo/place-card";
import { Button } from "@/components/ui/button";
import type { PlaceSummary } from "@/lib/types";

export default function LocationPage() {
  const { state, dispatch } = useDemoFlow();
  const router = useRouter();

  function handlePlaceSelected(place: PlaceSummary) {
    dispatch({ type: "SET_SELECTED_PLACE", payload: place });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Select your location</h1>
        <p className="mt-2 text-muted-foreground">
          Search for your business to get started.
        </p>
      </div>

      <LocationAutocomplete onPlaceSelected={handlePlaceSelected} />

      {state.selectedPlace && (
        <div className="space-y-4">
          <PlaceCard place={state.selectedPlace} />
          <div className="flex justify-end">
            <Button onClick={() => router.push("/demo/chain")}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
