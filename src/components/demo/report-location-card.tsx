import { MapPin, Star, MessageSquare } from "lucide-react";
import type { PlaceDetails } from "@/lib/types";

interface ReportLocationCardProps {
  location: PlaceDetails;
}

export function ReportLocationCard({ location }: ReportLocationCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h4 className="font-medium">{location.displayName}</h4>
      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span className="truncate">{location.formattedAddress}</span>
      </div>
      <div className="mt-2 flex items-center gap-4 text-sm">
        {location.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{location.rating.toFixed(1)}</span>
          </div>
        )}
        {(location.userRatingCount ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{location.userRatingCount} reviews</span>
          </div>
        )}
      </div>
    </div>
  );
}
