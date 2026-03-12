import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "./star-rating";
import type { PlaceReview } from "@/lib/types";

interface ReviewCardProps {
  review: PlaceReview;
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{review.authorName}</p>
          <span className="text-xs text-muted-foreground">
            {review.relativePublishTimeDescription}
          </span>
        </div>
        <StarRating rating={review.rating} />
        {review.text && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {review.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
