"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AllgravyLogo } from "@/components/ui/allgravy-logo";
import type { OnboardingStep } from "@/lib/onboarding-steps";

interface ProgressPanelProps {
  steps: OnboardingStep[];
  currentStepIndex: number;
  completedSteps: Set<string>;
  businessName: string;
}

export function ProgressPanel({
  steps,
  currentStepIndex,
  completedSteps,
}: ProgressPanelProps) {
  const allDone = completedSteps.size === steps.length;
  const progressValue = (completedSteps.size / steps.length) * 100;

  return (
    <div className="h-full flex flex-col bg-card rounded-2xl border border-border font-sans">
      {/* Steps */}
      <div className="flex-1 px-3 py-4">
        <div className="space-y-0.5">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = index === currentStepIndex && !allDone;
            const isPending = !isCompleted && !isCurrent;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors ${
                  isCurrent ? "bg-muted" : ""
                }`}
              >
                <div className="flex-shrink-0 relative">
                  {isCompleted ? (
                    <>
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0.6 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute inset-0 bg-primary rounded-full"
                      />
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="w-5 h-5 bg-primary rounded-full flex items-center justify-center relative"
                      >
                        <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                      </motion.div>
                    </>
                  ) : isCurrent ? (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Circle className="w-3.5 h-3.5 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span
                    className={`text-xs font-medium block ${
                      isPending ? "text-muted-foreground/40" : "text-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[11px] text-muted-foreground block mt-0.5 leading-tight"
                    >
                      {step.description}
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom progress */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>Progress</span>
          <span>{Math.round(progressValue)}%</span>
        </div>
        <Progress value={progressValue} className="h-1" />
      </div>

      {/* Logo */}
      <div className="px-4 py-3 flex items-center justify-center">
        <AllgravyLogo className="h-5 text-muted-foreground/40" />
      </div>
    </div>
  );
}
