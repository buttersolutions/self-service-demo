import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Location Intelligence
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Discover reviews and photos across all your locations.
        </p>
        <Link
          href="/demo/location"
          className="mt-8 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Start Demo
        </Link>
      </div>
    </div>
  );
}
