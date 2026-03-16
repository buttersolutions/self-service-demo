import { StarRating } from "./star-rating";
import { cn } from "@/lib/utils";
import type { StaffMention } from "@/lib/types";

interface StaffReviewCardProps {
  mention: StaffMention;
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
        {highlightNames(mention.relevantExcerpt, mention.staffNames)}
      </p>

      {mention.staffNames.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {mention.staffNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function highlightNames(text: string, names: string[]): React.ReactNode {
  if (!names.length) return text;

  const pattern = new RegExp(`(${names.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isName = names.some(
      (n) => n.toLowerCase() === part.toLowerCase()
    );
    return isName ? (
      <strong key={i} className="font-semibold text-primary">
        {part}
      </strong>
    ) : (
      part
    );
  });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
