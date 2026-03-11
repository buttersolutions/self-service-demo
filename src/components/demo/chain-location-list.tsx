"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PlaceCard } from "./place-card";
import type { PlaceSummary } from "@/lib/types";

interface ChainLocationListProps {
  locations: PlaceSummary[];
  onConfirm: (confirmed: PlaceSummary[]) => void;
}

export function ChainLocationList({
  locations,
  onConfirm,
}: ChainLocationListProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(locations.map((l) => l.placeId))
  );

  function toggle(placeId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  }

  function handleConfirm() {
    const confirmed = locations.filter((l) => selected.has(l.placeId));
    onConfirm(confirmed);
  }

  return (
    <div className="space-y-3">
      {locations.map((location) => (
        <PlaceCard key={location.placeId} place={location}>
          <Checkbox
            checked={selected.has(location.placeId)}
            onCheckedChange={() => toggle(location.placeId)}
          />
        </PlaceCard>
      ))}

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-muted-foreground">
          {selected.size} of {locations.length} selected
        </p>
        <Button onClick={handleConfirm} disabled={selected.size === 0}>
          Continue
        </Button>
      </div>
    </div>
  );
}
