import type { StaffAnalysis } from "@/lib/types";

interface StaffNarrativeHeroProps {
  analysis: StaffAnalysis;
  locationCount: number;
  className?: string;
}

export function StaffNarrativeHero({
  analysis,
  locationCount,
  className,
}: StaffNarrativeHeroProps) {
  return (
    <section className={className ?? "py-12 md:py-20"}>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
        &ldquo;{analysis.headline}&rdquo;
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        {analysis.body}
      </p>

      <div className="mt-8 flex flex-wrap gap-6">
        <Stat value={analysis.totalReviewsAnalyzed} label="reviews analyzed" />
        <Stat
          value={analysis.positiveCount + analysis.negativeCount}
          label="mention staff"
        />
        <Stat value={locationCount} label={locationCount === 1 ? "location scanned" : "locations scanned"} />
        {analysis.namedEmployees.length > 0 && (
          <Stat
            value={analysis.namedEmployees.length}
            label={analysis.namedEmployees.length === 1 ? "employee named" : "employees named"}
          />
        )}
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
