import { StarRating } from "./star-rating";
import { cn } from "@/lib/utils";
import type { ReviewInsight } from "@/lib/types";

interface StaffReviewCardProps {
  mention: ReviewInsight;
}

export function StaffReviewCard({ mention }: StaffReviewCardProps) {
  const isPositive = mention.sentiment === "positive";

  return (
    <div
      className={cn(
        "rounded-xl border-l-4 bg-card p-4",
        isPositive ? "border-l-green-500" : "border-l-amber-500"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={mention.reviewRating} />
          <span className="text-sm font-medium">{mention.reviewAuthor}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {mention.locationName}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed">
        {mention.relevantExcerpt}
      </p>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {mention.allgravyModule}
        </span>
      </div>
    </div>
  );
}
