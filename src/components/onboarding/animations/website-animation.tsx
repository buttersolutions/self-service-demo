"use client";

import { motion } from "framer-motion";
import { Globe, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface WebsiteAnimationProps {
  website: string;
  businessName: string;
  isActive: boolean;
}

export function WebsiteAnimation({ website, businessName, isActive }: WebsiteAnimationProps) {
  const checks = [
    { label: "SSL Certificate", status: "pass", detail: "Valid, expires in 8 months" },
    { label: "Mobile Responsive", status: "pass", detail: "Fully responsive" },
    { label: "Page Load Speed", status: "warn", detail: "3.2s — could be faster" },
    { label: "SEO Meta Tags", status: "pass", detail: "Title, description present" },
    { label: "Online Ordering", status: "warn", detail: "Not detected" },
    { label: "Social Links", status: "pass", detail: "Instagram, Facebook found" },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-4">
        {/* URL bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground flex-1 font-mono">{website}</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground/40" />
            </div>
          </Card>
        </motion.div>

        {/* Mini browser */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isActive ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-1.5 px-3 py-2.5 bg-muted border-b border-border">
              <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
              <div className="flex-1 mx-4 h-5 bg-background rounded border border-border px-2 flex items-center">
                <span className="text-[10px] text-muted-foreground truncate font-mono">{website}</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-20 bg-muted/50 rounded w-full" />
              <div className="flex gap-2">
                <div className="h-3 bg-muted rounded flex-1" />
                <div className="h-3 bg-muted rounded flex-1" />
              </div>
              <div className="h-3 bg-muted/50 rounded w-2/3" />
            </div>
          </Card>
        </motion.div>

        {/* Scan results */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isActive ? { opacity: 1 } : {}}
          transition={{ delay: 1.0, duration: 0.4 }}
        >
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Website Analysis
            </p>
            <div className="space-y-2">
              {checks.map((check, i) => (
                <motion.div
                  key={check.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isActive ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 1.3 + i * 0.25, duration: 0.3 }}
                  className="flex items-center gap-2.5 py-1"
                >
                  {check.status === "pass" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="text-sm text-foreground flex-1">{check.label}</span>
                  <span className="text-xs text-muted-foreground">{check.detail}</span>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
