"use client";

import Script from "next/script";
import { DemoFlowProvider, useDemoFlow } from "@/lib/demo-flow-context";
import { Stepper } from "@/components/demo/stepper";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

function DemoShell({ children }: { children: React.ReactNode }) {
  const { dispatch } = useDemoFlow();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl px-4">
      <div className="flex items-center justify-between">
        <Stepper />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            dispatch({ type: "RESET" });
            router.push("/demo/location");
          }}
        >
          Start over
        </Button>
      </div>
      <main className="pb-16">{children}</main>
    </div>
  );
}

export default function DemoStepsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoFlowProvider>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
        strategy="afterInteractive"
      />
      <DemoShell>{children}</DemoShell>
    </DemoFlowProvider>
  );
}
