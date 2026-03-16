interface ScanningAnimationProps {
  status: string;
}

export function ScanningAnimation({ status }: ScanningAnimationProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <div className="relative flex h-32 w-32 items-center justify-center">
        {/* Ring 1 — outermost */}
        <span className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ring-pulse" />
        {/* Ring 2 */}
        <span
          className="absolute inset-3 rounded-full border-2 border-primary/30 animate-ring-pulse"
          style={{ animationDelay: "0.4s" }}
        />
        {/* Ring 3 — innermost */}
        <span
          className="absolute inset-6 rounded-full border-2 border-primary/50 animate-ring-pulse"
          style={{ animationDelay: "0.8s" }}
        />
        {/* Center dot */}
        <span className="h-4 w-4 rounded-full bg-primary" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        {status}
      </p>
    </div>
  );
}
