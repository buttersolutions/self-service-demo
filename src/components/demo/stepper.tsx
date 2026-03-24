"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/lib/demo-flow-context";

const steps = [
  { label: "Location", href: "/demo/location", step: 1 },
  { label: "Chain", href: "/demo/chain", step: 2 },
  { label: "Insights", href: "/demo/insights", step: 3 },
] as const;

export function Stepper() {
  const pathname = usePathname();
  const { state } = useOnboarding();

  const currentStep =
    steps.find((s) => pathname.startsWith(s.href))?.step ?? 1;

  function canNavigate(step: number) {
    if (step === 1) return true;
    if (step === 2) return !!state.selectedPlace;
    if (step === 3) return state.locations.length > 0;
    return false;
  }

  return (
    <nav className="flex items-center justify-center gap-2 py-6">
      {steps.map((s, i) => {
        const isActive = s.step === currentStep;
        const isCompleted = s.step < currentStep;
        const navigable = canNavigate(s.step);

        return (
          <div key={s.step} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-8",
                  isCompleted ? "bg-foreground" : "bg-border"
                )}
              />
            )}
            {navigable && !isActive ? (
              <Link
                href={s.href}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium transition-colors",
                  isCompleted
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isCompleted
                      ? "bg-foreground text-background"
                      : "border border-border"
                  )}
                >
                  {s.step}
                </span>
                {s.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isActive
                      ? "bg-foreground text-background"
                      : "border border-border"
                  )}
                >
                  {s.step}
                </span>
                {s.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
