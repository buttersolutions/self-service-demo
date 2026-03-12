"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessLocation } from "@/lib/mock-data";

interface LocationsEditorProps {
  locations: BusinessLocation[];
  businessName: string;
  onConfirm: () => void;
}

export function LocationsEditor({
  locations: initialLocations,
  businessName,
  onConfirm,
}: LocationsEditorProps) {
  const [locations, setLocations] = useState(initialLocations);

  const removeLocation = (id: string) =>
    setLocations((prev) => prev.filter((l) => l.id !== id));

  const addLocation = () =>
    setLocations((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "New Location",
        address: "Enter address...",
        lat: 0,
        lng: 0,
        isMain: false,
      },
    ]);

  return (
    <div className="h-full flex items-center justify-center p-8 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
            className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <MapPin className="w-6 h-6 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            We found {locations.length} location{locations.length !== 1 ? "s" : ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            Confirm the locations for {businessName}. You can rename, remove, or add new ones.
          </p>
        </div>

        <div className="space-y-2.5 mb-8">
          <AnimatePresence>
            {locations.map((loc, i) => (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16, height: 0, marginBottom: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                className="flex items-center gap-3 py-3.5 px-4 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors group"
              >
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    loc.isMain ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="text-sm font-medium text-foreground outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/20 rounded px-0.5 -mx-0.5"
                  >
                    {loc.name}
                  </div>
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="text-xs text-muted-foreground mt-0.5 outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/20 rounded px-0.5 -mx-0.5"
                  >
                    {loc.address}
                  </div>
                </div>
                {loc.isMain && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full flex-shrink-0">
                    Main
                  </span>
                )}
                <button
                  onClick={() => removeLocation(loc.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-lg flex-shrink-0"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={addLocation}
            className="flex items-center gap-2.5 py-3.5 px-4 rounded-xl border-2 border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-colors w-full text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4" />
            Add a location
          </motion.button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-center"
        >
          <Button size="lg" onClick={onConfirm} className="gap-2 px-8">
            <Check className="w-4 h-4" />
            Confirm locations
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
