"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, MapPin, Star, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { searchBusinesses, type BusinessResult } from "@/lib/mock-data";

interface SearchPageProps {
  onSelectBusiness: (business: BusinessResult) => void;
}

export function SearchPage({ onSelectBusiness }: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BusinessResult[]>([]);
  const [selected, setSelected] = useState<BusinessResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length >= 2) {
      const matches = searchBusinesses(query);
      setResults(matches);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query]);

  const handleSelect = (business: BusinessResult) => {
    setSelected(business);
    setQuery(business.name);
    setShowResults(false);
  };

  const handleContinue = () => {
    if (!selected) return;
    setIsLaunching(true);
    setTimeout(() => onSelectBusiness(selected), 600);
  };

  return (
    <div className="min-h-screen bg-background font-sans flex items-center justify-center">
      <div className="w-full max-w-xl px-6 relative">
        {/* Search Box */}
        <Card
          className={`transition-all duration-300 p-0 ${
            showResults && results.length > 0
              ? "rounded-b-none shadow-lg"
              : selected
              ? "ring-2 ring-primary shadow-lg"
              : "shadow-sm"
          }`}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              placeholder="Find your business..."
              className="border-0 shadow-none focus-visible:ring-0 px-0 text-base font-sans"
              autoFocus
            />
            <AnimatePresence>
              {selected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Button
                    onClick={handleContinue}
                    disabled={isLaunching}
                    size="sm"
                    className="gap-2 rounded-lg font-sans"
                  >
                    {isLaunching ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      />
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Results Dropdown */}
        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="rounded-t-none border-t-0 shadow-lg p-0 overflow-hidden">
                {results.map((business, i) => (
                  <motion.button
                    key={business.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleSelect(business)}
                    className="w-full flex items-start gap-4 px-5 py-4 hover:bg-muted transition-colors text-left cursor-pointer border-t border-border first:border-t-0 font-sans"
                  >
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{business.name}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{business.address}</div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Badge variant="secondary" className="text-xs font-normal font-sans">
                          {business.category}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {business.rating} ({business.reviewCount})
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint */}
        <p className="text-center text-xs text-muted-foreground mt-4 font-sans">
          Try &quot;Bella&quot;, &quot;Golden&quot;, &quot;Sunrise&quot;, or &quot;Smoke&quot;
        </p>
      </div>
    </div>
  );
}
