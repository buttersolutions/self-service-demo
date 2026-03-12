"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompanyInsight } from "@/lib/saber";

interface CompanyInsightsProps {
  domain: string;
}

export function CompanyInsights({ domain }: CompanyInsightsProps) {
  const [insights, setInsights] = useState<CompanyInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch_() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/company/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });

        if (!res.ok) throw new Error("Failed to fetch insights");

        const data = await res.json();
        setInsights(data.insights);
      } catch {
        setError("Failed to load company insights.");
      } finally {
        setLoading(false);
      }
    }

    fetch_();
  }, [domain]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Intelligence</CardTitle>
        <CardDescription>
          AI-researched insights for {domain}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {insights.map((insight, i) => (
          <div key={insight.label}>
            {i > 0 && <Separator className="mb-5" />}
            <InsightBlock insight={insight} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InsightBlock({ insight }: { insight: CompanyInsight }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">{insight.label}</h3>
        {insight.confidence != null && (
          <Badge variant="secondary" className="text-xs">
            {Math.round(insight.confidence * 100)}% confidence
          </Badge>
        )}
      </div>

      {insight.error ? (
        <p className="text-sm text-muted-foreground italic">
          Could not determine — {insight.error}
        </p>
      ) : (
        <InsightAnswer insight={insight} />
      )}

      {insight.sources && insight.sources.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {insight.sources.slice(0, 3).map((src, i) => (
            <a
              key={i}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              {src.title || new URL(src.url).hostname}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightAnswer({ insight }: { insight: CompanyInsight }) {
  const { answer, answerType } = insight;

  if (answer === null || answer === undefined) {
    return (
      <p className="text-sm text-muted-foreground italic">No data available</p>
    );
  }

  if (answerType === "list" && Array.isArray(answer)) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {answer.map((item, i) => (
          <li key={i} className="text-sm">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (answerType === "number" && typeof answer === "number") {
    return <p className="text-2xl font-semibold">{answer.toLocaleString()}</p>;
  }

  if (answerType === "boolean" && typeof answer === "boolean") {
    return (
      <Badge variant={answer ? "default" : "secondary"}>
        {answer ? "Yes" : "No"}
      </Badge>
    );
  }

  // open_text or fallback
  return <p className="text-sm leading-relaxed whitespace-pre-line">{String(answer)}</p>;
}
