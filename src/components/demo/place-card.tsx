import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Globe } from "lucide-react";
import type { PlaceSummary } from "@/lib/types";

interface PlaceCardProps {
  place: PlaceSummary;
  children?: React.ReactNode;
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function PlaceCard({ place, children }: PlaceCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h3 className="font-semibold leading-none">{place.displayName}</h3>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {place.formattedAddress}
          </p>
          {place.websiteUri && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              {extractDomain(place.websiteUri)}
            </p>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
