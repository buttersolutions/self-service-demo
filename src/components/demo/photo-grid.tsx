import type { PlacePhoto } from "@/lib/types";

interface PhotoGridProps {
  photos: PlacePhoto[];
  maxPhotos?: number;
}

export function PhotoGrid({ photos, maxPhotos = 4 }: PhotoGridProps) {
  const visible = photos.slice(0, maxPhotos);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No photos available.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {visible.map((photo) => (
        <div
          key={photo.name}
          className="aspect-square overflow-hidden rounded-md bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/places/photo?name=${encodeURIComponent(photo.name)}&maxWidthPx=400`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
