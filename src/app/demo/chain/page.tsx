"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoFlow } from "@/lib/demo-flow-context";
import { ChainLocationList } from "@/components/demo/chain-location-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { PlaceSummary, TextSearchResponse } from "@/lib/types";

export default function ChainPage() {
  const { state, dispatch } = useDemoFlow();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.selectedPlace) {
      router.replace("/demo/location");
      return;
    }

    async function fetchChain() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/places/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: state.selectedPlace!.displayName }),
        });

        if (!res.ok) throw new Error("Search failed");

        const data: TextSearchResponse = await res.json();
        dispatch({ type: "SET_CHAIN_LOCATIONS", payload: data.places });
      } catch {
        setError("Failed to find locations. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchChain();
  }, [state.selectedPlace, dispatch, router]);

  function handleConfirm(confirmed: PlaceSummary[]) {
    dispatch({ type: "SET_CONFIRMED_LOCATIONS", payload: confirmed });
    router.push("/demo/insights");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your locations</h1>
        <p className="mt-2 text-muted-foreground">
          We found locations matching &ldquo;
          {state.selectedPlace?.displayName}&rdquo;. Confirm which ones belong
          to your business.
        </p>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && state.chainLocations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No other locations found.
        </p>
      )}

      {!loading && !error && state.chainLocations.length > 0 && (
        <ChainLocationList
          locations={state.chainLocations}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
