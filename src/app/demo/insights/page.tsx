"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoFlow } from "@/lib/demo-flow-context";
import { LocationDetailsCard } from "@/components/demo/location-details-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlaceDetailsResponse } from "@/lib/types";

export default function InsightsPage() {
  const { state, dispatch } = useDemoFlow();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.confirmedLocations.length === 0) {
      router.replace("/demo/chain");
      return;
    }

    // Skip fetch if we already have details
    if (state.locationDetails.length > 0) {
      setLoading(false);
      return;
    }

    async function fetchDetails() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/places/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            placeIds: state.confirmedLocations.map((l) => l.placeId),
          }),
        });

        if (!res.ok) throw new Error("Details fetch failed");

        const data: PlaceDetailsResponse = await res.json();
        dispatch({ type: "SET_LOCATION_DETAILS", payload: data.details });
      } catch {
        setError("Failed to fetch location details. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [state.confirmedLocations, state.locationDetails.length, dispatch, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews &amp; Photos</h1>
        <p className="mt-2 text-muted-foreground">
          See what customers are saying across your{" "}
          {state.confirmedLocations.length} location
          {state.confirmedLocations.length !== 1 && "s"}.
        </p>
      </div>

      {loading && (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="space-y-6">
          {state.locationDetails.map((details) => (
            <LocationDetailsCard key={details.placeId} details={details} />
          ))}
        </div>
      )}
    </div>
  );
}
