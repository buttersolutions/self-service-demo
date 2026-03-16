"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoFlow } from "@/lib/demo-flow-context";
import { LocationDetailsCard } from "@/components/demo/location-details-card";
import { CompanyInsights } from "@/components/demo/company-insights";
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

  const companyDomain = (() => {
    const uri = state.selectedPlace?.websiteUri;
    if (!uri) return null;
    try {
      return new URL(uri).hostname.replace("www.", "");
    } catch {
      return null;
    }
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Location Intelligence</h1>
        <p className="mt-2 text-muted-foreground">
          AI-powered insights and reviews across your{" "}
          {state.confirmedLocations.length} location
          {state.confirmedLocations.length !== 1 && "s"}.
        </p>
      </div>

      {companyDomain && <CompanyInsights domain={companyDomain} />}

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
