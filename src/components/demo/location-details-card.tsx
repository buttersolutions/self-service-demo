import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin } from "lucide-react";
import { StarRating } from "./star-rating";
import { ReviewCard } from "./review-card";
import { PhotoGrid } from "./photo-grid";
import type { PlaceDetails } from "@/lib/types";

interface LocationDetailsCardProps {
  details: PlaceDetails;
}

export function LocationDetailsCard({ details }: LocationDetailsCardProps) {
  const sortedReviews = [...details.reviews].sort(
    (a, b) => b.rating - a.rating
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">{details.displayName}</h3>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {details.formattedAddress}
            </p>
          </div>
          {details.rating != null && (
            <div className="flex items-center gap-2">
              <StarRating rating={details.rating} />
              <Badge variant="secondary">
                {details.rating.toFixed(1)}
                {details.userRatingCount != null && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({details.userRatingCount})
                  </span>
                )}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Photos */}
        <div>
          <h4 className="mb-3 text-sm font-medium">Photos</h4>
          <PhotoGrid photos={details.photos} />
        </div>

        <Separator />

        {/* Reviews */}
        <div>
          <h4 className="mb-3 text-sm font-medium">
            Reviews
            {sortedReviews.length > 0 && (
              <span className="ml-1 font-normal text-muted-foreground">
                ({sortedReviews.length})
              </span>
            )}
          </h4>
          {sortedReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reviews available.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedReviews.map((review, i) => (
                <ReviewCard key={i} review={review} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
